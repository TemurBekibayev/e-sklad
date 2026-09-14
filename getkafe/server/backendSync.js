// server/backendSync.js - Real Production Backend Sync Engine (https://amuhr.uz)
const https = require('https');
const http = require('http');
const { get, all, run } = require('./db');

let syncTimer = null;
let cachedAuthToken = null;

let lastSyncResult = {
  status: 'idle', // 'idle', 'synced', 'error'
  lastSyncTime: null,
  message: '',
  latencyMs: 0,
  usersSynced: 0,
  productsSynced: 0,
  ordersPushed: 0,
};

// Known default credentials for auto-authentication on amuhr.uz
const KNOWN_TENANT_MANAGERS = {
  '5322a772-e9db-402a-8d2b-6293edd03832': { userId: '447a1ad6-e23f-4dde-b4a2-d9256c7af5a7', pin: '1111', name: 'John' },
  '57341e59-3c24-409f-af62-9aaec212b689': { userId: 'e6010bbc-f81a-4b86-bc19-f059e1100fba', pin: '1111', name: 'Rustam' },
};

const KNOWN_USER_PINS = {
  '447a1ad6-e23f-4dde-b4a2-d9256c7af5a7': '1111', // John (Manager / Admin)
  '60612290-8399-4949-83f8-9f8216fab884': '2222', // Ali (Xodim / Waiter)
  'e6010bbc-f81a-4b86-bc19-f059e1100fba': '1111', // Rustam
};

// Generic HTTP/HTTPS request helper supporting redirects & timeouts
function makeRequest({ url, method = 'GET', headers = {}, body = null, timeoutMs = 8000 }) {
  return new Promise((resolve, reject) => {
    try {
      const parsedUrl = new URL(url);
      const isHttps = parsedUrl.protocol === 'https:';
      const transport = isHttps ? https : http;

      const reqHeaders = { ...headers };
      let postData = null;
      if (body) {
        postData = typeof body === 'string' ? body : JSON.stringify(body);
        if (!reqHeaders['Content-Type']) reqHeaders['Content-Type'] = 'application/json';
        reqHeaders['Content-Length'] = Buffer.byteLength(postData);
      }

      const options = {
        protocol: parsedUrl.protocol,
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (isHttps ? 443 : 80),
        path: parsedUrl.pathname + parsedUrl.search,
        method: method.toUpperCase(),
        headers: reqHeaders,
        timeout: timeoutMs,
      };

      const req = transport.request(options, (res) => {
        // Follow 301/302 redirects automatically
        if ((res.statusCode === 301 || res.statusCode === 302) && res.headers.location) {
          const redirectUrl = new URL(res.headers.location, url).toString();
          return makeRequest({ url: redirectUrl, method, headers, body, timeoutMs })
            .then(resolve)
            .catch(reject);
        }

        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          let parsedBody = null;
          try {
            parsedBody = JSON.parse(data);
          } catch (e) {
            parsedBody = data;
          }
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: parsedBody,
            raw: data,
          });
        });
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error(`Server so'rovi vaqti tugadi (${timeoutMs}ms)`));
      });

      req.on('error', (err) => reject(err));

      if (postData) req.write(postData);
      req.end();
    } catch (err) {
      reject(err);
    }
  });
}

// Get Config from DB
async function getConfig() {
  let cfg = await get(`SELECT * FROM backend_config WHERE id = 1`);
  if (!cfg) {
    await run(`
      INSERT INTO backend_config (id, api_url, tenant_id, tenant_name, auth_token, sync_interval, is_external_active)
      VALUES (1, 'https://amuhr.uz', '5322a772-e9db-402a-8d2b-6293edd03832', 'Test (Mangit)', '', 30, 1)
    `);
    cfg = await get(`SELECT * FROM backend_config WHERE id = 1`);
  }
  return cfg;
}

