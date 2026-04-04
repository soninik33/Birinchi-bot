const { Telegraf } = require('telegraf');

// Замените на ваш токен от @BotFather
const bot = new Telegraf('8679972956:AAHDat96XDZHoLNU2q3uzmCFp1SwOom7N78');

bot.start((ctx) => {
  ctx.reply('Добро пожаловать в MedPediatr! Чем я могу вам помочь?');
});

bot.on('text', (ctx) => {
  ctx.reply('Ваше сообщение получено, ожидайте ответа врача.');
});

bot.launch();
console.log("Бот запущен и слушает команды...");