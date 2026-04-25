/**
 * Bot response texts with improved formatting and emojis
 */
const TEXTS = {
  welcome:
    '<b>MedPediatr botiga xush kelibsiz!</b> 👋\n\nBu yerda siz mutaxassislar bilan bog\'lanishingiz, savollaringizga javob olishingiz yoki qabulga yozilishingiz mumkin.',
  askDoctor: '👨‍⚕️ Mutaxassis bilan bog\'lanishni istaysizmi?',
  chooseSpecialist: '🔍 Kerakli mutaxassisni tanlang:',
  chooseBookingDoctor: '📅 Qaysi mutaxassis qabuliga yozilmoqchisiz?',
  wait: '⏳ Biroz kuting, ma\'lumotlar yuklanmoqda...',
  noDoctor: 'Tushunarlu. Agar biror savolingiz bo\'lsa, bemalol murojaat qilishingiz mumkin. 😊',
  chatClosed: '✅ Chat yakunlandi. Yangi murojaat uchun menyudan foydalaning.',
  supportUnavailable:
    '⚠️ Operator hozircha ulanmagan. Iltimos, keyinroq urinib ko\'ring.',
  ownerOnly: '🚫 Bu buyruq faqat administratorlar uchun.',
  ownerSaved: (userId) => `✅ Owner ID muvaffaqiyatli saqlandi: <code>${userId}</code>`,
  chatStarted: (doctorName) =>
    `<b>${doctorName}</b> tanlandi.\n\n📝 Endi savolingizni matn, rasm, video yoki audio ko'rinishida yuborishingiz mumkin.`,
  sentToSpecialist: (doctorName) =>
    `📩 Xabaringiz <b>${doctorName}</b> uchun operatorga yuborildi. Javobni shu yerda olasiz.`,
  specialistReplyPrefix: (doctorName) => `💬 <b>${doctorName} javobi:</b>`,
  help:
    '<b>Botdan foydalanish bo\'yicha qo\'llanma:</b>\n\n/start - Bosh menyuga qaytish\n/doctors - Mutaxassislar ro\'yxati\n/book - Qabulga yozilish\n/help - Yordam olish\n/myid - Sizning ID raqamingiz\n/cancel - Jarayonni bekor qilish',
  emergency:
    '⚠️ <b>MUHIM:</b> Ushbu bot shoshilinch tibbiy yordam o\'rnini bosmaydi. Agar ahvol og\'ir bo\'lsa (nafas qisilishi, kuchli og\'riq, hushdan ketish), zudlik bilan <b>103</b> ga qo\'ng\'iroq qiling!',
  bookingCancelled: '❌ Qabulga yozilish bekor qilindi.',
  askPatientName: '👤 Bemorning ism-sharifini yuboring:',
  askPatientAge: '🔢 Bemorning yoshini kiriting:',
  askPhone: '📞 Bog\'lanish uchun telefon raqamingizni yuboring (Masalan: +998901234567):',
  askComplaint: '📝 Shikoyat yoki murojaat sababini qisqacha yozib qoldiring:',
  invalidAge: '⚠️ Yoshni raqam ko\'rinishida kiriting. Masalan: 5',
  invalidPhone: '⚠️ Telefon raqami noto\'g\'ri. Iltimos, formatni tekshiring: +998901234567',
  bookingCreated: (doctorName, slot) =>
    `✅ <b>${doctorName}</b> qabuliga <b>${slot}</b> vaqtiga so'rov qabul qilindi. Operator tez orada siz bilan bog'lanadi.`,
  bookingReplyPrefix: '🔔 <b>Bron bo\'yicha operator javobi:</b>',
  noPendingBookings: '📭 Hozircha navbatda turgan bronlar yo\'q.',
};

module.exports = TEXTS;
