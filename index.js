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
    console.error("Config o'qishda xato:", error.message);
    return {};
  }
}

function saveConfig(configData) {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(configData, null, 2));
  } catch (error) {
    console.error('Config yozishda xato:', error.message);
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

app.get('/', (req, res) => res.send('Bot is running!'));
app.listen(PORT, '0.0.0.0', () => console.log(`Server port ${PORT} da ishlamoqda`));

setInterval(() => {
  console.log('Bot faol...');
}, 300000);

const bot = new Telegraf(BOT_TOKEN);
const userLanguage = new Map();
const activeSpecialistChats = new Map();
const supportReplyMap = new Map();

const TEXT = {
  uz: {
    welcome: "MedPediatr ga xush kelibsiz! Tilni tanlang:",
    askDoctor: "Shifokor bilan bog'lanishni istaysizmi?",
    wait: 'Iltimos, 5 soniya kuting...',
    chooseSpecialist: 'Mutaxassisni tanlang:',
    startChat: 'Mutaxassis bilan suhbatni boshlash',
    back: 'Orqaga',
    finishChat: 'Suhbatni yakunlash',
    noDoctor: 'Tushunarli, xayr!',
    chatStarted: (name) =>
      `${name} tanlandi.\n\nEndi shu yerga xabaringizni yozing. Xabar mutaxassisga yuboriladi.`,
    chatClosed: 'Mutaxassis bilan suhbat yakunlandi.',
    sentToSpecialist: (name) => `Xabaringiz ${name} ga yuborildi. Javob shu bot ichida keladi.`,
    supportUnavailable:
      "Hozircha operator chat ulanmagan. Operator chatda /setchatid yuboring, shundan keyin xabarlar mutaxassisga yuboriladi.",
    specialistReplyPrefix: (name) => `${name} javobi:`,
    ownerOnly:
      "Bu buyruq faqat bot egasi uchun. Agar bu bot birinchi marta sozlanayotgan bo'lsa, avval /setchatid yuboring.",
    ownerSaved: (userId) => `Admin saqlandi. Owner ID: ${userId}`,
  },
  ru: {
    welcome: 'Добро пожаловать в MedPediatr! Выберите язык:',
    askDoctor: 'Вы хотите связаться с врачом?',
    wait: 'Пожалуйста, подождите 5 секунд...',
    chooseSpecialist: 'Выберите специалиста:',
    startChat: 'Начать чат со специалистом',
    back: 'Назад',
    finishChat: 'Завершить чат',
    noDoctor: 'Понятно, до свидания!',
    chatStarted: (name) =>
      `${name} выбран.\n\nТеперь напишите сообщение сюда. Оно будет отправлено специалисту.`,
    chatClosed: 'Чат со специалистом завершен.',
    sentToSpecialist: (name) => `Ваше сообщение отправлено специалисту ${name}. Ответ придет в этом же боте.`,
    supportUnavailable:
      'Чат для операторов пока не подключен. Отправьте /setchatid в операторском чате, и после этого сообщения будут уходить специалисту.',
    specialistReplyPrefix: (name) => `Ответ специалиста ${name}:`,
    ownerOnly:
      'Эта команда доступна только владельцу бота. Если бот настраивается впервые, сначала отправьте /setchatid.',
    ownerSaved: (userId) => `Владелец сохранен. Owner ID: ${userId}`,
  },
};

const doctorData = {
  uz: {
    malika: {
      name: '🧠 Malika Alisherovna',
      text:
        "<b>🧠 Malika Alisherovna - Bolalar nevrologi (oliy toifali)</b>\n\n<b>Tajriba:</b> 25 yildan ortiq.\n<b>Qabul yo'nalishlari:</b>\n• nutq rivojlanishi kechikishi;\n• tug'ruq paytidagi gipoksiya oqibatlari;\n• DEGS va diqqat jamlash muammolari;\n• BSF va ASB bo'yicha reabilitatsiya;\n• surunkali bosh og'riqlari;\n• uyqu buzilishlari va bezovtalik.\n\n<b>Qabulga qachon murojaat qilish kerak:</b>\n• bola kech gapirsa;\n• tez charchasa yoki serjahllik kuzatilsa;\n• hushyorlik va diqqat bilan muammo bo'lsa.\n\n<b>Qabul formati:</b> ko'rik, tavsiya va keyingi nazorat rejasi.",
    },
    anvar: {
      name: '⚡ Anvar Xakimov',
      text:
        "<b>⚡ Anvar Xakimov - Nevrolog-epileptolog</b>\n\n<b>Tajriba:</b> 15 yil.\n<b>Qabul yo'nalishlari:</b>\n• EEG monitoring va tahlil;\n• hushdan ketish holatlari;\n• tiklar va duduqlanish;\n• tungi uyqu buzilishlari;\n• bosh miya jarohatlaridan keyingi tiklanish.\n\n<b>Mutaxassisligi:</b> tutqanoq holatlari va nevrologik kuzatuv.\n\n<b>Qabulga qachon kelish kerak:</b>\n• bola sababsiz qotib qolsa;\n• uyquda titrash yoki bezovtalik bo'lsa;\n• tez-tez bosh aylanishi kuzatilsa.",
    },
    lola: {
      name: '👂 Lola Kirimova',
      text:
        "<b>👂 Lola Kirimova - LOR-shifokor</b>\n\n<b>Tajriba:</b> 18 yil.\n<b>Qabul yo'nalishlari:</b>\n• adenoidit;\n• surunkali tonzillit;\n• otit;\n• sinusit;\n• allergik rinit;\n• burun bitishi va quloq og'rig'i.\n\n<b>Ko'p uchraydigan shikoyatlar:</b>\n• bola og'iz ochib uxlaydi;\n• tez-tez shamollaydi;\n• eshitishi pasaygandek tuyuladi.",
    },
    sanjar: {
      name: '👁 Sanjar Yusupov',
      text:
        "<b>👁 Sanjar Yusupov - Bolalar oftalmologi</b>\n\n<b>Tajriba:</b> 14 yil.\n<b>Qabul yo'nalishlari:</b>\n• miopiya;\n• g'ilaylik;\n• ambliopiya;\n• ko'rish diagnostikasi;\n• tungi linzalar bo'yicha maslahat;\n• ekran bilan bog'liq ko'z charchoqlari.\n\n<b>Qabulga sabab bo'ladigan holatlar:</b>\n• televizorga juda yaqin borish;\n• ko'zni qisib qarash;\n• darsda yozuvni yomon ko'rish.",
    },
    nargiza: {
      name: '🥗 Nargiza Saidova',
      text:
        "<b>🥗 Nargiza Saidova - Pediatr-dietolog</b>\n\n<b>Tajriba:</b> 12 yil.\n<b>Qabul yo'nalishlari:</b>\n• oziq-ovqat allergiyalari;\n• vazn nazorati;\n• OIT muammolari;\n• ovqatlanish rejasi;\n• vitamin va mikroelementlar bo'yicha tavsiya;\n• ishtaha pasayishi.\n\n<b>Kimlar uchun foydali:</b>\n• kam vaznli bolalar;\n• ortiqcha vaznli bolalar;\n• tez-tez ich ketishi yoki qabziyat kuzatiladigan bolalar.",
    },
    dilshod: {
      name: '🩺 Dilshod Rahmonov',
      text:
        "<b>🩺 Dilshod Rahmonov - Bolalar jarrohi</b>\n\n<b>Tajriba:</b> 20 yil.\n<b>Qabul yo'nalishlari:</b>\n• kindik va chov churralari;\n• yumshoq to'qima patologiyalari;\n• uzdechka tuzatish;\n• tayanch-harakat tizimi bahosi;\n• kichik jarrohlik ko'riklari;\n• tug'ma nuqsonlar bo'yicha maslahat.\n\n<b>Qabulga qachon murojaat qilish kerak:</b>\n• shish yoki bo'rtma paydo bo'lsa;\n• bola yurishida noqulaylik bo'lsa;\n• jarrohlik bahosi kerak bo'lsa.",
    },
  },
  ru: {
    malika: {
      name: '🧠 Малика Алишеровна',
      text:
        '<b>🧠 Малика Алишеровна - Детский невролог</b>\n\n<b>Стаж:</b> более 25 лет.\n<b>Направления:</b>\n• задержка речевого развития;\n• последствия гипоксии;\n• СДВГ;\n• реабилитация при ДЦП и РАС;\n• головные боли и нарушения сна.',
    },
    anvar: {
      name: '⚡ Анвар Хакимов',
      text:
        '<b>⚡ Анвар Хакимов - Невролог-эпилептолог</b>\n\n<b>Стаж:</b> 15 лет.\n<b>Направления:</b>\n• ЭЭГ и мониторинг;\n• нарушения сна;\n• тики и заикание;\n• восстановление после травм.',
    },
    lola: {
      name: '👂 Лола Киримова',
      text:
        '<b>👂 Лола Киримова - ЛОР-врач</b>\n\n<b>Стаж:</b> 18 лет.\n<b>Направления:</b>\n• аденоиды;\n• хронический тонзиллит;\n• отиты;\n• синуситы и аллергический ринит.',
    },
    sanjar: {
      name: '👁 Санжар Юсупов',
      text:
        '<b>👁 Санжар Юсупов - Детский офтальмолог</b>\n\n<b>Стаж:</b> 14 лет.\n<b>Направления:</b>\n• миопия;\n• косоглазие;\n• амблиопия;\n• подбор линз и диагностика зрения.',
    },
    nargiza: {
      name: '🥗 Наргиза Саидова',
      text:
        '<b>🥗 Наргиза Саидова - Педиатр-диетолог</b>\n\n<b>Стаж:</b> 12 лет.\n<b>Направления:</b>\n• пищевые аллергии;\n• контроль веса;\n• проблемы ЖКТ;\n• план питания и витамины.',
    },
    dilshod: {
      name: '🩺 Дильшод Рахмонов',
      text:
        '<b>🩺 Дильшод Рахмонов - Детский хирург</b>\n\n<b>Стаж:</b> 20 лет.\n<b>Направления:</b>\n• пупочные и паховые грыжи;\n• патологии мягких тканей;\n• коррекция уздечки;\n• оценка опорно-двигательной системы.',
    },
  },
};

function getMainLanguageKeyboard() {
  return Markup.keyboard([["🇺🇿 O'zbekcha", '🇷🇺 Русский']]).oneTime().resize();
}

function getDoctorButtons(lang) {
  const names = doctorData[lang];
  return Markup.inlineKeyboard([
    [
      { text: names.malika.name, callback_data: 'info_malika' },
      { text: names.anvar.name, callback_data: 'info_anvar' },
    ],
    [
      { text: names.lola.name, callback_data: 'info_lola' },
      { text: names.sanjar.name, callback_data: 'info_sanjar' },
    ],
    [
      { text: names.nargiza.name, callback_data: 'info_nargiza' },
      { text: names.dilshod.name, callback_data: 'info_dilshod' },
    ],
  ]);
}

function getDoctorActionButtons(lang, doctorKey) {
  return Markup.inlineKeyboard([
    [{ text: TEXT[lang].startChat, callback_data: `start_chat_${doctorKey}` }],
    [{ text: TEXT[lang].back, callback_data: 'back_to_list' }],
  ]);
}

function getChatKeyboard(lang) {
  return Markup.keyboard([[TEXT[lang].finishChat]]).resize();
}

async function sendSpecialistList(ctx, lang) {
  await ctx.reply(TEXT[lang].chooseSpecialist, getDoctorButtons(lang));
}

async function relaySupportReply(ctx) {
  if (!supportChatId || ctx.chat.id !== supportChatId) {
    return false;
  }

  const replyTo = ctx.message.reply_to_message;
  if (!replyTo || !supportReplyMap.has(replyTo.message_id)) {
    return false;
  }

  const target = supportReplyMap.get(replyTo.message_id);
  const lang = target.lang || 'uz';
  const doctorName = doctorData[lang][target.doctorKey]?.name || target.doctorKey;

  await bot.telegram.sendMessage(
    target.userId,
    `${TEXT[lang].specialistReplyPrefix(doctorName)}\n${ctx.message.text}`
  );

  await ctx.reply(`Yuborildi: ${doctorName} -> ${target.userId}`);
  return true;
}

bot.start((ctx) => {
  userLanguage.set(ctx.chat.id, 'uz');
  activeSpecialistChats.delete(ctx.chat.id);
  ctx.reply(`${TEXT.uz.welcome} / ${TEXT.ru.welcome}`, getMainLanguageKeyboard());
});

bot.command('chatid', async (ctx) => {
  await ctx.reply(`Chat ID: ${ctx.chat.id}`);
});

bot.command('myid', async (ctx) => {
  await ctx.reply(`User ID: ${ctx.from.id}`);
});

bot.command('setchatid', async (ctx) => {
  const lang = userLanguage.get(ctx.chat.id) || 'uz';

  if (!ensureOwner(ctx)) {
    await ctx.reply(TEXT[lang].ownerOnly);
    return;
  }

  config.ownerUserId = ownerUserId;
  config.supportChatId = ctx.chat.id;
  supportChatId = ctx.chat.id;
  saveConfig(config);

  await ctx.reply(`${TEXT[lang].ownerSaved(ownerUserId)}\nOperator chat ulandi.\nChat ID: ${supportChatId}`);
});

bot.on('text', async (ctx) => {
  if (await relaySupportReply(ctx)) {
    return;
  }

  const text = ctx.message.text;
  const chatId = ctx.chat.id;

  if (text === "🇺🇿 O'zbekcha") {
    userLanguage.set(chatId, 'uz');
    activeSpecialistChats.delete(chatId);
    return ctx.reply(TEXT.uz.askDoctor, Markup.keyboard([['Ha', "Yo'q"]]).oneTime().resize());
  }

  if (text === '🇷🇺 Русский') {
    userLanguage.set(chatId, 'ru');
    activeSpecialistChats.delete(chatId);
    return ctx.reply(TEXT.ru.askDoctor, Markup.keyboard([['Да', 'Нет']]).oneTime().resize());
  }

  const lang = userLanguage.get(chatId) || 'uz';
  const activeChat = activeSpecialistChats.get(chatId);

  if (text === TEXT[lang].finishChat) {
    activeSpecialistChats.delete(chatId);
    await ctx.reply(TEXT[lang].chatClosed, Markup.removeKeyboard());
    return sendSpecialistList(ctx, lang);
  }

  if (text === 'Ha' || text === 'Да') {
    await ctx.reply(TEXT[lang].wait);
    setTimeout(() => {
      ctx.reply(TEXT[lang].chooseSpecialist, getDoctorButtons(lang));
    }, 5000);
    return;
  }

  if (text === "Yo'q" || text === 'Нет') {
    activeSpecialistChats.delete(chatId);
    return ctx.reply(TEXT[lang].noDoctor, Markup.removeKeyboard());
  }

  if (activeChat) {
    if (!supportChatId) {
      return ctx.reply(TEXT[lang].supportUnavailable, getChatKeyboard(lang));
    }

    const doctorName = doctorData[activeChat.lang][activeChat.doctorKey].name;
    const supportMessage = await bot.telegram.sendMessage(
      supportChatId,
      [
        `Mutaxassis: ${doctorName}`,
        `Foydalanuvchi: ${ctx.from.first_name || ''} ${ctx.from.last_name || ''}`.trim(),
        `Username: ${ctx.from.username ? `@${ctx.from.username}` : "yo'q"}`,
        `Chat ID: ${chatId}`,
        `User ID: ${chatId}`,
        '',
        text,
      ].join('\n')
    );

    supportReplyMap.set(supportMessage.message_id, {
      userId: chatId,
      doctorKey: activeChat.doctorKey,
      lang: activeChat.lang,
    });

    return ctx.reply(TEXT[lang].sentToSpecialist(doctorName), getChatKeyboard(lang));
  }
});

bot.action(/info_(.+)/, async (ctx) => {
  const doctorKey = ctx.match[1];
  const lang = userLanguage.get(ctx.chat.id) || 'uz';
  const data = doctorData[lang][doctorKey];

  await ctx.answerCbQuery();
  await ctx.editMessageText(data.text, {
    parse_mode: 'HTML',
    ...getDoctorActionButtons(lang, doctorKey),
  });
});

bot.action(/start_chat_(.+)/, async (ctx) => {
  const doctorKey = ctx.match[1];
  const lang = userLanguage.get(ctx.chat.id) || 'uz';
  const doctorName = doctorData[lang][doctorKey].name;

  activeSpecialistChats.set(ctx.chat.id, { doctorKey, lang });
  await ctx.answerCbQuery();
  await ctx.reply(TEXT[lang].chatStarted(doctorName), getChatKeyboard(lang));
});

bot.action('back_to_list', async (ctx) => {
  const lang = userLanguage.get(ctx.chat.id) || 'uz';
  await ctx.answerCbQuery();
  await ctx.editMessageText(TEXT[lang].chooseSpecialist, getDoctorButtons(lang));
});

bot.launch();
console.log('Bot ishga tushdi.');
