import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { AlertTriangle, Trash2, CheckCircle2, Info, HelpCircle, X } from 'lucide-react';

const DialogContext = createContext(null);

export function DialogProvider({ children }) {
  const [dialog, setDialog] = useState(null);
  const resolverRef = useRef(null);

  const confirm = useCallback(({
    title = "Tasdiqlash",
    message = "Ushbu amalni bajarishni tasdiqlaysizmi?",
    confirmText = "Ha, tasdiqlayman",
    cancelText = "Bekor qilish",
    type = "danger", // 'danger' | 'warning' | 'info'
  }) => {
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setDialog({
        mode: 'confirm',
        title,
        message,
        confirmText,
        cancelText,
        type,
      });
    });
  }, []);

  const alert = useCallback(({
    title = "Xabarnoma",
    message = "",
    confirmText = "Tushunarli",
    type = "info", // 'info' | 'success' | 'warning' | 'error'
  }) => {
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setDialog({
        mode: 'alert',
        title,
        message,
        confirmText,
        type,
      });
    });
  }, []);

  const handleConfirm = () => {
    if (resolverRef.current) {
      resolverRef.current(true);
      resolverRef.current = null;
    }
    setDialog(null);
  };

  const handleCancel = () => {
    if (resolverRef.current) {
      resolverRef.current(false);
      resolverRef.current = null;
    }
    setDialog(null);
  };

  return (
    <DialogContext.Provider value={{ confirm, alert }}>
      {children}

      {dialog && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md select-none transition-all animate-fadeIn">
          {/* Centered Glassmorphic Dialog Card */}
          <div className="relative w-full max-w-md bg-white/95 backdrop-blur-xl border border-slate-200/80 rounded-3xl shadow-2xl shadow-black/40 p-6 flex flex-col items-center text-center gap-4 animate-scaleUp">
            
            {/* Close X button */}
            <button
              type="button"
              onClick={handleCancel}
              className="absolute right-4 top-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Glowing Icon Circle */}
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg ${
              dialog.type === 'danger' || dialog.type === 'error'
                ? 'bg-rose-100 text-rose-600 shadow-rose-500/20'
                : dialog.type === 'warning'
                ? 'bg-amber-100 text-amber-600 shadow-amber-500/20'
                : dialog.type === 'success'
                ? 'bg-emerald-100 text-emerald-600 shadow-emerald-500/20'
                : 'bg-blue-100 text-blue-600 shadow-blue-500/20'
            }`}>
              {dialog.type === 'danger' && <Trash2 className="w-8 h-8" />}
              {dialog.type === 'error' && <AlertTriangle className="w-8 h-8" />}
              {dialog.type === 'warning' && <AlertTriangle className="w-8 h-8" />}
              {dialog.type === 'success' && <CheckCircle2 className="w-8 h-8" />}
              {dialog.type === 'info' && <Info className="w-8 h-8" />}
            </div>

            {/* Title & Message */}
            <div className="space-y-1.5 w-full">
              <h3 className="text-lg font-black text-slate-900 tracking-tight">
                {dialog.title}
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 font-medium whitespace-pre-line leading-relaxed px-2">
                {dialog.message}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-center gap-3 w-full pt-2">
              {dialog.mode === 'confirm' && (
                <button
                  type="button"
                  onClick={handleCancel}
                  className="flex-1 py-2.5 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-bold transition active:scale-95 cursor-pointer"
                >
                  {dialog.cancelText || 'Bekor qilish'}
                </button>
              )}

              <button
                type="button"
                autoFocus
                onClick={handleConfirm}
                className={`py-2.5 px-6 rounded-2xl text-white text-xs sm:text-sm font-black transition shadow-lg active:scale-95 cursor-pointer ${
                  dialog.mode === 'alert' ? 'w-full' : 'flex-1'
                } ${
                  dialog.type === 'danger' || dialog.type === 'error'
                    ? 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 shadow-rose-500/30'
                    : dialog.type === 'warning'
                    ? 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 shadow-amber-500/30'
                    : dialog.type === 'success'
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-emerald-500/30'
                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-blue-500/30'
                }`}
              >
                {dialog.confirmText || (dialog.mode === 'confirm' ? "Ha, tasdiqlayman" : "Tushunarli")}
              </button>
            </div>

          </div>
        </div>
      )}
    </DialogContext.Provider>
  );
}

export function useDialog() {
  const ctx = useContext(DialogContext);
  if (!ctx) {
    return {
      confirm: async ({ message }) => window.confirm(message),
      alert: async ({ message }) => window.alert(message),
    };
  }
  return ctx;
}
