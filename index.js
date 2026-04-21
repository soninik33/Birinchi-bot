const { Telegraf, Markup } = require('telegraf');
const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 1000;
const BOT_TOKEN = process.env.BOT_TOKEN || '8679972956:AAGYXhdlzh84_EzOc-1iVoY5HgmiGHPZj5Y';
const CONFIG_PATH = path.join(__dirname, 'bot-config.json');

function loadConfig() {
  try {
    if (!fs.existsSync(CONFIG_PATH)) {
      return {};
    }

    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  } catch (error) {
    console.error('Ошибка чтения config:', error.message);
    return {};
  }
}

function saveConfig(configData) {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(configData, null, 2), 'utf8');
  } catch (error) {
    console.error('Ошибка записи config:', error.message);
  }
}

const config = loadConfig();
let supportChatId = process.env.SUPPORT_CHAT_ID
  ? Number(process.env.SUPPORT_CHAT_ID)
  : config.supportChatId || null;
let ownerUserId = process.env.OWNER_USER_ID
  ? Number(process.env.OWNER_USER_ID)
  : config.ownerUserId || null;

function isOwner(ctx) {
  return Boolean(ownerUserId && ctx.from && ctx.from.id === ownerUserId);
}

function ensureOwner(ctx) {
  if (!ownerUserId && ctx.from) {
    ownerUserId = ctx.from.id;
    config.ownerUserId = ownerUserId;
    saveConfig(config);
    return true;
  }

  return isOwner(ctx);
}

function getUserFullName(from) {
  return [from.first_name, from.last_name].filter(Boolean).join(' ') || 'Неизвестно';
}

function extractChatIdFromSupportMessage(message) {
  if (!message) {
    return null;
  }

  const sources = [message.text, message.caption].filter(Boolean);
  for (const source of sources) {
    const match = source.match(/Chat ID:\s*(-?\d+)/);
    if (match) {
      return Number(match[1]);
    }
  }

  return null;
}

app.get('/', (req, res) => res.send('Bot is running!'));
app.listen(PORT, '0.0.0.0', () => console.log(`Сервер работает на порту ${PORT}`));

setInterval(() => {
  console.log('Бот активен...');
}, 300000);

const bot = new Telegraf(BOT_TOKEN);
const activeSpecialistChats = new Map(
  Object.entries(config.activeChats || {}).map(([chatId, value]) => [Number(chatId), value])
);

function persistActiveChats() {
  config.activeChats = Object.fromEntries(activeSpecialistChats.entries());
  saveConfig(config);
}

const TEXT = {
  welcome:
    'Добро пожаловать в MedPediatr.\n\nНажмите нужную кнопку или отправьте /doctors, чтобы выбрать врача.',
  chooseSpecialist: 'Выберите специалиста:',
  askDoctor: 'Вы хотите связаться с врачом?',
  yes: 'Да',
  no: 'Нет',
  wait: 'Пожалуйста, подождите 5 секунд...',
  startChat: 'Начать чат',
  back: 'Назад',
  finishChat: 'Завершить чат',
  noDoctor: 'Понятно. Если понадобится помощь, напишите снова.',
  chatClosed: 'Чат со специалистом завершен.',
  sentToSpecialist: (name) =>
    `Ваше сообщение отправлено специалисту ${name}. Ответ придет в этом же боте.`,
  chatStarted: (name) =>
    `${name} выбран.\n\nТеперь напишите сюда ваш вопрос. Сообщение будет отправлено оператору.`,
  supportUnavailable:
    'Операторский чат пока не подключен. Сначала отправьте /setchatid из операторского чата.',
  specialistReplyPrefix: (name) => `Ответ специалиста ${name}:`,
  ownerOnly:
    'Эта команда доступна только владельцу бота. Если бот настраивается впервые, сначала отправьте /setchatid сами.',
  ownerSaved: (userId) => `Владелец сохранен. Owner ID: ${userId}`,
};

