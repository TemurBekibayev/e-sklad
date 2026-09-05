import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  ArrowUpRight,
  TrendingUp,
  Store,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { apiFetch } from '../utils/api';

export default function ReportsPage() {
  const [reports, setReports] = useState({
    dateRange: 'Joriy oy',
    storeRatings: [],
    monthlyGrowth: [],
    dau: { count: '0', growth: '0%' },
    wau: { count: '0', growth: '0%' }
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);

    try {
      const data = await apiFetch('/admin/reports/');
      if (data) {
        setReports(data);
      }
    } catch (err) {
      console.error("Reports load error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const { dateRange, storeRatings, monthlyGrowth, dau, wau } = reports;

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Date Range Selector Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Platforma Hisobotlari</h2>
          <p className="text-xs text-slate-500 mt-0.5">Do'konlar savdosi, o'sish dinamikasi va foydalanuvchilar faolligi</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => loadReports(true)}
            disabled={refreshing || loading}
            className="p-2.5 bg-white border border-slate-200/90 rounded-xl text-slate-600 hover:text-blue-600 hover:bg-slate-50 shadow-sm transition disabled:opacity-50"
            title="Yangilash"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-blue-600' : ''}`} />
          </button>
          
          <div className="flex items-center space-x-2 px-4 py-2 bg-white border border-slate-200/90 rounded-xl text-sm font-semibold text-slate-700 shadow-sm">
            <Calendar className="w-4 h-4 text-slate-500" />
            <span>{dateRange}</span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl p-16 border border-slate-200/80 shadow-sm flex flex-col items-center justify-center space-y-3">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          <p className="text-sm font-medium text-slate-500">Hisobotlar hisoblanmoqda...</p>
        </div>
      ) : (
        <>
          {/* 2 Main Graph Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Card 1: Do'konlar reytingi */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col min-h-[380px]">
              <div className="mb-6 flex items-start justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Do'konlar reytingi</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Sotuv hajmi bo'yicha eng faol do'konlar reytingi (Haqiqiy savdolar)</p>
                </div>
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>

              <div className="space-y-4 flex-1 flex flex-col justify-center">
                {storeRatings && storeRatings.length > 0 ? (
                  storeRatings.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between space-x-4 text-xs font-medium">
                      <div className="w-40 flex items-center space-x-2">
                        <span className="w-4 text-slate-400 font-bold">{idx + 1}.</span>
                        <span className="text-slate-800 font-semibold truncate" title={item.name}>{item.name}</span>
                      </div>
                      <div className="flex-1 bg-slate-100 rounded-full h-3.5 overflow-hidden">
                        <div 
                          className="bg-blue-600 h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.max(item.percent, 4)}%` }}
                        ></div>
                      </div>
                      <span className="w-24 text-right font-bold text-slate-900">{item.sales}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-10 text-slate-400 text-sm">
                    Hozircha savdolar mavjud emas
                  </div>
                )}
              </div>
            </div>

            {/* Card 2: Yangi do'konlar o'sishi */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col min-h-[380px]">
              <div className="mb-6 flex items-start justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Yangi do'konlar o'sishi</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Oylar kesimida qo'shilgan savdo nuqtalari dinamikasi</p>
                </div>
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Store className="w-4 h-4" />
                </div>
              </div>

              <div className="h-64 w-full flex-1">
                {monthlyGrowth && monthlyGrowth.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={monthlyGrowth}>
                      <defs>
                        <linearGradient id="storeGrowth" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.25}/>
                          <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                      <XAxis 
                        dataKey="month" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#64748B', fontSize: 12 }} 
                      />
                      <YAxis 
                        hide 
                        allowDecimals={false}
                      />
                      <Tooltip 
                        formatter={(val) => [`${val} ta do'kon`, 'Jami']}
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="stores" 
                        stroke="#3B82F6" 
                        strokeWidth={3} 
                        fillOpacity={1} 
                        fill="url(#storeGrowth)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-10 text-slate-400 text-sm">
                    Grafik ma'lumotlari mavjud emas
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 2 Bottom Stat Cards: DAU / WAU */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Card 1: DAU */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-slate-500">Kunlik faol foydalanuvchilar (DAU)</div>
                <div className="text-3xl font-extrabold text-slate-900 mt-2 tracking-tight">{dau?.count || 0}</div>
              </div>
              <div className="flex items-center space-x-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold">
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>{dau?.growth || '0%'}</span>
              </div>
            </div>

            {/* Card 2: WAU */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-slate-500">Haftalik faol foydalanuvchilar (WAU)</div>
                <div className="text-3xl font-extrabold text-slate-900 mt-2 tracking-tight">{wau?.count || 0}</div>
              </div>
              <div className="flex items-center space-x-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold">
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>{wau?.growth || '0%'}</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
