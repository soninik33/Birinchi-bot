const { Telegraf, Markup } = require('telegraf');
const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = Number(process.env.PORT || 1000);
const CONFIG_PATH = path.join(__dirname, 'bot-config.json');

const DEFAULT_DOCTOR_SCHEDULES = {
  malika: ['Dushanba 10:00', 'Chorshanba 14:00', 'Juma 16:00'],
  anvar: ['Seshanba 11:00', 'Payshanba 15:00', 'Shanba 12:00'],
  lola: ['Dushanba 09:30', 'Payshanba 13:30', 'Juma 11:30'],
  sanjar: ['Seshanba 16:00', 'Chorshanba 12:00', 'Shanba 10:30'],
  nargiza: ['Dushanba 15:30', 'Juma 10:00', 'Shanba 14:30'],
  dilshod: ['Chorshanba 17:00', 'Payshanba 10:30', 'Yakshanba 11:00'],
};

function createDefaultConfig() {
  return {
    supportChatId: null,
    ownerUserId: null,
    activeChats: {},
    userStats: {},
    bookings: [],
    doctorSchedules: DEFAULT_DOCTOR_SCHEDULES,
  };
}

function normalizeConfig(rawConfig) {
  const defaults = createDefaultConfig();
  return {
    ...defaults,
    ...rawConfig,
    activeChats: rawConfig?.activeChats || {},
    userStats: rawConfig?.userStats || {},
    bookings: Array.isArray(rawConfig?.bookings) ? rawConfig.bookings : [],
    doctorSchedules: {
      ...defaults.doctorSchedules,
      ...(rawConfig?.doctorSchedules || {}),
    },
  };
}

function loadConfig() {
  try {
    if (!fs.existsSync(CONFIG_PATH)) {
      return createDefaultConfig();
    }

    return normalizeConfig(JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')));
  } catch (error) {
    console.error('Config o`qishda xato:', error.message);
    return createDefaultConfig();
  }
}

function saveConfig(configData) {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(configData, null, 2), 'utf8');
  } catch (error) {
    console.error('Config yozishda xato:', error.message);
  }
}

const config = loadConfig();
const BOT_TOKEN = process.env.BOT_TOKEN || config.botToken || '';

if (!BOT_TOKEN) {
  throw new Error('BOT_TOKEN topilmadi. Uni environment variable yoki bot-config.json ichiga yozing.');
}

let supportChatId = process.env.SUPPORT_CHAT_ID
  ? Number(process.env.SUPPORT_CHAT_ID)
  : config.supportChatId || null;
let ownerUserId = process.env.OWNER_USER_ID
  ? Number(process.env.OWNER_USER_ID)
  : config.ownerUserId || null;

const bot = new Telegraf(BOT_TOKEN);
const activeSpecialistChats = new Map(
  Object.entries(config.activeChats || {}).map(([chatId, value]) => [Number(chatId), value])
);
const pendingBookings = new Map();
const supportMessageTargets = new Map();

const MENU = {
  doctors: 'Doktorlar',
  connect: 'Doktor bilan bog`lanish',
  booking: 'Qabulga yozilish',
  help: 'Yordam',
  finish: 'Chatni tugatish',
  back: 'Ortga',
  yes: 'Ha',
  no: 'Yo`q',
};

