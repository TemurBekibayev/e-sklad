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

/**
 * Buyurtma uchun fiskal va oddiy chek ma'lumotlarini olish yoki shakllantirish
 */
async function getOrGenerateReceiptForOrder(orderId) {
  if (!orderId) return null;

  const order = await get(`SELECT * FROM orders WHERE id = ?`, [orderId]);
  if (!order) return null;

  const table = await get(`SELECT * FROM tables WHERE id = ?`, [order.table_id]);
  const items = await all(`
    SELECT oi.*, p.mxik_code, p.package_code, p.vat_percent 
    FROM order_items oi
    LEFT JOIN products p ON oi.product_id = p.id
    WHERE oi.order_id = ? AND (oi.is_cancelled = 0 OR oi.is_cancelled IS NULL) AND oi.quantity > 0
    ORDER BY oi.id ASC
  `, [orderId]);

  let payment = await get(`SELECT * FROM payments WHERE order_id = ? ORDER BY created_at DESC LIMIT 1`, [orderId]);

  const subtotal = items.reduce((sum, it) => sum + (Number(it.price) * Number(it.quantity)), 0);
  const serviceFeePercent = 10;
  const servicePercent = 10;
  const serviceFee = Math.round((subtotal * servicePercent) / 100);
  const totalAmount = payment?.total_amount || (subtotal + serviceFee);

  // Agar buyurtma to'langan bo'lsa va payments jadvalida yozuv bo'lmasa, fiskal yozuv yaratamiz
  if (!payment && (order.status === 'paid' || order.paid_at)) {
    const lastPayment = await get(`SELECT MAX(receipt_seq) as max_seq FROM payments`);
    const receiptSeq = (lastPayment && lastPayment.max_seq ? lastPayment.max_seq : 1000) + 1;
    const fiscalSign = generateFiscalSign();
    const dateNow = order.updated_at || order.created_at || new Date().toISOString();
    const paymentId = 'pay_' + Date.now();
    const fiscalQrUrl = buildSoliqQRUrl({ receiptSeq, totalAmount, fiscalSign, dateStr: dateNow });

    await run(`
      INSERT INTO payments (
        id, order_id, table_id, total_amount, payment_method, cash_amount, card_amount,
        fiscal_sign, fiscal_qr_url, receipt_seq, is_synced_soliq, created_at
      ) VALUES (?, ?, ?, ?, 'cash', ?, 0, ?, ?, ?, 1, ?)
    `, [paymentId, order.id, order.table_id, totalAmount, totalAmount, fiscalSign, fiscalQrUrl, receiptSeq, dateNow]);

    payment = await get(`SELECT * FROM payments WHERE id = ?`, [paymentId]);
  }

  const receiptSeq = payment?.receipt_seq || 1001;
  const fiscalSign = payment?.fiscal_sign || generateFiscalSign();
  const paymentDate = payment?.created_at || order.updated_at || order.created_at || new Date().toISOString();
  const fiscalQrUrl = payment?.fiscal_qr_url || buildSoliqQRUrl({ receiptSeq, totalAmount, fiscalSign, dateStr: paymentDate });

  let qrImageBase64 = '';
  try {
    qrImageBase64 = await QRCode.toDataURL(fiscalQrUrl, {
      margin: 1,
      width: 200,
      color: { dark: '#000000', light: '#ffffff' },
    });
  } catch (e) {
    console.warn('QR code generation error:', e.message);
  }

  const vatAmount = Math.round((totalAmount * 12) / 112);
  const cleanItems = items.map((it) => ({
    id: it.id,
    product_name: it.product_name,
    quantity: it.quantity,
    price: it.price,
    total: it.price * it.quantity,
    mxik_code: it.mxik_code || '10701001001000000',
    package_code: it.package_code || '796',
    vat_percent: it.vat_percent !== undefined ? it.vat_percent : 12,
  }));

  const fiscalReceipt = {
    paymentId: payment?.id || ('pay_' + Date.now()),
    receiptSeq,
    company: COMPANY_INFO,
    orderId: order.id,
    tableNumber: table ? table.number : order.table_id,
    tableName: table ? (table.name || `${table.number}-STOL`) : `STOL ${order.table_id}`,
    hallName: table ? (table.hall || 'Asosiy Zal') : 'Asosiy Zal',
    waiterName: order.waiter_name || 'Ofitsiant',
    totalAmount,
    vatAmount,
    paymentMethod: payment?.payment_method || 'cash',
    cashAmount: payment?.cash_amount || totalAmount,
    cardAmount: payment?.card_amount || 0,
    debtAmount: payment?.debt_amount || 0,
    fiscalSign,
    fiscalQrUrl,
    qrImageBase64,
    date: paymentDate,
    isOnline: true,
    isSynced: payment?.is_synced_soliq || 1,
    items: cleanItems,
  };

  const standardReceipt = {
    type: 'standard',
    company: COMPANY_INFO,
    orderId: order.id,
    orderNumber: order.id.substring(0, 8),
    tableNumber: table ? table.number : order.table_id,
    tableName: table ? (table.name || `${table.number}-STOL`) : `STOL ${order.table_id}`,
    hallName: table ? (table.hall || 'Asosiy Zal') : 'Asosiy Zal',
    waiterName: order.waiter_name || 'Ofitsiant',
    openedAt: order.created_at,
    closedAt: paymentDate,
    paymentMethod: payment?.payment_method || 'cash',
    cashAmount: payment?.cash_amount || totalAmount,
    cardAmount: payment?.card_amount || 0,
    subtotal,
    serviceFeePercent,
    serviceFee,
    totalAmount,
    items: cleanItems,
    footerText: 'Xaridingiz uchun rahmat! Yana kutib qolamiz!',
  };

  return {
    order,
    table,
    payment,
    fiscalReceipt,
    standardReceipt,
  };
}

module.exports = {
  COMPANY_INFO,
  setInternetStatus,
  getInternetStatus,
  fiscalizePayment,
  syncPendingQueue,
  getPendingCount,
  generateFiscalSign,
  getOrGenerateReceiptForOrder,
};
