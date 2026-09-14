// client/src/components/JetCafeBackendModal.jsx - Real Production Backend API (getpos.uz) Configuration Dialog
import React, { useState, useEffect } from 'react';

export default function JetCafeBackendModal({ isOpen, onClose }) {
  const [apiUrl, setApiUrl] = useState('https://getpos.uz');
  const [tenantId, setTenantId] = useState('5322a772-e9db-402a-8d2b-6293edd03832');
  const [tenantName, setTenantName] = useState('Test (Mangit)');
  const [authToken, setAuthToken] = useState('');
  const [syncInterval, setSyncInterval] = useState(30);
  const [isExternalActive, setIsExternalActive] = useState(true);

  const [tenantsList, setTenantsList] = useState([]);
  const [loadingTenants, setLoadingTenants] = useState(false);

  const [loading, setLoading] = useState(false);
  const [pingResult, setPingResult] = useState(null);
  const [syncResult, setSyncResult] = useState(null);
  const [statusMsg, setStatusMsg] = useState('');
  const [pendingCount, setPendingCount] = useState(0);

  const loadBackendConfig = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/config/backend');
      const data = await res.json();
      if (data.success && data.config) {
        setApiUrl(data.config.api_url || 'https://getpos.uz');
        setTenantId(data.config.tenant_id || '5322a772-e9db-402a-8d2b-6293edd03832');
        setTenantName(data.config.tenant_name || 'Test (Mangit)');
        setAuthToken(data.config.auth_token || '');
        setSyncInterval(data.config.sync_interval || 30);
        setIsExternalActive(data.config.is_external_active !== undefined ? !!data.config.is_external_active : true);
        setPendingCount(data.pendingCount || 0);
        if (data.lastSync) {
          setSyncResult(data.lastSync);
        }
      }
    } catch (e) {
      console.error('Error loading backend config:', e);
    } finally {
      setLoading(false);
    }
  };

  const loadLiveTenants = async () => {
    try {
      setLoadingTenants(true);
      const res = await fetch('/api/config/backend/tenants');
      const data = await res.json();
      if (data.success && Array.isArray(data.tenants)) {
        setTenantsList(data.tenants);
      }
    } catch (e) {
      console.warn('Failed to load tenants list:', e);
    } finally {
      setLoadingTenants(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadBackendConfig();
      loadLiveTenants();
      setPingResult(null);
      setStatusMsg('');
    }
  }, [isOpen]);

  const handleSelectTenant = (selectedTenantId) => {
    const selected = tenantsList.find((t) => t.id === selectedTenantId);
    if (selected) {
      setTenantId(selected.id);
      setTenantName(selected.name);
    }
  };

  const handleTestConnection = async () => {
    try {
      setLoading(true);
      setPingResult(null);
      const res = await fetch('/api/config/backend/ping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_url: apiUrl }),
      });
      const data = await res.json();
      setPingResult(data);
    } catch (e) {
      setPingResult({ success: false, message: 'Xatolik: ' + e.message });
    } finally {
      setLoading(false);
    }
  };

  const handleSyncNow = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/config/backend/sync', { method: 'POST' });
      const data = await res.json();
      setSyncResult(data.pull || data);
      setStatusMsg("Real backend (getpos.uz) bilan to'liq sinxronlash yakunlandi!");
      setTimeout(() => setStatusMsg(''), 4000);
      loadBackendConfig();
    } catch (e) {
      alert('Sinxronizatsiya xatosi: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/config/backend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_url: apiUrl,
          tenant_id: tenantId,
          tenant_name: tenantName,
          auth_token: authToken,
          sync_interval: Number(syncInterval),
          is_external_active: isExternalActive,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setStatusMsg("Real backend sozlamalari saqlandi!");
        setTimeout(() => {
          setStatusMsg('');
          onClose();
        }, 1200);
      }
    } catch (e) {
      alert('Saqlashda xatolik: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-[2px] animate-fadeIn">
      {/* Windows Dialog */}
      <div className="bg-[#f0f0f0] border-2 border-[#005a9e] rounded shadow-2xl w-full max-w-lg text-slate-800 flex flex-col font-sans select-none overflow-hidden">
        
        {/* Title Bar */}
        <div className="bg-[#005a9e] text-white px-3 py-1.5 flex items-center justify-between font-medium text-xs shadow">
          <div className="flex items-center gap-1.5">
            <span>🌐</span>
            <span>GetPOS Kafe — Real Backend API (getpos.uz) Integratsiyasi</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-5 h-4 bg-rose-600 hover:bg-rose-700 text-[10px] flex items-center justify-center font-bold rounded-sm text-white"
          >
            ✕
          </button>
        </div>

        {/* Status notification */}
        {statusMsg && (
          <div className="bg-emerald-600 text-white text-xs px-3 py-1.5 text-center font-medium animate-pulse">
            ✓ {statusMsg}
          </div>
        )}

        <div className="p-4 flex flex-col gap-3 text-xs bg-[#f9f9f9] max-h-[520px] overflow-y-auto">
          
          {/* Status Box */}
          <div className="bg-white border border-[#d0d0d0] p-3 rounded shadow-sm flex flex-col gap-2">
            <div className="flex items-center justify-between font-semibold border-b pb-1">
              <span className="text-slate-700">Tizim Rejimi:</span>
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                {isExternalActive ? 'Gibrid (getpos.uz Real API + Offline SQLite)' : 'Avtonom (Faqat Lokal)'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 pt-1">
              <div>
                Oflayn Soliq navbati: <b className="text-slate-900">{pendingCount} ta</b>
              </div>
              <div>
                Server: <b className="text-blue-700 font-mono">https://getpos.uz</b>
              </div>
            </div>

            {syncResult && syncResult.lastSyncTime && (
              <div className="text-[10px] text-slate-500 bg-slate-50 p-1.5 rounded border border-slate-200">
                Oxirgi sinxronlash: <span className="font-semibold text-slate-700">{new Date(syncResult.lastSyncTime).toLocaleTimeString()}</span> — {syncResult.message}
              </div>
            )}
          </div>

          {/* Configuration Form */}
          <div className="bg-white border border-[#d0d0d0] p-3 rounded shadow-sm flex flex-col gap-2.5">
            <div className="font-semibold text-slate-700 border-b pb-1 flex items-center justify-between">
              <span>Dasturchi Real API Parametrlari (https://getpos.uz)</span>
              <span className="text-[10px] text-emerald-600 font-normal">● Jonli Produksion Server</span>
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-semibold text-slate-700 text-[11px]">
                Backend API Server URL:
              </label>
              <input
                type="text"
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                placeholder="https://getpos.uz"
                className="w-full border border-slate-300 rounded px-2 py-1 font-mono text-xs bg-white focus:border-blue-500 focus:outline-none font-bold text-slate-900"
              />
              <span className="text-[10px] text-slate-500">
                Backend dasturchi ishlab chiqqan asosiy server: <code>https://getpos.uz</code>
              </span>
            </div>

            {/* Live Tenant Selector Dropdown */}
            <div className="flex flex-col gap-1">
              <label className="font-semibold text-slate-700 text-[11px] flex items-center justify-between">
                <span>Filial / Korxona (Live Tenants ro'yxati):</span>
                {loadingTenants && <span className="text-[10px] text-blue-600">Yuklanmoqda...</span>}
              </label>
              <select
                value={tenantId}
                onChange={(e) => handleSelectTenant(e.target.value)}
                className="w-full border border-slate-300 rounded px-2 py-1.5 text-xs bg-white focus:border-blue-500 focus:outline-none font-medium text-slate-900"
              >
                {tenantsList.length > 0 ? (
                  tenantsList.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} {t.address ? `(${t.address})` : ''} — {t.usersCount} xodim, {t.productsCount} tovar
                    </option>
                  ))
                ) : (
                  <>
                    <option value="5322a772-e9db-402a-8d2b-6293edd03832">Test (Mangit) — 2 xodim, 2 tovar</option>
                    <option value="57341e59-3c24-409f-af62-9aaec212b689">Rustam Telefon — 4 xodim</option>
                    <option value="82c1ecfb-7a39-4aa8-b597-3c8745a661b1">Toshkent Elektron — 2 xodim</option>
                  </>
                )}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <label className="font-semibold text-slate-700 text-[11px]">
                  Tenant UUID:
                </label>
                <input
                  type="text"
                  value={tenantId}
                  onChange={(e) => setTenantId(e.target.value)}
                  placeholder="5322a772-e9db-402a-8d2b-6293edd03832"
                  className="w-full border border-slate-300 rounded px-2 py-1 font-mono text-[10px] bg-slate-50 focus:border-blue-500 focus:outline-none text-slate-700"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-semibold text-slate-700 text-[11px]">
                  Filial Nomi:
                </label>
                <input
                  type="text"
                  value={tenantName}
                  onChange={(e) => setTenantName(e.target.value)}
                  placeholder="Test (Mangit)"
                  className="w-full border border-slate-300 rounded px-2 py-1 text-xs bg-white focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-[11px] font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={isExternalActive}
                  onChange={(e) => setIsExternalActive(e.target.checked)}
                  className="w-4 h-4 text-[#005a9e] rounded border-slate-300 focus:ring-0"
                />
                <span>Real backend bilan jonli sinxronlash (Live Sync)</span>
              </label>

              <div className="flex items-center gap-1 text-[11px] text-slate-500">
                <span>Oraliq:</span>
                <input
                  type="number"
                  value={syncInterval}
                  onChange={(e) => setSyncInterval(Number(e.target.value))}
                  className="w-12 border border-slate-300 rounded px-1 text-center font-mono"
                />
                <span>sek</span>
              </div>
            </div>

            {/* Test Connection Button */}
            <div className="flex gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={loading}
                className="flex-1 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-300 rounded font-semibold text-xs flex items-center justify-center gap-1.5 transition active:scale-95 shadow-sm"
              >
                <span>📡</span>
                <span>Aloqani tekshirish (Ping)</span>
              </button>

              <button
                type="button"
                onClick={handleSyncNow}
                disabled={loading}
                className="flex-1 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 rounded font-semibold text-xs flex items-center justify-center gap-1.5 transition active:scale-95 shadow-sm"
              >
                <span>🔄</span>
                <span>Jonli Sinxronlash (Sync Now)</span>
              </button>
            </div>

            {/* Ping Result Display */}
            {pingResult && (
              <div
                className={`p-2 rounded border text-[11px] ${
                  pingResult.success
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                    : 'bg-rose-50 border-rose-300 text-rose-800'
                }`}
              >
                <div className="font-bold flex items-center justify-between">
                  <span>{pingResult.success ? '✓ Aloqa o\'rnatildi (getpos.uz)' : '✕ Ulanib bo\'lmadi'}</span>
                  {pingResult.latencyMs !== undefined && (
                    <span className="font-mono text-[10px]">{pingResult.latencyMs} ms</span>
                  )}
                </div>
                <div className="mt-0.5">{pingResult.message}</div>
              </div>
            )}
          </div>

          {/* Architecture note */}
          <div className="bg-slate-100 border border-slate-200 rounded p-2.5 text-[10px] text-slate-600 leading-relaxed">
            💡 <b>Haqiqiy Ma'lumotlar bilan ishlash:</b> Kassa dasturi to'g'ridan-to'g'ri <code>https://getpos.uz</code> serveridagi aktiv xodimlar va tovarlar katalogi bilan bog'langan. Har bir amalga oshirilgan to'lov va buyurtma real vaqtda backend'dagi do'kon hisobiga o'tadi.
          </div>
        </div>

        {/* Footer buttons */}
        <div className="bg-[#e1e1e1] border-t border-[#d4d4d4] px-4 py-2 flex justify-end gap-2 text-xs">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 rounded text-slate-700 font-medium"
          >
            Yopish
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={loading}
            className="px-6 py-1.5 bg-[#005a9e] hover:bg-[#004e8a] text-white rounded font-bold transition active:scale-95 shadow-sm"
          >
            {loading ? 'Saqlanmoqda...' : 'Saqlash va Qo\'llash'}
          </button>
        </div>
      </div>
    </div>
  );
}
