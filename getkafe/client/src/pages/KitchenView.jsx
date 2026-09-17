import React, { useState } from 'react';
import { ChefHat, Printer, CheckCircle2, Clock, MessageSquare, Volume2, XCircle, Check } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { useDialog } from '../context/DialogContext';

export default function KitchenView({ 
  tickets = [], 
  onPrintTicket, 
  onPlayChime,
  onUpdateStatus,
  onItemOutOfStock
}) {
  const { t, tr } = useLanguage();
  const dialog = useDialog();
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'pending', 'in_progress', 'ready'

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
    <div className="p-4 sm:p-6 lg:p-8 w-full min-h-full flex-1 bg-slate-950 text-slate-100 flex flex-col">
      {/* Top bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 bg-slate-800/80 p-4 rounded-2xl border border-slate-700 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-orange-500/20 border border-orange-500/30 text-orange-400 flex items-center justify-center">
            <ChefHat className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white">{t('kds_title', 'Oshxona Ekrani (KDS)')}</h2>
            <p className="text-xs text-slate-400">
              {t('kds_realtime_hint', "Buyurtmalar real-vaqtda kelib tushadi. Narxlar ko'rsatilmaydi.")}
            </p>
          </div>
        </div>

        {/* Filter pills */}
        <div className="flex items-center gap-2 bg-slate-900/80 p-1 rounded-xl border border-slate-700">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filterStatus === 'all'
                ? 'bg-orange-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Barchasi ({tickets.length})
          </button>
          <button
            onClick={() => setFilterStatus('pending')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filterStatus === 'pending'
                ? 'bg-amber-600 text-white shadow-md'
                : 'text-amber-400/80 hover:text-amber-300'
            }`}
          >
            ⏳ Kutilmoqda ({pendingCount})
          </button>
          <button
            onClick={() => setFilterStatus('in_progress')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filterStatus === 'in_progress'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-blue-400/80 hover:text-blue-300'
            }`}
          >
            👨‍🍳 Jarayonda ({inProgressCount})
          </button>
          <button
            onClick={() => setFilterStatus('ready')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filterStatus === 'ready'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-emerald-400/80 hover:text-emerald-300'
            }`}
          >
            ✅ Tayyor ({readyCount})
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onPlayChime}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-amber-300 font-bold text-xs active:scale-95 transition-all"
          >
            <Volume2 className="w-4 h-4" />
            <span>{t('kds_sound_alert', 'Ovozli signal')}</span>
          </button>
        </div>
      </div>

      {/* Tickets Grid */}
      {filteredTickets.length === 0 ? (
        <div className="text-center py-24 bg-slate-800/30 border border-dashed border-slate-700 rounded-3xl">
          <ChefHat className="w-16 h-16 text-slate-600 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-400">{t('kds_pending', "Hozircha yangi buyurtmalar yo'q")}</h3>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-5 flex-1">
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
  );
}
