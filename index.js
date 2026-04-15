const fs = require('fs');
const path = require('path');
const express = require('express');
const { DatabaseSync } = require('node:sqlite');
const { Telegraf, Markup, session } = require('telegraf');

loadEnvFile(path.join(__dirname, '.env'));

const PORT = Number(process.env.PORT) || 10000;
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID ? Number(process.env.ADMIN_CHAT_ID) : null;
const DATABASE_PATH = process.env.DATABASE_PATH || path.join(__dirname, 'data', 'medbot.sqlite');

if (!BOT_TOKEN) {
  console.error('TELEGRAM_BOT_TOKEN topilmadi. Botni ishga tushirishdan oldin env ornatilsin.');
  process.exit(1);
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }

    const separatorIndex = line.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    if (!key || process.env[key] !== undefined) {
      continue;
    }

    let value = line.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

const dataDir = path.dirname(DATABASE_PATH);
const legacyComplaintsFile = path.join(dataDir, 'complaints.jsonl');
fs.mkdirSync(dataDir, { recursive: true });

const db = new DatabaseSync(DATABASE_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS complaints (
    id TEXT PRIMARY KEY,
    ticket_code TEXT UNIQUE,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    user_id INTEGER NOT NULL,
    chat_id INTEGER NOT NULL,
    full_name TEXT NOT NULL,
    username TEXT,
    complaint_text TEXT NOT NULL,
    suggested_category TEXT,
    confidence INTEGER NOT NULL DEFAULT 0,
    suggested_doctors TEXT NOT NULL DEFAULT '[]',
    status TEXT NOT NULL DEFAULT 'new',
    admin_notes TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_complaints_created_at ON complaints(created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_complaints_category ON complaints(suggested_category);
  CREATE INDEX IF NOT EXISTS idx_complaints_user_id ON complaints(user_id);
  CREATE INDEX IF NOT EXISTS idx_complaints_ticket_code ON complaints(ticket_code);
  CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints(status);

  CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TEXT NOT NULL,
    actor_id INTEGER,
    actor_name TEXT,
    action TEXT NOT NULL,
    complaint_id TEXT,
    ticket_code TEXT,
    meta_json TEXT NOT NULL DEFAULT '{}'
  );

  CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_audit_logs_ticket_code ON audit_logs(ticket_code);
`);

const insertComplaintStmt = db.prepare(`
  INSERT OR IGNORE INTO complaints (
    id,
    ticket_code,
    created_at,
    updated_at,
    user_id,
    chat_id,
    full_name,
    username,
    complaint_text,
    suggested_category,
    confidence,
    suggested_doctors,
    status,
    admin_notes
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const insertAuditStmt = db.prepare(`
  INSERT INTO audit_logs (
    created_at,
    actor_id,
    actor_name,
    action,
    complaint_id,
    ticket_code,
    meta_json
  ) VALUES (?, ?, ?, ?, ?, ?, ?)
`);

function tableColumns(tableName) {
  return db.prepare(`PRAGMA table_info(${tableName})`).all().map((row) => row.name);
}

function ensureComplaintSchema() {
  const existing = new Set(tableColumns('complaints'));
  const requiredColumns = [
    ['ticket_code', 'TEXT'],
    ['updated_at', 'TEXT'],
    ['status', "TEXT NOT NULL DEFAULT 'new'"],
    ['admin_notes', 'TEXT'],
  ];

  for (const [name, type] of requiredColumns) {
    if (!existing.has(name)) {
      db.exec(`ALTER TABLE complaints ADD COLUMN ${name} ${type}`);
    }
  }

  db.exec(`
    UPDATE complaints
    SET updated_at = COALESCE(updated_at, created_at)
    WHERE updated_at IS NULL OR updated_at = '';

    UPDATE complaints
    SET status = COALESCE(status, 'new')
    WHERE status IS NULL OR status = '';
  `);
}

function createTicketCode() {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomPart = Math.floor(1000 + Math.random() * 9000);
  return `MB-${datePart}-${randomPart}`;
}

function ensureTicketCodeUnique() {
  let code = createTicketCode();
  while (db.prepare('SELECT id FROM complaints WHERE ticket_code = ?').get(code)) {
    code = createTicketCode();
  }
  return code;
}

function backfillTicketCodes() {
  const rows = db.prepare(`
    SELECT id
    FROM complaints
    WHERE ticket_code IS NULL OR ticket_code = ''
  `).all();

  if (!rows.length) {
    return;
  }

  const updateStmt = db.prepare('UPDATE complaints SET ticket_code = ?, updated_at = COALESCE(updated_at, created_at) WHERE id = ?');

  db.exec('BEGIN');
  try {
    for (const row of rows) {
      updateStmt.run(ensureTicketCodeUnique(), row.id);
    }
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

function actorNameFromCtx(ctx) {
  if (!ctx || !ctx.from) {
    return null;
  }

  const firstName = ctx.from.first_name || '';
  const lastName = ctx.from.last_name || '';
  const username = ctx.from.username ? `@${ctx.from.username}` : '';
  return `${firstName} ${lastName}`.trim() || username || String(ctx.from.id);
}

function writeAuditLog({ actorId = null, actorName = null, action, complaintId = null, ticketCode = null, meta = {} }) {
  insertAuditStmt.run(
    new Date().toISOString(),
    actorId,
    actorName,
    action,
    complaintId,
    ticketCode,
    JSON.stringify(meta)
  );
}

ensureComplaintSchema();
backfillTicketCodes();

function migrateLegacyJsonl() {
  if (!fs.existsSync(legacyComplaintsFile)) {
    return;
  }

  const raw = fs.readFileSync(legacyComplaintsFile, 'utf8').trim();
  if (!raw) {
    return;
  }

  const rows = raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean);

  if (!rows.length) {
    return;
  }

  db.exec('BEGIN');
  try {
    for (const record of rows) {
      const ticketCode = record.ticketCode || ensureTicketCodeUnique();
      insertComplaintStmt.run(
        record.id,
        ticketCode,
        record.createdAt,
        record.updatedAt || record.createdAt,
        record.userId,
        record.chatId,
        record.fullName,
        record.username || null,
        record.complaintText,
        record.suggestedCategory || null,
        Number(record.confidence) || 0,
        JSON.stringify(record.suggestedDoctors || []),
        record.status || 'new',
        record.adminNotes || null
      );
    }
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

migrateLegacyJsonl();

const app = express();
app.get('/', (_, res) => {
  res.status(200).json({
    ok: true,
    service: 'MedBotServer',
    date: new Date().toISOString(),
  });
});

app.get('/health', (_, res) => {
  const total = db.prepare('SELECT COUNT(*) AS total FROM complaints').get().total;
  const byStatus = db.prepare('SELECT status, COUNT(*) AS total FROM complaints GROUP BY status').all();
  res.status(200).json({
    ok: true,
    botConfigured: Boolean(BOT_TOKEN),
    adminConfigured: Boolean(ADMIN_CHAT_ID),
    databasePath: DATABASE_PATH,
    complaints: total,
    statuses: byStatus,
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`HTTP server ${PORT}-portda ishlayapti`);
});

const bot = new Telegraf(BOT_TOKEN);
bot.use(session());

const doctors = {
  malika: {
    name: 'Malika Alisherovna',
    category: 'neurology',
    title: 'Bolalar nevrologi',
    experience: '25+ yil tajriba',
    usernameLink: 'https://t.me/MedPediatr_Bot',
    summary:
      "Nutq rivojlanishi, diqqat, gipertonus, bosh og'rig'i va bolalardagi nevrologik kuzatuv bo'yicha konsultatsiya.",
    details: [
      "Nutq va psixomotor rivojlanish kechikishi",
      "Yangi tug'ilgan chaqaloqlarda asab tizimi bilan bog'liq holatlar",
      'Diqqat va xulq bilan bog`liq shikoyatlar',
      'Bosh og`rig`i va uyqu buzilishlari',
    ],
  },
  anvar: {
    name: 'Anvar Hakimov',
    category: 'neurology',
    title: 'Nevrolog-epileptolog',
    experience: '15 yil tajriba',
    usernameLink: 'https://t.me/MedPediatrAbot',
    summary:
      "Epilepsiya, tiklar, uyqudagi bezovtalik va EEG bo'yicha chuqur konsultatsiya.",
    details: [
      'Epilepsiya va hushdan ketish holatlari',
      'Tik, tutqanoq va nevrologik epizodlar',
      'Uyqu paytidagi bezovtalik va qorquvlar',
      'EEG natijalarini izohlash',
    ],
  },
  lola: {
    name: 'Lola Karimova',
    category: 'ent',
    title: 'LOR shifokori',
    experience: '18 yil tajriba',
    usernameLink: 'https://t.me/MedPediatrLbot',
    summary:
      "Burun bitishi, quloq og'rig'i, tomoq yallig'lanishi va adenoid bo'yicha korik.",
    details: [
      'Adenoid va tez-tez shamollash',
      'Otit va quloq ogrigi',
      'Sinusit, rinit va burun bitishi',
      'Tomoq yalliglanishi va tonzillit',
    ],
  },
  sanjar: {
    name: 'Sanjar Yusupov',
    category: 'eye',
    title: 'Bolalar oftalmologi',
    experience: '14 yil tajriba',
    usernameLink: 'https://t.me/MedPediatrSbot',
    summary:
      "Korish pasayishi, gilaylik, koz charchashi va profilaktik tekshiruvlar.",
    details: [
      'Maktab yoshidagi bolalarda korish pasayishi',
      'Gilaylik va ambliopiya',
      'Linza yoki kozoynak tanlash',
      'Koz tubi va toliq oftalmologik tekshiruv',
    ],
  },
  nargiza: {
    name: 'Nargiza Saidova',
    category: 'nutrition',
    title: 'Pediatr-dietolog',
    experience: '12 yil tajriba',
    usernameLink: 'https://t.me/MedPediatrNbot',
    summary:
      "Ovqatlanish rejasi, allergiya, vazn muammolari va bolalar ratsioni boyicha maslahat.",
    details: [
      'Ovqat allergiyasi va ratsion tanlash',
      'Vazn kamligi yoki ortiqcha vazn',
      'Ichak faoliyati va ovqat hazm qilish bilan bogliq masalalar',
      'Tez-tez kasal boladigan bolalar uchun ovqatlanish tavsiyalari',
    ],
  },
  dilshod: {
    name: 'Dilshod Rahmonov',
    category: 'surgery',
    title: 'Bolalar xirurgi',
    experience: '20 yil tajriba',
    usernameLink: 'https://t.me/MedPediatrRbot',
    summary:
      "Churra, yumshoq toqima ozgarishlari, lab va til yuganchasi hamda xirurgik yonaltirish.",
    details: [
      'Kindik yoki chov churrasi',
      'Teri va yumshoq toqimalardagi ozgarishlar',
      'Til yoki lab yuganchasi boyicha baholash',
      'Qomat va tayanch-harakat tizimi bilan bogliq korik',
    ],
  },
};

const categories = {
  neurology: {
    label: 'Nevrologiya',
    badge: '[Nevro]',
    text: 'Nevrologiya boyicha mutaxassislar:',
    complaintKeywords: ['tutqanoq', 'epileps', 'hushdan', 'tik', 'asab', 'nevro', 'bosh og', 'migren', 'uyqu', 'nutq', 'rivojlanish'],
  },
  ent: {
    label: 'LOR',
    badge: '[LOR]',
    text: 'Quloq-burun-tomoq boyicha mutaxassis:',
    complaintKeywords: ['quloq', 'burun', 'tomoq', 'adenoid', 'otit', 'rinit', 'sinusit', 'angina', 'yotal', 'shamoll'],
  },
  eye: {
    label: 'Oftalmologiya',
    badge: '[Koz]',
    text: 'Koz boyicha mutaxassis:',
    complaintKeywords: ['koz', 'korish', 'gilay', 'linza', 'kozoynak'],
  },
  nutrition: {
    label: 'Dietologiya',
    badge: '[Ratsion]',
    text: 'Ovqatlanish va ratsion boyicha mutaxassis:',
    complaintKeywords: ['ovqat', 'ishtaha', 'allerg', 'vazn', 'ozib', 'semiz', 'ich ket', 'qabziyat', 'ratsion', 'hazm'],
  },
  surgery: {
    label: 'Xirurgiya',
    badge: '[Xirurg]',
    text: 'Xirurgik yonalish boyicha mutaxassis:',
    complaintKeywords: ['churra', 'jarohat', 'shish', 'operats', 'xirurg', 'kindik', 'chov', 'yugancha', 'teri', 'qon'],
  },
};

const statusLabels = {
  new: 'Yangi',
  in_progress: 'Jarayonda',
  closed: 'Yopilgan',
};

const mainReplyKeyboard = Markup.keyboard([
  ['Doktor tanlash', 'Shikoyat qoldirish'],
  ['Shoshilinch holat', 'Yordam'],
  ['Mening ticketim'],
]).resize();

function mainInlineKeyboard() {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('Doktor tanlash', 'menu_doctors'),
      Markup.button.callback('Shikoyat qoldirish', 'menu_complaint'),
    ],
    [
      Markup.button.callback('Shoshilinch holat', 'menu_urgent'),
      Markup.button.callback('Mening ticketim', 'menu_last_ticket'),
    ],
  ]);
}

function categoriesKeyboard() {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('Nevrologiya', 'category_neurology'),
      Markup.button.callback('LOR', 'category_ent'),
    ],
    [
      Markup.button.callback('Oftalmologiya', 'category_eye'),
      Markup.button.callback('Dietologiya', 'category_nutrition'),
    ],
    [Markup.button.callback('Xirurgiya', 'category_surgery')],
    [
      Markup.button.callback('Shikoyat yozish', 'menu_complaint'),
      Markup.button.callback('Asosiy menyu', 'back_main'),
    ],
  ]);
}

function adminPanelKeyboard() {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('Oxirgi 5 ta', 'admin_recent_5'),
      Markup.button.callback('Oxirgi 10 ta', 'admin_recent_10'),
    ],
    [
      Markup.button.callback('Statuslar', 'admin_statuses'),
      Markup.button.callback('Audit log', 'admin_audit'),
    ],
    [
      Markup.button.callback('Bugungi statistika', 'admin_stats'),
      Markup.button.callback('Admin ID', 'admin_id'),
    ],
  ]);
}

