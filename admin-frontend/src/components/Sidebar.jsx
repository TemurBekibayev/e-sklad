import React from 'react';
import { 
  Home, 
  Store, 
  Package, 
  BarChart3, 
  Settings, 
  TrendingUp 
} from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab, onLogout }) {
  const menuItems = [
    { id: 'dashboard', label: 'Bosh sahifa', icon: Home },
    { id: 'tenants', label: "Do'konlar", icon: Store },
    { id: 'products', label: 'Mahsulotlar', icon: Package },
    { id: 'reports', label: 'Hisobotlar', icon: BarChart3 },
    { id: 'settings', label: 'Sozlamalar', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-[#0B132B] text-slate-300 min-h-screen flex flex-col flex-shrink-0 border-r border-slate-800">
      {/* Logo */}
      <div className="px-6 py-6 flex items-center space-x-3">
        <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
          <TrendingUp className="w-5 h-5" />
        </div>
        <span className="text-xl font-bold text-white tracking-tight">SotuvPro</span>
      </div>

      {/* Nav Menu */}
      <nav className="flex-1 px-4 py-4 space-y-1.5">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id || (activeTab === 'tenant-detail' && item.id === 'tenants');
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center space-x-3.5 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Logout button */}
      {onLogout && (
        <div className="px-4 py-2 border-t border-slate-800/40">
          <button
            onClick={onLogout}
            className="w-full flex items-center space-x-3.5 px-4 py-2.5 rounded-xl text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-950/20 transition-all duration-150"
          >
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span>Chiqish</span>
          </button>
        </div>
      )}

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-800/80 text-xs text-slate-400 text-center">
        SotuvPro Admin v2.0
      </div>
    </aside>
  );
}
