// server/telegram.js - JetBot Telegram Integration for GetPOS Kafe
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { get, all, run } = require('./db');

let pollTimer = null;
let isPolling = false;
let simulatedMessages = []; // For UI test/preview when token is not yet provided

function formatUZS(num) {
  return Number(num || 0).toLocaleString('ru-RU');
}

function formatDate(d = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  const y = d.getFullYear();
  const m = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const h = pad(d.getHours());
  const min = pad(d.getMinutes());
  const s = pad(d.getSeconds());
  return `${y}-${m}-${day} ${h}:${min}:${s}`;
}

function getKeyboard() {
  return {
    keyboard: [
      [{ text: 'Кассовый отчёт' }],
      [{ text: 'Резервная копия базы данных' }, { text: 'Статус' }],
    ],
    resize_keyboard: true,
    persistent: true,
  };
}

// Get current settings
async function getSettings() {
  let settings = await get(`SELECT * FROM telegram_settings WHERE id = 1`);
  if (!settings) {
    await run(`INSERT INTO telegram_settings (id, bot_token, bot_username, is_enabled, poll_interval) VALUES (1, '', '@Hisobchiuz101bot', 1, 30)`);
    settings = await get(`SELECT * FROM telegram_settings WHERE id = 1`);
  }
  return settings;
}

// Low-level Telegram API Call
async function callTelegramApi(endpoint, payload) {
  const settings = await getSettings();
  const token = settings?.bot_token?.trim();
  if (!token) {
    return { ok: false, simulated: true, description: 'No token configured' };
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch (err) {
    console.error(`[JetBot] API error on ${endpoint}:`, err.message);
    return { ok: false, error: err.message };
  }
}

// Send Text Message
async function sendMessage(chatId, text, options = {}) {
  const settings = await getSettings();
  const replyMarkup = options.reply_markup || getKeyboard();

  const payload = {
    chat_id: chatId,
    text,
    parse_mode: options.parse_mode || 'HTML',
    reply_markup: replyMarkup,
  };

  // Keep in simulated log
  simulatedMessages.unshift({
    id: Date.now() + Math.random(),
    chat_id: chatId,
    text,
    date: new Date().toISOString(),
  });
  if (simulatedMessages.length > 50) simulatedMessages.pop();

  if (!settings?.bot_token) {
    console.log(`[JetBot Sim] To ${chatId}:\n${text}`);
    return { ok: true, simulated: true };
  }

  return await callTelegramApi('sendMessage', payload);
}

// Send Document (Database Backup)
async function sendDocument(chatId, filePath, caption = 'Резервная копия базы данных') {
  const settings = await getSettings();
  if (!settings?.bot_token) {
    console.log(`[JetBot Sim Document] To ${chatId}: ${filePath}`);
    return { ok: true, simulated: true };
  }

  try {
    const fileBuffer = fs.readFileSync(filePath);
    const fileName = path.basename(filePath);
    const blob = new Blob([fileBuffer]);

    const formData = new FormData();
    formData.append('chat_id', chatId);
    formData.append('caption', caption);
    formData.append('document', blob, fileName);

    const res = await fetch(`https://api.telegram.org/bot${settings.bot_token}/sendDocument`, {
      method: 'POST',
      body: formData,
    });
    return await res.json();
  } catch (err) {
    console.error(`[JetBot] Send document error:`, err.message);
    return { ok: false, error: err.message };
  }
}

// Broadcast to active subscribers by preference key
async function broadcast(preferenceKey, messageBuilder) {
  const settings = await getSettings();
  if (!settings?.is_enabled) return;

  const query = preferenceKey
    ? `SELECT * FROM telegram_subscribers WHERE is_active = 1 AND ${preferenceKey} = 1`
    : `SELECT * FROM telegram_subscribers WHERE is_active = 1`;

  const subscribers = await all(query);
  for (const sub of subscribers) {
    if (!sub.chat_id) continue;
    try {
      const msg = typeof messageBuilder === 'function' ? messageBuilder(sub) : messageBuilder;
      if (typeof msg === 'string') {
        await sendMessage(sub.chat_id, msg);
      } else if (msg && msg.file) {
        await sendDocument(sub.chat_id, msg.file, msg.caption);
      }
    } catch (e) {
      console.error(`[JetBot] Broadcast error to chat ${sub.chat_id}:`, e.message);
    }
  }
}

// Generate Cashier Shift Report Text (Matching jetbot_frame_6.jpg and jetbot_frame_8.jpg)
async function generateCashierReportText(statusOverride = null) {
  const todayPayments = await all(`
    SELECT total_amount, cash_amount, card_amount, payment_method, created_at 
    FROM payments 
    WHERE date(created_at) = date('now')
  `);

  let cashSales = 0;
  let cardSales = 0;
  let totalSales = 0;
  todayPayments.forEach((p) => {
    cashSales += p.cash_amount || (p.payment_method === 'cash' ? p.total_amount : 0) || 0;
    cardSales += p.card_amount || (p.payment_method === 'card' ? p.total_amount : 0) || 0;
    totalSales += p.total_amount || 0;
  });

  const checkCount = todayPayments.length;
  const grossProfit = totalSales; // Валовая прибыль
  const cashInDrawer = cashSales; // При открытии 0 + Продажа - расход

  const nowStr = formatDate(new Date());
  const openTime = todayPayments[0]?.created_at || nowStr.split(' ')[0] + ' 09:00:00';
  const isOpen = statusOverride !== null ? statusOverride === 'open' : true;
  const statusLabel = isOpen ? 'открыто' : 'закрыто';

  let report = `#Кассовый отчёт\n`;
  report += `Касса 1 ( ${statusLabel} )\n\n`;
  report += `Смена открыто ${openTime}\n`;
  if (!isOpen) {
    report += `Смена закрыто: ${nowStr}\n`;
  }
  report += `\nНаличные\n`;
  report += `При открытии смены 0\n`;
  report += `Продажа ${formatUZS(cashSales)}\n`;
  report += `Приход 0\n`;
  report += `Расход 0\n`;
  report += `В кассе = ${formatUZS(cashInDrawer)}\n\n`;

  report += `Продажа\n`;
  report += `Наличными ${formatUZS(cashSales)}\n`;
  report += `По карте ${formatUZS(cardSales)}\n`;
  report += `Всего = ${formatUZS(totalSales)}\n\n`;

  report += `Статистика\n`;
  report += `Кол-во чеков ${checkCount}\n`;
  report += `Валовая прибыль ${formatUZS(grossProfit)}`;

  return report;
}

// Generate Database Backup file (Matching jetbot_frame_8.jpg)
function generateBackupFile() {
  const dbPath = path.join(__dirname, 'kafepos.sqlite');
  if (!fs.existsSync(dbPath)) return null;

  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const ddmmyy = `${pad(now.getDate())}${pad(now.getMonth() + 1)}${String(now.getFullYear()).slice(2)}`;
  const hhmm = `${pad(now.getHours())}${pad(now.getMinutes())}`;
  const outFileName = `JetCafe_${ddmmyy}_${hhmm}.bak.gz`;
  const outDir = path.join(__dirname, 'backups');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }
  const outPath = path.join(outDir, outFileName);

  const rawData = fs.readFileSync(dbPath);
  const compressed = zlib.gzipSync(rawData);
  fs.writeFileSync(outPath, compressed);

  return { filePath: outPath, fileName: outFileName };
}

