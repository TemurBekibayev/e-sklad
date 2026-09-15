import React, { useState, useEffect } from 'react';
import {
  Printer,
  Settings,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  X,
  FileText,
  Building,
  Sliders,
  DollarSign,
  Zap,
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

export default function PrinterSettingsModal({ isOpen, onClose }) {
  const { t } = useLanguage();
  const [printers, setPrinters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const [form, setForm] = useState({
    receipt_printer: '',
    kitchen_printer: '',
    paper_width: '80mm',
    auto_print: 1,
    cash_drawer: 1,
    header_title: 'KAFE "MILLIY TAOMLAR" MCHJ',
    header_address: 'Toshkent sh., Chilonzor tumani, 9-mavze',
    inn: '307849201',
    fm: 'FM99882211',
    footer_text: 'Haridingiz uchun rahmat! Xush kelibsiz!',
  });

  useEffect(() => {
    if (isOpen) {
      loadPrinters();
    }
  }, [isOpen]);

  const loadPrinters = async () => {
    setLoading(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/printers');
      const data = await res.json();
      if (data.success) {
        setPrinters(data.installedPrinters || []);
        if (data.settings) {
          setForm({
            receipt_printer: data.settings.receipt_printer || '',
            kitchen_printer: data.settings.kitchen_printer || '',
            paper_width: data.settings.paper_width || '80mm',
            auto_print: data.settings.auto_print !== undefined ? data.settings.auto_print : 1,
            cash_drawer: data.settings.cash_drawer !== undefined ? data.settings.cash_drawer : 1,
            header_title: data.settings.header_title || 'KAFE "MILLIY TAOMLAR" MCHJ',
            header_address: data.settings.header_address || 'Toshkent sh., Chilonzor tumani, 9-mavze',
            inn: data.settings.inn || '307849201',
            fm: data.settings.fm || 'FM99882211',
            footer_text: data.settings.footer_text || 'Haridingiz uchun rahmat! Xush kelibsiz!',
          });
        }
      }
    } catch (err) {
      console.error('Error loading printers:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/printers/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        setTestResult({ success: true, message: 'Sozlamalar saqlandi!' });
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        setTestResult({ success: false, message: data.message || 'Saqlashda xatolik' });
      }
    } catch (err) {
      setTestResult({ success: false, message: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleTestPrint = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/printers/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          printerName: form.receipt_printer,
          paperWidth: form.paper_width,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTestResult({ success: true, message: "Sinov cheki printerga muvaffaqiyatli yuborildi!" });
      } else {
        setTestResult({ success: false, message: data.error || 'Printerda xatolik yuz berdi' });
      }
    } catch (err) {
      setTestResult({ success: false, message: err.message });
    } finally {
      setTesting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden my-6">
        {/* Header */}
        <div className="bg-slate-800/90 px-6 py-4 flex items-center justify-between border-b border-slate-700">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Printer className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-bold text-lg text-white">Chek va Printer Sozlamalari</h2>
              <p className="text-xs text-slate-400">
                Termal kassa printeri (80mm / 58mm) va oshxona begunoklari
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 space-y-3">
              <RefreshCw className="w-8 h-8 animate-spin text-amber-400" />
              <span>Printerlar ro'yxati tekshirilmoqda...</span>
            </div>
          ) : (
            <>
              {/* Printer selection section */}
              <div className="bg-slate-800/50 p-5 rounded-2xl border border-slate-700 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider flex items-center space-x-2">
                    <Sliders className="w-4 h-4" />
                    <span>Uskunalar va Format</span>
                  </h3>
                  <button
                    onClick={loadPrinters}
                    className="flex items-center space-x-1 text-xs text-slate-400 hover:text-white px-2 py-1 rounded-lg hover:bg-slate-700 transition"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Qayta yangilash</span>
                  </button>
                </div>

                {/* Cashier Receipt Printer */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Kassir Chek Printeri (Fiskal & Xaridor cheki):
                  </label>
                  <select
                    value={form.receipt_printer}
                    onChange={(e) => setForm({ ...form, receipt_printer: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="">-- Standart Windows Printeri --</option>
                    {printers.map((p, idx) => (
                      <option key={idx} value={p.name}>
                        {p.name} {p.isDefault ? '(Asosiy tizim printeri)' : ''}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Xprinter, Rongta, Epson TM, POS-80 yoki tizimga ulangan istalgan termal printer.
                  </p>
                </div>

                {/* Kitchen Printer */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Oshxona / Bar Printeri (Begunok chiqarish uchun):
                  </label>
                  <select
                    value={form.kitchen_printer}
                    onChange={(e) => setForm({ ...form, kitchen_printer: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="">-- Oshxona printeri ulanmagan (Virtual) --</option>
                    {printers.map((p, idx) => (
                      <option key={idx} value={p.name}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Paper width */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Chek Qog'ozi Kengligi:
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, paper_width: '80mm' })}
                      className={`py-3 px-4 rounded-xl border flex flex-col items-center text-center transition-all ${
                        form.paper_width === '80mm'
                          ? 'border-amber-500 bg-amber-500/10 text-white font-bold'
                          : 'border-slate-700 bg-slate-900 text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      <span className="text-sm">80 mm (Standart POS)</span>
                      <span className="text-[11px] opacity-75 mt-0.5">Keng termal lenta (Tavsiya)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setForm({ ...form, paper_width: '58mm' })}
                      className={`py-3 px-4 rounded-xl border flex flex-col items-center text-center transition-all ${
                        form.paper_width === '58mm'
                          ? 'border-amber-500 bg-amber-500/10 text-white font-bold'
                          : 'border-slate-700 bg-slate-900 text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      <span className="text-sm">58 mm (Ixcham POS)</span>
                      <span className="text-[11px] opacity-75 mt-0.5">Kichik kassa lentalari</span>
                    </button>
                  </div>
                </div>

                {/* Checkbox Toggles */}
                <div className="pt-2 border-t border-slate-700/60 space-y-3">
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(form.auto_print)}
                      onChange={(e) => setForm({ ...form, auto_print: e.target.checked ? 1 : 0 })}
                      className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400 border-slate-600 bg-slate-900"
                    />
                    <span className="text-xs text-slate-200 font-medium">
                      To'lov qilinganda avtomatik ravishda chek chiqarish (Tezkor kassa)
                    </span>
                  </label>

                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(form.cash_drawer)}
                      onChange={(e) => setForm({ ...form, cash_drawer: e.target.checked ? 1 : 0 })}
                      className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400 border-slate-600 bg-slate-900"
                    />
                    <span className="text-xs text-slate-200 font-medium">
                      Chek chiqqanda kassa tortmasini avtomatik ochish (Cash Drawer)
                    </span>
                  </label>
                </div>
              </div>

              {/* Company & Fiscal Requisites */}
              <div className="bg-slate-800/50 p-5 rounded-2xl border border-slate-700 space-y-4">
                <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider flex items-center space-x-2">
                  <Building className="w-4 h-4" />
                  <span>Chekdagi Rekvizitlar va Matnlar</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Kafening Rasmiy Nomi:
                    </label>
                    <input
                      type="text"
                      value={form.header_title}
                      onChange={(e) => setForm({ ...form, header_title: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                      placeholder='KAFE "MILLIY TAOMLAR" MCHJ'
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Manzili:
                    </label>
                    <input
                      type="text"
                      value={form.header_address}
                      onChange={(e) => setForm({ ...form, header_address: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                      placeholder="Toshkent sh., Chilonzor 9"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Soliq INN (STIR):
                    </label>
                    <input
                      type="text"
                      value={form.inn}
                      onChange={(e) => setForm({ ...form, inn: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                      placeholder="307849201"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Fiskal Modul ID (FM):
                    </label>
                    <input
                      type="text"
                      value={form.fm}
                      onChange={(e) => setForm({ ...form, fm: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                      placeholder="FM99882211"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Chek Pastidagi Xush Kelibsiz Matni:
                  </label>
                  <input
                    type="text"
                    value={form.footer_text}
                    onChange={(e) => setForm({ ...form, footer_text: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                    placeholder="Haridingiz uchun rahmat! Xush kelibsiz!"
                  />
                </div>
              </div>

              {/* Test Print Result Message */}
              {testResult && (
                <div
                  className={`p-3.5 rounded-xl border flex items-center space-x-2 text-xs ${
                    testResult.success
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                  }`}
                >
                  {testResult.success ? (
                    <CheckCircle className="w-4 h-4 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0" />
                  )}
                  <span>{testResult.message}</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-800/80 border-t border-slate-700 flex items-center justify-between gap-3">
          <button
            type="button"
            disabled={testing || loading}
            onClick={handleTestPrint}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-medium text-xs border border-slate-600 transition disabled:opacity-50"
          >
            {testing ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Printer className="w-3.5 h-3.5 text-amber-400" />
            )}
            <span>{testing ? 'Chop etilmoqda...' : 'Sinov Chekini Chiqarish (Test)'}</span>
          </button>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs transition"
            >
              Bekor qilish
            </button>

            <button
              type="button"
              disabled={saving || loading}
              onClick={handleSave}
              className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 active:scale-95 transition disabled:opacity-50"
            >
              {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
              <span>{saving ? 'Saqlanmoqda...' : 'Sozlamalarni Saqlash'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
