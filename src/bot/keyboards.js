const { Markup } = require('telegraf');
const MENU = require('../constants/menus');
const { DOCTOR_DATA } = require('../constants/doctors');

function getMainKeyboard() {
  return Markup.keyboard([
    [MENU.doctors, MENU.connect],
    [MENU.booking, MENU.help]
  ]).resize();
}

function getConfirmKeyboard() {
  return Markup.keyboard([
    [MENU.yes, MENU.no],
    [MENU.doctors, MENU.booking],
    [MENU.help]
  ]).resize();
}

function getChatKeyboard() {
  return Markup.keyboard([
    [MENU.finish],
    [MENU.doctors, MENU.booking],
    [MENU.help]
  ]).resize();
}

function getDoctorButtons(prefix = 'info') {
  const keys = Object.keys(DOCTOR_DATA);
  const rows = [];
  for (let i = 0; i < keys.length; i += 2) {
    const row = [
      { text: DOCTOR_DATA[keys[i]].name, callback_data: `${prefix}_${keys[i]}` }
    ];
    if (keys[i + 1]) {
      row.push({ text: DOCTOR_DATA[keys[i + 1]].name, callback_data: `${prefix}_${keys[i + 1]}` });
    }
    rows.push(row);
  }
  return Markup.inlineKeyboard(rows);
}

function getDoctorActionButtons(doctorKey) {
  return Markup.inlineKeyboard([
    [{ text: '💬 Savol yuborish', callback_data: `start_chat_${doctorKey}` }],
    [{ text: '📅 Qabulga yozilish', callback_data: `booking_doctor_${doctorKey}` }],
    [{ text: MENU.back, callback_data: 'back_to_list' }],
  ]);
}

function getBookingSlotButtons(doctorKey, doctorSchedules) {
  const slots = doctorSchedules[doctorKey] || [];
  const rows = slots.map((slot, index) => [
    { text: `🕒 ${slot}`, callback_data: `booking_slot_${doctorKey}_${index}` },
  ]);
  rows.push([{ text: MENU.back, callback_data: 'back_to_booking_doctors' }]);
  return Markup.inlineKeyboard(rows);
}

module.exports = {
  getMainKeyboard,
  getConfirmKeyboard,
  getChatKeyboard,
  getDoctorButtons,
  getDoctorActionButtons,
  getBookingSlotButtons,
};
