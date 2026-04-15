const { Telegraf, Markup } = require('telegraf');
const express = require('express');
const app = express();

app.get('/', (req, res) => res.send('Bot is running!'));
const PORT = process.env.PORT || 1000;
app.listen(PORT, '0.0.0.0', () => console.log(`Server port ${PORT} da ishlamoqda`));

setInterval(() => {
  console.log("Bot hali ham ishlamoqda...");
}, 300000);

const bot = new Telegraf('8679972956:AAGYXhdlzh84_EzOc-1iVoY5HgmiGHPZj5Y');

const userLanguage = {};

const doctorData = {
    uz: {
        malika: { link: "https://t.me/MedPediatr_Bot", text: "<b>🩺 Malika Alisherovna — Bolalar nevrologi (Oliy toifali)</b>\n\nTajriba: 25 yildan ortiq.\n\nMutaxassisligi: Bolalar asab tizimi, bosh miya rivojlanishi va neyrofiziologiya.\n\nQo'llaniladigan metodikalar:\n• Nutq rivojlanishi kechikishi (NRT) diagnostikasi va kompleks davolash;\n• Psixomotor va intellektual rivojlanishni baholash;\n• Tug'ruq paytidagi gipoksiya va jarohatlar oqibatlarini bartaraf etish;\n• DEGS bo'yicha koreksion terapiya;\n• Bolalar serebral falaji (BSF) reabilitatsiyasi;\n• Autizm spektridagi buzilishlar bo'yicha maxsus yondashuv.\n\nYondashuv: Dori-darmonlarsiz neyropsixologik korreksiya." },
        anvar: { link: "https://t.me/MedPediatrAbot", text: "<b>🧠 Anvar Xakimov — Nevrolog-epileptolog, tibbiyot fanlari nomzodi</b>\n\nTajriba: 15 yil. Epilepsiya va neyrofiziologik kasalliklar bo'yicha yetakchi mutaxassis.\n\nXizmatlar:\n• EEG yuqori aniqlikdagi tahlili va monitoringi;\n• Tungi uyqu buzilishlari: uyquda yurish, tungi dahshatlar va uyqusizlikni bartaraf etish;\n• Bolalardagi tiklar, duduqlanish va asabiy spazmlarni davolash;\n• Bosh miya jarohatlari va infeksiyalaridan keyingi kognitiv funksiyalarni tiklash.\n\nPrinsip: Dalillarga asoslangan tibbiyot va maksimal xavfsizlik." },
        lola: { link: "https://t.me/MedPediatrLbot", text: "<b>👂 Lola Kirimova — Oliy toifali LOR-shifokor</b>\n\nTajriba: 18 yil. Jarrohliksiz davolash usullarining mohir ustasi.\n\nYo'nalishlar:\n• Adenoidit (II-III darajali) – jarrohliksiz yo'q qilish usullari;\n• Surunkali tonzillit va doimiy tomoq og'rig'ini davolash;\n• O'tkir va surunkali otitlar va eshitishni tiklash;\n• Sinusit, gaymorit va allergik rinitni kompleks terapiya qilish.\n\nNatija: Burun nafasining tiklanishi va antibiotiklar hamda tomchi dorilardan voz kechish." },
        sanjar: { link: "https://t.me/MedPediatrSbot", text: "<b>👁️ Sanjar Yusupov — Bolalar oftalmologi, jarroh</b>\n\nTajriba: 14 yil. Ko'rish qobiliyatini apparatli davolash bo'yicha ekspert.\n\nImkoniyatlar:\n• Maktab o'quvchilarida miopiya rivojlanishini to'xtatish;\n• G'ilaylik (strabizm) ni jarrohliksiz tuzatish usullari;\n• Ambliopiya davosi;\n• Tungi linzalar tanlash;\n• Zamonaviy optik va apparatli ko'rishni tekshirish diagnostikasi.\n\nYondashuv: Bolalar uchun qiziqarli vizual mashqlar va professional diagnostika." },
        nargiza: { link: "https://t.me/MedPediatrNbot", text: "<b>🍏 Nargiza Saidova — Pediatr-dietolog, nutritsiolog</b>\n\nTajriba: 12 yil. Bolalar salomatligini ovqatlanish orqali mustahkamlash.\n\nAsosiy yordam:\n• Oziq-ovqat allergiyalari (laktoza, glyuten va boshqalar) uchun maxsus ratsion;\n• Bolalar vaznini normallashtirish;\n• Oshqozon-ichak tizimi faoliyatini tiklash va disbakteriozdan qutilish;\n• Immunitetni ko'tarish uchun maxsus vitaminlar va ovqatlanish jadvali;\n• Tez-tez kasal bo'ladigan bolalar uchun immunitetni mustahkamlovchi reja." },
        dilshod: { link: "https://t.me/MedPediatrRbot", text: "<b>✂️ Dilshod Rahmonov — Bolalar jarrohi (Oliy toifa)</b>\n\nTajriba: 20 yil.\n\nSoha:\n• Kindik va chov churralarini erta aniqlash va monitoring qilish;\n• Teri va yumshoq to'qimalarning rivojlanish patologiyalari;\n• Til va lab yuzangisini tuzatish – tez va og'riqsiz;\n• Tayanch-harakat tizimi: yassi oyoqlik va qomat buzilishlarini baholash;\n• Bolalar jarrohligi bo'yicha to'liq maslahat va operatsiyadan keyingi kuzatuv." }
    },
    ru: {
        malika: { link: "https://t.me/MedPediatr_Bot", text: "<b>🩺 Малика Алишеровна — Детский невролог высшей категории</b>\n\nСтаж работы: более 25 лет. Эксперт в нейрофизиологии.\n\nСпециализация:\n• Диагностика задержек психоречевого развития (ЗРР, ЗПРР);\n• Лечение последствий перинатальных поражений ЦНС и гипоксии;\n• Коррекция СДВГ, дефицита внимания и тревожности;\n• Реабилитация при ДЦП и РАС;\n• Лечение головных болей и нарушений сна у подростков.\n\nПодход: Безопасные методы нейрокоррекции." },
        anvar: { link: "https://t.me/MedPediatrAbot", text: "<b>🧠 Анвар Хакимов — Невролог-эпилептолог, к.м.н.</b>\n\nСтаж работы: 15 лет. Ведущий эксперт по детской эпилептологии.\n\nОсновные направления:\n• Высокоточная расшифровка ЭЭГ, видео-ЭЭГ мониторинг сна;\n• Лечение нарушений сна: ночные страхи, лунатизм, инсомнии;\n• Терапия тиков, навязчивых состояний и заикания;\n• Восстановление когнитивных функций после травм.\n\nГарантия: Профессиональный подход к самым сложным неврологическим патологиям." },
        lola: { link: "https://t.me/MedPediatrLbot", text: "<b>👂 Лола Киримова — ЛОР-врач высшей категории</b>\n\nСтаж работы: 18 лет. Приверженец органосохраняющего лечения.\n\nУслуги:\n• Консервативное лечение аденоидов II-III степени;\n• Терапия хронических тонзиллитов и профилактика ангин;\n• Лечение отитов, восстановление слуховой функции;\n• Терапия затяжных ринитов, гайморитов и аллергий;\n• Современные физиотерапевтические процедуры." },
        sanjar: { link: "https://t.me/MedPediatrSbot", text: "<b>👁️ Санжар Юсупов — Детский офтальмолог, хирург</b>\n\nСтаж работы: 14 лет. Эксперт по аппаратной коррекции зрения.\n\nЧто мы предлагаем:\n• Остановка прогрессирующей близорукости (миопии);\n• Безоперационная коррекция косоглазия и лечение амблиопии;\n• Подбор ночных линз и сложной очковой оптики;\n• Детальное исследование глазного дна на новом оборудовании." },
        nargiza: { link: "https://t.me/MedPediatrNbot", text: "<b>🍏 Наргиза Саидова — Педиатр-диетолог, нутрициолог</b>\n\nСтаж работы: 12 лет. Специалист по нутритивной поддержке детского здоровья.\n\nНаправления:\n• Коррекция рациона при пищевых аллергиях (лактоза, глютен);\n• Работа с нарушениями пищевого поведения;\n• Восстановление микробиоты и ЖКТ;\n• Разработка индивидуальных программ питания для часто болеющих детей." },
        dilshod: { link: "https://t.me/MedPediatrRbot", text: "<b>✂️ Дильшод Рахмонов — Детский хирург высшей категории</b>\n\nСтаж работы: 20 лет. Хирург с большим клиническим опытом.\n\nС какими проблемами обращаются:\n• Выявление и динамическое наблюдение пупочных и паховых грыж;\n• Диагностика патологий развития мягких тканей и кожи;\n• Профессиональная коррекция уздечки языка и губ;\n• Экспертная оценка опорно-двигательного аппарата, лечение плоскостопия." }
    }
};

