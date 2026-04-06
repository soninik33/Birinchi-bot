const { Telegraf } = require('telegraf');

const bot = new Telegraf('8679972956:AAHDat96XDZHoLNU2q3uzmCFp1SwOom7N78');

bot.start((ctx) => {
  ctx.reply('Добро пожаловать в MedPediatr! Чем я могу вам помочь?');
});

bot.on('text', (ctx) => {
  ctx.reply('Ваше сообщение получено, ожидайте ответа врача.');
});

bot.hears('я хочу связаться с врачом', (ctx) => {
    ctx.reply('Выберите нужного врача:', {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: "Малика Алишеровна (Педиатр-невролог)", url: "https://t.me/MedPediatr_Bot" },
                    { text: "Анвар Хакимов (Детский невролог)", url: "https://t.me/MedPediatrAbot" }
                ],
                [
                    { text: "Лола Каримова (Детский ЛОР)", url: "https://t.me/MedPediatrLbot" },
                    { text: "Санжар Юсупов (Детский офтальмолог)", url: "http://t.me/MedPediatrSbot" }
                ],
                [
                    { text: "Наргиза Саидова (Педиатр-диетолог)", url: "http://t.me/MedPediatrNbot" },
                    { text: "Дилшод Рахмонов (Детский хирург)", url: "http://t.me/MedPediatrRbot" }
                ]
            ]
        }
    });
});

bot.launch();
console.log("Бот запущен и слушает команды...");