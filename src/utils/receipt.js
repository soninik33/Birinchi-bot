const { DOCTOR_DATA } = require('../constants/doctors');

const MAP_URL = 'https://maps.app.goo.gl/RNXcPe8LbMMAGgXB7';

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function renderReceiptHtml(booking, doctor = {}) {
  const lang = booking.lang || 'uz';
  const docInfo = doctor[lang] || doctor.uz || { name: 'Mutaxassis', title: 'Shifokor' };
  
  const createdDate = booking.createdAt
    ? new Date(booking.createdAt).toLocaleString(lang === 'uz' ? 'uz-UZ' : 'ru-RU', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Noma\'lum';

  const t = {
    uz: {
      clinicName: 'MedPediatr Tibbiyot Markazi',
      subtitle: 'Qabulga yozilish elektron cheki',
      receiptNo: 'Chek №',
      statusVerified: 'Tasdiqlangan / Qabul qilingan',
      patientSection: 'Bemor ma\'lumotlari',
      patientName: 'F.I.Sh (Ism-Familiya)',
      patientAge: 'Yoshi',
      phone: 'Telefon raqami',
      complaint: 'Murojaat sababi / Shikoyat',
      appointmentSection: 'Qabul ma\'lumotlari',
      doctor: 'Qabul qiluvchi shifokor',
      slot: 'Belgilangan qabul vaqti',
      address: 'Manzil',
      addressVal: 'Toshkent sh., Yunusobod tumani, Bog\'ishamol ko\'chasi, 223-uy (SAMPI)',
      createdAt: 'Rasmiylashtirilgan vaqt',
      printBtn: '🖨️ Chekni chop etish (PDF saqlash)',
      mapBtn: '📍 Google Xaritada ko\'rish',
      note: 'Iltimos, belgilangan qabul vaqtidan 10-15 daqiqa oldin shifoxonaga yetib kelishingizni so\'raymiz.',
      yearsOld: 'yosh',
    },
    ru: {
      clinicName: 'Медицинский Центр MedPediatr',
      subtitle: 'Электронный чек записи на прием',
      receiptNo: 'Чек №',
      statusVerified: 'Подтверждено / Принято',
      patientSection: 'Данные пациента',
      patientName: 'Ф.И.О.',
      patientAge: 'Возраст',
      phone: 'Номер телефона',
      complaint: 'Причина обращения / Жалоба',
      appointmentSection: 'Информация о приеме',
      doctor: 'Принимающий врач',
      slot: 'Назначенное время',
      address: 'Адрес',
      addressVal: 'г. Ташкент, Юнусабадский район, ул. Богишамол, 223 (САМПИ)',
      createdAt: 'Время оформления',
      printBtn: '🖨️ Распечатать чек (Сохранить PDF)',
      mapBtn: '📍 Посмотреть на Google Картах',
      note: 'Пожалуйста, приходите за 10-15 минут до назначенного времени приема.',
      yearsOld: 'лет',
    }
  }[lang] || {};

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${t.receiptNo} #${escapeHtml(booking.id)} - ${t.clinicName}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f1f5f9;
      color: #0f172a;
      padding: 24px 16px;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }
    .ticket-container {
      width: 100%;
      max-width: 480px;
      background: #ffffff;
      border-radius: 20px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04);
      overflow: hidden;
      border: 1px solid #e2e8f0;
      position: relative;
    }
    .ticket-header {
      background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
      color: #ffffff;
      padding: 28px 24px;
      text-align: center;
      position: relative;
    }
    .clinic-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: rgba(255, 255, 255, 0.18);
      backdrop-filter: blur(8px);
      padding: 6px 14px;
      border-radius: 9999px;
      font-size: 13px;
      font-weight: 600;
      margin-bottom: 12px;
    }
    .ticket-header h1 {
      font-size: 22px;
      font-weight: 800;
      letter-spacing: -0.02em;
      margin-bottom: 4px;
    }
    .ticket-header p {
      font-size: 14px;
      color: #e0f2fe;
    }
    .ticket-body {
      padding: 24px;
    }
    .status-badge {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      background: #ecfdf5;
      color: #065f46;
      border: 1px solid #a7f3d0;
      padding: 10px 16px;
      border-radius: 12px;
      font-weight: 700;
      font-size: 14px;
      margin-bottom: 24px;
    }
    .status-dot {
      width: 10px;
      height: 10px;
      background: #10b981;
      border-radius: 50%;
      box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.2);
    }
    .section-title {
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #64748b;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .info-list {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      padding: 14px 16px;
      margin-bottom: 20px;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 8px 0;
      border-bottom: 1px dashed #e2e8f0;
      font-size: 14px;
    }
    .info-row:last-child {
      border-bottom: none;
      padding-bottom: 0;
    }
    .info-row:first-child {
      padding-top: 0;
    }
    .info-label {
      color: #64748b;
      font-weight: 500;
      flex-shrink: 0;
      margin-right: 12px;
    }
    .info-value {
      font-weight: 600;
      color: #0f172a;
      text-align: right;
      word-break: break-word;
    }
    .highlight-value {
      color: #0284c7;
      font-weight: 700;
      font-size: 15px;
    }
    .barcode-container {
      text-align: center;
      margin: 20px 0 10px;
      padding-top: 15px;
      border-top: 2px dashed #cbd5e1;
    }
    .barcode-lines {
      height: 38px;
      background: repeating-linear-gradient(
        90deg,
        #0f172a 0px,
        #0f172a 2px,
        transparent 2px,
        transparent 4px,
        #0f172a 4px,
        #0f172a 7px,
        transparent 7px,
        transparent 9px,
        #0f172a 9px,
        #0f172a 12px,
        transparent 12px,
        transparent 15px
      );
      width: 75%;
      margin: 0 auto 8px;
    }
    .barcode-text {
      font-family: monospace;
      font-size: 13px;
      color: #64748b;
      letter-spacing: 0.15em;
      font-weight: 600;
    }
    .note-box {
      background: #fffbeb;
      border: 1px solid #fef3c7;
      color: #92400e;
      padding: 12px 14px;
      border-radius: 12px;
      font-size: 13px;
      line-height: 1.4;
      margin-bottom: 20px;
      text-align: center;
    }
    .btn-group {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      width: 100%;
      padding: 13px 18px;
      border-radius: 12px;
      font-size: 15px;
      font-weight: 600;
      text-decoration: none;
      cursor: pointer;
      border: none;
      transition: all 0.15s ease;
    }
    .btn-primary {
      background: #0284c7;
      color: #ffffff;
    }
    .btn-primary:hover {
      background: #0369a1;
    }
    .btn-secondary {
      background: #f1f5f9;
      color: #1e293b;
      border: 1px solid #cbd5e1;
    }
    .btn-secondary:hover {
      background: #e2e8f0;
    }
    @media print {
      body {
        background: #ffffff;
        padding: 0;
      }
      .ticket-container {
        box-shadow: none;
        border: 1px solid #000000;
        max-width: 100%;
      }
      .btn-group {
        display: none !important;
      }
    }
  </style>