const TEXT = {
  welcome:
    'MedPediatr botiga xush kelibsiz.\n\nBu yerda mutaxassisni tanlab, savolingizni operatorga yuborishingiz yoki qabulga yozilishingiz mumkin.',
  askDoctor: 'Doktor bilan bog`lanmoqchimisiz?',
  chooseSpecialist: 'Kerakli mutaxassisni tanlang:',
  chooseBookingDoctor: 'Qaysi mutaxassis qabuliga yozilmoqchisiz?',
  wait: 'Ro`yxat tayyorlanmoqda, biroz kuting...',
  noDoctor: 'Mayli. Kerak bo`lsa, qayta yozishingiz mumkin.',
  chatClosed: 'Chat yopildi. Yangi murojaat boshlash uchun menyudan foydalaning.',
  supportUnavailable:
    'Operator chat hali ulanmagan. Avval owner akkauntdan operator guruhida /setchatid yuborilsin.',
  ownerOnly: 'Bu buyruq faqat bot egasi uchun.',
  ownerSaved: (userId) => `Owner saqlandi. User ID: ${userId}`,
  chatStarted: (doctorName) =>
    `${doctorName} tanlandi.\n\nEndi savolingizni text, rasm, video, audio yoki fayl ko'rinishida yuboring.`,
  sentToSpecialist: (doctorName) =>
    `Xabaringiz ${doctorName} uchun operatorga yuborildi. Javob shu bot ichiga keladi.`,
  specialistReplyPrefix: (doctorName) => `${doctorName} javobi:`,
  help:
    'Asosiy buyruqlar:\n/start - bosh menyu\n/doctors - mutaxassislar ro`yxati\n/help - yordam\n/chatid - joriy chat ID\n/myid - sizning user ID\n/cancel - joriy holatni bekor qilish',
  emergency:
    'Muhim: bu bot shoshilinch tibbiy yordam o`rnini bosmaydi. Nafas qisilishi, hushdan ketish, kuchli og`riq yoki qon ketish bo`lsa, zudlik bilan shifoxonaga murojaat qiling.',
  bookingCancelled: 'Qabulga yozilish jarayoni bekor qilindi.',
  askPatientName: 'Bemor ismini yuboring.',
  askPatientAge: 'Bemor yoshini yuboring.',
  askPhone: 'Bog`lanish uchun telefon raqamini yuboring.',
  askComplaint: 'Qisqacha muammoni yozing.',
  invalidAge: 'Yoshni son ko`rinishida yuboring. Masalan: 4',
  invalidPhone: 'Telefon raqamini to`g`ri formatda yuboring. Masalan: +998901234567',
  bookingCreated: (doctorName, slot) =>
    `${doctorName} uchun ${slot} vaqtiga so'rov yaratildi. Operator siz bilan bog'lanadi.`,
  bookingReplyPrefix: 'Bron bo`yicha operator javobi:',
  noPendingBookings: 'Hozircha pending bronlar yo`q.',
};

const doctorData = {
  malika: {
    name: 'Malika Alisherovna',
    title: 'Bolalar nevrologi',
    experience: '25+ yil',
    summary: 'Nutq kechikishi, diqqat, uyqu va nevrologik rivojlanish masalalari.',
    topics: [
      'nutq rivojlanishi kechikishi',
      'diqqat jamlash qiyinligi',
      'uyqu bezovtaligi',
      'bosh og`riqlari',
    ],
  },
  anvar: {
    name: 'Anvar Hakimov',
    title: 'Nevrolog-epileptolog',
    experience: '15 yil',
    summary: 'Tutqanoq, EEG, tiklar va hush bilan bog`liq holatlar.',
    topics: ['EEG tahlili', 'tutqanoq', 'tik va duduqlanish', 'uyqudagi bezovtalik'],
  },
  lola: {
    name: 'Lola Kirimova',
    title: 'LOR shifokor',
    experience: '18 yil',
    summary: 'Quloq, tomoq, burun bilan bog`liq bolalar muammolari.',
    topics: ['adenoid', 'otit', 'sinusit', 'tez-tez shamollash'],
  },
  sanjar: {
    name: 'Sanjar Yusupov',
    title: 'Bolalar oftalmologi',
    experience: '14 yil',
    summary: 'Ko`rish pasayishi, g`ilaylik va ko`z zo`riqishi.',
    topics: ['miopiya', 'g`ilaylik', 'ambliopiya', 'ekrandan ko`z charchashi'],
  },
  nargiza: {
    name: 'Nargiza Saidova',
    title: 'Pediatr-dietolog',
    experience: '12 yil',
    summary: 'Ovqatlanish, vazn nazorati va hazm bilan bog`liq masalalar.',
    topics: ['allergiya', 'vazn nazorati', 'ishtaha pasayishi', 'ovqatlanish rejimi'],
  },
  dilshod: {
    name: 'Dilshod Rahmonov',
    title: 'Bolalar xirurgi',
    experience: '20 yil',
    summary: 'Churra, yumshoq to`qima va kichik xirurgik ko`riklar.',
    topics: ['kindik churrasi', 'shish yoki bo`rtma', 'jarrohlik ko`rigi', 'tug`ma holatlar'],
  },
};

