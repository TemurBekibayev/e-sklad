import React from 'react';
import { Shield, Key, Bell, Database } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="space-y-6 pb-12 max-w-4xl">
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-6">
        <div>
          <h3 className="text-lg font-bold text-slate-900">Platforma Sozlamalari</h3>
          <p className="text-xs text-slate-500 mt-1">SotuvPro tizimi xavfsizlik va umumiy parametrlarini boshqarish</p>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-slate-50/50">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-900">Ko'p-tenantli izolyatsiya holati</div>
                <div className="text-xs text-slate-500">JWT payload asosidagi qat'iy ma'lumotlar ajratilishi yoqilgan</div>
              </div>
            </div>
            <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full">Faol</span>
          </div>

          <div className="flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-slate-50/50">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Key className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-900">PIN Brute-force himoyasi</div>
                <div className="text-xs text-slate-500">5 ta muvaffaqiyatsiz urinishdan so'ng 5 daqiqa bloklash</div>
              </div>
            </div>
            <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full">Yoqilgan</span>
          </div>

          <div className="flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-slate-50/50">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-900">Avtomatik kunlik zaxira (Backup)</div>
                <div className="text-xs text-slate-500">Celery beat orqali PostgreSQL pg_dump rejimi</div>
              </div>
            </div>
            <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full">Sozlangan</span>
          </div>
        </div>
      </div>
    </div>
  );
}