function doctorsByCategoryKeyboard(categoryKey) {
  const buttons = Object.entries(doctors)
    .filter(([, doctor]) => doctor.category === categoryKey)
    .map(([key, doctor]) => [Markup.button.callback(doctor.name, `doctor_${key}`)]);

  buttons.push([
    Markup.button.callback('Boshqa yonalish', 'menu_doctors'),
    Markup.button.callback('Asosiy menyu', 'back_main'),
  ]);

  return Markup.inlineKeyboard(buttons);
}

function complaintFollowupKeyboard(record) {
  const rows = [[Markup.button.callback(`Ticket: ${record.ticketCode}`, `ticket_${record.ticketCode}`)]];
  if (record.suggestedCategory && categories[record.suggestedCategory]) {
    rows.push([Markup.button.callback(`Tavsiya etilgan yonalish: ${categories[record.suggestedCategory].label}`, `category_${record.suggestedCategory}`)]);
  }
  rows.push([Markup.button.callback('Barcha mutaxassislar', 'menu_doctors')]);
  rows.push([Markup.button.callback('Yana shikoyat yozish', 'menu_complaint')]);
  rows.push([Markup.button.callback('Asosiy menyu', 'back_main')]);
  return Markup.inlineKeyboard(rows);
}

function doctorCardKeyboard(doctor) {
  return Markup.inlineKeyboard([
    [Markup.button.url('Shifokorga yozish', doctor.usernameLink)],
    [
      Markup.button.callback('Ortga', `category_${doctor.category}`),
      Markup.button.callback('Asosiy menyu', 'back_main'),
    ],
  ]);
}

