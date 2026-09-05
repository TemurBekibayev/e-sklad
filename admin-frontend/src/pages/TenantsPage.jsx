import React, { useState } from 'react';
import { Search, Plus, MoreHorizontal, ChevronLeft, ChevronRight } from 'lucide-react';
import NewTenantModal from '../components/NewTenantModal';
import { apiFetch } from '../utils/api';

export default function TenantsPage({ tenants, setTenants, onSelectTenant, loading, refreshTenants }) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

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

  const filteredTenants = (Array.isArray(tenants) ? tenants : []).filter((tenant) => {
    const name = tenant.name || '';
    const address = tenant.address || '';
    const matchesSearch = name.toLowerCase().includes(search.toLowerCase()) ||
                          address.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || 
                          (statusFilter === 'active' && tenant.status === 'active') ||
                          (statusFilter === 'inactive' && tenant.status === 'frozen');
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Top action row */}
      <div className="flex items-center justify-between">
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
              <option value="all">Barchasi</option>
              <option value="active">Faol</option>
              <option value="inactive">Nofaol</option>
            </select>
          </div>
        </div>

        {/* Add button */}
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center space-x-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-md shadow-blue-600/20 transition"
        >
          <Plus className="w-4 h-4" />
          <span>Yangi do'kon</span>
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
                <th className="py-4 px-6">QO'SHILGAN SANA</th>
                <th className="py-4 px-6">XODIMLAR SONI</th>
                <th className="py-4 px-6">HOLATI</th>
                <th className="py-4 px-6">OXIRGI FAOLLIK</th>
                <th className="py-4 px-6 text-right">AMALLAR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredTenants.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => onSelectTenant(row.id)}
                  className="hover:bg-slate-50/70 transition cursor-pointer group"
                >
                  <td className="py-4 px-6 font-bold text-slate-900 group-hover:text-blue-600 transition">
                    {row.name}
                  </td>
                  <td className="py-4 px-6 text-slate-600">
                    {row.address}
                  </td>
                  <td className="py-4 px-6 text-slate-500 font-medium">
                    {row.created_at ? new Date(row.created_at).toLocaleDateString('ru-RU') : '-'}
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
                      title="Holatni o'zgartirish"
                      className="focus:outline-none"
                    >
                      {row.status === 'active' ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-amber-50 hover:text-amber-700 transition">
                          Faol
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 hover:bg-emerald-50 hover:text-emerald-700 transition">
                          Muzlatilgan
                        </span>
                      )}
                    </button>
                  </td>
                  <td className="py-4 px-6">
                    <span className={`font-semibold text-xs ${row.is_inactive_warning ? 'text-red-600' : 'text-slate-700'}`}>
                      {row.last_active || "Faol"}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                      className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition"
                    >
                      <MoreHorizontal className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
          <div>
            Ko'rsatilmoqda <span className="font-semibold text-slate-800">1-{filteredTenants.length}</span> dan <span className="font-semibold text-slate-800">24</span> tasi
          </div>
          <div className="flex items-center space-x-1.5">
            <button className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-400 hover:text-slate-600 transition">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button className="w-8 h-8 rounded-lg bg-blue-600 text-white font-bold flex items-center justify-center shadow-sm">
              1
            </button>
            <button className="w-8 h-8 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold flex items-center justify-center transition">
              2
            </button>
            <button className="w-8 h-8 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold flex items-center justify-center transition">
              3
            </button>
            <button className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-400 hover:text-slate-600 transition">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Modal */}
      <NewTenantModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleAddTenant}
      />
    </div>
  );
}