const doctorData = {
  malika: {
    name: '🧠 Малика Алишеровна',
    text:
      '<b>🧠 Малика Алишеровна - Детский невролог</b>\n\n<b>Стаж:</b> более 25 лет.\n<b>Направления приема:</b>\n• задержка речевого развития;\n• последствия гипоксии при родах;\n• СДВГ и трудности с концентрацией;\n• реабилитация BSF и ASB;\n• хронические головные боли;\n• нарушения сна и тревожность.\n\n<b>Когда стоит обратиться:</b>\n• ребенок поздно начинает говорить;\n• быстро устает или раздражителен;\n• есть проблемы с вниманием.\n\n<b>Формат приема:</b> осмотр, рекомендации и план дальнейшего наблюдения.',
  },
  anvar: {
    name: '⚡ Анвар Хакимов',
    text:
      '<b>⚡ Анвар Хакимов - Невролог-эпилептолог</b>\n\n<b>Стаж:</b> 15 лет.\n<b>Направления приема:</b>\n• ЭЭГ мониторинг и анализ;\n• эпизоды потери сознания;\n• тики и заикание;\n• ночные нарушения сна;\n• восстановление после травм головы.\n\n<b>Когда стоит обратиться:</b>\n• ребенок резко замирает без причины;\n• есть подергивания во сне;\n• часто бывает головокружение.',
  },
  lola: {
    name: '👂 Лола Киримова',
    text:
      '<b>👂 Лола Киримова - ЛОР-врач</b>\n\n<b>Стаж:</b> 18 лет.\n<b>Направления приема:</b>\n• аденоидит;\n• хронический тонзиллит;\n• отит;\n• синусит;\n• аллергический ринит;\n• заложенность носа и боль в ушах.\n\n<b>Частые жалобы:</b>\n• ребенок спит с открытым ртом;\n• часто простужается;\n• есть ощущение снижения слуха.',
  },
  sanjar: {
    name: '👁 Санжар Юсупов',
    text:
      '<b>👁 Санжар Юсупов - Детский офтальмолог</b>\n\n<b>Стаж:</b> 14 лет.\n<b>Направления приема:</b>\n• миопия;\n• косоглазие;\n• амблиопия;\n• диагностика зрения;\n• консультации по ночным линзам;\n• усталость глаз из-за экранов.\n\n<b>Когда стоит обратиться:</b>\n• ребенок подходит слишком близко к экрану;\n• щурится;\n• плохо видит надписи в школе.',
  },
  nargiza: {
    name: '🥗 Наргиза Саидова',
    text:
      '<b>🥗 Наргиза Саидова - Педиатр-диетолог</b>\n\n<b>Стаж:</b> 12 лет.\n<b>Направления приема:</b>\n• пищевые аллергии;\n• контроль веса;\n• проблемы ЖКТ;\n• режим питания;\n• витамины и микроэлементы;\n• снижение аппетита.\n\n<b>Кому полезна консультация:</b>\n• детям с недостаточным весом;\n• детям с лишним весом;\n• детям с частыми расстройствами пищеварения.',
  },
  dilshod: {
    name: '🩺 Дильшод Рахмонов',
    text:
      '<b>🩺 Дильшод Рахмонов - Детский хирург</b>\n\n<b>Стаж:</b> 20 лет.\n<b>Направления приема:</b>\n• пупочные и паховые грыжи;\n• патологии мягких тканей;\n• коррекция уздечки;\n• оценка опорно-двигательной системы;\n• малые хирургические осмотры;\n• консультации по врожденным особенностям.\n\n<b>Когда стоит обратиться:</b>\n• появилось выпячивание или припухлость;\n• есть дискомфорт при ходьбе;\n• нужна хирургическая оценка.',
  },
};

function getStartKeyboard() {
  return Markup.keyboard([[TEXT.yes, TEXT.no], ['/doctors']]).resize();
}

function getDoctorButtons() {
  return Markup.inlineKeyboard([
    [
      { text: doctorData.malika.name, callback_data: 'info_malika' },
      { text: doctorData.anvar.name, callback_data: 'info_anvar' },
    ],
    [
      { text: doctorData.lola.name, callback_data: 'info_lola' },
      { text: doctorData.sanjar.name, callback_data: 'info_sanjar' },
    ],
    [
      { text: doctorData.nargiza.name, callback_data: 'info_nargiza' },
      { text: doctorData.dilshod.name, callback_data: 'info_dilshod' },
    ],
  ]);
}

function getDoctorActionButtons(doctorKey) {
  return Markup.inlineKeyboard([
    [{ text: TEXT.startChat, callback_data: `start_chat_${doctorKey}` }],
    [{ text: TEXT.back, callback_data: 'back_to_list' }],
  ]);
}

function getChatKeyboard() {
  return Markup.keyboard([[TEXT.finishChat]]).resize();
}

async function sendSpecialistList(ctx) {
  await ctx.reply(TEXT.chooseSpecialist, getDoctorButtons());
}

