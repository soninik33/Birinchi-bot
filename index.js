require('dotenv').config();
const { Telegraf, Markup } = require('telegraf');
const express = require('express');
const path = require('path');

process.on('unhandledRejection', (reason, promise) => {
  console.warn('⚠️ Unhandled Rejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
});

// Constants & Utils
const MENUS = require('./src/constants/menus');
const TEXTS = require('./src/constants/texts');
const { DOCTOR_DATA } = require('./src/constants/doctors');
const { loadConfig, saveConfig } = require('./src/utils/config');
const {
  buildDoctorCard,
  getUserFullName
} = require('./src/utils/helpers');
const { renderReceiptHtml, renderNotFoundHtml, MAP_URL } = require('./src/utils/receipt');

// Keyboards
const {
  getMainKeyboard,
  getConfirmKeyboard,
  getChatKeyboard,
  getDoctorButtons,
  getDoctorActionButtons,
  getBookingSlotButtons,
  getLangKeyboard,
  getLocationKeyboard
} = require('./src/bot/keyboards');

// Handlers
const BotHandlers = require('./src/handlers/botHandlers');

// Initialize
const app = express();
const PORT = Number(process.env.PORT || 1000);
const config = loadConfig();

const BOT_TOKEN = process.env.BOT_TOKEN || config.botToken;
if (!BOT_TOKEN) {
  console.error('❌ BOT_TOKEN topilmadi! Iltimos, uni .env fayliga yozing.');
  process.exit(1);
}

// Environment settings
if (process.env.SUPPORT_CHAT_ID) config.supportChatId = Number(process.env.SUPPORT_CHAT_ID);
if (process.env.OWNER_USER_ID) config.ownerUserId = Number(process.env.OWNER_USER_ID);

const bot = new Telegraf(BOT_TOKEN);

// State
const activeSpecialistChats = new Map(
  Object.entries(config.activeChats || {}).map(([id, val]) => [Number(id), val])
);
const pendingBookings = new Map();
const supportMessageTargets = new Map();

function persistConfig() {
  config.activeChats = Object.fromEntries(activeSpecialistChats.entries());
  saveConfig(config);
}

const handlers = new BotHandlers(
  bot,
  config,
  activeSpecialistChats,
  pendingBookings,
  supportMessageTargets,
  persistConfig
);

// --- Middleware ---
function getStats(userId) {
  const key = String(userId);
  if (!config.userStats[key]) {
    config.userStats[key] = {
      firstSeenAt: new Date().toISOString(),
      messagesSent: 0,
      bookingsCreated: 0,
      fullName: '',
      username: '',
      lang: null // Will be set on /start or language selection
    };
  }
  return config.userStats[key];
}

bot.use(async (ctx, next) => {
  if (ctx.from) {
    const stats = getStats(ctx.from.id);
    stats.fullName = getUserFullName(ctx.from);
    stats.username = ctx.from.username ? `@${ctx.from.username}` : '';
    stats.lastSeenAt = new Date().toISOString();
    persistConfig();
  }
  return next();
});

function ensureOwner(ctx) {
  if (!config.ownerUserId && ctx.from) {
    config.ownerUserId = ctx.from.id;
    persistConfig();
    return true;
  }
  return config.ownerUserId === ctx.from?.id;
}

// --- Commands ---
bot.start(async (ctx) => {
  const stats = getStats(ctx.from.id);
  if (!stats.lang) {
    await handlers.askLanguage(ctx);
  } else {
    await handlers.sendWelcome(ctx);
  }
});

bot.help((ctx) => {
  const lang = handlers.getLang(ctx);
  ctx.replyWithHTML(TEXTS[lang].help, getMainKeyboard(lang));
});

bot.command('doctors', (ctx) => handlers.sendSpecialistList(ctx));
bot.command('book', (ctx) => handlers.sendBookingDoctorList(ctx));
bot.command('location', (ctx) => {
  const lang = handlers.getLang(ctx);
  ctx.replyWithHTML(TEXTS[lang].locationInfo, getLocationKeyboard(lang));
});
bot.command('myid', (ctx) => ctx.reply(`Sizning ID: ${ctx.from.id}`));
bot.command('cancel', async (ctx) => {
  const lang = handlers.getLang(ctx);
  activeSpecialistChats.delete(ctx.chat.id);
  pendingBookings.delete(ctx.chat.id);
  persistConfig();
  await ctx.replyWithHTML(`${TEXTS[lang].chatClosed}\n${TEXTS[lang].bookingCancelled}`, getMainKeyboard(lang));
});

bot.command('setchatid', async (ctx) => {
  if (!ensureOwner(ctx)) return ctx.reply(TEXTS.uz.ownerOnly);
  config.supportChatId = ctx.chat.id;
  persistConfig();
  await ctx.replyWithHTML(TEXTS.uz.ownerSaved(ctx.from.id) + `\nChat ID: <code>${ctx.chat.id}</code>`);
});

bot.command('stats', async (ctx) => {
  if (!ensureOwner(ctx)) return ctx.reply(TEXTS.uz.ownerOnly);
  const users = Object.values(config.userStats || {});
  const stats = [
    `📊 <b>Bot Statistikasi:</b>`,
    `👥 Jami foydalanuvchilar: ${users.length}`,
    `📅 Jami bronlar: ${(config.bookings || []).length}`,
    `💬 Aktiv chatlar: ${activeSpecialistChats.size}`
  ].join('\n');
  await ctx.replyWithHTML(stats);
});

// --- Actions ---
bot.action(/lang_(.+)/, async (ctx) => {
  const lang = ctx.match[1];
  const stats = getStats(ctx.from.id);
  stats.lang = lang;
  persistConfig();
  await ctx.answerCbQuery();
  await ctx.deleteMessage().catch(() => { });
  await handlers.sendWelcome(ctx);
});

bot.action(/info_(.+)/, async (ctx) => {
  const lang = handlers.getLang(ctx);
  const doctorKey = ctx.match[1];
  const doctor = DOCTOR_DATA[doctorKey];
  if (!doctor) return ctx.answerCbQuery('Error!');

  await ctx.answerCbQuery();
  await ctx.editMessageText(buildDoctorCard(doctor, doctorKey, config.doctorSchedules, lang), {
    parse_mode: 'HTML',
    ...getDoctorActionButtons(doctorKey, lang),
  });
});

bot.action(/booking_doctor_(.+)/, async (ctx) => {
  const lang = handlers.getLang(ctx);
  const doctorKey = ctx.match[1];
  if (!DOCTOR_DATA[doctorKey]) return ctx.answerCbQuery('Error!');

  pendingBookings.set(ctx.chat.id, { step: 'slot', doctorKey });
  await ctx.answerCbQuery();
  const docName = (DOCTOR_DATA[doctorKey][lang] || DOCTOR_DATA[doctorKey].uz).name;
  await ctx.editMessageText(
    `<b>${docName}</b> ${lang === 'uz' ? 'uchun qulay vaqtni tanlang:' : 'выберите удобное время:'}`,
    {
      parse_mode: 'HTML',
      ...getBookingSlotButtons(doctorKey, config.doctorSchedules, lang)
    }
  );
});

bot.action(/booking_slot_(.+)_(\d+)/, async (ctx) => {
  const lang = handlers.getLang(ctx);
  const t = TEXTS[lang] || TEXTS.uz;
  const doctorKey = ctx.match[1];
  const slotIndex = Number(ctx.match[2]);
  const slot = (config.doctorSchedules[doctorKey] || [])[slotIndex];

  if (!slot) return ctx.answerCbQuery('Error!');

  pendingBookings.set(ctx.chat.id, { step: 'patient_name', doctorKey, slot });

  await ctx.answerCbQuery();
  const docName = (DOCTOR_DATA[doctorKey][lang] || DOCTOR_DATA[doctorKey].uz).name;
  await ctx.replyWithHTML(
    `✅ <b>${docName}</b> (${slot}) ${lang === 'uz' ? 'tanlandi' : 'выбрано'}.\n\n${t.askPatientName}`,
    Markup.removeKeyboard()
  );
});

bot.action(/start_chat_(.+)/, async (ctx) => {
  const lang = handlers.getLang(ctx);
  const doctorKey = ctx.match[1];
  if (!DOCTOR_DATA[doctorKey]) return ctx.answerCbQuery('Error!');

  pendingBookings.delete(ctx.chat.id);
  activeSpecialistChats.set(ctx.chat.id, { doctorKey, startedAt: new Date().toISOString() });
  persistConfig();

  await ctx.answerCbQuery();
  const docName = (DOCTOR_DATA[doctorKey][lang] || DOCTOR_DATA[doctorKey].uz).name;
  await ctx.replyWithHTML(TEXTS[lang].chatStarted(docName), getChatKeyboard(lang));
});

bot.action('back_to_list', async (ctx) => {
  const lang = handlers.getLang(ctx);
  await ctx.answerCbQuery();
  await ctx.editMessageText(TEXTS[lang].chooseSpecialist, {
    parse_mode: 'HTML',
    ...getDoctorButtons('info', lang)
  });
});

bot.action('back_to_booking_doctors', async (ctx) => {
  const lang = handlers.getLang(ctx);
  pendingBookings.delete(ctx.chat.id);
  await ctx.answerCbQuery();
  await ctx.editMessageText(TEXTS[lang].chooseBookingDoctor, {
    parse_mode: 'HTML',
    ...getDoctorButtons('booking_doctor', lang)
  });
});

// --- Generic Message Handlers ---
bot.on('text', async (ctx) => {
  if (await handlers.handleSupportReply(ctx)) return;

  const lang = handlers.getLang(ctx);
  const t = TEXTS[lang] || TEXTS.uz;
  const m = MENUS[lang] || MENUS.uz;
  const text = (ctx.message.text || '').trim();
  const activeChat = activeSpecialistChats.get(ctx.chat.id);
  const booking = pendingBookings.get(ctx.chat.id);

  // Menu Handling
  if (text === m.finish) {
    activeSpecialistChats.delete(ctx.chat.id);
    persistConfig();
    return ctx.replyWithHTML(t.chatClosed, getMainKeyboard(lang));
  }
  if (text === m.doctors) return handlers.sendSpecialistList(ctx);
  if (text === m.booking) return handlers.sendBookingDoctorList(ctx);
  if (text === m.help) return ctx.replyWithHTML(t.help, getMainKeyboard(lang));
  if (text === m.changeLang) return handlers.askLanguage(ctx);
  if (text === m.location) {
    return ctx.replyWithHTML(t.locationInfo, getLocationKeyboard(lang));
  }
  if (text === m.connect || text === m.yes) return handlers.sendSpecialistList(ctx);
  if (text === m.no || text === m.back) {
    activeSpecialistChats.delete(ctx.chat.id);
    pendingBookings.delete(ctx.chat.id);
    persistConfig();
    return ctx.replyWithHTML(t.noDoctor, getMainKeyboard(lang));
  }

  // Booking Steps
  if (booking) {
    if (booking.step === 'patient_name') {
      booking.patientName = text;
      booking.step = 'patient_age';
      return ctx.replyWithHTML(t.askPatientAge);
    }
    if (booking.step === 'patient_age') {
      if (!/^\d{1,3}$/.test(text)) return ctx.replyWithHTML(t.invalidAge);
      booking.patientAge = text;
      booking.step = 'phone';
      return ctx.replyWithHTML(t.askPhone);
    }
    if (booking.step === 'phone') {
      const cleanPhone = text.replace(/\s+/g, '');
      if (!/^\+?\d{9,15}$/.test(cleanPhone)) return ctx.replyWithHTML(t.invalidPhone);
      booking.phone = cleanPhone;
      booking.step = 'complaint';
      return ctx.replyWithHTML(t.askComplaint);
    }
    if (booking.step === 'complaint') {
      booking.complaint = text;
      return handlers.createBooking(ctx);
    }
  }

  if (activeChat) return handlers.forwardToSupport(ctx, activeChat);

  // Default fallback
  await ctx.replyWithHTML(t.askDoctor, getConfirmKeyboard(lang));
});

bot.on(['photo', 'video', 'voice', 'audio', 'document', 'sticker'], async (ctx) => {
  if (await handlers.handleSupportReply(ctx)) return;
  const lang = handlers.getLang(ctx);
  const activeChat = activeSpecialistChats.get(ctx.chat.id);
  if (!activeChat) {
    const msg = lang === 'uz' ? '⚠️ Avval mutaxassisni tanlang.' : '⚠️ Сначала выберите специалиста.';
    return ctx.replyWithHTML(msg, getConfirmKeyboard(lang));
  }
  await handlers.forwardToSupport(ctx, activeChat);
});

// --- Server ---
app.get('/', (req, res) => res.json({ ok: true, status: 'running', activeChats: activeSpecialistChats.size }));
app.get('/health', (req, res) => res.status(200).send('OK'));

app.get(['/receipt/:id', '/check/:id'], (req, res) => {
  const bookingId = req.params.id;
  const currentConfig = loadConfig();
  const allBookings = [
    ...(config.bookings || []),
    ...(currentConfig.bookings || [])
  ];
  const booking = allBookings.find((b) => b.id === bookingId);

  if (!booking) {
    return res.status(404).send(renderNotFoundHtml(bookingId));
  }

  const doctor = DOCTOR_DATA[booking.doctorKey] || {};
  res.send(renderReceiptHtml(booking, doctor));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

// --- Launch ---
bot.catch((err) => console.error('❌ Bot Update Error:', err));

let isLaunching = false;
async function startBotWithRetry(retries = 12, delay = 5000) {
  if (isLaunching) return;
  isLaunching = true;

  try {
    console.log('🔄 Telegram webhook holati tekshirilmoqda...');
    try {
      await bot.telegram.deleteWebhook({ drop_pending_updates: true });
      console.log('🧹 Webhook va eski xabarlar tozalandi.');
    } catch (whErr) {
      console.warn('⚠️ Webhook tozalash xabari:', whErr.message);
    }

    await bot.launch({
      dropPendingUpdates: true
    });
    console.log('✅ Bot muvaffaqiyatli ishga tushdi!');
  } catch (err) {
    isLaunching = false;
    const isConflict = err?.response?.error_code === 409 ||
      err?.message?.includes('409') ||
      err?.message?.includes('Conflict') ||
      err?.message?.includes('terminated by other getUpdates');

    if (isConflict && retries > 0) {
      console.warn(`⚠️ 409 Conflict: Boshqa bot nusxasi ishlab turibdi (yoki Render avvalgi konteynerni to'xtatmoqda). ${delay / 1000}s dan keyin qayta ulanadi... (Qolgan urinishlar: ${retries})`);
      setTimeout(() => startBotWithRetry(retries - 1, delay), delay);
    } else {
      console.error('❌ Botni ishga tushirishda xatolik:', err);
      if (retries > 0) {
        setTimeout(() => startBotWithRetry(retries - 1, 10000), 10000);
      }
    }
  }
}

startBotWithRetry();

const gracefulStop = (signal) => {
  console.log(`To'xtatish signali: ${signal}`);
  try {
    bot.stop(signal);
  } catch (e) {}
  process.exit(0);
};

process.once('SIGINT', () => gracefulStop('SIGINT'));
process.once('SIGTERM', () => gracefulStop('SIGTERM'));

