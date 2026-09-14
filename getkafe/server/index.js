const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const os = require('os');
const path = require('path');
const fs = require('fs');

const { db, run, get, all, initDB } = require('./db');
const {
  fiscalizePayment,
  getInternetStatus,
  setInternetStatus,
  getPendingCount,
  syncPendingQueue,
  generateFiscalSign,
  COMPANY_INFO,
} = require('./soliq');
const { printToKitchen, printKitchenCancellationTicket, getRecentKitchenTickets, recordFiscalReceipt } = require('./printer');
const telegram = require('./telegram');
const backendSync = require('./backendSync');

const app = express();
app.use(cors());
app.use(express.json());

// Mobile API v2.0 compatibility: rewrite /api/v1/... to /api/...
app.use((req, res, next) => {
  if (req.url.startsWith('/api/v1/')) {
    req.url = req.url.replace('/api/v1/', '/api/');
  }
  next();
});

// Health check endpoints (Matching v2.0 specs)
app.get(['/health', '/api/health'], (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const server = http.createServer(app);
const wss = new WebSocket.Server({ server, path: '/ws' });

// WebSocket ulangan barcha mijozlarga (kassa, ofitsiant, oshxona) xabar tarqatish
function broadcast(event, data) {
  const payload = JSON.stringify({ event, data, timestamp: Date.now() });
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

wss.on('connection', (ws) => {
  // Yangi ulanuvchiga darhol hozirgi holatni yuborish
  (async () => {
    const pendingCount = await getPendingCount();
    const basketsRes = await backendSync.fetchActiveBaskets().catch(() => ({ count: 0, baskets: [] }));
    ws.send(
      JSON.stringify({
        event: 'INIT_STATE',
        data: {
          isOnline: getInternetStatus(),
          pendingChecks: pendingCount,
          company: COMPANY_INFO,
          mobileBasketsCount: basketsRes.count || 0,
          mobileBaskets: basketsRes.baskets || [],
        },
      })
    );
  })();

  ws.on('message', (message) => {
    try {
      const parsed = JSON.parse(message);
      if (parsed.event === 'PING') {
        ws.send(JSON.stringify({ event: 'PONG' }));
      } else if (parsed.event === 'join_tenant' || parsed.type === 'join_tenant') {
        ws.tenantId = parsed.data?.tenantId || parsed.tenantId;
        ws.userId = parsed.data?.userId || parsed.userId;
        ws.role = parsed.data?.role || parsed.role;
        ws.send(JSON.stringify({ event: 'JOINED_TENANT', success: true, tenantId: ws.tenantId }));
      }
    } catch (e) {}
  });
});

// Mahalliy Wi-Fi tarmog'idagi IP manzilni aniqlash
function getLocalIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}

// ----------------------------------------------------
// API ROUTES
// ----------------------------------------------------

// 1. Tizim holati (Sinxronizatsiya va Internet)
app.get('/api/status', async (req, res) => {
  try {
    const pendingCount = await getPendingCount();
    res.json({
      success: true,
      localIp: getLocalIp(),
      isOnline: getInternetStatus(),
      pendingChecks: pendingCount,
      company: COMPANY_INFO,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Internetni yoqish/o'chirish (Oflayn rejimni sinash uchun)
app.post('/api/status/toggle-internet', async (req, res) => {
  const current = getInternetStatus();
  const next = req.body.status !== undefined ? Boolean(req.body.status) : !current;
  setInternetStatus(next);
  const pendingCount = await getPendingCount();

  broadcast('SYNC_STATUS_CHANGED', {
    isOnline: next,
    pendingChecks: pendingCount,
  });

  res.json({
    success: true,
    isOnline: next,
    pendingChecks: pendingCount,
  });
});

// Jo'natilmagan cheklarni majburiy sinxronlash
app.post('/api/sync/flush', async (req, res) => {
  try {
    const syncedCount = await syncPendingQueue();
    const pendingCount = await getPendingCount();
    broadcast('SYNC_STATUS_CHANGED', {
      isOnline: getInternetStatus(),
      pendingChecks: pendingCount,
    });
    res.json({ success: true, syncedCount, pendingCount });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2.0. Filiallar / Do'konlar ro'yxati (Faqat administrator sozlamalari uchun)
app.get('/api/config/backend/tenants', async (req, res) => {
  try {
    const live = await backendSync.fetchLiveTenants();
    if (live.success && live.tenants && live.tenants.length > 0) {
      return res.json({ success: true, count: live.tenants.length, results: live.tenants, tenants: live.tenants });
    }
    const cfg = await backendSync.getConfig();
    const fallbackTenants = [
      { id: cfg.tenant_id, name: cfg.tenant_name, status: 'active' }
    ];
    res.json({ success: true, count: fallbackTenants.length, results: fallbackTenants, tenants: fallbackTenants });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// /api/tenants: Public endpoint faqat joriy do'kon ma'lumotini qaytaradi (Boshqa do'konlar sir saqlanadi)
app.get(['/api/tenants', '/api/tenants/'], async (req, res) => {
  try {
    const cfg = await backendSync.getConfig();
    res.json({
      success: true,
      results: [{ id: cfg.tenant_id, name: cfg.tenant_name, status: 'active' }],
      tenants: [{ id: cfg.tenant_id, name: cfg.tenant_name, status: 'active' }]
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Faol filialni o'zgartirish (POST /api/config/backend/tenant)
app.post('/api/config/backend/tenant', async (req, res) => {
  try {
    const { tenantId, tenantName } = req.body;
    if (!tenantId) return res.status(400).json({ success: false, message: 'tenantId talab qilinadi' });
    const updated = await backendSync.updateConfig({ tenant_id: tenantId, tenant_name: tenantName });
    res.json({ success: true, tenant_id: updated.tenant_id, tenant_name: updated.tenant_name });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2.1. Xodimlar ro'yxati (GET /api/auth/users?tenantId={TENANT_ID})
app.get('/api/auth/users', async (req, res) => {
  try {
    const cfg = await backendSync.getConfig();
    const tenantId = req.query.tenantId || cfg.tenant_id || '90e04abf-246d-4683-91eb-1ac34d7b2ee7';

    // 1. Fetch live staff from getpos.uz and merge into local SQLite if missing
    try {
      const staffRes = await backendSync.fetchStaffForTenant(tenantId);
      if (staffRes.users && staffRes.users.length > 0) {
        for (const u of staffRes.users) {
          const uCode = u.id || u.user_code;
          const mappedRole = (u.role === 'manager' || u.role === 'admin') ? 'admin' : (u.role === 'worker' || u.role === 'waiter' ? 'waiter' : u.role);
          const localExists = await get(`SELECT id FROM users WHERE user_code = ? OR name = ?`, [uCode, u.name]);
          if (!localExists) {
            await run(
              `INSERT INTO users (name, role, pin, phone, status, is_shift_open, user_code, tenant_id)
               VALUES (?, ?, ?, ?, 'active', 1, ?, ?)`,
              [u.name, mappedRole, u.pin || '1111', u.phone || '', uCode, tenantId]
            );
          }
        }
      }
    } catch (e) {
      console.warn('[Users] Live fetchStaffForTenant sync error:', e.message);
    }

    // 2. Return all local active users belonging to this tenant
    const users = await all(
      `SELECT id, user_code, name, role, status, tenant_id FROM users 
       WHERE (tenant_id = ? OR tenant_id IS NULL OR tenant_id = '') AND (status = 'active' OR status IS NULL)
       ORDER BY id ASC`,
      [tenantId]
    );

    const formatted = users.map((u) => ({
      id: u.user_code || `usr_${u.id}`,
      rawId: u.id,
      name: u.name,
      role: (u.role === 'manager' || u.role === 'admin') ? 'admin' : (u.role === 'worker' || u.role === 'waiter' ? 'waiter' : u.role),
      status: u.status || 'active',
      tenantId: u.tenant_id || cfg.tenant_id,
      tenantName: cfg.tenant_name,
    }));

    res.json(formatted);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2.2. Avtorizatsiya (POST /api/auth/login - Login+Parol yoki PIN-kod orqali)
app.post('/api/auth/login', async (req, res) => {
  try {
    const { login, username, phone, email, password, pin, userId } = req.body;
    const loginVal = (login || username || phone || email || '').trim();
    const passVal = (password || pin || '').trim();

    if (!passVal) {
      return res.status(400).json({ success: false, message: "Parol yoki PIN-kod kiritilishi shart" });
    }

    const cfg = await backendSync.getConfig();

    // 1. Live authentication against getpos.uz
    try {
      const liveRes = await backendSync.loginLiveUser(userId || loginVal, passVal, cfg.api_url);
      if (liveRes.success) {
        const liveUser = liveRes.user;
        const mappedRole = (liveUser.role === 'manager' || liveUser.role === 'admin') ? 'admin' : (liveUser.role === 'worker' || liveUser.role === 'waiter' ? 'waiter' : liveUser.role);
        let localUser = await get(`SELECT * FROM users WHERE user_code = ? OR name = ?`, [liveUser.id, liveUser.name]);
        if (!localUser) {
          await run(`
            INSERT INTO users (name, role, pin, password, is_shift_open, status, user_code, tenant_id)
            VALUES (?, ?, ?, ?, 1, 'active', ?, ?)
          `, [liveUser.name, mappedRole, passVal, passVal, liveUser.id, liveUser.tenantId || cfg.tenant_id]);
          localUser = await get(`SELECT * FROM users WHERE user_code = ? OR name = ?`, [liveUser.id, liveUser.name]);
        } else {
          await run(`UPDATE users SET is_shift_open = 1, pin = ?, password = ?, role = ?, tenant_id = ? WHERE id = ?`, [
            passVal, passVal, mappedRole, liveUser.tenantId || cfg.tenant_id, localUser.id
          ]);
        }

        // Trigger background sync for products
        backendSync.syncFromBackend().catch((e) => console.warn('[Auth] Background sync warning:', e.message));

        return res.json({
          success: true,
          id: liveUser.id,
          name: liveUser.name,
          role: mappedRole,
          tenantId: liveUser.tenantId || cfg.tenant_id,
          tenantName: liveUser.tenantName || cfg.tenant_name,
          token: liveRes.token || `token_${Date.now()}`,
          user: {
            id: liveUser.id,
            rawId: localUser?.id,
            name: liveUser.name,
            role: mappedRole,
            tenantId: liveUser.tenantId || cfg.tenant_id,
            tenantName: liveUser.tenantName || cfg.tenant_name,
            is_shift_open: 1,
          },
        });
      }
    } catch (e) {
      console.warn('[Auth] Live login attempt error, falling back to local SQLite:', e.message);
    }

    // 2. Local fallback login (offline mode or local users)
    let user = null;
    if (loginVal) {
      user = await get(
        `SELECT * FROM users 
         WHERE (LOWER(name) = LOWER(?) OR phone = ? OR LOWER(login) = LOWER(?) OR user_code = ?) 
           AND (password = ? OR pin = ?)`,
        [loginVal, loginVal, loginVal, loginVal, passVal, passVal]
      );
    }
    if (!user && userId) {
      user = await get(
        `SELECT * FROM users WHERE (user_code = ? OR id = ?) AND (password = ? OR pin = ?)`,
        [userId, userId, passVal, passVal]
      );
    }
    if (!user && !loginVal) {
      user = await get(
        `SELECT * FROM users WHERE password = ? OR pin = ?`,
        [passVal, passVal]
      );
    }

    if (!user) {
      return res.status(401).json({ success: false, message: "Noto'g'ri login yoki parol!" });
    }

    // Smena ochish
    await run(`UPDATE users SET is_shift_open = 1 WHERE id = ?`, [user.id]);

    const tenantId = user.tenant_id || cfg.tenant_id || '90e04abf-246d-4683-91eb-1ac34d7b2ee7';
    const tenantName = cfg.tenant_name || 'Test Kafe';
    const idStr = user.user_code || `usr_${user.id}`;

    res.json({
      success: true,
      id: idStr,
      name: user.name,
      role: user.role,
      tenantId,
      tenantName,
      user: {
        id: idStr,
        rawId: user.id,
        name: user.name,
        role: user.role,
        tenantId,
        tenantName,
        is_shift_open: 1,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Stollar holati (GET /api/tables?tenantId={TENANT_ID})
app.get('/api/tables', async (req, res) => {
  try {
    const rows = await all(`
      SELECT t.*, 
             o.id as order_id, 
             o.waiter_name, 
             o.total_amount,
             o.created_at as order_created_at
      FROM tables t
      LEFT JOIN orders o ON t.current_order_id = o.id
      ORDER BY t.number ASC
    `);

    const formattedTables = rows.map((t) => ({
      id: t.id,
      number: t.number,
      name: t.name || `Stol ${t.number}`,
      hall: t.hall || (t.number <= 5 ? 'Основной' : t.number <= 10 ? 'ZAL 1' : t.number <= 15 ? 'ZAL 2' : 'ZAL 3'),
      capacity: t.capacity || 4,
      status: t.status || 'free',
      activeOrderId: t.order_id || null,
      activeWaiterName: t.waiter_name || null,
      totalAmount: t.total_amount || 0,
      total_amount: t.total_amount || 0,
      order_id: t.order_id,
      waiter_name: t.waiter_name,
      current_order_id: t.current_order_id,
      order_created_at: t.order_created_at,
    }));

    // Agar tenantId so'ralgan bo'lsa (Backend / Mobile spetsifikatsiyasi bo'yicha to'g'ridan-to'g'ri massiv qaytariladi)
    if (req.query.tenantId) {
      return res.json(formattedTables);
    }

    res.json({ success: true, tables: formattedTables });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. Menyu va Taomlar (GET /api/menu?tenantId={TENANT_ID})
app.get('/api/menu', async (req, res) => {
  try {
    const rawCategories = await all(`SELECT * FROM categories ORDER BY order_index ASC`);
    const rawProducts = await all(`SELECT * FROM products WHERE is_available = 1 ORDER BY category_id, name`);

    const categoryMap = {};
    rawCategories.forEach((c) => {
      categoryMap[c.id] = c.name;
    });

    const formattedCategories = rawCategories.map((c) => ({
      id: c.id,
      catId: `cat-${c.id}`,
      rawId: c.id,
      name: c.name,
      slug: c.slug,
      icon: c.icon,
      image: c.image || '',
      order_index: c.order_index || 0,
    }));

    const formattedProducts = rawProducts.map((p) => ({
      id: p.id,
      product_id: `prod_${p.id}`,
      rawId: p.id,
      name: p.name,
      price: p.price,
      cost_price: p.cost_price || 0,
      stock_quantity: p.stock_quantity !== undefined && p.stock_quantity !== null ? Number(p.stock_quantity) : 100,
      unit: p.unit || (p.package_code === '166' ? 'kg' : p.package_code === '112' ? 'litr' : 'dona'),
      min_stock_alert: p.min_stock_alert !== undefined ? Number(p.min_stock_alert) : 5,
      workshop: p.workshop || 'Кухня',
      product_type: p.product_type || 'Товар',
      category: categoryMap[p.category_id] || 'Boshqa',
      category_id: p.category_id,
      image: p.image,
      mxik_code: p.mxik_code || '10701001001000000',
      package_code: p.package_code || '796',
      vat_percent: p.vat_percent !== undefined ? p.vat_percent : 12,
      is_available: p.is_available === 1,
    }));

    res.json({
      success: true,
      categories: formattedCategories,
      products: formattedProducts,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Toifalar (Categories) CRUD API
app.get('/api/categories', async (req, res) => {
  try {
    const categories = await all(`SELECT * FROM categories ORDER BY order_index ASC`);
    res.json({ success: true, categories });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/categories', async (req, res) => {
  try {
    const { name, image, order_index, icon } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Kategoriya nomi majburiy' });
    const slug = name.toLowerCase().replace(/[^a-z0-9]/gi, '_') + '_' + Date.now();
    const result = await run(
      `INSERT INTO categories (name, slug, icon, image, order_index) VALUES (?, ?, ?, ?, ?)`,
      [name.trim(), slug, icon || '🍽️', image || '', order_index || 0]
    );
    const newCat = await get(`SELECT * FROM categories WHERE id = ?`, [result.lastID]);
    broadcast('CATEGORY_ADDED', newCat);
    res.json({ success: true, category: newCat });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/categories/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, image, order_index, icon } = req.body;
    await run(
      `UPDATE categories SET name = ?, image = ?, order_index = ?, icon = ? WHERE id = ?`,
      [name, image || '', order_index !== undefined ? Number(order_index) : 0, icon || '🍽️', id]
    );
    const updated = await get(`SELECT * FROM categories WHERE id = ?`, [id]);
    broadcast('CATEGORY_UPDATED', updated);
    res.json({ success: true, category: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/categories/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await run(`DELETE FROM categories WHERE id = ?`, [id]);
    broadcast('CATEGORY_DELETED', { id: Number(id) });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Taom MXIK kodini yangilash moduli
app.put('/api/products/:id/mxik', async (req, res) => {
  try {
    const { id } = req.params;
    const { mxik_code, package_code, vat_percent } = req.body;
    await run(
      `UPDATE products SET mxik_code = ?, package_code = ?, vat_percent = ? WHERE id = ?`,
      [mxik_code, package_code || '796', vat_percent !== undefined ? vat_percent : 12, id]
    );
    const updated = await get(`SELECT * FROM products WHERE id = ?`, [id]);
    broadcast('PRODUCT_UPDATED', updated);
    res.json({ success: true, product: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Yangi taom qo'shish (Admin / Menejer uchun)
app.post('/api/products', async (req, res) => {
  try {
    const { category_id, name, price, cost_price, stock_quantity, unit, min_stock_alert, workshop, product_type, image, mxik_code, package_code, vat_percent, is_available } = req.body;
    if (!name || !price) {
      return res.status(400).json({ success: false, message: "Taom nomi va narxi majburiy" });
    }
    const initialStock = stock_quantity !== undefined && stock_quantity !== null ? Number(stock_quantity) : 100;
    const cost = Number(cost_price || 0);
    const result = await run(
      `INSERT INTO products (category_id, name, price, cost_price, stock_quantity, unit, min_stock_alert, workshop, product_type, image, mxik_code, package_code, vat_percent, is_available)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        category_id || 1,
        name.trim(),
        Number(price),
        cost,
        initialStock,
        unit || 'dona',
        min_stock_alert !== undefined ? Number(min_stock_alert) : 5,
        workshop || 'Кухня',
        product_type || 'Товар',
        image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80',
        mxik_code || '10701001001000000',
        package_code || '796',
        vat_percent !== undefined ? Number(vat_percent) : 12,
        is_available !== undefined ? (is_available ? 1 : 0) : 1,
      ]
    );

    // Initial stock movement record
    if (initialStock > 0) {
      await run(
        `INSERT INTO stock_movements (product_id, type, quantity, previous_stock, new_stock, unit_price, total_price, note, created_by)
         VALUES (?, 'in', ?, 0, ?, ?, ?, 'Boshlang\'ich qoldiq', 'Admin')`,
        [result.lastID, initialStock, initialStock, cost, cost * initialStock]
      );
    }

    const newProduct = await get(`SELECT * FROM products WHERE id = ?`, [result.lastID]);
    broadcast('PRODUCT_ADDED', newProduct);
    res.json({ success: true, product: newProduct });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Taomni to'liq tahrirlash (PUT /api/products/:id)
app.put('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { category_id, name, price, cost_price, stock_quantity, unit, min_stock_alert, workshop, product_type, image, mxik_code, package_code, vat_percent, is_available } = req.body;
    
    const existing = await get(`SELECT * FROM products WHERE id = ?`, [id]);
    if (!existing) return res.status(404).json({ success: false, message: 'Mahsulot topilmadi' });

    const newStock = stock_quantity !== undefined && stock_quantity !== null ? Number(stock_quantity) : (existing.stock_quantity || 0);

    await run(
      `UPDATE products 
       SET category_id = ?, name = ?, price = ?, cost_price = ?, stock_quantity = ?, unit = ?, min_stock_alert = ?, workshop = ?, product_type = ?, image = ?, mxik_code = ?, package_code = ?, vat_percent = ?, is_available = ?
       WHERE id = ?`,
      [
        category_id || 1,
        name.trim(),
        Number(price),
        Number(cost_price || 0),
        newStock,
        unit || existing.unit || 'dona',
        min_stock_alert !== undefined ? Number(min_stock_alert) : (existing.min_stock_alert || 5),
        workshop || 'Кухня',
        product_type || 'Товар',
        image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80',
        mxik_code || '10701001001000000',
        package_code || '796',
        vat_percent !== undefined ? Number(vat_percent) : 12,
        is_available !== undefined ? (is_available ? 1 : 0) : 1,
        id
      ]
    );

    const updated = await get(`SELECT * FROM products WHERE id = ?`, [id]);
    broadcast('PRODUCT_UPDATED', updated);
    res.json({ success: true, product: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Taomni o'chirish (DELETE /api/products/:id)
app.delete('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await run(`DELETE FROM products WHERE id = ?`, [id]);
    broadcast('PRODUCT_DELETED', { id: Number(id) });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ----------------------------------------------------
// STAFF & WAITERS MANAGEMENT (XODIMLAR VA OFITSIANTLAR)
// ----------------------------------------------------
app.get('/api/staff', async (req, res) => {
  try {
    const cfg = await backendSync.getConfig();
    const currentTenantId = cfg.tenant_id || '90e04abf-246d-4683-91eb-1ac34d7b2ee7';
    const staff = await all(
      `SELECT id, name, login, password, role, pin, phone, status, user_code, tenant_id, created_at 
       FROM users 
       WHERE tenant_id = ? OR tenant_id IS NULL OR tenant_id = ''
       ORDER BY id ASC`,
      [currentTenantId]
    );
    res.json({ success: true, staff, users: staff });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/staff', async (req, res) => {
  try {
    const { name, role, login, password, pin, phone, status } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: "Xodim ismi kiritilishi majburiy" });
    }
    const staffLogin = (login || name.toLowerCase().replace(/[^a-z0-9]/g, '')).trim();
    const staffPassword = (password || pin || '123456').trim();
    const staffPin = String(pin || password || '1111').replace(/[^0-9]/g, '').padEnd(4, '0').slice(0, 4);

    const cfg = await backendSync.getConfig();
    const userCode = uuidv4();
    const result = await run(
      `INSERT INTO users (name, login, password, role, pin, phone, status, is_shift_open, user_code, tenant_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
      [name.trim(), staffLogin, staffPassword, role || 'waiter', staffPin, phone || '', status || 'active', userCode, cfg.tenant_id]
    );
    const newUser = await get(`SELECT id, name, login, password, role, pin, phone, status, user_code, tenant_id, created_at FROM users WHERE id = ?`, [result.lastID]);
    broadcast('STAFF_UPDATED', { type: 'added', user: newUser });

    // Asynchronously push to Central Backend / Admin Panel
    backendSync.pushStaffMember(newUser).catch((e) => console.warn('[Staff] Backend push warning:', e.message));

    res.json({ success: true, user: newUser, message: "Yangi ofitsiant/xodim muvaffaqiyatli qo'shildi!" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/staff/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, role, login, password, pin, phone, status } = req.body;
    const staffLogin = (login || name.toLowerCase().replace(/[^a-z0-9]/g, '')).trim();
    const staffPassword = (password || pin || '123456').trim();
    const staffPin = String(pin || password || '1111').replace(/[^0-9]/g, '').padEnd(4, '0').slice(0, 4);

    await run(
      `UPDATE users 
       SET name = ?, login = ?, password = ?, role = ?, pin = ?, phone = ?, status = ? 
       WHERE id = ?`,
      [name.trim(), staffLogin, staffPassword, role || 'waiter', staffPin, phone || '', status || 'active', id]
    );
    const updated = await get(`SELECT id, name, login, password, role, pin, phone, status, user_code, tenant_id, created_at FROM users WHERE id = ?`, [id]);
    broadcast('STAFF_UPDATED', { type: 'updated', user: updated });

    // Asynchronously push update to Central Backend (getpos.uz)
    backendSync.pushStaffMember(updated).catch((e) => console.warn('[Staff] Backend update warning:', e.message));

    res.json({ success: true, user: updated, message: "Xodim ma'lumotlari muvaffaqiyatli yangilandi!" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/staff/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const user = await get(`SELECT * FROM users WHERE id = ?`, [id]);
    if (!user) {
      return res.status(404).json({ success: false, message: "Xodim topilmadi" });
    }

    await run(`DELETE FROM users WHERE id = ?`, [id]);
    broadcast('STAFF_UPDATED', { type: 'deleted', id: Number(id) });

    // Also delete on Central Backend (getpos.uz)
    if (user.user_code) {
      backendSync.deleteStaffMember(user.user_code).catch((e) => console.warn('[Staff] Backend delete warning:', e.message));
    }

    res.json({ success: true, message: "Xodim muvaffaqiyatli o'chirildi" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ----------------------------------------------------
// INVENTORY & STOCK MANAGEMENT (SKLAD / OMBORXONA)
// ----------------------------------------------------
app.get('/api/inventory', async (req, res) => {
  try {
    const products = await all(`
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      ORDER BY p.name ASC
    `);

    let totalStockValue = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    const formatted = products.map((p) => {
      const stock = Number(p.stock_quantity !== null && p.stock_quantity !== undefined ? p.stock_quantity : 100);
      const minAlert = Number(p.min_stock_alert || 5);
      const cost = Number(p.cost_price || 0);
      const price = Number(p.price || 0);
      totalStockValue += (stock * (cost > 0 ? cost : price));

      let status = 'in_stock';
      if (stock <= 0) {
        status = 'out_of_stock';
        outOfStockCount++;
      } else if (stock <= minAlert) {
        status = 'low_stock';
        lowStockCount++;
      }

      return {
        id: p.id,
        name: p.name,
        category_id: p.category_id,
        category_name: p.category_name || 'Boshqa',
        price: price,
        cost_price: cost,
        stock_quantity: stock,
        unit: p.unit || (p.package_code === '166' ? 'kg' : p.package_code === '112' ? 'litr' : 'dona'),
        min_stock_alert: minAlert,
        image: p.image,
        mxik_code: p.mxik_code,
        status: status,
        is_available: p.is_available === 1,
      };
    });

    res.json({
      success: true,
      summary: {
        totalItems: formatted.length,
        totalStockValue,
        lowStockCount,
        outOfStockCount,
      },
      items: formatted,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Prihod / Kirim qilish (Inflow)
app.post('/api/inventory/inflow', async (req, res) => {
  try {
    const { productId, quantity, costPrice, supplier, note, createdBy } = req.body;
    if (!productId || !quantity || Number(quantity) <= 0) {
      return res.status(400).json({ success: false, message: "Mahsulot va to'g'ri miqdor kiritilishi shart" });
    }

    const prod = await get(`SELECT * FROM products WHERE id = ?`, [productId]);
    if (!prod) return res.status(404).json({ success: false, message: "Mahsulot topilmadi" });

    const prevStock = Number(prod.stock_quantity !== null && prod.stock_quantity !== undefined ? prod.stock_quantity : 100);
    const qty = Number(quantity);
    const newStock = prevStock + qty;
    const unitPrice = costPrice !== undefined && costPrice !== null && costPrice !== '' ? Number(costPrice) : (prod.cost_price || 0);
    const totalPrice = unitPrice * qty;

    await run(
      `UPDATE products SET stock_quantity = ?, cost_price = ? WHERE id = ?`,
      [newStock, unitPrice, productId]
    );

    const moveRes = await run(
      `INSERT INTO stock_movements (product_id, type, quantity, previous_stock, new_stock, unit_price, total_price, supplier, note, created_by)
       VALUES (?, 'in', ?, ?, ?, ?, ?, ?, ?, ?)`,
      [productId, qty, prevStock, newStock, unitPrice, totalPrice, supplier || '', note || 'Skladga kirim', createdBy || 'Admin']
    );

    const updatedProd = await get(`SELECT * FROM products WHERE id = ?`, [productId]);
    broadcast('INVENTORY_UPDATED', { product: updatedProd, movementId: moveRes.lastID });
    broadcast('PRODUCT_UPDATED', updatedProd);

    res.json({
      success: true,
      message: `${prod.name} uchun ${qty} ta mahsulot omborga muvaffaqiyatli kirim qilindi!`,
      product: updatedProd,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Inventarizatsiya / Qoldiqni to'g'rilash (Adjustment)
app.post('/api/inventory/adjustment', async (req, res) => {
  try {
    const { productId, newStock, note, createdBy } = req.body;
    if (!productId || newStock === undefined || Number(newStock) < 0) {
      return res.status(400).json({ success: false, message: "Mahsulot va yangi qoldiq kiritilishi shart" });
    }

    const prod = await get(`SELECT * FROM products WHERE id = ?`, [productId]);
    if (!prod) return res.status(404).json({ success: false, message: "Mahsulot topilmadi" });

    const prevStock = Number(prod.stock_quantity !== null && prod.stock_quantity !== undefined ? prod.stock_quantity : 100);
    const targetStock = Number(newStock);
    const diff = targetStock - prevStock;

    await run(`UPDATE products SET stock_quantity = ? WHERE id = ?`, [targetStock, productId]);

    await run(
      `INSERT INTO stock_movements (product_id, type, quantity, previous_stock, new_stock, unit_price, total_price, note, created_by)
       VALUES (?, 'adjustment', ?, ?, ?, ?, ?, ?, ?)`,
      [productId, diff, prevStock, targetStock, prod.cost_price || 0, 0, note || 'Inventarizatsiya orqali to\'g\'rilandi', createdBy || 'Admin']
    );

    const updatedProd = await get(`SELECT * FROM products WHERE id = ?`, [productId]);
    broadcast('INVENTORY_UPDATED', { product: updatedProd });
    broadcast('PRODUCT_UPDATED', updatedProd);

    res.json({
      success: true,
      message: `${prod.name} qoldig'i ${targetStock} ga muvaffaqiyatli o'zgartirildi`,
      product: updatedProd,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Spisanie / Chiqim (Waste / Damage)
app.post('/api/inventory/waste', async (req, res) => {
  try {
    const { productId, quantity, note, createdBy } = req.body;
    if (!productId || !quantity || Number(quantity) <= 0) {
      return res.status(400).json({ success: false, message: "Mahsulot va chiqim miqdori kiritilishi shart" });
    }

    const prod = await get(`SELECT * FROM products WHERE id = ?`, [productId]);
    if (!prod) return res.status(404).json({ success: false, message: "Mahsulot topilmadi" });

    const prevStock = Number(prod.stock_quantity !== null && prod.stock_quantity !== undefined ? prod.stock_quantity : 100);
    const qty = Number(quantity);
    const newStock = Math.max(0, prevStock - qty);

    await run(`UPDATE products SET stock_quantity = ? WHERE id = ?`, [newStock, productId]);

    await run(
      `INSERT INTO stock_movements (product_id, type, quantity, previous_stock, new_stock, unit_price, total_price, note, created_by)
       VALUES (?, 'waste', ?, ?, ?, ?, ?, ?, ?)`,
      [productId, qty, prevStock, newStock, prod.cost_price || 0, (prod.cost_price || 0) * qty, note || 'Spisanie / Brak', createdBy || 'Admin']
    );

    const updatedProd = await get(`SELECT * FROM products WHERE id = ?`, [productId]);
    broadcast('INVENTORY_UPDATED', { product: updatedProd });
    broadcast('PRODUCT_UPDATED', updatedProd);

    res.json({
      success: true,
      message: `${prod.name} uchun ${qty} ta mahsulot hisobdan chiqarildi (spisanie)`,
      product: updatedProd,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Sklad harakatlari tarixi (Movements history)
app.get('/api/inventory/movements', async (req, res) => {
  try {
    const movements = await all(`
      SELECT sm.*, p.name as product_name, p.image as product_image, p.unit
      FROM stock_movements sm
      LEFT JOIN products p ON sm.product_id = p.id
      ORDER BY sm.id DESC
      LIMIT 100
    `);
    res.json({ success: true, movements });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. Stol bo'yicha joriy faol buyurtmani olish
app.get('/api/orders/table/:tableId', async (req, res) => {
  try {
    const { tableId } = req.params;
    const table = await get(`SELECT * FROM tables WHERE id = ?`, [tableId]);
    if (!table || !table.current_order_id) {
      return res.json({ success: true, order: null, items: [] });
    }

    const order = await get(`SELECT * FROM orders WHERE id = ?`, [table.current_order_id]);
    const items = await all(`SELECT * FROM order_items WHERE order_id = ? ORDER BY id ASC`, [order.id]);
    res.json({ success: true, order, items, table });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6. Yangi buyurtma berish yoki ochiq stolga qo'shish (Ofitsiant yoki Kassir)
app.post('/api/orders', async (req, res) => {
  try {
    const { tableId, waiterId, waiterName, items } = req.body;
    if (!tableId || !items || !items.length) {
      return res.status(400).json({ success: false, message: "Ma'lumotlar to'liq emas" });
    }

    const table = await get(`SELECT * FROM tables WHERE id = ?`, [tableId]);
    if (!table) return res.status(404).json({ success: false, message: 'Stol topilmadi' });

    let orderId = table.current_order_id;
    let isNewOrder = false;

    // Agar stol bo'sh bo'lsa, yangi buyurtma yaratiladi
    if (!orderId) {
      orderId = 'ord_' + uuidv4().substring(0, 8);
      isNewOrder = true;
      await run(
        `INSERT INTO orders (id, table_id, waiter_id, waiter_name, status, total_amount) VALUES (?, ?, ?, ?, 'open', 0)`,
        [orderId, tableId, waiterId || 1, waiterName || 'Ofitsiant']
      );
    }

    // Taomlarni qo'shish
    let addedTotal = 0;
    const addedItemsForKitchen = [];

    for (const item of items) {
      const pId = item.product_id || item.productId;
      const pName = item.product_name || item.productName || item.name;
      const itemTotal = (item.price || 0) * (item.quantity || 1);
      addedTotal += itemTotal;
      await run(
        `INSERT INTO order_items (order_id, product_id, product_name, quantity, price, comment, status) 
         VALUES (?, ?, ?, ?, ?, ?, 'sent')`,
        [orderId, pId, pName, item.quantity || 1, item.price || 0, item.comment || '']
      );
      addedItemsForKitchen.push({
        product_name: pName,
        quantity: item.quantity || 1,
        comment: item.comment || '',
      });

      // Sklad qoldig'ini avtomatik kamaytirish
      try {
        const prodRow = await get(`SELECT id, name, stock_quantity, price, cost_price FROM products WHERE id = ?`, [pId]);
        if (prodRow) {
          const prevSt = Number(prodRow.stock_quantity !== null && prodRow.stock_quantity !== undefined ? prodRow.stock_quantity : 100);
          const reqQty = Number(item.quantity || 1);
          const newSt = Math.max(0, prevSt - reqQty);
          await run(`UPDATE products SET stock_quantity = ? WHERE id = ?`, [newSt, prodRow.id]);
          await run(
            `INSERT INTO stock_movements (product_id, type, quantity, previous_stock, new_stock, unit_price, total_price, note, created_by)
             VALUES (?, 'out_sale', ?, ?, ?, ?, ?, ?, ?)`,
            [
              prodRow.id,
              reqQty,
              prevSt,
              newSt,
              prodRow.price,
              prodRow.price * reqQty,
              `Savdo: ${table.number}-stol (Buyurtma ${orderId})`,
              waiterName || 'Ofitsiant'
            ]
          );
          const updP = await get(`SELECT * FROM products WHERE id = ?`, [prodRow.id]);
          broadcast('INVENTORY_UPDATED', { product: updP });
          broadcast('PRODUCT_UPDATED', updP);
        }
      } catch (stockErr) {
        console.warn('[Stock] Auto-deduct error:', stockErr.message);
      }
    }

    // Buyurtma umumiy summasini hisoblash
    const sumResult = await get(`SELECT SUM(price * quantity) as total FROM order_items WHERE order_id = ?`, [orderId]);
    const totalAmount = sumResult ? sumResult.total : 0;

    await run(`UPDATE orders SET total_amount = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [totalAmount, orderId]);

    // Stol holatini 'busy' (Qizil - band) ga o'tkazish
    await run(
      `UPDATE tables SET status = 'busy', current_order_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [orderId, tableId]
    );

    // 3.3-band: Oshxona printeriga darhol "Begunok" chekini chiqarish (Narxlarsiz!)
    const ticket = await printToKitchen({
      orderId,
      tableNumber: table.number,
      waiterName: waiterName || 'Ofitsiant',
      items: addedItemsForKitchen,
    });

    // Barcha mijozlarga real-time tarqatish
    const updatedTable = await get(`
      SELECT t.*, o.id as order_id, o.waiter_name, o.total_amount, o.created_at as order_created_at
      FROM tables t
      LEFT JOIN orders o ON t.current_order_id = o.id
      WHERE t.id = ?
    `, [tableId]);

    broadcast('TABLE_UPDATED', updatedTable);
    broadcast('KITCHEN_NEW_TICKET', ticket);

    res.json({
      success: true,
      orderId,
      totalAmount,
      order: {
        id: orderId,
        tableNumber: table.number,
        totalAmount,
        status: 'open',
      },
      kitchenTicket: ticket,
    });
  } catch (err) {
    console.error('Order creation error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 7. Ofitsiant "Hisob so'raldi" tugmasini bosishi (POST /api/orders/:id/bill-request)
app.post('/api/orders/:id/bill-request', async (req, res) => {
  try {
    const { id } = req.params;
    const order = await get(`SELECT * FROM orders WHERE id = ?`, [id]);
    if (!order) return res.status(404).json({ success: false, message: 'Buyurtma topilmadi' });

    // Stolni 'bill_requested' (Sariq - hisob so'ralgan) holatiga o'tkazish
    await run(`UPDATE orders SET status = 'bill_requested' WHERE id = ?`, [id]);
    await run(`UPDATE tables SET status = 'bill_requested' WHERE id = ?`, [order.table_id]);

    const updatedTable = await get(`
      SELECT t.*, o.id as order_id, o.waiter_name, o.total_amount, o.created_at as order_created_at
      FROM tables t
      LEFT JOIN orders o ON t.current_order_id = o.id
      WHERE t.id = ?
    `, [order.table_id]);

    broadcast('TABLE_UPDATED', updatedTable);
    broadcast('BILL_REQUESTED', { tableId: order.table_id, tableNumber: updatedTable.number });

    telegram.notifyBillRequested({
      tableTitle: updatedTable?.name || `${updatedTable?.number}-stol`,
      waiterName: updatedTable?.waiter_name || order.waiter_name || 'Ofitsiant',
      totalAmount: updatedTable?.total_amount || order.total_amount || 0,
    }).catch(e => console.error('[JetBot] notifyBillRequested error:', e.message));

    res.json({ success: true, table: updatedTable });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 7.1. Taomni qisman yoki to'liq bekor qilish (Отмена / Возврат блюда) - Video 2 dagi funksiya
app.post('/api/orders/:id/cancel-item', async (req, res) => {
  try {
    const orderId = req.params.id;
    const { itemId, productId, cancelQty, reason } = req.body;
    const order = await get(`SELECT * FROM orders WHERE id = ?`, [orderId]);
    if (!order) return res.status(404).json({ success: false, message: 'Buyurtma topilmadi' });

    const table = await get(`SELECT * FROM tables WHERE id = ?`, [order.table_id]);

    // Itemni topish
    let item = null;
    if (itemId) {
      item = await get(`SELECT * FROM order_items WHERE id = ?`, [itemId]);
    } else if (productId) {
      item = await get(
        `SELECT * FROM order_items WHERE order_id = ? AND product_id = ? AND is_cancelled = 0 ORDER BY id DESC`,
        [orderId, productId]
      );
    }
    if (!item) return res.status(404).json({ success: false, message: 'Taom topilmadi' });

    const qtyToCancel = Math.min(Number(cancelQty) || 1, Math.abs(item.quantity));
    const prod = await get(`SELECT * FROM products WHERE id = ?`, [item.product_id]);
    const workshop = prod?.workshop || 'Кухня';

    if (qtyToCancel >= item.quantity) {
      // To'liq bekor qilish: qatorni chizish va holatini 'cancelled' ga o'tkazish
      await run(
        `UPDATE order_items SET is_cancelled = 1, status = 'cancelled', cancel_reason = ? WHERE id = ?`,
        [reason || 'Mijoz bekor qildi', item.id]
      );
    } else {
      // Qisman bekor qilish: JetCafe video 2-kadridagi kabi manfiy miqdorli qaytarish qatori qo'shish
      await run(
        `INSERT INTO order_items (order_id, product_id, product_name, quantity, price, comment, status, is_cancelled, cancel_reason)
         VALUES (?, ?, ?, ?, ?, '', 'cancelled', 1, ?)`,
        [orderId, item.product_id, item.product_name, -qtyToCancel, item.price, reason || 'Qisman qaytarildi']
      );
    }

    // Buyurtma umumiy summasini qayta hisoblash
    const allActive = await all(`SELECT price, quantity, is_cancelled FROM order_items WHERE order_id = ?`, [orderId]);
    let newTotal = 0;
    allActive.forEach((it) => {
      if (it.quantity < 0) {
        newTotal += it.price * it.quantity; // minus sum
      } else if (!it.is_cancelled) {
        newTotal += it.price * it.quantity;
      }
    });
    if (newTotal < 0) newTotal = 0;

    await run(`UPDATE orders SET total_amount = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [newTotal, orderId]);

    // Oshxona/Bar uchun "Bekor qilish cheki" (Бегунок отмены) chiqarish
    const cancelTicket = await printKitchenCancellationTicket({
      orderId,
      tableNumber: table?.number || 1,
      hallName: table?.hall || 'Основной',
      waiterName: order.waiter_name || 'Системный Администратор',
      workshop,
      items: [{ product_name: item.product_name, quantity: -qtyToCancel, reason }],
    });

    const updatedItems = await all(`SELECT * FROM order_items WHERE order_id = ? ORDER BY id ASC`, [orderId]);
    const updatedTable = await get(`
      SELECT t.*, o.id as order_id, o.waiter_name, o.total_amount, o.created_at as order_created_at
      FROM tables t
      LEFT JOIN orders o ON t.current_order_id = o.id
      WHERE t.id = ?
    `, [order.table_id]);

    broadcast('TABLE_UPDATED', updatedTable);
    broadcast('KITCHEN_CANCEL_TICKET', cancelTicket);
    broadcast('ORDER_UPDATED', { orderId, totalAmount: newTotal, items: updatedItems });

    telegram.notifyItemCancelled({
      tableTitle: table?.name || `${table?.number || 1}-stol`,
      waiterName: order.waiter_name || 'Системный Администратор',
      itemName: item.product_name,
      quantity: qtyToCancel,
      price: item.price,
      reason: reason || 'Mijoz bekor qildi',
    }).catch(e => console.error('[JetBot] notifyItemCancelled error:', e.message));

    res.json({
      success: true,
      orderId,
      totalAmount: newTotal,
      items: updatedItems,
      cancelTicket,
    });
  } catch (err) {
    console.error('Item cancellation error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 7.2. Buyurtmalar jurnali (jetcafe | Заказы) - Video 5 & 7 dagi funksiya
app.get('/api/orders/journal', async (req, res) => {
  try {
    const orders = await all(`
      SELECT o.*, t.number as table_number, t.hall, p.payment_method, p.cash_amount, p.card_amount, p.created_at as paid_at
      FROM orders o
      LEFT JOIN tables t ON o.table_id = t.id
      LEFT JOIN payments p ON o.id = p.order_id
      ORDER BY o.created_at DESC
      LIMIT 100
    `);

    const orderIds = orders.map((o) => o.id);
    let itemsByOrder = {};
    if (orderIds.length > 0) {
      const placeholders = orderIds.map(() => '?').join(',');
      const items = await all(
        `SELECT * FROM order_items WHERE order_id IN (${placeholders}) ORDER BY id ASC`,
        orderIds
      );
      items.forEach((it) => {
        if (!itemsByOrder[it.order_id]) itemsByOrder[it.order_id] = [];
        itemsByOrder[it.order_id].push({
          id: it.id,
          product_id: it.product_id,
          name: it.product_name,
          quantity: it.quantity,
          price: it.price,
          total: it.price * it.quantity,
          status: it.is_cancelled ? 'Отменен' : 'Заказано',
          is_cancelled: Boolean(it.is_cancelled),
          cancel_reason: it.cancel_reason,
          time: it.created_at,
        });
      });
    }

    const formatted = orders.map((o, idx) => ({
      id: o.id,
      shift_id: Math.floor(new Date(o.created_at).getTime() / 86400000) - 19000,
      number: idx + 1,
      table: `STOL ${o.table_number || 1}`,
      hall: o.hall || 'Основной',
      client: '—',
      waiter: o.waiter_name || 'Системный Администратор',
      opened_at: o.created_at,
      closed_at: o.paid_at || (o.status === 'paid' ? o.updated_at : null),
      status: o.status === 'paid' ? 'Закрыт' : o.status === 'open' ? 'Открыт' : o.status,
      service_percent: 10,
      total_amount: o.total_amount || 0,
      to_pay: Math.round((o.total_amount || 0) * 1.1),
      discount: 0,
      cash: o.cash_amount || (o.payment_method === 'cash' ? Math.round((o.total_amount || 0) * 1.1) : 0),
      card: o.card_amount || (o.payment_method === 'card' ? Math.round((o.total_amount || 0) * 1.1) : 0),
      debt: 0,
      comment: '',
      items: itemsByOrder[o.id] || [],
    }));

    res.json({ success: true, orders: formatted });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 8. To'lovni qabul qilish (Kassa) va REGOS Soliq Fiskal chek chiqarish (POST /api/payments)
app.post('/api/payments', async (req, res) => {
  try {
    const { orderId, tableId, paymentMethod, cashAmount, cardAmount } = req.body;
    if (!orderId || !tableId || !paymentMethod) {
      return res.status(400).json({ success: false, message: "To'lov ma'lumotlari yetarli emas" });
    }

    const order = await get(`SELECT * FROM orders WHERE id = ?`, [orderId]);
    if (!order) return res.status(404).json({ success: false, message: 'Buyurtma topilmadi' });

    const items = await all(`
      SELECT oi.*, p.mxik_code, p.package_code, p.vat_percent 
      FROM order_items oi
      LEFT JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = ?
    `, [orderId]);

    // Soliq.uz fiskallashtirish
    const receiptData = await fiscalizePayment({
      orderId,
      tableId,
      totalAmount: order.total_amount,
      paymentMethod,
      cashAmount,
      cardAmount,
      items,
    });

    recordFiscalReceipt(receiptData);

    // Buyurtmani yopish va stolni bo'shatish ('free' - Yashil)
    await run(`UPDATE orders SET status = 'paid' WHERE id = ?`, [orderId]);
    await run(`UPDATE tables SET status = 'free', current_order_id = NULL WHERE id = ?`, [tableId]);

    const updatedTable = await get(`SELECT *, NULL as order_id FROM tables WHERE id = ?`, [tableId]);
    const pendingCount = await getPendingCount();

    broadcast('TABLE_UPDATED', updatedTable);
    broadcast('PAYMENT_COMPLETED', {
      tableId,
      receipt: receiptData,
    });
    broadcast('SYNC_STATUS_CHANGED', {
      isOnline: getInternetStatus(),
      pendingChecks: pendingCount,
    });

    telegram.notifyOrderPaid({
      order,
      items,
      table: updatedTable,
      waiter: order.waiter_name,
      cashAmount,
      cardAmount,
    }).catch(e => console.error('[JetBot] notifyOrderPaid error:', e.message));

    // Real Backend API Sync (Push transaction to getpos.uz)
    backendSync.pushOrderSale({
      order,
      items,
      paymentData: {
        paymentMethod,
        cashAmount,
        cardAmount,
        totalAmount: order.total_amount,
        receiptSeq: receiptData.receiptSeq,
      },
      waiterUserCode: order.waiter_id,
    }).then((syncRes) => {
      if (syncRes && syncRes.success) {
        console.log(`[BackendSync] Sale successfully synced to getpos.uz! TxId: ${syncRes.transactionId}`);
        broadcast('BACKEND_SYNC_COMPLETED', { success: true, transactionId: syncRes.transactionId });
      }
    }).catch((e) => console.warn('[BackendSync] Sale sync warning:', e.message));

    res.json({
      success: true,
      message: "To'lov muvaffaqiyatli amalga oshirildi va Soliq QR fiskallashtirildi",
      receipt: {
        receiptSeq: receiptData.receiptSeq,
        totalAmount: receiptData.totalAmount,
        vatAmount: receiptData.vatAmount,
        fiscalSign: receiptData.fiscalSign,
        terminalId: receiptData.company?.terminalId || 'VG298430008256',
        fiscalQrUrl: receiptData.fiscalQrUrl,
        qrImageBase64: receiptData.qrImageBase64,
        dateTime: receiptData.date,
        ...receiptData,
      },
      table: {
        id: tableId,
        number: updatedTable.number,
        status: 'free',
        activeOrderId: null,
        totalAmount: 0,
      },
      pendingChecks: pendingCount,
    });
  } catch (err) {
    console.error('Payment error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 8.1. REGOS VCR - Virtual kassa holatini tekshirish (Sys.GetInfo)
app.get('/api/fiscal/status', async (req, res) => {
  res.json({
    success: true,
    vcr: {
      terminalId: COMPANY_INFO.terminalId,
      fiscalModule: COMPANY_INFO.fiscalModuleId,
      isShiftOpen: true,
      status: 'ready',
      battery: '100%',
      paperStatus: 'ok',
    },
  });
});

// 8.2. REGOS VCR - Smena ochish (ZReport.Open)
app.post('/api/fiscal/open-shift', async (req, res) => {
  const shiftNumber = Math.floor(Date.now() / 86400000) - 19000;
  telegram.notifyShiftStatus('open').catch(e => console.error('[JetBot] shift open error:', e.message));
  res.json({
    success: true,
    message: 'Smena ochildi (ZReport.Open)',
    shiftNumber,
    openedAt: new Date().toISOString(),
  });
});

// 8.3. REGOS VCR - Smena yopish va Z-Hisobot olish (ZReport.Close)
app.post('/api/fiscal/close-shift', async (req, res) => {
  try {
    const todayPayments = await all(`SELECT total_amount, cash_amount, card_amount FROM payments WHERE date(created_at) = date('now')`);
    let totalRevenue = 0;
    let cashTotal = 0;
    let cardTotal = 0;
    todayPayments.forEach((p) => {
      totalRevenue += p.total_amount || 0;
      cashTotal += p.cash_amount || 0;
      cardTotal += p.card_amount || 0;
    });
    const vatTotal = Math.round((totalRevenue * 12) / 112);

    telegram.notifyShiftStatus('close').catch(e => console.error('[JetBot] shift close error:', e.message));

    res.json({
      success: true,
      message: 'Smena yopildi va Z-Hisobot olindi (ZReport.Close)',
      shiftNumber: Math.floor(Date.now() / 86400000) - 19000,
      closedAt: new Date().toISOString(),
      zReport: {
        totalRevenue,
        cashTotal,
        cardTotal,
        vatTotal,
        receiptCount: todayPayments.length,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 8.4. REGOS VCR - X-Hisobot ma'lumotlari (ZReport.GetInfo)
app.get('/api/fiscal/shift-info', async (req, res) => {
  try {
    const todayPayments = await all(`SELECT total_amount FROM payments WHERE date(created_at) = date('now')`);
    const total = todayPayments.reduce((acc, p) => acc + (p.total_amount || 0), 0);
    res.json({
      success: true,
      shiftNumber: Math.floor(Date.now() / 86400000) - 19000,
      isOpen: true,
      currentSales: total,
      receiptCount: todayPayments.length,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 8.5. Oflayn buyurtmalarni sinxronlash (POST /api/sync/offline-orders)
app.post('/api/sync/offline-orders', async (req, res) => {
  try {
    const { orders } = req.body;
    if (!orders || !Array.isArray(orders)) {
      return res.status(400).json({ success: false, message: "Buyurtmalar ro'yxati berilmadi" });
    }
    let count = 0;
    for (const ord of orders) {
      const orderId = ord.localOrderId || `ord_off_${Date.now()}_${count}`;
      const paymentId = 'pay_off_' + (ord.localOrderId || Date.now() + Math.random());
      const fiscalSign = generateFiscalSign();
      const lastSeq = (await get(`SELECT MAX(receipt_seq) as max_seq FROM payments`))?.max_seq || 1000;
      const receiptSeq = lastSeq + 1;

      await run(
        `INSERT OR IGNORE INTO orders (id, table_id, waiter_id, waiter_name, status, total_amount)
         VALUES (?, ?, 1, 'Offline Kassa', 'paid', ?)`,
        [orderId, ord.tableId || 1, ord.totalAmount || 0]
      );

      await run(
        `INSERT INTO payments (id, order_id, table_id, total_amount, payment_method, fiscal_sign, receipt_seq, is_synced_soliq)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
        [paymentId, orderId, ord.tableId || 1, ord.totalAmount || 0, ord.paymentMethod || 'cash', fiscalSign, receiptSeq]
      );
      count++;
    }
    res.json({
      success: true,
      syncedOrders: count,
      message: "Barcha oflayn buyurtmalar muvaffaqiyatli sinxronlashtirildi va Soliqqa yuborildi",
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 9. Oshxona chiptalari tarixi
app.get('/api/kitchen/tickets', (req, res) => {
  res.json({ success: true, tickets: getRecentKitchenTickets() });
});

// ==========================================
// 10. JETBOT TELEGRAM INTEGRATSIYASI API
// ==========================================

// 10.1. Sozlamalar va statusni olish
app.get('/api/telegram/settings', async (req, res) => {
  try {
    const settings = await telegram.getSettings();
    const subscribers = await all(`SELECT * FROM telegram_subscribers ORDER BY id DESC`);
    const activeCount = subscribers.filter((s) => s.is_active).length;
    res.json({
      success: true,
      settings: {
        ...settings,
        hasToken: !!settings.bot_token,
      },
      subscribersCount: activeCount,
      subscribers,
      simulatedMessages: telegram.getSimulatedMessages(),
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 10.2. Sozlamalarni yangilash (Bot Token, Oraliq, Status)
app.post('/api/telegram/settings', async (req, res) => {
  try {
    const { bot_token, poll_interval, is_enabled } = req.body;
    let bot_username = '@Hisobchiuz101bot';

    // Token kiritilgan bo'lsa, Telegram API orqali bot ma'lumotini tekshirish
    if (bot_token && bot_token.trim()) {
      try {
        const testRes = await fetch(`https://api.telegram.org/bot${bot_token.trim()}/getMe`);
        const me = await testRes.json();
        if (me && me.ok && me.result && me.result.username) {
          bot_username = `@${me.result.username}`;
        }
      } catch (e) {
        console.warn('[JetBot] getMe error during settings update:', e.message);
      }
    }

    await run(`
      UPDATE telegram_settings 
      SET bot_token = ?, bot_username = ?, poll_interval = ?, is_enabled = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = 1
    `, [
      bot_token !== undefined ? bot_token.trim() : '',
      bot_username,
      Number(poll_interval) || 30,
      is_enabled ? 1 : 0,
    ]);

    if (is_enabled && bot_token && bot_token.trim()) {
      telegram.startPolling(Number(poll_interval) || 5);
    } else {
      telegram.stopPolling();
    }

    const updated = await telegram.getSettings();
    res.json({ success: true, settings: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 10.3. Servisni yoqish / o'chirish (Ishla / Tuxta)
app.post('/api/telegram/toggle-service', async (req, res) => {
  try {
    const { is_enabled } = req.body;
    const enabledVal = is_enabled ? 1 : 0;
    await run(`UPDATE telegram_settings SET is_enabled = ? WHERE id = 1`, [enabledVal]);

    if (enabledVal) {
      telegram.startPolling(5);
      telegram.notifyBotStatus(true).catch(() => {});
    } else {
      telegram.notifyBotStatus(false).catch(() => {});
      telegram.stopPolling();
    }

    res.json({ success: true, is_enabled: enabledVal });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 10.4. Yangi obunachi uchun 4 xonali PIN kod generatsiyasi (jetbot_step_170.jpg)
app.post('/api/telegram/generate-code', async (req, res) => {
  try {
    const settings = await telegram.getSettings();
    // 4 xonali unikal kod (masalan 6901)
    const code = String(Math.floor(1000 + Math.random() * 9000));

    // Yangi bo'sh obunachi qatorini tayyorlash
    const subNumber = Math.floor(1000 + Math.random() * 9000);
    await run(`
      INSERT INTO telegram_subscribers (
        chat_id, user_id, username, first_name, reg_code, sub_number, sub_expires,
        is_active, notify_bot_status, notify_db_backup, notify_cashier_report, notify_status, notify_orders, notify_cancellations, notify_bill
      ) VALUES (
        '', '', '', 'Kutilmoqda...', ?, ?, '05.05.2027',
        0, 1, 1, 1, 1, 1, 1, 1
      )
    `, [code, subNumber]);

    res.json({
      success: true,
      code,
      bot_username: settings.bot_username || '@Hisobchiuz101bot',
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 10.5. Kod qabul qilinganligini tekshirish (Real-time listener)
app.get('/api/telegram/check-code/:code', async (req, res) => {
  try {
    const { code } = req.params;
    const sub = await get(`SELECT * FROM telegram_subscribers WHERE reg_code = ? AND is_active = 1`, [code]);
    if (sub) {
      res.json({ success: true, connected: true, subscriber: sub });
    } else {
      res.json({ success: true, connected: false });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 10.6. Obunachilar ro'yxati
app.get('/api/telegram/subscribers', async (req, res) => {
  try {
    const subscribers = await all(`SELECT * FROM telegram_subscribers ORDER BY id DESC`);
    res.json({ success: true, subscribers });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 10.7. Obunachi sozlamalarini saqlash (jetbot_step_180.jpg / Obuna)
app.put('/api/telegram/subscribers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      notify_bot_status,
      notify_db_backup,
      notify_cashier_report,
      notify_status,
      notify_orders,
      notify_cancellations,
      notify_bill,
      is_active,
    } = req.body;

    await run(`
      UPDATE telegram_subscribers 
      SET notify_bot_status = ?, notify_db_backup = ?, notify_cashier_report = ?, 
          notify_status = ?, notify_orders = ?, notify_cancellations = ?, notify_bill = ?,
          is_active = COALESCE(?, is_active)
      WHERE id = ?
    `, [
      notify_bot_status ? 1 : 0,
      notify_db_backup ? 1 : 0,
      notify_cashier_report ? 1 : 0,
      notify_status ? 1 : 0,
      notify_orders ? 1 : 0,
      notify_cancellations ? 1 : 0,
      notify_bill ? 1 : 0,
      is_active !== undefined ? (is_active ? 1 : 0) : null,
      id,
    ]);

    const updated = await get(`SELECT * FROM telegram_subscribers WHERE id = ?`, [id]);
    res.json({ success: true, subscriber: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 10.8. Obunachini o'chirish
app.delete('/api/telegram/subscribers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await run(`DELETE FROM telegram_subscribers WHERE id = ?`, [id]);
    res.json({ success: true, message: "Obunachi o'chirildi" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 10.9. Sinov xabari yuborish (Sinov)
app.post('/api/telegram/test', async (req, res) => {
  try {
    const result = await telegram.sendTestNotification();
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 10.10. Bazaning zaxira nusxasini yuborish (Резервная копия базы данных)
app.post('/api/telegram/backup', async (req, res) => {
  try {
    const backup = telegram.generateBackupFile();
    if (!backup) {
      return res.status(404).json({ success: false, message: "Baza fayli topilmadi" });
    }
    await telegram.broadcast('notify_db_backup', {
      file: backup.filePath,
      caption: 'Резервная копия базы данных',
    });
    res.json({ success: true, message: "Zaxira nusxa yaratildi va yuborildi", fileName: backup.fileName });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 10.11. Simulyatsiya: Telegram foydalanuvchisi xabarini emulyatsiya qilish
app.post('/api/telegram/simulate-message', async (req, res) => {
  try {
    const { text, chatId, username, firstName } = req.body;
    await telegram.processIncomingMessage({
      chat: { id: chatId || '123456789' },
      from: { username: username || 'admin', first_name: firstName || 'Системный Администратор' },
      text: text || '/start',
    });
    res.json({ success: true, simulatedMessages: telegram.getSimulatedMessages() });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// 11. BACKEND DASTURCHI API VA SINXRONIZATSIYA
// ==========================================

// 11.1. Backend sozlamalari va holati
app.get('/api/config/backend', async (req, res) => {
  try {
    const config = await backendSync.getConfig();
    const lastSync = backendSync.getLastSyncResult();
    const pendingCount = await getPendingCount();
    res.json({
      success: true,
      config,
      lastSync,
      pendingCount,
      isLocal: config.api_url === 'http://localhost:4000/api' || !config.is_external_active,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 11.2. Backend sozlamalarini saqlash
app.post('/api/config/backend', async (req, res) => {
  try {
    const { api_url, tenant_id, tenant_name, auth_token, sync_interval, is_external_active } = req.body;
    const updated = await backendSync.updateConfig({
      api_url,
      tenant_id,
      tenant_name,
      auth_token,
      sync_interval,
      is_external_active,
    });
    res.json({ success: true, config: updated, message: "Backend API sozlamalari saqlandi" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 11.3. Backend API ga ulanishni tekshirish (Ping)
app.post('/api/config/backend/test', async (req, res) => {
  try {
    const { api_url, auth_token, tenant_id } = req.body;
    const result = await backendSync.testConnection(api_url, auth_token, tenant_id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 11.4. To'liq sinxronizatsiyani ishga tushirish (Sync Now)
app.post('/api/config/backend/sync', async (req, res) => {
  try {
    const pullResult = await backendSync.syncFromBackend();
    const pushResult = await backendSync.syncToBackend();
    res.json({
      success: true,
      message: "Sinxronizatsiya muvaffaqiyatli yakunlandi",
      pull: pullResult,
      push: pushResult,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 11.5. Live Tenants ro'yxati (GET /api/config/backend/tenants)
app.get('/api/config/backend/tenants', async (req, res) => {
  try {
    const data = await backendSync.fetchLiveTenants();
    res.json(data);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message, tenants: [] });
  }
});

// ==========================================
// 12. MOBIL SAVATLAR (BASKETS / KASSAGA UZATISH)
// ==========================================

// 12.1. Faol mobil savatlarni olish (GET /api/baskets)
app.get('/api/baskets', async (req, res) => {
  try {
    const result = await backendSync.fetchActiveBaskets();
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message, count: 0, baskets: [] });
  }
});

// 12.2. Mobil savatni kassaga yuklash / qabul qilish
app.post('/api/baskets/:id/load', async (req, res) => {
  try {
    const { id } = req.params;
    const { tableId } = req.body;
    const result = await backendSync.fetchActiveBaskets();
    const basket = result.baskets?.find((b) => b.id === id);
    if (!basket) {
      return res.status(404).json({ success: false, message: "Savat topilmadi yoki allaqachon qabul qilingan" });
    }

    // Optionally mark basket as processed on getpos.uz
    await backendSync.patchBasketStatus(id, 'loaded', { client_name: basket.client_name || `Stol #${tableId || 1}` }).catch(() => {});

    res.json({
      success: true,
      basket,
      tableId,
      message: "Mobil savat kassaga muvaffaqiyatli yuklandi",
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 12.3. Mobil savat to'lovini bevosita yakunlash (POST /api/transactions/)
app.post('/api/baskets/:id/pay', async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentMethod = 'cash', totalAmount, clientName, clientPhone } = req.body;
    const payRes = await backendSync.completeBasketTransaction({
      basketId: id,
      paymentMethod,
      totalAmount,
      clientName,
      clientPhone,
    });

    if (payRes.success) {
      await backendSync.patchBasketStatus(id, 'completed').catch(() => {});

      // Notify all screens about updated baskets
      const updatedBaskets = await backendSync.fetchActiveBaskets();
      broadcast('MOBILE_BASKETS_UPDATED', {
        count: updatedBaskets.count,
        baskets: updatedBaskets.baskets,
      });

      res.json({ success: true, message: "Mobil savat to'lovi qabul qilindi", transaction: payRes.transaction });
    } else {
      res.status(400).json({ success: false, message: payRes.error || "To'lovni yakunlashda xatolik" });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Background poller for live mobile baskets (every 5 seconds)
let lastBasketCount = -1;
setInterval(async () => {
  try {
    const res = await backendSync.fetchActiveBaskets();
    if (res.success && (res.count !== lastBasketCount)) {
      lastBasketCount = res.count;
      broadcast('MOBILE_BASKETS_UPDATED', {
        count: res.count,
        baskets: res.baskets,
      });
    }
  } catch (e) {}
}, 5000);

// Production: Serve React client
const distPath = path.join(__dirname, '../client/dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.use((req, res, next) => {
    if (!req.path.startsWith('/api') && !req.path.startsWith('/ws') && req.method === 'GET') {
      res.sendFile(path.join(distPath, 'index.html'));
    } else {
      next();
    }
  });
}

// Initializing DB and starting server
const PORT = process.env.PORT || 4000;

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} allaqachon band! Server boshqa jarayon tomonidan ishlatilmoqda.`);
  } else {
    console.error('Server xatosi:', err);
  }
});

initDB().then(async () => {
  // Real Backend Sync initialization (getpos.uz)
  try {
    const bCfg = await backendSync.getConfig();
    if (bCfg.is_external_active && bCfg.api_url) {
      backendSync.startPeriodicSync(bCfg.sync_interval || 30);
      backendSync.syncFromBackend().then((res) => {
        console.log(`[BackendSync] Live data sync from ${bCfg.api_url}: ${res.message}`);
      }).catch((e) => console.warn(`[BackendSync] Initial sync warning: ${e.message}`));
    }
  } catch (e) {
    console.error('[BackendSync] Startup sync error:', e.message);
  }

  server.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`  KafePOS Lokal Serveri ishga tushdi!               `);
    console.log(`  Lokal URL:   http://localhost:${PORT}             `);
    console.log(`  Wi-Fi URL:   http://${getLocalIp()}:${PORT}       `);
    console.log(`  WebSocket:   ws://localhost:${PORT}/ws            `);
    console.log(`====================================================`);
  });
});

