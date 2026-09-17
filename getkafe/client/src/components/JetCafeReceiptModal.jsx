import React, { useState, useEffect } from 'react';
import { Printer, CheckCircle, X, ExternalLink, ShieldCheck, QrCode, Receipt, Check, FileText } from 'lucide-react';

export default function JetCafeReceiptModal({ isOpen, onClose, orderId, initialType = 'fiscal' }) {
  const [activeTab, setActiveTab] = useState(initialType); // 'fiscal' | 'standard'
  const [loading, setLoading] = useState(true);
  const [receiptData, setReceiptData] = useState(null);
  const [error, setError] = useState(null);
  const [printing, setPrinting] = useState(false);
  const [printStatus, setPrintStatus] = useState(null);

  useEffect(() => {
    if (isOpen && orderId) {
      setActiveTab(initialType || 'fiscal');
      loadReceipt();
    }
  }, [isOpen, orderId, initialType]);

  const loadReceipt = async () => {
    setLoading(true);
    setError(null);
    setPrintStatus(null);
    try {
      const res = await fetch(`/api/orders/${orderId}/receipt`);
      const data = await res.json();
      if (data.success) {
        setReceiptData(data);
      } else {
        setError(data.message || "Chek ma'lumotlarini yuklab bo'lmadi");
      }
    } catch (err) {
      setError("Server bilan aloqa xatosi: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const formatPrice = (val) => new Intl.NumberFormat('uz-UZ').format(val || 0);

  const formatDate = (dateVal) => {
    if (!dateVal) return '—';
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return '—';
    return `${d.toLocaleDateString('uz-UZ')} ${d.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}`;
  };

  const handleReprintThermal = async () => {
    setPrinting(true);
    setPrintStatus(null);
    try {
      const res = await fetch(`/api/orders/${orderId}/reprint`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: activeTab }),
      });
      const data = await res.json();
      if (data.success) {
        setPrintStatus({ success: true, message: "Chek termal printerga muvaffaqiyatli yuborildi!" });
      } else {
        setPrintStatus({ success: false, message: data.error || "Printerda xatolik yuz berdi" });
      }
    } catch (err) {
      setPrintStatus({ success: false, message: "Printerga yuborishda xatolik: " + err.message });
    } finally {
      setPrinting(false);
    }
  };

  const handleBrowserPrint = () => {
    window.print();
  };

  const fiscal = receiptData?.fiscalReceipt;
  const standard = receiptData?.standardReceipt;

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[99999] flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden my-6 flex flex-col max-h-[90vh]">
        
        {/* Top Navigation Bar with Tabs and Close */}
        <div className="bg-slate-800/90 px-5 py-3.5 flex items-center justify-between border-b border-slate-700 shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('fiscal')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                activeTab === 'fiscal'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                  : 'bg-slate-700/80 text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>🏛️ Fiskal chek (Soliq QR)</span>
            </button>
            <button
              onClick={() => setActiveTab('standard')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                activeTab === 'standard'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'bg-slate-700/80 text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>🧾 Oddiy chek (Standart)</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body: Thermal Receipt Preview */}
        <div className="p-4 sm:p-6 bg-slate-950/60 flex-1 overflow-y-auto flex justify-center items-start">
          {loading ? (
            <div className="py-16 text-center text-slate-400 font-medium">
              <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p>Chek ma'lumotlari yuklanmoqda...</p>
            </div>
          ) : error ? (
            <div className="py-12 text-center text-rose-400 font-medium bg-rose-950/20 border border-rose-800 rounded-2xl p-6 w-full">
              <p className="font-bold">Xatolik:</p>
              <p className="text-sm mt-1">{error}</p>
            </div>
          ) : activeTab === 'fiscal' && fiscal ? (
            /* ========================================================================= */
            /* TAB 1: FISCAL RECEIPT (SOLIQ.UZ STANDART)                                  */
            /* ========================================================================= */
            <div
              id="printable-receipt"
              className="w-full max-w-[340px] bg-white text-slate-950 p-5 rounded-2xl shadow-2xl font-mono text-xs border border-slate-300 select-text"
            >
              {/* Header info */}
              <div className="text-center mb-2.5">
                <h3 className="font-black text-xs uppercase tracking-wider text-slate-900">
                  {fiscal.company?.name || 'KAFE "MILLIY TAOMLAR" MCHJ'}
                </h3>
                <p className="text-[10px] text-slate-600 mt-0.5">
                  {fiscal.company?.address || 'Toshkent sh., Chilonzor tumani, 9-mavze'}
                </p>
                <div className="text-[10px] text-slate-700 font-semibold mt-1">
                  INN: {fiscal.company?.inn || '307849201'} | FM: {fiscal.company?.fiscalModuleId || 'FM99882211'}
                </div>
                <div className="border-b border-dashed border-slate-400 my-2" />
                <div className="flex justify-between text-[11px] font-black">
                  <span>CHEK № {fiscal.receiptSeq || 1001}</span>
                  <span>{new Date(fiscal.date || Date.now()).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div className="flex justify-between text-[10px] text-slate-600 mt-0.5">
                  <span>Sana: {new Date(fiscal.date || Date.now()).toLocaleDateString('uz-UZ')}</span>
                  <span>{fiscal.tableName || `${fiscal.tableNumber}-STOL`}</span>
                </div>
                <div className="text-[10px] text-slate-600 text-left mt-0.5">
                  Ofitsiant: <strong>{fiscal.waiterName || 'Ofitsiant'}</strong>
                </div>
              </div>

              <div className="border-b border-dashed border-slate-400 my-2" />

              {/* Items List */}
              <div className="space-y-2 mb-2.5">
                <div className="flex justify-between font-black text-[10px] pb-1 border-b border-slate-300 uppercase text-slate-600">
                  <span>Nomi</span>
                  <span>Jami (UZS)</span>
                </div>

                {fiscal.items &&
                  fiscal.items.map((it, idx) => {
                    const itemTotal = it.price * it.quantity;
                    return (
                      <div key={idx} className="text-[11px]">
                        <div className="flex justify-between font-bold">
                          <span>
                            {idx + 1}. {it.product_name} x {it.quantity}
                          </span>
                          <span>{formatPrice(itemTotal)}</span>
                        </div>
                        <div className="text-[9px] text-slate-500 pl-2">
                          MXIK: {it.mxik_code || '10701001001000000'} | Qadoq: 796 | QQS: 12%
                        </div>
                      </div>
                    );
                  })}
              </div>

              <div className="border-b border-dashed border-slate-400 my-2" />

              {/* Totals */}
              <div className="space-y-1 text-xs">
                <div className="flex justify-between font-black text-sm pt-0.5 text-slate-900">
                  <span>JAMI TO'LOV:</span>
                  <span>{formatPrice(fiscal.totalAmount)} UZS</span>
                </div>

                <div className="flex justify-between text-[10px] text-slate-600">
                  <span>Shu jumladan QQS (12%):</span>
                  <span>{formatPrice(fiscal.vatAmount)} UZS</span>
                </div>

                <div className="flex justify-between text-[10px] text-slate-700 font-bold pt-1">
                  <span>To'lov shakli:</span>
                  <span className="uppercase">
                    {fiscal.paymentMethod === 'card'
                      ? 'Plastik karta'
                      : fiscal.paymentMethod === 'split'
                      ? `Aralash (Naqd: ${formatPrice(fiscal.cashAmount)}, Karta: ${formatPrice(fiscal.cardAmount)})`
                      : 'Naqd pul'}
                  </span>
                </div>
              </div>

              <div className="border-b border-dashed border-slate-400 my-2" />

              {/* QR Code & Fiscal Sign Section */}
              <div className="flex flex-col items-center justify-center my-2 space-y-1.5 text-center">
                {fiscal.qrImageBase64 ? (
                  <img
                    src={fiscal.qrImageBase64}
                    alt="Soliq QR Code"
                    className="w-32 h-32 object-contain border border-slate-200 p-1 rounded-lg bg-white"
                  />
                ) : (
                  <div className="w-28 h-28 border border-dashed border-slate-300 rounded flex items-center justify-center text-slate-400 text-xs">
                    QR-kod
                  </div>
                )}

                <div className="text-[10px] text-slate-700 font-mono">
                  Fiskal belgi: <strong className="text-slate-900">{fiscal.fiscalSign}</strong>
                </div>

                <div className="flex items-center gap-1 text-[9px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  <span>Soliq.uz rasmiy fiskal cheki</span>
                </div>
              </div>

              <div className="border-b border-dashed border-slate-400 my-2" />
              <div className="text-center text-[9px] text-slate-500">
                Haridingiz uchun rahmat! Xush kelibsiz!
              </div>
            </div>
          ) : activeTab === 'standard' && standard ? (
            /* ========================================================================= */
            /* TAB 2: STANDARD / PRECHECK CAFE RECEIPT                                   */
            /* ========================================================================= */
            <div
              id="printable-receipt"
              className="w-full max-w-[340px] bg-white text-slate-950 p-5 rounded-2xl shadow-2xl font-mono text-xs border border-slate-300 select-text"
            >
              {/* Header info */}
              <div className="text-center mb-2.5">
                <h3 className="font-black text-sm uppercase tracking-wider text-slate-900">
                  {standard.company?.name || 'KAFE "MILLIY TAOMLAR"'}
                </h3>
                <p className="text-[10px] text-slate-600 mt-0.5">
                  {standard.company?.address || 'Toshkent shahar'}
                </p>
                <div className="border-b border-dashed border-slate-400 my-2" />
                <div className="flex justify-between text-[11px] font-black">
                  <span className="text-blue-900">{standard.tableName || `${standard.tableNumber}-STOL`}</span>
                  <span>{standard.hallName || 'Asosiy Zal'}</span>
                </div>
                <div className="flex justify-between text-[10px] text-slate-600 mt-0.5">
                  <span>Ofitsiant: <strong>{standard.waiterName || 'Ofitsiant'}</strong></span>
                  <span>Chek #{standard.orderNumber || ''}</span>
                </div>
                <div className="text-[10px] text-slate-500 text-left mt-0.5">
                  Vaqt: {formatDate(standard.openedAt || standard.closedAt)}
                </div>
              </div>

              <div className="border-b border-dashed border-slate-400 my-2" />

              {/* Items List */}
              <div className="space-y-2 mb-2.5">
                <div className="flex justify-between font-black text-[10px] pb-1 border-b border-slate-300 uppercase text-slate-600">
                  <span>Taom / Mahsulot</span>
                  <span>Jami (UZS)</span>
                </div>

                {standard.items &&
                  standard.items.map((it, idx) => {
                    const itemTotal = it.price * it.quantity;
                    return (
                      <div key={idx} className="flex justify-between font-bold text-[11px]">
                        <span>
                          {idx + 1}. {it.product_name} x {it.quantity}
                        </span>
                        <span>{formatPrice(itemTotal)}</span>
                      </div>
                    );
                  })}
              </div>

              <div className="border-b border-dashed border-slate-400 my-2" />

              {/* Calculations */}
              <div className="space-y-1 text-xs">
                <div className="flex justify-between text-slate-700 text-[11px]">
                  <span>Oraliq summa:</span>
                  <span>{formatPrice(standard.subtotal)} UZS</span>
                </div>

                <div className="flex justify-between text-slate-700 text-[11px]">
                  <span>Xizmat haqi ({standard.serviceFeePercent || 10}%):</span>
                  <span>{formatPrice(standard.serviceFee)} UZS</span>
                </div>

                <div className="border-b border-dashed border-slate-300 my-1" />

                <div className="flex justify-between font-black text-sm pt-0.5 text-slate-900">
                  <span>JAMI TO'LOV:</span>
                  <span>{formatPrice(standard.totalAmount)} UZS</span>
                </div>

                <div className="flex justify-between text-[10px] text-slate-600 pt-0.5">
                  <span>To'lov usuli:</span>
                  <span className="uppercase font-bold">
                    {standard.paymentMethod === 'card'
                      ? 'Plastik karta'
                      : standard.paymentMethod === 'split'
                      ? 'Aralash to\'lov'
                      : 'Naqd pul'}
                  </span>
                </div>
              </div>

              <div className="border-b border-dashed border-slate-400 my-2" />
              <div className="text-center text-[10px] text-slate-700 font-semibold py-1">
                {standard.footerText || 'Xaridingiz uchun rahmat! Yana kutib qolamiz!'}
              </div>
            </div>
          ) : (
            <div className="text-slate-400 text-sm">Chek ma'lumoti topilmadi</div>
          )}
        </div>

        {/* Footer actions and reprint buttons */}
        <div className="bg-slate-800/90 px-5 py-3.5 border-t border-slate-700 flex flex-col gap-2 shrink-0">
          {printStatus && (
            <div
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 ${
                printStatus.success
                  ? 'bg-emerald-950/80 border border-emerald-700 text-emerald-300'
                  : 'bg-rose-950/80 border border-rose-700 text-rose-300'
              }`}
            >
              {printStatus.success ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
              <span>{printStatus.message}</span>
            </div>
          )}

          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleBrowserPrint}
              className="px-3.5 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold text-xs flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
            >
              <FileText className="w-4 h-4" />
              <span>Brauzerda chop etish</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-300 font-bold text-xs transition cursor-pointer"
              >
                Yopish
              </button>

              <button
                type="button"
                onClick={handleReprintThermal}
                disabled={loading || printing}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-600 text-white font-black text-xs shadow-lg shadow-emerald-600/30 flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>{printing ? "Chop etilmoqda..." : "Termal printerga chiqarish"}</span>
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
