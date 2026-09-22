import React, { useState, useEffect } from 'react';

export default function JetCafeOrderItemEditModal({
  isOpen,
  onClose,
  item,
  onSaveItem,
  onDeleteItem,
}) {
  if (!isOpen || !item) return null;

  const [quantity, setQuantity] = useState(item.quantity || 1);
  const [price, setPrice] = useState(item.price || 0);
  const [comment, setComment] = useState(item.comment || '');
  const [activeTab, setActiveTab] = useState('qty'); // 'qty' | 'price' | 'comment'
  const [numpadBuffer, setNumpadBuffer] = useState('');

  useEffect(() => {
    setQuantity(item.quantity || 1);
    setPrice(item.price || 0);
    setComment(item.comment || '');
    setNumpadBuffer('');
    setActiveTab('qty');
  }, [item]);

  const handleNumpad = (char) => {
    if (char === 'C') {
      setNumpadBuffer('');
      if (activeTab === 'qty') setQuantity(1);
      if (activeTab === 'price') setPrice(item.price || 0);
      return;
    }

    if (char === '⌫') {
      const next = numpadBuffer.slice(0, -1);
      setNumpadBuffer(next);
      const val = parseInt(next, 10);
      if (activeTab === 'qty') {
        setQuantity(isNaN(val) || val <= 0 ? 1 : val);
      } else if (activeTab === 'price') {
        setPrice(isNaN(val) ? 0 : val);
      }
      return;
    }

    const next = numpadBuffer + char;
    setNumpadBuffer(next);
    const val = parseInt(next, 10);
    if (!isNaN(val)) {
      if (activeTab === 'qty') {
        setQuantity(val <= 0 ? 1 : val);
      } else if (activeTab === 'price') {
        setPrice(val);
      }
    }
  };

  const handleQuickQty = (q) => {
    setQuantity(q);
    setNumpadBuffer(String(q));
  };

  const handleDeltaQty = (delta) => {
    const newQ = Math.max(1, quantity + delta);
    setQuantity(newQ);
    setNumpadBuffer(String(newQ));
  };

  const handleSave = () => {
    onSaveItem({
      ...item,
      quantity: Number(quantity) || 1,
      price: Number(price) || 0,
      comment: (comment || '').trim(),
    });
    onClose();
  };

  const formatUZS = (val) => (val || 0).toLocaleString('ru-RU');
  const totalPrice = (Number(price) || 0) * (Number(quantity) || 1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[1px] select-none p-4">
      <div className="w-full max-w-lg bg-[#eff1f5] border-2 border-[#b0b8c5] rounded-lg shadow-2xl flex flex-col text-slate-800 text-xs font-sans overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Title Bar */}
        <div className="bg-gradient-to-r from-[#d9dfe8] to-[#c7d0de] border-b border-[#a8b3c4] px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-slate-800 text-xs tracking-wide">
            <span className="text-slate-900 font-black">GetPOS Kafe</span>
            <span className="text-slate-400">|</span>
            <span>Buyurtma taomini tahrirlash (Soni / Narxi / Izoh)</span>
          </div>
          <button
            onClick={onClose}
            className="w-6 h-6 flex items-center justify-center text-xs font-black text-slate-600 hover:bg-rose-500 hover:text-white rounded transition"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 flex flex-col space-y-4">
          
          {/* Item Name Banner */}
          <div className="bg-white border border-[#b8c2d1] rounded-lg p-3 text-center shadow-sm">
            <h2 className="text-lg font-black text-slate-900 uppercase tracking-wide">
              {item.product_name}
            </h2>
            <div className="text-[11px] text-slate-500 mt-0.5 flex items-center justify-center gap-2">
              {item.waiter_name && (
                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold border border-slate-200">
                  👤 Mas'ul: {item.waiter_name}
                </span>
              )}
              <span className="font-bold text-blue-700">
                Standart narxi: {formatUZS(item.price)} UZS
              </span>
            </div>
          </div>

          {/* Tab Selector */}
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => { setActiveTab('qty'); setNumpadBuffer(String(quantity)); }}
              className={`py-2 px-3 rounded font-bold text-xs flex flex-col items-center justify-center transition border ${
                activeTab === 'qty'
                  ? 'bg-blue-600 text-white border-blue-700 shadow-sm'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
              }`}
            >
              <span className="text-[10px] opacity-80">MIQDOR (SONI)</span>
              <span className="text-base font-black">{quantity} ta</span>
            </button>

            <button
              type="button"
              onClick={() => { setActiveTab('price'); setNumpadBuffer(String(price)); }}
              className={`py-2 px-3 rounded font-bold text-xs flex flex-col items-center justify-center transition border ${
                activeTab === 'price'
                  ? 'bg-blue-600 text-white border-blue-700 shadow-sm'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
              }`}
            >
              <span className="text-[10px] opacity-80">NARXI (DONA)</span>
              <span className="text-base font-black">{formatUZS(price)}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('comment')}
              className={`py-2 px-3 rounded font-bold text-xs flex flex-col items-center justify-center transition border ${
                activeTab === 'comment'
                  ? 'bg-blue-600 text-white border-blue-700 shadow-sm'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
              }`}
            >
              <span className="text-[10px] opacity-80">IZOH (KOMMENT)</span>
              <span className="text-xs truncate max-w-[100px] font-semibold">
                {comment || "Izoh yo'q"}
              </span>
            </button>
          </div>

          {/* Center Editor Area */}
          <div className="grid grid-cols-12 gap-4">
            
            {/* Left controls (7 cols) */}
            <div className="col-span-7 flex flex-col justify-between space-y-3 bg-white p-3.5 border border-[#b8c2d1] rounded-lg">
              
              {activeTab === 'qty' && (
                <div className="space-y-3">
                  <label className="text-xs font-black text-slate-700 block">
                    Buyurtma sonini o'zgartirish:
                  </label>
                  
                  {/* +/- buttons with large input */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleDeltaQty(-1)}
                      className="w-11 h-11 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-300 text-lg font-black text-slate-800 flex items-center justify-center active:scale-95 transition"
                    >
                      -
                    </button>
                    <div className="flex-1 text-center font-black text-2xl font-mono text-blue-700 py-1 bg-slate-50 border border-blue-300 rounded-lg shadow-inner">
                      {quantity}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeltaQty(1)}
                      className="w-11 h-11 rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-300 text-lg font-black text-blue-800 flex items-center justify-center active:scale-95 transition"
                    >
                      +
                    </button>
                  </div>

                  {/* Quick Select Quantity Pills */}
                  <div className="flex items-center gap-1.5 pt-1">
                    {[1, 2, 3, 4, 5, 10].map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => handleQuickQty(q)}
                        className={`flex-1 py-1.5 rounded font-bold text-xs border transition ${
                          quantity === q
                            ? 'bg-blue-600 text-white border-blue-700'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                        }`}
                      >
                        {q}
                      </button>
                    ))}
                  </div>

                  <p className="text-[11px] text-slate-500 italic mt-1">
                    Misol uchun: Agar mijoz 2 ta emas 1 ta xohlagan bo'lsa, 1 ga tushiring. Ortiqcha taom omborga avtomatik qaytariladi.
                  </p>
                </div>
              )}

              {activeTab === 'price' && (
                <div className="space-y-3">
                  <label className="text-xs font-black text-slate-700 block">
                    Taom narxini tahrirlash (UZS):
                  </label>
                  <div className="text-center font-black text-2xl font-mono text-emerald-700 py-2 bg-emerald-50 border border-emerald-300 rounded-lg shadow-inner">
                    {formatUZS(price)} UZS
                  </div>

                  {/* Quick Price Actions */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => { setPrice(item.price); setNumpadBuffer(String(item.price)); }}
                      className="py-1.5 px-2 bg-slate-100 hover:bg-slate-200 border rounded text-[11px] font-bold text-slate-700"
                    >
                      Standart narx ({formatUZS(item.price)})
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const disc = Math.round((item.price * 0.9) / 1000) * 1000;
                        setPrice(disc);
                        setNumpadBuffer(String(disc));
                      }}
                      className="py-1.5 px-2 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded text-[11px] font-bold text-amber-800"
                    >
                      -10% Chegirma
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'comment' && (
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-700 block">
                    Oshxona / Oshpaz uchun izoh:
                  </label>
                  <textarea
                    rows={3}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Masalan: Piyozsiz, issiqroq, sous alohida..."
                    className="w-full p-2 border border-slate-300 rounded text-xs focus:outline-none focus:border-blue-500 shadow-inner"
                  />
                  <div className="flex flex-wrap gap-1">
                    {['Piyozsiz', 'Issiqroq', 'Muzsiz', 'Sous alohida', 'Tezroq'].map((quick) => (
                      <button
                        key={quick}
                        type="button"
                        onClick={() => setComment((prev) => (prev ? `${prev}, ${quick}` : quick))}
                        className="px-2 py-1 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded text-[10px] font-medium text-slate-700"
                      >
                        +{quick}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Jami hisob banner */}
              <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs font-bold text-slate-700">
                <span>Jami bu taom uchun:</span>
                <span className="text-sm font-black text-blue-700 font-mono">
                  {formatUZS(totalPrice)} UZS
                </span>
              </div>
            </div>

            {/* Right side: Touch Numpad (5 cols) */}
            <div className="col-span-5 grid grid-cols-3 gap-1.5 bg-[#e4e8ef] p-2 rounded-lg border border-[#b8c2d1]">
              {['7', '8', '9', '4', '5', '6', '1', '2', '3', 'C', '0', '⌫'].map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => handleNumpad(k)}
                  className={`h-11 rounded font-black text-base flex items-center justify-center shadow-sm border active:scale-95 transition ${
                    k === 'C'
                      ? 'bg-rose-100 hover:bg-rose-200 border-rose-300 text-rose-700'
                      : k === '⌫'
                      ? 'bg-amber-100 hover:bg-amber-200 border-amber-300 text-amber-800'
                      : 'bg-white hover:bg-blue-50 border-[#b0b9c7] text-slate-800'
                  }`}
                >
                  {k}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-[#e4e8ef] border-t border-[#c2cbd8] px-5 py-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              if (onDeleteItem) {
                onDeleteItem(item);
                onClose();
              }
            }}
            className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 border border-rose-300 text-rose-700 rounded font-bold text-xs flex items-center gap-1.5 transition active:scale-95"
          >
            <span>🗑</span>
            <span>Butunlay o'chirish</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-100 rounded font-semibold text-slate-700 text-xs"
            >
              Bekor qilish
            </button>
            
            <button
              type="button"
              onClick={handleSave}
              className="px-6 py-2 bg-gradient-to-b from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white rounded font-black text-xs shadow-md border border-blue-800 active:scale-95 transition flex items-center gap-1.5"
            >
              <span>💾</span>
              <span>Saqlash (O'zgartirish)</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
