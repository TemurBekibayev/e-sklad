const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, 'kafepos.sqlite');
const db = new sqlite3.Database(DB_PATH);

// Helper promise wrapper for sqlite queries
const run = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
};

const get = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

const all = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

// Initialize schema and seed data
async function initDB() {
  await run(`PRAGMA foreign_keys = ON`);

  // 1. Users table (Cashier, Waiters, Admin)
  await run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      role TEXT NOT NULL, -- 'cashier', 'waiter', 'admin'
      pin TEXT NOT NULL,
      is_shift_open INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 1.5. Halls (Zallar / Xonalar)
  await run(`
    CREATE TABLE IF NOT EXISTS halls (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      order_index INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 2. Tables (Stollar)
  await run(`
    CREATE TABLE IF NOT EXISTS tables (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      number INTEGER NOT NULL UNIQUE,
      name TEXT NOT NULL,
      capacity INTEGER DEFAULT 4,
      status TEXT DEFAULT 'free', -- 'free' (yashil), 'busy' (qizil), 'bill_requested' (sariq)
      current_order_id TEXT,
      hall TEXT DEFAULT 'Asosiy Zal',
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 3. Categories (Taom toifalari)
  await run(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      icon TEXT,
      order_index INTEGER DEFAULT 0
    )
  `);

  // 4. Products (Taomlar va Soliq MXIK / Qadoq kodlari)
  await run(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER,
      name TEXT NOT NULL,
      price INTEGER NOT NULL,
      image TEXT,
      mxik_code TEXT NOT NULL, -- Soliq 17 xonali MXIK (IKPU) kodi
      package_code TEXT DEFAULT '796', -- Qadoq kodi (dona / porsiya)
      vat_percent INTEGER DEFAULT 12, -- QQS stavkasi (12% yoki 0%)
      is_available INTEGER DEFAULT 1,
      FOREIGN KEY (category_id) REFERENCES categories (id)
    )
  `);

  // 5. Orders (Buyurtmalar)
  await run(`
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY, -- UUID
      table_id INTEGER NOT NULL,
      waiter_id INTEGER,
      waiter_name TEXT,
      status TEXT DEFAULT 'open', -- 'open', 'bill_requested', 'paid', 'cancelled'
      total_amount INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (table_id) REFERENCES tables (id)
    )
  `);

  // 6. Order Items (Buyurtma tarkibi va oshpazga izohlar)
  await run(`
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id TEXT NOT NULL,
      product_id INTEGER NOT NULL,
      product_name TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      price INTEGER NOT NULL,
      comment TEXT DEFAULT '', -- 'Piyozsiz', 'Issiqroq', 'Achchiq bo'lmasin'
      status TEXT DEFAULT 'sent', -- 'sent', 'ready', 'served'
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES orders (id)
    )
  `);

  // 7. Payments (To'lovlar va Fiskal chek ma'lumotlari)
  await run(`
    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY, -- UUID
      order_id TEXT NOT NULL,
      table_id INTEGER NOT NULL,
      total_amount INTEGER NOT NULL,
      payment_method TEXT NOT NULL, -- 'cash', 'card', 'split'
      cash_amount INTEGER DEFAULT 0,
      card_amount INTEGER DEFAULT 0,
      fiscal_sign TEXT, -- Soliq fiskal belgisi
      fiscal_qr_url TEXT, -- Soliq QR kodi URL manzili
      receipt_seq INTEGER, -- Chek seriya raqami
      is_synced_soliq INTEGER DEFAULT 1, -- 1: yuborildi, 0: oflayn navbatda
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES orders (id)
    )
  `);

  // 8. Soliq Offline Queue (Internet uzilganda cheklar buferi)
  await run(`
    CREATE TABLE IF NOT EXISTS fiscal_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      payment_id TEXT NOT NULL,
      order_id TEXT NOT NULL,
      payload TEXT NOT NULL, -- JSON
      status TEXT DEFAULT 'pending', -- 'pending', 'synced', 'failed'
      error_message TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      synced_at DATETIME
    )
  `);

  // 9. Kitchen Tickets ("Begunok" cheklari)
  await run(`
    CREATE TABLE IF NOT EXISTS kitchen_tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id TEXT NOT NULL,
      table_number INTEGER NOT NULL,
      waiter_name TEXT NOT NULL,
      items_json TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      printed INTEGER DEFAULT 0
    )
  `);

  // 10. Telegram Bot Settings (JetBot)
  await run(`
    CREATE TABLE IF NOT EXISTS telegram_settings (
      id INTEGER PRIMARY KEY DEFAULT 1,
      bot_token TEXT DEFAULT '',
      bot_username TEXT DEFAULT '@Hisobchiuz101bot',
      is_enabled INTEGER DEFAULT 1,
      poll_interval INTEGER DEFAULT 30,
      last_update_id INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 11. Telegram Subscribers (JetBot Obunachilari)
  await run(`
    CREATE TABLE IF NOT EXISTS telegram_subscribers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chat_id TEXT UNIQUE,
      user_id TEXT,
      username TEXT DEFAULT '',
      first_name TEXT DEFAULT '',
      reg_code TEXT DEFAULT '',
      sub_number INTEGER DEFAULT 1268,
      sub_expires TEXT DEFAULT '05.05.2027',
      is_active INTEGER DEFAULT 1,
      notify_bot_status INTEGER DEFAULT 1,
      notify_db_backup INTEGER DEFAULT 1,
      notify_cashier_report INTEGER DEFAULT 1,
      notify_status INTEGER DEFAULT 1,
      notify_orders INTEGER DEFAULT 1,
      notify_cancellations INTEGER DEFAULT 1,
      notify_bill INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 12. Backend Developer API Configuration
  await run(`
    CREATE TABLE IF NOT EXISTS backend_config (
      id INTEGER PRIMARY KEY DEFAULT 1,
      api_url TEXT DEFAULT 'http://localhost:4000/api',
      tenant_id TEXT DEFAULT 'ten_849201',
      tenant_name TEXT DEFAULT 'GetPOS Kafe Chilonzor',
      auth_token TEXT DEFAULT '',
      sync_interval INTEGER DEFAULT 30,
      is_external_active INTEGER DEFAULT 0,
      last_sync_time DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 13. Stock Movements (Sklad Kirim, Chiqim va Inventarizatsiya Tarixi)
  await run(`
    CREATE TABLE IF NOT EXISTS stock_movements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      type TEXT NOT NULL, -- 'in' (prihod/kirim), 'out_sale' (savdo/chiqim), 'adjustment' (inventarizatsiya/tahrir), 'waste' (spisanie/brak)
      quantity REAL NOT NULL,
      previous_stock REAL NOT NULL,
      new_stock REAL NOT NULL,
      unit_price INTEGER DEFAULT 0,
      total_price INTEGER DEFAULT 0,
      supplier TEXT DEFAULT '',
      note TEXT DEFAULT '',
      created_by TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products (id)
    )
  `);

  // Seed default data if empty
  await seedInitialData();
}

async function seedInitialData() {
  // Check products columns for inventory
  try {
    await run(`ALTER TABLE products ADD COLUMN remote_id TEXT`);
  } catch (e) {}
  try {
    await run(`ALTER TABLE products ADD COLUMN barcode TEXT`);
  } catch (e) {}
  try {
    await run(`ALTER TABLE products ADD COLUMN stock_quantity REAL DEFAULT 100`);
  } catch (e) {}
  try {
    await run(`ALTER TABLE products ADD COLUMN unit TEXT DEFAULT 'dona'`);
  } catch (e) {}
  try {
    await run(`ALTER TABLE products ADD COLUMN min_stock_alert REAL DEFAULT 5`);
  } catch (e) {}
  try {
    await run(`ALTER TABLE products ADD COLUMN cost_price INTEGER DEFAULT 0`);
  } catch (e) {}

  // Check users
  try {
    await run(`ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'active'`);
  } catch (e) {}
  try {
    await run(`ALTER TABLE users ADD COLUMN user_code TEXT`);
  } catch (e) {}
  try {
    await run(`ALTER TABLE users ADD COLUMN tenant_id TEXT`);
  } catch (e) {}
  try {
    await run(`ALTER TABLE users ADD COLUMN phone TEXT DEFAULT ''`);
  } catch (e) {}
  try {
    await run(`ALTER TABLE users ADD COLUMN login TEXT DEFAULT ''`);
  } catch (e) {}
  try {
    await run(`ALTER TABLE users ADD COLUMN password TEXT DEFAULT ''`);
  } catch (e) {}

  // Real users from getpos.uz backend for Test Kafe (Only active tenant!)
  const currentStoreUsers = [
    { name: 'Kafee', role: 'admin', pin: '3333', code: 'b58d74f3-3541-4341-acf8-ff00c13964c7', tenant_id: '90e04abf-246d-4683-91eb-1ac34d7b2ee7' },
  ];

  // Remove any legacy users from other stores/tenants
  await run(`
    DELETE FROM users 
    WHERE name IN ('John', 'Ali (Xodim)', 'Rustam', 'Sardor Karimov')
       OR (tenant_id IS NOT NULL AND tenant_id != '90e04abf-246d-4683-91eb-1ac34d7b2ee7' AND user_code NOT LIKE '%-%-%')
  `);

  for (const ru of currentStoreUsers) {
    const existing = await get(`SELECT id FROM users WHERE user_code = ? OR name = ?`, [ru.code, ru.name]);
    if (!existing) {
      await run(`INSERT INTO users (name, role, pin, is_shift_open, status, user_code, tenant_id) VALUES (?, ?, ?, 1, 'active', ?, ?)`, [
        ru.name, ru.role, ru.pin, ru.code, ru.tenant_id
      ]);
    } else {
      await run(`UPDATE users SET user_code = ?, tenant_id = ?, status = 'active' WHERE id = ?`, [ru.code, ru.tenant_id, existing.id]);
    }
  }

  // Check halls
  const defaultHalls = [
    { name: 'Asosiy Zal', order: 1 },
    { name: 'Zal 1', order: 2 },
    { name: 'Zal 2', order: 3 },
    { name: '2-Qavat Zal', order: 4 },
    { name: 'VIP Xona', order: 5 },
  ];
  for (const h of defaultHalls) {
    const exHall = await get(`SELECT id FROM halls WHERE name = ?`, [h.name]);
    if (!exHall) {
      await run(`INSERT OR IGNORE INTO halls (name, order_index) VALUES (?, ?)`, [h.name, h.order]);
    }
  }

  // Check tables (1 to 20 matching UI photo)
  try {
    await run(`ALTER TABLE tables ADD COLUMN hall TEXT DEFAULT 'Asosiy Zal'`);
  } catch (e) {}
  try {
    await run(`ALTER TABLE order_items ADD COLUMN is_cancelled INTEGER DEFAULT 0`);
  } catch (e) {}
  try {
    await run(`ALTER TABLE order_items ADD COLUMN cancel_reason TEXT DEFAULT ''`);
  } catch (e) {}
  try {
    await run(`ALTER TABLE order_items ADD COLUMN waiter_id TEXT`);
  } catch (e) {}
  try {
    await run(`ALTER TABLE order_items ADD COLUMN waiter_name TEXT DEFAULT ''`);
  } catch (e) {}

  // Update legacy Russian hall names to Uzbek
  await run(`UPDATE tables SET hall = 'Asosiy Zal' WHERE hall = 'Основной' OR hall IS NULL OR hall = ''`);
  await run(`UPDATE tables SET hall = 'Zal 1' WHERE hall = 'ZAL 1'`);
  await run(`UPDATE tables SET hall = 'Zal 2' WHERE hall = 'ZAL 2'`);
  await run(`UPDATE tables SET hall = '2-Qavat Zal' WHERE hall = 'ZAL 3'`);

  // Check categories and products columns
  try {
    await run(`ALTER TABLE categories ADD COLUMN image TEXT`);
  } catch (e) {}
  try {
    await run(`ALTER TABLE products ADD COLUMN cost_price INTEGER DEFAULT 0`);
  } catch (e) {}
  try {
    await run(`ALTER TABLE products ADD COLUMN workshop TEXT DEFAULT 'Кухня'`);
  } catch (e) {}
  try {
    await run(`ALTER TABLE products ADD COLUMN product_type TEXT DEFAULT 'Товар'`);
  } catch (e) {}

  // Note: Tables, categories, and products are intentionally kept empty for a clean database.
  // Cafe owners enter their own tables, categories, and dishes via the UI.

  // Telegram JetBot Seed
  const tgSettings = await get(`SELECT id FROM telegram_settings WHERE id = 1`);
  if (!tgSettings) {
    await run(`INSERT INTO telegram_settings (id, bot_token, bot_username, is_enabled, poll_interval) VALUES (1, '', '@Hisobchiuz101bot', 1, 30)`);
  }

  const tgSubsCount = await get(`SELECT COUNT(*) as count FROM telegram_subscribers`);
  if (tgSubsCount.count === 0) {
    await run(`
      INSERT INTO telegram_subscribers (
        chat_id, user_id, username, first_name, reg_code, sub_number, sub_expires,
        is_active, notify_bot_status, notify_db_backup, notify_cashier_report, notify_status, notify_orders, notify_cancellations, notify_bill
      ) VALUES (
        '123456789', '123456789', 'admin', 'Системный Администратор', '6901', 1268, '05.05.2027',
        1, 1, 1, 1, 1, 1, 1, 1
      )
    `);
  }

  // Backend API Seed (Default to real production getpos.uz and Test Kafe)
  const bConfig = await get(`SELECT id, is_external_active, api_url, tenant_id FROM backend_config WHERE id = 1`);
  if (!bConfig) {
    await run(`
      INSERT INTO backend_config (id, api_url, tenant_id, tenant_name, auth_token, sync_interval, is_external_active)
      VALUES (1, 'https://getpos.uz', '90e04abf-246d-4683-91eb-1ac34d7b2ee7', 'Test Kafe', '', 30, 1)
    `);
  } else if (!bConfig.is_external_active || bConfig.tenant_id === '5322a772-e9db-402a-8d2b-6293edd03832' || (bConfig.api_url && !bConfig.api_url.includes('getpos.uz'))) {
    await run(`
      UPDATE backend_config
      SET api_url = 'https://getpos.uz',
          tenant_id = '90e04abf-246d-4683-91eb-1ac34d7b2ee7',
          tenant_name = 'Test Kafe',
          is_external_active = 1
      WHERE id = 1
    `);
  }
}

module.exports = {
  db,
  run,
  get,
  all,
  initDB,
};
