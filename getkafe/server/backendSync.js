// server/backendSync.js - Real Production Backend Sync Engine (https://getpos.uz)
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

// Known default credentials for auto-authentication on getpos.uz
const KNOWN_TENANT_MANAGERS = {
  '90e04abf-246d-4683-91eb-1ac34d7b2ee7': { userId: 'b58d74f3-3541-4341-acf8-ff00c13964c7', login: 'kafee@gmail.com', pin: '3333', name: 'Kafee' },
  '5322a772-e9db-402a-8d2b-6293edd03832': { userId: '447a1ad6-e23f-4dde-b4a2-d9256c7af5a7', login: 'john@example.com', pin: '1111', name: 'John' },
  '57341e59-3c24-409f-af62-9aaec212b689': { userId: 'e6010bbc-f81a-4b86-bc19-f059e1100fba', login: 'rustam@getpos.uz', pin: '1111', name: 'Rustam' },
};

const KNOWN_USER_PINS = {
  'b58d74f3-3541-4341-acf8-ff00c13964c7': '3333', // Kafee (Manager / Admin)
  '447a1ad6-e23f-4dde-b4a2-d9256c7af5a7': '1111', // John (Manager / Admin)
  '60612290-8399-4949-83f8-9f8216fab884': '2222', // Ali (Xodim / Waiter)
  'e6010bbc-f81a-4b86-bc19-f059e1100fba': '1111', // Rustam
  '4215e424-99fb-4a6d-a555-51388ab7c06f': '1234', // Sardor Karimov
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
      VALUES (1, 'https://getpos.uz', '5322a772-e9db-402a-8d2b-6293edd03832', 'Test', '', 30, 1)
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

// Fetch all live tenants from backend (getpos.uz/api/tenants/)
async function fetchLiveTenants(customUrl = null) {
  const cfg = await getConfig();
  const baseUrl = (customUrl || cfg.api_url || 'https://getpos.uz').replace(/\/+$/, '');
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

// Fetch live staff for a specific tenant from backend
async function fetchStaffForTenant(tenantId) {
  const cfg = await getConfig();
  const baseUrl = (cfg.api_url || 'https://getpos.uz').replace(/\/+$/, '');
  const tId = tenantId || cfg.tenant_id;
  const token = await ensureAuthToken();
  const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

  // Try v1 users first, then legacy auth/users
  let url = `${baseUrl}/api/v1/users/?tenant_id=${tId}`;
  try {
    let res = await makeRequest({ url, method: 'GET', headers, timeoutMs: 6000 });
    if (res.status !== 200 || !res.data) {
      url = `${baseUrl}/api/v1/auth/users?tenantId=${tId}`;
      res = await makeRequest({ url, method: 'GET', headers, timeoutMs: 6000 });
    }

    const items = res.data?.results || (Array.isArray(res.data) ? res.data : []);
    if (res.status === 200 && items.length > 0) {
      // Sync into SQLite users table for offline caching with deduplication
      for (const u of items) {
        const mappedRole = (u.role === 'manager' || u.role === 'admin') ? 'admin' : (u.role === 'worker' || u.role === 'waiter' ? 'waiter' : u.role);
        const uCode = String(u.id);
        const uName = (u.name || '').trim();
        const uLogin = u.email || u.login || uName.toLowerCase().replace(/[^a-z0-9]/g, '');
        const uPhone = u.phone_number || u.phone || '';
        const uPass = u.plain_password || u.plain_pin || u.password || u.pin || '123456';
        const uPin = String(u.plain_pin || u.pin || uPass).replace(/[^0-9]/g, '').padEnd(4, '0').slice(0, 4);

        // Match by user_code OR case-insensitive name OR login
        const existing = await get(
          `SELECT id, user_code, login, password FROM users 
           WHERE user_code = ? OR LOWER(name) = LOWER(?) OR (login = ? AND login != '')`,
          [uCode, uName, uLogin]
        );

        if (existing) {
          await run(`
            UPDATE users
            SET name = ?, role = ?, tenant_id = ?, status = 'active', user_code = ?,
                login = COALESCE(NULLIF(?, ''), login),
                password = COALESCE(NULLIF(?, ''), password),
                pin = COALESCE(NULLIF(?, ''), pin),
                phone = COALESCE(NULLIF(?, ''), phone)
            WHERE id = ?
          `, [uName, mappedRole, tId, uCode, uLogin, uPass, uPin, uPhone, existing.id]);
        } else {
          await run(`
            INSERT INTO users (name, role, login, password, pin, phone, is_shift_open, status, user_code, tenant_id)
            VALUES (?, ?, ?, ?, ?, ?, 1, 'active', ?, ?)
          `, [uName, mappedRole, uLogin, uPass, uPin, uPhone, uCode, tId]);
        }
      }
      return { success: true, users: items };
    }
  } catch (err) {
    console.warn('[BackendSync] fetchStaffForTenant error:', err.message);
  }

  // Fallback to local SQLite users for this tenant
  const localUsers = await all(
    `SELECT id, user_code, name, login, password, role, pin, phone, status, tenant_id FROM users WHERE tenant_id = ? AND (status = 'active' OR status IS NULL)`,
    [tId]
  );
  return {
    success: false,
    users: localUsers.map((u) => ({
      id: u.user_code || `usr_${u.id}`,
      name: u.name,
      login: u.login,
      role: u.role === 'admin' ? 'manager' : 'worker',
      status: u.status || 'active',
    })),
  };
}

// Authenticate with user + PIN or Email/Login on getpos.uz
async function loginLiveUser(userIdOrLogin, passOrPin, customUrl = null, extraLogin = null) {
  const cfg = await getConfig();
  const baseUrl = (customUrl || cfg.api_url || 'https://getpos.uz').replace(/\/+$/, '');

  const payload = {
    pin: String(passOrPin).trim(),
    password: String(passOrPin).trim(),
  };

  const isUUID = typeof userIdOrLogin === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userIdOrLogin);

  if (isUUID) {
    payload.userId = userIdOrLogin;
    payload.user_id = userIdOrLogin;
  } else if (userIdOrLogin) {
    payload.login = userIdOrLogin;
  }

  if (extraLogin) {
    payload.login = extraLogin;
  }

  // Only constrain to tenant_id if this is a pure numeric PIN/user_id login without an email/phone
  const loginStr = String(payload.login || userIdOrLogin || '');
  const isEmailOrPhone = loginStr.includes('@') || /^\+?\d{7,}$/.test(loginStr);
  if (cfg.tenant_id && !isEmailOrPhone) {
    payload.tenant_id = cfg.tenant_id;
  }

  let res = null;
  try {
    res = await makeRequest({
      url: `${baseUrl}/api/v1/auth/login/`,
      method: 'POST',
      body: payload,
      timeoutMs: 6000,
    });
    if (res.status === 404 || res.status >= 500) {
      res = await makeRequest({
        url: `${baseUrl}/api/auth/login/`,
        method: 'POST',
        body: payload,
        timeoutMs: 6000,
      });
    }
  } catch (err) {
    try {
      res = await makeRequest({
        url: `${baseUrl}/api/auth/login/`,
        method: 'POST',
        body: payload,
        timeoutMs: 6000,
      });
    } catch (e) {
      return { success: false, message: `Serverga ulanib bo'lmadi: ${e.message}` };
    }
  }

  if (res && res.status === 200 && res.data) {
    const token = res.data.access || res.data.token;
    cachedAuthToken = token;
    const returnedTenantId = res.data.tenantId || res.data.user?.tenant_id || cfg.tenant_id;
    const returnedTenantName = res.data.tenantName || res.data.user?.tenant_name || cfg.tenant_name;

    const tenantChanged = Boolean(returnedTenantId && cfg.tenant_id && returnedTenantId !== cfg.tenant_id);

    if (tenantChanged) {
      await switchTenantAndCleanData(returnedTenantId, returnedTenantName, token);
    } else {
      if (token) {
        await run(`UPDATE backend_config SET auth_token = ?, tenant_id = ?, tenant_name = ? WHERE id = 1`, [
          token, returnedTenantId, returnedTenantName,
        ]);
      }
    }

    const userData = {
      id: res.data.id || res.data.userId || res.data.user?.id,
      name: res.data.name || res.data.user?.name,
      role: res.data.role || res.data.user?.role,
      tenantId: returnedTenantId,
      tenantName: returnedTenantName,
    };

    // Save/update user locally in SQLite with PIN / password
    const mappedRole = (userData.role === 'manager' || userData.role === 'admin') ? 'admin' : 'waiter';
    const existing = await get(`SELECT id FROM users WHERE user_code = ?`, [userData.id]);
    if (existing) {
      await run(`
        UPDATE users 
        SET pin = ?, password = ?, is_shift_open = 1, tenant_id = ?, role = ?, name = ? 
        WHERE id = ?
      `, [String(passOrPin).trim(), String(passOrPin).trim(), returnedTenantId, mappedRole, userData.name, existing.id]);
    } else {
      await run(`
        INSERT INTO users (name, role, pin, password, is_shift_open, status, user_code, tenant_id)
        VALUES (?, ?, ?, ?, 1, 'active', ?, ?)
      `, [userData.name, mappedRole, String(passOrPin).trim(), String(passOrPin).trim(), userData.id, returnedTenantId]);
    }

    return {
      success: true,
      user: userData,
      token,
    };
  } else {
    const msg = res?.data?.error || res?.data?.detail || "Noto'g'ri PIN-kod yoki parol!";
    return { success: false, message: msg };
  }
}

// Switch tenant & clear previous tenant's private menu/tables/orders
async function switchTenantAndCleanData(newTenantId, newTenantName, token) {
  console.log(`[BackendSync] Switching to tenant: ${newTenantName} (${newTenantId}). Resetting local data.`);
  try {
    // 1. Clear previous local data
    await run(`DELETE FROM order_items`);
    await run(`DELETE FROM orders`);
    await run(`DELETE FROM payments`);
    await run(`DELETE FROM fiscal_queue`);
    await run(`DELETE FROM products`);
    await run(`DELETE FROM categories`);
    await run(`DELETE FROM tables`);
    await run(`DELETE FROM halls`);

    // 2. Update config
    await run(`
      UPDATE backend_config 
      SET tenant_id = ?, tenant_name = ?, auth_token = ?, last_sync_time = CURRENT_TIMESTAMP 
      WHERE id = 1
    `, [newTenantId, newTenantName, token || '']);

    // 3. Seed default base categories for a clean cafe
    await run(`
      INSERT INTO categories (id, name, slug, icon, order_index) VALUES
      (1, 'Taomlar', 'taomlar', '🍲', 1),
      (2, 'Ichimliklar', 'ichimliklar', '🥤', 2),
      (3, 'Salatlar', 'salatlar', '🥗', 3),
      (4, 'Shirinliklar', 'shirinliklar', '🍰', 4)
    `);

    // 4. Seed default halls and tables
    await run(`
      INSERT INTO halls (id, name, order_index) VALUES
      (1, 'Asosiy Zal', 1),
      (2, 'Zal 1', 2),
      (3, 'VIP Xona', 3)
    `);

    for (let i = 1; i <= 10; i++) {
      const hallName = i <= 6 ? 'Asosiy Zal' : (i <= 8 ? 'Zal 1' : 'VIP Xona');
      await run(`
        INSERT INTO tables (number, name, capacity, status, hall)
        VALUES (?, ?, 4, 'free', ?)
      `, [i, `STOL - ${i}`, hallName]);
    }

    // 5. Sync new tenant's data from getpos.uz
    cachedAuthToken = token;
    await syncFromBackend();
  } catch (err) {
    console.error('[BackendSync] switchTenantAndCleanData error:', err.message);
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
      const loginRes = await loginLiveUser(managerCreds.userId, managerCreds.pin, cfg.api_url, managerCreds.login || managerCreds.name);
      if (loginRes.success && loginRes.token) {
        cachedAuthToken = loginRes.token;
        return cachedAuthToken;
      }
    } catch (e) {
      console.warn('[BackendSync] Auto-login failed:', e.message);
    }
  }

  // Fallback auto-login with any locally active user in SQLite
  try {
    const localUser = await get(
      `SELECT name, login, email, phone, pin, password, user_code FROM users 
       WHERE (password != '' OR pin != '') AND status = 'active'
       ORDER BY CASE WHEN role IN ('admin', 'manager') THEN 0 ELSE 1 END, id ASC LIMIT 1`
    );
    if (localUser) {
      const loginId = localUser.user_code || localUser.login || localUser.email || localUser.phone || localUser.name;
      const pass = localUser.password || localUser.pin;
      const loginRes = await loginLiveUser(loginId, pass, cfg.api_url, localUser.login || localUser.name);
      if (loginRes.success && loginRes.token) {
        cachedAuthToken = loginRes.token;
        return cachedAuthToken;
      }
    }
  } catch (e) {
    console.warn('[BackendSync] Local user auto-login warning:', e.message);
  }

  return null;
}

