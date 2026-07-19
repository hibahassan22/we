import { normalizeMediaUrl } from "../lib/driverMedia.js";

const API_BASE = "https://drivo1.elmoroj.com/api";

function asList(json) {
  if (Array.isArray(json)) return json;
  if (Array.isArray(json?.data)) return json.data;
  if (Array.isArray(json?.brokers)) return json.brokers;
  return [];
}

export function generateBrokerCode() {
  const n = Math.floor(1000 + Math.random() * 9000);
  return `MED-${n}#`;
}

/** UI label ↔ API value */
export function commissionTypeToApi(value) {
  const v = String(value ?? "").trim().toLowerCase();
  if (v === "نقدي" || v === "cash") return "cash";
  if (v === "نسبة مئوية" || v === "percent" || v === "percentage") return "percent";
  return "cash";
}

export function commissionTypeFromApi(value) {
  const v = String(value ?? "").trim().toLowerCase();
  if (v === "cash" || v === "نقدي") return "نقدي";
  return "نسبة مئوية";
}

/** هاتف الواجهة (10 أرقام تبدأ بـ 5) → صيغة API 9665xxxxxxxxx */
export function brokerPhoneToApi(phone) {
  let digits = String(phone ?? "").replace(/\D/g, "");
  if (digits.startsWith("966")) digits = digits.slice(3);
  if (digits.startsWith("0")) digits = digits.slice(1);
  if (digits.length === 10 && digits.startsWith("5")) return `966${digits}`;
  if (digits.length === 9 && digits.startsWith("5")) return `966${digits}`;
  return digits ? `966${digits}` : "";
}

export function normalizeBroker(item) {
  if (!item) return null;
  const rawImage =
    item.national_id_image ??
    item.national_id_image_url ??
    item.photo_url ??
    item.image_url ??
    item.photo ??
    "";
  const rawPath = typeof rawImage === "string" ? rawImage.trim() : "";
  const photoUrl = normalizeMediaUrl(rawPath);

  return {
    id: item.id,
    name: item.name ?? item.full_name ?? "",
    last_name: item.last_name ?? "",
    phone: item.phone ?? "",
    email: item.email ?? "",
    address: item.address ?? item.city ?? "",
    broker_code: item.code ?? item.broker_code ?? generateBrokerCode(),
    code: item.code ?? item.broker_code ?? "",
    commission: Number(item.commission ?? item.commission_percent ?? item.commission_value ?? 0) || 0,
    commission_type: commissionTypeFromApi(item.commission_type),
    balance: Number(item.balance ?? item.wallet ?? 0) || 0,
    completed_trips: Number(item.completed_trips ?? item.completed_trips_count ?? 0) || 0,
    trips_count: Number(item.trips_count ?? 0) || 0,
    active_trips: Number(item.active_trips ?? item.active_trips_count ?? item.trips_count ?? 0) || 0,
    clients_count: Number(item.clients_count ?? item.total_clients ?? 0) || 0,
    nationality: item.nationality ?? "",
    identity_number: item.national_id ?? item.identity_number ?? item.id_number ?? "",
    national_id: item.national_id ?? item.identity_number ?? item.id_number ?? "",
    national_id_image: photoUrl,
    national_id_image_raw: rawPath,
    photo_url: photoUrl,
    driver_id: item.driver_id ?? item.driverId ?? item.driver?.id ?? null,
    is_driver_broker: Boolean(
      item.driver_id ?? item.driverId ?? item.driver?.id ??
      item.is_driver ?? item.from_driver ??
      (String(item.type ?? item.broker_type ?? "").toLowerCase() === "driver")
    ),
    bank_name: item.bank_name ?? "",
    account_owner: item.account_holder_name ?? item.account_owner ?? "",
    account_holder_name: item.account_holder_name ?? item.account_owner ?? "",
    account_number: item.account_number ?? item.bank_account_number ?? "",
    status: item.status ?? "active",
    notes: item.notes ?? "",
  };
}

function appendFormData(fd, key, value) {
  if (value == null || value === "") return;
  fd.append(key, value instanceof File ? value : String(value));
}

