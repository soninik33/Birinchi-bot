const { DOCTOR_DATA } = require('../constants/doctors');
const TEXTS = require('../constants/texts');
const {
  getMainKeyboard,
  getConfirmKeyboard,
  getChatKeyboard,
  getDoctorButtons,
  getBookingSlotButtons,
  getDoctorActionButtons,
  getLangKeyboard
} = require('../bot/keyboards');
const {
  getUserFullName,
  buildDoctorCard,
  buildBookingSupportText,
  getMessageTypeLabel,
  getMessagePreview,
  extractChatIdFromSupportMessage
} = require('../utils/helpers');
const { MAP_URL } = require('../utils/receipt');

class BotHandlers {
  constructor(bot, config, activeSpecialistChats, pendingBookings, supportMessageTargets, persistConfig) {
    this.bot = bot;
    this.config = config;
    this.activeSpecialistChats = activeSpecialistChats;
    this.pendingBookings = pendingBookings;
    this.supportMessageTargets = supportMessageTargets;
    this.persistConfig = persistConfig;
  }

  getLang(ctx) {
    if (!ctx) return 'uz';
    const chatId = ctx.chat?.id;
    const userId = ctx.from?.id;

    if (chatId && this.pendingBookings.has(chatId)) {
      const draft = this.pendingBookings.get(chatId);
      if (draft && draft.lang) return draft.lang;
    }

    const stats = (userId && this.config.userStats[String(userId)]) || (chatId && this.config.userStats[String(chatId)]);
    if (stats?.lang) return stats.lang;

    if (ctx.from?.language_code && ctx.from.language_code.toLowerCase().startsWith('ru')) {
      return 'ru';
    }

    return 'uz';
  }

  async sendWelcome(ctx) {
    const lang = this.getLang(ctx);
    const t = TEXTS[lang] || TEXTS.uz;
    
    this.activeSpecialistChats.delete(ctx.chat.id);
    this.pendingBookings.delete(ctx.chat.id);
    this.persistConfig();
    
    await ctx.replyWithHTML(t.welcome, getMainKeyboard(lang));
    await ctx.replyWithHTML(t.emergency);
    await ctx.replyWithHTML(t.askDoctor, getConfirmKeyboard(lang));
  }

  async askLanguage(ctx) {
    await ctx.reply('🌐 Tilni tanlang / Выберите язык:', getLangKeyboard());
  }

  async sendSpecialistList(ctx) {
    const lang = this.getLang(ctx);
    const t = TEXTS[lang] || TEXTS.uz;
    await ctx.replyWithHTML(t.chooseSpecialist, getDoctorButtons('info', lang));
  }

  async sendBookingDoctorList(ctx) {
    const lang = this.getLang(ctx);
    const t = TEXTS[lang] || TEXTS.uz;
    this.pendingBookings.delete(ctx.chat.id);
    await ctx.replyWithHTML(t.chooseBookingDoctor, getDoctorButtons('booking_doctor', lang));
  }

