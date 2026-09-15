import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, 
  Package, 
  DollarSign, 
  Users, 
  AlertTriangle,
  CreditCard,
  Calendar,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  Clock,
  Plus
} from 'lucide-react';
import PaymentModal from '../components/PaymentModal';
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
  const [activeTab, setActiveTab] = useState('billing');
  const [tenant, setTenant] = useState(null);
  const [workers, setWorkers] = useState([]);
  const [products, setProducts] = useState([]);
  const [subscriptionPayments, setSubscriptionPayments] = useState([]);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
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

      try {
        const historyData = await apiFetch(`/tenants/${tenantId}/subscription-history/`);
        setSubscriptionPayments(Array.isArray(historyData) ? historyData : []);
      } catch (e) {
        setSubscriptionPayments([]);
      }
    } catch (err) {
      console.error('Do\'kon tafsilotlarini yuklashda xatolik:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!tenant) return;
    const newStatus = tenant.status === 'active' ? 'frozen' : 'active';
    try {
      await apiFetch(`/tenants/${tenant.id}/`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus })
      });
      loadTenantData();
    } catch (err) {
      alert(err.message);
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
    { id: 'billing', label: 'Obuna va To\'lovlar' },
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

      {/* Tab 1: Obuna va To'lovlar */}
      {activeTab === 'billing' && (
        <div className="space-y-6">
          {/* Subscription Status Card */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-100">
              <div className="flex items-center gap-3.5">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-md ${
                  tenant?.status === 'active' && tenant?.is_subscription_active !== false
                    ? 'bg-emerald-600 shadow-emerald-600/20'
                    : 'bg-rose-600 shadow-rose-600/20'
                }`}>
                  <CreditCard className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-black text-slate-900">Oylik Obuna & To'lov Holati</h3>
                    {tenant?.status === 'active' ? (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        🟢 Faol
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                        🔴 Muzlatilgan (Xizmat to'xtatilgan)
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    {tenant?.status === 'active'
                      ? "Do'kon barcha xizmatlardan, kassa va mobil ilovalardan to'liq foydalanmoqda"
                      : "Do'kon oylik to'lov muddati tugaganligi sababli bloklangan"}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2.5">
                <button
                  onClick={handleToggleStatus}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold border transition ${
                    tenant?.status === 'active'
                      ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                  }`}
                >
                  {tenant?.status === 'active' ? '🔒 Do\'konni Muzlatish' : '🔓 Blokdan Ochish'}
                </button>

                <button
                  onClick={() => setIsPaymentModalOpen(true)}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-lg shadow-blue-600/20 active:scale-95 transition flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>➕ To'lov Qabul Qilish & Uzaytirish</span>
                </button>
              </div>
            </div>

            {/* 4 Detail Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-xs text-slate-500 font-semibold block mb-1">To'langan muddat:</span>
                <div className="text-lg font-black text-slate-900 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  <span>{tenant?.paid_until ? new Date(tenant.paid_until).toLocaleDateString('ru-RU') : "Belgilanmagan"}</span>
                </div>
                <span className="text-[11px] font-bold text-slate-400 mt-1 block">
                  {tenant?.paid_until ? (
                    tenant.days_left >= 0 ? (
                      <span className="text-emerald-600">{tenant.days_left} kun qoldi</span>
                    ) : (
                      <span className="text-rose-600">Muddati o'tgan (Qarzdor)</span>
                    )
                  ) : "Cheksiz / Sinov"}
                </span>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-xs text-slate-500 font-semibold block mb-1">Oylik abonent to'lovi:</span>
                <div className="text-lg font-black text-blue-600">
                  {tenant?.subscription_monthly_fee ? parseFloat(tenant.subscription_monthly_fee).toLocaleString('ru-RU') : '250 000'} <span className="text-xs font-bold text-slate-500">so'm/oy</span>
                </div>
                <span className="text-[11px] font-medium text-slate-400 mt-1 block">Standart tarif</span>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-xs text-slate-500 font-semibold block mb-1">Oxirgi to'lov:</span>
                <div className="text-lg font-black text-slate-900">
                  {tenant?.last_payment_amount ? `${parseFloat(tenant.last_payment_amount).toLocaleString('ru-RU')} so'm` : "-"}
                </div>
                <span className="text-[11px] font-medium text-slate-400 mt-1 block">
                  {tenant?.last_payment_date ? new Date(tenant.last_payment_date).toLocaleDateString('ru-RU') : "To'lovlar yo'q"}
                </span>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-xs text-slate-500 font-semibold block mb-1">Avtomatik bloklash:</span>
                <div className="text-lg font-black text-emerald-600 flex items-center gap-1.5">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  <span>{tenant?.auto_freeze_on_expiry !== false ? "Faol" : "O'chirilgan"}</span>
                </div>
                <span className="text-[11px] font-medium text-slate-400 mt-1 block">Muddati o'tsa bloklaydi</span>
              </div>
            </div>
          </div>

          {/* Payment History Table */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-black text-slate-900">Obuna To'lovlari Tarixi</h3>
              </div>
              <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
                {subscriptionPayments.length} ta to'lov
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    <th className="py-3 px-4">TO'LOV VAQTI</th>
                    <th className="py-3 px-4">SUMMA</th>
                    <th className="py-3 px-4">DAVR (OY)</th>
                    <th className="py-3 px-4">TO'LANGAN MUDDAT</th>
                    <th className="py-3 px-4">TO'LOV USULI</th>
                    <th className="py-3 px-4">QABUL QILDI</th>
                    <th className="py-3 px-4">IZOH</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {subscriptionPayments.map((p) => {
                    const methodLabels = {
                      cash: '💵 Naqd',
                      card: '💳 Karta',
                      bank_transfer: '🏦 Bank',
                      click: '📱 Click',
                      payme: '📱 Payme',
                      admin: '⚙️ Admin'
                    };

                    return (
                      <tr key={p.id} className="hover:bg-slate-50/60 transition">
                        <td className="py-3.5 px-4 font-semibold text-slate-900">
                          {p.payment_date ? new Date(p.payment_date).toLocaleString('ru-RU') : '-'}
                        </td>
                        <td className="py-3.5 px-4 font-black text-blue-600">
                          {parseFloat(p.amount || 0).toLocaleString('ru-RU')} so'm
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-800">
                          {p.months_paid} oy
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-lg text-xs">
                            {p.paid_until ? new Date(p.paid_until).toLocaleDateString('ru-RU') : '-'} gacha
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-xs font-bold text-slate-700">
                          {methodLabels[p.payment_method] || p.payment_method}
                        </td>
                        <td className="py-3.5 px-4 text-slate-500 font-medium text-xs">
                          {p.created_by_name || 'Admin'}
                        </td>
                        <td className="py-3.5 px-4 text-slate-500 text-xs">
                          {p.notes || '-'}
                        </td>
                      </tr>
                    );
                  })}
                  {subscriptionPayments.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-slate-400 font-medium text-xs">
                        Hozircha to'lovlar tarixi mavjud emas.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

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

      {/* Payment Modal */}
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        tenant={tenant}
        onPaymentSuccess={() => loadTenantData()}
      />
    </div>
  );
}
