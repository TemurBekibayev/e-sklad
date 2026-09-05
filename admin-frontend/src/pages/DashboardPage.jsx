import React, { useState, useEffect } from 'react';
import { Store, Users, DollarSign, AlertTriangle, Bell } from 'lucide-react';
import { apiFetch } from '../utils/api';

export default function DashboardPage({ onSelectTenant }) {
  const [stats, setStats] = useState({
    activeTenants: 0,
    totalUsers: 0,
    todaySales: '0 UZS',
    overdueDebts: '0 UZS',
    attentionRequired: [],
    recentActivity: []
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);
    try {
      const data = await apiFetch('/admin/stats/');
      if (data) {
        setStats(prev => ({
          ...prev,
          ...data,
          attentionRequired: data.attentionRequired || [],
          recentActivity: data.recentActivity || []
        }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const attentionRequired = stats.attentionRequired || [];
  const recentActivity = stats.recentActivity || [];

  const getActionBadge = (action, type) => {
    switch (type) {
      case 'success':
        return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">{action}</span>;
      case 'primary':
        return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700">{action}</span>;
      case 'warning':
        return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700">{action}</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">{action}</span>;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        {/* Card 1 */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-600">Faol do'konlar</span>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Store className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-bold text-slate-900 tracking-tight">{stats.activeTenants}</div>
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-600">Jami foydalanuvchilar</span>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-bold text-slate-900 tracking-tight">{stats.totalUsers}</div>
          </div>
        </div>

        {/* Card 3 */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-600">Bugungi savdo</span>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-bold text-slate-900 tracking-tight">{stats.todaySales}</div>
          </div>
        </div>

        {/* Card 4 (Red highlighted) */}
        <div className="bg-[#FFF5F5] rounded-2xl p-6 border border-red-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-red-900">Muddati o'tgan qarzlar</span>
            <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-bold text-red-600 tracking-tight">{stats.overdueDebts}</div>
          </div>
        </div>
      </div>

      {/* Diqqat talab qilinadi Section */}
      <div className="bg-white rounded-2xl p-6 border border-red-200 shadow-sm">
        <div className="flex items-center space-x-2 text-red-600 font-bold text-base mb-4">
          <Bell className="w-5 h-5" />
          <span>Diqqat talab qiladi</span>
        </div>

        <div className="space-y-2.5">
          {attentionRequired.length > 0 ? (
            attentionRequired.map((item) => (
              <div
                key={item.id}
                onClick={() => onSelectTenant && onSelectTenant(item.id)}
                className="flex items-center justify-between p-3.5 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50/70 transition cursor-pointer"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-lg bg-red-50 text-red-500 flex items-center justify-center">
                    <Store className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-semibold text-slate-900">{item.name}</span>
                </div>
                <div className="flex items-center space-x-2 text-xs font-semibold text-red-600">
                  <span className="w-2 h-2 rounded-full bg-red-600 inline-block"></span>
                  <span>{item.days}</span>
                </div>
              </div>
            ))
          ) : (
            <div className="py-4 text-center text-xs font-medium text-slate-400">
              Ayni paytda kechiktirilgan yoki muammoli do'konlar mavjud emas. Barchasi joyida!
            </div>
          )}
        </div>
      </div>

      {/* So'nggi faollik Section */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm">
        <h3 className="text-base font-bold text-slate-900 mb-4">So'nggi faollik</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-xs font-semibold text-slate-600 uppercase">
                <th className="py-3 px-4">Do'kon</th>
                <th className="py-3 px-4">Foydalanuvchi</th>
                <th className="py-3 px-4">Amal</th>
                <th className="py-3 px-4 text-right">Vaqt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {recentActivity.length > 0 ? (
                recentActivity.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3.5 px-4 font-medium text-slate-900 flex items-center space-x-2.5">
                      <Store className="w-4 h-4 text-slate-600" />
                      <span>{row.tenant}</span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-700">
                      <div className="flex items-center space-x-2">
                        <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 text-xs font-bold flex items-center justify-center">
                          {row.userInitial}
                        </div>
                        <span>{row.user}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      {getActionBadge(row.action, row.actionType)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-medium text-slate-500">
                      {row.time}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-xs font-medium text-slate-400">
                    Hozircha tizimda audit harakatlari qayd etilmagan
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
