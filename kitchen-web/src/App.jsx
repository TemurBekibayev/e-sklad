import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  ChefHat,
  Clock,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  LogOut,
  RefreshCw,
  CheckCircle2,
  Check,
  XCircle,
  MessageSquare,
  AlertCircle,
  Utensils,
  Flame,
  Coffee,
  Salad,
  Sparkles,
  Wifi,
  WifiOff,
  User,
  Lock,
} from 'lucide-react';

// Web Audio API Sound Generator for Kitchen Chimes
function playChime(type = 'new_ticket') {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    if (type === 'new_ticket') {
      // Double Ding-Dong Chime (D5 -> A5)
      const freqs = [587.33, 880];
      freqs.forEach((freq, idx) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime + idx * 0.18);
        gain.gain.setValueAtTime(0.35, audioCtx.currentTime + idx * 0.18);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + idx * 0.18 + 0.65);
        osc.start(audioCtx.currentTime + idx * 0.18);
        osc.stop(audioCtx.currentTime + idx * 0.18 + 0.65);
      });
    } else if (type === 'ready') {
      // Upward triumphant chime (C5 -> E5 -> G5)
      [523.25, 659.25, 783.99].forEach((freq, idx) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime + idx * 0.1);
        gain.gain.setValueAtTime(0.25, audioCtx.currentTime + idx * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + idx * 0.1 + 0.4);
        osc.start(audioCtx.currentTime + idx * 0.1);
        osc.stop(audioCtx.currentTime + idx * 0.1 + 0.4);
      });
    }
  } catch (e) {
    console.warn('Audio play restricted by browser policy:', e);
  }
}

