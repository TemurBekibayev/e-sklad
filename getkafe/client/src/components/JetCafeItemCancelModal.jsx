import React, { useState, useEffect } from 'react';

export default function JetCafeItemCancelModal({ isOpen, onClose, item, onConfirmCancel }) {
  if (!isOpen || !item) return null;

  const maxQty = Math.abs(item.quantity || 1);
  const [cancelQty, setCancelQty] = useState(maxQty);
  const [reason, setReason] = useState('Клиент отказался');
  const [numpadBuffer, setNumpadBuffer] = useState(String(maxQty));

  useEffect(() => {
    const q = Math.abs(item.quantity || 1);
    setCancelQty(q);
    setNumpadBuffer(String(q));
  }, [item]);

  const handleNumpad = (char) => {
    if (char === '⌫') {
      const next = numpadBuffer.slice(0, -1);
      setNumpadBuffer(next);
      const val = parseInt(next, 10);
      setCancelQty(isNaN(val) || val <= 0 ? 1 : Math.min(val, maxQty));
      return;
    }

    const next = numpadBuffer + char;
    const val = parseInt(next, 10);
    if (!isNaN(val) && val > 0) {
      const clamped = Math.min(val, maxQty);
      setNumpadBuffer(String(clamped));
      setCancelQty(clamped);
    }
  };

  const handleSliderChange = (e) => {
    const val = Number(e.target.value);
    setCancelQty(val);
    setNumpadBuffer(String(val));
  };

  const handleSave = () => {
    onConfirmCancel({
      itemId: item.id,
      productId: item.product_id,
      cancelQty,
      reason,
    });
    onClose();
  };

  const formatUZS = (val) => (val || 0).toLocaleString('ru-RU');
  const totalDeduct = (item.price || 0) * cancelQty;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[1px] select-none p-4">
      {/* Modal matching v2_detail_6.jpg */}
      <div className="w-full max-w-lg bg-[#eff1f5] border-2 border-[#b0b8c5] rounded-md shadow-2xl flex flex-col text-slate-800 text-xs font-sans overflow-hidden">
        
        {/* Title Bar */}
        <div className="bg-gradient-to-r from-[#d9dfe8] to-[#c7d0de] border-b border-[#a8b3c4] px-3 py-1.5 flex items-center justify-between">
          <div className="flex items-center gap-2 font-semibold text-slate-700 tracking-wide text-xs">
            <span className="text-slate-900 font-black">GetPOS Kafe</span>
            <span className="text-slate-400">|</span>
            <span>Taomni bekor qilish (Qaytarish)</span>
          </div>
          <button
            onClick={onClose}
            className="w-5 h-5 flex items-center justify-center text-xs font-bold text-slate-600 hover:bg-rose-500 hover:text-white rounded transition"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 flex flex-col items-center">
          
          {/* Big Bold Dish Name in Center matching video */}
          <h2 className="text-2xl font-black text-slate-900 uppercase tracking-wide text-center mb-6">
            {item.product_name}
          </h2>

          {/* 2-column: Left = controls & slider, Right = Touch Numpad */}
          <div className="w-full grid grid-cols-12 gap-6">
            
            {/* Left side (7 cols) */}
            <div className="col-span-7 flex flex-col justify-between space-y-4">
              
              {/* Количество */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-slate-700">Количество:</label>
                  <div className="flex items-center border border-[#b8c2d1] rounded bg-white shadow-inner overflow-hidden">
                    <input
                      type="number"
                      min={1}
                      max={maxQty}
                      value={cancelQty}
                      onChange={(e) => {
                        const val = Math.min(Math.max(1, Number(e.target.value) || 1), maxQty);
                        setCancelQty(val);
                        setNumpadBuffer(String(val));
                      }}
                      className="w-16 px-2 py-1 text-center font-black text-base focus:outline-none"
                    />
                    <div className="flex flex-col border-l border-slate-200">
                      <button
                        type="button"
                        onClick={() => {
                          if (cancelQty < maxQty) {
                            setCancelQty(cancelQty + 1);
                            setNumpadBuffer(String(cancelQty + 1));
                          }
                        }}
                        className="px-1.5 py-0.5 hover:bg-slate-100 text-[10px] font-bold"
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (cancelQty > 1) {
                            setCancelQty(cancelQty - 1);
                            setNumpadBuffer(String(cancelQty - 1));
                          }
                        }}
                        className="px-1.5 py-0.5 hover:bg-slate-100 text-[10px] font-bold border-t border-slate-200"
                      >
                        ▼
                      </button>
                    </div>
                  </div>
                </div>

                {/* Slider matching video */}
                <input
                  type="range"
                  min={1}
                  max={maxQty}
                  value={cancelQty}
                  onChange={handleSliderChange}
                  className="w-full accent-blue-600 h-2 bg-slate-200 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-semibold px-0.5">
                  <span>1</span>
                  <span>{maxQty} (Все)</span>
                </div>
              </div>

              {/* Сумма */}
              <div className="flex items-center justify-between border-t border-slate-200 pt-3">
                <label className="text-sm font-bold text-slate-700">Сумма возврата:</label>
                <div className="bg-rose-50 border border-rose-300 rounded px-3 py-1 font-mono text-base font-black text-rose-700 shadow-inner">
                  -{formatUZS(totalDeduct)} UZS
                </div>
              </div>

              {/* Причина отмены */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">Причина отмены:</label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-2.5 py-1 text-xs bg-white border border-[#b8c2d1] rounded focus:outline-none"
                >
                  <option value="Клиент отказался">Клиент отказался (Mijoz rad etdi)</option>
                  <option value="Ошибка ввода">Ошибка ввода (Xato kiritildi)</option>
                  <option value="Блюдо закончилось">Блюдо закончилось (Taom tugagan)</option>
                  <option value="Долгое ожидание">Долгое ожидание (Kutib charchadi)</option>
                  <option value="Замена на другое блюдо">Замена на другое блюдо (Boshqasiga almashtirildi)</option>
                </select>
              </div>

              {/* Big Save Button matching v2_detail_6.jpg */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleSave}
                  className="w-full py-2.5 bg-gradient-to-b from-[#f7f9fa] to-[#d8e0ea] hover:from-white hover:to-[#ccd6e3] border border-[#a6b2c4] rounded flex items-center justify-center gap-2 text-sm font-bold text-slate-800 shadow-md active:translate-y-[1px] transition"
                >
                  <span className="text-lg">💾</span>
                  <span>Сохранить</span>
                </button>
              </div>
            </div>

            {/* Right side: Touchscreen Numpad (5 cols) matching video */}
            <div className="col-span-5 grid grid-cols-3 gap-1.5 bg-[#e4e8ef] p-2 rounded border border-[#c2cbd8] shadow-inner">
              {['7', '8', '9', '4', '5', '6', '1', '2', '3'].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => handleNumpad(n)}
                  className="h-11 bg-white hover:bg-slate-50 border border-[#a8b4c5] rounded text-base font-black text-slate-800 shadow-sm flex items-center justify-center active:translate-y-[1px]"
                >
                  {n}
                </button>
              ))}
              <button
                type="button"
                onClick={() => handleNumpad('⌫')}
                className="h-11 bg-white hover:bg-slate-50 border border-[#a8b4c5] rounded text-base font-black text-rose-600 shadow-sm flex items-center justify-center active:translate-y-[1px]"
              >
                ⌫
              </button>
              <button
                type="button"
                onClick={() => handleNumpad('0')}
                className="h-11 bg-white hover:bg-slate-50 border border-[#a8b4c5] rounded text-base font-black text-slate-800 shadow-sm flex items-center justify-center active:translate-y-[1px]"
              >
                0
              </button>
              <button
                type="button"
                onClick={() => handleNumpad('.')}
                className="h-11 bg-white hover:bg-slate-50 border border-[#a8b4c5] rounded text-base font-black text-slate-800 shadow-sm flex items-center justify-center active:translate-y-[1px]"
              >
                .
              </button>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
