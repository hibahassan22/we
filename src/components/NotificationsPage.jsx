import { useState, useEffect, useCallback } from "react";
import { useToast } from "../lib/toast";
import { useGlobalSearch } from "../hooks/useGlobalSearch";
import { usePermissions } from "../hooks/usePermissions.js";
import { PERMISSIONS } from "../lib/permissions.js";
import AppModal, { ModalField, ModalActions, modalInputClass, ConfirmModal } from "./ui/AppModal";
import {
  sendDriverNotification,
  fetchAllDriverNotifications,
  deleteDriverNotification,
  resendDriverNotification,
  resolveEffectiveStatus,
  syncScheduledStatuses,
  fmtDate,
} from "../services/driverNotificationsService";

// ── Constants ─────────────────────────────────────────────────
const PAGE_SIZE = 10;

const TYPE_OPTIONS = [
  "تهنئة", "تنبيه", "إنذار", "إعلان", "تذكير", "عروض", "رسالة عادية",
];

const STATUS_CONFIG = {
  "مرسل":   { cls: "bg-green-100 text-green-700 border-green-200",  dot: "bg-green-500"  },
  "مجدول":  { cls: "bg-amber-100 text-amber-700 border-amber-200",  dot: "bg-amber-500"  },
};
const statusCfg = (s) => STATUS_CONFIG[s] ?? { cls: "bg-gray-100 text-gray-500 border-gray-200", dot: "bg-gray-400" };

// ── Small reusable pieces ─────────────────────────────────────
const Spinner = () => (
  <div className="flex items-center justify-center py-16">
    <div className="w-9 h-9 border-4 border-[#c9a84c] border-t-transparent rounded-full animate-spin" />
  </div>
);

const ChevronIcon = ({ dir = "down" }) => (
  <svg className={"w-4 h-4 " + (dir === "left" ? "rotate-90" : dir === "right" ? "-rotate-90" : "")}
    fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

// ── Send Modal ────────────────────────────────────────────────
function SendModal({ isOpen, onClose, onSent }) {
  const toast = useToast();
  const [form, setForm] = useState({
    title: "", content: "", type: TYPE_OPTIONS[0], sendMode: "now", scheduledAt: "",
  });
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState("");

  const reset = () => { setForm({ title: "", content: "", type: TYPE_OPTIONS[0], sendMode: "now", scheduledAt: "" }); setErr(""); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim()) { setErr("يرجى ملء جميع الحقول المطلوبة"); return; }
    if (form.sendMode === "scheduled" && !form.scheduledAt) { setErr("يرجى تحديد وقت الجدولة"); return; }
    setSending(true); setErr("");
    try {
      const payload = {
        title:   form.title.trim(),
        content: form.content.trim(),
        type:    form.type,
        status:  form.sendMode === "now" ? "مرسل" : "مجدول",
        ...(form.sendMode === "scheduled" && form.scheduledAt
          ? { scheduled_at: form.scheduledAt.replace("T", " ") + ":00" }
          : {}),
      };
      await sendDriverNotification(payload);
      toast.success("تم إرسال الإشعار بنجاح ✓");
      reset(); onClose(); onSent();
    } catch (e) { setErr(e.message); }
    finally { setSending(false); }
  };

  if (!isOpen) return null;
  return (
    <AppModal isOpen={isOpen} onClose={() => { reset(); onClose(); }} title="إرسال إشعار جديد" isSubmitting={sending} size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {err && <div className="bg-red-50 border border-red-200 text-red-600 text-xs rounded-xl px-4 py-2.5 text-right">{err}</div>}
        <ModalField label="عنوان الإشعار" required>
          <input type="text" required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
            placeholder="مثال: عيد مبارك" className={modalInputClass} disabled={sending} />
        </ModalField>
        <ModalField label="محتوى الإشعار" required>
          <textarea rows={4} required value={form.content} onChange={e => setForm({ ...form, content: e.target.value })}
            placeholder="اكتب محتوى الإشعار..." className={`${modalInputClass} resize-none`} disabled={sending} />
        </ModalField>
        <ModalField label="نوع الإشعار">
          <div className="relative">
            <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}
              className={`${modalInputClass} appearance-none`} disabled={sending}>
              {TYPE_OPTIONS.map(t => <option key={t}>{t}</option>)}
            </select>
            <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400"><ChevronIcon /></div>
          </div>
        </ModalField>
        <div className="space-y-2">
          <label className="text-xs font-medium text-gray-500 block text-right">وقت الإرسال</label>
          <div className="flex items-center justify-end gap-5">
            {[{ val: "now", lbl: "إرسال الآن" }, { val: "scheduled", lbl: "جدولة" }].map(o => (
              <label key={o.val} className="flex items-center gap-2 cursor-pointer text-sm text-gray-600">
                {o.lbl}
                <input type="radio" name="sendMode" value={o.val} checked={form.sendMode === o.val}
                  onChange={() => setForm({ ...form, sendMode: o.val })} className="accent-[#c9a84c]" disabled={sending} />
              </label>
            ))}
          </div>
          {form.sendMode === "scheduled" && (
            <input type="datetime-local" value={form.scheduledAt}
              onChange={e => setForm({ ...form, scheduledAt: e.target.value })}
              className={modalInputClass} disabled={sending} />
          )}
        </div>
        <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-2.5 text-xs text-blue-600 text-center">
          سيتم إرسال هذا الإشعار إلى جميع السائقين المسجلين في النظام
        </div>
        <ModalActions primaryLabel="إرسال الإشعار" onPrimary={() => {}} primaryType="submit" onSecondary={() => { reset(); onClose(); }} isSubmitting={sending} />
      </form>
    </AppModal>
  );
}

