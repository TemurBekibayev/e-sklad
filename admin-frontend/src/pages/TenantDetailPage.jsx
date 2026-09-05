import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, 
  Package, 
  DollarSign, 
  Users, 
  AlertTriangle 
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { apiFetch } from '../utils/api';

export default function TenantDetailPage({ tenantId, onBack }) {
  const [activeTab, setActiveTab] = useState('workers');
  const [tenant, setTenant] = useState(null);
  const [workers, setWorkers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (tenantId) {
      loadTenantData();
    }
  }, [tenantId]);

  const loadTenantData = async () => {
    setLoading(true);
    try {
      const tenantData = await apiFetch(`/tenants/${tenantId}/`);
      setTenant(tenantData);
      
      const workersData = await apiFetch(`/users/?tenant_id=${tenantId}`);
      const workersList = workersData.results || (Array.isArray(workersData) ? workersData : []);
      setWorkers(workersList);

      const productsData = await apiFetch(`/products/?tenant_id=${tenantId}`);
      const productsList = productsData.results || (Array.isArray(productsData) ? productsData : []);
      setProducts(productsList);
    } catch (err) {
      console.error('Do\'kon tafsilotlarini yuklashda xatolik:', err);
    } finally {
      setLoading(false);
    }
  };

  const getRoleLabel = (role) => {
    switch (role) {
      case 'admin':
        return 'Platforma admini';
      case 'manager':
        return 'Menejer';
      case 'worker':
        return 'Savdo xodimi';
      default:
        return role;
    }
  };

  const tabs = [
    { id: 'workers', label: 'Xodimlar' },
    { id: 'products', label: 'Mahsulotlar' },
    { id: 'debts', label: 'Qarz daftari' },
  ];

  if (loading && !tenant) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-500 font-semibold text-sm">
        Yuklanmoqda...
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-150">
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center space-x-1.5 text-sm font-semibold text-slate-600 hover:text-blue-600 transition group"
      >
        <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
        <span>Do'konlar ro'yxatiga qaytish</span>
      </button>

      {/* Tenant Title & Status */}
      <div className="flex items-center space-x-3">
        <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          {tenant?.name || 'Yuklanmoqda...'}
        </h2>
        {tenant?.status === 'active' ? (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700">
            Faol
          </span>
        ) : (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-50 text-red-700">
            Muzlatilgan
          </span>
        )}
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-600">Jami mahsulotlar</span>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Package className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-bold text-slate-900 tracking-tight">
              {tenant?.products_count || 0} ta
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-600">Bugungi savdo</span>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-bold text-slate-900 tracking-tight">
              {tenant?.today_sales || '0 so\'m'}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-600">Faol xodimlar</span>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-bold text-slate-900 tracking-tight">
              {tenant?.users_count || 0} nafar
            </div>
          </div>
        </div>

        <div className="bg-[#FFF5F5] rounded-2xl p-6 border border-red-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-red-900">Umumiy qarzlar</span>
            <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-bold text-red-600 tracking-tight">
              {tenant?.total_debts || '0 so\'m'}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-3 px-1 text-sm font-semibold border-b-2 transition ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab 2: Xodimlar */}
      {activeTab === 'workers' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm">
          <h3 className="text-base font-bold text-slate-900 mb-4">Do'kon xodimlari</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-600 uppercase">
                  <th className="py-3 px-4">Ism</th>
                  <th className="py-3 px-4">Roli</th>
                  <th className="py-3 px-4">Email / Login</th>
                  <th className="py-3 px-4">Kirish PIN</th>
                  <th className="py-3 px-4">Tizim Parol</th>
                  <th className="py-3 px-4">Telefon</th>
                  <th className="py-3 px-4">Holati</th>
                  <th className="py-3 px-4 text-right">Oxirgi faollik</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {workers.map((w) => (
                  <tr key={w.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3.5 px-4 font-bold text-slate-900">{w.name}</td>
                    <td className="py-3.5 px-4 text-slate-600">{getRoleLabel(w.role)}</td>
                    <td className="py-3.5 px-4 text-slate-500 font-medium">{w.email || '-'}</td>
                    <td className="py-3.5 px-4 text-blue-600 font-bold">{w.plain_pin || '-'}</td>
                    <td className="py-3.5 px-4 text-slate-700 font-semibold">{w.plain_password || '-'}</td>
                    <td className="py-3.5 px-4 text-slate-500 font-medium">{w.phone_number || '-'}</td>
                    <td className="py-3.5 px-4">
                      {w.is_active ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">
                          Faol
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
                          Nofaol
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right text-slate-500 text-xs font-medium">
                      {w.last_login ? new Date(w.last_login).toLocaleDateString('ru-RU') : '-'}
                    </td>
                  </tr>
                ))}
                {workers.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-500 font-medium">
                      Xodimlar topilmadi.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Mahsulotlar */}
      {activeTab === 'products' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm">
          <h3 className="text-base font-bold text-slate-900 mb-4">Mahsulotlar ro'yxati</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-600 uppercase">
                  <th className="py-3 px-4">Mahsulot nomi</th>
                  <th className="py-3 px-4">Shtrix-kod</th>
                  <th className="py-3 px-4">Sotish narxi</th>
                  <th className="py-3 px-4">Ombor qoldig'i</th>
                  <th className="py-3 px-4 text-right">Birligi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {products.map((p) => {
                  const isLow = parseFloat(p.current_stock || 0) <= 5.0;
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3.5 px-4 font-bold text-slate-900">{p.name}</td>
                      <td className="py-3.5 px-4 text-slate-500 font-medium">{p.barcode || '-'}</td>
                      <td className="py-3.5 px-4 font-semibold text-slate-800">
                        {p.price_per_sale_unit ? parseFloat(p.price_per_sale_unit).toLocaleString('ru-RU') + " so'm" : '-'}
                      </td>
                      <td className="py-3.5 px-4">
                        {isLow ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700">
                            {parseFloat(p.current_stock || 0)} {p.sale_unit}
                          </span>
                        ) : (
                          <span className="text-slate-700">{parseFloat(p.current_stock || 0)} {p.sale_unit}</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right text-slate-500 font-medium">{p.sale_unit || '-'}</td>
                    </tr>
                  );
                })}
                {products.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500 font-medium">
                      Mahsulotlar topilmadi.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: Qarz daftari */}
      {activeTab === 'debts' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm">
          <h3 className="text-base font-bold text-slate-900 mb-4">Qarz daftari</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-600 uppercase">
                  <th className="py-3 px-4">Mijoz</th>
                  <th className="py-3 px-4">Telefon</th>
                  <th className="py-3 px-4">Jami qarz</th>
                  <th className="py-3 px-4">Qoldiq</th>
                  <th className="py-3 px-4">Muddati</th>
                  <th className="py-3 px-4 text-right">Holati</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500 font-medium">
                    Qarzlar mavjud emas.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
