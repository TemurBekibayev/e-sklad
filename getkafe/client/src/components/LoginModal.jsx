import React, { useState, useEffect } from 'react';
import { User, Lock, Eye, EyeOff, LogIn, Wifi, WifiOff, AlertCircle } from 'lucide-react';
import { useLanguage, LanguageSwitcher } from '../i18n/LanguageContext';

export default function LoginModal({ onLoginSuccess }) {
  const { t } = useLanguage();
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [serverOnline, setServerOnline] = useState(true);
  const [currentStore, setCurrentStore] = useState({
    id: '',
    name: 'GetPOS Kafe',
  });

  useEffect(() => {
    async function checkBackend() {
      try {
        const res = await fetch('/api/config/backend');
        if (res.ok) {
          const cfg = await res.json();
          setCurrentStore({
            id: cfg.tenant_id || cfg.tenantId || '',
            name: cfg.tenant_name || cfg.tenantName || 'GetPOS Kafe',
          });
          setServerOnline(true);
        }
      } catch (e) {
        setServerOnline(false);
      }
    }
    checkBackend();
  }, []);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!login.trim()) {
      setError(t('login_empty_login', 'Login, telefon raqam yoki emailni kiriting'));
      return;
    }
    if (!password) {
      setError(t('login_empty_password', 'Parolni kiriting'));
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          login: login.trim(),
          password: password.trim(),
        }),
      });

      const data = await res.json();
      if (data.success && (data.user || data.id)) {
        const loggedUser = data.user || {
          id: data.id,
          name: data.name,
          role: data.role,
          tenantId: data.tenantId,
          tenantName: data.tenantName,
        };
        // Persist session
        try {
          localStorage.setItem('getpos_user', JSON.stringify(loggedUser));
        } catch (_) {}

        if (onLoginSuccess) {
          onLoginSuccess(loggedUser);
        }
      } else {
        const errMsg = Array.isArray(data.message) ? data.message.join(' ') : (data.message || t('login_failed', "Noto'g'ri login yoki parol!"));
        setError(errMsg);
      }
    } catch (err) {
      setError(t('login_network_error', "Server bilan aloqa o'rnatilmadi"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-md z-50 flex items-center justify-center p-4 font-sans select-none">
      <div className="relative bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl">
        
        {/* Language switcher top right */}
        <div className="absolute top-4 right-4 z-10 scale-90">
          <LanguageSwitcher />
        </div>

        {/* Brand Header */}
        <div className="text-center mb-6">
          <img 
            src="/getpos-kafe-logo.png" 
            alt="GetPOS Kafe" 
            className="w-16 h-16 rounded-2xl mx-auto mb-3 shadow-lg shadow-amber-500/20 bg-slate-800 p-1.5 border border-slate-700 object-contain" 
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
          <h1 className="text-2xl font-black text-white tracking-tight">
            {currentStore.name && currentStore.name !== 'GetPOS Kafe' ? currentStore.name : 'GetPOS Kafe'}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {t('login_subtitle', 'Kassaga kirish uchun Login va Parolingizni kiriting')}
          </p>

          {/* Cloud status */}
          <div className="inline-flex items-center gap-1.5 mt-2.5 px-3 py-0.5 rounded-full bg-slate-800/80 border border-slate-700 text-[11px] text-slate-300">
            {serverOnline ? (
              <>
                <Wifi className="w-3 h-3 text-emerald-400" />
                <span className="text-emerald-400 font-semibold">getpos.uz Bulut</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3 h-3 text-amber-400" />
                <span className="text-amber-400 font-semibold">Lokal / Oflayn rejim</span>
              </>
            )}
          </div>
        </div>

        {/* Error notification */}
        {error && (
          <div className="mb-4 text-xs font-bold text-rose-400 bg-rose-500/10 py-2.5 px-3.5 rounded-xl border border-rose-500/20 flex items-center gap-2 animate-shake">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              {t('login_username_label', 'Login / Telefon raqam / Email')}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                autoFocus
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                placeholder="admin yoki +998 90 123 45 67"
                className="w-full pl-10 pr-3 py-3 bg-slate-800/90 border border-slate-700 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 text-sm font-medium transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              {t('login_password_label', 'Parol')}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-10 py-3 bg-slate-800/90 border border-slate-700 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 text-sm font-medium transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 transition"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-orange-500 hover:from-amber-400 hover:to-orange-400 disabled:opacity-50 text-slate-950 font-black text-base uppercase tracking-wider shadow-lg shadow-amber-500/25 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="animate-pulse">{t('login_checking', 'Tekshirilmoqda...')}</span>
            ) : (
              <>
                <LogIn className="w-5 h-5" />
                <span>{t('login_submit_btn', 'TIZIMGA KIRISH')}</span>
              </>
            )}
          </button>
        </form>

        <div className="mt-5 text-center text-[11px] text-slate-500">
          <span>Standart administrator kirishi: </span>
          <span className="font-mono text-amber-400/80 font-bold">admin</span> / <span className="font-mono text-amber-400/80 font-bold">1111</span>
        </div>

      </div>
    </div>
  );
}
