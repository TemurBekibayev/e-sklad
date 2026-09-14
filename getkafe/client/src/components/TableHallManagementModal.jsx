import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  Edit3, 
  X, 
  Layers, 
  LayoutGrid, 
  Check, 
  AlertCircle,
  Users,
  Building2,
  Sparkles
} from 'lucide-react';

export default function TableHallManagementModal({ 
  isOpen, 
  onClose, 
  tables = [], 
  halls = [], 
  onTablesUpdated,
  onHallsUpdated
}) {
  const [activeTab, setActiveTab] = useState('tables'); // 'tables' | 'halls'
  const [selectedHallFilter, setSelectedHallFilter] = useState('all');

  // Table form state
  const [editingTable, setEditingTable] = useState(null);
  const [tableForm, setTableForm] = useState({
    number: '',
    name: '',
    hall: 'Asosiy Zal',
    capacity: 4,
  });

  // Hall form state
  const [editingHall, setEditingHall] = useState(null);
  const [hallForm, setHallForm] = useState({
    name: '',
    order_index: '',
  });

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Auto-calculate next table number
  useEffect(() => {
    if (!editingTable && tables.length > 0) {
      const maxNum = Math.max(...tables.map((t) => Number(t.number) || 0), 0);
      setTableForm((prev) => ({
        ...prev,
        number: maxNum + 1,
        name: `STOL - ${maxNum + 1}`,
        hall: halls[0]?.name || 'Asosiy Zal',
        capacity: 4,
      }));
    } else if (!editingTable) {
      setTableForm({
        number: 1,
        name: 'STOL - 1',
        hall: halls[0]?.name || 'Asosiy Zal',
        capacity: 4,
      });
    }
  }, [tables, halls, editingTable]);

  if (!isOpen) return null;

  const showFeedback = (msg, isErr = false) => {
    if (isErr) {
      setErrorMessage(msg);
      setTimeout(() => setErrorMessage(''), 4000);
    } else {
      setSuccessMessage(msg);
      setTimeout(() => setSuccessMessage(''), 3000);
    }
  };

  // ----------------------------------------------------
  // TABLE HANDLERS
  // ----------------------------------------------------
  const handleStartEditTable = (t) => {
    setEditingTable(t);
    setTableForm({
      number: t.number,
      name: t.name || `STOL - ${t.number}`,
      hall: t.hall || 'Asosiy Zal',
      capacity: t.capacity || 4,
    });
    setErrorMessage('');
    setSuccessMessage('');
  };

  const handleCancelEditTable = () => {
    setEditingTable(null);
    const maxNum = Math.max(...tables.map((t) => Number(t.number) || 0), 0);
    setTableForm({
      number: maxNum + 1,
      name: `STOL - ${maxNum + 1}`,
      hall: halls[0]?.name || 'Asosiy Zal',
      capacity: 4,
    });
  };

  const handleSaveTable = async (e) => {
    e.preventDefault();
    if (!tableForm.number) {
      showFeedback("Stol raqami majburiy", true);
      return;
    }

    setLoading(true);
    setErrorMessage('');
    try {
      const url = editingTable ? `/api/tables/${editingTable.id}` : '/api/tables';
      const method = editingTable ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          number: Number(tableForm.number),
          name: tableForm.name.trim() || `STOL - ${tableForm.number}`,
          hall: tableForm.hall || 'Asosiy Zal',
          capacity: Number(tableForm.capacity) || 4,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Xatolik yuz berdi");
      }

      showFeedback(data.message || (editingTable ? "Stol yangilandi!" : "Yangi stol qo'shildi!"));
      handleCancelEditTable();
      if (onTablesUpdated) onTablesUpdated();
    } catch (err) {
      showFeedback(err.message, true);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTable = async (table) => {
    if (table.status === 'busy' || table.current_order_id) {
      showFeedback(`Band (${table.name}) stolni o'chirib bo'lmaydi! Avval hisobni yoping.`, true);
      return;
    }

    if (!window.confirm(`${table.name} (${table.hall}) stolini o'chirishni tasdiqlaysizmi?`)) {
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/tables/${table.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Stolni o'chirishda xatolik");
      }
      showFeedback(data.message || "Stol o'chirildi!");
      if (editingTable?.id === table.id) handleCancelEditTable();
      if (onTablesUpdated) onTablesUpdated();
    } catch (err) {
      showFeedback(err.message, true);
    } finally {
      setLoading(false);
    }
  };

  // ----------------------------------------------------
  // HALL HANDLERS
  // ----------------------------------------------------
  const handleStartEditHall = (h) => {
    setEditingHall(h);
    setHallForm({
      name: h.name,
      order_index: h.order_index || 0,
    });
    setErrorMessage('');
    setSuccessMessage('');
  };

  const handleCancelEditHall = () => {
    setEditingHall(null);
    setHallForm({ name: '', order_index: '' });
  };

  const handleSaveHall = async (e) => {
    e.preventDefault();
    if (!hallForm.name.trim()) {
      showFeedback("Zal/Xona nomi kiritilishi shart", true);
      return;
    }

    setLoading(true);
    setErrorMessage('');
    try {
      const url = editingHall ? `/api/halls/${editingHall.id}` : '/api/halls';
      const method = editingHall ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: hallForm.name.trim(),
          order_index: hallForm.order_index ? Number(hallForm.order_index) : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Zalni saqlashda xatolik");
      }

      showFeedback(data.message || (editingHall ? "Zal yangilandi!" : "Yangi zal qo'shildi!"));
      handleCancelEditHall();
      if (onHallsUpdated) onHallsUpdated();
      if (onTablesUpdated) onTablesUpdated();
    } catch (err) {
      showFeedback(err.message, true);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteHall = async (hall) => {
    if (!window.confirm(`"${hall.name}" zalini o'chirishni tasdiqlaysizmi? Undagi stollar avtomatik "Asosiy Zal"ga o'tkaziladi.`)) {
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/halls/${hall.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Zalni o'chirishda xatolik");
      }
      showFeedback(data.message || "Zal o'chirildi!");
      if (editingHall?.id === hall.id) handleCancelEditHall();
      if (onHallsUpdated) onHallsUpdated();
      if (onTablesUpdated) onTablesUpdated();
    } catch (err) {
      showFeedback(err.message, true);
    } finally {
      setLoading(false);
    }
  };

  // Filtered tables for view
  const displayTables = selectedHallFilter === 'all' 
    ? tables 
    : tables.filter((t) => (t.hall || 'Asosiy Zal') === selectedHallFilter);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-5 select-none animate-fadeIn">
      <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl w-full max-w-5xl h-[90vh] max-h-[820px] flex flex-col overflow-hidden text-slate-800 text-xs">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-700 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-orange-400">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
                Stollar va Zallar (Xonalar) Boshqaruvi
              </h2>
              <p className="text-xs text-slate-400 font-medium">
                Kafening barcha qavatlari, zallari (VIP, Zal 1, Zal 2) va stollarini sozlash
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700/60 rounded-xl transition active:scale-95"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher: [Stollar] [Zallar / Xonalar] */}
        <div className="bg-slate-100/80 px-6 pt-3 flex items-center justify-between border-b border-slate-200 shrink-0">
          <div className="flex gap-2">
            <button
              onClick={() => { setActiveTab('tables'); setErrorMessage(''); }}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-t-2xl font-black text-xs transition ${
                activeTab === 'tables'
                  ? 'bg-white text-orange-600 border-t-2 border-l border-r border-slate-200 shadow-sm'
                  : 'bg-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              <span>Stollar ({tables.length} ta)</span>
            </button>

            <button
              onClick={() => { setActiveTab('halls'); setErrorMessage(''); }}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-t-2xl font-black text-xs transition ${
                activeTab === 'halls'
                  ? 'bg-white text-orange-600 border-t-2 border-l border-r border-slate-200 shadow-sm'
                  : 'bg-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Zallar / Xonalar ({halls.length} ta)</span>
            </button>
          </div>

          {/* Alert messages */}
          <div className="pb-2">
            {errorMessage && (
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-rose-100 text-rose-700 font-bold border border-rose-200 text-xs">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMessage}</span>
              </span>
            )}
            {successMessage && (
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-100 text-emerald-700 font-bold border border-emerald-200 text-xs">
                <Check className="w-4 h-4 flex-shrink-0" />
                <span>{successMessage}</span>
              </span>
            )}
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 p-5 overflow-y-auto bg-slate-50 flex flex-col md:flex-row gap-6">
          
          {/* ======================================================== */}
          {/* TAB 1: STOLLAR (TABLES) */}
          {/* ======================================================== */}
          {activeTab === 'tables' && (
            <>
              {/* Left Form: Add or Edit Table */}
              <div className="w-full md:w-80 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between shrink-0">
                <form onSubmit={handleSaveTable} className="space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-orange-500" />
                      <span>{editingTable ? "Stolni Tahrirlash" : "Yangi Stol Qo'shish"}</span>
                    </h3>
                    {editingTable && (
                      <button
                        type="button"
                        onClick={handleCancelEditTable}
                        className="text-xs text-slate-500 hover:text-rose-600 font-bold"
                      >
                        Bekor
                      </button>
                    )}
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Stol Raqami:</label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={tableForm.number}
                      onChange={(e) => {
                        const num = e.target.value;
                        setTableForm({
                          ...tableForm,
                          number: num,
                          name: tableForm.name === `STOL - ${tableForm.number}` ? `STOL - ${num}` : tableForm.name
                        });
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-black text-slate-900 focus:outline-none focus:border-orange-500 focus:bg-white"
                      placeholder="1"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Stol Nomi / Tavsifi:</label>
                    <input
                      type="text"
                      required
                      value={tableForm.name}
                      onChange={(e) => setTableForm({ ...tableForm, name: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-900 focus:outline-none focus:border-orange-500 focus:bg-white"
                      placeholder="STOL - 1 yoki VIP Katta"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Joylashgan Zali / Xonasi:</label>
                    <select
                      value={tableForm.hall}
                      onChange={(e) => setTableForm({ ...tableForm, hall: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-900 focus:outline-none focus:border-orange-500 focus:bg-white"
                    >
                      {halls.map((h) => (
                        <option key={h.id} value={h.name}>
                          {h.name}
                        </option>
                      ))}
                      {halls.length === 0 && <option value="Asosiy Zal">Asosiy Zal</option>}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Sig'imi (Kishi soni):</label>
                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={tableForm.capacity}
                      onChange={(e) => setTableForm({ ...tableForm, capacity: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-900 focus:outline-none focus:border-orange-500 focus:bg-white"
                      placeholder="4"
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3 bg-orange-600 hover:bg-orange-500 active:scale-95 text-white font-black rounded-xl shadow-md shadow-orange-500/25 flex items-center justify-center gap-2 transition disabled:opacity-50"
                    >
                      {editingTable ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                      <span>{editingTable ? "Saqlash" : "Stolni Qo'shish"}</span>
                    </button>
                  </div>
                </form>

                <div className="mt-4 pt-4 border-t border-slate-100 text-[11px] text-slate-400">
                  💡 Stol yaratilgandan so'ng ofitsiant va kassa oynasida real-vaqt rejimida ko'rinadi.
                </div>
              </div>

              {/* Right Table List */}
              <div className="flex-1 flex flex-col bg-white border border-slate-200 rounded-2xl p-5 shadow-sm overflow-hidden">
                {/* Hall Filter Bar */}
                <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-3 border-b border-slate-100 scrollbar-none shrink-0">
                  <span className="font-black text-slate-500 text-xs shrink-0">Zal bo'yicha:</span>
                  <button
                    onClick={() => setSelectedHallFilter('all')}
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs whitespace-nowrap transition ${
                      selectedHallFilter === 'all'
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Barchasi ({tables.length})
                  </button>
                  {halls.map((h) => {
                    const count = tables.filter((t) => (t.hall || 'Asosiy Zal') === h.name).length;
                    return (
                      <button
                        key={h.id}
                        onClick={() => setSelectedHallFilter(h.name)}
                        className={`px-3 py-1.5 rounded-xl font-bold text-xs whitespace-nowrap transition ${
                          selectedHallFilter === h.name
                            ? 'bg-orange-600 text-white shadow-sm'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {h.name} ({count})
                      </button>
                    );
                  })}
                </div>

                {/* Table Grid / List */}
                <div className="flex-1 overflow-y-auto pr-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {displayTables.length === 0 ? (
                    <div className="col-span-full py-16 text-center text-slate-400">
                      <LayoutGrid className="w-12 h-12 mx-auto mb-2 opacity-30" />
                      <p className="font-bold text-sm">Bu zalda hali stollar mavjud emas</p>
                      <p className="text-xs mt-1 text-slate-400">Chap tarafdagi shakldan yangi stol qo'shing</p>
                    </div>
                  ) : (
                    displayTables.map((table) => {
                      const isBusy = table.status === 'busy';
                      const isBill = table.status === 'bill_requested';
                      const isEditing = editingTable?.id === table.id;

                      let statusBadge = (
                        <span className="px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-700 font-bold text-[10px]">
                          Bo'sh
                        </span>
                      );
                      if (isBusy) {
                        statusBadge = (
                          <span className="px-2 py-0.5 rounded-lg bg-rose-100 text-rose-700 font-bold text-[10px]">
                            Band · {Number(table.total_amount || 0).toLocaleString()} UZS
                          </span>
                        );
                      } else if (isBill) {
                        statusBadge = (
                          <span className="px-2 py-0.5 rounded-lg bg-amber-100 text-amber-800 font-bold text-[10px]">
                            Hisob so'ralgan
                          </span>
                        );
                      }

                      return (
                        <div
                          key={table.id}
                          className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between ${
                            isEditing
                              ? 'bg-orange-50/80 border-orange-400 ring-2 ring-orange-400/20'
                              : 'bg-slate-50/70 border-slate-200 hover:bg-white hover:border-slate-300 hover:shadow-sm'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="font-black text-slate-900 text-sm">
                                {table.name || `STOL - ${table.number}`}
                              </div>
                              <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                                🏢 {table.hall || 'Asosiy Zal'} • 👥 {table.capacity || 4} kishilik
                              </div>
                            </div>
                            {statusBadge}
                          </div>

                          <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-200/60">
                            <span className="text-[10px] font-mono font-bold text-slate-400">
                              №{table.number}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => handleStartEditTable(table)}
                                title="Tahrirlash"
                                className="p-1.5 rounded-lg bg-white hover:bg-orange-50 text-slate-600 hover:text-orange-600 border border-slate-200 active:scale-95 transition"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteTable(table)}
                                disabled={isBusy}
                                title={isBusy ? "Band stolni o'chirib bo'lmaydi" : "O'chirish"}
                                className="p-1.5 rounded-lg bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200 active:scale-95 transition disabled:opacity-40 disabled:cursor-not-allowed"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </>
          )}

          {/* ======================================================== */}
          {/* TAB 2: ZALLAR / XONALAR (HALLS / ROOMS) */}
          {/* ======================================================== */}
          {activeTab === 'halls' && (
            <>
              {/* Left Form: Add/Edit Hall */}
              <div className="w-full md:w-80 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between shrink-0">
                <form onSubmit={handleSaveHall} className="space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
                      <Layers className="w-4 h-4 text-orange-500" />
                      <span>{editingHall ? "Zalni Tahrirlash" : "Yangi Zal / Xona Qo'shish"}</span>
                    </h3>
                    {editingHall && (
                      <button
                        type="button"
                        onClick={handleCancelEditHall}
                        className="text-xs text-slate-500 hover:text-rose-600 font-bold"
                      >
                        Bekor
                      </button>
                    )}
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Zal / Xona Nomi:</label>
                    <input
                      type="text"
                      required
                      value={hallForm.name}
                      onChange={(e) => setHallForm({ ...hallForm, name: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-900 focus:outline-none focus:border-orange-500 focus:bg-white"
                      placeholder="Masalan: Zal 1, 2-Qavat Zal, VIP Xona"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Tartib Raqami (Order Index):</label>
                    <input
                      type="number"
                      value={hallForm.order_index}
                      onChange={(e) => setHallForm({ ...hallForm, order_index: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-900 focus:outline-none focus:border-orange-500 focus:bg-white"
                      placeholder="1, 2, 3..."
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3 bg-orange-600 hover:bg-orange-500 active:scale-95 text-white font-black rounded-xl shadow-md shadow-orange-500/25 flex items-center justify-center gap-2 transition disabled:opacity-50"
                    >
                      {editingHall ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                      <span>{editingHall ? "Saqlash" : "Zalni Yaratish"}</span>
                    </button>
                  </div>
                </form>

                <div className="mt-4 pt-4 border-t border-slate-100 text-[11px] text-slate-400">
                  🏢 Zal nomi o'zgartirilsa, unga tegishli barcha stollar avtomatik yangi zal nomiga yangilanadi.
                </div>
              </div>

              {/* Right Hall List */}
              <div className="flex-1 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm overflow-y-auto">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {halls.map((hall, idx) => {
                    const tableCount = tables.filter((t) => (t.hall || 'Asosiy Zal') === hall.name).length;
                    const isEditing = editingHall?.id === hall.id;

                    return (
                      <div
                        key={hall.id}
                        className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                          isEditing
                            ? 'bg-orange-50/80 border-orange-400 ring-2 ring-orange-400/20'
                            : 'bg-slate-50/80 border-slate-200 hover:bg-white hover:border-slate-300 hover:shadow-sm'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center font-black text-sm border border-orange-200">
                              {idx + 1}
                            </div>
                            <div>
                              <h4 className="font-black text-slate-900 text-sm">{hall.name}</h4>
                              <p className="text-xs text-slate-500 font-medium mt-0.5">
                                🍽️ {tableCount} ta stol biriktirilgan
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleStartEditHall(hall)}
                              title="Tahrirlash"
                              className="p-2 rounded-xl bg-white hover:bg-orange-50 text-slate-600 hover:text-orange-600 border border-slate-200 active:scale-95 transition"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteHall(hall)}
                              disabled={hall.name === 'Asosiy Zal'}
                              title={hall.name === 'Asosiy Zal' ? "Asosiy zalni o'chirib bo'lmaydi" : "O'chirish"}
                              className="p-2 rounded-xl bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200 active:scale-95 transition disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Sub tables preview */}
                        <div className="mt-3 pt-3 border-t border-slate-200/60 flex flex-wrap gap-1.5">
                          {tables
                            .filter((t) => (t.hall || 'Asosiy Zal') === hall.name)
                            .slice(0, 8)
                            .map((t) => (
                              <span
                                key={t.id}
                                className="px-2 py-0.5 rounded-lg bg-white border border-slate-200 text-[10px] font-bold text-slate-700"
                              >
                                {t.name || `Stol ${t.number}`}
                              </span>
                            ))}
                          {tableCount > 8 && (
                            <span className="text-[10px] font-bold text-slate-400 self-center">
                              +{tableCount - 8} ta
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

        </div>

        {/* Footer */}
        <div className="bg-slate-100 border-t border-slate-200 px-6 py-3 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500 font-medium">
            Jami: <strong className="text-slate-800">{tables.length} ta stol</strong> • <strong className="text-slate-800">{halls.length} ta zal</strong>
          </div>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-slate-800 hover:bg-slate-900 text-white font-black text-xs rounded-xl shadow transition active:scale-95"
          >
            Yopish
          </button>
        </div>

      </div>
    </div>
  );
}
