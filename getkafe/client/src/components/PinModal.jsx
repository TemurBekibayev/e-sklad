import React, { useState, useEffect } from 'react';
import { Lock, Delete, Building2 } from 'lucide-react';
import { useLanguage, LanguageSwitcher } from '../i18n/LanguageContext';

export default function PinModal({ onLogin, roleHint = 'kassir' }) {
  const { t } = useLanguage();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentStore, setCurrentStore] = useState({
    id: '',
    name: 'GetPOS Kafe',
  });

  // Load configured store name if set
  useEffect(() => {
    let isMounted = true;
    async function loadCurrentStore() {
      try {
        const configRes = await fetch('/api/config/backend');
        if (configRes.ok) {
          const cfg = await configRes.json();
          const tenantId = cfg.tenant_id || cfg.tenantId || '';
          const tenantName = cfg.tenant_name || cfg.tenantName || 'GetPOS Kafe';
          if (isMounted) {
            setCurrentStore({ id: tenantId, name: tenantName });
          }
        }
      } catch (e) {
        console.warn('Could not load store config:', e);
      }
    }
    loadCurrentStore();
    return () => { isMounted = false; };
  }, []);

  const handleNumber = (num) => {
    if (pin.length < 6) {
      const nextPin = pin + num;
      setPin(nextPin);
      setError('');
      if (nextPin.length === 4) {
        handleSubmit(nextPin);
      }
    }
  };

  const handleClear = () => {
    setPin('');
    setError('');
  };

  const handleDelete = () => {
    setPin((prev) => prev.slice(0, -1));
    setError('');
  };

  const handleSubmit = async (enteredPin = pin) => {
    if (!enteredPin) {
      setError(t('pin_enter_pin', 'PIN-kodni kiriting'));
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pin: enteredPin,
          password: enteredPin,
          tenantId: currentStore?.id || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        onLogin(data.user);
      } else {
        const errMsg = data.message || (data.error ? data.error : t('pin_wrong', "Noto'g'ri PIN-kod! (Agar PIN o'rnatmagan bo'lsangiz, Login & Parol bilan kiring)"));
        setError(errMsg);
        setPin('');
      }
    } catch (err) {
      setError(t('pin_wrong', "Noto'g'ri PIN-kod yoki server javob bermadi. Login va parol bilan kiring"));
    } finally {
      setLoading(false);
    }
  };

  // Physical keyboard listener (NumPad and top numbers)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key >= '0' && e.key <= '9') {
        handleNumber(e.key);
      } else if (e.key === 'Backspace') {
        handleDelete();
      } else if (e.key === 'Enter') {
        if (pin.length > 0) handleSubmit(pin);
      } else if (e.key === 'Escape') {
        handleClear();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pin]);

  const handleFullLogoutClick = () => {
    if (roleHint && typeof roleHint === 'function') {
      roleHint();
    } else if (onLogin && typeof onLogin === 'function') {
      localStorage.removeItem('getpos_user');
      window.location.reload();
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-50 flex items-center justify-center p-4 select-none font-sans">
      <div className="relative bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl text-center">
        
        {/* Language switcher top right */}
        <div className="absolute top-4 right-4 z-10 scale-90">
          <LanguageSwitcher />
        </div>

        {/* Top Logo / Icon */}
        <img 
          src="/getpos-kafe-logo.png" 
          alt="GetPOS Kafe" 
          className="w-16 h-16 rounded-2xl mx-auto mb-3 shadow-lg shadow-amber-500/20 bg-slate-800 p-1.5 border border-slate-700 object-contain" 
          onError={(e) => {
            e.target.style.display = 'none';
          }}
        />

        <h2 className="text-2xl font-black text-white tracking-tight mb-1">
          {currentStore.name && currentStore.name !== 'GetPOS Kafe' ? currentStore.name : 'GetPOS Kafe'}
        </h2>

        {/* User Prompt / Hint */}
        <p className="text-xs text-slate-400 mb-4">
          {t('pin_hint_default', 'Kassani faollashtirish uchun PIN-kodni tering')}
        </p>

        {/* PIN display dots */}
        <div className="flex justify-center space-x-3.5 mb-5">
          {[0, 1, 2, 3].map((idx) => (
            <div
              key={idx}
              className={`w-4 h-4 rounded-full transition-all duration-200 ${
                idx < pin.length
                  ? 'bg-amber-400 scale-125 shadow-lg shadow-amber-400/50'
                  : 'bg-slate-800 border border-slate-700'
              }`}
            />
          ))}
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 text-xs font-bold text-rose-400 bg-rose-500/10 py-2.5 px-3 rounded-xl border border-rose-500/20 animate-shake">
            {error}
          </div>
        )}

        {/* Big Touch-screen Numeric Keypad */}
        <div className="grid grid-cols-3 gap-2.5 mb-4">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => handleNumber(num.toString())}
              className="h-13 rounded-2xl bg-slate-800 hover:bg-slate-700 active:bg-amber-500 active:text-slate-950 text-2xl font-black text-slate-100 transition-all active:scale-95 shadow-md flex items-center justify-center border border-slate-700/60"
            >
              {num}
            </button>
          ))}
          <button
            type="button"
            onClick={handleClear}
            className="h-13 rounded-2xl bg-slate-800/60 hover:bg-slate-800 text-rose-400 font-black text-xl active:scale-95 transition-all flex items-center justify-center border border-slate-700/60"
            title="Tozalash"
          >
            C
          </button>
          <button
            type="button"
            onClick={() => handleNumber('0')}
            className="h-13 rounded-2xl bg-slate-800 hover:bg-slate-700 active:bg-amber-500 active:text-slate-950 text-2xl font-black text-slate-100 transition-all active:scale-95 shadow-md flex items-center justify-center border border-slate-700/60"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="h-13 rounded-2xl bg-slate-800/60 hover:bg-slate-800 text-slate-400 active:scale-95 transition-all flex items-center justify-center border border-slate-700/60"
            title="Orqaga o'chirish"
          >
            <Delete className="w-6 h-6" />
          </button>
        </div>

        {/* Unlock Action Button */}
        <button
          type="button"
          onClick={() => handleSubmit()}
          disabled={loading || pin.length === 0}
          className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-orange-500 hover:from-amber-400 hover:to-orange-400 disabled:opacity-40 text-slate-950 font-black text-sm uppercase tracking-wider shadow-lg shadow-amber-500/25 transition-all active:scale-[0.98]"
        >
          {loading ? t('pin_checking', 'Tekshirilmoqda...') : t('pin_unlock_btn', 'QULFDAN CHIQARISH (PIN)')}
        </button>

        {/* Full Logout / Switch to Login & Password Button */}
        <div className="mt-4 pt-3 border-t border-slate-800 flex flex-col items-center gap-1.5">
          <button
            type="button"
            onClick={handleFullLogoutClick}
            className="w-full py-2.5 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-amber-400 hover:text-amber-300 transition text-xs font-bold border border-slate-700/60 flex items-center justify-center gap-1.5"
          >
            <span>🔑</span>
            <span>Login va Parol bilan kirish</span>
          </button>
          <span className="text-[10px] text-slate-500">
            Agar hali PIN-kod o'rnatmagan bo'lsangiz, Login & Parol orqali kiring
          </span>
        </div>
      </div>
    </div>
  );
}
