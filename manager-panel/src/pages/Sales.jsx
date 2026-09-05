import React, { useState, useContext, useEffect } from 'react';
import { AppContext } from '../context/AppContext';
import { 
  Coins, 
  CreditCard, 
  BookOpen, 
  Layers, 
  User, 
  Phone,
  Undo2,
  Trash2,
  CheckCircle2,
  Search,
  ShoppingBag,
  ShieldCheck,
  KeyRound,
  Send,
  Loader2,
  AlertCircle
} from 'lucide-react';

export default function Sales({ selectedBasketId, setSelectedBasketId }) {
  const { 
    baskets, 
    products, 
    debts, 
    completeSale, 
    transactions, 
    refundTransaction,
    sendPhoneVerification,
    checkPhoneVerification,
    t
  } = useContext(AppContext);

  const [salesTab, setSalesTab] = useState('active'); // 'active' | 'history'

  const activeBasket = baskets.find(b => b.id === selectedBasketId) || baskets[0];

  const [discountType, setDiscountType] = useState('percent');
  const [discountValue, setDiscountValue] = useState('5');
  
  const [paymentMethod, setPaymentMethod] = useState('mixed');
  const [cashAmount, setCashAmount] = useState('50000');
  
  const [debtorName, setDebtorName] = useState('Farhod Alimov');
  const [debtorPhone, setDebtorPhone] = useState('+998 (90) 123-45-67');

  // Phone Verification States
  const [isPhoneVerified, setIsPhoneVerified] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpError, setOtpError] = useState('');
  const [otpSuccess, setOtpSuccess] = useState('');
  const [debugOtpCode, setDebugOtpCode] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (activeBasket) {
      setSelectedBasketId(activeBasket.id);
      if (activeBasket.id === '042') {
        setDiscountType('percent');
        setDiscountValue('5');
        setPaymentMethod('mixed');
        setCashAmount('50000');
        setDebtorName('Farhod Alimov');
        setDebtorPhone('+998 (90) 123-45-67');
      } else {
        setDiscountType('percent');
        setDiscountValue('0');
        setPaymentMethod('cash');
        setCashAmount('0');
        setDebtorName('');
        setDebtorPhone('');
      }
      setIsPhoneVerified(false);
      setOtpSent(false);
      setOtpCode('');
      setOtpError('');
      setOtpSuccess('');
      setDebugOtpCode('');
    }
  }, [selectedBasketId, activeBasket?.id]);

  const handlePhoneChange = (e) => {
    setDebtorPhone(e.target.value);
    setIsPhoneVerified(false);
    setOtpSent(false);
    setOtpCode('');
    setOtpError('');
    setOtpSuccess('');
    setDebugOtpCode('');
  };

  const handleSendOtp = async () => {
    if (!debtorPhone.trim() || debtorPhone.replace(/\D/g, '').length < 9) {
      setOtpError("Iltimos, to'liq telefon raqamini kiriting (masalan: +998901234567)");
      return;
    }

    setIsSendingOtp(true);
    setOtpError('');
    setOtpSuccess('');
    try {
      const res = await sendPhoneVerification(debtorPhone, debtorName);
      setOtpSent(true);
      setOtpSuccess(res.message || t('codeSentSuccess'));
      if (res.debug_code) {
        setDebugOtpCode(res.debug_code);
      }
    } catch (err) {
      setOtpError(err?.message || "SMS kod yuborishda xatolik yuz berdi");
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpCode || otpCode.length !== 4) {
      setOtpError("4 xonali kodni to'liq kiriting");
      return;
    }

    setIsVerifyingOtp(true);
    setOtpError('');
    try {
      const res = await checkPhoneVerification(debtorPhone, otpCode);
      setIsPhoneVerified(true);
      setOtpSuccess(res.message || t('codeVerifySuccess'));
      setOtpError('');
    } catch (err) {
      setOtpError(err?.message || t('codeVerifyFailed'));
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  if (!activeBasket && salesTab === 'active') {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className="flex items-center justify-between">
          <div className="flex bg-white p-1 rounded-xl border border-slate-100 shadow-sm">
            <button 
              onClick={() => setSalesTab('active')}
              className="px-4 py-2 rounded-lg text-sm font-semibold bg-brand-500 text-white shadow-sm"
            >
              {t('tabActiveBaskets')}
            </button>
            <button 
              onClick={() => setSalesTab('history')}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-500 hover:text-slate-800"
            >
              {t('tabCompletedSales')}
            </button>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-12 border border-slate-100 shadow-sm text-center max-w-md mx-auto space-y-4">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-400">
            <ShoppingBag className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">{t('noActiveBaskets')}</h3>
          <p className="text-sm text-slate-400">{t('noActiveBasketsSub')}</p>
          <button 
            onClick={() => setSalesTab('history')}
            className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-2xl text-sm transition-all shadow-md shadow-brand-100"
          >
            {t('viewHistoryBtn')}
          </button>
        </div>
      </div>
    );
  }

  const oraliqSumma = activeBasket?.items?.reduce((sum, item) => sum + ((Number(item.price) || 0) * (Number(item.quantity) || 0)), 0) || 0;
  
  let discountAmount = 0;
  if (discountType === 'percent') {
    discountAmount = Math.round(oraliqSumma * (Number(discountValue || 0) / 100));
  } else {
    discountAmount = Number(discountValue || 0);
  }

  const yakuniySumma = Math.max(0, oraliqSumma - discountAmount);
  const mixedDebtAmount = Math.max(0, yakuniySumma - Number(cashAmount || 0));

  const handleComplete = () => {
    if (!activeBasket) return;

    const isDebtSale = paymentMethod === 'debt' || (paymentMethod === 'mixed' && mixedDebtAmount > 0);

    if (isDebtSale) {
      if (!debtorName.trim()) {
        alert(t('debtorNameLabel') + '!');
        return;
      }
      if (!debtorPhone.trim() || debtorPhone.replace(/\D/g, '').length < 9) {
        alert("Iltimos, mijozning to'liq telefon raqamini kiriting!");
        return;
      }
      if (!isPhoneVerified) {
        alert(t('phoneVerificationRequired'));
        return;
      }
    }

    const details = {
      debtorName,
      phone: debtorPhone,
      cashAmount: Number(cashAmount),
      debtAmount: paymentMethod === 'debt' ? yakuniySumma : mixedDebtAmount,
      isPhoneVerified: isPhoneVerified
    };

    completeSale(activeBasket.id, paymentMethod, details);
    setSuccessMsg(t('salesSuccess'));
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Tabs */}
      <div className="flex items-center justify-between">
        <div className="flex bg-white p-1 rounded-xl border border-slate-100 shadow-sm">
          <button 
            onClick={() => setSalesTab('active')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              salesTab === 'active' 
                ? 'bg-brand-500 text-white shadow-sm' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {t('tabActiveBaskets')}
          </button>
          <button 
            onClick={() => setSalesTab('history')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              salesTab === 'history' 
                ? 'bg-brand-500 text-white shadow-sm' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {t('tabCompletedSales')}
          </button>
        </div>

        {salesTab === 'active' && baskets.length > 1 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium">{t('otherBaskets')}</span>
            <select 
              value={selectedBasketId}
              onChange={(e) => setSelectedBasketId(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-brand-500"
            >
              {baskets.map(b => (
                <option key={b.id} value={b.id}>Savat №{b.id} ({b.employeeName})</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-100 text-emerald-600 p-4 rounded-2xl flex items-center gap-3 font-semibold text-sm">
          <CheckCircle2 className="w-5 h-5" />
          <span>{successMsg}</span>
        </div>
      )}

      {salesTab === 'active' ? (
        /* SAVATNI YAKUNLASH EKRANI */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* LEFT: Savat tarkibi card */}
          <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800">{t('savatTarkibi')}</h2>
              <span className="text-xs text-slate-400 bg-slate-50 px-3 py-1.5 rounded-xl font-medium">
                {t('sotuvchiLabel')}: <span className="font-semibold text-slate-700">{activeBasket.employeeName}</span>
              </span>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 text-[11px] font-semibold text-slate-400 uppercase border-b border-slate-50">
                    <th className="py-3 px-4">{t('tableProdName')}</th>
                    <th className="py-3 px-4 text-center">{t('tableQty')}</th>
                    <th className="py-3 px-4 text-right">{t('tablePrice')}</th>
                    <th className="py-3 px-4 text-right">{t('tableSum')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-sm text-slate-600 font-medium">
                  {activeBasket.items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 transition-all">
                      <td className="py-4 px-4 text-slate-800 font-semibold">{item.productName}</td>
                      <td className="py-4 px-4 text-center font-bold text-slate-700">{item.quantity} {t(`unit_${item.unit}`)}</td>
                      <td className="py-4 px-4 text-right text-slate-400">{item.price.toLocaleString()} UZS</td>
                      <td className="py-4 px-4 text-right font-bold text-slate-800">{(item.price * item.quantity).toLocaleString()} UZS</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Chegirma kiritish */}
            <div className="pt-6 border-t border-slate-50 flex items-center justify-between flex-wrap gap-4">
              <span className="text-sm font-semibold text-slate-600">{t('chegirmaKiritish')}</span>
              <div className="flex items-center border border-slate-100 rounded-2xl p-1 bg-slate-50">
                <button 
                  onClick={() => setDiscountType('percent')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    discountType === 'percent' 
                      ? 'bg-white text-brand-600 shadow-sm border border-slate-100' 
                      : 'text-slate-400'
                  }`}
                >
                  {t('foizLabel')}
                </button>
                <button 
                  onClick={() => setDiscountType('amount')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    discountType === 'amount' 
                      ? 'bg-white text-brand-600 shadow-sm border border-slate-100' 
                      : 'text-slate-400'
                  }`}
                >
                  {t('somLabel')}
                </button>
                <input
                  type="text"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value.replace(/\D/g, ''))}
                  className="w-16 bg-transparent border-0 outline-none text-right px-2 font-bold text-slate-800 text-sm"
                />
                <span className="text-xs text-slate-400 pr-2 font-semibold">{discountType === 'percent' ? '%' : 'UZS'}</span>
              </div>
            </div>

            {/* Sums breakdown */}
            <div className="bg-slate-50/50 rounded-2xl p-5 space-y-3">
              <div className="flex justify-between text-sm text-slate-500">
                <span>{t('oraliqSumma')}</span>
                <span className="font-semibold text-slate-800">{oraliqSumma.toLocaleString()} UZS</span>
              </div>
              <div className="flex justify-between text-sm text-slate-500">
                <span>{t('chegirmaLabel')}</span>
                <span className="font-semibold text-rose-500">-{discountAmount.toLocaleString()} UZS</span>
              </div>
              <div className="flex justify-between text-base font-bold text-slate-800 border-t border-slate-100 pt-3">
                <span>{t('yakuniySumma')}</span>
                <span className="text-xl text-brand-600">{yakuniySumma.toLocaleString()} UZS</span>
              </div>
            </div>
          </div>

          {/* RIGHT: To'lov usuli panel */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-6 flex flex-col">
            <h2 className="text-lg font-bold text-slate-800">{t('toLovUsuli')}</h2>

            {/* Radio options */}
            <div className="space-y-3">
              {/* Naqd */}
              <label className={`flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition-all ${
                paymentMethod === 'cash' 
                  ? 'border-brand-500 bg-brand-50/30' 
                  : 'border-slate-100 bg-white hover:border-slate-200'
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${paymentMethod === 'cash' ? 'bg-brand-100 text-brand-600' : 'bg-slate-50 text-slate-500'}`}>
                    <Coins className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-bold text-slate-700">{t('paymentCash')}</span>
                </div>
                <input 
                  type="radio" 
                  name="payment" 
                  checked={paymentMethod === 'cash'} 
                  onChange={() => setPaymentMethod('cash')}
                  className="w-4 h-4 text-brand-600 focus:ring-brand-500 border-slate-300"
                />
              </label>

              {/* Karta */}
              <label className={`flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition-all ${
                paymentMethod === 'card' 
                  ? 'border-brand-500 bg-brand-50/30' 
                  : 'border-slate-100 bg-white hover:border-slate-200'
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${paymentMethod === 'card' ? 'bg-brand-100 text-brand-600' : 'bg-slate-50 text-slate-500'}`}>
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-bold text-slate-700">{t('paymentCard')}</span>
                </div>
                <input 
                  type="radio" 
                  name="payment" 
                  checked={paymentMethod === 'card'} 
                  onChange={() => setPaymentMethod('card')}
                  className="w-4 h-4 text-brand-600 focus:ring-brand-500 border-slate-300"
                />
              </label>

              {/* Qarz */}
              <label className={`flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition-all ${
                paymentMethod === 'debt' 
                  ? 'border-brand-500 bg-brand-50/30' 
                  : 'border-slate-100 bg-white hover:border-slate-200'
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${paymentMethod === 'debt' ? 'bg-brand-100 text-brand-600' : 'bg-slate-50 text-slate-500'}`}>
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-bold text-slate-700">{t('paymentDebt')}</span>
                </div>
                <input 
                  type="radio" 
                  name="payment" 
                  checked={paymentMethod === 'debt'} 
                  onChange={() => setPaymentMethod('debt')}
                  className="w-4 h-4 text-brand-600 focus:ring-brand-500 border-slate-300"
                />
              </label>

              {/* Aralash */}
              <label className={`flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition-all ${
                paymentMethod === 'mixed' 
                  ? 'border-brand-500 bg-brand-50/30' 
                  : 'border-slate-100 bg-white hover:border-slate-200'
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${paymentMethod === 'mixed' ? 'bg-brand-100 text-brand-600' : 'bg-slate-50 text-slate-500'}`}>
                    <Layers className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-bold text-slate-700">{t('paymentMixed')}</span>
                </div>
                <input 
                  type="radio" 
                  name="payment" 
                  checked={paymentMethod === 'mixed'} 
                  onChange={() => setPaymentMethod('mixed')}
                  className="w-4 h-4 text-brand-600 focus:ring-brand-500 border-slate-300"
                />
              </label>
            </div>

            {/* Conditional Sub-panels */}
            {paymentMethod === 'mixed' && (
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-4">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('mixedDetailsTitle')}</span>
                
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500">{t('mixedCashLabel')}</label>
                  <input
                    type="text"
                    value={cashAmount}
                    onChange={(e) => setCashAmount(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 font-bold text-sm outline-none focus:border-brand-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500">{t('mixedDebtLabel')}</label>
                  <div className="w-full bg-white border border-slate-100 rounded-xl px-3 py-2.5 text-rose-500 font-bold text-sm">
                    {mixedDebtAmount.toLocaleString()} UZS
                  </div>
                </div>
              </div>
            )}

            {/* Debt details */}
            {(paymentMethod === 'debt' || (paymentMethod === 'mixed' && mixedDebtAmount > 0)) && (
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('debtorDetailsTitle')}</span>
                  {isPhoneVerified ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-lg border border-emerald-200">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      {t('phoneVerifiedBadge')}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-100 text-amber-700 text-xs font-semibold rounded-lg border border-amber-200">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {t('phoneNotVerifiedBadge')}
                    </span>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500">{t('debtorNameLabel')}</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={debtorName}
                      onChange={(e) => setDebtorName(e.target.value)}
                      placeholder={t('debtorNameLabel')}
                      className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-slate-800 text-sm outline-none focus:border-brand-500 font-semibold"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500">{t('debtorPhoneLabel')}</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={debtorPhone}
                      onChange={handlePhoneChange}
                      placeholder="+998 (90) 123-45-67"
                      className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-slate-800 text-sm outline-none focus:border-brand-500 font-semibold"
                    />
                  </div>
                </div>

                {/* SMS OTP Verification Block */}
                {!isPhoneVerified ? (
                  <div className="pt-2 border-t border-slate-200/60 space-y-3">
                    {!otpSent ? (
                      <button
                        type="button"
                        onClick={handleSendOtp}
                        disabled={isSendingOtp || !debtorPhone.trim()}
                        className="w-full py-2.5 bg-brand-50 hover:bg-brand-100 border border-brand-200 text-brand-700 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {isSendingOtp ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Yuborilmoqda...</span>
                          </>
                        ) : (
                          <>
                            <Send className="w-3.5 h-3.5" />
                            <span>{t('verifyPhoneBtn')}</span>
                          </>
                        )}
                      </button>
                    ) : (
                      <div className="bg-white p-3 rounded-xl border border-brand-200 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                            <KeyRound className="w-3.5 h-3.5 text-brand-600" />
                            {t('verifyCodePrompt')}
                          </label>
                          <button
                            type="button"
                            onClick={handleSendOtp}
                            disabled={isSendingOtp}
                            className="text-[11px] text-brand-600 hover:text-brand-700 font-semibold underline disabled:opacity-50"
                          >
                            {t('resendCodeBtn')}
                          </button>
                        </div>
                        
                        <div className="flex gap-2">
                          <input
                            type="text"
                            maxLength={4}
                            value={otpCode}
                            onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                            placeholder="0000"
                            className="w-28 text-center tracking-widest text-base font-black bg-slate-50 border border-slate-200 rounded-lg py-1.5 outline-none focus:border-brand-500 focus:bg-white text-slate-800"
                          />
                          <button
                            type="button"
                            onClick={handleVerifyOtp}
                            disabled={isVerifyingOtp || otpCode.length !== 4}
                            className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                          >
                            {isVerifyingOtp ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <ShieldCheck className="w-3.5 h-3.5" />
                            )}
                            <span>{t('verifyConfirmBtn')}</span>
                          </button>
                        </div>

                        {debugOtpCode && (
                          <div className="text-[11px] font-medium text-slate-500 bg-amber-50 p-1.5 rounded-lg border border-amber-200">
                            💡 Sinov kodi: <strong className="text-amber-800 font-mono text-xs">{debugOtpCode}</strong>
                          </div>
                        )}
                      </div>
                    )}

                    {otpError && (
                      <p className="text-[11px] text-rose-500 font-semibold flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 flex-shrink-0" />
                        {otpError}
                      </p>
                    )}
                    {otpSuccess && !isPhoneVerified && (
                      <p className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 flex-shrink-0" />
                        {otpSuccess}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center gap-2 text-emerald-800 text-xs font-semibold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>Mijoz telefon raqami tasdiqlandi. Qarzga rasmiylashtirish mumkin.</span>
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="pt-4 space-y-3 mt-auto">
              <button
                onClick={handleComplete}
                className="w-full py-4 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-2xl transition-all shadow-md shadow-brand-100 text-sm"
              >
                {t('completeBtn')}
              </button>

              <button
                onClick={() => setSelectedBasketId(null)}
                className="w-full py-3 bg-white hover:bg-rose-50 border border-rose-200 text-rose-500 font-semibold rounded-2xl transition-all text-sm"
              >
                {t('cancelBtn')}
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* SAVDOLAR TARIXI (QAYTARISH REJIMI) */
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-lg font-bold text-slate-800">{t('salesHistoryTitle')}</h2>
            
            <div className="relative w-72">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
              <input
                type="text"
                placeholder={t('searchPlaceholder')}
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
                  <th className="py-3 px-4">{t('tableDateId')}</th>
                  <th className="py-3 px-4">{t('tableEmployee')}</th>
                  <th className="py-3 px-4">{t('tablePaymentType')}</th>
                  <th className="py-3 px-4 text-right">{t('tableSum')}</th>
                  <th className="py-3 px-4 text-center">{t('tableAmallar')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-sm text-slate-600 font-medium">
                {transactions
                  .filter(tx => {
                    const q = (searchQuery || '').toLowerCase();
                    return (tx.id || '').toLowerCase().includes(q) ||
                      (tx.employeeName && tx.employeeName.toLowerCase().includes(q)) ||
                      (tx.debtorName && tx.debtorName.toLowerCase().includes(q)) ||
                      (tx.clientName && tx.clientName.toLowerCase().includes(q)) ||
                      (tx.type && tx.type.toLowerCase().includes(q));
                  })
                  .map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50/50 transition-all">
                      <td className="py-4 px-4">
                        <div className="text-slate-800 font-bold">{tx.id}</div>
                        <div className="text-xs text-slate-400">{tx.date}</div>
                      </td>
                      <td className="py-4 px-4 text-slate-700 font-semibold">{tx.employeeName || 'Kassir'}</td>
                      <td className="py-4 px-4">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${
                          tx.type === 'cash' ? 'bg-blue-50 text-blue-600' :
                          tx.type === 'card' ? 'bg-emerald-50 text-emerald-600' :
                          tx.type === 'debt' ? 'bg-rose-50 text-rose-600 font-bold' :
                          'bg-amber-50 text-amber-600'
                        }`}>
                          {tx.type === 'cash' ? t('paymentCash') :
                           tx.type === 'card' ? t('paymentCard') :
                           tx.type === 'debt' ? t('paymentDebt') :
                           t('paymentMixed')}
                        </span>
                        {(tx.debtorName || tx.clientName) && (
                          <div className="text-xs text-slate-400 mt-0.5">{t('debtorNameLabel')}: {tx.debtorName || tx.clientName}</div>
                        )}
                      </td>
                      <td className="py-4 px-4 text-right font-bold text-slate-800">{(Number(tx.total ?? tx.amount ?? 0)).toLocaleString()} UZS</td>
                      <td className="py-4 px-4 text-center">
                        <button
                          onClick={() => {
                            if (window.confirm(t('refundConfirm'))) {
                              refundTransaction(tx.id);
                            }
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-500 rounded-xl text-xs font-semibold transition-all"
                        >
                          <Undo2 className="w-3.5 h-3.5" />
                          {t('actionRefund')}
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
