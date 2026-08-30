import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertTriangle, Info, X, ShieldAlert } from 'lucide-react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback(({ type = 'info', title, message, duration = 4000 }) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, type, title, message }]);

    if (duration > 0) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const success = useCallback((title, message) => addToast({ type: 'success', title, message }), [addToast]);
  const error = useCallback((title, message) => addToast({ type: 'error', title, message }), [addToast]);
  const info = useCallback((title, message) => addToast({ type: 'info', title, message }), [addToast]);
  const warning = useCallback((title, message) => addToast({ type: 'warning', title, message }), [addToast]);

  return (
    <ToastContext.Provider value={{ addToast, removeToast, success, error, info, warning }}>
      {children}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm pointer-events-none">
        <AnimatePresence>
          {toasts.map(t => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className={`p-3.5 rounded-xl border shadow-lg pointer-events-auto flex items-start gap-3 bg-white ${
                t.type === 'success' ? 'border-emerald-200 shadow-emerald-500/5' :
                t.type === 'error' ? 'border-rose-200 shadow-rose-500/5' :
                t.type === 'warning' ? 'border-amber-200 shadow-amber-500/5' :
                'border-indigo-200 shadow-indigo-500/5'
              }`}
            >
              <div className="shrink-0 mt-0.5">
                {t.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                {t.type === 'error' && <ShieldAlert className="w-4 h-4 text-rose-600" />}
                {t.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-600" />}
                {t.type === 'info' && <Info className="w-4 h-4 text-indigo-600" />}
              </div>

              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-slate-900 leading-snug">{t.title}</div>
                {t.message && (
                  <div className="text-[11px] text-slate-600 mt-0.5 leading-relaxed break-words">{t.message}</div>
                )}
              </div>

              <button
                onClick={() => removeToast(t.id)}
                className="shrink-0 text-slate-400 hover:text-slate-600 p-0.5 rounded"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    return {
      success: (t, m) => console.log('Toast:', t, m),
      error: (t, m) => console.error('Toast Error:', t, m),
      info: (t, m) => console.log('Toast Info:', t, m),
      warning: (t, m) => console.warn('Toast Warning:', t, m),
    };
  }
  return context;
}