function persistConfig() {
  config.activeChats = Object.fromEntries(activeSpecialistChats.entries());
  config.bookings = config.bookings || [];
  config.userStats = config.userStats || {};
  if (!process.env.SUPPORT_CHAT_ID) {
    config.supportChatId = supportChatId;
  }
  if (!process.env.OWNER_USER_ID) {
    config.ownerUserId = ownerUserId;
  }
  saveConfig(config);
}

function getUserStats(userId) {
  const key = String(userId);
  if (!config.userStats[key]) {
    config.userStats[key] = {
      firstSeenAt: new Date().toISOString(),
      fullName: '',
      username: '',
      lastSeenAt: null,
      messagesSent: 0,
      bookingsCreated: 0,
      lastDoctorKey: null,
    };
  }
  return config.userStats[key];
}

function touchUser(ctx) {
  if (!ctx.from) {
    return;
  }

  const stats = getUserStats(ctx.from.id);
  stats.fullName = getUserFullName(ctx.from);
  stats.username = ctx.from.username ? `@${ctx.from.username}` : '';
  stats.lastSeenAt = new Date().toISOString();
  persistConfig();
}

function incrementUserMessages(ctx, doctorKey) {
  const stats = getUserStats(ctx.from.id);
  stats.messagesSent += 1;
  stats.lastDoctorKey = doctorKey;
  stats.lastSeenAt = new Date().toISOString();
  persistConfig();
}

function incrementUserBookings(userId, doctorKey) {
  const stats = getUserStats(userId);
  stats.bookingsCreated += 1;
  stats.lastDoctorKey = doctorKey;
  stats.lastSeenAt = new Date().toISOString();
  persistConfig();
}

function getAdminStatsText() {
  const users = Object.values(config.userStats || {});
  const bookings = config.bookings || [];
  const pending = bookings.filter((item) => item.status === 'pending');
  const today = new Date().toISOString().slice(0, 10);
  const todayBookings = bookings.filter((item) => String(item.createdAt || '').startsWith(today));
  const topUsers = Object.entries(config.userStats || {})
    .sort(([, a], [, b]) => (b.messagesSent || 0) - (a.messagesSent || 0))
    .slice(0, 3)
    .map(([userId, stats]) => `${stats.fullName || userId}: ${stats.messagesSent || 0} xabar`);

  return [
    `Support chat: ${supportChatId || 'ulanmagan'}`,
    `Owner: ${ownerUserId || "yo'q"}`,
    `Active chats: ${activeSpecialistChats.size}`,
    `Jami foydalanuvchilar: ${users.length}`,
    `Jami bronlar: ${bookings.length}`,
    `Pending bronlar: ${pending.length}`,
    `Bugungi bronlar: ${todayBookings.length}`,
    `Top foydalanuvchilar:`,
    ...(topUsers.length ? topUsers.map((item) => `- ${item}`) : ['- hali ma`lumot yo`q']),
  ].join('\n');
}

function getDoctorBookingsSummary() {
  const counts = Object.keys(doctorData).map((doctorKey) => {
    const count = (config.bookings || []).filter((item) => item.doctorKey === doctorKey).length;
    return `- ${doctorData[doctorKey].name}: ${count}`;
  });

  return ['Bronlar kesimida:', ...counts].join('\n');
}

function isOwner(ctx) {
  return Boolean(ownerUserId && ctx.from && ctx.from.id === ownerUserId);
}

function ensureOwner(ctx) {
  if (!ownerUserId && ctx.from) {
    ownerUserId = ctx.from.id;
    config.ownerUserId = ownerUserId;
    persistConfig();
    return true;
  }

  return isOwner(ctx);
}

function resetBookingDraft(chatId) {
  pendingBookings.delete(chatId);
}

function getMainKeyboard() {
  return Markup.keyboard(
    [[MENU.doctors, MENU.connect], [MENU.booking, MENU.help]],
    { columns: 2 }
  ).resize();
}

