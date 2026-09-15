import React, { useState, useEffect } from 'react';

export default function JetCafeOrdersJournalModal({ isOpen, onClose }) {
  const [orders, setOrders] = useState([]);
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.toISOString().slice(0, 16);
  });
  const [dateTo, setDateTo] = useState(() => {
    const d = new Date();
    d.setHours(23, 59, 59, 999);
    return d.toISOString().slice(0, 16);
  });

  const loadOrders = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/orders/journal?dateFrom=${dateFrom}&dateTo=${dateTo}`);
      const data = await res.json();
      if (data.success) {
        setOrders(data.orders || []);
        if (data.orders.length > 0 && !expandedOrderId) {
          setExpandedOrderId(data.orders[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load orders journal:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadOrders();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const formatUZS = (val) => (val || 0).toLocaleString('ru-RU');
  const formatDate = (val) => {
    if (!val) return '—';
    const d = new Date(val);
    return `${d.toLocaleDateString('ru-RU')} ${d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[1px] select-none p-4">
      {/* Modal matching video2_frame_5.jpg and video2_frame_7.jpg */}
      <div className="w-full max-w-6xl h-[85vh] bg-[#eff1f5] border-2 border-[#b0b8c5] rounded-md shadow-2xl flex flex-col text-slate-800 text-xs font-sans overflow-hidden">
        
        {/* Title Bar */}
        <div className="bg-gradient-to-r from-[#d9dfe8] to-[#c7d0de] border-b border-[#a8b3c4] px-3 py-1.5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 font-semibold text-slate-700 tracking-wide text-xs">
            <span className="text-emerald-600 font-bold">jetcafe</span>
            <span className="text-slate-400">|</span>
            <span>Заказы (Журнал и Отчет по заказам)</span>
          </div>
          <button
            onClick={onClose}
            className="w-5 h-5 flex items-center justify-center text-xs font-bold text-slate-600 hover:bg-rose-500 hover:text-white rounded transition"
          >
            ✕
          </button>
        </div>

        {/* Date Filter Toolbar matching video */}
        <div className="bg-[#e4e8ef] p-2 border-b border-[#c2cbd8] flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-600 text-xs">Дата и время с</span>
            <input
              type="datetime-local"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-2 py-1 bg-white border border-[#b8c2d1] rounded text-xs font-mono focus:outline-none"
            />
            <span className="font-semibold text-slate-600 text-xs">по</span>
            <input
              type="datetime-local"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-2 py-1 bg-white border border-[#b8c2d1] rounded text-xs font-mono focus:outline-none"
            />
            <button
              type="button"
              onClick={loadOrders}
              className="px-4 py-1 bg-gradient-to-b from-[#f7f9fa] to-[#d8e0ea] hover:from-white hover:to-[#ccd6e3] border border-[#a6b2c4] rounded font-bold text-slate-800 shadow-sm transition active:translate-y-[1px]"
            >
              Показать
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="px-3 py-1 bg-gradient-to-b from-[#f7f9fa] to-[#d8e0ea] hover:from-white hover:to-[#ccd6e3] border border-[#a6b2c4] rounded font-semibold text-slate-700 shadow-sm flex items-center gap-1.5 transition"
            >
              <span>🖨</span>
              <span>Печать</span>
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="px-3 py-1 bg-gradient-to-b from-[#f7f9fa] to-[#d8e0ea] hover:from-white hover:to-[#ccd6e3] border border-[#a6b2c4] rounded font-semibold text-slate-700 shadow-sm flex items-center gap-1.5 transition"
            >
              <span>🧾</span>
              <span>Чек</span>
            </button>
          </div>
        </div>

        {/* Content Area: Split View (Top = Orders Table, Bottom = Selected Order Items) */}
        <div className="flex-1 flex flex-col min-h-0 bg-white overflow-hidden divide-y divide-[#c2cbd8]">
          
          {/* Top Panel: Orders Master Table matching video2_frame_5.jpg */}
          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-left border-collapse text-[11px]">
              <thead className="bg-[#e9edf3] text-slate-700 font-bold sticky top-0 border-b border-[#b8c2d1] shadow-sm select-none">
                <tr>
                  <th className="py-1.5 px-2 w-8 text-center">#</th>
                  <th className="py-1.5 px-2">Смена</th>
                  <th className="py-1.5 px-2">Номер</th>
                  <th className="py-1.5 px-2">Стол</th>
                  <th className="py-1.5 px-2">Клиент</th>
                  <th className="py-1.5 px-2">Официант</th>
                  <th className="py-1.5 px-2">Открыт</th>
                  <th className="py-1.5 px-2">Закрыт</th>
                  <th className="py-1.5 px-2">Статус</th>
                  <th className="py-1.5 px-2 text-right">% обс.</th>
                  <th className="py-1.5 px-2 text-right font-black">К оплате</th>
                  <th className="py-1.5 px-2 text-right">Скидка</th>
                  <th className="py-1.5 px-2 text-right">Наличными</th>
                  <th className="py-1.5 px-2 text-right">Карточкой</th>
                  <th className="py-1.5 px-2 text-right">Долг</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={15} className="py-8 text-center text-slate-400">
                      {isLoading ? 'Загрузка данных...' : 'Заказов за выбранный период не найдено'}
                    </td>
                  </tr>
                ) : (
                  orders.map((ord) => {
                    const isExpanded = expandedOrderId === ord.id;
                    return (
                      <tr
                        key={ord.id}
                        onClick={() => setExpandedOrderId(ord.id)}
                        className={`cursor-pointer transition ${
                          isExpanded
                            ? 'bg-blue-50/80 font-semibold text-blue-950 ring-1 ring-blue-300'
                            : 'hover:bg-slate-50 text-slate-800'
                        }`}
                      >
                        <td className="py-1.5 px-2 text-center text-slate-400 font-mono text-[10px]">
                          {isExpanded ? '▼' : '▶'}
                        </td>
                        <td className="py-1.5 px-2 font-mono text-slate-500">{ord.shift_id}</td>
                        <td className="py-1.5 px-2 font-bold font-mono">{ord.number}</td>
                        <td className="py-1.5 px-2 font-bold">{ord.table} ({ord.hall})</td>
                        <td className="py-1.5 px-2 text-slate-500">{ord.client}</td>
                        <td className="py-1.5 px-2 truncate max-w-[120px]">{ord.waiter}</td>
                        <td className="py-1.5 px-2 text-[10px] text-slate-500 font-mono">{formatDate(ord.opened_at)}</td>
                        <td className="py-1.5 px-2 text-[10px] text-slate-500 font-mono">{formatDate(ord.closed_at)}</td>
                        <td className="py-1.5 px-2">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              ord.status === 'Закрыт'
                                ? 'bg-emerald-100 text-emerald-800'
                                : ord.status === 'Открыт'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {ord.status}
                          </span>
                        </td>
                        <td className="py-1.5 px-2 text-right font-mono">{ord.service_percent}%</td>
                        <td className="py-1.5 px-2 text-right font-black font-mono text-slate-900">
                          {formatUZS(ord.to_pay)}
                        </td>
                        <td className="py-1.5 px-2 text-right font-mono text-slate-500">{formatUZS(ord.discount)}</td>
                        <td className="py-1.5 px-2 text-right font-mono text-emerald-700">{formatUZS(ord.cash)}</td>
                        <td className="py-1.5 px-2 text-right font-mono text-blue-700">{formatUZS(ord.card)}</td>
                        <td className="py-1.5 px-2 text-right font-mono text-slate-400">{formatUZS(ord.debt)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Bottom Panel: Expanded Order Items ("Товары заказа") matching video2_frame_5.jpg & video2_frame_7.jpg */}
          {expandedOrderId && (
            <div className="h-56 bg-[#f8fafc] flex flex-col shrink-0">
              <div className="bg-[#e4e8ef] px-3 py-1 text-xs font-bold text-slate-700 border-b border-[#c2cbd8] flex items-center justify-between">
                <span>Товары заказа #{orders.find((o) => o.id === expandedOrderId)?.number || ''}</span>
                <span className="text-[10px] font-normal text-slate-500">
                  {orders.find((o) => o.id === expandedOrderId)?.items?.length || 0} позиций
                </span>
              </div>

              <div className="flex-1 overflow-y-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-[#edf1f7] text-slate-600 font-bold sticky top-0 border-b border-[#b8c2d1] text-[11px]">
                    <tr>
                      <th className="py-1 px-3 w-8">№</th>
                      <th className="py-1 px-3">Время</th>
                      <th className="py-1 px-3">Наименование</th>
                      <th className="py-1 px-3 text-right">Цена</th>
                      <th className="py-1 px-3 text-center">Кол-во</th>
                      <th className="py-1 px-3 text-right">Итого</th>
                      <th className="py-1 px-3 text-center">Статус</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {orders
                      .find((o) => o.id === expandedOrderId)
                      ?.items?.map((item, idx) => {
                        const isCancelled = item.is_cancelled || item.status === 'Отменен' || item.quantity < 0;
                        return (
                          <tr
                            key={item.id || idx}
                            className={`hover:bg-slate-100/60 ${
                              isCancelled ? 'bg-rose-50/50 text-rose-900' : 'text-slate-800'
                            }`}
                          >
                            <td className="py-1 px-3 font-mono text-slate-400 text-[10px]">{idx + 1}</td>
                            <td className="py-1 px-3 text-slate-500 font-mono text-[10px]">{formatDate(item.time)}</td>
                            <td className={`py-1 px-3 font-semibold uppercase ${isCancelled ? 'line-through text-slate-500' : ''}`}>
                              {item.name}
                              {item.cancel_reason && (
                                <span className="ml-2 text-[10px] text-rose-600 font-normal italic">
                                  ({item.cancel_reason})
                                </span>
                              )}
                            </td>
                            <td className="py-1 px-3 text-right font-mono">{formatUZS(item.price)}</td>
                            <td className="py-1 px-3 text-center font-bold font-mono">
                              <span
                                className={`px-2 py-0.5 rounded ${
                                  item.quantity < 0
                                    ? 'bg-rose-600 text-white font-black'
                                    : 'text-slate-800'
                                }`}
                              >
                                {item.quantity}
                              </span>
                            </td>
                            <td className="py-1 px-3 text-right font-mono font-bold">
                              {formatUZS(item.total)}
                            </td>
                            <td className="py-1 px-3 text-center">
                              {isCancelled ? (
                                <span className="px-2 py-0.5 rounded border border-rose-500 text-rose-700 bg-rose-50 text-[10px] font-black tracking-wide">
                                  Отменен
                                </span>
                              ) : (
                                <span className="text-slate-500 text-[11px]">
                                  Заказано
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>

        {/* Footer with totals */}
        <div className="bg-[#dfe5ee] border-t border-[#b0b9c7] px-4 py-2 flex items-center justify-between text-xs text-slate-700 shrink-0 select-none">
          <div className="flex items-center gap-4">
            <span>Всего заказов: <strong>{orders.length}</strong></span>
            <span>
              Сумма выручки:{' '}
              <strong className="text-emerald-700">
                {formatUZS(orders.reduce((sum, o) => sum + (o.to_pay || 0), 0))} UZS
              </strong>
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