// ── Detail Modal ──────────────────────────────────────────────
function DetailModal({ notification: n, onClose }) {
  if (!n) return null;
  const status = resolveEffectiveStatus(n);
  const cfg = statusCfg(status);
  return (
    <AppModal isOpen={!!n} onClose={onClose} title="تفاصيل الإشعار" size="sm">
      <div className="space-y-4 text-right">
            <div>
              <p className="text-xs text-gray-400 mb-1">العنوان</p>
              <p className="text-sm font-bold text-gray-800">{n.title || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">المحتوى</p>
              <p className="text-sm text-gray-700 leading-relaxed">{n.content || "—"}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-400 mb-1">النوع</p>
                <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-0.5 rounded-full">{n.type}</span>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">الحالة</p>
                <span className={`text-xs px-2.5 py-0.5 rounded-full border font-medium ${cfg.cls}`}>{status}</span>
              </div>
            </div>
            {n.scheduledAt && (
              <div>
                <p className="text-xs text-gray-400 mb-1">وقت الجدولة</p>
                <p className="text-sm text-gray-700">{n.scheduledAt}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-gray-400 mb-1">تاريخ الإنشاء</p>
              <p className="text-sm text-gray-700">{fmtDate(n.createdAt)}</p>
            </div>
      </div>
    </AppModal>
  );
}

// ── Delete Confirm Modal ──────────────────────────────────────
function DeleteModal({ notificationId, onClose, onDeleted }) {
  const toast  = useToast();
  const [busy, setBusy] = useState(false);
  const handleDelete = async () => {
    setBusy(true);
    try {
      await deleteDriverNotification(notificationId);
      toast.success("تم حذف الإشعار");
      onDeleted();
    } catch { toast.error("فشل حذف الإشعار"); }
    finally { setBusy(false); onClose(); }
  };
  return (
    <ConfirmModal
      isOpen={!!notificationId}
      onClose={onClose}
      onConfirm={handleDelete}
      title="تأكيد الحذف"
      message="هل أنت متأكد من حذف هذا الإشعار؟ لا يمكن التراجع عن هذا الإجراء."
      confirmLabel="حذف"
      isSubmitting={busy}
      variant="danger"
    />
  );
}

// ── Main Page ─────────────────────────────────────────────────
export default function NotificationsPage() {
  const toast = useToast();

  // Data
  const [all,     setAll]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");

  // Filters & search
  const { searchQuery, setSearchQuery } = useGlobalSearch();
  const [filterStatus, setFilterStatus] = useState("all");  // all | مرسل | مجدول
  const [filterType,   setFilterType]   = useState("all");

  // Pagination
  const [page, setPage] = useState(1);

  // Modals
  const [sendOpen,   setSendOpen]   = useState(false);
  const [detailItem, setDetailItem] = useState(null);
  const [deleteId,   setDeleteId]   = useState(null);
  const { can } = usePermissions();
  const canSend = can(PERMISSIONS.NOTIFICATIONS_SEND);
  const canEdit = can(PERMISSIONS.NOTIFICATIONS_EDIT);
  const canDelete = can(PERMISSIONS.NOTIFICATIONS_DELETE);
  const canSchedule = can(PERMISSIONS.NOTIFICATIONS_SCHEDULE);

  // ── Fetch ──────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const data = await fetchAllDriverNotifications();
      setAll(data);
    } catch (e) {
      setError(e.message || "فشل تحميل الإشعارات");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // تحديث حالة الإشعارات المجدولة فوراً وكل 5 ثوانٍ
  useEffect(() => {
    const tick = () => {
      syncScheduledStatuses();
      setAll((prev) => {
        let changed = false;
        const next = prev.map((n) => {
          const status = resolveEffectiveStatus(n);
          if (status === n.status) return n;
          changed = true;
          return { ...n, status };
        });
        return changed ? next : prev;
      });
    };

    tick();
    const timer = setInterval(tick, 5_000);
    return () => clearInterval(timer);
  }, []);

  // ── Resend ─────────────────────────────────────────────────
  const handleResend = async (n) => {
    try {
      await resendDriverNotification(n);
      toast.success("تم إعادة إرسال الإشعار ✓");
      load();
    } catch (e) { toast.error(e.message || "فشل إعادة الإرسال"); }
  };

  // ── Filter & paginate ──────────────────────────────────────
  const filtered = all.filter(n => {
    const status = resolveEffectiveStatus(n);
    if (filterStatus !== "all" && status !== filterStatus) return false;
    if (filterType   !== "all" && n.type   !== filterType)   return false;
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      if (!n.title.toLowerCase().includes(q) && !n.content.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1); }, [searchQuery, filterStatus, filterType]);

  // ── Stats ──────────────────────────────────────────────────
  const sentCount  = all.filter(n => resolveEffectiveStatus(n) === "مرسل").length;
  const schedCount = all.filter(n => resolveEffectiveStatus(n) === "مجدول").length;

  return (
    <div className="w-full space-y-5" dir="rtl">

      {/* ── Header bar ── */}
      <div className="bg-white rounded-2xl px-6 py-4 flex items-center justify-between shadow-sm border border-gray-100">
        <button onClick={() => canSend && setSendOpen(true)} disabled={!canSend}
          className="flex items-center gap-2 bg-[#c9a84c] hover:bg-[#b8943f] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors shadow-sm">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          إرسال إشعار جديد
        </button>
        <div className="text-right">
          <h1 className="text-xl font-bold text-[#c9a84c]">إدارة الإشعارات</h1>
          <p className="text-xs text-gray-400 mt-0.5">إرسال ومتابعة إشعارات السائقين</p>
        </div>
      </div>

      {/* ── Stats cards ── */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "إجمالي الإشعارات", value: all.length,  from: "#9C6402", to: "#E6C76A",  icon: "M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" },
          { label: "إشعارات مرسلة",    value: sentCount,   from: "#10b981", to: "#34d399",  icon: "M5 13l4 4L19 7" },
          { label: "إشعارات مجدولة",   value: schedCount,  from: "#f59e0b", to: "#fbbf24",  icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl p-5 flex items-center justify-between shadow-sm border border-gray-100">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: `linear-gradient(135deg,${s.from},${s.to})` }}>
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={s.icon} />
              </svg>
            </div>
            <div className="text-right">
              <p className="text-3xl font-extrabold text-gray-800">{s.value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Filters & search ── */}
      <div className="bg-white rounded-2xl px-5 py-4 shadow-sm border border-gray-100 flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            placeholder="ابحث بالعنوان أو المحتوى..."
            className="w-full border border-gray-200 rounded-xl pl-4 pr-9 py-2.5 text-sm focus:border-[#c9a84c] focus:outline-none text-right placeholder-gray-300" />
          <svg className="w-4 h-4 text-gray-400 absolute right-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        {/* Status filter */}
        <div className="relative">
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:border-[#c9a84c] focus:outline-none bg-white text-right appearance-none pr-8">
            <option value="all">كل الحالات</option>
            <option value="مرسل">مرسل</option>
            <option value="مجدول">مجدول</option>
          </select>
          <div className="absolute left-2.5 top-3 pointer-events-none text-gray-400"><ChevronIcon /></div>
        </div>

        {/* Type filter */}
        <div className="relative">
          <select value={filterType} onChange={e => setFilterType(e.target.value)}
            className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:border-[#c9a84c] focus:outline-none bg-white text-right appearance-none pr-8">
            <option value="all">كل الأنواع</option>
            {TYPE_OPTIONS.map(t => <option key={t}>{t}</option>)}
          </select>
          <div className="absolute left-2.5 top-3 pointer-events-none text-gray-400"><ChevronIcon /></div>
        </div>

        {/* Refresh */}
        <button onClick={load}
          className="flex items-center gap-1.5 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-500 hover:bg-gray-50 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          تحديث
        </button>
      </div>

      {/* ── Table ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

        {/* Table head */}
        <div className="grid grid-cols-[2fr_3fr_1fr_1fr_1.5fr_1.2fr] px-5 py-3 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 text-right">
          <span>العنوان</span>
          <span>المحتوى</span>
          <span className="text-center">النوع</span>
          <span className="text-center">الحالة</span>
          <span className="text-center">التاريخ</span>
          <span className="text-center">إجراءات</span>
        </div>

        {/* States */}
        {loading ? (
          <Spinner />
        ) : error ? (
          <div className="flex flex-col items-center gap-3 py-14 text-center">
            <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
            </div>
            <p className="text-sm text-gray-500">{error}</p>
            <button onClick={load}
              className="text-xs text-[#c9a84c] font-semibold border border-[#c9a84c]/40 px-4 py-1.5 rounded-lg hover:bg-[#c9a84c]/10 transition-colors">
              إعادة المحاولة
            </button>
          </div>
        ) : pageItems.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="text-5xl">🔔</div>
            <p className="text-sm text-gray-400 font-medium">
              {all.length === 0 ? "لا توجد إشعارات أنشأتها بعد" : "لا توجد نتائج تطابق البحث"}
            </p>
            {all.length === 0 && (
              <button onClick={() => setSendOpen(true)}
                className="mt-1 text-xs bg-[#c9a84c] text-white px-4 py-1.5 rounded-lg hover:bg-[#b8943f] transition-colors">
                إرسال أول إشعار
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {pageItems.map(n => {
              const status = resolveEffectiveStatus(n);
              const cfg = statusCfg(status);
              return (
                <div key={n.id}
                  className="grid grid-cols-[2fr_3fr_1fr_1fr_1.5fr_1.2fr] items-center px-5 py-3.5 hover:bg-gray-50/60 transition-colors text-right">

                  {/* العنوان */}
                  <span className="text-sm font-semibold text-gray-800 truncate pl-2">{n.title || "—"}</span>

                  {/* المحتوى */}
                  <span className="text-xs text-gray-500 truncate px-2 max-w-[280px]">{n.content || "—"}</span>

                  {/* النوع */}
                  <div className="flex justify-center">
                    <span className="text-[10px] bg-gray-100 text-gray-600 px-2.5 py-0.5 rounded-full border border-gray-200 whitespace-nowrap">
                      {n.type}
                    </span>
                  </div>

                  {/* الحالة */}
                  <div className="flex justify-center">
                    <span className={`text-[10px] px-2.5 py-0.5 rounded-full border font-medium flex items-center gap-1 whitespace-nowrap ${cfg.cls}`}>
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />
                      {status}
                    </span>
                  </div>

                  {/* التاريخ */}
                  <div className="text-center">
                    <p className="text-[11px] text-gray-500">{fmtDate(n.createdAt)}</p>
                    {n.scheduledAt && (
                      <p className="text-[10px] text-amber-500 mt-0.5">⏰ {n.scheduledAt}</p>
                    )}
                  </div>

                  {/* إجراءات */}
                  <div className="flex items-center justify-center gap-1">
                    {/* عرض */}
                    <button onClick={() => setDetailItem(n)} title="عرض التفاصيل"
                      className="p-1.5 text-gray-400 hover:text-[#c9a84c] hover:bg-amber-50 rounded-lg transition-colors">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </button>

                    {canEdit && (
                    <button onClick={() => handleResend(n)} title="إعادة إرسال"
                      className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </button>
                    )}

                    {canDelete && (
                    <button onClick={() => setDeleteId(n.id)} title="حذف"
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                    )}
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Pagination ── */}
      {!loading && !error && filtered.length > PAGE_SIZE && (
        <div className="flex items-center justify-between bg-white rounded-2xl px-5 py-3 shadow-sm border border-gray-100">
          <p className="text-xs text-gray-400">
            عرض {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} من {filtered.length}
          </p>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
              className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 transition-colors">
              <ChevronIcon dir="right" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
              .reduce((acc, p, idx, arr) => {
                if (idx > 0 && p - arr[idx - 1] > 1) acc.push("…");
                acc.push(p);
                return acc;
              }, [])
              .map((p, idx) =>
                p === "…" ? (
                  <span key={"ellipsis-" + idx} className="px-2 text-gray-400 text-xs">…</span>
                ) : (
                  <button key={p} onClick={() => setPage(p)}
                    className={"w-8 h-8 rounded-lg text-xs font-medium transition-colors " +
                      (p === currentPage
                        ? "bg-[#c9a84c] text-white"
                        : "border border-gray-200 text-gray-600 hover:bg-gray-50")}>
                    {p}
                  </button>
                )
              )}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
              className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 transition-colors">
              <ChevronIcon dir="left" />
            </button>
          </div>
        </div>
      )}

      {/* ── Modals ── */}
      <SendModal
        isOpen={sendOpen}
        onClose={() => setSendOpen(false)}
        onSent={load}
      />
      <DetailModal
        notification={detailItem}
        onClose={() => setDetailItem(null)}
      />
      <DeleteModal
        notificationId={deleteId}
        onClose={() => setDeleteId(null)}
        onDeleted={load}
      />

    </div>
  );
}
