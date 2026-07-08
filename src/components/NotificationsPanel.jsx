import { useState, useEffect } from "react";
import AppModal, { ModalField, ModalActions, modalInputClass } from "./ui/AppModal";

const BASE = "https://drivo1.elmoroj.com/api";

const fmtDate = (ts) => {
  if (!ts) return "";
  const d = new Date(ts);
  if (isNaN(d)) return ts;
  const diff = Math.floor((Date.now() - d) / 1000);
  if (diff < 60)    return "منذ لحظات";
  if (diff < 3600)  return "منذ " + Math.floor(diff / 60) + " دقيقة";
  if (diff < 86400) return "منذ " + Math.floor(diff / 3600) + " ساعة";
  return d.toLocaleDateString("ar-EG");
};

function Toast({ msg, onClose }) {
  return (
    <div className="fixed bottom-6 left-6 z-[100] flex items-center gap-3 bg-[#1a1a1a] text-white text-sm px-5 py-3 rounded-2xl shadow-2xl">
      <span className="text-lg">🔔</span>
      <span className="font-medium">{msg}</span>
      <button onClick={onClose} className="text-gray-400 hover:text-white ml-2 text-lg leading-none">&times;</button>
    </div>
  );
}

const TYPE_OPTIONS = [
  { value: "general",     label: "عام" },
  { value: "promotional", label: "ترويجي" },
  { value: "alert",       label: "تنبيه" },
  { value: "scheduled",   label: "مجدول" },
];

const TYPE_COLORS = {
  general:     "bg-blue-50 text-blue-700 border-blue-200",
  promotional: "bg-purple-50 text-purple-700 border-purple-200",
  alert:       "bg-yellow-50 text-yellow-700 border-yellow-200",
  scheduled:   "bg-gray-50 text-gray-600 border-gray-200",
};

