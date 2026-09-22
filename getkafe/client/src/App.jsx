import React, { useState, useEffect, useRef } from 'react';
import Header from './components/Header';
import LoginModal from './components/LoginModal';
import PinModal from './components/PinModal';
import ReceiptModal from './components/ReceiptModal';
import AddDishModal from './components/AddDishModal';
import StaffManagementModal from './components/StaffManagementModal';
import TableHallManagementModal from './components/TableHallManagementModal';
import PrinterSettingsModal from './components/PrinterSettingsModal';
import JetCafeDebtsModal from './components/JetCafeDebtsModal';
import JetCafePosView from './pages/JetCafePosView';
import CashierView from './pages/CashierView';
import WaiterView from './pages/WaiterView';
import KitchenView from './pages/KitchenView';
import MenuView from './pages/MenuView';
import MxikSettings from './pages/MxikSettings';
import InventoryView from './pages/InventoryView';
import { useDialog } from './context/DialogContext';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("React ErrorBoundary caught an error:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center select-none z-50">
          <div className="max-w-md bg-slate-800 border border-slate-700 p-6 rounded-2xl shadow-2xl">
            <h1 className="text-xl font-black text-rose-500 mb-2">⚠️ Xatolik Yuz Berdi</h1>
            <p className="text-xs text-slate-300 mb-4 font-mono bg-slate-950 p-3 rounded-xl border border-slate-800 text-left overflow-x-auto">
              {this.state.error?.message || 'Kutilmagan xatolik yuz berdi.'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-bold text-xs shadow-lg transition active:scale-95"
            >
              🔄 Dasturni qayta yuklash
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function isProductMatch(p, targetId) {
  if (!p || targetId === undefined || targetId === null) return false;
  const tStr = String(targetId).trim();
  const tNum = parseInt(tStr.replace(/\D/g, ''), 10);

  const pIdStr = String(p.id || '').trim();
  const pProdIdStr = String(p.product_id || '').trim();
  const pRawId = p.rawId !== undefined && p.rawId !== null ? String(p.rawId).trim() : '';
  const pNum = typeof p.id === 'number' ? p.id : (p.rawId !== undefined ? Number(p.rawId) : parseInt(pIdStr.replace(/\D/g, ''), 10));

  if (pIdStr && (pIdStr === tStr || pIdStr === `prod_${tNum}` || pIdStr === `prod_${tStr}`)) return true;
  if (pProdIdStr && (pProdIdStr === tStr || pProdIdStr === `prod_${tNum}` || pProdIdStr === `prod_${tStr}`)) return true;
  if (pRawId && (pRawId === tStr || Number(pRawId) === tNum)) return true;
  if (!isNaN(pNum) && !isNaN(tNum) && pNum === tNum) return true;

  return false;
}

export default function App() {
  const dialog = useDialog();
  const [currentTab, setCurrentTab] = useState(() => {
    try {
      const path = window.location.pathname.toLowerCase();
      const search = window.location.search.toLowerCase();
      if (path.includes('/kitchen') || search.includes('kitchen') || search.includes('tab=kitchen') || search.includes('view=kitchen')) {
        return 'kitchen';
      }
      if (path.includes('/waiter') || search.includes('waiter') || search.includes('tab=waiter') || search.includes('view=waiter')) {
        return 'waiter';
      }
      return 'cashier';
    } catch (e) {
      return 'cashier';
    }
  });
  
  // Initial session from localStorage or auto-create cook session for kitchen monitor
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('getpos_user');
      if (saved) return JSON.parse(saved);
      const path = window.location.pathname.toLowerCase();
      const search = window.location.search.toLowerCase();
      if (path.includes('/kitchen') || search.includes('kitchen')) {
        return { id: 'cook_kds', name: 'Oshxona (KDS)', role: 'cook', username: 'cook' };
      }
      return null;
    } catch (e) {
      return null;
    }
  });

  const [isScreenLocked, setIsScreenLocked] = useState(false);
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [isTableManageModalOpen, setIsTableManageModalOpen] = useState(false);
  const [isPrinterModalOpen, setIsPrinterModalOpen] = useState(false);
  const [isDebtsModalOpen, setIsDebtsModalOpen] = useState(false);

  // 15-minute Inactivity Auto-Lock timer (Faqat Kassa / Boshqaruvchi uchun, Ofitsiant va Oshxona ekranlarida lock ishlamaydi)
  const IDLE_TIMEOUT_MS = 15 * 60 * 1000;
  useEffect(() => {
    if (!currentUser || isScreenLocked) return;
    const role = (currentUser.role || '').toLowerCase();
    // Ofitsiant va Oshxona ekranlarida lock ishlamasin:
    if (role === 'waiter' || role === 'worker' || role === 'cook') return;

    let idleTimer = null;
    const resetTimer = () => {
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        setIsScreenLocked(true);
      }, IDLE_TIMEOUT_MS);
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'keydown', 'scroll', 'touchstart', 'click'];
    events.forEach((ev) => window.addEventListener(ev, resetTimer));
    resetTimer();

    return () => {
      if (idleTimer) clearTimeout(idleTimer);
      events.forEach((ev) => window.removeEventListener(ev, resetTimer));
    };
  }, [currentUser, isScreenLocked]);
  const [isAddDishModalOpen, setIsAddDishModalOpen] = useState(false);
  const [staffUsers, setStaffUsers] = useState([]);

  // Core POS states
  const [tables, setTables] = useState([]);
  const [halls, setHalls] = useState([]);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [kitchenTickets, setKitchenTickets] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [activeOrder, setActiveOrder] = useState(null);
  const [currentReceipt, setCurrentReceipt] = useState(null);

  // Sync & network state
  const [syncState, setSyncState] = useState({
    localIp: '127.0.0.1',
    isOnline: true,
    pendingChecks: 0,
    company: null,
  });

  const wsRef = useRef(null);

  // Web Audio API offline sound generator for kitchen orders & alerts
  const playSoundAlert = (type = 'kitchen') => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      if (type === 'paid') {
        // Kash-ching cash register triumphant chord (C5 -> E5 -> G5 -> C6)
        [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
          const o = audioCtx.createOscillator();
          const g = audioCtx.createGain();
          o.connect(g);
          g.connect(audioCtx.destination);
          o.type = 'triangle';
          o.frequency.setValueAtTime(freq, audioCtx.currentTime + i * 0.08);
          g.gain.setValueAtTime(0.25, audioCtx.currentTime + i * 0.08);
          g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + i * 0.08 + 0.45);
          o.start(audioCtx.currentTime + i * 0.08);
          o.stop(audioCtx.currentTime + i * 0.08 + 0.45);
        });
        return;
      } else if (type === 'click') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(750, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.04);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.04);
        return;
      } else if (type === 'kitchen') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
        osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.15); // A5
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.6);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.6);
      } else if (type === 'bill') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, audioCtx.currentTime);
        osc.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.5);
      } else if (type === 'warning') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(320, audioCtx.currentTime);
        osc.frequency.setValueAtTime(220, audioCtx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.5);
      }
    } catch (e) {
      console.warn('Audio not allowed yet by user interaction');
    }
  };

  const loadTables = async () => {
    try {
      const res = await fetch('/api/tables').then((r) => r.json());
      if (res.success && Array.isArray(res.tables)) {
        setTables(res.tables);
      } else if (Array.isArray(res)) {
        setTables(res);
      }
    } catch (e) {}
  };

  const loadHalls = async () => {
    try {
      const res = await fetch('/api/halls').then((r) => r.json());
      if (res.success && Array.isArray(res.halls)) {
        setHalls(res.halls);
      }
    } catch (e) {}
  };

  // Initial data loading
  const loadInitialData = async () => {
    try {
      const [resStatus, resTables, resHalls, resMenu, resTickets, resUsers] = await Promise.all([
        fetch('/api/status').then((r) => r.json()),
        fetch('/api/tables').then((r) => r.json()),
        fetch('/api/halls').then((r) => r.json()).catch(() => ({ success: false, halls: [] })),
        fetch('/api/menu').then((r) => r.json()),
        fetch('/api/kitchen/tickets').then((r) => r.json()),
        fetch('/api/auth/users').then((r) => r.json()).catch(() => []),
      ]);

      if (resStatus.success) {
        setSyncState({
          localIp: resStatus.localIp,
          isOnline: resStatus.isOnline,
          pendingChecks: resStatus.pendingChecks,
          company: resStatus.company,
        });
      }
      if (resTables.success) setTables(resTables.tables);
      else if (Array.isArray(resTables)) setTables(resTables);

      if (resHalls.success && Array.isArray(resHalls.halls)) {
        setHalls(resHalls.halls);
      }

      if (resMenu.success) {
        setCategories(resMenu.categories || []);
        setProducts(resMenu.products || []);
      } else if (resMenu.categories && resMenu.products) {
        setCategories(resMenu.categories);
        setProducts(resMenu.products);
      }

      if (resTickets.success) setKitchenTickets(resTickets.tickets);
      else if (Array.isArray(resTickets)) setKitchenTickets(resTickets);

      if (Array.isArray(resUsers)) setStaffUsers(resUsers);
    } catch (err) {
      console.error('Error loading POS data:', err);
    }
  };

  useEffect(() => {
    loadInitialData();

    // Setup WebSocket connection
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    const connectWs = () => {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          const { event: ev, data } = payload;

          if (ev === 'INIT_STATE') {
            setSyncState((prev) => ({
              ...prev,
              isOnline: data.isOnline,
              pendingChecks: data.pendingChecks,
              company: data.company,
            }));
          } else if (ev === 'TABLE_UPDATED' || ev === 'ORDER_UPDATED' || ev === 'TABLE_ORDER_UPDATED') {
            loadTables();
            if (data && data.id) {
              setTables((prev) =>
                prev.map((t) => (t.id === data.id ? { ...t, ...data } : t))
              );
              setSelectedTable((curr) => (curr && curr.id === data.id ? { ...curr, ...data } : curr));
            }
            if (selectedTable) {
              fetch(`/api/orders/table/${selectedTable.id}`)
                .then((r) => r.json())
                .then((res) => {
                  if (res.success) setActiveOrder(res);
                })
                .catch(() => {});
            }
          } else if (ev === 'TABLE_ADDED' || ev === 'TABLE_DELETED' || ev === 'TABLES_UPDATED') {
            loadTables();
          } else if (ev === 'HALL_ADDED' || ev === 'HALL_UPDATED' || ev === 'HALL_DELETED' || ev === 'HALLS_UPDATED') {
            loadHalls();
            loadTables();
          } else if (ev === 'KITCHEN_NEW_TICKET') {
            setKitchenTickets((prev) => [data, ...prev]);
            playSoundAlert('kitchen');
          } else if (ev === 'KITCHEN_TICKET_READY') {
            playSoundAlert('kitchen');
            if (dialog && dialog.alert) {
              dialog.alert({
                title: "🔔 BUYURTMA TAYYOR!",
                message: `${data.tableNumber}-stol buyurtmasi oshxonada TAYYOR bo'ldi! (Ofitsiant: ${data.waiterName || 'Ofitsiant'})`,
                type: "success",
              });
            }
          } else if (ev === 'KITCHEN_TICKETS_UPDATED') {
            if (data && Array.isArray(data.tickets)) {
              setKitchenTickets(data.tickets);
            }
          } else if (ev === 'DISH_OUT_OF_STOCK') {
            playSoundAlert('warning');
            if (dialog && dialog.alert) {
              dialog.alert({
                title: "⚠️ OSHXONADA TAOM YO'Q!",
                message: data.message || `${data.tableNumber}-stol uchun "${data.productName}" oshxonada tugaganligi sababli buyurtmadan o'chirildi!`,
                type: "warning",
              });
            }
            loadTables();
            if (selectedTable) {
              fetch(`/api/orders/table/${selectedTable.id}`)
                .then((r) => r.json())
                .then((res) => {
                  if (res.success) setActiveOrder(res);
                })
                .catch(() => {});
            }
          } else if (ev === 'BILL_REQUESTED') {
            playSoundAlert('bill');
          } else if (ev === 'PAYMENT_COMPLETED') {
            setCurrentReceipt(data.receipt);
          } else if (ev === 'SYNC_STATUS_CHANGED') {
            setSyncState((prev) => ({
              ...prev,
              isOnline: data.isOnline,
              pendingChecks: data.pendingChecks,
            }));
          } else if (ev === 'PRODUCT_UPDATED') {
            setProducts((prev) =>
              prev.map((p) => (p.id === data.id ? { ...p, ...data } : p))
            );
          } else if (ev === 'PRODUCT_ADDED') {
            setProducts((prev) => [data, ...prev]);
          } else if (ev === 'PRODUCT_DELETED') {
            const delId = data?.id || data?.rawId;
            if (delId !== undefined && delId !== null) {
              setProducts((prev) => prev.filter((p) => !isProductMatch(p, delId)));
            }
          } else if (ev === 'PRODUCTS_UPDATED') {
            fetch('/api/menu')
              .then((r) => r.json())
              .then((res) => {
                if (res.success && Array.isArray(res.products)) {
                  setProducts(res.products);
                }
              })
              .catch(() => {});
          } else if (ev === 'CATEGORY_DELETED') {
            const delId = data?.id;
            if (delId !== undefined) {
              setCategories((prev) =>
                prev.filter((c) => Number(c.id) !== Number(delId) && c.rawId !== delId && c.id !== delId)
              );
              setProducts((prev) =>
                prev.map((p) => (Number(p.category_id) === Number(delId) ? { ...p, category_id: null, category: 'Boshqa' } : p))
              );
            }
          } else if (ev === 'MENU_UPDATED' || ev === 'PRODUCTS_UPDATED' || ev === 'CATEGORIES_UPDATED') {
            fetch('/api/menu')
              .then((r) => r.json())
              .then((res) => {
                if (res.success) {
                  setCategories(res.categories || []);
                  setProducts(res.products || []);
                }
              })
              .catch(() => {});
          } else if (ev === 'CATEGORY_ADDED') {
            if (data && data.id) {
              setCategories((prev) => {
                if (prev.some((c) => Number(c.id) === Number(data.id) || c.name === data.name)) return prev;
                return [...prev, data];
              });
            }
          } else if (ev === 'CATEGORY_UPDATED') {
            if (data && data.id) {
              setCategories((prev) =>
                prev.map((c) => (Number(c.id) === Number(data.id) ? { ...c, ...data } : c))
              );
            }
          } else if (ev === 'INVENTORY_UPDATED') {
            if (data && data.product) {
              setProducts((prev) =>
                prev.map((p) => (p.id === data.product.id ? { ...p, ...data.product } : p))
              );
            }
          } else if (ev === 'STAFF_UPDATED') {
            fetch('/api/staff')
              .then((r) => r.json())
              .then((res) => {
                if (res.success && Array.isArray(res.staff)) {
                  setStaffUsers(res.staff);
                }
              })
              .catch(() => {});
          }
        } catch (e) {
          console.error('WS parse error:', e);
        }
      };

      ws.onclose = () => {
        setTimeout(connectWs, 2000); // Reconnect
      };
    };

    connectWs();

    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  // Fetch active order whenever selectedTable changes
  useEffect(() => {
    if (selectedTable && selectedTable.id) {
      fetch(`/api/orders/table/${selectedTable.id}`)
        .then((r) => r.json())
        .then((data) => {
          if (data && data.success && (data.order || (data.items && data.items.length > 0))) {
            setActiveOrder(data.order || data);
          } else {
            setActiveOrder(null);
          }
        })
        .catch(() => setActiveOrder(null));
    } else {
      setActiveOrder(null);
    }
  }, [selectedTable]);

  // Handler for toggle offline/online
  const handleToggleInternet = async () => {
    try {
      const res = await fetch('/api/status/toggle-internet', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setSyncState((prev) => ({
          ...prev,
          isOnline: data.isOnline,
          pendingChecks: data.pendingChecks,
        }));
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Handler for flush sync queue
  const handleFlushSync = async () => {
    try {
      const res = await fetch('/api/sync/flush', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setSyncState((prev) => ({
          ...prev,
          pendingChecks: data.pendingChecks,
        }));
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Submit order (from Waiter)
  const handleSubmitOrder = async ({ tableId, waiterId, waiterName, items }) => {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tableId, waiterId, waiterName, items }),
    });
    return await res.json();
  };

  // Request bill (from Waiter)
  const handleRequestBill = async (orderId, payload = {}) => {
    const res = await fetch(`/api/orders/${orderId}/bill-request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return await res.json();
  };

  // Load Kitchen Tickets from Server (Dynamic KDS)
  const loadKitchenTickets = async () => {
    try {
      const res = await fetch('/api/kitchen/tickets');
      const data = await res.json();
      if (data && data.success && Array.isArray(data.tickets)) {
        setKitchenTickets(data.tickets);
      } else if (Array.isArray(data)) {
        setKitchenTickets(data);
      }
    } catch (e) {
      console.warn('Error loading kitchen tickets:', e);
    }
  };

  // Thermal print kitchen ticket (Begunok)
  const handlePrintKitchenTicket = async (ticket) => {
    try {
      const res = await fetch(`/api/kitchen/tickets/${ticket.id}/print`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ticket),
      });
      const data = await res.json();
      if (data.success) {
        playSoundAlert('success');
      }
    } catch (e) {
      console.error('Print kitchen ticket error:', e);
    }
  };

  // Kitchen ticket status update (Qabul qilish / Tayyor)
  const handleUpdateKitchenTicketStatus = async (ticketId, status) => {
    try {
      const res = await fetch(`/api/kitchen/tickets/${ticketId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (data.success) {
        setKitchenTickets((prev) =>
          prev.map((t) => (t.id === ticketId ? { ...t, status } : t))
        );
        if (status === 'ready') {
          playSoundAlert('kitchen');
        }
      }
    } catch (err) {
      console.error('Error updating kitchen ticket status:', err);
    }
  };

  // Kitchen dish out of stock (Taom yo'q - bekor qilish)
  const handleKitchenItemOutOfStock = async (ticket, item) => {
    try {
      const pId = item.productId || item.product_id || item.id;
      const pName = item.product_name || item.name;
      const res = await fetch('/api/kitchen/item-out-of-stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketId: ticket.id,
          orderId: ticket.orderId,
          itemId: item.id,
          productId: pId,
          productName: pName,
          tableNumber: ticket.tableNumber,
          waiterName: ticket.waiterName,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setKitchenTickets((prev) =>
          prev
            .map((t) => {
              if (t.id === ticket.id) {
                const updatedItems = (t.items || []).filter(
                  (it) =>
                    (!pId || (it.productId !== pId && it.product_id !== pId)) &&
                    (!pName || it.product_name !== pName)
                );
                return { ...t, items: updatedItems };
              }
              return t;
            })
            .filter((t) => (t.items || []).length > 0)
        );
      }
    } catch (err) {
      console.error('Error reporting item out of stock:', err);
    }
  };

  // Payment completed (from Cashier)
  const handleCompletePayment = async (paymentPayload) => {
    const res = await fetch('/api/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(paymentPayload),
    });
    const data = await res.json();
    if (data.success) {
      playSoundAlert('paid');
      setCurrentReceipt(data.receipt);
      setSelectedTable(null);
      setActiveOrder(null);
    }
    return data;
  };

  // Update MXIK code
  const handleUpdateMxik = async (productId, form) => {
    const res = await fetch(`/api/products/${productId}/mxik`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    return await res.json();
  };

  // Save Product (Create or Update)
  const handleSaveProduct = async (productData, id) => {
    const url = id ? `/api/products/${id}` : '/api/products';
    const method = id ? 'PUT' : 'POST';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(productData),
    });
    const data = await res.json();
    if (data.success && data.product) {
      if (id) {
        setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, ...data.product } : p)));
      } else {
        setProducts((prev) => [data.product, ...prev]);
      }
    }
    return data;
  };

  // Delete Product
  const handleDeleteProduct = async (id) => {
    try {
      const numericId = parseInt(String(id).replace(/\D/g, ''), 10) || id;
      const res = await fetch(`/api/products/${numericId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setProducts((prev) => prev.filter((p) => !isProductMatch(p, id)));
      }
      return data;
    } catch (err) {
      console.error('Delete product error:', err);
      return { success: false, error: err.message };
    }
  };

  // Save Category
  const handleSaveCategory = async (catData, id) => {
    try {
      const url = id ? `/api/categories/${id}` : '/api/categories';
      const method = id ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(catData),
      });
      const data = await res.json();
      if (data.success && data.category) {
        if (id) {
          setCategories((prev) =>
            prev.map((c) =>
              Number(c.id) === Number(id) || c.id === id || c.rawId === id ? { ...c, ...data.category } : c
            )
          );
        } else {
          setCategories((prev) => [...prev, data.category]);
        }
      }
      return data;
    } catch (err) {
      console.error('Save category error:', err);
      return { success: false, error: err.message };
    }
  };

  // Delete Category
  const handleDeleteCategory = async (id) => {
    try {
      const res = await fetch(`/api/categories/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setCategories((prev) =>
          prev.filter((c) => Number(c.id) !== Number(id) && c.rawId !== id && c.id !== id)
        );
        // Ushbu toifaga tegishli taomlarni xavfsiz holda category_id = null qilamiz
        setProducts((prev) =>
          prev.map((p) =>
            Number(p.category_id) === Number(id) ? { ...p, category_id: null, category: 'Boshqa' } : p
          )
        );
      }
      return data;
    } catch (err) {
      console.error('Delete category error:', err);
      return { success: false, error: err.message };
    }
  };

  // Strict Role-Based Tab Guard
  useEffect(() => {
    if (!currentUser) return;
    const role = (currentUser.role || '').toLowerCase();
    const isManager = role === 'admin' || role === 'manager';
    const isCook = role === 'cook';
    const isWaiter = role === 'waiter' || role === 'worker';
    const isCashier = role === 'cashier';

    if (isCook && currentTab !== 'kitchen') {
      setCurrentTab('kitchen');
    } else if (isWaiter && currentTab !== 'waiter') {
      setCurrentTab('waiter');
    } else if (isCashier && (currentTab === 'inventory' || currentTab === 'menu' || currentTab === 'mxik')) {
      setCurrentTab('cashier');
    }
  }, [currentUser, currentTab]);

  // Real-time sync: reload kitchen tickets when switching to kitchen tab
  useEffect(() => {
    if (currentTab === 'kitchen') {
      loadKitchenTickets();
    }
  }, [currentTab]);

  // Auth login handler (Full Login via Login + Parol)
  const handleFullLogin = (user) => {
    setCurrentUser(user);
    setIsScreenLocked(false);
    const role = (user.role || '').toLowerCase();
    if (role === 'waiter' || role === 'worker') {
      setCurrentTab('waiter');
    } else if (role === 'cook') {
      setCurrentTab('kitchen');
    } else {
      setCurrentTab('cashier');
    }
  };

  // Fast PIN Unlock handler (Unlock from 15-min inactivity or quick lock)
  const handlePinUnlock = (user) => {
    if (user) {
      setCurrentUser(user);
      const role = (user.role || '').toLowerCase();
      if (role === 'waiter' || role === 'worker') {
        setCurrentTab('waiter');
      } else if (role === 'cook') {
        setCurrentTab('kitchen');
      }
    }
    setIsScreenLocked(false);
  };

  // Quick Lock Screen handler (Cashier clicks [🔒 Qulf])
  const handleQuickLock = () => {
    setIsScreenLocked(true);
  };

  // Full Logout handler (Returns to Login + Parol)
  const handleFullLogout = () => {
    try {
      localStorage.removeItem('getpos_user');
    } catch (e) {}
    setCurrentUser(null);
    setIsScreenLocked(false);
    setSelectedTable(null);
    setActiveOrder(null);
  };

  return (
    <div className={`min-h-screen w-full flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950 ${
      currentTab === 'kitchen' || currentTab === 'mxik' ? 'bg-slate-950 text-slate-100' : 'bg-[#f1f5f9] text-slate-900'
    }`}>
      {/* Top Header - Rendered on manager/waiter/inventory/mxik tabs */}
      {currentTab !== 'cashier' && currentTab !== 'kitchen' && (
        <Header
          currentTab={currentTab}
          setCurrentTab={setCurrentTab}
          currentUser={currentUser}
          onLogout={handleFullLogout}
          syncState={syncState}
          onToggleInternet={handleToggleInternet}
          onFlushSync={handleFlushSync}
          onOpenAddDish={() => setIsAddDishModalOpen(true)}
          onOpenStaffModal={() => setIsStaffModalOpen(true)}
          onOpenTableManageModal={() => setIsTableManageModalOpen(true)}
          onOpenPrinterSettings={() => setIsPrinterModalOpen(true)}
          onOpenDebtsModal={() => setIsDebtsModalOpen(true)}
        />
      )}

      {/* Main Role Content Views */}
      <main className="flex-1 w-full flex flex-col overflow-hidden min-h-0">
        {currentTab === 'cashier' && (
          <JetCafePosView
            tables={tables}
            halls={halls}
            categories={categories}
            products={products}
            currentUser={currentUser}
            staffUsers={staffUsers}
            syncState={syncState}
            selectedTable={selectedTable}
            activeOrder={activeOrder}
            onSelectTable={(tbl) => setSelectedTable(tbl)}
            onSubmitOrder={handleSubmitOrder}
            onCompletePayment={handleCompletePayment}
            onLogout={handleFullLogout}
            onLockScreen={handleQuickLock}
            onOpenSettings={() => setCurrentTab('mxik')}
            onOpenPrinterSettings={() => setIsPrinterModalOpen(true)}
            onOpenStaffModal={() => setIsStaffModalOpen(true)}
            onNavigateTab={(tab) => setCurrentTab(tab)}
            onSaveProduct={handleSaveProduct}
            onDeleteProduct={handleDeleteProduct}
            onSaveCategory={handleSaveCategory}
            onDeleteCategory={handleDeleteCategory}
            onOpenManageTables={() => setIsTableManageModalOpen(true)}
          />
        )}

        {currentTab === 'waiter' && (
          <WaiterView
            tables={tables}
            halls={halls}
            categories={categories}
            products={products}
            currentUser={currentUser}
            onSubmitOrder={handleSubmitOrder}
            onRequestBill={handleRequestBill}
            onOpenAddDish={() => setIsAddDishModalOpen(true)}
            onAddNewDish={(prod) => setProducts((prev) => [prod, ...prev])}
            onRefreshTables={loadTables}
            onRefreshHalls={loadHalls}
            onNavigateTab={(tab) => setCurrentTab(tab)}
            onSelectTable={(tbl) => setSelectedTable(tbl)}
          />
        )}

        {currentTab === 'kitchen' && (
          <KitchenView
            tickets={kitchenTickets}
            onPrintTicket={handlePrintKitchenTicket}
            onRefreshTickets={loadKitchenTickets}
            onPlayChime={() => playSoundAlert('kitchen')}
            onUpdateStatus={handleUpdateKitchenTicketStatus}
            onItemOutOfStock={handleKitchenItemOutOfStock}
            onBackToPos={() => setCurrentTab('cashier')}
          />
        )}

        {currentTab === 'inventory' && (
          <InventoryView
            products={products}
            onRefreshProducts={loadInitialData}
          />
        )}

        {currentTab === 'menu' && (
          <MenuView
            products={products}
            categories={categories}
            onOpenAddDish={() => setIsAddDishModalOpen(true)}
            onSaveProduct={handleSaveProduct}
            onDeleteProduct={handleDeleteProduct}
            onSaveCategory={handleSaveCategory}
            onDeleteCategory={handleDeleteCategory}
            currentUser={currentUser}
          />
        )}

        {currentTab === 'mxik' && (
          <MxikSettings
            products={products}
            categories={categories}
            onUpdateMxik={handleUpdateMxik}
          />
        )}
      </main>

      {/* Tables & Halls Management Modal */}
      <TableHallManagementModal
        isOpen={isTableManageModalOpen}
        onClose={() => setIsTableManageModalOpen(false)}
        tables={tables}
        halls={halls}
        onTablesUpdated={loadTables}
        onHallsUpdated={loadHalls}
      />

      {/* Staff & Waiters Management Modal */}
      <StaffManagementModal
        isOpen={isStaffModalOpen}
        onClose={() => setIsStaffModalOpen(false)}
        onStaffUpdated={loadInitialData}
      />

      {/* Add Dish Modal for Admin/Manager */}
      <AddDishModal
        isOpen={isAddDishModalOpen}
        onClose={() => setIsAddDishModalOpen(false)}
        categories={categories}
        onProductAdded={(newProd) => {
          setProducts((prev) => [newProd, ...prev]);
        }}
      />

      {/* 1. Full Login Modal (Login + Parol) when no active user session */}
      {!currentUser && (
        <LoginModal
          onLoginSuccess={handleFullLogin}
        />
      )}

      {/* 2. Fast PIN Lock Screen (15-min Inactivity or Quick Lock) */}
      {currentUser && isScreenLocked && (
        <PinModal
          currentUser={currentUser}
          onLogin={handlePinUnlock}
          onSwitchToLogin={() => {
            setIsScreenLocked(false);
            setCurrentUser(null);
            try {
              localStorage.removeItem('getpos_user');
            } catch (_) {}
          }}
          roleHint={handleFullLogout}
        />
      )}

      {/* Fiscal Thermal Receipt Modal */}
      {currentReceipt && (
        <ReceiptModal
          receipt={currentReceipt}
          onClose={() => setCurrentReceipt(null)}
        />
      )}

      {/* Printer & Receipt Settings Modal */}
      <PrinterSettingsModal
        isOpen={isPrinterModalOpen}
        onClose={() => setIsPrinterModalOpen(false)}
      />

      {/* Debts Management Modal */}
      <JetCafeDebtsModal
        isOpen={isDebtsModalOpen}
        onClose={() => setIsDebtsModalOpen(false)}
      />
    </div>
  );
}
