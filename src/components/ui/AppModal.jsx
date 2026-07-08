import { useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { X, Loader2 } from "lucide-react";

/**
 * AppModal — نافذة موحّدة (هوية Drivo + UX محسّن)
 *
 * Props:
 *   isOpen          {boolean}
 *   onClose         {Function}
 *   title           {string}
 *   subtitle        {string?}
 *   isSubmitting    {boolean?}  — يقفل الخلفية والحقول أثناء الحفظ
 *   size            {'sm'|'md'|'lg'|'xl'?}
 *   closeOnBackdrop {boolean?}
 *   children        {ReactNode}
 *   footer          {ReactNode?}
 */
const SIZE_CLASS = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-2xl",
};

export default function AppModal({
  isOpen,
  onClose,
  title,
  subtitle,
  isSubmitting = false,
  size = "md",
  closeOnBackdrop,
  children,
  footer,
}) {
  const panelRef = useRef(null);
  const onCloseRef = useRef(onClose);
  const allowBackdropClose = closeOnBackdrop ?? !isSubmitting;

  onCloseRef.current = onClose;

  const handleClose = useCallback(() => {
    onCloseRef.current?.();
  }, []);

  useEffect(() => {
    if (!isOpen) return undefined;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (e) => {
      if (e.key === "Escape") handleClose();
      if (e.key === "Tab" && panelRef.current) {
        const focusable = panelRef.current.querySelectorAll(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);

    const timer = setTimeout(() => {
      const first = panelRef.current?.querySelector(
        "input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])",
      );
      first?.focus();
    }, 80);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKeyDown);
      clearTimeout(timer);
    };
  }, [isOpen, handleClose]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] font-sans" dir="rtl">
      {/* طبقة سوداء ناعمة — focus على النافذة بدون إرهاق بصري */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-[2px] animate-modal-backdrop"
        aria-hidden="true"
        onClick={() => allowBackdropClose && handleClose()}
      />

      <div
        className="absolute inset-0 flex items-center justify-center p-4 sm:p-6 pointer-events-none"
        role="dialog"
        aria-modal="true"
        aria-labelledby="app-modal-title"
        aria-busy={isSubmitting}
      >
        <div
          ref={panelRef}
          className={`pointer-events-auto w-full ${SIZE_CLASS[size] ?? SIZE_CLASS.md} animate-modal-in`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-white rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.18),0_0_0_1px_rgba(0,0,0,0.04)] flex flex-col max-h-[min(90vh,720px)] overflow-hidden">

            {/* Header */}
            <div className="relative shrink-0">
              <div className="flex items-center justify-between px-5 py-4">
                <button
                  type="button"
                  onClick={handleClose}
                  className="group w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-[#4a4746] hover:bg-gray-100 transition-all"
                  aria-label="إغلاق"
                >
                  <X className="w-4.5 h-4.5 group-hover:scale-110 transition-transform" />
                </button>
                <div className="text-right flex-1 px-3 min-w-0">
                  <h2 id="app-modal-title" className="text-base font-bold text-[#4a4746] truncate">
                    {title}
                  </h2>
                  {subtitle && (
                    <p className="text-xs text-gray-400 mt-0.5 truncate">{subtitle}</p>
                  )}
                </div>
                <div className="w-8" />
              </div>
              <div className="h-0.5 bg-gradient-to-l from-[#c9a84c]/80 via-[#c9a84c] to-[#c9a84c]/80" />
            </div>

            {/* Body */}
            <div className="relative flex-1 overflow-y-auto overscroll-contain">
              {isSubmitting && (
                <div
                  className="absolute inset-0 z-10 flex items-center justify-center bg-white/80 backdrop-blur-[1px]"
                  role="status"
                  aria-live="polite"
                >
                  <div className="flex flex-col items-center gap-3 bg-white rounded-2xl px-8 py-6 shadow-lg border border-gray-100">
                    <Loader2 className="w-8 h-8 text-[#c9a84c] animate-spin" />
                    <span className="text-sm font-medium text-gray-600">جاري الحفظ...</span>
                    <span className="text-[10px] text-gray-400">يرجى الانتظار</span>
                  </div>
                </div>
              )}
              <div className={`p-5 sm:p-6 ${isSubmitting ? "pointer-events-none select-none" : ""}`}>
                {children}
              </div>
            </div>

            {footer && (
              <div className="border-t border-gray-100 px-5 py-4 bg-[#faf9f6] shrink-0">{footer}</div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function ModalField({ label, required, hint, children, className = "" }) {
  return (
    <div className={`flex flex-col gap-1.5 text-right ${className}`}>
      {label && (
        <label className="text-xs font-semibold text-gray-600">
          {label}
          {required && <span className="text-red-400 mr-0.5">*</span>}
        </label>
      )}
      {children}
      {hint && <p className="text-[10px] text-gray-400">{hint}</p>}
    </div>
  );
}

export const modalInputClass =
  "w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-gray-800 text-right placeholder-gray-300 bg-white transition-colors focus:border-[#c9a84c] focus:outline-none focus:ring-2 focus:ring-[#c9a84c]/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50";

export function ModalActions({
  primaryLabel,
  onPrimary,
  primaryType = "button",
  secondaryLabel = "إلغاء",
  onSecondary,
  isSubmitting = false,
  primaryDisabled = false,
}) {
  return (
    <div className="flex flex-col-reverse sm:flex-row gap-2.5 pt-2">
      {secondaryLabel && (
        <button
          type="button"
          onClick={onSecondary}
          className="flex-1 rounded-xl border border-gray-200 bg-white py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 active:scale-[0.98] transition-all"
        >
          {secondaryLabel}
        </button>
      )}
      <button
        type={primaryType}
        onClick={onPrimary}
        disabled={isSubmitting || primaryDisabled}
        className="flex-1 rounded-xl bg-[#4a4746] py-2.5 text-sm font-semibold text-white hover:bg-[#383534] active:scale-[0.98] transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
      >
        {isSubmitting ? "جاري الحفظ..." : primaryLabel}
      </button>
    </div>
  );
}

/** نافذة تأكيد — حذف / إجراءات حساسة */
export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = "تأكيد",
  message,
  confirmLabel = "تأكيد",
  cancelLabel = "إلغاء",
  isSubmitting = false,
  variant = "danger",
}) {
  const confirmClass =
    variant === "danger"
      ? "bg-red-500 hover:bg-red-600"
      : variant === "primary"
        ? "bg-[#4a4746] hover:bg-[#383534]"
        : "bg-blue-600 hover:bg-blue-700";

  return (
    <AppModal isOpen={isOpen} onClose={onClose} title={title} isSubmitting={isSubmitting} size="sm">
      <div className="text-center space-y-5 py-1">
        {variant === "danger" && (
          <div className="w-14 h-14 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </div>
        )}
        {message && <p className="text-sm text-gray-600 leading-relaxed">{message}</p>}
        <div className="flex flex-col-reverse sm:flex-row gap-2.5">
          <button type="button" onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
            {cancelLabel}
          </button>
          <button type="button" onClick={onConfirm} disabled={isSubmitting}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-50 ${confirmClass}`}>
            {isSubmitting ? "جاري التنفيذ..." : confirmLabel}
          </button>
        </div>
      </div>
    </AppModal>
  );
}
