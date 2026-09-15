import React, { useState } from 'react';
import { 
  Users, 
  CreditCard, 
  Banknote, 
  Layers, 
  Clock, 
  CheckCircle2, 
  Receipt, 
  X, 
  Coffee,
  User,
  Search,
  PlusCircle
} from 'lucide-react';

export default function CashierView({ 
  tables, 
  onSelectTable, 
  selectedTable, 
  activeOrder, 
  onCloseOrderPanel, 
  onCompletePayment, 
  currentUser,
  onOpenAddDish
}) {
  const [selectedRoom, setSelectedRoom] = useState('ASOSIY ZAL');
  const [showPayModal, setShowPayModal] = useState(false);
  const [payMethod, setPayMethod] = useState('cash'); // 'cash', 'card', 'split'
  const [cashAmount, setCashAmount] = useState(0);
  const [cardAmount, setCardAmount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  const formatPrice = (val) => new Intl.NumberFormat('uz-UZ').format(val || 0);

  // Statistics counters
  const freeCount = tables.filter((t) => t.status === 'free').length;
  const busyCount = tables.filter((t) => t.status === 'busy').length;
  const billCount = tables.filter((t) => t.status === 'bill_requested').length;
  const totalRevenue = tables.reduce((sum, t) => sum + (t.total_amount || 0), 0);

  const handleOpenPayment = () => {
    if (!activeOrder || !activeOrder.order) return;
    const total = activeOrder.order.total_amount;
    setPayMethod('cash');
    setCashAmount(total);
    setCardAmount(0);
    setShowPayModal(true);
  };

  const handleMethodChange = (method) => {
    setPayMethod(method);
    const total = activeOrder.order.total_amount;
    if (method === 'cash') {
      setCashAmount(total);
      setCardAmount(0);
    } else if (method === 'card') {
      setCashAmount(0);
      setCardAmount(total);
    } else if (method === 'split') {
      setCashAmount(Math.round(total / 2));
      setCardAmount(total - Math.round(total / 2));
    }
  };

  const handlePaySubmit = async () => {
    if (!activeOrder || !activeOrder.order) return;
    setIsProcessing(true);
    try {
      await onCompletePayment({
        orderId: activeOrder.order.id,
        tableId: selectedTable.id,
        paymentMethod: payMethod,
        cashAmount: Number(cashAmount),
        cardAmount: Number(cardAmount),
      });
      setShowPayModal(false);
    } catch (err) {
      alert("To'lovda xatolik yuz berdi: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 w-full min-h-full flex-1 bg-[#f3f6fa] text-slate-800 flex flex-col">
      {/* Top Header matching Image 1 */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-5 pb-3 border-b border-slate-200">
        <div className="flex items-center gap-3">
          {/* Orange Coffee Cup Icon */}
          <div className="w-12 h-12 rounded-2xl bg-[#ea580c] flex items-center justify-center text-white shadow-md shadow-orange-500/30 flex-shrink-0">
            <Coffee className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-tight">
              Stollar boshqaruvi
            </h1>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
              <User className="w-3.5 h-3.5" />
              <span>{currentUser?.name || 'impasto 1'}</span>
            </div>
          </div>
        </div>

        {/* Top Right Counters (matching Image 1) */}
        <div className="flex items-center gap-5 text-sm font-semibold text-slate-600 bg-white px-4 py-2 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span>Band: <strong className="text-slate-900">{busyCount}</strong></span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            <span>Bo'sh: <strong className="text-slate-900">{freeCount}</strong></span>
          </div>
          {billCount > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
              <span className="text-amber-600 font-bold">Hisob: {billCount}</span>
            </div>
          )}
          <div className="border-l border-slate-200 pl-3">
            <span>Jami: <strong className="text-[#ea580c]">{formatPrice(totalRevenue)} som</strong></span>
          </div>
        </div>
      </div>

      {/* Room Tabs matching Image 1 (ASOSIY ZAL, SOBOY) + Admin Quick Add Dish */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSelectedRoom('ASOSIY ZAL')}
            className={`px-5 py-2.5 rounded-xl font-bold text-sm tracking-wide transition-all ${
              selectedRoom === 'ASOSIY ZAL'
                ? 'bg-[#ea580c] text-white shadow-md shadow-orange-500/30'
                : 'bg-[#e2eaf5] text-slate-700 hover:bg-[#d5e2f0]'
            }`}
          >
            ASOSIY ZAL
          </button>

          <button
            onClick={() => setSelectedRoom('SOBOY')}
            className={`px-5 py-2.5 rounded-xl font-bold text-sm tracking-wide transition-all ${
              selectedRoom === 'SOBOY'
                ? 'bg-[#ea580c] text-white shadow-md shadow-orange-500/30'
                : 'bg-[#e2eaf5] text-slate-700 hover:bg-[#d5e2f0]'
            }`}
          >
            SOBOY
          </button>
        </div>

        {/* Admin/Manager Add Dish Button */}
        {(currentUser?.role === 'admin' || currentUser?.role === 'manager' || !currentUser) && (
          <button
            onClick={onOpenAddDish}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#ea580c] hover:bg-[#d94e08] text-white rounded-xl text-xs font-black shadow-md shadow-orange-500/25 active:scale-95 transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>➕ Yangi taom qo'shish</span>
          </button>
        )}
      </div>

      {/* Tables Grid (Matching Image 1: 5 columns x 4 rows = 20 tables) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4">
        {tables.map((table) => {
          const isFree = table.status === 'free';
          const isBusy = table.status === 'busy';
          const isBill = table.status === 'bill_requested';
          const isSelected = selectedTable && selectedTable.id === table.id;

          // Default light blue table styling from Image 1
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

          if (isSelected) {
            cardBg += ' ring-4 ring-[#ea580c] shadow-lg';
          }

          return (
            <button
              key={table.id}
              onClick={() => onSelectTable(table)}
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

      {/* Selected Table Order Drawer / Modal */}
      {selectedTable && (
        <div className="fixed inset-y-0 right-0 max-w-md w-full bg-white border-l border-slate-200 shadow-2xl z-40 flex flex-col">
          {/* Header */}
          <div className="p-5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-2xl font-black text-slate-900">
                  STOL - {selectedTable.number}
                </h3>
                {selectedTable.status === 'bill_requested' && (
                  <span className="text-xs font-black px-2 py-0.5 bg-amber-500 text-white rounded-md">
                    Hisob so'raldi
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Ofitsiant: {selectedTable.waiter_name || 'Biriktirilmagan'}
              </p>
            </div>
            <button
              onClick={onCloseOrderPanel}
              className="p-2 hover:bg-slate-200 text-slate-400 hover:text-slate-800 rounded-xl transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Order items content */}
          <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-[#f8fafc]">
            {activeOrder && activeOrder.items && activeOrder.items.length > 0 ? (
              activeOrder.items.map((item, idx) => (
                <div
                  key={idx}
                  className="bg-white border border-slate-200 p-3.5 rounded-2xl flex items-start justify-between gap-3 shadow-sm"
                >
                  <div>
                    <div className="font-bold text-slate-900 text-sm">
                      {item.product_name}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {item.quantity} x {formatPrice(item.price)} UZS
                    </div>
                    {item.comment && (
                      <div className="text-xs text-amber-700 font-medium mt-1 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 inline-block">
                        💬 Izoh: {item.comment}
                      </div>
                    )}
                  </div>
                  <div className="text-sm font-black text-[#ea580c]">
                    {formatPrice(item.price * item.quantity)} UZS
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-16 text-slate-400">
                <Receipt className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Bu stolda hozircha faol buyurtma yo'q</p>
              </div>
            )}
          </div>

          {/* Footer & Actions */}
          {activeOrder && activeOrder.order && (
            <div className="p-5 bg-white border-t border-slate-200 space-y-4 shadow-lg">
              <div className="flex items-center justify-between text-base">
                <span className="text-slate-500 font-medium">Jami hisob:</span>
                <span className="text-2xl font-black text-[#ea580c]">
                  {formatPrice(activeOrder.order.total_amount)} <span className="text-sm font-normal text-slate-500">UZS</span>
                </span>
              </div>

              <button
                onClick={handleOpenPayment}
                className="w-full py-4 rounded-2xl bg-[#ea580c] hover:bg-[#d94e08] text-white font-black text-lg shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2 active:scale-95 transition-all"
              >
                <CreditCard className="w-6 h-6" />
                <span>TO'LOVNI QABUL QILISH</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Payment Modal (Naqd, Karta, Aralash) */}
      {showPayModal && activeOrder && activeOrder.order && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-lg w-full shadow-2xl">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-xl font-black text-slate-900">
                  STOL - {selectedTable.number} To'lovi
                </h3>
                <p className="text-xs text-slate-500">
                  Fiskal chek Soliq.uz talablari bo'yicha shakllanadi
                </p>
              </div>
              <button
                onClick={() => setShowPayModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-800 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Total Amount Banner */}
            <div className="bg-orange-50 border border-orange-200 p-4 rounded-2xl text-center mb-5">
              <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
                To'lanadigan summa
              </span>
              <div className="text-3xl font-black text-[#ea580c] mt-0.5">
                {formatPrice(activeOrder.order.total_amount)} <span className="text-lg font-normal">UZS</span>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="grid grid-cols-3 gap-3 mb-5">
              <button
                type="button"
                onClick={() => handleMethodChange('cash')}
                className={`py-3.5 px-3 rounded-2xl border flex flex-col items-center gap-2 font-bold text-sm transition-all active:scale-95 ${
                  payMethod === 'cash'
                    ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-600/20'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Banknote className="w-6 h-6" />
                <span>Naqd pul</span>
              </button>

              <button
                type="button"
                onClick={() => handleMethodChange('card')}
                className={`py-3.5 px-3 rounded-2xl border flex flex-col items-center gap-2 font-bold text-sm transition-all active:scale-95 ${
                  payMethod === 'card'
                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/20'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <CreditCard className="w-6 h-6" />
                <span>Plastik Karta</span>
              </button>

              <button
                type="button"
                onClick={() => handleMethodChange('split')}
                className={`py-3.5 px-3 rounded-2xl border flex flex-col items-center gap-2 font-bold text-sm transition-all active:scale-95 ${
                  payMethod === 'split'
                    ? 'bg-[#ea580c] text-white border-orange-500 shadow-md shadow-orange-500/20'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Layers className="w-6 h-6" />
                <span>Aralash</span>
              </button>
            </div>

            {/* Split breakdown input if method === 'split' */}
            {payMethod === 'split' && (
              <div className="space-y-3 mb-5 p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                <div>
                  <label className="text-xs text-slate-500 block mb-1">Naqd qismi (UZS):</label>
                  <input
                    type="number"
                    value={cashAmount}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setCashAmount(val);
                      setCardAmount(activeOrder.order.total_amount - val);
                    }}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-bold"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 block mb-1">Karta qismi (UZS):</label>
                  <input
                    type="number"
                    value={cardAmount}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setCardAmount(val);
                      setCashAmount(activeOrder.order.total_amount - val);
                    }}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-bold"
                  />
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowPayModal(false)}
                className="w-1/3 py-3.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm"
              >
                Bekor qilish
              </button>

              <button
                type="button"
                onClick={handlePaySubmit}
                disabled={isProcessing}
                className="w-2/3 py-3.5 rounded-2xl bg-[#ea580c] hover:bg-[#d94e08] text-white font-black text-base shadow-lg shadow-orange-500/25 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <span>Fiskallashtirilmoqda...</span>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    <span>TO'LASH VA CHEK CHIQARISH</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