// Update Config
async function updateConfig({ api_url, tenant_id, tenant_name, auth_token, sync_interval, is_external_active }) {
  await run(`
    UPDATE backend_config
    SET api_url = COALESCE(?, api_url),
        tenant_id = COALESCE(?, tenant_id),
        tenant_name = COALESCE(?, tenant_name),
        auth_token = COALESCE(?, auth_token),
        sync_interval = COALESCE(?, sync_interval),
        is_external_active = COALESCE(?, is_external_active),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = 1
  `, [
    api_url !== undefined ? api_url.trim().replace(/\/+$/, '') : null,
    tenant_id !== undefined ? tenant_id.trim() : null,
    tenant_name !== undefined ? tenant_name.trim() : null,
    auth_token !== undefined ? auth_token.trim() : null,
    sync_interval !== undefined ? Number(sync_interval) : null,
    is_external_active !== undefined ? (is_external_active ? 1 : 0) : null,
  ]);

  if (auth_token) {
    cachedAuthToken = auth_token.trim();
  }

  const updated = await getConfig();
  if (updated.is_external_active && updated.api_url) {
    startPeriodicSync(updated.sync_interval || 30);
    // Trigger immediate sync
    syncFromBackend().catch((e) => console.warn('[BackendSync] Immediate sync warning:', e.message));
  } else {
    stopPeriodicSync();
  }
  return updated;
}

// Fetch all live tenants from backend (amuhr.uz/api/tenants/)
async function fetchLiveTenants(customUrl = null) {
  const cfg = await getConfig();
  const baseUrl = (customUrl || cfg.api_url || 'https://amuhr.uz').replace(/\/+$/, '');
  const url = `${baseUrl}/api/tenants/`;

  try {
    const res = await makeRequest({ url, method: 'GET' });
    if (res.status === 200) {
      const items = res.data?.results || (Array.isArray(res.data) ? res.data : []);
      return {
        success: true,
        tenants: items.map((t) => ({
          id: t.id,
          name: t.name,
          address: t.address || '',
          status: t.status,
          usersCount: t.users_count || 0,
          productsCount: t.products_count || 0,
          todaySales: t.today_sales || "0 so'm",
        })),
      };
    }
    return { success: false, error: `Server javobi: ${res.status}`, tenants: [] };
  } catch (err) {
    return { success: false, error: err.message, tenants: [] };
  }
}

// Authenticate with user + PIN on amuhr.uz
async function loginLiveUser(userId, pin, customUrl = null) {
  const cfg = await getConfig();
  const baseUrl = (customUrl || cfg.api_url || 'https://amuhr.uz').replace(/\/+$/, '');
  const url = `${baseUrl}/api/auth/login`;

  try {
    const payload = { pin: String(pin).trim() };
    if (userId) payload.userId = userId;
    const res = await makeRequest({
      url,
      method: 'POST',
      body: payload,
    });

    if (res.status === 200 && res.data) {
      const token = res.data.access || res.data.token;
      cachedAuthToken = token;
      if (token) {
        await run(`UPDATE backend_config SET auth_token = ? WHERE id = 1`, [token]);
      }
      return {
        success: true,
        user: {
          id: res.data.id || res.data.userId,
          name: res.data.name,
          role: res.data.role,
          tenantId: res.data.tenantId,
          tenantName: res.data.tenantName,
        },
        token,
      };
    } else {
      const msg = res.data?.error || res.data?.detail || "Noto'g'ri PIN-kod!";
      return { success: false, message: msg };
    }
  } catch (err) {
    return { success: false, message: err.message };
  }
}

// Ensure we have an active Bearer token for API calls
async function ensureAuthToken() {
  if (cachedAuthToken) return cachedAuthToken;

  const cfg = await getConfig();
  if (cfg.auth_token) {
    cachedAuthToken = cfg.auth_token;
    return cachedAuthToken;
  }

  // Attempt auto-login with known manager for this tenant
  const tenantId = cfg.tenant_id;
  const managerCreds = KNOWN_TENANT_MANAGERS[tenantId];
  if (managerCreds) {
    try {
      const loginRes = await loginLiveUser(managerCreds.userId, managerCreds.pin, cfg.api_url);
      if (loginRes.success && loginRes.token) {
        cachedAuthToken = loginRes.token;
        return cachedAuthToken;
      }
    } catch (e) {
      console.warn('[BackendSync] Auto-login failed:', e.message);
    }
  }

  return null;
}