export default function NotificationsPanel() {
  const [notifications, setNotifications] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [isOpen,   setIsOpen]   = useState(false);
  const [sending,  setSending]  = useState(false);
  const [sendErr,  setSendErr]  = useState("");
  const [toast,    setToast]    = useState("");
  const [form, setForm] = useState({
    title:       "",
    content:     "",
    type:        "general",
    sendMode:    "now",
    scheduledAt: "",
  });

  // جيب الإشعارات من الـ API
  const fetchNotifications = () => {
    setLoading(true);
    fetch(`${BASE}/general-notifications`, {
      headers: { Accept: "application/json" },
    })
      .then(r => r.json())
      .then(d => {
        const list = d?.data ?? (Array.isArray(d) ? d : []);
        setNotifications(list);
      })
      .catch(() => setNotifications([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchNotifications(); }, []);

  const resetForm = () => setForm({ title: "", content: "", type: "general", sendMode: "now", scheduledAt: "" });

  const handleSend = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim()) return;
    setSending(true);
    setSendErr("");
    try {
      const payload = {
        title:   form.title.trim(),
        content: form.content.trim(),
        type:    form.type,
        status:  form.sendMode === "now" ? "مرسل" : "مجدول",
        ...(form.sendMode === "scheduled" && form.scheduledAt
          ? { scheduled_at: form.scheduledAt }
          : {}),
      };

      const r = await fetch(`${BASE}/notifications/drivers/send`, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        const errs = data?.errors
          ? Object.values(data.errors).flat().join(" | ")
          : data?.message ?? `خطأ ${r.status}`;
        throw new Error(errs);
      }
      resetForm();
      setIsOpen(false);
      setToast("تم إرسال الإشعار لجميع السائقين ✓");
      setTimeout(() => setToast(""), 4000);
      // أعد تحميل القائمة بعد الإرسال
      fetchNotifications();
    } catch (err) {
      setSendErr(err.message);
    } finally {
      setSending(false);
    }
  };

  const sentCount      = notifications.length;

  return (
    <div className="w-full space-y-5 p-2" dir="rtl">

      {toast && <Toast msg={toast} onClose={() => setToast("")} />}

      {/* Header */}
      <div className="bg-white rounded-2xl px-6 py-4 flex items-center justify-between shadow-sm border border-gray-100">
        <button
          onClick={() => { resetForm(); setSendErr(""); setIsOpen(true); }}
          className="flex items-center gap-2 bg-[#c9a84c] hover:bg-[#b8943f] text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
          </svg>
          إرسال إشعار جديد
        </button>
        <div className="text-right">
          <h1 className="text-xl font-bold text-[#c9a84c]">إدارة الإشعارات</h1>
          <p className="text-xs text-gray-400 mt-0.5">إرسال إشعارات لجميع السائقين</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        {[
          { label: "إجمالي الإشعارات المرسلة", value: sentCount, from: "#9C6402", to: "#E6C76A" },
          { label: "إشعارات السواقين",          value: sentCount, from: "#10b981", to: "#34d399" },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl p-5 flex items-center justify-between shadow-sm border border-gray-100">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ background: `linear-gradient(135deg,${s.from},${s.to})` }}>
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
              </svg>
            </div>
            <div className="text-right">
              <p className="text-3xl font-extrabold text-gray-800">{s.value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Notifications table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Table header */}
        <div className="grid grid-cols-4 px-5 py-3 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500">
          <span>العنوان</span>
          <span className="text-center">الرسالة</span>
          <span className="text-center">النوع</span>
          <span className="text-left">التاريخ</span>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-7 h-7 border-4 border-[#c9a84c] border-t-transparent rounded-full animate-spin"/>
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-5xl mb-3">🔔</div>
            <p className="text-sm text-gray-400 font-medium">لا توجد إشعارات مرسلة</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {notifications.map(n => {
              const typeInfo = TYPE_OPTIONS.find(t => t.value === (n.type ?? "general"));
              const colorClass = TYPE_COLORS[n.type] ?? TYPE_COLORS.general;
              return (
                <div key={n.id} className="grid grid-cols-4 items-center px-5 py-3.5 hover:bg-gray-50/60 transition-colors">
                  {/* العنوان */}
                  <span className="text-sm font-semibold text-gray-800 truncate pr-1">{n.title ?? "—"}</span>
                  {/* الرسالة */}
                  <span className="text-xs text-gray-500 truncate text-center px-2">{n.body ?? n.content ?? "—"}</span>
                  {/* النوع */}
                  <div className="flex justify-center">
                    <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-medium border ${colorClass}`}>
                      {typeInfo?.label ?? "عام"}
                    </span>
                  </div>
                  {/* التاريخ */}
                  <span className="text-[11px] text-gray-400 text-left">{fmtDate(n.created_at ?? n.createdAt)}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Send notification modal */}
      <AppModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="إرسال إشعار جديد"
        isSubmitting={sending}
        size="md"
      >
        <form onSubmit={handleSend} className="space-y-4">
          {sendErr && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-xs rounded-xl px-4 py-2 text-right">
              {sendErr}
            </div>
          )}

          <ModalField label="عنوان الإشعار" required>
            <input
              type="text"
              required
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              placeholder="مثال: عيد مبارك"
              className={modalInputClass}
              disabled={sending}
            />
          </ModalField>

          <ModalField label="الرسالة" required>
            <textarea
              rows={4}
              required
              value={form.content}
              onChange={e => setForm({ ...form, content: e.target.value })}
              placeholder="اكتب رسالة الإشعار..."
              className={`${modalInputClass} resize-none`}
              disabled={sending}
            />
          </ModalField>

          <ModalField label="النوع">
            <select
              value={form.type}
              onChange={e => setForm({ ...form, type: e.target.value })}
              className={`${modalInputClass} appearance-none`}
              disabled={sending}
            >
              {TYPE_OPTIONS.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </ModalField>

          <div className="space-y-2">
            <div className="flex items-center justify-end gap-4">
              <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-600">
                جدولة
                <input
                  type="radio"
                  name="sendMode"
                  value="scheduled"
                  checked={form.sendMode === "scheduled"}
                  onChange={() => setForm({ ...form, sendMode: "scheduled" })}
                  className="accent-[#c9a84c]"
                  disabled={sending}
                />
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-600">
                إرسال الآن
                <input
                  type="radio"
                  name="sendMode"
                  value="now"
                  checked={form.sendMode === "now"}
                  onChange={() => setForm({ ...form, sendMode: "now" })}
                  className="accent-[#c9a84c]"
                  disabled={sending}
                />
              </label>
            </div>

            {form.sendMode === "scheduled" && (
              <input
                type="datetime-local"
                value={form.scheduledAt}
                onChange={e => setForm({ ...form, scheduledAt: e.target.value })}
                className={modalInputClass}
                disabled={sending}
              />
            )}
          </div>

          <div className="bg-[#f0f7ff] border border-blue-100 rounded-xl px-4 py-2.5 text-xs text-blue-600 text-center">
            سيتم إرسال هذا الإشعار إلى جميع السائقين المسجلين في النظام
          </div>

          <ModalActions primaryLabel="حفظ" onPrimary={() => {}} primaryType="submit" onSecondary={() => setIsOpen(false)} isSubmitting={sending} />
        </form>
      </AppModal>
    </div>
  );
}
