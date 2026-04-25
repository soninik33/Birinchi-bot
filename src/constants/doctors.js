/**
 * Doctor profiles and default schedules in multiple languages
 */
const DOCTOR_DATA = {
  malika: {
    uz: {
      name: 'Malika Alisherovna',
      title: 'Bolalar nevrologi',
      experience: '25+ yil',
      summary: 'Nutq kechikishi, diqqat, uyqu va nevrologik rivojlanish masalalari.',
      topics: ['Nutq rivojlanishi kechikishi', 'Diqqat jamlash qiyinligi', 'Uyqu bezovtaligi', 'Bosh og\'riqlari'],
    },
    ru: {
      name: 'Малика Алишеровна',
      title: 'Детский невролог',
      experience: '25+ лет',
      summary: 'Задержка речи, внимание, сон и вопросы неврологического развития.',
      topics: ['Задержка речевого развития', 'Трудности с концентрацией', 'Беспокойство во сне', 'Головные боли'],
    }
  },
  anvar: {
    uz: {
      name: 'Anvar Hakimov',
      title: 'Nevrolog-epileptolog',
      experience: '15 yil',
      summary: 'Tutqanoq, EEG, tiklar va hush bilan bog\'liq holatlar.',
      topics: ['EEG tahlili', 'Tutqanoq', 'Tik va duduqlanish', 'Uyqudagi bezovtalik'],
    },
    ru: {
      name: 'Анвар Хакимов',
      title: 'Невролог-эпилептолог',
      experience: '15 лет',
      summary: 'Эпилепсия, ЭЭГ, тики и состояния, связанные с сознанием.',
      topics: ['Анализ ЭЭГ', 'Эпилепсия', 'Тики и заикание', 'Беспокойство во сне'],
    }
  },
  lola: {
    uz: {
      name: 'Lola Kirimova',
      title: 'LOR shifokor',
      experience: '18 yil',
      summary: 'Quloq, tomoq, burun bilan bog\'liq bolalar muammolari.',
      topics: ['Adenoid', 'Otit', 'Sinusit', 'Tez-tez shamollash'],
    },
    ru: {
      name: 'Лола Киримова',
      title: 'ЛОР врач',
      experience: '18 лет',
      summary: 'Проблемы с ушами, горлом и носом у детей.',
      topics: ['Аденоиды', 'Отит', 'Синусит', 'Частые простуды'],
    }
  },
  sanjar: {
    uz: {
      name: 'Sanjar Yusupov',
      title: 'Bolalar oftalmologi',
      experience: '14 yil',
      summary: 'Ko\'rish pasayishi, g\'ilaylik va ko\'z zo\'riqishi.',
      topics: ['Miopiya', 'G\'ilaylik', 'Ambliopiya', 'Усталость глаз от экранов'],
    },
    ru: {
      name: 'Санжар Юсупов',
      title: 'Детский офтальмолог',
      experience: '14 лет',
      summary: 'Снижение зрения, косоглазие и напряжение глаз.',
      topics: ['Миопия', 'Косоглазие', 'Амблиопия', 'Усталость глаз от экранов'],
    }
  },
  nargiza: {
    uz: {
      name: 'Nargiza Saidova',
      title: 'Pediatr-dietolog',
      experience: '12 yil',
      summary: 'Ovqatlanish, vazn nazorati va hazm bilan bog\'liq masalalar.',
      topics: ['Allergiya', 'Vazn nazorati', 'Ishtaha pasayishi', 'Ovqatlanish rejimi'],
    },
    ru: {
      name: 'Наргиза Саидова',
      title: 'Педиатр-диетолог',
      experience: '12 лет',
      summary: 'Питание, контроль веса и вопросы пищеварения.',
      topics: ['Аллергия', 'Контроль веса', 'Снижение аппетита', 'Режим питания'],
    }
  },
  dilshod: {
    uz: {
      name: 'Dilshod Rahmonov',
      title: 'Bolalar xirurgi',
      experience: '20 yil',
      summary: 'Churra, yumshoq to\'qima va kichik xirurgik ko\'riklar.',
      topics: ['Kindik churrasi', 'Shish yoki bo\'rtma', 'Jarrohlik ko\'rigi', 'Tug\'ma holatlar'],
    },
    ru: {
      name: 'Дилшод Рахмонов',
      title: 'Детский хирург',
      experience: '20 лет',
      summary: 'Грыжи, мягкие ткани и малые хирургические осмотры.',
      topics: ['Пупочная грыжа', 'Отеки или припухлости', 'Хирургический осмотр', 'Врожденные состояния'],
    }
  },
};

const DEFAULT_DOCTOR_SCHEDULES = {
  malika: ['Dushanba 10:00', 'Chorshanba 14:00', 'Juma 16:00'],
  anvar: ['Seshanba 11:00', 'Payshanba 15:00', 'Shanba 12:00'],
  lola: ['Dushanba 09:30', 'Payshanba 13:30', 'Juma 11:30'],
  sanjar: ['Seshanba 16:00', 'Chorshanba 12:00', 'Shanba 10:30'],
  nargiza: ['Dushanba 15:30', 'Juma 10:00', 'Shanba 14:30'],
  dilshod: ['Chorshanba 17:00', 'Payshanba 10:30', 'Yakshanba 11:00'],
};

module.exports = {
  DOCTOR_DATA,
  DEFAULT_DOCTOR_SCHEDULES,
};
