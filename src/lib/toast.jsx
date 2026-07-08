import { useState, useCallback, useEffect, createContext, useContext, useMemo } from "react";

// ── Types: success | error | warning | info ────────────────────
const ICONS = {
  success: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/>
    </svg>
  ),
  error: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12"/>
    </svg>
  ),
  warning: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
    </svg>
  ),
  info: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
    </svg>
  ),
};

const STYLES = {
  success: "bg-emerald-500 text-white",
  error:   "bg-red-500 text-white",
  warning: "bg-amber-500 text-white",
  info:    "bg-[#9C6402] text-white",
};

// ── Context ────────────────────────────────────────────────────
const ToastContext = createContext(null);

let _addToast = null;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const add = useCallback((message, type = "info", duration = 3500) => {
    const id = Date.now() + Math.random();
    setToasts(p => [...p, { id, message, type, removing: false }]);
    setTimeout(() => {
      setToasts(p => p.map(t => t.id === id ? { ...t, removing: true } : t));
      setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 300);
    }, duration);
  }, []);

  // expose globally for use outside React tree
  useEffect(() => { _addToast = add; return () => { _addToast = null; }; }, [add]);

  return (
    <ToastContext.Provider value={add}>
      {children}
      <div className="fixed bottom-5 left-5 z-[200] flex flex-col gap-2.5 pointer-events-none" dir="rtl">
        {toasts.map(t => (
          <div key={t.id}
            className={"flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl min-w-[260px] max-w-xs pointer-events-auto " + STYLES[t.type]}
            style={{ animation: t.removing ? "toastOut 0.3s ease forwards" : "toastIn 0.3s ease forwards" }}>
            <span className="shrink-0 opacity-90">{ICONS[t.type]}</span>
            <p className="text-sm font-medium flex-1">{t.message}</p>
          </div>
        ))}
      </div>
      <style>{`
        @keyframes toastIn  { from{opacity:0;transform:translateX(-12px)} to{opacity:1;transform:translateX(0)} }
        @keyframes toastOut { from{opacity:1;transform:translateX(0)} to{opacity:0;transform:translateX(-12px)} }
      `}</style>
    </ToastContext.Provider>
  );
}

// ── Hook ───────────────────────────────────────────────────────
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return useMemo(() => ({
    success: (msg, dur) => ctx(msg, "success", dur),
    error:   (msg, dur) => ctx(msg, "error",   dur),
    warning: (msg, dur) => ctx(msg, "warning", dur),
    info:    (msg, dur) => ctx(msg, "info",    dur),
  }), [ctx]);
}

// ── Global helper (usable outside components) ──────────────────
export const toast = {
  success: (msg, dur) => _addToast?.(msg, "success", dur),
  error:   (msg, dur) => _addToast?.(msg, "error",   dur),
  warning: (msg, dur) => _addToast?.(msg, "warning", dur),
  info:    (msg, dur) => _addToast?.(msg, "info",    dur),
};