// Test Connectivity (Ping)
async function testConnection(targetUrl, token, tenantId) {
  const cfg = await getConfig();
  const url = (targetUrl || cfg.api_url || 'https://getpos.uz').replace(/\/+$/, '');
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
        message: `Real backend server (getpos.uz) bilan aloqa muvaffaqiyatli! Ping: ${latency}ms` +
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

      if (prodList.length > 0) {
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
    }

    // 3. SYNC TABLES (GET & POST /api/v1/cafe/tables/)
    let tablesSynced = 0;
    try {
      const tablesHeaders = {};
      if (token) tablesHeaders['Authorization'] = `Bearer ${token}`;

      const cloudTablesRes = await makeRequest({
        url: `${baseUrl}/api/v1/cafe/tables/`,
        method: 'GET',
        headers: tablesHeaders,
      });

      if (cloudTablesRes.status === 200) {
        const cloudTables = cloudTablesRes.data?.results || (Array.isArray(cloudTablesRes.data) ? cloudTablesRes.data : []);
        if (cloudTables.length === 0) {
          // Cloud has no tables yet for this tenant - upload all local tables
          const localTables = await all(`SELECT * FROM tables`);
          for (const lt of localTables) {
            try {
              await makeRequest({
                url: `${baseUrl}/api/v1/cafe/tables/`,
                method: 'POST',
                headers: { ...tablesHeaders, 'Content-Type': 'application/json' },
                body: {
                  number: lt.number || lt.id,
                  name: lt.name || `STOL - ${lt.number || lt.id}`,
                  capacity: lt.capacity || 4,
                  status: lt.status || 'free',
                }
              });
              tablesSynced++;
            } catch (upErr) {
              // Ignore single upload error
            }
          }
        } else {
          tablesSynced = cloudTables.length;
        }
      }
    } catch (tblErr) {
      console.warn('[BackendSync] Table sync warning:', tblErr.message);
    }

    const latency = Date.now() - startTime;
    lastSyncResult = {
      status: 'synced',
      lastSyncTime: new Date().toISOString(),
      message: `Real backend (getpos.uz) dan ${usersSynced} ta xodim, ${productsSynced} ta mahsulot va ${tablesSynced} ta stol sinxronlandi`,
      latencyMs: latency,
      usersSynced,
      productsSynced,
      tablesSynced,
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

// Push a completed Order & Payment to getpos.uz
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

    // 1. Create live Basket on getpos.uz (POST /api/baskets/)
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

    // 3. Finalize Transaction on getpos.uz (POST /api/transactions/)
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

// Flush pending offline sales to getpos.uz
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

const lastPrintedCloudOrders = new Set();
const lastPrintedCloudKitchenItems = new Set();
let cloudPollTimer = null;
const serverStartTime = Date.now();
let isInitialCloudScan = true;
const recentPrintedTables = new Map(); // identifier -> timestamp

function markTablePrintedLocally(tableNumber, orderId) {
  const now = Date.now();
  if (tableNumber) {
    recentPrintedTables.set(String(tableNumber), now);
    const digits = String(tableNumber).replace(/\D/g, '');
    if (digits) recentPrintedTables.set(digits, now);
  }
  if (orderId) {
    recentPrintedTables.set(String(orderId), now);
  }
}

function isTableRecentlyPrinted(tableNumber, orderId) {
  const now = Date.now();
  const keys = [
    tableNumber ? String(tableNumber) : null,
    tableNumber ? String(tableNumber).replace(/\D/g, '') : null,
    orderId ? String(orderId) : null,
  ].filter(Boolean);

  for (const k of keys) {
    const t = recentPrintedTables.get(k);
    if (t && (now - t < 30000)) { // 30 soniya ichida chop etilgan bo'lsa
      return true;
    }
  }
  return false;
}

let broadcastCallback = null;

function setBroadcastCallback(cb) {
  broadcastCallback = cb;
}

// Poll getpos.uz for tables in 'busy' / 'bill_requested' status to sync orders and print kitchen & pre-checks
async function pollCloudBillRequests() {
  try {
    const cfg = await getConfig();
    if (!cfg.is_external_active || !cfg.api_url) return;
    const baseUrl = cfg.api_url.replace(/\/+$/, '');
    const token = await ensureAuthToken();
    if (!token) return;

    const res = await makeRequest({
      url: `${baseUrl}/api/v1/cafe/tables/`,
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` },
      timeoutMs: 4000,
    });

    if (res.status === 200 && res.data) {
      const tables = res.data.results || (Array.isArray(res.data) ? res.data : []);
      
      // If server just started, populate locally known items from SQLite so we only print genuinely new waiter orders
      if (isInitialCloudScan) {
        isInitialCloudScan = false;
        try {
          const locallyStored = await all(`SELECT order_id, product_name, quantity FROM order_items`);
          for (const row of locallyStored) {
            lastPrintedCloudKitchenItems.add(`${row.order_id}_${row.product_name}_${row.quantity}`);
            lastPrintedCloudKitchenItems.add(String(row.product_name));
          }
        } catch (e) {}
        console.log(`[BackendSync] Dastlabki bulut skaneri tayyorlandi (${tables.length} ta stol)`);
      }

      for (const t of tables) {
        const localTable = await get(`SELECT * FROM tables WHERE number = ? OR id = ? OR remote_id = ?`, [t.number, t.number, t.id]);
        if (localTable) {
          let tableChanged = false;

          // Always associate cloud UUID (remote_id) with local table
          if (t.id && localTable.remote_id !== t.id) {
            await run(`UPDATE tables SET remote_id = ? WHERE id = ?`, [t.id, localTable.id]);
          }

          if (t.status === 'bill_requested' || t.status === 'busy' || t.active_order) {
            const currentStatus = t.status === 'free' ? 'busy' : t.status;
            if (localTable.status !== currentStatus) {
              await run(`UPDATE tables SET status = ? WHERE id = ?`, [currentStatus, localTable.id]);
              tableChanged = true;
            }

            if (t.active_order) {
              const orderId = t.active_order.id || t.active_order_id;
              const orderTotal = Number(t.active_order.total_amount || t.active_order.subtotal || 0);
              const waiterName = t.current_waiter_name || t.active_order.waiter_name || 'Ofitsiant';

              let localOrder = await get(`SELECT * FROM orders WHERE id = ?`, [orderId]);
              if (!localOrder) {
                localOrder = await get(
                  `SELECT * FROM orders WHERE table_id = ? AND status IN ('open', 'busy', 'bill_requested') ORDER BY id DESC LIMIT 1`,
                  [localTable.id]
                );
              }

              let currentEffectiveOrderId = orderId;
              if (localOrder) {
                currentEffectiveOrderId = localOrder.id;
                await run(
                  `UPDATE orders SET status = ?, total_amount = ?, waiter_name = ? WHERE id = ?`,
                  [currentStatus, orderTotal, waiterName, localOrder.id]
                );
                if (localTable.current_order_id !== localOrder.id) {
                  await run(`UPDATE tables SET current_order_id = ? WHERE id = ?`, [localOrder.id, localTable.id]);
                  tableChanged = true;
                }
              } else {
                const newOrderId = orderId || `ord_${localTable.id}_${Date.now()}`;
                currentEffectiveOrderId = newOrderId;
                await run(
                  `INSERT INTO orders (id, table_id, waiter_name, status, total_amount) VALUES (?, ?, ?, ?, ?)`,
                  [newOrderId, localTable.id, waiterName, currentStatus, orderTotal]
                );
                await run(`UPDATE tables SET current_order_id = ? WHERE id = ?`, [newOrderId, localTable.id]);
                tableChanged = true;
              }

              // Sync order items from Cloud to local SQLite for Desktop POS display & Kitchen printing
              const cloudItems = t.active_order.items || [];
              const newItemsToPrint = [];

              if (cloudItems.length > 0 && currentEffectiveOrderId) {
                const existingItems = await all(`SELECT * FROM order_items WHERE order_id = ?`, [currentEffectiveOrderId]);

                for (const ci of cloudItems) {
                  const ciName = ci.product_name || ci.name || 'Taom';
                  const ciQty = Number(ci.quantity || 1);
                  const ciPrice = Number(ci.price || ci.unit_price || 0);
                  const ciComment = ci.comment || '';
                  const ciItemId = ci.id || `${orderId}_${ciName}_${ciQty}`;

                  const found = existingItems.find(ei => ei.product_name === ciName);
                  if (!found) {
                    await run(
                      `INSERT INTO order_items (order_id, product_id, product_name, quantity, price, comment, status, waiter_name)
                       VALUES (?, ?, ?, ?, ?, ?, 'sent', ?)`,
                      [currentEffectiveOrderId, ci.product_id || ci.product || 1, ciName, ciQty, ciPrice, ciComment, waiterName]
                    );
                    tableChanged = true;

                    if (!lastPrintedCloudKitchenItems.has(String(ciItemId))) {
                      lastPrintedCloudKitchenItems.add(String(ciItemId));
                      newItemsToPrint.push({
                        id: ciItemId,
                        product_name: ciName,
                        quantity: ciQty,
                        price: ciPrice,
                        comment: ciComment,
                        workshop: ci.workshop || 'Oshxona',
                      });
                    }
                  } else if (found.quantity !== ciQty) {
                    const diffQty = ciQty - found.quantity;
                    await run(`UPDATE order_items SET quantity = ?, price = ? WHERE id = ?`, [ciQty, ciPrice, found.id]);
                    tableChanged = true;

                    if (diffQty > 0 && !lastPrintedCloudKitchenItems.has(`${ciItemId}_diff_${ciQty}`)) {
                      lastPrintedCloudKitchenItems.add(`${ciItemId}_diff_${ciQty}`);
                      newItemsToPrint.push({
                        id: ciItemId,
                        product_name: ciName,
                        quantity: diffQty,
                        price: ciPrice,
                        comment: ciComment,
                        workshop: ci.workshop || 'Oshxona',
                      });
                    }
                  }
                }
              }

              // Oshxona printeriga yangi taomlarni chop etish
              if (newItemsToPrint.length > 0) {
                console.log(`[BackendSync] Bulutdan yangi taomlar keldi (${localTable.number}-stol):`, newItemsToPrint.map(i => `${i.product_name} x${i.quantity}`).join(', '));
                try {
                  const printerService = require('./printer');
                  printerService.printToKitchen({
                    orderId: currentEffectiveOrderId,
                    tableNumber: String(localTable.number || t.number),
                    waiterName,
                    items: newItemsToPrint,
                  }).catch(e => console.warn('[BackendSync Kitchen Print Error]:', e.message));
                } catch (e) {
                  console.warn('[BackendSync Kitchen Print Exception]:', e.message);
                }

                if (broadcastCallback) {
                  broadcastCallback('KITCHEN_NEW_TICKET', {
                    orderId: currentEffectiveOrderId,
                    tableNumber: String(localTable.number || t.number),
                    waiterName,
                    items: newItemsToPrint,
                    timestamp: new Date().toISOString(),
                  });
                }
              }

              // Pre-chek termal printerga chiqarish (agar hali chop etilmagan bo'lsa)
              if (t.status === 'bill_requested') {
                const tableNum = String(t.number || t.name || t.id);
                const updatedTime = t.active_order.updated_at || t.active_order.created_at || Date.now();
                const printKey = `${orderId}_${updatedTime}`;

                if (!isTableRecentlyPrinted(tableNum, orderId) && !lastPrintedCloudOrders.has(printKey)) {
                  lastPrintedCloudOrders.add(printKey);
                  markTablePrintedLocally(tableNum, orderId);
                  if (lastPrintedCloudOrders.size > 200) {
                    const firstKey = lastPrintedCloudOrders.values().next().value;
                    lastPrintedCloudOrders.delete(firstKey);
                  }

                  console.log(`[BackendSync] Bulutdan (Mobile Data) yangi hisob so'rovi keldi: Stol ${t.number}, Buyurtma: ${orderId}`);
                  
                  const rawItems = t.active_order.items || [];
                  const activeItems = rawItems.map(i => ({
                    product_name: i.product_name || i.name || 'Taom',
                    quantity: Number(i.quantity || 1),
                    price: Number(i.price || i.unit_price || 0),
                  }));

                  const subtotal = activeItems.reduce((s, it) => s + (it.price * it.quantity), 0);
                  const servicePercent = 10;
                  const serviceFee = Math.round((subtotal * servicePercent) / 100);
                  const totalAmount = subtotal + serviceFee;

                  const printerService = require('./printer');
                  printerService.printPrecheckReceipt({
                    orderId,
                    tableNumber: String(t.number || t.name || localTable.number),
                    waiterName,
                    items: activeItems,
                    subtotal,
                    serviceFeePercent: servicePercent,
                    serviceFee,
                    totalAmount,
                  }).then(res => console.log('[BackendSync Cloud Pre-check] Chop etildi:', res)).catch(err => console.error('[BackendSync Cloud Pre-check] Error:', err.message));

                  if (broadcastCallback) {
                    broadcastCallback('BILL_REQUESTED', {
                      tableNumber: String(t.number || t.name || localTable.number),
                      orderId,
                    });
                  }
                }
              }
            }
          } else if (t.status === 'free') {
            if (localTable.status !== 'free') {
              await run(`UPDATE tables SET status = 'free', current_order_id = NULL WHERE id = ?`, [localTable.id]);
              await run(`UPDATE orders SET status = 'paid' WHERE table_id = ? AND status IN ('open', 'busy', 'bill_requested')`, [localTable.id]);
              tableChanged = true;
            }
          }

          if (tableChanged && broadcastCallback) {
            const updated = await get(`
              SELECT t.*, o.id as order_id, o.waiter_name, o.total_amount, o.created_at as order_created_at
              FROM tables t
              LEFT JOIN orders o ON t.current_order_id = o.id
              WHERE t.id = ?
            `, [localTable.id]);
            broadcastCallback('TABLE_UPDATED', updated);
            broadcastCallback('TABLES_UPDATED', {});
          }
        }
      }
    }
  } catch (err) {
    console.error('[pollCloudBillRequests ERROR]:', err);
  }
}

