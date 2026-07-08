import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../lib/firebase";

const COL = "notifications";
const API = "https://drivo1.elmoroj.com/api";
const BROADCAST_STORAGE_KEY = "drivo_broadcast_notifications";

/** عناوين إنشاء الإشعارات اليدوي — ليست أحداث نظام */
const BROADCAST_TYPE_TITLES = new Set([
  "تهنئة", "تنبيه", "إنذار", "إعلان", "تذكير", "عروض", "رسالة عادية",
]);

/** عناوين/نصوص أحداث النظام المعتمدة في الجرس فقط */
const SYSTEM_EVENT_RE = [
  /إضافة\s*رحلة/i,
  /رحلة\s*جديد/i,
  /رحلة/i,
  /تحديث\s*حالة\s*المرتجع/i,
  /مرتجع/i,
  /إضافة\s*سائق/i,
  /سائق\s*جديد/i,
  /سائق/i,
  /إضافة\s*عميل/i,
  /عميل\s*جديد/i,
  /عميل/i,
  /راكب/i,
  /موافقة/i,
  /دفعة/i,
  /مكافأ/i,
];

function notificationText(item) {
  const title = String(item?.title ?? item?.type ?? "").trim();
  const body = String(item?.body ?? item?.content ?? "").trim();
  return `${title} ${body}`.trim();
}

/** هل الإشعار حدث نظام (رحلة / مرتجع / سائق / عميل…) وليس بثاً للسائقين؟ */
export function isSystemEventNotification(item) {
  if (!item) return false;
  const title = String(item?.title ?? item?.type ?? "").trim();
  if (BROADCAST_TYPE_TITLES.has(title)) return false;
  const text = notificationText(item);
  if (!text) return false;
  if (/مرحبا بك في نظام الإشعارات/i.test(text)) return false;
  return SYSTEM_EVENT_RE.some((re) => re.test(text));
}

/** Unread if `read` is false/missing or legacy API `status` is not read. */
export function isNotificationUnread(n) {
  if (!n) return false;
  if (n.read === true) return false;
  if (n.read === false) return true;
  if (n.status === "read" || n.status === "مقروء") return false;
  return true;
}