const getDoctorButtons = (lang) => Markup.inlineKeyboard([
    [{ text: lang === 'uz' ? "🩺 Malika A." : "🩺 Малика А.", callback_data: "info_malika" }, { text: lang === 'uz' ? "🧠 Anvar X." : "🧠 Анвар Х.", callback_data: "info_anvar" }],
    [{ text: lang === 'uz' ? "👂 Lola K." : "👂 Лола К.", callback_data: "info_lola" }, { text: lang === 'uz' ? "👁️ Sanjar Y." : "👁️ Санжар Ю.", callback_data: "info_sanjar" }],
    [{ text: lang === 'uz' ? "🍏 Nargiza S." : "🍏 Наргиза С.", callback_data: "info_nargiza" }, { text: lang === 'uz' ? "✂️ Dilshod R." : "✂️ Дильшод Р.", callback_data: "info_dilshod" }]
]);

bot.start((ctx) => {
    ctx.reply('Tilni tanlang / Выберите язык:', Markup.keyboard([['🇺🇿 O\'zbekcha', '🇷🇺 Русский']]).oneTime().resize());
});

bot.on('text', async (ctx) => {
    const text = ctx.message.text;
    const chatId = ctx.chat.id;

    if (text === '🇺🇿 O\'zbekcha') {
        userLanguage[chatId] = 'uz';
        return ctx.reply('Siz o\'zbek tilini tanladingiz. Shifokor bilan bog\'lanishni istaysizmi?', Markup.keyboard([['Ha'], ['Yo\'q']]).oneTime().resize());
    } 
    if (text === '🇷🇺 Русский') {
        userLanguage[chatId] = 'ru';
        return ctx.reply('Вы выбрали русский язык. Вы хотите связаться с врачом?', Markup.keyboard([['Да'], ['Нет']]).oneTime().resize());
    }

    const lang = userLanguage[chatId] || 'uz';
    if (text === 'Ha' || text === 'Да') {
        await ctx.reply(lang === 'uz' ? 'Iltimos, 5 soniya kuting...' : 'Пожалуйста, подождите 5 секунд...');
        setTimeout(() => {
            ctx.reply(lang === 'uz' ? 'Mutaxassisni tanlang:' : 'Выберите специалиста:', getDoctorButtons(lang));
        }, 5000);
    } else if (text === 'Yo\'q' || text === 'Нет') {
        ctx.reply(lang === 'Понятно, тогда Досвидос!');
    }
});

bot.action(/info_(.+)/, async (ctx) => {
    const doctorKey = ctx.match[1];
    const lang = userLanguage[ctx.chat.id] || 'uz';
    const data = doctorData[lang][doctorKey];
    
    await ctx.answerCbQuery();
    await ctx.editMessageText(data.text, {
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard([
            [Markup.button.url(lang === 'uz' ? 'Shifokorga yozish 💬' : 'Написать врачу 💬', data.link)],
            [Markup.button.callback(lang === 'uz' ? '⬅️ Orqaga' : '⬅️ Назад', 'back_to_list')]
        ])
    });
});

bot.action('back_to_list', async (ctx) => {
    const lang = userLanguage[ctx.chat.id] || 'uz';
    await ctx.answerCbQuery();
    await ctx.editMessageText(lang === 'uz' ? 'Mutaxassisni tanlang:' : 'Выберите специалиста:', getDoctorButtons(lang));
});

bot.launch();
console.log("Бот запушен, и слушает команды!");