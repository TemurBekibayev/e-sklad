import React, { useState, useEffect } from 'react';

export default function JetCafeCategoryModal({ isOpen, onClose, categories = [], onSaveCategory, onDeleteCategory }) {
  const [selectedCat, setSelectedCat] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({
    name: '',
    order_index: 0,
    image: '',
    icon: '🍽️',
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

  useEffect(() => {
    if (categories.length > 0 && !selectedCat) {
      setSelectedCat(categories[0]);
    }
  }, [categories, selectedCat]);

  useEffect(() => {
    if (selectedCat && isEditing) {
      setForm({
        name: selectedCat.name || '',
        order_index: selectedCat.order_index !== undefined ? selectedCat.order_index : 0,
        image: selectedCat.image || '',
        icon: selectedCat.icon || '🍽️',
      });
    }
  }, [selectedCat, isEditing]);

  if (!isOpen) return null;

  const handleStartAdd = () => {
    setSelectedCat(null);
    setForm({
      name: '',
      order_index: categories.length,
      image: '',
      icon: '🍽️',
    });
    setIsEditing(true);
  };

  const handleStartEdit = () => {
    if (!selectedCat) return;
    setForm({
      name: selectedCat.name,
      order_index: selectedCat.order_index || 0,
      image: selectedCat.image || '',
      icon: selectedCat.icon || '🍽️',
    });
    setIsEditing(true);
  };

  const handleDelete = async () => {
    if (!selectedCat) return;
    if (confirm(`Вы действительно хотите удалить категорию "${selectedCat.name}"?`)) {
      await onDeleteCategory(selectedCat.id || selectedCat.rawId);
      setIsEditing(false);
      setSelectedCat(null);
    }
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      alert('Пожалуйста, укажите название категории!');
      return;
    }
    setIsSaving(true);
    try {
      await onSaveCategory(form, selectedCat?.id || selectedCat?.rawId);
      setIsEditing(false);
    } catch (err) {
      alert('Ошибка при сохранении: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[1px] select-none p-4">
      {/* Outer Window matching jetcafe_frame_4.jpg */}
      <div className="w-full max-w-xl bg-[#eff1f5] border-2 border-[#b0b8c5] rounded-md shadow-2xl flex flex-col text-slate-800 text-xs font-sans">
        
        {/* Title Bar */}
        <div className="bg-gradient-to-r from-[#d9dfe8] to-[#c7d0de] border-b border-[#a8b3c4] px-3 py-1.5 flex items-center justify-between">
          <div className="flex items-center gap-2 font-semibold text-slate-700 tracking-wide text-xs">
            <span className="text-emerald-600 font-bold">jetcafe</span>
            <span className="text-slate-400">|</span>
            <span>Категория блюд</span>
          </div>
          <button
            onClick={onClose}
            className="w-5 h-5 flex items-center justify-center text-xs font-bold text-slate-600 hover:bg-rose-500 hover:text-white rounded transition"
          >
            ✕
          </button>
        </div>

        {/* Action Buttons Toolbar matching jetcafe_frame_4.jpg */}
        <div className="bg-[#e4e8ef] p-2 border-b border-[#c2cbd8] flex items-center gap-2">
          <button
            type="button"
            onClick={handleStartAdd}
            className="px-3 py-1.5 bg-gradient-to-b from-[#f7f9fa] to-[#dce3ec] border border-[#a6b2c4] hover:from-white hover:to-[#ced8e6] text-blue-700 font-bold rounded text-xs shadow-sm flex items-center gap-1.5 active:translate-y-[1px] transition"
          >
            <span className="text-sm font-black text-blue-600">➕</span>
            <span>Добавить</span>
          </button>
          <button
            type="button"
            onClick={handleStartEdit}
            disabled={!selectedCat}
            className="px-3 py-1.5 bg-gradient-to-b from-[#f7f9fa] to-[#dce3ec] border border-[#a6b2c4] hover:from-white hover:to-[#ced8e6] text-slate-800 font-semibold rounded text-xs shadow-sm flex items-center gap-1.5 disabled:opacity-50 active:translate-y-[1px] transition"
          >
            <span>✏</span>
            <span>Редактировать</span>
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={!selectedCat}
            className="px-3 py-1.5 bg-gradient-to-b from-[#f7f9fa] to-[#dce3ec] border border-[#a6b2c4] hover:from-white hover:to-[#ced8e6] text-rose-600 font-semibold rounded text-xs shadow-sm flex items-center gap-1.5 disabled:opacity-50 active:translate-y-[1px] transition"
          >
            <span>✕</span>
            <span>Удалить</span>
          </button>
        </div>

        {/* Content Area: Table on Left + Edit Box on Right */}
        <div className="p-3 grid grid-cols-1 md:grid-cols-12 gap-3 min-h-[300px]">
          {/* Left: Category Table (7 cols) */}
          <div className="md:col-span-6 bg-white border border-[#b8c2d1] rounded overflow-hidden flex flex-col shadow-inner">
            <div className="grid grid-cols-6 bg-[#d9dfe8] border-b border-[#b8c2d1] font-bold text-slate-700 py-1 px-2 text-[11px]">
              <span className="col-span-2 text-center">№</span>
              <span className="col-span-4">Название</span>
            </div>
            <div className="flex-1 overflow-y-auto max-h-64 divide-y divide-slate-100 text-xs">
              {categories.map((c, idx) => {
                const isSelected = selectedCat && (selectedCat.id === c.id || selectedCat.rawId === c.id);
                return (
                  <div
                    key={c.id || c.rawId || idx}
                    onClick={() => {
                      setSelectedCat(c);
                      if (isEditing) {
                        setForm({
                          name: c.name,
                          order_index: c.order_index || 0,
                          image: c.image || '',
                          icon: c.icon || '🍽️',
                        });
                      }
                    }}
                    className={`grid grid-cols-6 py-1.5 px-2 cursor-pointer transition items-center ${
                      isSelected
                        ? 'bg-blue-600 text-white font-bold'
                        : 'hover:bg-blue-50 text-slate-800'
                    }`}
                  >
                    <span className="col-span-2 text-center text-slate-500 font-mono">
                      {isSelected ? <span className="text-white font-bold">▶ {c.order_index ?? idx}</span> : (c.order_index ?? idx)}
                    </span>
                    <span className="col-span-4 uppercase tracking-wide truncate">{c.name}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Add/Edit Category Card (6 cols) matching jetcafe_frame_4.jpg */}
          <div className="md:col-span-6 bg-white border border-[#b8c2d1] rounded p-3 shadow-inner flex flex-col justify-between">
            {isEditing ? (
              <div className="space-y-3 flex-1">
                <div className="font-bold text-slate-700 border-b pb-1 text-xs flex items-center justify-between">
                  <span>{selectedCat ? 'Редактировать категорию' : 'Новая категория'}</span>
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="text-[10px] text-slate-400 hover:text-slate-600"
                  >
                    Отмена
                  </button>
                </div>

                <div className="space-y-2 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-600 mb-0.5">Название:</label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="Например: HOTDOGLAR"
                      className="w-full px-2 py-1 text-xs bg-white border border-[#b8c2d1] rounded focus:outline-none focus:border-blue-500 shadow-inner uppercase font-bold"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-600 mb-0.5">№ (Порядок сортировки):</label>
                    <input
                      type="number"
                      value={form.order_index}
                      onChange={(e) => setForm({ ...form, order_index: Number(e.target.value) })}
                      className="w-24 px-2 py-1 text-xs bg-white border border-[#b8c2d1] rounded focus:outline-none focus:border-blue-500 shadow-inner"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">Фото категории:</label>
                    <div className="space-y-1.5">
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
                        value={form.image}
                        onChange={(e) => setForm({ ...form, image: e.target.value })}
                        placeholder="Или вставьте URL изображения..."
                        className="w-full px-2 py-1 text-[11px] bg-white border border-[#b8c2d1] rounded focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  {/* Photo Preview Box matching the video */}
                  <div className="flex flex-col items-center justify-center">
                    <div className="w-32 h-20 bg-slate-50 border border-[#b8c2d1] rounded flex items-center justify-center overflow-hidden relative group">
                      {form.image ? (
                        <>
                          <img src={form.image} alt={form.name} className="w-full h-full object-cover" />
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
                        <span className="text-[10px] text-slate-400">Нет фото</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={handleSave}
                    className="px-4 py-1.5 bg-gradient-to-b from-[#f7f9fa] to-[#dce3ec] border border-[#a6b2c4] hover:from-white hover:to-[#ced8e6] text-slate-900 font-bold rounded text-xs shadow-sm flex items-center gap-1.5 active:translate-y-[1px] transition"
                  >
                    <span>💾</span>
                    <span>Сохранить</span>
                  </button>
                </div>
              </div>
            ) : selectedCat ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-4 space-y-3">
                <div className="w-36 h-24 bg-slate-100 border border-slate-300 rounded-lg overflow-hidden shadow-inner flex items-center justify-center">
                  {selectedCat.image ? (
                    <img src={selectedCat.image} alt={selectedCat.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xs text-slate-400">Нет изображения</span>
                  )}
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-800 uppercase tracking-wide">{selectedCat.name}</h4>
                  <p className="text-xs text-slate-500">Порядок: {selectedCat.order_index ?? 0}</p>
                </div>
                <button
                  type="button"
                  onClick={handleStartEdit}
                  className="px-3 py-1 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded text-xs text-slate-700 font-medium"
                >
                  ✏ Изменить категорию
                </button>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-400 text-xs">
                Выберите категорию слева
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-[#e4e8ef] border-t border-[#c2cbd8] px-4 py-2 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-gradient-to-b from-[#f7f9fa] to-[#dce3ec] border border-[#a6b2c4] hover:from-white hover:to-[#ced8e6] text-slate-700 font-semibold rounded text-xs shadow-sm flex items-center gap-1 active:translate-y-[1px] transition"
          >
            <span>✕</span>
            <span>Закрыть</span>
          </button>
        </div>

      </div>
    </div>
  );
}
