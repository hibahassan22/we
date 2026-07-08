const API_BASE = "https://drivo1.elmoroj.com/api";

export const DRIVER_STATUS_COLORS = {
  1: "bg-green-100 text-green-700 border border-green-200",
  2: "bg-blue-100 text-blue-700 border border-blue-200",
  3: "bg-red-100 text-red-600 border border-red-200",
  4: "bg-amber-100 text-amber-700 border border-amber-200",
};

export const DRIVER_STATUS_BUTTON_COLORS = {
  1: "bg-green-600 text-white",
  2: "bg-blue-500 text-white",
  3: "bg-red-600 text-white",
  4: "bg-amber-500 text-white",
};

export const FALLBACK_DRIVER_STATUSES = [
  { id: 1, name: "نشط" },
  { id: 2, name: "مجمد" },
  { id: 3, name: "محظور" },
  { id: 4, name: "موقوف مؤقتا" },
];

export function getPauseStatusId(statuses = FALLBACK_DRIVER_STATUSES) {
  return statuses.find((s) => s.id === 4 || s.name?.includes("موقوف"))?.id ?? 4;
}

export function durationToStopUntil(duration) {
  const d = new Date();
  if (duration === "48 ساعة") d.setDate(d.getDate() + 2);
  else if (duration === "أسبوع") d.setDate(d.getDate() + 7);
  else d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
}

function formatApiError(json) {
  if (json?.errors && typeof json.errors === "object") {
    const messages = Object.values(json.errors).flat().filter(Boolean);
    if (messages.length) return messages.join(" — ");
  }
  return json?.message || json?.error || "حدث خطأ";
}

export async function fetchDriverStatuses() {
  const res = await fetch(`${API_BASE}/driver-statuses`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`فشل تحميل الحالات (${res.status})`);
  const data = await res.json();
  return Array.isArray(data) && data.length ? data : FALLBACK_DRIVER_STATUSES;
}

function normalizeStatusId(id) {
  if (id == null || id === "") return null;
  const n = Number(id);
  return Number.isFinite(n) ? n : null;
}

/** استخراج رقم الحالة — نثق في status من البروفايل أولاً */
export function resolveDriverStatusId(driver, statuses = FALLBACK_DRIVER_STATUSES) {
  if (!driver) return null;

  const raw = driver.status ?? driver.status_id ?? driver.driver_status_id;
  const numeric = normalizeStatusId(raw);

  if (numeric != null && numeric >= 1 && numeric <= 4) {
    return numeric;
  }

  const pauseId = getPauseStatusId(statuses);

  if (driver.stop_until) {
    const until = new Date(driver.stop_until);
    if (!Number.isNaN(until.getTime()) && until > new Date()) return pauseId;
  }

  if (typeof raw === "string" && raw.trim()) {
    const byName = statuses.find(
      (s) => s.name === raw || s.name?.includes(raw) || raw.includes(s.name ?? ""),
    );
    if (byName) return byName.id;
  }

  return numeric;
}

export async function fetchDriverById(driverId) {
  if (!driverId) throw new Error("معرّف السائق غير متوفر");
  const res = await fetch(`${API_BASE}/drivers/${driverId}`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`فشل تحميل بيانات السائق (${res.status})`);
  const json = await res.json();
  return json?.data ?? json?.driver ?? json;
}

export function normalizeDriverStatusFields(driver, statuses = FALLBACK_DRIVER_STATUSES) {
  if (!driver) return driver;
  const status = resolveDriverStatusId(driver, statuses);
  return status != null ? { ...driver, status } : driver;
}

export function createDriverStatusHelpers(statuses = FALLBACK_DRIVER_STATUSES) {
  const list = statuses.length ? statuses : FALLBACK_DRIVER_STATUSES;
  const byId = new Map();

  list.forEach((s) => {
    byId.set(s.id, s);
    byId.set(String(s.id), s);
    byId.set(Number(s.id), s);
  });

  const findByName = (...names) =>
    list.find((s) => names.some((n) => s.name === n || s.name?.includes(n)));

  const statusLabel = (id) => {
    const key = normalizeStatusId(id);
    if (key != null && byId.get(key)?.name) return byId.get(key).name;
    if (typeof id === "string" && id.trim()) {
      const byName = list.find((s) => s.name === id || s.name?.includes(id) || id.includes(s.name ?? ""));
      if (byName?.name) return byName.name;
      return id;
    }
    return "غير مسجل";
  };

  const statusColor = (id) => {
    const key = normalizeStatusId(id);
    return (key != null && DRIVER_STATUS_COLORS[key]) || "bg-gray-100 text-gray-500 border border-gray-200";
  };

  const statusIdForAction = {
    pause: getPauseStatusId(list),
    freeze: findByName("مجمد")?.id ?? 2,
    block: findByName("محظور")?.id ?? 3,
    active: findByName("نشط")?.id ?? 1,
  };

  return { statuses: list, statusLabel, statusColor, statusIdForAction };
}

export function statusButtonClass(statusId, isCurrent = false) {
  const key = normalizeStatusId(statusId);
  const base = (key != null && DRIVER_STATUS_BUTTON_COLORS[key]) || "bg-gray-500 text-white";
  if (isCurrent) return `${base} opacity-60 cursor-not-allowed ring-2 ring-offset-1 ring-gray-300`;
  return `${base} hover:opacity-90`;
}

export function isSameDriverStatus(a, b) {
  const na = normalizeStatusId(a);
  const nb = normalizeStatusId(b);
  return na != null && nb != null && na === nb;
}

export async function updateDriverStatus(driverId, statusId, options = {}) {
  if (!driverId || statusId == null) throw new Error("بيانات السائق أو الحالة غير متوفرة");

  const fd = new FormData();
  fd.append("status", String(statusId));

  const pauseId = options.pauseStatusId ?? getPauseStatusId();
  if (Number(statusId) === Number(pauseId)) {
    const stopUntil = options.stopUntil ?? (() => {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      return d.toISOString().split("T")[0];
    })();
    const stopReason = String(options.stopReason ?? "").trim();
    if (!stopUntil) throw new Error("يجب تحديد تاريخ نهاية الإيقاف");
    if (!stopReason) throw new Error("يجب إدخال سبب الإيقاف المؤقت");
    fd.append("stop_until", stopUntil);
    fd.append("stop_reason", stopReason);
  }

  const res = await fetch(`${API_BASE}/driverstest/update/${driverId}`, {
    method: "POST",
    headers: { Accept: "application/json" },
    body: fd,
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(formatApiError(json));
  }

  const updated = json?.driver ?? json?.data ?? json;
  const resolvedStatus = normalizeStatusId(updated?.status) ?? normalizeStatusId(statusId);
  return { ...json, status: resolvedStatus, driver: updated };
}

export async function sendDriverNotification(driverId, title, body) {
  if (!driverId) throw new Error("معرّف السائق غير متوفر");

  const res = await fetch(`${API_BASE}/send-driver-notification`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ driver_id: driverId, title, body }),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.message || `خطأ ${res.status}`);
  return json;
}
