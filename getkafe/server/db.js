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

  // 2. Tables (Stollar)
  await run(`
    CREATE TABLE IF NOT EXISTS tables (
      id INTEGER PRIMARY KEY,
      number INTEGER NOT NULL UNIQUE,
      name TEXT NOT NULL,
      capacity INTEGER DEFAULT 4,
      status TEXT DEFAULT 'free', -- 'free' (yashil), 'busy' (qizil), 'bill_requested' (sariq)
      current_order_id TEXT,
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

  // Seed default data if empty
  await seedInitialData();
}

async function seedInitialData() {
  // Check products columns
  try {
    await run(`ALTER TABLE products ADD COLUMN remote_id TEXT`);
  } catch (e) {}
  try {
    await run(`ALTER TABLE products ADD COLUMN barcode TEXT`);
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

  // Purge legacy mock/fake users completely (Never invent fake users!)
  await run(`
    DELETE FROM users 
    WHERE user_code IS NULL 
       OR user_code NOT IN (
         'b58d74f3-3541-4341-acf8-ff00c13964c7',
         '447a1ad6-e23f-4dde-b4a2-d9256c7af5a7',
         '60612290-8399-4949-83f8-9f8216fab884',
         'e6010bbc-f81a-4b86-bc19-f059e1100fba',
         '4215e424-99fb-4a6d-a555-51388ab7c06f',
         '42798f70-c266-403c-8f85-28dbbf1373c0',
         '89e6dcab-71b3-4f51-aeaf-2fcc5883cdf5',
         '5fce8412-80bf-4ac7-8e28-f39be76d0160',
         '12b090f1-4de6-4536-b30d-030f383da7de'
       )
       OR name LIKE '%Aziz%' 
       OR name LIKE '%Malika%' 
       OR name LIKE '%Bobur Aliyev%' 
       OR name LIKE '%Kassir (GetPOS)%'
  `);

  // Real users from getpos.uz backend
  const realUsers = [
    { name: 'Kafee', role: 'admin', pin: '3333', code: 'b58d74f3-3541-4341-acf8-ff00c13964c7', tenant_id: '90e04abf-246d-4683-91eb-1ac34d7b2ee7' },
    { name: 'John', role: 'admin', pin: '1111', code: '447a1ad6-e23f-4dde-b4a2-d9256c7af5a7', tenant_id: '5322a772-e9db-402a-8d2b-6293edd03832' },
    { name: 'Ali (Xodim)', role: 'waiter', pin: '2222', code: '60612290-8399-4949-83f8-9f8216fab884', tenant_id: '5322a772-e9db-402a-8d2b-6293edd03832' },
    { name: 'Rustam', role: 'admin', pin: '1111', code: 'e6010bbc-f81a-4b86-bc19-f059e1100fba', tenant_id: '57341e59-3c24-409f-af62-9aaec212b689' },
    { name: 'Sardor Karimov', role: 'waiter', pin: '1234', code: '4215e424-99fb-4a6d-a555-51388ab7c06f', tenant_id: '57341e59-3c24-409f-af62-9aaec212b689' },
  ];

  for (const ru of realUsers) {
    const existing = await get(`SELECT id FROM users WHERE user_code = ?`, [ru.code]);
    if (!existing) {
      await run(`INSERT INTO users (name, role, pin, is_shift_open, status, user_code, tenant_id) VALUES (?, ?, ?, 1, 'active', ?, ?)`, [
        ru.name, ru.role, ru.pin, ru.code, ru.tenant_id
      ]);
    } else {
      await run(`UPDATE users SET name = ?, role = ?, user_code = ?, pin = ?, status = 'active', is_shift_open = 1, tenant_id = ? WHERE id = ?`, [
        ru.name, ru.role, ru.code, ru.pin, ru.tenant_id, existing.id
      ]);
    }
  }

  // Check tables (1 to 20 matching UI photo)
  try {
    await run(`ALTER TABLE tables ADD COLUMN hall TEXT DEFAULT 'Основной'`);
  } catch (e) {}
  try {
    await run(`ALTER TABLE order_items ADD COLUMN is_cancelled INTEGER DEFAULT 0`);
  } catch (e) {}
  try {
    await run(`ALTER TABLE order_items ADD COLUMN cancel_reason TEXT DEFAULT ''`);
  } catch (e) {}

  for (let i = 1; i <= 20; i++) {
    const hall = i <= 5 ? 'Основной' : i <= 10 ? 'ZAL 1' : i <= 15 ? 'ZAL 2' : 'ZAL 3';
    await run(`INSERT OR IGNORE INTO tables (id, number, name, capacity, status, hall) VALUES (?, ?, ?, 4, 'free', ?)`, [
      i, i, `STOL - ${i}`, hall
    ]);
    await run(`UPDATE tables SET name = ?, hall = ? WHERE id = ?`, [`STOL - ${i}`, hall, i]);
  }

  // Check categories (matching JetCafe video categories)
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

  const jetcafeCats = [
    { id: 1, name: 'БИР ЗУМДА', slug: 'fastfood_1', icon: '🍔', order: 1, img: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=300&auto=format&fit=crop&q=80' },
    { id: 2, name: 'БИРИНЧИ', slug: 'first_dish_2', icon: '🍲', order: 2, img: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=300&auto=format&fit=crop&q=80' },
    { id: 3, name: 'ИККИНЧИ', slug: 'second_dish_3', icon: '🍖', order: 3, img: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=300&auto=format&fit=crop&q=80' },
    { id: 4, name: 'КАБОБ', slug: 'kabob_4', icon: '🍢', order: 4, img: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=300&auto=format&fit=crop&q=80' },
    { id: 5, name: 'НОН ВА ЧОЙ', slug: 'bread_tea_5', icon: '🍵', order: 5, img: 'https://images.unsplash.com/photo-1586444248902-2f64eddc13df?w=300&auto=format&fit=crop&q=80' },
    { id: 6, name: 'САЛАТ', slug: 'salads_6', icon: '🥗', order: 6, img: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=300&auto=format&fit=crop&q=80' },
    { id: 7, name: 'ЯХНА', slug: 'yahna_drinks_7', icon: '🥤', order: 7, img: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=300&auto=format&fit=crop&q=80' },
    { id: 8, name: 'HOTDOGLAR', slug: 'hotdogs_8', icon: '🌭', order: 8, img: 'https://images.unsplash.com/photo-1619740455993-9e612b1af08a?w=300&auto=format&fit=crop&q=80' },
  ];

  for (const c of jetcafeCats) {
    const existing = await get(`SELECT id FROM categories WHERE id = ?`, [c.id]);
    if (!existing) {
      await run(`INSERT INTO categories (id, name, slug, icon, order_index, image) VALUES (?, ?, ?, ?, ?, ?)`, [
        c.id, c.name, c.slug, c.icon, c.order, c.img
      ]);
    } else {
      await run(`UPDATE categories SET name = ?, slug = ?, image = ?, icon = ?, order_index = ? WHERE id = ?`, [
        c.name, c.slug, c.img, c.icon, c.order, c.id
      ]);
    }
  }

  // Check products
  const prodCount = await get(`SELECT COUNT(*) as count FROM products`);
  if (prodCount.count === 0) {
    console.log('Seeding products with authentic MXIK codes and real food photos...');
    const products = [
      // 1. Birinchi taomlar
      { cat: 1, name: "Mastava", price: 32000, mxik: '10701001001000000', img: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=600&auto=format&fit=crop&q=80' },
      { cat: 1, name: "Sho'rva (Go'shtli)", price: 35000, mxik: '10701001001000000', img: 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=600&auto=format&fit=crop&q=80' },
      { cat: 1, name: "Chuchvara", price: 38000, mxik: '10701001001000000', img: 'https://images.unsplash.com/photo-1496116218417-1a781b1c416c?w=600&auto=format&fit=crop&q=80' },
      { cat: 1, name: "Lag'mon (Suyuq)", price: 40000, mxik: '10701001001000000', img: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=600&auto=format&fit=crop&q=80' },

      // 2. Quyuq taomlar
      { cat: 2, name: "Choyxona Oshi (Palov)", price: 42000, mxik: '10701002001000000', img: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600&auto=format&fit=crop&q=80' },
      { cat: 2, name: "Qo'y go'shti shashlik", price: 25000, mxik: '10701002002000000', img: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&auto=format&fit=crop&q=80' },
      { cat: 2, name: "Qiyma shashlik", price: 22000, mxik: '10701002002000000', img: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=80' },
      { cat: 2, name: "Tovuq shashlik", price: 20000, mxik: '10701002002000000', img: 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=600&auto=format&fit=crop&q=80' },
      { cat: 2, name: "Qozon kabob", price: 55000, mxik: '10701002001000000', img: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=80' },
      { cat: 2, name: "Qovurma Lag'mon", price: 40000, mxik: '10701002001000000', img: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=600&auto=format&fit=crop&q=80' },

      // 3. Ichimliklar
      { cat: 3, name: "Ko'k choy (Limon bilan)", price: 8000, mxik: '10702001001000000', img: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=600&auto=format&fit=crop&q=80' },
      { cat: 3, name: "Qora choy (Zafaron)", price: 7000, mxik: '10702001001000000', img: 'https://images.unsplash.com/photo-1594631252845-29fc4cc8cde9?w=600&auto=format&fit=crop&q=80' },
      { cat: 3, name: "Coca-Cola 1.5L", price: 18000, mxik: '10702002001000000', img: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=600&auto=format&fit=crop&q=80' },
      { cat: 3, name: "Yangi siqilgan apelsin sharbati", price: 25000, mxik: '10702002002000000', img: 'https://images.unsplash.com/photo-1613478223719-2ab802602423?w=600&auto=format&fit=crop&q=80' },
      { cat: 3, name: "Gazsiz suv 0.5L", price: 4000, mxik: '10702002003000000', img: 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?w=600&auto=format&fit=crop&q=80' },

      // 4. Salatlar va Non
      { cat: 4, name: "Achchiq-chuchuk", price: 15000, mxik: '10701003001000000', img: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600&auto=format&fit=crop&q=80' },
      { cat: 4, name: "Bahor salati", price: 18000, mxik: '10701003001000000', img: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&auto=format&fit=crop&q=80' },
      { cat: 4, name: "Smak salati", price: 24000, mxik: '10701003001000000', img: 'https://images.unsplash.com/photo-1546793665-c74683f339c1?w=600&auto=format&fit=crop&q=80' },
      { cat: 4, name: "Sezar salati", price: 36000, mxik: '10701003001000000', img: 'https://images.unsplash.com/photo-1550304943-4f24f54ddde9?w=600&auto=format&fit=crop&q=80' },
      { cat: 4, name: "Tandir non", price: 5000, mxik: '10701004001000000', img: 'https://images.unsplash.com/photo-1586444248902-2f64eddc13df?w=600&auto=format&fit=crop&q=80' },
    ];

    for (const p of products) {
      await run(
        `INSERT INTO products (category_id, name, price, image, mxik_code, package_code, vat_percent) 
         VALUES (?, ?, ?, ?, ?, '796', 12)`,
        [p.cat, p.name, p.price, p.img, p.mxik]
      );
    }
  } else {
    // Mavjud mahsulotlarning rasmlarini haqiqiy fotosuratlarga yangilash (Migration)
    const photoUpdates = [
      { name: "Mastava", img: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=600&auto=format&fit=crop&q=80' },
      { name: "Sho'rva (Go'shtli)", img: 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=600&auto=format&fit=crop&q=80' },
      { name: "Chuchvara", img: 'https://images.unsplash.com/photo-1496116218417-1a781b1c416c?w=600&auto=format&fit=crop&q=80' },
      { name: "Lag'mon (Suyuq)", img: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=600&auto=format&fit=crop&q=80' },
      { name: "Choyxona Oshi (Palov)", img: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600&auto=format&fit=crop&q=80' },
      { name: "Qo'y go'shti shashlik", img: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&auto=format&fit=crop&q=80' },
      { name: "Qiyma shashlik", img: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=80' },
      { name: "Tovuq shashlik", img: 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=600&auto=format&fit=crop&q=80' },
      { name: "Qozon kabob", img: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=80' },
      { name: "Qovurma Lag'mon", img: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=600&auto=format&fit=crop&q=80' },
      { name: "Ko'k choy (Limon bilan)", img: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=600&auto=format&fit=crop&q=80' },
      { name: "Qora choy (Zafaron)", img: 'https://images.unsplash.com/photo-1594631252845-29fc4cc8cde9?w=600&auto=format&fit=crop&q=80' },
      { name: "Coca-Cola 1.5L", img: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=600&auto=format&fit=crop&q=80' },
      { name: "Yangi siqilgan apelsin sharbati", img: 'https://images.unsplash.com/photo-1613478223719-2ab802602423?w=600&auto=format&fit=crop&q=80' },
      { name: "Gazsiz suv 0.5L", img: 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?w=600&auto=format&fit=crop&q=80' },
      { name: "Achchiq-chuchuk", img: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600&auto=format&fit=crop&q=80' },
      { name: "Bahor salati", img: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&auto=format&fit=crop&q=80' },
      { name: "Smak salati", img: 'https://images.unsplash.com/photo-1546793665-c74683f339c1?w=600&auto=format&fit=crop&q=80' },
      { name: "Sezar salati", img: 'https://images.unsplash.com/photo-1550304943-4f24f54ddde9?w=600&auto=format&fit=crop&q=80' },
      { name: "Tandir non", img: 'https://images.unsplash.com/photo-1586444248902-2f64eddc13df?w=600&auto=format&fit=crop&q=80' },
    ];
    for (const item of photoUpdates) {
      await run(`UPDATE products SET image = ? WHERE name = ? AND (image LIKE ' %' OR LENGTH(image) < 10)`, [item.img, item.name]);
    }

    // JetCafe videodagi haqiqiy taomlar
    const jetcafeVideoDishes = [
      { cat: 1, name: 'CHEESEBURGER', price: 28000, cost: 18000, workshop: 'Кухня', img: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop&q=80', mxik: '10701001001000000' },
      { cat: 1, name: 'CHICKENBURGER', price: 26000, cost: 16000, workshop: 'Кухня', img: 'https://images.unsplash.com/photo-1521305916504-4a1121188589?w=600&auto=format&fit=crop&q=80', mxik: '10701001001000000' },
      { cat: 1, name: 'HAMBURGER', price: 25000, cost: 15000, workshop: 'Кухня', img: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=600&auto=format&fit=crop&q=80', mxik: '10701001001000000' },
      { cat: 1, name: 'LAVASH', price: 32000, cost: 20000, workshop: 'Кухня', img: 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=600&auto=format&fit=crop&q=80', mxik: '10701001001000000' },
      { cat: 1, name: 'MINI LAVASH', price: 26000, cost: 16000, workshop: 'Кухня', img: 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=600&auto=format&fit=crop&q=80', mxik: '10701001001000000' },
      { cat: 1, name: 'TANDIR LAVASH KATTA', price: 36000, cost: 23000, workshop: 'Кухня', img: 'https://images.unsplash.com/photo-1561651823-34feb02250e4?w=600&auto=format&fit=crop&q=80', mxik: '10701001001000000' },
      { cat: 1, name: 'TANDIR LAVASH KICHIK', price: 30000, cost: 19000, workshop: 'Кухня', img: 'https://images.unsplash.com/photo-1561651823-34feb02250e4?w=600&auto=format&fit=crop&q=80', mxik: '10701001001000000' },
      { cat: 1, name: 'KARTOSHKA FREE', price: 16000, cost: 8000, workshop: 'Кухня', img: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=600&auto=format&fit=crop&q=80', mxik: '10701001001000000' },
      { cat: 1, name: 'TOVUQ OYOQLARI', price: 30000, cost: 19000, workshop: 'Кухня', img: 'https://images.unsplash.com/photo-1562967914-608f82629710?w=600&auto=format&fit=crop&q=80', mxik: '10701002002000000' },
      { cat: 1, name: 'TOVUQ QANOTLARI', price: 28000, cost: 17000, workshop: 'Кухня', img: 'https://images.unsplash.com/photo-1527477396000-e27163b481c2?w=600&auto=format&fit=crop&q=80', mxik: '10701002002000000' },
      { cat: 4, name: 'QIYMA SHASHLIK', price: 22000, cost: 14000, workshop: 'Кабаб', img: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&auto=format&fit=crop&q=80', mxik: '10701002002000000' },
      { cat: 4, name: 'KUSKAVOY SHASHLIK', price: 25000, cost: 16000, workshop: 'Кабаб', img: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=80', mxik: '10701002002000000' },
      { cat: 8, name: 'HOTDOG KICHIK', price: 15000, cost: 9000, workshop: 'Кухня', img: 'https://images.unsplash.com/photo-1619740455993-9e612b1af08a?w=600&auto=format&fit=crop&q=80', mxik: '10701001001000000' },
      { cat: 8, name: 'HOTDOG KATTA', price: 20000, cost: 12000, workshop: 'Кухня', img: 'https://images.unsplash.com/photo-1627054234033-030b76e279a1?w=600&auto=format&fit=crop&q=80', mxik: '10701001001000000' },
      { cat: 8, name: "HOTDOG (GO'SHTLI)", price: 24000, cost: 15000, workshop: 'Кухня', img: 'https://images.unsplash.com/photo-1619740455993-9e612b1af08a?w=600&auto=format&fit=crop&q=80', mxik: '10701001001000000' },
      { cat: 8, name: 'HOTDOG (QAZILI)', price: 28000, cost: 18000, workshop: 'Кухня', img: 'https://images.unsplash.com/photo-1627054234033-030b76e279a1?w=600&auto=format&fit=crop&q=80', mxik: '10701001001000000' },
      { cat: 8, name: 'HOTDOG (SALATLI)', price: 18000, cost: 11000, workshop: 'Кухня', img: 'https://images.unsplash.com/photo-1619740455993-9e612b1af08a?w=600&auto=format&fit=crop&q=80', mxik: '10701001001000000' },
      { cat: 7, name: 'LIPTON 0.5L', price: 10000, cost: 6500, workshop: 'Бар', img: 'https://images.unsplash.com/photo-1556881286-fc6915169721?w=600&auto=format&fit=crop&q=80', mxik: '10702002001000000' },
      { cat: 7, name: 'FANTA 1.5L', price: 16000, cost: 11000, workshop: 'Бар', img: 'https://images.unsplash.com/photo-1624517452488-04869289c4ca?w=600&auto=format&fit=crop&q=80', mxik: '10702002001000000' },
    ];

    for (const d of jetcafeVideoDishes) {
      const exists = await get(`SELECT id FROM products WHERE name = ?`, [d.name]);
      if (!exists) {
        await run(`INSERT INTO products (category_id, name, price, cost_price, workshop, product_type, image, mxik_code, package_code, vat_percent, is_available) VALUES (?, ?, ?, ?, ?, 'Товар', ?, ?, '796', 12, 1)`, [
          d.cat, d.name, d.price, d.cost, d.workshop, d.img, d.mxik
        ]);
      } else {
        await run(`UPDATE products SET category_id = ?, price = ?, cost_price = ?, workshop = ?, image = ? WHERE id = ?`, [
          d.cat, d.price, d.cost, d.workshop, d.img, exists.id
        ]);
      }
    }
  }

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