function getConfirmKeyboard() {
  return Markup.keyboard(
    [[MENU.yes, MENU.no], [MENU.doctors, MENU.booking], [MENU.help]]
  ).resize();
}

function getChatKeyboard() {
  return Markup.keyboard([[MENU.finish], [MENU.doctors, MENU.booking], [MENU.help]]).resize();
}

function getDoctorButtons(prefix = 'info') {
  return Markup.inlineKeyboard([
    [
      { text: doctorData.malika.name, callback_data: `${prefix}_malika` },
      { text: doctorData.anvar.name, callback_data: `${prefix}_anvar` },
    ],
    [
      { text: doctorData.lola.name, callback_data: `${prefix}_lola` },
      { text: doctorData.sanjar.name, callback_data: `${prefix}_sanjar` },
    ],
    [
      { text: doctorData.nargiza.name, callback_data: `${prefix}_nargiza` },
      { text: doctorData.dilshod.name, callback_data: `${prefix}_dilshod` },
    ],
  ]);
}

function getDoctorActionButtons(doctorKey) {
  return Markup.inlineKeyboard([
    [{ text: 'Savol yuborish', callback_data: `start_chat_${doctorKey}` }],
    [{ text: 'Qabulga yozilish', callback_data: `booking_doctor_${doctorKey}` }],
    [{ text: MENU.back, callback_data: 'back_to_list' }],
  ]);
}

function getBookingSlotButtons(doctorKey) {
  const slots = config.doctorSchedules[doctorKey] || [];
  const rows = slots.map((slot, index) => [
    { text: slot, callback_data: `booking_slot_${doctorKey}_${index}` },
  ]);
  rows.push([{ text: MENU.back, callback_data: 'back_to_booking_doctors' }]);
  return Markup.inlineKeyboard(rows);
}

function getUserFullName(from) {
  return [from?.first_name, from?.last_name].filter(Boolean).join(' ') || 'Noma`lum';
}

function extractChatIdFromSupportMessage(message) {
  if (!message) {
    return null;
  }

  const sources = [message.text, message.caption].filter(Boolean);
  for (const source of sources) {
    const match = source.match(/Chat ID:\s*(-?\d+)/i);
    if (match) {
      return Number(match[1]);
    }
  }

  return null;
}

function buildDoctorCard(doctor, doctorKey) {
  const topics = doctor.topics.map((topic) => `- ${topic}`).join('\n');
  const schedule = (config.doctorSchedules[doctorKey] || []).map((item) => `- ${item}`).join('\n');
  return [
    `<b>${doctor.name}</b>`,
    `${doctor.title}`,
    '',
    `<b>Tajriba:</b> ${doctor.experience}`,
    `<b>Yo'nalish:</b> ${doctor.summary}`,
    '',
    `<b>Ko'p murojaat qilinadigan mavzular:</b>`,
    topics,
    '',
    `<b>Bo'sh vaqtlar:</b>`,
    schedule || '- tez orada yangilanadi',
  ].join('\n');
}

function getMessageTypeLabel(message) {
  if (message.text) {
    return 'Text';
  }
  if (message.photo) {
    return 'Photo';
  }
  if (message.video) {
    return 'Video';
  }
  if (message.voice) {
    return 'Voice';
  }
  if (message.audio) {
    return 'Audio';
  }
  if (message.document) {
    return 'Document';
  }
  if (message.sticker) {
    return 'Sticker';
  }
  if (message.contact) {
    return 'Contact';
  }
  if (message.location) {
    return 'Location';
  }
  return 'Message';
}

function getMessagePreview(message) {
  const previewSource = message.text || message.caption || '';
  if (!previewSource) {
    return '[Media yoki servis xabari]';
  }

  return previewSource.length > 500 ? `${previewSource.slice(0, 500)}...` : previewSource;
}

function buildBookingSupportText(booking) {
  const doctor = doctorData[booking.doctorKey];
  return [
    'Yangi bron so`rovi',
    `Mutaxassis: ${doctor.name}`,
    `Yo'nalish: ${doctor.title}`,
    `Slot: ${booking.slot}`,
    `Bemor: ${booking.patientName}`,
    `Yosh: ${booking.patientAge}`,
    `Telefon: ${booking.phone}`,
    `Muammo: ${booking.complaint}`,
    `Foydalanuvchi: ${booking.userFullName}`,
    `Username: ${booking.username || "yo'q"}`,
    `User ID: ${booking.userId}`,
    `Chat ID: ${booking.chatId}`,
    `Status: ${booking.status}`,
  ].join('\n');
}

