const { Telegraf, Markup } = require('telegraf');
const express = require('express');
const app = express();

app.get('/', (req, res) => res.send('Bot is running!'));
const PORT = process.env.PORT || 1000;
app.listen(PORT, '0.0.0.0', () => console.log(`Server port ${PORT} da ishlamoqda`));

setInterval(() => { console.log("Bot faol..."); }, 300000);

const bot = new Telegraf('8679972956:AAGYXhdlzh84_EzOc-1iVoY5HgmiGHPZj5Y');
const userLanguage = {};

const doctorData = {
    uz: {
        malika: { link: "https://t.me/MedPediatr_Bot", text: "<b>🩺 Malika Alisherovna — Bolalar nevrologi (Oliy toifali)</b>\n\n<b>Tajriba:</b> 25 yildan ortiq. Neyrofiziologiya bo'yicha ekspert.\n\n<b>Mutaxassisligi:</b>\n• Nutq rivojlanishi kechikishi (NRT, ZPRR) - zamonaviy diagnostika;\n• Tug'ruq paytidagi gipoksiya oqibatlari;\n• DEGS (Diqqat yetishmasligi va giperaktivlik sindromi) bo'yicha kompleks yondashuv;\n• Bolalar serebral falaji (BSF) va autizm spektridagi buzilishlar (ASB) reabilitatsiyasi;\n• O'smirlarda surunkali bosh og'riqlari va uyqu buzilishlarini davolash.\n\n<b>Yondashuv:</b> Neyropsixologik korreksiya va dori-darmonlarsiz terapiya usullari." },
        anvar: { link: "https://t.me/MedPediatrAbot", text: "<b>🧠 Anvar Xakimov — Nevrolog-epileptolog, tibbiyot fanlari nomzodi</b>\n\n<b>Tajriba:</b> 15 yil. Epilepsiya diagnostikasida yuqori natijalar.\n\n<b>Xizmatlar:</b>\n• EEG (Elektroensefalografiya) – monitoring va yuqori aniqlikdagi tahlil;\n• Tungi uyqu buzilishlari: uyquda yurish, tungi dahshatlar (parasomniya);\n• Tiklar, duduqlanish va asabiy spazmlar uchun individual terapiya sxemalari;\n• Bosh miya jarohatlaridan keyingi kognitiv funksiyalarni tiklash.\n\n<b>Prinsip:</b> Dalillarga asoslangan tibbiyot va bemor xavfsizligini ta'minlash." },
        lola: { link: "https://t.me/MedPediatrLbot", text: "<b>👂 Lola Kirimova — Oliy toifali LOR-shifokor</b>\n\n<b>Tajriba:</b> 18 yil. Jarrohliksiz davolash tarafdori.\n\n<b>Yo'nalishlar:</b>\n• Adenoidit (II-III darajali) – operatsiyasiz davolash metodikasi;\n• Surunkali tonzillit va doimiy tomoq og'rig'ini bartaraf etish;\n• O'tkir va surunkali otitlar, eshitish qobiliyatini tiklash;\n• Sinusit, gaymorit va allergik rinitni kompleks fizioterapiya qilish;\n• Burun-halqum kasalliklarini diagnostika qilish va profilaktika qilish.\n\n<b>Natija:</b> Nafas yo'llarini tozalash va antibiotiklarsiz sog'lom hayot." },
        sanjar: { link: "https://t.me/MedPediatrSbot", text: "<b>👁️ Sanjar Yusupov — Bolalar oftalmologi, jarroh</b>\n\n<b>Tajriba:</b> 14 yil. Ko'rish qobiliyatini apparatli davolash bo'yicha ekspert.\n\n<b>Imkoniyatlar:</b>\n• Maktab o'quvchilarida miopiya (yaqindan ko'ra olmaslik) progressini to'xtatish;\n• G'ilaylik (strabizm) ni operatsiyasiz tuzatish;\n• Ambliopiya („dangasa ko'z“) davosi;\n• Tungi linzalar (Orto-keratologiya) tanlash va ularni o'rnatish;\n• Zamonaviy optik va apparatli ko'rish diagnostikasi.\n\n<b>Yondashuv:</b> Bolalar uchun qulay va qiziqarli ko'rishni tekshirish muolajalari." },
        nargiza: { link: "https://t.me/MedPediatrNbot", text: "<b>🍏 Nargiza Saidova — Pediatr-dietolog, nutritsiolog</b>\n\n<b>Tajriba:</b> 12 yil. Salomatlikni to'g'ri ovqatlanish bilan mustahkamlash.\n\n<b>Asosiy yordam:</b>\n• Oziq-ovqat allergiyalari (laktoza, glyuten) bo'yicha maxsus ratsion;\n• Semizlik yoki kam vazn bo'yicha individual dasturlar;\n• Oshqozon-ichak tizimi (OIT) faoliyatini tiklash va disbakteriozni davolash;\n• Immunitetni oshiruvchi vitaminlar kompleksi va ovqatlanish jadvali;\n• Tez-tez kasal bo'ladigan bolalar uchun reabilitatsiya rejasi.\n\n<b>Maqsad:</b> Ovqatlanishni salomatlikning asosiy ustuniga aylantirish." },
        dilshod: { link: "https://t.me/MedPediatrRbot", text: "<b>✂️ Dilshod Rahmonov — Bolalar jarrohi (Oliy toifa)</b>\n\n<b>Tajriba:</b> 20 yil. Katta tajriba va yuqori professionallik.\n\n<b>Soha:</b>\n• Kindik va chov churralarini erta aniqlash va monitoring;\n• Teri va yumshoq to'qimalarning rivojlanish patologiyalari;\n• Til va lab yuzangisini (уздечка) tez va og'riqsiz tuzatish;\n• Tayanch-harakat tizimi: yassi oyoqlik va qomat buzilishlarini baholash;\n• Bolalar jarrohligi bo'yicha to'liq maslahat va operatsiyadan keyingi kuzatuv.\n\n<b>Yondashuv:</b> Ishonch va xotirjamlik – ota-onalar uchun eng muhim ko'mak." }
    },
    ru: {
        malika: { link: "https://t.me/MedPediatr_Bot", text: "<b>🩺 Малика Алишеровна — Детский невролог высшей категории</b>\n\n<b>Стаж:</b> 25+ лет. Эксперт в нейрофизиологии.\n\n<b>Специализация:</b>\n• Диагностика ЗРР, ЗПРР;\n• Нейропсихологическая оценка состояния развития ребенка;\n• Лечение последствий перинатальных поражений ЦНС и гипоксии;\n• Коррекция СДВГ и тревожности;\n• Реабилитация при ДЦП и расстройствах аутистического спектра (РАС);\n• Хронические головные боли и нарушения сна у подростков.\n\n<b>Подход:</b> Безопасные методы нейрокоррекции, без лишней химии." },
        anvar: { link: "https://t.me/MedPediatrAbot", text: "<b>🧠 Анвар Хакимов — Невролог-эпилептолог, к.м.н.</b>\n\n<b>Стаж:</b> 15 лет. Ведущий эксперт по детской эпилептологии.\n\n<b>Основные направления:</b>\n• Высокоточная расшифровка ЭЭГ, видео-ЭЭГ мониторинг сна;\n• Лечение ночных страхов, лунатизма и инсомнии;\n• Терапия тиков и заикания;\n• Восстановление функций после травм и инфекций;\n• Индивидуальный подбор противосудорожной терапии.\n\n<b>Гарантия:</b> Профессиональный подход к самым сложным случаям." },
        lola: { link: "https://t.me/MedPediatrLbot", text: "<b>👂 Лола Киримова — ЛОР-врач высшей категории</b>\n\n<b>Стаж:</b> 18 лет. Сторонник консервативного лечения.\n\n<b>Услуги:</b>\n• Лечение аденоидов II-III степени (без операций);\n• Терапия хронических тонзиллитов и профилактика ангин;\n• Лечение отитов, восстановление слуховой функции;\n• Терапия ринитов, гайморитов и аллергий;\n• Современные физиопроцедуры для ЛОР-органов.\n\n<b>Результат:</b> Свободное дыхание без сосудосуживающих капель." },
        sanjar: { link: "https://t.me/MedPediatrSbot", text: "<b>👁️ Санжар Юсупов — Детский офтальмолог, хирург</b>\n\n<b>Стаж:</b> 14 лет. Эксперт по аппаратной коррекции.\n\n<b>Что мы предлагаем:</b>\n• Остановка прогрессирования миопии;\n• Безоперационная коррекция косоглазия и амблиопии;\n• Подбор ночных линз и сложной оптики;\n• Глубокое исследование глазного дна на новейшем оборудовании;\n• Профессиональный мониторинг зрения школьников.\n\n<b>Опыт:</b> Индивидуальный подход, превращающий визит в комфорт." },
        nargiza: { link: "https://t.me/MedPediatrNbot", text: "<b>🍏 Наргиза Саидова — Педиатр-диетолог, нутрициолог</b>\n\n<b>Стаж:</b> 12 лет. Специалист по детскому здоровью.\n\n<b>Направления:</b>\n• Рацион при пищевых аллергиях и непереносимости;\n• Работа с нарушениями пищевого поведения;\n• Восстановление ЖКТ и обмена веществ;\n• Программы питания для часто болеющих детей;\n• Индивидуальный расчет нутриентов для гармоничного роста.\n\n<b>Цель:</b> Питание как инструмент укрепления иммунитета." },
        dilshod: { link: "https://t.me/MedPediatrRbot", text: "<b>✂️ Дильшод Рахмонов — Детский хирург высшей категории</b>\n\n<b>Стаж:</b> 20 лет. Хирург с огромным опытом.\n\n<b>С чем обращаются:</b>\n• Грыжи (пупочные, паховые) – наблюдение;\n• Патологии мягких тканей;\n• Коррекция уздечки языка и губ;\n• Оценка опорно-двигательного аппарата, плоскостопие;\n• Консультации по экстренной хирургии.\n\n<b>Отношение:</b> Качественная помощь без лишнего стресса для ребенка." }
    }
};

