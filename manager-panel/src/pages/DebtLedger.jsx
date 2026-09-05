import React, { useState, useContext } from 'react';
import { AppContext } from '../context/AppContext';
import { 
  Search, 
  MessageSquare, 
  CheckCircle,
  AlertCircle,
  ShieldCheck
} from 'lucide-react';

export default function DebtLedger() {
  const { debts, payDebt, sendSMS, t } = useContext(AppContext);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDebtId, setSelectedDebtId] = useState(debts[0]?.id || '');
  const [payAmount, setPayAmount] = useState('');

  const selectedDebt = debts.find(d => d.id === selectedDebtId);

  // Totals
  const totalDebtSum = debts.reduce((sum, d) => sum + d.amount, 0);
  const overdueCount = debts.filter(d => d.status === 'overdue').length;

  const handleSelectDebtor = (id) => {
    setSelectedDebtId(id);
    const debt = debts.find(d => d.id === id);
    if (debt) {
      setPayAmount(debt.amount.toString());
    }
  };

  const handlePaymentSubmit = (e) => {
    e.preventDefault();
    if (!selectedDebtId || !payAmount) return;
    
    payDebt(selectedDebtId, Number(payAmount));
    alert(t('paySuccess'));
    
    setPayAmount('');
    if (debts.length > 1) {
      const remaining = debts.filter(d => d.id !== selectedDebtId);
      if (remaining.length > 0) {
        setSelectedDebtId(remaining[0].id);
        setPayAmount(remaining[0].amount.toString());
      }
    } else {
      setSelectedDebtId('');
    }
  };

  const handlePayFull = () => {
    if (selectedDebt) {
      setPayAmount(selectedDebt.amount.toString());
    }
  };

  const filteredDebtors = debts.filter(d => {
    const q = searchQuery.toLowerCase();
    return d.name.toLowerCase().includes(q) || d.phone.includes(q);
  });

  const isFullPayment = selectedDebt && Number(payAmount) >= selectedDebt.amount;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl">
        {/* Total Debt */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-2">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t('totalDebtLabel')}</span>
          <h3 className="text-2xl font-bold text-slate-800">{totalDebtSum.toLocaleString()} UZS</h3>
        </div>

        {/* Overdue Debts */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-2">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t('overdueCountLabel')}</span>
          <div className="flex items-center gap-3">
            <h3 className="text-2xl font-bold text-rose-500">{overdueCount} {t('debtorsCountSuffix')}</h3>
            {overdueCount > 0 && (
              <span className="bg-rose-50 text-rose-500 text-[10px] font-bold px-2 py-1 rounded-lg">
                {t('activeWarningBadge')}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* LEFT: Debtors Table */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-lg font-bold text-slate-800">{t('debtorsListTitle')}</h2>
            
            {/* Search */}
            <div className="relative w-64">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
              <input
                type="text"
                placeholder={t('searchDebtorPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-brand-500 focus:bg-white transition-all font-medium"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 text-[11px] font-semibold text-slate-400 uppercase border-b border-slate-50">
                  <th className="py-3 px-4">{t('debtorNameCol')}</th>
                  <th className="py-3 px-4">{t('debtorPhoneCol')}</th>
                  <th className="py-3 px-4 text-right">{t('debtorCurrentCol')}</th>
                  <th className="py-3 px-4">{t('debtorLastCol')}</th>
                  <th className="py-3 px-4 text-center">{t('tableStatus')}</th>
                  <th className="py-3 px-4 text-center">{t('tableAmallar')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-sm text-slate-600 font-medium">
                {filteredDebtors.map((d) => (
                  <tr 
                    key={d.id} 
                    className={`hover:bg-slate-50/50 cursor-pointer transition-all ${selectedDebtId === d.id ? 'bg-slate-50' : ''}`}
                    onClick={() => handleSelectDebtor(d.id)}
                  >
                    <td className="py-4 px-4 font-semibold text-slate-800">{d.name}</td>
                    <td className="py-4 px-4 text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <span>{d.phone}</span>
                        {d.isPhoneVerified && (
                          <span title="SMS orqali tasdiqlangan" className="inline-flex text-emerald-600 bg-emerald-50 rounded-full p-0.5">
                            <ShieldCheck className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </div>
                    </td>
                    <td className={`py-4 px-4 text-right font-bold ${d.status === 'overdue' ? 'text-rose-500' : 'text-slate-800'}`}>
                      {d.amount.toLocaleString()} UZS
                    </td>
                    <td className="py-4 px-4 text-slate-400 text-xs">{d.lastPaymentDate}</td>
                    <td className="py-4 px-4 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        d.status === 'overdue' ? 'bg-rose-50 text-rose-500' : 'bg-emerald-50 text-emerald-500'
                      }`}>
                        {d.status === 'overdue' ? t('statusCritical') : t('statusNormal')}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleSelectDebtor(d.id)}
                          className="text-xs text-brand-600 hover:text-brand-800 font-bold hover:underline"
                        >
                          {t('actionPay')}
                        </button>
                        <span className="text-slate-300">|</span>
                        <button
                          onClick={() => sendSMS(d.id)}
                          className="text-xs text-slate-400 hover:text-slate-600 font-medium flex items-center gap-1"
                          title="SMS reminder"
                        >
                          <MessageSquare className="w-3 h-3" />
                          {t('actionSms')}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* RIGHT: To'lov qabul qilish panel */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-6">
          <h2 className="text-lg font-bold text-slate-800">{t('payFormTitle')}</h2>

          {selectedDebt ? (
            <form onSubmit={handlePaymentSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">{t('payDebtorLabel')}</label>
                <div className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5 text-slate-800 font-bold text-sm">
                  {selectedDebt.name}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">{t('debtorCurrentCol')}</label>
                <div className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5 text-rose-500 font-extrabold text-sm">
                  {selectedDebt.amount.toLocaleString()} UZS
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">{t('payAmountLabel')}</label>
                <div className="relative">
                  <input
                    type="text"
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-3 pr-16 py-2.5 text-slate-800 font-extrabold text-sm outline-none focus:border-brand-500"
                  />
                  <button
                    type="button"
                    onClick={handlePayFull}
                    className="absolute right-2 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-brand-50 hover:bg-brand-100 text-brand-600 rounded-lg text-xs font-bold transition-all"
                  >
                    {t('payFullBtn')}
                  </button>
                </div>
              </div>

              {isFullPayment && (
                <div className="bg-brand-50 border border-brand-100 rounded-xl p-3 text-brand-600 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-brand-500" />
                  <span>{t('fullPayWarning')}</span>
                </div>
              )}

              <div className="pt-2 space-y-2">
                <button
                  type="submit"
                  className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-2xl transition-all shadow-md shadow-brand-100 text-sm"
                >
                  {t('paySaveBtn')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPayAmount('');
                    setSelectedDebtId('');
                  }}
                  className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold rounded-2xl transition-all text-sm font-medium"
                >
                  {t('cancelBtn')}
                </button>
              </div>
            </form>
          ) : (
            <div className="text-center py-12 text-slate-400 space-y-2">
              <AlertCircle className="w-8 h-8 mx-auto text-slate-300" />
              <p className="text-sm font-semibold">{t('selectDebtorPrompt')}</p>
              <p className="text-xs">{t('selectDebtorSub')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
