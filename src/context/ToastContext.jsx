import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [modal, setModal] = useState(null); // { title, message, onConfirm, onCancel, confirmText, cancelText, type }

  const showToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const showConfirm = useCallback(({ title, message, onConfirm, onCancel, confirmText = 'Confirmer', cancelText = 'Annuler', type = 'warning' }) => {
    return new Promise((resolve) => {
      setModal({
        title,
        message,
        confirmText,
        cancelText,
        type,
        onConfirm: () => {
          setModal(null);
          if (onConfirm) onConfirm();
          resolve(true);
        },
        onCancel: () => {
          setModal(null);
          if (onCancel) onCancel();
          resolve(false);
        }
      });
    });
  }, []);

  const value = {
    toast: {
      success: (msg) => showToast(msg, 'success'),
      error: (msg) => showToast(msg, 'error'),
      info: (msg) => showToast(msg, 'info'),
      warning: (msg) => showToast(msg, 'warning'),
    },
    confirm: showConfirm
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      
      {/* Toast Notification Container */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
        {toasts.map((t) => {
          let bgColor = 'bg-slate-900 text-white';
          let Icon = Info;
          if (t.type === 'success') {
            bgColor = 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20';
            Icon = CheckCircle2;
          } else if (t.type === 'error') {
            bgColor = 'bg-rose-600 text-white shadow-lg shadow-rose-600/20';
            Icon = AlertTriangle;
          } else if (t.type === 'warning') {
            bgColor = 'bg-amber-500 text-white shadow-lg shadow-amber-500/20';
            Icon = AlertTriangle;
          }

          return (
            <div
              key={t.id}
              className={`${bgColor} px-4 py-3.5 rounded-2xl flex items-start gap-3 pointer-events-auto shadow-xl animate-in fade-in slide-in-from-bottom-5 duration-200`}
            >
              <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div className="flex-1 text-xs font-bold leading-normal">{t.message}</div>
              <button
                onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
                className="text-white/70 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Confirmation Dialog Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            onClick={modal.onCancel} 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in"
          />
          {/* Box */}
          <div className="relative bg-white rounded-3xl p-6 w-full max-w-md border border-slate-100 shadow-2xl z-10 animate-in zoom-in-95 duration-200 flex flex-col gap-5">
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                modal.type === 'danger' || modal.type === 'warning' ? 'bg-rose-50 text-rose-500' : 'bg-isw-blue-50 text-isw-blue'
              }`}>
                {modal.type === 'danger' || modal.type === 'warning' ? (
                  <AlertTriangle className="w-6 h-6" />
                ) : (
                  <Info className="w-6 h-6" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-extrabold text-slate-800 leading-snug">{modal.title}</h3>
                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">{modal.message}</p>
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-2 border-t border-slate-50">
              <button
                onClick={modal.onCancel}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-500 font-bold text-xs hover:bg-slate-50 transition-colors"
              >
                {modal.cancelText}
              </button>
              <button
                onClick={modal.onConfirm}
                className={`px-4 py-2.5 rounded-xl text-white font-bold text-xs shadow-md transition-colors ${
                  modal.type === 'danger' 
                    ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/10' 
                    : 'bg-isw-blue hover:bg-isw-blue-light shadow-isw-blue/10'
                }`}
              >
                {modal.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
}
