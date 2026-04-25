const { Markup } = require('telegraf');
const MENUS = require('../constants/menus');
const { DOCTOR_DATA } = require('../constants/doctors');

function getLangKeyboard() {
  return Markup.inlineKeyboard([
    [{ text: '🇺🇿 O\'zbekcha', callback_data: 'lang_uz' }],
    [{ text: '🇷🇺 Русский', callback_data: 'lang_ru' }]
  ]);
}

function getMainKeyboard(lang = 'uz') {
  const m = MENUS[lang] || MENUS.uz;
  return Markup.keyboard([
    [m.doctors, m.connect],
    [m.booking, m.help],
    [m.changeLang]
  ]).resize();
}

function getConfirmKeyboard(lang = 'uz') {
  const m = MENUS[lang] || MENUS.uz;
  return Markup.keyboard([
    [m.yes, m.no],
    [m.doctors, m.booking],
    [m.help]
  ]).resize();
}

function getChatKeyboard(lang = 'uz') {
  const m = MENUS[lang] || MENUS.uz;
  return Markup.keyboard([
    [m.finish],
    [m.doctors, m.booking],
    [m.help]
  ]).resize();
}

function getDoctorButtons(prefix = 'info', lang = 'uz') {
  const keys = Object.keys(DOCTOR_DATA);
  const rows = [];
  for (let i = 0; i < keys.length; i += 2) {
    const row = [
      { text: (DOCTOR_DATA[keys[i]][lang] || DOCTOR_DATA[keys[i]].uz).name, callback_data: `${prefix}_${keys[i]}` }
    ];
    if (keys[i + 1]) {
      row.push({ text: (DOCTOR_DATA[keys[i + 1]][lang] || DOCTOR_DATA[keys[i + 1]].uz).name, callback_data: `${prefix}_${keys[i + 1]}` });
    }
    rows.push(row);
  }
  return Markup.inlineKeyboard(rows);
}

function getDoctorActionButtons(doctorKey, lang = 'uz') {
  const m = MENUS[lang] || MENUS.uz;
  const labels = {
    uz: { ask: '💬 Savol yuborish', book: '📅 Qabulga yozilish' },
    ru: { ask: '💬 Отправить вопрос', book: '📅 Записаться на прием' }
  };
  const l = labels[lang] || labels.uz;
  return Markup.inlineKeyboard([
    [{ text: l.ask, callback_data: `start_chat_${doctorKey}` }],
    [{ text: l.book, callback_data: `booking_doctor_${doctorKey}` }],
    [{ text: m.back, callback_data: 'back_to_list' }],
  ]);
}

function getBookingSlotButtons(doctorKey, doctorSchedules, lang = 'uz') {
  const m = MENUS[lang] || MENUS.uz;
  const slots = doctorSchedules[doctorKey] || [];
  const rows = slots.map((slot, index) => [
    { text: `🕒 ${slot}`, callback_data: `booking_slot_${doctorKey}_${index}` },
  ]);
  rows.push([{ text: m.back, callback_data: 'back_to_booking_doctors' }]);
  return Markup.inlineKeyboard(rows);
}

module.exports = {
  getLangKeyboard,
  getMainKeyboard,
  getConfirmKeyboard,
  getChatKeyboard,
  getDoctorButtons,
  getDoctorActionButtons,
  getBookingSlotButtons,
};
