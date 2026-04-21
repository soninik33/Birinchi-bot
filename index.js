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
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(configData, null, 2), 'utf8');
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
const persistedActiveChats = config.activeChats || {};

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
  return [from.first_name, from.last_name].filter(Boolean).join(' ') || "Noma'lum";
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
app.listen(PORT, '0.0.0.0', () => console.log(`Server ${PORT} portda ishlamoqda`));

setInterval(() => {
  console.log('Bot faol...');
}, 300000);

const bot = new Telegraf(BOT_TOKEN);
const activeSpecialistChats = new Map(
  Object.entries(persistedActiveChats).map(([chatId, value]) => [Number(chatId), value])
);

const TEXT = {
  welcome:
    "MedPediatr botiga xush kelibsiz.\n\nKerakli bo'limni tanlang yoki /doctors ni yuboring.",
  chooseSpecialist: 'Mutaxassisni tanlang:',
  askDoctor: "Shifokor bilan bog'lanishni istaysizmi?",
  yes: 'Ha',
  no: "Yo'q",
  wait: 'Iltimos, 5 soniya kuting...',
  startChat: 'Suhbatni boshlash',
  back: 'Orqaga',
  finishChat: 'Suhbatni yakunlash',
  noDoctor: 'Tushunarli. Zarur bo‘lsa yana yozing.',
  chatClosed: 'Mutaxassis bilan suhbat yakunlandi.',
  sentToSpecialist: (name) => `Xabaringiz ${name} ga yuborildi. Javob shu bot ichida keladi.`,
  chatStarted: (name) =>
    `${name} tanlandi.\n\nEndi shu yerga savolingizni yozing. Xabar operatorga yuboriladi.`,
  supportUnavailable:
    "Operator chat hali ulanmagan. Operator chatdan /setchatid yuboring.",
  specialistReplyPrefix: (name) => `${name} javobi:`,
  ownerOnly:
    "Bu buyruq faqat bot egasi uchun. Agar birinchi sozlash bo'lsa, avval o'zingiz /setchatid yuboring.",
  ownerSaved: (userId) => `Admin saqlandi. Owner ID: ${userId}`,
};

const doctorData = {
  malika: {
    name: '🧠 Malika Alisherovna',
    text:
      "<b>🧠 Malika Alisherovna - Bolalar nevrologi</b>\n\n<b>Tajriba:</b> 25 yildan ortiq.\n<b>Qabul yo'nalishlari:</b>\n• nutq rivojlanishi kechikishi;\n• tug'ruq paytidagi gipoksiya oqibatlari;\n• DEGS va diqqat jamlash muammolari;\n• BSF va ASB bo'yicha reabilitatsiya;\n• surunkali bosh og'riqlari;\n• uyqu buzilishlari va bezovtalik.\n\n<b>Qabulga qachon murojaat qilish kerak:</b>\n• bola kech gapirsa;\n• tez charchasa yoki serjahllik kuzatilsa;\n• diqqat bilan muammo bo'lsa.\n\n<b>Qabul formati:</b> ko'rik, tavsiya va keyingi nazorat rejasi.",
  },
  anvar: {
    name: '⚡ Anvar Xakimov',
    text:
      "<b>⚡ Anvar Xakimov - Nevrolog-epileptolog</b>\n\n<b>Tajriba:</b> 15 yil.\n<b>Qabul yo'nalishlari:</b>\n• EEG monitoring va tahlil;\n• hushdan ketish holatlari;\n• tiklar va duduqlanish;\n• tungi uyqu buzilishlari;\n• bosh miya jarohatlaridan keyingi tiklanish.\n\n<b>Qabulga qachon kelish kerak:</b>\n• bola sababsiz qotib qolsa;\n• uyquda titrash bo'lsa;\n• tez-tez bosh aylanishi kuzatilsa.",
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

function persistActiveChats() {
  config.activeChats = Object.fromEntries(activeSpecialistChats.entries());
  saveConfig(config);
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
  const doctorName = activeChat ? doctorData[activeChat.doctorKey]?.name || 'Mutaxassis' : 'Mutaxassis';

  await bot.telegram.sendMessage(
    targetUserId,
    `${TEXT.specialistReplyPrefix(doctorName)}\n${ctx.message.text}`
  );

  await ctx.reply(`Yuborildi -> ${targetUserId}`);
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

  await ctx.reply(`${TEXT.ownerSaved(ownerUserId)}\nOperator chat ulandi.\nChat ID: ${supportChatId}`);
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
        `Mutaxassis: ${doctorName}`,
        `Foydalanuvchi: ${getUserFullName(ctx.from)}`,
        `Username: ${ctx.from.username ? `@${ctx.from.username}` : "yo'q"}`,
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
    await ctx.answerCbQuery('Topilmadi');
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
    await ctx.answerCbQuery('Topilmadi');
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
  console.error('Bot xatosi:', error);
});

bot.launch();
console.log('Bot ishga tushdi.');
