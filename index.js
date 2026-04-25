require('dotenv').config();
const { Telegraf, Markup } = require('telegraf');
const express = require('express');
const path = require('path');

// Constants & Utils
const MENU = require('./src/constants/menus');
const TEXTS = require('./src/constants/texts');
const { DOCTOR_DATA } = require('./src/constants/doctors');
const { loadConfig, saveConfig } = require('./src/utils/config');
const { 
  buildDoctorCard, 
  getUserFullName 
} = require('./src/utils/helpers');

// Keyboards
const {
  getMainKeyboard,
  getConfirmKeyboard,
  getChatKeyboard,
  getDoctorButtons,
  getDoctorActionButtons,
  getBookingSlotButtons
} = require('./src/bot/keyboards');

// Handlers
const BotHandlers = require('./src/handlers/botHandlers');

// Initialize
const app = express();
const PORT = Number(process.env.PORT || 1000);
const config = loadConfig();

const BOT_TOKEN = process.env.BOT_TOKEN || config.botToken;
if (!BOT_TOKEN) {
  console.error('❌ BOT_TOKEN topilmadi!');
  process.exit(1);
}

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
bot.use(async (ctx, next) => {
  if (ctx.from) {
    const stats = config.userStats[ctx.from.id] || {
      firstSeenAt: new Date().toISOString(),
      messagesSent: 0,
      bookingsCreated: 0
    };
    stats.fullName = getUserFullName(ctx.from);
    stats.username = ctx.from.username ? `@${ctx.from.username}` : '';
    stats.lastSeenAt = new Date().toISOString();
    config.userStats[ctx.from.id] = stats;
    persistConfig();
  }
  return next();
});

// --- Commands ---
bot.start((ctx) => handlers.sendWelcome(ctx));
bot.help((ctx) => ctx.replyWithHTML(TEXTS.help, getMainKeyboard()));
bot.command('doctors', (ctx) => handlers.sendSpecialistList(ctx));
bot.command('book', (ctx) => handlers.sendBookingDoctorList(ctx));
bot.command('myid', (ctx) => ctx.reply(`Sizning ID: ${ctx.from.id}`));
bot.command('cancel', async (ctx) => {
  activeSpecialistChats.delete(ctx.chat.id);
  pendingBookings.delete(ctx.chat.id);
  persistConfig();
  await ctx.replyWithHTML(`${TEXTS.chatClosed}\n${TEXTS.bookingCancelled}`, getMainKeyboard());
});

bot.command('setchatid', async (ctx) => {
  if (config.ownerUserId && ctx.from.id !== config.ownerUserId) {
    return ctx.reply(TEXTS.ownerOnly);
  }
  config.supportChatId = ctx.chat.id;
  config.ownerUserId = ctx.from.id;
  persistConfig();
  await ctx.replyWithHTML(TEXTS.ownerSaved(ctx.from.id));
});

bot.command('stats', async (ctx) => {
  if (config.ownerUserId && ctx.from.id !== config.ownerUserId) return ctx.reply(TEXTS.ownerOnly);
  const users = Object.values(config.userStats || {});
  const bookings = config.bookings || [];
  const pending = bookings.filter(b => b.status === 'pending');
  const stats = [
    `📊 <b>Bot Statistikasi:</b>`,
    `👥 Jami foydalanuvchilar: ${users.length}`,
    `📅 Jami bronlar: ${bookings.length}`,
    `⏳ Pending bronlar: ${pending.length}`,
    `💬 Aktiv chatlar: ${activeSpecialistChats.size}`,
    `🏢 Support Chat ID: <code>${config.supportChatId || 'ulanmagan'}</code>`
  ].join('\n');
  await ctx.replyWithHTML(stats);
});

bot.command('bookings', async (ctx) => {
  if (config.ownerUserId && ctx.from.id !== config.ownerUserId) return ctx.reply(TEXTS.ownerOnly);
  const pending = (config.bookings || []).filter(b => b.status === 'pending').slice(-10);
  if (!pending.length) return ctx.reply(TEXTS.noPendingBookings);
  
  const lines = pending.map(b => `• ${b.patientName} | ${DOCTOR_DATA[b.doctorKey]?.name} | ${b.slot}`);
  await ctx.replyWithHTML(`<b>Oxirgi kutilayotgan bronlar:</b>\n\n${lines.join('\n')}`);
});

bot.command('chatid', (ctx) => ctx.reply(`Chat ID: ${ctx.chat.id}`));

// --- Actions ---
bot.action(/info_(.+)/, async (ctx) => {
  const doctorKey = ctx.match[1];
  const doctor = DOCTOR_DATA[doctorKey];
  if (!doctor) return ctx.answerCbQuery('Xato!');
  
  await ctx.answerCbQuery();
  await ctx.editMessageText(buildDoctorCard(doctor, doctorKey, config.doctorSchedules), {
    parse_mode: 'HTML',
    ...getDoctorActionButtons(doctorKey),
  });
});

bot.action(/booking_doctor_(.+)/, async (ctx) => {
  const doctorKey = ctx.match[1];
  if (!DOCTOR_DATA[doctorKey]) return ctx.answerCbQuery('Xato!');

  pendingBookings.set(ctx.chat.id, { step: 'slot', doctorKey });
  await ctx.answerCbQuery('Vaqtni tanlang');
  await ctx.editMessageText(
    `<b>${DOCTOR_DATA[doctorKey].name}</b> uchun qulay vaqtni tanlang:`,
    {
      parse_mode: 'HTML',
      ...getBookingSlotButtons(doctorKey, config.doctorSchedules)
    }
  );
});

