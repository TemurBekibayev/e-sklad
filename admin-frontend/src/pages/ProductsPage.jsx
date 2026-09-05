import React, { useState, useEffect } from 'react';
import { 
  Search, 
  MoreVertical, 
  ChevronLeft, 
  ChevronRight, 
  AlertTriangle,
  Plus,
  Edit2,
  Trash2,
  X
} from 'lucide-react';
import { apiFetch } from '../utils/api';

export default function ProductsPage({ tenants = [] }) {
  const [search, setSearch] = useState('');
  const [storeFilter, setStoreFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState('all');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' | 'edit'
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [actionMenuOpen, setActionMenuOpen] = useState(null); // product ID

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    purchase_unit: 'Dona',
    sale_unit: 'Dona',
    price_per_sale_unit: '',
    current_stock: '0',
    barcode: '',
    tenant_id: ''
  });

  useEffect(() => {
    loadProducts();
    // Har 3 soniyada fonda bazani tekshirib, yangi qo'shilgan mahsulotlarni avtomatik ko'rsatish
    const interval = setInterval(() => {
      loadProducts(true);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const loadProducts = async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    try {
      const data = await apiFetch('/products/');
      const productsList = data.results || (Array.isArray(data) ? data : []);
      setProducts(productsList);
    } catch (err) {
      if (!isBackground) console.error('Mahsulotlarni yuklashda xatolik:', err);
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  const handleOpenCreateModal = () => {
    setModalMode('create');
    setFormData({
      name: '',
      purchase_unit: 'Dona',
      sale_unit: 'Dona',
      price_per_sale_unit: '',
      current_stock: '0',
      barcode: '',
      tenant_id: tenants[0]?.id || ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (product) => {
    setModalMode('edit');
    setSelectedProduct(product);
    setFormData({
      name: product.name || '',
      purchase_unit: product.purchase_unit || 'Dona',
      sale_unit: product.sale_unit || 'Dona',
      price_per_sale_unit: product.price_per_sale_unit || '',
      current_stock: parseFloat(product.current_stock || 0).toString(),
      barcode: product.barcode || '',
      tenant_id: product.tenant_id || product.tenant || ''
    });
    setIsModalOpen(true);
    setActionMenuOpen(null);
  };

  const handleDeleteProduct = async (productId) => {
    if (!window.confirm("Haqiqatan ham ushbu mahsulotni o'chirmoqchimisiz?")) return;
    
    // 1. Menyuni yopish va darhol ro'yxatdan o'chirish (Optimistic Update)
    setActionMenuOpen(null);
    setProducts((prev) => prev.filter((p) => p.id !== productId));

    try {
      await apiFetch(`/products/${productId}/`, {
        method: 'DELETE'
      });
    } catch (err) {
      alert("O'chirishda xatolik yuz berdi: " + err.message);
      // Agar serverda xatolik bo'lsa qaytadan to'liq ro'yxatni yuklash
      loadProducts();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        price_per_sale_unit: parseFloat(formData.price_per_sale_unit || 0),
        current_stock: parseFloat(formData.current_stock || 0)
      };

      if (modalMode === 'create') {
        const newProduct = await apiFetch('/products/', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        setIsModalOpen(false);

        // Darhol ro'yxat boshiga qo'shish (Instant UI Update)
        if (newProduct && newProduct.id) {
          const selectedTenant = tenants.find(t => t.id === newProduct.tenant_id || t.id === newProduct.tenant || t.id === formData.tenant_id);
          const formattedProduct = {
            ...newProduct,
            tenant_name: newProduct.tenant_name || (selectedTenant ? selectedTenant.name : '')
          };
          setProducts((prev) => [formattedProduct, ...prev.filter(p => p.id !== formattedProduct.id)]);
        }
        loadProducts(true);
      } else {
        const updated = await apiFetch(`/products/${selectedProduct.id}/`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
        setIsModalOpen(false);

        if (updated && updated.id) {
          const selectedTenant = tenants.find(t => t.id === updated.tenant_id || t.id === updated.tenant || t.id === formData.tenant_id);
          const formattedProduct = {
            ...updated,
            tenant_name: updated.tenant_name || (selectedTenant ? selectedTenant.name : '')
          };
          setProducts((prev) => prev.map(p => p.id === updated.id ? { ...p, ...formattedProduct } : p));
        }
        loadProducts(true);
      }
    } catch (err) {
      alert("Saqlashda xatolik yuz berdi: " + err.message);
    }
  };

  const filteredProducts = products.filter((p) => {
    const name = p.name || '';
    const tenantName = p.tenant_name || '';
    const barcode = p.barcode || '';
    const matchesSearch = name.toLowerCase().includes(search.toLowerCase()) ||
                          tenantName.toLowerCase().includes(search.toLowerCase()) ||
                          barcode.toLowerCase().includes(search.toLowerCase());
                          
    const matchesStore = storeFilter === 'all' || 
                         p.tenant_id === storeFilter || 
                         p.tenant === storeFilter;
    
    // Low stock threshold default is 5.0
    const currentStock = parseFloat(p.current_stock || 0);
    const isLow = currentStock <= 5.0;
    const matchesStock = stockFilter === 'all' || 
                         (stockFilter === 'low' && isLow) ||
                         (stockFilter === 'normal' && !isLow);
    return matchesSearch && matchesStore && matchesStock;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Search & Filters Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search & filters */}
        <div className="flex flex-1 items-center space-x-3 max-w-2xl">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Mahsulot qidirish..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200/90 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 shadow-sm"
            />
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">Do'kon:</span>
            <select
              value={storeFilter}
              onChange={(e) => setStoreFilter(e.target.value)}
              className="px-3.5 py-2.5 bg-white border border-slate-200/90 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600 shadow-sm"
            >
              <option value="all">Barcha do'konlar</option>
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">Qoldiq:</span>
            <select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value)}
              className="px-3.5 py-2.5 bg-white border border-slate-200/90 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600 shadow-sm"
            >
              <option value="all">Barchasi</option>
              <option value="low">Kam qolganlar</option>
              <option value="normal">Yetarli</option>
            </select>
          </div>
        </div>

        {/* Add Product Button */}
        <button
          onClick={handleOpenCreateModal}
          className="flex items-center space-x-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-md shadow-blue-600/20 transition whitespace-nowrap self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Yangi mahsulot</span>
        </button>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                <th className="py-4 px-6">MAHSULOT NOMI</th>
                <th className="py-4 px-6">DO'KON</th>
                <th className="py-4 px-6">NARXI</th>
                <th className="py-4 px-6">QOLDIQ</th>
                <th className="py-4 px-6">BIRLIK</th>
                <th className="py-4 px-6 text-right">AMALLAR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredProducts.map((row) => {
                const currentStock = parseFloat(row.current_stock || 0);
                const isLow = currentStock <= 5.0;
                return (
                  <tr key={row.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-4 px-6 font-bold text-slate-900">
                      {row.name}
                    </td>
                    <td className="py-4 px-6 text-slate-600 font-semibold">
                      {row.tenant_name || '-'}
                    </td>
                    <td className="py-4 px-6 font-bold text-slate-900">
                      {row.price_per_sale_unit ? parseFloat(row.price_per_sale_unit).toLocaleString('ru-RU') + " so'm" : '-'}
                    </td>
                    <td className="py-4 px-6 font-semibold">
                      {isLow ? (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-red-50 text-red-600 border border-red-200/60">
                          <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                          <span>{currentStock} {row.sale_unit}</span>
                        </span>
                      ) : (
                        <span className="text-slate-800">{currentStock} {row.sale_unit}</span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-slate-500 font-medium">
                      {row.sale_unit || row.purchase_unit || '-'}
                    </td>
                    <td className="py-4 px-6 text-right relative">
                      <button 
                        onClick={() => setActionMenuOpen(actionMenuOpen === row.id ? null : row.id)}
                        className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition"
                      >
                        <MoreVertical className="w-5 h-5" />
                      </button>

                      {/* Dropdown Menu */}
                      {actionMenuOpen === row.id && (
                        <div className="absolute right-6 top-12 bg-white border border-slate-200 rounded-xl shadow-xl z-30 py-1.5 min-w-[130px] animate-in fade-in slide-in-from-top-1 duration-100">
                          <button
                            onClick={() => handleOpenEditModal(row)}
                            className="w-full px-4 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center space-x-2"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-slate-400" />
                            <span>Tahrirlash</span>
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(row.id)}
                            className="w-full px-4 py-2 text-left text-xs font-semibold text-red-600 hover:bg-red-50/50 flex items-center space-x-2 border-t border-slate-100"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-400" />
                            <span>O'chirish</span>
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500 font-medium">
                    Mahsulotlar topilmadi.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
          <div>
            Ko'rsatilmoqda <span className="font-semibold text-slate-800">1-{filteredProducts.length}</span> dan <span className="font-semibold text-slate-800">{filteredProducts.length}</span> tasi
          </div>
          <div className="flex items-center space-x-1.5">
            <button className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-400 hover:text-slate-600 transition">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button className="w-8 h-8 rounded-lg bg-blue-600 text-white font-bold flex items-center justify-center shadow-sm">
              1
            </button>
            <button className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-400 hover:text-slate-600 transition">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* CREATE / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                {modalMode === 'create' ? "Yangi mahsulot qo'shish" : "Mahsulotni tahrirlash"}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Do'kon tanlash */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Do'kon (Tenant)
                </label>
                <select
                  required
                  value={formData.tenant_id}
                  onChange={(e) => setFormData({ ...formData, tenant_id: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
                >
                  {tenants.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Mahsulot nomi */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Mahsulot nomi
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Masalan: Paxtali mato"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
                />
              </div>

              {/* Shtrix kod */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Shtrix kod (Skanerlash uchun)
                </label>
                <input
                  type="text"
                  value={formData.barcode}
                  onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                  placeholder="Masalan: 4780001234567"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
                />
              </div>

              {/* Birliklar (Purchase / Sale) */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Kelish birligi
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.purchase_unit}
                    onChange={(e) => setFormData({ ...formData, purchase_unit: e.target.value })}
                    placeholder="Masalan: qop, blok"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Sotish birligi
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.sale_unit}
                    onChange={(e) => setFormData({ ...formData, sale_unit: e.target.value })}
                    placeholder="Masalan: dona, kg"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
                  />
                </div>
              </div>

              {/* Narx & Ombor qoldig'i */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Sotish narxi (so'mda)
                  </label>
                  <input
                    type="number"
                    required
                    value={formData.price_per_sale_unit}
                    onChange={(e) => setFormData({ ...formData, price_per_sale_unit: e.target.value })}
                    placeholder="15000"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Ombor qoldig'i (sotish birligida)
                  </label>
                  <input
                    type="number"
                    required
                    value={formData.current_stock}
                    onChange={(e) => setFormData({ ...formData, current_stock: e.target.value })}
                    placeholder="100"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-xl transition"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition shadow-lg shadow-blue-500/20 font-bold"
                >
                  {modalMode === 'create' ? "Qo'shish" : "Tahrirni saqlash"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
