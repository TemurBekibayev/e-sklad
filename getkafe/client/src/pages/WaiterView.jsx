import React, { useState } from 'react';
import { 
  Plus, 
  Minus, 
  Send, 
  BellRing, 
  ArrowLeft, 
  Utensils, 
  MessageSquare, 
  ShoppingBag,
  Search,
  PlusCircle,
  X,
  Check
} from 'lucide-react';

export default function WaiterView({ 
  tables, 
  categories, 
  products, 
  currentUser, 
  onSubmitOrder, 
  onRequestBill,
  onAddNewDish,
  onOpenAddDish
}) {
  const [selectedTable, setSelectedTable] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(3); // Default: ОСНОВНЫЕ БЛЮДА
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState([]); // [{ product, quantity, comment }]
  const [editingCommentIndex, setEditingCommentIndex] = useState(null);
  const [commentText, setCommentText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showAddDishModal, setShowAddDishModal] = useState(false);

  // New dish form state
  const [newDishForm, setNewDishForm] = useState({
    name: '',
    price: '',
    category_id: 3,
    image: '',
    mxik_code: '10701002001000000',
  });

  const formatPrice = (val) => new Intl.NumberFormat('uz-UZ').format(val || 0);

  // Filter products by selected category and search query
  const filteredProducts = products.filter((p) => {
    const matchesCat = selectedCategory === 0 || p.category_id === selectedCategory;
    const matchesSearch = !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  // Cart operations
  const addToCart = (product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product, quantity: 1, comment: '' }];
    });
  };

  const updateQuantity = (productId, delta) => {
    setCart((prev) => {
      return prev
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean);
    });
  };

  const openCommentModal = (index) => {
    setEditingCommentIndex(index);
    setCommentText(cart[index]?.comment || '');
  };

  const saveComment = () => {
    if (editingCommentIndex !== null) {
      setCart((prev) => {
        const updated = [...prev];
        updated[editingCommentIndex].comment = commentText;
        return updated;
      });
      setEditingCommentIndex(null);
      setCommentText('');
    }
  };

  const quickComments = ['Piyozsiz', 'Issiqroq', 'Muzsiz', 'Achchiq emas', 'Sous alohida'];

  const cartTotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  const handleSendOrder = async () => {
    if (!selectedTable || cart.length === 0) return;
    setIsSending(true);
    try {
      const itemsPayload = cart.map((item) => ({
        product_id: item.product.id,
        product_name: item.product.name,
        quantity: item.quantity,
        price: item.product.price,
        comment: item.comment,
      }));

      await onSubmitOrder({
        tableId: selectedTable.id,
        waiterId: currentUser?.id || 1,
        waiterName: currentUser?.name || 'Ofitsiant',
        items: itemsPayload,
      });

      setCart([]);
      setSelectedTable(null);
    } catch (err) {
      alert('Buyurtma yuborishda xatolik: ' + err.message);
    } finally {
      setIsSending(false);
    }
  };

  const handleBillRequest = async () => {
    if (!selectedTable || !selectedTable.order_id) return;
    try {
      await onRequestBill(selectedTable.order_id);
      setSelectedTable((prev) => ({ ...prev, status: 'bill_requested' }));
    } catch (err) {
      alert('Hisob so\'rashda xatolik: ' + err.message);
    }
  };

  const handleCreateDish = async (e) => {
    e.preventDefault();
    if (!newDishForm.name || !newDishForm.price) return;
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newDishForm),
      });
      const data = await res.json();
      if (data.success) {
        setShowAddDishModal(false);
        setNewDishForm({ name: '', price: '', category_id: 3, image: '', mxik_code: '10701002001000000' });
        if (onAddNewDish) onAddNewDish(data.product);
      }
    } catch (err) {
      alert("Taom qo'shishda xatolik: " + err.message);
    }
  };

  // STEP 1: Table Selection Screen (Matching Image 1)
  if (!selectedTable) {
    return (
      <div className="p-4 sm:p-6 max-w-[1400px] mx-auto min-h-screen bg-[#f3f6fa] text-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-3 border-b border-slate-200">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Stolni Tanlang
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Ofitsiant: <strong className="text-[#ea580c]">{currentUser?.name || 'Xodim'}</strong>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-600 shadow-sm">
              20 ta stol • Wi-Fi Oflayn rejimida faol
            </div>
            {(currentUser?.role === 'admin' || currentUser?.role === 'manager' || !currentUser) && (
              <button
                onClick={() => (onOpenAddDish ? onOpenAddDish() : setShowAddDishModal(true))}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#ea580c] hover:bg-[#d94e08] text-white rounded-xl text-xs font-black shadow-md shadow-orange-500/25 active:scale-95 transition-all"
              >
                <PlusCircle className="w-4 h-4" />
                <span>➕ Taom qo'shish</span>
              </button>
            )}
          </div>
        </div>

        {/* 20 Tables Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {tables.map((table) => {
            const isFree = table.status === 'free';
            const isBusy = table.status === 'busy';
            const isBill = table.status === 'bill_requested';

            let cardBg = 'bg-[#dce7f5] border-[#cadbf0] hover:bg-[#d3e1f0] text-slate-800';
            let statusLabel = "Bo'sh";
            let statusColor = 'text-slate-500';

            if (isBusy) {
              cardBg = 'bg-[#fee2e2] border-[#fca5a5] text-slate-900 shadow-md shadow-red-500/10';
              statusLabel = `Band • ${formatPrice(table.total_amount)} UZS`;
              statusColor = 'text-rose-600 font-bold';
            } else if (isBill) {
              cardBg = 'bg-[#fef3c7] border-[#fcd34d] text-slate-900 shadow-lg shadow-amber-500/20 animate-pulse';
              statusLabel = 'Hisob so\'raldi!';
              statusColor = 'text-amber-700 font-black';
            }

            return (
              <button
                key={table.id}
                onClick={() => setSelectedTable(table)}
                className={`p-5 rounded-2xl border transition-all duration-150 active:scale-95 flex flex-col justify-between min-h-[115px] shadow-sm text-center ${cardBg}`}
              >
                <div className="text-lg font-black tracking-wide text-slate-800">
                  STOL - {table.number}
                </div>

                <div className={`text-xs mt-2 ${statusColor}`}>
                  {statusLabel}
                </div>

                {isBusy && table.waiter_name && (
                  <div className="text-[11px] text-slate-500 truncate mt-1">
                    👤 {table.waiter_name}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // STEP 2: Menu Ordering Screen (Matching Image 2)
  return (
    <div className="p-3 sm:p-5 max-w-[1400px] mx-auto min-h-screen bg-[#f3f6fa] text-slate-800 flex flex-col lg:flex-row gap-5">
      {/* Left/Center: Menu, Search and Dishes */}
      <div className="flex-1 flex flex-col">
        {/* Header matching Image 2 */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-200 p-3.5 rounded-2xl mb-3.5 shadow-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedTable(null)}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors active:scale-95"
              title="Stollarga qaytish"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-slate-900">
                  STOL - {selectedTable.number} • ASOSIY ZAL
                </h2>
                {selectedTable.status === 'busy' && (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-rose-100 text-rose-700 border border-rose-200">
                    Ochiq stol
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-500">
                {currentUser?.name || 'impasto 1'} • {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>

          {/* Search bar matching Image 2 */}
          <div className="flex items-center gap-2 flex-1 max-w-xs ml-auto">
            <div className="relative w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Taom qidirish..."
                className="w-full pl-9 pr-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-[#ea580c] focus:bg-white transition-all"
              />
            </div>

            {/* Quick Add Dish Button for Admin/Manager */}
            <button
              onClick={() => setShowAddDishModal(true)}
              title="Yangi taom qo'shish"
              className="flex items-center gap-1 px-3 py-2 bg-[#ea580c] hover:bg-[#d94e08] text-white rounded-xl text-xs font-bold shadow-md shadow-orange-500/20 active:scale-95 transition-all whitespace-nowrap"
            >
              <PlusCircle className="w-4 h-4" />
              <span className="hidden sm:inline">+ Taom</span>
            </button>
          </div>
        </div>

        {/* Category Pills Bar matching Image 2 (СУПЫ, ХЛЕБ И ЧАЙ, ОСНОВНЫЕ БЛЮДА, САЛАТЫ, ЗАВТРАКИ, СОУС) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2.5 mb-3.5 scrollbar-none">
          <button
            onClick={() => setSelectedCategory(0)}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              selectedCategory === 0
                ? 'bg-[#ea580c] text-white shadow-md shadow-orange-500/30'
                : 'bg-[#e2eaf5] text-slate-700 hover:bg-[#d5e2f0]'
            }`}
          >
            BARCHASI
          </button>

          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all uppercase ${
                selectedCategory === cat.id
                  ? 'bg-[#ea580c] text-white shadow-md shadow-orange-500/30'
                  : 'bg-[#e2eaf5] text-slate-700 hover:bg-[#d5e2f0]'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Product Cards Grid matching Image 2 (5 Columns, Photo Top, Uppercase Name, Orange Price) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {filteredProducts.map((prod) => {
            const inCart = cart.find((it) => it.product.id === prod.id);

            return (
              <button
                key={prod.id}
                onClick={() => addToCart(prod)}
                className="relative bg-white hover:bg-slate-50 border border-slate-200/90 rounded-2xl p-2.5 text-center transition-all active:scale-95 flex flex-col justify-between shadow-sm hover:shadow-md hover:border-orange-300 group"
              >
                {/* Food Image (rectangular aspect ratio matching Image 2) */}
                <div className="w-full h-24 sm:h-28 rounded-xl overflow-hidden bg-slate-100 mb-2 border border-slate-100 relative">
                  <img
                    src={prod.image}
                    alt={prod.name}
                    loading="lazy"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.parentElement.innerHTML = '<div class="w-full h-full flex items-center justify-center text-3xl">🍲</div>';
                    }}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />

                  {/* Overlay counter badge */}
                  {inCart && (
                    <span className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-[#ea580c] text-white font-black text-xs flex items-center justify-center shadow-md">
                      {inCart.quantity}
                    </span>
                  )}
                </div>

                {/* Dish Name (Uppercase bold, matching Image 2) */}
                <div className="px-1">
                  <h4 className="text-[11px] sm:text-xs font-black uppercase text-slate-800 line-clamp-1 group-hover:text-[#ea580c] transition-colors">
                    {prod.name}
                  </h4>

                  {/* Orange Price (matching Image 2: e.g. 50 000 UZS) */}
                  <div className="text-xs sm:text-sm font-black text-[#ea580c] mt-1">
                    {formatPrice(prod.price)} <span className="text-[10px] font-bold">UZS</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Right Sidebar: Order Cart */}
      <div className="w-full lg:w-96 bg-white border border-slate-200 rounded-3xl p-4 flex flex-col shadow-xl h-auto lg:h-[calc(100vh-90px)] sticky top-20">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-[#ea580c]" />
            <span className="font-black text-slate-900 text-base">Buyurtma Savatchasi</span>
          </div>
          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-orange-100 text-[#ea580c]">
            {cart.length} xil taom
          </span>
        </div>

        {/* Cart items */}
        <div className="flex-1 overflow-y-auto py-3 space-y-2.5">
          {cart.length === 0 ? (
            <div className="text-center py-20 text-slate-400">
              <Utensils className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-xs">Menyudan taom ustiga bosing</p>
            </div>
          ) : (
            cart.map((item, index) => (
              <div
                key={item.product.id}
                className="bg-slate-50 border border-slate-200/80 p-2.5 rounded-2xl space-y-1.5"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <img
                      src={item.product.image}
                      alt={item.product.name}
                      className="w-10 h-10 object-cover rounded-lg border border-slate-200 flex-shrink-0"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                    <div>
                      <h5 className="font-bold text-slate-900 text-xs line-clamp-1">{item.product.name}</h5>
                      <div className="text-xs text-[#ea580c] font-black mt-0.5">
                        {formatPrice(item.product.price * item.quantity)} UZS
                      </div>
                    </div>
                  </div>

                  {/* Quantity Stepper */}
                  <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200">
                    <button
                      onClick={() => updateQuantity(item.product.id, -1)}
                      className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center active:scale-90"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-5 text-center text-xs font-black text-slate-900">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.product.id, 1)}
                      className="w-6 h-6 rounded-lg bg-[#ea580c] hover:bg-[#d94e08] text-white font-bold flex items-center justify-center active:scale-90"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Comment / Izoh */}
                <div className="pt-1 border-t border-slate-200/60 flex items-center justify-between">
                  <button
                    onClick={() => openCommentModal(index)}
                    className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-[#ea580c]"
                  >
                    <MessageSquare className="w-3 h-3 text-[#ea580c]" />
                    <span>{item.comment ? `"${item.comment}"` : 'Izoh qo\'shish...'}</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer & Actions */}
        <div className="pt-3 border-t border-slate-100 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 text-xs font-medium">Jami hisob:</span>
            <span className="text-2xl font-black text-[#ea580c]">
              {formatPrice(cartTotal)} <span className="text-xs font-normal text-slate-500">UZS</span>
            </span>
          </div>

          <button
            onClick={handleSendOrder}
            disabled={isSending || cart.length === 0}
            className="w-full py-4 rounded-2xl bg-[#ea580c] hover:bg-[#d94e08] disabled:opacity-50 text-white font-black text-base shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2 active:scale-95 transition-all"
          >
            <Send className="w-5 h-5" />
            <span>{isSending ? 'Yuborilmoqda...' : 'OSHXONAGA YUBORISH'}</span>
          </button>

          {selectedTable.status === 'busy' && (
            <button
              onClick={handleBillRequest}
              className="w-full py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-xs border border-amber-200 flex items-center justify-center gap-1.5 transition-colors"
            >
              <BellRing className="w-4 h-4 text-amber-600" />
              <span>Mijoz uchun hisob so'rash</span>
            </button>
          )}
        </div>
      </div>

      {/* Quick Comment Modal */}
      {editingCommentIndex !== null && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-5 max-w-sm w-full shadow-2xl">
            <h4 className="text-lg font-black text-slate-900 mb-1">Taomga Izoh Yozish</h4>
            <p className="text-xs text-slate-500 mb-4">
              Oshpaz uchun maxsus talab (masalan: piyozsiz, achchiq emas)
            </p>

            <div className="flex flex-wrap gap-2 mb-4">
              {quickComments.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setCommentText(tag)}
                  className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-orange-50 text-xs text-slate-700 hover:text-[#ea580c] border border-slate-200 active:scale-95"
                >
                  {tag}
                </button>
              ))}
            </div>

            <textarea
              rows={2}
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="O'z izohingizni yozing..."
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs text-slate-800 focus:outline-none focus:border-[#ea580c] mb-4"
            />

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setEditingCommentIndex(null)}
                className="w-1/2 py-2.5 rounded-xl bg-slate-100 text-slate-600 font-bold text-xs"
              >
                Bekor
              </button>
              <button
                type="button"
                onClick={saveComment}
                className="w-1/2 py-2.5 rounded-xl bg-[#ea580c] text-white font-black text-xs shadow-md shadow-orange-500/20"
              >
                Saqlash
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add New Dish Modal (Taomlarni kim qo'shadi savoliga to'g'ridan-to'g'ri amaliy yechim!) */}
      {showAddDishModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-xl font-black text-slate-900">Yangi Taom Qo'shish</h3>
                <p className="text-xs text-slate-500">Menejer / Admin menyuni yangilashi mumkin</p>
              </div>
              <button
                onClick={() => setShowAddDishModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-800 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateDish} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Taom nomi:</label>
                <input
                  type="text"
                  required
                  value={newDishForm.name}
                  onChange={(e) => setNewDishForm({ ...newDishForm, name: e.target.value })}
                  placeholder="Masalan: Qozon Kabob yoki Sezar salati"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-semibold focus:outline-none focus:border-[#ea580c]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Narxi (UZS):</label>
                  <input
                    type="number"
                    required
                    value={newDishForm.price}
                    onChange={(e) => setNewDishForm({ ...newDishForm, price: e.target.value })}
                    placeholder="50000"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-bold focus:outline-none focus:border-[#ea580c]"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Toifasi:</label>
                  <select
                    value={newDishForm.category_id}
                    onChange={(e) => setNewDishForm({ ...newDishForm, category_id: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-bold focus:outline-none focus:border-[#ea580c]"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Fotosurat havolasi (URL):</label>
                <input
                  type="text"
                  value={newDishForm.image}
                  onChange={(e) => setNewDishForm({ ...newDishForm, image: e.target.value })}
                  placeholder="https://... (bo'sh qolsa standart rasm qo'yiladi)"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-[#ea580c]"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Soliq MXIK (IKPU) kodi:</label>
                <input
                  type="text"
                  maxLength={17}
                  value={newDishForm.mxik_code}
                  onChange={(e) => setNewDishForm({ ...newDishForm, mxik_code: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono focus:outline-none focus:border-[#ea580c]"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddDishModal(false)}
                  className="w-1/2 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 rounded-xl bg-[#ea580c] hover:bg-[#d94e08] text-white font-black shadow-md shadow-orange-500/20"
                >
                  Saqlash va Chiqarish
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
