const { DOCTOR_DATA } = require('../constants/doctors');

function getUserFullName(from) {
  if (!from) return 'Noma\'lum';
  return [from.first_name, from.last_name].filter(Boolean).join(' ') || 'Foydalanuvchi';
}

function getMessageTypeLabel(message, lang = 'uz') {
  const labels = {
    uz: { text: 'Matn', photo: 'Rasm', video: 'Video', voice: 'Ovozli xabar', audio: 'Audio', doc: 'Hujjat', sticker: 'Stiker', contact: 'Kontakt', loc: 'Lokatsiya', msg: 'Xabar' },
    ru: { text: 'Текст', photo: 'Фото', video: 'Видео', voice: 'Голосовое', audio: 'Аудио', doc: 'Документ', sticker: 'Стикер', contact: 'Контакт', loc: 'Локация', msg: 'Сообщение' }
  };
  const l = labels[lang] || labels.uz;
  if (message.text) return l.text;
  if (message.photo) return l.photo;
  if (message.video) return l.video;
  if (message.voice) return l.voice;
  if (message.audio) return l.audio;
  if (message.document) return l.doc;
  if (message.sticker) return l.sticker;
  if (message.contact) return l.contact;
  if (message.location) return l.loc;
  return l.msg;
}

function getMessagePreview(message) {
  const source = message.text || message.caption || '';
  if (!source) return '[Media]';
  return source.length > 500 ? `${source.slice(0, 500)}...` : source;
}

function buildDoctorCard(doctor, doctorKey, doctorSchedules, lang = 'uz') {
  const data = doctor[lang] || doctor.uz;
  const topics = data.topics.map((topic) => `• ${topic}`).join('\n');
  const schedule = (doctorSchedules[doctorKey] || [])
    .map((item) => `🕒 ${item}`)
    .join('\n');

  const labels = {
    uz: { exp: 'Tajriba', info: 'Ma\'lumot', topics: 'Asosiy yo\'nalishlar', slots: 'Bo\'sh vaqtlar', update: 'Yaqin orada yangilanadi' },
    ru: { exp: 'Опыт', info: 'Информация', topics: 'Основные направления', slots: 'Свободное время', update: 'Скоро обновится' }
  };
  const l = labels[lang] || labels.uz;

  return [
    `<b>👨‍⚕️ ${data.name}</b>`,
    `<i>${data.title}</i>`,
    '',
    `<b>🏆 ${l.exp}:</b> ${data.experience}`,
    `<b>📝 ${l.info}:</b> ${data.summary}`,
    '',
    `<b>📋 ${l.topics}:</b>`,
    topics,
    '',
    `<b>📅 ${l.slots}:</b>`,
    schedule || `<i>${l.update}</i>`,
  ].join('\n');
}

function buildBookingSupportText(booking, lang = 'uz') {
  const doctor = DOCTOR_DATA[booking.doctorKey][lang] || DOCTOR_DATA[booking.doctorKey].uz;
  return [
    '🆕 <b>Yangi bron so\'rovi / Новый запрос</b>',
    '',
    `<b>👨‍⚕️ Mutaxassis:</b> ${doctor.name}`,
    `<b>🕒 Slot:</b> ${booking.slot}`,
    `<b>👤 Bemor:</b> ${booking.patientName}`,
    `<b>🔢 Yoshi:</b> ${booking.patientAge}`,
    `<b>📞 Telefon:</b> ${booking.phone}`,
    `<b>📝 Muammo:</b> ${booking.complaint}`,
    '',
    `<b>👤 Kimdan:</b> ${booking.userFullName}`,
    `<b>🆔 User ID:</b> <code>${booking.userId}</code>`,
    `<b>🌐 Til:</b> ${lang.toUpperCase()}`,
  ].join('\n');
}

function extractChatIdFromSupportMessage(message) {
  if (!message) return null;
  const sources = [message.text, message.caption].filter(Boolean);
  for (const source of sources) {
    const match = source.match(/Chat ID:\s*(-?\d+)/i);
    if (match) return Number(match[1]);
  }
  return null;
}

module.exports = {
  getUserFullName,
  getMessageTypeLabel,
  getMessagePreview,
  buildDoctorCard,
  buildBookingSupportText,
  extractChatIdFromSupportMessage,
};
