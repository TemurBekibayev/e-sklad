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
  Flame,
  Coffee,
  Utensils,
  Wifi,
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

export default function PrinterSettingsModal({ isOpen, onClose }) {
  const { t } = useLanguage();
  const [printers, setPrinters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingType, setTestingType] = useState(null);
  const [testResult, setTestResult] = useState(null);

  const [form, setForm] = useState({
    receipt_printer: '',
    kitchen_printer: '',
    bar_printer: '',
    mangal_printer: '',
    kitchen_printer_ip: '',
    bar_printer_ip: '',
    mangal_printer_ip: '',
    paper_width: '80mm',
    auto_print: 1,
    cash_drawer: 1,
    service_fee_percent: 10,
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
            bar_printer: data.settings.bar_printer || '',
            mangal_printer: data.settings.mangal_printer || '',
            kitchen_printer_ip: data.settings.kitchen_printer_ip || '',
            bar_printer_ip: data.settings.bar_printer_ip || '',
            mangal_printer_ip: data.settings.mangal_printer_ip || '',
            paper_width: data.settings.paper_width || '80mm',
            auto_print: data.settings.auto_print !== undefined ? Number(data.settings.auto_print) : 1,
            cash_drawer: data.settings.cash_drawer !== undefined ? Number(data.settings.cash_drawer) : 1,
            service_fee_percent: data.settings.service_fee_percent !== undefined ? Number(data.settings.service_fee_percent) : 10,
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
        setTestResult({ success: true, message: 'Barcha printer sozlamalari muvaffaqiyatli saqlandi!' });
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

  const handleTestPrint = async (type = 'receipt', targetPrinter = '', printerIp = '') => {
    setTestingType(type);
    setTestResult(null);
    try {
      const res = await fetch('/api/printers/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          printerName: targetPrinter || (type === 'kitchen' ? form.kitchen_printer : type === 'bar' ? form.bar_printer : type === 'mangal' ? form.mangal_printer : form.receipt_printer),
          paperWidth: form.paper_width,
          type,
          printerIp: printerIp || (type === 'kitchen' ? form.kitchen_printer_ip : type === 'bar' ? form.bar_printer_ip : form.mangal_printer_ip),
        }),
      });
      const data = await res.json();
      const typeLabel = type === 'kitchen' ? 'Oshxona' : type === 'bar' ? 'Bar' : type === 'mangal' ? 'Mangal/Sex' : 'Kassa';
      if (data.success) {
        setTestResult({ success: true, message: `${typeLabel} printeriga sinov cheki muvaffaqiyatli yuborildi!` });
      } else {
        setTestResult({ success: false, message: `${typeLabel} printerida xatolik: ` + (data.error || 'Ulanish mavjud emas') });
      }
    } catch (err) {
      setTestResult({ success: false, message: err.message });
    } finally {
      setTestingType(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-3xl w-full shadow-2xl overflow-hidden my-6">
        {/* Header */}
        <div className="bg-slate-800/90 px-6 py-4 flex items-center justify-between border-b border-slate-700">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Printer className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-bold text-lg text-white">Printerlar va Chek Sozlamalari</h2>
              <p className="text-xs text-slate-400">
                Kassa cheki, Oshxona begunoklari, Bar va Sex printerlari konfiguratsiyasi
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
              <span>Printerlar va sozlamalar yuklanmoqda...</span>
            </div>
          ) : (
            <>
              {/* Top Refresh Bar & Info */}
              <div className="flex items-center justify-between bg-slate-800/40 px-4 py-2.5 rounded-xl border border-slate-700/60">
                <div className="text-xs text-slate-300">
                  Kompyuteringizda <span className="font-bold text-amber-400">{printers.length} ta</span> printer aniqlandi.
                </div>
                <button
                  onClick={loadPrinters}
                  className="flex items-center space-x-1.5 text-xs text-amber-400 hover:text-amber-300 px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 transition"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Printerlarni yangilash</span>
                </button>
              </div>

              {/* 1. KASSA PRINTERI */}
              <div className="bg-slate-800/50 p-5 rounded-2xl border border-slate-700 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="p-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20">
                      <Printer className="w-4 h-4" />
                    </span>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                      1. Kassa Chek Printeri (Fiskal & Xaridor cheki)
                    </h3>
                  </div>
                  <button
                    type="button"
                    disabled={testingType !== null}
                    onClick={() => handleTestPrint('receipt', form.receipt_printer)}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs shadow transition disabled:opacity-50"
                  >
                    {testingType === 'receipt' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Printer className="w-3.5 h-3.5" />}
                    <span>Kassa Chekini Sinash</span>
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Windows Printerini tanlang:
                  </label>
                  <select
                    value={form.receipt_printer}
                    onChange={(e) => setForm({ ...form, receipt_printer: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="">-- Standart Windows Printeri (Avtomatik) --</option>
                    {printers.map((p, idx) => (
                      <option key={idx} value={p.name}>
                        {p.name} {p.isDefault ? '(Asosiy Windows printeri)' : ''}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-400 mt-1">
                    To'lov amalga oshirilganda yoki xaridor hisob so'raganda ushbu printerdan chek chiqadi.
                  </p>
                </div>
              </div>

              {/* 2. OSHXONA PRINTERI */}
              <div className="bg-slate-800/50 p-5 rounded-2xl border border-slate-700 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="p-1.5 bg-amber-500/10 text-amber-400 rounded-lg border border-amber-500/20">
                      <Utensils className="w-4 h-4" />
                    </span>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                      2. Oshxona Printeri (Oshpaz Begunoklari)
                    </h3>
                  </div>
                  <button
                    type="button"
                    disabled={testingType !== null}
                    onClick={() => handleTestPrint('kitchen', form.kitchen_printer, form.kitchen_printer_ip)}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs shadow transition disabled:opacity-50"
                  >
                    {testingType === 'kitchen' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Printer className="w-3.5 h-3.5" />}
                    <span>Oshxona Chekini Sinash</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Windows Oshxona Printeri (USB):
                    </label>
                    <select
                      value={form.kitchen_printer}
                      onChange={(e) => setForm({ ...form, kitchen_printer: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                    >
                      <option value="">-- Kassa printeri orqali (Yoki alohida tanlang) --</option>
                      {printers.map((p, idx) => (
                        <option key={idx} value={p.name}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center space-x-1">
                      <Wifi className="w-3.5 h-3.5 text-amber-400" />
                      <span>Yoki Tarmoq (LAN/IP) Printeri:</span>
                    </label>
                    <input
                      type="text"
                      value={form.kitchen_printer_ip || ''}
                      onChange={(e) => setForm({ ...form, kitchen_printer_ip: e.target.value })}
                      placeholder="Masalan: 192.168.1.200:9100"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
                <p className="text-[11px] text-slate-400">
                  Ofitsiant yoki kassir buyurtmani oshxonaga yuborganida taomlar ro'yxati ushbu printerga chiqadi.
                </p>
              </div>

              {/* 3. BAR PRINTERI */}
              <div className="bg-slate-800/50 p-5 rounded-2xl border border-slate-700 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="p-1.5 bg-blue-500/10 text-blue-400 rounded-lg border border-blue-500/20">
                      <Coffee className="w-4 h-4" />
                    </span>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                      3. Bar Printeri (Ichimliklar & Kofe)
                    </h3>
                  </div>
                  <button
                    type="button"
                    disabled={testingType !== null}
                    onClick={() => handleTestPrint('bar', form.bar_printer, form.bar_printer_ip)}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs shadow transition disabled:opacity-50"
                  >
                    {testingType === 'bar' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Printer className="w-3.5 h-3.5" />}
                    <span>Bar Chekini Sinash</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Windows Bar Printeri (USB):
                    </label>
                    <select
                      value={form.bar_printer || ''}
                      onChange={(e) => setForm({ ...form, bar_printer: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="">-- Tanlanmagan (Oshxona/Kassa bilan birga) --</option>
                      {printers.map((p, idx) => (
                        <option key={idx} value={p.name}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center space-x-1">
                      <Wifi className="w-3.5 h-3.5 text-blue-400" />
                      <span>Yoki Tarmoq (LAN/IP) Bar Printeri:</span>
                    </label>
                    <input
                      type="text"
                      value={form.bar_printer_ip || ''}
                      onChange={(e) => setForm({ ...form, bar_printer_ip: e.target.value })}
                      placeholder="Masalan: 192.168.1.201:9100"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* 4. MANGAL / SALAT / QO'SHIMCHA SEX PRINTERI */}
              <div className="bg-slate-800/50 p-5 rounded-2xl border border-slate-700 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="p-1.5 bg-rose-500/10 text-rose-400 rounded-lg border border-rose-500/20">
                      <Flame className="w-4 h-4" />
                    </span>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                      4. Mangal / Qo'shimcha Sex Printeri
                    </h3>
                  </div>
                  <button
                    type="button"
                    disabled={testingType !== null}
                    onClick={() => handleTestPrint('mangal', form.mangal_printer, form.mangal_printer_ip)}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs shadow transition disabled:opacity-50"
                  >
                    {testingType === 'mangal' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Printer className="w-3.5 h-3.5" />}
                    <span>Mangal Chekini Sinash</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Windows Mangal Printeri (USB):
                    </label>
                    <select
                      value={form.mangal_printer || ''}
                      onChange={(e) => setForm({ ...form, mangal_printer: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-rose-500"
                    >
                      <option value="">-- Tanlanmagan --</option>
                      {printers.map((p, idx) => (
                        <option key={idx} value={p.name}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center space-x-1">
                      <Wifi className="w-3.5 h-3.5 text-rose-400" />
                      <span>Yoki Tarmoq (LAN/IP) Mangal Printeri:</span>
                    </label>
                    <input
                      type="text"
                      value={form.mangal_printer_ip || ''}
                      onChange={(e) => setForm({ ...form, mangal_printer_ip: e.target.value })}
                      placeholder="Masalan: 192.168.1.202:9100"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-rose-500"
                    />
                  </div>
                </div>
              </div>

              {/* Format & Options */}
              <div className="bg-slate-800/50 p-5 rounded-2xl border border-slate-700 space-y-4">
                <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider flex items-center space-x-2">
                  <Sliders className="w-4 h-4" />
                  <span>Format va Avtomatlashtirish</span>
                </h3>

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

              {/* Service Fee Percentage Settings */}
              <div className="bg-slate-800/50 p-5 rounded-2xl border border-slate-700 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider flex items-center space-x-2">
                    <DollarSign className="w-4 h-4" />
                    <span>Xizmat Haqi Foizi (Обслуживание %)</span>
                  </h3>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    {form.service_fee_percent || 0}%
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Har bir buyurtma va hisob-kitobda mijoz hisobiga qo'shiladigan xizmat foizi:
                </p>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {[0, 5, 10, 12, 15, 20].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => setForm({ ...form, service_fee_percent: pct })}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                        Number(form.service_fee_percent) === pct
                          ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md scale-105'
                          : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
                      }`}
                    >
                      {pct === 0 ? '0% (Xizmatsiz)' : `${pct}%`}
                    </button>
                  ))}
                  <div className="flex items-center gap-1.5 ml-auto">
                    <span className="text-xs text-slate-400">Boshqa:</span>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={form.service_fee_percent}
                      onChange={(e) => setForm({ ...form, service_fee_percent: Number(e.target.value) || 0 })}
                      className="w-16 bg-slate-950 border border-slate-700 rounded-xl px-2 py-1 text-xs text-white font-bold text-center focus:outline-none focus:border-amber-500"
                    />
                    <span className="text-xs font-bold text-slate-400">%</span>
                  </div>
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
        <div className="p-4 bg-slate-800/80 border-t border-slate-700 flex items-center justify-end gap-3">
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
            <span>{saving ? 'Saqlanmoqda...' : 'Barcha Sozlamalarni Saqlash'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
