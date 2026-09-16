import React, { useState, useEffect } from 'react';
import { 
  User, 
  LogOut, 
  Monitor, 
  Smartphone, 
  ChefHat, 
  QrCode,
  UtensilsCrossed,
  Package,
  Users,
  Building2,
  Printer,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { useLanguage, LanguageSwitcher } from '../i18n/LanguageContext';

export default function Header({ 
  currentTab, 
  setCurrentTab, 
  currentUser, 
  onLogout, 
  onOpenStaffModal,
  onOpenTableManageModal,
  onOpenPrinterSettings
}) {
  const { t } = useLanguage();
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    const handleKeyDown = (e) => {
      if (e.key === 'F11') {
        e.preventDefault();
        toggleFullscreen();
      }
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

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
    <header className="bg-slate-900 border-b border-slate-800 px-4 py-2 flex items-center justify-between gap-3 sticky top-0 z-30 shadow-md">
      {/* Brand & Logo */}
      <div className="flex items-center space-x-2.5 cursor-pointer" onClick={() => setCurrentTab('cashier')}>
        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center font-black text-sm text-white shadow-md shadow-orange-500/20 shrink-0">
          GP
        </div>
        <div className="flex items-center space-x-1.5">
          <h1 className="text-base font-bold text-white tracking-wide whitespace-nowrap">GetPOS <span className="text-amber-400 font-normal">Kafe</span></h1>
        </div>
      </div>

      {/* Navigation tabs for roles */}
      <nav className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 gap-1 overflow-x-auto">
        <button
          onClick={() => setCurrentTab('cashier')}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
            currentTab === 'cashier'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Monitor className="w-4 h-4" />
          <span>{t('tab_cashier', 'Kassa (POS)')}</span>
        </button>

        <button
          onClick={() => setCurrentTab('waiter')}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
            currentTab === 'waiter'
              ? 'bg-emerald-500 text-slate-950 shadow-md'
              : 'text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Smartphone className="w-4 h-4" />
          <span>{t('tab_waiter', 'Ofitsiant')}</span>
        </button>

        <button
          onClick={() => setCurrentTab('kitchen')}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
            currentTab === 'kitchen'
              ? 'bg-orange-500 text-slate-950 shadow-md'
              : 'text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
        >
          <ChefHat className="w-4 h-4" />
          <span>{t('tab_kitchen', 'Oshxona (KDS)')}</span>
        </button>

        <button
          onClick={() => setCurrentTab('inventory')}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
            currentTab === 'inventory'
              ? 'bg-amber-600 text-white shadow-md'
              : 'text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>{t('tab_inventory', 'Ombor (Sklad)')}</span>
        </button>

        <button
          onClick={() => setCurrentTab('menu')}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
            currentTab === 'menu'
              ? 'bg-[#ea580c] text-white shadow-md'
              : 'text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
        >
          <UtensilsCrossed className="w-4 h-4" />
          <span>{t('tab_menu', 'Menyu')}</span>
        </button>

        <button
          onClick={() => setCurrentTab('mxik')}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
            currentTab === 'mxik'
              ? 'bg-indigo-500 text-white shadow-md'
              : 'text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
        >
          <QrCode className="w-4 h-4" />
          <span>{t('tab_mxik', 'Soliq MXIK')}</span>
        </button>
      </nav>

      {/* Quick Settings & User Status */}
      <div className="flex items-center gap-2">
        {/* Stollar / Zallar Boshqaruvi Button */}
        <button
          onClick={onOpenTableManageModal}
          title={t('th_title', 'Stollar va Zallar')}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold text-xs border border-slate-700 shadow-sm transition-all"
        >
          <Building2 className="w-3.5 h-3.5 text-orange-400" />
          <span className="hidden xl:inline">{t('btn_tables_halls', 'Stollar')}</span>
        </button>

        {/* Xodimlar Button */}
        <button
          onClick={onOpenStaffModal}
          title={t('staff_title', 'Xodimlarni boshqarish')}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold text-xs border border-slate-700 shadow-sm transition-all"
        >
          <Users className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden xl:inline">{t('btn_staff', 'Xodimlar')}</span>
        </button>

        {/* Printer Button */}
        <button
          onClick={onOpenPrinterSettings}
          title="Chek va Printer Sozlamalari"
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold text-xs border border-slate-700 shadow-sm transition-all"
        >
          <Printer className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden xl:inline">Printer</span>
        </button>

        {/* Language Switcher */}
        <LanguageSwitcher />

        {/* Fullscreen F11 */}
        <button
          onClick={toggleFullscreen}
          title="To'liq ekran rejimi (F11)"
          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors"
        >
          {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
        </button>

        {/* User profile & Logout */}
        {currentUser && (
          <div className="flex items-center space-x-2 pl-2 border-l border-slate-700">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-amber-400 font-bold text-xs">
                {currentUser.name ? currentUser.name[0].toUpperCase() : 'U'}
              </div>
              <div className="hidden lg:block text-left text-xs leading-tight">
                <p className="font-bold text-slate-200">{currentUser.name}</p>
                <p className="text-[10px] text-amber-400/90">{getRoleDisplay(currentUser.role)}</p>
              </div>
            </div>
            <button
              onClick={onLogout}
              title={t('auth_logout', 'Chiqish')}
              className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