function startPeriodicSync(intervalSeconds = 30) {
  if (syncTimer) clearInterval(syncTimer);
  syncTimer = setInterval(async () => {
    await syncToBackend();
  }, intervalSeconds * 1000);

  if (cloudPollTimer) clearInterval(cloudPollTimer);
  cloudPollTimer = setInterval(async () => {
    await pollCloudBillRequests();
  }, 4000); // Har 4 soniyada bulutdagi yangi hisob so'rovlarini tekshirib darhol chop etadi
}

function stopPeriodicSync() {
  if (syncTimer) {
    clearInterval(syncTimer);
    syncTimer = null;
  }
  if (cloudPollTimer) {
    clearInterval(cloudPollTimer);
    cloudPollTimer = null;
  }
}

// Fetch active mobile baskets sent from mobile waiters / runners
async function fetchActiveBaskets() {
  const cfg = await getConfig();
  const baseUrl = (cfg.api_url || 'https://getpos.uz').replace(/\/+$/, '');
  const tenantId = cfg.tenant_id || '5322a772-e9db-402a-8d2b-6293edd03832';
  const token = await ensureAuthToken();

  const url = `${baseUrl}/api/baskets/?tenant_id=${tenantId}&status=active`;
  const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

  try {
    const res = await makeRequest({ url, method: 'GET', headers, timeoutMs: 6000 });
    if (res.status === 200 && res.data) {
      const items = res.data.results || (Array.isArray(res.data) ? res.data : []);
      return { success: true, count: items.length, baskets: items };
    }
    return { success: false, count: 0, baskets: [], error: `Status ${res.status}` };
  } catch (err) {
    return { success: false, count: 0, baskets: [], error: err.message };
  }
}

