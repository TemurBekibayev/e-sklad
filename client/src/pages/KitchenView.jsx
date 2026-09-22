import React, { useState, useEffect, useRef } from 'react';

export default function KitchenView({ tickets = [], onPrintTicket, onPlayChime }) {
  const [activeOrders, setActiveOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'pending', 'preparing', 'ready'
  const [cancelModalItem, setCancelModalItem] = useState(null);
  const [cancelReason, setCancelReason] = useState("Oshxonada mavjud emas");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [nowTime, setNowTime] = useState(Date.now());

  const prevOrdersCountRef = useRef(0);

  // Auto-tick live timer every second
  useEffect(() => {
    const timerInterval = setInterval(() => {
      setNowTime(Date.now());
    }, 1000);
    return () => clearInterval(timerInterval);
  }, []);

  // Fetch active kitchen orders
  const loadKitchenOrders = async () => {
    try {
      const res = await fetch('/api/kitchen/active-orders').then((r) => r.json());
      if (res.success && Array.isArray(res.orders)) {
        setActiveOrders(res.orders);
        if (res.orders.length > prevOrdersCountRef.current && prevOrdersCountRef.current > 0) {
          if (typeof onPlayChime === 'function') onPlayChime();
        }
        prevOrdersCountRef.current = res.orders.length;
      }
    } catch (e) {
      console.error('KDS load error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadKitchenOrders();
    const pollInterval = setInterval(loadKitchenOrders, 3000); // 3-second fallback sync
    return () => clearInterval(pollInterval);
  }, []);

  // Accept Order (Qabul Qilish)
  const handleAcceptOrder = async (orderId) => {
    try {
      const res = await fetch(`/api/kitchen/orders/${orderId}/accept`, { method: 'POST' }).then((r) => r.json());
      if (res.success) {
        if (typeof onPlayChime === 'function') onPlayChime();
        loadKitchenOrders();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Mark single item ready
  const handleMarkItemReady = async (itemId) => {
    try {
      const res = await fetch(`/api/kitchen/items/${itemId}/ready`, { method: 'POST' }).then((r) => r.json());
      if (res.success) {
        if (typeof onPlayChime === 'function') onPlayChime();
        loadKitchenOrders();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Mark entire order ready
  const handleMarkOrderReady = async (orderId) => {
    try {
      const res = await fetch(`/api/kitchen/orders/${orderId}/ready`, { method: 'POST' }).then((r) => r.json());
      if (res.success) {
        if (typeof onPlayChime === 'function') onPlayChime();
        loadKitchenOrders();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Confirm item cancellation
  const handleConfirmCancelItem = async () => {
    if (!cancelModalItem) return;
    try {
      const res = await fetch(`/api/kitchen/items/${cancelModalItem.id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: cancelReason || "Oshxonada mavjud emas" }),
      }).then((r) => r.json());

      if (res.success) {
        setCancelModalItem(null);
        loadKitchenOrders();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Fullscreen mode toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // Format elapsed time (MM:SS)
  const getElapsedTime = (createdAtStr) => {
    if (!createdAtStr) return '00:00';
    const createdMs = new Date(createdAtStr).getTime();
    if (isNaN(createdMs)) return '00:00';
    const diffSec = Math.max(0, Math.floor((nowTime - createdMs) / 1000));
    const mins = Math.floor(diffSec / 60);
    const secs = diffSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Get status color based on minutes waited
  const getCardTimerBg = (createdAtStr, isPending) => {
    if (isPending) return 'bg-amber-950/90 border-amber-400 ring-4 ring-amber-500/30 animate-pulse';
    if (!createdAtStr) return 'bg-emerald-950/80 border-emerald-500';
    const createdMs = new Date(createdAtStr).getTime();
    const diffMins = (nowTime - createdMs) / 60000;
    if (diffMins >= 20) return 'bg-rose-950/90 border-rose-500 animate-pulse';
    if (diffMins >= 10) return 'bg-amber-950/80 border-amber-500';
    return 'bg-emerald-950/80 border-emerald-500';
  };

  // Filter orders
  const filteredOrders = activeOrders.filter((ord) => {
    const items = ord.items || [];
    const activeItems = items.filter((it) => !it.is_cancelled && it.quantity > 0);
    if (activeItems.length === 0) return false;

    const isPending = ord.status === 'pending' || activeItems.some((it) => it.status === 'pending' || it.status === 'sent');
    const allReady = activeItems.length > 0 && activeItems.every((it) => it.status === 'ready');

    if (filterStatus === 'pending') {
      return isPending;
    }
    if (filterStatus === 'preparing') {
      return !isPending && !allReady;
    }
    if (filterStatus === 'ready') {
      return allReady;
    }
    return true;
  });

  // SORT ORDERS: Priority 1 = Pending (QABUL QILINISHI KERAK BO'LGANLAR ENG CHAPDA!), Priority 2 = Preparing, Priority 3 = Ready
  const sortedOrders = [...filteredOrders].sort((a, b) => {
    const getPriority = (ord) => {
      const items = ord.items || [];
      const activeItems = items.filter((it) => !it.is_cancelled && it.quantity > 0);
      const allReady = activeItems.length > 0 && activeItems.every((it) => it.status === 'ready');
      const isPending = ord.status === 'pending' || activeItems.some((it) => it.status === 'pending' || it.status === 'sent');

      if (isPending) return 1; // Highest priority -> Far Left
      if (!allReady) return 2; // Middle priority -> Preparing
      return 3; // Lowest priority -> Far Right
    };

    const pA = getPriority(a);
    const pB = getPriority(b);
    if (pA !== pB) return pA - pB;

    // Secondary sort: oldest created_at first so waiting orders stay in sequence
    const tA = new Date(a.created_at || a.timestamp || 0).getTime();
    const tB = new Date(b.created_at || b.timestamp || 0).getTime();
    return tA - tB;
  });

  const pendingCount = activeOrders.filter(ord => {
    const activeItems = (ord.items || []).filter(it => !it.is_cancelled && it.quantity > 0);
    return ord.status === 'pending' || activeItems.some(it => it.status === 'pending' || it.status === 'sent');
  }).length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none p-4 md:p-6">
      {/* Top Header Bar for Smart TV */}
      <header className="flex flex-wrap justify-between items-center bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-6 shadow-2xl gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-2xl">
            👨‍🍳
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-amber-400 tracking-tight uppercase">
              Oshxona TV (Smart Display)
            </h1>
            <p className="text-sm text-slate-400 font-medium">
              Faol buyurtmalar: <span className="text-emerald-400 font-bold">{sortedOrders.length} ta</span>
              {pendingCount > 0 && (
                <span className="ml-3 px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-500 text-slate-950 animate-bounce">
                  ⚡ {pendingCount} ta qabul kutilmoqda
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Filter Tabs & Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex bg-slate-950 p-1.5 rounded-xl border border-slate-800">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-4 py-2.5 rounded-lg font-bold text-sm transition-all ${
                filterStatus === 'all'
                  ? 'bg-amber-500 text-slate-950 shadow-lg'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Barchasi ({activeOrders.length})
            </button>
            <button
              onClick={() => setFilterStatus('pending')}
              className={`px-4 py-2.5 rounded-lg font-bold text-sm transition-all ${
                filterStatus === 'pending'
                  ? 'bg-amber-400 text-slate-950 shadow-lg font-black'
                  : 'text-amber-400 hover:text-amber-300'
              }`}
            >
              Kutilmoqda ({pendingCount})
            </button>
            <button
              onClick={() => setFilterStatus('preparing')}
              className={`px-4 py-2.5 rounded-lg font-bold text-sm transition-all ${
                filterStatus === 'preparing'
                  ? 'bg-blue-500 text-slate-950 shadow-lg'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Jarayonda
            </button>
            <button
              onClick={() => setFilterStatus('ready')}
              className={`px-4 py-2.5 rounded-lg font-bold text-sm transition-all ${
                filterStatus === 'ready'
                  ? 'bg-emerald-500 text-slate-950 shadow-lg'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Tayyor
            </button>
          </div>

          <button
            onClick={toggleFullscreen}
            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold rounded-xl border border-amber-500/30 text-sm flex items-center gap-2 active:scale-95 transition-all shadow-md"
            title="Smart TV Butun ekran"
          >
            <span>📺</span> {isFullscreen ? 'Ekranni kichiklashtirish' : 'Butun ekran (TV Mode)'}
          </button>
        </div>
      </header>

      {/* Grid of Active Kitchen Tickets - Sorted with Pending / Qabul qilinadiganlar ENG CHAPDA */}
      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
          <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-xl font-semibold">Oshxona buyurtmalari yuklanmoqda...</p>
        </div>
      ) : sortedOrders.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-500 border-2 border-dashed border-slate-800 rounded-3xl p-12 text-center bg-slate-900/40">
          <span className="text-6xl mb-4">🍳</span>
          <h2 className="text-2xl font-bold text-slate-300 mb-2">Hozircha yangi buyurtmalar yo'q</h2>
          <p className="text-slate-400 max-w-md">
            Kassadan yoki mobil ilovadan yangi buyurtma yuborilishi bilan bu yerda eng chap tomonda ovozli signal bilan paydo bo'ladi.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 flex-1 items-start">
          {sortedOrders.map((ord) => {
            const items = ord.items || [];
            const activeItems = items.filter((it) => !it.is_cancelled && it.quantity > 0);
            const isPending = ord.status === 'pending' || activeItems.some((it) => it.status === 'pending' || it.status === 'sent');
            const allReady = activeItems.length > 0 && activeItems.every((it) => it.status === 'ready');
            const elapsedTime = getElapsedTime(ord.created_at);
            const timerBg = getCardTimerBg(ord.created_at, isPending);

            return (
              <div
                key={ord.id}
                className={`flex flex-col rounded-3xl border-2 transition-all duration-300 shadow-2xl overflow-hidden bg-slate-900/90 ${
                  allReady
                    ? 'border-emerald-500/80 ring-4 ring-emerald-500/20'
                    : isPending
                    ? 'border-amber-400 ring-4 ring-amber-400/30'
                    : timerBg
                }`}
              >
                {/* Header of Card */}
                <div className="p-4 bg-slate-950/80 border-b border-slate-800 flex justify-between items-center gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl md:text-3xl font-black text-amber-400">
                        {ord.tableName || `${ord.tableNumber}-stol`}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                        {ord.hallName || 'Asosiy Zal'}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 mt-1 flex items-center gap-2 font-medium">
                      <span>👤 {ord.waiterName || 'Ofitsiant'}</span>
                      <span>•</span>
                      <span>#{String(ord.id).slice(-6)}</span>
                    </div>
                  </div>

                  {/* Elapsed Timer & Status Badge */}
                  <div className="flex flex-col items-end">
                    <span className="text-2xl font-black tracking-wider text-amber-400 font-mono">
                      ⏱️ {elapsedTime}
                    </span>
                    <span className={`text-[11px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-md ${
                      isPending
                        ? 'bg-amber-400 text-slate-950 font-black animate-pulse'
                        : allReady
                        ? 'bg-emerald-500 text-slate-950'
                        : 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                    }`}>
                      {isPending ? '⚡ KUTILMOQDA' : allReady ? 'TAYYOR' : 'JARAYONDA'}
                    </span>
                  </div>
                </div>

                {/* Items List */}
                <div className="p-4 flex-1 space-y-3 max-h-[420px] overflow-y-auto">
                  {items.map((it) => {
                    const isCancelled = it.is_cancelled || it.status === 'cancelled';
                    const isReady = it.status === 'ready';

                    return (
                      <div
                        key={it.id}
                        className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                          isCancelled
                            ? 'bg-rose-950/30 border-rose-950/60 opacity-60 line-through'
                            : isReady
                            ? 'bg-emerald-950/50 border-emerald-700/60'
                            : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex items-center gap-3">
                            <span className="px-3 py-1 bg-amber-500 text-slate-950 rounded-xl font-black text-lg shadow-md">
                              {it.quantity}x
                            </span>
                            <div>
                              <p className="font-bold text-lg text-slate-100 leading-snug">
                                {it.product_name}
                              </p>
                              {it.comment && (
                                <p className="text-xs text-amber-300 italic mt-0.5 font-medium">
                                  ✏️ Izoh: {it.comment}
                                </p>
                              )}
                              {isCancelled && (
                                <p className="text-xs text-rose-400 font-semibold mt-0.5">
                                  ❌ Bekor qilingan: {it.cancel_reason || "Oshxonada yo'q"}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Mouse Action Buttons for item: Tayyor & Bekor Qilish */}
                        {!isCancelled && (
                          <div className="flex gap-2 pt-1 border-t border-slate-800/60">
                            <button
                              onClick={() => handleMarkItemReady(it.id)}
                              className={`flex-1 py-2.5 px-3 rounded-xl font-black text-sm transition-all flex items-center justify-center gap-1.5 active:scale-95 shadow-md ${
                                isReady
                                  ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                                  : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-slate-950 border border-emerald-500/40'
                              }`}
                            >
                              <span>✔</span> {isReady ? 'TAYYOR' : 'TAYYOR QILISH'}
                            </button>

                            <button
                              onClick={() => setCancelModalItem(it)}
                              className="py-2.5 px-3 rounded-xl font-bold text-xs bg-rose-950/50 text-rose-400 hover:bg-rose-600 hover:text-white border border-rose-800/50 transition-all flex items-center justify-center gap-1 active:scale-95"
                              title="Taom tugagan bo'lsa bekor qilish"
                            >
                              <span>✕</span> BEKOR
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Footer Action Buttons: Qabul qilish or Mark Entire Table Ready */}
                <div className="p-4 bg-slate-950 border-t border-slate-800 flex flex-col gap-2">
                  {isPending && (
                    <button
                      onClick={() => handleAcceptOrder(ord.id)}
                      className="w-full py-3.5 rounded-2xl font-black text-base uppercase tracking-wider bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-xl transition-all flex items-center justify-center gap-2 active:scale-95 animate-pulse"
                    >
                      <span>📥</span> QABUL QILISH (TAYYORLANISHGA O'TISH)
                    </button>
                  )}

                  <button
                    onClick={() => handleMarkOrderReady(ord.id)}
                    className={`w-full py-3.5 rounded-2xl font-black text-base uppercase tracking-wider transition-all duration-200 shadow-xl flex items-center justify-center gap-2 active:scale-95 ${
                      allReady
                        ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                        : 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 hover:from-amber-400 hover:to-amber-500'
                    }`}
                  >
                    <span>✅</span> {allReady ? 'STOL TO\'LIQ TAYYOR' : 'HAMMASINI TAYYOR DEB BELGILASH'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Item Cancellation Modal (Bekor qilish oynasi) */}
      {cancelModalItem && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-rose-500/60 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-xl font-black text-rose-400 flex items-center gap-2">
                <span>⚠️</span> Taomni bekor qilish
              </h3>
              <button
                onClick={() => setCancelModalItem(null)}
                className="w-9 h-9 bg-slate-800 text-slate-400 hover:text-white rounded-full font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <div>
              <p className="text-sm text-slate-400 mb-1">Bekor qilinayotgan taom:</p>
              <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800">
                <p className="font-bold text-lg text-slate-100">
                  {cancelModalItem.product_name} ({cancelModalItem.quantity}x)
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">
                Bekor qilish sababini tanlang:
              </label>
              <div className="grid grid-cols-1 gap-2 mb-3">
                {[
                  "Oshxonada mavjud emas (Tugagan)",
                  "Masalliq etishmaydi",
                  "Mijoz bekor qildi",
                  "Boshqa sabab"
                ].map((reason) => (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => setCancelReason(reason)}
                    className={`py-2.5 px-4 rounded-xl text-left text-sm font-semibold border transition-all ${
                      cancelReason === reason
                        ? 'bg-rose-500/20 border-rose-500 text-rose-300 font-bold'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    {reason}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setCancelModalItem(null)}
                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-2xl transition-all"
              >
                Yopish
              </button>
              <button
                onClick={handleConfirmCancelItem}
                className="flex-1 py-3 bg-rose-600 hover:bg-rose-500 text-white font-black rounded-2xl shadow-lg transition-all"
              >
                Tasdiqlash & Bekor Qilish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