// Test Connectivity (Ping)
async function testConnection(targetUrl, token, tenantId) {
  const cfg = await getConfig();
  const url = (targetUrl || cfg.api_url || 'https://amuhr.uz').replace(/\/+$/, '');
  const tId = tenantId || cfg.tenant_id || '5322a772-e9db-402a-8d2b-6293edd03832';
  const startTime = Date.now();

  try {
    // 1. Health check ping
    const healthRes = await makeRequest({ url: `${url}/health`, method: 'GET', timeoutMs: 5000 });
    const latency = Date.now() - startTime;

    if (healthRes.status === 200) {
      // 2. Query tenant info
      const tenantRes = await makeRequest({ url: `${url}/api/tenants/`, method: 'GET', timeoutMs: 5000 });
      let tenantObj = null;
      if (tenantRes.status === 200 && tenantRes.data?.results) {
        tenantObj = tenantRes.data.results.find((t) => t.id === tId);
      }

      return {
        success: true,
        latencyMs: latency,
        tenant: tenantObj,
        message: `Real backend server (amuhr.uz) bilan aloqa muvaffaqiyatli! Ping: ${latency}ms` +
          (tenantObj ? ` [Do'kon: ${tenantObj.name}]` : ''),
      };
    } else {
      return {
        success: false,
        latencyMs: latency,
        message: `Serverdan kutilmagan javob qaytdi: HTTP ${healthRes.status}`,
      };
    }
  } catch (err) {
    return {
      success: false,
      latencyMs: Date.now() - startTime,
      message: `Ulanishda xatolik: ${err.message}`,
    };
  }
}

// Pull Live Users and Live Products from Backend
async function syncFromBackend() {
  const cfg = await getConfig();
  if (!cfg.is_external_active || !cfg.api_url) {
    return { skipped: true, message: 'Backend sinxronizatsiyasi faol emas' };
  }

  const baseUrl = cfg.api_url.replace(/\/+$/, '');
  const tenantId = cfg.tenant_id;
  const startTime = Date.now();

  let usersSynced = 0;
  let productsSynced = 0;

  try {
    // 1. SYNC USERS (GET /api/auth/users?tenantId=...)
    const usersRes = await makeRequest({
      url: `${baseUrl}/api/auth/users?tenantId=${tenantId}`,
      method: 'GET',
    });

    if (usersRes.status === 200 && Array.isArray(usersRes.data)) {
      for (const u of usersRes.data) {
        const pin = KNOWN_USER_PINS[u.id] || (u.role === 'manager' ? '2222' : '1111');
        const role = u.role === 'manager' ? 'admin' : 'waiter';

        const existing = await get(`SELECT id FROM users WHERE user_code = ?`, [u.id]);
        if (existing) {
          await run(`
            UPDATE users 
            SET name = ?, role = COALESCE(role, ?), pin = COALESCE(pin, ?), status = 'active', is_shift_open = 1
            WHERE user_code = ?
          `, [u.name, role, pin, u.id]);
        } else {
          await run(`
            INSERT INTO users (name, role, pin, is_shift_open, status, user_code)
            VALUES (?, ?, ?, 1, 'active', ?)
          `, [u.name, role, pin, u.id]);
        }
        usersSynced++;
      }
    }

    // Ensure dedicated cashier and cook roles exist locally if not provided
    const hasCashier = await get(`SELECT id FROM users WHERE role = 'cashier'`);
    if (!hasCashier) {
      await run(`
        INSERT INTO users (name, role, pin, is_shift_open, status, user_code)
        VALUES ('Kassir (GetPOS)', 'cashier', '1234', 1, 'active', 'usr_cashier_default')
      `);
    }
    const hasCook = await get(`SELECT id FROM users WHERE role = 'cook'`);
    if (!hasCook) {
      await run(`
        INSERT INTO users (name, role, pin, is_shift_open, status, user_code)
        VALUES ('Bobur Aliyev (Oshpaz/KDS)', 'cook', '3333', 1, 'active', 'usr_cook')
      `);
    }

    // 2. SYNC PRODUCTS (GET /api/products/?tenantId=...)
    const token = await ensureAuthToken();
    const productHeaders = {};
    if (token) productHeaders['Authorization'] = `Bearer ${token}`;

    const prodsRes = await makeRequest({
      url: `${baseUrl}/api/products/?tenantId=${tenantId}`,
      method: 'GET',
      headers: productHeaders,
    });

    if (prodsRes.status === 200) {
      const prodList = prodsRes.data?.results || (Array.isArray(prodsRes.data) ? prodsRes.data : []);

      // Ensure a "Do'kon tovarlari / Bar" category exists
      let storeCat = await get(`SELECT id FROM categories WHERE slug = 'store_goods'`);
      if (!storeCat) {
        await run(`
          INSERT INTO categories (name, slug, icon, order_index)
          VALUES ('BAR VA ICHIMLIKLAR', 'store_goods', '🥤', 7)
        `);
        storeCat = await get(`SELECT id FROM categories WHERE slug = 'store_goods'`);
      }
      const catId = storeCat?.id || 7;

      for (const p of prodList) {
        const rawPrice = p.price_per_sale_unit || p.price || 0;
        const priceNum = Math.round(parseFloat(rawPrice)) || 0;
        const barcodeVal = p.barcode || p.qr_code || null;

        // Check if product exists by remote_id or name
        const existingProd = await get(
          `SELECT id FROM products WHERE remote_id = ? OR name = ?`,
          [p.id, p.name]
        );

        if (existingProd) {
          await run(`
            UPDATE products 
            SET price = ?, remote_id = ?, barcode = COALESCE(?, barcode), is_available = 1
            WHERE id = ?
          `, [priceNum, p.id, barcodeVal, existingProd.id]);
        } else {
          await run(`
            INSERT INTO products (category_id, name, price, cost_price, workshop, product_type, mxik_code, package_code, vat_percent, is_available, remote_id, barcode)
            VALUES (?, ?, ?, ?, 'Бар', 'Товар', '10702002001000000', '796', 12, 1, ?, ?)
          `, [catId, p.name, priceNum, Math.round(priceNum * 0.7), p.id, barcodeVal]);
        }
        productsSynced++;
      }
    }

    const latency = Date.now() - startTime;
    lastSyncResult = {
      status: 'synced',
      lastSyncTime: new Date().toISOString(),
      message: `Real backend (amuhr.uz) dan ${usersSynced} ta xodim va ${productsSynced} ta mahsulot yuklandi`,
      latencyMs: latency,
      usersSynced,
      productsSynced,
      ordersPushed: lastSyncResult.ordersPushed || 0,
    };

    await run(`UPDATE backend_config SET last_sync_time = CURRENT_TIMESTAMP WHERE id = 1`);
    return lastSyncResult;
  } catch (err) {
    console.error('[BackendSync] SyncFromBackend Error:', err.message);
    lastSyncResult = {
      status: 'error',
      lastSyncTime: new Date().toISOString(),
      message: `Sinxronizatsiya xatosi: ${err.message}`,
      latencyMs: Date.now() - startTime,
      usersSynced,
      productsSynced,
    };
    return lastSyncResult;
  }
}

