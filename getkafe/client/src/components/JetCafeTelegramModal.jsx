// client/src/components/JetCafeTelegramModal.jsx - JetBot Management Modal matching JetCafe Video
import React, { useState, useEffect, useRef } from 'react';

export default function JetCafeTelegramModal({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('sozlamalar'); // 'sozlamalar', 'obunachilar', 'yordam'
  const [settings, setSettings] = useState(null);
  const [subscribers, setSubscribers] = useState([]);
  const [selectedSubIndex, setSelectedSubIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  // Sub-modals
  const [isTokenModalOpen, setIsTokenModalOpen] = useState(false);
  const [tokenInput, setTokenInput] = useState('');

  const [isNewSubModalOpen, setIsNewSubModalOpen] = useState(false);
  const [newSubCode, setNewSubCode] = useState('');
  const [botUsername, setBotUsername] = useState('@Hisobchiuz101bot');
  const codePollRef = useRef(null);

  const [isObunaModalOpen, setIsObunaModalOpen] = useState(false);
  const [obunaSub, setObunaSub] = useState(null);
  const [obunaPrefs, setObunaPrefs] = useState({
    notify_bot_status: true,
    notify_db_backup: true,
    notify_cashier_report: true,
    notify_status: true,
    notify_orders: true,
    notify_cancellations: true,
  });

  const [simulatedMessages, setSimulatedMessages] = useState([]);

  // Fetch settings & subscribers
  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/telegram/settings');
      const data = await res.json();
      if (data.success) {
        setSettings(data.settings);
        setTokenInput(data.settings?.bot_token || '');
        setBotUsername(data.settings?.bot_username || '@Hisobchiuz101bot');
        setSubscribers(data.subscribers || []);
        setSimulatedMessages(data.simulatedMessages || []);
      }
    } catch (e) {
      console.error('Error loading telegram settings:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    } else {
      if (codePollRef.current) clearInterval(codePollRef.current);
    }
    return () => {
      if (codePollRef.current) clearInterval(codePollRef.current);
    };
  }, [isOpen]);

  // Toggle Ishla / Tuxta
  const handleToggleService = async (enable) => {
    try {
      const res = await fetch('/api/telegram/toggle-service', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_enabled: enable }),
      });
      const data = await res.json();
      if (data.success) {
        setStatusMsg(enable ? "JetBot servisi ishga tushdi!" : "JetBot servisi to'xtatildi.");
        setTimeout(() => setStatusMsg(''), 3000);
        loadData();
      }
    } catch (e) {
      alert('Xatolik: ' + e.message);
    }
  };

  // Save Token
  const handleSaveToken = async () => {
    try {
      const res = await fetch('/api/telegram/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bot_token: tokenInput,
          poll_interval: settings?.poll_interval || 30,
          is_enabled: 1,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setIsTokenModalOpen(false);
        setStatusMsg("Bot tokeni muvaffaqiyatli saqlandi!");
        setTimeout(() => setStatusMsg(''), 3000);
        loadData();
      }
    } catch (e) {
      alert('Xatolik: ' + e.message);
    }
  };

  // Start New Subscriber flow (Generate 4-digit code)
  const handleOpenNewSub = async () => {
    try {
      const res = await fetch('/api/telegram/generate-code', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setNewSubCode(data.code);
        setBotUsername(data.bot_username || '@Hisobchiuz101bot');
        setIsNewSubModalOpen(true);

        // Start polling check-code every 2s
        if (codePollRef.current) clearInterval(codePollRef.current);
        codePollRef.current = setInterval(async () => {
          try {
            const cRes = await fetch(`/api/telegram/check-code/${data.code}`);
            const cData = await cRes.json();
            if (cData.connected && cData.subscriber) {
              clearInterval(codePollRef.current);
              setIsNewSubModalOpen(false);
              // Open Obuna modal for newly connected subscriber
              setObunaSub(cData.subscriber);
              setObunaPrefs({
                notify_bot_status: !!cData.subscriber.notify_bot_status,
                notify_db_backup: !!cData.subscriber.notify_db_backup,
                notify_cashier_report: !!cData.subscriber.notify_cashier_report,
                notify_status: !!cData.subscriber.notify_status,
                notify_orders: !!cData.subscriber.notify_orders,
                notify_cancellations: !!cData.subscriber.notify_cancellations,
              });
              setIsObunaModalOpen(true);
              loadData();
            }
          } catch (err) {}
        }, 2000);
      }
    } catch (e) {
      alert('Xatolik: ' + e.message);
    }
  };

  // Simulate Telegram user sending the 4-digit PIN code
  const handleSimulateCodeSend = async () => {
    if (!newSubCode) return;
    try {
      await fetch('/api/telegram/simulate-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: newSubCode,
          chatId: '99890' + Math.floor(1000000 + Math.random() * 9000000),
          username: 'kassir_admin',
          firstName: 'Kassir / Menejer',
        }),
      });
      // The polling interval will detect this in 1-2 seconds
    } catch (e) {
      alert('Simulyatsiya xatosi: ' + e.message);
    }
  };

  // Open Obuna modal for selected subscriber
  const handleOpenEditSub = () => {
    const sub = subscribers[selectedSubIndex];
    if (!sub) return;
    setObunaSub(sub);
    setObunaPrefs({
      notify_bot_status: !!sub.notify_bot_status,
      notify_db_backup: !!sub.notify_db_backup,
      notify_cashier_report: !!sub.notify_cashier_report,
      notify_status: !!sub.notify_status,
      notify_orders: !!sub.notify_orders,
      notify_cancellations: !!sub.notify_cancellations,
    });
    setIsObunaModalOpen(true);
  };

  // Delete subscriber
  const handleDeleteSub = async () => {
    const sub = subscribers[selectedSubIndex];
    if (!sub) return;
    if (!window.confirm(`Obunachini o'chirishni tasdiqlaysizmi: ${sub.first_name || sub.sub_number}?`)) return;
    try {
      await fetch(`/api/telegram/subscribers/${sub.id}`, { method: 'DELETE' });
      loadData();
    } catch (e) {
      alert('Xatolik: ' + e.message);
    }
  };

  // Save Obuna preferences
  const handleSaveObuna = async () => {
    if (!obunaSub) return;
    try {
      const res = await fetch(`/api/telegram/subscribers/${obunaSub.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(obunaPrefs),
      });
      const data = await res.json();
      if (data.success) {
        setIsObunaModalOpen(false);
        setStatusMsg("Obuna sozlamalari muvaffaqiyatli saqlandi!");
        setTimeout(() => setStatusMsg(''), 3000);
        loadData();
      }
    } catch (e) {
      alert('Xatolik: ' + e.message);
    }
  };

  // Send Test Notification
  const handleSendTest = async () => {
    try {
      const res = await fetch('/api/telegram/test', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setStatusMsg("Sinov xabari yuborildi!");
        setTimeout(() => setStatusMsg(''), 3000);
        loadData();
      }
    } catch (e) {
      alert('Xatolik: ' + e.message);
    }
  };

  // Send Database Backup
  const handleSendBackup = async () => {
    try {
      const res = await fetch('/api/telegram/backup', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setStatusMsg(`Zaxira nusxa yaratildi (${data.fileName}) va Telegramga yuborildi!`);
        setTimeout(() => setStatusMsg(''), 4000);
        loadData();
      }
    } catch (e) {
      alert('Xatolik: ' + e.message);
    }
  };

  if (!isOpen) return null;

  const isServiceActive = !!settings?.is_enabled;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-[2px] animate-fadeIn">
      {/* Outer Windows-like dialog */}
      <div className="bg-[#f0f0f0] border-2 border-[#005a9e] rounded shadow-2xl w-full max-w-xl text-slate-800 flex flex-col font-sans select-none overflow-hidden">
        
        {/* Title Bar matching JetBot 2.3.2.26 */}
        <div className="bg-[#005a9e] text-white px-3 py-1 flex items-center justify-between font-medium text-xs shadow">
          <div className="flex items-center gap-1.5">
            <span>✈️</span>
            <span>JetBot - Sozlamalar | 2.3.2</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="w-5 h-4 bg-[#004e8a] hover:bg-[#003d6d] text-[9px] flex items-center justify-center rounded-sm"
              title="Kichraytirish"
            >
              _
            </button>
            <button
              type="button"
              className="w-5 h-4 bg-[#004e8a] hover:bg-[#003d6d] text-[9px] flex items-center justify-center rounded-sm"
              title="Kattalashtirish"
            >
              □
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-5 h-4 bg-rose-600 hover:bg-rose-700 text-[10px] flex items-center justify-center font-bold rounded-sm text-white"
              title="Yopish"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Menu Bar: Sozlamalar | Obunachilar | Yordam */}
        <div className="bg-[#f5f5f5] border-b border-[#d4d4d4] px-2 py-0.5 flex gap-1 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('sozlamalar')}
            className={`px-3 py-1 rounded-t transition ${
              activeTab === 'sozlamalar'
                ? 'bg-white border-t-2 border-[#005a9e] font-semibold text-[#005a9e] shadow-sm'
                : 'hover:bg-slate-200 text-slate-700'
            }`}
          >
            Sozlamalar
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('obunachilar')}
            className={`px-3 py-1 rounded-t transition flex items-center gap-1.5 ${
              activeTab === 'obunachilar'
                ? 'bg-white border-t-2 border-[#005a9e] font-semibold text-[#005a9e] shadow-sm'
                : 'hover:bg-slate-200 text-slate-700'
            }`}
          >
            <span>Obunachilar</span>
            {subscribers.length > 0 && (
              <span className="bg-blue-100 text-blue-800 text-[10px] px-1.5 rounded-full font-bold">
                {subscribers.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('yordam')}
            className={`px-3 py-1 rounded-t transition ${
              activeTab === 'yordam'
                ? 'bg-white border-t-2 border-[#005a9e] font-semibold text-[#005a9e] shadow-sm'
                : 'hover:bg-slate-200 text-slate-700'
            }`}
          >
            Yordam
          </button>
        </div>

        {/* Status Notification Banner if present */}
        {statusMsg && (
          <div className="bg-emerald-600 text-white text-xs px-3 py-1.5 text-center font-medium animate-pulse">
            ✓ {statusMsg}
          </div>
        )}

        {/* Tab 1: Sozlamalar (Settings) matching jetbot_frame_5.jpg */}
        {activeTab === 'sozlamalar' && (
          <div className="p-5 flex flex-col gap-4 bg-[#f9f9f9] text-xs">
            {/* Service status box */}
            <div className="bg-white border border-[#d0d0d0] p-3 rounded shadow-sm flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-600">Doimiy servis:</span>
                  <span
                    className={`font-bold px-2 py-0.5 rounded text-xs flex items-center gap-1.5 ${
                      isServiceActive
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-rose-100 text-rose-800 border border-rose-300'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${isServiceActive ? 'bg-emerald-600 animate-ping' : 'bg-rose-600'}`} />
                    {isServiceActive ? 'Ishlamoqda' : 'Tuxtagan'}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-slate-600">Oraliq:</span>
                  <input
                    type="number"
                    value={settings?.poll_interval || 30}
                    onChange={(e) => setSettings({ ...settings, poll_interval: Number(e.target.value) })}
                    className="w-14 border border-slate-300 rounded px-1.5 py-0.5 text-center font-mono font-bold"
                  />
                  <span className="text-slate-500">sekund</span>
                </div>
              </div>

              {/* Action buttons: Yangila, Ishla, Tuxta matching video frame 5 */}
              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={loadData}
                  className="px-4 py-1.5 bg-[#e1e1e1] hover:bg-[#d5d5d5] border border-[#adadad] rounded font-medium text-slate-700 transition active:scale-95"
                >
                  Yangila
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleService(true)}
                  disabled={isServiceActive}
                  className={`px-4 py-1.5 border rounded font-semibold transition ${
                    isServiceActive
                      ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700 active:scale-95 shadow-sm'
                  }`}
                >
                  Ishla
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleService(false)}
                  disabled={!isServiceActive}
                  className={`px-4 py-1.5 border rounded font-semibold transition ${
                    !isServiceActive
                      ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                      : 'bg-rose-600 hover:bg-rose-700 text-white border-rose-700 active:scale-95 shadow-sm'
                  }`}
                >
                  Tuxta
                </button>
              </div>
            </div>

            {/* JetBot Database / Token configuration */}
            <div className="bg-white border border-[#d0d0d0] p-3 rounded shadow-sm flex flex-col gap-2.5">
              <div className="font-semibold text-slate-700 border-b pb-1 flex items-center justify-between">
                <span>🤖 Telegram Bot Konfiguratsiyasi</span>
                <span className="text-[10px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded font-mono">
                  {settings?.bot_username || '@Hisobchiuz101bot'}
                </span>
              </div>

              <div className="grid grid-cols-3 items-center gap-2 text-xs">
                <span className="text-slate-600">Dastur turi:</span>
                <span className="col-span-2 font-bold text-slate-800 bg-slate-50 px-2 py-1 rounded border border-slate-200">
                  JetCafe / GetPOS
                </span>
              </div>

              <div className="grid grid-cols-3 items-center gap-2 text-xs">
                <span className="text-slate-600">Bot Tokeni:</span>
                <div className="col-span-2 flex items-center gap-2">
                  <span className="font-mono text-[11px] text-slate-500 bg-slate-100 px-2 py-1 rounded border border-slate-200 flex-1 truncate">
                    {settings?.bot_token ? '••••••••••••••••••••••••••••' : '(Token kiritilmagan - Simulyatsiya faol)'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsTokenModalOpen(true)}
                    className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium text-[11px] transition whitespace-nowrap"
                  >
                    Token sozlash
                  </button>
                </div>
              </div>

              {/* Action buttons: Sinov xabari, Zaxira nusxa */}
              <div className="flex gap-2 pt-2 border-t border-slate-100 mt-1">
                <button
                  type="button"
                  onClick={handleSendTest}
                  className="flex-1 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-300 rounded font-medium text-xs flex items-center justify-center gap-1.5 transition active:scale-95"
                >
                  <span>📲</span>
                  <span>Sinov xabari yuborish</span>
                </button>
                <button
                  type="button"
                  onClick={handleSendBackup}
                  className="flex-1 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded font-medium text-xs flex items-center justify-center gap-1.5 transition active:scale-95"
                >
                  <span>💾</span>
                  <span>Zaxira nusxa (Backup)</span>
                </button>
              </div>
            </div>

            {/* Simulated Telegram Messages preview */}
            <div className="bg-white border border-[#d0d0d0] p-3 rounded shadow-sm flex flex-col gap-2">
              <div className="flex items-center justify-between text-[11px] text-slate-600 font-semibold border-b pb-1">
                <span>💬 Telegramga yuborilgan so'nggi xabarlar (Preview)</span>
                <span className="text-[10px] text-slate-400">{simulatedMessages.length} ta xabar</span>
              </div>
              <div className="h-28 overflow-y-auto bg-slate-50 border border-slate-200 rounded p-2 text-[11px] font-mono flex flex-col gap-1.5 divide-y divide-slate-200">
                {simulatedMessages.length === 0 ? (
                  <div className="text-slate-400 italic text-center py-4">
                    Hozircha xabarlar yo'q. Sinov xabari yuboring yoki buyurtma to'lang.
                  </div>
                ) : (
                  simulatedMessages.map((msg) => (
                    <div key={msg.id} className="pt-1 first:pt-0">
                      <div className="text-[10px] text-slate-400 flex justify-between">
                        <span>Chat ID: {msg.chat_id}</span>
                        <span>{new Date(msg.date).toLocaleTimeString('ru-RU')}</span>
                      </div>
                      <div className="text-slate-700 whitespace-pre-wrap mt-0.5">
                        {msg.text.replace(/<[^>]*>/g, '')}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Obunachilar (Subscribers) matching jetbot_step_160.jpg and frame 8 */}
        {activeTab === 'obunachilar' && (
          <div className="p-5 flex flex-col gap-4 bg-[#f9f9f9] text-xs">
            <div className="bg-white border border-[#d0d0d0] p-3 rounded shadow-sm flex flex-col gap-3">
              <div className="font-semibold text-slate-700 border-b pb-1 flex items-center justify-between">
                <span>Obunachilar</span>
                <span className="text-[11px] text-slate-500 font-normal">
                  Jami: {subscribers.length} ta
                </span>
              </div>

              {/* Listbox of subscribers matching Windows listbox */}
              <div className="border border-slate-300 bg-white rounded h-48 overflow-y-auto divide-y divide-slate-100 shadow-inner">
                {subscribers.length === 0 ? (
                  <div className="text-slate-400 italic text-center py-8">
                    Obunachilar mavjud emas. Yangi obunachi qo'shish uchun pastdagi "yangi" tugmasini bosing.
                  </div>
                ) : (
                  subscribers.map((sub, index) => {
                    const isSelected = selectedSubIndex === index;
                    return (
                      <div
                        key={sub.id}
                        onClick={() => setSelectedSubIndex(index)}
                        className={`px-3 py-2 cursor-pointer flex items-center justify-between text-xs transition ${
                          isSelected
                            ? 'bg-[#005a9e] text-white font-medium shadow-sm'
                            : 'hover:bg-blue-50/60 text-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className={isSelected ? 'text-white' : 'text-blue-600'}>👤</span>
                          <div>
                            <div className="font-semibold">
                              {sub.first_name || 'Foydalanuvchi'} {sub.username ? `(${sub.username})` : ''}
                            </div>
                            <div className={`text-[10px] ${isSelected ? 'text-blue-100' : 'text-slate-500'}`}>
                              ID: {sub.sub_number || sub.id} • Muddat: {sub.sub_expires || '05.05.2027'}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                              sub.is_active
                                ? isSelected
                                  ? 'bg-emerald-500 text-white'
                                  : 'bg-emerald-100 text-emerald-800'
                                : 'bg-slate-200 text-slate-600'
                            }`}
                          >
                            {sub.is_active ? 'Faol' : 'Kutilmoqda'}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Action buttons: yangi, tahrir, uchir matching jetbot_step_160.jpg */}
              <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleOpenNewSub}
                    className="px-4 py-1 bg-[#e1e1e1] hover:bg-[#d5d5d5] border border-[#adadad] rounded font-medium text-emerald-800 transition active:scale-95 shadow-sm"
                  >
                    yangi
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenEditSub}
                    disabled={subscribers.length === 0}
                    className="px-4 py-1 bg-[#e1e1e1] hover:bg-[#d5d5d5] border border-[#adadad] rounded font-medium text-blue-800 transition active:scale-95 shadow-sm disabled:opacity-50"
                  >
                    tahrir
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteSub}
                    disabled={subscribers.length === 0}
                    className="px-4 py-1 bg-[#e1e1e1] hover:bg-[#d5d5d5] border border-[#adadad] rounded font-medium text-rose-800 transition active:scale-95 shadow-sm disabled:opacity-50"
                  >
                    uchir
                  </button>
                </div>

                <div className="text-[11px] text-slate-500">
                  Tanlangan: #{subscribers[selectedSubIndex]?.sub_number || '—'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Yordam (Help & BotFather Guide) */}
        {activeTab === 'yordam' && (
          <div className="p-5 flex flex-col gap-3 bg-[#f9f9f9] text-xs leading-relaxed text-slate-700 max-h-[450px] overflow-y-auto">
            <div className="bg-white border border-slate-200 p-3 rounded shadow-sm">
              <h4 className="font-bold text-blue-900 mb-2 flex items-center gap-1.5 text-sm">
                <span>📘</span>
                <span>JetBot ni sozlash yo'riqnomasi (3 qadamda)</span>
              </h4>
              <ol className="list-decimal pl-5 space-y-2 text-xs">
                <li>
                  <b>@BotFather orqali bot ochish:</b>
                  <p className="text-slate-600 mt-0.5">
                    Telegramda <code className="bg-slate-100 px-1 rounded text-blue-700">@BotFather</code> ga kiring va <code className="bg-slate-100 px-1 rounded">/newbot</code> yuboring. Bot nomini (masalan: <i>Hisobchiuzbot</i>) va username (masalan: <i>Hisobchiuz101bot</i>) belgilang.
                  </p>
                </li>
                <li>
                  <b>Tokenni JetBot ga kiritish:</b>
                  <p className="text-slate-600 mt-0.5">
                    BotFather bergan HTTP API tokenni <b>Sozlamalar ▶ Token sozlash</b> oynasiga kiritib <b>Saqla</b> tugmasini bosing.
                  </p>
                </li>
                <li>
                  <b>Kassir yoki Administratorni ulash:</b>
                  <p className="text-slate-600 mt-0.5">
                    <b>Obunachilar ▶ yangi</b> tugmasini bosing. Ekranda chiqqan 4 xonali kodni (masalan: <code className="bg-emerald-100 text-emerald-800 px-1 rounded font-bold">6901</code>) o'z Telegramingizdan botga yuboring. Oyna avtomatik bog'lanadi!
                  </p>
                </li>
              </ol>
            </div>

            <div className="bg-white border border-slate-200 p-3 rounded shadow-sm">
              <h4 className="font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
                <span>⌨️</span>
                <span>Telegram Bot buyruqlari</span>
              </h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-slate-50 p-2 rounded border border-slate-100">
                  <div className="font-bold text-blue-700 font-mono">Кассовый отчёт</div>
                  <div className="text-[11px] text-slate-500">Joriy smena tushumi, kassa qoldig'i, daromad.</div>
                </div>
                <div className="bg-slate-50 p-2 rounded border border-slate-100">
                  <div className="font-bold text-amber-700 font-mono">Резервная копия...</div>
                  <div className="text-[11px] text-slate-500">Bazani arxivlab (.bak.gz) Telegramga yuklash.</div>
                </div>
                <div className="bg-slate-50 p-2 rounded border border-slate-100">
                  <div className="font-bold text-emerald-700 font-mono">Статус</div>
                  <div className="text-[11px] text-slate-500">Obuna muddati va raqamini ko'rsatish.</div>
                </div>
                <div className="bg-slate-50 p-2 rounded border border-slate-100">
                  <div className="font-bold text-rose-700 font-mono">Avtomatik bildirishnoma</div>
                  <div className="text-[11px] text-slate-500">Yangi buyurtma, to'lov va taom bekor bo'lganda.</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bottom footer matching Windows dialog */}
        <div className="bg-[#e1e1e1] border-t border-[#d4d4d4] px-4 py-2 flex justify-end gap-2 text-xs">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-1.5 bg-white hover:bg-slate-100 border border-slate-400 rounded font-semibold text-slate-700 transition active:scale-95 shadow-sm"
          >
            Yopish
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SUB-MODAL 1: JetBot - Token matching jetbot_token_135.jpg                 */}
      {/* ========================================================================= */}
      {isTokenModalOpen && (
        <div className="fixed inset-0 z-60 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-[#f0f0f0] border-2 border-[#005a9e] rounded shadow-2xl w-full max-w-md text-slate-800 flex flex-col font-sans overflow-hidden">
            {/* Title */}
            <div className="bg-[#005a9e] text-white px-3 py-1 flex items-center justify-between font-medium text-xs">
              <div className="flex items-center gap-1.5">
                <span>🔑</span>
                <span>JetBot - Token</span>
              </div>
              <button
                type="button"
                onClick={() => setIsTokenModalOpen(false)}
                className="w-5 h-4 bg-rose-600 hover:bg-rose-700 text-[10px] flex items-center justify-center font-bold rounded-sm text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-4 flex flex-col gap-3 text-xs bg-[#f9f9f9]">
              <div className="flex items-center gap-2">
                <span className="font-medium text-slate-600 w-16">Token:</span>
                <input
                  type="text"
                  placeholder="1234567890:ABCdefGhIJKlmNoPQRsTUVwxyZ..."
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  className="flex-1 border border-slate-300 rounded px-2 py-1 font-mono text-xs bg-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* Exact text from jetbot_token_135.jpg */}
              <p className="text-slate-600 leading-relaxed bg-blue-50 p-2.5 rounded border border-blue-200">
                Yangi Telegram botni ro'yxatdan o'tqazish uchun rasmiy <b>@BotFather</b> ga murojaat qiling. Undan olingan tokenni yuqoridagi maydonga yozing.
              </p>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsTokenModalOpen(false)}
                  className="px-4 py-1 bg-white hover:bg-slate-100 border border-slate-300 rounded text-slate-700 font-medium"
                >
                  Bekor qilish
                </button>
                <button
                  type="button"
                  onClick={handleSaveToken}
                  className="px-5 py-1 bg-[#005a9e] hover:bg-[#004e8a] text-white rounded font-semibold transition active:scale-95 shadow-sm"
                >
                  Saqla
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-MODAL 2: JetBot - Yangi obunachi matching jetbot_step_170.jpg          */}
      {/* ========================================================================= */}
      {isNewSubModalOpen && (
        <div className="fixed inset-0 z-60 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-[#f0f0f0] border-2 border-[#005a9e] rounded shadow-2xl w-full max-w-sm text-slate-800 flex flex-col font-sans overflow-hidden">
            {/* Title */}
            <div className="bg-[#005a9e] text-white px-3 py-1 flex items-center justify-between font-medium text-xs">
              <div className="flex items-center gap-1.5">
                <span>➕</span>
                <span>JetBot - Yangi obunachi</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (codePollRef.current) clearInterval(codePollRef.current);
                  setIsNewSubModalOpen(false);
                }}
                className="w-5 h-4 bg-rose-600 hover:bg-rose-700 text-[10px] flex items-center justify-center font-bold rounded-sm text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-5 flex flex-col gap-4 text-xs bg-[#f9f9f9]">
              {/* Box: Kod matching jetbot_step_170.jpg */}
              <div className="bg-white border border-slate-300 rounded p-3 text-center shadow-inner">
                <div className="text-[11px] text-slate-500 font-medium">Kod</div>
                <div className="text-4xl font-extrabold text-[#5bb318] tracking-widest font-mono my-1 select-all">
                  {newSubCode}
                </div>
              </div>

              {/* Box: Bot nomi matching jetbot_step_170.jpg */}
              <div className="bg-white border border-slate-300 rounded p-3 text-center shadow-inner">
                <div className="text-[11px] text-slate-500 font-medium">Bot nomi</div>
                <div className="text-base font-bold text-blue-600 font-mono mt-0.5">
                  {botUsername}
                </div>
              </div>

              {/* Instruction text matching jetbot_step_170.jpg */}
              <p className="text-slate-600 text-center text-xs leading-relaxed px-1">
                Shu kodni botga telegramingizdan yuboring. Kod qabul qilinganda xabarli oyna chiqadi
              </p>

              {/* Waiting spinner */}
              <div className="flex items-center justify-center gap-2 text-slate-500 text-[11px]">
                <span className="w-3 h-3 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
                <span>Telegramdan xabar kutilmoqda...</span>
              </div>

              {/* Quick Simulator button for immediate testing */}
              <div className="pt-2 border-t border-slate-200 flex flex-col gap-1.5">
                <button
                  type="button"
                  onClick={handleSimulateCodeSend}
                  className="w-full py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded font-medium text-[11px] transition active:scale-95"
                >
                  ⚡ Sinov: Telegramdan kodni yuborishni emulyatsiya qilish
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (codePollRef.current) clearInterval(codePollRef.current);
                    setIsNewSubModalOpen(false);
                  }}
                  className="w-full py-1 bg-white hover:bg-slate-100 border border-slate-300 rounded text-slate-600 text-[11px]"
                >
                  Bekor qilish
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-MODAL 3: JetBot - Obuna matching jetbot_frame_4.jpg & step_180.jpg    */}
      {/* ========================================================================= */}
      {isObunaModalOpen && (
        <div className="fixed inset-0 z-60 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-[#f0f0f0] border-2 border-[#005a9e] rounded shadow-2xl w-full max-w-md text-slate-800 flex flex-col font-sans overflow-hidden">
            {/* Title */}
            <div className="bg-[#005a9e] text-white px-3 py-1 flex items-center justify-between font-medium text-xs">
              <div className="flex items-center gap-1.5">
                <span>📋</span>
                <span>JetBot - Obuna</span>
              </div>
              <button
                type="button"
                onClick={() => setIsObunaModalOpen(false)}
                className="w-5 h-4 bg-rose-600 hover:bg-rose-700 text-[10px] flex items-center justify-center font-bold rounded-sm text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-4 flex flex-col gap-3 text-xs bg-[#f9f9f9]">
              {/* Header subtitle matching jetbot_frame_4.jpg */}
              <div className="border-b pb-1">
                <div className="font-bold text-sm text-slate-800">JetCafe</div>
                <div className="text-[11px] text-slate-500">ning obunalar ro'yxati</div>
              </div>

              {/* Checkboxes matching jetbot_frame_4.jpg exactly */}
              <div className="border border-slate-300 bg-white rounded p-3 flex flex-col gap-2 shadow-inner">
                <label className="flex items-center gap-2 cursor-pointer hover:text-blue-700">
                  <input
                    type="checkbox"
                    checked={obunaPrefs.notify_bot_status}
                    onChange={(e) => setObunaPrefs({ ...obunaPrefs, notify_bot_status: e.target.checked })}
                    className="w-4 h-4 text-[#005a9e] rounded border-slate-300 focus:ring-0"
                  />
                  <span>Bot o'chdi, yondi</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer hover:text-blue-700">
                  <input
                    type="checkbox"
                    checked={obunaPrefs.notify_db_backup}
                    onChange={(e) => setObunaPrefs({ ...obunaPrefs, notify_db_backup: e.target.checked })}
                    className="w-4 h-4 text-[#005a9e] rounded border-slate-300 focus:ring-0"
                  />
                  <span>Резервная копия базы данных</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer hover:text-blue-700">
                  <input
                    type="checkbox"
                    checked={obunaPrefs.notify_cashier_report}
                    onChange={(e) => setObunaPrefs({ ...obunaPrefs, notify_cashier_report: e.target.checked })}
                    className="w-4 h-4 text-[#005a9e] rounded border-slate-300 focus:ring-0"
                  />
                  <span>Кассовый отчёт</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer hover:text-blue-700">
                  <input
                    type="checkbox"
                    checked={obunaPrefs.notify_status}
                    onChange={(e) => setObunaPrefs({ ...obunaPrefs, notify_status: e.target.checked })}
                    className="w-4 h-4 text-[#005a9e] rounded border-slate-300 focus:ring-0"
                  />
                  <span>Статус</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer hover:text-blue-700">
                  <input
                    type="checkbox"
                    checked={obunaPrefs.notify_orders}
                    onChange={(e) => setObunaPrefs({ ...obunaPrefs, notify_orders: e.target.checked })}
                    className="w-4 h-4 text-[#005a9e] rounded border-slate-300 focus:ring-0"
                  />
                  <span>Заказ</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer hover:text-blue-700">
                  <input
                    type="checkbox"
                    checked={obunaPrefs.notify_cancellations}
                    onChange={(e) => setObunaPrefs({ ...obunaPrefs, notify_cancellations: e.target.checked })}
                    className="w-4 h-4 text-[#005a9e] rounded border-slate-300 focus:ring-0"
                  />
                  <span>Отмена блюд / Возврат</span>
                </label>
              </div>

              {/* Action buttons matching jetbot_frame_4.jpg: Barchasini belgila & Saqla */}
              <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setObunaPrefs({
                      notify_bot_status: true,
                      notify_db_backup: true,
                      notify_cashier_report: true,
                      notify_status: true,
                      notify_orders: true,
                      notify_cancellations: true,
                    });
                  }}
                  className="px-3 py-1.5 bg-[#e1e1e1] hover:bg-[#d5d5d5] border border-[#adadad] rounded font-medium text-slate-700 transition active:scale-95 shadow-sm"
                >
                  Barchasini belgila
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsObunaModalOpen(false)}
                    className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 rounded text-slate-700 font-medium"
                  >
                    Bekor qilish
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveObuna}
                    className="px-5 py-1.5 bg-[#005a9e] hover:bg-[#004e8a] text-white rounded font-semibold transition active:scale-95 shadow-sm"
                  >
                    Saqla
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
