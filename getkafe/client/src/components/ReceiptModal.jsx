import React, { useState } from 'react';
import { Printer, CheckCircle, X, ExternalLink, ShieldCheck, AlertTriangle, RefreshCw } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

export default function ReceiptModal({ receipt, onClose }) {
  const { t, tr } = useLanguage();
  const [printing, setPrinting] = useState(false);
  const [printStatus, setPrintStatus] = useState(null);

  if (!receipt) return null;

  const handlePrint = async () => {
    setPrinting(true);
    setPrintStatus(null);
    try {
      const res = await fetch('/api/printers/print-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(receipt),
      });
      const data = await res.json();
      if (data.success) {
        setPrintStatus({ success: true, message: "Chek printerga muvaffaqiyatli yuborildi!" });
      } else {
        setPrintStatus({ success: false, message: data.error || "Printerda xatolik yuz berdi" });
        // Brauzer fallback
        window.print();
      }
    } catch (err) {
      window.print();
    } finally {
      setPrinting(false);
    }
  };

  const handleBrowserPrint = () => {
    window.print();
  };

  const formatPrice = (val) => {
    return new Intl.NumberFormat('uz-UZ').format(val || 0);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full shadow-2xl overflow-hidden my-6">
        {/* Header bar */}
        <div className="bg-slate-800 px-6 py-4 flex items-center justify-between border-b border-slate-700">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-6 h-6 text-emerald-400" />
            <span className="font-bold text-lg text-white">To'lov Muvaffaqiyatli</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Thermal Receipt (80mm styling) */}
        <div className="p-6 bg-slate-950/60 flex justify-center">
          <div
            id="printable-receipt"
            className="w-full max-w-[340px] bg-white text-slate-950 p-5 rounded-xl shadow-inner font-mono text-xs border border-slate-300"
          >
            {/* Header info */}
            <div className="text-center mb-3">
              <h3 className="font-black text-sm uppercase tracking-wider">
                {receipt.company?.name || 'KAFE "MILLIY TAOMLAR" MCHJ'}
              </h3>
              <p className="text-[11px] text-slate-600">
                {receipt.company?.address || 'Toshkent sh., Chilonzor 9'}
              </p>
              <p className="text-[11px] text-slate-700 font-semibold mt-0.5">
                INN: {receipt.company?.inn || '307849201'} | FM: {receipt.company?.fiscalModuleId || 'FM99882211'}
              </p>
              <div className="border-b border-dashed border-slate-400 my-2" />
              <div className="flex justify-between text-[11px] font-bold">
                <span>CHEK № {receipt.receiptSeq || 1001}</span>
                <span>
                  {new Date(receipt.date || Date.now()).toLocaleTimeString('uz-UZ', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
              <div className="text-[10px] text-slate-500 text-left">
                Sana: {new Date(receipt.date || Date.now()).toLocaleDateString('uz-UZ')}
              </div>
            </div>

            <div className="border-b border-dashed border-slate-400 my-2" />

            {/* Items list */}
            <div className="space-y-2 mb-3">
              <div className="flex justify-between font-bold text-[11px] pb-1 border-b border-slate-300">
                <span>Nomi</span>
                <span>Jami (UZS)</span>
              </div>

              {receipt.items &&
                receipt.items.map((it, idx) => {
                  const itemTotal = it.price * it.quantity;
                  return (
                    <div key={idx} className="text-[11px]">
                      <div className="flex justify-between font-semibold">
                        <span>
                          {idx + 1}. {it.product_name} x {it.quantity}
                        </span>
                        <span>{formatPrice(itemTotal)}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 pl-2">
                        MXIK: {it.mxik_code || '10701001001000000'} | Qadoq: 796 | QQS: 12%
                      </div>
                    </div>
                  );
                })}
            </div>

            <div className="border-b border-dashed border-slate-400 my-2" />

            {/* Totals */}
            <div className="space-y-1 text-xs">
              <div className="flex justify-between font-black text-sm pt-1">
                <span>JAMI TO'LOV:</span>
                <span>{formatPrice(receipt.totalAmount)} UZS</span>
              </div>

              <div className="flex justify-between text-[11px] text-slate-700">
                <span>Shu jumladan QQS (12%):</span>
                <span>{formatPrice(receipt.vatAmount)} UZS</span>
              </div>

              <div className="flex justify-between text-[11px] text-slate-700">
                <span>To'lov usuli:</span>
                <span className="font-bold uppercase">
                  {receipt.paymentMethod === 'cash'
                    ? 'NAQD PUL'
                    : receipt.paymentMethod === 'card'
                    ? 'PLASTIK KARTA (TERMINAL)'
                    : `ARALASH (Naqd: ${formatPrice(receipt.cashAmount)}, Karta: ${formatPrice(
                        receipt.cardAmount
                      )})`}
                </span>
              </div>
            </div>

            <div className="border-b border-dashed border-slate-400 my-3" />

            {/* Soliq.uz Fiscal QR Code and Fiscal Sign */}
            <div className="text-center">
              <div className="flex items-center justify-center space-x-1 mb-1.5 text-emerald-700 font-bold text-[11px]">
                <ShieldCheck className="w-4 h-4" />
                <span>DAVLAT SOLIQ QO'MITASI</span>
              </div>

              {receipt.qrImageBase64 ? (
                <div className="flex justify-center my-2">
                  <img
                    src={receipt.qrImageBase64}
                    alt="Soliq QR Code"
                    className="w-36 h-36 border border-slate-300 p-1 rounded"
                  />
                </div>
              ) : null}

              <div className="text-[10px] text-slate-700 font-bold tracking-wider">
                Fiskal belgi (ФП): {receipt.fiscalSign}
              </div>

              <div className="mt-2 text-[10px] text-slate-500">
                {receipt.isSynced ? (
                  <span className="text-emerald-700 font-semibold">
                    ✓ Soliq.uz bazasiga muvaffaqiyatli yuborildi
                  </span>
                ) : (
                  <span className="text-amber-700 font-semibold flex items-center justify-center space-x-1">
                    <AlertTriangle className="w-3 h-3 inline mr-1" />
                    Oflayn chek (Soliqqa navbatga olindi)
                  </span>
                )}
              </div>

              <div className="text-[10px] text-slate-400 mt-2">
                Haridingiz uchun rahmat! Xush kelibsiz!
              </div>
            </div>
          </div>
        </div>

        {/* Print Feedback Status */}
        {printStatus && (
          <div
            className={`mx-6 mb-2 p-2.5 rounded-xl border flex items-center space-x-2 text-xs ${
              printStatus.success
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
            }`}
          >
            {printStatus.success ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
            <span>{printStatus.message}</span>
          </div>
        )}

        {/* Action buttons */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between gap-3">
          <a
            href={receipt.fiscalQrUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center space-x-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-medium px-3 py-2 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Soliq.uz da tekshirish</span>
          </a>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleBrowserPrint}
              title="Brauzer dialogi orqali chop etish / PDF saqlash"
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              <Printer className="w-4 h-4" />
            </button>

            <button
              onClick={handlePrint}
              disabled={printing}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 active:scale-95 transition-all disabled:opacity-50"
            >
              {printing ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Printer className="w-4 h-4" />
              )}
              <span>{printing ? 'Yuborilmoqda...' : `${t('receipt_print', 'Chop etish')} (Termal)`}</span>
            </button>

            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm transition-all"
            >
              {t('receipt_close', 'Yopish')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