// Process Single Telegram Message
async function processIncomingMessage(msg) {
  if (!msg || !msg.chat || !msg.chat.id) return;
  const chatId = String(msg.chat.id);
  const text = (msg.text || '').trim();
  const from = msg.from || {};
  const username = from.username ? `@${from.username}` : '';
  const firstName = from.first_name || from.username || 'Foydalanuvchi';

  // 1. Check if user is sending a 4-digit registration PIN (e.g. "6901")
  if (/^\d{4}$/.test(text)) {
    const code = text;
    // Check pending registration with this code
    let sub = await get(`SELECT * FROM telegram_subscribers WHERE reg_code = ?`, [code]);
    if (sub) {
      await run(`
        UPDATE telegram_subscribers 
        SET chat_id = ?, username = ?, first_name = ?, is_active = 1
        WHERE id = ?
      `, [chatId, username, firstName, sub.id]);
    } else {
      // Create or update subscriber
      const existing = await get(`SELECT * FROM telegram_subscribers WHERE chat_id = ?`, [chatId]);
      const subNum = Math.floor(1000 + Math.random() * 9000);
      if (existing) {
        await run(`UPDATE telegram_subscribers SET is_active = 1, reg_code = ? WHERE id = ?`, [code, existing.id]);
        sub = existing;
      } else {
        await run(`
          INSERT INTO telegram_subscribers (chat_id, user_id, username, first_name, reg_code, sub_number, sub_expires, is_active)
          VALUES (?, ?, ?, ?, ?, ?, '05.05.2027', 1)
        `, [chatId, String(from.id), username, firstName, code, subNum]);
        sub = await get(`SELECT * FROM telegram_subscribers WHERE chat_id = ?`, [chatId]);
      }
    }

    // Video response format (jetbot_step_180 / frame 5):
    // "JetBot yondi"
    // "💡 Sizning obuna raqamingiz: 💳 1268"
    await sendMessage(chatId, `JetBot yondi\n\n💡 Sizning obuna raqamingiz: 💳 <b>${sub?.sub_number || 1268}</b>`);
    return;
  }

  // 2. Command /start
  if (text === '/start') {
    const sub = await get(`SELECT * FROM telegram_subscribers WHERE chat_id = ?`, [chatId]);
    if (sub && sub.is_active) {
      await sendMessage(chatId, `JetBot yondi\n\n💡 Sizning obuna raqamingiz: 💳 <b>${sub.sub_number || 1268}</b>`);
    } else {
      await sendMessage(
        chatId,
        `Assalomu alaykum, <b>${firstName}</b>!\n` +
        `JetBot tizimiga xush kelibsiz.\n\n` +
        `Iltimos, POS ekrandagi <b>4 xonali kodni</b> yuboring (Masalan: <code>6901</code>) botni kassangizga ulash uchun.`
      );
    }
    return;
  }

  // Find subscriber for button commands
  const sub = await get(`SELECT * FROM telegram_subscribers WHERE chat_id = ?`, [chatId]);
  if (!sub || !sub.is_active) {
    await sendMessage(
      chatId,
      `Iltimos, avval kassadagi JetBot sozlamalaridan 4 xonali PIN kodni olib shu yerga yuboring.`
    );
    return;
  }

  // 3. Command: "Кассовый отчёт" or /kassa or /report
  if (text === 'Кассовый отчёт' || text === '/kassa' || text === '/report') {
    if (sub.notify_cashier_report) {
      const reportText = await generateCashierReportText('open');
      await sendMessage(chatId, reportText);
    } else {
      await sendMessage(chatId, `Кассовый отчёт obunasi sizning profilingizda o'chirilgan.`);
    }
    return;
  }

  // 4. Command: "Статус" or /status
  if (text === 'Статус' || text === '/status') {
    if (sub.notify_status) {
      const expires = sub.sub_expires || '05.05.2027';
      const num = sub.sub_number || 1268;
      // Exact format from jetbot_frame_5 / frame 6
      const statusText = `💡 Obuna ${expires} gacha.\nSizning obuna raqamingiz: 💳 <b>${num}</b>`;
      await sendMessage(chatId, statusText);
    } else {
      await sendMessage(chatId, `Статус obunasi profilingizda o'chirilgan.`);
    }
    return;
  }

  // 5. Command: "Резервная копия базы данных" or /backup
  if (text.startsWith('Резервная копия') || text === '/backup') {
    if (sub.notify_db_backup) {
      const backup = generateBackupFile();
      if (backup) {
        await sendDocument(chatId, backup.filePath, 'Резервная копия базы данных');
      } else {
        await sendMessage(chatId, `Ma'lumotlar bazasi fayli topilmadi.`);
      }
    } else {
      await sendMessage(chatId, `Резервная копия obunasi sizning profilingizda o'chirilgan.`);
    }
    return;
  }

  // Default reply
  await sendMessage(chatId, `Quyidagi tugmalardan birini tanlang:`, {
    reply_markup: getKeyboard(),
  });
}