function adminReplyKeyboard(record) {
  const rows = [[Markup.button.callback(`Javob berish: ${record.userId}`, `reply_${record.userId}`)]];
  rows.push([
    Markup.button.callback('Jarayonga olish', `status_in_progress_${record.ticketCode}`),
    Markup.button.callback('Yopish', `status_closed_${record.ticketCode}`),
  ]);
  rows.push([
    Markup.button.callback('Qayta ochish', `status_new_${record.ticketCode}`),
    Markup.button.callback(`Yonalish: ${categoryLabel(record.suggestedCategory)}`, `admin_filter_${record.suggestedCategory || 'unknown'}`),
  ]);
  if (record.suggestedCategory && categories[record.suggestedCategory]) {
    return Markup.inlineKeyboard(rows);
  }
  return Markup.inlineKeyboard(rows);
}

function doctorMessage(doctor) {
  const bulletList = doctor.details.map((item) => `- ${item}`).join('\n');
  return [
    `<b>${doctor.name}</b>`,
    doctor.title,
    doctor.experience,
    '',
    doctor.summary,
    '',
    '<b>Qaysi holatlarda murojaat qilish mumkin:</b>',
    bulletList,
    '',
    "<i>Eslatma:</i> onlayn yozishma shifokor korigini toliq almashtirmaydi.",
  ].join('\n');
}