  async createBooking(ctx) {
    const draft = this.pendingBookings.get(ctx.chat.id);
    if (!draft || !draft.doctorKey || !draft.slot) return;

    const lang = draft.lang || this.getLang(ctx);

    const booking = {
      id: `bk_${Date.now()}`,
      doctorKey: draft.doctorKey,
      slot: draft.slot,
      patientName: draft.patientName,
      patientAge: draft.patientAge,
      phone: draft.phone,
      complaint: draft.complaint || '',
      userId: ctx.from?.id || ctx.chat.id,
      chatId: ctx.chat.id,
      userFullName: getUserFullName(ctx.from),
      username: ctx.from?.username ? `@${ctx.from.username}` : '',
      createdAt: new Date().toISOString(),
      status: 'pending',
      lang: lang
    };

    this.config.bookings.push(booking);
    
    const stats = this.config.userStats[String(ctx.from?.id)];
    if (stats) {
      stats.bookingsCreated = (stats.bookingsCreated || 0) + 1;
      stats.lastDoctorKey = draft.doctorKey;
    }

    this.pendingBookings.delete(ctx.chat.id);
    this.persistConfig();

    if (this.config.supportChatId) {
      const sent = await this.bot.telegram.sendMessage(
        this.config.supportChatId,
        buildBookingSupportText(booking, lang),
        { parse_mode: 'HTML' }
      );
      this.supportMessageTargets.set(sent.message_id, {
        kind: 'booking',
        targetUserId: ctx.chat.id,
        doctorKey: booking.doctorKey,
        bookingId: booking.id,
      });
    }

    const docData = (DOCTOR_DATA[booking.doctorKey][lang] || DOCTOR_DATA[booking.doctorKey].uz);
    const docName = docData.name;
    const docTitle = docData.title || '';

    // Only set receiptUrl if Render provides RENDER_EXTERNAL_URL or user set BASE_URL
    const baseUrl = process.env.BASE_URL || process.env.RENDER_EXTERNAL_URL;
    const receiptUrl = baseUrl ? `${baseUrl.replace(/\/$/, '')}/receipt/${booking.id}` : null;

    const receiptMsg = lang === 'uz' ? [
      '✅ <b>Qabulga yozilish muvaffaqiyatli rasmiylashtirildi!</b>',
      '',
      '🧾 <b>ELEKTRON QABUL CHEKI</b>',
      '━━━━━━━━━━━━━━━━━━━━',
      `🆔 <b>Chek raqami:</b> <code>#${booking.id}</code>`,
      `👤 <b>Bemor (F.I.Sh):</b> <b>${booking.patientName}</b>`,
      `🔢 <b>Yoshi:</b> ${booking.patientAge} yosh`,
      `📞 <b>Telefon:</b> ${booking.phone}`,
      `👨‍⚕️ <b>Shifokor:</b> ${docName} (${docTitle})`,
      `🕒 <b>Qabul vaqti:</b> <b>${booking.slot}</b>`,
      '',
      `📍 <b>Manzilimiz:</b> Toshkent sh., Bog'ishamol ko'chasi, 223-uy (SAMPI)`,
      `🗺 <b>Xaritada:</b> maps.app.goo.gl/RNXcPe8LbMMAGgXB7`,
      '━━━━━━━━━━━━━━━━━━━━',
      receiptUrl ? `🔗 <b>Chek havolasi:</b> ${receiptUrl}` : '',
      '',
      '<i>Qabulga kelganda ushbu chekni ko\'rsatishingiz mumkin.</i>'
    ].filter(Boolean).join('\n') : [
      '✅ <b>Вы успешно записались на прием!</b>',
      '',
      '🧾 <b>ЭЛЕКТРОННЫЙ ЧЕК ЗАПИСИ</b>',
      '━━━━━━━━━━━━━━━━━━━━',
      `🆔 <b>Номер чека:</b> <code>#${booking.id}</code>`,
      `👤 <b>Пациент (Ф.И.О):</b> <b>${booking.patientName}</b>`,
      `🔢 <b>Возраст:</b> ${booking.patientAge} лет`,
      `📞 <b>Телефон:</b> ${booking.phone}`,
      `👨‍⚕️ <b>Врач:</b> ${docName} (${docTitle})`,
      `🕒 <b>Время приема:</b> <b>${booking.slot}</b>`,
      '',
      '📍 <b>Наш адрес:</b> г. Ташкент, ул. Богишамол, 223 (САМПИ)',
      `🗺 <b>На карте:</b> maps.app.goo.gl/RNXcPe8LbMMAGgXB7`,
      '━━━━━━━━━━━━━━━━━━━━',
      receiptUrl ? `🔗 <b>Ссылка на чек:</b> ${receiptUrl}` : '',
      '',
      '<i>Вы можете показать этот чек при посещении клиники.</i>'
    ].filter(Boolean).join('\n');

    const inlineKeyboard = [];
    if (receiptUrl) {
      inlineKeyboard.push([{
        text: lang === 'uz' ? '🧾 Chekni vebda ochish (PDF)' : '🧾 Открыть чек в браузере (PDF)',
        url: receiptUrl
      }]);
    }

    const replyOpts = inlineKeyboard.length > 0
      ? { reply_markup: { inline_keyboard: inlineKeyboard } }
      : {};

    await ctx.replyWithHTML(receiptMsg, replyOpts);

    await ctx.reply(lang === 'uz' ? 'Asosiy menyu:' : 'Главное меню:', getMainKeyboard(lang));
  }

