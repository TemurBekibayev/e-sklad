import React, { useState } from 'react';
import { X, ShoppingBag, Utensils } from 'lucide-react';

export default function NewTenantModal({ isOpen, onClose, onSave }) {
  const [name, setName] = useState('');
  const [businessType, setBusinessType] = useState('retail'); // 'retail' | 'cafe'
  const [address, setAddress] = useState('');
  const [managerName, setManagerName] = useState('');
  const [managerEmail, setManagerEmail] = useState('');
  const [managerPhone, setManagerPhone] = useState('');
  const [managerPassword, setManagerPassword] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim() || !managerName.trim() || !managerPhone.trim() || !managerPassword.trim()) return;

    onSave({
      name,
      business_type: businessType,
      address,
      manager_name: managerName,
      manager_email: managerEmail,
      manager_phone: managerPhone,
      manager_pin: '1111',
      manager_password: managerPassword
    });

    setName('');
    setBusinessType('retail');
    setAddress('');
    setManagerName('');
    setManagerEmail('');
    setManagerPhone('');
    setManagerPassword('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100 animate-in fade-in zoom-in duration-150">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900">Yangi filial / ob'yekt qo'shish</h3>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 rounded-lg p-1 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Category / Business Type Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Faoliyat turi (Kategoriya) <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setBusinessType('retail')}
                className={`flex items-center space-x-3 p-3 rounded-xl border-2 transition text-left ${
                  businessType === 'retail'
                    ? 'border-blue-600 bg-blue-50/60 text-blue-900 ring-2 ring-blue-600/20'
                    : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                }`}
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                  businessType === 'retail' ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 text-slate-500'
                }`}>
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold leading-tight">Savdo / Do'kon</div>
                  <div className="text-[10px] text-slate-400 font-medium">Chakana, ombor</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setBusinessType('cafe')}
                className={`flex items-center space-x-3 p-3 rounded-xl border-2 transition text-left ${
                  businessType === 'cafe'
                    ? 'border-amber-500 bg-amber-50/60 text-amber-900 ring-2 ring-amber-500/20'
                    : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                }`}
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                  businessType === 'cafe' ? 'bg-amber-500 text-white shadow-sm' : 'bg-slate-100 text-slate-500'
                }`}>
                  <Utensils className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold leading-tight">Kafe & Restoran</div>
                  <div className="text-[10px] text-slate-400 font-medium">Stollar, oshxona</div>
                </div>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              {businessType === 'cafe' ? 'Kafe / Restoran nomi' : "Do'kon nomi"} <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={businessType === 'cafe' ? "Masalan: Lazzat Kafe" : "Masalan: Toshkent Elektron"}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Manzil <span className="text-slate-400 font-normal">(ixtiyoriy)</span>
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Manzilni kiriting"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
            />
          </div>

          <div className="pt-2 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
              Birinchi manager (Tizim boshqaruvchisi)
            </h4>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Manager ismi (F.I.SH) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={managerName}
                  onChange={(e) => setManagerName(e.target.value)}
                  placeholder="Manager ismini kiriting"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Telefon raqami (Login sifatida) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={managerPhone}
                  onChange={(e) => setManagerPhone(e.target.value)}
                  placeholder="+998901234567"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Tizim paroli (Kassa va panelga kirish) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  value={managerPassword}
                  onChange={(e) => setManagerPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Email manzili <span className="text-slate-400 font-normal">(ixtiyoriy)</span>
                </label>
                <input
                  type="email"
                  value={managerEmail}
                  onChange={(e) => setManagerEmail(e.target.value)}
                  placeholder="manager@getpos.uz"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 flex items-center justify-end space-x-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
            >
              Bekor qilish
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-600/20 transition font-bold"
            >
              Saqlash
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
