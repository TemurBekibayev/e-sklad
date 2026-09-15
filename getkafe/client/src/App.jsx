import React, { useState, useEffect, useRef } from 'react';
import Header from './components/Header';
import PinModal from './components/PinModal';
import ReceiptModal from './components/ReceiptModal';
import AddDishModal from './components/AddDishModal';
import StaffManagementModal from './components/StaffManagementModal';
import TableHallManagementModal from './components/TableHallManagementModal';
import PrinterSettingsModal from './components/PrinterSettingsModal';
import JetCafePosView from './pages/JetCafePosView';
import CashierView from './pages/CashierView';
import WaiterView from './pages/WaiterView';
import KitchenView from './pages/KitchenView';
import MenuView from './pages/MenuView';
import MxikSettings from './pages/MxikSettings';
import InventoryView from './pages/InventoryView';

export default function App() {
  const [currentTab, setCurrentTab] = useState('cashier'); // 'cashier', 'waiter', 'kitchen', 'inventory', 'menu', 'mxik'
  // Always enforce PIN modal on app launch
  const [currentUser, setCurrentUser] = useState(null);
  const [isPinModalOpen, setIsPinModalOpen] = useState(true);
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [isTableManageModalOpen, setIsTableManageModalOpen] = useState(false);
  const [isPrinterModalOpen, setIsPrinterModalOpen] = useState(false);

  // Clear any legacy mock sessions on mount
  useEffect(() => {
    try {
      localStorage.removeItem('kafepos_user');
      sessionStorage.removeItem('kafepos_user');
    } catch (e) {}
  }, []);
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

      if (type === 'kitchen') {
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
    if (selectedTable && selectedTable.current_order_id) {
      fetch(`/api/orders/table/${selectedTable.id}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.success) {
            setActiveOrder(data);
          }
        });
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
  const handleRequestBill = async (orderId) => {
    const res = await fetch(`/api/orders/${orderId}/bill-request`, {
      method: 'POST',
    });
    return await res.json();
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
    const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      setProducts((prev) => prev.filter((p) => p.id !== id));
    }
    return data;
  };

  // Save Category
  const handleSaveCategory = async (catData, id) => {
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
        setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, ...data.category } : c)));
      } else {
        setCategories((prev) => [...prev, data.category]);
      }
    }
    return data;
  };

  // Delete Category
  const handleDeleteCategory = async (id) => {
    const res = await fetch(`/api/categories/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      setCategories((prev) => prev.filter((c) => c.id !== id));
    }
    return data;
  };

  // Auth login handler
  const handleLogin = (user) => {
    setCurrentUser(user);
    setIsPinModalOpen(false);
    if (user.role === 'waiter') {
      setCurrentTab('waiter');
    } else if (user.role === 'cook') {
      setCurrentTab('kitchen');
    } else {
      setCurrentTab('cashier');
    }
  };

  // Logout handler
  const handleLogout = () => {
    setCurrentUser(null);
    setIsPinModalOpen(true);
    setSelectedTable(null);
    setActiveOrder(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
      {/* Top Header */}
      <Header
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        currentUser={currentUser}
        onLogout={handleLogout}
        syncState={syncState}
        onToggleInternet={handleToggleInternet}
        onFlushSync={handleFlushSync}
        onOpenAddDish={() => setIsAddDishModalOpen(true)}
        onOpenStaffModal={() => setIsStaffModalOpen(true)}
        onOpenTableManageModal={() => setIsTableManageModalOpen(true)}
        onOpenPrinterSettings={() => setIsPrinterModalOpen(true)}
      />

      {/* Main Role Content Views */}
      <main className="flex-1 overflow-hidden flex flex-col">
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
            onLogout={handleLogout}
            onOpenSettings={() => setCurrentTab('mxik')}
            onOpenPrinterSettings={() => setIsPrinterModalOpen(true)}
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
          />
        )}

        {currentTab === 'kitchen' && (
          <KitchenView
            tickets={kitchenTickets}
            onPrintTicket={(t) => window.print()}
            onPlayChime={() => playSoundAlert('kitchen')}
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

      {/* PIN Login Modal */}
      {isPinModalOpen && (
        <PinModal
          onLogin={handleLogin}
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
    </div>
  );
}