function helpMessage() {
  return [
    '<b>MedPediatr bot</b>',
    '',
    'Bot orqali siz mos mutaxassisni tanlaysiz, shikoyat qoldirasiz va kerak bolsa admin yoki shifokorga tez yonaltirilasiz.',
    '',
    'Shikoyat yozayotganda bolaning yoshi, asosiy simptomlari, qancha vaqtdan beri davom etayotgani va isitma bor-yoqligini yozing.',
  ].join('\n');
}

function urgentMessage() {
  return [
    '<b>Shoshilinch holat belgilarida bot kutib turmaydi.</b>',
    '',
    "Quyidagi holatlardan biri bolsa darhol tez yordam yoki yaqin shifoxonaga murojaat qiling:",
    '- nafas qisilishi yoki lab kokarishi',
    '- tutqanoq, hushdan ketish',
    '- toxtamayotgan qusish yoki suvsizlanish',
    '- yuqori isitma bilan holsizlik va hushyorlik pasayishi',
    '- kuchli jarohat, qon ketish yoki otkir ogriq',
    '',
    'Agar holat shoshilinch bolmasa, menyudan mutaxassis tanlang.',
  ].join('\n');
}

function userDisplay(ctx) {
  const firstName = ctx.from?.first_name || '';
  const lastName = ctx.from?.last_name || '';
  const username = ctx.from?.username ? `@${ctx.from.username}` : 'username yoq';
  return `${firstName} ${lastName}`.trim() || username;
}

function normalizeText(text) {
  return String(text || '').toLowerCase();
}

function detectCategory(complaintText) {
  const normalized = normalizeText(complaintText);
  let bestCategory = null;
  let bestScore = 0;

  for (const [categoryKey, category] of Object.entries(categories)) {
    const score = category.complaintKeywords.reduce((sum, keyword) => sum + (normalized.includes(keyword) ? 1 : 0), 0);
    if (score > bestScore) {
      bestScore = score;
      bestCategory = categoryKey;
    }
  }

  return { categoryKey: bestCategory, confidence: bestScore };
}

function doctorKeysForCategory(categoryKey) {
  return Object.entries(doctors)
    .filter(([, doctor]) => doctor.category === categoryKey)
    .map(([doctorKey]) => doctorKey);
}

function buildComplaintRecord(ctx, complaintText) {
  const classification = detectCategory(complaintText);
  const createdAt = new Date().toISOString();
  return {
    id: `req_${Date.now()}_${ctx.from.id}`,
    ticketCode: ensureTicketCodeUnique(),
    createdAt,
    updatedAt: createdAt,
    userId: ctx.from.id,
    chatId: ctx.chat.id,
    fullName: userDisplay(ctx),
    username: ctx.from.username || null,
    complaintText,
    suggestedCategory: classification.categoryKey,
    confidence: classification.confidence,
    suggestedDoctors: classification.categoryKey ? doctorKeysForCategory(classification.categoryKey) : [],
    status: 'new',
    adminNotes: null,
  };
}

function mapComplaintRow(row) {
  return {
    id: row.id,
    ticketCode: row.ticket_code,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    userId: row.user_id,
    chatId: row.chat_id,
    fullName: row.full_name,
    username: row.username,
    complaintText: row.complaint_text,
    suggestedCategory: row.suggested_category,
    confidence: row.confidence,
    suggestedDoctors: JSON.parse(row.suggested_doctors || '[]'),
    status: row.status || 'new',
    adminNotes: row.admin_notes,
  };
}

function saveComplaint(record) {
  insertComplaintStmt.run(
    record.id,
    record.ticketCode,
    record.createdAt,
    record.updatedAt,
    record.userId,
    record.chatId,
    record.fullName,
    record.username,
    record.complaintText,
    record.suggestedCategory,
    record.confidence,
    JSON.stringify(record.suggestedDoctors),
    record.status,
    record.adminNotes
  );
}

function allComplaints() {
  const rows = db.prepare('SELECT * FROM complaints ORDER BY created_at ASC').all();
  return rows.map(mapComplaintRow);
}

function recentComplaints(limit, filterCategory = null, status = null) {
  let rows;

  if (filterCategory && status) {
    rows = db.prepare(`
      SELECT * FROM complaints
      WHERE suggested_category = ? AND status = ?
      ORDER BY created_at DESC
      LIMIT ?
    `).all(filterCategory, status, limit);
  } else if (filterCategory) {
    rows = db.prepare('SELECT * FROM complaints WHERE suggested_category = ? ORDER BY created_at DESC LIMIT ?').all(filterCategory, limit);
  } else if (status) {
    rows = db.prepare('SELECT * FROM complaints WHERE status = ? ORDER BY created_at DESC LIMIT ?').all(status, limit);
  } else {
    rows = db.prepare('SELECT * FROM complaints ORDER BY created_at DESC LIMIT ?').all(limit);
  }

  return rows.map(mapComplaintRow);
}