export default function App() {
  // Session & Auth
  const [authToken, setAuthToken] = useState(() => localStorage.getItem('getpos_kitchen_token') || '');
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('getpos_kitchen_user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  // Login Form State
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  // KDS Data State
  const [tickets, setTickets] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'pending', 'in_progress', 'ready'
  const [filterWorkshop, setFilterWorkshop] = useState('all'); // 'all', 'Oshxona', 'Mangal', 'Bar', 'Salat'
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
  const [isFullscreen, setIsFullscreen] = useState(Boolean(document.fullscreenElement));
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [wsConnected, setWsConnected] = useState(false);

  const wsRef = useRef(null);
  const ticketsRef = useRef(tickets);
  ticketsRef.current = tickets;

  // Live Clock Ticker
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }, 1000);

    const handleFs = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', handleFs);

    return () => {
      clearInterval(timer);
      document.removeEventListener('fullscreenchange', handleFs);
    };
  }, []);

  // Fetch Tickets from Backend (getpos.uz API)
  const fetchTickets = async (token = authToken) => {
    if (!token) return;
    try {
      const res = await fetch('/api/v1/cafe/orders/kitchen-tickets/', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (res.status === 401) {
        handleLogout();
        return;
      }

      const data = await res.json();
      if (data.success && Array.isArray(data.tickets)) {
        setTickets(data.tickets);
      }
    } catch (err) {
      console.warn('Error fetching kitchen tickets:', err);
    }
  };

  // WebSocket Connection for Real-Time Kitchen Updates
  useEffect(() => {
    if (!authToken) return;

    fetchTickets(authToken);

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws/cafe/?token=${encodeURIComponent(authToken)}`;

    let ws = null;
    let reconnectTimeout = null;
    let pingInterval = null;

    const connect = () => {
      try {
        ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          setWsConnected(true);
          if (pingInterval) clearInterval(pingInterval);
          pingInterval = setInterval(() => {
            if (ws && ws.readyState === WebSocket.OPEN) {
              try { ws.send(JSON.stringify({ type: 'ping' })); } catch (e) {}
            }
          }, 10000);
        };

        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            const { event: ev, data } = msg;

            if (ev === 'KITCHEN_NEW_TICKET' || ev === 'ORDER_ITEMS_ADDED' || ev === 'ORDER_UPDATED') {
              fetchTickets(authToken);
              if (soundEnabled) playChime('new_ticket');
            } else if (ev === 'KITCHEN_TICKET_READY') {
              fetchTickets(authToken);
            } else if (ev === 'DISH_OUT_OF_STOCK') {
              fetchTickets(authToken);
            } else if (ev === 'TABLE_UPDATED' || ev === 'TABLE_STATUS_CHANGED') {
              fetchTickets(authToken);
            }
          } catch (e) {
            console.error('WS Parse Error:', e);
          }
        };

        ws.onclose = () => {
          setWsConnected(false);
          if (pingInterval) clearInterval(pingInterval);
          reconnectTimeout = setTimeout(connect, 3000);
        };

        ws.onerror = () => {
          setWsConnected(false);
        };
      } catch (e) {
        reconnectTimeout = setTimeout(connect, 3000);
      }
    };

    connect();

    // Fallback polling every 3 seconds to guarantee zero missed orders
    const pollInterval = setInterval(() => {
      fetchTickets(authToken);
    }, 3000);

    return () => {
      if (ws) ws.close();
      if (pingInterval) clearInterval(pingInterval);
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      clearInterval(pollInterval);
    };
  }, [authToken, soundEnabled]);

  // Login Handler
  const handleLogin = async (e) => {
    e.preventDefault();
    if (!loginForm.username || !loginForm.password) {
      setLoginError("Login va parolni kiriting");
      return;
    }

    setLoginLoading(true);
    setLoginError('');

    try {
      const res = await fetch('/api/v1/auth/login/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          login: loginForm.username.trim(),
          password: loginForm.password.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok && (data.access || data.token)) {
        const token = data.access || data.token;
        const userObj = data.user || {
          name: loginForm.username,
          tenant_name: data.tenant_name || data.company_name || 'GetPOS Kafe',
        };

        localStorage.setItem('getpos_kitchen_token', token);
        localStorage.setItem('getpos_kitchen_user', JSON.stringify(userObj));

        setAuthToken(token);
        setCurrentUser(userObj);
        fetchTickets(token);
      } else {
        setLoginError(data.detail || data.message || "Login yoki parol noto'g'ri");
      }
    } catch (err) {
      setLoginError("Serverga ulanishda xatolik yuz berdi: " + err.message);
    } finally {
      setLoginLoading(false);
    }
  };

  // Logout Handler
  const handleLogout = () => {
    localStorage.removeItem('getpos_kitchen_token');
    localStorage.removeItem('getpos_kitchen_user');
    setAuthToken('');
    setCurrentUser(null);
    setTickets([]);
  };

  // Status Change Handler (Qabul qilish / Tayyor)
  const handleUpdateStatus = async (ticketId, newStatus) => {
    const cleanOrdId = String(ticketId).replace('ticket_', '');
    try {
      // Optimistic update in UI
      setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, status: newStatus } : t));

      if (newStatus === 'ready' && soundEnabled) {
        playChime('ready');
      }

      await fetch(`/api/v1/cafe/orders/${cleanOrdId}/kitchen-status/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });
    } catch (err) {
      console.error('Status update error:', err);
    }
  };

  // Out of Stock (Taom yo'q) Handler
  const handleOutOfStock = async (ticket, item) => {
    const confirmed = window.confirm(
      `"${item.product_name}" taomini oshxonada YO'Q deb belgilashni tasdiqlaysizmi?\n\nBu taom ${ticket.tableNumber}-stol buyurtmasidan bekor qilinadi va ofitsiantga xabar boradi.`
    );
    if (!confirmed) return;

    const cleanOrdId = String(ticket.orderId || ticket.id).replace('ticket_', '');
    try {
      await fetch(`/api/v1/cafe/orders/${cleanOrdId}/item-out-of-stock/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          itemId: item.id,
          productName: item.product_name,
        }),
      });
      fetchTickets(authToken);
    } catch (err) {
      console.error('Out of stock error:', err);
    }
  };

  // Fullscreen Toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // Filtered Tickets Computation
  const filteredTickets = useMemo(() => {
    return tickets.filter((ticket) => {
      const status = ticket.status || 'pending';
      const matchesStatus = filterStatus === 'all' || status === filterStatus;
      const matchesWorkshop =
        filterWorkshop === 'all' ||
        (ticket.items && ticket.items.some((it) => (it.workshop || 'Oshxona').toLowerCase() === filterWorkshop.toLowerCase()));
      return matchesStatus && matchesWorkshop;
    });
  }, [tickets, filterStatus, filterWorkshop]);

  const pendingCount = tickets.filter(t => !t.status || t.status === 'pending').length;
  const inProgressCount = tickets.filter(t => t.status === 'in_progress').length;
  const readyCount = tickets.filter(t => t.status === 'ready').length;

  // Render Login View if Not Authenticated
  if (!authToken) {
    return (
      <div className="min-h-screen w-full bg-slate-950 flex flex-col items-center justify-center p-4 select-none relative overflow-hidden font-sans">
        {/* Background Gradients */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-orange-600/15 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-10 right-10 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative z-10">
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-orange-500/20 border border-orange-500/40 text-orange-400 flex items-center justify-center mb-4 shadow-lg shadow-orange-500/10">
              <ChefHat className="w-9 h-9" />
            </div>
            <h1 className="text-2xl font-black text-white tracking-wide">
              GetPOS <span className="text-orange-500">Kitchen</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1 font-medium">
              Oshxona Ekrani (KDS) & Real-vaqt Buyurtmalar Tizimi
            </p>
            <div className="mt-2.5 px-3 py-1 bg-slate-800/80 border border-slate-700/80 rounded-full text-[11px] text-amber-400 font-mono font-bold">
              kitchen.getpos.uz
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {loginError && (
              <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center gap-2.5 text-xs text-rose-300">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                Login / Telefon / Email:
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={loginForm.username}
                  onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                  placeholder="Masalan: oshxona_milliy yoki email"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-orange-500 transition pl-10"
                />
                <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                Parol:
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-orange-500 transition pl-10"
                />
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full py-3.5 px-4 rounded-xl bg-orange-600 hover:bg-orange-500 active:bg-orange-700 text-white font-bold text-sm shadow-lg shadow-orange-600/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-98 cursor-pointer mt-2"
            >
              {loginLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ChefHat className="w-4 h-4" />}
              <span>{loginLoading ? 'Kirilmoqda...' : 'Oshxona Ekranini Ochish'}</span>
            </button>
          </form>

          <div className="mt-8 pt-4 border-t border-slate-800 text-center">
            <p className="text-[11px] text-slate-500">
              Har bir kafe o'zining xavfsiz kabinetiga ulanadi. Boshqa kafening buyurtmalari ko'rinmaydi.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Render Kitchen Dashboard View
  return (
    <div className="w-screen h-screen bg-slate-950 text-slate-100 flex flex-col overflow-hidden select-none font-sans">
      {/* Top KDS Navbar */}
      <header className="bg-slate-900 border-b border-slate-800 px-4 py-2.5 flex items-center justify-between gap-3 shrink-0 z-30 shadow-md">
        {/* Left: Brand & Cafe Name */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-500/20 border border-orange-500/40 text-orange-400 flex items-center justify-center shrink-0 shadow-inner">
            <ChefHat className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-black text-white tracking-wide">
                GetPOS <span className="text-orange-500">Kitchen</span>
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-orange-500/20 border border-orange-500/40 text-orange-300 font-extrabold">
                {currentUser?.tenant_name || 'Kafe'}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-400">
              <span>Oshpaz: <b className="text-slate-200">{currentUser?.name || 'Xodim'}</b></span>
              <span>•</span>
              <span className="flex items-center gap-1">
                {wsConnected ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="text-emerald-400 font-bold">Jonli Online</span>
                  </>
                ) : (
                  <>
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                    <span className="text-amber-400 font-bold">Qayta ulanmoqda...</span>
                  </>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Middle: Filter Status Tabs */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 overflow-x-auto">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
              filterStatus === 'all'
                ? 'bg-orange-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            Barchasi ({tickets.length})
          </button>
          <button
            onClick={() => setFilterStatus('pending')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
              filterStatus === 'pending'
                ? 'bg-amber-600 text-white shadow-md'
                : 'text-amber-400/80 hover:text-amber-300 hover:bg-slate-900'
            }`}
          >
            ⏳ Kutilmoqda ({pendingCount})
          </button>
          <button
            onClick={() => setFilterStatus('in_progress')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
              filterStatus === 'in_progress'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-blue-400/80 hover:text-blue-300 hover:bg-slate-900'
            }`}
          >
            👨‍🍳 Tayyorlanmoqda ({inProgressCount})
          </button>
          <button
            onClick={() => setFilterStatus('ready')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
              filterStatus === 'ready'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-emerald-400/80 hover:text-emerald-300 hover:bg-slate-900'
            }`}
          >
            ✅ Tayyor ({readyCount})
          </button>
        </div>

        {/* Right: Clock & Quick Tools */}
        <div className="flex items-center gap-2">
          {/* Live Clock */}
          <div className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs font-black text-amber-400 flex items-center gap-1.5 shadow-inner">
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            <span>{currentTime}</span>
          </div>

          {/* Sound Toggle */}
          <button
            onClick={() => {
              setSoundEnabled(!soundEnabled);
              if (!soundEnabled) playChime('new_ticket');
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs border transition ${
              soundEnabled
                ? 'bg-slate-800 hover:bg-slate-700 text-amber-300 border-slate-700'
                : 'bg-slate-900 text-slate-500 border-slate-800'
            }`}
            title={soundEnabled ? "Ovozli signal yoqilgan" : "Ovozli signal o'chirilgan"}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-amber-400" /> : <VolumeX className="w-4 h-4" />}
            <span className="hidden xl:inline">{soundEnabled ? 'Ovoz yoqiq' : 'Ovozsiz'}</span>
          </button>

          {/* Refresh Button */}
          <button
            onClick={() => fetchTickets(authToken)}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
            title="Yangilash"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
            title="To'liq ekran rejimi (F11)"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition ml-1"
            title="Chiqish"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Tickets Grid Area */}
      <main className="flex-1 p-3 sm:p-4 overflow-y-auto min-h-0 bg-slate-950">
        {filteredTickets.length === 0 ? (
          <div className="h-full min-h-[350px] flex flex-col items-center justify-center text-center py-16 bg-slate-900/30 border-2 border-dashed border-slate-800 rounded-3xl p-6">
            <div className="w-20 h-20 rounded-3xl bg-slate-800/60 border border-slate-700 flex items-center justify-center text-slate-500 mb-4 shadow-inner">
              <ChefHat className="w-10 h-10 text-slate-500" />
            </div>
            <h3 className="text-xl font-black text-slate-300 mb-1">
              Hozircha yangi buyurtmalar yo'q
            </h3>
            <p className="text-xs text-slate-500 max-w-sm">
              Ofitsiant mobil ilovasi yoki kassadan buyurtma oshxonaga yuborilishi bilan bu yerda real-vaqtda begunok kartochkalari paydo bo'ladi.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 pb-6">
            {filteredTickets.map((ticket, idx) => {
              const status = ticket.status || 'pending';
              const createdDate = new Date(ticket.timestamp || Date.now());
              const timeStr = createdDate.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });
              
              // Calculate elapsed minutes
              const elapsedMinutes = Math.floor((Date.now() - createdDate.getTime()) / 60000);
              const isUrgent = elapsedMinutes >= 15;
              const isWarning = elapsedMinutes >= 10 && elapsedMinutes < 15;

              return (
                <div
                  key={ticket.id || idx}
                  className={`bg-white text-slate-950 rounded-3xl p-4 sm:p-5 shadow-2xl flex flex-col justify-between font-mono relative overflow-hidden transition-all ${
                    status === 'ready'
                      ? 'border-4 border-emerald-500 ring-2 ring-emerald-500/20'
                      : status === 'in_progress'
                      ? 'border-4 border-blue-500 ring-2 ring-blue-500/20'
                      : 'border-4 border-amber-500 ring-2 ring-amber-500/20'
                  }`}
                >
                  {/* Ticket Header */}
                  <div className="border-b-2 border-dashed border-slate-400 pb-3 mb-3">
                    <div className="flex items-center justify-between text-xs text-slate-600">
                      <span className="font-extrabold uppercase tracking-wide">OSHXONA BEGUNOKI</span>
                      <span className="flex items-center gap-1 font-bold">
                        <Clock className="w-3.5 h-3.5" />
                        {timeStr}
                      </span>
                    </div>

                    <div className="flex items-center justify-between mt-2">
                      <div className="text-3xl font-black text-slate-900 tracking-tight">
                        {ticket.tableNumber}-STOL
                      </div>
                      <div className="text-xs font-bold px-2.5 py-1 bg-slate-200 text-slate-800 rounded-lg">
                        👤 {ticket.waiterName || 'Ofitsiant'}
                      </div>
                    </div>

                    {/* Elapsed Timer Badge */}
                    <div className="mt-2 flex items-center justify-between">
                      <span
                        className={`text-[11px] font-black px-2 py-0.5 rounded-md flex items-center gap-1 ${
                          isUrgent
                            ? 'bg-rose-100 text-rose-700 animate-pulse'
                            : isWarning
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        <Clock className="w-3 h-3" />
                        <span>{elapsedMinutes} daqiqa oldin</span>
                      </span>

                      {ticket.tableName && ticket.tableName !== `${ticket.tableNumber}-stol` && (
                        <span className="text-[10px] text-slate-500 font-bold">{ticket.tableName}</span>
                      )}
                    </div>
                  </div>

                  {/* Items List (Strictly NO PRICES!) */}
                  <div className="space-y-2.5 my-2 flex-1">
                    {ticket.items &&
                      ticket.items.map((item, itemIdx) => (
                        <div
                          key={itemIdx}
                          className="bg-slate-100 p-2.5 rounded-xl border border-slate-200 flex flex-col gap-1.5"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-slate-950 font-black text-base flex-1 leading-snug">
                              {item.product_name}
                            </span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="text-orange-600 bg-orange-100 px-2.5 py-0.5 rounded-lg text-lg font-black">
                                x{item.quantity}
                              </span>
                              {status !== 'ready' && (
                                <button
                                  type="button"
                                  onClick={() => handleOutOfStock(ticket, item)}
                                  title="Taom oshxonada yo'q - bekor qilish va ofitsiantga xabar yuborish"
                                  className="px-2 py-1 bg-rose-100 hover:bg-rose-200 text-rose-700 rounded-lg text-xs font-black transition flex items-center gap-0.5 border border-rose-300 active:scale-95"
                                >
                                  <XCircle className="w-3.5 h-3.5" />
                                  <span>Yo'q</span>
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Customer Special Note / Izoh */}
                          {item.comment && item.comment.trim() !== '' && (
                            <div className="flex items-center gap-1 text-xs font-black text-red-700 bg-red-100 px-2 py-1 rounded-lg border border-red-200">
                              <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                              <span>IZOH: {item.comment.trim()}</span>
                            </div>
                          )}
                        </div>
                      ))}
                  </div>

                  {/* Ticket Footer Action Buttons */}
                  <div className="border-t-2 border-dashed border-slate-400 pt-3 mt-3 flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] text-slate-500 font-bold">Holati:</span>
                      {status === 'ready' ? (
                        <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 font-black text-xs flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Tayyor bo'ldi</span>
                        </span>
                      ) : status === 'in_progress' ? (
                        <span className="px-2.5 py-1 rounded-lg bg-blue-100 text-blue-800 font-black text-xs flex items-center gap-1">
                          <ChefHat className="w-3.5 h-3.5 text-blue-600" />
                          <span>Tayyorlanmoqda</span>
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-800 font-black text-xs flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-amber-600" />
                          <span>Kutilmoqda</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      {status === 'pending' && (
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(ticket.id, 'in_progress')}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs shadow-md shadow-blue-500/20 active:scale-95 transition"
                        >
                          <ChefHat className="w-4 h-4" />
                          <span>Qabul qilish</span>
                        </button>
                      )}

                      {status !== 'ready' ? (
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(ticket.id, 'ready')}
                          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md shadow-emerald-500/20 active:scale-95 transition ${
                            status === 'in_progress' ? 'w-full' : ''
                          }`}
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Tayyor</span>
                        </button>
                      ) : (
                        <div className="w-full text-center py-2 text-xs font-black text-emerald-800 bg-emerald-100 rounded-xl border border-emerald-300 flex items-center justify-center gap-1">
                          <Check className="w-4 h-4" />
                          <span>Ofitsiantga xabar berildi</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
