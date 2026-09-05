import React, { useState, useContext } from 'react';
import { AppContext } from '../context/AppContext';
import { 
  Plus, 
  KeyRound, 
  Check,
  ShieldCheck,
  ShieldAlert,
  Sliders,
  DollarSign,
  X
} from 'lucide-react';

export default function Employees() {
  const { 
    employees, 
    addEmployee, 
    toggleEmployeeActive, 
    resetEmployeePIN, 
    updateEmployeeDebtPermission, 
    t 
  } = useContext(AppContext);

  const [visiblePins, setVisiblePins] = useState({});
  
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('+998');
  const [pin, setPin] = useState('');
  const [role, setRole] = useState('Sotuvchi-kassir');
  const [canSellOnDebt, setCanSellOnDebt] = useState(false);
  const [maxDebtLimit, setMaxDebtLimit] = useState('1500000');

  const [resettingEmpId, setResettingEmpId] = useState(null);
  const [newPinVal, setNewPinVal] = useState('');

  // Modal for editing debt permissions
  const [debtModalEmp, setDebtModalEmp] = useState(null);
  const [modalCanSell, setModalCanSell] = useState(false);
  const [modalLimit, setModalLimit] = useState('1500000');
  const [savingDebtPerm, setSavingDebtPerm] = useState(false);

  const togglePinVisibility = (id) => {
    setVisiblePins(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim() || pin.length !== 4) {
      alert(t('pinLengthError'));
      return;
    }
    if (!phone.trim() || phone === '+998') {
      alert("Telefon raqamini to'liq kiriting!");
      return;
    }
    addEmployee(name, phone, pin, role, canSellOnDebt, Number(maxDebtLimit) || 0);
    alert(t('empAddSuccess'));
    setName('');
    setPhone('+998');
    setPin('');
    setCanSellOnDebt(false);
    setMaxDebtLimit('1500000');
  };

  const handleResetPin = (id) => {
    if (newPinVal.length !== 4) {
      alert(t('pinLengthError'));
      return;
    }
    resetEmployeePIN(id, newPinVal);
    setResettingEmpId(null);
    setNewPinVal('');
    alert(t('pinUpdateSuccess'));
  };

  const openDebtModal = (emp) => {
    setDebtModalEmp(emp);
    setModalCanSell(Boolean(emp.canSellOnDebt));
    setModalLimit(String(emp.maxDebtLimit ?? 1500000));
  };

  const handleSaveDebtModal = async () => {
    if (!debtModalEmp) return;
    setSavingDebtPerm(true);
    try {
      await updateEmployeeDebtPermission(debtModalEmp.id, modalCanSell, Number(modalLimit) || 0);
      alert(t('debtPermissionUpdateSuccess'));
      setDebtModalEmp(null);
    } catch (err) {
      alert("Xatolik yuz berdi: " + (err.message || "Saqlab bo'lmadi"));
    } finally {
      setSavingDebtPerm(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* LEFT: Employees Grid */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-800">{t('empListTitle')}</h2>
            <button 
              onClick={() => {
                document.getElementById('empNameInput')?.focus();
              }}
              className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition-all shadow-md shadow-brand-100"
            >
              <Plus className="w-4 h-4" />
              {t('addEmpBtn')}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {employees.map((emp) => {
              const isPinVisible = visiblePins[emp.id];
              return (
                <div 
                  key={emp.id}
                  className={`bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-4 flex flex-col justify-between ${
                    !emp.active ? 'opacity-70 bg-slate-50/50' : ''
                  }`}
                >
                  <div className="space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <img 
                          src={emp.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=100"} 
                          alt={emp.name} 
                          className="w-10 h-10 rounded-full object-cover border border-slate-100"
                          onError={(e) => {
                            e.target.src = "https://cdn-icons-png.flaticon.com/512/3135/3135715.png";
                          }}
                        />
                        <div>
                          <h4 className="text-sm font-bold text-slate-800">{emp.name}</h4>
                          {emp.phone && <p className="text-[10px] text-slate-400 font-semibold">{emp.phone}</p>}
                          <p className="text-xs text-slate-400 font-semibold">
                            {emp.role === 'Sotuvchi-kassir' ? t('cashierRole') : t('managerRole')}
                          </p>
                        </div>
                      </div>

                      {/* Active status badge */}
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        emp.active ? 'bg-emerald-50 text-emerald-500' : 'bg-slate-100 text-slate-400'
                      }`}>
                        {emp.active ? t('statusNormal') : t('statusLow')}
                      </span>
                    </div>

                    {/* PIN section */}
                    <div className="flex items-center justify-between bg-slate-50 rounded-2xl px-4 py-2.5 text-xs text-slate-500 font-medium">
                      <span>{t('empPinLabel')}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold tracking-widest text-slate-800 text-sm">
                          {isPinVisible ? emp.pin : '••••'}
                        </span>
                        <button 
                          onClick={() => togglePinVisibility(emp.id)}
                          className="text-brand-600 hover:text-brand-800 font-bold"
                        >
                          {isPinVisible ? t('empPinHide') : t('empPinShow')}
                        </button>
                      </div>
                    </div>

                    {/* Debt Permission Box */}
                    <div className="bg-slate-50/80 border border-slate-100 rounded-2xl p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          {emp.canSellOnDebt ? (
                            <ShieldCheck className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <ShieldAlert className="w-4 h-4 text-amber-500" />
                          )}
                          <span className="text-[11px] font-bold text-slate-700">
                            {t('empDebtPermissionTitle')}
                          </span>
                        </div>
                        <button
                          onClick={() => openDebtModal(emp)}
                          className="text-[11px] text-brand-600 hover:text-brand-800 font-bold flex items-center gap-1 hover:underline"
                        >
                          <Sliders className="w-3 h-3" />
                          Sozlash
                        </button>
                      </div>

                      <div className="flex items-center justify-between pt-0.5">
                        <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${
                          emp.canSellOnDebt 
                            ? 'bg-emerald-100 text-emerald-700' 
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {emp.canSellOnDebt ? t('empDebtAllowedBadge') : t('empDebtApprovalRequiredBadge')}
                        </span>
                        <span className="text-[10px] font-semibold text-slate-500">
                          {emp.canSellOnDebt 
                            ? `Maks: ${(Number(emp.maxDebtLimit) || 0).toLocaleString()} UZS` 
                            : "0 UZS (faqat ruxsat bilan)"}
                        </span>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="text-xs text-slate-400 font-medium pt-1">
                      {t('empSalesToday')}{' '}
                      <span className="font-bold text-slate-700">
                        {emp.salesCount} ta ({emp.salesAmount.toLocaleString()} UZS)
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="border-t border-slate-50 pt-3 flex gap-2">
                    {resettingEmpId === emp.id ? (
                      <div className="flex items-center gap-1.5 w-full">
                        <input
                          type="password"
                          maxLength={4}
                          placeholder="PIN"
                          value={newPinVal}
                          onChange={(e) => setNewPinVal(e.target.value.replace(/\D/g, ''))}
                          className="flex-1 px-2.5 py-1.5 border border-slate-200 rounded-xl text-xs font-bold font-mono tracking-widest text-center"
                        />
                        <button 
                          onClick={() => handleResetPin(emp.id)}
                          className="p-1.5 bg-brand-50 text-brand-600 hover:bg-brand-100 rounded-lg"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => setResettingEmpId(null)}
                          className="p-1.5 bg-slate-100 text-slate-500 hover:bg-slate-200 rounded-lg text-xs"
                        >
                          X
                        </button>
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() => {
                            setResettingEmpId(emp.id);
                            setNewPinVal('');
                          }}
                          className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold rounded-xl text-xs transition-all font-medium"
                        >
                          {t('actionEdit')} PIN
                        </button>
                        
                        <button
                          onClick={() => toggleEmployeeActive(emp.id)}
                          className={`flex-1 py-2 font-semibold rounded-xl text-xs transition-all ${
                            emp.active 
                              ? 'bg-rose-50 hover:bg-rose-100 text-rose-500' 
                              : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-500'
                          }`}
                        >
                          {emp.active ? t('actionDeactivate') : t('actionActivate')}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT: Add Employee Form */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-6">
          <h2 className="text-lg font-bold text-slate-800">{t('addEmpTitle')}</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500">{t('empNameLabel')}</label>
              <input
                id="empNameInput"
                type="text"
                required
                placeholder="Sardor Karimov"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 text-sm outline-none focus:border-brand-500 font-semibold"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500">{t('debtorPhoneLabel')}</label>
              <input
                type="text"
                required
                placeholder="+998901234567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 text-sm outline-none focus:border-brand-500 font-semibold"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500">{t('empPinFormLabel')}</label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  maxLength={4}
                  required
                  placeholder="2580"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-slate-800 font-mono tracking-widest text-sm outline-none focus:border-brand-500"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500">{t('empRoleLabel')}</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 text-sm outline-none focus:border-brand-500 font-semibold"
              >
                <option value="Sotuvchi-kassir">{t('cashierRole')}</option>
                <option value="Menejer">{t('managerRole')}</option>
              </select>
            </div>

            {/* Debt Permission Settings for new employee */}
            <div className="pt-2 border-t border-slate-100 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-800">{t('empDebtPermissionTitle')}</h4>
                  <p className="text-[10px] text-slate-400">{t('empAllowDebtLabel')}</p>
                </div>
                <input 
                  type="checkbox" 
                  checked={canSellOnDebt} 
                  onChange={(e) => setCanSellOnDebt(e.target.checked)}
                  className="w-4 h-4 text-brand-600 rounded cursor-pointer"
                />
              </div>

              {canSellOnDebt && (
                <div className="space-y-1 animate-in fade-in duration-200">
                  <label className="text-xs font-semibold text-slate-600">{t('empDebtLimitLabel')} (UZS)</label>
                  <input
                    type="number"
                    min="0"
                    step="50000"
                    value={maxDebtLimit}
                    onChange={(e) => setMaxDebtLimit(e.target.value)}
                    placeholder="1500000"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 text-sm outline-none focus:border-brand-500 font-semibold"
                  />
                  <p className="text-[10px] text-slate-400">{t('empDebtLimitHelp')}</p>
                </div>
              )}
            </div>

            <div className="pt-2 space-y-2">
              <button
                type="submit"
                className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-2xl transition-all shadow-md shadow-brand-100 text-sm"
              >
                {t('empSaveBtn')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setName('');
                  setPhone('+998');
                  setPin('');
                  setCanSellOnDebt(false);
                  setMaxDebtLimit('1500000');
                }}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold rounded-2xl transition-all text-sm font-medium"
              >
                {t('cancelBtn')}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* MODAL: Edit Debt Permission for existing employee */}
      {debtModalEmp && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-brand-50 flex items-center justify-center text-brand-600">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">{debtModalEmp.name}</h3>
                  <p className="text-xs text-slate-400">{t('empDebtPermissionTitle')}</p>
                </div>
              </div>
              <button 
                onClick={() => setDebtModalEmp(null)}
                className="w-8 h-8 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <label className="flex items-start gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200/60 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={modalCanSell} 
                  onChange={(e) => setModalCanSell(e.target.checked)}
                  className="mt-1 w-4 h-4 text-brand-600 rounded cursor-pointer"
                />
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-slate-800">{t('empAllowDebtLabel')}</span>
                  <p className="text-[11px] text-slate-500 leading-snug">
                    Agar yoqilsa, xodim belgilangan limitgacha menejerdan ruxsat so'ramasdan qarzga sota oladi.
                  </p>
                </div>
              </label>

              {modalCanSell && (
                <div className="space-y-1.5 animate-in fade-in duration-200">
                  <label className="text-xs font-bold text-slate-700">{t('empDebtLimitLabel')} (UZS)</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      type="number"
                      min="0"
                      step="50000"
                      value={modalLimit}
                      onChange={(e) => setModalLimit(e.target.value)}
                      placeholder="1500000"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-slate-800 text-sm font-semibold outline-none focus:border-brand-500"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400">{t('empDebtLimitHelp')}</p>
                </div>
              )}
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDebtModalEmp(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold rounded-2xl text-xs transition-all"
              >
                {t('cancelBtn')}
              </button>
              <button
                type="button"
                onClick={handleSaveDebtModal}
                disabled={savingDebtPerm}
                className="flex-1 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-2xl text-xs transition-all shadow-md shadow-brand-100 disabled:opacity-50"
              >
                {savingDebtPerm ? "Saqlanmoqda..." : t('empSaveBtn')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
