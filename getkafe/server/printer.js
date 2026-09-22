const net = require('net');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFile, exec } = require('child_process');
const { run, get, all } = require('./db');

// Oxirgi chop etilgan kvitansiyalar tarixi (xotirada va bazada)
const recentKitchenTickets = [];
const recentFiscalReceipts = [];

function getPrintHelperPath() {
  const candidates = [
    path.join(__dirname, '..', 'PrintHelper.exe'),
    path.join(__dirname, '..', 'launcher', 'PrintHelper.exe'),
    path.join(process.cwd(), 'PrintHelper.exe'),
    path.join(process.cwd(), 'launcher', 'PrintHelper.exe'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

/**
 * Tizimda o'rnatilgan Windows printerlarini olish
 */
async function getInstalledPrinters() {
  return new Promise((resolve) => {
    const helperPath = getPrintHelperPath();
    if (helperPath) {
      execFile(helperPath, ['list-printers'], { windowsHide: true }, (err, stdout) => {
        if (!err && stdout) {
          try {
            const printers = JSON.parse(stdout.trim());
            return resolve(printers);
          } catch (e) {
            console.warn('[Printer] Parse error from PrintHelper:', e.message);
          }
        }
        fallbackPrintersViaPS(resolve);
      });
    } else {
      fallbackPrintersViaPS(resolve);
    }
  });
}

function fallbackPrintersViaPS(resolve) {
  const psCmd = `powershell -NoProfile -Command "Add-Type -AssemblyName System.Drawing; [System.Drawing.Printing.PrinterSettings]::InstalledPrinters"`;
  exec(psCmd, { windowsHide: true }, (err, stdout) => {
    if (err || !stdout) {
      return resolve([
        { name: 'Microsoft Print to PDF', isDefault: true },
      ]);
    }
    const lines = stdout.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    const result = lines.map((name, idx) => ({
      name,
      isDefault: idx === 0,
    }));
    resolve(result);
  });
}

/**
 * Printer sozlamalarini olish
 */
async function getPrinterSettings() {
  try {
    let settings = await get(`SELECT * FROM printer_settings WHERE id = 1`);
    if (!settings) {
      await run(`
        INSERT OR IGNORE INTO printer_settings (id, receipt_printer, kitchen_printer, paper_width, auto_print, cash_drawer)
        VALUES (1, '', '', '80mm', 1, 1)
      `);
      settings = await get(`SELECT * FROM printer_settings WHERE id = 1`);
    }
    return settings;
  } catch (e) {
    console.error('getPrinterSettings error:', e.message);
    return {
      receipt_printer: '',
      kitchen_printer: '',
      bar_printer: '',
      mangal_printer: '',
      kitchen_printer_ip: '',
      bar_printer_ip: '',
      mangal_printer_ip: '',
      workshop_printers: '{}',
      paper_width: '80mm',
      auto_print: 1,
      cash_drawer: 1,
      service_fee_percent: 10,
      header_title: 'KAFE "MILLIY TAOMLAR" MCHJ',
      header_address: 'Toshkent sh., Chilonzor tumani, 9-mavze',
      inn: '307849201',
      fm: 'FM99882211',
      footer_text: 'Haridingiz uchun rahmat! Xush kelibsiz!',
    };
  }
}

/**
 * Printer sozlamalarini saqlash
 */
async function updatePrinterSettings(settings) {
  const current = await getPrinterSettings();
  const updated = { ...current, ...settings };

  await run(
    `UPDATE printer_settings SET
      receipt_printer = ?,
      kitchen_printer = ?,
      bar_printer = ?,
      mangal_printer = ?,
      kitchen_printer_ip = ?,
      bar_printer_ip = ?,
      mangal_printer_ip = ?,
      workshop_printers = ?,
      paper_width = ?,
      auto_print = ?,
      cash_drawer = ?,
      service_fee_percent = ?,
      header_title = ?,
      header_address = ?,
      inn = ?,
      fm = ?,
      footer_text = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = 1`,
    [
      updated.receipt_printer || '',
      updated.kitchen_printer || '',
      updated.bar_printer || '',
      updated.mangal_printer || '',
      updated.kitchen_printer_ip || '',
      updated.bar_printer_ip || '',
      updated.mangal_printer_ip || '',
      typeof updated.workshop_printers === 'object' ? JSON.stringify(updated.workshop_printers) : (updated.workshop_printers || '{}'),
      updated.paper_width || '80mm',
      updated.auto_print !== undefined ? Number(updated.auto_print) : 1,
      updated.cash_drawer !== undefined ? Number(updated.cash_drawer) : 1,
      updated.service_fee_percent !== undefined ? Number(updated.service_fee_percent) : 10,
      updated.header_title || 'KAFE "MILLIY TAOMLAR" MCHJ',
      updated.header_address || 'Toshkent sh., Chilonzor tumani, 9-mavze',
      updated.inn || '307849201',
      updated.fm || 'FM99882211',
      updated.footer_text || 'Haridingiz uchun rahmat! Xush kelibsiz!',
    ]
  );

  return getPrinterSettings();
}

/**
 * Haqiqiy termal kassa chekini Windows printeriga chiqarish (PrintHelper.exe orqali)
 */
async function printThermalReceipt(receiptData) {
  const settings = await getPrinterSettings();
  const helperPath = getPrintHelperPath();

  if (!helperPath) {
    console.warn('[Printer] PrintHelper.exe topilmadi. Kassa virtual rejimda davom etadi.');
    recordFiscalReceipt(receiptData);
    return { success: true, virtual: true, message: 'PrintHelper topilmadi, chek xotirada saqlandi' };
  }

  let targetPrinter = (receiptData && receiptData.printerName) || settings.receipt_printer || '';
  if (!targetPrinter) {
    try {
      const installed = await getInstalledPrinters();
      const thermal = installed.find(p => /xprinter|pos|thermal|xp-|receipt|80/i.test(p.name)) || installed.find(p => p.isDefault) || installed[0];
      if (thermal) targetPrinter = thermal.name;
    } catch (e) {}
  }

  const cleanItems = Array.isArray(receiptData?.items) ? receiptData.items.map(it => ({
    product_name: String(it.product_name || it.name || 'Taom'),
    quantity: Number(it.quantity) || 1,
    price: Number(it.price) || 0,
    mxik_code: it.mxik_code ? String(it.mxik_code) : '',
    package_code: it.package_code ? String(it.package_code) : '796',
    vat_percent: (it.vat_percent !== undefined && it.vat_percent !== null && it.vat_percent !== '') ? Number(it.vat_percent) : 12,
    comment: it.comment ? String(it.comment) : '',
  })) : [];

  // Rekvizitlarni to'liq xavfsiz sanitizatsiya qilish (Null deserialization xatolarini oldini olish)
  const payload = {
    paymentId: String(receiptData?.paymentId || 'pay_' + Date.now()),
    receiptSeq: Number(receiptData?.receiptSeq) || 1001,
    company: {
      name: String(receiptData?.company?.name || settings.header_title || 'KAFE "MILLIY TAOMLAR" MCHJ'),
      inn: String(receiptData?.company?.inn || settings.inn || '307849201'),
      terminalId: String(receiptData?.company?.terminalId || 'VG298430008256'),
      fiscalModuleId: String(receiptData?.company?.fiscalModuleId || settings.fm || 'FM99882211'),
      address: String(receiptData?.company?.address || settings.header_address || 'Toshkent sh.'),
    },
    orderId: String(receiptData?.orderId || ''),
    tableNumber: String(receiptData?.tableNumber || receiptData?.tableId || ''),
    waiterName: String(receiptData?.waiterName || 'Ofitsiant'),
    totalAmount: Number(receiptData?.totalAmount) || 0,
    vatAmount: Number(receiptData?.vatAmount) || 0,
    paymentMethod: String(receiptData?.paymentMethod || 'cash'),
    cashAmount: Number(receiptData?.cashAmount) || 0,
    cardAmount: Number(receiptData?.cardAmount) || 0,
    fiscalSign: String(receiptData?.fiscalSign || ''),
    fiscalQrUrl: String(receiptData?.fiscalQrUrl || ''),
    qrImageBase64: String(receiptData?.qrImageBase64 || ''),
    date: String(receiptData?.date || receiptData?.dateTime || new Date().toISOString()),
    isSynced: receiptData?.isSynced ? 1 : 0,
    isOnline: receiptData?.isOnline ? 1 : 0,
    items: cleanItems,
    printerName: targetPrinter,
    paperWidth: String(receiptData?.paperWidth || settings.paper_width || '80mm'),
    headerTitle: String(settings.header_title || 'KAFE "MILLIY TAOMLAR" MCHJ'),
    headerAddress: String(settings.header_address || 'Toshkent sh.'),
    footerText: String(settings.footer_text || 'Haridingiz uchun rahmat!'),
    autoCut: true,
  };

  const tempFile = path.join(os.tmpdir(), `receipt_${Date.now()}_${Math.random().toString(36).substr(2, 6)}.json`);
  
  try {
    fs.writeFileSync(tempFile, JSON.stringify(payload), 'utf8');

    return await new Promise((resolve) => {
      execFile(helperPath, ['print-receipt', tempFile], { windowsHide: true }, (err, stdout, stderr) => {
        try { fs.unlinkSync(tempFile); } catch (e) {}

        if (err) {
          console.error('[Printer] Chop etishda xatolik:', stderr || err.message);
          return resolve({ success: false, error: stderr || err.message });
        }

        console.log('[Printer] Chek chop etildi:', stdout.trim());
        recordFiscalReceipt(receiptData);
        resolve({ success: true, message: stdout.trim() });
      });
    });
  } catch (err) {
    try { fs.unlinkSync(tempFile); } catch (e) {}
    console.error('[Printer] Fayl xatosi:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Sinov chekini chiqarish
 */
async function testPrint(printerName, paperWidth, type = 'receipt', printerIp = null) {
  if (type === 'kitchen' || type === 'bar' || type === 'mangal') {
    return printToKitchen({
      orderId: 'TEST-01',
      tableNumber: 'TEST',
      waiterName: 'Administrator',
      targetPrinter: printerName,
      printerIp: printerIp,
      items: [
        { product_name: `TEST ${type.toUpperCase()} TAOM`, quantity: 2, comment: 'Sinov begunoki' },
        { product_name: 'TEST ICHIMLIK', quantity: 1, comment: 'Sovuq holatda' },
      ],
      timestamp: Date.now(),
    });
  }

  const helperPath = getPrintHelperPath();
  if (!helperPath) {
    return { success: false, error: 'PrintHelper.exe topilmadi' };
  }

  const settings = await getPrinterSettings();
  let targetPrinter = printerName || settings.receipt_printer || '';
  if (!targetPrinter) {
    try {
      const installed = await getInstalledPrinters();
      const thermal = installed.find(p => /xprinter|pos|thermal|xp-|receipt|80/i.test(p.name)) || installed.find(p => p.isDefault) || installed[0];
      if (thermal) targetPrinter = thermal.name;
    } catch (e) {}
  }
  const targetWidth = paperWidth || settings.paper_width || '80mm';

  return new Promise((resolve) => {
    execFile(helperPath, ['test', targetPrinter, targetWidth], { windowsHide: true }, (err, stdout, stderr) => {
      if (err) {
        console.error('[Printer] Test chop etishda xatolik:', stderr || err.message);
        return resolve({ success: false, error: stderr || err.message });
      }
      resolve({ success: true, message: stdout.trim() });
    });
  });
}

/**
 * Oshxona uchun "Begunok" chekini shakllantirish
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
 * Oshxona printeriga buyruq yuborish (Windows printeri yoki LAN TCP soket)
 */
async function printToKitchen({ orderId, tableNumber, waiterName, items, targetPrinter = null, printerIp = null, printerPort = 9100 }) {
  const cleanItems = (items || []).map(it => ({
    id: it.id,
    product_id: it.product_id || it.productId || it.id,
    product_name: String(it.product_name || it.name || it.productName || it.title || 'Taom'),
    quantity: Number(it.quantity || it.qty || it.count || 1),
    price: Number(it.price || it.unit_price || 0),
    comment: it.comment || '',
    workshop: it.workshop || '',
  }));

  const ticketText = formatKitchenTicket({ orderId, tableNumber, waiterName, items: cleanItems });
  
  const ticketRecord = {
    id: 'kt_' + Date.now(),
    orderId,
    tableNumber,
    waiterName,
    items: cleanItems,
    ticketText,
    timestamp: new Date().toISOString(),
    status: 'pending', // 'pending', 'in_progress', 'ready', 'completed'
  };

  recentKitchenTickets.unshift(ticketRecord);
  if (recentKitchenTickets.length > 50) recentKitchenTickets.pop();

  // Baza tarixiga saqlash
  try {
    await run(
      `INSERT INTO kitchen_tickets (order_id, table_number, waiter_name, items_json, printed) VALUES (?, ?, ?, ?, 1)`,
      [orderId, tableNumber, waiterName, JSON.stringify(cleanItems)]
    );
  } catch (e) {
    console.error('Error saving kitchen ticket to DB:', e);
  }

  // 1. Agar Windows oshxona printeri sozlangan bo'lsa yoki asosiy printer orqali chop etish
  const settings = await getPrinterSettings();
  const helperPath = getPrintHelperPath();
  let selectedPrinter = targetPrinter || settings.kitchen_printer || settings.receipt_printer || '';
  if (!selectedPrinter) {
    try {
      const installed = await getInstalledPrinters();
      const thermal = installed.find(p => /xprinter|pos|thermal|xp-|receipt|kitchen|kassa|80|58/i.test(p.name)) || installed.find(p => p.isDefault) || installed[0];
      if (thermal) selectedPrinter = thermal.name;
    } catch (e) {}
  }

  if (selectedPrinter && helperPath) {
    const kitchenPayload = {
      orderId,
      tableNumber: String(tableNumber),
      waiterName,
      type: 'order',
      items: cleanItems,
      printerName: selectedPrinter,
      paperWidth: settings.paper_width || '80mm',
    };
    const tempFile = path.join(os.tmpdir(), `kitchen_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.json`);
    try {
      fs.writeFileSync(tempFile, JSON.stringify(kitchenPayload), 'utf8');
      execFile(helperPath, ['print-kitchen', tempFile], { windowsHide: true }, (err) => {
        try { fs.unlinkSync(tempFile); } catch (e) {}
        if (err) console.warn('[Printer] Oshxona chop etish xatosi:', err.message);
        else console.log(`[Printer] Oshxona cheki ${selectedPrinter} printeriga yuborildi!`);
      });
    } catch (e) {}
  }

  // 2. Agar tarmoq printeri IP si ko'rsatilgan bo'lsa (yoki settings.kitchen_printer_ip), TCP orqali ESC/POS yuboramiz
  const lanIp = printerIp || settings.kitchen_printer_ip;
  if (lanIp) {
    try {
      const ipParts = lanIp.split(':');
      const ipHost = ipParts[0].trim();
      const ipPort = ipParts[1] ? parseInt(ipParts[1], 10) : printerPort;

      const client = new net.Socket();
      client.setTimeout(3000);
      client.connect(ipPort, ipHost, () => {
        const init = Buffer.from([0x1B, 0x40]);
        const cut = Buffer.from([0x1D, 0x56, 0x41, 0x10]);
        client.write(Buffer.concat([init, Buffer.from(ticketText, 'utf-8'), cut]));
        client.end();
      });
      client.on('error', (err) => {
        console.warn(`[Printer] LAN printerga ulanib bo'lmadi (${ipHost}:${ipPort}):`, err.message);
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

  // PrintHelper orqali ham chiqarish
  const settings = await getPrinterSettings();
  const helperPath = getPrintHelperPath();
  let targetPrinter = settings.kitchen_printer || settings.receipt_printer || '';
  if (!targetPrinter) {
    try {
      const installed = await getInstalledPrinters();
      const thermal = installed.find(p => /xprinter|pos|thermal|xp-|receipt|kitchen|80|58/i.test(p.name)) || installed.find(p => p.isDefault) || installed[0];
      if (thermal) targetPrinter = thermal.name;
    } catch (e) {}
  }

  if (targetPrinter && helperPath) {
    const cancelPayload = {
      orderId,
      tableNumber: String(tableNumber),
      hallName,
      waiterName,
      workshop,
      type: 'cancellation',
      items,
      printerName: targetPrinter,
      paperWidth: settings.paper_width || '80mm',
    };
    const tempFile = path.join(os.tmpdir(), `cancel_${Date.now()}.json`);
    try {
      fs.writeFileSync(tempFile, JSON.stringify(cancelPayload), 'utf8');
      execFile(helperPath, ['print-kitchen', tempFile], { windowsHide: true }, (err) => {
        try { fs.unlinkSync(tempFile); } catch (e) {}
        if (err) console.warn('[Printer] Bekor qilish cheki xatosi:', err.message);
      });
    } catch (e) {}
  }

  console.log(`[Oshxona Printeri] Bekor qilish cheki (ОТМЕНА) STOL ${tableNumber} uchun chop etildi!`);
  return cancelRecord;
}

const recentPrecheckPrints = new Map(); // key -> timestamp

/**
 * Pre-chek (Xaridor uchun oraliq hisob-kitob cheki) chiqarish
 */
async function printPrecheckReceipt(precheckData) {
  const rawItems = precheckData?.items || [];
  const items = rawItems.filter(it => !it.is_cancelled && Number(it.quantity || it.qty || 1) > 0);
  const subtotal = precheckData?.subtotal !== undefined 
    ? Number(precheckData.subtotal) 
    : items.reduce((acc, it) => acc + (Number(it.price || it.unit_price || 0) * Number(it.quantity || it.qty || 1)), 0);
  const servicePercent = precheckData?.serviceFeePercent !== undefined ? Number(precheckData.serviceFeePercent) : 10;
  const serviceFee = precheckData?.serviceFee !== undefined ? Number(precheckData.serviceFee) : Math.round((subtotal * servicePercent) / 100);
  const totalAmount = precheckData?.totalAmount !== undefined ? Number(precheckData.totalAmount) : (subtotal + serviceFee);

  // Anti-duplicate protection: 2 soniya ichida bir xil buyurtmani qayta chiqarishni himoyalash
  const dedupeKey = `${precheckData?.tableNumber || ''}_${precheckData?.orderId || ''}_${totalAmount}`;
  const now = Date.now();
  const lastTime = recentPrecheckPrints.get(dedupeKey);
  if (lastTime && (now - lastTime < 2000)) {
    console.log(`[Printer] Pre-chek dublikati bloklandi (2 soniya ichida qayta chaqirildi): ${dedupeKey}`);
    return { success: true, message: 'Pre-chek allaqachon chop etildi' };
  }
  recentPrecheckPrints.set(dedupeKey, now);

  const settings = await getPrinterSettings();
  const helperPath = getPrintHelperPath();

  if (!helperPath) {
    return { success: false, error: 'PrintHelper.exe topilmadi' };
  }

  let targetPrinter = (precheckData && precheckData.printerName) || settings.receipt_printer || '';
  if (!targetPrinter) {
    try {
      const installed = await getInstalledPrinters();
      const thermal = installed.find(p => /xprinter|pos|thermal|xp-|receipt|80/i.test(p.name)) || installed.find(p => p.isDefault) || installed[0];
      if (thermal) targetPrinter = thermal.name;
    } catch (e) {}
  }

  const payload = {
    receiptSeq: 0,
    printerName: targetPrinter,
    paperWidth: precheckData.paperWidth || settings.paper_width || '80mm',
    headerTitle: settings.header_title || 'KAFE "MILLIY TAOMLAR"',
    headerAddress: settings.header_address || 'Toshkent shahar',
    tableNumber: precheckData.tableNumber ? String(precheckData.tableNumber) : '1',
    waiterName: precheckData.waiterName || 'Ofitsiant',
    date: new Date().toISOString(),
    paymentMethod: 'precheck',
    totalAmount: totalAmount,
    vatAmount: 0,
    footerText: "DIQQAT: Ushbu hisob to'lov cheki emas! (Pre-chek)",
    items: [
      ...items.map(it => ({
        product_name: String(it.product_name || it.name || it.productName || it.title || 'Taom'),
        quantity: Number(it.quantity || it.qty || it.count || 1),
        price: Number(it.price || it.unit_price || it.cost || 0),
        comment: it.comment || '',
      })),
      ...(serviceFee > 0 ? [{
        product_name: `Xizmat haqi (${servicePercent}%)`,
        quantity: 1,
        price: serviceFee,
      }] : []),
    ],
    autoCut: true,
  };

  const tempFile = path.join(os.tmpdir(), `precheck_${Date.now()}_${Math.random().toString(36).substr(2, 6)}.json`);

  try {
    fs.writeFileSync(tempFile, JSON.stringify(payload), 'utf8');

    return await new Promise((resolve) => {
      execFile(helperPath, ['print-receipt', tempFile], { windowsHide: true }, (err, stdout, stderr) => {
        try { fs.unlinkSync(tempFile); } catch (e) {}

        if (err) {
          console.error('[Printer] Pre-chek chop etish xatosi:', stderr || err.message);
          return resolve({ success: false, error: stderr || err.message });
        }

        console.log('[Printer] Pre-chek chop etildi:', stdout.trim());
        try {
          const backendSync = require('./backendSync');
          backendSync.markTablePrintedLocally(precheckData.tableNumber, precheckData.orderId);
        } catch (_) {}
        resolve({ success: true, message: 'Pre-chek chop etildi: ' + stdout.trim() });
      });
    });
  } catch (err) {
    try { fs.unlinkSync(tempFile); } catch (e) {}
    return { success: false, error: err.message };
  }
}

/**
 * Kassa yakuniy chekini saqlash
 */
function recordFiscalReceipt(receiptData) {
  recentFiscalReceipts.unshift(receiptData);
  if (recentFiscalReceipts.length > 50) recentFiscalReceipts.pop();
  return receiptData;
}

function updateKitchenTicketStatus(ticketId, newStatus) {
  const ticket = recentKitchenTickets.find(t => String(t.id) === String(ticketId));
  if (ticket) {
    ticket.status = newStatus;
    ticket.updatedAt = new Date().toISOString();
    return ticket;
  }
  return null;
}

function removeKitchenTicketItem(ticketId, productId, productName) {
  const ticket = recentKitchenTickets.find(t => String(t.id) === String(ticketId));
  if (ticket && Array.isArray(ticket.items)) {
    ticket.items = ticket.items.filter(it => {
      const itPid = it.productId || it.product_id || it.id;
      if (productId && itPid && String(itPid) === String(productId)) return false;
      if (productName && it.product_name && it.product_name.trim().toLowerCase() === String(productName).trim().toLowerCase()) return false;
      return true;
    });
    return ticket;
  }
  return null;
}

module.exports = {
  getInstalledPrinters,
  getPrinterSettings,
  updatePrinterSettings,
  printThermalReceipt,
  printPrecheckReceipt,
  testPrint,
  formatKitchenTicket,
  printToKitchen,
  formatCancellationTicket,
  printKitchenCancellationTicket,
  recordFiscalReceipt,
  getRecentKitchenTickets: () => recentKitchenTickets,
  updateKitchenTicketStatus,
  removeKitchenTicketItem,
  getRecentFiscalReceipts: () => recentFiscalReceipts,
};
