/**
 * إدارة إشعارات البث للسائقين:
 *  - الإرسال: POST /api/notifications/drivers/send
 *  - القائمة: السجل المحلي فقط (إشعارات أنشأها الأدمن من النموذج)
 *  - الـ API يُستخدم فقط لربط/تحديث الإشعارات المحلية، وليس لعرض إشعارات النظام
 */

const API_BASE = "https://drivo1.elmoroj.com/api";
const SEND_URL = `${API_BASE}/notifications/drivers/send`;
const LIST_URL = `${API_BASE}/general-notifications`;

const STORAGE_KEY = "drivo_broadcast_notifications";
const DELETED_KEY = "drivo_broadcast_notifications_deleted";

// ── Local storage helpers ───────────────────────────────────────

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

  // صيغ محلية شائعة: 2026-07-01 10:10:00 أو 2026-07-01T10:10
  const match = s.match(
    /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/
  );
  if (match) {
    const [, year, month, day, hour, minute, second] = match;
    const d = new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second ?? 0)
    );
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const normalized = s.includes("T") ? s : s.replace(" ", "T");
  const withSeconds = /:\d{2}:\d{2}/.test(normalized)
    ? normalized
    : `${normalized}:00`;
  const d = new Date(withSeconds);
  return Number.isNaN(d.getTime()) ? null : d;
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

/** يحوّل «مجدول» إلى «مرسل» إذا انتهى وقت الجدولة */
export function resolveEffectiveStatus(notification) {
  const scheduledAt = notification?.scheduledAt ?? notification?.scheduled_at;
  const scheduled = parseScheduledDate(scheduledAt);

  if (scheduled) {
    return scheduled.getTime() <= Date.now() ? "مرسل" : "مجدول";
  }

  const stored = String(notification?.status ?? "مرسل").trim();
  return stored === "مجدول" ? "مجدول" : stored || "مرسل";
}

function contentOf(item) {
  return item?.body ?? item?.content ?? "";
}

function linkLocalToApi(localList, apiList) {
  let changed = false;
  const updated = localList.map((loc) => {
    if (loc.apiId) return loc;
    const match = apiList.find(
      (api) =>
        String(api.title ?? "").trim() === String(loc.title ?? "").trim() &&
        String(contentOf(api)).trim() === String(loc.content ?? "").trim()
    );
    if (match) {
      changed = true;
      return { ...loc, apiId: match.id };
    }
    return loc;
  });
  if (changed) saveLocalNotifications(updated);
  return updated;
}

function normalizeFromApi(item, localMeta) {
  const apiId = item.id != null ? String(item.id) : "";
  const scheduledAt =
    item.scheduled_at ?? item.scheduledAt ?? localMeta?.scheduled_at ?? null;
  const baseStatus = item.status ?? localMeta?.status ?? "مرسل";

  return {
    id: apiId || localMeta?.id || `api-${Date.now()}`,
    apiId: item.id ?? localMeta?.apiId ?? null,
    title: item.title ?? localMeta?.title ?? "",
    content: contentOf(item) || localMeta?.content || "",
    type: item.type ?? localMeta?.type ?? "تهنئة",
    status: resolveEffectiveStatus({ status: baseStatus, scheduledAt }),
    scheduledAt,
    createdAt: item.created_at ?? item.createdAt ?? localMeta?.createdAt ?? null,
    source: "api",
  };
}

function normalizeFromLocal(item) {
  return {
    id: String(item.id),
    apiId: item.apiId ?? null,
    title: item.title ?? "",
    content: item.content ?? "",
    type: item.type ?? "تهنئة",
    status: resolveEffectiveStatus(item),
    scheduledAt: item.scheduled_at ?? null,
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

// ── Public API ────────────────────────────────────────────────

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

export async function sendDriverNotification(payload) {
  const res = await fetch(SEND_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const errMsg = json?.errors
      ? Object.values(json.errors).flat().join(" | ")
      : json?.message ?? `خطأ ${res.status}`;
    throw new Error(errMsg);
  }

  const entry = {
    id: `local-${Date.now()}`,
    title: payload.title ?? "",
    content: payload.content ?? "",
    type: payload.type ?? "تهنئة",
    status: payload.status ?? "مرسل",
    scheduled_at: payload.scheduled_at ?? null,
    createdAt: new Date().toISOString(),
    apiId: json?.data?.id ?? json?.id ?? null,
    createdByAdmin: true,
  };

  const list = loadLocalNotifications();
  list.unshift(entry);
  saveLocalNotifications(list);

  return { apiResponse: json, notification: entry };
}

export async function fetchAllDriverNotifications() {
  const deleted = getDeletedIds();
  let apiList = [];

  try {
    const res = await fetch(LIST_URL, { headers: { Accept: "application/json" } });
    const json = await res.json().catch(() => ({}));
    if (res.ok) {
      apiList = json?.data ?? (Array.isArray(json) ? json : []);
    }
  } catch {
    apiList = [];
  }

  const apiById = new Map(apiList.map((item) => [String(item.id), item]));
  const localList = linkLocalToApi(persistResolvedLocalStatuses(), apiList);

  // عرض إشعارات الأدمن فقط — لا إشعارات النظام (رحلات، مرتجعات، …)
  const result = localList
    .filter((loc) => loc.createdByAdmin !== false)
    .filter(
      (loc) =>
        !deleted.has(String(loc.id)) &&
        !deleted.has(String(loc.apiId ?? ""))
    )
    .map((loc) => {
      const apiItem = loc.apiId ? apiById.get(String(loc.apiId)) : null;
      if (apiItem) return normalizeFromApi(apiItem, loc);
      return normalizeFromLocal(loc);
    });

  return sortNewestFirst(
    result.map((n) => ({
      ...n,
      status: resolveEffectiveStatus(n),
    }))
  );
}

export async function deleteDriverNotification(id) {
  const sid = String(id);
  const list = loadLocalNotifications().filter(
    (n) => String(n.id) !== sid && String(n.apiId) !== sid
  );
  saveLocalNotifications(list);
  addDeletedId(sid);
}

export async function resendDriverNotification(notification) {
  const payload = {
    title: notification.title,
    content: notification.content,
    type: notification.type,
    status: "مرسل",
  };
  return sendDriverNotification(payload);
}