// Long-polling loop to read incoming Telegram messages
async function pollUpdates() {
  if (isPolling) return;
  isPolling = true;

  try {
    const settings = await getSettings();
    if (!settings?.is_enabled || !settings?.bot_token) {
      isPolling = false;
      return;
    }

    const offset = (settings.last_update_id || 0) + 1;
    const res = await fetch(`https://api.telegram.org/bot${settings.bot_token}/getUpdates?offset=${offset}&timeout=5`);
    const data = await res.json();

    if (data && data.ok && Array.isArray(data.result)) {
      for (const update of data.result) {
        if (update.update_id > settings.last_update_id) {
          await run(`UPDATE telegram_settings SET last_update_id = ? WHERE id = 1`, [update.update_id]);
          settings.last_update_id = update.update_id;
        }
        if (update.message) {
          await processIncomingMessage(update.message);
        }
      }
    }
  } catch (err) {
    // network or timeout
  } finally {
    isPolling = false;
  }
}

function startPolling(intervalSeconds = 5) {
  if (pollTimer) clearInterval(pollTimer);
  console.log(`[JetBot] Polling started (interval: ${intervalSeconds}s)`);
  pollTimer = setInterval(pollUpdates, intervalSeconds * 1000);
  setTimeout(pollUpdates, 1000);
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
  console.log(`[JetBot] Polling stopped`);
}

