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

const doctorData = {
    malika: {
        link: "https://t.me/MedPediatr_Bot",
        text: "<b>Малика Алишеровна — детский невролог высшей категории</b>\n\n" +
              "<b>Стаж работы более 25 лет. Эксперт в области нейрофизиологии. Помогла тысячам детей обрести здоровое будущее.</b>\n\n" +
              "<b>Направления деятельности:</b>\n" +
              "<b>• Диагностика и лечение задержек развития (ЗРР, ЗПРР);\n" +
              "• Последствия родовых травм и гипоксии;\n" +
              "• Коррекция поведенческих расстройств (СДВГ, тревожность);\n" +
              "• Реабилитация при ДЦП и аутизме;\n" +
              "• Головные боли и нарушения сна у подростков.</b>"
    },
    anvar: {
        link: "https://t.me/MedPediatrAbot",
        text: "<b>Анвар Хакимов — кандидат медицинских наук, невролог-эпилептолог</b>\n\n" +
              "<b>Стаж работы 15 лет. Ведущий специалист по диагностике и лечению детской эпилепсии.</b>\n\n" +
              "<b>Профессиональные интересы:</b>\n" +
              "<b>• Расшифровка ЭЭГ любой сложности и мониторинг;\n" +
              "• Лечение нарушений сна, ночных кошмаров и лунатизма;\n" +
              "• Терапия тиков и заикания;\n" +
              "• Восстановление после инфекций и травм мозга.</b>"
    },
    lola: {
        link: "https://t.me/MedPediatrLbot",
        text: "<b>Лола Киримова — ЛОР-врач высшей категории</b>\n\n" +
              "<b>Стаж работы 18 лет. Придерживается тактики лечения без хирургического вмешательства.</b>\n\n" +
              "<b>Направления лечения:</b>\n" +
              "<b>• Консервативное лечение аденоидов (II-III степени);\n" +
              "• Хронические тонзиллиты и ангины;\n" +
              "• Лечение отитов и восстановление слуха;\n" +
              "• Затяжные риниты и гаймориты.</b>"
    },
    sanjar: {
        link: "https://t.me/MedPediatrSbot",
        text: "<b>Санжар Юсупов — детский офтальмолог, хирург</b>\n\n" +
              "<b>Стаж работы 14 лет. Специалист по аппаратным методам восстановления зрения.</b>\n\n" +
              "<b>Чем поможет ребенку:</b>\n" +
              "<b>• Остановка прогрессирования миопии (близорукости);\n" +
              "• Коррекция косоглазия без операций;\n" +
              "• Подбор ночных линз и очковой оптики;\n" +
              "• Исследование глазного дна на современном оборудовании.</b>"
    },
    nargiza: {
        link: "https://t.me/MedPediatrNbot",
        text: "<b>Наргиза Саидова — педиатр-диетолог, нутрициолог</b>\n\n" +
              "<b>Стаж работы 12 лет. Специалист по коррекции питания для здоровья детей.</b>\n\n" +
              "<b>Ключевые компетенции:</b>\n" +
              "<b>• Диета при аллергиях и пищевой непереносимости;\n" +
              "• Работа с весом (избыток или плохой аппетит);\n" +
              "• Восстановление работы ЖКТ;\n" +
              "• Индивидуальные программы для часто болеющих детей.</b>"
    },
    dilshod: {
        link: "https://t.me/MedPediatrRbot",
        text: "<b>Дильшод Рахмонов — детский хирург высшей категории</b>\n\n" +
              "<b>Стаж работы 20 лет. Опытный специалист в детской хирургии.</b>\n\n" +
              "<b>Основные услуги:</b>\n" +
              "<b>• Диагностика пупочных и паховых грыж;\n" +
              "• Патологии мягких тканей и кожи;\n" +
              "• Коррекция уздечки языка и губ;\n" +
              "• Оценка опорно-двигательного аппарата (осанка, плоскостопие).</b>"
    }
};

const doctorButtons = Markup.inlineKeyboard([
    [{ text: "🩺 Малика Алишеровна", callback_data: "info_malika" }, { text: "🧠 Анвар Хакимов", callback_data: "info_anvar" }],
    [{ text: "👂 Лола Каримова", callback_data: "info_lola" }, { text: "👁️ Санжар Юсупов", callback_data: "info_sanjar" }],
    [{ text: "🍏 Наргиза Саидова", callback_data: "info_nargiza" }, { text: "✂️ Дильшод Рахмонов", callback_data: "info_dilshod" }]
]);

bot.start((ctx) => {
    ctx.reply('MedPediatr ga xush kelibsiz! Tilni tanlang / Добро пожаловать в MedPediatr! Выберите язык:', Markup.keyboard([
        ['O\'zbekcha', 'Русский']
    ]).oneTime().resize());
});

bot.on('text', async (ctx) => {
    const text = ctx.message.text.toLowerCase();

    if (text === 'o\'zbekcha') {
        return ctx.reply('Shifokor bilan bog\'lanishni istaysizmi?', Markup.keyboard([['Ha', 'Yo\'q']]).oneTime().resize());
    } else if (text === 'русский') {
        return ctx.reply('Вы хотите связаться с врачом?', Markup.keyboard([['Да', 'Нет']]).oneTime().resize());
    } else if (text === 'ha' || text === 'да') {
        return ctx.reply('Kerakli mutaxassisni tanlang / Выберите специалиста:', doctorButtons);
    } else if (text === 'yo\'q' || text === 'нет') {
        return ctx.reply('Понятно, тогда Досвидос!');
    } else {
        await ctx.reply('Xabaringiz qabul qilindi / Сообщение принято.');
    }
});

bot.action(/info_(.+)/, async (ctx) => {
    const doctorKey = ctx.match[1];
    const data = doctorData[doctorKey];
    if (data) {
        await ctx.answerCbQuery();
        await ctx.editMessageText(data.text, {
            parse_mode: 'HTML',
            ...Markup.inlineKeyboard([
                [Markup.button.url('Написать врачу лично 💬', data.link)],
                [Markup.button.callback('⬅️ Вернуться', 'back_to_list')]
            ])
        });
    }
});

bot.action('back_to_list', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.editMessageText('Выберите специалиста / Mutaxassisni tanlang:', doctorButtons);
});

bot.launch();
console.log("Бот запушен, и слушает команды!");