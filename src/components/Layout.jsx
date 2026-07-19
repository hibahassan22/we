import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuthContext } from "../context/AuthContext.jsx";
import { usePermissions } from "../hooks/usePermissions.js";
import { useUnreadCount } from "../lib/useUnreadCount";
import { useChatUnreadCount, isChatDriverUnread, markChatDriverRead } from "../lib/useChatUnread";
import { subscribeNotifications, markAllAsRead, markAsRead, initNotificationsCollection, isNotificationUnread, syncBackendNotifications } from "../services/notifications";
import {
  fetchAllDrivers,
  fetchDriverSaleChats,
  fetchMessagesForDriver,
  sendDriverSaleChatMessage,
  getDriverChatUserId,
  indexChatsByPartner,
  mergeDriversWithChatPreviews,
  messageAttachments,
  parseLocationMessage,
  isMessageRead,
} from "../services/driverSaleChatService.js";
import { formatChatTime, driverDisplayName } from "../services/tripChatService.js";
import { useToast } from "../lib/toast.jsx";
import PageTransition from "./PageTransition";
import { useGlobalSearch, getSearchPlaceholder } from "../hooks/useGlobalSearch";
import { assetUrl } from "../lib/assetUrl.js";

const fmtDate = (ts) => { if (!ts) return ""; const d = ts?.toDate ? ts.toDate() : new Date(ts); const diff = Math.floor((Date.now()-d)/1000); if (diff<60) return "منذ لحظات"; if (diff<3600) return "منذ "+Math.floor(diff/60)+"د"; if (diff<86400) return "منذ "+Math.floor(diff/3600)+"س"; return d.toLocaleDateString("ar-EG"); };

