import React, { useState } from 'react';
import { UtensilsCrossed, PlusCircle, Search, Sparkles, CheckCircle2, XCircle } from 'lucide-react';

export default function MenuView({ products = [], categories = [], onOpenAddDish, currentUser }) {
  const [selectedCategory, setSelectedCategory] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  const formatPrice = (val) => new Intl.NumberFormat('uz-UZ').format(val || 0);

  const filteredProducts = products.filter((p) => {
    const matchesCat =
      selectedCategory === 0 ||
      p.category_id === selectedCategory ||
      p.category_id === Number(selectedCategory) ||
      (selectedCategory && selectedCategory === `cat-${p.category_id}`);
    const matchesSearch = !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="p-4 sm:p-6 max-w-[1400px] mx-auto min-h-screen bg-[#f3f6fa] text-slate-800">
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-sm mb-6">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#ea580c] flex items-center justify-center text-white shadow-md shadow-orange-500/30">
            <UtensilsCrossed className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Menyu Boshqaruvi</h1>
            <p className="text-xs text-slate-500 font-medium">
              Jami taomlar soni: <strong className="text-slate-900">{products.length} ta</strong> | Foydalanuvchi: <strong className="text-slate-900">{currentUser?.name || 'Administrator'}</strong>
            </p>
          </div>
        </div>

        {/* Big Add Dish Button */}
        <button
          onClick={onOpenAddDish}
          className="flex items-center gap-2 px-5 py-3 bg-[#ea580c] hover:bg-[#d94e08] text-white rounded-2xl font-black text-sm shadow-lg shadow-orange-500/25 active:scale-95 transition-all"
        >
          <PlusCircle className="w-5 h-5" />
          <span>➕ Yangi Taom Qo'shish</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none flex-1">
          <button
            onClick={() => setSelectedCategory(0)}
            className={`px-4 py-2 rounded-xl text-xs font-black tracking-wide whitespace-nowrap transition-all ${
              selectedCategory === 0
                ? 'bg-[#ea580c] text-white shadow-md shadow-orange-500/25'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            BARCHASI ({products.length})
          </button>
          {categories.map((cat) => {
            const count = products.filter((p) => p.category_id === cat.id || p.category_id === cat.rawId).length;
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-2 rounded-xl text-xs font-black tracking-wide whitespace-nowrap transition-all uppercase ${
                  isSelected
                    ? 'bg-[#ea580c] text-white shadow-md shadow-orange-500/25'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                {cat.name} ({count})
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Taom nomini qidirish..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#ea580c]"
          />
        </div>
      </div>

      {/* Dishes Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
        {filteredProducts.map((prod) => (
          <div
            key={prod.id}
            className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm flex flex-col justify-between hover:shadow-md transition-all group"
          >
            <div className="relative w-full h-32 bg-slate-100 overflow-hidden">
              {prod.image && prod.image.startsWith('http') ? (
                <img
                  src={prod.image}
                  alt={prod.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-4xl">🍲</div>
              )}
              <div className="absolute top-2 left-2 bg-slate-900/80 backdrop-blur-sm text-white px-2 py-0.5 rounded-lg text-[10px] font-bold">
                {prod.category || 'Taom'}
              </div>
            </div>

            <div className="p-3 flex flex-col flex-1 justify-between">
              <div>
                <h3 className="text-xs font-black text-slate-900 uppercase line-clamp-2 leading-tight mb-1">
                  {prod.name}
                </h3>
                <div className="text-[10px] text-slate-400 font-mono">
                  MXIK: {prod.mxik_code || '10701001001000000'}
                </div>
              </div>

              <div className="pt-2 mt-2 border-t border-slate-100 flex items-center justify-between">
                <div className="text-sm font-black text-[#ea580c]">
                  {formatPrice(prod.price)} <span className="text-[11px] font-bold">UZS</span>
                </div>
                <div className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                  Mavjud
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