const getDoctorButtons = () => Markup.inlineKeyboard([
    [{ text: "🩺 Малика Алишеровна", callback_data: "info_malika" }, { text: "🧠 Анвар Хакимов", callback_data: "info_anvar" }],
    [{ text: "👂 Лола Киримова", callback_data: "info_lola" }, { text: "👁️ Санжар Юсупов", callback_data: "info_sanjar" }],
    [{ text: "🍏 Наргиза Саидова", callback_data: "info_nargiza" }, { text: "✂️ Дильшод Рахмонов", callback_data: "info_dilshod" }]
]);

bot.start((ctx) => {
    ctx.reply('MedPediatr ga xush kelibsiz! Tilni tanlang / Добро пожаловать в MedPediatr! Выберите язык:', Markup.keyboard([['🇺🇿 O\'zbekcha', '🇷🇺 Русский']]).oneTime().resize());
});

bot.on('text', async (ctx) => {
    const text = ctx.message.text;
    const chatId = ctx.chat.id;

    if (text === '🇺🇿 O\'zbekcha') {
        userLanguage[chatId] = 'uz';
        return ctx.reply('Shifokor bilan bog\'lanishni istaysizmi?', Markup.keyboard([['Ha', 'Yo\'q']]).oneTime().resize());
    }
    if (text === '🇷🇺 Русский') {
        userLanguage[chatId] = 'ru';
        return ctx.reply('Вы хотите связаться с врачом?', Markup.keyboard([['Да', 'Нет']]).oneTime().resize());
    }

    const lang = userLanguage[chatId] || 'uz';
    if (text === 'Ha' || text === 'Да') {
        await ctx.reply(lang === 'uz' ? 'Iltimos, 5 soniya kuting...' : 'Пожалуйста, подождите 5 секунд...');
        setTimeout(() => {
            ctx.reply(lang === 'uz' ? 'Mutaxassisni tanlang:' : 'Выберите специалиста:', getDoctorButtons());
        }, 5000);
    } else if (text === 'Yo\'q' || text === 'Нет') {
        ctx.reply(lang === 'uz' ? 'Tushunarli, xayr!' : 'Понятно, тогда Досвидос!');
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
    await ctx.editMessageText(lang === 'uz' ? 'Mutaxassisni tanlang:' : 'Выберите специалиста:', getDoctorButtons());
});

bot.launch();
console.log("Бот запущени, слушает команды!");