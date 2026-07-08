import { useState, useEffect } from "react";
import {
  markAllAsRead,
  markAsRead,
  isNotificationUnread,
  subscribeNotifications,
  syncBackendNotifications,
} from "../services/notifications.js";

const fmtDate = (d) => {
  if (!d) return "";
  const date = d?.toDate ? d.toDate() : new Date(d);
  if (Number.isNaN(date.getTime())) return "";
  const now = new Date();
  const diff = Math.floor((now - date) / 1000);
  if (diff < 60) return "منذ لحظات";
  if (diff < 3600) return `منذ ${Math.floor(diff/60)} دقيقة`;
  if (diff < 86400) return `منذ ${Math.floor(diff/3600)} ساعة`;
  if (diff < 172800) return "منذ يوم";
  return date.toLocaleDateString("ar-EG");
};

// Gradient bell icon
const BellIconGradient = () => (
  <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
    style={{ background: "linear-gradient(135deg,#9C6402,#E6C76A)" }}>
    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
    </svg>
  </div>
);

const Spinner = () => (
  <div className="flex justify-center py-10">
    <div className="w-7 h-7 border-4 border-[#c9a84c] border-t-transparent rounded-full animate-spin"/>
  </div>
);

// Dots drag handle
const DotsIcon = () => (
  <div className="flex flex-col gap-[3px] px-1 shrink-0">
    {[0,1,2].map(i=>(
      <div key={i} className="flex gap-[3px]">
        <div className="w-[3px] h-[3px] rounded-full bg-gray-300"/>
        <div className="w-[3px] h-[3px] rounded-full bg-gray-300"/>
      </div>
    ))}
  </div>
);

export default function NotificationsBellPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [markingAll, setMarkingAll] = useState(false);

  useEffect(() => {
    setLoading(true);
    syncBackendNotifications().finally(() => setLoading(false));
    const unsub = subscribeNotifications((items) => {
      setNotifications(
        items.map((n) => ({
          id: n.id,
          type: n.title ?? n.type ?? "إشعار",
          content: n.body ?? "",
          created_at: n.apiCreatedAt ?? n.createdAt,
          read: !isNotificationUnread(n),
        }))
      );
      setLoading(false);
    });
    const poll = setInterval(() => syncBackendNotifications(), 30_000);
    return () => {
      unsub();
      clearInterval(poll);
    };
  }, []);

  const markAllRead = async () => {
    setMarkingAll(true);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      await markAllAsRead();
    } catch (e) {
      console.error(e);
    }
    setMarkingAll(false);
  };

  const markOneRead = async (n) => {
    if (n.read) return;
    setNotifications((prev) =>
      prev.map((x) => (x.id === n.id ? { ...x, read: true } : x))
    );
    try {
      await markAsRead(n.id);
    } catch {
      /* ignore */
    }
  };

  const displayed = filter === "unread"
    ? notifications.filter((n) => !n.read)
    : filter === "archived"
    ? notifications.filter((n) => n.read)
    : notifications;

  const unreadCount = notifications.filter((n) => !n.read).length;

  // icon based on type
  const getIcon = (type) => {
    if (!type) return null;
    if (type.includes("مكافأ") || type.includes("كود")) return { bg:"from-[#d4a020] to-[#f0c040]", path:"M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" };
    if (type.includes("رحلة") || type.includes("تذكر")) return { bg:"from-[#c97020] to-[#e89040]", path:"M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" };
    if (type.includes("دفعة") || type.includes("مالي") || type.includes("مرتجع")) return { bg:"bg-gray-300", path:"M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" };
    if (type.includes("رسالة") || type.includes("إعلان")) return { bg:"bg-gray-300", path:"M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" };
    return { bg:"bg-gray-300", path:"M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" };
  };

  return (
    <div className="w-full p-4" dir="rtl">

      {/* Header bar */}
      <div className="bg-white rounded-2xl px-5 py-3 flex items-center justify-between mb-5 shadow-sm">
        {/* Right: bell + title */}
        <div className="flex items-center gap-3">
          <BellIconGradient/>
          <h1 className="text-xl font-bold text-[#c9a84c]">الإشعارات</h1>
          {unreadCount > 0 && (
            <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{unreadCount}</span>
          )}
        </div>
        {/* Left: buttons */}
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {/* فلتر */}
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
            {[{id:"all",label:"الكل"},{id:"unread",label:"غير مقروء"},{id:"archived",label:"مقروء"}].map(f=>(
              <button key={f.id} onClick={()=>setFilter(f.id)}
                className={`text-xs px-3 py-1.5 rounded-md font-medium transition-all ${filter===f.id ? "bg-white text-gray-800 shadow-sm" : "text-gray-400 hover:text-gray-700"}`}>
                {f.label}
              </button>
            ))}
          </div>
          {/* كتم / تحديد الكل كمقروء */}
          <button onClick={markAllRead} disabled={markingAll}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium bg-[#c9a84c] text-white hover:bg-[#b8943f] transition-colors disabled:opacity-60">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
            </svg>
            {markingAll ? "جارٍ..." : "تحديد الكل كمقروء"}
          </button>
        </div>
      </div>

      {/* Notifications list */}
      {loading ? <Spinner/> : displayed.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 text-center text-gray-400 text-sm shadow-sm">
          لا توجد إشعارات
        </div>
      ) : (
        <div className="space-y-3">
          {displayed.map(n => {
            const icon = getIcon(n.type);
            const isNew = !n.read;
            return (
              <div key={n.id} onClick={() => markOneRead(n)}
                className={`bg-white rounded-2xl border px-4 py-4 flex items-start gap-3 hover:shadow-md transition-shadow cursor-pointer ${isNew ? "border-[#c9a84c]/30 bg-amber-50/20" : "border-gray-100"}`}>
                <DotsIcon/>
                {/* Content */}
                <div className="flex-1 text-right">
                  <div className="flex items-center justify-end gap-2 mb-1">
                    {isNew && (
                      <span className="w-2 h-2 bg-[#c9a84c] rounded-full shrink-0"/>
                    )}
                    <p className="text-[15px] font-semibold text-gray-900 leading-tight">{n.type||"إشعار"}</p>
                  </div>
                  <p className="text-sm text-gray-500 mt-1 leading-relaxed">{n.content}</p>
                  {isNew ? (
                    <span className="inline-block mt-2 px-3 py-0.5 rounded-full text-xs font-semibold text-white"
                      style={{background:"linear-gradient(90deg,#9C6402,#E6C76A)"}}>
                      {fmtDate(n.created_at)}
                    </span>
                  ) : (
                    <p className="text-xs text-gray-400 mt-2">{fmtDate(n.created_at)}</p>
                  )}
                </div>
                {/* Icon */}
                {icon && (
                  typeof icon.bg === "string" && icon.bg.startsWith("from-") ? (
                    <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                      style={{background:`linear-gradient(135deg,${icon.bg.includes("d4a020")?"#d4a020":"#c97020"},${icon.bg.includes("d4a020")?"#f0c040":"#e89040"})`}}>
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon.path}/>
                      </svg>
                    </div>
                  ) : (
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${icon.bg}`}>
                      <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon.path}/>
                      </svg>
                    </div>
                  )
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
