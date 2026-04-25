const { DOCTOR_DATA } = require('../constants/doctors');

function getUserFullName(from) {
  if (!from) return 'Noma\'lum';
  return [from.first_name, from.last_name].filter(Boolean).join(' ') || 'Foydalanuvchi';
}

function getMessageTypeLabel(message) {
  if (message.text) return 'Matn';
  if (message.photo) return 'Rasm';
  if (message.video) return 'Video';
  if (message.voice) return 'Ovozli xabar';
  if (message.audio) return 'Audio';
  if (message.document) return 'Hujjat';
  if (message.sticker) return 'Stiker';
  if (message.contact) return 'Kontakt';
  if (message.location) return 'Lokatsiya';
  return 'Xabar';
}

function getMessagePreview(message) {
  const source = message.text || message.caption || '';
  if (!source) return '[Media xabari]';
  return source.length > 500 ? `${source.slice(0, 500)}...` : source;
}

function buildDoctorCard(doctor, doctorKey, doctorSchedules) {
  const topics = doctor.topics.map((topic) => `• ${topic}`).join('\n');
  const schedule = (doctorSchedules[doctorKey] || [])
    .map((item) => `🕒 ${item}`)
    .join('\n');

  return [
    `<b>👨‍⚕️ ${doctor.name}</b>`,
    `<i>${doctor.title}</i>`,
    '',
    `<b>🏆 Tajriba:</b> ${doctor.experience}`,
    `<b>📝 Ma'lumot:</b> ${doctor.summary}`,
    '',
    `<b>📋 Asosiy yo'nalishlar:</b>`,
    topics,
    '',
    `<b>📅 Bo'sh vaqtlar:</b>`,
    schedule || '<i>Yaqin orada yangilanadi</i>',
  ].join('\n');
}

function buildBookingSupportText(booking) {
  const doctor = DOCTOR_DATA[booking.doctorKey];
  return [
    '🆕 <b>Yangi bron so\'rovi</b>',
    '',
    `<b>👨‍⚕️ Mutaxassis:</b> ${doctor.name}`,
    `<b>🕒 Slot:</b> ${booking.slot}`,
    `<b>👤 Bemor:</b> ${booking.patientName}`,
    `<b>🔢 Yoshi:</b> ${booking.patientAge}`,
    `<b>📞 Telefon:</b> ${booking.phone}`,
    `<b>📝 Muammo:</b> ${booking.complaint}`,
    '',
    `<b>👤 Kimdan:</b> ${booking.userFullName}`,
    `<b>🔗 Username:</b> ${booking.username || 'yo\'q'}`,
    `<b>🆔 User ID:</b> <code>${booking.userId}</code>`,
    `<b>💬 Chat ID:</b> <code>${booking.chatId}</code>`,
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
