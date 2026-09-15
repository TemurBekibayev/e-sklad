import React, { useState, useEffect } from 'react';
import { X, CreditCard, Calendar, CheckCircle2, ShieldCheck, DollarSign } from 'lucide-react';

export default function PaymentModal({ isOpen, onClose, tenant, onPaymentSuccess }) {
  const [months, setMonths] = useState(1);
  const [amount, setAmount] = useState(250000);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const monthlyFee = tenant?.subscription_monthly_fee 
    ? parseFloat(tenant.subscription_monthly_fee) 
    : 250000;

  useEffect(() => {
    if (tenant) {
      setMonths(1);
      setAmount(monthlyFee);
      setPaymentMethod('cash');
      setNotes('');
      setError('');
    }
  }, [tenant, isOpen]);

  const handleMonthsChange = (m) => {
    setMonths(m);
    setAmount(monthlyFee * m);
  };

  // Calculate new paid_until preview
  const calculateNewDate = () => {
    let baseDate = new Date();
    if (tenant?.paid_until) {
      const currentPaid = new Date(tenant.paid_until);
      if (currentPaid > baseDate) {
        baseDate = currentPaid;
      }
    }
    const newDate = new Date(baseDate);
    newDate.setMonth(newDate.getMonth() + months);
    return newDate.toLocaleDateString('ru-RU');
  };

  if (!isOpen || !tenant) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const response = await fetch(`/api/v1/tenants/${tenant.id}/record-payment/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token') || ''}`
        },
        body: JSON.stringify({
          amount: parseFloat(amount),
          months: parseInt(months),
          payment_method: paymentMethod,
          notes: notes
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || data.message || "To'lovni qabul qilishda xatolik yuz berdi");
      }

      if (onPaymentSuccess) {
        onPaymentSuccess(data);
      }
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-white border border-white/20 shadow-inner">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight">Oylik To'lov Qabul Qilish</h3>
              <p className="text-xs text-blue-100 font-medium">{tenant.name}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-xl p-1.5 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-bold text-red-700">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          
          {/* Tenant Status Alert */}
          <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center justify-between text-xs">
            <div>
              <span className="text-slate-500 font-medium block">Hozirgi holati:</span>
              <span className="font-bold text-slate-900">
                {tenant.status === 'active' ? (
                  <span className="text-emerald-600">🟢 Faol</span>
                ) : (
                  <span className="text-red-600">🔴 Muzlatilgan (To'lov muddati o'tgan)</span>
                )}
              </span>
            </div>
            <div className="text-right">
              <span className="text-slate-500 font-medium block">Amal qilish muddati:</span>
              <span className="font-bold text-slate-900">
                {tenant.paid_until ? new Date(tenant.paid_until).toLocaleDateString('ru-RU') : "Belgilanmagan"}
              </span>
            </div>
          </div>

          {/* Quick Duration Buttons */}
          <div>
            <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">
              To'lov muddati (Necha oy)
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { m: 1, label: '1 Oy' },
                { m: 3, label: '3 Oy' },
                { m: 6, label: '6 Oy' },
                { m: 12, label: '1 Yil' },
              ].map(({ m, label }) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => handleMonthsChange(m)}
                  className={`py-2.5 px-2 rounded-xl text-xs font-bold border transition-all text-center ${
                    months === m
                      ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/20 scale-[1.02]'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Amount & New Date preview */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                To'lov summasi (so'm)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min={0}
                  step={1000}
                  required
                  value={amount}
                  onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-black text-blue-600 focus:outline-none focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                Yangi to'langan muddat
              </label>
              <div className="px-3.5 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-sm font-black text-emerald-700 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{calculateNewDate()} gacha</span>
              </div>
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
              To'lov usuli
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:bg-white focus:border-blue-600"
            >
              <option value="cash">💵 Naqd pul</option>
              <option value="card">💳 Bank kartasi (Humo / Uzcard / Visa)</option>
              <option value="bank_transfer">🏦 Bank o'tkazmasi (Hisob raqam)</option>
              <option value="click">📱 Click</option>
              <option value="payme">📱 Payme</option>
              <option value="admin">⚙️ Admin tomonidan uzaytirildi (Imtiyoz)</option>
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
              Izoh <span className="text-slate-400 font-normal">(ixtiyoriy)</span>
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Masalan: Sentabr oyi to'lovi qabul qilindi"
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white"
            />
          </div>

          {/* Unblock notice */}
          <div className="p-3 bg-blue-50 border border-blue-100 rounded-2xl flex items-start gap-2.5 text-xs text-blue-900 leading-relaxed font-medium">
            <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <span>
              To'lov tasdiqlanganda do'kon avtomatik ravishda <strong>FAOL</strong> holatiga o'tadi va barcha xizmatlar, kassa hamda mobil ilovalar uchun blok darhol ochiladi.
            </span>
          </div>

          {/* Action buttons */}
          <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
            >
              Bekor qilish
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 text-xs font-black text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-lg shadow-blue-600/25 active:scale-95 transition disabled:opacity-50 flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? "Saqlanmoqda..." : "To'lovni Tasdiqlash & Ochish"}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
