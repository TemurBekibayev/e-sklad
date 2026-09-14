import React, { useState } from 'react';
import { X, PlusCircle, Image as ImageIcon, Sparkles, Check } from 'lucide-react';

const PRESET_IMAGES = [
  { name: 'Osh / Palov', url: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600&auto=format&fit=crop&q=80', catId: 3, mxik: '10701002001000000' },
  { name: 'Shashlik', url: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&auto=format&fit=crop&q=80', catId: 3, mxik: '10701002002000000' },
  { name: "Lag'mon", url: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=600&auto=format&fit=crop&q=80', catId: 1, mxik: '10701001001000000' },
  { name: "Sho'rva", url: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=600&auto=format&fit=crop&q=80', catId: 1, mxik: '10701001001000000' },
  { name: 'Salat', url: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600&auto=format&fit=crop&q=80', catId: 4, mxik: '10701003001000000' },
  { name: 'Choy / Ichimlik', url: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=600&auto=format&fit=crop&q=80', catId: 2, mxik: '10702001001000000' },
];

export default function AddDishModal({ isOpen, onClose, categories = [], onProductAdded }) {
  const [form, setForm] = useState({
    name: '',
    price: '',
    category_id: categories[0]?.id || 1,
    image: PRESET_IMAGES[0].url,
    mxik_code: '10701002001000000',
    package_code: '796',
    vat_percent: 12,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSelectPreset = (preset) => {
    setForm((prev) => ({
      ...prev,
      image: preset.url,
      mxik_code: preset.mxik,
      category_id: preset.catId || prev.category_id,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('Taom nomini kiriting!');
      return;
    }
    if (!form.price || Number(form.price) <= 0) {
      setError("To'g'ri narx kiriting!");
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category_id: Number(form.category_id),
          name: form.name.trim(),
          price: Number(form.price),
          image: form.image || PRESET_IMAGES[0].url,
          mxik_code: form.mxik_code || '10701001001000000',
          package_code: form.package_code || '796',
          vat_percent: Number(form.vat_percent),
        }),
      });

      const data = await res.json();
      if (data.success) {
        if (onProductAdded) onProductAdded(data.product);
        onClose();
        setForm({
          name: '',
          price: '',
          category_id: categories[0]?.id || 1,
          image: PRESET_IMAGES[0].url,
          mxik_code: '10701002001000000',
          package_code: '796',
          vat_percent: 12,
        });
      } else {
        setError(data.message || 'Xatolik yuz berdi!');
      }
    } catch (err) {
      setError('Server bilan aloqa uzildi: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl border border-slate-200 text-slate-800 animate-in fade-in zoom-in-95 duration-200 my-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#ea580c] flex items-center justify-center text-white shadow-md shadow-orange-500/30">
              <PlusCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900 leading-tight">Yangi Taom Qo'shish</h3>
              <p className="text-xs text-slate-500 font-medium">
                Admin / Menejer menyu boshqaruvi
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 p-3 rounded-xl">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Taom Nomi */}
          <div>
            <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
              Taom Nomi <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Masalan: Qozon kabob, Manti..."
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:border-[#ea580c] focus:ring-2 focus:ring-orange-500/20"
            />
          </div>

          {/* Toifasi va Narxi */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                Toifasi (Kategoriya)
              </label>
              <select
                value={form.category_id}
                onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:border-[#ea580c]"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                Narxi (UZS) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                required
                min={0}
                step={1000}
                placeholder="45000"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-black text-[#ea580c] focus:outline-none focus:border-[#ea580c]"
              />
            </div>
          </div>

          {/* Preset Taom Fotosuratlari */}
          <div>
            <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
              <span>Taom fotosurati</span>
              <span className="text-[11px] font-normal text-slate-400">Namunadan tanlang yoki URL kiriting</span>
            </label>
            <div className="grid grid-cols-6 gap-2 mb-2">
              {PRESET_IMAGES.map((preset, idx) => (
                <button
                  type="button"
                  key={idx}
                  onClick={() => handleSelectPreset(preset)}
                  className={`relative rounded-xl overflow-hidden aspect-square border-2 transition-all group ${
                    form.image === preset.url
                      ? 'border-[#ea580c] ring-2 ring-orange-500/30 scale-105'
                      : 'border-slate-200 hover:border-slate-400'
                  }`}
                >
                  <img src={preset.url} alt={preset.name} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 flex items-end p-1 text-[9px] font-bold text-white leading-tight">
                    {preset.name}
                  </div>
                  {form.image === preset.url && (
                    <div className="absolute top-1 right-1 bg-[#ea580c] text-white rounded-full p-0.5 shadow-sm">
                      <Check className="w-2.5 h-2.5" />
                    </div>
                  )}
                </button>
              ))}
            </div>
            <input
              type="url"
              placeholder="Rasm havolasi (https://...)"
              value={form.image}
              onChange={(e) => setForm({ ...form, image: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 focus:outline-none focus:border-[#ea580c]"
            />
          </div>

          {/* Soliq Rekvizitlari (MXIK, Qadoq, QQS) */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
            <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              <span>Soliq.uz va REGOS rekvizitlari (Avtomatik)</span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">MXIK Kodi</label>
                <input
                  type="text"
                  maxLength={17}
                  value={form.mxik_code}
                  onChange={(e) => setForm({ ...form, mxik_code: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-800"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">O'lchov (Qadoq)</label>
                <select
                  value={form.package_code}
                  onChange={(e) => setForm({ ...form, package_code: e.target.value })}
                  className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800"
                >
                  <option value="796">796 (Dona)</option>
                  <option value="166">166 (Kg)</option>
                  <option value="112">112 (Litr)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">QQS %</label>
                <select
                  value={form.vat_percent}
                  onChange={(e) => setForm({ ...form, vat_percent: e.target.value })}
                  className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-emerald-600"
                >
                  <option value={12}>12% (Standart)</option>
                  <option value={0}>0% (Ozod)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold transition-all"
            >
              Bekor qilish
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-[#ea580c] hover:bg-[#d94e08] text-white text-sm font-black shadow-lg shadow-orange-500/25 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{isSubmitting ? "Saqlanmoqda..." : "Taomni Saqlash"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
