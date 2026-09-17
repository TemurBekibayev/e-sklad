import React, { useState, useEffect } from 'react';
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
  Check,
  Building2,
  Clock,
  CheckCircle2,
  AlertCircle,
  Layers,
  Sparkles
} from 'lucide-react';
import TableHallManagementModal from '../components/TableHallManagementModal';
import { useLanguage } from '../i18n/LanguageContext';
import { useDialog } from '../context/DialogContext';

export default function WaiterView({ 
  tables = [], 
  categories = [], 
  products = [], 
  currentUser = null, 
  halls = [],
  onSubmitOrder, 
  onRequestBill,
  onAddNewDish,
  onOpenAddDish,
  onRefreshTables,
  onRefreshHalls,
  onNavigateTab,
  onSelectTable,
}) {
  const { t, tr } = useLanguage();
  const dialog = useDialog();
  const [selectedTable, setSelectedTable] = useState(null);
  const [selectedHall, setSelectedHall] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState(0); // 0 = Barchasi
  const [searchQuery, setSearchQuery] = useState('');
  
  // Existing order fetched from server for the selected table
  const [existingOrderData, setExistingOrderData] = useState(null); // { order, items, table }
  const [loadingOrder, setLoadingOrder] = useState(false);

  // New items being added to cart in this session
  const [cart, setCart] = useState([]); // [{ product, quantity, comment }]
  const [editingCommentIndex, setEditingCommentIndex] = useState(null);
  const [commentText, setCommentText] = useState('');
  const [isSending, setIsSending] = useState(false);
  
  // Modals
  const [showAddDishModal, setShowAddDishModal] = useState(false);
  const [showTableManageModal, setShowTableManageModal] = useState(false);

  // New dish form state
  const [newDishForm, setNewDishForm] = useState({
    name: '',
    price: '',
    category_id: categories[0]?.id || 1,
    image: '',
    mxik_code: '10701001001000000',
  });

  const formatPrice = (val) => new Intl.NumberFormat('uz-UZ').format(val || 0);

  // Fetch active order whenever a table is selected
  const loadTableOrder = async (tableId) => {
    setLoadingOrder(true);
    try {
      const res = await fetch(`/api/orders/table/${tableId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.order) {
          setExistingOrderData(data);
        } else {
          setExistingOrderData(null);
        }
      }
    } catch (e) {
      console.warn('Error loading table order:', e);
      setExistingOrderData(null);
    } finally {
      setLoadingOrder(false);
    }
  };

  const handleSelectTable = (table) => {
    setSelectedTable(table);
    setCart([]);
    setExistingOrderData(null);
    if (table.current_order_id || table.status === 'busy' || table.status === 'bill_requested') {
      loadTableOrder(table.id);
    }
  };

  // Real-time auto-sync for active table order (Kassada o'zgarish bo'lsa darhol yangilanadi)
  useEffect(() => {
    if (selectedTable) {
      loadTableOrder(selectedTable.id);
      const interval = setInterval(() => {
        loadTableOrder(selectedTable.id);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [selectedTable?.id, tables]);

  // Filter products by selected category and search query
  const filteredProducts = products.filter((p) => {
    const matchesCat = selectedCategory === 0 || p.category_id === selectedCategory;
    const matchesSearch = !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  // Filter tables by selected hall
  const filteredTables = selectedHall === 'all'
    ? tables
    : tables.filter((t) => (t.hall || 'Asosiy Zal') === selectedHall);

  // Status counts
  const freeCount = tables.filter((t) => t.status === 'free').length;
  const busyCount = tables.filter((t) => t.status === 'busy').length;
  const billCount = tables.filter((t) => t.status === 'bill_requested').length;

  // Cart operations for new items
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

  const quickComments = ['Piyozsiz', 'Issiqroq', 'Muzsiz', 'Achchiq emas', 'Sous alohida', 'Tezroq'];

  // Calculations
  const newCartTotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const existingOrderTotal = existingOrderData?.items?.reduce((sum, it) => {
    if (it.is_cancelled) return sum;
    return sum + (it.price * it.quantity);
  }, 0) || (selectedTable?.total_amount || 0);

  const grandTotal = existingOrderTotal + newCartTotal;

  // Send new order / add to table
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
        waiter_id: currentUser?.id || 1,
        waiter_name: currentUser?.name || 'Ofitsiant',
      }));

      const res = await onSubmitOrder({
        tableId: selectedTable.id,
        waiterId: currentUser?.id || 1,
        waiterName: currentUser?.name || 'Ofitsiant',
        items: itemsPayload,
      });

      if (res && res.success) {
        setCart([]);
        // Re-load the table order to display updated items
        await loadTableOrder(selectedTable.id);
        setSelectedTable((prev) => ({ ...prev, status: 'busy', total_amount: res.totalAmount }));
        if (onRefreshTables) onRefreshTables();
      }
    } catch (err) {
      alert('Buyurtma yuborishda xatolik: ' + err.message);
    } finally {
      setIsSending(false);
    }
  };

  const handleBillRequest = async () => {
    const ordId = selectedTable?.order_id || selectedTable?.current_order_id || existingOrderData?.order?.id;
    if (!ordId && !selectedTable?.id) return;
    try {
      const validItems = (existingOrderData?.items || existingItems || []).filter((it) => !it.is_cancelled);
      const payload = {
        orderId: ordId || `ord_${selectedTable.id}`,
        tableId: selectedTable.id,
        tableNumber: selectedTable.number || selectedTable.name,
        waiterName: existingOrderData?.order?.waiter_name || selectedTable?.waiter_name || currentUser?.name || 'Ofitsiant',
        items: validItems,
        subtotal: existingOrderTotal,
        serviceFeePercent: 10,
        serviceFee: Math.round((existingOrderTotal * 10) / 100),
        totalAmount: grandTotal || (existingOrderTotal + Math.round((existingOrderTotal * 10) / 100)),
      };

      // Update order/table status and print precheck via backend
      await onRequestBill(ordId || selectedTable.id, payload);
      setSelectedTable((prev) => ({ ...prev, status: 'bill_requested' }));
      if (onRefreshTables) onRefreshTables();
    } catch (err) {
      alert('Hisob so\'rashda xatolik: ' + err.message);
    }
  };

  const handleReopenOrder = async () => {
    if (!selectedTable?.id) return;
    try {
      const res = await fetch(`/api/tables/${selectedTable.id}/reopen`, { method: 'POST' });
      let data = {};
      try {
        data = await res.json();
      } catch (e) {
        data = { success: false, message: "Serverdan kutilmagan javob keldi" };
      }
      if (data.success) {
        setSelectedTable((prev) => ({ ...prev, status: 'busy' }));
        if (onRefreshTables) onRefreshTables();
      } else {
        if (dialog && dialog.alert) {
          dialog.alert({
            title: "Qayta Ochish Xatosi",
            message: data.message || "Buyurtmani qayta ochish imkoni bo'lmadi",
            type: "error"
          });
        } else {
          alert('Qayta ochishda xatolik: ' + (data.message || 'Xatolik yuz berdi'));
        }
      }
    } catch (err) {
      if (dialog && dialog.alert) {
        dialog.alert({
          title: "Qayta Ochish Xatosi",
          message: err.message || "Tizim xatoligi yuz berdi",
          type: "error"
        });
      } else {
        alert('Qayta ochishda xatolik: ' + err.message);
      }
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
        setNewDishForm({ name: '', price: '', category_id: categories[0]?.id || 1, image: '', mxik_code: '10701001001000000' });
        if (onAddNewDish) onAddNewDish(data.product);
      }
    } catch (err) {
      alert("Taom qo'shishda xatolik: " + err.message);
    }
  };

  // ----------------------------------------------------
  // STEP 1: Table Selection Screen
  // ----------------------------------------------------
  if (!selectedTable) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 w-full min-h-full flex-1 bg-[#f3f6fa] text-slate-800 flex flex-col">
        {/* Top Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4 pb-3 border-b border-slate-200">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span>Stolni Tanlang</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-700 font-bold border border-orange-200">
                Ofitsiant
              </span>
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Xodim: <strong className="text-orange-600">{currentUser?.name || 'Ofitsiant'}</strong>
            </p>
          </div>

          {/* Quick Actions and Stats */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Status counts */}
            <div className="hidden sm:flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold shadow-sm">
              <span className="flex items-center gap-1 text-emerald-600">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                <span>{freeCount} bo'sh</span>
              </span>
              <span className="text-slate-300">•</span>
              <span className="flex items-center gap-1 text-rose-600">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                <span>{busyCount} band</span>
              </span>
              {billCount > 0 && (
                <>
                  <span className="text-slate-300">•</span>
                  <span className="flex items-center gap-1 text-amber-600">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
                    <span>{billCount} hisob</span>
                  </span>
                </>
              )}
            </div>

            {/* Table & Hall Management & Add Dish Buttons (Manager Only) */}
            {(currentUser?.role === 'admin' || currentUser?.role === 'manager') && (
              <>
                <button
                  onClick={() => setShowTableManageModal(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-black shadow-sm active:scale-95 transition"
                >
                  <Building2 className="w-4 h-4 text-orange-400" />
                  <span>⚙️ Stollar / Zallar</span>
                </button>

                <button
                  onClick={() => (onOpenAddDish ? onOpenAddDish() : setShowAddDishModal(true))}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-black shadow-md shadow-orange-500/25 active:scale-95 transition"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>➕ Taom qo'shish</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Hall / Room Tabs: [Barcha zallar] [Asosiy Zal] [Zal 1] [Zal 2] [2-Qavat Zal] [VIP Xona] */}
        <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-4 scrollbar-none">
          <button
            onClick={() => setSelectedHall('all')}
            className={`px-4 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all shadow-sm ${
              selectedHall === 'all'
                ? 'bg-slate-900 text-white shadow-md'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            🏢 BARCHA ZALLAR ({tables.length})
          </button>

          {halls.map((h) => {
            const count = tables.filter((t) => (t.hall || 'Asosiy Zal') === h.name).length;
            const isAct = selectedHall === h.name;
            return (
              <button
                key={h.id}
                onClick={() => setSelectedHall(h.name)}
                className={`px-4 py-2 rounded-xl text-xs font-black whitespace-nowrap uppercase transition-all shadow-sm ${
                  isAct
                    ? 'bg-orange-600 text-white shadow-md shadow-orange-500/25'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {h.name} ({count})
              </button>
            );
          })}
        </div>

        {/* Tables Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-3.5 flex-1">
          {filteredTables.length === 0 ? (
            <div className="col-span-full py-20 text-center text-slate-400 bg-white rounded-3xl border border-slate-200 shadow-sm">
              <Building2 className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p className="font-bold text-sm text-slate-600">Ushbu zalda stollar topilmadi</p>
              <button
                onClick={() => setShowTableManageModal(true)}
                className="mt-3 px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white font-black text-xs rounded-xl shadow-sm"
              >
                + Stol qo'shish
              </button>
            </div>
          ) : (
            filteredTables.map((table) => {
              const isFree = table.status === 'free';
              const isBusy = table.status === 'busy';
              const isBill = table.status === 'bill_requested';

              let cardBg = 'bg-[#dce7f5] border-[#cadbf0] hover:bg-[#d3e1f0] text-slate-800';
              let statusLabel = "Bo'sh";
              let statusColor = 'text-slate-500';

              if (isBusy) {
                cardBg = 'bg-[#fee2e2] border-[#fca5a5] text-slate-900 shadow-md shadow-red-500/10 hover:border-red-400';
                statusLabel = `Band · ${formatPrice(table.total_amount)} UZS`;
                statusColor = 'text-rose-600 font-black';
              } else if (isBill) {
                cardBg = 'bg-[#fef3c7] border-[#fcd34d] text-slate-900 shadow-lg shadow-amber-500/20 animate-pulse hover:border-amber-400';
                statusLabel = 'Hisob so\'raldi!';
                statusColor = 'text-amber-700 font-black';
              }

              return (
                <button
                  key={table.id}
                  onClick={() => handleSelectTable(table)}
                  className={`p-4 rounded-2xl border transition-all duration-150 active:scale-95 flex flex-col justify-between min-h-[125px] shadow-sm text-center ${cardBg}`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-base font-black tracking-wide text-slate-900">
                      {table.name || `STOL - ${table.number}`}
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-black/5 text-slate-600">
                      №{table.number}
                    </span>
                  </div>

                  <div className="my-1.5">
                    <div className={`text-xs ${statusColor}`}>
                      {statusLabel}
                    </div>

                    {isBusy && table.waiter_name && (
                      <div className="text-[10px] text-slate-500 truncate mt-0.5">
                        👤 {table.waiter_name}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500 border-t border-black/5 pt-1.5 w-full">
                    <span className="truncate max-w-[85px]">{table.hall || 'Asosiy Zal'}</span>
                    <span>👥 {table.capacity || 4} kishi</span>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Table/Hall Management Modal */}
        <TableHallManagementModal
          isOpen={showTableManageModal}
          onClose={() => setShowTableManageModal(false)}
          tables={tables}
          halls={halls}
          onTablesUpdated={onRefreshTables}
          onHallsUpdated={onRefreshHalls}
        />
      </div>
    );
  }

  // ----------------------------------------------------
  const existingItems = (existingOrderData?.items || []).filter((it) => !it.is_cancelled);

  return (
    <div className="p-3 sm:p-5 lg:p-6 w-full min-h-full flex-1 bg-[#f3f6fa] text-slate-800 flex flex-col lg:flex-row gap-5">
      {/* Left/Center: Menu, Search and Dishes */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-200 p-3.5 rounded-2xl mb-3.5 shadow-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setSelectedTable(null); setCart([]); setExistingOrderData(null); }}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors active:scale-95"
              title="Stollarga qaytish"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-slate-900">
                  {selectedTable.name || `STOL - ${selectedTable.number}`} • {selectedTable.hall || 'ASOSIY ZAL'}
                </h2>
                {selectedTable.status === 'busy' && (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-rose-100 text-rose-700 border border-rose-200">
                    Ochiq stol · {formatPrice(existingOrderTotal)} UZS
                  </span>
                )}
                {selectedTable.status === 'bill_requested' && (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-200 animate-pulse">
                    Hisob so'ralgan
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-500">
                Ofitsiant: <strong className="text-slate-800">{currentUser?.name || 'Xodim'}</strong> • {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>

          {/* Search bar */}
          <div className="flex items-center gap-2 flex-1 max-w-xs ml-auto">
            <div className="relative w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Taom qidirish..."
                className="w-full pl-9 pr-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-orange-500 focus:bg-white transition-all"
              />
            </div>

            {/* Quick Add Dish Button */}
            <button
              onClick={() => setShowAddDishModal(true)}
              title="Yangi taom qo'shish"
              className="flex items-center gap-1 px-3 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-bold shadow-md shadow-orange-500/20 active:scale-95 transition whitespace-nowrap"
            >
              <PlusCircle className="w-4 h-4" />
              <span className="hidden sm:inline">+ Taom</span>
            </button>
          </div>
        </div>

        {/* Category Pills Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2.5 mb-3.5 scrollbar-none">
          <button
            onClick={() => setSelectedCategory(0)}
            className={`px-4 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all ${
              selectedCategory === 0
                ? 'bg-orange-600 text-white shadow-md shadow-orange-500/30'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            BARCHASI
          </button>

          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all uppercase ${
                selectedCategory === cat.id
                  ? 'bg-orange-600 text-white shadow-md shadow-orange-500/30'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Product Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {filteredProducts.map((prod) => {
            const inCart = cart.find((it) => it.product.id === prod.id);

            return (
              <button
                key={prod.id}
                onClick={() => addToCart(prod)}
                className="relative bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl p-2.5 text-center transition-all active:scale-95 flex flex-col justify-between shadow-sm hover:shadow-md hover:border-orange-300 group"
              >
                {/* Food Image */}
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
                    <span className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-orange-600 text-white font-black text-xs flex items-center justify-center shadow-md">
                      {inCart.quantity}
                    </span>
                  )}

                  {/* Stock remaining badge */}
                  {prod.stock_quantity !== undefined && (
                    <span className={`absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded-md text-[9px] font-bold shadow-sm ${
                      prod.stock_quantity <= 0
                        ? 'bg-rose-600 text-white animate-pulse'
                        : prod.stock_quantity <= (prod.min_stock_alert || 5)
                        ? 'bg-amber-500 text-slate-950 font-black'
                        : 'bg-black/60 text-white backdrop-blur-[2px]'
                    }`}>
                      {prod.stock_quantity <= 0 ? 'Tugagan' : `${prod.stock_quantity} ${prod.unit || 'ta'}`}
                    </span>
                  )}
                </div>

                {/* Dish Name */}
                <div className="px-1">
                  <h4 className="text-[11px] sm:text-xs font-black uppercase text-slate-800 line-clamp-1 group-hover:text-orange-600 transition-colors">
                    {prod.name}
                  </h4>

                  {/* Orange Price */}
                  <div className="text-xs sm:text-sm font-black text-orange-600 mt-1">
                    {formatPrice(prod.price)} <span className="text-[10px] font-bold">UZS</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Right Sidebar: Order Cart (Shows BOTH existing order items and new dishes!) */}
      <div className="w-full lg:w-96 bg-white border border-slate-200 rounded-3xl p-4 flex flex-col shadow-xl h-auto lg:h-[calc(100vh-90px)] sticky top-20">
        
        {/* Drawer Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-orange-600" />
            <div>
              <span className="font-black text-slate-900 text-sm sm:text-base">Buyurtma Savatchasi</span>
              <div className="text-[11px] text-slate-500 font-medium">
                {selectedTable.name || `STOL - ${selectedTable.number}`}
              </div>
            </div>
          </div>
          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-700">
            {existingItems.length + cart.length} xil taom
          </span>
        </div>

        {/* Cart items list */}
        <div className="flex-1 overflow-y-auto py-3 space-y-3.5 pr-1">
          
          {/* SECTION 1: EXISTING ORDER ITEMS (Oshxonaga avval yuborilgan taomlar) */}
          {existingItems.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Mavjud buyurtma (Oshxonada)</span>
                </span>
                <span className="text-[11px] font-bold text-slate-600">
                  {formatPrice(existingOrderTotal)} UZS
                </span>
              </div>

              <div className="space-y-1.5">
                {existingItems.map((item) => (
                  <div
                    key={item.id}
                    className={`p-2.5 rounded-2xl border ${
                      item.is_cancelled
                        ? 'bg-rose-50/60 border-rose-200 text-rose-800 line-through opacity-60'
                        : 'bg-emerald-50/50 border-emerald-200/80 text-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0 pr-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-xs text-slate-900 truncate">
                            {item.product_name}
                          </span>
                          <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 text-[9px] font-black shrink-0">
                            {item.quantity} dona
                          </span>
                          {item.waiter_name && (
                            <span className="px-1.5 py-0.2 rounded bg-slate-200/90 text-slate-700 text-[9px] font-semibold flex items-center gap-0.5 shrink-0">
                              👤 {item.waiter_name}
                            </span>
                          )}
                        </div>
                        {item.comment && (
                          <div className="text-[10px] text-slate-500 italic mt-0.5">
                            "{item.comment}"
                          </div>
                        )}
                      </div>
                      <div className="text-xs font-black text-slate-900 shrink-0">
                        {formatPrice(item.price * item.quantity)} UZS
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SECTION 2: NEW CART ITEMS (Hozir qo'shilayotgan yangi taomlar) */}
          {cart.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <span className="text-[11px] font-black text-orange-600 uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Yangi qo'shilayotgan taomlar</span>
                </span>
                <span className="text-[11px] font-black text-orange-600">
                  +{formatPrice(newCartTotal)} UZS
                </span>
              </div>

              <div className="space-y-2">
                {cart.map((item, index) => (
                  <div
                    key={item.product.id}
                    className="bg-orange-50/40 border border-orange-200 p-2.5 rounded-2xl space-y-1.5 shadow-sm"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <img
                          src={item.product.image}
                          alt={item.product.name}
                          className="w-10 h-10 object-cover rounded-lg border border-orange-200 flex-shrink-0"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                        <div>
                          <h5 className="font-bold text-slate-900 text-xs line-clamp-1">{item.product.name}</h5>
                          <div className="text-xs text-orange-600 font-black mt-0.5">
                            {formatPrice(item.product.price * item.quantity)} UZS
                          </div>
                        </div>
                      </div>

                      {/* Quantity Stepper */}
                      <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-orange-200">
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
                          className="w-6 h-6 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-bold flex items-center justify-center active:scale-90"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Comment */}
                    <div className="pt-1 border-t border-orange-100 flex items-center justify-between">
                      <button
                        onClick={() => openCommentModal(index)}
                        className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-orange-600"
                      >
                        <MessageSquare className="w-3 h-3 text-orange-500" />
                        <span>{item.comment ? `"${item.comment}"` : 'Izoh qo\'shish...'}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* EMPTY STATE */}
          {existingItems.length === 0 && cart.length === 0 && (
            <div className="text-center py-20 text-slate-400">
              <Utensils className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-xs font-semibold">Savatchada taom yo'q</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Menyudan kerakli taom ustiga bosing</p>
            </div>
          )}
        </div>

        {/* Footer & Actions */}
        <div className="pt-3 border-t border-slate-100 space-y-2.5">
          {/* Subtotal breakdowns */}
          {existingItems.length > 0 && cart.length > 0 && (
            <div className="space-y-1 text-xs pb-1 border-b border-slate-100">
              <div className="flex justify-between text-slate-500">
                <span>{t('pos_subtotal', 'Avvalgi hisob:')}</span>
                <span className="font-bold">{formatPrice(existingOrderTotal)} UZS</span>
              </div>
              <div className="flex justify-between text-orange-600 font-bold">
                <span>{t('pos_new_order', 'Yangi qo\'shilgan:')}</span>
                <span>+{formatPrice(newCartTotal)} UZS</span>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-slate-500 text-xs font-semibold">{t('pos_total', 'Jami to\'lov:')}</span>
            <span className="text-2xl font-black text-orange-600">
              {formatPrice(grandTotal)} <span className="text-xs font-normal text-slate-500">UZS</span>
            </span>
          </div>

          {/* Send Order Button (Enabled when new items in cart) */}
          {cart.length > 0 ? (
            <button
              onClick={handleSendOrder}
              disabled={isSending}
              className="w-full py-3.5 rounded-2xl bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-black text-sm shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2 active:scale-95 transition-all"
            >
              <Send className="w-4 h-4" />
              <span>{isSending ? t('pin_checking', 'Yuborilmoqda...') : `${t('pos_send_kitchen', 'OSHXONAGA YUBORISH')} (+${formatPrice(newCartTotal)} UZS)`}</span>
            </button>
          ) : selectedTable.status === 'bill_requested' ? (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-center space-y-2.5">
              <div className="flex items-center justify-center gap-1.5 text-amber-800 font-bold text-xs">
                <span className="animate-pulse">⏳</span>
                <span>Hisob so'ralgan (Pre-chek chiqarilgan)</span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                Mijoz to'lovi kutilmoqda. Kassir to'lovni qabul qilgach stol avtomatik bo'shaydi.
              </p>
              <div className="flex gap-2 pt-0.5">
                <button
                  type="button"
                  onClick={handleBillRequest}
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center justify-center gap-1 shadow-sm active:scale-95 transition"
                >
                  <BellRing className="w-3.5 h-3.5" />
                  <span>Qayta Pre-chek</span>
                </button>
                <button
                  type="button"
                  onClick={handleReopenOrder}
                  className="flex-1 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs flex items-center justify-center gap-1 active:scale-95 transition"
                >
                  <span>↩️ Qayta ochish</span>
                </button>
              </div>
              {onNavigateTab && (
                <button
                  type="button"
                  onClick={() => {
                    if (onSelectTable) onSelectTable(selectedTable);
                    onNavigateTab('cashier');
                  }}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 active:scale-95 transition"
                >
                  <span>💵 Kassaga o'tish (To'lovni qabul qilish)</span>
                </button>
              )}
            </div>
          ) : selectedTable.status === 'busy' ? (
            <button
              onClick={handleBillRequest}
              className="w-full py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 font-black text-xs shadow-md shadow-amber-500/20 flex items-center justify-center gap-2 transition"
            >
              <BellRing className="w-4 h-4" />
              <span>{t('pos_print_precheck', 'MIJOZ UCHUN HISOB SO\'RASH (PRE-CHEK)')}</span>
            </button>
          ) : null}
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
                  className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-orange-50 text-xs text-slate-700 hover:text-orange-600 border border-slate-200 active:scale-95"
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
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs text-slate-800 focus:outline-none focus:border-orange-500 mb-4"
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
                className="w-1/2 py-2.5 rounded-xl bg-orange-600 text-white font-black text-xs shadow-md shadow-orange-500/20"
              >
                Saqlash
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add New Dish Modal */}
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
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-semibold focus:outline-none focus:border-orange-500"
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
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-bold focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Toifasi:</label>
                  <select
                    value={newDishForm.category_id}
                    onChange={(e) => setNewDishForm({ ...newDishForm, category_id: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-bold focus:outline-none focus:border-orange-500"
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
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Soliq MXIK (IKPU) kodi:</label>
                <input
                  type="text"
                  maxLength={17}
                  value={newDishForm.mxik_code}
                  onChange={(e) => setNewDishForm({ ...newDishForm, mxik_code: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono focus:outline-none focus:border-orange-500"
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
                  className="w-1/2 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-black shadow-md shadow-orange-500/20"
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
