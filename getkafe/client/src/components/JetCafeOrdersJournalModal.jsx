import React, { useState, useEffect, useMemo } from 'react';
import JetCafeReceiptModal from './JetCafeReceiptModal';

export default function JetCafeOrdersJournalModal({ isOpen, onClose, initialTab = 'all' }) {
  const [orders, setOrders] = useState([]);
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(initialTab); // 'all', 'paid', 'open'
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState('desc'); // 'desc' (newest first), 'asc' (oldest first)
  const [receiptModal, setReceiptModal] = useState({ isOpen: false, orderId: null, type: 'fiscal' });

  const handleOpenReceipt = (order, type = 'fiscal') => {
    if (!order) return;
    setReceiptModal({ isOpen: true, orderId: order.id, type });
  };

  const toLocalISOString = (dateObj) => {
    const d = new Date(dateObj);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  // Default dates: Today 00:00 to Today 23:59 (Local Time)
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return toLocalISOString(d);
  });
  const [dateTo, setDateTo] = useState(() => {
    const d = new Date();
    d.setHours(23, 59, 59, 999);
    return toLocalISOString(d);
  });

  // Sync initial tab when modal opens or initialTab prop changes
  useEffect(() => {
    if (isOpen) {
      const target = initialTab === 'active' ? 'open' : (initialTab || 'all');
      setActiveTab(target);
    }
  }, [isOpen, initialTab]);

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
  }, [isOpen, dateFrom, dateTo]);

  const formatUZS = (val) => (val || 0).toLocaleString('ru-RU');

  const formatDate = (val) => {
    if (!val) return '—';
    const d = new Date(val);
    if (isNaN(d.getTime())) return '—';
    return `${d.toLocaleDateString('ru-RU')} ${d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`;
  };

  // Quick preset date setter
  const setPresetDate = (preset) => {
    const now = new Date();
    let from = new Date();
    let to = new Date();
    to.setHours(23, 59, 59, 999);

    if (preset === 'today') {
      from.setHours(0, 0, 0, 0);
    } else if (preset === 'yesterday') {
      from.setDate(now.getDate() - 1);
      from.setHours(0, 0, 0, 0);
      to.setDate(now.getDate() - 1);
      to.setHours(23, 59, 59, 999);
    } else if (preset === 'week') {
      const day = now.getDay() || 7;
      from.setDate(now.getDate() - (day - 1));
      from.setHours(0, 0, 0, 0);
    } else if (preset === 'month') {
      from.setDate(1);
      from.setHours(0, 0, 0, 0);
    }

    setDateFrom(toLocalISOString(from));
    setDateTo(toLocalISOString(to));
  };

  // Filtered & sorted orders list
  const filteredOrders = useMemo(() => {
    return orders
      .filter((ord) => {
        // Tab filter
        const isPaid = ord.status === 'Закрыт' || ord.status === 'paid' || ord.is_paid;
        const isOpenOrd = ord.is_open ?? (!isPaid && ord.status !== 'Отменен' && ord.status !== 'cancelled');

        if (activeTab === 'paid' && !isPaid) return false;
        if (activeTab === 'open' && !isOpenOrd) return false;

        // Search filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchNum = String(ord.number || '').toLowerCase().includes(q);
          const matchTable = String(ord.table || '').toLowerCase().includes(q);
          const matchWaiter = String(ord.waiter || '').toLowerCase().includes(q);
          const matchClient = String(ord.client || '').toLowerCase().includes(q);
          if (!matchNum && !matchTable && !matchWaiter && !matchClient) return false;
        }

        return true;
      })
      .sort((a, b) => {
        const timeA = new Date(a.opened_at || a.closed_at || 0).getTime();
        const timeB = new Date(b.opened_at || b.closed_at || 0).getTime();
        return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
      });
  }, [orders, activeTab, searchQuery, sortOrder]);

  // Financial Summary Totals
  const totals = useMemo(() => {
    const count = filteredOrders.length;
    const totalToPay = filteredOrders.reduce((sum, o) => sum + (o.to_pay || 0), 0);
    const totalCash = filteredOrders.reduce((sum, o) => sum + (o.cash || 0), 0);
    const totalCard = filteredOrders.reduce((sum, o) => sum + (o.card || 0), 0);
    const totalDebt = filteredOrders.reduce((sum, o) => sum + (o.debt || 0), 0);
    const avgCheck = count > 0 ? Math.round(totalToPay / count) : 0;

    return { count, totalToPay, totalCash, totalCard, totalDebt, avgCheck };
  }, [filteredOrders]);

  const exportToExcel = () => {
    if (!filteredOrders || filteredOrders.length === 0) {
      alert("Yuklab olish uchun buyurtmalar topilmadi");
      return;
    }

    const headers = ["#", "Smena", "Buyurtma №", "Stol", "Zal", "Mijoz", "Ofitsiant", "Buyurtma Vaqti (Ochilgan)", "To'langan Vaqti (Yopilgan)", "Status", "Xizmat %", "To'lov Summasi (so'm)", "Naqd", "Karta", "Qarz"];
    const rows = filteredOrders.map((ord, index) => [
      index + 1,
      ord.shift_id || 1,
      `"${ord.number || ''}"`,
      `"${(ord.table || '').replace(/"/g, '""')}"`,
      `"${(ord.hall || '').replace(/"/g, '""')}"`,
      `"${(ord.client || '').replace(/"/g, '""')}"`,
      `"${(ord.waiter || '').replace(/"/g, '""')}"`,
      `"${formatDate(ord.opened_at)}"`,
      `"${formatDate(ord.closed_at)}"`,
      `"${ord.status || ''}"`,
      ord.service_percent || 0,
      ord.to_pay || 0,
      ord.cash || 0,
      ord.card || 0,
      ord.debt || 0
    ]);

    const csvContent = "\uFEFF" + [headers.join(";"), ...rows.map(r => r.join(";"))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${activeTab === 'paid' ? 'Tolovlar_Tarixi' : 'Buyurtmalar_Jurnali'}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[1px] select-none p-3">
      <div className="w-[98vw] max-w-[1920px] h-[96vh] bg-[#eff1f5] border-2 border-[#b0b8c5] rounded-xl shadow-2xl flex flex-col text-slate-800 text-xs font-sans overflow-hidden">
        
        {/* Title & Tabs Navigation Header */}
        <div className="bg-gradient-to-r from-[#d9dfe8] to-[#c7d0de] border-b border-[#a8b3c4] px-4 py-2 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 font-bold text-slate-800 tracking-wide text-sm">
              <span className="font-black text-slate-900">GetPOS</span>
              <span className="text-amber-600 font-black">Kafe</span>
              <span className="text-slate-400">|</span>
              <span className="font-extrabold text-slate-800">Buyurtmalar va To'lovlar Tarixi</span>
            </div>

            {/* Main Tabs: Barcha Buyurtmalar vs To'lovlar Tarixi */}
            <div className="flex items-center bg-[#c7d0de] p-0.5 rounded-lg border border-[#a6b2c4] gap-1">
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className={`px-3 py-1 rounded-md text-xs font-bold transition flex items-center gap-1.5 ${
                  activeTab === 'all'
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-slate-700 hover:bg-[#d8e0ea]'
                }`}
              >
                <span>📋</span>
                <span>Barcha buyurtmalar ({orders.length})</span>
              </button>
              
              <button
                type="button"
                onClick={() => setActiveTab('paid')}
                className={`px-3 py-1 rounded-md text-xs font-bold transition flex items-center gap-1.5 ${
                  activeTab === 'paid'
                    ? 'bg-emerald-600 text-white shadow'
                    : 'text-slate-700 hover:bg-[#d8e0ea]'
                }`}
              >
                <span>💳</span>
                <span>To'lovlar tarixi ({orders.filter(o => o.status === 'Закрыт' || o.status === 'paid' || o.is_paid).length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('open')}
                className={`px-3 py-1 rounded-md text-xs font-bold transition flex items-center gap-1.5 ${
                  activeTab === 'open'
                    ? 'bg-amber-600 text-white shadow'
                    : 'text-slate-700 hover:bg-[#d8e0ea]'
                }`}
              >
                <span>⏳</span>
                <span>Ochiq buyurtmalar ({orders.filter(o => o.is_open ?? (!o.is_paid && o.status !== 'Закрыт' && o.status !== 'paid' && o.status !== 'Отменен' && o.status !== 'cancelled')).length})</span>
              </button>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center text-sm font-black text-slate-600 hover:bg-rose-500 hover:text-white rounded-lg transition"
          >
            ✕
          </button>
        </div>

        {/* Date Filter & Quick Presets Toolbar */}
        <div className="bg-[#e4e8ef] px-4 py-2 border-b border-[#c2cbd8] flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex flex-wrap items-center gap-2">
            {/* Quick Presets */}
            <div className="flex items-center gap-1 mr-2 bg-white/70 p-0.5 rounded border border-[#b8c2d1]">
              <button
                type="button"
                onClick={() => setPresetDate('today')}
                className="px-2.5 py-1 text-xs font-bold bg-[#dbe4f0] hover:bg-blue-600 hover:text-white rounded transition text-slate-800"
              >
                Bugun
              </button>
              <button
                type="button"
                onClick={() => setPresetDate('yesterday')}
                className="px-2.5 py-1 text-xs font-bold bg-[#dbe4f0] hover:bg-blue-600 hover:text-white rounded transition text-slate-800"
              >
                Kecha
              </button>
              <button
                type="button"
                onClick={() => setPresetDate('week')}
                className="px-2.5 py-1 text-xs font-bold bg-[#dbe4f0] hover:bg-blue-600 hover:text-white rounded transition text-slate-800"
              >
                Shu hafta
              </button>
              <button
                type="button"
                onClick={() => setPresetDate('month')}
                className="px-2.5 py-1 text-xs font-bold bg-[#dbe4f0] hover:bg-blue-600 hover:text-white rounded transition text-slate-800"
              >
                Shu oy
              </button>
            </div>

            {/* DateTime Pickers */}
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-700 text-xs">Vaqtdan:</span>
              <input
                type="datetime-local"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="px-2 py-1 bg-white border border-[#b8c2d1] rounded text-xs font-mono font-bold focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <span className="font-bold text-slate-700 text-xs">Gacha:</span>
              <input
                type="datetime-local"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="px-2 py-1 bg-white border border-[#b8c2d1] rounded text-xs font-mono font-bold focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={loadOrders}
                className="px-3.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold text-xs shadow transition active:translate-y-[1px]"
              >
                Ko'rsatish
              </button>
            </div>
          </div>

          {/* Search & Sort Controls */}
          <div className="flex items-center gap-2">
            {/* Search Input */}
            <input
              type="text"
              placeholder="Qidirish (Stol, №, Ofitsiant)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-3 py-1 bg-white border border-[#b8c2d1] rounded text-xs font-medium w-52 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />

            {/* Sort direction */}
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="px-2 py-1 bg-white border border-[#b8c2d1] rounded text-xs font-bold text-slate-700 focus:outline-none"
            >
              <option value="desc">Vaqt: Eng yangilar ⬇</option>
              <option value="asc">Vaqt: Eng eskilar ⬆</option>
            </select>

            {/* Export to Excel */}
            <button
              type="button"
              onClick={exportToExcel}
              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-xs shadow flex items-center gap-1.5 transition"
            >
              <span>📊</span>
              <span>Excel</span>
            </button>
          </div>
        </div>

        {/* Content Area: Split View (Top = Orders Table, Bottom = Selected Order Items) */}
        <div className="flex-1 flex flex-col min-h-0 bg-white overflow-hidden divide-y divide-[#c2cbd8]">
          
          {/* Top Panel: Orders Master Table */}
          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-[#e9edf3] text-slate-700 font-bold sticky top-0 border-b border-[#b8c2d1] shadow-sm select-none">
                <tr>
                  <th className="py-2 px-2.5 w-8 text-center">#</th>
                  <th className="py-2 px-2.5">Smena</th>
                  <th className="py-2 px-2.5">Buyurtma №</th>
                  <th className="py-2 px-2.5">Stol (Zal)</th>
                  <th className="py-2 px-2.5">Ofitsiant</th>
                  <th className="py-2 px-2.5 bg-blue-100/60 text-blue-950 font-black">Buyurtma vaqti (Ochilgan)</th>
                  <th className="py-2 px-2.5">To'langan vaqti (Yopilgan)</th>
                  <th className="py-2 px-2.5">Status</th>
                  <th className="py-2 px-2.5 text-right">% Xizmat</th>
                  <th className="py-2 px-2.5 text-right font-black text-slate-900">Jami To'lov</th>
                  <th className="py-2 px-2.5 text-right text-emerald-700 font-bold">Naqd</th>
                  <th className="py-2 px-2.5 text-right text-blue-700 font-bold">Karta</th>
                  <th className="py-2 px-2.5 text-right text-rose-700 font-bold">Qarz</th>
                  <th className="py-2 px-2.5 text-center font-black text-slate-800">Chek chiqarish</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={14} className="py-12 text-center text-slate-400 font-semibold text-sm">
                      {isLoading ? "Ma'lumotlar yuklanmoqda..." : "Tanlangan parametrlar bo'yicha buyurtmalar topilmadi"}
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((ord) => {
                    const isExpanded = expandedOrderId === ord.id;
                    const isPaid = ord.status === 'Закрыт' || ord.status === 'paid';
                    return (
                      <tr
                        key={ord.id}
                        onClick={() => setExpandedOrderId(ord.id)}
                        className={`cursor-pointer transition ${
                          isExpanded
                            ? 'bg-blue-50/90 font-semibold text-blue-950 ring-1 ring-blue-300'
                            : 'hover:bg-slate-50 text-slate-800'
                        }`}
                      >
                        <td className="py-2 px-2.5 text-center text-slate-400 font-mono text-xs">
                          {isExpanded ? '▼' : '▶'}
                        </td>
                        <td className="py-2 px-2.5 font-mono text-slate-500">{ord.shift_id}</td>
                        <td className="py-2 px-2.5 font-bold font-mono text-blue-700">#{ord.number}</td>
                        <td className="py-2 px-2.5 font-extrabold text-slate-900">{ord.table} ({ord.hall})</td>
                        <td className="py-2 px-2.5 truncate max-w-[130px] font-semibold text-slate-700">{ord.waiter}</td>
                        {/* Buyurtma vaqti */}
                        <td className="py-2 px-2.5 font-bold font-mono text-slate-900 bg-blue-50/30">
                          {formatDate(ord.opened_at)}
                        </td>
                        {/* To'langan vaqti */}
                        <td className="py-2 px-2.5 text-xs text-slate-600 font-mono">
                          {formatDate(ord.closed_at)}
                        </td>
                        <td className="py-2 px-2.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-extrabold ${
                              isPaid
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : ord.raw_status === 'bill_requested' || ord.status === "Hisob so'ralgan"
                                ? 'bg-amber-100 text-amber-900 border border-amber-400'
                                : 'bg-blue-100 text-blue-900 border border-blue-300'
                            }`}
                          >
                            {isPaid 
                              ? "To'langan (Yopilgan)" 
                              : (ord.raw_status === 'bill_requested' || ord.status === "Hisob so'ralgan")
                              ? "Hisob so'ralgan (Ochiq)"
                              : "Ochiq (Jarayonda)"}
                          </span>
                        </td>
                        <td className="py-2 px-2.5 text-right font-mono text-slate-500">{ord.service_percent}%</td>
                        <td className="py-2 px-2.5 text-right font-black font-mono text-slate-900 text-sm">
                          {formatUZS(ord.to_pay)} so'm
                        </td>
                        <td className="py-2 px-2.5 text-right font-mono font-bold text-emerald-700">
                          {ord.cash ? `${formatUZS(ord.cash)}` : '—'}
                        </td>
                        <td className="py-2 px-2.5 text-right font-mono font-bold text-blue-700">
                          {ord.card ? `${formatUZS(ord.card)}` : '—'}
                        </td>
                        <td className="py-2 px-2.5 text-right font-mono font-bold text-rose-700">
                          {ord.debt ? `${formatUZS(ord.debt)}` : '—'}
                        </td>
                        <td className="py-2 px-2 text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenReceipt(ord, 'standard')}
                              title="Oddiy hisob chekini chiqarish"
                              className="px-2 py-0.5 bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-300 rounded text-[11px] font-bold transition active:scale-95 flex items-center gap-1 shadow-2xs cursor-pointer"
                            >
                              <span>🧾</span>
                              <span>Oddiy</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenReceipt(ord, 'fiscal')}
                              title="Soliq fiskal chekini chiqarish (QR-kod bilan)"
                              className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-bold transition active:scale-95 flex items-center gap-1 shadow-2xs cursor-pointer"
                            >
                              <span>🏛️</span>
                              <span>Fiskal</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Bottom Panel: Expanded Order Items ("Buyurtma tarkibi") */}
          {expandedOrderId && (
            <div className="h-56 bg-[#f8fafc] flex flex-col shrink-0">
              <div className="bg-[#e4e8ef] px-4 py-1.5 text-xs font-bold text-slate-800 border-b border-[#c2cbd8] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="font-extrabold text-blue-900">
                    Buyurtma tarkibi #{filteredOrders.find((o) => o.id === expandedOrderId)?.number || ''} ({filteredOrders.find((o) => o.id === expandedOrderId)?.table || ''})
                  </span>
                  <span className="text-xs font-semibold text-slate-600">
                    {filteredOrders.find((o) => o.id === expandedOrderId)?.items?.length || 0} ta taom/ichimlik
                  </span>
                </div>

                {/* Qayta chek chiqarish tugmalari */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const ord = filteredOrders.find((o) => o.id === expandedOrderId);
                      if (ord) handleOpenReceipt(ord, 'standard');
                    }}
                    className="px-3 py-1 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded font-bold text-xs shadow-sm flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
                  >
                    <span>🧾</span>
                    <span>Oddiy chek</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const ord = filteredOrders.find((o) => o.id === expandedOrderId);
                      if (ord) handleOpenReceipt(ord, 'fiscal');
                    }}
                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-xs shadow flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
                  >
                    <span>🏛️</span>
                    <span>Fiskal chek</span>
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-[#edf1f7] text-slate-700 font-bold sticky top-0 border-b border-[#b8c2d1]">
                    <tr>
                      <th className="py-1.5 px-3 w-8">№</th>
                      <th className="py-1.5 px-3">Vaqti</th>
                      <th className="py-1.5 px-3">Taom / Mahsulot nomi</th>
                      <th className="py-1.5 px-3 text-right">Narxi</th>
                      <th className="py-1.5 px-3 text-center">Soni</th>
                      <th className="py-1.5 px-3 text-right">Jami summa</th>
                      <th className="py-1.5 px-3 text-center">Holati</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {filteredOrders
                      .find((o) => o.id === expandedOrderId)
                      ?.items?.map((item, idx) => {
                        const isCancelled = item.is_cancelled || item.status === 'Отменен' || item.quantity < 0;
                        return (
                          <tr
                            key={item.id || idx}
                            className={`hover:bg-slate-100 ${
                              isCancelled ? 'bg-rose-50/70 text-rose-900' : 'text-slate-800'
                            }`}
                          >
                            <td className="py-1.5 px-3 font-mono text-slate-400 text-xs">{idx + 1}</td>
                            <td className="py-1.5 px-3 text-slate-500 font-mono text-xs">{formatDate(item.time)}</td>
                            <td className={`py-1.5 px-3 font-bold uppercase ${isCancelled ? 'line-through text-slate-500' : 'text-slate-900'}`}>
                              {item.name}
                              {item.cancel_reason && (
                                <span className="ml-2 text-xs text-rose-600 font-normal italic">
                                  ({item.cancel_reason})
                                </span>
                              )}
                            </td>
                            <td className="py-1.5 px-3 text-right font-mono">{formatUZS(item.price)}</td>
                            <td className="py-1.5 px-3 text-center font-bold font-mono">
                              <span
                                className={`px-2 py-0.5 rounded ${
                                  item.quantity < 0
                                    ? 'bg-rose-600 text-white font-black'
                                    : 'bg-slate-100 text-slate-900'
                                }`}
                              >
                                {item.quantity}
                              </span>
                            </td>
                            <td className="py-1.5 px-3 text-right font-mono font-bold text-slate-900">
                              {formatUZS(item.total)}
                            </td>
                            <td className="py-1.5 px-3 text-center">
                              {isCancelled ? (
                                <span className="px-2 py-0.5 rounded border border-rose-500 text-rose-700 bg-rose-50 text-xs font-bold">
                                  Bekor qilingan
                                </span>
                              ) : (
                                <span className="text-emerald-700 text-xs font-bold">
                                  Buyurtma berilgan
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

        {/* Footer with Comprehensive Financial Calculations Summary (Hisob umumiy natijasi) */}
        <div className="bg-[#dce3ee] border-t border-[#b0b9c7] px-4 py-2.5 flex flex-wrap items-center justify-between text-xs text-slate-800 shrink-0 select-none gap-3">
          <div className="flex flex-wrap items-center gap-4 font-bold">
            <div className="bg-white/80 px-3 py-1 rounded-lg border border-slate-300 shadow-sm flex items-center gap-1.5">
              <span className="text-slate-500">Jami buyurtmalar:</span>
              <span className="text-slate-900 font-black text-sm">{totals.count} ta</span>
            </div>

            <div className="bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-300 shadow-sm flex items-center gap-1.5 text-emerald-950">
              <span className="text-emerald-700 font-bold">Umumiy Tushum:</span>
              <span className="font-black text-sm text-emerald-800">{formatUZS(totals.totalToPay)} so'm</span>
            </div>

            <div className="bg-white/80 px-3 py-1 rounded-lg border border-slate-300 shadow-sm flex items-center gap-3">
              <span className="text-emerald-700 font-bold">Naqd: <strong>{formatUZS(totals.totalCash)}</strong></span>
              <span className="text-slate-300">|</span>
              <span className="text-blue-700 font-bold">Karta: <strong>{formatUZS(totals.totalCard)}</strong></span>
              <span className="text-slate-300">|</span>
              <span className="text-rose-700 font-bold">Qarz: <strong>{formatUZS(totals.totalDebt)}</strong></span>
            </div>

            <div className="bg-amber-50 px-3 py-1 rounded-lg border border-amber-300 shadow-sm flex items-center gap-1.5 text-amber-950">
              <span className="text-amber-700 font-bold">O'rtacha chek:</span>
              <span className="font-extrabold text-amber-900">{formatUZS(totals.avgCheck)} so'm</span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-1.5 bg-slate-700 hover:bg-slate-800 text-white rounded-lg font-bold text-xs shadow transition active:translate-y-[1px]"
          >
            Yopish
          </button>
        </div>

      </div>

      {/* Chekni ko'rish va qayta chiqarish modali (Fiskal va Oddiy) */}
      {receiptModal.isOpen && (
        <JetCafeReceiptModal
          isOpen={receiptModal.isOpen}
          orderId={receiptModal.orderId}
          initialType={receiptModal.type}
          onClose={() => setReceiptModal({ isOpen: false, orderId: null, type: 'fiscal' })}
        />
      )}
    </div>
  );
}
