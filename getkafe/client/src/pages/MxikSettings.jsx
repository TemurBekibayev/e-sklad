import React, { useState } from 'react';
import { QrCode, Save, ShieldCheck, Check, AlertCircle, RefreshCw } from 'lucide-react';

export default function MxikSettings({ products, categories, onUpdateMxik }) {
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ mxik_code: '', package_code: '796', vat_percent: 12 });
  const [savedSuccessId, setSavedSuccessId] = useState(null);

  const startEdit = (prod) => {
    setEditingId(prod.id);
    setEditForm({
      mxik_code: prod.mxik_code || '',
      package_code: prod.package_code || '796',
      vat_percent: prod.vat_percent !== undefined ? prod.vat_percent : 12,
    });
  };

  const handleSave = async (id) => {
    try {
      await onUpdateMxik(id, editForm);
      setEditingId(null);
      setSavedSuccessId(id);
      setTimeout(() => setSavedSuccessId(null), 3000);
    } catch (err) {
      alert("MXIK kodini saqlashda xatolik: " + err.message);
    }
  };

  const formatPrice = (val) => new Intl.NumberFormat('uz-UZ').format(val || 0);

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      {/* Header info */}
      <div className="bg-slate-800/80 border border-slate-700 p-5 rounded-3xl mb-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center flex-shrink-0">
            <QrCode className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              <span>Soliq.uz MXIK (IKPU) Kodlarini Biriktirish Moduli</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                TZ 3.4
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Davlat Soliq Qo'mitasi talabiga ko'ra har bir tovar/taom 17 xonali MXIK kodi, o'lchov birligi (qadoq kodi) va QQS stavkasiga ega bo'lishi shart.
            </p>
          </div>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-800 text-slate-300 uppercase tracking-wider font-bold border-b border-slate-700">
              <tr>
                <th className="p-4">Taom</th>
                <th className="p-4">Toifa</th>
                <th className="p-4">Narx</th>
                <th className="p-4">MXIK (IKPU) Kodi</th>
                <th className="p-4">Qadoq</th>
                <th className="p-4">QQS %</th>
                <th className="p-4 text-right">Amal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {products.map((prod) => {
                const isEditing = editingId === prod.id;
                const cat = categories.find((c) => c.id === prod.category_id);

                return (
                  <tr key={prod.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-4 font-bold text-white text-sm flex items-center gap-3">
                      {prod.image && prod.image.startsWith('http') ? (
                        <img
                          src={prod.image}
                          alt={prod.name}
                          className="w-10 h-10 object-cover rounded-xl border border-slate-700 flex-shrink-0"
                        />
                      ) : (
                        <span className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-xl border border-slate-700 flex-shrink-0">
                          {prod.image || '🍲'}
                        </span>
                      )}
                      <span className="font-black text-slate-100">{prod.name}</span>
                    </td>
                    <td className="p-4 text-slate-400 font-medium">{cat?.name || '-'}</td>
                    <td className="p-4 font-black text-amber-400">{formatPrice(prod.price)} UZS</td>

                    {/* MXIK Code Cell */}
                    <td className="p-4 font-mono">
                      {isEditing ? (
                        <input
                          type="text"
                          maxLength={17}
                          value={editForm.mxik_code}
                          onChange={(e) =>
                            setEditForm({ ...editForm, mxik_code: e.target.value.trim() })
                          }
                          className="bg-slate-950 border border-indigo-500 rounded-xl px-2.5 py-1.5 text-white font-mono text-xs w-48"
                        />
                      ) : (
                        <span className="bg-slate-800 px-2.5 py-1 rounded-lg text-slate-300 border border-slate-700 font-semibold">
                          {prod.mxik_code}
                        </span>
                      )}
                    </td>

                    {/* Package Code Cell */}
                    <td className="p-4">
                      {isEditing ? (
                        <select
                          value={editForm.package_code}
                          onChange={(e) =>
                            setEditForm({ ...editForm, package_code: e.target.value })
                          }
                          className="bg-slate-950 border border-slate-700 rounded-xl px-2 py-1 text-white text-xs"
                        >
                          <option value="796">796 (Dona/Porsiya)</option>
                          <option value="166">166 (Kilogramm)</option>
                          <option value="112">112 (Litr)</option>
                        </select>
                      ) : (
                        <span className="text-slate-400">
                          {prod.package_code === '796' ? '796 (Dona)' : prod.package_code}
                        </span>
                      )}
                    </td>

                    {/* VAT Rate Cell */}
                    <td className="p-4">
                      {isEditing ? (
                        <select
                          value={editForm.vat_percent}
                          onChange={(e) =>
                            setEditForm({ ...editForm, vat_percent: Number(e.target.value) })
                          }
                          className="bg-slate-950 border border-slate-700 rounded-xl px-2 py-1 text-white text-xs"
                        >
                          <option value={12}>12% (QQS)</option>
                          <option value={0}>0% (Ozod etilgan)</option>
                        </select>
                      ) : (
                        <span className="font-bold text-emerald-400">{prod.vat_percent || 12}%</span>
                      )}
                    </td>

                    {/* Action buttons */}
                    <td className="p-4 text-right">
                      {isEditing ? (
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setEditingId(null)}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs font-semibold"
                          >
                            Bekor
                          </button>
                          <button
                            onClick={() => handleSave(prod.id)}
                            className="flex items-center gap-1 px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black shadow-md shadow-emerald-500/20"
                          >
                            <Save className="w-3.5 h-3.5" />
                            <span>Saqlash</span>
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-2">
                          {savedSuccessId === prod.id && (
                            <span className="text-emerald-400 font-bold flex items-center gap-1 text-[11px]">
                              <Check className="w-3.5 h-3.5" /> Saqlandi!
                            </span>
                          )}
                          <button
                            onClick={() => startEdit(prod)}
                            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-indigo-300 border border-slate-700 font-semibold text-xs active:scale-95 transition-all"
                          >
                            Tahrirlash
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