// Complete mobile basket transaction via POST /api/transactions/
async function completeBasketTransaction({ basketId, paymentMethod = 'cash', totalAmount, clientName = '', clientPhone = '' }) {
  const cfg = await getConfig();
  const baseUrl = (cfg.api_url || 'https://getpos.uz').replace(/\/+$/, '');
  const tenantId = cfg.tenant_id || '5322a772-e9db-402a-8d2b-6293edd03832';
  const token = await ensureAuthToken();

  const url = `${baseUrl}/api/transactions/`;
  const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

  const payload = {
    tenant_id: tenantId,
    basket_id: basketId,
    payment_method: paymentMethod, // 'cash', 'card', 'debt', 'click', 'payme'
    total_amount: Number(totalAmount),
    client_name: clientName || '',
    client_phone: clientPhone || '',
  };

  try {
    const res = await makeRequest({ url, method: 'POST', headers, body: payload, timeoutMs: 8000 });
    if (res.status === 200 || res.status === 201) {
      return { success: true, transaction: res.data };
    }
    return { success: false, error: res.data?.error || `Server status ${res.status}` };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// Patch mobile basket status (e.g. status: 'completed' or 'loaded')
async function patchBasketStatus(basketId, status = 'completed', extra = {}) {
  const cfg = await getConfig();
  const baseUrl = (cfg.api_url || 'https://getpos.uz').replace(/\/+$/, '');
  const token = await ensureAuthToken();

  const url = `${baseUrl}/api/baskets/${basketId}/`;
  const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

  try {
    const res = await makeRequest({
      url,
      method: 'PATCH',
      headers,
      body: { status, ...extra },
      timeoutMs: 6000,
    });
    return { success: res.status >= 200 && res.status < 300, data: res.data };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// Push newly created or updated staff to Central Backend (getpos.uz / Admin Panel)
async function pushStaffMember(staff) {
  const cfg = await getConfig();
  if (!cfg.api_url) return { success: false, error: 'No backend URL' };
  const baseUrl = cfg.api_url.replace(/\/+$/, '');
  const tenantId = cfg.tenant_id || '90e04abf-246d-4683-91eb-1ac34d7b2ee7';
  const token = await ensureAuthToken();

  const rawPass = staff.password || staff.pin || '123456';
  const safePassword = rawPass.length >= 6 ? rawPass : (rawPass + '000000').slice(0, 6);
  const safePin = String(staff.pin || staff.password || '1111').replace(/[^0-9]/g, '').padEnd(4, '0').slice(0, 4);

  const payload = {
    tenant_id: tenantId,
    tenant: tenantId,
    name: staff.name,
    email: staff.login || (staff.email ? staff.email : `${staff.name.toLowerCase().replace(/[^a-z0-9]/g, '')}@getpos.uz`),
    role: (staff.role === 'admin' || staff.role === 'manager') ? 'manager' : 'worker',
    password: safePassword,
    pin: safePin,
    phone_number: staff.phone || staff.phone_number || '',
    is_active: staff.status !== 'inactive',
  };

  try {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    let res = null;
    if (staff.user_code && staff.user_code.length > 20) {
      // Try update existing user on getpos.uz
      res = await makeRequest({
        url: `${baseUrl}/api/v1/users/${staff.user_code}/`,
        method: 'PATCH',
        headers,
        body: payload,
        timeoutMs: 6000,
      });
    }

    if (!res || res.status >= 400) {
      // If not exists or no user_code, create new
      res = await makeRequest({
        url: `${baseUrl}/api/v1/users/`,
        method: 'POST',
        headers,
        body: payload,
        timeoutMs: 6000,
      });
    }

    if (res && res.status >= 200 && res.status < 300 && res.data) {
      const returnedId = res.data.id;
      if (returnedId && staff.id) {
        await run(`UPDATE users SET user_code = ? WHERE id = ?`, [returnedId, staff.id]);
      }
      return { success: true, data: res.data };
    }
    return { success: false, error: res?.data || `Status ${res?.status}` };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// Delete staff member from Central Backend (getpos.uz)
async function deleteStaffMember(userCode) {
  if (!userCode) return { success: false };
  const cfg = await getConfig();
  if (!cfg.api_url) return { success: false };
  const baseUrl = cfg.api_url.replace(/\/+$/, '');
  const token = await ensureAuthToken();

  try {
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await makeRequest({
      url: `${baseUrl}/api/v1/users/${userCode}/`,
      method: 'DELETE',
      headers,
      timeoutMs: 6000,
    });

    return { success: res.status >= 200 && res.status < 300 };
  } catch (err) {
    console.warn('[BackendSync] deleteStaffMember error:', err.message);
    return { success: false, error: err.message };
  }
}

// Real-time Push Active Order to Cloud (https://getpos.uz/api/v1/cafe/orders/)
async function pushActiveOrderToCloud({ tableId, tableName, waiterName, items, guestCount, orderId }) {
  const cfg = await getConfig();
  const baseUrl = (cfg.api_url || 'https://getpos.uz').replace(/\/+$/, '');
  const token = await ensureAuthToken();
  if (!token) return { success: false, message: 'No auth token' };

  let remoteTableId = null;
  if (tableId) {
    const tRow = await get(`SELECT remote_id, name, number FROM tables WHERE id = ? OR number = ? OR name = ?`, [tableId, tableId, tableId]);
    remoteTableId = tRow?.remote_id;
  }

  if (!remoteTableId) {
    try {
      const cloudTablesRes = await makeRequest({
        url: `${baseUrl}/api/v1/cafe/tables/`,
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` },
        timeoutMs: 5000,
      });
      const list = cloudTablesRes.data?.results || (Array.isArray(cloudTablesRes.data) ? cloudTablesRes.data : []);
      const match = list.find(t => String(t.number) === String(tableId) || t.name === tableName || t.name === `STOL - ${tableId}`);
      if (match) {
        remoteTableId = match.id;
        if (tableId) {
          await run(`UPDATE tables SET remote_id = ? WHERE id = ? OR number = ?`, [match.id, tableId, tableId]);
        }
      }
    } catch (e) {}
  }

  if (!remoteTableId) {
    console.warn('[BackendSync] Could not find remote table ID for table', tableId);
    return { success: false, message: 'Remote table ID not found' };
  }

  const payload = {
    table: remoteTableId,
    tableId: remoteTableId,
    guests_count: guestCount || 2,
    notes: '',
    items: (items || []).map(i => {
      const rawPid = i.product_id || i.productId;
      const numPid = rawPid ? parseInt(String(rawPid).replace(/\D/g, ''), 10) : null;
      return {
        ...(numPid && numPid > 0 ? { product_id: numPid } : {}),
        product_name: i.product_name || i.productName || i.name || 'Taom',
        quantity: i.quantity || i.qty || 1,
        price: i.price || i.unit_price || 0,
        comment: i.comment || '',
      };
    })
  };

  try {
    const res = await makeRequest({
      url: `${baseUrl}/api/v1/cafe/orders/`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: payload,
      timeoutMs: 6000,
    });

    if (res.status === 200 || res.status === 201) {
      console.log(`[BackendSync] Active order pushed to cloud for Table ${tableName || tableId}`);
      return { success: true, data: res.data };
    }
    return { success: false, error: res.data };
  } catch (err) {
    console.warn('[BackendSync] pushActiveOrderToCloud error:', err.message);
    return { success: false, error: err.message };
  }
}

// Push Bill Request to Cloud
async function pushBillRequestToCloud(tableIdOrOrderId) {
  const cfg = await getConfig();
  const baseUrl = (cfg.api_url || 'https://getpos.uz').replace(/\/+$/, '');
  const token = await ensureAuthToken();
  if (!token) return { success: false };

  try {
    const res = await makeRequest({
      url: `${baseUrl}/api/v1/cafe/orders/${tableIdOrOrderId}/bill-request/`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      timeoutMs: 5000,
    });
    return { success: res.status >= 200 && res.status < 300 };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// Push Close / Pay Order to Cloud
async function pushCloseOrderToCloud({ orderId, tableId, paymentMethod, totalAmount }) {
  const cfg = await getConfig();
  const baseUrl = (cfg.api_url || 'https://getpos.uz').replace(/\/+$/, '');
  const token = await ensureAuthToken();
  if (!token) return { success: false };

  try {
    const res = await makeRequest({
      url: `${baseUrl}/api/v1/cafe/orders/${orderId}/pay/`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: {
        payment_method: paymentMethod || 'cash',
        total_amount: totalAmount,
      },
      timeoutMs: 5000,
    });
    return { success: res.status >= 200 && res.status < 300 };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

module.exports = {
  getConfig,
  updateConfig,
  fetchLiveTenants,
  fetchStaffForTenant,
  loginLiveUser,
  testConnection,
  syncFromBackend,
  syncToBackend,
  pushOrderSale,
  pushActiveOrderToCloud,
  pushBillRequestToCloud,
  pushCloseOrderToCloud,
  pushStaffMember,
  deleteStaffMember,
  startPeriodicSync,
  stopPeriodicSync,
  fetchActiveBaskets,
  completeBasketTransaction,
  patchBasketStatus,
  markTablePrintedLocally,
  isTableRecentlyPrinted,
  pollCloudBillRequests,
  setBroadcastCallback,
  switchTenantAndCleanData,
  getLastSyncResult: () => lastSyncResult,
};

