-- KafePOS Clean Database Backup
-- Tables, categories, and products wiped for fresh start

CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      role TEXT NOT NULL, -- 'cashier', 'waiter', 'admin'
      pin TEXT NOT NULL,
      is_shift_open INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    , status TEXT DEFAULT 'active', user_code TEXT, tenant_id TEXT, phone TEXT DEFAULT '', login TEXT DEFAULT '', password TEXT DEFAULT '');

CREATE TABLE sqlite_sequence(name,seq);

CREATE TABLE tables (
      id INTEGER PRIMARY KEY,
      number INTEGER NOT NULL UNIQUE,
      name TEXT NOT NULL,
      capacity INTEGER DEFAULT 4,
      status TEXT DEFAULT 'free', -- 'free' (yashil), 'busy' (qizil), 'bill_requested' (sariq)
      current_order_id TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    , hall TEXT DEFAULT 'Основной');

CREATE TABLE categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      icon TEXT,
      order_index INTEGER DEFAULT 0
    , image TEXT);

CREATE TABLE products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER,
      name TEXT NOT NULL,
      price INTEGER NOT NULL,
      image TEXT,
      mxik_code TEXT NOT NULL, -- Soliq 17 xonali MXIK (IKPU) kodi
      package_code TEXT DEFAULT '796', -- Qadoq kodi (dona / porsiya)
      vat_percent INTEGER DEFAULT 12, -- QQS stavkasi (12% yoki 0%)
      is_available INTEGER DEFAULT 1, remote_id TEXT, barcode TEXT, cost_price INTEGER DEFAULT 0, workshop TEXT DEFAULT 'Кухня', product_type TEXT DEFAULT 'Товар', stock_quantity REAL DEFAULT 100, unit TEXT DEFAULT 'dona', min_stock_alert REAL DEFAULT 5,
      FOREIGN KEY (category_id) REFERENCES categories (id)
    );

CREATE TABLE orders (
      id TEXT PRIMARY KEY, -- UUID
      table_id INTEGER NOT NULL,
      waiter_id INTEGER,
      waiter_name TEXT,
      status TEXT DEFAULT 'open', -- 'open', 'bill_requested', 'paid', 'cancelled'
      total_amount INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (table_id) REFERENCES tables (id)
    );

CREATE TABLE order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id TEXT NOT NULL,
      product_id INTEGER NOT NULL,
      product_name TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      price INTEGER NOT NULL,
      comment TEXT DEFAULT '', -- 'Piyozsiz', 'Issiqroq', 'Achchiq bo'lmasin'
      status TEXT DEFAULT 'sent', -- 'sent', 'ready', 'served'
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP, is_cancelled INTEGER DEFAULT 0, cancel_reason TEXT DEFAULT '', waiter_id TEXT, waiter_name TEXT DEFAULT '',
      FOREIGN KEY (order_id) REFERENCES orders (id)
    );

CREATE TABLE payments (
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
    );

CREATE TABLE fiscal_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      payment_id TEXT NOT NULL,
      order_id TEXT NOT NULL,
      payload TEXT NOT NULL, -- JSON
      status TEXT DEFAULT 'pending', -- 'pending', 'synced', 'failed'
      error_message TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      synced_at DATETIME
    );

CREATE TABLE kitchen_tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id TEXT NOT NULL,
      table_number INTEGER NOT NULL,
      waiter_name TEXT NOT NULL,
      items_json TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      printed INTEGER DEFAULT 0
    );

CREATE TABLE telegram_settings (
      id INTEGER PRIMARY KEY DEFAULT 1,
      bot_token TEXT DEFAULT '',
      bot_username TEXT DEFAULT '@Hisobchiuz101bot',
      is_enabled INTEGER DEFAULT 1,
      poll_interval INTEGER DEFAULT 30,
      last_update_id INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

CREATE TABLE telegram_subscribers (
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
    );

CREATE TABLE backend_config (
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
    );

CREATE TABLE stock_movements (
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
    );

CREATE TABLE halls (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      order_index INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

INSERT INTO users (id, name, role, pin, is_shift_open, status, user_code, tenant_id, phone, login, password) VALUES (1, 'Kafee', 'admin', '3333', 1, 'active', 'b58d74f3-3541-4341-acf8-ff00c13964c7', '90e04abf-246d-4683-91eb-1ac34d7b2ee7', '+998881111111', 'kafee@gmail.com', '3333');
INSERT INTO users (id, name, role, pin, is_shift_open, status, user_code, tenant_id, phone, login, password) VALUES (10, 'Akbar', 'waiter', '1234', 1, 'active', '0ea11162-a4d9-4f94-a38e-192fdf88d89b', '90e04abf-246d-4683-91eb-1ac34d7b2ee7', '+998880000000', 'akbar@getpos.uz', '123456');
INSERT INTO backend_config (id, api_url, tenant_id, tenant_name, auth_token, sync_interval, is_external_active) VALUES (1, 'https://getpos.uz', '90e04abf-246d-4683-91eb-1ac34d7b2ee7', 'Test Kafe', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjoxODIwOTg2NzU1LCJpYXQiOjE3ODk0NTA3NTUsImp0aSI6ImU2OWUwOGRjODk3OTQ1ZDk5ODFhY2ZjMDVmNDQ1MDBlIiwidXNlcl9pZCI6ImI1OGQ3NGYzLTM1NDEtNDM0MS1hY2Y4LWZmMDBjMTM5NjRjNyIsInRlbmFudF9pZCI6IjkwZTA0YWJmLTI0NmQtNDY4My05MWViLTFhYzM0ZDdiMmVlNyIsInRlbmFudF9uYW1lIjoiVGVzdCBLYWZlIiwicm9sZSI6Im1hbmFnZXIiLCJuYW1lIjoiS2FmZWUiLCJlbWFpbCI6ImthZmVlQGdtYWlsLmNvbSIsImNhbl9zZWxsX29uX2RlYnQiOmZhbHNlLCJtYXhfZGVidF9saW1pdCI6MTUwMDAwMC4wfQ.WGD5beCGbqoAheeGL8agE5C5kyoc_b0-LIWUi_QEWq4', 30, 1);
INSERT INTO halls (id, name, order_index) VALUES (1, 'Asosiy Zal', 1);
INSERT INTO halls (id, name, order_index) VALUES (2, 'Zal 1', 2);
INSERT INTO halls (id, name, order_index) VALUES (3, 'Zal 2', 3);
INSERT INTO halls (id, name, order_index) VALUES (4, '2-Qavat Zal', 4);
INSERT INTO halls (id, name, order_index) VALUES (5, 'VIP Xona', 5);