async function safeAnswerCbQuery(ctx, text) {
  try {
    await ctx.answerCbQuery(text);
  } catch (error) {
    console.error('answerCbQuery xatosi:', error.message);
  }
}

async function sendWelcome(ctx) {
  activeSpecialistChats.delete(ctx.chat.id);
  resetBookingDraft(ctx.chat.id);
  persistConfig();
  touchUser(ctx);
  await ctx.reply(TEXT.welcome, getMainKeyboard());
  await ctx.reply(TEXT.emergency, getConfirmKeyboard());
  await ctx.reply(TEXT.askDoctor, getConfirmKeyboard());
}

async function sendSpecialistList(ctx) {
  await ctx.reply(TEXT.chooseSpecialist, getDoctorButtons());
}

async function sendBookingDoctorList(ctx) {
  resetBookingDraft(ctx.chat.id);
  await ctx.reply(TEXT.chooseBookingDoctor, getDoctorButtons('booking_doctor'));
}

async function createBooking(ctx) {
  const draft = pendingBookings.get(ctx.chat.id);
  if (!draft || !draft.doctorKey || !draft.slot || !draft.patientName || !draft.patientAge || !draft.phone) {
    return;
  }

  const booking = {
    id: `bk_${Date.now()}`,
    doctorKey: draft.doctorKey,
    slot: draft.slot,
    patientName: draft.patientName,
    patientAge: draft.patientAge,
    phone: draft.phone,
    complaint: draft.complaint || '',
    userId: ctx.from.id,
    chatId: ctx.chat.id,
    userFullName: getUserFullName(ctx.from),
    username: ctx.from.username ? `@${ctx.from.username}` : '',
    createdAt: new Date().toISOString(),
    status: 'pending',
  };

  config.bookings.push(booking);
  incrementUserBookings(ctx.from.id, draft.doctorKey);
  resetBookingDraft(ctx.chat.id);
  persistConfig();

  if (supportChatId) {
    const sent = await bot.telegram.sendMessage(supportChatId, buildBookingSupportText(booking));
    supportMessageTargets.set(sent.message_id, {
      kind: 'booking',
      targetUserId: ctx.chat.id,
      doctorKey: booking.doctorKey,
      bookingId: booking.id,
    });
  }

  await ctx.reply(
    TEXT.bookingCreated(doctorData[booking.doctorKey].name, booking.slot),
    getMainKeyboard()
  );
}

async function forwardMessageToSupport(ctx, activeChat) {
  if (!supportChatId) {
    await ctx.reply(TEXT.supportUnavailable, getChatKeyboard());
    return;
  }

  incrementUserMessages(ctx, activeChat.doctorKey);

  const doctor = doctorData[activeChat.doctorKey];
  const metaText = [
    `Mutaxassis: ${doctor.name}`,
    `Yo'nalish: ${doctor.title}`,
    `Foydalanuvchi: ${getUserFullName(ctx.from)}`,
    `Username: ${ctx.from.username ? `@${ctx.from.username}` : "yo'q"}`,
    `User ID: ${ctx.from.id}`,
    `Chat ID: ${ctx.chat.id}`,
    `Xabar turi: ${getMessageTypeLabel(ctx.message)}`,
    '',
    getMessagePreview(ctx.message),
  ].join('\n');

  const metaMessage = await bot.telegram.sendMessage(supportChatId, metaText);
  supportMessageTargets.set(metaMessage.message_id, {
    kind: 'chat',
    targetUserId: ctx.chat.id,
    doctorKey: activeChat.doctorKey,
  });

  if (!ctx.message.text) {
    const copiedMessage = await bot.telegram.copyMessage(
      supportChatId,
      ctx.chat.id,
      ctx.message.message_id
    );

    supportMessageTargets.set(copiedMessage.message_id, {
      kind: 'chat',
      targetUserId: ctx.chat.id,
      doctorKey: activeChat.doctorKey,
    });
  }

  await ctx.reply(TEXT.sentToSpecialist(doctor.name), getChatKeyboard());
}