function complaintsStats() {
  const total = db.prepare('SELECT COUNT(*) AS total FROM complaints').get().total;
  const today = new Date().toISOString().slice(0, 10);
  const todayCount = db.prepare('SELECT COUNT(*) AS total FROM complaints WHERE substr(created_at, 1, 10) = ?').get(today).total;
  const latestRow = db.prepare('SELECT * FROM complaints ORDER BY created_at DESC LIMIT 1').get();
  const statusRows = db.prepare('SELECT status, COUNT(*) AS total FROM complaints GROUP BY status').all();
  const statusCounts = { new: 0, in_progress: 0, closed: 0 };

  for (const row of statusRows) {
    statusCounts[row.status] = row.total;
  }

  return {
    total,
    today: todayCount,
    latest: latestRow ? mapComplaintRow(latestRow) : null,
    statusCounts,
  };
}

function getComplaintByTicket(ticketCode) {
  const row = db.prepare('SELECT * FROM complaints WHERE ticket_code = ?').get(ticketCode);
  return row ? mapComplaintRow(row) : null;
}

function lastComplaintForUser(userId) {
  const row = db.prepare('SELECT * FROM complaints WHERE user_id = ? ORDER BY created_at DESC LIMIT 1').get(userId);
  return row ? mapComplaintRow(row) : null;
}

function updateComplaintStatus(ticketCode, status, actor = null) {
  const now = new Date().toISOString();
  const info = db.prepare('UPDATE complaints SET status = ?, updated_at = ? WHERE ticket_code = ?').run(status, now, ticketCode);

  if (!info.changes) {
    return null;
  }

  const updated = getComplaintByTicket(ticketCode);
  writeAuditLog({
    actorId: actor?.id || null,
    actorName: actor?.name || null,
    action: 'status_changed',
    complaintId: updated.id,
    ticketCode,
    meta: { status },
  });
  return updated;
}

function auditLogRows(limit = 10) {
  return db.prepare('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT ?').all(limit);
}

function categoryLabel(categoryKey) {
  return categoryKey && categories[categoryKey] ? categories[categoryKey].label : 'Aniqlanmadi';
}

function statusLabel(status) {
  return statusLabels[status] || status;
}

function shortComplaint(text, maxLength = 90) {
  const value = String(text || '').replace(/\s+/g, ' ').trim();
  return value.length <= maxLength ? value : `${value.slice(0, maxLength - 3)}...`;
}

function complaintSummary(record) {
  const doctorsList = record.suggestedDoctors.map((doctorKey) => doctors[doctorKey]?.name).filter(Boolean).join(', ');
  return [
    `Ticket: <code>${record.ticketCode}</code>`,
    `Status: <b>${statusLabel(record.status)}</b>`,
    `Yaratilgan vaqt: ${record.createdAt}`,
    `Yangilangan vaqt: ${record.updatedAt}`,
    `Taxminiy yonalish: <b>${categoryLabel(record.suggestedCategory)}</b>`,
    doctorsList ? `Tavsiya shifokorlar: ${doctorsList}` : 'Tavsiya shifokorlar: yoq',
  ].join('\n');
}

function adminComplaintMessage(record) {
  return [
    '<b>Yangi shikoyat</b>',
    '',
    `ID: <code>${record.id}</code>`,
    complaintSummary(record),
    `Foydalanuvchi: ${record.fullName}`,
    `Username: ${record.username ? `@${record.username}` : 'yoq'}`,
    `User ID: <code>${record.userId}</code>`,
    `Moslik bali: ${record.confidence}`,
    '',
    '<b>Matn:</b>',
    record.complaintText,
  ].join('\n');
}

function adminRecentMessage(records, heading) {
  if (!records.length) {
    return `${heading}\n\nHali shikoyatlar yoq.`;
  }

  return [
    heading,
    '',
    ...records.map((record, index) =>
      `${index + 1}. ${record.ticketCode} | ${record.fullName} | ${statusLabel(record.status)} | ${categoryLabel(record.suggestedCategory)}\n${shortComplaint(record.complaintText)}`
    ),
  ].join('\n\n');
}

function auditMessage(rows) {
  if (!rows.length) {
    return '<b>Audit log</b>\n\nHali yozuvlar yoq.';
  }

  return [
    '<b>Audit log</b>',
    '',
    ...rows.map((row, index) => {
      const meta = JSON.parse(row.meta_json || '{}');
      const metaText = Object.keys(meta).length ? ` | ${JSON.stringify(meta)}` : '';
      return `${index + 1}. ${row.created_at} | ${row.action} | actor=${row.actor_name || row.actor_id || 'system'} | ticket=${row.ticket_code || 'yoq'}${metaText}`;
    }),
  ].join('\n\n');
}

async function notifyAdmin(record) {
  if (!ADMIN_CHAT_ID) {
    return false;
  }

  await bot.telegram.sendMessage(ADMIN_CHAT_ID, adminComplaintMessage(record), {
    parse_mode: 'HTML',
    ...adminReplyKeyboard(record),
  });

  return true;
}

function isAdmin(ctx) {
  return Boolean(ADMIN_CHAT_ID && ctx.from && ctx.from.id === ADMIN_CHAT_ID);
}

async function sendMainMenu(ctx, text) {
  return ctx.reply(text, {
    parse_mode: 'HTML',
    ...mainReplyKeyboard,
  });
}

async function sendTicketStatus(ctx, record) {
  if (!record) {
    await ctx.reply('Ticket topilmadi.', mainReplyKeyboard);
    return;
  }

  await ctx.reply(
    ['<b>Ticket holati</b>', '', complaintSummary(record)].join('\n'),
    {
      parse_mode: 'HTML',
      ...mainReplyKeyboard,
    }
  );
}

