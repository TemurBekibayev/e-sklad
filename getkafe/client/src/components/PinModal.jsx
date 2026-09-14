import React, { useState, useEffect } from 'react';
import { Lock, Delete, User, Building2, RefreshCw } from 'lucide-react';

export default function PinModal({ onLogin, roleHint = 'kassir' }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [currentStore, setCurrentStore] = useState({
    id: '',
    name: 'GetPOS Kafe',
  });
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);

  // 1. Load current terminal's configured store only (No multi-tenant data leak!)
  useEffect(() => {
    let isMounted = true;
    async function loadCurrentStoreAndStaff() {
      setLoadingStaff(true);
      try {
        const configRes = await fetch('/api/config/backend');
        let tenantId = '';
        let tenantName = 'GetPOS Kafe';
        if (configRes.ok) {
          const cfg = await configRes.json();
          tenantId = cfg.tenant_id || cfg.tenantId || '';
          tenantName = cfg.tenant_name || cfg.tenantName || 'GetPOS Kafe';
          if (isMounted) {
            setCurrentStore({ id: tenantId, name: tenantName });
          }
        }

        // Load staff ONLY for this store
        const staffRes = await fetch(tenantId ? `/api/auth/users?tenantId=${tenantId}` : '/api/auth/users');
        if (staffRes.ok) {
          const data = await staffRes.json();
          if (isMounted && Array.isArray(data)) {
            setUsers(data);
            if (data.length === 1) {
              setSelectedUser(data[0]);
            }
          }
        }
      } catch (e) {
        console.warn('Could not load store/staff:', e);
      } finally {
        if (isMounted) setLoadingStaff(false);
      }
    }
    loadCurrentStoreAndStaff();
    return () => { isMounted = false; };
  }, []);

  const handleNumber = (num) => {
    if (pin.length < 6) {
      const nextPin = pin + num;
      setPin(nextPin);
      setError('');
      if (nextPin.length === 4) {
        handleSubmit(nextPin, selectedUser);
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

  const handleSubmit = async (enteredPin = pin, userToLogin = selectedUser) => {
    if (!enteredPin) {
      setError('PIN-kodni kiriting');
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
          userId: userToLogin?.id || undefined,
          tenantId: currentStore?.id || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        onLogin(data.user);
      } else {
        const errMsg = Array.isArray(data.message) ? data.message.join(' ') : (data.message || "Noto'g'ri PIN-kod!");
        setError(errMsg);
        setPin('');
      }
    } catch (err) {
      setError('Server bilan aloqa uzilgan');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectUser = (u) => {
    setSelectedUser(u);
    setPin('');
    setError('');
  };

  // Physical keyboard listener (NumPad and top numbers)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key >= '0' && e.key <= '9') {
        handleNumber(e.key);
      } else if (e.key === 'Backspace') {
        handleDelete();
      } else if (e.key === 'Enter') {
        if (pin.length > 0) handleSubmit(pin, selectedUser);
      } else if (e.key === 'Escape') {
        handleClear();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pin, selectedUser]);

  const getRoleLabel = (role) => {
    if (role === 'admin' || role === 'manager') return 'Boshqaruvchi';
    if (role === 'waiter' || role === 'worker') return 'Ofitsiant';
    if (role === 'cook') return 'Oshpaz';
    if (role === 'cashier') return 'Kassir';
    return role;
  };

  return (
    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl text-center">
        
        {/* Top Logo / Icon */}
        <div className="w-14 h-14 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-2xl mx-auto flex items-center justify-center mb-3 shadow-lg shadow-amber-500/10">
          <Lock className="w-7 h-7" />
        </div>

        {/* Server & Tenant Indicator */}
        <div className="flex items-center justify-center gap-2 mb-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>https://getpos.uz</span>
          </div>
        </div>

        <h2 className="text-2xl font-bold text-white mb-1">GetPOS Kafe Avtorizatsiya</h2>

        {/* Fixed Store Badge (Multi-tenant isolated) */}
        <div className="mb-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-slate-950 border border-slate-700/80 text-slate-200 text-sm font-bold shadow-inner">
            <Building2 className="w-4 h-4 text-amber-400" />
            <span>{currentStore.name}</span>
          </div>
        </div>

        {/* User Prompt / Hint */}
        <p className="text-xs text-slate-400 mb-3">
          {selectedUser ? (
            <span className="text-amber-400 font-semibold">
              {selectedUser.name} ({getRoleLabel(selectedUser.role)})
            </span>
          ) : (
            'PIN-kodingizni kiriting yoki xodimni tanlang'
          )}
        </p>

        {/* Real Staff Selector Chips from Server */}
        {loadingStaff ? (
          <div className="py-2 text-xs text-slate-500 flex items-center justify-center gap-1.5 mb-3">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
            <span>Xodimlar yuklanmoqda...</span>
          </div>
        ) : users.length > 0 ? (
          <div className="flex flex-wrap justify-center gap-1.5 mb-4 max-h-24 overflow-y-auto p-1.5 bg-slate-950/60 rounded-2xl border border-slate-800/80">
            {users.map((u) => {
              const isSelected = selectedUser?.id === u.id;
              const roleColor =
                u.role === 'admin' || u.role === 'manager'
                  ? 'text-indigo-400 border-indigo-500/30 bg-indigo-500/10'
                  : 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';

              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => handleSelectUser(u)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all flex items-center gap-1.5 ${roleColor} ${
                    isSelected
                      ? 'ring-2 ring-amber-400 font-bold scale-105 shadow-md bg-slate-800'
                      : 'hover:bg-slate-800/80 opacity-85 hover:opacity-100'
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  <span>{u.name}</span>
                  <span className="text-[10px] opacity-60">({getRoleLabel(u.role)})</span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="py-1 text-xs text-slate-500 mb-3">
            Ushbu filialda faol xodimlar topilmadi
          </div>
        )}

        {/* PIN display dots */}
        <div className="flex justify-center space-x-3 mb-4">
          {[0, 1, 2, 3].map((idx) => (
            <div
              key={idx}
              className={`w-4 h-4 rounded-full transition-all duration-200 ${
                idx < pin.length
                  ? 'bg-amber-400 scale-110 shadow-lg shadow-amber-400/50'
                  : 'bg-slate-800 border border-slate-700'
              }`}
            />
          ))}
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-3 text-xs font-semibold text-rose-400 bg-rose-500/10 py-1.5 px-3 rounded-xl border border-rose-500/20">
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
              className="h-12 py-2 rounded-2xl bg-slate-800 hover:bg-slate-700 active:bg-amber-500 active:text-slate-950 text-2xl font-bold text-slate-100 transition-all active:scale-95 shadow-md flex items-center justify-center"
            >
              {num}
            </button>
          ))}
          <button
            type="button"
            onClick={handleClear}
            className="h-12 py-2 rounded-2xl bg-slate-800/60 hover:bg-slate-800 text-rose-400 font-bold text-lg active:scale-95 transition-all flex items-center justify-center"
          >
            C
          </button>
          <button
            type="button"
            onClick={() => handleNumber('0')}
            className="h-12 py-2 rounded-2xl bg-slate-800 hover:bg-slate-700 active:bg-amber-500 active:text-slate-950 text-2xl font-bold text-slate-100 transition-all active:scale-95 shadow-md flex items-center justify-center"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="h-12 py-2 rounded-2xl bg-slate-800/60 hover:bg-slate-800 text-slate-400 active:scale-95 transition-all flex items-center justify-center"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>

        <button
          onClick={() => handleSubmit()}
          disabled={loading || pin.length === 0}
          className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 disabled:opacity-50 text-slate-950 font-black text-base shadow-lg shadow-amber-500/25 transition-all active:scale-[0.98]"
        >
          {loading ? 'Tekshirilmoqda...' : 'TIZIMGA KIRISH'}
        </button>
      </div>
    </div>
  );
}
