import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import DashboardPage from './pages/DashboardPage';
import TenantsPage from './pages/TenantsPage';
import TenantDetailPage from './pages/TenantDetailPage';
import ProductsPage from './pages/ProductsPage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';
import { apiFetch } from './utils/api';

function Login({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 border border-slate-100 animate-in fade-in zoom-in duration-150">
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white mb-3 shadow-lg shadow-blue-500/20">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-900">SotuvPro</h2>
          <p className="text-sm text-slate-500 mt-1">Platforma Admin Paneli</p>
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
              placeholder="admin@sotuvpro.uz"
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
  const [token, setToken] = useState(localStorage.getItem('admin_access_token'));
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedTenantId, setSelectedTenantId] = useState(null);
  const [tenants, setTenants] = useState([]);
  const [loadingTenants, setLoadingTenants] = useState(false);

  useEffect(() => {
    if (token) {
      loadTenants();
    }
  }, [token]);

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

  if (!token) {
    return <Login onLoginSuccess={(t) => setToken(t)} />;
  }

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      {/* Sidebar */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} onLogout={handleLogout} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
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