async function relaySupportReply(ctx) {
  if (!supportChatId || ctx.chat.id !== supportChatId) {
    return false;
  }

  const replyTo = ctx.message.reply_to_message;
  const targetUserId =
    extractChatIdFromSupportMessage(replyTo) ||
    extractChatIdFromSupportMessage(ctx.message);

  if (!targetUserId) {
    return false;
  }

  const activeChat = activeSpecialistChats.get(targetUserId);
  const doctorName = activeChat ? doctorData[activeChat.doctorKey]?.name || 'специалиста' : 'специалиста';

  await bot.telegram.sendMessage(
    targetUserId,
    `${TEXT.specialistReplyPrefix(doctorName)}\n${ctx.message.text}`
  );

  await ctx.reply(`Отправлено -> ${targetUserId}`);
  return true;
}

bot.start(async (ctx) => {
  activeSpecialistChats.delete(ctx.chat.id);
  persistActiveChats();
  await ctx.reply(TEXT.welcome, getStartKeyboard());
  await ctx.reply(TEXT.askDoctor, getStartKeyboard());
});

bot.command('doctors', async (ctx) => {
  await sendSpecialistList(ctx);
});

bot.command('chatid', async (ctx) => {
  await ctx.reply(`Chat ID: ${ctx.chat.id}`);
});

bot.command('myid', async (ctx) => {
  await ctx.reply(`User ID: ${ctx.from.id}`);
});

bot.command('setchatid', async (ctx) => {
  if (!ensureOwner(ctx)) {
    await ctx.reply(TEXT.ownerOnly);
    return;
  }

  config.ownerUserId = ownerUserId;
  config.supportChatId = ctx.chat.id;
  supportChatId = ctx.chat.id;
  saveConfig(config);

  await ctx.reply(`${TEXT.ownerSaved(ownerUserId)}\nОператорский чат подключен.\nChat ID: ${supportChatId}`);
});

bot.on('text', async (ctx) => {
  if (await relaySupportReply(ctx)) {
    return;
  }

  const text = ctx.message.text;
  const chatId = ctx.chat.id;
  const activeChat = activeSpecialistChats.get(chatId);

  if (text === TEXT.finishChat) {
    activeSpecialistChats.delete(chatId);
    persistActiveChats();
    await ctx.reply(TEXT.chatClosed, Markup.removeKeyboard());
    await ctx.reply(TEXT.askDoctor, getStartKeyboard());
    return;
  }

  if (text === TEXT.yes) {
    await ctx.reply(TEXT.wait);
    setTimeout(() => {
      ctx.reply(TEXT.chooseSpecialist, getDoctorButtons());
    }, 5000);
    return;
  }

  if (text === TEXT.no) {
    activeSpecialistChats.delete(chatId);
    persistActiveChats();
    await ctx.reply(TEXT.noDoctor, Markup.removeKeyboard());
    await ctx.reply(TEXT.askDoctor, getStartKeyboard());
    return;
  }

  if (activeChat) {
    if (!supportChatId) {
      return ctx.reply(TEXT.supportUnavailable, getChatKeyboard());
    }

    const doctorName = doctorData[activeChat.doctorKey].name;
    await bot.telegram.sendMessage(
      supportChatId,
      [
        `Специалист: ${doctorName}`,
        `Пользователь: ${getUserFullName(ctx.from)}`,
        `Username: ${ctx.from.username ? `@${ctx.from.username}` : 'нет'}`,
        `Chat ID: ${chatId}`,
        '',
        text,
      ].join('\n')
    );

    return ctx.reply(TEXT.sentToSpecialist(doctorName), getChatKeyboard());
  }

  await ctx.reply(TEXT.askDoctor, getStartKeyboard());
});

bot.action(/info_(.+)/, async (ctx) => {
  const doctorKey = ctx.match[1];
  const data = doctorData[doctorKey];

  if (!data) {
    await ctx.answerCbQuery('Не найдено');
    return;
  }

  await ctx.answerCbQuery();
  await ctx.editMessageText(data.text, {
    parse_mode: 'HTML',
    ...getDoctorActionButtons(doctorKey),
  });
});

bot.action(/start_chat_(.+)/, async (ctx) => {
  const doctorKey = ctx.match[1];
  const doctor = doctorData[doctorKey];

  if (!doctor) {
    await ctx.answerCbQuery('Не найдено');
    return;
  }

  activeSpecialistChats.set(ctx.chat.id, { doctorKey });
  persistActiveChats();
  await ctx.answerCbQuery();
  await ctx.reply(TEXT.chatStarted(doctor.name), getChatKeyboard());
});

bot.action('back_to_list', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.editMessageText(TEXT.chooseSpecialist, getDoctorButtons());
});

bot.catch((error) => {
  console.error('Ошибка бота:', error);
});

bot.launch();
console.log('Бот запущен.');