// Push a completed Order & Payment to amuhr.uz
async function pushOrderSale({ order, items, paymentData, waiterUserCode }) {
  const cfg = await getConfig();
  if (!cfg.is_external_active || !cfg.api_url) {
    return { skipped: true };
  }

  const baseUrl = cfg.api_url.replace(/\/+$/, '');
  const tenantId = cfg.tenant_id;
  const token = await ensureAuthToken();

  if (!token) {
    console.warn('[BackendSync] No auth token available, queueing for background retry');
    await queueOrderForSync({ order, items, paymentData });
    return { queued: true };
  }

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };

  try {
    // Find active worker ID
    const workerId = waiterUserCode ||
      (KNOWN_TENANT_MANAGERS[tenantId]?.userId) ||
      '60612290-8399-4949-83f8-9f8216fab884';

    const clientLabel = `STOL - ${order.table_id || order.table_number || '1'} (KafePOS)`;

    // 1. Create live Basket on amuhr.uz (POST /api/baskets/)
    const basketPayload = {
      tenantId: tenantId,
      workerId: workerId,
      clientName: clientLabel,
    };

    const basketRes = await makeRequest({
      url: `${baseUrl}/api/baskets/`,
      method: 'POST',
      headers,
      body: basketPayload,
    });

    if (basketRes.status !== 201 && basketRes.status !== 200) {
      throw new Error(`Savat yaratishda xatolik: HTTP ${basketRes.status}`);
    }

    const basketId = basketRes.data.id;

    // 2. Add items to Basket if remote_id exists
    for (const it of items) {
      const prodRow = await get(`SELECT remote_id, name, price FROM products WHERE id = ?`, [it.product_id]);
      if (prodRow && prodRow.remote_id) {
        try {
          await makeRequest({
            url: `${baseUrl}/api/baskets/${basketId}/items/`,
            method: 'POST',
            headers,
            body: {
              product_id: prodRow.remote_id,
              quantity: it.quantity || 1,
            },
          });
        } catch (itemErr) {
          console.warn('[BackendSync] Basket item add warning:', itemErr.message);
        }
      }
    }

    // 3. Finalize Transaction on amuhr.uz (POST /api/transactions/)
    const paymentMethod = paymentData.paymentMethod === 'card' ? 'card' : 'cash';
    const totalSum = Number(order.total_amount || paymentData.totalAmount || 0).toFixed(2);
    const cashSum = paymentData.paymentMethod === 'card' ? '0.00' : totalSum;
    const cardSum = paymentData.paymentMethod === 'card' ? totalSum : '0.00';

    const txPayload = {
      basket: basketId,
      finalized_by: workerId,
      payment_method: paymentMethod,
      cash_amount: cashSum,
      card_amount: cardSum,
      total_amount: totalSum,
      client_name: clientLabel,
      status: 'completed',
    };

    const txRes = await makeRequest({
      url: `${baseUrl}/api/transactions/`,
      method: 'POST',
      headers,
      body: txPayload,
    });

    if (txRes.status === 201 || txRes.status === 200) {
      lastSyncResult.ordersPushed = (lastSyncResult.ordersPushed || 0) + 1;
      return {
        success: true,
        transactionId: txRes.data?.id,
        basketId: basketId,
      };
    } else {
      throw new Error(`Tranzaksiya yaratishda xatolik: HTTP ${txRes.status}`);
    }
  } catch (err) {
    console.warn('[BackendSync] pushOrderSale failed, queueing offline:', err.message);
    await queueOrderForSync({ order, items, paymentData });
    return { queued: true, error: err.message };
  }
}