async function sendAdminPanel(ctx) {
  const stats = complaintsStats();
  await ctx.reply(
    [
      '<b>Admin panel</b>',
      '',
      `Jami shikoyatlar: ${stats.total}`,
      `Bugungi shikoyatlar: ${stats.today}`,
      `Yangi: ${stats.statusCounts.new}`,
      `Jarayonda: ${stats.statusCounts.in_progress}`,
      `Yopilgan: ${stats.statusCounts.closed}`,
      `Oxirgisi: ${stats.latest ? `${stats.latest.ticketCode} (${statusLabel(stats.latest.status)})` : 'hali yoq'}`,
      '',
      'Foydalanuvchiga javob yozish va statusni boshqarish uchun admin chatdagi tugmalardan foydalaning.',
    ].join('\n'),
    {
      parse_mode: 'HTML',
      ...adminPanelKeyboard(),
    }
  );
}

bot.start(async (ctx) => {
  ctx.session = {};
  await ctx.reply(
    [
      `Salom, ${ctx.from.first_name || 'foydalanuvchi'}.`,
      '',
      "Bu bot sizni mos mutaxassisga yonaltiradi, shikoyatingizni SQLite bazaga saqlaydi va kerak bolsa admin tomoniga yuboradi.",
      'Davom etish uchun quyidagi bolimlardan birini tanlang.',
    ].join('\n'),
    {
      parse_mode: 'HTML',
      ...mainReplyKeyboard,
    }
  );
});

bot.command('help', async (ctx) => {
  await ctx.reply(helpMessage(), {
    parse_mode: 'HTML',
    ...mainInlineKeyboard(),
  });
});

bot.command('admin', async (ctx) => {
  if (!isAdmin(ctx)) {
    return ctx.reply('Bu buyruq faqat admin uchun.');
  }
  await sendAdminPanel(ctx);
});

bot.command('stats', async (ctx) => {
  if (!isAdmin(ctx)) {
    return ctx.reply('Bu buyruq faqat admin uchun.');
  }
  const stats = complaintsStats();
  await ctx.reply(
    [
      '<b>Statistika</b>',
      `Jami: ${stats.total}`,
      `Bugun: ${stats.today}`,
      `Yangi: ${stats.statusCounts.new}`,
      `Jarayonda: ${stats.statusCounts.in_progress}`,
      `Yopilgan: ${stats.statusCounts.closed}`,
      `Oxirgi: ${stats.latest ? stats.latest.createdAt : 'yoq'}`,
    ].join('\n'),
    { parse_mode: 'HTML' }
  );
});

bot.command('recent', async (ctx) => {
  if (!isAdmin(ctx)) {
    return ctx.reply('Bu buyruq faqat admin uchun.');
  }
  await ctx.reply(adminRecentMessage(recentComplaints(10), '<b>Oxirgi 10 ta shikoyat</b>'), {
    parse_mode: 'HTML',
  });
});

bot.command('myid', async (ctx) => {
  await ctx.reply(`Sizning Telegram ID: <code>${ctx.from.id}</code>`, {
    parse_mode: 'HTML',
  });
});

bot.command('audit', async (ctx) => {
  if (!isAdmin(ctx)) {
    return ctx.reply('Bu buyruq faqat admin uchun.');
  }
  await ctx.reply(auditMessage(auditLogRows(10)), {
    parse_mode: 'HTML',
  });
});

bot.command('ticket', async (ctx) => {
  const parts = ctx.message.text.trim().split(/\s+/);

  if (parts.length < 2) {
    const ownLast = lastComplaintForUser(ctx.from.id);
    if (!ownLast) {
      return ctx.reply('Ticket kodi kiritilmadi va sizda hali murojaat yoq.');
    }
    return sendTicketStatus(ctx, ownLast);
  }

  const ticketCode = parts[1].toUpperCase();
  const record = getComplaintByTicket(ticketCode);
  if (!record) {
    return ctx.reply('Bunday ticket topilmadi.');
  }
  if (!isAdmin(ctx) && record.userId !== ctx.from.id) {
    return ctx.reply('Bu ticket sizga tegishli emas.');
  }
  await sendTicketStatus(ctx, record);
});

bot.command('export', async (ctx) => {
  if (!isAdmin(ctx)) {
    return ctx.reply('Bu buyruq faqat admin uchun.');
  }
  const records = allComplaints();
  const exportPath = path.join(dataDir, 'complaints-export.json');
  fs.writeFileSync(exportPath, JSON.stringify(records, null, 2), 'utf8');
  writeAuditLog({
    actorId: ctx.from.id,
    actorName: actorNameFromCtx(ctx),
    action: 'export_created',
    meta: { exportPath, total: records.length },
  });
  await ctx.reply(`Export tayyor: <code>${exportPath}</code>`, {
    parse_mode: 'HTML',
  });
});

bot.action('menu_doctors', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.editMessageText('Yonalishni tanlang:', {
    parse_mode: 'HTML',
    ...categoriesKeyboard(),
  });
});

bot.action('menu_complaint', async (ctx) => {
  await ctx.answerCbQuery();
  ctx.session.awaitingComplaint = true;
  ctx.session.replyToUserId = null;
  await ctx.reply(
    "Shikoyatni bitta xabarda yozing: bolaning yoshi, asosiy simptomlar, qancha vaqtdan beri davom etayotgani va isitma bor-yoqligini kiriting.",
    mainReplyKeyboard
  );
});

bot.action('menu_urgent', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.reply(urgentMessage(), {
    parse_mode: 'HTML',
    ...mainInlineKeyboard(),
  });
});

bot.action('menu_last_ticket', async (ctx) => {
  await ctx.answerCbQuery();
  const record = lastComplaintForUser(ctx.from.id);
  await sendTicketStatus(ctx, record);
});

bot.action('back_main', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.editMessageText(helpMessage(), {
    parse_mode: 'HTML',
    ...mainInlineKeyboard(),
  });
});