async function relaySupportReply(ctx) {
  if (!supportChatId || ctx.chat.id !== supportChatId) {
    return false;
  }

  const replyMessage = ctx.message.reply_to_message;
  const mappedTarget = replyMessage ? supportMessageTargets.get(replyMessage.message_id) : null;
  const fallbackTargetUserId =
    extractChatIdFromSupportMessage(replyMessage) || extractChatIdFromSupportMessage(ctx.message);
  const targetUserId = mappedTarget?.targetUserId || fallbackTargetUserId;

  if (!targetUserId) {
    return false;
  }

  const activeChat = activeSpecialistChats.get(targetUserId);
  const isBookingReply = mappedTarget?.kind === 'booking';
  const doctorName =
    doctorData[mappedTarget?.doctorKey || activeChat?.doctorKey]?.name || 'Mutaxassis';
  const replyKeyboard = isBookingReply ? getMainKeyboard() : getChatKeyboard();

  if (isBookingReply && mappedTarget?.bookingId) {
    const booking = (config.bookings || []).find((item) => item.id === mappedTarget.bookingId);
    if (booking && booking.status === 'pending') {
      booking.status = 'contacted';
      booking.updatedAt = new Date().toISOString();
      persistConfig();
    }
  }

  if (ctx.message.text) {
    await bot.telegram.sendMessage(
      targetUserId,
      `${
        isBookingReply ? TEXT.bookingReplyPrefix : TEXT.specialistReplyPrefix(doctorName)
      }\n${ctx.message.text}`,
      { reply_markup: replyKeyboard.reply_markup }
    );
  } else {
    await bot.telegram.sendMessage(
      targetUserId,
      isBookingReply ? TEXT.bookingReplyPrefix : TEXT.specialistReplyPrefix(doctorName),
      {
        reply_markup: replyKeyboard.reply_markup,
      }
    );
    await bot.telegram.copyMessage(targetUserId, ctx.chat.id, ctx.message.message_id);
  }

  if (!isBookingReply && !activeSpecialistChats.has(targetUserId) && mappedTarget?.doctorKey) {
    activeSpecialistChats.set(targetUserId, {
      doctorKey: mappedTarget.doctorKey,
      startedAt: new Date().toISOString(),
    });
    persistConfig();
  }

  if (isBookingReply && mappedTarget?.bookingId) {
    await ctx.reply(`Booking javobi yuborildi -> ${targetUserId}`);
  } else {
    await ctx.reply(`Yuborildi -> ${targetUserId}`);
  }

  return true;
}

