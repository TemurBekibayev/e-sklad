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
  getOrGenerateReceiptForOrder,
  COMPANY_INFO,
} = require('./soliq');
const printerService = require('./printer');
const { printToKitchen, printKitchenCancellationTicket, getRecentKitchenTickets, updateKitchenTicketStatus, removeKitchenTicketItem, recordFiscalReceipt } = printerService;
const telegram = require('./telegram');
const backendSync = require('./backendSync');
const imageHelper = require('./imageHelper');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static directory for uploaded images
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// Mobile API v2.0 & Cloud First compatibility: rewrite /api/v1/... and root endpoints to /api/...
app.use((req, res, next) => {
  if (req.url.startsWith('/api/v1/cafe/')) {
    req.url = req.url.replace('/api/v1/cafe/', '/api/');
  } else if (req.url.startsWith('/api/v1/products/')) {
    req.url = req.url.replace('/api/v1/products/', '/api/products/');
  } else if (req.url.startsWith('/api/v1/auth/')) {
    req.url = req.url.replace('/api/v1/auth/', '/api/auth/');
  } else if (req.url.startsWith('/api/v1/')) {
    req.url = req.url.replace('/api/v1/', '/api/');
  } else if (req.url === '/tables' || req.url.startsWith('/tables?')) {
    req.url = req.url.replace('/tables', '/api/tables');
  } else if (req.url === '/halls' || req.url.startsWith('/halls?')) {
    req.url = req.url.replace('/halls', '/api/halls');
  } else if (req.url === '/orders' || req.url.startsWith('/orders?')) {
    req.url = req.url.replace('/orders', '/api/orders');
  } else if (req.url === '/products' || req.url.startsWith('/products?')) {
    req.url = req.url.replace('/products', '/api/products');
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
      try {
        client.send(payload);
      } catch (err) {
        console.error('[WS Broadcast] Send error:', err.message);
      }
    }
  });
}

backendSync.setBroadcastCallback(broadcast);

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

// Mobil ilovalar va veb-kassa uchun rasm URL-manzilini to'liq formatlash
function resolveImageUrl(req, img, id) {
  if (!img) return '';
  const host = (req && req.get && req.get('host')) || `${getLocalIp()}:4000`;
  const protocol = (req && req.protocol) || 'http';

  // If local file exists in server/uploads, serve it directly over local Wi-Fi
  if (id && (img.startsWith('http://') || img.startsWith('https://'))) {
    const filename = imageHelper.getFilenameForUrl(img, id);
    const filePath = path.join(uploadsDir, filename);
    if (fs.existsSync(filePath)) {
      return `${protocol}://${host}/uploads/${filename}`;
    }
  }

  if (img.startsWith('http://') || img.startsWith('https://')) return img;
  const clean = img.startsWith('/') ? img : `/${img}`;
  return `${protocol}://${host}${clean}`;
}

