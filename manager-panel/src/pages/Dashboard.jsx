import React, { useContext } from 'react';
import { AppContext } from '../context/AppContext';
import { 
  BarChart3, 
  ShoppingBag, 
  Receipt, 
  AlertTriangle,
  MessageSquare,
  CreditCard,
  Calculator,
  Calendar
} from 'lucide-react';

export default function Dashboard({ setActiveTab, setSelectedBasketId }) {
  const { products, debts, employees, baskets, transactions, tenantDetails, billingSummary, t } = useContext(AppContext);

  // 1. Bugungi savdo summasi
  const displaySalesSum = tenantDetails?.today_sales 
    ? tenantDetails.today_sales 
    : `${(24850000 + transactions.filter(t => t.date === new Date().toISOString().split('T')[0]).reduce((sum, t) => sum + t.total, 0)).toLocaleString()} UZS`;

  // 2. Faol savatlar soni
  const displayBasketsCount = baskets.length;

  // 3. Jami qarz summasi
  const displayDebtSum = tenantDetails?.total_debts
    ? tenantDetails.total_debts
    : `${debts.reduce((sum, d) => sum + d.amount, 0).toLocaleString()} UZS`;

  // 4. Kam qolgan mahsulotlar turlari soni
  const lowStockProducts = products.filter(p => p.stock <= p.minStock && !p.archived);
  const lowStockCount = lowStockProducts.length;

  // Xodimlar va ularning faol savatlarining umumiy summasi
  const workerCards = employees.filter(emp => emp.active).map(emp => {
    const empBaskets = baskets.filter(b => b.employeeId === emp.id);
    const empBasketsCount = empBaskets.length;
    
    const empBasketsSum = empBaskets.reduce((totalSum, b) => {
      const basketSum = b.items.reduce((itemSum, item) => itemSum + (item.price * item.quantity), 0);
      const discount = b.discountPercent ? Math.round(basketSum * (b.discountPercent / 100)) : 0;
      return totalSum + (basketSum - discount);
    }, 0);

    return {
      id: emp.id,
      name: emp.name,
      avatar: emp.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=100",
      online: emp.online,
      lastSeen: emp.lastSeen,
      count: empBasketsCount,
      sum: empBasketsSum
    };
  });

  const handleWorkerCardClick = (workerId) => {
    const workerBaskets = baskets.filter(b => b.employeeId === workerId);
    if (workerBaskets.length > 0) {
      setSelectedBasketId(workerBaskets[0].id);
    }
    setActiveTab('sales');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Overview Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Bugungi savdo */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-start justify-between">
          <div className="space-y-2">
            <span className="text-sm font-medium text-slate-400">{t('bugungiSavdo')}</span>
            <h3 className="text-2xl font-bold text-slate-800">{displaySalesSum}</h3>
            <p className="text-xs text-green-500 font-medium">{t('savdoTrend')}</p>
          </div>
          <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-500">
            <BarChart3 className="w-6 h-6" />
          </div>
        </div>

        {/* Faol savatlar */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-start justify-between">
          <div className="space-y-2">
            <span className="text-sm font-medium text-slate-400">{t('faolSavatlar')}</span>
            <h3 className="text-2xl font-bold text-slate-800">{displayBasketsCount} {t('basketsSuffix')}</h3>
            <p className="text-xs text-slate-400 font-normal">{t('faolSavatlarSub')}</p>
          </div>
          <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-500">
            <ShoppingBag className="w-6 h-6" />
          </div>
        </div>

        {/* Qarz summasi */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-start justify-between">
          <div className="space-y-2">
            <span className="text-sm font-medium text-slate-400">{t('qarzSummasi')}</span>
            <h3 className="text-2xl font-bold text-slate-800">{displayDebtSum}</h3>
            <p className="text-xs text-red-400 font-medium">{t('qarzSummasiSub')}</p>
          </div>
          <div className="w-12 h-12 bg-rose-50 rounded-xl flex items-center justify-center text-rose-500">
            <Receipt className="w-6 h-6" />
          </div>
        </div>

        {/* Kam qolgan mahsulotlar */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-start justify-between">
          <div className="space-y-2">
            <span className="text-sm font-medium text-slate-400">{t('kamQolgan')}</span>
            <h3 className="text-2xl font-bold text-slate-800">{lowStockCount} {t('lowStockSuffix')}</h3>
            <p className="text-xs text-amber-500 font-medium">{t('kamQolganSub')}</p>
          </div>
          <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center text-amber-500">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Oylik To'lov va SMS Xizmatlari Ko'rsatkichi */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-indigo-300">
                <Calculator className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">{t('billingCardTitle')}</h3>
                <p className="text-xs text-indigo-200/70 flex items-center gap-1.5 mt-0.5">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{t('billingPeriod')}: {billingSummary?.billing_period || 'Joriy oy'}</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-indigo-500/20 text-indigo-200 border border-indigo-400/30 rounded-full text-xs font-semibold">
                {t('billingPricePerSms')}: {billingSummary?.sms_unit_price || 100} UZS
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. SMS Ishlatilgan soni */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-1">
              <div className="flex items-center gap-2 text-indigo-200 text-xs font-medium">
                <MessageSquare className="w-3.5 h-3.5" />
                <span>{t('billingSmsUsed')}</span>
              </div>
              <p className="text-xl font-bold text-white tracking-tight">
                {billingSummary?.sms_used_count || 0} <span className="text-xs font-normal text-indigo-200">ta</span>
              </p>
            </div>

            {/* 2. SMS Xarajati */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-1">
              <div className="flex items-center gap-2 text-indigo-200 text-xs font-medium">
                <CreditCard className="w-3.5 h-3.5" />
                <span>{t('billingSmsCost')}</span>
              </div>
              <p className="text-xl font-bold text-amber-300 tracking-tight">
                {(billingSummary?.sms_total_cost || 0).toLocaleString()} <span className="text-xs font-normal text-indigo-200">UZS</span>
              </p>
            </div>

            {/* 3. Oylik Abonent To'lovi */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-1">
              <div className="flex items-center gap-2 text-indigo-200 text-xs font-medium">
                <Calendar className="w-3.5 h-3.5" />
                <span>{t('billingSubFee')}</span>
              </div>
              <p className="text-xl font-bold text-indigo-100 tracking-tight">
                {(billingSummary?.subscription_monthly_fee || 250000).toLocaleString()} <span className="text-xs font-normal text-indigo-200">UZS</span>
              </p>
            </div>

            {/* 4. Jami To'lov */}
            <div className="bg-indigo-600/30 border border-indigo-400/30 rounded-xl p-4 space-y-1">
              <div className="flex items-center gap-2 text-indigo-200 text-xs font-semibold">
                <Calculator className="w-3.5 h-3.5" />
                <span>{t('billingTotalDue')}</span>
              </div>
              <p className="text-xl font-extrabold text-emerald-400 tracking-tight">
                {(billingSummary?.total_due_amount || 250000).toLocaleString()} <span className="text-xs font-normal text-indigo-200">UZS</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Faol savatlar bo'limi */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-800">{t('faolSavatlar')}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {workerCards.map((card) => {
            // Translate the "last seen" text dynamically
            let lastSeenText = card.lastSeen;
            if (lastSeenText && lastSeenText.includes('daqiqa oldin')) {
              const minutes = lastSeenText.replace(/\D/g, '');
              lastSeenText = `${minutes}${t('minutesAgo')}`;
            }

            return (
              <div 
                key={card.id}
                onClick={() => handleWorkerCardClick(card.id)}
                className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-brand-100 cursor-pointer transition-all flex flex-col gap-4"
              >
                {/* Header profile info */}
                <div className="flex items-center gap-3">
                  <img 
                    src={card.avatar} 
                    alt={card.name} 
                    className="w-10 h-10 rounded-full object-cover border border-slate-100"
                    onError={(e) => {
                      e.target.src = "https://cdn-icons-png.flaticon.com/512/3135/3135715.png";
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-slate-800 truncate">{card.name}</h4>
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${card.online ? 'bg-green-500' : 'bg-slate-300'}`}></span>
                      <span className="text-xs text-slate-400">
                        {card.online ? t('onlineStatus') : `${t('lastSeenStatus')}${lastSeenText}`}
                      </span>
                    </div>
                  </div>
                </div>
                {/* Basket details */}
                <div className="border-t border-slate-50 pt-3">
                  <p className="text-xs text-slate-400 font-normal">{card.count} {t('basketsSuffix')}</p>
                  <p className="text-base font-bold text-brand-600 mt-0.5">{card.sum.toLocaleString()} UZS</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Kam qolgan mahsulotlar jadvali */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-50 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800">{t('lowStockTitle')}</h2>
          <button 
            onClick={() => setActiveTab('warehouse')}
            className="text-xs font-semibold text-amber-600 bg-amber-50 px-3 py-1.5 rounded-xl hover:bg-amber-100 transition-all"
          >
            {t('refillPending')}
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-50">
                <th className="py-4 px-6">{t('tableProdName')}</th>
                <th className="py-4 px-6 text-right">{t('tableCurrentStock')}</th>
                <th className="py-4 px-6 text-right">{t('tableWarningLimit')}</th>
                <th className="py-4 px-6 text-center">{t('tableStatus')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-sm text-slate-600">
              {lowStockProducts.length > 0 ? (
                lowStockProducts.map((p) => {
                  const percent = p.stock / p.minStock;
                  const isCritical = percent <= 0.3;
                  
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/50 transition-all">
                      <td className="py-4 px-6 font-semibold text-slate-800">{p.name}</td>
                      <td className="py-4 px-6 text-right font-bold text-slate-700">{p.stock} {t(`unit_${p.sUnit}`)}</td>
                      <td className="py-4 px-6 text-right font-normal text-slate-400">{p.minStock} {t(`unit_${p.sUnit}`)}</td>
                      <td className="py-4 px-6 text-center">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${
                          isCritical 
                            ? 'bg-rose-50 text-rose-500' 
                            : 'bg-amber-50 text-amber-500'
                        }`}>
                          {isCritical ? t('statusCritical') : t('statusLow')}
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={4} className="py-8 px-6 text-center text-slate-400 font-normal">
                    {t('noLowStock')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
