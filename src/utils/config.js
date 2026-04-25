const fs = require('fs');
const path = require('path');
const { DEFAULT_DOCTOR_SCHEDULES } = require('../constants/doctors');

const CONFIG_PATH = path.join(__dirname, '../../bot-config.json');

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
    const data = fs.readFileSync(CONFIG_PATH, 'utf8');
    return normalizeConfig(JSON.parse(data));
  } catch (error) {
    console.error('Config loading error:', error.message);
    return createDefaultConfig();
  }
}

function saveConfig(configData) {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(configData, null, 2), 'utf8');
  } catch (error) {
    console.error('Config saving error:', error.message);
  }
}

module.exports = {
  loadConfig,
  saveConfig,
};
