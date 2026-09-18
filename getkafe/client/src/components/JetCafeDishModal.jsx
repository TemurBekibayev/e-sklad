import React, { useState, useEffect } from 'react';
import { useDialog } from '../context/DialogContext';

export default function JetCafeDishModal({ isOpen, onClose, dish = null, categories = [], onSave, onDelete }) {
  const dialog = useDialog();
  const [activeTab, setActiveTab] = useState('dish'); // 'dish' or 'ikpu'
  const [form, setForm] = useState({
    name: '',
    code: 0,
    category_id: categories[0]?.id || 1,
    in_package: 1,
    cost_price: 0,
    price: 0,
    is_available: true,
    product_type: 'Товар',
    workshop: 'Кухня',
    modifiers: '',
    comment: '',
    image: '',
    mxik_code: '10701001001000000',
    package_code: '796',
    vat_percent: 12,
  });

  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const res = await fetch('/api/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: reader.result, filename: file.name }),
          });
          const data = await res.json();
          if (data.success && data.url) {
            setForm((prev) => ({ ...prev, image: data.url }));
          } else {
            alert(data.message || 'Ошибка загрузки фото');
          }
        } catch (err) {
          alert('Ошибка сервера: ' + err.message);
        } finally {
          setIsUploading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      alert('Ошибка при чтении файла: ' + err.message);
      setIsUploading(false);
    }
  };

  const getNumericCatId = (val) => {
    if (typeof val === 'number') return val;
    if (!val) return 1;
    const num = parseInt(String(val).replace(/\D/g, ''), 10);
    return isNaN(num) ? 1 : num;
  };

  const uniqueCategories = React.useMemo(() => {
    const seen = new Set();
    return (categories || []).filter((c) => {
      const key = String(c.id || c.rawId || c.name || '').trim().toLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [categories]);

  useEffect(() => {
    if (dish) {
      const catId = dish.category_id !== undefined 
        ? getNumericCatId(dish.category_id)
        : (dish.category ? (uniqueCategories.find(c => c.name === dish.category)?.rawId || uniqueCategories.find(c => c.name === dish.category)?.id) : null)
        || getNumericCatId(uniqueCategories[0]?.id || 1);

      setForm({
        name: dish.name || '',
        code: dish.id || 0,
        category_id: catId,
        in_package: dish.in_package || 1,
        cost_price: dish.cost_price || 0,
        price: dish.price || 0,
        is_available: dish.is_available !== false,
        product_type: dish.product_type || 'Товар',
        workshop: dish.workshop || 'Кухня',
        modifiers: dish.modifiers || '',
        comment: dish.comment || '',
        image: dish.image || '',
        mxik_code: dish.mxik_code || '10701001001000000',
        package_code: dish.package_code || '796',
        vat_percent: dish.vat_percent !== undefined ? dish.vat_percent : 12,
      });
    } else {
      const firstCatId = uniqueCategories.length > 0 ? getNumericCatId(uniqueCategories[0]?.id || uniqueCategories[0]?.rawId) : 1;
      setForm((prev) => ({
        ...prev,
        category_id: (prev.category_id && uniqueCategories.some(c => getNumericCatId(c.id || c.rawId) === prev.category_id))
          ? prev.category_id
          : firstCatId,
      }));
    }
  }, [dish, uniqueCategories, isOpen]);

  // Keyboard shortcut Ctrl+Enter to save
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (isOpen && e.ctrlKey && e.key === 'Enter') {
        handleSubmit();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  if (!isOpen) return null;

  const workshops = [
    { name: 'Бар', icon: '🍷' },
    { name: 'Кухня', icon: '🍳' },
    { name: 'Салат', icon: '🥗' },
    { name: 'Кабаб', icon: '🍢' },
    { name: 'Склад', icon: '📦' },
  ];

  const productTypes = ['Товар', 'Техно карта', 'Ингредиент', 'Combo', 'Цена за время'];

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.price) {
      alert('Пожалуйста, укажите название блюда и цену!');
      return;
    }
    setIsSaving(true);
    try {
      await onSave(form, dish?.id);
      onClose();
    } catch (err) {
      alert('Ошибка при сохранении: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[1px] select-none p-4">
      {/* JetCafe Classic Window Container */}
      <div className="w-full max-w-2xl bg-[#eff1f5] border-2 border-[#b0b8c5] rounded-md shadow-2xl flex flex-col text-slate-800 text-xs sm:text-sm font-sans">
        
        {/* Windows Title Bar */}
        <div className="bg-gradient-to-r from-[#d9dfe8] to-[#c7d0de] border-b border-[#a8b3c4] px-3 py-1.5 flex items-center justify-between">
          <div className="flex items-center gap-2 font-semibold text-slate-700 tracking-wide text-xs">
            <span className="text-emerald-600 font-bold">jetcafe</span>
            <span className="text-slate-400">|</span>
            <span>{dish ? `Товар: ${dish.name}` : 'Новый Товар'}</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={onClose}
              className="w-5 h-5 flex items-center justify-center text-xs font-bold text-slate-600 hover:bg-rose-500 hover:text-white rounded transition"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Tabs: [Товар] [ИКПУ] */}
        <div className="bg-[#e4e8ef] px-3 pt-2 flex gap-1 border-b border-[#c2cbd8]">
          <button
            type="button"
            onClick={() => setActiveTab('dish')}
            className={`px-4 py-1.5 text-xs font-medium rounded-t-sm border-t border-l border-r transition ${
              activeTab === 'dish'
                ? 'bg-[#eff1f5] border-[#c2cbd8] border-b-transparent -mb-[1px] font-bold text-slate-900 shadow-sm'
                : 'bg-[#d8dfea] border-transparent text-slate-600 hover:bg-[#e0e6f0]'
            }`}
          >
            Товар
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('ikpu')}
            className={`px-4 py-1.5 text-xs font-medium rounded-t-sm border-t border-l border-r transition ${
              activeTab === 'ikpu'
                ? 'bg-[#eff1f5] border-[#c2cbd8] border-b-transparent -mb-[1px] font-bold text-slate-900 shadow-sm'
                : 'bg-[#d8dfea] border-transparent text-slate-600 hover:bg-[#e0e6f0]'
            }`}
          >
            ИКПУ (Soliq)
          </button>
        </div>

        {/* Tab 1: Dish Details matching jetcafe_frame_3.jpg */}
        {activeTab === 'dish' && (
          <div className="p-4 space-y-3.5 max-h-[80vh] overflow-y-auto">
            {/* Product Type Radios */}
            <div className="flex items-center gap-4 bg-white/60 p-2 rounded border border-[#d2d9e4] text-xs">
              <span className="font-semibold text-slate-700 min-w-[50px]">Тип:</span>
              <div className="flex flex-wrap gap-4">
                {productTypes.map((type) => (
                  <label key={type} className="flex items-center gap-1.5 cursor-pointer text-slate-700 hover:text-slate-900">
                    <input
                      type="radio"
                      name="product_type"
                      checked={form.product_type === type}
                      onChange={() => setForm({ ...form, product_type: type })}
                      className="accent-blue-600"
                    />
                    <span>{type}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Main Form Fields + Image Preview Grid */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              {/* Left Column: Form Fields (7 cols) */}
              <div className="md:col-span-7 space-y-2.5">
                {/* Название */}
                <div className="flex items-center">
                  <label className="w-28 text-slate-600 font-medium text-xs">Название:</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Например: CHEESEBURGER"
                    className="flex-1 px-2.5 py-1.5 text-xs bg-white border border-[#b8c2d1] rounded focus:border-blue-500 focus:outline-none shadow-inner"
                  />
                </div>

                {/* № */}
                <div className="flex items-center">
                  <label className="w-28 text-slate-600 font-medium text-xs">№:</label>
                  <input
                    type="number"
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: Number(e.target.value) })}
                    className="w-32 px-2.5 py-1.5 text-xs bg-white border border-[#b8c2d1] rounded focus:border-blue-500 focus:outline-none shadow-inner"
                  />
                </div>

                {/* Категория */}
                <div className="flex items-center">
                  <label className="w-28 text-slate-700 font-semibold text-xs">Категория / Toifasi:</label>
                  <select
                    value={form.category_id}
                    onChange={(e) => setForm({ ...form, category_id: Number(e.target.value) })}
                    className="flex-1 px-2.5 py-1.5 text-xs bg-white border border-[#b8c2d1] rounded font-bold text-slate-900 focus:border-blue-500 focus:outline-none shadow-inner"
                  >
                    {uniqueCategories.map((c) => {
                      const cId = getNumericCatId(c.rawId || c.id);
                      return (
                        <option key={c.id || c.rawId} value={cId}>
                          {c.name}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* В упаковке */}
                <div className="flex items-center">
                  <label className="w-28 text-slate-600 font-medium text-xs">В упаковке:</label>
                  <input
                    type="number"
                    value={form.in_package}
                    onChange={(e) => setForm({ ...form, in_package: Number(e.target.value) })}
                    className="w-32 px-2.5 py-1.5 text-xs bg-white border border-[#b8c2d1] rounded focus:border-blue-500 focus:outline-none shadow-inner"
                  />
                </div>

                {/* Себестоимость */}
                <div className="flex items-center">
                  <label className="w-28 text-slate-600 font-medium text-xs">Себестоимость:</label>
                  <div className="relative flex-1">
                    <input
                      type="number"
                      step="1000"
                      value={form.cost_price}
                      onChange={(e) => setForm({ ...form, cost_price: Number(e.target.value) })}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#b8c2d1] rounded focus:border-blue-500 focus:outline-none shadow-inner pr-10"
                    />
                    <span className="absolute right-2 top-1.5 text-[10px] text-slate-400 font-medium">UZS</span>
                  </div>
                </div>

                {/* Цена */}
                <div className="flex items-center">
                  <label className="w-28 text-slate-700 font-bold text-xs">Цена:</label>
                  <div className="relative flex-1">
                    <input
                      type="number"
                      step="1000"
                      value={form.price}
                      onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-blue-400 font-bold text-slate-900 rounded focus:border-blue-600 focus:outline-none shadow-inner pr-10"
                    />
                    <span className="absolute right-2 top-1.5 text-[10px] text-blue-600 font-bold">UZS</span>
                  </div>
                </div>

                {/* Остаток (Есть в наличии toggle) */}
                <div className="flex items-center pt-1">
                  <label className="w-28 text-slate-600 font-medium text-xs">Остаток:</label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, is_available: !form.is_available })}
                      className={`w-11 h-6 flex items-center rounded-full p-1 transition duration-300 ${
                        form.is_available ? 'bg-emerald-500 justify-end' : 'bg-slate-300 justify-start'
                      }`}
                    >
                      <div className="bg-white w-4 h-4 rounded-full shadow-md transform transition"></div>
                    </button>
                    <span className="text-xs font-semibold text-slate-700">
                      {form.is_available ? 'Есть в наличии' : 'Нет в наличии'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Column: Dish Image Preview (5 cols) */}
              <div className="md:col-span-5 flex flex-col items-center justify-between bg-white border border-[#b8c2d1] rounded p-2.5 shadow-inner">
                <div className="w-full h-36 bg-slate-50 border border-dashed border-slate-300 rounded flex items-center justify-center overflow-hidden relative group">
                  {form.image ? (
                    <>
                      <img
                        src={form.image}
                        alt={form.name}
                        className="w-full h-full object-contain p-2 hover:scale-105 transition duration-200"
                      />
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, image: '' })}
                        className="absolute top-1 right-1 bg-rose-600 hover:bg-rose-700 text-white w-5 h-5 rounded-full flex items-center justify-center text-xs shadow transition"
                        title="Удалить фото"
                      >
                        ✕
                      </button>
                    </>
                  ) : (
                    <div className="text-center text-slate-400 text-xs flex flex-col items-center gap-1">
                      <span className="text-2xl opacity-40">📷</span>
                      <span>Нет фото</span>
                    </div>
                  )}
                </div>

                <div className="w-full mt-2 space-y-1.5">
                  {/* Local File Upload Button */}
                  <label className="w-full cursor-pointer py-1.5 px-2 bg-gradient-to-b from-[#f0f4f9] to-[#d8e2ef] hover:from-white hover:to-[#cad7ea] border border-[#a2b0c4] rounded text-blue-800 text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm active:translate-y-[1px] transition">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      disabled={isUploading}
                    />
                    <span>{isUploading ? '⏳ Загрузка...' : '📁 Выбрать фото из файла (Компьютер)'}</span>
                  </label>

                  <input
                    type="text"
                    placeholder="Или вставьте URL фото..."
                    value={form.image}
                    onChange={(e) => setForm({ ...form, image: e.target.value })}
                    className="w-full px-2 py-1 text-[11px] bg-white border border-[#b8c2d1] rounded focus:outline-none"
                  />
                  <p className="text-[10px] text-slate-500 text-center">Fayldan tanlang yoki URL kiriting</p>
                </div>
              </div>
            </div>

            {/* Workshop (Цех) Selector */}
            <div className="bg-white/60 p-2.5 rounded border border-[#d2d9e4] space-y-1.5">
              <div className="text-slate-600 font-medium text-xs">Цех (принтер кухни):</div>
              <div className="flex flex-wrap gap-2">
                {workshops.map((ws) => {
                  const isSelected = form.workshop === ws.name;
                  return (
                    <button
                      key={ws.name}
                      type="button"
                      onClick={() => setForm({ ...form, workshop: ws.name })}
                      className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 border transition ${
                        isSelected
                          ? 'bg-blue-600 text-white border-blue-700 shadow-sm'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      <span>{ws.icon}</span>
                      <span>{ws.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Модификаторы */}
            <div className="flex items-center">
              <label className="w-28 text-slate-600 font-medium text-xs">Модификаторы:</label>
              <input
                type="text"
                value={form.modifiers}
                onChange={(e) => setForm({ ...form, modifiers: e.target.value })}
                placeholder="Соусы, добавки, степень прожарки..."
                className="flex-1 px-2.5 py-1.5 text-xs bg-white border border-[#b8c2d1] rounded focus:outline-none shadow-inner"
              />
            </div>

            {/* Комментарии */}
            <div className="flex flex-col gap-1">
              <label className="text-slate-600 font-medium text-xs">Комментарии:</label>
              <textarea
                rows={2}
                value={form.comment}
                onChange={(e) => setForm({ ...form, comment: e.target.value })}
                placeholder="Внутренние заметки для повара..."
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#b8c2d1] rounded focus:outline-none shadow-inner resize-none"
              />
            </div>
          </div>
        )}

        {/* Tab 2: Soliq MXIK / IKPU Settings */}
        {activeTab === 'ikpu' && (
          <div className="p-4 space-y-4">
            <div className="bg-blue-50 border border-blue-200 p-3 rounded text-xs text-blue-900 leading-relaxed">
              <strong>Soliq.uz / REGOS VCR Fiskalizatsiya parametrlari:</strong>
              <p className="mt-1">
                O'zbekiston Respublikasi Soliq qo'mitasi talabi bo'yicha har bir taom o'zining 17 xonali MXIK (IKPU) kodi va qadoq kodiga ega bo'lishi shart.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">17 xonali MXIK (IKPU) kodi:</label>
                <input
                  type="text"
                  maxLength={17}
                  value={form.mxik_code}
                  onChange={(e) => setForm({ ...form, mxik_code: e.target.value })}
                  placeholder="10701001001000000"
                  className="w-full px-3 py-2 text-sm font-mono tracking-wider bg-white border border-[#b8c2d1] rounded focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Qadoq kodi (Package Code):</label>
                  <select
                    value={form.package_code}
                    onChange={(e) => setForm({ ...form, package_code: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-white border border-[#b8c2d1] rounded focus:outline-none"
                  >
                    <option value="796">796 - Dona (Порция / Штука)</option>
                    <option value="166">166 - Kilogramm (кг)</option>
                    <option value="112">112 - Litr (литр)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">QQS stavkasi (НДС %):</label>
                  <select
                    value={form.vat_percent}
                    onChange={(e) => setForm({ ...form, vat_percent: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs bg-white border border-[#b8c2d1] rounded focus:outline-none"
                  >
                    <option value={12}>12% (Umumiy QQS)</option>
                    <option value={0}>0% (Imtiyozli / To'lanmaydi)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal Action Buttons Footer matching jetcafe_frame_3.jpg */}
        <div className="bg-[#e4e8ef] border-t border-[#c2cbd8] px-4 py-2.5 flex items-center justify-between">
          <div>
            {dish && onDelete && (
              <button
                type="button"
                disabled={isSaving}
                onClick={async () => {
                  const ok = await dialog.confirm({
                    title: "Taomni o'chirish",
                    message: `Haqiqatan ham "${dish.name}" taomini o'chirmoqchimisiz?`,
                    confirmText: "Ha, o'chirish",
                    cancelText: "Bekor qilish",
                    type: "danger",
                  });
                  if (ok) {
                    setIsSaving(true);
                    try {
                      const prodId =
                        dish.rawId ||
                        (typeof dish.id === 'number'
                          ? dish.id
                          : parseInt(String(dish.id).replace(/\D/g, ''), 10)) ||
                        dish.id;
                      const res = await onDelete(prodId);
                      if (res && res.success === false) {
                        dialog.alert({ title: "Xatolik", message: "O'chirishda xatolik: " + (res.error || res.message || 'O\'chirib bo\'lmadi'), type: "error" });
                      } else {
                        onClose();
                      }
                    } catch (err) {
                      dialog.alert({ title: "Xatolik", message: "Xatolik: " + err.message, type: "error" });
                    } finally {
                      setIsSaving(false);
                    }
                  }
                }}
                className="px-3 py-1.5 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-300 rounded font-bold transition flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
              >
                <span>🗑️</span>
                <span>Удалить блюдо</span>
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isSaving}
              onClick={handleSubmit}
              className="px-4 py-1.5 bg-gradient-to-b from-[#f7f9fa] to-[#dce3ec] border border-[#a6b2c4] hover:from-white hover:to-[#ced8e6] text-slate-800 font-semibold rounded text-xs shadow-sm flex items-center gap-1.5 active:translate-y-[1px] transition"
            >
              <span>💾</span>
              <span>Сохранить (Ctrl+Return)</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 bg-gradient-to-b from-[#f7f9fa] to-[#dce3ec] border border-[#a6b2c4] hover:from-white hover:to-[#ced8e6] text-slate-700 font-semibold rounded text-xs shadow-sm flex items-center gap-1 active:translate-y-[1px] transition"
            >
              <span>✕</span>
              <span>Отменить</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
