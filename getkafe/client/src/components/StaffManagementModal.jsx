import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  KeyRound, 
  Trash2, 
  Edit3, 
  CheckCircle2, 
  ShieldCheck, 
  Smartphone, 
  CreditCard, 
  ChefHat, 
  UserCheck,
  Phone,
  Eye,
  EyeOff,
  Lock,
  Mail,
  User as UserIcon
} from 'lucide-react';
import { useDialog } from '../context/DialogContext';

export default function StaffManagementModal({ isOpen, onClose, onStaffUpdated }) {
  const dialog = useDialog();
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingStaffId, setEditingStaffId] = useState(null);
  const [showPassMap, setShowPassMap] = useState({});

  const [form, setForm] = useState({
    name: '',
    role: 'waiter',
    login: '',
    password: '',
    phone: '',
    status: 'active',
  });
  const [submitting, setSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  const loadStaff = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/staff');
      const data = await res.json();
      if (data.success) {
        setStaffList(data.staff || data.users || []);
      }
    } catch (e) {
      console.error('Failed to load staff:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadStaff();
      setShowAddForm(false);
      setEditingStaffId(null);
      setStatusMsg('');
    }
  }, [isOpen]);

  const toggleShowPass = (id) => {
    setShowPassMap((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleOpenAdd = () => {
    setEditingStaffId(null);
    setForm({
      name: '',
      role: 'waiter',
      login: '',
      password: '',
      phone: '',
      status: 'active',
    });
    setShowAddForm(true);
  };

  const handleOpenEdit = (user) => {
    setEditingStaffId(user.id);
    setForm({
      name: user.name,
      role: user.role,
      login: user.login || (user.email ? user.email : user.name.toLowerCase().replace(/[^a-z0-9]/g, '')),
      password: user.password || user.pin || '',
      phone: user.phone || '',
      status: user.status || 'active',
    });
    setShowAddForm(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.password) {
      alert('Ism va Tizim paroli kiritilishi shart!');
      return;
    }

    setSubmitting(true);
    try {
      const url = editingStaffId ? `/api/staff/${editingStaffId}` : '/api/staff';
      const method = editingStaffId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (data.success) {
        setStatusMsg(editingStaffId ? "Xodim ma'lumotlari yangilandi!" : "Yangi xodim muvaffaqiyatli qo'shildi!");
        setTimeout(() => setStatusMsg(''), 3000);
        setShowAddForm(false);
        setEditingStaffId(null);
        loadStaff();
        if (onStaffUpdated) onStaffUpdated();
      } else {
        alert('Xatolik: ' + data.message);
      }
    } catch (err) {
      alert('Server xatosi: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteStaff = async (id, name) => {
    const ok = await dialog.confirm({
      title: "Xodimni o'chirish",
      message: `${name} nomli xodimni o'chirishni tasdiqlaysizmi?`,
      confirmText: "Ha, o'chirish",
      cancelText: "Bekor qilish",
      type: "danger",
    });
    if (!ok) return;
    try {
      const res = await fetch(`/api/staff/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setStatusMsg(`${name} o'chirildi`);
        setTimeout(() => setStatusMsg(''), 2500);
        loadStaff();
        if (onStaffUpdated) onStaffUpdated();
      }
    } catch (e) {
      dialog.alert({ title: "Xatolik", message: "O'chirishda xatolik: " + e.message, type: "error" });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-[2px] animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl text-slate-800 flex flex-col font-sans select-none overflow-hidden max-h-[88vh]">
        
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between shadow">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center font-bold">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-white">Xodimlar va Ofitsiantlar Boshqaruvi</h2>
              <p className="text-[11px] text-slate-400">Do'kon xodimlarini qo'shish, rollar, login va parollarni boshqarish</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl flex items-center justify-center text-xs font-bold transition"
          >
            ✕
          </button>
        </div>

        {/* Status Alert */}
        {statusMsg && (
          <div className="bg-emerald-600 text-white text-xs px-6 py-2.5 font-bold flex items-center justify-between animate-pulse">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>{statusMsg}</span>
            </div>
          </div>
        )}

        {/* Body content */}
        <div className="p-6 flex flex-col gap-5 overflow-y-auto flex-1 bg-slate-50/70">
          
          {/* Top Actions: Add Staff Button */}
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold text-slate-600">
              Jami faol xodimlar: <span className="text-slate-900 bg-white px-2.5 py-1 rounded-lg border border-slate-200 font-extrabold">{staffList.length} ta</span>
            </div>

            <button
              onClick={handleOpenAdd}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/20 active:scale-95 transition-all"
            >
              <UserPlus className="w-4 h-4" />
              <span>+ Yangi Xodim Qo'shish</span>
            </button>
          </div>

          {/* Add / Edit Form Modal Inline */}
          {showAddForm && (
            <form onSubmit={handleFormSubmit} className="bg-white p-5 rounded-2xl border border-blue-500/30 shadow-md flex flex-col gap-4 animate-scaleUp">
              <div className="font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 font-extrabold text-blue-600">
                  {editingStaffId ? "✏️ Xodim ma'lumotlarini tahrirlash" : "➕ Yangi Xodim Qo'shish"}
                </span>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="text-slate-400 hover:text-slate-600 text-xs font-semibold"
                >
                  ✕ Yopish
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                <div className="flex flex-col gap-1.5">
                  <label className="font-bold text-slate-700">Ism Familiya *</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Masalan: Sardor Rahimov"
                    className="p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-bold text-slate-700">Lavozimi (Roli) *</label>
                  <select
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                    className="p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
                  >
                    <option value="waiter">📱 Ofitsiant (Stollar ochish, buyurtma terish)</option>
                    <option value="cashier">💳 Kassir (To'lov qabul qilish, Fiskal chek)</option>
                    <option value="cook">🍳 Oshpaz (Oshxona ekrani - KDS)</option>
                    <option value="manager">👔 Menejer (Do'kon boshqaruvi)</option>
                    <option value="admin">⭐ Administrator (To'liq huquq)</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-bold text-slate-700">Email / Login *</label>
                  <input
                    type="text"
                    required
                    value={form.login}
                    onChange={(e) => setForm({ ...form, login: e.target.value })}
                    placeholder="Masalan: sardor yoki sardor@gmail.com"
                    className="p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-bold text-slate-700">Tizim Paroli *</label>
                  <input
                    type="text"
                    required
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="Masalan: 123456"
                    className="p-2.5 bg-white border border-slate-300 rounded-xl font-mono font-bold text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                  <span className="text-[10px] text-slate-500">Mobil ilova va kassa tizimiga kirish paroli</span>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-bold text-slate-700">Telefon raqami (ixtiyoriy)</label>
                  <input
                    type="text"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="+998 90 123 45 67"
                    className="p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-bold text-slate-700">Holati</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    <option value="active">🟢 Faol</option>
                    <option value="inactive">🔴 Nofaol</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-md active:scale-95 transition"
                >
                  {submitting ? 'Saqlanmoqda...' : 'Saqlash'}
                </button>
              </div>
            </form>
          )}

          {/* Staff List Table */}
          <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <th className="p-3.5 pl-5">ISM</th>
                  <th className="p-3.5">ROLI</th>
                  <th className="p-3.5">EMAIL / LOGIN</th>
                  <th className="p-3.5 text-center">TIZIM PAROL</th>
                  <th className="p-3.5">TELEFON</th>
                  <th className="p-3.5 text-center">HOLATI</th>
                  <th className="p-3.5 pr-5 text-right">AMALLAR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {staffList.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="p-8 text-center text-slate-400 font-medium">
                      Xodimlar mavjud emas
                    </td>
                  </tr>
                ) : (
                  staffList.map((user) => {
                    let roleBadge = 'bg-slate-100 text-slate-700 border-slate-200';
                    let roleTitle = 'Ofitsiant';

                    if (user.role === 'admin' || user.role === 'manager') {
                      roleBadge = 'bg-purple-50 text-purple-700 border-purple-200';
                      roleTitle = 'Menejer';
                    } else if (user.role === 'cashier') {
                      roleBadge = 'bg-blue-50 text-blue-700 border-blue-200';
                      roleTitle = 'Kassir';
                    } else if (user.role === 'cook') {
                      roleBadge = 'bg-amber-50 text-amber-700 border-amber-200';
                      roleTitle = 'Oshpaz';
                    } else if (user.role === 'worker' || user.role === 'waiter') {
                      roleBadge = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                      roleTitle = 'Ofitsiant';
                    }

                    const isPassVisible = showPassMap[user.id];
                    const displayLogin = user.login || user.email || (user.name.toLowerCase().replace(/[^a-z0-9]/g, ''));
                    const displayPass = user.password || user.pin || '123456';

                    return (
                      <tr key={user.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3.5 pl-5 font-bold text-slate-900 flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs border border-slate-200">
                            {user.name.charAt(0)}
                          </div>
                          <span>{user.name}</span>
                        </td>

                        <td className="p-3.5">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${roleBadge}`}>
                            {roleTitle}
                          </span>
                        </td>

                        <td className="p-3.5 font-mono text-slate-700 font-semibold text-xs">
                          {displayLogin}
                        </td>

                        <td className="p-3.5 text-center">
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 rounded-lg border border-slate-200 font-mono font-bold text-xs text-blue-700">
                            <Lock className="w-3 h-3 text-slate-400" />
                            <span>{isPassVisible ? displayPass : '••••••'}</span>
                            <button
                              type="button"
                              onClick={() => toggleShowPass(user.id)}
                              className="text-slate-400 hover:text-slate-600 ml-1 transition"
                            >
                              {isPassVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </td>

                        <td className="p-3.5 font-mono text-slate-600 text-xs">
                          {user.phone || '—'}
                        </td>

                        <td className="p-3.5 text-center">
                          <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[10px] font-bold">
                            Faol
                          </span>
                        </td>

                        <td className="p-3.5 pr-5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleOpenEdit(user)}
                              title="Tahrirlash"
                              className="flex items-center gap-1 px-2.5 py-1 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors font-semibold text-xs"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>Tahrirlash</span>
                            </button>

                            <button
                              onClick={() => handleDeleteStaff(user.id, user.name)}
                              title="O'chirish"
                              className="p-1.5 hover:bg-rose-50 rounded-lg text-rose-500 hover:text-rose-700 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-100 px-6 py-3.5 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs shadow transition"
          >
            Yopish
          </button>
        </div>
      </div>
    </div>
  );
}
