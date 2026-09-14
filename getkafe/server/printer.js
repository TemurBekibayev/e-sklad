const net = require('net');
const { run } = require('./db');

// Oxirgi chop etilgan kvitansiyalar tarixi (xotirada va bazada)
const recentKitchenTickets = [];
const recentFiscalReceipts = [];

/**
 * Oshxona uchun "Begunok" chekini shakllantirish
 * DIQQAT (TZ talabi): Faqat Stol raqami, Taom nomi, Soni, Ofitsiant ismi, Vaqt va Izoh chiqadi. Narxlar KO'RSATILMAYDI!
 */
function formatKitchenTicket({ orderId, tableNumber, waiterName, items, timestamp }) {
  const timeStr = new Date(timestamp || Date.now()).toLocaleTimeString('uz-UZ', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const lines = [
    '========================================',
    '          OSHXONA BUYURTMASI           ',
    '========================================',
    `STOL:       ${tableNumber}-STOL`,
    `OFITSIANT:  ${waiterName || 'Ofitsiant'}`,
    `VAQT:       ${timeStr}`,
    '----------------------------------------',
    'TAOM NOMI            SONI   IZOH        ',
    '----------------------------------------',
  ];

  items.forEach((item, index) => {
    const name = item.product_name.padEnd(20, ' ').substring(0, 20);
    const qty = `${item.quantity} ta`.padStart(6, ' ');
    lines.push(`${index + 1}. ${name} ${qty}`);
    if (item.comment && item.comment.trim() !== '') {
      lines.push(`   >>> IZOH: ${item.comment.trim()}`);
    }
  });

  lines.push('----------------------------------------');
  lines.push('       ILTIMOS, TEZKOR TAYYORLANSIN!    ');
  lines.push('========================================\n\n');

  return lines.join('\n');
}

/**
 * Oshxona printeriga buyruq yuborish (LAN / Wi-Fi yoki virtual simulyator)
 */
async function printToKitchen({ orderId, tableNumber, waiterName, items, printerIp = null, printerPort = 9100 }) {
  const ticketText = formatKitchenTicket({ orderId, tableNumber, waiterName, items });
  
  const ticketRecord = {
    id: 'kt_' + Date.now(),
    orderId,
    tableNumber,
    waiterName,
    items,
    ticketText,
    timestamp: new Date().toISOString(),
  };

  recentKitchenTickets.unshift(ticketRecord);
  if (recentKitchenTickets.length > 50) recentKitchenTickets.pop();

  // Baza tarixiga saqlash
  try {
    await run(
      `INSERT INTO kitchen_tickets (order_id, table_number, waiter_name, items_json, printed) VALUES (?, ?, ?, ?, 1)`,
      [orderId, tableNumber, waiterName, JSON.stringify(items)]
    );
  } catch (e) {
    console.error('Error saving kitchen ticket to DB:', e);
  }

  // Agar tarmoq printeri IP si ko'rsatilgan bo'lsa, TCP orqali ESC/POS yuboramiz
  if (printerIp) {
    try {
      const client = new net.Socket();
      client.connect(printerPort, printerIp, () => {
        // ESC/POS Init + Text + Cut paper command (\x1B\x69)
        const init = Buffer.from([0x1B, 0x40]);
        const cut = Buffer.from([0x1D, 0x56, 0x41, 0x10]);
        client.write(Buffer.concat([init, Buffer.from(ticketText, 'utf-8'), cut]));
        client.end();
      });
      client.on('error', (err) => {
        console.warn(`[Printer] LAN printerga ulanib bo'lmadi (${printerIp}):`, err.message);
      });
    } catch (err) {
      console.warn('[Printer] Tarmoq xatosi:', err.message);
    }
  }

  console.log(`[Oshxona Printeri] ${tableNumber}-stol uchun begunok chop etildi!`);
  return ticketRecord;
}

/**
 * Oshxona/Bar uchun "Bekor qilish cheki" (Бегунок отмены)
 * Video 2 (frame 2) dagi chek formati
 */
function formatCancellationTicket({ orderId, tableNumber, hallName, waiterName, workshop, items, timestamp }) {
  const dateStr = new Date(timestamp || Date.now()).toLocaleDateString('ru-RU');
  const timeStr = new Date(timestamp || Date.now()).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

  const lines = [
    '========================================',
    `       ${waiterName || 'Системный Администратор'}`,
    `       STOL ${tableNumber} (${hallName || 'Основной'})`,
    '----------------------------------------',
    `              ОТМЕНА                    `,
    `             ${workshop || 'Бар / Кухня'} `,
    '----------------------------------------',
    'НАИМЕНОВАНИЕ                     КОЛ-ВО ',
    '----------------------------------------',
  ];

  items.forEach((item) => {
    const name = (item.product_name || 'Блюдо').padEnd(26, ' ').substring(0, 26);
    const qty = `${item.quantity > 0 ? -item.quantity : item.quantity}`.padStart(6, ' ');
    lines.push(`${name} ${qty}`);
    if (item.reason) {
      lines.push(`   >>> Причина: ${item.reason}`);
    }
  });

  lines.push('----------------------------------------');
  lines.push(`Время:       ${dateStr} ${timeStr}`);
  lines.push('========================================\n\n');

  return lines.join('\n');
}

async function printKitchenCancellationTicket({ orderId, tableNumber, hallName, waiterName, workshop, items }) {
  const ticketText = formatCancellationTicket({ orderId, tableNumber, hallName, waiterName, workshop, items });
  const cancelRecord = {
    id: 'kct_' + Date.now(),
    type: 'cancellation',
    orderId,
    tableNumber,
    hallName: hallName || 'Основной',
    waiterName: waiterName || 'Системный Администратор',
    workshop: workshop || 'Бар / Кухня',
    items,
    ticketText,
    timestamp: new Date().toISOString(),
  };

  recentKitchenTickets.unshift(cancelRecord);
  if (recentKitchenTickets.length > 50) recentKitchenTickets.pop();

  console.log(`[Oshxona Printeri] Bekor qilish cheki (ОТМЕНА) STOL ${tableNumber} uchun chop etildi!`);
  return cancelRecord;
}

/**
 * Kassa yakuniy chekini saqlash
 */
function recordFiscalReceipt(receiptData) {
  recentFiscalReceipts.unshift(receiptData);
  if (recentFiscalReceipts.length > 50) recentFiscalReceipts.pop();
  return receiptData;
}

module.exports = {
  formatKitchenTicket,
  printToKitchen,
  formatCancellationTicket,
  printKitchenCancellationTicket,
  recordFiscalReceipt,
  getRecentKitchenTickets: () => recentKitchenTickets,
  getRecentFiscalReceipts: () => recentFiscalReceipts,
};