// Queue order into fiscal_queue for background sync
async function queueOrderForSync({ order, items, paymentData }) {
  try {
    const payload = JSON.stringify({
      type: 'backend_order_sync',
      order,
      items,
      paymentData,
      createdAt: new Date().toISOString(),
    });
    await run(`
      INSERT INTO fiscal_queue (payment_id, order_id, payload, status)
      VALUES (?, ?, ?, 'pending')
    `, [paymentData?.receiptSeq || `sync_${Date.now()}`, String(order.id), payload]);
  } catch (e) {
    console.error('[BackendSync] Queueing order error:', e.message);
  }
}

// Flush pending offline sales to amuhr.uz
async function syncToBackend() {
  const cfg = await getConfig();
  if (!cfg.is_external_active || !cfg.api_url) return { skipped: true };

  const pendingRows = await all(`
    SELECT * FROM fiscal_queue 
    WHERE status = 'pending' AND payload LIKE '%backend_order_sync%'
    LIMIT 20
  `);

  if (pendingRows.length === 0) return { pushed: 0 };

  let pushedCount = 0;
  for (const row of pendingRows) {
    try {
      const data = JSON.parse(row.payload);
      const res = await pushOrderSale({
        order: data.order,
        items: data.items,
        paymentData: data.paymentData,
      });

      if (res.success) {
        await run(`
          UPDATE fiscal_queue 
          SET status = 'synced', synced_at = CURRENT_TIMESTAMP 
          WHERE id = ?
        `, [row.id]);
        pushedCount++;
      }
    } catch (e) {
      console.warn('[BackendSync] Flush single order error:', e.message);
    }
  }

  return { pushed: pushedCount, remaining: pendingRows.length - pushedCount };
}

function startPeriodicSync(intervalSeconds = 30) {
  if (syncTimer) clearInterval(syncTimer);
  syncTimer = setInterval(async () => {
    await syncToBackend();
  }, intervalSeconds * 1000);
}

function stopPeriodicSync() {
  if (syncTimer) {
    clearInterval(syncTimer);
    syncTimer = null;
  }
}

module.exports = {
  getConfig,
  updateConfig,
  fetchLiveTenants,
  loginLiveUser,
  testConnection,
  syncFromBackend,
  syncToBackend,
  pushOrderSale,
  startPeriodicSync,
  stopPeriodicSync,
  getLastSyncResult: () => lastSyncResult,
};
