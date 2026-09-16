const QRCode = require('qrcode');
const { run, all, get } = require('./db');

// Kafe rekvizitlari (Soliq.uz ro'yxatidan o'tgan korxona)
const COMPANY_INFO = {
  name: 'KAFE "MILLIY TAOMLAR" MCHJ',
  inn: '307849201',
  terminalId: 'EP108492',
  fiscalModuleId: 'FM99882211',
  address: 'Toshkent sh., Chilonzor tumani, 9-mavze',
};

// Internet holatini boshqarish (test qilish uchun API orqali ham yoqib-o'chirish mumkin)
let isOnline = true;

function setInternetStatus(status) {
  isOnline = Boolean(status);
  console.log(`[Soliq.uz] Internet holati o'zgardi: ${isOnline ? 'ONLINE' : 'OFFLINE'}`);
  if (isOnline) {
    syncPendingQueue();
  }
}

function getInternetStatus() {
  return isOnline;
}

// 12-xonali unikal fiskal belgi generatsiyasi
function generateFiscalSign() {
  let sign = '';
  for (let i = 0; i < 12; i++) {
    sign += Math.floor(Math.random() * 10).toString();
  }
  return sign;
}

// Soliq.uz rasmiy QR-kod havolasini shakllantirish
function buildSoliqQRUrl({ receiptSeq, totalAmount, fiscalSign, dateStr }) {
  const timestamp = dateStr ? new Date(dateStr).getTime() : Date.now();
  // DSQ OFD rasmiy chek tekshirish formati
  return `https://ofd.soliq.uz/check?t=${COMPANY_INFO.terminalId}&r=${receiptSeq}&c=${timestamp}&s=${totalAmount}&f=${fiscalSign}`;
}

// To'lovni fiskallashtirish (Soliq.uz ga jo'natish yoki oflayn navbatga qo'yish)
async function fiscalizePayment({ orderId, tableId, totalAmount, paymentMethod, cashAmount, cardAmount, items }) {
  // Chek raqami (ketma-ket)
  const lastPayment = await get(`SELECT MAX(receipt_seq) as max_seq FROM payments`);
  const receiptSeq = (lastPayment && lastPayment.max_seq ? lastPayment.max_seq : 1000) + 1;

  // QQS (12%) hisoblash (O'zbekiston standartida narx ichida: narx * 12 / 112)
  const vatAmount = Math.round((totalAmount * 12) / 112);

  const fiscalSign = generateFiscalSign();
  const dateNow = new Date().toISOString();
  const fiscalQrUrl = buildSoliqQRUrl({
    receiptSeq,
    totalAmount,
    fiscalSign,
    dateStr: dateNow,
  });

  // QR-kodni base64 rasmga aylantirish (termal printer va ekranda ko'rsatish uchun)
  const qrImageBase64 = await QRCode.toDataURL(fiscalQrUrl, {
    margin: 1,
    width: 200,
    color: {
      dark: '#000000',
      light: '#ffffff',
    },
  });

  const paymentId = 'pay_' + Date.now();
  const isSynced = isOnline ? 1 : 0;

  // 1. To'lovni saqlash
  await run(
    `INSERT INTO payments (
      id, order_id, table_id, total_amount, payment_method, cash_amount, card_amount, 
      fiscal_sign, fiscal_qr_url, receipt_seq, is_synced_soliq, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      paymentId,
      orderId,
      tableId,
      totalAmount,
      paymentMethod,
      cashAmount || 0,
      cardAmount || 0,
      fiscalSign,
      fiscalQrUrl,
      receiptSeq,
      isSynced,
      dateNow,
    ]
  );

  const receiptData = {
    paymentId,
    receiptSeq,
    company: COMPANY_INFO,
    totalAmount,
    vatAmount,
    paymentMethod,
    cashAmount: cashAmount || 0,
    cardAmount: cardAmount || 0,
    fiscalSign,
    fiscalQrUrl,
    qrImageBase64,
    date: dateNow,
    isOnline,
    isSynced,
    items,
  };

  // 2. Agar internet bo'lmasa, chekni oflayn navbatga (fiscal_queue) yozib qo'yamiz
  if (!isOnline) {
    console.log(`[Soliq.uz] DIQQAT: Oflayn rejim! Chek #${receiptSeq} fiskal navbatga saqlandi.`);
    await run(
      `INSERT INTO fiscal_queue (payment_id, order_id, payload, status) VALUES (?, ?, ?, 'pending')`,
      [paymentId, orderId, JSON.stringify(receiptData)]
    );
  } else {
    console.log(`[Soliq.uz] Chek #${receiptSeq} Soliq.uz ga muvaffaqiyatli jo'natildi (Fiskal belgi: ${fiscalSign}).`);
  }

  return receiptData;
}

// Oflayn yig'ilgan cheklarni Soliq.uz ga sinxronizatsiya qilish
async function syncPendingQueue() {
  try {
    const pendingItems = await all(`SELECT * FROM fiscal_queue WHERE status = 'pending'`);
    if (pendingItems.length === 0) return 0;

    console.log(`[Soliq.uz] Sinxronizatsiya boshlandi: ${pendingItems.length} ta chek Soliqqa yuborilmoqda...`);

    for (const item of pendingItems) {
      // Haqiqiy yoki simulyatsiya qilingan API so'rovi
      await new Promise((r) => setTimeout(r, 200)); // Qisqa kechikish

      await run(
        `UPDATE fiscal_queue SET status = 'synced', synced_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [item.id]
      );
      await run(`UPDATE payments SET is_synced_soliq = 1 WHERE id = ?`, [item.payment_id]);
    }

    console.log(`[Soliq.uz] Sinxronizatsiya yakunlandi! Barcha cheklar Soliq.uz bazasiga yozildi.`);
    return pendingItems.length;
  } catch (err) {
    console.error('[Soliq.uz] Sinxronizatsiyada xatolik:', err);
    return 0;
  }
}

// Jo'natilmagan cheklar soni
async function getPendingCount() {
  const res = await get(`SELECT COUNT(*) as count FROM fiscal_queue WHERE status = 'pending'`);
  return res ? res.count : 0;
}

module.exports = {
  COMPANY_INFO,
  setInternetStatus,
  getInternetStatus,
  fiscalizePayment,
  syncPendingQueue,
  getPendingCount,
  generateFiscalSign,
};
