import React, { useState, useEffect } from 'react';
import { 
  Package, 
  PlusCircle, 
  ArrowDownCircle, 
  AlertTriangle, 
  XCircle, 
  CheckCircle2, 
  Search, 
  History, 
  Filter,
  RefreshCw,
  Plus,
  Minus,
  TrendingDown,
  TrendingUp,
  Boxes,
  DollarSign
} from 'lucide-react';

export default function InventoryView({ products, onRefreshProducts }) {
  const [inventoryItems, setInventoryItems] = useState([]);
  const [summary, setSummary] = useState({ totalItems: 0, totalStockValue: 0, lowStockCount: 0, outOfStockCount: 0 });
  const [loading, setLoading] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState('stock'); // 'stock' | 'history'
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all'); // 'all' | 'low' | 'out' | 'normal'
  const [categories, setCategories] = useState([]);

  // Modals state
  const [modalType, setModalType] = useState(null); // 'inflow' | 'adjustment' | 'waste'
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [modalForm, setModalForm] = useState({
    productId: '',
    quantity: '',
    costPrice: '',
    supplier: '',
    note: '',
    newStock: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Movements history state
  const [movements, setMovements] = useState([]);
  const [loadingMovements, setLoadingMovements] = useState(false);

  const formatPrice = (val) => new Intl.NumberFormat('uz-UZ').format(val || 0);

  const loadInventory = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/inventory');
      const data = await res.json();
      if (data.success) {
        setInventoryItems(data.items || []);
        setSummary(data.summary || { totalItems: 0, totalStockValue: 0, lowStockCount: 0, outOfStockCount: 0 });
        
        // Extract categories
        const cats = Array.from(new Set(data.items.map((i) => i.category_name).filter(Boolean)));
        setCategories(cats);
      }
    } catch (e) {
      console.error('Failed to load inventory:', e);
    } finally {
      setLoading(false);
    }
  };

  const loadMovements = async () => {
    try {
      setLoadingMovements(true);
      const res = await fetch('/api/inventory/movements');
      const data = await res.json();
      if (data.success) {
        setMovements(data.movements || []);
      }
    } catch (e) {
      console.error('Failed to load movements:', e);
    } finally {
      setLoadingMovements(false);
    }
  };

  useEffect(() => {
    loadInventory();
  }, []);

  useEffect(() => {
    if (activeSubTab === 'history') {
      loadMovements();
    }
  }, [activeSubTab]);

  const openInflowModal = (prod = null) => {
    setSelectedProduct(prod);
    setModalForm({
      productId: prod ? String(prod.id) : (inventoryItems[0] ? String(inventoryItems[0].id) : ''),
      quantity: '',
      costPrice: prod ? (prod.cost_price || '') : '',
      supplier: '',
      note: 'Omborga kirim (prihod)',
      newStock: '',
    });
    setModalType('inflow');
  };

  const openAdjustmentModal = (prod) => {
    setSelectedProduct(prod);
    setModalForm({
      productId: String(prod.id),
      quantity: '',
      costPrice: prod.cost_price || '',
      supplier: '',
      note: 'Inventarizatsiya orqali to\'g\'rilandi',
      newStock: String(prod.stock_quantity),
    });
    setModalType('adjustment');
  };

  const openWasteModal = (prod) => {
    setSelectedProduct(prod);
    setModalForm({
      productId: String(prod.id),
      quantity: '1',
      costPrice: prod.cost_price || '',
      supplier: '',
      note: 'Brak / Yaroqsiz holga kelgan',
      newStock: '',
    });
    setModalType('waste');
  };

  const handleModalSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      let endpoint = '';
      let payload = {};

      if (modalType === 'inflow') {
        endpoint = '/api/inventory/inflow';
        payload = {
          productId: Number(modalForm.productId),
          quantity: Number(modalForm.quantity),
          costPrice: modalForm.costPrice ? Number(modalForm.costPrice) : undefined,
          supplier: modalForm.supplier,
          note: modalForm.note,
          createdBy: 'Admin',
        };
      } else if (modalType === 'adjustment') {
        endpoint = '/api/inventory/adjustment';
        payload = {
          productId: Number(modalForm.productId),
          newStock: Number(modalForm.newStock),
          note: modalForm.note,
          createdBy: 'Admin',
        };
      } else if (modalType === 'waste') {
        endpoint = '/api/inventory/waste';
        payload = {
          productId: Number(modalForm.productId),
          quantity: Number(modalForm.quantity),
          note: modalForm.note,
          createdBy: 'Admin',
        };
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (data.success) {
        setSuccessMsg(data.message || 'Muvaffaqiyatli bajarildi!');
        setTimeout(() => setSuccessMsg(''), 3500);
        setModalType(null);
        loadInventory();
        if (onRefreshProducts) onRefreshProducts();
      } else {
        alert('Xatolik: ' + data.message);
      }
    } catch (err) {
      alert('Server xatosi: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Filter products
  const filteredItems = inventoryItems.filter((item) => {
    const matchesSearch = !searchQuery || item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === 'all' || item.category_name === filterCategory;
    let matchesStatus = true;
    if (filterStatus === 'low') matchesStatus = item.status === 'low_stock';
    else if (filterStatus === 'out') matchesStatus = item.status === 'out_of_stock';
    else if (filterStatus === 'normal') matchesStatus = item.status === 'in_stock';
    return matchesSearch && matchesCategory && matchesStatus;
  });

  return (
    <div className="p-4 sm:p-6 max-w-[1500px] mx-auto min-h-screen bg-[#f1f5f9] text-slate-800">
      
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-amber-500/10 text-amber-600 border border-amber-500/20">
              <Package className="w-6 h-6" />
            </span>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                Sklad va Omborxona Boshqaruvi
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Mahsulot qoldiqlari, kirim qilish (prihod), inventarizatsiya va hisobdan chiqarish
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => openInflowModal()}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-md shadow-emerald-600/25 active:scale-95 transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>➕ Yangi Kirim (Prihod)</span>
          </button>

          <button
            onClick={loadInventory}
            title="Yangilash"
            className="p-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 shadow-sm active:scale-95 transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Success Banner */}
      {successMsg && (
        <div className="mb-4 p-3 bg-emerald-600 text-white text-xs font-bold rounded-xl shadow-md flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')} className="text-white/80 hover:text-white">✕</button>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Jami Mahsulotlar</p>
            <p className="text-2xl font-black text-slate-900 mt-0.5">{summary.totalItems} ta</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <Boxes className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Ombor Jami Qiymati</p>
            <p className="text-xl font-black text-emerald-700 mt-0.5">{formatPrice(summary.totalStockValue)} <span className="text-xs font-normal text-slate-500">UZS</span></p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Kam Qolgan Mahsulotlar</p>
            <p className="text-2xl font-black text-amber-600 mt-0.5">{summary.lowStockCount} ta</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Tugagan (0 Qoldiq)</p>
            <p className="text-2xl font-black text-rose-600 mt-0.5">{summary.outOfStockCount} ta</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
            <XCircle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Tabs Header: Qoldiqlar / Harakatlar Tarixi */}
      <div className="flex items-center justify-between bg-white border border-slate-200 p-2 rounded-2xl mb-4 shadow-sm">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSubTab('stock')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeSubTab === 'stock'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Mahsulot Qoldiqlari</span>
          </button>

          <button
            onClick={() => setActiveSubTab('history')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeSubTab === 'history'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Sklad Harakatlari Tarixi</span>
          </button>
        </div>

        {activeSubTab === 'stock' && (
          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Nomi bo'yicha qidirish..."
                className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-amber-500 focus:bg-white w-48 transition-all"
              />
            </div>

            {/* Category filter */}
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-amber-500"
            >
              <option value="all">Barcha toifalar</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            {/* Status filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-amber-500"
            >
              <option value="all">Barcha holatlar</option>
              <option value="normal">✅ Yetarli qoldiq</option>
              <option value="low">⚠️ Kam qolgan</option>
              <option value="out">❌ Tugagan</option>
            </select>
          </div>
        )}
      </div>

      {/* TAB 1: Stock Inventory Table */}
      {activeSubTab === 'stock' && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                  <th className="p-3.5 pl-4">Mahsulot / Taom</th>
                  <th className="p-3.5">Kategoriya</th>
                  <th className="p-3.5 text-center">Mavjud Qoldiq</th>
                  <th className="p-3.5 text-right">Tannarxi</th>
                  <th className="p-3.5 text-right">Sotish Narxi</th>
                  <th className="p-3.5 text-center">Holati</th>
                  <th className="p-3.5 text-right pr-4">Tezkor Amallar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="p-8 text-center text-slate-400 font-medium">
                      Mahsulotlar topilmadi
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => {
                    const isOut = item.stock_quantity <= 0;
                    const isLow = item.stock_quantity > 0 && item.stock_quantity <= item.min_stock_alert;

                    let badgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-300';
                    let badgeLabel = 'Yetarli';
                    if (isOut) {
                      badgeClass = 'bg-rose-100 text-rose-800 border-rose-300 animate-pulse';
                      badgeLabel = 'Tugagan';
                    } else if (isLow) {
                      badgeClass = 'bg-amber-100 text-amber-800 border-amber-300';
                      badgeLabel = 'Kam qoldi';
                    }

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3.5 pl-4 flex items-center gap-3">
                          {item.image ? (
                            <img
                              src={item.image}
                              alt={item.name}
                              className="w-10 h-10 rounded-xl object-cover border border-slate-200 shadow-sm"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-400">
                              🍽️
                            </div>
                          )}
                          <div>
                            <div className="font-bold text-slate-900">{item.name}</div>
                            <div className="text-[10px] text-slate-400 font-mono">MXIK: {item.mxik_code}</div>
                          </div>
                        </td>

                        <td className="p-3.5 font-medium text-slate-600">
                          <span className="px-2 py-0.5 rounded-lg bg-slate-100 border border-slate-200 text-[11px]">
                            {item.category_name}
                          </span>
                        </td>

                        <td className="p-3.5 text-center">
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl font-black text-sm bg-slate-100 border border-slate-200 shadow-inner">
                            <span className={isOut ? 'text-rose-600 font-black' : isLow ? 'text-amber-600 font-black' : 'text-slate-800'}>
                              {item.stock_quantity}
                            </span>
                            <span className="text-[11px] font-semibold text-slate-500">{item.unit}</span>
                          </div>
                        </td>

                        <td className="p-3.5 text-right font-mono font-medium text-slate-600">
                          {item.cost_price > 0 ? `${formatPrice(item.cost_price)} UZS` : '—'}
                        </td>

                        <td className="p-3.5 text-right font-mono font-bold text-slate-900">
                          {formatPrice(item.price)} UZS
                        </td>

                        <td className="p-3.5 text-center">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${badgeClass}`}>
                            {badgeLabel}
                          </span>
                        </td>

                        <td className="p-3.5 pr-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => openInflowModal(item)}
                              title="Kirim qilish (Prihod)"
                              className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-bold transition-all active:scale-95"
                            >
                              + Kirim
                            </button>

                            <button
                              onClick={() => openAdjustmentModal(item)}
                              title="Qoldiqni to'g'rilash (Inventarizatsiya)"
                              className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-300 rounded-lg text-xs font-bold transition-all active:scale-95"
                            >
                              ✏️ Qoldiq
                            </button>

                            <button
                              onClick={() => openWasteModal(item)}
                              title="Hisobdan chiqarish (Spisanie/Brak)"
                              className="px-2 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold transition-all active:scale-95"
                            >
                              🗑️
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
        </div>
      )}

      {/* TAB 2: Movements History */}
      {activeSubTab === 'history' && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Oxirgi Sklad Harakatlari (Kirim, Savdo, Spisanie, Tuzatish)
            </h3>
            <button
              onClick={loadMovements}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingMovements ? 'animate-spin' : ''}`} />
              <span>Yangilash</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                  <th className="p-3.5 pl-4">Sana va Vaqt</th>
                  <th className="p-3.5">Mahsulot</th>
                  <th className="p-3.5 text-center">Harakat turi</th>
                  <th className="p-3.5 text-center">Miqdori</th>
                  <th className="p-3.5 text-center">Qoldiq O'zgarishi</th>
                  <th className="p-3.5">Izoh / Manba</th>
                  <th className="p-3.5 pr-4 text-right">Mas'ul</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {movements.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="p-8 text-center text-slate-400 font-medium">
                      Harakatlar tarixi bo'sh
                    </td>
                  </tr>
                ) : (
                  movements.map((m) => {
                    let typeBadge = 'bg-emerald-100 text-emerald-800 border-emerald-300';
                    let typeLabel = 'Kirim (Prihod)';
                    let isPlus = true;

                    if (m.type === 'out_sale') {
                      typeBadge = 'bg-blue-100 text-blue-800 border-blue-300';
                      typeLabel = 'Savdo (Chiqim)';
                      isPlus = false;
                    } else if (m.type === 'waste') {
                      typeBadge = 'bg-rose-100 text-rose-800 border-rose-300';
                      typeLabel = 'Spisanie (Brak)';
                      isPlus = false;
                    } else if (m.type === 'adjustment') {
                      typeBadge = 'bg-amber-100 text-amber-800 border-amber-300';
                      typeLabel = 'Inventarizatsiya';
                      isPlus = m.new_stock >= m.previous_stock;
                    }

                    return (
                      <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3.5 pl-4 font-mono text-slate-500 text-[11px]">
                          {new Date(m.created_at).toLocaleString()}
                        </td>

                        <td className="p-3.5 font-bold text-slate-900">
                          {m.product_name}
                        </td>

                        <td className="p-3.5 text-center">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${typeBadge}`}>
                            {typeLabel}
                          </span>
                        </td>

                        <td className="p-3.5 text-center font-mono font-bold text-sm">
                          <span className={isPlus ? 'text-emerald-700' : 'text-rose-600'}>
                            {isPlus ? '+' : '-'}{Math.abs(m.quantity)} {m.unit || 'dona'}
                          </span>
                        </td>

                        <td className="p-3.5 text-center font-mono text-xs text-slate-600">
                          {m.previous_stock} ➔ <strong className="text-slate-900">{m.new_stock}</strong>
                        </td>

                        <td className="p-3.5 text-slate-600 text-xs">
                          {m.note || m.supplier || '—'}
                        </td>

                        <td className="p-3.5 pr-4 text-right font-medium text-slate-700">
                          👤 {m.created_by || 'Admin'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: Inflow (Prihod), Adjustment, Waste */}
      {modalType && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-scaleUp">
            
            {/* Modal Title Bar */}
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                {modalType === 'inflow' && <PlusCircle className="w-5 h-5 text-emerald-400" />}
                {modalType === 'adjustment' && <History className="w-5 h-5 text-blue-400" />}
                {modalType === 'waste' && <TrendingDown className="w-5 h-5 text-rose-400" />}
                <h3 className="font-bold text-sm">
                  {modalType === 'inflow' && "Skladga Yangi Kirim (Prihod)"}
                  {modalType === 'adjustment' && "Qoldiqni To'g'rilash (Inventarizatsiya)"}
                  {modalType === 'waste' && "Hisobdan Chiqarish (Spisanie / Brak)"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalType(null)}
                className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center text-xs font-bold"
              >
                ✕
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleModalSubmit} className="p-5 flex flex-col gap-4 text-xs">
              {/* Product selector */}
              <div className="flex flex-col gap-1.5">
                <label className="font-bold text-slate-700">Mahsulot / Taom:</label>
                <select
                  value={modalForm.productId}
                  onChange={(e) => {
                    const found = inventoryItems.find((i) => String(i.id) === e.target.value);
                    setSelectedProduct(found);
                    setModalForm({
                      ...modalForm,
                      productId: e.target.value,
                      costPrice: found ? (found.cost_price || '') : '',
                      newStock: found ? String(found.stock_quantity) : '',
                    });
                  }}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:outline-none focus:border-blue-500"
                >
                  {inventoryItems.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Hozirgi qoldiq: {p.stock_quantity} {p.unit})
                    </option>
                  ))}
                </select>
              </div>

              {/* INFLOW FIELDS */}
              {modalType === 'inflow' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <label className="font-bold text-slate-700">Kirim Miqdori (Soni):</label>
                      <input
                        type="number"
                        step="any"
                        required
                        value={modalForm.quantity}
                        onChange={(e) => setModalForm({ ...modalForm, quantity: e.target.value })}
                        placeholder="Masalan: 50"
                        className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-mono font-bold text-slate-900 focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="font-bold text-slate-700">Tannarxi (1 dona):</label>
                      <input
                        type="number"
                        value={modalForm.costPrice}
                        onChange={(e) => setModalForm({ ...modalForm, costPrice: e.target.value })}
                        placeholder="UZS"
                        className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-mono text-slate-900 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="font-bold text-slate-700">Yetkazib Beruvchi (Postavshik):</label>
                    <input
                      type="text"
                      value={modalForm.supplier}
                      onChange={(e) => setModalForm({ ...modalForm, supplier: e.target.value })}
                      placeholder="Firma / Bozor nomi"
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </>
              )}

              {/* ADJUSTMENT FIELDS */}
              {modalType === 'adjustment' && (
                <div className="flex flex-col gap-1.5">
                  <label className="font-bold text-slate-700">Haqiqiy Sanalgan Qoldiq:</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={modalForm.newStock}
                    onChange={(e) => setModalForm({ ...modalForm, newStock: e.target.value })}
                    placeholder="Yangi aniq qoldiq"
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-mono font-black text-blue-700 text-sm focus:outline-none focus:border-blue-500"
                  />
                  <span className="text-[11px] text-slate-500">
                    Hozirgi qoldiq: <b>{selectedProduct?.stock_quantity}</b> {selectedProduct?.unit}
                  </span>
                </div>
              )}

              {/* WASTE FIELDS */}
              {modalType === 'waste' && (
                <div className="flex flex-col gap-1.5">
                  <label className="font-bold text-slate-700">Chiqim Miqdori (Spisanie):</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={modalForm.quantity}
                    onChange={(e) => setModalForm({ ...modalForm, quantity: e.target.value })}
                    placeholder="Chiqim soni"
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-mono font-black text-rose-600 text-sm focus:outline-none focus:border-rose-500"
                  />
                </div>
              )}

              {/* Note */}
              <div className="flex flex-col gap-1.5">
                <label className="font-bold text-slate-700">Izoh / Sabab:</label>
                <input
                  type="text"
                  value={modalForm.note}
                  onChange={(e) => setModalForm({ ...modalForm, note: e.target.value })}
                  placeholder="Izoh yozing..."
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalType(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold"
                >
                  Bekor qilish
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className={`px-5 py-2 text-white font-black rounded-xl shadow-md transition-all active:scale-95 ${
                    modalType === 'inflow'
                      ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                      : modalType === 'adjustment'
                      ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20'
                      : 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                  }`}
                >
                  {submitting ? 'Saqlanmoqda...' : 'Tasdiqlash va Saqlash'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
