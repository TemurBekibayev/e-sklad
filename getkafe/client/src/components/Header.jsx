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
  Users
} from 'lucide-react';

export default function Header({ 
  currentTab, 
  setCurrentTab, 
  currentUser, 
  onLogout, 
  syncState, 
  onToggleInternet, 
  onFlushSync,
  onOpenAddDish,
  onOpenStaffModal
}) {
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
              v1.0 Offline-First
            </span>
            <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              GetPOS Cloud Live
            </span>
          </div>
          <p className="text-xs text-slate-400">
            {syncState.localIp ? `Wi-Fi IP: ${syncState.localIp}:4000` : 'Lokal tarmoqda'}
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
          <span className="hidden sm:inline">JetCafe POS</span>
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
          <span className="hidden sm:inline">Ofitsiant (Planshet)</span>
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
          <span className="hidden sm:inline">Oshxona (KDS)</span>
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
          <span className="hidden sm:inline">Sklad (Ombor)</span>
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
          <span className="hidden sm:inline">Menyu (Taomlar)</span>
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
          <span className="hidden sm:inline">Soliq MXIK</span>
        </button>
      </nav>

      {/* Sync Panel & User Status (TZ 3.1) */}
      <div className="flex items-center space-x-3">
        {/* Xodimlar / Ofitsiantlar Button */}
        <button
          onClick={onOpenStaffModal}
          title="Xodimlar va Ofitsiantlarni boshqarish"
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-700 text-slate-200 hover:text-white font-bold text-xs shadow border border-slate-700 active:scale-95 transition-all"
        >
          <Users className="w-4 h-4 text-amber-400" />
          <span className="hidden md:inline">👥 Xodimlar</span>
        </button>

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
                <span>ONLINE</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5" />
                <span>OFLAYN</span>
              </>
            )}
          </button>

          {/* Pending checks counter */}
          <div className="flex items-center space-x-2 text-xs">
            <span className="text-slate-400">Soliq navbati:</span>
            <span
              className={`font-mono font-bold px-1.5 py-0.5 rounded text-xs ${
                syncState.pendingChecks > 0
                  ? 'bg-amber-500 text-slate-950 animate-bounce'
                  : 'bg-slate-800 text-slate-300'
              }`}
            >
              {syncState.pendingChecks} ta
            </span>

            {syncState.pendingChecks > 0 && syncState.isOnline && (
              <button
                onClick={onFlushSync}
                title="Soliqqa darhol jo'natish"
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
            title="Yangi taom qo'shish"
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-[#ea580c] hover:bg-[#d94e08] text-white font-black text-xs shadow-md shadow-orange-500/30 active:scale-95 transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>➕ Taom qo'shish</span>
          </button>
        )}

        {/* Current User & Logout */}
        {currentUser ? (
          <div className="flex items-center space-x-2 bg-slate-900 px-2.5 py-1.5 rounded-xl border border-slate-700/80">
            <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-amber-400 text-xs font-bold">
              {currentUser.name.charAt(0)}
            </div>
            <div className="text-left hidden md:block">
              <div className="text-xs font-bold text-slate-200 leading-none">{currentUser.name}</div>
              <div className="text-[10px] text-slate-400 uppercase tracking-wider">{currentUser.role}</div>
            </div>
            <button
              onClick={onLogout}
              title="Chiqish"
              className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-rose-400 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : null}
      </div>
    </header>
  );
}
