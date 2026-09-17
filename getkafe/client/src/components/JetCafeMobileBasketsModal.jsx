import React, { useState } from 'react';
import { Smartphone, X, Check, ShoppingBag, ArrowRight, Clock, User, DollarSign, RefreshCw } from 'lucide-react';

export default function JetCafeMobileBasketsModal({
  isOpen,
  onClose,
  baskets = [],
  onLoadBasketToCart,
  onRefresh,
}) {
  const [selectedBasket, setSelectedBasket] = useState(null);
  const [loadingAction, setLoadingAction] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState('');
  const [paymentError, setPaymentError] = useState('');

  if (!isOpen) return null;

  const handleLoad = async (basket) => {
    setLoadingAction(true);
    try {
      if (onLoadBasketToCart) {
        await onLoadBasketToCart(basket);
      }
      onClose();
    } catch (e) {
      setPaymentError(e.message);
    } finally {
      setLoadingAction(false);
    }
  };

  const handleQuickPay = async (basket, method = 'cash') => {
    setLoadingAction(true);
    setPaymentError('');
    setPaymentSuccess('');
    try {
      const res = await fetch(`/api/baskets/${basket.id}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentMethod: method,
          totalAmount: parseFloat(basket.total_amount || 0),
          clientName: basket.client_name || '',
          clientPhone: basket.client_phone || '',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setPaymentSuccess(`Savat to'lovi qabul qilindi! (${method.toUpperCase()})`);
        setTimeout(() => {
          if (onRefresh) onRefresh();
          onClose();
        }, 1200);
      } else {
        setPaymentError(data.message || 'To\'lovda xatolik yuz berdi');
      }
    } catch (err) {
      setPaymentError('Server bilan aloqa uzildi');
    } finally {
      setLoadingAction(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-800/90 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <Smartphone className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Mobil Savatlar (Kassaga Uzatilgan)
                <span className="px-2 py-0.5 rounded-full text-xs font-black bg-emerald-500 text-slate-950">
                  {baskets.length} ta faol
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Ofitsiant va xodimlar mobil ilovadan yuborgan savatlarni chekka yuklash
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onRefresh && (
              <button
                onClick={onRefresh}
                title="Yangilash"
                className="p-2 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Notifications */}
        {paymentSuccess && (
          <div className="mx-5 mt-3 p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-2">
            <Check className="w-4 h-4" />
            <span>{paymentSuccess}</span>
          </div>
        )}
        {paymentError && (
          <div className="mx-5 mt-3 p-3 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-2">
            <X className="w-4 h-4" />
            <span>{paymentError}</span>
          </div>
        )}

        {/* Body Content */}
        <div className="p-5 overflow-y-auto flex-1 space-y-3">
          {baskets.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <ShoppingBag className="w-12 h-12 mx-auto mb-3 opacity-30 text-emerald-400" />
              <p className="text-sm font-medium">Hozircha yangi mobil savat yo'q</p>
              <p className="text-xs text-slate-500 mt-1">
                Xodim mobil ilovada "Kassaga Uzatish" tugmasini bossa, bu yerda avtomatik paydo bo'ladi.
              </p>
            </div>
          ) : (
            baskets.map((b) => {
              const total = parseFloat(b.total_amount || 0).toLocaleString('uz-UZ');
              const items = b.items || [];
              const timeStr = b.created_at ? new Date(b.created_at).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' }) : '';

              return (
                <div
                  key={b.id}
                  className="bg-slate-800/70 border border-slate-700 rounded-xl p-4 hover:border-emerald-500/50 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex-1 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded-lg text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {b.worker_name || 'Xodim'}
                      </span>
                      {b.client_name && (
                        <span className="text-xs font-semibold text-slate-200">
                          {b.client_name}
                        </span>
                      )}
                      <span className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {timeStr}
                      </span>
                    </div>

                    {/* Items snippet */}
                    <div className="text-xs text-slate-300 space-y-0.5 pt-1">
                      {items.map((it, idx) => (
                        <div key={idx} className="flex justify-between text-slate-400">
                          <span>
                            • {it.product_name} <span className="text-slate-500">x{parseFloat(it.quantity)}</span>
                          </span>
                          <span className="font-mono text-slate-300">
                            {parseFloat(it.subtotal || 0).toLocaleString('uz-UZ')} so'm
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="pt-2 flex items-baseline gap-2">
                      <span className="text-xs text-slate-400 font-semibold">Jami:</span>
                      <span className="text-base font-black text-emerald-400 font-mono">
                        {total} so'm
                      </span>
                      <span className="text-[11px] text-slate-500">({items.length} xil mahsulot)</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex sm:flex-col gap-2 shrink-0">
                    <button
                      onClick={() => handleLoad(b)}
                      disabled={loadingAction}
                      className="flex-1 sm:flex-none px-3.5 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                    >
                      <ArrowRight className="w-4 h-4" />
                      <span>Chekka Yuklash</span>
                    </button>

                    <div className="flex gap-1">
                      <button
                        onClick={() => handleQuickPay(b, 'cash')}
                        disabled={loadingAction}
                        title="Naqd pul bilan to'lovni yopish"
                        className="px-2.5 py-1.5 bg-slate-700 hover:bg-slate-600 text-amber-300 font-bold text-xs rounded-lg border border-slate-600 active:scale-95 transition-all"
                      >
                        Naqd
                      </button>
                      <button
                        onClick={() => handleQuickPay(b, 'card')}
                        disabled={loadingAction}
                        title="Karta / Terminal bilan to'lovni yopish"
                        className="px-2.5 py-1.5 bg-slate-700 hover:bg-slate-600 text-blue-300 font-bold text-xs rounded-lg border border-slate-600 active:scale-95 transition-all"
                      >
                        Karta
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-800/80 border-t border-slate-700 flex justify-between items-center text-xs text-slate-400">
          <span>Server: <strong className="text-emerald-400">https://getpos.uz</strong></span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-xl transition-all"
          >
            Yopish
          </button>
        </div>
      </div>
    </div>
  );
}
