/**
 * إدارة إشعارات البث للسائقين:
 *  - الجلب: GET /api/allnotifications
 *  - الإرسال: POST /api/send-driver-notification
 */

const API_BASE = "/api";
const LIST_URL = `${API_BASE}/allnotifications`;
const SEND_URL = `${API_BASE}/send-driver-notification`;

const STORAGE_KEY = "drivo_broadcast_notifications";
const DELETED_KEY = "drivo_broadcast_notifications_deleted";

function loadLocalNotifications() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function saveLocalNotifications(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

function getDeletedIds() {
  try {
    const raw = localStorage.getItem(DELETED_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return new Set((Array.isArray(list) ? list : []).map(String));
  } catch {
    return new Set();
  }
}

function addDeletedId(id) {
  const set = getDeletedIds();
  set.add(String(id));
  localStorage.setItem(DELETED_KEY, JSON.stringify([...set]));
}

function parseScheduledDate(value) {
  if (!value) return null;
  const s = String(value).trim();
  const match = s.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/);
  if (match) {
    const [, year, month, day, hour, minute, second] = match;
    const d = new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second ?? 0),
    );
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const normalized = s.includes("T") ? s : s.replace(" ", "T");
  const withSeconds = /:\d{2}:\d{2}/.test(normalized) ? normalized : `${normalized}:00`;
  const d = new Date(withSeconds);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function resolveEffectiveStatus(notification) {
  const scheduledAt = notification?.scheduledAt ?? notification?.scheduled_at;
  const scheduled = parseScheduledDate(scheduledAt);
  if (scheduled) {
    return scheduled.getTime() <= Date.now() ? "مرسل" : "مجدول";
  }
  const stored = String(notification?.status ?? "مرسل").trim();
  return stored === "مجدول" ? "مجدول" : stored || "مرسل";
}

function inferTypeFromTitle(title) {
  const value = String(title ?? "").trim();
  if (value.includes("إنذار")) return "إنذار";
  if (value.includes("تنبيه")) return "تنبيه";
  if (value.includes("تهنئة")) return "تهنئة";
  if (value.includes("تذكير")) return "تذكير";
  if (value.includes("عروض")) return "عروض";
  if (value.includes("إعلان")) return "إعلان";
  return "رسالة عادية";
}

function normalizeFromApi(item) {
  return {
    id: String(item.id),
    apiId: item.id,
    title: item.title ?? "",
    content: item.body ?? item.content ?? "",
    type: item.type ?? inferTypeFromTitle(item.title),
    status: "مرسل",
    scheduledAt: item.scheduled_at ?? item.scheduledAt ?? null,
    createdAt: item.created_at ?? item.createdAt ?? null,
    source: "api",
  };
}

function normalizeFromLocal(item) {
  return {
    id: String(item.id),
    apiId: item.apiId ?? null,
    title: item.title ?? "",
    content: item.content ?? item.body ?? "",
    type: item.type ?? "تهنئة",
    status: resolveEffectiveStatus(item),
    scheduledAt: item.scheduled_at ?? item.scheduledAt ?? null,
    createdAt: item.createdAt ?? null,
    source: "local",
  };
}

function sortNewestFirst(list) {
  return [...list].sort((a, b) => {
    const ta = new Date(a.createdAt ?? 0).getTime();
    const tb = new Date(b.createdAt ?? 0).getTime();
    return tb - ta;
  });
}

function persistResolvedLocalStatuses() {
  const list = loadLocalNotifications();
  let changed = false;
  const updated = list.map((item) => {
    const nextStatus = resolveEffectiveStatus(item);
    if (item.status === "مجدول" && nextStatus === "مرسل") {
      changed = true;
      return { ...item, status: "مرسل" };
    }
    return item;
  });
  if (changed) saveLocalNotifications(updated);
  return updated;
}

async function parseJsonResponse(res) {
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      json?.message
      ?? json?.error
      ?? (typeof json?.errors === "object"
        ? Object.values(json.errors).flat().join(" — ")
        : null)
      ?? `خطأ ${res.status}`;
    throw new Error(msg);
  }
  return json;
}

