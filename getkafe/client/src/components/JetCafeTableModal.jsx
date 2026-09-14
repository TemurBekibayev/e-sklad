import React, { useState } from 'react';

export default function JetCafeTableModal({ isOpen, onClose, tables = [], currentTableId, onSelectTable }) {
  const [activeHall, setActiveHall] = useState('Основной'); // 'Основной', 'ZAL 1', 'ZAL 2', 'ZAL 3', 'Все'
  const [filter, setFilter] = useState('all'); // 'all', 'free', 'busy', 'bill_requested'

  if (!isOpen) return null;

  const halls = ['Основной', 'ZAL 1', 'ZAL 2', 'ZAL 3', 'Все залы'];

  const filteredTables = tables.filter((t) => {
    // Hall filter
    const hallMatch =
      activeHall === 'Все залы'
        ? true
        : (t.hall || (t.number <= 5 ? 'Основной' : t.number <= 10 ? 'ZAL 1' : t.number <= 15 ? 'ZAL 2' : 'ZAL 3')) === activeHall;

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
      <div className="w-full max-w-5xl h-[85vh] bg-[#eff1f5] border-2 border-[#b0b8c5] rounded-md shadow-2xl flex flex-col text-slate-800 text-xs font-sans overflow-hidden">
        
        {/* Title Bar */}
        <div className="bg-gradient-to-r from-[#d9dfe8] to-[#c7d0de] border-b border-[#a8b3c4] px-3 py-1.5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 font-semibold text-slate-700 tracking-wide text-xs">
            <span className="text-emerald-600 font-bold">jetcafe</span>
            <span className="text-slate-400">|</span>
            <span>Столы (Схема залов и посадочных мест)</span>
          </div>
          <button
            onClick={onClose}
            className="w-5 h-5 flex items-center justify-center text-xs font-bold text-slate-600 hover:bg-rose-500 hover:text-white rounded transition"
          >
            ✕
          </button>
        </div>

        {/* Halls Tabs matching video2_frame_2.jpg: [Основной] [ZAL 1] [ZAL 2] [ZAL 3] */}
        <div className="bg-[#dfe5ee] px-3 pt-2 flex items-center justify-between border-b border-[#c2cbd8] shrink-0">
          <div className="flex gap-1">
            {halls.map((h) => {
              const isActive = activeHall === h;
              return (
                <button
                  key={h}
                  type="button"
                  onClick={() => setActiveHall(h)}
                  className={`px-5 py-2 text-xs rounded-t font-bold transition ${
                    isActive
                      ? 'bg-[#eff1f5] border-t-2 border-l border-r border-[#a8b3c4] border-t-blue-600 -mb-[1px] text-slate-900 shadow-sm'
                      : 'bg-[#d2d9e4] text-slate-600 hover:bg-[#dce3ec]'
                  }`}
                >
                  {h}
                </button>
              );
            })}
          </div>

          {/* Quick status counters */}
          <div className="flex items-center gap-2 pb-1.5 text-[11px]">
            <button
              onClick={() => setFilter('all')}
              className={`px-2.5 py-0.5 rounded border text-[10px] font-bold ${
                filter === 'all' ? 'bg-blue-600 text-white' : 'bg-white text-slate-700'
              }`}
            >
              Все
            </button>
            <button
              onClick={() => setFilter('free')}
              className={`px-2.5 py-0.5 rounded border text-[10px] font-bold ${
                filter === 'free' ? 'bg-emerald-600 text-white' : 'bg-white text-emerald-700'
              }`}
            >
              ● Свободные ({tables.filter((t) => t.status === 'free').length})
            </button>
            <button
              onClick={() => setFilter('busy')}
              className={`px-2.5 py-0.5 rounded border text-[10px] font-bold ${
                filter === 'busy' ? 'bg-amber-600 text-white' : 'bg-white text-amber-700'
              }`}
            >
              ● Занятые ({tables.filter((t) => t.status === 'busy').length})
            </button>
          </div>
        </div>

        {/* Tables Floor Grid matching video2_frame_2.jpg */}
        <div className="flex-1 p-6 overflow-y-auto bg-[#c5ccd8] flex flex-wrap content-start gap-4">
          {filteredTables.length === 0 ? (
            <div className="w-full h-full flex items-center justify-center text-slate-500 font-semibold text-sm">
              В данном зале нет столов
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
                  className={`w-36 h-36 rounded border cursor-pointer transition transform hover:scale-[1.02] active:scale-95 flex flex-col justify-between p-2.5 shadow-md ${
                    isCurrent ? 'ring-4 ring-blue-500 ring-offset-2' : ''
                  } ${
                    isFree
                      ? 'bg-[#1b7a2b] hover:bg-[#166c25] border-[#13571f] text-white'
                      : 'bg-[#d68910] hover:bg-[#c37b0b] border-[#996515] text-white'
                  }`}
                >
                  {/* Top: STOL X :order */}
                  <div className="flex items-center justify-between font-black text-sm">
                    <span>STOL {t.number}</span>
                    <span className="text-xs opacity-80">
                      {isBusy && t.order_id ? `:${t.order_id.slice(-2)}` : ''}
                    </span>
                  </div>

                  {/* Center: Waiter or Free info */}
                  <div className="text-center my-auto">
                    {isFree ? (
                      <span className="text-xs font-semibold opacity-70">
                        Свободен
                      </span>
                    ) : (
                      <div className="space-y-0.5">
                        <div className="text-[10px] font-medium opacity-90 truncate max-w-[120px]">
                          {t.waiter_name || t.activeWaiterName || 'Системный Администратор'}
                        </div>
                        <div className="text-xs font-black">
                          {(t.totalAmount || t.total_amount || 0).toLocaleString()} UZS
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Bottom: Hall tag */}
                  <div className="flex justify-between items-center text-[9px] opacity-75 font-semibold">
                    <span>{t.hall || 'Основной'}</span>
                    <span>4 чел</span>
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
              <span>Зеленый: Свободный стол</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 bg-[#d68910] rounded"></span>
              <span>Желто-оранжевый: Занятый стол (открыт заказ)</span>
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-gradient-to-b from-[#f7f9fa] to-[#d8e0ea] hover:from-white hover:to-[#ccd6e3] border border-[#a6b2c4] rounded font-bold text-slate-700 shadow-sm transition active:translate-y-[1px]"
          >
            Закрыть
          </button>
        </div>

      </div>
    </div>
  );
}
