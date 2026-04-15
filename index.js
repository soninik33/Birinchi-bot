const { Telegraf, Markup } = require('telegraf');
const express = require('express');
const app = express();

app.get('/', (req, res) => res.send(`<!DOCTYPE html>
<html lang="uz">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>MedBot Server</title>
  <style>
    :root {
      --bg: #f4fbf8;
      --bg-accent: #e8f7f1;
      --surface: rgba(255, 255, 255, 0.88);
      --surface-strong: #ffffff;
      --text: #14332b;
      --muted: #5d7b73;
      --line: rgba(20, 51, 43, 0.1);
      --primary: #14866d;
      --primary-deep: #0d5f4d;
      --secondary: #f2b24f;
      --shadow: 0 24px 70px rgba(20, 51, 43, 0.14);
      --radius: 28px;
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      min-height: 100vh;
      font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
      color: var(--text);
      background:
        radial-gradient(circle at top left, rgba(20, 134, 109, 0.18), transparent 34%),
        radial-gradient(circle at bottom right, rgba(242, 178, 79, 0.18), transparent 28%),
        linear-gradient(135deg, var(--bg) 0%, #f8fdfb 48%, var(--bg-accent) 100%);
      overflow-x: hidden;
    }

    .shell {
      width: min(1120px, calc(100% - 32px));
      margin: 0 auto;
      padding: 32px 0 56px;
    }

    .topbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 28px;
    }

    .brand {
      display: inline-flex;
      align-items: center;
      gap: 12px;
      padding: 10px 16px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.72);
      border: 1px solid rgba(255, 255, 255, 0.8);
      backdrop-filter: blur(14px);
      box-shadow: 0 12px 30px rgba(20, 51, 43, 0.08);
    }

    .brand-badge {
      width: 42px;
      height: 42px;
      display: grid;
      place-items: center;
      border-radius: 14px;
      color: #fff;
      font-size: 20px;
      background: linear-gradient(135deg, var(--primary) 0%, #29b492 100%);
    }

    .brand h1,
    .brand p {
      margin: 0;
    }

    .brand h1 {
      font-size: 16px;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }

    .brand p,
    .status p,
    .feature p,
    .panel p,
    .mini-card p {
      color: var(--muted);
    }

    .status {
      padding: 10px 16px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.72);
      border: 1px solid rgba(255, 255, 255, 0.84);
      backdrop-filter: blur(14px);
      box-shadow: 0 12px 30px rgba(20, 51, 43, 0.08);
    }

    .status strong {
      color: var(--primary-deep);
    }

    .hero {
      display: grid;
      grid-template-columns: minmax(0, 1.2fr) minmax(320px, 0.8fr);
      gap: 24px;
      align-items: stretch;
    }

    .card {
      position: relative;
      padding: 34px;
      border-radius: var(--radius);
      background: var(--surface);
      border: 1px solid rgba(255, 255, 255, 0.9);
      box-shadow: var(--shadow);
      backdrop-filter: blur(18px);
    }

    .card::before {
      content: "";
      position: absolute;
      inset: 1px;
      border-radius: calc(var(--radius) - 1px);
      border: 1px solid rgba(255, 255, 255, 0.45);
      pointer-events: none;
    }

    .eyebrow {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 18px;
      padding: 9px 14px;
      border-radius: 999px;
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: var(--primary-deep);
      background: rgba(20, 134, 109, 0.1);
    }

    .hero h2 {
      margin: 0 0 16px;
      font-size: clamp(34px, 5vw, 64px);
      line-height: 0.98;
      letter-spacing: -0.04em;
      max-width: 9ch;
    }

    .hero .lead {
      margin: 0;
      max-width: 56ch;
      font-size: 17px;
      line-height: 1.7;
      color: var(--muted);
    }

    .cta-row {
      display: flex;
      flex-wrap: wrap;
      gap: 14px;
      margin-top: 28px;
    }

    .button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      min-height: 50px;
      padding: 0 22px;
      border-radius: 16px;
      text-decoration: none;
      font-weight: 700;
      transition: transform 180ms ease, box-shadow 180ms ease, background 180ms ease;
    }

    .button:hover {
      transform: translateY(-2px);
    }

    .button-primary {
      color: #fff;
      background: linear-gradient(135deg, var(--primary) 0%, #24ad8d 100%);
      box-shadow: 0 16px 32px rgba(20, 134, 109, 0.28);
    }

    .button-secondary {
      color: var(--text);
      background: rgba(255, 255, 255, 0.88);
      border: 1px solid var(--line);
    }

    .stats {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 14px;
      margin-top: 28px;
    }

    .mini-card {
      padding: 18px;
      border-radius: 22px;
      background: rgba(255, 255, 255, 0.72);
      border: 1px solid rgba(20, 51, 43, 0.08);
    }

    .mini-card strong {
      display: block;
      margin-bottom: 6px;
      font-size: 24px;
    }

    .side-panel {
      display: grid;
      gap: 16px;
    }

    .signal {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 18px;
      padding: 16px 18px;
      border-radius: 22px;
      background: linear-gradient(135deg, rgba(20, 134, 109, 0.14), rgba(242, 178, 79, 0.16));
    }

    .signal strong,
    .feature h3,
    .panel h3 {
      margin: 0;
    }

    .pulse {
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: #18b57f;
      box-shadow: 0 0 0 0 rgba(24, 181, 127, 0.45);
      animation: pulse 1.8s infinite;
    }

    .panel-grid {
      display: grid;
      gap: 14px;
    }

    .feature,
    .panel {
      padding: 20px;
      border-radius: 22px;
      background: rgba(255, 255, 255, 0.76);
      border: 1px solid rgba(20, 51, 43, 0.08);
    }

    .feature p,
    .panel p,
    .status p,
    .mini-card p {
      margin: 6px 0 0;
      line-height: 1.6;
      font-size: 14px;
    }

    .section {
      margin-top: 24px;
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 18px;
    }

    @keyframes pulse {
      0% { box-shadow: 0 0 0 0 rgba(24, 181, 127, 0.45); }
      70% { box-shadow: 0 0 0 14px rgba(24, 181, 127, 0); }
      100% { box-shadow: 0 0 0 0 rgba(24, 181, 127, 0); }
    }

    @media (max-width: 920px) {
      .hero,
      .section {
        grid-template-columns: 1fr;
      }

      .hero h2 {
        max-width: 12ch;
      }
    }

    @media (max-width: 640px) {
      .shell {
        width: min(100% - 20px, 1120px);
        padding: 18px 0 34px;
      }

      .topbar {
        flex-direction: column;
        align-items: stretch;
      }

      .card {
        padding: 22px;
      }

      .stats {
        grid-template-columns: 1fr;
      }

      .hero h2 {
        font-size: 38px;
      }
    }
  </style>
</head>
<body>
  <main class="shell">
    <div class="topbar">
      <div class="brand">
        <div class="brand-badge">+</div>
        <div>
          <h1>MedBot Server</h1>
          <p>Tibbiy yo'naltirish va shifokor tanlash uchun backend panel</p>
        </div>
      </div>
      <div class="status">
        <strong>Server faol</strong>
        <p>Express va Telegram bot ishlayapti</p>
      </div>
    </div>

    <section class="hero">
      <article class="card">
        <div class="eyebrow">Medical assistant platform</div>
        <h2>Bot online. Xizmatlar tayyor.</h2>
        <p class="lead">
          MedBot foydalanuvchilarni kerakli mutaxassisga tez yo'naltirish uchun ishlaydi.
          Server barqaror, bot ulangan va konsultatsiya oqimi qabul qilinmoqda.
        </p>

        <div class="cta-row">
          <a class="button button-primary" href="https://t.me/MedPediatr_Bot" target="_blank" rel="noreferrer">Telegram botni ochish</a>
          <a class="button button-secondary" href="#overview">Qisqacha ko'rish</a>
        </div>

        <div class="stats">
          <div class="mini-card">
            <strong>24/7</strong>
            <p>Server javob holatida</p>
          </div>
          <div class="mini-card">
            <strong>2</strong>
            <p>Til qo'llovi: UZ va RU</p>
          </div>
          <div class="mini-card">
            <strong>6</strong>
            <p>Shifokor yo'nalishlari</p>
          </div>
        </div>
      </article>

      <aside class="card side-panel">
        <div class="signal">
          <div>
            <strong>Live status</strong>
            <p>Webhooksiz polling rejimida faol</p>
          </div>
          <div class="pulse"></div>
        </div>

        <div class="panel-grid">
          <div class="feature">
            <h3>Tez yo'naltirish</h3>
            <p>Foydalanuvchi til tanlaydi, keyin mutaxassis ro'yxatidan mos shifokorni oladi.</p>
          </div>
          <div class="feature">
            <h3>Soddalashtirilgan oqim</h3>
            <p>Keraksiz sahifalarsiz, to'g'ridan-to'g'ri Telegram orqali muloqotga o'tiladi.</p>
          </div>
          <div class="feature">
            <h3>Ishchi monitoring</h3>
            <p>Root sahifa server holatini vizual ko'rinishda ko'rsatadi.</p>
          </div>
        </div>
      </aside>
    </section>

    <section class="section" id="overview">
      <article class="panel">
        <h3>Interface</h3>
        <p>Minimal, toza va ishonchli ko'rinish berildi. Hozirgi backend uchun landing format ishlatilgan.</p>
      </article>
      <article class="panel">
        <h3>Responsiveness</h3>
        <p>Sahifa telefon va desktop ekranlarida moslashuvchan ishlashi uchun grid va breakpoints qo'shildi.</p>
      </article>
      <article class="panel">
        <h3>Safe change</h3>
        <p>Bot logikasi, callback’lar va ma'lumot oqimi o'zgartirilmagan. Faqat root UI yangilandi.</p>
      </article>
    </section>
  </main>
</body>
</html>`));
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