export function syncScheduledStatuses() {
  persistResolvedLocalStatuses();
}

export function normalizeNotification(docSnap) {
  const d = docSnap?.data?.() ? docSnap.data() : docSnap;
  return normalizeFromLocal(d);
}

export function fmtDate(ts) {
  if (!ts) return "—";
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  if (Number.isNaN(d.getTime())) return String(ts);
  return d.toLocaleString("ar-EG", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** POST /api/send-driver-notification */
export async function sendDriverNotification(payload) {
  const isScheduled = payload.status === "مجدول" && payload.scheduled_at;

  if (isScheduled) {
    const entry = {
      id: `local-${Date.now()}`,
      title: payload.title ?? "",
      content: payload.content ?? payload.body ?? "",
      type: payload.type ?? "تهنئة",
      status: "مجدول",
      scheduled_at: payload.scheduled_at,
      createdAt: new Date().toISOString(),
      createdByAdmin: true,
    };
    const list = loadLocalNotifications();
    list.unshift(entry);
    saveLocalNotifications(list);
    return { notification: entry, apiResponse: null };
  }

  const res = await fetch(SEND_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      title: payload.title ?? "",
      body: payload.content ?? payload.body ?? "",
    }),
  });

  const json = await parseJsonResponse(res);

  const entry = {
    id: `local-${Date.now()}`,
    title: payload.title ?? "",
    content: payload.content ?? payload.body ?? "",
    type: payload.type ?? inferTypeFromTitle(payload.title),
    status: "مرسل",
    scheduled_at: null,
    createdAt: new Date().toISOString(),
    apiId: json?.data?.id ?? json?.id ?? null,
    createdByAdmin: true,
  };

  const list = loadLocalNotifications();
  list.unshift(entry);
  saveLocalNotifications(list);

  return { apiResponse: json, notification: entry };
}

/** GET /api/allnotifications */
export async function fetchAllDriverNotifications() {
  const deleted = getDeletedIds();
  let apiList = [];

  try {
    const res = await fetch(LIST_URL, { headers: { Accept: "application/json" } });
    const json = await parseJsonResponse(res);
    apiList = Array.isArray(json?.data) ? json.data : (Array.isArray(json) ? json : []);
  } catch (err) {
    throw new Error(err.message || "فشل تحميل الإشعارات");
  }

  const apiById = new Map(apiList.map((item) => [String(item.id), item]));
  const apiKeys = new Set(
    apiList.map((item) => `${String(item.title ?? "").trim()}|${String(item.body ?? item.content ?? "").trim()}`),
  );

  const localScheduled = persistResolvedLocalStatuses()
    .filter((loc) => resolveEffectiveStatus(loc) === "مجدول")
    .filter((loc) => !deleted.has(String(loc.id)) && !deleted.has(String(loc.apiId ?? "")))
    .filter((loc) => {
      const key = `${String(loc.title ?? "").trim()}|${String(loc.content ?? "").trim()}`;
      return !apiKeys.has(key);
    })
    .map(normalizeFromLocal);

  const apiNotifications = apiList
    .filter((item) => !deleted.has(String(item.id)))
    .map((item) => normalizeFromApi(item));

  return sortNewestFirst(
    [...apiNotifications, ...localScheduled].map((n) => ({
      ...n,
      status: resolveEffectiveStatus(n),
    })),
  );
}

export async function deleteDriverNotification(id) {
  const sid = String(id);
  const list = loadLocalNotifications().filter(
    (n) => String(n.id) !== sid && String(n.apiId) !== sid,
  );
  saveLocalNotifications(list);
  addDeletedId(sid);
}

export async function resendDriverNotification(notification) {
  return sendDriverNotification({
    title: notification.title,
    content: notification.content,
    type: notification.type,
    status: "مرسل",
  });
}
