import React, { useState, useContext, useEffect } from 'react';
import { Mail, Lock, KeyRound } from 'lucide-react';
import { AppContext } from '../context/AppContext';

export default function Login() {
  const { login, t, language } = useContext(AppContext);
  const [isPinMode, setIsPinMode] = useState(true); // Default to PIN mode based on user preference
  const [email, setEmail] = useState('manager@sotuvpro.uz');
  const [password, setPassword] = useState('12345678');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  // Brute-force security states
  const [failedAttempts, setFailedAttempts] = useState(() => {
    return Number(localStorage.getItem('login_failed_attempts') || 0);
  });
  const [lockUntil, setLockUntil] = useState(() => {
    return Number(localStorage.getItem('login_lock_until') || 0);
  });
  const [timeLeft, setTimeLeft] = useState(0);

  // Countdown timer for security lock
  useEffect(() => {
    if (lockUntil > Date.now()) {
      const interval = setInterval(() => {
        const remaining = Math.max(0, Math.round((lockUntil - Date.now()) / 1000));
        setTimeLeft(remaining);
        if (remaining <= 0) {
          setLockUntil(0);
          setFailedAttempts(0);
          localStorage.removeItem('login_lock_until');
          localStorage.setItem('login_failed_attempts', '0');
          clearInterval(interval);
        }
      }, 1000);
      setTimeLeft(Math.max(0, Math.round((lockUntil - Date.now()) / 1000)));
      return () => clearInterval(interval);
    }
  }, [lockUntil]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // If lock is still active, reject immediately
    if (Date.now() < lockUntil) {
      return;
    }

    const success = isPinMode 
      ? await login(email, pin, true) // Pass both email and pin
      : await login(email, password, false);

    if (!success) {
      const newAttempts = failedAttempts + 1;
      setFailedAttempts(newAttempts);
      localStorage.setItem('login_failed_attempts', newAttempts.toString());
      
      if (newAttempts >= 5) {
        const lockTime = Date.now() + 5 * 60 * 1000; // 5 minutes block
        setLockUntil(lockTime);
        localStorage.setItem('login_lock_until', lockTime.toString());
        setTimeLeft(300);
        setError(language === 'uz' 
          ? "Ketma-ket 5 marta noto'g'ri urinish tufayli hisob 5 daqiqaga bloklandi!" 
          : "Из-за 5 неверных попыток аккаунт заблокирован на 5 минут!"
        );
      } else {
        const remaining = 5 - newAttempts;
        setError(isPinMode 
          ? `${t('errorPin')} (${language === 'uz' ? `Qolgan urinishlar: ${remaining}` : `Оставшиеся попытки: ${remaining}`})` 
          : `${t('errorEmail')} (${language === 'uz' ? `Qolgan urinishlar: ${remaining}` : `Оставшиеся попытки: ${remaining}`})`
        );
      }
    } else {
      // Clear brute-force logs on success
      setFailedAttempts(0);
      localStorage.setItem('login_failed_attempts', '0');
      localStorage.removeItem('login_lock_until');
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Render Lockout Screen if locked
  if (timeLeft > 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-xl shadow-slate-100/50 w-full max-w-md text-center space-y-6">
          <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto shadow-md">
            <Lock className="w-8 h-8 animate-bounce" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-slate-800">
              {language === 'uz' ? "Tizim vaqtincha bloklandi" : "Система временно заблокирована"}
            </h2>
            <p className="text-sm text-slate-400 font-semibold px-4">
              {language === 'uz' 
                ? "Xavfsizlik maqsadida ketma-ket 5 marta noto'g'ri urinishdan so'ng kirish cheklandi." 
                : "В целях безопасности вход заблокирован после 5 неверных попыток."}
            </p>
          </div>
          <div className="bg-rose-50/50 border border-rose-100/80 rounded-2xl p-4 font-mono font-black text-2xl text-rose-600 tracking-wider">
            {formatTime(timeLeft)}
          </div>
          <p className="text-xs text-slate-400 font-medium">
            {language === 'uz' ? "Kutib turing yoki yordam uchun administratorga murojaat qiling." : "Пожалуйста, подождите или обратитесь к администратору."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-xl shadow-slate-100/50 w-full max-w-md">
        {/* Logo and Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-brand-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-brand-100 mb-4">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-800">{t('loginTitle')}</h2>
          <p className="text-sm text-slate-400 mt-1">{t('loginSubtitle')}</p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-red-50 text-red-600 border border-red-100 rounded-xl p-3 text-sm font-medium mb-6 text-center animate-shake">
            {error}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          {isPinMode ? (
            /* PIN-code Input with Email (Two step verification) */
            <>
              {/* Email Input */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-600">{t('emailLabel')}</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-brand-500 focus:bg-white transition-all text-sm font-semibold"
                    placeholder="manager@sotuvpro.uz"
                  />
                </div>
              </div>

              {/* PIN Input */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-600">{t('pinLabel')}</label>
                <div className="relative">
                  <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="password"
                    maxLength={4}
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                    required
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-brand-500 focus:bg-white tracking-widest text-center text-lg font-bold transition-all"
                    placeholder="••••"
                  />
                </div>
              </div>
            </>
          ) : (
            /* Email & Password Input */
            <>
              {/* Email Input */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-600">{t('emailLabel')}</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-brand-500 focus:bg-white transition-all text-sm font-semibold"
                    placeholder="manager@sotuvpro.uz"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-600">{t('passwordLabel')}</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-brand-500 focus:bg-white transition-all text-sm font-medium"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            </>
          )}

          {/* Action Buttons */}
          <div className="pt-2 space-y-3">
            <button
              type="submit"
              className="w-full py-3.5 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-2xl transition-all shadow-md shadow-brand-100 hover:shadow-lg text-sm cursor-pointer"
            >
              {t('loginBtn')}
            </button>

            <button
              type="button"
              onClick={() => {
                setIsPinMode(!isPinMode);
                setError('');
              }}
              className="w-full py-3 bg-white hover:bg-slate-50 text-brand-600 border border-slate-200 hover:border-slate-300 font-semibold rounded-2xl transition-all text-sm font-semibold cursor-pointer"
            >
              {isPinMode ? t('switchEmail') : t('switchPin')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