bot.action('admin_stats', async (ctx) => {
  if (!isAdmin(ctx)) {
    await ctx.answerCbQuery('Bu amal faqat admin uchun.', { show_alert: true });
    return;
  }
  await ctx.answerCbQuery();
  const stats = complaintsStats();
  await ctx.reply(`Jami: ${stats.total}\nBugun: ${stats.today}\nYangi: ${stats.statusCounts.new}\nJarayonda: ${stats.statusCounts.in_progress}\nYopilgan: ${stats.statusCounts.closed}`, {
    parse_mode: 'HTML',
  });
});

bot.action('admin_statuses', async (ctx) => {
  if (!isAdmin(ctx)) {
    await ctx.answerCbQuery('Bu amal faqat admin uchun.', { show_alert: true });
    return;
  }
  await ctx.answerCbQuery();
  const stats = complaintsStats();
  await ctx.reply(
    [
      '<b>Statuslar boyicha qisqa korinish</b>',
      `Yangi: ${stats.statusCounts.new}`,
      `Jarayonda: ${stats.statusCounts.in_progress}`,
      `Yopilgan: ${stats.statusCounts.closed}`,
    ].join('\n'),
    { parse_mode: 'HTML' }
  );
});

bot.action('admin_audit', async (ctx) => {
  if (!isAdmin(ctx)) {
    await ctx.answerCbQuery('Bu amal faqat admin uchun.', { show_alert: true });
    return;
  }
  await ctx.answerCbQuery();
  await ctx.reply(auditMessage(auditLogRows(10)), {
    parse_mode: 'HTML',
  });
});

bot.action('admin_id', async (ctx) => {
  if (!isAdmin(ctx)) {
    await ctx.answerCbQuery('Bu amal faqat admin uchun.', { show_alert: true });
    return;
  }
  await ctx.answerCbQuery();
  await ctx.reply(`Admin ID: <code>${ctx.from.id}</code>`, {
    parse_mode: 'HTML',
  });
});

bot.action(/admin_recent_(\d+)/, async (ctx) => {
  if (!isAdmin(ctx)) {
    await ctx.answerCbQuery('Bu amal faqat admin uchun.', { show_alert: true });
    return;
  }
  const limit = Number(ctx.match[1]);
  await ctx.answerCbQuery();
  await ctx.reply(adminRecentMessage(recentComplaints(limit), `<b>Oxirgi ${limit} ta shikoyat</b>`), {
    parse_mode: 'HTML',
  });
});

bot.action(/admin_filter_(.+)/, async (ctx) => {
  if (!isAdmin(ctx)) {
    await ctx.answerCbQuery('Bu amal faqat admin uchun.', { show_alert: true });
    return;
  }
  const categoryKey = ctx.match[1];
  await ctx.answerCbQuery();
  if (!categories[categoryKey]) {
    await ctx.reply('Bu yonalish uchun filter topilmadi.');
    return;
  }
  await ctx.reply(
    adminRecentMessage(recentComplaints(10, categoryKey), `<b>${categoryLabel(categoryKey)} boyicha oxirgi 10 ta shikoyat</b>`),
    { parse_mode: 'HTML' }
  );
});

bot.action(/status_(new|in_progress|closed)_(MB-\d{8}-\d{4})/, async (ctx) => {
  if (!isAdmin(ctx)) {
    await ctx.answerCbQuery('Bu amal faqat admin uchun.', { show_alert: true });
    return;
  }

  const newStatus = ctx.match[1];
  const ticketCode = ctx.match[2];
  const updated = updateComplaintStatus(ticketCode, newStatus, {
    id: ctx.from.id,
    name: actorNameFromCtx(ctx),
  });

  if (!updated) {
    await ctx.answerCbQuery('Ticket topilmadi.', { show_alert: true });
    return;
  }

  await ctx.answerCbQuery(`Status: ${statusLabel(newStatus)}`);
  await ctx.reply(`Ticket <code>${ticketCode}</code> holati <b>${statusLabel(newStatus)}</b> ga ozgartirildi.`, {
    parse_mode: 'HTML',
  });

  try {
    await bot.telegram.sendMessage(
      updated.userId,
      [
        '<b>MedPediatr ticket yangilandi</b>',
        '',
        `Ticket: <code>${updated.ticketCode}</code>`,
        `Yangi holat: <b>${statusLabel(updated.status)}</b>`,
      ].join('\n'),
      { parse_mode: 'HTML' }
    );
  } catch (error) {
    console.error('Userga status yuborilmadi:', error);
  }
});

bot.action(/ticket_(MB-\d{8}-\d{4})/, async (ctx) => {
  await ctx.answerCbQuery();
  const ticketCode = ctx.match[1];
  const record = getComplaintByTicket(ticketCode);

  if (!record) {
    await ctx.reply('Ticket topilmadi.');
    return;
  }

  if (!isAdmin(ctx) && record.userId !== ctx.from.id) {
    await ctx.reply('Bu ticket sizga tegishli emas.');
    return;
  }

  await sendTicketStatus(ctx, record);
});

bot.action(/category_(.+)/, async (ctx) => {
  await ctx.answerCbQuery();
  const categoryKey = ctx.match[1];
  const category = categories[categoryKey];
  if (!category) {
    return ctx.reply('Bu yonalish topilmadi.', mainReplyKeyboard);
  }
  await ctx.editMessageText(`${category.badge} <b>${category.text}</b>`, {
    parse_mode: 'HTML',
    ...doctorsByCategoryKeyboard(categoryKey),
  });
});

bot.action(/doctor_(.+)/, async (ctx) => {
  await ctx.answerCbQuery();
  const doctorKey = ctx.match[1];
  const doctor = doctors[doctorKey];
  if (!doctor) {
    return ctx.reply("Shifokor malumoti topilmadi.", mainReplyKeyboard);
  }
  await ctx.editMessageText(doctorMessage(doctor), {
    parse_mode: 'HTML',
    ...doctorCardKeyboard(doctor),
  });
});