const SearchIcon = () => (<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>);
const BellIcon   = () => (<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>);
const ChatIcon   = () => (<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>);
const SendIcon   = () => (<svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"/></svg>);
const LogoutIcon = () => (<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>);

const ALL_NAV = [
  { label:"لوحة التحكم",     route:"/dashboard",    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg> },
  { label:"السائقين",        route:"/drivers",       icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg> },
  { label:"سجل الرحلات",     route:"/trips",         icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/></svg> },
  { label:"إنشاء رحلة",      route:"/create-trip",   icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"/></svg> },
  { label:"العملاء",          route:"/clients",       icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg> },
  { label:"إدارة الوسطاء",    route:"/brokers",       icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg> },
  { label:"ادارة المكافآت",  route:"/rewards",       icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"/></svg> },
  { label:"الدعم الفني",     route:"/support",       icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z"/></svg> },
  { label:"إدارة الاشعارات", route:"/notifications", icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg> },
  { label:"سجل النشاطات",    route:"/activity",      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/></svg> },
  { label:"مركز الموافقات",  route:"/approvals",     icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg> },
  { label:"الصلاحيات",       route:"/permissions",   icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/></svg> },
  { label:"المستخدمين",      route:"/users",         icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg> },
  { label:"إدارة النظام",    route:"/system",        icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg> },
  { label:"الاعدادات",       route:"/settings",      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg> },
];

const ACCOUNTS_NAV = {
  label: "الحسابات",
  icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>,
  children: [
    { label: "حسابات السائقين", route: "/accounts/drivers" },
    { label: "الدفعات", route: "/accounts/payments" },
    { label: "الموظفين", route: "/accounts/employees" },
    { label: "الاستردادات", route: "/accounts/refunds" },
    { label: "المصروفات", route: "/accounts/expenses" },
  ],
};

function isAccountsChildRoute(pathname) {
  return ACCOUNTS_NAV.children.some(
    (child) => pathname === child.route || pathname.startsWith(`${child.route}/`),
  );
}

function NotificationsDropdown({ onClose }) {
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState("all");
  const [markingAll, setMarkingAll] = useState(false);
  const ref = useRef(null);
  useEffect(() => { const u = subscribeNotifications(setItems); return u; }, []);
  useEffect(() => {
    syncBackendNotifications();
    const poll = setInterval(syncBackendNotifications, 30_000);
    return () => clearInterval(poll);
  }, []);
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [onClose]);

  const handleMarkAllAsRead = async () => {
    setMarkingAll(true);
    setItems((prev) => prev.map((n) => ({ ...n, read: true, status: "read" })));
    try {
      await markAllAsRead();
    } catch (e) {
      console.error("[Notifications] mark all:", e);
    } finally {
      setMarkingAll(false);
    }
  };

  const handleMarkOne = async (n) => {
    if (!isNotificationUnread(n)) return;
    setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true, status: "read" } : x)));
    try {
      await markAsRead(n.id);
    } catch (e) {
      console.error("[Notifications] mark one:", e);
    }
  };

  const displayed = filter==="unread" ? items.filter(isNotificationUnread) : filter==="read" ? items.filter(n=>!isNotificationUnread(n)) : items.slice(0,12);
  return (
    <div ref={ref} className="absolute top-12 left-0 z-50 w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden" dir="rtl" style={{animation:"dropDown 0.2s ease"}}>
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-l from-[#9C6402] to-[#E6C76A]">
        <button type="button" onClick={handleMarkAllAsRead} disabled={markingAll} className="text-[10px] text-white/80 hover:text-white border border-white/30 px-2 py-1 rounded-lg disabled:opacity-60">{markingAll ? "..." : "تحديد الكل مقروء"}</button>
        <div className="flex items-center gap-2"><h3 className="text-white font-bold text-sm">الاشعارات</h3><BellIcon /></div>
      </div>
      <div className="flex border-b border-gray-100 bg-gray-50">
        {[{id:"all",label:"الكل"},{id:"unread",label:"غير مقروء"},{id:"read",label:"مقروء"}].map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)} className={"flex-1 py-2 text-xs font-medium transition-colors " + (filter===f.id ? "text-[#c9a84c] border-b-2 border-[#c9a84c] bg-white" : "text-gray-400 hover:text-gray-600")}>{f.label}</button>
        ))}
      </div>
      <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
        {displayed.length===0 ? (
          <div className="py-10 text-center text-gray-400 text-xs"><div className="text-3xl mb-2">🔔</div>لا توجد اشعارات</div>
        ) : displayed.map(n => (
          <div key={n.id} onClick={() => handleMarkOne(n)}
            className={"flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 " + (isNotificationUnread(n) ? "bg-amber-50/40" : "")}>
            <div className={"w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm " + (n.type==="driver" ? "bg-gradient-to-br from-[#9C6402] to-[#E6C76A]" : "bg-blue-100")}>
              {n.type==="driver" ? "🚗" : "⚙"}
            </div>
            <div className="flex-1 text-right min-w-0">
              <div className="flex items-center justify-between gap-1">
                <span className="text-[10px] text-gray-400">{fmtDate(n.apiCreatedAt ?? n.createdAt)}</span>
                <p className="text-xs font-semibold text-gray-800 truncate">{n.title}</p>
              </div>
              <p className="text-[11px] text-gray-500 truncate mt-0.5">{n.body}</p>
            </div>
            {!isNotificationUnread(n) ? null : <span className="w-2 h-2 bg-[#c9a84c] rounded-full shrink-0 mt-1.5" />}
          </div>
        ))}
      </div>
    </div>
  );
}

