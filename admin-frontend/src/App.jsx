import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import DashboardPage from './pages/DashboardPage';
import TenantsPage from './pages/TenantsPage';
import TenantDetailPage from './pages/TenantDetailPage';
import ProductsPage from './pages/ProductsPage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';
import LandingPage from './pages/LandingPage';
import { apiFetch } from './utils/api';
import { ArrowLeft, Zap } from 'lucide-react';

function Login({ onLoginSuccess, onBackToHome }) {
  const [email, setEmail] = useState('admin@getpos.uz');
  const [password, setPassword] = useState('getpos4321');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await fetch('/api/v1/auth/login/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || 'Email yoki parol noto\'g\'ri');
      }
      if (data.user.role !== 'admin') {
        throw new Error('Faqat platforma super adminlari kira oladi');
      }
      localStorage.setItem('admin_access_token', data.access);
      onLoginSuccess(data.access);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 relative">
      {onBackToHome && (
        <button
          onClick={onBackToHome}
          className="absolute top-6 left-6 flex items-center space-x-2 text-xs font-bold text-slate-400 hover:text-white px-4 py-2 rounded-xl bg-slate-800/80 border border-slate-700 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Asosiy saytga qaytish</span>
        </button>
      )}

      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 border border-slate-100 animate-in fade-in zoom-in duration-150">
        <div className="flex flex-col items-center mb-6">
          <img 
            src="/getpos-logo.png" 
            alt="GetPOS Logo" 
            className="w-16 h-16 rounded-2xl object-contain mb-3 shadow-lg shadow-blue-500/20 bg-slate-50 p-1 border border-slate-100" 
            onError={(e) => { e.target.style.display = 'none'; }}
          />
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Get<span className="text-blue-600">POS</span></h2>
          <p className="text-sm text-slate-500 mt-1">Platforma Super Admin Paneli</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 text-red-600 text-xs p-3 rounded-xl mb-4 font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Email Manzil</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@getpos.uz"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Parol</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm shadow-lg shadow-blue-500/20 transition disabled:opacity-50 font-bold"
          >
            {loading ? 'Kutilmoqda...' : 'Tizimga kirish'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function App() {
  const getInitialRoute = () => {
    const p = window.location.pathname.toLowerCase();
    if (p.startsWith('/admin') || p.startsWith('/login')) {
      return 'admin';
    }
    return 'landing';
  };

  const [route, setRoute] = useState(getInitialRoute());
  const [token, setToken] = useState(localStorage.getItem('admin_access_token'));
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedTenantId, setSelectedTenantId] = useState(null);
  const [tenants, setTenants] = useState([]);
  const [loadingTenants, setLoadingTenants] = useState(false);

  useEffect(() => {
    const handlePopState = () => {
      const p = window.location.pathname.toLowerCase();
      if (p.startsWith('/admin') || p.startsWith('/login')) {
        setRoute('admin');
      } else {
        setRoute('landing');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    if (token && route === 'admin') {
      loadTenants();
    }
  }, [token, route]);

  const navigateTo = (targetRoute, urlPath) => {
    setRoute(targetRoute);
    if (urlPath && window.location.pathname !== urlPath) {
      window.history.pushState({}, '', urlPath);
    }
  };

  const loadTenants = async () => {
    setLoadingTenants(true);
    try {
      const data = await apiFetch('/tenants/');
      const tenantsList = data.results || (Array.isArray(data) ? data : []);
      setTenants(tenantsList);
    } catch (err) {
      console.error('Do\'konlarni yuklashda xatolik:', err);
    } finally {
      setLoadingTenants(false);
    }
  };

  const handleSelectTenant = (id) => {
    setSelectedTenantId(id);
    setActiveTab('tenant-detail');
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_access_token');
    setToken(null);
    navigateTo('landing', '/');
  };

  const getPageTitle = () => {
    switch (activeTab) {
      case 'dashboard':
        return 'Bosh sahifa';
      case 'tenants':
        return "Do'konlar";
      case 'tenant-detail':
        return "Do'kon tafsilotlari";
      case 'products':
        return 'Mahsulotlar';
      case 'reports':
        return 'Hisobotlar';
      case 'settings':
        return 'Sozlamalar';
      default:
        return 'Bosh sahifa';
    }
  };

  // 1. If on Landing Page Route
  if (route === 'landing') {
    return (
      <LandingPage
        onGoToAdmin={() => navigateTo('admin', '/admin-panel')}
      />
    );
  }

  // 2. If on Admin Route but Not Authenticated
  if (!token) {
    return (
      <Login
        onLoginSuccess={(t) => setToken(t)}
        onBackToHome={() => navigateTo('landing', '/')}
      />
    );
  }

  // 3. Admin Panel Authenticated Dashboard
  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      {/* Sidebar */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} onLogout={handleLogout} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="bg-white border-b border-slate-200/80 px-8 py-3 flex items-center justify-between">
          <button
            onClick={() => navigateTo('landing', '/')}
            className="flex items-center space-x-1.5 text-xs font-bold text-slate-500 hover:text-blue-600 transition"
          >
            <span>🌐 Asosiy saytga o'tish (getpos.uz)</span>
          </button>
          <span className="text-[11px] font-semibold text-slate-400">
            Super Admin Rejimi (/admin-panel)
          </span>
        </div>

        <Header title={getPageTitle()} />

        <main className="flex-1 p-8 max-w-7xl w-full mx-auto">
          {activeTab === 'dashboard' && (
            <DashboardPage onSelectTenant={handleSelectTenant} />
          )}
          {activeTab === 'tenants' && (
            <TenantsPage 
              tenants={tenants} 
              setTenants={setTenants} 
              onSelectTenant={handleSelectTenant} 
              loading={loadingTenants}
              refreshTenants={loadTenants}
            />
          )}
          {activeTab === 'tenant-detail' && (
            <TenantDetailPage 
              tenantId={selectedTenantId} 
              onBack={() => setActiveTab('tenants')} 
            />
          )}
          {activeTab === 'products' && (
            <ProductsPage tenants={tenants} />
          )}
          {activeTab === 'reports' && (
            <ReportsPage />
          )}
          {activeTab === 'settings' && (
            <SettingsPage />
          )}
        </main>
      </div>
    </div>
  );
}
