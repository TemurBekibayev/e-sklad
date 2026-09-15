import React from 'react';
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  User, 
  LogOut, 
  Monitor, 
  Smartphone, 
  ChefHat, 
  QrCode,
  Layers,
  UtensilsCrossed,
  PlusCircle,
  Package,
  Users,
  Building2
} from 'lucide-react';
import { useLanguage, LanguageSwitcher } from '../i18n/LanguageContext';

export default function Header({ 
  currentTab, 
  setCurrentTab, 
  currentUser, 
  onLogout, 
  syncState, 
  onToggleInternet, 
  onFlushSync,
  onOpenAddDish,
  onOpenStaffModal,
  onOpenTableManageModal
}) {
  const { t } = useLanguage();

  const getRoleDisplay = (role) => {
    if (!role) return t('cashier_default', 'Kassir');
    const r = role.toLowerCase();
    if (r === 'admin' || r === 'manager') return t('role_manager', 'Boshqaruvchi');
    if (r === 'waiter' || r === 'worker') return t('role_waiter', 'Ofitsiant');
    if (r === 'cook') return t('role_cook', 'Oshpaz');
    if (r === 'cashier') return t('role_cashier', 'Kassir');
    return role;
  };

  return (
    <header className="bg-slate-800 border-b border-slate-700 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 sticky top-0 z-30 shadow-md">
      {/* Brand & Logo */}
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center font-black text-xl text-white shadow-lg shadow-orange-500/30">
          GP
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-lg font-bold text-white tracking-wide">GetPOS <span className="text-amber-400 font-normal">Kafe</span></h1>
            <span className="text-[11px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30">
              {t('tagline_offline', 'v1.0 Oflayn-birinchi')}
            </span>
            <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              {t('cloud_live', 'GetPOS Cloud Jonli')}
            </span>
          </div>
          <p className="text-xs text-slate-400">
            {syncState.localIp ? `${t('wifi_ip', 'Wi-Fi IP')}: ${syncState.localIp}:4000` : t('local_network', 'Lokal tarmoqda')}
          </p>
        </div>
      </div>

      {/* Navigation tabs for roles */}
      <nav className="flex items-center bg-slate-900/80 p-1 rounded-xl border border-slate-700/80">
        <button
          onClick={() => setCurrentTab('cashier')}
          className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
            currentTab === 'cashier'
              ? 'bg-blue-600 text-white font-bold shadow-md'
              : 'text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Monitor className="w-4 h-4" />
          <span className="hidden sm:inline">{t('tab_cashier', 'JetCafe POS')}</span>
        </button>

        <button
          onClick={() => setCurrentTab('waiter')}
          className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
            currentTab === 'waiter'
              ? 'bg-emerald-500 text-slate-950 font-bold shadow-md'
              : 'text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Smartphone className="w-4 h-4" />
          <span className="hidden sm:inline">{t('tab_waiter', 'Ofitsiant (Planshet)')}</span>
        </button>

        <button
          onClick={() => setCurrentTab('kitchen')}
          className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
            currentTab === 'kitchen'
              ? 'bg-orange-500 text-slate-950 font-bold shadow-md'
              : 'text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
        >
          <ChefHat className="w-4 h-4" />
          <span className="hidden sm:inline">{t('tab_kitchen', 'Oshxona (KDS)')}</span>
        </button>

        <button
          onClick={() => setCurrentTab('inventory')}
          className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
            currentTab === 'inventory'
              ? 'bg-amber-600 text-white font-bold shadow-md'
              : 'text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Package className="w-4 h-4" />
          <span className="hidden sm:inline">{t('tab_inventory', 'Sklad (Ombor)')}</span>
        </button>

        <button
          onClick={() => setCurrentTab('menu')}
          className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
            currentTab === 'menu'
              ? 'bg-[#ea580c] text-white font-bold shadow-md'
              : 'text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
        >
          <UtensilsCrossed className="w-4 h-4" />
          <span className="hidden sm:inline">{t('tab_menu', 'Menyu (Taomlar)')}</span>
        </button>

        <button
          onClick={() => setCurrentTab('mxik')}
          className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
            currentTab === 'mxik'
              ? 'bg-indigo-500 text-white font-bold shadow-md'
              : 'text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
        >
          <QrCode className="w-4 h-4" />
          <span className="hidden sm:inline">{t('tab_mxik', 'Soliq MXIK')}</span>
        </button>
      </nav>

      {/* Sync Panel & User Status */}
      <div className="flex items-center space-x-2.5">
        {/* Stollar / Zallar Boshqaruvi Button */}
        <button
          onClick={onOpenTableManageModal}
          title={t('th_title', 'Stollar va Zallar (Xonalar) ni boshqarish')}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-700 text-slate-200 hover:text-white font-bold text-xs shadow border border-slate-700 active:scale-95 transition-all"
        >
          <Building2 className="w-4 h-4 text-orange-400" />
          <span className="hidden md:inline">{t('btn_tables_halls', '🏢 Stollar / Zallar')}</span>
        </button>

        {/* Xodimlar / Ofitsiantlar Button */}
        <button
          onClick={onOpenStaffModal}
          title={t('staff_title', 'Xodimlar va Ofitsiantlarni boshqarish')}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-700 text-slate-200 hover:text-white font-bold text-xs shadow border border-slate-700 active:scale-95 transition-all"
        >
          <Users className="w-4 h-4 text-amber-400" />
          <span className="hidden md:inline">{t('btn_staff', '👥 Xodimlar')}</span>
        </button>

        {/* Language Switcher Dropdown */}
        <LanguageSwitcher />

        {/* Internet & Sync Status Widget */}
        <div className="flex items-center bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-700/80 space-x-3">
          <button
            onClick={onToggleInternet}
            title="Internet holatini o'zgartirish (Oflayn rejimni sinash uchun)"
            className={`flex items-center space-x-1.5 text-xs font-semibold px-2 py-1 rounded transition-colors ${
              syncState.isOnline
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30'
                : 'bg-rose-500/20 text-rose-400 border border-rose-500/30 hover:bg-rose-500/30 animate-pulse'
            }`}
          >
            {syncState.isOnline ? (
              <>
                <Wifi className="w-3.5 h-3.5" />
                <span>{t('status_online', 'ONLINE')}</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5" />
                <span>{t('status_offline', 'OFLAYN')}</span>
              </>
            )}
          </button>

          {/* Pending checks counter */}
          <div className="flex items-center space-x-2 text-xs">
            <span className="text-slate-400">{t('tax_queue', 'Soliq navbati:')}</span>
            <span
              className={`font-mono font-bold px-1.5 py-0.5 rounded text-xs ${
                syncState.pendingChecks > 0
                  ? 'bg-amber-500 text-slate-950 animate-bounce'
                  : 'bg-slate-800 text-slate-300'
              }`}
            >
              {syncState.pendingChecks} {t('pcs', 'ta')}
            </span>

            {syncState.pendingChecks > 0 && syncState.isOnline && (
              <button
                onClick={onFlushSync}
                title={t('tax_send_now', "Soliqqa darhol jo'natish")}
                className="p-1 hover:bg-slate-800 rounded text-amber-400"
              >
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              </button>
            )}
          </div>
        </div>

        {/* Admin/Manager Quick Add Dish Button */}
        {(currentUser?.role === 'admin' || currentUser?.role === 'manager') && (
          <button
            onClick={onOpenAddDish}
            title={t('dish_add_title', "Yangi taom qo'shish")}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-[#ea580c] hover:bg-[#d94e08] text-white font-black text-xs shadow-md shadow-orange-500/30 active:scale-95 transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{t('btn_add_dish', "➕ Taom qo'shish")}</span>
          </button>
        )}

        {/* Active user status & Logout */}
        <div className="flex items-center bg-slate-900/90 pl-3 pr-1.5 py-1 rounded-xl border border-slate-700/80 space-x-2">
          <div className="flex items-center space-x-1.5">
            <User className="w-4 h-4 text-emerald-400" />
            <div className="text-left">
              <span className="text-xs font-bold text-white block leading-tight">
                {currentUser?.name || t('manager_default', 'Menejer')}
              </span>
              <span className="text-[10px] text-amber-400 font-semibold uppercase tracking-wider block">
                {getRoleDisplay(currentUser?.role)}
              </span>
            </div>
          </div>
          <button
            onClick={onLogout}
            title={t('logout', 'Smenani yakunlash / Chiqish')}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
