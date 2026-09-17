import React, { useState, useEffect } from 'react';
import { Search, Download, DollarSign, CheckCircle2, AlertCircle, Clock, Trash2, X } from 'lucide-react';

export default function JetCafeDebtsModal({ isOpen, onClose }) {
  const [debts, setDebts] = useState([]);
  const [summary, setSummary] = useState({ total_debt: 0, total_paid: 0, total_unpaid: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'unpaid', 'partially_paid', 'paid'
  
  // Pay modal state
  const [payModalDebt, setPayModalDebt] = useState(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('cash'); // 'cash', 'card'
  const [isSubmittingPay, setIsSubmittingPay] = useState(false);

  const loadDebts = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/debts');
      const data = await res.json();
      if (data.success) {
        setDebts(data.debts || []);
        setSummary(data.summary || { total_debt: 0, total_paid: 0, total_unpaid: 0 });
      }
    } catch (err) {
      console.error('Failed to load debts:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadDebts();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const formatUZS = (val) => (Number(val) || 0).toLocaleString('ru-RU');
  const formatDate = (val) => {
    if (!val) return '—';
    const d = new Date(val);
    return `${d.toLocaleDateString('ru-RU')} ${d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`;
  };

  const filteredDebts = debts.filter((d) => {
    const q = searchQuery.toLowerCase();
    const nameMatch = (d.client_name || '').toLowerCase().includes(q);
    const phoneMatch = (d.client_phone || '').toLowerCase().includes(q);
    const tableMatch = (`Stol ${d.table_number || ''}`).toLowerCase().includes(q);

    let statusMatch = true;
    if (statusFilter === 'unpaid') statusMatch = d.status === 'unpaid';
    if (statusFilter === 'partially_paid') statusMatch = d.status === 'partially_paid';
    if (statusFilter === 'paid') statusMatch = d.status === 'paid';

    return (nameMatch || phoneMatch || tableMatch) && statusMatch;
  });

  const handleOpenPayModal = (debt) => {
    setPayModalDebt(debt);
    setPayAmount(debt.remaining_amount || 0);
    setPayMethod('cash');
  };

  const handleConfirmPay = async (e) => {
    e.preventDefault();
    if (!payModalDebt || !payAmount || Number(payAmount) <= 0) return;
    setIsSubmittingPay(true);
    try {
      const res = await fetch(`/api/debts/${payModalDebt.id}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: Number(payAmount),
          paymentMethod: payMethod,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setPayModalDebt(null);
        await loadDebts();
      } else {
        alert('Хатолик: ' + (data.message || 'Qarz to\'lovini amalga oshirib bo\'lmadi'));
      }
    } catch (err) {
      alert('Tizim xatoligi: ' + err.message);
    } finally {
      setIsSubmittingPay(false);
    }
  };

  const handleDeleteDebt = async (debtId) => {
    if (!window.confirm("Haqiqatdan ham ushbu qarz ma'lumotini o'chirmoqchimisiz?")) return;
    try {
      const res = await fetch(`/api/debts/${debtId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        await loadDebts();
      } else {
        alert('Хатолик: ' + data.message);
      }
    } catch (err) {
      alert('Tizim xatoligi: ' + err.message);
    }
  };

  // Excel (.csv) Export function with UTF-8 BOM
  const exportToExcel = () => {
    if (filteredDebts.length === 0) {
      alert("Yuklab olish uchun qarzdorliklar topilmadi");
      return;
    }

    const headers = ["#", "Qarzdor Ismi", "Telefon", "Stol", "Ofitsiant", "Sana", "Jami Qarz (so'm)", "To'langan (so'm)", "Qolgan Qarz (so'm)", "Holat", "Izoh"];
    const rows = filteredDebts.map((d, index) => [
      index + 1,
      `"${(d.client_name || '').replace(/"/g, '""')}"`,
      `"${(d.client_phone || '').replace(/"/g, '""')}"`,
      `"${d.table_number ? `Stol ${d.table_number}` : '—'}"`,
      `"${(d.waiter_name || '').replace(/"/g, '""')}"`,
      `"${formatDate(d.created_at)}"`,
      d.total_amount || 0,
      d.paid_amount || 0,
      d.remaining_amount || 0,
      `"${d.status === 'paid' ? 'To\'langan' : d.status === 'partially_paid' ? 'Qisman to\'langan' : 'To\'lanmagan'}"`,
      `"${(d.comment || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = "\uFEFF" + [headers.join(";"), ...rows.map(r => r.join(";"))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Qarzdorliklar_Hisoboti_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[1px] select-none p-4 font-sans text-xs">
      <div className="w-[96vw] max-w-[1800px] h-[94vh] bg-[#eff1f5] border-2 border-[#b0b8c5] rounded-lg shadow-2xl flex flex-col overflow-hidden text-slate-800">
        
        {/* Title Bar */}
        <div className="bg-gradient-to-r from-[#d9dfe8] to-[#c7d0de] border-b border-[#a8b3c4] px-3 py-1.5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 font-semibold text-slate-700 tracking-wide text-xs">
            <span className="font-black text-slate-800">GetPOS</span>
            <span className="text-amber-600 font-black">Kafe</span>
            <span className="text-slate-400">|</span>
            <span className="font-bold text-slate-800 flex items-center gap-1">
              <span>📕</span> Qarzdorlik Bo'limi va Mijozlar Hisobi
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-5 h-5 flex items-center justify-center text-xs font-bold text-slate-600 hover:bg-rose-500 hover:text-white rounded transition"
          >
            ✕
          </button>
        </div>

        {/* Header Stats */}
        <div className="bg-[#e4e8ef] p-3 border-b border-[#c2cbd8] grid grid-cols-1 md:grid-cols-3 gap-3 shrink-0">
          <div className="bg-white p-2.5 rounded border border-[#c2cbd8] flex items-center justify-between shadow-sm">
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-500">Jami Qarzlar</div>
              <div className="text-base font-black text-slate-800 font-mono">{formatUZS(summary.total_debt)} so'm</div>
            </div>
            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>

          <div className="bg-white p-2.5 rounded border border-rose-200 bg-rose-50/30 flex items-center justify-between shadow-sm">
            <div>
              <div className="text-[10px] uppercase font-bold text-rose-600">Qolgan Qarz (To'lanmagan)</div>
              <div className="text-base font-black text-rose-700 font-mono">{formatUZS(summary.total_unpaid)} so'm</div>
            </div>
            <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center text-rose-600">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>

          <div className="bg-white p-2.5 rounded border border-emerald-200 bg-emerald-50/30 flex items-center justify-between shadow-sm">
            <div>
              <div className="text-[10px] uppercase font-bold text-emerald-600">So'ndirilgan (To'langan)</div>
              <div className="text-base font-black text-emerald-700 font-mono">{formatUZS(summary.total_paid)} so'm</div>
            </div>
            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Toolbar: Search, Filters & Export */}
        <div className="bg-[#e9edf3] px-3 py-2 border-b border-[#c2cbd8] flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2 flex-1 min-w-[240px]">
            <div className="relative flex-1 max-w-md">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Mijoz ismi, telefoni yoki stol..."
                className="w-full pl-8 pr-3 py-1 bg-white border border-[#b8c2d1] rounded text-xs focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="flex items-center gap-1 bg-white p-0.5 rounded border border-[#b8c2d1]">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`px-2 py-0.5 text-[11px] font-bold rounded ${statusFilter === 'all' ? 'bg-slate-700 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                Barchasi ({debts.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('unpaid')}
                className={`px-2 py-0.5 text-[11px] font-bold rounded ${statusFilter === 'unpaid' ? 'bg-rose-600 text-white' : 'text-rose-700 hover:bg-rose-50'}`}
              >
                To'lanmagan ({debts.filter(d => d.status === 'unpaid').length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('partially_paid')}
                className={`px-2 py-0.5 text-[11px] font-bold rounded ${statusFilter === 'partially_paid' ? 'bg-amber-600 text-white' : 'text-amber-700 hover:bg-amber-50'}`}
              >
                Qisman ({debts.filter(d => d.status === 'partially_paid').length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('paid')}
                className={`px-2 py-0.5 text-[11px] font-bold rounded ${statusFilter === 'paid' ? 'bg-emerald-600 text-white' : 'text-emerald-700 hover:bg-emerald-50'}`}
              >
                Yopilgan ({debts.filter(d => d.status === 'paid').length})
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={exportToExcel}
            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded shadow-sm flex items-center gap-1.5 transition text-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Excel'ga yuklash (.csv)</span>
          </button>
        </div>

        {/* Table Area */}
        <div className="flex-1 overflow-y-auto bg-white">
          <table className="w-full text-left border-collapse text-[11px]">
            <thead className="bg-[#e9edf3] text-slate-700 font-bold sticky top-0 border-b border-[#b8c2d1] shadow-sm select-none">
              <tr>
                <th className="py-2 px-3 text-center w-10">#</th>
                <th className="py-2 px-3">Qarzdor Ismi</th>
                <th className="py-2 px-3">Telefon</th>
                <th className="py-2 px-3">Stol</th>
                <th className="py-2 px-3">Ofitsiant</th>
                <th className="py-2 px-3">Sana</th>
                <th className="py-2 px-3 text-right">Jami Qarz</th>
                <th className="py-2 px-3 text-right">To'langan</th>
                <th className="py-2 px-3 text-right font-black">Qolgan Qarz</th>
                <th className="py-2 px-3 text-center">Status</th>
                <th className="py-2 px-3 text-center w-28">Amallar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDebts.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400 font-semibold">
                    {isLoading ? "Ma'lumotlar yuklanmoqda..." : "Qarzdorliklar topilmadi"}
                  </td>
                </tr>
              ) : (
                filteredDebts.map((debt, index) => (
                  <tr key={debt.id} className="hover:bg-slate-50 transition">
                    <td className="py-2 px-3 text-center font-mono text-slate-400 text-[10px]">{index + 1}</td>
                    <td className="py-2 px-3 font-bold text-slate-900">{debt.client_name}</td>
                    <td className="py-2 px-3 font-mono text-slate-600">{debt.client_phone || '—'}</td>
                    <td className="py-2 px-3 font-bold text-slate-700">
                      {debt.table_number ? `Stol ${debt.table_number}` : '—'}
                    </td>
                    <td className="py-2 px-3 text-slate-600">{debt.waiter_name || '—'}</td>
                    <td className="py-2 px-3 font-mono text-[10px] text-slate-500">{formatDate(debt.created_at)}</td>
                    <td className="py-2 px-3 text-right font-mono text-slate-700">{formatUZS(debt.total_amount)}</td>
                    <td className="py-2 px-3 text-right font-mono text-emerald-600 font-semibold">{formatUZS(debt.paid_amount)}</td>
                    <td className="py-2 px-3 text-right font-mono font-black text-rose-600 text-xs">
                      {formatUZS(debt.remaining_amount)} so'm
                    </td>
                    <td className="py-2 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        debt.status === 'paid'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : debt.status === 'partially_paid'
                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                          : 'bg-rose-100 text-rose-800 border border-rose-300'
                      }`}>
                        {debt.status === 'paid' ? 'To\'langan' : debt.status === 'partially_paid' ? 'Qisman' : 'To\'lanmagan'}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {debt.remaining_amount > 0 && (
                          <button
                            type="button"
                            onClick={() => handleOpenPayModal(debt)}
                            className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold rounded shadow-sm transition"
                            title="Qarzni to'lash"
                          >
                            To'lash
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeleteDebt(debt.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition"
                          title="O'chirish"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Bottom Footer */}
        <div className="bg-[#e4e8ef] px-3 py-1.5 border-t border-[#c2cbd8] flex items-center justify-between text-[11px] text-slate-600 shrink-0">
          <div>Ro'yxatdagi qarzdorliklar soni: <b>{filteredDebts.length}</b> ta</div>
          <div>GetPOS Kafe — Qarzdorlik Tizimi</div>
        </div>
      </div>

      {/* Pay Debt Dialog Modal */}
      {payModalDebt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white border-2 border-slate-300 rounded-xl shadow-2xl w-full max-w-md p-5 font-sans">
            <div className="flex items-center justify-between border-b pb-3 mb-4">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <span>💳</span> Qarzni So'ndirish / To'lash
              </h3>
              <button
                onClick={() => setPayModalDebt(null)}
                className="text-slate-400 hover:text-slate-700 font-bold"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmPay} className="space-y-4">
              <div className="bg-slate-50 p-3 rounded border border-slate-200 text-xs space-y-1">
                <div>Qarzdor: <b className="text-slate-900">{payModalDebt.client_name}</b></div>
                {payModalDebt.client_phone && <div>Telefon: <span className="font-mono text-slate-700">{payModalDebt.client_phone}</span></div>}
                <div>Jami qarz: <span className="font-mono">{formatUZS(payModalDebt.total_amount)} so'm</span></div>
                <div>Qolgan qarz: <b className="font-mono text-rose-600">{formatUZS(payModalDebt.remaining_amount)} so'm</b></div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  To'lanayotgan summa (so'm):
                </label>
                <input
                  type="number"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  max={payModalDebt.remaining_amount}
                  className="w-full px-3 py-2 border-2 border-blue-400 rounded text-sm font-bold font-mono focus:outline-none focus:border-blue-600"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  To'lov usuli:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPayMethod('cash')}
                    className={`py-2 px-3 border rounded text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                      payMethod === 'cash' ? 'bg-emerald-600 text-white border-emerald-700' : 'bg-slate-100 text-slate-700 border-slate-300'
                    }`}
                  >
                    💵 Naqd pul
                  </button>
                  <button
                    type="button"
                    onClick={() => setPayMethod('card')}
                    className={`py-2 px-3 border rounded text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                      payMethod === 'card' ? 'bg-blue-600 text-white border-blue-700' : 'bg-slate-100 text-slate-700 border-slate-300'
                    }`}
                  >
                    💳 Bank kartasi
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setPayModalDebt(null)}
                  className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded text-xs transition"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPay}
                  className="px-5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded text-xs shadow transition disabled:opacity-50"
                >
                  {isSubmittingPay ? "Qabul qilinmoqda..." : "To'lovni tasdiqlash"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