function loadBroadcastApiIds() {
  try {
    const raw = localStorage.getItem(BROADCAST_STORAGE_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return new Set(
      (Array.isArray(list) ? list : [])
        .map((n) => String(n.apiId))
        .filter(Boolean)
    );
  } catch {
    return new Set();
  }
}

function loadBroadcastKeys() {
  try {
    const raw = localStorage.getItem(BROADCAST_STORAGE_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return new Set(
      (Array.isArray(list) ? list : []).map((n) =>
        `${String(n.title ?? "").trim()}|${String(n.content ?? "").trim()}`
      )
    );
  } catch {
    return new Set();
  }
}

/** إشعارات الإنشاء اليدوي من إدارة الإشعارات — لا تظهر في الجرس */
export function isAdminBroadcastItem(item) {
  if (!item) return false;
  if (item.category === "broadcast" || item.createdByAdmin) return true;

  const apiIds = loadBroadcastApiIds();
  if (item.id != null && apiIds.has(String(item.id))) return true;
  if (item.backendId != null && apiIds.has(String(item.backendId))) return true;

  const title = String(item.title ?? item.type ?? "").trim();
  const body = String(item.body ?? item.content ?? "").trim();
  if (title && loadBroadcastKeys().has(`${title}|${body}`)) return true;

  return false;
}

function isSystemBellItem(n) {
  if (!n || isAdminBroadcastItem(n)) return false;
  return isSystemEventNotification(n);
}

function normalizeSystemNotification(item, source) {
  const title = item.title ?? item.type ?? "إشعار";
  const body = item.content ?? item.body ?? "";
  return {
    title,
    body,
    driverId: String(item.driver_id ?? ""),
    type: "system",
    category: "system",
    source,
    backendId: item.id != null ? String(item.id) : null,
    read: item.status === "read" || item.status === "مقروء",
    apiCreatedAt: item.created_at ?? item.createdAt ?? null,
  };
}

async function markBackendAllRead() {
  const res = await fetch(`${API}/drivo/admin/notifications/mark-read`, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

async function fetchGeneralNotifications() {
  const res = await fetch(`${API}/general-notifications`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) return [];
  const json = await res.json().catch(() => ({}));
  return json?.data ?? (Array.isArray(json) ? json : []);
}

async function fetchAdminNotifications() {
  const res = await fetch(`${API}/drivo/admin/notifications`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) return [];
  const json = await res.json().catch(() => []);
  return Array.isArray(json) ? json : [];
}

export async function initNotificationsCollection() {
  try {
    await syncBackendNotifications();
  } catch (e) {
    console.error("[Notifications] Init failed:", e.message);
  }
}

export async function saveNotification(data) {
  if (isAdminBroadcastItem(data) || !isSystemEventNotification(data)) return null;
  return addDoc(collection(db, COL), {
    title: data.title ?? "",
    body: data.body ?? data.message ?? "",
    driverId: String(data.driverId ?? data.driver_id ?? ""),
    type: data.type ?? "system",
    category: "system",
    read: false,
    createdAt: serverTimestamp(),
  });
}

export async function sendDriverNotification(payload) {
  const res = await fetch(`${API}/send-driver-notification`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? `HTTP ${res.status}`);
  }
  await saveNotification({
    title: payload.title ?? payload.notification?.title ?? "إشعار",
    body: payload.body ?? payload.notification?.body ?? "",
    driverId: payload.driver_id ?? "",
    type: "driver",
    category: "system",
  });
  return res.json().catch(() => ({}));
}

export async function markAsRead(docId) {
  await updateDoc(doc(db, COL, docId), { read: true });
}

export async function markAllAsRead() {
  try {
    await markBackendAllRead();
  } catch (e) {
    console.warn("[Notifications] API mark-read:", e.message);
  }

  const snap = await getDocs(collection(db, COL));
  const updates = snap.docs
    .filter((d) => isSystemBellItem(d.data()) && isNotificationUnread(d.data()))
    .map((d) => updateDoc(d.ref, { read: true }));
  await Promise.all(updates);
}

export function subscribeNotifications(callback) {
  const q = query(collection(db, COL), orderBy("createdAt", "desc"));
  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter(isSystemBellItem);
      callback(items);
    },
    (err) => console.error("[Notifications] listener:", err.message)
  );
}

/** مزامنة إشعارات النظام (رحلات، مرتجعات، سائقين، عملاء…) للجرس */
export async function syncBackendNotifications() {
  try {
    const [general, admin] = await Promise.all([
      fetchGeneralNotifications(),
      fetchAdminNotifications(),
    ]);

    const systemItems = [
      ...general
        .filter((item) => isSystemEventNotification(item) && !isAdminBroadcastItem(item))
        .map((item) => normalizeSystemNotification(item, "general")),
      ...admin
        .filter((item) => isSystemEventNotification(item) && !isAdminBroadcastItem(item))
        .map((item) => normalizeSystemNotification(item, "admin")),
    ];

    if (!systemItems.length) return;

    const existing = await getDocs(collection(db, COL));
    const keys = new Set(
      existing.docs.map((d) => {
        const x = d.data();
        return `${x.source ?? ""}|${x.backendId ?? ""}|${x.title ?? ""}|${x.body ?? ""}`;
      })
    );

    const writes = systemItems
      .filter((item) => {
        const k = `${item.source}|${item.backendId ?? ""}|${item.title}|${item.body}`;
        return !keys.has(k);
      })
      .map((item) =>
        addDoc(collection(db, COL), {
          ...item,
          createdAt: serverTimestamp(),
        })
      );

    await Promise.all(writes);
    if (writes.length) {
      console.log("[Notifications] Synced", writes.length, "system items");
    }
  } catch (e) {
    console.warn("[Sync failed]", e.message);
  }
}