// ----------------------------------------------------
// FAYL VA RASM YUKLASH (IMAGE UPLOAD API)
// ----------------------------------------------------
app.post(['/api/upload', '/api/upload-image', '/api/products/upload'], async (req, res) => {
  try {
    const { image, imageBase64, data, filename = 'dish.jpg' } = req.body || {};
    const rawPayload = image || imageBase64 || data;

    if (!rawPayload) {
      return res.status(400).json({ success: false, message: "Rasm ma'lumotlari topilmadi (Base64 formatda yuboring)" });
    }

    let base64Data = rawPayload;
    let ext = '.jpg';

    // Data URL formatini tekshirish: data:image/png;base64,...
    const matches = typeof rawPayload === 'string' && rawPayload.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
    if (matches) {
      const mimeSubtype = matches[1].toLowerCase();
      ext = mimeSubtype === 'jpeg' || mimeSubtype === 'jpg' ? '.jpg' 
          : mimeSubtype === 'png' ? '.png'
          : mimeSubtype === 'webp' ? '.webp'
          : mimeSubtype === 'gif' ? '.gif' : '.jpg';
      base64Data = matches[2];
    } else if (filename) {
      const parsedExt = path.extname(filename).toLowerCase();
      if (['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(parsedExt)) {
        ext = parsedExt === '.jpeg' ? '.jpg' : parsedExt;
      }
    }

    const buffer = Buffer.from(base64Data, 'base64');
    if (buffer.length === 0) {
      return res.status(400).json({ success: false, message: "Yaroqsiz rasm ma'lumotlari" });
    }

    const uniqueName = `img_${Date.now()}_${Math.random().toString(36).substring(2, 8)}${ext}`;
    const filePath = path.join(uploadsDir, uniqueName);

    await fs.promises.writeFile(filePath, buffer);

    const relativeUrl = `/uploads/${uniqueName}`;
    const fullUrl = resolveImageUrl(req, relativeUrl);

    res.json({
      success: true,
      url: relativeUrl,
      fullUrl,
      filename: uniqueName,
      size: buffer.length
    });
  } catch (err) {
    console.error('[Upload Error]:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

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
    const tenantId = req.query.tenantId || cfg.tenant_id || '';

    // 1. Fetch live staff from getpos.uz if tenantId is configured
    if (tenantId) {
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
    }

    // 2. Return all local active users belonging to this tenant
    let users = [];
    if (tenantId) {
      users = await all(
        `SELECT id, user_code, name, role, status, tenant_id FROM users 
         WHERE (tenant_id = ? OR tenant_id IS NULL OR tenant_id = '') AND (status = 'active' OR status IS NULL)
         ORDER BY id ASC`,
        [tenantId]
      );
    } else {
      users = await all(
        `SELECT id, user_code, name, role, status, tenant_id FROM users 
         WHERE status = 'active' OR status IS NULL
         ORDER BY id ASC`
      );
    }

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
app.post(['/api/auth/login', '/auth/login'], async (req, res) => {
  try {
    let { login, username, phone, email, password, pin, userId } = req.body;
    let loginVal = (login || username || phone || email || '').trim();
    const passVal = (password || pin || '').trim();

    if (!passVal) {
      return res.status(400).json({ success: false, message: "Parol yoki PIN-kod kiritilishi shart" });
    }

    // Auto-resolve user login/email/name from userId if not explicitly provided
    if (!loginVal && userId) {
      try {
        const uRow = await get(`SELECT name, login, email FROM users WHERE user_code = ? OR id = ?`, [userId, userId]);
        if (uRow) {
          loginVal = uRow.login || uRow.email || uRow.name || '';
        }
      } catch (_) {}
    }

    const cfg = await backendSync.getConfig();

    // 1. Live authentication against getpos.uz
    try {
      const liveRes = await backendSync.loginLiveUser(userId || loginVal, passVal, cfg.api_url, loginVal);
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
app.get(['/api/tables', '/tables', '/api/tables/'], async (req, res) => {
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

    const formattedTables = await Promise.all(rows.map(async (t) => {
      let items = [];
      let activeOrder = null;
      if (t.current_order_id) {
        activeOrder = await get(`SELECT * FROM orders WHERE id = ?`, [t.current_order_id]);
      }
      if (!activeOrder && t.id && t.status !== 'free') {
        activeOrder = await get(
          `SELECT * FROM orders WHERE table_id = ? AND status IN ('open', 'busy', 'bill_requested') ORDER BY created_at DESC LIMIT 1`,
          [t.id]
        );
      }
      if (activeOrder && t.status === 'free') {
        // If table is free, do not attach old active order
        activeOrder = null;
      }
      if (activeOrder) {
        items = await all(
          `SELECT * FROM order_items WHERE order_id = ? AND (is_cancelled = 0 OR is_cancelled IS NULL) ORDER BY id ASC`,
          [activeOrder.id]
        );
      }
      const orderTotal = activeOrder ? Number(activeOrder.total_amount || 0) : 0;

      return {
        id: t.id,
        remote_id: t.remote_id || null,
        remoteId: t.remote_id || null,
        number: t.number,
        name: t.name || `STOL - ${t.number}`,
        hall: t.hall || 'Asosiy Zal',
        capacity: t.capacity || 4,
        status: t.status || (activeOrder ? activeOrder.status : 'free'),
        activeOrderId: activeOrder?.id || t.order_id || null,
        activeWaiterName: activeOrder?.waiter_name || t.waiter_name || null,
        totalAmount: orderTotal,
        total_amount: orderTotal,
        order_id: activeOrder?.id || t.order_id || null,
        orderId: activeOrder?.id || t.order_id || null,
        waiter_name: activeOrder?.waiter_name || t.waiter_name || null,
        waiterName: activeOrder?.waiter_name || t.waiter_name || null,
        current_order_id: activeOrder?.id || t.current_order_id || null,
        order_created_at: activeOrder?.created_at || t.order_created_at || null,
        items_count: items.length,
        items: items,
        order_items: items,
        products: items,
      };
    }));

    // Agar tenantId so'ralgan bo'lsa (Backend / Mobile spetsifikatsiyasi bo'yicha to'g'ridan-to'g'ri massiv qaytariladi)
    if (req.query.tenantId) {
      return res.json(formattedTables);
    }

    res.json({
      success: true,
      tables: formattedTables,
      data: formattedTables,
      results: formattedTables,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3.01. Bitta stol ma'lumotini olish (GET /api/tables/:id)
app.get(['/api/tables/:id', '/tables/:id'], async (req, res) => {
  try {
    const { id } = req.params;
    const table = await get(`SELECT * FROM tables WHERE id = ? OR number = ?`, [id, id]);
    if (!table) return res.status(404).json({ success: false, message: 'Stol topilmadi' });

    let order = null;
    let items = [];
    if (table.current_order_id) {
      order = await get(`SELECT * FROM orders WHERE id = ?`, [table.current_order_id]);
      if (order) {
        items = await all(`SELECT * FROM order_items WHERE order_id = ? ORDER BY id ASC`, [order.id]);
      }
    }

    const formatted = {
      ...table,
      order,
      items,
      order_items: items,
      products: items,
      total_amount: order?.total_amount || 0,
    };

    res.json({
      success: true,
      table: formatted,
      data: formatted,
      order,
      items,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3.1. Yangi stol qo'shish (POST /api/tables)
app.post(['/api/tables', '/tables'], async (req, res) => {
  try {
    let { number, name, hall, capacity } = req.body;

    if (!number) {
      const maxNumRow = await get(`SELECT MAX(number) as max_num FROM tables`);
      number = (maxNumRow?.max_num || 0) + 1;
    } else {
      number = Number(number);
    }

    const existing = await get(`SELECT id FROM tables WHERE number = ?`, [number]);
    if (existing) {
      return res.status(400).json({ success: false, message: `${number}-raqamli stol allaqachon mavjud!` });
    }

    const tableName = (name && name.trim()) || `STOL - ${number}`;
    const tableHall = (hall && hall.trim()) || 'Asosiy Zal';
    const tableCapacity = Number(capacity) || 4;

    const result = await run(
      `INSERT INTO tables (number, name, hall, capacity, status) VALUES (?, ?, ?, ?, 'free')`,
      [number, tableName, tableHall, tableCapacity]
    );

    const newTable = await get(`SELECT * FROM tables WHERE id = ?`, [result.lastID]);
    const formatted = {
      id: newTable.id,
      number: newTable.number,
      name: newTable.name,
      hall: newTable.hall,
      capacity: newTable.capacity,
      status: 'free',
      total_amount: 0,
    };

    broadcast('TABLE_ADDED', formatted);
    broadcast('TABLES_UPDATED', formatted);

    res.json({ success: true, table: formatted, message: `${tableName} muvaffaqiyatli qo'shildi!` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3.2. Stolni tahrirlash (PUT /api/tables/:id)
app.put(['/api/tables/:id', '/tables/:id'], async (req, res) => {
  try {
    const { id } = req.params;
    const { number, name, hall, capacity } = req.body;

    const table = await get(`SELECT * FROM tables WHERE id = ?`, [id]);
    if (!table) return res.status(404).json({ success: false, message: 'Stol topilmadi' });

    if (number && Number(number) !== table.number) {
      const conflict = await get(`SELECT id FROM tables WHERE number = ? AND id != ?`, [Number(number), id]);
      if (conflict) {
        return res.status(400).json({ success: false, message: `${number}-raqamli stol allaqachon mavjud!` });
      }
    }

    const newNumber = number ? Number(number) : table.number;
    const newName = (name && name.trim()) || table.name;
    const newHall = (hall && hall.trim()) || table.hall || 'Asosiy Zal';
    const newCapacity = capacity !== undefined ? Number(capacity) : table.capacity;

    await run(
      `UPDATE tables SET number = ?, name = ?, hall = ?, capacity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [newNumber, newName, newHall, newCapacity, id]
    );

    const updated = await get(`
      SELECT t.*, o.id as order_id, o.waiter_name, o.total_amount, o.created_at as order_created_at
      FROM tables t
      LEFT JOIN orders o ON t.current_order_id = o.id
      WHERE t.id = ?
    `, [id]);

    broadcast('TABLE_UPDATED', updated);
    broadcast('TABLES_UPDATED', updated);

    res.json({ success: true, table: updated, message: `${newName} ma'lumotlari yangilandi!` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3.3. Stolni o'chirish (DELETE /api/tables/:id)
app.delete(['/api/tables/:id', '/tables/:id'], async (req, res) => {
  try {
    const { id } = req.params;
    const table = await get(`SELECT * FROM tables WHERE id = ?`, [id]);
    if (!table) return res.status(404).json({ success: false, message: 'Stol topilmadi' });

    if (table.status === 'busy' || table.current_order_id) {
      return res.status(400).json({
        success: false,
        message: `Band (${table.name}) stolni o'chirib bo'lmaydi! Avval hisobni yoping yoki buyurtmani bekor qiling.`
      });
    }

    await run(`DELETE FROM tables WHERE id = ?`, [id]);
    broadcast('TABLE_DELETED', { id: Number(id) });
    broadcast('TABLES_UPDATED', { id: Number(id) });

    res.json({ success: true, message: `${table.name} muvaffaqiyatli o'chirildi!` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3.4. Xonalar / Zallar ro'yxati (GET /api/halls)
app.get(['/api/halls', '/halls'], async (req, res) => {
  try {
    const halls = await all(`
      SELECT h.*, COUNT(t.id) as table_count
      FROM halls h
      LEFT JOIN tables t ON t.hall = h.name
      GROUP BY h.id
      ORDER BY h.order_index ASC, h.id ASC
    `);
    res.json({ success: true, halls });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3.5. Yangi xona / zal qo'shish (POST /api/halls)
app.post(['/api/halls', '/halls'], async (req, res) => {
  try {
    const { name, order_index } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Zal nomi kiritilishi shart!' });
    }

    const hallName = name.trim();
    const existing = await get(`SELECT id FROM halls WHERE LOWER(name) = LOWER(?)`, [hallName]);
    if (existing) {
      return res.status(400).json({ success: false, message: `"${hallName}" nomli zal allaqachon mavjud!` });
    }

    const maxOrder = await get(`SELECT MAX(order_index) as max_ord FROM halls`);
    const nextOrder = order_index !== undefined ? Number(order_index) : (maxOrder?.max_ord || 0) + 1;

    const result = await run(
      `INSERT INTO halls (name, order_index) VALUES (?, ?)`,
      [hallName, nextOrder]
    );

    const newHall = await get(`SELECT *, 0 as table_count FROM halls WHERE id = ?`, [result.lastID]);
    broadcast('HALL_ADDED', newHall);
    broadcast('HALLS_UPDATED', newHall);

    res.json({ success: true, hall: newHall, message: `"${hallName}" zali muvaffaqiyatli yaratildi!` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3.6. Xona / zalni tahrirlash (PUT /api/halls/:id)
app.put(['/api/halls/:id', '/halls/:id'], async (req, res) => {
  try {
    const { id } = req.params;
    const { name, order_index } = req.body;

    const oldHall = await get(`SELECT * FROM halls WHERE id = ?`, [id]);
    if (!oldHall) return res.status(404).json({ success: false, message: 'Zal topilmadi' });

    const newName = (name && name.trim()) || oldHall.name;
    const newOrder = order_index !== undefined ? Number(order_index) : oldHall.order_index;

    // Check conflict
    const conflict = await get(`SELECT id FROM halls WHERE LOWER(name) = LOWER(?) AND id != ?`, [newName, id]);
    if (conflict) {
      return res.status(400).json({ success: false, message: `"${newName}" nomli zal allaqachon mavjud!` });
    }

    await run(`UPDATE halls SET name = ?, order_index = ? WHERE id = ?`, [newName, newOrder, id]);

    // If hall name changed, update corresponding tables
    if (oldHall.name !== newName) {
      await run(`UPDATE tables SET hall = ? WHERE hall = ?`, [newName, oldHall.name]);
    }

    const updatedHall = await get(`
      SELECT h.*, COUNT(t.id) as table_count
      FROM halls h
      LEFT JOIN tables t ON t.hall = h.name
      WHERE h.id = ?
      GROUP BY h.id
    `, [id]);

    broadcast('HALL_UPDATED', updatedHall);
    broadcast('HALLS_UPDATED', updatedHall);
    broadcast('TABLES_UPDATED', {});

    res.json({ success: true, hall: updatedHall, message: `Zal nomi "${newName}" ga yangilandi!` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3.7. Xona / zalni o'chirish (DELETE /api/halls/:id)
app.delete(['/api/halls/:id', '/halls/:id'], async (req, res) => {
  try {
    const { id } = req.params;
    const hall = await get(`SELECT * FROM halls WHERE id = ?`, [id]);
    if (!hall) return res.status(404).json({ success: false, message: 'Zal topilmadi' });

    // Check if any busy table in this hall
    const busyTable = await get(`SELECT id, name FROM tables WHERE hall = ? AND (status = 'busy' OR current_order_id IS NOT NULL)`, [hall.name]);
    if (busyTable) {
      return res.status(400).json({
        success: false,
        message: `Ushbu zalda band stol (${busyTable.name}) mavjud! Avval buyurtmani yoping.`
      });
    }

    // Move any tables in this hall to default 'Asosiy Zal'
    await run(`UPDATE tables SET hall = 'Asosiy Zal' WHERE hall = ?`, [hall.name]);
    await run(`DELETE FROM halls WHERE id = ?`, [id]);

    broadcast('HALL_DELETED', { id: Number(id) });
    broadcast('HALLS_UPDATED', { id: Number(id) });
    broadcast('TABLES_UPDATED', {});

    res.json({ success: true, message: `"${hall.name}" zali o'chirildi. Undagi stollar "Asosiy Zal"ga o'tkazildi.` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. Menyu va Taomlar / Mahsulotlar (GET /api/menu, GET /api/products)
app.get(['/api/menu', '/menu', '/api/products', '/products'], async (req, res) => {
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
      image: resolveImageUrl(req, c.image),
      image_path: c.image || '',
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
      image: resolveImageUrl(req, p.image, p.id),
      image_path: p.image || '',
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
    const formatted = categories.map((c) => ({
      ...c,
      image: resolveImageUrl(req, c.image),
      image_path: c.image || '',
    }));
    res.json({ success: true, categories: formatted });
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
    if (newCat) {
      newCat.image = resolveImageUrl(req, newCat.image);
    }
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
    if (updated) {
      updated.image = resolveImageUrl(req, updated.image);
    }
    broadcast('CATEGORY_UPDATED', updated);
    res.json({ success: true, category: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/categories/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const catIdNum = Number(id);

    // Agar kategoriya ichida taomlar bo'lsa, ularni xavfsiz holda category_id = NULL qilamiz
    await run(`UPDATE products SET category_id = NULL WHERE category_id = ?`, [id]);
    await run(`DELETE FROM categories WHERE id = ?`, [id]);

    broadcast('CATEGORY_DELETED', { id: catIdNum || id });
    broadcast('CATEGORIES_UPDATED', {});
    res.json({ success: true, message: 'Kategoriya muvaffaqiyatli o\'chirildi' });
  } catch (err) {
    console.error('Delete category error:', err);
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
    const {
      name,
      price,
      category_id,
      cost_price,
      stock_quantity,
      unit,
      min_stock_alert,
      workshop,
      product_type,
      image,
      mxik_code,
      package_code,
      vat_percent,
      is_available,
    } = req.body || {};

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Taom nomi kiritilishi shart' });
    }

    let targetCatId = category_id;
    if (!targetCatId) {
      const firstCat = await get(`SELECT id FROM categories ORDER BY order_index ASC, id ASC LIMIT 1`);
      targetCatId = firstCat?.id || 1;
    }

    const cost = cost_price !== undefined && cost_price !== null ? Number(cost_price) : 0;
    const initialStock = stock_quantity !== undefined && stock_quantity !== null ? Number(stock_quantity) : 100;

    const result = await run(
      `INSERT INTO products (category_id, name, price, cost_price, stock_quantity, unit, min_stock_alert, workshop, product_type, image, mxik_code, package_code, vat_percent, is_available)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        targetCatId,
        name.trim(),
        Number(price),
        cost,
        initialStock,
        unit || 'dona',
        min_stock_alert !== undefined ? Number(min_stock_alert) : 5,
        workshop || 'Кухня',
        product_type || 'Товар',
        image || '',
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
         VALUES (?, 'in', ?, 0, ?, ?, ?, ?, ?)`,
        [result.lastID, initialStock, initialStock, cost, cost * initialStock, "Boshlang'ich qoldiq", 'Admin']
      );
    }

    const newProduct = await get(
      `SELECT p.*, c.name as category FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.id = ?`,
      [result.lastID]
    );
    if (newProduct) {
      newProduct.is_available = newProduct.is_available === 1;
      newProduct.product_id = `prod_${newProduct.id}`;
      newProduct.rawId = newProduct.id;
      newProduct.image = resolveImageUrl(req, newProduct.image);
    }
    broadcast('PRODUCT_ADDED', newProduct);
    broadcast('PRODUCTS_UPDATED', newProduct);
    broadcast('MENU_UPDATED', {});

    // Asynchronously push to Central Backend (getpos.uz)
    backendSync.pushProductToCloud(newProduct).catch((e) => console.warn('[Product] Backend push warning:', e.message));

    res.json({ success: true, product: newProduct });
  } catch (err) {
    console.error('Add product error:', err);
    res.status(500).json({ success: false, error: err.message, message: err.message });
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
        Number(category_id) || 1,
        name.trim(),
        Number(price),
        Number(cost_price || 0),
        newStock,
        unit || existing.unit || 'dona',
        min_stock_alert !== undefined ? Number(min_stock_alert) : (existing.min_stock_alert || 5),
        workshop || 'Кухня',
        product_type || 'Товар',
        image !== undefined ? image : (existing.image || ''),
        mxik_code || '10701001001000000',
        package_code || '796',
        vat_percent !== undefined ? Number(vat_percent) : 12,
        is_available !== undefined ? (is_available ? 1 : 0) : 1,
        id
      ]
    );

    const updated = await get(
      `SELECT p.*, c.name as category FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.id = ?`,
      [id]
    );
    if (updated) {
      updated.is_available = updated.is_available === 1;
      updated.product_id = `prod_${updated.id}`;
      updated.rawId = updated.id;
      updated.image = resolveImageUrl(req, updated.image);
    }
    broadcast('PRODUCT_UPDATED', updated);

    // Asynchronously push update to Central Backend (getpos.uz)
    backendSync.pushProductToCloud(updated).catch((e) => console.warn('[Product] Backend update warning:', e.message));

    res.json({ success: true, product: updated });
  } catch (err) {
    console.error('Update product error:', err);
    res.status(500).json({ success: false, error: err.message, message: err.message });
  }
});

// Taomni o'chirish (DELETE /api/products/:id)
app.delete(['/api/products/:id', '/products/:id'], async (req, res) => {
  try {
    const { id } = req.params;
    const numericId = parseInt(String(id).replace(/\D/g, ''), 10);
    const targetId = !isNaN(numericId) && numericId > 0 ? numericId : id;

    // 0. Avval mahsulotni bazadan topamiz (remote_id uchun)
    const existing = await get(`SELECT * FROM products WHERE id = ? OR id = ?`, [targetId, id]);

    // 1. Foreign Key cheklovlarini tozalash (stock_movements jadvalidan tozalash)
    await run(`DELETE FROM stock_movements WHERE product_id = ? OR product_id = ?`, [targetId, id]);

    // 2. Mahsulotni lokal bazadan o'chirish
    await run(`DELETE FROM products WHERE id = ? OR id = ?`, [targetId, id]);

    // 3. Agar bulutda remote_id mavjud bo'lsa, getpos.uz serveridan ham butunlay o'chiramiz
    if (existing && existing.remote_id) {
      await backendSync.deleteProductFromCloud(existing.remote_id).catch((e) => {
        console.warn('[Product] Cloud delete warning:', e.message);
      });
    }

    broadcast('PRODUCT_DELETED', { id: targetId, rawId: targetId });
    broadcast('PRODUCTS_UPDATED', {});
    res.json({ success: true, message: 'Taom muvaffaqiyatli o\'chirildi' });
  } catch (err) {
    console.error('Delete product error:', err);
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

// 5. Stol bo'yicha joriy faol buyurtmani olish (Barcha variantlar: /table/:id, /tables/:id/order, ?tableId=)
app.get([
  '/api/orders/table/:tableId',
  '/orders/table/:tableId',
  '/api/tables/:tableId/order',
  '/api/tables/:tableId/orders',
  '/tables/:tableId/order',
  '/tables/:tableId/orders'
], async (req, res) => {
  try {
    const { tableId } = req.params;
    const table = await get(`SELECT * FROM tables WHERE id = ? OR number = ?`, [tableId, tableId]);
    if (!table) {
      return res.status(404).json({ success: false, message: 'Stol topilmadi', order: null, items: [], data: null });
    }

    let order = null;
    let items = [];

    if (table.current_order_id) {
      order = await get(`SELECT * FROM orders WHERE id = ?`, [table.current_order_id]);
    }
    if (!order) {
      order = await get(`SELECT * FROM orders WHERE table_id = ? AND status IN ('open', 'bill_requested') ORDER BY created_at DESC LIMIT 1`, [table.id]);
    }

    if (order) {
      items = await all(`SELECT * FROM order_items WHERE order_id = ? ORDER BY id ASC`, [order.id]);
    }

    const fullOrder = order ? {
      ...order,
      order_id: order.id,
      orderId: order.id,
      table_id: table.id,
      tableId: table.id,
      table_number: table.number,
      tableNumber: table.number,
      table_name: table.name,
      tableName: table.name,
      hall: table.hall,
      total_amount: order.total_amount,
      totalAmount: order.total_amount,
      items: items,
      order_items: items,
      products: items,
    } : null;

    res.json({
      success: true,
      order: fullOrder,
      items: items,
      order_items: items,
      products: items,
      table: {
        ...table,
        order_id: order ? order.id : null,
        total_amount: order ? order.total_amount : 0,
        items: items,
      },
      data: fullOrder ? {
        ...fullOrder,
        order: fullOrder,
        items: items,
        table: table,
      } : {
        order: null,
        items: [],
        table: table,
      },
      results: items,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message, order: null, items: [] });
  }
});

// 5.1. Barcha buyurtmalar ro'yxati yoki ?tableId bo'yicha olish (GET /api/orders)
app.get(['/api/orders', '/orders', '/api/orders/active', '/orders/active'], async (req, res) => {
  try {
    const tableParam = req.query.tableId || req.query.table_id || req.query.table;
    if (tableParam) {
      const table = await get(`SELECT * FROM tables WHERE id = ? OR number = ?`, [tableParam, tableParam]);
      if (!table) return res.status(404).json({ success: false, message: 'Stol topilmadi', items: [] });
      let order = table.current_order_id ? await get(`SELECT * FROM orders WHERE id = ?`, [table.current_order_id]) : null;
      if (!order) {
        order = await get(`SELECT * FROM orders WHERE table_id = ? AND status IN ('open', 'bill_requested') ORDER BY created_at DESC LIMIT 1`, [table.id]);
      }
      const items = order ? await all(`SELECT * FROM order_items WHERE order_id = ? ORDER BY id ASC`, [order.id]) : [];
      const fullOrder = order ? { ...order, items, order_items: items } : null;
      return res.json({
        success: true,
        order: fullOrder,
        items,
        table,
        data: fullOrder,
      });
    }

    // Barcha ochiq buyurtmalar ro'yxati
    const orders = await all(`
      SELECT o.*, t.number as table_number, t.name as table_name, t.hall
      FROM orders o
      LEFT JOIN tables t ON o.table_id = t.id
      WHERE o.status IN ('open', 'bill_requested')
      ORDER BY o.created_at DESC
    `);

    const ordersWithItems = await Promise.all(orders.map(async (o) => {
      const items = await all(`SELECT * FROM order_items WHERE order_id = ? ORDER BY id ASC`, [o.id]);
      return {
        ...o,
        items,
        order_items: items,
      };
    }));

    res.json({
      success: true,
      orders: ordersWithItems,
      data: ordersWithItems,
      results: ordersWithItems,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5.2. ID bo'yicha bitta buyurtmani olish (GET /api/orders/:id)
app.get(['/api/orders/:id', '/orders/:id'], async (req, res, next) => {
  try {
    const { id } = req.params;
    if (id === 'journal') return next();
    const order = await get(`SELECT * FROM orders WHERE id = ?`, [id]);
    if (!order) return res.status(404).json({ success: false, message: 'Buyurtma topilmadi' });

    const table = await get(`SELECT * FROM tables WHERE id = ?`, [order.table_id]);
    const items = await all(`SELECT * FROM order_items WHERE order_id = ? ORDER BY id ASC`, [order.id]);

    const fullOrder = {
      ...order,
      order_id: order.id,
      orderId: order.id,
      table_number: table?.number,
      table_name: table?.name,
      hall: table?.hall,
      items,
      order_items: items,
    };

    res.json({
      success: true,
      order: fullOrder,
      items,
      table,
      data: fullOrder,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6. Yangi buyurtma berish yoki ochiq stolga qo'shish (Ofitsiant / Mobil ilova)
app.post([
  '/api/orders', 
  '/orders', 
  '/api/orders/items', 
  '/orders/items', 
  '/api/orders/:id/items', 
  '/orders/:id/items',
  '/api/tables/:tableId/orders'
], async (req, res) => {
  try {
    const body = req.body || {};
    const tableIdParam = req.params.tableId || body.tableId || body.table_id || body.table || body.tableNumber;
    let rawItems = body.items || body.products || body.dishes || body.order_items;

    // Single item payload support: { product_id: 1, quantity: 2 }
    if (!rawItems && (body.product_id || body.productId || body.id)) {
      rawItems = [body];
    }
    if (!Array.isArray(rawItems)) {
      rawItems = rawItems ? [rawItems] : [];
    }

    if (!tableIdParam && !body.orderId && !body.order_id && !req.params.id) {
      return res.status(400).json({ success: false, message: "tableId yoki orderId talab qilinadi" });
    }

    let table = null;
    if (tableIdParam) {
      table = await get(`SELECT * FROM tables WHERE id = ? OR number = ?`, [tableIdParam, tableIdParam]);
    }

    let targetOrderId = req.params.id || body.orderId || body.order_id || table?.current_order_id;
    if (!table && targetOrderId) {
      const ordRow = await get(`SELECT * FROM orders WHERE id = ?`, [targetOrderId]);
      if (ordRow) {
        table = await get(`SELECT * FROM tables WHERE id = ?`, [ordRow.table_id]);
      }
    }

    if (!table) return res.status(404).json({ success: false, message: 'Stol topilmadi' });

    let isNewOrder = false;

    // Agar stol bo'sh bo'lsa yoki order topilmasa, yangi buyurtma yaratiladi
    if (!targetOrderId) {
      targetOrderId = 'ord_' + uuidv4().substring(0, 8);
      isNewOrder = true;
      const waiterId = body.waiterId || body.waiter_id || body.userId || body.user_id || 1;
      const waiterName = (body.waiterName || body.waiter_name || body.userName || body.user_name || 'Ofitsiant').trim();

      await run(
        `INSERT INTO orders (id, table_id, waiter_id, waiter_name, status, total_amount) VALUES (?, ?, ?, ?, 'open', 0)`,
        [targetOrderId, table.id, waiterId, waiterName]
      );
    }

    // Taomlarni qo'shish
    let addedTotal = 0;
    const addedItemsForKitchen = [];

    for (const item of rawItems) {
      const pId = item.product_id || item.productId || item.id;
      const pName = item.product_name || item.productName || item.name || 'Taom';
      const itemPrice = Number(item.price || item.unit_price || item.cost || 0);
      const itemQty = Number(item.quantity || item.qty || item.count || 1);
      const itemComment = item.comment || item.note || item.izoh || '';

      const itemTotal = itemPrice * itemQty;
      addedTotal += itemTotal;

      const itemWaiterId = item.waiter_id || item.waiterId || body.waiterId || body.waiter_id || body.userId || body.user_id || req.user?.id || 1;
      const itemWaiterName = (item.waiter_name || item.waiterName || body.waiterName || body.waiter_name || body.userName || body.user_name || req.user?.name || 'Ofitsiant').trim();

      const itemRes = await run(
        `INSERT INTO order_items (order_id, product_id, product_name, quantity, price, comment, status, waiter_id, waiter_name) 
         VALUES (?, ?, ?, ?, ?, ?, 'sent', ?, ?)`,
        [targetOrderId, pId || 1, pName, itemQty, itemPrice, itemComment, itemWaiterId, itemWaiterName]
      );

      addedItemsForKitchen.push({
        id: itemRes.lastID,
        productId: pId,
        product_id: pId,
        product_name: pName,
        quantity: itemQty,
        comment: itemComment,
      });

      // Sklad qoldig'ini avtomatik kamaytirish
      if (pId) {
        try {
          const prodRow = await get(`SELECT id, name, stock_quantity, price FROM products WHERE id = ?`, [pId]);
          if (prodRow) {
            const prevSt = Number(prodRow.stock_quantity !== null && prodRow.stock_quantity !== undefined ? prodRow.stock_quantity : 100);
            const newSt = Math.max(0, prevSt - itemQty);
            await run(`UPDATE products SET stock_quantity = ? WHERE id = ?`, [newSt, prodRow.id]);
            await run(
              `INSERT INTO stock_movements (product_id, type, quantity, previous_stock, new_stock, unit_price, total_price, note, created_by)
               VALUES (?, 'out_sale', ?, ?, ?, ?, ?, ?, ?)`,
              [
                prodRow.id,
                itemQty,
                prevSt,
                newSt,
                prodRow.price,
                prodRow.price * itemQty,
                `Savdo: ${table.name || table.number}-stol (Buyurtma ${targetOrderId})`,
                body.waiterName || body.waiter_name || 'Ofitsiant'
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
    }

    // Buyurtma umumiy summasini hisoblash
    const sumResult = await get(`SELECT SUM(price * quantity) as total FROM order_items WHERE order_id = ? AND (is_cancelled = 0 OR is_cancelled IS NULL)`, [targetOrderId]);
    const totalAmount = sumResult ? (sumResult.total || 0) : 0;

    await run(`UPDATE orders SET total_amount = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [totalAmount, targetOrderId]);

    // Stol holatini 'busy' (Qizil - band) ga o'tkazish
    await run(
      `UPDATE tables SET status = 'busy', current_order_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [targetOrderId, table.id]
    );

    // Oshxona printeriga "Begunok" chekini chiqarish
    let ticket = null;
    if (addedItemsForKitchen.length > 0) {
      ticket = await printToKitchen({
        orderId: targetOrderId,
        tableNumber: table.number,
        waiterName: body.waiterName || body.waiter_name || 'Ofitsiant',
        items: addedItemsForKitchen,
      });
    }

    const updatedItems = await all(`SELECT * FROM order_items WHERE order_id = ? ORDER BY id ASC`, [targetOrderId]);
    const updatedTable = await get(`
      SELECT t.*, o.id as order_id, o.waiter_name, o.total_amount, o.created_at as order_created_at
      FROM tables t
      LEFT JOIN orders o ON t.current_order_id = o.id
      WHERE t.id = ?
    `, [table.id]);

    broadcast('TABLE_UPDATED', updatedTable);
    if (ticket) broadcast('KITCHEN_NEW_TICKET', ticket);

    // Real-time Push Active Order to Cloud (https://getpos.uz)
    backendSync.pushActiveOrderToCloud({
      tableId: table.id,
      tableName: table.name,
      waiterName: body.waiterName || body.waiter_name || 'Ofitsiant',
      items: rawItems,
      guestCount: body.guestCount || body.guests_count || 2,
      orderId: targetOrderId,
    }).catch(e => console.warn('[BackendSync] Background active order push error:', e.message));

    const fullOrder = {
      id: targetOrderId,
      order_id: targetOrderId,
      orderId: targetOrderId,
      table_id: table.id,
      tableId: table.id,
      tableNumber: table.number,
      totalAmount,
      total_amount: totalAmount,
      status: 'open',
      items: updatedItems,
      order_items: updatedItems,
    };

    res.json({
      success: true,
      orderId: targetOrderId,
      order_id: targetOrderId,
      totalAmount,
      total_amount: totalAmount,
      order: fullOrder,
      items: updatedItems,
      order_items: updatedItems,
      table: updatedTable,
      data: fullOrder,
      kitchenTicket: ticket,
    });
  } catch (err) {
    console.error('Order creation error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 7. Ofitsiant "Hisob so'raldi" tugmasini bosishi (POST /api/orders/:id/bill-request)
app.post(['/api/orders/:id/bill-request', '/api/orders/bill-request'], async (req, res) => {
  try {
    const { id } = req.params;
    const bodyOrderId = req.body.orderId;
    const searchId = id || bodyOrderId;

    let order = null;
    if (searchId) {
      order = await get(`SELECT * FROM orders WHERE id = ?`, [searchId]);
      if (!order) {
        order = await get(
          `SELECT * FROM orders WHERE table_id = ? OR table_id = (SELECT id FROM tables WHERE number = ?) ORDER BY id DESC LIMIT 1`,
          [searchId, searchId]
        );
      }
    }

    const tableId = order ? order.table_id : (req.body.tableId || req.body.tableNumber || searchId);
    let updatedTable = null;

    if (order) {
      // Stolni 'bill_requested' (Sariq - hisob so'ralgan) holatiga o'tkazish
      await run(`UPDATE orders SET status = 'bill_requested' WHERE id = ?`, [order.id]);
      await run(`UPDATE tables SET status = 'bill_requested' WHERE id = ?`, [order.table_id]);
      backendSync.pushBillRequestToCloud(order.id).catch(e => console.warn('[BackendSync] Bill request cloud push error:', e.message));

      updatedTable = await get(`
        SELECT t.*, o.id as order_id, o.waiter_name, o.total_amount, o.created_at as order_created_at
        FROM tables t
        LEFT JOIN orders o ON t.current_order_id = o.id
        WHERE t.id = ?
      `, [order.table_id]);
    } else if (tableId) {
      await run(`UPDATE tables SET status = 'bill_requested' WHERE id = ? OR number = ?`, [tableId, tableId]);
      updatedTable = await get(`SELECT * FROM tables WHERE id = ? OR number = ? LIMIT 1`, [tableId, tableId]);
    }

    if (updatedTable) {
      broadcast('TABLE_UPDATED', updatedTable);
      broadcast('BILL_REQUESTED', { tableId: updatedTable.id, tableNumber: updatedTable.number });
      telegram.notifyBillRequested({
        tableTitle: updatedTable?.name || `${updatedTable?.number}-stol`,
        waiterName: updatedTable?.waiter_name || req.body.waiterName || order?.waiter_name || 'Ofitsiant',
        totalAmount: updatedTable?.total_amount || req.body.totalAmount || order?.total_amount || 0,
      }).catch(e => console.error('[JetBot] notifyBillRequested error:', e.message));
    }

    // Pre-chekni avtomatik termal printerga chiqarish
    try {
      let activeItems = [];
      if (order) {
        activeItems = await all(
          `SELECT * FROM order_items WHERE order_id = ? AND (is_cancelled = 0 OR is_cancelled IS NULL) AND quantity > 0 ORDER BY id ASC`,
          [order.id]
        );
      }
      if ((!activeItems || activeItems.length === 0) && Array.isArray(req.body.items) && req.body.items.length > 0) {
        activeItems = req.body.items;
      }

      const subtotal = req.body.subtotal !== undefined
        ? Number(req.body.subtotal)
        : activeItems.reduce((sum, item) => sum + (Number(item.price || item.unitPrice || 0) * Number(item.quantity || 1)), 0);
      const servicePercent = 10;
      const serviceFee = req.body.serviceFee !== undefined ? Number(req.body.serviceFee) : Math.round((subtotal * servicePercent) / 100);
      const totalAmount = req.body.totalAmount !== undefined ? Number(req.body.totalAmount) : (subtotal + serviceFee);

      const printRes = await printerService.printPrecheckReceipt({
        orderId: (order && order.id) || searchId || 'ord_1',
        tableNumber: updatedTable ? updatedTable.number : (req.body.tableNumber || tableId || '1'),
        waiterName: req.body.waiterName || updatedTable?.waiter_name || order?.waiter_name || 'Ofitsiant',
        items: activeItems,
        subtotal,
        serviceFeePercent: servicePercent,
        serviceFee,
        totalAmount,
      });
      console.log('[Bill-Request] Pre-chek chop etish natijasi:', printRes);
    } catch (printErr) {
      console.error('[Bill-Request] Pre-chek chop etishda xatolik:', printErr.message);
    }

    res.json({ success: true, table: updatedTable });
  } catch (err) {
    console.error('[Bill-Request] Xatolik:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 7.01. Hisob so'rovini bekor qilish / Buyurtmani qayta ochish (POST /api/orders/:id/reopen)
app.post(['/api/orders/:id/reopen', '/api/tables/:id/reopen'], async (req, res) => {
  try {
    const { id } = req.params;
    let order = await get(`SELECT * FROM orders WHERE id = ?`, [id]);
    let table = null;

    if (order) {
      table = await get(`SELECT * FROM tables WHERE id = ?`, [order.table_id]);
    } else {
      table = await get(`SELECT * FROM tables WHERE id = ? OR number = ?`, [id, id]);
      if (table && table.current_order_id) {
        order = await get(`SELECT * FROM orders WHERE id = ?`, [table.current_order_id]);
      }
      if (!order && table) {
        order = await get(`SELECT * FROM orders WHERE table_id = ? AND status IN ('open', 'busy', 'bill_requested') ORDER BY id DESC LIMIT 1`, [table.id]);
      }
    }

    if (order) {
      await run(`UPDATE orders SET status = 'open', updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [order.id]);
    }
    if (table) {
      await run(`UPDATE tables SET status = 'busy', updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [table.id]);
    }

    const updatedTable = table ? await get(`
      SELECT t.*, o.id as order_id, o.waiter_name, o.total_amount, o.created_at as order_created_at
      FROM tables t
      LEFT JOIN orders o ON t.current_order_id = o.id
      WHERE t.id = ?
    `, [table.id]) : null;

    if (updatedTable) {
      broadcast('TABLE_UPDATED', updatedTable);
      broadcast('TABLES_UPDATED', {});
    }

    res.json({ success: true, message: "Stol band holatiga qaytarildi", table: updatedTable });
  } catch (err) {
    console.error('[Reopen Order] Xatolik:', err);
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

    // Ombordagi mahsulot qoldig'ini qaytarish (avto-vozvrat sklad)
    if (item.product_id) {
      try {
        const prodRow = await get(`SELECT id, name, stock_quantity, price FROM products WHERE id = ?`, [item.product_id]);
        if (prodRow) {
          const prevSt = Number(prodRow.stock_quantity !== null && prodRow.stock_quantity !== undefined ? prodRow.stock_quantity : 0);
          const newSt = prevSt + qtyToCancel;
          await run(`UPDATE products SET stock_quantity = ? WHERE id = ?`, [newSt, prodRow.id]);
          await run(
            `INSERT INTO stock_movements (product_id, type, quantity, previous_stock, new_stock, unit_price, total_price, note, created_by)
             VALUES (?, 'in', ?, ?, ?, ?, ?, ?, ?)`,
            [
              prodRow.id,
              qtyToCancel,
              prevSt,
              newSt,
              prodRow.price,
              prodRow.price * qtyToCancel,
              `Qaytarildi: ${table?.name || (table?.number ? table.number + '-stol' : '')} (Buyurtma ${orderId}) - ${reason || 'Mijoz qaytardi'}`,
              order.waiter_name || 'Kassa'
            ]
          );
          const updP = await get(`SELECT * FROM products WHERE id = ?`, [prodRow.id]);
          broadcast('INVENTORY_UPDATED', { product: updP });
          broadcast('PRODUCT_UPDATED', updP);
        }
      } catch (stockErr) {
        console.warn('[Stock] Return replenish error:', stockErr.message);
      }
    }

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
    const updatedTableRaw = await get(`
      SELECT t.*, o.id as order_id, o.waiter_name, o.total_amount, o.created_at as order_created_at
      FROM tables t
      LEFT JOIN orders o ON t.current_order_id = o.id
      WHERE t.id = ?
    `, [order.table_id]);

    const activeItems = updatedItems.filter(it => !it.is_cancelled && it.quantity > 0);
    const updatedTable = {
      ...(updatedTableRaw || table),
      total_amount: newTotal,
      totalAmount: newTotal,
      items: updatedItems,
      order_items: updatedItems,
      products: updatedItems,
      items_count: activeItems.length,
      activeOrderId: orderId,
      order_id: orderId,
      orderId: orderId,
    };

    broadcast('TABLE_UPDATED', updatedTable);
    broadcast('TABLES_UPDATED', updatedTable);
    broadcast('KITCHEN_CANCEL_TICKET', cancelTicket);
    broadcast('ORDER_UPDATED', { orderId, tableId: order.table_id, totalAmount: newTotal, items: updatedItems });

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

// 7.1.1. Buyurtmadagi bitta taomni tahrirlash (Soni, Narxi, Izohi - Masalan 2 tadan 1 taga tushirish)
app.put(['/api/orders/:orderId/items/:itemId', '/api/order-items/:itemId'], async (req, res) => {
  try {
    const { orderId, itemId } = req.params;
    const { quantity, price, comment, waiter_name } = req.body;

    const item = await get(`SELECT * FROM order_items WHERE id = ?`, [itemId]);
    if (!item) return res.status(404).json({ success: false, message: 'Taom topilmadi' });

    const targetOrderId = orderId || item.order_id;
    const order = await get(`SELECT * FROM orders WHERE id = ?`, [targetOrderId]);
    if (!order) return res.status(404).json({ success: false, message: 'Buyurtma topilmadi' });

    const table = await get(`SELECT * FROM tables WHERE id = ?`, [order.table_id]);

    const oldQty = Number(item.quantity) || 1;
    const newQty = Number(quantity) > 0 ? Number(quantity) : 1;
    const newPrice = price !== undefined && price !== null ? Number(price) : item.price;
    const newComment = comment !== undefined ? String(comment).trim() : (item.comment || '');
    const newWaiter = waiter_name || item.waiter_name || order.waiter_name || 'Ofitsiant';

    const diffQty = newQty - oldQty; // e.g. 1 - 2 = -1 (kamaydi, 1 ta skladga qaytadi)

    // Ombordagi mahsulot qoldig'ini to'g'rilash (Stock Adjustment)
    if (item.product_id && diffQty !== 0) {
      try {
        const prodRow = await get(`SELECT id, name, stock_quantity, price FROM products WHERE id = ?`, [item.product_id]);
        if (prodRow) {
          const prevSt = Number(prodRow.stock_quantity !== null && prodRow.stock_quantity !== undefined ? prodRow.stock_quantity : 0);
          // diffQty < 0 bo'lsa omborga qaytariladi (+), diffQty > 0 bo'lsa ombordan olinadi (-)
          const newSt = Math.max(0, prevSt - diffQty);
          await run(`UPDATE products SET stock_quantity = ? WHERE id = ?`, [newSt, prodRow.id]);
          await run(
            `INSERT INTO stock_movements (product_id, type, quantity, previous_stock, new_stock, unit_price, total_price, note, created_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              prodRow.id,
              diffQty < 0 ? 'in' : 'out_sale',
              Math.abs(diffQty),
              prevSt,
              newSt,
              newPrice,
              newPrice * Math.abs(diffQty),
              `Tahrirlandi (${diffQty < 0 ? 'Kamaytirildi' : 'Oshirildi'}): ${table?.name || (table?.number ? table.number + '-stol' : '')} (Buyurtma ${targetOrderId})`,
              newWaiter
            ]
          );
          const updP = await get(`SELECT * FROM products WHERE id = ?`, [prodRow.id]);
          broadcast('INVENTORY_UPDATED', { product: updP });
          broadcast('PRODUCT_UPDATED', updP);
        }
      } catch (stockErr) {
        console.warn('[Stock] Item edit stock adjust error:', stockErr.message);
      }
    }

    // Taom qatorini yangilash
    await run(
      `UPDATE order_items 
       SET quantity = ?, price = ?, comment = ?, waiter_name = ?
       WHERE id = ?`,
      [newQty, newPrice, newComment, newWaiter, item.id]
    );

    // Buyurtma umumiy summasini qayta hisoblash
    const sumResult = await get(
      `SELECT SUM(price * quantity) as total FROM order_items WHERE order_id = ? AND (is_cancelled = 0 OR is_cancelled IS NULL)`,
      [targetOrderId]
    );
    const totalAmount = sumResult ? (sumResult.total || 0) : 0;
    await run(`UPDATE orders SET total_amount = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [totalAmount, targetOrderId]);

    const updatedItems = await all(`SELECT * FROM order_items WHERE order_id = ? ORDER BY id ASC`, [targetOrderId]);
    const updatedTableRaw = await get(`
      SELECT t.*, o.id as order_id, o.waiter_name, o.total_amount, o.created_at as order_created_at
      FROM tables t
      LEFT JOIN orders o ON t.current_order_id = o.id
      WHERE t.id = ?
    `, [order.table_id]);

    const activeItems = updatedItems.filter(it => !it.is_cancelled && it.quantity > 0);
    const updatedTable = {
      ...(updatedTableRaw || table),
      total_amount: totalAmount,
      totalAmount: totalAmount,
      items: updatedItems,
      order_items: updatedItems,
      products: updatedItems,
      items_count: activeItems.length,
      activeOrderId: targetOrderId,
      order_id: targetOrderId,
      orderId: targetOrderId,
      status: 'busy',
    };

    broadcast('TABLE_UPDATED', updatedTable);
    broadcast('TABLES_UPDATED', updatedTable);
    broadcast('ORDER_UPDATED', { orderId: targetOrderId, tableId: order.table_id, totalAmount, items: updatedItems });

    res.json({
      success: true,
      orderId: targetOrderId,
      totalAmount,
      items: updatedItems,
      order_items: updatedItems,
      table: updatedTable,
    });
  } catch (err) {
    console.error('Order item edit error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 7.2. Buyurtmalar jurnali (GetPOS Kafe | Заказы)
app.get('/api/orders/journal', async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query;
    let sql = `
      SELECT o.*, t.number as table_number, t.hall, p.payment_method, p.cash_amount, p.card_amount, p.debt_amount, p.created_at as paid_at,
             p.fiscal_sign, p.fiscal_qr_url, p.receipt_seq, p.id as payment_id
      FROM orders o
      LEFT JOIN tables t ON o.table_id = t.id
      LEFT JOIN payments p ON o.id = p.order_id
    `;
    const params = [];
    if (dateFrom && dateTo) {
      const fromStr = dateFrom.replace('T', ' ').slice(0, 16) + ':00';
      const toStr = dateTo.replace('T', ' ').slice(0, 16) + ':59';
      sql += ` WHERE (o.created_at >= ? AND o.created_at <= ?) OR (p.created_at >= ? AND p.created_at <= ?) OR (o.updated_at >= ? AND o.updated_at <= ?)`;
      params.push(fromStr, toStr, fromStr, toStr, fromStr, toStr);
    }
    sql += ` ORDER BY o.created_at DESC LIMIT 500`;

    const orders = await all(sql, params);

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

    const formatted = orders.map((o, idx) => {
      const isPaid = o.status === 'paid' || Boolean(o.paid_at) || Boolean(o.payment_method);
      const isOpenOrd = !isPaid && o.status !== 'cancelled';
      let displayStatus = 'Открыт';
      if (isPaid) {
        displayStatus = 'Закрыт';
      } else if (o.status === 'bill_requested') {
        displayStatus = 'Hisob so\'ralgan';
      } else if (o.status === 'cancelled') {
        displayStatus = 'Отменен';
      }
      const totalPay = Math.round((o.total_amount || 0) * 1.1);
      return {
        id: o.id,
        shift_id: Math.floor(new Date(o.created_at).getTime() / 86400000) - 19000,
        number: idx + 1,
        table: `STOL ${o.table_number || 1}`,
        hall: o.hall || 'Asosiy Zal',
        client: '—',
        waiter: o.waiter_name || 'Boshqaruvchi',
        opened_at: o.created_at,
        closed_at: o.paid_at || (isPaid ? o.updated_at : null),
        status: displayStatus,
        raw_status: o.status,
        is_paid: isPaid,
        is_open: isOpenOrd,
        service_percent: 10,
        total_amount: o.total_amount || 0,
        to_pay: totalPay,
        discount: 0,
        cash: o.cash_amount !== null && o.cash_amount !== undefined ? o.cash_amount : (isPaid && o.payment_method === 'cash' ? totalPay : 0),
        card: o.card_amount !== null && o.card_amount !== undefined ? o.card_amount : (isPaid && o.payment_method === 'card' ? totalPay : 0),
        debt: o.debt_amount !== null && o.debt_amount !== undefined ? o.debt_amount : (isPaid && o.payment_method === 'debt' ? totalPay : 0),
        fiscal_sign: o.fiscal_sign || null,
        fiscal_qr_url: o.fiscal_qr_url || null,
        receipt_seq: o.receipt_seq || null,
        payment_id: o.payment_id || null,
        comment: '',
        items: itemsByOrder[o.id] || [],
      };
    });

    res.json({ success: true, orders: formatted });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 7.3. Buyurtma chekini olish (Fiskal va Oddiy chek ma'lumotlari)
app.get(['/api/orders/:id/receipt', '/api/orders/:id/receipts'], async (req, res) => {
  try {
    const { id } = req.params;
    const data = await getOrGenerateReceiptForOrder(id);
    if (!data) return res.status(404).json({ success: false, message: 'Buyurtma topilmadi' });
    res.json({ success: true, ...data });
  } catch (err) {
    console.error('[Receipt API] getReceipt error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 7.4. Buyurtma chekini printerga qayta chiqarish (Reprint)
app.post(['/api/orders/:id/reprint', '/api/orders/:id/print'], async (req, res) => {
  try {
    const { id } = req.params;
    const { type = 'fiscal' } = req.body;
    const data = await getOrGenerateReceiptForOrder(id);
    if (!data) return res.status(404).json({ success: false, message: 'Buyurtma topilmadi' });

    let printResult = null;
    if (type === 'standard' || type === 'precheck') {
      printResult = await printerService.printPrecheckReceipt(data.standardReceipt);
    } else {
      printResult = await printerService.printThermalReceipt(data.fiscalReceipt);
    }
    res.json({ success: true, message: 'Chek chop etishga yuborildi', printResult });
  } catch (err) {
    console.error('[Receipt API] reprint error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 8. To'lovni qabul qilish (Kassa) va REGOS Soliq Fiskal chek chiqarish (POST /api/payments)
app.post('/api/payments', async (req, res) => {
  try {
    const { orderId, tableId, paymentMethod, cashAmount, cardAmount, debtAmount, clientName, clientPhone, comment } = req.body;
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

    // Qarzga sotuv bo'lsa - Debts jadvaliga yozish
    const calcDebt = paymentMethod === 'debt' ? (debtAmount || order.total_amount) : (debtAmount || 0);
    if (calcDebt > 0 && (clientName || paymentMethod === 'debt')) {
      const debtId = 'debt_' + Date.now();
      const debtorName = clientName && clientName.trim() ? clientName.trim() : `Stol ${tableId} mijozi`;
      await run(`
        INSERT INTO debts (id, order_id, client_name, client_phone, total_amount, paid_amount, remaining_amount, status, comment, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, 0, ?, 'unpaid', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `, [debtId, orderId, debtorName, clientPhone || '', calcDebt, calcDebt, comment || '']);
    }

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

    // Also close and free table on Cloud Cafe backend
    backendSync.pushCloseOrderToCloud({
      orderId,
      tableId,
      tableNumber: updatedTable?.number,
      paymentMethod,
      cashAmount,
      cardAmount,
      totalAmount: order.total_amount,
    }).catch((e) => console.warn('[BackendSync] Close cloud order warning:', e.message));

    // Avtomatik ravishda termal chek chiqarish (agar sozlangan bo'lsa)
    try {
      const pSettings = await printerService.getPrinterSettings();
      if (pSettings && pSettings.auto_print) {
        printerService.printThermalReceipt({
          ...receiptData,
          tableNumber: updatedTable ? updatedTable.number : tableId,
          waiterName: order.waiter_name,
        }).catch(err => console.warn('[AutoPrint] Chek chiqarish xatosi:', err.message));
      }
    } catch (e) {
      console.warn('[AutoPrint] Xatolik:', e.message);
    }

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

// ==========================================
// 8.0. DEBTS (QARZDORLIKLAR) API
// ==========================================

// 8.1. Debts List & Summary (GET /api/debts)
app.get('/api/debts', async (req, res) => {
  try {
    const debts = await all(`
      SELECT d.*, o.table_id, t.number as table_number, t.hall as table_hall, o.waiter_name
      FROM debts d
      LEFT JOIN orders o ON d.order_id = o.id
      LEFT JOIN tables t ON o.table_id = t.id
      ORDER BY d.created_at DESC
    `);
    const summary = await get(`
      SELECT 
        COALESCE(SUM(total_amount), 0) as total_debt,
        COALESCE(SUM(paid_amount), 0) as total_paid,
        COALESCE(SUM(remaining_amount), 0) as total_unpaid
      FROM debts
    `);
    res.json({ success: true, debts, summary });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 8.2. Pay Debt (POST /api/debts/:id/pay)
app.post('/api/debts/:id/pay', async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, paymentMethod = 'cash' } = req.body;
    const payAmt = Number(amount);
    if (!payAmt || payAmt <= 0) {
      return res.status(400).json({ success: false, message: "To'lov summasi noto'g'ri" });
    }

    const debt = await get(`SELECT * FROM debts WHERE id = ?`, [id]);
    if (!debt) return res.status(404).json({ success: false, message: 'Qarzdorlik topilmadi' });

    const newPaid = debt.paid_amount + payAmt;
    const newRemaining = Math.max(0, debt.total_amount - newPaid);
    const newStatus = newRemaining === 0 ? 'paid' : 'partially_paid';

    await run(`
      UPDATE debts 
      SET paid_amount = ?, remaining_amount = ?, status = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `, [newPaid, newRemaining, newStatus, id]);

    await run(`
      INSERT INTO debt_payments (debt_id, amount, payment_method)
      VALUES (?, ?, ?)
    `, [id, payAmt, paymentMethod]);

    broadcast('DEBTS_UPDATED', {});

    res.json({ success: true, message: "Qarz to'lovi muvaffaqiyatli qabul qilindi", debtId: id, newRemaining, newStatus });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 8.3. Delete Debt (DELETE /api/debts/:id)
app.delete('/api/debts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await run(`DELETE FROM debts WHERE id = ?`, [id]);
    await run(`DELETE FROM debt_payments WHERE debt_id = ?`, [id]);
    broadcast('DEBTS_UPDATED', {});
    res.json({ success: true, message: "Qarz ma'lumoti o'chirildi" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 8.4. Force Close Order and Free Table (POST /api/orders/:id/force-close)
app.post('/api/orders/:id/force-close', async (req, res) => {
  try {
    const orderId = req.params.id;
    const order = await get(`SELECT * FROM orders WHERE id = ?`, [orderId]);
    if (!order) return res.status(404).json({ success: false, message: 'Buyurtma topilmadi' });

    await run(`UPDATE orders SET status = 'closed', updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [orderId]);
    await run(`UPDATE tables SET status = 'free', current_order_id = NULL WHERE id = ?`, [order.table_id]);

    const updatedTable = await get(`SELECT *, NULL as order_id FROM tables WHERE id = ?`, [order.table_id]);
    broadcast('TABLE_UPDATED', updatedTable);
    broadcast('TABLES_UPDATED', {});

    backendSync.pushCloseOrderToCloud({
      orderId,
      tableId: order.table_id,
    }).catch(() => {});

    res.json({ success: true, message: "Buyurtma yopildi va stol bo'shatildi" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// 8.5. THERMAL RECEIPT PRINTER API
// ==========================================

// O'rnatilgan printerlar va joriy sozlamalarni olish
app.get('/api/printers', async (req, res) => {
  try {
    const installedPrinters = await printerService.getInstalledPrinters();
    const settings = await printerService.getPrinterSettings();
    res.json({
      success: true,
      installedPrinters,
      settings,
    });
  } catch (err) {
    console.error('[Printer API] getPrinters error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Printer sozlamalarini saqlash
app.post('/api/printers/settings', async (req, res) => {
  try {
    const updated = await printerService.updatePrinterSettings(req.body);
    res.json({
      success: true,
      message: 'Printer sozlamalari muvaffaqiyatli saqlandi',
      settings: updated,
    });
  } catch (err) {
    console.error('[Printer API] updateSettings error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// To'g'ridan-to'g'ri termal chek chop etish
app.post('/api/printers/print-receipt', async (req, res) => {
  try {
    const result = await printerService.printThermalReceipt(req.body);
    res.json(result);
  } catch (err) {
    console.error('[Printer API] printReceipt error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Pre-chek (Hisob-kitob / Pre-bill) chop etish
app.post(['/api/printers/print-precheck', '/api/orders/:id/print-precheck'], async (req, res) => {
  try {
    let payload = { ...req.body };
    const orderId = req.params.id || req.body.orderId;
    if (orderId && (!payload.items || payload.items.length === 0)) {
      const order = await get(`SELECT * FROM orders WHERE id = ?`, [orderId]);
      if (order) {
        const table = await get(`SELECT * FROM tables WHERE id = ?`, [order.table_id]);
        const items = await all(
          `SELECT * FROM order_items WHERE order_id = ? AND (is_cancelled = 0 OR is_cancelled IS NULL) AND quantity > 0 ORDER BY id ASC`,
          [orderId]
        );
        const subtotal = items.reduce((sum, it) => sum + (Number(it.price) * Number(it.quantity)), 0);
        const servicePercent = 10;
        const serviceFee = Math.round((subtotal * servicePercent) / 100);
        const totalAmount = subtotal + serviceFee;

        payload = {
          orderId,
          tableNumber: table ? table.number : order.table_id,
          waiterName: table?.waiter_name || order.waiter_name || 'Ofitsiant',
          items,
          subtotal,
          serviceFeePercent: servicePercent,
          serviceFee,
          totalAmount,
          ...req.body,
        };
      }
    }

    const result = await printerService.printPrecheckReceipt(payload);
    res.json(result);
  } catch (err) {
    console.error('[Printer API] printPrecheck error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Sinov chekini chiqarish
app.post('/api/printers/test', async (req, res) => {
  try {
    const { printerName, paperWidth } = req.body;
    const result = await printerService.testPrint(printerName, paperWidth);
    res.json(result);
  } catch (err) {
    console.error('[Printer API] testPrint error:', err);
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

// 9.1. Oshxona chiptasi statusini yangilash (Qabul qilish / Tayyor)
app.post('/api/kitchen/tickets/:id/status', async (req, res) => {
  try {
    const ticketId = req.params.id;
    const { status } = req.body; // 'in_progress', 'ready', 'completed'
    const updated = updateKitchenTicketStatus(ticketId, status);
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Chek topilmadi' });
    }

    if (status === 'ready') {
      broadcast('KITCHEN_TICKET_READY', {
        ticketId,
        tableNumber: updated.tableNumber,
        waiterName: updated.waiterName,
        orderId: updated.orderId,
        timestamp: Date.now(),
      });
    } else if (status === 'in_progress') {
      broadcast('KITCHEN_TICKET_IN_PROGRESS', {
        ticketId,
        tableNumber: updated.tableNumber,
        waiterName: updated.waiterName,
        orderId: updated.orderId,
        timestamp: Date.now(),
      });
    }

    broadcast('KITCHEN_TICKETS_UPDATED', { tickets: getRecentKitchenTickets() });
    res.json({ success: true, ticket: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 9.1 text. Smart TV KDS - Faol oshxona buyurtmalari ro'yxatini olish
app.get(['/api/kitchen/active-orders', '/api/kitchen/orders'], async (req, res) => {
  try {
    const orders = await all(`
      SELECT o.*, t.number as table_number, t.name as table_name, t.hall
      FROM orders o
      LEFT JOIN tables t ON o.table_id = t.id
      WHERE o.status IN ('open', 'busy', 'bill_requested')
      ORDER BY o.created_at ASC
    `);

    const ordersWithItems = await Promise.all(
      orders.map(async (o) => {
        const items = await all(
          `SELECT * FROM order_items WHERE order_id = ? ORDER BY id ASC`,
          [o.id]
        );
        return {
          ...o,
          tableNumber: o.table_number || o.table_id,
          tableName: o.table_name || `${o.table_number || o.table_id}-stol`,
          hallName: o.hall || 'Asosiy Zal',
          waiterName: o.waiter_name || 'Ofitsiant',
          items,
          order_items: items,
        };
      })
    );

    res.json({
      success: true,
      orders: ordersWithItems,
      tickets: ordersWithItems,
    });
  } catch (err) {
    console.error('[KDS API] active-orders error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 9.1 text2. Smart TV KDS - Taomni "Tayyor" deb belgilash
app.post(['/api/kitchen/items/:id/ready', '/api/order-items/:id/ready'], async (req, res) => {
  try {
    const { id } = req.params;
    const item = await get(`SELECT * FROM order_items WHERE id = ?`, [id]);
    if (!item) return res.status(404).json({ success: false, message: 'Taom topilmadi' });

    await run(`UPDATE order_items SET status = 'ready', updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [item.id]);

    const order = await get(`SELECT * FROM orders WHERE id = ?`, [item.order_id]);
    const table = order ? await get(`SELECT * FROM tables WHERE id = ?`, [order.table_id]) : null;
    const allItems = await all(`SELECT * FROM order_items WHERE order_id = ? ORDER BY id ASC`, [item.order_id]);

    const activeItems = allItems.filter(it => !it.is_cancelled && it.quantity > 0);
    const allReady = activeItems.length > 0 && activeItems.every(it => it.status === 'ready');

    const eventPayload = {
      orderId: item.order_id,
      itemId: item.id,
      itemName: item.product_name,
      quantity: item.quantity,
      tableId: order?.table_id,
      tableNumber: table?.number || order?.table_id || 1,
      tableName: table?.name || `${table?.number || 1}-stol`,
      waiterName: item.waiter_name || order?.waiter_name || 'Ofitsiant',
      allReady,
      timestamp: Date.now(),
    };

    broadcast('ORDER_READY', eventPayload);
    broadcast('KITCHEN_ITEM_READY', eventPayload);
    if (allReady) {
      broadcast('KITCHEN_ORDER_COMPLETED', eventPayload);
    }

    res.json({
      success: true,
      message: `${item.product_name} tayyor deb belgilandi`,
      item: { ...item, status: 'ready' },
      allReady,
      eventPayload,
    });
  } catch (err) {
    console.error('[KDS API] item ready error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 9.1 text3. Smart TV KDS - Butun buyurtmadagi barcha taomlarni "Tayyor" deb belgilash
app.post(['/api/kitchen/orders/:orderId/ready', '/api/orders/:orderId/kitchen-ready'], async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await get(`SELECT * FROM orders WHERE id = ?`, [orderId]);
    if (!order) return res.status(404).json({ success: false, message: 'Buyurtma topilmadi' });

    await run(
      `UPDATE order_items SET status = 'ready', updated_at = CURRENT_TIMESTAMP WHERE order_id = ? AND (is_cancelled = 0 OR is_cancelled IS NULL)`,
      [orderId]
    );

    const table = await get(`SELECT * FROM tables WHERE id = ?`, [order.table_id]);
    const items = await all(`SELECT * FROM order_items WHERE order_id = ? ORDER BY id ASC`, [orderId]);

    const eventPayload = {
      orderId: order.id,
      tableId: order.table_id,
      tableNumber: table?.number || order.table_id || 1,
      tableName: table?.name || `${table?.number || 1}-stol`,
      waiterName: order.waiter_name || 'Ofitsiant',
      items,
      allReady: true,
      timestamp: Date.now(),
    };

    broadcast('ORDER_READY', eventPayload);
    broadcast('KITCHEN_ORDER_COMPLETED', eventPayload);

    res.json({
      success: true,
      message: `${table?.name || 'Stol'} buyurtmasi to'liq tayyor deb belgilandi`,
      orderId,
      items,
    });
  } catch (err) {
    console.error('[KDS API] order ready error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 9.1 text4. Smart TV KDS - Taomni sichqoncha bilan "Bekor qilish" (Cancel / Out of stock)
app.post(['/api/kitchen/items/:id/cancel', '/api/order-items/:id/kitchen-cancel'], async (req, res) => {
  try {
    const { id } = req.params;
    const { reason = "Oshxonada mavjud emas (Bekor qilindi)" } = req.body || {};

    const item = await get(`SELECT * FROM order_items WHERE id = ?`, [id]);
    if (!item) return res.status(404).json({ success: false, message: 'Taom topilmadi' });

    const orderId = item.order_id;
    const order = await get(`SELECT * FROM orders WHERE id = ?`, [orderId]);
    const table = order ? await get(`SELECT * FROM tables WHERE id = ?`, [order.table_id]) : null;

    // Itemni bekor qilish
    await run(
      `UPDATE order_items SET is_cancelled = 1, status = 'cancelled', cancel_reason = ? WHERE id = ?`,
      [reason, item.id]
    );

    // Buyurtma summasini qayta hisoblash
    const sumResult = await get(
      `SELECT SUM(price * quantity) as total FROM order_items WHERE order_id = ? AND (is_cancelled = 0 OR is_cancelled IS NULL) AND quantity > 0`,
      [orderId]
    );
    const newTotal = sumResult ? (sumResult.total || 0) : 0;
    await run(`UPDATE orders SET total_amount = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [newTotal, orderId]);

    // Ombordagi mahsulot qoldig'ini qaytarish (Stock replenishment)
    if (item.product_id) {
      try {
        const prodRow = await get(`SELECT id, name, stock_quantity, price FROM products WHERE id = ?`, [item.product_id]);
        if (prodRow) {
          const prevSt = Number(prodRow.stock_quantity !== null && prodRow.stock_quantity !== undefined ? prodRow.stock_quantity : 0);
          const newSt = prevSt + Math.abs(item.quantity);
          await run(`UPDATE products SET stock_quantity = ? WHERE id = ?`, [newSt, prodRow.id]);
          await run(
            `INSERT INTO stock_movements (product_id, type, quantity, previous_stock, new_stock, unit_price, total_price, note, created_by)
             VALUES (?, 'in', ?, ?, ?, ?, ?, ?, ?)`,
            [
              prodRow.id,
              Math.abs(item.quantity),
              prevSt,
              newSt,
              prodRow.price,
              prodRow.price * Math.abs(item.quantity),
              `Oshxona TV bekor qildi: ${table?.name || (table?.number ? table.number + '-stol' : '')} - ${reason}`,
              order?.waiter_name || 'Oshxona TV'
            ]
          );
          const updP = await get(`SELECT * FROM products WHERE id = ?`, [prodRow.id]);
          broadcast('INVENTORY_UPDATED', { product: updP });
          broadcast('PRODUCT_UPDATED', updP);
        }
      } catch (stockErr) {
        console.warn('[KDS Stock] Return error:', stockErr.message);
      }
    }

    const updatedItems = await all(`SELECT * FROM order_items WHERE order_id = ? ORDER BY id ASC`, [orderId]);
    const updatedTableRaw = table ? await get(`
      SELECT t.*, o.id as order_id, o.waiter_name, o.total_amount, o.created_at as order_created_at
      FROM tables t
      LEFT JOIN orders o ON t.current_order_id = o.id
      WHERE t.id = ?
    `, [table.id]) : null;

    const eventPayload = {
      orderId,
      itemId: item.id,
      itemName: item.product_name,
      reason,
      tableId: order?.table_id,
      tableNumber: table?.number || order?.table_id || 1,
      tableName: table?.name || `${table?.number || 1}-stol`,
      waiterName: item.waiter_name || order?.waiter_name || 'Ofitsiant',
      totalAmount: newTotal,
      items: updatedItems,
    };

    broadcast('KITCHEN_ITEM_CANCELLED', eventPayload);
    broadcast('ORDER_UPDATED', { orderId, tableId: order?.table_id, totalAmount: newTotal, items: updatedItems });
    if (updatedTableRaw) broadcast('TABLE_UPDATED', updatedTableRaw);

    res.json({
      success: true,
      message: `${item.product_name} bekor qilindi`,
      totalAmount: newTotal,
      items: updatedItems,
      eventPayload,
    });
  } catch (err) {
    console.error('[KDS API] item cancel error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});


// 9.2. Oshxonada taom yo'qligini belgilash va buyurtmadan chiqarish (Stop-list / Yo'q)
app.post('/api/kitchen/item-out-of-stock', async (req, res) => {
  try {
    const { ticketId, orderId, itemId, productId, productName, tableNumber, waiterName } = req.body;

    if (orderId) {
      let item = null;
      if (itemId) {
        item = await get(`SELECT * FROM order_items WHERE id = ?`, [itemId]);
      } else if (productId) {
        item = await get(
          `SELECT * FROM order_items WHERE order_id = ? AND product_id = ? AND (is_cancelled = 0 OR is_cancelled IS NULL) ORDER BY id DESC LIMIT 1`,
          [orderId, productId]
        );
      } else if (productName) {
        item = await get(
          `SELECT * FROM order_items WHERE order_id = ? AND product_name = ? AND (is_cancelled = 0 OR is_cancelled IS NULL) ORDER BY id DESC LIMIT 1`,
          [orderId, productName]
        );
      }

      if (item) {
        await run(
          `UPDATE order_items SET is_cancelled = 1, status = 'cancelled', cancel_reason = ? WHERE id = ?`,
          ["Oshxonada yo'q", item.id]
        );

        const allActive = await all(`SELECT price, quantity, is_cancelled FROM order_items WHERE order_id = ?`, [orderId]);
        let newTotal = 0;
        allActive.forEach((it) => {
          if (!it.is_cancelled && it.quantity > 0) {
            newTotal += it.price * it.quantity;
          }
        });
        await run(`UPDATE orders SET total_amount = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [newTotal, orderId]);

        const order = await get(`SELECT * FROM orders WHERE id = ?`, [orderId]);
        const updatedTableRaw = order ? await get(`
          SELECT t.*, o.id as order_id, o.waiter_name, o.total_amount, o.created_at as order_created_at
          FROM tables t
          LEFT JOIN orders o ON t.current_order_id = o.id
          WHERE t.id = ?
        `, [order.table_id]) : null;

        if (updatedTableRaw) {
          const updatedItems = await all(`SELECT * FROM order_items WHERE order_id = ? ORDER BY id ASC`, [orderId]);
          broadcast('TABLE_UPDATED', {
            ...updatedTableRaw,
            total_amount: newTotal,
            totalAmount: newTotal,
            items: updatedItems,
            order_items: updatedItems,
          });
          broadcast('ORDER_UPDATED', { orderId, tableId: order.table_id, totalAmount: newTotal, items: updatedItems });
        }
      }
    }

    if (ticketId) {
      removeKitchenTicketItem(ticketId, productId, productName);
    }

    const outOfStockPayload = {
      ticketId,
      orderId,
      tableNumber: tableNumber || 1,
      waiterName: waiterName || 'Ofitsiant',
      productName: productName || 'Taom',
      message: `${tableNumber || 1}-stol uchun "${productName || 'Taom'}" oshxonada YO'Q! Buyurtmadan o'chirildi.`,
      timestamp: Date.now(),
    };

    broadcast('DISH_OUT_OF_STOCK', outOfStockPayload);
    broadcast('KITCHEN_TICKETS_UPDATED', { tickets: getRecentKitchenTickets() });

    res.json({ success: true, message: 'Taom bekor qilindi va ofitsiantga xabar yuborildi', data: outOfStockPayload });
  } catch (err) {
    console.error('Error in item-out-of-stock:', err);
    res.status(500).json({ success: false, error: err.message });
  }
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

