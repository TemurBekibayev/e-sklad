import React, { useState, useContext } from 'react';
import { AppContext } from '../context/AppContext';
import { 
  AlertTriangle, 
  ChevronDown, 
  TrendingUp, 
  Activity, 
  Coins, 
  CreditCard, 
  BookOpen, 
  CalendarDays,
  ShieldAlert,
  Flame,
  Clock,
  UserCheck
} from 'lucide-react';

export default function Reports({ setActiveTab }) {
  const { products, debts, employees, transactions, tenantDetails, auditLogs, language, t } = useContext(AppContext);
  const [activeRange, setActiveRange] = useState('week');
  const [selectedCell, setSelectedCell] = useState(null); // { day, slot }

  // Dynamic calculations based on real transactions & debts
  const totalSalesSum = transactions.reduce((sum, tx) => sum + (tx.amount || tx.total || 0), 0);
  const displayTotal = totalSalesSum;
  
  const cashTotal = transactions.filter(t => t.type === 'cash').reduce((sum, tx) => sum + (tx.amount || tx.total || 0), 0);
  const cardTotal = transactions.filter(t => t.type === 'card').reduce((sum, tx) => sum + (tx.amount || tx.total || 0), 0);
  const debtTotal = debts.reduce((sum, d) => sum + (d.amount || 0), 0);

  // Dynamic low stock warning count
  const lowStockCount = products.filter(p => p.stock <= p.minStock && !p.archived).length;

  // Time Slots for Heatmap
  const timeSlots = [
    { id: 'morning', labelUz: '09:00 - 12:00', labelRu: '09:00 - 12:00' },
    { id: 'lunch', labelUz: '12:00 - 15:00', labelRu: '12:00 - 15:00' },
    { id: 'evening', labelUz: '15:00 - 18:00', labelRu: '15:00 - 18:00' },
    { id: 'night', labelUz: '18:00 - 22:00', labelRu: '18:00 - 22:00' }
  ];

  const daysOfWeek = [
    { id: 1, dayUz: 'Dushanba', dayRu: 'Понедельник' },
    { id: 2, dayUz: 'Seshanba', dayRu: 'Вторник' },
    { id: 3, dayUz: 'Chorshanba', dayRu: 'Среда' },
    { id: 4, dayUz: 'Payshanba', dayRu: 'Четверг' },
    { id: 5, dayUz: 'Juma', dayRu: 'Пятница' },
    { id: 6, dayUz: 'Shanba', dayRu: 'Суббота' },
    { id: 0, dayUz: 'Yakshanba', dayRu: 'Воскресенье' }
  ];

  // Daily Heatmap Sales density matrix calculated dynamically
  const heatmapData = daysOfWeek.map(d => {
    const dayTxs = transactions.filter(t => {
      const date = new Date(t.date);
      return date.getDay() === d.id;
    });
    const dayTotal = dayTxs.reduce((sum, t) => sum + (t.amount || t.total || 0), 0);

    const getSlotSum = (startHour, endHour) => {
      return dayTxs.filter(t => {
        const hour = new Date(t.date).getHours();
        return hour >= startHour && hour < endHour;
      }).reduce((sum, t) => sum + (t.amount || t.total || 0), 0);
    };

    const morningM = Number((getSlotSum(9, 12) / 1000000).toFixed(1));
    const lunchM = Number((getSlotSum(12, 15) / 1000000).toFixed(1));
    const eveningM = Number((getSlotSum(15, 18) / 1000000).toFixed(1));
    const nightM = Number((getSlotSum(18, 22) / 1000000).toFixed(1));

    const cashSum = dayTxs.filter(t => t.type === 'cash').reduce((sum, t) => sum + (t.amount || t.total || 0), 0);
    const cardSum = dayTxs.filter(t => t.type === 'card').reduce((sum, t) => sum + (t.amount || t.total || 0), 0);
    const debtSum = dayTxs.filter(t => t.type === 'debt' || t.type === 'mixed').reduce((sum, t) => sum + (t.amount || t.total || 0), 0);

    const cashPct = dayTotal > 0 ? Math.round((cashSum / dayTotal) * 100) : 0;
    const cardPct = dayTotal > 0 ? Math.round((cardSum / dayTotal) * 100) : 0;
    const debtPct = dayTotal > 0 ? Math.round((debtSum / dayTotal) * 100) : 0;

    return {
      dayId: d.id,
      nameUz: d.dayUz,
      nameRu: d.dayRu,
      morning: morningM,
      lunch: lunchM,
      evening: eveningM,
      night: nightM,
      txCount: dayTxs.length,
      cash: cashPct,
      card: cardPct,
      debt: debtPct
    };
  });

  // Sales comparison calculated dynamically
  const weeklyProgress = daysOfWeek.map(d => {
    const dayTxSum = transactions.filter(t => {
      const date = new Date(t.date);
      return date.getDay() === d.id;
    }).reduce((sum, t) => sum + (t.amount || t.total || 0), 0);

    const joriyM = Number((dayTxSum / 1000000).toFixed(1));
    return {
      dayUz: d.dayUz,
      dayRu: d.dayRu,
      joriy: joriyM,
      otgan: 0
    };
  });

  // Colors based on sales volume
  const getHeatmapColor = (value) => {
    if (value < 2.0) return 'bg-blue-50/70 hover:bg-blue-100 text-blue-700';
    if (value < 4.0) return 'bg-blue-100/90 hover:bg-blue-200 text-blue-800';
    if (value < 6.0) return 'bg-blue-300 hover:bg-blue-400 text-white';
    if (value < 8.0) return 'bg-blue-500 hover:bg-blue-600 text-white';
    return 'bg-blue-700 hover:bg-blue-800 text-white';
  };

  const getHeatmapLabel = (value) => {
    return `${value.toFixed(1)}M UZS`;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Left tabs */}
        <div className="flex bg-white p-1 rounded-xl border border-slate-100 shadow-sm">
          {['today', 'week', 'month', 'year'].map((range) => (
            <button 
              key={range}
              onClick={() => setActiveRange(range)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeRange === range ? 'bg-brand-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {t(`tab${range.charAt(0).toUpperCase() + range.slice(1)}`)}
            </button>
          ))}
        </div>

        {/* Right date display */}
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm text-slate-700 font-semibold shadow-sm cursor-pointer hover:border-slate-300 transition-all">
          <span>{new Date().toLocaleDateString('ru-RU')}</span>
          <ChevronDown className="w-4 h-4 text-slate-400" />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Jami Savdo */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-2">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t('menuSales')}</span>
          <h3 className="text-xl font-bold text-slate-800">{displayTotal.toLocaleString()} UZS</h3>
          <p className="text-[10px] text-slate-400">
            {language === 'uz' ? 'Tahlil qilinayotgan davrda' : 'За анализируемый период'}
          </p>
        </div>

        {/* Naqd */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-2">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            {language === 'uz' ? "Naqd to'lovlar" : 'Наличными'}
          </span>
          <h3 className="text-xl font-bold text-slate-800">{cashTotal.toLocaleString()} UZS</h3>
          <p className="text-[10px] text-brand-600 font-medium">
            {language === 'uz' ? 'Savdolardan 60% ulush' : '60% от продаж'}
          </p>
        </div>

        {/* Karta */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-2">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            {language === 'uz' ? 'Karta orqali' : 'По карте'}
          </span>
          <h3 className="text-xl font-bold text-slate-800">{cardTotal.toLocaleString()} UZS</h3>
          <p className="text-[10px] text-brand-600 font-medium">
            {language === 'uz' ? 'Savdolardan 30% ulush' : '30% от продаж'}
          </p>
        </div>

        {/* Qarzlar */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-2">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            {language === 'uz' ? 'Qarzlar ulushi' : 'В долг'}
          </span>
          <h3 className="text-xl font-bold text-slate-800">{debtTotal.toLocaleString()} UZS</h3>
          <p className="text-[10px] text-brand-600 font-medium">
            {language === 'uz' ? 'Savdolardan 10% ulush' : '10% от продаж'}
          </p>
        </div>
      </div>

      {/* NEW INTERACTIVE GRID HEATMAP (No columns, no curves) */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-50 pb-4">
          <div className="space-y-1 flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center text-orange-600">
              <Flame className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                {language === 'uz' ? "Savdo zichligi xaritasi (Soatlar va Kunlar)" : 'Тепловая карта плотности продаж (Часы и Дни)'}
              </h3>
              <p className="text-xs text-slate-400 font-semibold">
                {language === 'uz' 
                  ? "Kunlik eng faol soatlarni aniqlash uchun kataklar ustiga bosing" 
                  : 'Кликните на ячейки для анализа пиковых часов продаж по дням недели'}
              </p>
            </div>
          </div>
        </div>

        {/* Heatmap Layout */}
        <div className="overflow-x-auto">
          <div className="min-w-[650px] space-y-3">
            {/* Headers row */}
            <div className="grid grid-cols-5 items-center gap-3 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">
              <div className="text-left pl-2">{language === 'uz' ? 'Kun' : 'День'}</div>
              {timeSlots.map(slot => (
                <div key={slot.id} className="flex items-center justify-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{language === 'uz' ? slot.labelUz : slot.labelRu}</span>
                </div>
              ))}
            </div>

            {/* Days rows */}
            {heatmapData.map((day) => (
              <div key={day.dayId} className="grid grid-cols-5 gap-3 items-center">
                {/* Day name */}
                <div className="text-sm font-bold text-slate-700 text-left pl-2">
                  {language === 'uz' ? day.nameUz : day.nameRu}
                </div>

                {/* Heatmap cells */}
                {timeSlots.map((slot) => {
                  const val = day[slot.id];
                  const isSelected = selectedCell?.dayId === day.dayId && selectedCell?.slotId === slot.id;
                  
                  return (
                    <div
                      key={slot.id}
                      onClick={() => setSelectedCell({ 
                        dayId: day.dayId, 
                        slotId: slot.id, 
                        dayName: language === 'uz' ? day.nameUz : day.nameRu,
                        timeLabel: language === 'uz' ? slot.labelUz : slot.labelRu,
                        salesVal: val,
                        txCount: Math.round(val * 4.2),
                        cash: day.cash,
                        card: day.card,
                        debt: day.debt
                      })}
                      className={`py-3.5 rounded-2xl text-center font-bold text-xs cursor-pointer transition-all border shadow-sm ${getHeatmapColor(val)} ${
                        isSelected 
                          ? 'border-brand-500 ring-2 ring-brand-100 shadow-md transform scale-105' 
                          : 'border-transparent'
                      }`}
                    >
                      {getHeatmapLabel(val)}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Dynamic Day Detail Panel */}
      {selectedCell && (
        <div className="bg-slate-50 border border-slate-100 rounded-3xl p-6 space-y-6 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-brand-600" />
              <div>
                <h4 className="text-sm font-bold text-slate-800">
                  {selectedCell.dayName} ({selectedCell.timeLabel}) {language === 'uz' ? "tafsiloti" : "детали"}
                </h4>
                <p className="text-xs text-slate-400 font-semibold">
                  {language === 'uz' ? "Ushbu vaqt oralig'idagi to'lovlar taqsimoti" : 'Распределение платежей за этот интервал времени'}
                </p>
              </div>
            </div>
            <button 
              onClick={() => setSelectedCell(null)}
              className="text-xs font-bold text-slate-500 hover:text-slate-800 bg-white border border-slate-200 px-3.5 py-2 rounded-xl transition-all shadow-sm"
            >
              {language === 'uz' ? "Tozalash" : 'Сбросить'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Sales Card */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100/80 shadow-sm flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('bugungiSavdo')}</span>
                <p className="text-lg font-black text-slate-800">{(selectedCell.salesVal * 1000000).toLocaleString()} UZS</p>
              </div>
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-500">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>

            {/* Baskets count Card */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100/80 shadow-sm flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{language === 'uz' ? "Tranzaksiyalar soni" : "Количество чеков"}</span>
                <p className="text-lg font-black text-slate-800">{selectedCell.txCount} {t('basketsSuffixShort')}</p>
              </div>
              <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-500">
                <Activity className="w-5 h-5" />
              </div>
            </div>

            {/* Payment split Card */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100/80 shadow-sm space-y-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{language === 'uz' ? "To'lov ulushi" : "Доли оплаты"}</span>
              <div className="space-y-2">
                {/* Naqd */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-bold text-slate-500">
                    <span className="flex items-center gap-1"><Coins className="w-3 h-3 text-amber-500" /> Naqd</span>
                    <span>{selectedCell.cash}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-amber-500 h-full" style={{ width: `${selectedCell.cash}%` }}></div>
                  </div>
                </div>
                {/* Karta */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-bold text-slate-500">
                    <span className="flex items-center gap-1"><CreditCard className="w-3 h-3 text-emerald-500" /> Karta</span>
                    <span>{selectedCell.card}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-emerald-500 h-full" style={{ width: `${selectedCell.card}%` }}></div>
                  </div>
                </div>
                {/* Qarz */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-bold text-slate-500">
                    <span className="flex items-center gap-1"><BookOpen className="w-3 h-3 text-rose-500" /> Qarz</span>
                    <span>{selectedCell.debt}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-rose-500 h-full" style={{ width: `${selectedCell.debt}%` }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Comparison Progress Lists (No charts, custom styling) */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-800">
          {language === 'uz' ? "Haftalik taqqoslama savdo ko'rsatkichi" : 'Показатель недельных продаж по сравнению с прошлой неделей'}
        </h3>
        <div className="space-y-3.5">
          {weeklyProgress.map((day, idx) => {
            const maxVal = 30; // Max reference value
            const currentPct = (day.joriy / maxVal) * 100;
            const pastPct = (day.otgan / maxVal) * 100;

            return (
              <div key={idx} className="space-y-1.5">
                <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                  <span>{language === 'uz' ? day.dayUz : day.dayRu}</span>
                  <div className="flex gap-4">
                    <span className="text-brand-600">{day.joriy.toFixed(1)}M</span>
                    <span className="text-slate-400">({day.otgan.toFixed(1)}M)</span>
                  </div>
                </div>
                {/* Progress bar overlays */}
                <div className="w-full bg-slate-50 h-3 rounded-full relative overflow-hidden border border-slate-100 shadow-inner">
                  {/* Past week progress */}
                  <div 
                    className="absolute left-0 top-0 bottom-0 bg-slate-200 border-r-2 border-dashed border-slate-400 transition-all duration-500" 
                    style={{ width: `${pastPct}%` }}
                  ></div>
                  {/* Current week progress */}
                  <div 
                    className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500" 
                    style={{ width: `${currentPct}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tables grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left: Employee performance */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-50">
            <h4 className="text-sm font-bold text-slate-700">{t('employeeAnalysisTitle')}</h4>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/50 font-semibold text-slate-400 uppercase border-b border-slate-50">
                  <th className="py-3 px-4">{t('tableEmployee')}</th>
                  <th className="py-3 px-4 text-center">{t('faolSavatlar')}</th>
                  <th className="py-3 px-4 text-right">{t('tableSum')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-slate-600 font-medium">
                {employees.length === 0 ? (
                  <tr>
                    <td colSpan="3" className="py-6 text-center text-slate-400">
                      {language === 'uz' ? "Xodimlar ma'lumotlari mavjud emas" : "Нет данных о сотрудниках"}
                    </td>
                  </tr>
                ) : (
                  employees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-slate-50/50 transition-all">
                      <td className="py-3.5 px-4 font-bold text-slate-800">{emp.name}</td>
                      <td className="py-3.5 px-4 text-center text-slate-400">{emp.salesCount || 0} {t('basketsSuffixShort')}</td>
                      <td className="py-3.5 px-4 text-right font-bold text-brand-600">{(emp.salesAmount || 0).toLocaleString()} UZS</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Top Selling Products */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-50">
            <h4 className="text-sm font-bold text-slate-700">{t('topSellingProductsTitle')}</h4>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/50 font-semibold text-slate-400 uppercase border-b border-slate-50">
                  <th className="py-3 px-4">{t('tableProdName')}</th>
                  <th className="py-3 px-4 text-center">{t('tableQty')}</th>
                  <th className="py-3 px-4 text-right">{t('tableSum')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-slate-600 font-medium">
                {products.length === 0 ? (
                  <tr>
                    <td colSpan="3" className="py-6 text-center text-slate-400">
                      {language === 'uz' ? "Mahsulotlar mavjud emas" : "Нет товаров"}
                    </td>
                  </tr>
                ) : (
                  products.slice(0, 5).map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/50 transition-all">
                      <td className="py-3.5 px-4 font-bold text-slate-800">{p.name}</td>
                      <td className="py-3.5 px-4 text-center text-slate-400">{p.stock || 0} {t(`unit_${p.sUnit}`) || 'dona'}</td>
                      <td className="py-3.5 px-4 text-right font-bold text-slate-800">{(p.price || 0).toLocaleString()} UZS</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Low stock critical warning banner */}
      {lowStockCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-3xl p-5 flex flex-wrap items-center justify-between gap-4 shadow-sm shadow-amber-50/50">
          <div className="flex items-center gap-3.5 text-amber-700">
            <AlertTriangle className="w-6 h-6 text-amber-500 shrink-0" />
            <span className="font-semibold text-sm">
              {t('criticalStockWarning', { qty: lowStockCount })}
            </span>
          </div>
          <button 
            onClick={() => setActiveTab('warehouse')}
            className="border-2 border-amber-500 hover:bg-amber-500 hover:text-white text-amber-600 font-bold px-4 py-2 rounded-xl text-xs transition-all bg-white"
          >
            {t('fillStockBtn')}
          </button>
        </div>
      )}

      {/* NEW SECURITY AUDIT LOG SECTION (Requirement 5.1 & 3.5 Compliance) */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden p-6 space-y-4">
        <div className="flex items-center gap-2.5 border-b border-slate-50 pb-3">
          <ShieldAlert className="w-5 h-5 text-rose-500 animate-pulse" />
          <div>
            <h4 className="text-sm font-bold text-slate-800">
              {language === 'uz' ? "Tizim Xavfsizlik Auditi" : 'Аудит безопасности системы'}
            </h4>
            <p className="text-xs text-slate-400 font-semibold">
              {language === 'uz' 
                ? "Foydalanuvchilar va ma'lumotlar ustidagi barcha amallarning audit jurnali (Requirement 5.1)" 
                : 'Журнал аудита действий пользователей и изменений данных (Требование 5.1)'}
            </p>
          </div>
        </div>

        <div className="overflow-x-auto max-h-60 overflow-y-auto border border-slate-100 rounded-2xl">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 font-bold text-slate-500 border-b border-slate-100">
                <th className="py-2.5 px-4">{language === 'uz' ? "Sana / Vaqt" : "Дата / Время"}</th>
                <th className="py-2.5 px-4">{language === 'uz' ? "Amal" : "Действие"}</th>
                <th className="py-2.5 px-4">{language === 'uz' ? "Tafsilotlar" : "Детали"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-slate-600 font-medium font-mono">
              {auditLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/50 transition-all">
                  <td className="py-2.5 px-4 text-slate-400 text-[10px] whitespace-nowrap">{log.time}</td>
                  <td className="py-2.5 px-4">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      log.action.includes('tuzatish') || log.action.includes('qaytarildi') 
                        ? 'bg-rose-50 text-rose-500' 
                        : log.action.includes('Yangi') 
                          ? 'bg-emerald-50 text-emerald-600' 
                          : 'bg-blue-50 text-blue-600'
                    }`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-slate-500 truncate max-w-xs" title={log.details}>
                    {log.details}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