// ================= OUTBOUND EVENT NOTIFICATIONS =================

// 1. Order Paid / Finalized (Matching jetbot_frame_6.jpg and jetbot_frame_7.jpg)
async function notifyOrderPaid({ order, items, table, waiter, cashAmount = 0, cardAmount = 0 }) {
  const total = order.total_amount || 0;
  const serviceFee = Math.round(total * 0.1);
  const cash = cashAmount || (order.payment_method === 'cash' ? total : 0);
  const card = cardAmount || (order.payment_method === 'card' ? total : 0);
  const orderNum = String(order.id).replace(/\D/g, '').slice(-3) || '1';
  const shiftNum = 2;
  const tableTitle = table?.name || `${table?.number || 1}-stol`;
  const waiterName = waiter || order.waiter_name || 'Системный Администратор';
  const now = formatDate(new Date());

  let text = `#Заказ № ${orderNum}\n`;
  text += `Дата и время: ${now}\n`;
  text += `Смена № ${shiftNum}\n`;
  text += `Касса: Касса 1\n`;
  text += `Стол: ${tableTitle}\n`;
  text += `Официант: ${waiterName}\n`;
  text += `Сумма: ${formatUZS(total)}\n`;
  text += `% за обслуживание: ${formatUZS(serviceFee)}\n`;
  text += `Оплата: Н ${formatUZS(cash)} | Т ${formatUZS(card)}\n`;
  text += `${items.length} позиц..\n\n`;

  items.forEach((it, idx) => {
    const q = Math.abs(it.quantity || 1);
    const p = it.price || 0;
    text += `${idx + 1}. ${it.product_name || it.name} | ${formatUZS(p)} x ${q}\n`;
  });

  await broadcast('notify_orders', text);
}

// 2. Dish Cancelled / Returned (Matching Video 2)
async function notifyItemCancelled({ tableTitle, waiterName, itemName, quantity, price, reason, time }) {
  const total = (price || 0) * (quantity || 1);
  const now = time || new Date().toLocaleTimeString('ru-RU');

  let text = `❌ <b>Отмена блюда / Возврат</b>\n\n`;
  text += `Стол: <b>${tableTitle || '1-stol'}</b>\n`;
  text += `Официант: ${waiterName || 'Системный Администратор'}\n`;
  text += `Блюдо: <b>${itemName}</b> (${quantity} шт)\n`;
  text += `Сумма: <b>${formatUZS(total)} сум</b>\n`;
  text += `Причина: <i>${reason || 'Клиент передумал'}</i>\n`;
  text += `Время: ${now}`;

  await broadcast('notify_cancellations', text);
}

// 3. Bill Requested (Запрос счета)
async function notifyBillRequested({ tableTitle, waiterName, totalAmount }) {
  const now = new Date().toLocaleTimeString('ru-RU');
  let text = `🧾 <b>Запрос счета</b>\n\n`;
  text += `Стол: <b>${tableTitle}</b>\n`;
  text += `Официант: ${waiterName || 'Системный Администратор'}\n`;
  text += `Сумма к оплате: <b>${formatUZS(totalAmount)} сум</b>\n`;
  text += `Время: ${now}`;

  await broadcast('notify_bill', text);
}

// 4. Shift Open or Closed
async function notifyShiftStatus(action = 'open') {
  const reportText = await generateCashierReportText(action);
  await broadcast('notify_cashier_report', reportText);
}

// 5. Bot status on/off
async function notifyBotStatus(isOn = true) {
  const text = isOn ? 'JetBot yondi' : "JetBot o'chdi";
  await broadcast('notify_bot_status', text);
}

// Test message sender
async function sendTestNotification(chatId = null) {
  const text = `🔔 <b>JetBot Sinov Xabari</b>\n\nGetPOS Kafe tizimi bilan Telegram aloqasi muvaffaqiyatli o'rnatildi!\nSana: ${formatDate(new Date())}`;
  if (chatId) {
    return await sendMessage(chatId, text);
  }
  await broadcast(null, text);
  return { ok: true, message: "Sinov xabari barcha obunachilarga yuborildi" };
}

// Start polling on module load
setTimeout(() => {
  startPolling(5);
}, 2000);

module.exports = {
  getSettings,
  sendMessage,
  sendDocument,
  broadcast,
  generateCashierReportText,
  generateBackupFile,
  processIncomingMessage,
  startPolling,
  stopPolling,
  notifyOrderPaid,
  notifyItemCancelled,
  notifyBillRequested,
  notifyShiftStatus,
  notifyBotStatus,
  sendTestNotification,
  getSimulatedMessages: () => simulatedMessages,
};
