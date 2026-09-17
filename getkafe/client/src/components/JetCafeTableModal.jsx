import React, { useState } from 'react';
import { Building2, Settings } from 'lucide-react';

export default function JetCafeTableModal({ 
  isOpen, 
  onClose, 
  tables = [], 
  halls = [],
  currentTableId, 
  onSelectTable,
  onOpenManageTables 
}) {
  const defaultHallName = halls[0]?.name || 'Asosiy Zal';
  const [activeHall, setActiveHall] = useState('all'); // 'all' or hall name
  const [filter, setFilter] = useState('all'); // 'all', 'free', 'busy', 'bill_requested'

  if (!isOpen) return null;

  const hallList = halls.length > 0 ? halls.map(h => h.name) : ['Asosiy Zal', 'Zal 1', 'Zal 2', '2-Qavat Zal', 'VIP Xona'];

  const filteredTables = tables.filter((t) => {
    // Hall filter
    const hallMatch =
      activeHall === 'all'
        ? true
        : (t.hall || 'Asosiy Zal') === activeHall;

    // Status filter
    let statusMatch = true;
    if (filter === 'free') statusMatch = t.status === 'free';
    if (filter === 'busy') statusMatch = t.status === 'busy';
    if (filter === 'bill_requested') statusMatch = t.status === 'bill_requested';

    return hallMatch && statusMatch;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[1px] select-none p-4">
      {/* Container matching JetCafe floor plan window */}
      <div className="w-full max-w-5xl h-[85vh] bg-[#eff1f5] border-2 border-[#b0b8c5] rounded-xl shadow-2xl flex flex-col text-slate-800 text-xs font-sans overflow-hidden">
        
        {/* Title Bar */}
        <div className="bg-gradient-to-r from-[#d9dfe8] to-[#c7d0de] border-b border-[#a8b3c4] px-3 py-1.5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 font-semibold text-slate-700 tracking-wide text-xs">
            <span className="font-black text-slate-800">GetPOS</span>
            <span className="text-amber-600 font-black">Kafe</span>
            <span className="text-slate-400">|</span>
            <span>Stollar (Zallar va o'rindiqlar sxemasi)</span>
          </div>
          <div className="flex items-center gap-2">
            {onOpenManageTables && (
              <button
                onClick={() => {
                  onClose();
                  onOpenManageTables();
                }}
                className="px-2.5 py-0.5 bg-slate-700 hover:bg-slate-800 text-white rounded text-[11px] font-bold flex items-center gap-1 transition"
              >
                <Settings className="w-3 h-3 text-orange-400" />
                <span>Stol/Zal sozlash</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="w-5 h-5 flex items-center justify-center text-xs font-bold text-slate-600 hover:bg-rose-500 hover:text-white rounded transition"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Halls Tabs */}
        <div className="bg-[#dfe5ee] px-3 pt-2 flex items-center justify-between border-b border-[#c2cbd8] shrink-0 overflow-x-auto">
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => setActiveHall('all')}
              className={`px-4 py-2 text-xs rounded-t font-bold transition whitespace-nowrap ${
                activeHall === 'all'
                  ? 'bg-[#eff1f5] border-t-2 border-l border-r border-[#a8b3c4] border-t-blue-600 -mb-[1px] text-slate-900 shadow-sm'
                  : 'bg-[#d2d9e4] text-slate-600 hover:bg-[#dce3ec]'
              }`}
            >
              Barcha zallar ({tables.length})
            </button>
            {hallList.map((h) => {
              const isActive = activeHall === h;
              const count = tables.filter((t) => (t.hall || 'Asosiy Zal') === h).length;
              return (
                <button
                  key={h}
                  type="button"
                  onClick={() => setActiveHall(h)}
                  className={`px-4 py-2 text-xs rounded-t font-bold transition whitespace-nowrap ${
                    isActive
                      ? 'bg-[#eff1f5] border-t-2 border-l border-r border-[#a8b3c4] border-t-blue-600 -mb-[1px] text-slate-900 shadow-sm'
                      : 'bg-[#d2d9e4] text-slate-600 hover:bg-[#dce3ec]'
                  }`}
                >
                  {h} ({count})
                </button>
              );
            })}
          </div>

          {/* Quick status counters */}
          <div className="flex items-center gap-2 pb-1.5 text-[11px] shrink-0 ml-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-2.5 py-0.5 rounded border text-[10px] font-bold ${
                filter === 'all' ? 'bg-blue-600 text-white' : 'bg-white text-slate-700'
              }`}
            >
              Barchasi
            </button>
            <button
              onClick={() => setFilter('free')}
              className={`px-2.5 py-0.5 rounded border text-[10px] font-bold ${
                filter === 'free' ? 'bg-emerald-600 text-white' : 'bg-white text-emerald-700'
              }`}
            >
              ● Bo'sh ({tables.filter((t) => t.status === 'free').length})
            </button>
            <button
              onClick={() => setFilter('busy')}
              className={`px-2.5 py-0.5 rounded border text-[10px] font-bold ${
                filter === 'busy' ? 'bg-amber-600 text-white' : 'bg-white text-amber-700'
              }`}
            >
              ● Band ({tables.filter((t) => t.status === 'busy').length})
            </button>
          </div>
        </div>

        {/* Tables Floor Grid */}
        <div className="flex-1 p-6 overflow-y-auto bg-[#c5ccd8] flex flex-wrap content-start gap-4">
          {filteredTables.length === 0 ? (
            <div className="w-full h-full flex items-center justify-center text-slate-500 font-semibold text-sm">
              Bu zalda stollar mavjud emas
            </div>
          ) : (
            filteredTables.map((t) => {
              const isCurrent = currentTableId === t.id;
              const isFree = t.status === 'free';
              const isBusy = t.status === 'busy' || t.status === 'bill_requested';

              return (
                <div
                  key={t.id}
                  onClick={() => {
                    onSelectTable(t);
                    onClose();
                  }}
                  className={`w-36 h-36 rounded-xl border cursor-pointer transition transform hover:scale-[1.02] active:scale-95 flex flex-col justify-between p-3 shadow-md ${
                    isCurrent ? 'ring-4 ring-blue-500 ring-offset-2' : ''
                  } ${
                    isFree
                      ? 'bg-[#1b7a2b] hover:bg-[#166c25] border-[#13571f] text-white'
                      : 'bg-[#d68910] hover:bg-[#c37b0b] border-[#996515] text-white'
                  }`}
                >
                  {/* Top: STOL X :order */}
                  <div className="flex items-center justify-between font-black text-sm">
                    <span>{t.name || `STOL ${t.number}`}</span>
                    <span className="text-xs opacity-80">
                      {isBusy && t.order_id ? `:${String(t.order_id).slice(-2)}` : ''}
                    </span>
                  </div>

                  {/* Center: Waiter or Free info */}
                  <div className="text-center my-auto">
                    {isFree ? (
                      <span className="text-xs font-semibold opacity-70">
                        Bo'sh
                      </span>
                    ) : (
                      <div className="space-y-0.5">
                        <div className="text-[10px] font-medium opacity-90 truncate max-w-[120px]">
                          {t.waiter_name || t.activeWaiterName || 'Ofitsiant'}
                        </div>
                        <div className="text-xs font-black">
                          {(t.totalAmount || t.total_amount || 0).toLocaleString()} UZS
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Bottom: Hall tag */}
                  <div className="flex justify-between items-center text-[9px] opacity-75 font-semibold">
                    <span>{t.hall || 'Asosiy Zal'}</span>
                    <span>{t.capacity || 4} kishi</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="bg-[#dfe5ee] border-t border-[#b0b9c7] px-4 py-2 flex items-center justify-between text-xs text-slate-700 shrink-0">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 bg-[#1b7a2b] rounded"></span>
              <span>Yashil: Bo'sh stol</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 bg-[#d68910] rounded"></span>
              <span>Sariq-to'q sariq: Band stol (ochiq buyurtma)</span>
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-gradient-to-b from-[#f7f9fa] to-[#d8e0ea] hover:from-white hover:to-[#ccd6e3] border border-[#a6b2c4] rounded font-bold text-slate-700 shadow-sm transition active:translate-y-[1px]"
          >
            Yopish
          </button>
        </div>

      </div>
    </div>
  );
}
