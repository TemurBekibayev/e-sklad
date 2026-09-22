import React, { useState, useEffect } from 'react';
import { Search, Download, DollarSign, CheckCircle2, AlertCircle, Clock, Trash2, X, MessageSquare, Send } from 'lucide-react';

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

  // SMS modal state (Eskiz.uz)
  const [smsModalDebt, setSmsModalDebt] = useState(null);
  const [smsMessage, setSmsMessage] = useState('');
  const [isSendingSms, setIsSendingSms] = useState(false);
  const [smsResultMsg, setSmsResultMsg] = useState('');

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
        alert('Xatolik: ' + (data.message || 'Qarz to\'lovini amalga oshirib bo\'lmadi'));
      }
    } catch (err) {
      alert('Tizim xatoligi: ' + err.message);
    } finally {
      setIsSubmittingPay(false);
    }
  };

  const handleOpenSmsModal = (debt) => {
    setSmsModalDebt(debt);
    const remaining = formatUZS(debt.remaining_amount || debt.total_amount || 0);
    setSmsMessage(
      `Hurmatli ${debt.client_name || 'Mijoz'}, GetPOS Kafe dan sizda ${remaining} so'm to'lanmagan qarzdorlik mavjud. Iltimos, o'z vaqtida to'lovni amalga oshiring.`
    );
    setSmsResultMsg('');
  };

  const handleSendSms = async (e) => {
    e.preventDefault();
    if (!smsModalDebt || !smsMessage) return;
    setIsSendingSms(true);
    setSmsResultMsg('');
    try {
      const res = await fetch(`/api/debts/${smsModalDebt.id}/send-sms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: smsMessage }),
      });
      const data = await res.json();
      if (data.success) {
        setSmsResultMsg(`✓ ${data.message || 'SMS muvaffaqiyatli jo\'natildi!'}`);
        setTimeout(() => {
          setSmsModalDebt(null);
          setSmsResultMsg('');
        }, 1800);
      } else {
        alert('SMS xatoligi: ' + (data.message || 'Yuborib bo\'lmadi'));
      }
    } catch (err) {
      alert('Tizim xatoligi: ' + err.message);
    } finally {
      setIsSendingSms(false);
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
        alert('Xatolik: ' + data.message);
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
            <span className="font-black text-slate-800">GetPOS Kafe</span>
            <span className="text-slate-400">|</span>
            <span className="text-slate-900 font-bold">Qarzdorliklar va Nasiyalar Boshqaruvi</span>
          </div>
          <button
            onClick={onClose}
            className="text-xs font-bold text-slate-500 hover:text-rose-600 px-1.5 py-0.5 rounded hover:bg-slate-200 transition"
          >
            ✕
          </button>
        </div>

        {/* 3 Summary Badges */}
        <div className="bg-[#dfe5ee] p-3 border-b border-[#b0b9c7] grid grid-cols-1 sm:grid-cols-3 gap-3 shrink-0">
          <div className="bg-white border border-[#b8c2d1] rounded p-2.5 flex items-center justify-between shadow-sm">
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-500">Jami Nasiya (Qarz)</div>
              <div className="text-lg font-black text-slate-900 font-mono mt-0.5">
                {formatUZS(summary.total_debt)} <span className="text-xs font-normal">so'm</span>
              </div>
            </div>
            <div className="w-8 h-8 rounded-full bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center font-bold">
              💰
            </div>
          </div>

          <div className="bg-white border border-emerald-300 rounded p-2.5 flex items-center justify-between shadow-sm">
            <div>
              <div className="text-[10px] uppercase font-bold text-emerald-700">Qaytarilgan (To'langan)</div>
              <div className="text-lg font-black text-emerald-700 font-mono mt-0.5">
                {formatUZS(summary.total_paid)} <span className="text-xs font-normal">so'm</span>
              </div>
            </div>
            <div className="w-8 h-8 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center font-bold">
              ✓
            </div>
          </div>

          <div className="bg-white border border-rose-300 rounded p-2.5 flex items-center justify-between shadow-sm">
            <div>
              <div className="text-[10px] uppercase font-bold text-rose-700">Qolgan Haqiqiy Qarz</div>
              <div className="text-lg font-black text-rose-700 font-mono mt-0.5">
                {formatUZS(summary.total_unpaid)} <span className="text-xs font-normal">so'm</span>
              </div>
            </div>
            <div className="w-8 h-8 rounded-full bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center font-bold">
              !
            </div>
          </div>
        </div>

        {/* Toolbar & Filters */}
        <div className="p-2.5 bg-[#eef1f6] border-b border-[#b0b9c7] flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Qarzdor ismi, telefoni yoki stol bo'yicha qidirish..."
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-[#b8c2d1] rounded text-xs focus:outline-none focus:border-blue-500 shadow-inner"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2" />
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {[
              { id: 'all', label: 'Barchasi' },
              { id: 'unpaid', label: 'To\'lanmagan' },
              { id: 'partially_paid', label: 'Qisman' },
              { id: 'paid', label: 'To\'langan' },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setStatusFilter(f.id)}
                className={`px-3 py-1.5 rounded border text-xs font-bold transition ${
                  statusFilter === f.id
                    ? 'bg-blue-600 text-white border-blue-700 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={exportToExcel}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-xs flex items-center gap-1.5 shadow-sm transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Excel (.CSV)</span>
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
                <th className="py-2 px-3 text-center w-36">Amallar</th>
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
                        {debt.client_phone && debt.remaining_amount > 0 && (
                          <button
                            type="button"
                            onClick={() => handleOpenSmsModal(debt)}
                            className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 text-[10px] font-black rounded shadow-sm transition flex items-center gap-0.5"
                            title="Eskiz SMS eslatma jo'natish"
                          >
                            <span>📱</span>
                            <span>SMS</span>
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
          <div>GetPOS Kafe — Qarzdorlik Tizimi (Eskiz.uz SMS integratsiyasi bilan)</div>
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
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmPay} className="space-y-4">
              <div className="p-3 bg-slate-50 border rounded-lg space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Mijoz:</span>
                  <span className="font-bold text-slate-800">{payModalDebt.client_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Telefon:</span>
                  <span className="font-mono text-slate-700">{payModalDebt.client_phone || '—'}</span>
                </div>
                <div className="flex justify-between border-t pt-1">
                  <span className="text-slate-500">Qolgan qarz:</span>
                  <span className="font-black text-rose-600 font-mono">
                    {formatUZS(payModalDebt.remaining_amount)} so'm
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  To'lanayotgan summa (so'm)*:
                </label>
                <input
                  type="number"
                  value={payAmount}
                  max={payModalDebt.remaining_amount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-base font-bold text-slate-900 focus:outline-none focus:border-blue-500"
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
                    className={`py-2 rounded-lg border font-bold text-xs ${
                      payMethod === 'cash' ? 'bg-emerald-600 text-white border-emerald-700' : 'bg-slate-50 border-slate-300'
                    }`}
                  >
                    💵 Naqd pul
                  </button>
                  <button
                    type="button"
                    onClick={() => setPayMethod('card')}
                    className={`py-2 rounded-lg border font-bold text-xs ${
                      payMethod === 'card' ? 'bg-blue-600 text-white border-blue-700' : 'bg-slate-50 border-slate-300'
                    }`}
                  >
                    💳 Plastik karta
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setPayModalDebt(null)}
                  className="px-4 py-2 border rounded-lg text-slate-600 font-bold hover:bg-slate-50"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPay}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow transition"
                >
                  {isSubmittingPay ? 'Qabul qilinmoqda...' : 'To\'lovni qabul qilish'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Eskiz.uz SMS Modal */}
      {smsModalDebt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white border-2 border-amber-300 rounded-xl shadow-2xl w-full max-w-md p-5 font-sans">
            <div className="flex items-center justify-between border-b pb-3 mb-4">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <span>📱</span> Eskiz.uz SMS Eslatma Jo'natish
              </h3>
              <button
                onClick={() => setSmsModalDebt(null)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSendSms} className="space-y-4">
              <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-lg space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-600">Qarzdor:</span>
                  <span className="font-bold text-slate-900">{smsModalDebt.client_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Telefon:</span>
                  <span className="font-mono font-bold text-blue-700">{smsModalDebt.client_phone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Qarz qoldig'i:</span>
                  <span className="font-black text-rose-600 font-mono">
                    {formatUZS(smsModalDebt.remaining_amount)} so'm
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  SMS Xabar Matni:
                </label>
                <textarea
                  rows={4}
                  value={smsMessage}
                  onChange={(e) => setSmsMessage(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-amber-500 shadow-inner"
                  required
                />
                <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                  <span>Eskiz.uz Gateway API</span>
                  <span>{smsMessage.length} belgi</span>
                </div>
              </div>

              {smsResultMsg && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-lg font-bold text-xs text-center">
                  {smsResultMsg}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setSmsModalDebt(null)}
                  className="px-4 py-2 border rounded-lg text-slate-600 font-bold hover:bg-slate-50 text-xs"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={isSendingSms}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-lg shadow transition flex items-center gap-1.5 text-xs"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSendingSms ? 'Yuborilmoqda...' : 'SMS Jo\'natish'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
