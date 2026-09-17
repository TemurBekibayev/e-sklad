import React, { useState, useEffect } from 'react';
import { X, User, Shield, Mail, Phone, Lock, KeyRound, CheckCircle2 } from 'lucide-react';

export default function EditWorkerModal({ isOpen, onClose, worker, onSave, tenantId }) {
  const [formData, setFormData] = useState({
    name: '',
    role: 'worker',
    email: '',
    phone_number: '',
    password: '',
    pin: '',
    is_active: true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (worker) {
      setFormData({
        name: worker.name || '',
        role: worker.role || 'worker',
        email: worker.email || '',
        phone_number: worker.phone_number || '',
        password: worker.plain_password || '',
        pin: worker.plain_pin || '',
        is_active: worker.is_active !== undefined ? worker.is_active : true,
      });
    } else {
      setFormData({
        name: '',
        role: 'worker',
        email: '',
        phone_number: '',
        password: '',
        pin: '',
        is_active: true,
      });
    }
    setError('');
  }, [worker, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('Iltimos, xodim ismini kiriting');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const payload = {
        name: formData.name.trim(),
        role: formData.role,
        email: formData.email.trim(),
        phone_number: formData.phone_number.trim(),
        is_active: formData.is_active,
      };

      if (formData.password) {
        payload.password = formData.password.trim();
      }
      if (formData.pin !== undefined) {
        payload.pin = formData.pin.trim();
      }
      if (!worker && tenantId) {
        payload.tenant = tenantId;
      }

      await onSave(payload, worker?.id);
      onClose();
    } catch (err) {
      setError(err.message || 'Xatolik yuz berdi');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100 animate-in fade-in zoom-in duration-150">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {worker ? "Xodim ma'lumotlarini tahrirlash" : "Yangi xodim qo'shish"}
              </h3>
              <p className="text-xs text-slate-500">
                {worker ? worker.name : "Filial / do'kon uchun yangi xodim yaratish"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 rounded-lg p-1.5 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-xl">
              {error}
            </div>
          )}

          {/* Ism */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Xodimning To'liq Ismi <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Masalan: Jasur Abdullayev"
                required
                className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition"
              />
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            </div>
          </div>

          {/* Roli & Holati (Grid) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Xodim Roli <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition"
                >
                  <option value="worker">Savdo xodimi / Kassir / Ofitsiant</option>
                  <option value="manager">Menejer / Administrator</option>
                  <option value="admin">Platforma Admini</option>
                </select>
                <Shield className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Faollik holati
              </label>
              <div className="flex items-center h-[42px] px-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                <label className="flex items-center cursor-pointer space-x-2.5 select-none">
                  <input
                    type="checkbox"
                    name="is_active"
                    checked={formData.is_active}
                    onChange={handleChange}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                  />
                  <span className={`text-xs font-bold ${formData.is_active ? 'text-emerald-700' : 'text-slate-500'}`}>
                    {formData.is_active ? '🟢 Faol (Ruxsat berilgan)' : '🔴 Nofaol (Bloklangan)'}
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Email / Login */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Email / Tizimga kirish logini
            </label>
            <div className="relative">
              <input
                type="text"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="masalan: xodim@getpos.uz yoki telefon raqam"
                className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition"
              />
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            </div>
          </div>

          {/* Telefon */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Telefon raqami
            </label>
            <div className="relative">
              <input
                type="text"
                name="phone_number"
                value={formData.phone_number}
                onChange={handleChange}
                placeholder="+998 90 123 45 67"
                className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition"
              />
              <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            </div>
          </div>

          {/* Parol & PIN (Grid) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Tizim Paroli {worker && <span className="text-[10px] text-slate-400 font-normal">(O'zgartirish uchun)</span>}
              </label>
              <div className="relative">
                <input
                  type="text"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder={worker ? "Yangi parol yoki eskisi" : "Masalan: pass1234"}
                  className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Kirish PIN kodi <span className="text-[10px] text-slate-400 font-normal">(Kassa/Ofitsiant)</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  name="pin"
                  maxLength={6}
                  value={formData.pin}
                  onChange={handleChange}
                  placeholder="Masalan: 3333"
                  className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-blue-600 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition"
                />
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="pt-4 flex items-center justify-end space-x-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              Bekor qilish
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-600/20 transition disabled:opacity-50 flex items-center space-x-1.5"
            >
              {saving ? (
                <span>Saqlanmoqda...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{worker ? "O'zgarishlarni saqlash" : "Xodimni qo'shish"}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