</head>
<body>
  <div class="ticket-container">
    <div class="ticket-header">
      <div class="clinic-badge">
        <span>🏥</span> ${t.clinicName}
      </div>
      <h1>${t.subtitle}</h1>
      <p>${t.receiptNo}: <b>#${escapeHtml(booking.id)}</b></p>
    </div>

    <div class="ticket-body">
      <div class="status-badge">
        <span class="status-dot"></span>
        <span>${t.statusVerified}</span>
      </div>

      <div class="section-title">👤 ${t.patientSection}</div>
      <div class="info-list">
        <div class="info-row">
          <span class="info-label">${t.patientName}:</span>
          <span class="info-value highlight-value">${escapeHtml(booking.patientName)}</span>
        </div>
        <div class="info-row">
          <span class="info-label">${t.patientAge}:</span>
          <span class="info-value">${escapeHtml(booking.patientAge)} ${t.yearsOld}</span>
        </div>
        <div class="info-row">
          <span class="info-label">${t.phone}:</span>
          <span class="info-value">${escapeHtml(booking.phone)}</span>
        </div>
        ${booking.complaint ? `
        <div class="info-row">
          <span class="info-label">${t.complaint}:</span>
          <span class="info-value">${escapeHtml(booking.complaint)}</span>
        </div>` : ''}
      </div>

      <div class="section-title">👨‍⚕️ ${t.appointmentSection}</div>
      <div class="info-list">
        <div class="info-row">
          <span class="info-label">${t.doctor}:</span>
          <span class="info-value highlight-value">${escapeHtml(docInfo.name)} (${escapeHtml(docInfo.title)})</span>
        </div>
        <div class="info-row">
          <span class="info-label">${t.slot}:</span>
          <span class="info-value highlight-value">🕒 ${escapeHtml(booking.slot)}</span>
        </div>
        <div class="info-row">
          <span class="info-label">${t.address}:</span>
          <span class="info-value">${t.addressVal}</span>
        </div>
        <div class="info-row">
          <span class="info-label">${t.createdAt}:</span>
          <span class="info-value">${createdDate}</span>
        </div>
      </div>

      <div class="note-box">
        💡 ${t.note}
      </div>

      <div class="barcode-container">
        <div class="barcode-lines"></div>
        <div class="barcode-text">ID: ${escapeHtml(booking.id)}</div>
      </div>

      <div class="btn-group">
        <button class="btn btn-primary" onclick="window.print()">
          ${t.printBtn}
        </button>
        <a class="btn btn-secondary" href="${MAP_URL}" target="_blank" rel="noopener noreferrer">
          ${t.mapBtn}
        </a>
      </div>
    </div>
  </div>
</body>
</html>`;
}

function renderNotFoundHtml(bookingId) {
  return `<!DOCTYPE html>
<html lang="uz">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Chek topilmadi</title>
  <style>
    body {
      font-family: sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background: #f8fafc;
      color: #334155;
      text-align: center;
      padding: 20px;
    }
    .box {
      background: white;
      padding: 32px 24px;
      border-radius: 16px;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
      max-width: 400px;
    }
    h2 { color: #e11d48; margin-bottom: 8px; }
    p { margin-bottom: 20px; font-size: 14px; }
    a {
      display: inline-block;
      padding: 10px 18px;
      background: #0284c7;
      color: white;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="box">
    <h2>⚠️ Chek topilmadi</h2>
    <p>#${escapeHtml(bookingId)} raqamli qabul cheki bazadan topilmadi yoki mavjud emas.</p>
  </div>
</body>
</html>`;
}

module.exports = {
  MAP_URL,
  renderReceiptHtml,
  renderNotFoundHtml,
};
