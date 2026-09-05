import React, { useState, useContext, useEffect } from 'react';
import { AppContext } from '../context/AppContext';
import { 
  Plus, 
  Search, 
  Trash2, 
  Edit3, 
  RefreshCcw, 
  Printer, 
  FileText,
  Archive,
  X
} from 'lucide-react';

export default function Warehouse() {
  const { 
    products, 
    addProduct, 
    updateProductPrice, 
    addStockMovement, 
    correctStock, 
    archiveProduct,
    deleteProduct,
    getStockMovements,
    t
  } = useContext(AppContext);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProductId, setSelectedProductId] = useState(products[1]?.id || products[0]?.id || '');
  const [movements, setMovements] = useState([]);
  const [loadingMovements, setLoadingMovements] = useState(false);

  useEffect(() => {
    if (!selectedProductId) {
      setMovements([]);
      return;
    }
    const fetchMovements = async () => {
      setLoadingMovements(true);
      const res = await getStockMovements(selectedProductId);
      setMovements(res);
      setLoadingMovements(false);
    };
    fetchMovements();
  }, [selectedProductId, products]);

  useEffect(() => {
    if (!selectedProductId && products.length > 0) {
      const activeProd = products.find(p => !p.archived);
      if (activeProd) {
        setSelectedProductId(activeProd.id);
      }
    }
  }, [products, selectedProductId]);

  const [kirimQty, setKirimQty] = useState('5');
  const [kirimComment, setKirimComment] = useState('');

  // Add Product Form state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newProdName, setNewProdName] = useState('');
  const [newProdKUnit, setNewProdKUnit] = useState('Quti');
  const [newProdSUnit, setNewProdSUnit] = useState('Dona');
  const [newProdCoeff, setNewProdCoeff] = useState('12');
  const [newProdPrice, setNewProdPrice] = useState('15000');
  const [newProdMin, setNewProdMin] = useState('30');

  // Price Edit State
  const [editingProductId, setEditingProductId] = useState(null);
  const [editPriceVal, setEditPriceVal] = useState('');

  // Correction Modal State
  const [showCorrectModal, setShowCorrectModal] = useState(false);
  const [correctProductId, setCorrectProductId] = useState(null);
  const [correctNewQty, setCorrectNewQty] = useState('');
  const [correctReason, setCorrectReason] = useState('');

  // Barcode View State
  const [showBarcodeModal, setShowBarcodeModal] = useState(false);
  const [barcodeProd, setBarcodeProd] = useState(null);

  // Active product for Kirim
  const activeKirimProduct = products.find(p => p.id === selectedProductId);

  const handleKirimSubmit = (e) => {
    e.preventDefault();
    if (!selectedProductId || !kirimQty) return;
    addStockMovement(selectedProductId, Number(kirimQty), kirimComment);
    setKirimQty('0');
    setKirimComment('');
    alert(t('restockSuccess'));
  };

  const handleAddProduct = (e) => {
    e.preventDefault();
    addProduct({
      name: newProdName,
      kUnit: newProdKUnit,
      sUnit: newProdSUnit,
      coeff: Number(newProdCoeff),
      price: Number(newProdPrice),
      minStock: Number(newProdMin)
    });
    setShowAddModal(false);
    setNewProdName('');
    setNewProdKUnit('Quti');
    setNewProdSUnit('Dona');
    setNewProdCoeff('12');
    setNewProdPrice('15000');
    setNewProdMin('30');
  };

  const handleSavePrice = (id) => {
    updateProductPrice(id, editPriceVal);
    setEditingProductId(null);
  };

  const handleCorrectSubmit = (e) => {
    e.preventDefault();
    if (!correctReason.trim()) {
      alert(t('correctReasonRequired'));
      return;
    }
    correctStock(correctProductId, correctNewQty, correctReason);
    setShowCorrectModal(false);
    setCorrectProductId(null);
    setCorrectNewQty('');
    setCorrectReason('');
    alert(t('correctSuccess'));
  };

  const filteredProducts = products.filter(p => {
    if (p.archived) return false;
    const q = searchQuery.toLowerCase();
    return p.name.toLowerCase().includes(q) || (p.barcode && p.barcode.includes(q));
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
          <input
            type="text"
            placeholder={t('searchProdPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-brand-500 transition-all font-medium shadow-sm"
          />
        </div>

        {/* Add Product Button */}
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition-all shadow-md shadow-brand-100"
        >
          <Plus className="w-4 h-4" />
          {t('newProdBtn')}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* LEFT: Products Table List */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-50">
            <h2 className="text-lg font-bold text-slate-800">{t('warehouseTitle')}</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 text-[11px] font-semibold text-slate-400 uppercase border-b border-slate-50">
                  <th className="py-3 px-4">{t('tableNomi')}</th>
                  <th className="py-3 px-3">{t('tableKUnit')}</th>
                  <th className="py-3 px-3">{t('tableSUnit')}</th>
                  <th className="py-3 px-3 text-center">{t('tableCoeff')}</th>
                  <th className="py-3 px-4 text-right">{t('tableSotishNarxi')}</th>
                  <th className="py-3 px-4 text-right">{t('tableQoldiq')}</th>
                  <th className="py-3 px-4 text-center">{t('tableStatus')}</th>
                  <th className="py-3 px-4 text-center">{t('tableAmallar')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-xs text-slate-600 font-medium">
                {filteredProducts.map((p) => {
                  const isLow = p.stock <= p.minStock;
                  const isCritical = p.stock <= p.minStock * 0.3;
                  const statusLabel = isCritical ? t('statusCritical') : isLow ? t('statusLow') : t('statusNormal');
                  const statusClass = isCritical ? 'bg-rose-50 text-rose-500' : isLow ? 'bg-amber-50 text-amber-500' : 'bg-emerald-50 text-emerald-500';

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/50 transition-all">
                      <td className="py-4 px-4">
                        <div className="font-bold text-slate-800">{p.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">BC: {p.barcode}</div>
                      </td>
                      <td className="py-4 px-3 text-slate-500">{t(`unit_${p.kUnit}`)}</td>
                      <td className="py-4 px-3 text-slate-500">{t(`unit_${p.sUnit}`)}</td>
                      <td className="py-4 px-3 text-center font-bold text-slate-700">{p.coeff}</td>
                      <td className="py-4 px-4 text-right">
                        {editingProductId === p.id ? (
                          <div className="flex items-center gap-1.5 justify-end">
                            <input
                              type="text"
                              value={editPriceVal}
                              onChange={(e) => setEditPriceVal(e.target.value.replace(/\D/g, ''))}
                              className="w-16 px-1.5 py-1 text-xs border border-slate-200 rounded font-bold text-right outline-none"
                            />
                            <button 
                              onClick={() => handleSavePrice(p.id)}
                              className="p-1 bg-brand-50 text-brand-600 rounded hover:bg-brand-100"
                            >
                              OK
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-1 group">
                            <span className="font-bold text-slate-800">{(p.price || 0).toLocaleString()} UZS</span>
                            <button 
                              onClick={() => {
                                setEditingProductId(p.id);
                                setEditPriceVal((p.price || 0).toString());
                              }}
                              className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-400 hover:text-brand-500 transition-all"
                            >
                              <Edit3 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-4 text-right font-bold text-slate-800">
                        {p.stock} {t(`unit_${p.sUnit}`)}
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${statusClass}`}>
                          {statusLabel}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedProductId(p.id);
                              document.getElementById('kirimQtyInput')?.focus();
                            }}
                            className="p-1 text-slate-400 hover:text-brand-500 rounded hover:bg-slate-50 transition-all"
                            title={t('kirimKiritishTitle')}
                          >
                            <RefreshCcw className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setCorrectProductId(p.id);
                              setCorrectNewQty(p.stock.toString());
                              setShowCorrectModal(true);
                            }}
                            className="p-1 text-slate-400 hover:text-amber-500 rounded hover:bg-slate-50 transition-all"
                            title={t('correctStockTitle')}
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setBarcodeProd(p);
                              setShowBarcodeModal(true);
                            }}
                            className="p-1 text-slate-400 hover:text-emerald-500 rounded hover:bg-slate-50 transition-all"
                            title={t('printLabelTitle')}
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm(`${p.name} mahsulotini ro'yxatdan butunlay o'chirmoqchimisiz?`)) {
                                deleteProduct(p.id);
                              }
                            }}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition-all"
                            title="O'chirish"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* RIGHT: Kirim kiritish Form */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-800">{t('kirimKiritishTitle')}</h2>
            <Trash2 
              onClick={() => {
                setKirimQty('0');
                setKirimComment('');
              }}
              className="w-5 h-5 text-slate-400 hover:text-slate-600 cursor-pointer transition-all" 
            />
          </div>

          <form onSubmit={handleKirimSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500">{t('chooseProdLabel')}</label>
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 text-sm outline-none focus:border-brand-500 font-semibold"
              >
                <option value="">{t('chooseProdLabel')}...</option>
                {products.filter(p => !p.archived).map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500">{t('restockQtyLabel')}</label>
              <div className="relative">
                <input
                  id="kirimQtyInput"
                  type="text"
                  value={kirimQty}
                  onChange={(e) => setKirimQty(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-3 pr-14 py-2.5 text-slate-800 font-bold text-sm outline-none focus:border-brand-500"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                  {activeKirimProduct ? t(`unit_${activeKirimProduct.kUnit}`) : 'Birlik'}
                </span>
              </div>
            </div>

            {activeKirimProduct && Number(kirimQty || 0) > 0 && (
              <div className="bg-brand-50 border border-brand-100 rounded-xl p-3.5 text-brand-600 font-semibold text-xs flex items-center gap-2">
                <span>+ {kirimQty} {t(`unit_${activeKirimProduct.kUnit}`)} = {Number(kirimQty) * activeKirimProduct.coeff} {t(`unit_${activeKirimProduct.sUnit}`)} ({t('restockHelperText')})</span>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500">{t('restockCommentLabel')}</label>
              <input
                type="text"
                placeholder="Yetkazib beruvchi..."
                value={kirimComment}
                onChange={(e) => setKirimComment(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 text-sm outline-none focus:border-brand-500 font-medium"
              />
            </div>

            <div className="pt-2 space-y-2">
              <button
                type="submit"
                className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-2xl transition-all shadow-md shadow-brand-100 text-sm"
              >
                {t('saveRestockBtn')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setKirimQty('0');
                  setKirimComment('');
                }}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold rounded-2xl transition-all text-sm"
              >
                {t('cancelBtn')}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* 2. STOCK MOVEMENTS HISTORY TABLE */}
      {selectedProductId && (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-800">
              {activeKirimProduct ? `"${activeKirimProduct.name}" ` : ''} Sklad harakatlari tarixi (Stock Movements History)
            </h3>
            {loadingMovements && <span className="text-xs text-slate-400 font-semibold animate-pulse">Yuklanmoqda...</span>}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 text-[11px] font-semibold text-slate-400 uppercase border-b border-slate-50">
                  <th className="py-3 px-4">Sana / Vaqt</th>
                  <th className="py-3 px-4">Turi</th>
                  <th className="py-3 px-4 text-right">Kelish miqdori</th>
                  <th className="py-3 px-4 text-right">Sotish miqdori</th>
                  <th className="py-3 px-4">Sabab / Izoh</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-xs text-slate-600 font-medium">
                {movements.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="py-8 text-center text-slate-400">
                      Harakatlar tarixi mavjud emas
                    </td>
                  </tr>
                ) : (
                  movements.map((m) => {
                    const isKirim = m.type === 'kirim';
                    const isChiqim = m.type === 'chiqim';
                    const typeLabel = isKirim ? 'Kirim' : isChiqim ? 'Chiqim' : 'Tuzatish';
                    const typeClass = isKirim ? 'bg-emerald-50 text-emerald-600' : isChiqim ? 'bg-rose-50 text-rose-600' : 'bg-blue-50 text-blue-600';

                    return (
                      <tr key={m.id || m.timestamp} className="hover:bg-slate-50/50 transition-all">
                        <td className="py-3.5 px-4 text-slate-500">
                          {new Date(m.created_at || m.timestamp).toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${typeClass}`}>
                            {typeLabel}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-slate-700">
                          {m.purchase_unit_amount ? `${m.purchase_unit_amount} ${activeKirimProduct ? activeKirimProduct.kUnit : ''}` : '-'}
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-slate-800">
                          {m.sale_unit_amount ? `${m.sale_unit_amount} ${activeKirimProduct ? activeKirimProduct.sUnit : ''}` : '-'}
                        </td>
                        <td className="py-3.5 px-4 text-slate-500 font-normal">
                          {m.reason || '-'}
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

      {/* 1. NEW PRODUCT MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl p-6 w-full max-w-md space-y-4">
            <div className="flex items-center justify-between border-b border-slate-50 pb-3">
              <h3 className="text-base font-bold text-slate-800">{t('addNewProdTitle')}</h3>
              <X onClick={() => setShowAddModal(false)} className="w-5 h-5 text-slate-400 hover:text-slate-600 cursor-pointer" />
            </div>
            <form onSubmit={handleAddProduct} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">{t('newProdNameLabel')}</label>
                <input
                  type="text"
                  required
                  placeholder="Cola-Cola 1.5L"
                  value={newProdName}
                  onChange={(e) => setNewProdName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 text-sm outline-none focus:border-brand-500 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500">{t('newProdKUnitLabel')}</label>
                  <input
                    type="text"
                    required
                    placeholder="Quti, Blok, Qop"
                    value={newProdKUnit}
                    onChange={(e) => setNewProdKUnit(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 text-sm outline-none focus:border-brand-500 font-medium"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500">{t('newProdSUnitLabel')}</label>
                  <input
                    type="text"
                    required
                    placeholder="Dona, Metr, Kg"
                    value={newProdSUnit}
                    onChange={(e) => setNewProdSUnit(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 text-sm outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500">{t('newProdCoeffLabel')}</label>
                  <input
                    type="text"
                    required
                    placeholder="12, 50, 1"
                    value={newProdCoeff}
                    onChange={(e) => setNewProdCoeff(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 text-sm font-bold outline-none focus:border-brand-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500">{t('newProdPriceLabel')}</label>
                  <input
                    type="text"
                    required
                    placeholder="15000"
                    value={newProdPrice}
                    onChange={(e) => setNewProdPrice(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 text-sm font-bold outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">{t('newProdMinLabel')}</label>
                <input
                  type="text"
                  required
                  placeholder="30"
                  value={newProdMin}
                  onChange={(e) => setNewProdMin(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 text-sm font-semibold outline-none focus:border-brand-500"
                />
              </div>

              <div className="pt-3 flex gap-3">
                <button
                  type="submit"
                  className="flex-1 py-3 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-2xl transition-all shadow-md"
                >
                  {t('addBtn')}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold rounded-2xl transition-all text-sm font-medium"
                >
                  {t('cancelBtn')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. STOCK CORRECTION MODAL */}
      {showCorrectModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl p-6 w-full max-w-md space-y-4">
            <div className="flex items-center justify-between border-b border-slate-50 pb-3">
              <h3 className="text-base font-bold text-slate-800">{t('correctStockTitle')}</h3>
              <X onClick={() => setShowCorrectModal(false)} className="w-5 h-5 text-slate-400 hover:text-slate-600 cursor-pointer" />
            </div>
            <form onSubmit={handleCorrectSubmit} className="space-y-4">
              <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-100 text-xs font-semibold text-slate-600">
                {t('tableNomi')}: <span className="text-slate-800 font-bold">{products.find(p => p.id === correctProductId)?.name}</span>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">{t('newPhysicalStockLabel')}</label>
                <input
                  type="text"
                  required
                  value={correctNewQty}
                  onChange={(e) => setCorrectNewQty(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 font-bold text-sm outline-none focus:border-brand-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">{t('correctReasonLabel')}</label>
                <textarea
                  required
                  rows={3}
                  placeholder="..."
                  value={correctReason}
                  onChange={(e) => setCorrectReason(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 text-sm outline-none focus:border-brand-500 font-medium resize-none"
                />
              </div>

              <div className="pt-3 flex gap-3">
                <button
                  type="submit"
                  className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-2xl transition-all shadow-md text-sm"
                >
                  {t('saveCorrectBtn')}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCorrectModal(false)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold rounded-2xl transition-all text-sm font-medium"
                >
                  {t('cancelBtn')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. BARCODE PRINT MODAL */}
      {showBarcodeModal && barcodeProd && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl p-6 w-full max-w-sm space-y-6 text-center">
            <div className="flex items-center justify-between border-b border-slate-50 pb-3">
              <h3 className="text-base font-bold text-slate-800">{t('printLabelTitle')}</h3>
              <X onClick={() => setShowBarcodeModal(false)} className="w-5 h-5 text-slate-400 hover:text-slate-600 cursor-pointer" />
            </div>

            <div id="printable-barcode-label" className="border border-dashed border-slate-300 p-6 rounded-2xl bg-white max-w-xs mx-auto space-y-4 shadow-sm">
              <div className="text-sm font-bold text-slate-800">{barcodeProd.name}</div>
              
              <div className="flex flex-col items-center gap-1 my-2">
                <div className="h-12 w-48 bg-slate-900 flex items-center justify-center text-white text-[10px] tracking-[6px] font-mono select-none">
                  ||||||||||||||||
                </div>
                <span className="text-xs font-mono font-semibold tracking-wider text-slate-600">{barcodeProd.barcode}</span>
              </div>

              <div className="text-base font-bold text-brand-600">{barcodeProd.price.toLocaleString()} UZS</div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  window.print();
                  setShowBarcodeModal(false);
                }}
                className="flex-1 py-3 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-2xl transition-all shadow-md flex items-center justify-center gap-2 text-sm"
              >
                <Printer className="w-4 h-4" />
                {t('printBtn')}
              </button>
              <button
                type="button"
                onClick={() => setShowBarcodeModal(false)}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold rounded-2xl transition-all text-sm font-medium"
              >
                {t('cancelBtn')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
