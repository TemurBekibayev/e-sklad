import React from 'react';
import { ChefHat, Printer, CheckCircle2, Clock, MessageSquare, Volume2 } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

export default function KitchenView({ tickets, onPrintTicket, onPlayChime }) {
  const { t, tr } = useLanguage();
  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Top bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 bg-slate-800/80 p-4 rounded-2xl border border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-orange-500/20 border border-orange-500/30 text-orange-400 flex items-center justify-center">
            <ChefHat className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white">{t('kds_title', 'Oshxona Ekrani (KDS)')}</h2>
            <p className="text-xs text-slate-400">
              {t('kds_realtime_hint', 'Buyurtmalar real-vaqtda kelib tushadi. Narxlar ko\'rsatilmaydi.')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onPlayChime}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-amber-300 font-bold text-xs active:scale-95 transition-all"
          >
            <Volume2 className="w-4 h-4" />
            <span>{t('kds_sound_alert', 'Ovozli signal')}</span>
          </button>
          <span className="text-xs font-bold px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-300">
            {t('pos_total', 'Jami')}: {tickets.length} {t('pcs', 'ta')}
          </span>
        </div>
      </div>

      {/* Tickets Grid */}
      {tickets.length === 0 ? (
        <div className="text-center py-24 bg-slate-800/30 border border-dashed border-slate-700 rounded-3xl">
          <ChefHat className="w-16 h-16 text-slate-600 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-400">{t('kds_pending', 'Hozircha yangi buyurtmalar yo\'q')}</h3>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {tickets.map((ticket, idx) => {
            const timeStr = new Date(ticket.timestamp || Date.now()).toLocaleTimeString('uz-UZ', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            });

            return (
              <div
                key={ticket.id || idx}
                className="bg-white text-slate-950 rounded-3xl p-5 shadow-2xl border-4 border-orange-500/80 flex flex-col justify-between font-mono relative overflow-hidden"
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
                        className="bg-slate-100 p-2.5 rounded-xl border border-slate-200"
                      >
                        <div className="flex items-start justify-between text-base font-black">
                          <span className="text-slate-900">{tr(item.product_name)}</span>
                          <span className="text-orange-600 bg-orange-100 px-2 py-0.5 rounded-lg text-lg">
                            x{item.quantity}
                          </span>
                        </div>

                        {/* Customer note / Izoh */}
                        {item.comment && item.comment.trim() !== '' && (
                          <div className="mt-1.5 flex items-center gap-1 text-xs font-black text-red-700 bg-red-100 px-2 py-1 rounded-lg">
                            <MessageSquare className="w-3.5 h-3.5 flex-shrink-0" />
                            <span>{t('pos_comment', 'IZOH')}: {item.comment.trim()}</span>
                          </div>
                        )}
                      </div>
                    ))}
                </div>

                {/* Footer and Print / Ready buttons */}
                <div className="border-t-2 border-dashed border-slate-400 pt-3 mt-3 flex items-center justify-between gap-2">
                  <button
                    onClick={() => onPrintTicket(ticket)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs transition-colors"
                  >
                    <Printer className="w-4 h-4" />
                    <span>{t('receipt_print', 'Printerga chiqarish')}</span>
                  </button>

                  <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{t('kds_preparing', 'Tayyorlanmoqda')}</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