function ChatModal({ isOpen, onClose, currentUser }) {
  const toast = useToast();
  const myId = currentUser?.uid ?? currentUser?.id ?? "";
  const [drivers, setDrivers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendingLocation, setSendingLocation] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [search, setSearch] = useState("");
  const bottomRef = useRef(null);
  const fileInputRef = useRef(null);

  const dName = (d) => driverDisplayName(d, d?.chatUserId);
  const dInit = (d) => (d?.name?.[0] ?? "س").toUpperCase();

  const loadDrivers = useCallback(async () => {
    setLoading(true);
    try {
      const [driverList, chatList] = await Promise.all([
        fetchAllDrivers().catch(() => []),
        fetchDriverSaleChats().catch(() => []),
      ]);
      const chatByPartner = indexChatsByPartner(chatList, myId);
      const merged = mergeDriversWithChatPreviews(driverList, chatByPartner);
      setDrivers(merged);
      setSelected((prev) => {
        if (prev && merged.some((d) => d.chatUserId === prev.chatUserId)) {
          return merged.find((d) => d.chatUserId === prev.chatUserId) ?? prev;
        }
        return merged[0] ?? null;
      });
    } catch (err) {
      toast.error(err.message || "فشل تحميل السائقين");
      setDrivers([]);
    } finally {
      setLoading(false);
    }
  }, [myId, toast]);

  const loadMessages = useCallback(async (driver) => {
    if (!driver) {
      setMessages([]);
      return;
    }
    setMessagesLoading(true);
    try {
      const list = await fetchMessagesForDriver(driver, myId);
      setMessages(list);
    } catch (err) {
      toast.error(err.message || "فشل تحميل المحادثة");
      setMessages([]);
    } finally {
      setMessagesLoading(false);
    }
  }, [myId, toast]);

  useEffect(() => {
    if (!isOpen) return;
    loadDrivers();
  }, [isOpen, loadDrivers]);

  useEffect(() => {
    if (!isOpen || !selected) return;
    loadMessages(selected);
    markChatDriverRead(selected.chatUserId);
  }, [isOpen, selected, loadMessages]);

  useEffect(() => {
    if (!isOpen || !selected) return undefined;
    const timer = setInterval(() => {
      fetchMessagesForDriver(selected, myId)
        .then(setMessages)
        .catch(() => {});
    }, 8000);
    return () => clearInterval(timer);
  }, [isOpen, selected, myId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, selected]);

  useEffect(() => {
    if (!isOpen) return undefined;
    document.body.style.overflow = "hidden";
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [isOpen, onClose]);

  const handlePickFiles = (e) => {
    const files = Array.from(e.target.files || []).filter((f) => f.type.startsWith("image/"));
    if (files.length) setAttachments((prev) => [...prev, ...files]);
    e.target.value = "";
  };

  const removeAttachment = (index) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const sendMessagePayload = async ({ text = "", files = [], previewLabel }) => {
    if (!selected || !myId) {
      if (!myId) toast.error("يجب تسجيل الدخول لإرسال رسالة");
      return false;
    }
    const receiverId = selected.chatUserId || getDriverChatUserId(selected);
    if (!receiverId) {
      toast.error("تعذر تحديد السائق");
      return false;
    }
    await sendDriverSaleChatMessage({
      senderId: myId,
      receiverId,
      message: text,
      attachments: files,
    });
    const now = new Date();
    const timeLabel = now.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
    const preview = previewLabel ?? text ?? (files.length ? "📷 صورة" : "");
    setDrivers((prev) => prev.map((d) => (
      d.chatUserId === selected.chatUserId
        ? { ...d, lastMessage: preview, lastMessageTime: timeLabel, lastMessageAt: now.getTime() }
        : d
    )));
    await loadMessages(selected);
    return true;
  };

  const send = async () => {
    const text = inputText.trim();
    if ((!text && attachments.length === 0) || !selected || !myId) {
      if (!myId) toast.error("يجب تسجيل الدخول لإرسال رسالة");
      return;
    }
    setSending(true);
    try {
      const ok = await sendMessagePayload({
        text,
        files: attachments,
        previewLabel: attachments.length ? (text || "📷 صورة") : text,
      });
      if (ok) {
        setInputText("");
        setAttachments([]);
      }
    } catch (err) {
      toast.error(err.message || "فشل إرسال الرسالة");
    } finally {
      setSending(false);
    }
  };

  const sendLocation = () => {
    if (!selected || !myId) {
      if (!myId) toast.error("يجب تسجيل الدخول لإرسال رسالة");
      return;
    }
    if (!navigator.geolocation) {
      toast.error("خدمة الموقع غير مدعومة في المتصفح");
      return;
    }
    setSendingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const url = `https://www.google.com/maps?q=${latitude},${longitude}`;
          await sendMessagePayload({ text: `📍 الموقع: ${url}`, previewLabel: "📍 موقع" });
        } catch (err) {
          toast.error(err.message || "فشل إرسال الموقع");
        } finally {
          setSendingLocation(false);
        }
      },
      (err) => {
        setSendingLocation(false);
        toast.error(err.code === err.PERMISSION_DENIED ? "تم رفض إذن الوصول للموقع" : "تعذر تحديد الموقع");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const selectDriver = (driver) => {
    markChatDriverRead(driver.chatUserId);
    if (driver.chatUserId === selected?.chatUserId) return;
    setSelected(driver);
    setInputText("");
    setAttachments([]);
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return drivers;
    return drivers.filter((d) => {
      const name = dName(d).toLowerCase();
      const phone = String(d.phone ?? "");
      const preview = String(d.lastMessage ?? "").toLowerCase();
      return name.includes(q) || phone.includes(q) || preview.includes(q);
    });
  }, [drivers, search]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6" dir="rtl">
      <button
        type="button"
        aria-label="إغلاق"
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
        onClick={onClose}
      />

      <div
        className="relative w-full max-w-[920px] h-[min(640px,calc(100vh-2rem))] bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-white/20"
        style={{ animation: "chatPopIn 0.22s ease" }}
      >
        <div className="flex flex-1 min-h-0">
          {/* قائمة السائقين */}
          <aside className="w-[300px] shrink-0 flex flex-col bg-[#faf7f0] border-l border-amber-100/80">
            <div className="px-5 pt-5 pb-4 bg-gradient-to-b from-[#9C6402] to-[#b8943f]">
              <div className="flex items-center justify-between mb-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
                <div className="text-right">
                  <p className="text-white font-bold text-sm">المحادثات</p>
                  <p className="text-white/70 text-[10px]">{drivers.length} سائق</p>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-white/15 rounded-xl px-3 py-2.5 border border-white/20">
                <SearchIcon />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="ابحث عن سائق..."
                  dir="rtl"
                  className="flex-1 bg-transparent text-xs text-white outline-none placeholder-white/60"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex justify-center py-12">
                  <div className="w-7 h-7 border-2 border-[#c9a84c] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : filtered.length === 0 ? (
                <p className="text-center text-gray-400 text-xs py-10">لا يوجد سائقين</p>
              ) : filtered.map((d) => {
                const isActive = selected?.chatUserId === d.chatUserId;
                const hasUnread = isChatDriverUnread(d.chatUserId);
                return (
                  <button
                    key={d.chatUserId || d.id}
                    type="button"
                    onClick={() => selectDriver(d)}
                    className={`w-full flex items-center gap-3 px-4 py-3.5 border-b border-amber-50/80 transition-all text-right ${
                      isActive
                        ? "bg-white shadow-sm border-r-[3px] border-r-[#c9a84c]"
                        : "hover:bg-white/60"
                    }`}
                  >
                    <div className="relative shrink-0">
                      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-white font-bold text-sm shadow-sm ${
                        isActive ? "bg-gradient-to-br from-[#9C6402] to-[#E6C76A]" : "bg-gradient-to-br from-gray-300 to-gray-400"
                      }`}>
                        {dInit(d)}
                      </div>
                      {hasUnread && (
                        <span className="absolute -top-1 -left-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center border-2 border-white">
                          1
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <span className="text-[10px] text-gray-400 shrink-0">
                          {d.lastMessageTime || (d.lastMessageAt ? formatChatTime(new Date(d.lastMessageAt).toISOString()) : "")}
                        </span>
                        <p className={`text-xs truncate ${isActive ? "font-bold text-[#9C6402]" : "font-semibold text-gray-700"}`}>
                          {dName(d)}
                        </p>
                      </div>
                      <p className="text-[11px] text-gray-400 truncate">
                        {d.lastMessage || d.phone || "لا توجد رسائل بعد"}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          {/* نافذة المحادثة */}
          <section className="flex-1 flex flex-col min-w-0 bg-[#f8f6f2]">
            {selected ? (
              <>
                <header className="px-6 py-4 bg-white border-b border-gray-100 flex items-center justify-between gap-3 shadow-sm">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#9C6402] to-[#E6C76A] flex items-center justify-center text-white font-bold shadow-sm shrink-0">
                      {dInit(selected)}
                    </div>
                    <div className="text-right min-w-0">
                      <p className="text-sm font-bold text-gray-800 truncate">{dName(selected)}</p>
                      <p className="text-[11px] text-gray-400 truncate" dir="ltr">{selected.phone || "—"}</p>
                    </div>
                  </div>
                  <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full font-medium shrink-0">
                    محادثة مشتركة
                  </span>
                </header>

                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-3">
                  {messagesLoading ? (
                    <div className="flex justify-center py-16">
                      <div className="w-8 h-8 border-2 border-[#c9a84c] border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full min-h-[280px] gap-3 text-gray-400">
                      <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center text-3xl shadow-sm border border-gray-100">💬</div>
                      <p className="text-sm font-medium text-gray-500">ابدأ المحادثة مع {dName(selected)}</p>
                      <p className="text-[11px] text-gray-400">كل رسائل فريق المبيعات مع هذا السائق في مكان واحد</p>
                    </div>
                  ) : (
                    messages.map((m) => {
                      const isMe = String(m.sender_id) === String(myId);
                      const files = messageAttachments(m);
                      const location = parseLocationMessage(m.message);
                      const read = isMessageRead(m);
                      return (
                        <div key={m.id} className={`flex flex-col gap-1 max-w-[78%] ${isMe ? "mr-auto items-end" : "ml-auto items-start"}`}>
                          <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
                            isMe
                              ? "bg-gradient-to-br from-[#9C6402] to-[#c9a84c] text-white rounded-bl-md"
                              : "bg-white text-gray-800 border border-gray-100 rounded-br-md"
                          }`}>
                            {location ? (
                              <a
                                href={location.url}
                                target="_blank"
                                rel="noreferrer"
                                className={`flex items-center gap-2 font-semibold ${isMe ? "text-white" : "text-[#c9a84c]"}`}
                              >
                                <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                عرض الموقع على الخريطة
                              </a>
                            ) : (
                              m.message && <p className="whitespace-pre-wrap break-words">{m.message}</p>
                            )}
                            {files.length > 0 && (
                              <div className={`grid gap-1.5 ${files.length > 1 ? "grid-cols-2" : "grid-cols-1"} ${m.message && !location ? "mt-2" : ""}`}>
                                {files.map((url, idx) => (
                                  <a key={idx} href={url} target="_blank" rel="noreferrer" className="block">
                                    <img
                                      src={url}
                                      alt="مرفق"
                                      loading="lazy"
                                      className="w-full max-h-44 object-cover rounded-lg border border-black/10"
                                    />
                                  </a>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-1 px-1">
                            <span className="text-[10px] text-gray-400">{formatChatTime(m.created_at)}</span>
                            {isMe && (
                              read ? (
                                <svg className="w-4 h-4 text-sky-500" viewBox="0 0 18 14" fill="currentColor" title="تم القراءة">
                                  <path d="M6.5 10.6 2.9 7l-1 1 4.6 4.6L16.1 3 15.1 2zM12.9 3 11.9 2 7.6 6.3l1 1z" />
                                </svg>
                              ) : (
                                <svg className="w-4 h-4 text-gray-400" viewBox="0 0 18 14" fill="currentColor" title="تم الإرسال">
                                  <path d="M6.5 10.6 2.9 7l-1 1 4.6 4.6L16.1 3 15.1 2z" />
                                </svg>
                              )
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={bottomRef} />
                </div>

                <footer className="px-5 py-4 bg-white border-t border-gray-100">
                  {attachments.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {attachments.map((file, idx) => (
                        <div key={idx} className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-200">
                          <img src={URL.createObjectURL(file)} alt="مرفق" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => removeAttachment(idx)}
                            className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/60 text-white text-xs flex items-center justify-center hover:bg-black"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center gap-2 bg-gray-50 rounded-2xl px-3 py-2 border border-gray-200 focus-within:border-[#c9a84c]/40 focus-within:ring-2 focus-within:ring-[#c9a84c]/10 transition-all">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handlePickFiles}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={sending}
                      title="إرفاق صور"
                      className="w-9 h-9 rounded-xl text-gray-500 hover:text-[#c9a84c] hover:bg-white flex items-center justify-center shrink-0 transition-colors disabled:opacity-40"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={sendLocation}
                      disabled={sending || sendingLocation}
                      title="إرسال الموقع الحالي"
                      className="w-9 h-9 rounded-xl text-gray-500 hover:text-[#c9a84c] hover:bg-white flex items-center justify-center shrink-0 transition-colors disabled:opacity-40"
                    >
                      {sendingLocation ? (
                        <div className="w-4 h-4 border-2 border-[#c9a84c] border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      )}
                    </button>
                    <input
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && !sending && send()}
                      placeholder={`اكتب رسالة إلى ${dName(selected)}...`}
                      dir="rtl"
                      disabled={sending}
                      className="flex-1 bg-transparent text-sm text-right outline-none text-gray-700 placeholder-gray-400 disabled:opacity-50"
                    />
                    <button
                      type="button"
                      onClick={send}
                      disabled={sending || (!inputText.trim() && attachments.length === 0)}
                      className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#9C6402] to-[#E6C76A] flex items-center justify-center text-white shrink-0 hover:opacity-90 transition-opacity disabled:opacity-40 shadow-sm"
                    >
                      {sending ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <SendIcon />
                      )}
                    </button>
                  </div>
                </footer>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-3">
                <div className="text-5xl">💬</div>
                <p className="text-sm font-medium text-gray-500">اختر سائقاً من القائمة</p>
              </div>
            )}
          </section>
        </div>
      </div>

      <style>{`
        @keyframes chatPopIn { from { opacity: 0; transform: scale(0.96) translateY(8px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        @keyframes dropDown   { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }
      `}</style>
    </div>,
    document.body,
  );
}

export default function Layout({ children }) {
  const navigate    = useNavigate();
  const location    = useLocation();
  const { user, signOut, roleLabel } = useAuthContext();
  const [chatOpen,  setChatOpen]  = useState(false);
  const [bellOpen,  setBellOpen]  = useState(false);
  const [accountsOpen, setAccountsOpen] = useState(() => isAccountsChildRoute(location.pathname));
  const unreadCount = useUnreadCount();
  const chatUnreadCount = useChatUnreadCount();
  const { searchQuery, setSearchQuery } = useGlobalSearch();
  const searchPlaceholder = getSearchPlaceholder(location.pathname);

  useEffect(() => {
    initNotificationsCollection();
    const poll = setInterval(syncBackendNotifications, 60_000);
    return () => clearInterval(poll);
  }, []);

  useEffect(() => {
    if (isAccountsChildRoute(location.pathname)) {
      setAccountsOpen(true);
    }
  }, [location.pathname]);

  const { isAdmin, canRoute } = usePermissions();
  const firstName = user?.firstName ?? user?.fullName?.split(" ")[0] ?? "";
  const lastName  = user?.lastName  ?? "";
  const email     = user?.email ?? "";
  const avatar    = user?.imageUrl;

  const navItems = ALL_NAV.filter((item) => isAdmin || canRoute(item.route));
  const accountsChildren = ACCOUNTS_NAV.children.filter((item) => isAdmin || canRoute(item.route));
  const showAccountsNav = accountsChildren.length > 0;

  const renderNavButton = (item) => {
    const active =
      location.pathname === item.route ||
      (item.route !== "/" && location.pathname.startsWith(item.route));

    return (
      <button
        key={item.route}
        onClick={() => navigate(item.route)}
        className={
          "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 text-right group " +
          (active
            ? "text-white shadow-sm scale-[1.01]"
            : "text-gray-400 hover:text-white hover:scale-[1.01]")
        }
        style={active ? { background: "linear-gradient(90deg,#9C6402,#E6C76A)" } : undefined}
        onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = "linear-gradient(90deg,#9C6402,#E6C76A)"; }}
        onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = ""; }}
      >
        <span className={"shrink-0 transition-transform group-hover:scale-110 " + (active ? "text-white" : "text-gray-500 group-hover:text-white")}>
          {item.icon}
        </span>
        <span className="truncate">{item.label}</span>
        {active && <span className="mr-auto w-1.5 h-1.5 bg-white rounded-full shrink-0" />}
      </button>
    );
  };

  const renderAccountsNav = () => {
    const groupActive = isAccountsChildRoute(location.pathname);

    return (
      <div className="space-y-0.5">
        <button
          type="button"
          onClick={() => setAccountsOpen((open) => !open)}
          className={
            "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 text-right group " +
            (groupActive
              ? "text-white shadow-sm scale-[1.01]"
              : "text-gray-400 hover:text-white hover:scale-[1.01]")
          }
          style={groupActive ? { background: "linear-gradient(90deg,#9C6402,#E6C76A)" } : undefined}
          onMouseEnter={(e) => { if (!groupActive) e.currentTarget.style.background = "linear-gradient(90deg,#9C6402,#E6C76A)"; }}
          onMouseLeave={(e) => { if (!groupActive) e.currentTarget.style.background = ""; }}
        >
          <span className={"shrink-0 transition-transform group-hover:scale-110 " + (groupActive ? "text-white" : "text-gray-500 group-hover:text-white")}>
            {ACCOUNTS_NAV.icon}
          </span>
          <span className="truncate flex-1">{ACCOUNTS_NAV.label}</span>
          <svg
            className={`w-3.5 h-3.5 shrink-0 transition-transform ${accountsOpen ? "rotate-180" : ""} ${groupActive ? "text-white" : "text-gray-500 group-hover:text-white"}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {accountsOpen && (
          <div className="mr-3 pr-2 border-r border-[#c9a84c]/20 space-y-0.5">
            {accountsChildren.map((child) => {
              const active =
                location.pathname === child.route ||
                location.pathname.startsWith(`${child.route}/`);

              return (
                <button
                  key={child.route}
                  type="button"
                  onClick={() => navigate(child.route)}
                  className={
                    "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 text-right " +
                    (active
                      ? "bg-[#c9a84c]/20 text-[#f5d98b] border border-[#c9a84c]/25"
                      : "text-gray-500 hover:text-white hover:bg-white/5")
                  }
                >
                  <span className="truncate flex-1">{child.label}</span>
                  {active && <span className="w-1.5 h-1.5 bg-[#c9a84c] rounded-full shrink-0" />}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className="flex h-screen font-sans overflow-hidden"
      dir="rtl"
      style={{ background: "linear-gradient(180deg, #1a1a1a 0%, #1c1800 40%, #1a1a1a 100%)" }}
    >

      {/* ── Sidebar ── */}
      <aside
        className="flex flex-col py-5 shrink-0 w-60 h-screen overflow-hidden z-10"
        style={{ background: "linear-gradient(180deg, #1a1a1a 0%, #1c1800 40%, #1a1a1a 100%)" }}
      >

        {/* Logo */}
        <div className="flex items-center gap-3 px-5 mb-6 shrink-0">
          <div className="w-10 h-10 rounded-xl overflow-hidden border-2 border-[#c9a84c]/40 shrink-0">
            <img src={assetUrl("judy.png")} className="w-full h-full object-cover" alt="Drivo" />
          </div>
          <div>
            <p className="text-white font-extrabold text-base leading-tight">Drivo</p>
            <p className="text-[#c9a84c] text-[10px] font-medium">لوحة التحكم</p>
          </div>
        </div>

        {/* Nav — scrollable */}
        <nav className="flex-1 overflow-y-auto px-3 space-y-0.5 min-h-0 scrollbar-hide" style={{scrollbarWidth:"none"}}>
          {(() => {
            const settingsIndex = navItems.findIndex((item) => item.route === "/settings");
            const beforeSettings = settingsIndex >= 0 ? navItems.slice(0, settingsIndex) : navItems;
            const settingsAndAfter = settingsIndex >= 0 ? navItems.slice(settingsIndex) : [];
            const [firstNavItem, ...restBeforeSettings] = beforeSettings;

            return (
              <>
                {firstNavItem && renderNavButton(firstNavItem)}
                {showAccountsNav && renderAccountsNav()}
                {restBeforeSettings.map((item) => renderNavButton(item))}
                {settingsAndAfter.map((item) => renderNavButton(item))}
              </>
            );
          })()}
        </nav>

        {/* User card — always pinned to bottom */}
        <div className="px-3 pt-4 mt-2 border-t border-[#c9a84c]/20 space-y-2 shrink-0">
          <div className="flex items-center gap-3 px-2 py-2 rounded-xl bg-[#c9a84c]/8 border border-[#c9a84c]/15">
            {avatar ? (
              <img src={avatar} alt={firstName} className="w-9 h-9 rounded-full object-cover shrink-0 border-2 border-[#c9a84c]" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#9C6402] to-[#E6C76A] flex items-center justify-center text-white font-bold text-sm shrink-0">
                {firstName?.[0] ?? "U"}
              </div>
            )}
            <div className="overflow-hidden text-right flex-1 min-w-0">
              <p className="text-white text-xs font-semibold truncate">{firstName} {lastName}</p>
              <p className="text-gray-500 text-[10px] truncate">{email}</p>
              <span className="inline-block mt-0.5 text-[9px] bg-[#c9a84c]/15 text-[#c9a84c] px-2 py-0.5 rounded-full border border-[#c9a84c]/20">
                {roleLabel}
              </span>
            </div>
          </div>
          <button onClick={() => signOut().then(() => navigate("/login"))}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded-xl text-xs font-medium transition-all">
            <LogoutIcon />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </aside>

      {/* ── Main — panel emerging from sidebar ── */}
      <main className="relative z-20 flex-1 flex flex-col overflow-hidden min-w-0 rounded-tr-[32px] rounded-br-[32px] bg-white shadow-[0_0_40px_rgba(0,0,0,0.25)]">

        {/* Topbar */}
        <header className="bg-white border-b border-gray-200/80 px-6 py-3 flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-gray-100 rounded-full px-4 py-2.5 w-64 border border-gray-200 focus-within:border-[#c9a84c]/40 focus-within:ring-2 focus-within:ring-[#c9a84c]/10 transition-all">
              <SearchIcon />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="bg-transparent text-sm outline-none w-full text-right placeholder-gray-400"
                dir="rtl"
              />
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {/* Chat */}
            <button onClick={() => setChatOpen(true)}
              className="relative p-2.5 rounded-xl hover:bg-gray-100 transition-colors text-gray-500 hover:text-gray-800">
              <ChatIcon />
              {chatUnreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-[#c9a84c] text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1 border border-white">
                  {chatUnreadCount > 99 ? "99+" : chatUnreadCount}
                </span>
              )}
            </button>

            {/* Bell + dropdown */}
            <div className="relative">
              <button onClick={() => setBellOpen(o => !o)}
                className="relative p-2.5 rounded-xl hover:bg-gray-100 transition-colors text-gray-500 hover:text-gray-800">
                <BellIcon />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1 border border-white">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </button>
              {bellOpen && <NotificationsDropdown onClose={() => setBellOpen(false)} />}
            </div>

            {/* Divider */}
            <div className="w-px h-6 bg-gray-200 mx-1" />

            {/* User pill */}
            <button onClick={() => navigate("/settings")}
              className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-full px-3 py-1.5 hover:bg-gray-100 transition-colors">
              {avatar ? (
                <img src={avatar} alt={firstName} className="w-6 h-6 rounded-full object-cover" />
              ) : (
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#9C6402] to-[#E6C76A] flex items-center justify-center text-white text-[10px] font-bold">
                  {firstName?.[0] ?? "U"}
                </div>
              )}
              <span className="text-xs font-medium text-gray-700 hidden sm:block">{firstName} {lastName}</span>
            </button>
          </div>
        </header>

        <div className="flex-1 min-h-0 overflow-y-auto p-6 bg-[#f0ede8]">
          <PageTransition>
            {children}
          </PageTransition>
        </div>
      </main>

      <ChatModal isOpen={chatOpen} onClose={() => setChatOpen(false)} currentUser={user} />
    </div>
  );
}