bot.action(/reply_(\d+)/, async (ctx) => {
  if (!isAdmin(ctx)) {
    await ctx.answerCbQuery('Bu amal faqat admin uchun.', { show_alert: true });
    return;
  }
  const targetUserId = Number(ctx.match[1]);
  ctx.session.replyToUserId = targetUserId;
  await ctx.answerCbQuery('Javob rejimi yoqildi');
  await ctx.reply(`Endi shu chatga yozgan keyingi xabaringiz user ${targetUserId} ga yuboriladi. Bekor qilish uchun /cancel deb yozing.`);
});

bot.command('cancel', async (ctx) => {
  if (!ctx.session) {
    ctx.session = {};
  }
  ctx.session.awaitingComplaint = false;
  ctx.session.replyToUserId = null;
  await ctx.reply('Joriy amal bekor qilindi.', mainReplyKeyboard);
});

bot.hears('Doktor tanlash', async (ctx) => {
  await ctx.reply('Yonalishni tanlang:', categoriesKeyboard());
});

bot.hears('Shikoyat qoldirish', async (ctx) => {
  ctx.session.awaitingComplaint = true;
  await ctx.reply("Shikoyatni yozing. Masalan: '5 yosh, 2 kundan beri yotal, kechasi isitma 38.2, burun bitgan'.", mainReplyKeyboard);
});

bot.hears('Shoshilinch holat', async (ctx) => {
  await ctx.reply(urgentMessage(), {
    parse_mode: 'HTML',
    ...mainInlineKeyboard(),
  });
});

bot.hears('Yordam', async (ctx) => {
  await ctx.reply(helpMessage(), {
    parse_mode: 'HTML',
    ...mainInlineKeyboard(),
  });
});

bot.hears('Mening ticketim', async (ctx) => {
  const record = lastComplaintForUser(ctx.from.id);
  await sendTicketStatus(ctx, record);
});

bot.on('text', async (ctx) => {
  const text = ctx.message.text.trim();

  if (ctx.session.replyToUserId && isAdmin(ctx)) {
    const targetUserId = ctx.session.replyToUserId;
    ctx.session.replyToUserId = null;
    await bot.telegram.sendMessage(targetUserId, ['<b>MedPediatr admin javobi</b>', '', text].join('\n'), {
      parse_mode: 'HTML',
    });
    writeAuditLog({
      actorId: ctx.from.id,
      actorName: actorNameFromCtx(ctx),
      action: 'admin_reply_sent',
      meta: { targetUserId },
    });
    await ctx.reply(`Javob user ${targetUserId} ga yuborildi.`, mainReplyKeyboard);
    return;
  }

  if (ctx.session.awaitingComplaint) {
    ctx.session.awaitingComplaint = false;

    const record = buildComplaintRecord(ctx, text);
    saveComplaint(record);
    ctx.session.lastTicketCode = record.ticketCode;
    writeAuditLog({
      actorId: ctx.from.id,
      actorName: actorNameFromCtx(ctx),
      action: 'complaint_created',
      complaintId: record.id,
      ticketCode: record.ticketCode,
      meta: {
        suggestedCategory: record.suggestedCategory,
        confidence: record.confidence,
      },
    });

    let adminNotified = false;
    try {
      adminNotified = await notifyAdmin(record);
    } catch (error) {
      console.error('Admin xabari yuborilmadi:', error);
    }

    const suggestedCategoryText = record.suggestedCategory
      ? `Taxminiy yonalish: ${categoryLabel(record.suggestedCategory)}.`
      : 'Taxminiy yonalish aniqlanmadi.';

    await ctx.reply(
      [
        'Shikoyatingiz qabul qilindi va SQLite bazaga saqlandi.',
        `Sizning ticketingiz: <code>${record.ticketCode}</code>`,
        `Holati: <b>${statusLabel(record.status)}</b>`,
        suggestedCategoryText,
        adminNotified
          ? 'Admin tomoniga ham yuborildi.'
          : "Hozircha faqat tizimda saqlandi. Admin uchun `ADMIN_CHAT_ID` sozlanmagan bolishi mumkin.",
        '',
        'Endi mos mutaxassisni tanlab, shu shikoyatni shifokorga ham yuborishingiz mumkin.',
      ].join('\n'),
      {
        parse_mode: 'HTML',
        ...complaintFollowupKeyboard(record),
      }
    );
    return;
  }

  if (text.length < 4) {
    await sendMainMenu(ctx, 'Xabaringiz juda qisqa. Menyudan kerakli bolimni tanlang.');
    return;
  }

  await ctx.reply(
    [
      'Men sizni yonaltirish uchun ishlayman.',
      'Shikoyat yozmoqchi bolsangiz `Shikoyat qoldirish` ni bosing.',
      'Mutaxassis kerak bolsa `Doktor tanlash` bolimiga oting.',
      'Oxirgi ticketni korish uchun `Mening ticketim` ni bosing yoki `/ticket KOD` deb yozing.',
    ].join('\n'),
    {
      parse_mode: 'HTML',
      ...mainReplyKeyboard,
    }
  );
});

bot.catch((error, ctx) => {
  console.error('Bot xatosi:', error);
  if (ctx) {
    ctx.reply('Texnik xatolik yuz berdi. Iltimos, /start ni qayta bosing.');
  }
});

bot.launch();
console.log('Telegram bot ishga tushdi');

process.once('SIGINT', () => {
  db.close();
  bot.stop('SIGINT');
});

process.once('SIGTERM', () => {
  db.close();
  bot.stop('SIGTERM');
});
