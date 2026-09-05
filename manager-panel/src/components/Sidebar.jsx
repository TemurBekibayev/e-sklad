import React, { useContext } from 'react';
import { AppContext } from '../context/AppContext';
import { 
  Home, 
  ShoppingBag, 
  Package, 
  BookOpen, 
  Users, 
  BarChart2, 
  LogOut 
} from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab }) {
  const { user, logout, t } = useContext(AppContext);

  const menuItems = [
    { id: 'dashboard', name: t('menuDashboard'), icon: Home },
    { id: 'sales', name: t('menuSales'), icon: ShoppingBag },
    { id: 'warehouse', name: t('menuWarehouse'), icon: Package },
    { id: 'debts', name: t('menuDebts'), icon: BookOpen },
    { id: 'employees', name: t('menuEmployees'), icon: Users },
    { id: 'reports', name: t('menuReports'), icon: BarChart2 },
  ];

  return (
    <div className="w-64 bg-white border-r border-slate-100 flex flex-col h-screen fixed left-0 top-0">
      {/* Logo */}
      <div className="p-6 flex items-center gap-3 border-b border-slate-50">
        <div className="w-10 h-10 bg-brand-500 rounded-xl flex items-center justify-center text-white shadow-md shadow-brand-100">
          {/* Blue House Icon */}
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
          </svg>
        </div>
        <span className="text-xl font-bold text-slate-800 tracking-tight">{t('loginTitle')}</span>
      </div>

      {/* Menus */}
      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                isActive 
                  ? 'bg-brand-50 text-brand-600' 
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-brand-600' : 'text-slate-400'}`} />
              {item.name}
            </button>
          );
        })}
      </nav>

      {/* Logout button */}
      <div className="px-4">
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-all mb-2"
        >
          <LogOut className="w-5 h-5 text-red-400" />
          {t('logoutBtn')}
        </button>
      </div>

      {/* Profile Card */}
      <div className="p-4 border-t border-slate-50 flex items-center gap-3 bg-slate-50/50 m-4 rounded-xl">
        <img 
          src={user?.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=100"} 
          alt="Avatar" 
          className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm"
          onError={(e) => {
            e.target.src = "https://cdn-icons-png.flaticon.com/512/3135/3135715.png";
          }}
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800 truncate">{user?.name || 'Akmal Shodiyev'}</p>
          <p className="text-xs text-slate-400 truncate">
            {user?.role === 'manager' ? t('managerRole') : t('cashierRole')}
          </p>
        </div>
      </div>
    </div>
  );
}
