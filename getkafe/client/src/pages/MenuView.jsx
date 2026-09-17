import React, { useState } from 'react';
import { UtensilsCrossed, PlusCircle, Search, Edit3, Trash2, Tag, Sparkles, CheckCircle2, XCircle, Layers } from 'lucide-react';
import JetCafeDishModal from '../components/JetCafeDishModal';
import JetCafeCategoryModal from '../components/JetCafeCategoryModal';
import { useDialog } from '../context/DialogContext';

export default function MenuView({
  products = [],
  categories = [],
  onOpenAddDish,
  onSaveProduct,
  onDeleteProduct,
  onSaveCategory,
  onDeleteCategory,
  currentUser,
}) {
  const dialog = useDialog();
  const [selectedCategory, setSelectedCategory] = useState(0);
  const [editingCategory, setEditingCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingDish, setEditingDish] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  const formatPrice = (val) => new Intl.NumberFormat('uz-UZ').format(val || 0);

  const getNumericCatId = (val) => {
    if (typeof val === 'number') return val;
    if (!val) return null;
    const num = parseInt(String(val).replace(/\D/g, ''), 10);
    return isNaN(num) ? null : num;
  };

  const filteredProducts = products.filter((p) => {
    const pCatId = getNumericCatId(p.category_id);
    const selCatId = getNumericCatId(selectedCategory);

    const matchesCat =
      selectedCategory === 0 ||
      pCatId === selCatId ||
      p.category_id === selectedCategory ||
      (p.category && categories.find((c) => c.id === selectedCategory || c.rawId === selectedCategory)?.name === p.category);

    const matchesSearch =
      !searchQuery ||
      p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.mxik_code && p.mxik_code.includes(searchQuery)) ||
      (p.category && p.category.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesCat && matchesSearch;
  });

  const handleEditClick = (e, prod) => {
    e.stopPropagation();
    setEditingDish(prod);
    setIsEditModalOpen(true);
  };

  const handleDeleteClick = async (e, prod) => {
    e.stopPropagation();
    const ok = await dialog.confirm({
      title: "Taomni o'chirish",
      message: `Haqiqatan ham "${prod.name}" taomini o'chirmoqchimisiz?`,
      confirmText: "Ha, o'chirish",
      cancelText: "Bekor qilish",
      type: "danger",
    });
    if (ok) {
      if (onDeleteProduct) {
        const prodId =
          prod.rawId ||
          (typeof prod.id === 'number' ? prod.id : parseInt(String(prod.id).replace(/\D/g, ''), 10)) ||
          prod.id;
        await onDeleteProduct(prodId);
      }
    }
  };

  const handleAddNewDish = () => {
    if (onOpenAddDish) {
      onOpenAddDish();
    } else {
      setEditingDish(null);
      setIsEditModalOpen(true);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 w-full min-h-full flex-1 bg-[#f3f6fa] text-slate-800 flex flex-col">
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-sm mb-6">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#ea580c] flex items-center justify-center text-white shadow-md shadow-orange-500/30">
            <UtensilsCrossed className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Menyu Boshqaruvi</h1>
              <span className="text-xs bg-orange-100 text-[#ea580c] font-black px-2.5 py-0.5 rounded-full border border-orange-200">
                {products.length} ta taom
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Taomlarni tahrirlash, bo'limini (kategoriyasini) o'zgartirish va yangi taom qo'shish | Administrator: <strong className="text-slate-900">{currentUser?.name || 'Admin'}</strong>
            </p>
          </div>
        </div>

        {/* Action Buttons: Categories & Dishes */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsCategoryModalOpen(true)}
            className="flex items-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-sm shadow-md active:scale-95 transition-all cursor-pointer"
            title="Kategoriyalarni kiritish, tahrirlash yoki o'chirish"
          >
            <Layers className="w-5 h-5" />
            <span>📁 Kategoriyalar</span>
          </button>
          <button
            onClick={handleAddNewDish}
            className="flex items-center gap-2 px-5 py-3 bg-[#ea580c] hover:bg-[#d94e08] text-white rounded-2xl font-black text-sm shadow-lg shadow-orange-500/25 active:scale-95 transition-all cursor-pointer"
          >
            <PlusCircle className="w-5 h-5" />
            <span>➕ Yangi Taom Qo'shish</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-5">
        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none flex-1">
          <button
            onClick={() => setSelectedCategory(0)}
            className={`px-4 py-2.5 rounded-2xl text-xs font-black tracking-wide whitespace-nowrap transition-all cursor-pointer ${
              selectedCategory === 0
                ? 'bg-[#ea580c] text-white shadow-md shadow-orange-500/25'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            BARCHASI ({products.length})
          </button>
          {categories.map((cat) => {
            const catIdNum = getNumericCatId(cat.id || cat.rawId);
            const count = products.filter(
              (p) => getNumericCatId(p.category_id) === catIdNum || p.category === cat.name
            ).length;
            const isSelected = selectedCategory === cat.id || selectedCategory === catIdNum;
            return (
              <button
                key={cat.id || cat.rawId}
                onClick={() => setSelectedCategory(cat.id || catIdNum)}
                className={`px-4 py-2.5 rounded-2xl text-xs font-black tracking-wide whitespace-nowrap transition-all uppercase cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-[#ea580c] text-white shadow-md shadow-orange-500/25'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span>{cat.icon || '🍽️'}</span>
                <span>{cat.name}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Taom nomi, toifa yoki MXIK..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#ea580c] shadow-sm"
          />
        </div>
      </div>

      {/* Selected Category Action Bar */}
      {(() => {
        if (selectedCategory === 0) return null;
        const activeCat = categories.find(
          (c) =>
            c.id === selectedCategory ||
            getNumericCatId(c.id || c.rawId) === getNumericCatId(selectedCategory)
        );
        if (!activeCat) return null;
        return (
          <div className="flex items-center justify-between gap-3 bg-white px-4 py-2.5 rounded-2xl border border-slate-200 shadow-sm mb-5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">Tanlangan toifa:</span>
              <span className="text-xs font-black text-blue-700 bg-blue-50 px-2.5 py-1 rounded-xl border border-blue-200 uppercase">
                {activeCat.name}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setEditingCategory(activeCat);
                  setIsCategoryModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Tahrirlash</span>
              </button>
              <button
                type="button"
                onClick={async () => {
                  const ok = await dialog.confirm({
                    title: "Toifani o'chirish",
                    message: `Haqiqatan ham "${activeCat.name}" toifasini o'chirmoqchimisiz?\n(Ushbu toifadagi taomlar saqlanib qoladi)`,
                    confirmText: "Ha, o'chirish",
                    cancelText: "Bekor qilish",
                    type: "danger",
                  });
                  if (ok) {
                    await onDeleteCategory(activeCat.id || activeCat.rawId);
                    setSelectedCategory(0);
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Toifani o'chirish</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedCategory(0)}
                className="px-2.5 py-1.5 text-xs text-slate-400 hover:text-slate-600 font-bold cursor-pointer"
              >
                ✕ Barchasi
              </button>
            </div>
          </div>
        );
      })()}

      {/* Dishes Grid */}
      {filteredProducts.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm my-6 flex flex-col items-center justify-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-orange-100 flex items-center justify-center text-orange-600 text-3xl shadow-inner">
            🍽️
          </div>
          <div className="max-w-md">
            <h3 className="text-lg font-black text-slate-900 mb-1">
              {searchQuery ? "Qidiruv bo'yicha taom topilmadi" : "Menyuda hozircha taomlar mavjud emas"}
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              {searchQuery 
                ? "Boshqa so'z bilan qidiring yoki filtrni tozalang."
                : "Baza toza holatda. Kafe taomlari va ichimliklarini kiritish uchun avval toifa (kategoriya) qo'shing, so'ngra taomlarni rasmi bilan qo'shing."}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setIsCategoryModalOpen(true)}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow transition flex items-center gap-2"
            >
              <Layers className="w-4 h-4" />
              <span>📁 Kategoriya qo'shish</span>
            </button>
            <button
              onClick={handleAddNewDish}
              className="px-5 py-2.5 bg-[#ea580c] hover:bg-[#d94e08] text-white font-black text-xs rounded-xl shadow-md transition flex items-center gap-2"
            >
              <PlusCircle className="w-4 h-4" />
              <span>➕ Taom qo'shish</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4">
          {filteredProducts.map((prod) => {
            const isAvailable = prod.is_available !== false;
            return (
              <div
                key={prod.id}
                onClick={() => {
                  setEditingDish(prod);
                  setIsEditModalOpen(true);
                }}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm flex flex-col justify-between hover:shadow-lg hover:border-orange-300 transition-all duration-200 group cursor-pointer relative"
              >
                {/* Image & Badges */}
                <div className="relative w-full h-36 bg-slate-100 overflow-hidden">
                  {prod.image && prod.image.startsWith('http') ? (
                    <img
                      src={prod.image}
                      alt={prod.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl bg-gradient-to-br from-amber-50 to-orange-100">
                      🍲
                    </div>
                  )}

                  {/* Category Badge on top-left */}
                  <div className="absolute top-2 left-2 bg-slate-900/85 backdrop-blur-md text-white px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider shadow-sm flex items-center gap-1 border border-white/10">
                    <Tag className="w-3 h-3 text-orange-400" />
                    <span>{prod.category || 'Taom'}</span>
                  </div>

                  {/* Availability Badge on top-right */}
                  <div
                    className={`absolute top-2 right-2 px-2 py-0.5 rounded-lg text-[10px] font-black backdrop-blur-md shadow-sm ${
                      isAvailable
                        ? 'bg-emerald-500/90 text-white'
                        : 'bg-rose-500/90 text-white'
                    }`}
                  >
                    {isAvailable ? 'Mavjud' : 'Tugagan'}
                  </div>
                </div>

                {/* Card Info */}
                <div className="p-3.5 flex flex-col flex-1 justify-between gap-2.5">
                  <div>
                    <h3 className="text-xs font-black text-slate-900 uppercase line-clamp-2 leading-snug mb-1 group-hover:text-[#ea580c] transition-colors">
                      {prod.name}
                    </h3>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                      <span>MXIK: {prod.mxik_code ? prod.mxik_code.slice(0, 8) + '...' : '10701...'}</span>
                      {prod.workshop && (
                        <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-sans font-semibold">
                          {prod.workshop}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Price & Action Buttons */}
                  <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-black text-[#ea580c] tracking-tight">
                        {formatPrice(prod.price)} <span className="text-[10px] font-bold text-slate-500">UZS</span>
                      </div>
                    </div>

                    {/* Edit & Delete Buttons */}
                    <div className="flex items-center gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={(e) => handleEditClick(e, prod)}
                        className="flex-1 py-1.5 px-2 bg-orange-50 hover:bg-[#ea580c] text-[#ea580c] hover:text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all border border-orange-200 hover:border-[#ea580c] shadow-xs active:scale-95"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Tahrirlash</span>
                      </button>

                      {onDeleteProduct && (
                        <button
                          type="button"
                          onClick={(e) => handleDeleteClick(e, prod)}
                          title="Taomni o'chirish"
                          className="p-1.5 bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-xl transition-all border border-slate-200 hover:border-rose-200 active:scale-95"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* JetCafe Full Dish Edit Modal */}
      <JetCafeDishModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingDish(null);
        }}
        dish={editingDish}
        categories={categories}
        onSave={onSaveProduct}
        onDelete={onDeleteProduct}
      />

      {/* JetCafe Categories Management Modal */}
      <JetCafeCategoryModal
        isOpen={isCategoryModalOpen}
        onClose={() => {
          setIsCategoryModalOpen(false);
          setEditingCategory(null);
        }}
        initialCategory={editingCategory}
        categories={categories}
        onSaveCategory={onSaveCategory}
        onDeleteCategory={onDeleteCategory}
      />
    </div>
  );
}