app.get('/', (req, res) => {
  res.json({
    ok: true,
    service: 'MedPediatr bot',
    supportChatId,
    activeChats: activeSpecialistChats.size,
    users: Object.keys(config.userStats || {}).length,
    bookings: (config.bookings || []).length,
    pendingBookings: (config.bookings || []).filter((item) => item.status === 'pending').length,
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server ${PORT} portda ishlayapti.`);
});

setInterval(() => {
  console.log(
    `Bot aktiv. Active chats: ${activeSpecialistChats.size}. Pending bronlar: ${
      (config.bookings || []).filter((item) => item.status === 'pending').length
    }`
  );
}, 300000);

bot.start(sendWelcome);

bot.use(async (ctx, next) => {
  touchUser(ctx);
  return next();
});

bot.command('help', async (ctx) => {
  await ctx.reply(`${TEXT.help}\n\n${TEXT.emergency}`, getMainKeyboard());
});

bot.command('doctors', sendSpecialistList);

bot.command('book', sendBookingDoctorList);

bot.command('chatid', async (ctx) => {
  await ctx.reply(`Chat ID: ${ctx.chat.id}`);
});

bot.command('myid', async (ctx) => {
  await ctx.reply(`User ID: ${ctx.from.id}`);
});

bot.command('cancel', async (ctx) => {
  activeSpecialistChats.delete(ctx.chat.id);
  resetBookingDraft(ctx.chat.id);
  persistConfig();
  await ctx.reply(`${TEXT.chatClosed}\n${TEXT.bookingCancelled}`, getMainKeyboard());
});

bot.command('stats', async (ctx) => {
  if (!ensureOwner(ctx)) {
    await ctx.reply(TEXT.ownerOnly);
    return;
  }

  await ctx.reply(`${getAdminStatsText()}\n\n${getDoctorBookingsSummary()}`);
});

bot.command('bookings', async (ctx) => {
  if (!ensureOwner(ctx)) {
    await ctx.reply(TEXT.ownerOnly);
    return;
  }

  const pending = (config.bookings || []).filter((item) => item.status === 'pending').slice(-10);
  if (!pending.length) {
    await ctx.reply(TEXT.noPendingBookings);
    return;
  }

  const lines = pending.map((item) => {
    const doctor = doctorData[item.doctorKey];
    return `- ${item.patientName} | ${doctor.name} | ${item.slot} | ${item.phone}`;
  });
  await ctx.reply(['Oxirgi pending bronlar:', ...lines].join('\n'));
});

bot.command('setchatid', async (ctx) => {
  if (!ensureOwner(ctx)) {
    await ctx.reply(TEXT.ownerOnly);
    return;
  }

  supportChatId = ctx.chat.id;
  config.ownerUserId = ownerUserId;
  config.supportChatId = supportChatId;
  persistConfig();

  await ctx.reply(
    `${TEXT.ownerSaved(ownerUserId)}\nOperator chat ulandi.\nChat ID: ${supportChatId}`
  );
});

bot.action(/info_(.+)/, async (ctx) => {
  const doctorKey = ctx.match[1];
  const doctor = doctorData[doctorKey];

  if (!doctor) {
    await safeAnswerCbQuery(ctx, 'Mutaxassis topilmadi');
    return;
  }

  await safeAnswerCbQuery(ctx);
  await ctx.editMessageText(buildDoctorCard(doctor, doctorKey), {
    parse_mode: 'HTML',
    ...getDoctorActionButtons(doctorKey),
  });
});

bot.action(/booking_doctor_(.+)/, async (ctx) => {
  const doctorKey = ctx.match[1];
  const doctor = doctorData[doctorKey];

  if (!doctor) {
    await safeAnswerCbQuery(ctx, 'Mutaxassis topilmadi');
    return;
  }

  pendingBookings.set(ctx.chat.id, { step: 'slot', doctorKey });
  await safeAnswerCbQuery(ctx, 'Vaqtni tanlang');
  await ctx.editMessageText(
    `${doctor.name} uchun bo'sh vaqtlardan birini tanlang:`,
    getBookingSlotButtons(doctorKey)
  );
});

bot.action(/booking_slot_(.+)_(\d+)/, async (ctx) => {
  const doctorKey = ctx.match[1];
  const slotIndex = Number(ctx.match[2]);
  const slot = (config.doctorSchedules[doctorKey] || [])[slotIndex];

  if (!slot) {
    await safeAnswerCbQuery(ctx, 'Vaqt topilmadi');
    return;
  }

  pendingBookings.set(ctx.chat.id, {
    step: 'patient_name',
    doctorKey,
    slot,
  });

  await safeAnswerCbQuery(ctx, 'Bron boshlandi');
  await ctx.reply(
    `${doctorData[doctorKey].name} uchun ${slot} tanlandi.\n\n${TEXT.askPatientName}`,
    getMainKeyboard()
  );
});

bot.action(/start_chat_(.+)/, async (ctx) => {
  const doctorKey = ctx.match[1];
  const doctor = doctorData[doctorKey];

  if (!doctor) {
    await safeAnswerCbQuery(ctx, 'Mutaxassis topilmadi');
    return;
  }

  resetBookingDraft(ctx.chat.id);
  activeSpecialistChats.set(ctx.chat.id, { doctorKey, startedAt: new Date().toISOString() });
  persistConfig();

  await safeAnswerCbQuery(ctx, 'Chat boshlandi');
  await ctx.reply(TEXT.chatStarted(doctor.name), getChatKeyboard());
});

bot.action('back_to_list', async (ctx) => {
  await safeAnswerCbQuery(ctx);
  await ctx.editMessageText(TEXT.chooseSpecialist, getDoctorButtons());
});

bot.action('back_to_booking_doctors', async (ctx) => {
  resetBookingDraft(ctx.chat.id);
  await safeAnswerCbQuery(ctx);
  await ctx.editMessageText(TEXT.chooseBookingDoctor, getDoctorButtons('booking_doctor'));
});

bot.on('text', async (ctx) => {
  if (await relaySupportReply(ctx)) {
    return;
  }

  const text = (ctx.message.text || '').trim();
  const activeChat = activeSpecialistChats.get(ctx.chat.id);
  const bookingDraft = pendingBookings.get(ctx.chat.id);

  if (text === MENU.finish) {
    activeSpecialistChats.delete(ctx.chat.id);
    persistConfig();
    await ctx.reply(TEXT.chatClosed, getMainKeyboard());
    return;
  }

  if (text === MENU.doctors) {
    await sendSpecialistList(ctx);
    return;
  }

  if (text === MENU.booking) {
    await sendBookingDoctorList(ctx);
    return;
  }

  if (text === MENU.help) {
    await ctx.reply(`${TEXT.help}\n\n${TEXT.emergency}`, getMainKeyboard());
    return;
  }

  if (text === MENU.connect || text === MENU.yes) {
    await ctx.reply(TEXT.wait);
    setTimeout(() => {
      ctx.reply(TEXT.chooseSpecialist, getDoctorButtons()).catch((error) => {
        console.error('Doktorlar ro`yxatini yuborishda xato:', error.message);
      });
    }, 1200);
    return;
  }

  if (text === MENU.no || text === MENU.back) {
    activeSpecialistChats.delete(ctx.chat.id);
    resetBookingDraft(ctx.chat.id);
    persistConfig();
    await ctx.reply(TEXT.noDoctor, getMainKeyboard());
    return;
  }

  if (bookingDraft) {
    if (bookingDraft.step === 'patient_name') {
      bookingDraft.patientName = text;
      bookingDraft.step = 'patient_age';
      pendingBookings.set(ctx.chat.id, bookingDraft);
      await ctx.reply(TEXT.askPatientAge, getMainKeyboard());
      return;
    }

    if (bookingDraft.step === 'patient_age') {
      if (!/^\d{1,2}$/.test(text)) {
        await ctx.reply(TEXT.invalidAge, getMainKeyboard());
        return;
      }

      bookingDraft.patientAge = Number(text);
      bookingDraft.step = 'phone';
      pendingBookings.set(ctx.chat.id, bookingDraft);
      await ctx.reply(TEXT.askPhone, getMainKeyboard());
      return;
    }

    if (bookingDraft.step === 'phone') {
      if (!/^\+?\d{9,15}$/.test(text.replace(/\s+/g, ''))) {
        await ctx.reply(TEXT.invalidPhone, getMainKeyboard());
        return;
      }

      bookingDraft.phone = text.replace(/\s+/g, '');
      bookingDraft.step = 'complaint';
      pendingBookings.set(ctx.chat.id, bookingDraft);
      await ctx.reply(TEXT.askComplaint, getMainKeyboard());
      return;
    }

    if (bookingDraft.step === 'complaint') {
      bookingDraft.complaint = text;
      pendingBookings.set(ctx.chat.id, bookingDraft);
      await createBooking(ctx);
      return;
    }
  }

  if (activeChat) {
    await forwardMessageToSupport(ctx, activeChat);
    return;
  }

  await ctx.reply(TEXT.askDoctor, getConfirmKeyboard());
});

bot.on(['photo', 'video', 'voice', 'audio', 'document', 'sticker'], async (ctx) => {
  if (await relaySupportReply(ctx)) {
    return;
  }

  const activeChat = activeSpecialistChats.get(ctx.chat.id);
  if (!activeChat) {
    await ctx.reply(
      'Avval mutaxassis tanlang, keyin media yuboring.',
      getConfirmKeyboard()
    );
    return;
  }

  await forwardMessageToSupport(ctx, activeChat);
});

bot.catch((error) => {
  console.error('Bot xatosi:', error);
});

bot.launch();
console.log('Bot ishga tushdi.');