bot.action(/booking_slot_(.+)_(\d+)/, async (ctx) => {
  const doctorKey = ctx.match[1];
  const slotIndex = Number(ctx.match[2]);
  const slot = (config.doctorSchedules[doctorKey] || [])[slotIndex];

  if (!slot) return ctx.answerCbQuery('Vaqt topilmadi');

  pendingBookings.set(ctx.chat.id, {
    step: 'patient_name',
    doctorKey,
    slot,
  });

  await ctx.answerCbQuery();
  await ctx.replyWithHTML(
    `✅ <b>${DOCTOR_DATA[doctorKey].name}</b> uchun <b>${slot}</b> tanlandi.\n\n${TEXTS.askPatientName}`,
    Markup.removeKeyboard()
  );
});

bot.action(/start_chat_(.+)/, async (ctx) => {
  const doctorKey = ctx.match[1];
  if (!DOCTOR_DATA[doctorKey]) return ctx.answerCbQuery('Xato!');

  pendingBookings.delete(ctx.chat.id);
  activeSpecialistChats.set(ctx.chat.id, { doctorKey, startedAt: new Date().toISOString() });
  persistConfig();

  await ctx.answerCbQuery('Chat boshlandi');
  await ctx.replyWithHTML(TEXTS.chatStarted(DOCTOR_DATA[doctorKey].name), getChatKeyboard());
});

bot.action('back_to_list', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.editMessageText(TEXTS.chooseSpecialist, {
    parse_mode: 'HTML',
    ...getDoctorButtons()
  });
});

bot.action('back_to_booking_doctors', async (ctx) => {
  pendingBookings.delete(ctx.chat.id);
  await ctx.answerCbQuery();
  await ctx.editMessageText(TEXTS.chooseBookingDoctor, {
    parse_mode: 'HTML',
    ...getDoctorButtons('booking_doctor')
  });
});

// --- Generic Message Handlers ---
bot.on('text', async (ctx) => {
  if (await handlers.handleSupportReply(ctx)) return;

  const text = (ctx.message.text || '').trim();
  const activeChat = activeSpecialistChats.get(ctx.chat.id);
  const booking = pendingBookings.get(ctx.chat.id);

  // Menu Handling
  if (text === MENU.finish) {
    activeSpecialistChats.delete(ctx.chat.id);
    persistConfig();
    return ctx.replyWithHTML(TEXTS.chatClosed, getMainKeyboard());
  }
  if (text === MENU.doctors) return handlers.sendSpecialistList(ctx);
  if (text === MENU.booking) return handlers.sendBookingDoctorList(ctx);
  if (text === MENU.help) return ctx.replyWithHTML(TEXTS.help, getMainKeyboard());
  if (text === MENU.connect || text === MENU.yes) {
    return ctx.replyWithHTML(TEXTS.chooseSpecialist, getDoctorButtons());
  }
  if (text === MENU.no || text === MENU.back) {
    activeSpecialistChats.delete(ctx.chat.id);
    pendingBookings.delete(ctx.chat.id);
    persistConfig();
    return ctx.replyWithHTML(TEXTS.noDoctor, getMainKeyboard());
  }

  // Booking Step Handling
  if (booking) {
    if (booking.step === 'patient_name') {
      booking.patientName = text;
      booking.step = 'patient_age';
      return ctx.replyWithHTML(TEXTS.askPatientAge);
    }
    if (booking.step === 'patient_age') {
      if (!/^\d{1,2}$/.test(text)) return ctx.replyWithHTML(TEXTS.invalidAge);
      booking.patientAge = text;
      booking.step = 'phone';
      return ctx.replyWithHTML(TEXTS.askPhone);
    }
    if (booking.step === 'phone') {
      const cleanPhone = text.replace(/\s+/g, '');
      if (!/^\+?\d{9,15}$/.test(cleanPhone)) return ctx.replyWithHTML(TEXTS.invalidPhone);
      booking.phone = cleanPhone;
      booking.step = 'complaint';
      return ctx.replyWithHTML(TEXTS.askComplaint);
    }
    if (booking.step === 'complaint') {
      booking.complaint = text;
      return handlers.createBooking(ctx);
    }
  }

  // Active Chat Forwarding
  if (activeChat) {
    return handlers.forwardToSupport(ctx, activeChat);
  }

  // Default
  await ctx.replyWithHTML(TEXTS.askDoctor, getConfirmKeyboard());
});

bot.on(['photo', 'video', 'voice', 'audio', 'document', 'sticker'], async (ctx) => {
  if (await handlers.handleSupportReply(ctx)) return;
  const activeChat = activeSpecialistChats.get(ctx.chat.id);
  if (!activeChat) {
    return ctx.replyWithHTML('⚠️ Avval mutaxassisni tanlang.', getConfirmKeyboard());
  }
  await handlers.forwardToSupport(ctx, activeChat);
});

// --- Server ---
app.get('/', (req, res) => {
  res.json({
    ok: true,
    service: 'MedBot Server',
    users: Object.keys(config.userStats || {}).length,
    bookings: (config.bookings || []).length,
    activeChats: activeSpecialistChats.size
  });
});
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

// Heartbeat
setInterval(() => {
  console.log(`[${new Date().toISOString()}] Bot active. Chats: ${activeSpecialistChats.size}, Pending Bookings: ${(config.bookings || []).filter(b => b.status === 'pending').length}`);
}, 300000);

// --- Launch ---
bot.catch((err) => console.error('❌ Bot Error:', err));
bot.launch().then(() => console.log('✅ Bot started!'));

// Graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