  async forwardToSupport(ctx, activeChat) {
    const lang = this.getLang(ctx);
    const t = TEXTS[lang] || TEXTS.uz;

    if (!this.config.supportChatId) {
      await ctx.replyWithHTML(t.supportUnavailable, getChatKeyboard(lang));
      return;
    }

    const stats = this.config.userStats[String(ctx.from.id)];
    if (stats) {
      stats.messagesSent = (stats.messagesSent || 0) + 1;
      stats.lastDoctorKey = activeChat.doctorKey;
      this.persistConfig();
    }

    const doctor = DOCTOR_DATA[activeChat.doctorKey][lang] || DOCTOR_DATA[activeChat.doctorKey].uz;
    const metaText = [
      `👨‍⚕️ <b>Mutaxassis:</b> ${doctor.name}`,
      `👤 <b>Foydalanuvchi:</b> ${getUserFullName(ctx.from)}`,
      `🆔 <b>User ID:</b> <code>${ctx.from.id}</code>`,
      `💬 <b>Chat ID:</b> <code>${ctx.chat.id}</code>`,
      `📂 <b>Xabar turi:</b> ${getMessageTypeLabel(ctx.message, lang)}`,
      `🌐 <b>Til:</b> ${lang.toUpperCase()}`,
      '',
      getMessagePreview(ctx.message),
    ].join('\n');

    const metaMessage = await this.bot.telegram.sendMessage(
      this.config.supportChatId,
      metaText,
      { parse_mode: 'HTML' }
    );
    
    this.supportMessageTargets.set(metaMessage.message_id, {
      kind: 'chat',
      targetUserId: ctx.chat.id,
      doctorKey: activeChat.doctorKey,
    });

    if (!ctx.message.text) {
      const copied = await this.bot.telegram.copyMessage(
        this.config.supportChatId,
        ctx.chat.id,
        ctx.message.message_id
      );
      this.supportMessageTargets.set(copied.message_id, {
        kind: 'chat',
        targetUserId: ctx.chat.id,
        doctorKey: activeChat.doctorKey,
      });
    }

    await ctx.replyWithHTML(t.sentToSpecialist(doctor.name), getChatKeyboard(lang));
  }

  async handleSupportReply(ctx) {
    if (!this.config.supportChatId || ctx.chat.id !== this.config.supportChatId) {
      return false;
    }

    const replyTo = ctx.message.reply_to_message;
    const mapped = replyTo ? this.supportMessageTargets.get(replyTo.message_id) : null;
    const fallbackId = extractChatIdFromSupportMessage(replyTo) || extractChatIdFromSupportMessage(ctx.message);
    const targetUserId = mapped?.targetUserId || fallbackId;

    if (!targetUserId) return false;

    const stats = this.config.userStats[String(targetUserId)];
    const lang = stats?.lang || 'uz';
    const t = TEXTS[lang] || TEXTS.uz;

    const activeChat = this.activeSpecialistChats.get(targetUserId);
    const isBooking = mapped?.kind === 'booking';
    const docData = DOCTOR_DATA[mapped?.doctorKey || activeChat?.doctorKey];
    const doctorName = (docData ? (docData[lang] || docData.uz).name : null) || (lang === 'uz' ? 'Mutaxassis' : 'Специалист');
    const keyboard = isBooking ? getMainKeyboard(lang) : getChatKeyboard(lang);

    if (isBooking && mapped?.bookingId) {
      const booking = this.config.bookings.find(b => b.id === mapped.bookingId);
      if (booking && booking.status === 'pending') {
        booking.status = 'contacted';
        booking.updatedAt = new Date().toISOString();
        this.persistConfig();
      }
    }

    const prefix = isBooking ? t.bookingReplyPrefix : t.specialistReplyPrefix(doctorName);
    
    if (ctx.message.text) {
      await this.bot.telegram.sendMessage(
        targetUserId,
        `${prefix}\n${ctx.message.text}`,
        { parse_mode: 'HTML', reply_markup: keyboard.reply_markup }
      );
    } else {
      await this.bot.telegram.sendMessage(targetUserId, prefix, { parse_mode: 'HTML' });
      await this.bot.telegram.copyMessage(targetUserId, ctx.chat.id, ctx.message.message_id, {
        reply_markup: keyboard.reply_markup
      });
    }

    await ctx.reply(`✅ Yuborildi -> ${targetUserId} (${lang.toUpperCase()})`);
    return true;
  }
}

module.exports = BotHandlers;
