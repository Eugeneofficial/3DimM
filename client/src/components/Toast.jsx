import React, { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

let toastId = 0;

export function useToast() {
  return useContext(ToastContext);
}

const icons = { success: '\u2705', error: '\u274C', info: '\u2139\uFE0F' };

const toastStyles = {
  success: { borderLeft: '3px solid #22c55e', background: 'rgba(34, 197, 94, 0.08)' },
  error: { borderLeft: '3px solid #ef4444', background: 'rgba(239, 68, 68, 0.08)' },
  info: { borderLeft: '3px solid #6366f1', background: 'rgba(99, 102, 241, 0.08)' },
};

const iconColors = { success: '#22c55e', error: '#ef4444', info: '#6366f1' };

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'info') => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => { setToasts((prev) => prev.filter((t) => t.id !== id)); }, 4000);
  }, []);

  const removeToast = useCallback((id) => { setToasts((prev) => prev.filter((t) => t.id !== id)); }, []);

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '400px' }}>
        {toasts.map((t) => (
          <div key={t.id} onClick={() => removeToast(t.id)} style={{
            padding: '14px 18px', backgroundColor: '#141824', color: '#f1f5f9', borderRadius: '12px', fontSize: '13px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)', cursor: 'pointer', animation: 'dimm-toast-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
            wordBreak: 'break-word', display: 'flex', alignItems: 'center', gap: '12px', border: '1px solid rgba(55,65,81,0.3)', ...toastStyles[t.type],
          }}>
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px', borderRadius: '50%', backgroundColor: `${iconColors[t.type]}20`, color: iconColors[t.type], fontSize: '13px', flexShrink: 0 }}>
              {icons[t.type]}
            </span>
            <span style={{ lineHeight: 1.4 }}>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
