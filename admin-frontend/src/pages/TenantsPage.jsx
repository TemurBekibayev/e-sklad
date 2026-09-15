import React, { useState } from 'react';
import { Search, Plus, MoreHorizontal, ChevronLeft, ChevronRight, CreditCard, Calendar, AlertTriangle, CheckCircle2, ShieldAlert, Copy, Check } from 'lucide-react';
import NewTenantModal from '../components/NewTenantModal';
import PaymentModal from '../components/PaymentModal';
import { apiFetch } from '../utils/api';

export default function TenantsPage({ tenants, setTenants, onSelectTenant, loading, refreshTenants }) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedTenantForPayment, setSelectedTenantForPayment] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [copiedId, setCopiedId] = useState(null);

  const handleCopyId = (e, id) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleAddTenant = async (newTenant) => {
    try {
      await apiFetch('/tenants/', {
        method: 'POST',
        body: JSON.stringify(newTenant)
      });
      if (refreshTenants) {
        refreshTenants();
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleToggleStatus = async (tenantId, currentStatus) => {
    const newStatus = currentStatus === 'active' ? 'frozen' : 'active';
    try {
      await apiFetch(`/tenants/${tenantId}/`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus })
      });
      if (refreshTenants) {
        refreshTenants();
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleOpenPayment = (e, tenant) => {
    e.stopPropagation();
    setSelectedTenantForPayment(tenant);
    setIsPaymentModalOpen(true);
  };

  const handlePaymentSuccess = () => {
    if (refreshTenants) {
      refreshTenants();
    }
  };

  const filteredTenants = (Array.isArray(tenants) ? tenants : []).filter((tenant) => {
    const name = tenant.name || '';
    const address = tenant.address || '';
    const matchesSearch = name.toLowerCase().includes(search.toLowerCase()) ||
                          address.toLowerCase().includes(search.toLowerCase());
    
    let matchesStatus = true;
    if (statusFilter === 'active') {
      matchesStatus = tenant.status === 'active';
    } else if (statusFilter === 'inactive') {
      matchesStatus = tenant.status === 'frozen';
    } else if (statusFilter === 'overdue') {
      matchesStatus = tenant.days_left !== undefined && tenant.days_left < 0;
    }

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Top action row */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-4 flex-1 max-w-xl">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Do'kon qidirish..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200/90 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 shadow-sm"
            />
          </div>

          {/* Status Dropdown */}
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">Holat:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3.5 py-2.5 bg-white border border-slate-200/90 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600 shadow-sm"
            >
              <option value="all">Barcha do'konlar</option>
              <option value="active">Faol</option>
              <option value="inactive">Muzlatilgan</option>
              <option value="overdue">To'lov muddati o'tganlar</option>
            </select>
          </div>
        </div>

        {/* Add button */}
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center space-x-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-md shadow-blue-600/20 active:scale-95 transition"
        >
          <Plus className="w-4 h-4" />
          <span>Yangi do'kon qo'shish</span>
        </button>
      </div>

      {/* Tenants Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                <th className="py-4 px-6">NOMI</th>
                <th className="py-4 px-6">MANZIL</th>
                <th className="py-4 px-6">TO'LOV MUDDATI (HOLATI)</th>
                <th className="py-4 px-6">XODIMLAR</th>
                <th className="py-4 px-6">HOLATI</th>
                <th className="py-4 px-6 text-right">AMALLAR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredTenants.map((row) => {
                const isPaid = row.paid_until && row.days_left >= 0;
                const isOverdue = row.paid_until && row.days_left < 0;

                return (
                  <tr
                    key={row.id}
                    onClick={() => onSelectTenant(row.id)}
                    className="hover:bg-slate-50/70 transition cursor-pointer group"
                  >
                    <td className="py-4 px-6">
                      <div className="flex flex-col items-start gap-1">
                        <span className="font-bold text-slate-900 group-hover:text-blue-600 transition">
                          {row.name}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => handleCopyId(e, row.id)}
                          title="Do'kon ID sini nusxalash"
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-[11px] font-mono text-slate-500 border border-slate-200/60 transition group/btn"
                        >
                          {copiedId === row.id ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                              <span className="text-emerald-600 font-sans font-semibold">Nusxalandi!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3 text-slate-400 group-hover/btn:text-blue-600 shrink-0" />
                              <span>ID: {row.id ? `${row.id.slice(0, 8)}...` : '-'}</span>
                            </>
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-slate-600">
                      {row.address || '-'}
                    </td>
                    <td className="py-4 px-6">
                      {row.paid_until ? (
                        isPaid ? (
                          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 rounded-xl w-fit">
                            <Calendar className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>{new Date(row.paid_until).toLocaleDateString('ru-RU')}</span>
                            <span className="text-[10px] text-emerald-600 font-medium">({row.days_left} kun qoldi)</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200/80 px-2.5 py-1 rounded-xl w-fit">
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                            <span>Muddati o'tgan ({new Date(row.paid_until).toLocaleDateString('ru-RU')})</span>
                          </div>
                        )
                      ) : (
                        <span className="text-xs text-slate-400 font-medium bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-lg">
                          Cheksiz / Sinov
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6 font-semibold text-slate-900">
                      {row.users_count} ta
                    </td>
                    <td className="py-4 px-6">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleStatus(row.id, row.status);
                        }}
                        title="Holatni o'zgartirish (Muzlatish / Faollashtirish)"
                        className="focus:outline-none"
                      >
                        {row.status === 'active' ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-amber-50 hover:text-amber-700 transition">
                            🟢 Faol
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-emerald-50 hover:text-emerald-700 transition">
                            🔴 Muzlatilgan
                          </span>
                        )}
                      </button>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={(e) => handleOpenPayment(e, row)}
                          title="Oylik to'lov qabul qilish va ochish"
                          className="px-3 py-1.5 bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white border border-blue-200 hover:border-blue-600 rounded-xl text-xs font-bold flex items-center gap-1.5 transition active:scale-95 shadow-xs"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          <span>To'lov</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredTenants.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400 font-medium">
                    Hech qanday do'kon topilmadi.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
          <div>
            Jami: <span className="font-bold text-slate-900">{filteredTenants.length}</span> ta do'kon
          </div>
        </div>
      </div>

      {/* New Tenant Modal */}
      <NewTenantModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleAddTenant}
      />

      {/* Payment Modal */}
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => {
          setIsPaymentModalOpen(false);
          setSelectedTenantForPayment(null);
        }}
        tenant={selectedTenantForPayment}
        onPaymentSuccess={handlePaymentSuccess}
      />
    </div>
  );
}