/** يبني FormData حسب عقد الـ API */
export function buildBrokerFormData(payload) {
  const fd = new FormData();
  appendFormData(fd, "name", String(payload.name ?? "").trim());
  appendFormData(fd, "code", String(payload.code ?? payload.broker_code ?? "").trim() || generateBrokerCode());
  appendFormData(fd, "phone", brokerPhoneToApi(payload.phone));
  appendFormData(fd, "national_id", String(payload.national_id ?? payload.identity_number ?? "").trim());
  appendFormData(fd, "commission_type", commissionTypeToApi(payload.commission_type));
  appendFormData(fd, "commission", Number(payload.commission) || 0);
  appendFormData(fd, "bank_name", String(payload.bank_name ?? "").trim());
  appendFormData(fd, "account_number", String(payload.account_number ?? "").trim());
  appendFormData(
    fd,
    "account_holder_name",
    String(payload.account_holder_name ?? payload.account_owner ?? "").trim(),
  );

  const image = payload.national_id_image ?? payload.photo;
  if (image instanceof File) {
    fd.append("national_id_image", image);
  }

  return fd;
}

async function parseBrokerResponse(res) {
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      (typeof json?.errors === "object"
        ? Object.values(json.errors).flat().join(" — ")
        : null) ||
      json?.message ||
      json?.error ||
      `خطأ ${res.status}`;
    throw new Error(msg);
  }
  return normalizeBroker(json?.broker ?? json?.data ?? json);
}

/** GET /api/brokers */
export async function fetchBrokers(signal) {
  const res = await fetch(`${API_BASE}/brokers`, {
    headers: { Accept: "application/json" },
    signal,
  });
  if (!res.ok) throw new Error(`فشل تحميل الوسطاء (${res.status})`);
  const json = await res.json();
  return asList(json).map(normalizeBroker).filter(Boolean);
}

/** GET /api/brokers/:id */
export async function fetchBrokerById(id, signal) {
  if (id == null || id === "") throw new Error("معرّف الوسيط غير متوفر");
  const res = await fetch(`${API_BASE}/brokers/${id}`, {
    headers: { Accept: "application/json" },
    signal,
  });
  if (!res.ok) throw new Error(`فشل تحميل تفاصيل الوسيط (${res.status})`);
  const json = await res.json();
  return normalizeBroker(json?.broker ?? json?.data ?? json);
}

/** GET /api/brokers/:id/trips — تفاصيل رحلات الوسيط */
export async function fetchBrokerTrips(id, signal) {
  if (id == null || id === "") throw new Error("معرّف الوسيط غير متوفر");
  const res = await fetch(`${API_BASE}/brokers/${id}/trips`, {
    headers: { Accept: "application/json" },
    signal,
  });
  if (!res.ok) throw new Error(`فشل تحميل رحلات الوسيط (${res.status})`);
  const json = await res.json();
  const list = Array.isArray(json?.data) ? json.data : asList(json);
  return list.map((t) => {
    const totalPrice = Number(t.total_price ?? t.price ?? 0) || 0;
    const amountPaid = Number(t.amount_paid ?? 0) || 0;
    const remaining = t.remaining_amount != null
      ? Number(t.remaining_amount) || 0
      : Math.max(0, totalPrice - amountPaid);
    return {
      id: t.id ?? t.trip_id,
      from: t.from ?? t.from_location ?? "",
      to: t.to ?? t.to_location ?? "",
      status: t.status ?? t.trip_status ?? "",
      total_price: totalPrice,
      amount_paid: amountPaid,
      remaining_amount: remaining,
      our_commission: Number(t.our_commission ?? 0) || 0,
      broker_commission: Number(t.broker_commission ?? 0) || 0,
    };
  });
}

/** POST /api/brokers — FormData */
export async function createBroker(payload) {
  const res = await fetch(`${API_BASE}/brokers`, {
    method: "POST",
    headers: { Accept: "application/json" },
    body: buildBrokerFormData(payload),
  });
  return parseBrokerResponse(res);
}

/** POST /api/brokers/:id — FormData (فيه صورة) */
export async function updateBroker(id, payload) {
  if (id == null || id === "") throw new Error("معرّف الوسيط غير متوفر");
  const res = await fetch(`${API_BASE}/brokers/${id}`, {
    method: "POST",
    headers: { Accept: "application/json" },
    body: buildBrokerFormData(payload),
  });
  return parseBrokerResponse(res);
}

/** DELETE /api/brokers/:id */
export async function deleteBroker(id) {
  if (id == null || id === "") throw new Error("معرّف الوسيط غير متوفر");
  const res = await fetch(`${API_BASE}/brokers/${id}`, {
    method: "DELETE",
    headers: { Accept: "application/json" },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json?.message || json?.error || `فشل حذف الوسيط (${res.status})`);
  }
  return true;
}
