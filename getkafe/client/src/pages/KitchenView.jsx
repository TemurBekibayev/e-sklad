import React, { useState, useEffect } from 'react';
import { ChefHat, Printer, CheckCircle2, Clock, MessageSquare, Volume2, XCircle, Check, ArrowLeft, Maximize2, Minimize2, Sparkles } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { useDialog } from '../context/DialogContext';

export default function KitchenView({ 
  tickets = [], 
  onPrintTicket, 
  onRefreshTickets,
  onPlayChime,
  onUpdateStatus,
  onItemOutOfStock,
  onBackToPos
}) {
  const { t, tr } = useLanguage();
  const dialog = useDialog();
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'pending', 'in_progress', 'ready'
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
  const [isFullscreen, setIsFullscreen] = useState(Boolean(document.fullscreenElement));

  // Auto-polling for active kitchen tickets every 3 seconds
  useEffect(() => {
    if (onRefreshTickets) {
      onRefreshTickets();
      const pollInterval = setInterval(() => {
        onRefreshTickets();
      }, 3000);
      return () => clearInterval(pollInterval);
    }
  }, [onRefreshTickets]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }, 1000);
    const handleFs = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', handleFs);
    return () => {
      clearInterval(timer);
      document.removeEventListener('fullscreenchange', handleFs);
    };
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const handleOutOfStock = async (ticket, item) => {
    const dishName = item.product_name || item.name || 'Taom';
    let confirmed = false;
    if (dialog?.confirm) {
      confirmed = await dialog.confirm({
        title: "Taom Oshxonada Yo'q",
        message: `"${dishName}" taomini oshxonada YO'Q deb belgilashni tasdiqlaysizmi?\n\nBu taom ${ticket.tableNumber}-stol buyurtmasidan o'chiriladi va ofitsiant (${ticket.waiterName || 'Ofitsiant'}) ga xabarnoma boradi.`,
        confirmText: "Ha, taom yo'q",
        cancelText: "Bekor qilish",
        type: "danger"
      });
    } else {
      confirmed = window.confirm(`"${dishName}" taomini oshxonada yo'q deb belgilashni tasdiqlaysizmi?`);
    }

    if (confirmed && onItemOutOfStock) {
      onItemOutOfStock(ticket, item);
    }
  };

  const pendingCount = tickets.filter(t => !t.status || t.status === 'pending').length;
  const inProgressCount = tickets.filter(t => t.status === 'in_progress').length;
  const readyCount = tickets.filter(t => t.status === 'ready').length;

  const filteredTickets = tickets.filter(ticket => {
    const status = ticket.status || 'pending';
    if (filterStatus === 'all') return true;
    return status === filterStatus;
  });

  return (
    <div className="p-3 sm:p-5 lg:p-6 w-full h-screen bg-slate-950 text-slate-100 flex flex-col overflow-hidden select-none font-sans">
      {/* Sleek Modern Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 bg-slate-900/90 p-3 rounded-2xl border border-slate-800 shadow-2xl shrink-0 backdrop-blur-md">
        
        {/* Left: Back button & Title */}
        <div className="flex items-center gap-3">
          {onBackToPos && (
            <button
              onClick={onBackToPos}
              className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-200 hover:text-white rounded-xl font-bold text-xs border border-slate-700/80 transition-all shadow-sm active:scale-95 group"
              title="Kassaga qaytish"
            >
              <ArrowLeft className="w-4 h-4 text-amber-400 group-hover:-translate-x-0.5 transition-transform" />
              <span>{t('kds_back_to_pos', 'Kassaga qaytish')}</span>
            </button>
          )}

          <div className="h-6 w-[1px] bg-slate-800 hidden sm:block"></div>

          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-orange-500/20 border border-orange-500/40 text-orange-400 flex items-center justify-center shadow-inner">
              <ChefHat className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-black text-white tracking-wide">
                  GetPOS <span className="text-amber-400">Kafe</span>
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-orange-500/20 border border-orange-500/40 text-orange-300 font-extrabold">
                  KDS (Oshxona)
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                {t('kds_realtime_hint', "Buyurtmalar real-vaqtda kelib tushadi. Narxlar ko'rsatilmaydi.")}
              </p>
            </div>
          </div>
        </div>

        {/* Middle: Filter pills */}
        <div className="flex items-center gap-1.5 bg-slate-950/80 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filterStatus === 'all'
                ? 'bg-orange-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            Barchasi ({tickets.length})
          </button>
          <button
            onClick={() => setFilterStatus('pending')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filterStatus === 'pending'
                ? 'bg-amber-600 text-white shadow-md'
                : 'text-amber-400/80 hover:text-amber-300 hover:bg-slate-900'
            }`}
          >
            ⏳ Kutilmoqda ({pendingCount})
          </button>
          <button
            onClick={() => setFilterStatus('in_progress')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filterStatus === 'in_progress'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-blue-400/80 hover:text-blue-300 hover:bg-slate-900'
            }`}
          >
            👨‍🍳 Jarayonda ({inProgressCount})
          </button>
          <button
            onClick={() => setFilterStatus('ready')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filterStatus === 'ready'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-emerald-400/80 hover:text-emerald-300 hover:bg-slate-900'
            }`}
          >
            ✅ Tayyor ({readyCount})
          </button>
        </div>

        {/* Right: Clock & Quick Tools */}
        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs font-black text-amber-400 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            <span>{currentTime}</span>
          </div>

          <button
            onClick={onPlayChime}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs active:scale-95 transition-all border border-slate-700"
            title="Ovozli signalni sinab ko'rish"
          >
            <Volume2 className="w-4 h-4" />
            <span className="hidden sm:inline">{t('kds_sound_alert', 'Ovoz')}</span>
          </button>

          <button
            onClick={toggleFullscreen}
            className="flex items-center justify-center p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs active:scale-95 transition-all border border-slate-700"
            title="To'liq ekran"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Tickets Grid Area */}
      <div className="flex-1 overflow-y-auto min-h-0 pr-1">
        {filteredTickets.length === 0 ? (
          <div className="h-full min-h-[350px] flex flex-col items-center justify-center text-center py-16 bg-slate-900/40 border-2 border-dashed border-slate-800 rounded-3xl p-6">
            <div className="w-20 h-20 rounded-3xl bg-slate-800/60 border border-slate-700 flex items-center justify-center text-slate-500 mb-4 shadow-inner">
              <ChefHat className="w-10 h-10 text-slate-500" />
            </div>
            <h3 className="text-xl font-black text-slate-300 mb-1">
              {t('kds_pending', "Hozircha oshxonaga yangi buyurtmalar kelib tushmadi")}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm">
              Ofitsiantlar yoki kassadan buyurtma yuborilishi bilan bu yerda real-vaqtda tayyorlash uchun begunoklar paydo bo'ladi.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 pb-4">
            {filteredTickets.map((ticket, idx) => {
              const timeStr = new Date(ticket.timestamp || Date.now()).toLocaleTimeString('uz-UZ', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              });
            const status = ticket.status || 'pending';

            return (
              <div
                key={ticket.id || idx}
                className={`bg-white text-slate-950 rounded-3xl p-5 shadow-2xl flex flex-col justify-between font-mono relative overflow-hidden transition-all ${
                  status === 'ready'
                    ? 'border-4 border-emerald-500 ring-2 ring-emerald-500/20'
                    : status === 'in_progress'
                    ? 'border-4 border-blue-500 ring-2 ring-blue-500/20'
                    : 'border-4 border-amber-500 ring-2 ring-amber-500/20'
                }`}
              >
                {/* Visual thermal cut tear effect header */}
                <div className="border-b-2 border-dashed border-slate-400 pb-3 mb-3">
                  <div className="flex items-center justify-between text-xs text-slate-600">
                    <span className="font-bold">{t('kds_ticket_title', 'OSHXONA CHEKI (BEGUNOK)')}</span>
                    <span className="flex items-center gap-1 font-bold">
                      <Clock className="w-3.5 h-3.5" />
                      {timeStr}
                    </span>
                  </div>

                  <div className="flex items-center justify-between mt-2">
                    <div className="text-3xl font-black text-slate-900 tracking-tight">
                      {ticket.tableNumber}-{t('pos_table', 'STOL').toUpperCase()}
                    </div>
                    <div className="text-xs font-bold px-2.5 py-1 bg-slate-200 text-slate-800 rounded-lg">
                      👤 {tr(ticket.waiterName || t('role_waiter', 'Ofitsiant'))}
                    </div>
                  </div>
                </div>

                {/* Items List (Strictly NO PRICES!) */}
                <div className="space-y-3 my-2 flex-1">
                  {ticket.items &&
                    ticket.items.map((item, itemIdx) => (
                      <div
                        key={itemIdx}
                        className="bg-slate-100 p-2.5 rounded-xl border border-slate-200 flex flex-col gap-1.5"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-slate-900 font-black text-base flex-1">
                            {tr(item.product_name)}
                          </span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-orange-600 bg-orange-100 px-2 py-0.5 rounded-lg text-lg font-black">
                              x{item.quantity}
                            </span>
                            {status !== 'ready' && (
                              <button
                                type="button"
                                onClick={() => handleOutOfStock(ticket, item)}
                                title="Taom oshxonada yo'q - bekor qilish va ofitsiantga xabar yuborish"
                                className="px-2 py-1 bg-rose-100 hover:bg-rose-200 text-rose-700 hover:text-rose-800 rounded-lg text-xs font-black transition-colors flex items-center gap-1 border border-rose-300 active:scale-95"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                <span>Yo'q</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Customer note / Izoh */}
                        {item.comment && item.comment.trim() !== '' && (
                          <div className="flex items-center gap-1 text-xs font-black text-red-700 bg-red-100 px-2 py-1 rounded-lg">
                            <MessageSquare className="w-3.5 h-3.5 flex-shrink-0" />
                            <span>{t('pos_comment', 'IZOH')}: {item.comment.trim()}</span>
                          </div>
                        )}
                      </div>
                    ))}
                </div>

                {/* Footer with status badges and action buttons */}
                <div className="border-t-2 border-dashed border-slate-400 pt-3 mt-3 flex flex-col gap-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <button
                      onClick={() => onPrintTicket(ticket)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs transition-colors"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>{t('receipt_print', 'Chop etish')}</span>
                    </button>

                    {status === 'ready' ? (
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 font-black text-xs flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Tayyor bo'ldi</span>
                      </span>
                    ) : status === 'in_progress' ? (
                      <span className="px-2.5 py-1 rounded-lg bg-blue-100 text-blue-800 font-black text-xs flex items-center gap-1">
                        <ChefHat className="w-3.5 h-3.5 text-blue-600" />
                        <span>Tayyorlanmoqda</span>
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-800 font-black text-xs flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                        <span>Kutilmoqda</span>
                      </span>
                    )}
                  </div>

                  {/* Qabul qilish va Tayyor tugmalari */}
                  <div className="flex items-center gap-2 pt-1">
                    {status === 'pending' && (
                      <button
                        type="button"
                        onClick={() => onUpdateStatus && onUpdateStatus(ticket.id, 'in_progress')}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs shadow-md shadow-blue-500/20 active:scale-95 transition-all"
                      >
                        <ChefHat className="w-4 h-4" />
                        <span>Qabul qilish</span>
                      </button>
                    )}

                    {status !== 'ready' ? (
                      <button
                        type="button"
                        onClick={() => onUpdateStatus && onUpdateStatus(ticket.id, 'ready')}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md shadow-emerald-500/20 active:scale-95 transition-all ${
                          status === 'in_progress' ? 'w-full' : ''
                        }`}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Tayyor</span>
                      </button>
                    ) : (
                      <div className="w-full text-center py-1.5 text-xs font-black text-emerald-700 bg-emerald-100/70 rounded-xl border border-emerald-300 flex items-center justify-center gap-1">
                        <Check className="w-4 h-4" />
                        <span>Ofitsiantga xabar berildi</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      </div>
    </div>
  );
}
