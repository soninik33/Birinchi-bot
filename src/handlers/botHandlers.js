const { DOCTOR_DATA } = require('../constants/doctors');
const TEXTS = require('../constants/texts');
const {
  getMainKeyboard,
  getConfirmKeyboard,
  getChatKeyboard,
  getDoctorButtons,
  getBookingSlotButtons,
  getDoctorActionButtons
} = require('../bot/keyboards');
const {
  getUserFullName,
  buildDoctorCard,
  buildBookingSupportText,
  getMessageTypeLabel,
  getMessagePreview,
  extractChatIdFromSupportMessage
} = require('../utils/helpers');

class BotHandlers {
  constructor(bot, config, activeSpecialistChats, pendingBookings, supportMessageTargets, persistConfig) {
    this.bot = bot;
    this.config = config;
    this.activeSpecialistChats = activeSpecialistChats;
    this.pendingBookings = pendingBookings;
    this.supportMessageTargets = supportMessageTargets;
    this.persistConfig = persistConfig;
  }

  async sendWelcome(ctx) {
    this.activeSpecialistChats.delete(ctx.chat.id);
    this.pendingBookings.delete(ctx.chat.id);
    this.persistConfig();
    
    await ctx.replyWithHTML(TEXTS.welcome, getMainKeyboard());
    await ctx.replyWithHTML(TEXTS.emergency);
    await ctx.replyWithHTML(TEXTS.askDoctor, getConfirmKeyboard());
  }

  async sendSpecialistList(ctx) {
    await ctx.replyWithHTML(TEXTS.chooseSpecialist, getDoctorButtons());
  }

  async sendBookingDoctorList(ctx) {
    this.pendingBookings.delete(ctx.chat.id);
    await ctx.replyWithHTML(TEXTS.chooseBookingDoctor, getDoctorButtons('booking_doctor'));
  }

  async createBooking(ctx) {
    const draft = this.pendingBookings.get(ctx.chat.id);
    if (!draft || !draft.doctorKey || !draft.slot) return;

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

    this.config.bookings.push(booking);
    
    // Increment booking stats
    const stats = this.config.userStats[String(ctx.from.id)];
    if (stats) {
      stats.bookingsCreated = (stats.bookingsCreated || 0) + 1;
      stats.lastDoctorKey = draft.doctorKey;
    }

    this.pendingBookings.delete(ctx.chat.id);
    this.persistConfig();

    if (this.config.supportChatId) {
      const sent = await this.bot.telegram.sendMessage(
        this.config.supportChatId,
        buildBookingSupportText(booking),
        { parse_mode: 'HTML' }
      );
      this.supportMessageTargets.set(sent.message_id, {
        kind: 'booking',
        targetUserId: ctx.chat.id,
        doctorKey: booking.doctorKey,
        bookingId: booking.id,
      });
    }

    await ctx.replyWithHTML(
      TEXTS.bookingCreated(DOCTOR_DATA[booking.doctorKey].name, booking.slot),
      getMainKeyboard()
    );
  }

  async forwardToSupport(ctx, activeChat) {
    if (!this.config.supportChatId) {
      await ctx.replyWithHTML(TEXTS.supportUnavailable, getChatKeyboard());
      return;
    }

    // Increment message stats
    const stats = this.config.userStats[String(ctx.from.id)];
    if (stats) {
      stats.messagesSent = (stats.messagesSent || 0) + 1;
      stats.lastDoctorKey = activeChat.doctorKey;
      this.persistConfig();
    }

    const doctor = DOCTOR_DATA[activeChat.doctorKey];
    const metaText = [
      `👨‍⚕️ <b>Mutaxassis:</b> ${doctor.name}`,
      `👤 <b>Foydalanuvchi:</b> ${getUserFullName(ctx.from)}`,
      `🆔 <b>User ID:</b> <code>${ctx.from.id}</code>`,
      `💬 <b>Chat ID:</b> <code>${ctx.chat.id}</code>`,
      `📂 <b>Xabar turi:</b> ${getMessageTypeLabel(ctx.message)}`,
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

    await ctx.replyWithHTML(TEXTS.sentToSpecialist(doctor.name), getChatKeyboard());
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

    const activeChat = this.activeSpecialistChats.get(targetUserId);
    const isBooking = mapped?.kind === 'booking';
    const doctorName = DOCTOR_DATA[mapped?.doctorKey || activeChat?.doctorKey]?.name || 'Mutaxassis';
    const keyboard = isBooking ? getMainKeyboard() : getChatKeyboard();

    if (isBooking && mapped?.bookingId) {
      const booking = this.config.bookings.find(b => b.id === mapped.bookingId);
      if (booking && booking.status === 'pending') {
        booking.status = 'contacted';
        booking.updatedAt = new Date().toISOString();
        this.persistConfig();
      }
    }

    const prefix = isBooking ? TEXTS.bookingReplyPrefix : TEXTS.specialistReplyPrefix(doctorName);
    
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

    await ctx.reply(`✅ Yuborildi -> ${targetUserId}`);
    return true;
  }
}

module.exports = BotHandlers;
