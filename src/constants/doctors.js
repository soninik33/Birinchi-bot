/**
 * Doctor profiles and default schedules
 */
const DOCTOR_DATA = {
  malika: {
    name: 'Malika Alisherovna',
    title: 'Bolalar nevrologi',
    experience: '25+ yil',
    summary: 'Nutq kechikishi, diqqat, uyqu va nevrologik rivojlanish masalalari.',
    topics: [
      'Nutq rivojlanishi kechikishi',
      'Diqqat jamlash qiyinligi',
      'Uyqu bezovtaligi',
      'Bosh og\'riqlari',
    ],
  },
  anvar: {
    name: 'Anvar Hakimov',
    title: 'Nevrolog-epileptolog',
    experience: '15 yil',
    summary: 'Tutqanoq, EEG, tiklar va hush bilan bog\'liq holatlar.',
    topics: ['EEG tahlili', 'Tutqanoq', 'Tik va duduqlanish', 'Uyqudagi bezovtalik'],
  },
  lola: {
    name: 'Lola Kirimova',
    title: 'LOR shifokor',
    experience: '18 yil',
    summary: 'Quloq, tomoq, burun bilan bog\'liq bolalar muammolari.',
    topics: ['Adenoid', 'Otit', 'Sinusit', 'Tez-tez shamollash'],
  },
  sanjar: {
    name: 'Sanjar Yusupov',
    title: 'Bolalar oftalmologi',
    experience: '14 yil',
    summary: 'Ko\'rish pasayishi, g\'ilaylik va ko\'z zo\'riqishi.',
    topics: ['Miopiya', 'G\'ilaylik', 'Ambliopiya', 'Ekrandan ko\'z charchashi'],
  },
  nargiza: {
    name: 'Nargiza Saidova',
    title: 'Pediatr-dietolog',
    experience: '12 yil',
    summary: 'Ovqatlanish, vazn nazorati va hazm bilan bog\'liq masalalar.',
    topics: ['Allergiya', 'Vazn nazorati', 'Ishtaha pasayishi', 'Ovqatlanish rejimi'],
  },
  dilshod: {
    name: 'Dilshod Rahmonov',
    title: 'Bolalar xirurgi',
    experience: '20 yil',
    summary: 'Churra, yumshoq to\'qima va kichik xirurgik ko\'riklar.',
    topics: ['Kindik churrasi', 'Shish yoki bo\'rtma', 'Jarrohlik ko\'rigi', 'Tug\'ma holatlar'],
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
