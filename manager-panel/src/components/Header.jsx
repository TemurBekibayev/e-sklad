import React, { useState, useContext } from 'react';
import { Bell, Globe, ChevronDown } from 'lucide-react';
import { AppContext } from '../context/AppContext';

export default function Header({ title }) {
  const { notifications, language, setLanguage, t } = useContext(AppContext);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);

  const langNames = {
    uz: "O'zbekcha (UZ)",
    ru: "Русский (RU)"
  };

  return (
    <header className="h-20 bg-white border-b border-slate-100 flex items-center justify-between px-8 sticky top-0 z-30">
      {/* Title */}
      <h1 className="text-xl font-bold text-slate-800">{title}</h1>

      {/* Actions */}
      <div className="flex items-center gap-6">
        {/* Language Selector */}
        <div className="relative">
          <button 
            onClick={() => setShowLangMenu(!showLangMenu)}
            className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-xl px-3 py-1.5 text-sm text-slate-600 font-medium hover:bg-slate-100 transition-all outline-none"
          >
            <Globe className="w-4 h-4 text-slate-400" />
            <span>{langNames[language]}</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>
          
          {showLangMenu && (
            <div className="absolute right-0 mt-2 w-40 bg-white border border-slate-100 rounded-xl shadow-xl py-1.5 z-50 animate-in fade-in duration-200">
              <button
                type="button"
                onClick={() => {
                  setLanguage('uz');
                  setShowLangMenu(false);
                }}
                className={`w-full text-left px-4 py-2 text-xs font-semibold hover:bg-slate-50 transition-all ${language === 'uz' ? 'text-brand-600 bg-brand-50/50' : 'text-slate-600'}`}
              >
                O'zbekcha (UZ)
              </button>
              <button
                type="button"
                onClick={() => {
                  setLanguage('ru');
                  setShowLangMenu(false);
                }}
                className={`w-full text-left px-4 py-2 text-xs font-semibold hover:bg-slate-50 transition-all ${language === 'ru' ? 'text-brand-600 bg-brand-50/50' : 'text-slate-600'}`}
              >
                Русский (RU)
              </button>
            </div>
          )}
        </div>

        {/* Notifications */}
        <div className="relative">
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className="w-10 h-10 rounded-xl border border-slate-100 flex items-center justify-center hover:bg-slate-50 relative transition-all"
          >
            <Bell className="w-5 h-5 text-slate-500" />
            {notifications.length > 0 && (
              <span className="absolute top-2 right-2.5 w-2.5 h-2.5 bg-red-500 rounded-full border border-white"></span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-100 rounded-2xl shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="px-4 py-2 border-b border-slate-50 flex items-center justify-between">
                <span className="font-semibold text-sm text-slate-800">{t('notificationsTitle')}</span>
                <span className="text-xs text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full font-medium">{notifications.length} {t('newNotifications')}</span>
              </div>
              <div className="max-h-60 overflow-y-auto">
                {notifications.map((notif) => (
                  <div key={notif.id} className="px-4 py-3 hover:bg-slate-50 border-b border-slate-50 last:border-0 flex flex-col gap-0.5 transition-all">
                    <p className="text-sm text-slate-600 font-medium">{notif.text}</p>
                    <span className="text-[10px] text-slate-400 font-normal">{notif.date}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
