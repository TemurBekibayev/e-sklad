import React, { useState, useEffect } from 'react';
import { Lock, Delete, UserCheck, ShieldCheck, User } from 'lucide-react';

export default function PinModal({ onLogin, roleHint = 'kassir' }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [tenantInfo, setTenantInfo] = useState({ name: 'Test (Mangit)', id: '' });

  // Load real staff for this tenant dynamically from backend
  useEffect(() => {
    let isMounted = true;
    async function loadStaff() {
      try {
        const res = await fetch('/api/auth/users');
        if (res.ok) {
          const data = await res.json();
          if (isMounted && Array.isArray(data) && data.length > 0) {
            setUsers(data);
            if (data[0].tenantName) {
              setTenantInfo({ name: data[0].tenantName, id: data[0].tenantId });
            }
          }
        }
      } catch (e) {
        console.warn('Could not load users for PIN modal:', e);
      }
    }
    loadStaff();
    return () => { isMounted = false; };
  }, []);

  const handleNumber = (num) => {
    if (pin.length < 6) {
      setPin((prev) => prev + num);
      setError('');
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
        }),
      });
      const data = await res.json();
      if (data.success) {
        onLogin(data.user);
      } else {
        setError(data.message || 'PIN-kod xato!');
        setPin('');
      }
    } catch (err) {
      setError('Server bilan aloqa uzilgan');
    } finally {
      setLoading(false);
    }
  };

  const selectUserAndLogin = (u) => {
    setSelectedUser(u);
    if (u.pin) {
      setPin(u.pin);
      handleSubmit(u.pin, u);
    } else {
      setPin('');
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl text-center">
        <div className="w-16 h-16 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-lg shadow-amber-500/10">
          <Lock className="w-8 h-8" />
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold mb-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>{tenantInfo.name || 'Real Backend (amuhr.uz)'}</span>
        </div>

        <h2 className="text-2xl font-bold text-white mb-1">GetPOS Kafe Avtorizatsiya</h2>
        <p className="text-sm text-slate-400 mb-4">
          {selectedUser ? (
            <span className="text-amber-400 font-semibold">{selectedUser.name} ({selectedUser.role})</span>
          ) : (
            'Davom etish uchun xodimni tanlang yoki shaxsiy PIN-kodingizni kiriting'
          )}
        </p>

        {/* Real Staff Selector Chips */}
        {users.length > 0 && (
          <div className="flex flex-wrap justify-center gap-1.5 mb-5 max-h-24 overflow-y-auto p-1 bg-slate-950/50 rounded-2xl border border-slate-800/80">
            {users.map((u) => {
              const isSelected = selectedUser?.id === u.id;
              const roleColor =
                u.role === 'admin'
                  ? 'text-indigo-400 border-indigo-500/30 bg-indigo-500/10'
                  : u.role === 'cashier'
                  ? 'text-blue-400 border-blue-500/30 bg-blue-500/10'
                  : u.role === 'cook'
                  ? 'text-orange-400 border-orange-500/30 bg-orange-500/10'
                  : 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';

              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => selectUserAndLogin(u)}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-medium border transition-all flex items-center gap-1.5 ${roleColor} ${
                    isSelected ? 'ring-2 ring-amber-400 font-bold scale-105 shadow-md' : 'hover:bg-slate-800 opacity-90 hover:opacity-100'
                  }`}
                >
                  <User className="w-3 h-3" />
                  <span>{u.name}</span>
                  {u.pin && <span className="opacity-60 text-[10px]">({u.pin})</span>}
                </button>
              );
            })}
          </div>
        )}

        {/* PIN display dots */}
        <div className="flex justify-center space-x-3 mb-5">
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

        {error && (
          <div className="mb-4 text-sm font-semibold text-rose-400 bg-rose-500/10 py-1.5 px-3 rounded-xl border border-rose-500/20">
            {error}
          </div>
        )}

        {/* Big Touch-screen Numeric Keypad */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => handleNumber(num.toString())}
              className="h-14 rounded-2xl bg-slate-800 hover:bg-slate-700 active:bg-amber-500 active:text-slate-950 text-2xl font-bold text-slate-100 transition-all active:scale-95 shadow-md flex items-center justify-center"
            >
              {num}
            </button>
          ))}
          <button
            type="button"
            onClick={handleClear}
            className="h-14 rounded-2xl bg-slate-800/60 hover:bg-slate-800 text-rose-400 font-bold text-lg active:scale-95 transition-all flex items-center justify-center"
          >
            C
          </button>
          <button
            type="button"
            onClick={() => handleNumber('0')}
            className="h-14 rounded-2xl bg-slate-800 hover:bg-slate-700 active:bg-amber-500 active:text-slate-950 text-2xl font-bold text-slate-100 transition-all active:scale-95 shadow-md flex items-center justify-center"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="h-14 rounded-2xl bg-slate-800/60 hover:bg-slate-800 text-slate-400 active:scale-95 transition-all flex items-center justify-center"
          >
            <Delete className="w-6 h-6" />
          </button>
        </div>

        <button
          onClick={() => handleSubmit()}
          disabled={loading || pin.length === 0}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 disabled:opacity-50 text-slate-950 font-black text-lg shadow-lg shadow-amber-500/25 transition-all active:scale-[0.98]"
        >
          {loading ? 'Tekshirilmoqda...' : 'TIZIMGA KIRISH'}
        </button>
      </div>
    </div>
  );
}
