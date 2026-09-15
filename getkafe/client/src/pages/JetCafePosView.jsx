import React, { useState, useEffect, useMemo } from 'react';
import JetCafeDishModal from '../components/JetCafeDishModal';
import JetCafeCategoryModal from '../components/JetCafeCategoryModal';
import JetCafeTableModal from '../components/JetCafeTableModal';
import JetCafeItemCancelModal from '../components/JetCafeItemCancelModal';
import JetCafeOrdersJournalModal from '../components/JetCafeOrdersJournalModal';
import JetCafeTelegramModal from '../components/JetCafeTelegramModal';
import JetCafeBackendModal from '../components/JetCafeBackendModal';
import JetCafeMobileBasketsModal from '../components/JetCafeMobileBasketsModal';
import JetCafeOrderItemEditModal from '../components/JetCafeOrderItemEditModal';
import { useLanguage } from '../i18n/LanguageContext';

export default function JetCafePosView({
  tables = [],
  halls = [],
  categories = [],
  products = [],
  currentUser = null,
  staffUsers = [],
  syncState = null,
  selectedTable = null,
  activeOrder = null,
  onSelectTable,
  onSubmitOrder,
  onCompletePayment,
  onLogout,
  onOpenSettings,
  onOpenPrinterSettings,
  onSaveProduct,
  onDeleteProduct,
  onSaveCategory,
  onDeleteCategory,
  onOpenManageTables,
}) {
  const { t, tr, lang } = useLanguage();

  // Active table state
  const currentTable = selectedTable || (tables && tables.length > 0 ? tables[0] : { id: null, number: '-', name: "Stollar yo'q (Stol qo'shing)", status: 'free' });

  // Cart / Order items for current table
  const [orderItems, setOrderItems] = useState([]);
  const [selectedItemIndex, setSelectedItemIndex] = useState(null);
  const [numpadBuffer, setNumpadBuffer] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [selectedWaiter, setSelectedWaiter] = useState(currentUser?.name || 'Xodim');

  useEffect(() => {
    if (currentUser?.name) {
      setSelectedWaiter(currentUser.name);
    }
  }, [currentUser]);

  // Modals state
  const [isTableModalOpen, setIsTableModalOpen] = useState(false);
  const [isDishModalOpen, setIsDishModalOpen] = useState(false);
  const [editingDish, setEditingDish] = useState(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  const selectedCategoryObj = useMemo(() => {
    if (selectedCategoryId === null) return null;
    return (
      categories.find(
        (c) =>
          (c.id || c.rawId) === selectedCategoryId ||
          Number(c.id || c.rawId) === Number(selectedCategoryId)
      ) || null
    );
  }, [categories, selectedCategoryId]);
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isOrderItemEditModalOpen, setIsOrderItemEditModalOpen] = useState(false);
  const [isOrdersJournalOpen, setIsOrdersJournalOpen] = useState(false);
  const [isSettingsMenuOpen, setIsSettingsMenuOpen] = useState(false);
  const [isTelegramModalOpen, setIsTelegramModalOpen] = useState(false);
  const [isBackendModalOpen, setIsBackendModalOpen] = useState(false);
  const [mobileBaskets, setMobileBaskets] = useState([]);
  const [isMobileBasketsModalOpen, setIsMobileBasketsModalOpen] = useState(false);

  // Poll for active mobile baskets from getpos.uz
  const loadMobileBaskets = async () => {
    try {
      const res = await fetch('/api/baskets');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.baskets)) {
          setMobileBaskets(data.baskets);
        }
      }
    } catch (e) {}
  };

  useEffect(() => {
    loadMobileBaskets();
    const interval = setInterval(loadMobileBaskets, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleLoadBasketToCart = (basket) => {
    if (!basket || !basket.items || basket.items.length === 0) return;
    const newItems = basket.items.map((it) => ({
      product_id: it.product || it.id,
      product_name: it.product_name,
      quantity: parseFloat(it.quantity || 1),
      price: parseFloat(it.unit_price || it.price || 0),
      comment: `Mobil: ${basket.worker_name || 'Xodim'}`,
      is_cancelled: false,
    }));
    setOrderItems((prev) => [...prev, ...newItems]);
    if (basket.worker_name) {
      setSelectedWaiter(basket.worker_name);
    }
  };

  // Payment form state
  const [paymentMethod, setPaymentMethod] = useState('cash'); // 'cash', 'card', 'split'
  const [cashGiven, setCashGiven] = useState('');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // Time ticker
  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // When activeOrder changes from backend for selected table, sync local items
  useEffect(() => {
    if (activeOrder && activeOrder.items && activeOrder.items.length > 0) {
      setOrderItems(
        activeOrder.items.map((it) => ({
          id: it.id,
          product_id: it.product_id,
          product_name: it.product_name,
          quantity: it.quantity,
          price: it.price,
          comment: it.comment || '',
          waiter_id: it.waiter_id,
          waiter_name: it.waiter_name,
          is_cancelled: Boolean(it.is_cancelled),
          cancel_reason: it.cancel_reason || '',
        }))
      );
      if (activeOrder.order?.waiter_name) {
        setSelectedWaiter(activeOrder.order.waiter_name);
      }
    } else {
      setOrderItems([]);
    }
    setSelectedItemIndex(null);
    setNumpadBuffer('');
  }, [activeOrder, currentTable?.id]);

  // Totals calculations taking cancellations into account
  const subtotal = useMemo(() => {
    return orderItems.reduce((sum, it) => {
      if (it.quantity < 0) return sum + it.price * it.quantity;
      if (it.is_cancelled) return sum;
      return sum + it.price * it.quantity;
    }, 0);
  }, [orderItems]);

  // Handler for dish return / cancellation (Video 2: Отмена блюда)
  const handleConfirmCancel = async ({ itemId, productId, cancelQty, reason }) => {
    try {
      let ordId = currentTable.current_order_id || currentTable.order_id;
      if (ordId) {
        const res = await fetch(`/api/orders/${ordId}/cancel-item`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ itemId, productId, cancelQty, reason }),
        });
        const data = await res.json();
        if (data.success && data.items) {
          setOrderItems(
            data.items.map((it) => ({
              id: it.id,
              product_id: it.product_id,
              product_name: it.product_name,
              quantity: it.quantity,
              price: it.price,
              comment: it.comment || '',
              waiter_id: it.waiter_id,
              waiter_name: it.waiter_name,
              is_cancelled: Boolean(it.is_cancelled),
              cancel_reason: it.cancel_reason || '',
            }))
          );
        }
      } else {
        setOrderItems((prev) => {
          const copy = [...prev];
          const item = copy[selectedItemIndex];
          if (item) {
            if (cancelQty >= item.quantity) {
              copy[selectedItemIndex] = { ...item, is_cancelled: true, cancel_reason: reason };
            } else {
              copy.push({
                product_id: item.product_id,
                product_name: item.product_name,
                quantity: -cancelQty,
                price: item.price,
                comment: '',
                waiter_id: item.waiter_id,
                waiter_name: item.waiter_name,
                is_cancelled: true,
                cancel_reason: reason,
              });
            }
          }
          return copy;
        });
      }
    } catch (err) {
      console.error('Cancel item error:', err);
    }
  };

  // Handler for editing an item in the active order (Soni, Narxi, Izohi)
  const handleSaveOrderItem = async (updatedItem) => {
    try {
      const ordId = currentTable.current_order_id || currentTable.order_id;
      if (ordId && updatedItem.id) {
        // Active saved order -> call API to update and sync stock
        const res = await fetch(`/api/orders/${ordId}/items/${updatedItem.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            quantity: updatedItem.quantity,
            price: updatedItem.price,
            comment: updatedItem.comment,
            waiter_name: updatedItem.waiter_name,
          }),
        });
        const data = await res.json();
        if (data.success && data.items) {
          setOrderItems(
            data.items.map((it) => ({
              id: it.id,
              product_id: it.product_id,
              product_name: it.product_name,
              quantity: it.quantity,
              price: it.price,
              comment: it.comment || '',
              waiter_id: it.waiter_id,
              waiter_name: it.waiter_name,
              is_cancelled: Boolean(it.is_cancelled),
              cancel_reason: it.cancel_reason || '',
            }))
          );
        }
      } else {
        // Local cart before submit
        setOrderItems((prev) => {
          const copy = [...prev];
          if (selectedItemIndex !== null && copy[selectedItemIndex]) {
            copy[selectedItemIndex] = {
              ...copy[selectedItemIndex],
              quantity: updatedItem.quantity,
              price: updatedItem.price,
              comment: updatedItem.comment,
            };
          }
          return copy;
        });
      }
    } catch (err) {
      console.error('Save order item error:', err);
    }
  };

  const handleDeleteOrderItem = async (itemToDelete) => {
    if (!itemToDelete) return;
    handleConfirmCancel({
      itemId: itemToDelete.id,
      productId: itemToDelete.product_id,
      cancelQty: itemToDelete.quantity,
      reason: "Mijoz bekor qildi",
    });
  };

  const serviceFeePercent = 10; // JetCafe 10% service fee as seen in video
  const serviceFee = Math.round((subtotal * serviceFeePercent) / 100);
  const totalAmount = subtotal + serviceFee;

  // Filtered dishes
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCategory = selectedCategoryId ? p.category_id === selectedCategoryId : true;
      const matchSearch = searchQuery.trim()
        ? p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (p.mxik_code && p.mxik_code.includes(searchQuery))
        : true;
      return matchCategory && matchSearch;
    });
  }, [products, selectedCategoryId, searchQuery]);

  // Click dish to add to order
  const handleAddDish = (dish) => {
    setOrderItems((prev) => {
      const existingIdx = prev.findIndex((it) => it.product_id === dish.id || it.product_name === dish.name);
      if (existingIdx >= 0) {
        const copy = [...prev];
        copy[existingIdx] = {
          ...copy[existingIdx],
          quantity: copy[existingIdx].quantity + 1,
        };
        setSelectedItemIndex(existingIdx);
        return copy;
      } else {
        const newItem = {
          product_id: dish.id,
          product_name: dish.name,
          quantity: 1,
          price: dish.price,
          comment: '',
        };
        const updated = [...prev, newItem];
        setSelectedItemIndex(updated.length - 1);
        return updated;
      }
    });
    setNumpadBuffer('');
  };

  // Numpad button click handling
  const handleNumpadPress = (char) => {
    if (selectedItemIndex === null || !orderItems[selectedItemIndex]) return;

    if (char === 'C') {
      setNumpadBuffer('');
      return;
    }

    if (char === '⌫') {
      const newBuf = numpadBuffer.slice(0, -1);
      setNumpadBuffer(newBuf);
      const val = parseInt(newBuf, 10);
      updateItemQuantity(selectedItemIndex, isNaN(val) || val <= 0 ? 1 : val);
      return;
    }

    const newBuf = numpadBuffer + char;
    setNumpadBuffer(newBuf);
    const val = parseInt(newBuf, 10);
    if (!isNaN(val) && val > 0) {
      updateItemQuantity(selectedItemIndex, val);
    }
  };

  const updateItemQuantity = (index, qty) => {
    setOrderItems((prev) => {
      const copy = [...prev];
      if (copy[index]) {
        copy[index] = { ...copy[index], quantity: qty };
      }
      return copy;
    });
  };

  const handleDeleteSelectedItem = () => {
    if (selectedItemIndex === null) return;
    setOrderItems((prev) => prev.filter((_, idx) => idx !== selectedItemIndex));
    setSelectedItemIndex(null);
    setNumpadBuffer('');
  };

  // Save / Send order to kitchen
  const handleSaveOrder = async () => {
    if (orderItems.length === 0) {
      alert('Буюртмада таомлар йўқ!');
      return;
    }
    try {
      await onSubmitOrder({
        tableId: currentTable.id,
        waiterId: 1,
        waiterName: selectedWaiter,
        items: orderItems,
      });
      alert('Буюртма сақланди ва ошхонага "Бегунок" чоп этилди!');
    } catch (err) {
      alert('Буюртмани сақлашда хатолик: ' + err.message);
    }
  };

  // Precheck print
  const handlePrintPrecheck = () => {
    if (orderItems.length === 0) {
      alert('Буюртма бўш!');
      return;
    }
    window.print();
  };

  // Complete Payment
  const handlePay = async () => {
    if (orderItems.length === 0) {
      alert('Буюртмада таомлар йўқ!');
      return;
    }
    setIsProcessingPayment(true);
    try {
      // First ensure order is saved if new
      let ordId = currentTable.current_order_id || currentTable.order_id;
      if (!ordId) {
        const orderRes = await onSubmitOrder({
          tableId: currentTable.id,
          waiterId: 1,
          waiterName: selectedWaiter,
          items: orderItems,
        });
        ordId = orderRes.orderId;
      }

      const givenNum = Number(cashGiven) || totalAmount;
      const cashAmt = paymentMethod === 'cash' ? totalAmount : paymentMethod === 'split' ? givenNum : 0;
      const cardAmt = paymentMethod === 'card' ? totalAmount : paymentMethod === 'split' ? Math.max(0, totalAmount - givenNum) : 0;

      await onCompletePayment({
        orderId: ordId,
        tableId: currentTable.id,
        paymentMethod,
        cashAmount: cashAmt,
        cardAmount: cardAmt,
      });

      setIsPaymentModalOpen(false);
      setOrderItems([]);
      setSelectedItemIndex(null);
    } catch (err) {
      alert('Тўловни амалга оширишда хатолик: ' + err.message);
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // Format price helper
  const formatUZS = (val) => (val || 0).toLocaleString('ru-RU');

  return (
    <div className="flex flex-col h-screen w-screen bg-[#dce1e8] text-slate-800 select-none overflow-hidden font-sans text-xs">
      
      {/* 1. TOP TITLEBAR matching JetCafe desktop interface */}
      <header className="h-10 bg-[#e4e8ef] border-b border-[#b0b9c7] flex items-center justify-between px-3 shadow-sm shrink-0">
        {/* Left top controls */}
        <div className="flex items-center gap-2">
          {/* [X] Выход button */}
          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 px-3 py-1 bg-gradient-to-b from-[#f5f6f8] to-[#d8dfe8] hover:from-white hover:to-[#cad4e0] border border-[#a2afc2] rounded shadow-sm text-slate-800 font-bold active:translate-y-[1px] transition"
          >
            <span className="w-4 h-4 bg-rose-600 text-white rounded flex items-center justify-center text-[10px] font-black">
              ✕
            </span>
            <span className="text-xs">Выход</span>
          </button>

          {/* (←) Столы button */}
          <button
            onClick={() => setIsTableModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1 bg-gradient-to-b from-[#f5f6f8] to-[#d8dfe8] hover:from-white hover:to-[#cad4e0] border border-[#a2afc2] rounded shadow-sm text-slate-800 font-bold active:translate-y-[1px] transition"
          >
            <span className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[11px] font-bold">
              ←
            </span>
            <span className="text-xs">Столы</span>
          </button>

          {/* Table Indicator badge */}
          <div className="bg-white border border-[#b8c2d1] px-2.5 py-1 rounded text-xs font-bold text-slate-700 shadow-inner flex items-center gap-1.5">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                currentTable.status === 'free' ? 'bg-emerald-500' : 'bg-rose-500'
              }`}
            ></span>
            <span>STOL - {currentTable.number}</span>
          </div>
        </div>

        {/* Center: Terminal Name */}
        <div className="font-bold text-slate-700 text-sm tracking-wide">
          Касса 1
        </div>

        {/* Right top controls */}
        <div className="flex items-center gap-2">
          {/* Quick Add Dish button */}
          <button
            onClick={() => {
              setEditingDish(null);
              setIsDishModalOpen(true);
            }}
            className="flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-slate-50 border border-[#a2afc2] rounded text-xs font-semibold text-blue-700 shadow-sm transition"
          >
            <span>➕</span>
            <span>Блюдо</span>
          </button>

          {/* Quick Categories button */}
          <button
            onClick={() => setIsCategoryModalOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-slate-50 border border-[#a2afc2] rounded text-xs font-semibold text-slate-700 shadow-sm transition"
          >
            <span>📂</span>
            <span>Категории</span>
          </button>

          {/* Quick JetBot Button matching JetCafe Video */}
          <button
            type="button"
            onClick={() => setIsTelegramModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-sky-50 hover:bg-sky-100 border border-sky-300 rounded text-xs font-semibold text-sky-800 shadow-sm transition active:scale-95"
            title="JetBot - Telegram Bot sozlamalari"
          >
            <span>✈️</span>
            <span>JetBot</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </button>

          {/* Mobil Savat Button (Backend v2.0 - Kassaga Uzatish) */}
          <button
            type="button"
            onClick={() => setIsMobileBasketsModalOpen(true)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-bold shadow-sm transition active:scale-95 border ${
              mobileBaskets.length > 0
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700 animate-pulse'
                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300'
            }`}
            title="Mobil ilovadan (ofitsiant/xodimlar) yuborilgan savatlarni chekka yuklash"
          >
            <span>📥</span>
            <span>Mobil Savat</span>
            {mobileBaskets.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-white text-emerald-800 text-[10px] font-black shadow">
                {mobileBaskets.length}
              </span>
            )}
          </button>

          {/* Quick Printer Button */}
          <button
            onClick={onOpenPrinterSettings}
            title="Chek va Printer Sozlamalari (80mm / 58mm)"
            className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded text-xs font-bold text-amber-900 shadow-sm transition"
          >
            <span>🖨️</span>
            <span>Printer</span>
          </button>

          {/* Settings cascading menu matching step2_frame_82.jpg */}
          <div className="relative">
            <button
              onClick={() => setIsSettingsMenuOpen(!isSettingsMenuOpen)}
              className="flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-slate-50 border border-[#a2afc2] rounded text-xs font-semibold text-slate-700 shadow-sm transition"
            >
              <span className="text-blue-600 text-sm">⚙</span>
              <span>Настройка</span>
            </button>

            {isSettingsMenuOpen && (
              <div
                className="absolute right-0 top-full mt-1 w-60 bg-white border border-[#a8b4c5] rounded-md shadow-2xl py-1 z-50 text-xs text-slate-800 divide-y divide-slate-100"
                onClick={() => setIsSettingsMenuOpen(false)}
              >
                <div className="py-1">
                  <button
                    type="button"
                    onClick={() => alert('Кассовая смена открыта')}
                    className="w-full text-left px-3 py-1.5 hover:bg-blue-50 flex items-center gap-2"
                  >
                    <span>👤</span>
                    <span>Кассовая смена</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => alert('Раздел Склад: учет ингредиентов и остатков')}
                    className="w-full text-left px-3 py-1.5 hover:bg-blue-50 flex items-center gap-2"
                  >
                    <span>📦</span>
                    <span>Склад</span>
                  </button>
                </div>

                <div className="py-1">
                  {/* Отчет по заказам matching step2_frame_82.jpg */}
                  <button
                    type="button"
                    onClick={() => setIsOrdersJournalOpen(true)}
                    className="w-full text-left px-3 py-1.5 bg-blue-50/60 hover:bg-blue-100 font-bold text-blue-900 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <span>📋</span>
                      <span>Отчет по заказам</span>
                    </div>
                    <span className="text-[10px] text-blue-600">▶</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => alert('Отчет по проданным товарам')}
                    className="w-full text-left px-3 py-1.5 hover:bg-blue-50 flex items-center gap-2"
                  >
                    <span>📊</span>
                    <span>Отчет по товарам</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => alert('Продажи по официантам')}
                    className="w-full text-left px-3 py-1.5 hover:bg-blue-50 flex items-center gap-2"
                  >
                    <span>👥</span>
                    <span>Продажи по официантам</span>
                  </button>
                </div>

                {/* JetBot Telegram Integration Option */}
                <div className="py-1">
                  <button
                    type="button"
                    onClick={() => setIsTelegramModalOpen(true)}
                    className="w-full text-left px-3 py-1.5 bg-sky-50/50 hover:bg-sky-100 flex items-center justify-between text-sky-950 font-bold"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sky-600 text-sm">✈️</span>
                      <span>Telegram Bot (JetBot)</span>
                    </div>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-bold">Faol</span>
                  </button>
                </div>

                {/* Backend Developer API Integration Option */}
                <div className="py-1">
                  <button
                    type="button"
                    onClick={() => setIsBackendModalOpen(true)}
                    className="w-full text-left px-3 py-1.5 bg-emerald-50/50 hover:bg-emerald-100 flex items-center justify-between text-emerald-950 font-bold"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-emerald-600 text-sm">🌐</span>
                      <span>Server & Backend API</span>
                    </div>
                    <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-mono font-bold">API</span>
                  </button>
                </div>

                {/* Chek va Printer Sozlamalari */}
                <div className="py-1">
                  <button
                    type="button"
                    onClick={() => {
                      setIsSettingsMenuOpen(false);
                      if (onOpenPrinterSettings) onOpenPrinterSettings();
                    }}
                    className="w-full text-left px-3 py-1.5 bg-amber-50/60 hover:bg-amber-100 flex items-center justify-between text-amber-950 font-bold"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-amber-600 text-sm">🖨️</span>
                      <span>Chek Printer Sozlamalari</span>
                    </div>
                    <span className="text-[10px] bg-amber-200/80 text-amber-900 px-1.5 py-0.5 rounded font-bold">80mm</span>
                  </button>
                </div>

                <div className="py-1">
                  <button
                    type="button"
                    onClick={onOpenSettings}
                    className="w-full text-left px-3 py-1.5 hover:bg-blue-50 flex items-center gap-2"
                  >
                    <span>⚙</span>
                    <span>Soliq MXIK sozlamalari</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* JetCafe Logo */}
          <div className="flex items-center gap-1 pl-2 border-l border-slate-300">
            <span className="font-black text-slate-800 text-sm tracking-tight">jet</span>
            <span className="text-cyan-600 font-black text-sm">cafe</span>
            <span className="text-cyan-500 text-xs font-bold">❖</span>
          </div>
        </div>
      </header>

      {/* 2. MAIN 2-COLUMN POS LAYOUT matching jetcafe_frame_1.jpg */}
      <div className="flex-1 flex overflow-hidden p-1.5 gap-1.5">
        
        {/* ============================================================== */}
        {/* LEFT COLUMN: ORDER TABLE, TOOLBAR & KEYPAD (~38% of screen) */}
        {/* ============================================================== */}
        <div className="w-[400px] xl:w-[440px] flex flex-col bg-[#e9edf3] border border-[#a8b3c4] rounded shadow-sm overflow-hidden shrink-0">
          
          {/* Table info bar */}
          <div className="bg-[#dfe5ee] border-b border-[#b0b9c7] px-2.5 py-1.5 font-bold text-slate-700 text-xs truncate flex items-center justify-between">
            <span>
              {t('pos_table', 'Stol')} №{currentTable.number} ({tr(currentTable.hall || currentTable.name)}).{' '}
              {currentTable.current_order_id ? `${t('pos_order_number', 'Buyurtma №')}${currentTable.current_order_id.slice(-4)}` : t('pos_new_order', 'Yangi buyurtma')}
            </span>
            <span className="text-[10px] text-slate-500">
              {orderItems.length} {t('pcs', 'ta')}
            </span>
          </div>

          {/* Order Items Table Grid */}
          <div className="flex-1 bg-white border-b border-[#b0b9c7] overflow-y-auto flex flex-col shadow-inner">
            {/* Table Header Row */}
            <div className="grid grid-cols-12 bg-[#eef2f7] border-b border-[#b8c2d1] font-bold text-slate-700 py-1.5 px-2 text-[11px] sticky top-0 z-10 select-none">
              <span className="col-span-1 text-center">№</span>
              <span className="col-span-6">{t('pos_item_name', 'Nomi')}</span>
              <span className="col-span-2 text-center">{t('pos_item_qty', 'Miqdor')}</span>
              <span className="col-span-3 text-right">{t('pos_item_price', 'Narx')}</span>
            </div>

            {/* Table Item Rows */}
            <div className="flex-1 divide-y divide-slate-100 text-xs">
              {orderItems.length === 0 ? (
                <div className="p-8 text-center text-slate-400 select-none">
                  <div className="text-2xl mb-1 opacity-40">🍽️</div>
                  <p>{t('pos_cart_empty', 'Buyurtma bo\'sh')}</p>
                  <p className="text-[11px] mt-0.5 text-slate-400">{t('pos_cart_hint', 'Menyudan taomlarni tanlang')}</p>
                </div>
              ) : (
                orderItems.map((item, index) => {
                  const isSelected = selectedItemIndex === index;
                  const isCancelled = item.is_cancelled || item.quantity < 0;
                  return (
                    <div
                      key={`${item.product_id || item.product_name}-${index}`}
                      onClick={() => {
                        setSelectedItemIndex(index);
                        setNumpadBuffer('');
                      }}
                      onDoubleClick={() => {
                        setSelectedItemIndex(index);
                        setIsOrderItemEditModalOpen(true);
                      }}
                      title="Tahrirlash (soni/narxi) uchun ikki marta bosing"
                      className={`grid grid-cols-12 py-1.5 px-2 cursor-pointer transition items-center ${
                        isSelected
                          ? 'bg-[#1e56a0] text-white font-semibold shadow-inner'
                          : isCancelled
                          ? 'bg-rose-50/60 text-slate-600'
                          : 'hover:bg-blue-50/70 text-slate-800'
                      }`}
                    >
                      <span className={`col-span-1 text-center text-[10px] ${isSelected ? 'text-white font-bold' : 'text-slate-400'}`}>
                        {index + 1}
                      </span>
                      <span className={`col-span-6 pr-1 ${item.is_cancelled && item.quantity > 0 ? 'line-through text-slate-400 opacity-60' : ''}`}>
                        <div className="uppercase font-bold truncate">{item.product_name}</div>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          {item.waiter_name && (
                            <span className={`px-1 py-0.2 rounded text-[9px] font-semibold flex items-center gap-0.5 ${
                              isSelected ? 'bg-blue-800 text-blue-100' : 'bg-slate-200 text-slate-700'
                            }`}>
                              👤 {item.waiter_name}
                            </span>
                          )}
                          {item.is_cancelled && item.quantity > 0 && (
                            <span className="px-1 rounded bg-rose-100 text-rose-700 text-[9px] font-bold no-underline inline-block">
                              ОТМЕНЕН
                            </span>
                          )}
                          {item.quantity < 0 && (
                            <span className="px-1 rounded bg-amber-100 text-amber-800 text-[9px] font-bold no-underline inline-block">
                              ВОЗВРАТ
                            </span>
                          )}
                        </div>
                        {item.comment && (
                          <span className={`block text-[10px] font-normal italic ${isSelected ? 'text-yellow-200' : 'text-amber-600'}`}>
                            • {item.comment}
                          </span>
                        )}
                      </span>
                      <span className={`col-span-2 text-center font-bold font-mono ${item.quantity < 0 ? 'text-rose-600 font-black' : ''}`}>
                        {item.quantity}
                      </span>
                      <span className={`col-span-3 text-right font-semibold font-mono ${item.quantity < 0 ? 'text-rose-600 font-black' : ''}`}>
                        {formatUZS(item.price * item.quantity)}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Function Buttons + Numpad Grid matching jetcafe_frame_1.jpg */}
          <div className="p-2 bg-[#e2e7ef] border-b border-[#b0b9c7] flex gap-2 select-none">
            
            {/* Left 2 columns: Action Buttons matching the video */}
            <div className="grid grid-cols-2 gap-1.5 w-44">
              {/* Row 1 */}
              <button
                type="button"
                onClick={handlePrintPrecheck}
                className="h-10 px-1 bg-gradient-to-b from-[#f7f9fa] to-[#d8e0ea] hover:from-white hover:to-[#ccd6e3] border border-[#a6b2c4] rounded flex flex-col items-center justify-center text-[10px] font-bold text-slate-700 shadow-sm active:translate-y-[1px]"
              >
                <span className="text-xs">🖨</span>
                <span>Пречек</span>
              </button>

              <button
                type="button"
                onClick={handleSaveOrder}
                className="h-10 px-1 bg-gradient-to-b from-[#f7f9fa] to-[#d8e0ea] hover:from-white hover:to-[#ccd6e3] border border-[#a6b2c4] rounded flex flex-col items-center justify-center text-xs font-bold text-blue-700 shadow-sm active:translate-y-[1px]"
              >
                <span className="text-base">💾</span>
              </button>

              {/* Row 2 */}
              <button
                type="button"
                onClick={() => {
                  if (selectedItemIndex !== null && orderItems[selectedItemIndex]) {
                    setCommentText(orderItems[selectedItemIndex].comment || '');
                    setIsCommentModalOpen(true);
                  } else {
                    alert('Izoh qo\'shish uchun ro\'yxatdan taomni tanlang!');
                  }
                }}
                className="h-10 px-1 bg-gradient-to-b from-[#f7f9fa] to-[#d8e0ea] hover:from-white hover:to-[#ccd6e3] border border-[#a6b2c4] rounded flex flex-col items-center justify-center text-[10px] font-bold text-slate-700 shadow-sm active:translate-y-[1px]"
              >
                <span className="text-xs text-amber-500">📑</span>
                <span>Комментарии</span>
              </button>

              {/* ↩ Button (Отмена / Возврат блюда) matching Video 2 */}
              <button
                type="button"
                onClick={() => {
                  if (selectedItemIndex !== null && orderItems[selectedItemIndex]) {
                    setIsCancelModalOpen(true);
                  } else {
                    alert('Qaytarish / Bekor qilish uchun ro\'yxatdan taomni tanlang!');
                  }
                }}
                className="h-10 px-1 bg-gradient-to-b from-[#f7f9fa] to-[#d8e0ea] hover:from-white hover:to-[#ccd6e3] border border-[#a6b2c4] rounded flex items-center justify-center text-sm font-bold text-blue-700 shadow-sm active:translate-y-[1px]"
                title="Отмена / Возврат блюда"
              >
                ↩
              </button>

              {/* Row 3 */}
              <button
                type="button"
                className="h-10 px-1 bg-gradient-to-b from-[#f7f9fa] to-[#d8e0ea] hover:from-white hover:to-[#ccd6e3] border border-[#a6b2c4] rounded flex items-center justify-center text-[10px] font-bold text-slate-700 shadow-sm active:translate-y-[1px]"
              >
                <span>Клиент ...</span>
              </button>

              <button
                type="button"
                onClick={handlePrintPrecheck}
                className="h-10 px-1 bg-gradient-to-b from-[#f7f9fa] to-[#d8e0ea] hover:from-white hover:to-[#ccd6e3] border border-[#a6b2c4] rounded flex items-center justify-center text-xs font-bold text-emerald-700 shadow-sm active:translate-y-[1px]"
              >
                🖨💲
              </button>

              {/* Row 4: Big Green Оплата + Edit Pencil */}
              <button
                type="button"
                onClick={() => setIsPaymentModalOpen(true)}
                className="h-11 px-1 bg-gradient-to-b from-[#34a853] to-[#1e8e3e] hover:from-[#3bbb5c] hover:to-[#1a7f37] text-white border border-[#187532] rounded flex items-center justify-center gap-1 text-xs font-black shadow-md active:translate-y-[1px]"
              >
                <span className="text-sm">✓</span>
                <span>{t('pos_pay_cash', 'To\'lov')}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (selectedItemIndex !== null && orderItems[selectedItemIndex]) {
                    setIsOrderItemEditModalOpen(true);
                  } else {
                    alert(t('pos_select_item_hint', 'Tahrirlash uchun ro\'yxatdan taomni tanlang!'));
                  }
                }}
                className="h-11 px-1 bg-gradient-to-b from-[#f7f9fa] to-[#d8e0ea] hover:from-white hover:to-[#ccd6e3] border border-[#a6b2c4] rounded flex flex-col items-center justify-center text-xs font-bold text-blue-700 shadow-sm active:translate-y-[1px]"
                title={t('pos_order_items_edit', 'Tanlangan taom soni yoki narxini tahrirlash')}
              >
                <span className="text-base">✏️</span>
              </button>
            </div>

            {/* Column: Delete and Clear */}
            <div className="flex flex-col gap-1.5 w-10">
              <button
                type="button"
                onClick={handleDeleteSelectedItem}
                className="flex-1 bg-gradient-to-b from-[#f7f9fa] to-[#d8e0ea] hover:bg-rose-100 border border-[#a6b2c4] rounded flex items-center justify-center text-base font-bold text-rose-600 shadow-sm active:translate-y-[1px]"
              >
                ✕
              </button>
              <button
                type="button"
                onClick={() => handleNumpadPress('C')}
                className="flex-1 bg-gradient-to-b from-[#f7f9fa] to-[#d8e0ea] hover:bg-slate-200 border border-[#a6b2c4] rounded flex items-center justify-center text-sm font-bold text-slate-700 shadow-sm active:translate-y-[1px]"
              >
                🧹
              </button>
            </div>

            {/* Right: Touch Numeric Numpad matching jetcafe_frame_1.jpg */}
            <div className="flex-1 grid grid-cols-3 gap-1.5">
              {['7', '8', '9', '4', '5', '6', '1', '2', '3'].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => handleNumpadPress(n)}
                  className="h-10 bg-gradient-to-b from-[#ffffff] to-[#e4e9f0] hover:from-[#ffffff] hover:to-[#d6dfea] border border-[#a8b4c5] rounded text-base font-black text-slate-800 shadow-sm flex items-center justify-center active:translate-y-[1px]"
                >
                  {n}
                </button>
              ))}
              {/* 0 (double span) and . */}
              <button
                type="button"
                onClick={() => handleNumpadPress('0')}
                className="col-span-2 h-10 bg-gradient-to-b from-[#ffffff] to-[#e4e9f0] hover:from-[#ffffff] hover:to-[#d6dfea] border border-[#a8b4c5] rounded text-base font-black text-slate-800 shadow-sm flex items-center justify-center active:translate-y-[1px]"
              >
                0
              </button>
              <button
                type="button"
                onClick={() => handleNumpadPress('.')}
                className="h-10 bg-gradient-to-b from-[#ffffff] to-[#e4e9f0] hover:from-[#ffffff] hover:to-[#d6dfea] border border-[#a8b4c5] rounded text-base font-black text-slate-800 shadow-sm flex items-center justify-center active:translate-y-[1px]"
              >
                .
              </button>
            </div>
          </div>

          {/* Waiter & Totals Breakdown matching jetcafe_frame_1.jpg */}
          <div className="p-2.5 bg-[#dfe5ee] flex flex-col gap-1.5 select-none">
            {/* Waiter Dropdown */}
            <div className="flex items-center gap-2">
              <label className="text-[11px] font-semibold text-slate-600 w-16">{t('pos_waiter', 'Ofitsiant:')}</label>
              <select
                value={selectedWaiter}
                onChange={(e) => setSelectedWaiter(e.target.value)}
                className="flex-1 px-2 py-1 text-xs bg-white border border-[#b8c2d1] rounded focus:outline-none shadow-inner font-medium text-slate-800"
              >
                {staffUsers && staffUsers.length > 0 ? (
                  staffUsers.map((u) => (
                    <option key={u.id} value={u.name}>
                      {u.name} ({u.role === 'admin' || u.role === 'manager' ? t('role_manager', 'Boshqaruvchi') : u.role === 'waiter' || u.role === 'worker' ? t('role_waiter', 'Ofitsiant') : u.role === 'cook' ? t('role_cook', 'Oshpaz') : t('role_cashier', 'Kassir')})
                    </option>
                  ))
                ) : (
                  <option value={currentUser?.name || t('role_waiter', 'Ofitsiant')}>{currentUser?.name || t('role_waiter', 'Ofitsiant')}</option>
                )}
              </select>
            </div>

            {/* Breakdown lines + Total */}
            <div className="flex items-end justify-between pt-1">
              {/* Left: Time and Subtotals */}
              <div className="space-y-0.5 text-[11px] text-slate-600">
                <div className="flex gap-2">
                  <span className="w-20">{t('kds_time', 'Vaqti:')}</span>
                  <span className="font-semibold text-slate-800">
                    {currentTime.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="flex gap-2">
                  <span className="w-20">{t('pos_subtotal', 'Oraliq summa:')}</span>
                  <span className="font-semibold text-slate-800">{formatUZS(subtotal)}</span>
                </div>
                <div className="flex gap-2">
                  <span className="w-20">{t('pos_service_fee', 'Xizmat haqi:')}</span>
                  <span className="font-semibold text-slate-800">{formatUZS(serviceFee)}</span>
                </div>
              </div>

              {/* Right: Big Total Amount */}
              <div className="text-right">
                <div className="text-[11px] font-bold text-slate-600">{t('pos_total', 'Jami to\'lov:')}</div>
                <div className="text-2xl font-black text-slate-900 tracking-tight">
                  {formatUZS(totalAmount)}
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* ============================================================== */}
        {/* RIGHT COLUMN: SEARCH, CATEGORIES & DISHES GRID (~62% screen) */}
        {/* ============================================================== */}
        <div className="flex-1 flex flex-col bg-[#e9edf3] border border-[#a8b3c4] rounded shadow-sm overflow-hidden min-w-0">
          
          {/* Top Search Bar matching the video */}
          <div className="p-1.5 bg-[#dfe5ee] border-b border-[#b0b9c7] flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('pos_search_dish', 'Taom qidirish...')}
                className="w-full pl-3 pr-8 py-1.5 text-xs bg-white border border-[#b8c2d1] rounded focus:outline-none focus:border-blue-500 shadow-inner"
              />
              <span className="absolute right-2.5 top-1.5 text-slate-400 text-sm">
                🔍
              </span>
            </div>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="px-2 py-1 text-xs text-slate-500 hover:text-slate-800 font-bold"
              >
                ✕
              </button>
            )}
          </div>

          {/* Box 1: "Категории" (Categories) matching the video */}
          <div className="p-2 border-b border-[#b0b9c7] bg-[#eef1f6]">
            <div className="flex items-center justify-between font-bold text-[11px] text-slate-600 mb-1.5 uppercase tracking-wide px-1">
              <div className="flex items-center gap-2">
                <span>{t('pos_categories', 'Kategoriyalar')}</span>
                {selectedCategoryObj && (
                  <span className="text-[10px] text-blue-800 bg-blue-100/90 px-2 py-0.5 rounded font-black border border-blue-300 normal-case">
                    {selectedCategoryObj.name}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                {selectedCategoryObj && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCategory(selectedCategoryObj);
                        setIsCategoryModalOpen(true);
                      }}
                      className="px-2 py-0.5 bg-white hover:bg-slate-100 border border-slate-300 rounded text-[10px] text-slate-700 font-bold transition flex items-center gap-1 shadow-sm"
                      title="Tanlangan toifani tahrirlash"
                    >
                      <span>✏️</span>
                      <span>Tahrirlash</span>
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        if (window.confirm(`Haqiqatan ham "${selectedCategoryObj.name}" toifasini o'chirmoqchimisiz?\n(Ushbu toifadagi taomlar saqlanib qoladi)`)) {
                          const catIdToDelete = selectedCategoryObj.id || selectedCategoryObj.rawId;
                          await onDeleteCategory(catIdToDelete);
                          setSelectedCategoryId(null);
                        }
                      }}
                      className="px-2 py-0.5 bg-rose-50 hover:bg-rose-100 border border-rose-300 text-rose-700 hover:text-rose-800 rounded text-[10px] font-bold transition flex items-center gap-1 shadow-sm active:scale-95"
                      title="Tanlangan toifani o'chirish"
                    >
                      <span>🗑️</span>
                      <span>Toifani o'chirish</span>
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setEditingCategory(null);
                    setIsCategoryModalOpen(true);
                  }}
                  className="px-2 py-0.5 bg-white hover:bg-blue-50 border border-slate-300 hover:border-blue-400 rounded text-[10px] text-blue-700 font-bold transition flex items-center gap-1 shadow-sm"
                >
                  <span>➕</span>
                  <span>Toifa qo'shish</span>
                </button>
              </div>
            </div>
            
            {/* Category Cards Carousel / Grid */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
              {/* "Все" pill */}
              <button
                type="button"
                onClick={() => setSelectedCategoryId(null)}
                className={`h-20 min-w-[100px] max-w-[110px] rounded border transition flex flex-col overflow-hidden shadow-sm shrink-0 ${
                  selectedCategoryId === null
                    ? 'border-blue-600 ring-2 ring-blue-500/50 bg-blue-50'
                    : 'border-[#b8c2d1] bg-white hover:bg-slate-50'
                }`}
              >
                <div className="flex-1 flex items-center justify-center text-xl bg-slate-100">
                  🍽️
                </div>
                <div className="py-1 px-1 text-center font-bold text-[10px] uppercase truncate border-t border-slate-200">
                  {t('pos_all_categories', 'Barchasi')}
                </div>
              </button>

              {/* If no categories yet */}
              {categories.length === 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingCategory(null);
                    setIsCategoryModalOpen(true);
                  }}
                  className="h-20 px-4 rounded border-2 border-dashed border-blue-300 bg-blue-50/70 hover:bg-blue-100/70 text-blue-700 transition flex flex-col items-center justify-center gap-1 shrink-0"
                >
                  <span className="text-xl">📁</span>
                  <span className="font-bold text-[10px]">+ Birinchi toifani qo'shing</span>
                </button>
              )}

              {/* Categorized Cards matching video jetcafe_frame_1.jpg */}
              {categories.map((c) => {
                const isSelected =
                  selectedCategoryId === (c.id || c.rawId) ||
                  Number(selectedCategoryId) === Number(c.id || c.rawId);
                return (
                  <div key={c.id || c.rawId} className="relative group shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        if (isSelected) setSelectedCategoryId(null);
                        else setSelectedCategoryId(c.id || c.rawId);
                      }}
                      className={`h-20 min-w-[105px] max-w-[120px] w-full rounded border transition flex flex-col overflow-hidden shadow-sm shrink-0 cursor-pointer ${
                        isSelected
                          ? 'border-blue-600 ring-2 ring-blue-500/50 bg-blue-50'
                          : 'border-[#b8c2d1] bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex-1 bg-slate-100 overflow-hidden flex items-center justify-center">
                        {c.image ? (
                          <img
                            src={c.image}
                            alt={c.name}
                            className="w-full h-full object-cover transform hover:scale-105 transition"
                          />
                        ) : (
                          <span className="text-2xl">{c.icon || '🍲'}</span>
                        )}
                      </div>
                      <div className="py-1 px-1 text-center font-bold text-[10px] uppercase tracking-wide truncate border-t border-slate-200 bg-white">
                        {tr(c.name)}
                      </div>
                    </button>

                    {/* Quick delete button on card */}
                    <button
                      type="button"
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (window.confirm(`"${c.name}" toifasini o'chirishni tasdiqlaysizmi?`)) {
                          const catIdToDelete = c.id || c.rawId;
                          await onDeleteCategory(catIdToDelete);
                          if (isSelected) setSelectedCategoryId(null);
                        }
                      }}
                      className={`absolute top-1 right-1 w-5 h-5 bg-rose-600 hover:bg-rose-700 text-white rounded-full flex items-center justify-center text-[10px] font-bold shadow-md transition z-10 ${
                        isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      }`}
                      title={`"${c.name}" toifasini o'chirish`}
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Box 2: "Меню" (Dishes Grid) matching jetcafe_frame_1.jpg */}
          <div className="flex-1 flex flex-col min-h-0 bg-[#eef1f6]">
            <div className="flex items-center justify-between font-bold text-[11px] text-slate-600 py-1 px-3 bg-[#dfe5ee] border-b border-[#b0b9c7] uppercase tracking-wide">
              <span>{t('tab_menu', 'Menyu')}</span>
              <button
                type="button"
                onClick={() => {
                  setEditingDish(null);
                  setIsDishModalOpen(true);
                }}
                className="px-2 py-0.5 bg-white hover:bg-orange-50 border border-slate-300 hover:border-orange-400 rounded text-[10px] text-orange-700 font-bold transition flex items-center gap-1 shadow-sm"
              >
                <span>➕</span>
                <span>Taom qo'shish</span>
              </button>
            </div>

            {/* 4-column cards grid */}
            <div className="flex-1 overflow-y-auto p-2">
              {filteredProducts.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8 space-y-3">
                  <div className="text-4xl opacity-40">🍽️</div>
                  <div className="text-center max-w-sm">
                    <p className="font-bold text-slate-700 text-sm">{t('pos_no_dishes', 'Taomlar mavjud emas')}</p>
                    <p className="text-[11px] text-slate-500 mt-1">Baza toza holatda. Yangi taom kiritish uchun quyidagi tugmani bosing.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingDish(null);
                      setIsDishModalOpen(true);
                    }}
                    className="px-4 py-2 bg-[#ea580c] hover:bg-[#d94e08] text-white font-bold rounded-xl text-xs shadow-md transition flex items-center gap-1.5"
                  >
                    <span>➕</span>
                    <span>Yangi taom kiritish</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                  {filteredProducts.map((dish) => (
                    <div
                      key={dish.id || dish.rawId}
                      onClick={() => handleAddDish(dish)}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        setEditingDish(dish);
                        setIsDishModalOpen(true);
                      }}
                      className="group relative bg-white border border-[#b8c2d1] hover:border-blue-500 rounded p-2 flex flex-col justify-between h-36 cursor-pointer shadow-sm hover:shadow-md transition transform active:scale-95"
                    >
                      {/* Price Badge on Top-Right matching video */}
                      <div className="absolute top-1.5 right-1.5 bg-slate-100/90 group-hover:bg-blue-600 group-hover:text-white px-1.5 py-0.5 rounded text-[11px] font-black text-slate-800 transition shadow-inner">
                        {formatUZS(dish.price)}
                      </div>

                      {/* Workshop Indicator Tag */}
                      <div className="absolute top-1.5 left-1.5 text-[9px] text-slate-400 font-semibold">
                        {tr(dish.workshop || t('tab_kitchen', 'Oshxona'))}
                      </div>

                      {/* Center Food Photo */}
                      <div className="flex-1 flex items-center justify-center overflow-hidden my-1">
                        {dish.image ? (
                          <img
                            src={dish.image}
                            alt={dish.name}
                            className="max-h-20 w-auto object-contain group-hover:scale-105 transition duration-200"
                          />
                        ) : (
                          <span className="text-3xl opacity-60">🍔</span>
                        )}
                      </div>

                      {/* Dish Name on Bottom matching JetCafe typography */}
                      <div className="text-center font-bold text-[11px] text-slate-900 uppercase tracking-tight truncate border-t border-slate-100 pt-1">
                        {tr(dish.name)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>

      </div>

      {/* 3. BOTTOM STATUS BAR matching video */}
      <footer className="h-6 bg-[#d2d9e4] border-t border-[#aeb8c7] px-3 flex items-center justify-between text-[11px] text-slate-700 select-none shrink-0">
        <div className="flex items-center gap-3">
          <span>Пользователь: <strong>{currentUser?.name || 'Системный Администратор'}</strong></span>
          <span className="text-slate-400">|</span>
          <span>Точка: <strong>GetPOS Kafe Chilonzor</strong></span>
          <span className="text-slate-400">|</span>
          <span>
            Soliq / Internet:{' '}
            <strong className={syncState?.isOnline ? 'text-emerald-700' : 'text-amber-600'}>
              {syncState?.isOnline ? '● Онлайн' : '○ Офлайн режим'}
            </strong>
          </span>
        </div>

        <div className="flex items-center gap-3 font-mono font-bold text-slate-800">
          <span>{currentTime.toLocaleDateString('ru-RU')}</span>
          <span>{currentTime.toLocaleTimeString('ru-RU')}</span>
        </div>
      </footer>

      {/* ============================================================== */}
      {/* MODALS */}
      {/* ============================================================== */}

      {/* 1. Table Selector Modal */}
      <JetCafeTableModal
        isOpen={isTableModalOpen}
        onClose={() => setIsTableModalOpen(false)}
        tables={tables}
        halls={halls}
        currentTableId={currentTable?.id}
        onSelectTable={(tbl) => {
          onSelectTable(tbl);
          setIsTableModalOpen(false);
        }}
        onOpenManageTables={onOpenManageTables}
      />

      {/* 2. Dish Add/Edit Modal */}
      <JetCafeDishModal
        isOpen={isDishModalOpen}
        onClose={() => {
          setIsDishModalOpen(false);
          setEditingDish(null);
        }}
        dish={editingDish}
        categories={categories}
        onSave={onSaveProduct}
        onDelete={onDeleteProduct}
      />

      {/* 3. Categories Management Modal */}
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

      {/* 4. Item Comment Modal */}
      {isCommentModalOpen && selectedItemIndex !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white border-2 border-slate-300 rounded shadow-xl p-4 w-full max-w-sm space-y-3">
            <h3 className="font-bold text-slate-800 text-sm">
              Комментарий к блюду: {orderItems[selectedItemIndex]?.product_name}
            </h3>
            <textarea
              rows={3}
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Например: Без лука, горячее, соус отдельно..."
              className="w-full p-2 border rounded text-xs focus:outline-none focus:border-blue-500 shadow-inner"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsCommentModalOpen(false)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border rounded text-xs text-slate-700"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={() => {
                  setOrderItems((prev) => {
                    const copy = [...prev];
                    copy[selectedItemIndex] = { ...copy[selectedItemIndex], comment: commentText };
                    return copy;
                  });
                  setIsCommentModalOpen(false);
                }}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold"
              >
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Checkout / Payment Modal */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[1px] p-4">
          <div className="bg-[#eff1f5] border-2 border-[#b0b8c5] rounded-md shadow-2xl w-full max-w-md flex flex-col text-slate-800 text-xs">
            {/* Header */}
            <div className="bg-gradient-to-r from-[#d9dfe8] to-[#c7d0de] border-b border-[#a8b3c4] px-3 py-2 flex items-center justify-between font-bold">
              <span>Оплата заказа: STOL - {currentTable.number}</span>
              <button
                onClick={() => setIsPaymentModalOpen(false)}
                className="text-xs font-bold text-slate-600 hover:text-rose-600"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="p-4 space-y-4">
              {/* Totals Banner */}
              <div className="bg-white border border-[#b8c2d1] rounded p-3 text-center shadow-inner">
                <span className="text-slate-500 font-semibold block text-xs">Итого к оплате (с 10% обслугой):</span>
                <span className="text-3xl font-black text-emerald-600 tracking-tight block my-1">
                  {formatUZS(totalAmount)} UZS
                </span>
                <span className="text-[11px] text-slate-400">
                  (Сумма блюд: {formatUZS(subtotal)} + Обслуга: {formatUZS(serviceFee)})
                </span>
              </div>

              {/* Payment Method Selector */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Способ оплаты:</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'cash', label: '💵 Наличные' },
                    { id: 'card', label: '💳 Карта (Humo/Uzcard)' },
                    { id: 'split', label: '⚖️ Раздельно' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPaymentMethod(m.id)}
                      className={`py-2 rounded border text-xs font-bold transition ${
                        paymentMethod === m.id
                          ? 'bg-blue-600 text-white border-blue-700 shadow-sm'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Cash given input if Cash */}
              {paymentMethod === 'cash' && (
                <div className="space-y-2 bg-white border border-[#b8c2d1] p-3 rounded shadow-inner">
                  <label className="block font-semibold text-slate-700 text-xs">
                    Получено от клиента (сум):
                  </label>
                  <input
                    type="number"
                    value={cashGiven}
                    onChange={(e) => setCashGiven(e.target.value)}
                    placeholder={String(totalAmount)}
                    className="w-full px-3 py-1.5 text-base font-bold bg-slate-50 border rounded focus:outline-none"
                  />
                  {/* Quick cash amounts */}
                  <div className="flex gap-1.5 pt-1">
                    {[50000, 100000, 200000].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setCashGiven(String(amt))}
                        className="px-2 py-1 bg-slate-100 hover:bg-slate-200 border rounded text-[10px] font-semibold text-slate-700"
                      >
                        {formatUZS(amt)}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setCashGiven(String(totalAmount))}
                      className="px-2 py-1 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded text-[10px] font-bold text-blue-700"
                    >
                      Точно
                    </button>
                  </div>
                  {/* Change calculation */}
                  {Number(cashGiven) > totalAmount && (
                    <div className="pt-1 text-emerald-700 font-bold text-xs flex justify-between">
                      <span>Сдача:</span>
                      <span>{formatUZS(Number(cashGiven) - totalAmount)} UZS</span>
                    </div>
                  )}
                </div>
              )}

              {/* Fiscal REGOS notice */}
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded text-[11px] text-emerald-900 flex items-center gap-2">
                <span className="text-xl">🧾</span>
                <div>
                  <strong>Soliq.uz / REGOS VCR Fiskal Cheki</strong>
                  <p className="text-[10px] text-emerald-800">
                    To'lov amalga oshirilgach, QR-kodli fiskal chek avtomatik shakllanadi.
                  </p>
                </div>
              </div>
            </div>

            {/* Footer buttons */}
            <div className="bg-[#e4e8ef] border-t border-[#c2cbd8] px-4 py-3 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setIsPaymentModalOpen(false)}
                className="px-4 py-2 bg-white border border-slate-300 rounded font-semibold text-slate-700 hover:bg-slate-50"
              >
                Отмена
              </button>
              <button
                type="button"
                disabled={isProcessingPayment}
                onClick={handlePay}
                className="px-5 py-2 bg-gradient-to-b from-[#34a853] to-[#1e8e3e] hover:from-[#3bbb5c] hover:to-[#1a7f37] text-white border border-[#187532] rounded font-black text-xs shadow-md flex items-center gap-2 active:translate-y-[1px]"
              >
                <span>✓</span>
                <span>{isProcessingPayment ? 'Fiskallashtirilmoqda...' : 'Завершить оплату'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5.5. Order Item Edit Modal (Soni, Narxi, Izoh tahrirlash) */}
      <JetCafeOrderItemEditModal
        isOpen={isOrderItemEditModalOpen}
        onClose={() => setIsOrderItemEditModalOpen(false)}
        item={selectedItemIndex !== null ? orderItems[selectedItemIndex] : null}
        onSaveItem={handleSaveOrderItem}
        onDeleteItem={handleDeleteOrderItem}
      />

      {/* 6. Item Cancellation Modal matching Video 2 (frame 6) */}
      <JetCafeItemCancelModal
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        item={selectedItemIndex !== null ? orderItems[selectedItemIndex] : null}
        onConfirmCancel={handleConfirmCancel}
      />

      {/* 7. Orders Journal & Reports Modal matching Video 2 (frames 5 & 7) */}
      <JetCafeOrdersJournalModal
        isOpen={isOrdersJournalOpen}
        onClose={() => setIsOrdersJournalOpen(false)}
      />

      {/* 8. JetBot Telegram Integration Modal matching JetCafe Video */}
      <JetCafeTelegramModal
        isOpen={isTelegramModalOpen}
        onClose={() => setIsTelegramModalOpen(false)}
      />

      {/* 9. Backend Developer API & Server Modal */}
      <JetCafeBackendModal
        isOpen={isBackendModalOpen}
        onClose={() => setIsBackendModalOpen(false)}
      />

      {/* 10. Mobil Savatlar Modal (Backend v2.0) */}
      <JetCafeMobileBasketsModal
        isOpen={isMobileBasketsModalOpen}
        onClose={() => setIsMobileBasketsModalOpen(false)}
        baskets={mobileBaskets}
        onLoadBasketToCart={handleLoadBasketToCart}
        onRefresh={loadMobileBaskets}
      />

    </div>
  );
}
