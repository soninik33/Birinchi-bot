const { Telegraf } = require('telegraf');
const express = require('express');
const app = express();

app.get('/', (req, res) => res.send('Bot is running!'));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server port ${PORT} da ishlamoqda`));

const bot = new Telegraf('8679972956:AAEBHBBCBnbkIFbq9BCg7pBGnkQZWpmxI8c');

bot.start((ctx) => {
  ctx.reply('Добро пожаловать в MedPediatr! Чем я могу вам помочь?\n\nMedPediatr-ga xush kelibsiz! Sizga qanday yordam bera olaman?');
});

bot.hears(['я хочу связаться с врачом', 'shifokor bilan bog\'lanish'], (ctx) => {
    const isUz = ctx.message.text.toLowerCase().includes('shifokor');
    
    ctx.reply(isUz ? 'Kerakli shifokorni tanlang:' : 'Выберите нужного врача:', {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: isUz ? "Malika Alisherovna (Pediatr-nevrolog)" : "Малика Алишеровна (Педиатр-невролог)", url: "https://t.me/MedPediatr_Bot" },
                    { text: isUz ? "Anvar Hakimov (Bolalar nevrologi)" : "Анвар Хакимов (Детский невролог)", url: "https://t.me/MedPediatrAbot" }
                ],
                [
                    { text: isUz ? "Lola Karimova (Bolalar LOR)" : "Лола Каримова (Детский ЛОР)", url: "https://t.me/MedPediatrLbot" },
                    { text: isUz ? "Sanjar Yusupov (Bolalar oftalmologi)" : "Санжар Юсупов (Детский офтальмолог)", url: "https://t.me/MedPediatrSbot" }
                ],
                [
                    { text: isUz ? "Nargiza Saidova (Pediatr-dietolog)" : "Наргиза Саидова (Педиатр-диетолог)", url: "https://t.me/MedPediatrNbot" },
                    { text: isUz ? "Dilshod Rahmonov (Bolalar xirurgi)" : "Дилшод Рахмонов (Детский хирург)", url: "https://t.me/MedPediatrRbot" }
                ]
            ]
        }
    });
});

bot.on('text', (ctx) => {
    const text = ctx.message.text.toLowerCase();
    if (text.includes('привет') || text.includes('salom')) {
        ctx.reply('Привет! / Salom! \n\n"я хочу связаться с врачом" или "shifokor bilan bog\'lanish"');
    } else {
        ctx.reply('Ваше сообщение получено, ожидайте ответа врача.\n\nXabaringiz qabul qilindi, shifokor javobini kuting.');
    }
});

bot.launch();
console.log("Бот запущен и слушает команды...")