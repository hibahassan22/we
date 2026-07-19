const API_BASE = "/api";

export const TRIP_STATUS_OPTIONS = [
  { value: "قيد التنفيذ", label: "قيد التنفيذ" },
  { value: "تم", label: "تم" },
  { value: "ملغية", label: "ملغية" },
  { value: "معلقة", label: "معلقة" },
  { value: "موقوفة", label: "موقوفة" },
];

const WITHOUT_DRIVER_STATUS_MAP = {
  pending: "معلقة",
  suspended: "معلقة",
  completed: "تم",
  offered: "معروضة",
  cancelled: "ملغية",
  progress: "قيد التنفيذ",
  in_progress: "قيد التنفيذ",
};

function normalizeTripResponse(raw) {
  return raw?.data ?? raw?.trip ?? raw ?? null;
}

function parseTripListResponse(json) {
  if (Array.isArray(json)) return json;
  return json?.data ?? json?.trips ?? json?.value ?? [];
}

export function normalizeWithoutDriverTrip(trip) {
  if (!trip) return trip;
  return {
    ...trip,
    trip_status: trip.trip_status ?? WITHOUT_DRIVER_STATUS_MAP[trip.status] ?? trip.status,
    customer_phone: trip.customer_phone ?? trip.main_passenger?.phone,
    region: trip.region ?? trip.city,
    _supportsAddPayment: true,
  };
}

/** استخراج قائمة الركاب من بيانات الرحلة */
export function extractTripPassengers(trip) {
  if (!trip) return [];

  const list = [];
  const seen = new Set();

  const add = (p, isMain = false) => {
    if (!p || typeof p !== "object") return;

    let customerId = p.customer_id ?? p.customer?.id ?? null;
    let passengerId = p.passenger_id ?? p.trip_passenger_id ?? null;
    const rawId = p.id ?? null;

    if (rawId != null) {
      if (customerId != null && String(rawId) !== String(customerId)) {
        passengerId = passengerId ?? rawId;
      } else if (customerId == null) {
        // id بدون customer_id = معرّف صف الراكب في الرحلة وليس العميل
        passengerId = passengerId ?? rawId;
      }
    }

    const name = p.full_name ?? p.name ?? p.customer_name;
    const phone = p.phone ?? p.customer_phone ?? p.customer?.phone;

    if (!name && !phone && passengerId == null && customerId == null) return;

    const key = customerId != null
      ? `customer:${customerId}`
      : passengerId != null
        ? `passenger:${passengerId}`
        : `name:${name}:${phone}`;
    if (seen.has(key)) return;
    seen.add(key);

    list.push({
      passengerId,
      customerId,
      name: name ?? "—",
      phone: phone ?? "—",
      nationality: p.nationality,
      gender: p.gender,
      isMain: isMain || Boolean(p.is_main ?? p.isMain),
    });
  };

  const mainPassenger =
    trip.main_passenger ??
    trip["الراكب الاساسى"] ??
    trip["الراكب الأساسي"];

  if (mainPassenger) add(mainPassenger, true);

  const arrays = [
    trip.passengers,
    trip.trip_passengers,
    trip.customers,
    trip.passenger_list,
  ];
  arrays.forEach((arr) => {
    if (Array.isArray(arr)) arr.forEach((p) => add(p));
  });

  if (!list.length && (trip.customer_name || trip.customer_phone || trip.customer_id)) {
    add({
      customer_id: trip.customer_id,
      full_name: trip.customer_name,
      phone: trip.customer_phone,
    }, true);
  }

  return list;
}

export function normalizeRegularTrip(trip) {
  if (!trip) return trip;
  return { ...trip, _supportsAddPayment: false };
}

function mergeTripLists(primary = [], secondary = []) {
  const map = new Map();
  for (const trip of [...primary, ...secondary]) {
    const id = trip?.id ?? trip?.trip_id;
    if (id == null) continue;
    const key = String(id);
    if (!map.has(key)) map.set(key, trip);
  }
  return [...map.values()];
}

/** رحلة مُسنَدة لسائق — من بيانات الرحلة المحلية */
export function hasAssignedDriver(trip) {
  if (!trip) return false;
  if (trip.driver_id != null && trip.driver_id !== "") return true;
  if (trip.driver?.id || trip.driver?.name) return true;
  return false;
}

/** GET /api/trip/{id}/has-driver — هل الرحلة مُسنَدة لسائق؟ */
export async function fetchTripHasDriver(tripId, signal) {
  if (tripId == null || tripId === "") return false;
  const res = await fetch(`${API_BASE}/trip/${tripId}/has-driver`, {
    headers: { Accept: "application/json" },
    signal,
  });
  if (!res.ok) return false;
  const json = await res.json().catch(() => ({}));
  return Boolean(json?.has_driver ?? json?.data?.has_driver);
}

/** جلب حالة السائق لعدة رحلات بالتوازي */
export async function fetchTripsHasDriverMap(tripIds, signal) {
  const unique = [...new Set(tripIds.map((id) => String(id)).filter(Boolean))];
  if (!unique.length) return {};

  const entries = await Promise.all(
    unique.map(async (id) => {
      try {
        const has = await fetchTripHasDriver(id, signal);
        return [id, has];
      } catch (err) {
        if (err?.name === "AbortError") throw err;
        return [id, false];
      }
    }),
  );
  return Object.fromEntries(entries);
}

function sortTripsByRecent(trips) {
  return [...trips].sort((a, b) => {
    const da = new Date(a?.updated_at ?? a?.created_at ?? 0).getTime();
    const db = new Date(b?.updated_at ?? b?.created_at ?? 0).getTime();
    return db - da;
  });
}

/** سجل الرحلات — GET /api/trips-without-bydriver */
export async function fetchAllTripsForList() {
  const res = await fetch(`${API_BASE}/trips-without-bydriver`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error("فشل تحميل الرحلات");
  const list = parseTripListResponse(await res.json());
  return sortTripsByRecent(list.map(normalizeWithoutDriverTrip));
}

/** الرحلات المعروضة — GET /api/trip-without-drivers */
export async function fetchOfferedTripsList() {
  const res = await fetch(`${API_BASE}/trip-without-drivers`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error("فشل تحميل الرحلات المعروضة");
  return sortTripsByRecent(parseTripListResponse(await res.json()));
}

export function formatPaymentError(raw, status) {
  const msg = String(raw ?? "").trim();
  if (msg.includes("No query results") || msg.includes("TripWithoutDriver")) {
    return "هذه الرحلة لا تدعم إضافة دفعة من هنا. اختر رحلة من الرحلات المعروضة.";
  }
  if (msg.includes("Malformed UTF-8")) {
    return "خطأ في ترميز البيانات. حاول مرة أخرى.";
  }
  return msg || `فشل إضافة الدفعة (${status})`;
}

export async function addTripPayment(tripId, payment) {
  const fd = new FormData();
  const append = (key, val) => {
    if (val != null && val !== "") fd.append(key, String(val));
  };

  append("total_price", payment.total_price);
  append("paid_amount", payment.paid_amount ?? payment.amount_paid);
  append("from_account", payment.from_account ?? payment.account_number);
  append("to_account", payment.to_account ?? payment.recipient_account);
  append("transfer_method", payment.transfer_method);
  append("bank_name", payment.bank_name);
  append("driver_id", payment.driver_id);
  append("sender_driver_id", payment.sender_driver_id);
  append("recipient_driver_id", payment.recipient_driver_id);
  append("sender_name", payment.sender_name ?? payment.custom_sender_name);
  append("recipient_name", payment.recipient_name ?? payment.cash_recipient_name);
  append("recipient_mode", payment.recipient_mode);
  append("recipient_type", payment.recipient_type);
  append("notes", payment.notes ?? payment.payment_note);
  append("payment_date", payment.payment_date ?? payment.commission_transfer_date);
  if (payment.transfer_image) fd.append("transfer_image", payment.transfer_image);

  const res = await fetch(`${API_BASE}/trips/${tripId}/add-payment`, {
    method: "POST",
    body: fd,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(formatPaymentError(json?.error ?? json?.message, res.status));
  }
  return json;
}

export async function fetchTripById(id) {
  const res = await fetch(`${API_BASE}/trips/${id}`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`فشل تحميل الرحلة (${res.status})`);
  return normalizeTripResponse(await res.json());
}

/** جلب رحلة بدون سائق (نفس مصدر add-payment) */
export async function fetchTripWithoutDriverById(id) {
  const res = await fetch(`${API_BASE}/trips-without-driver/${id}`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`فشل تحميل الرحلة (${res.status})`);
  return normalizeTripResponse(await res.json());
}

/** يحاول trips-without-driver أولاً ثم trips */
export async function fetchTripDetailsById(id) {
  try {
    const trip = await fetchTripWithoutDriverById(id);
    return { trip, supportsAddPayment: true };
  } catch {
    const trip = await fetchTripById(id);
    return { trip, supportsAddPayment: false };
  }
}

/** نفس طريقة التعديل — PUT مع trip_status بالعربي */
export async function updateTripStatus(trip, tripStatus, reason = "") {
  const fd = new FormData();
  fd.append("_method", "PUT");
  fd.append("trip_status", tripStatus);

  if (reason?.trim()) {
    fd.append("cancel_reason", reason.trim());
  }

  const res = await fetch(`${API_BASE}/trips/${trip.id}`, {
    method: "POST",
    headers: { Accept: "application/json" },
    body: fd,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      json?.message ||
      json?.error ||
      (typeof json?.errors === "object"
        ? Object.values(json.errors).flat().join(" — ")
        : null) ||
      `خطأ ${res.status}`;
    throw new Error(msg);
  }

  return fetchTripById(trip.id);
}

function toDateInputValue(value) {
  if (value == null || value === "") return "";
  const s = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const match = s.match(/^(\d{4}-\d{2}-\d{2})/);
  if (match) return match[1];
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return "";
}

export function buildTripEditForm(trip) {
  if (!trip) {
    return {
      trip_date: "",
      total_price: "",
      trip_status: "",
      amount_paid: "",
      transfer_method: "",
      bank_name: "",
      account_number: "",
      commission_transfer_date: "",
      assisted_by: "",
      cancel_by: "",
      cancel_reason: "",
      cancel_date: "",
      sales_ids: [],
    };
  }

  const salesIds = Array.isArray(trip.sales)
    ? trip.sales.map((s) => String(s.id)).filter(Boolean)
    : [];

  return {
    trip_date: toDateInputValue(trip.trip_date),
    total_price: trip.total_price ?? "",
    trip_status: trip.trip_status ?? trip.status ?? "",
    amount_paid: trip.amount_paid ?? "",
    transfer_method: trip.transfer_method ?? "",
    bank_name: trip.bank_name ?? "",
    account_number: trip.account_number ?? "",
    commission_transfer_date: trip.commission_transfer_date ?? "",
    assisted_by: trip.assisted_by ?? "",
    cancel_by: trip.cancel_by ?? trip.cancelled_by ?? "",
    cancel_reason: trip.cancel_reason ?? "",
    cancel_date: toDateInputValue(trip.cancel_date),
    sales_ids: salesIds,
  };
}

const OFFERED_STATUS_OPTIONS = [
  { value: "pending", label: "معلقة" },
  { value: "offered", label: "معروضة" },
  { value: "completed", label: "تم" },
  { value: "cancelled", label: "ملغية" },
];

const TRIP_STATUS_TO_EDIT_STATUS = {
  pending: "pending",
  offered: "offered",
  completed: "completed",
  cancelled: "cancelled",
  معلقة: "pending",
  معروضة: "offered",
  "قيد التنفيذ": "offered",
  تم: "completed",
  ملغية: "cancelled",
  موقوفة: "pending",
};

function resolveTripEditStatus(trip) {
  const raw = trip?.status ?? trip?.trip_status;
  if (raw != null && TRIP_STATUS_TO_EDIT_STATUS[raw]) return TRIP_STATUS_TO_EDIT_STATUS[raw];
  return "pending";
}

export { OFFERED_STATUS_OPTIONS, resolveTripEditStatus };

export function buildOfferedTripEditForm(trip) {
  if (!trip) {
    return {
      trip_date: "",
      from: "",
      to: "",
      trip_type: "",
      route_type: "",
      route_direction: "",
      subscription_type: "",
      total_price: "",
      our_commission: "",
      departure_time: "",
      return_time: "",
      trip_notes: "",
      status: "pending",
      driver_id: "",
      passengers_count: "",
      operation_days_text: "",
      sales_ids: [],
    };
  }

  const salesIds = Array.isArray(trip.sales)
    ? trip.sales.map((s) => String(s.id)).filter(Boolean)
    : [];

  return {
    trip_date: toDateInputValue(trip.trip_date),
    from: trip.from ?? "",
    to: trip.to ?? "",
    trip_type: trip.trip_type ?? "",
    route_type: trip.route_type ?? "",
    route_direction: trip.route_direction ?? "",
    subscription_type: trip.subscription_type ?? "",
    total_price: trip.total_price ?? "",
    our_commission: trip.our_commission ?? "",
    departure_time: String(trip.departure_time ?? "").slice(0, 5),
    return_time: String(trip.return_time ?? "").slice(0, 5),
    trip_notes: trip.trip_notes ?? trip.notes ?? "",
    status: resolveTripEditStatus(trip),
    driver_id: String(trip.driver?.id ?? trip.driver_id ?? ""),
    passengers_count: trip.passengers_count ?? "",
    operation_days_text: Array.isArray(trip.operation_days)
      ? trip.operation_days.join("، ")
      : "",
    sales_ids: salesIds,
  };
}

function formatApiTimeValue(value) {
  if (!value) return null;
  const v = String(value).trim();
  if (/^\d{2}:\d{2}:\d{2}$/.test(v)) return v;
  if (/^\d{2}:\d{2}$/.test(v)) return `${v}:00`;
  return v;
}

export function buildOfferedTripUpdatePayload(form, original) {
  const payload = {};
  const setIfChanged = (key, val, origKey = key) => {
    if (!valuesEqual(val, original?.[origKey])) payload[key] = val;
  };

  setIfChanged("trip_date", toDateInputValue(form.trip_date));
  setIfChanged("from", form.from);
  setIfChanged("to", form.to);
  setIfChanged("trip_type", form.trip_type);
  setIfChanged("route_type", form.route_type);
  setIfChanged("route_direction", form.route_direction);
  setIfChanged("subscription_type", form.subscription_type);
  setIfChanged("total_price", form.total_price);
  setIfChanged("our_commission", form.our_commission);
  setIfChanged("trip_notes", form.trip_notes);
  setIfChanged("status", form.status);
  setIfChanged("driver_id", form.driver_id);
  setIfChanged("passengers_count", form.passengers_count);

  const dep = formatApiTimeValue(form.departure_time);
  const origDep = formatApiTimeValue(original?.departure_time);
  if (dep && !valuesEqual(dep, origDep)) payload.departure_time = dep;

  const ret = formatApiTimeValue(form.return_time);
  const origRet = formatApiTimeValue(original?.return_time);
  if (ret && !valuesEqual(ret, origRet)) payload.return_time = ret;

  const newDays = String(form.operation_days_text ?? "").trim();
  const origDays = String(original?.operation_days_text ?? "").trim();
  if (!valuesEqual(newDays, origDays) && newDays) {
    payload.operation_days = newDays
      .split(/[،,]/)
      .map((s) => s.trim())
      .filter(Boolean);
    payload.trip_days_count = payload.operation_days.length;
  }

  const origSales = [...(original?.sales_ids ?? [])].map(String).sort().join(",");
  const newSales = [...(form.sales_ids ?? [])].map(String).sort().join(",");
  if (origSales !== newSales && Array.isArray(form.sales_ids)) {
    payload.sales_ids = form.sales_ids;
  }

  return payload;
}

/** PUT /api/TripWithout/{id} — تعديل رحلة */
export async function updateOfferedTrip(tripId, form, original) {
  const payload = buildOfferedTripUpdatePayload(form, original);
  if (!Object.keys(payload).length) {
    const trip = await fetchTripWithoutDriverById(tripId).catch(() => fetchTripById(tripId));
    return { trip, message: "لا توجد تغييرات" };
  }

  const res = await fetch(`${API_BASE}/TripWithout/${tripId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(payload),
  });
  const json = await parseJsonResponse(res);
  const updated = normalizeTripResponse(json);
  let trip = updated?.id ? updated : null;
  if (!trip) {
    trip = await fetchTripWithoutDriverById(tripId).catch(() => fetchTripById(tripId));
  }
  return { ...json, trip, message: json?.message };
}

function valuesEqual(a, b) {
  return String(a ?? "").trim() === String(b ?? "").trim();
}

export function buildTripUpdateFormData(form, original) {
  const fd = new FormData();
  fd.append("_method", "PUT");

  const set = (key, val) => {
    if (val != null && val !== "") fd.append(key, String(val));
  };

  const setIfChanged = (key, val, orig) => {
    if (!valuesEqual(val, orig)) set(key, val);
  };

  setIfChanged("trip_date", toDateInputValue(form.trip_date), toDateInputValue(original?.trip_date));
  setIfChanged("trip_status", form.trip_status, original?.trip_status);
  setIfChanged("total_price", form.total_price, original?.total_price);
  setIfChanged("transfer_method", form.transfer_method, original?.transfer_method);
  setIfChanged("bank_name", form.bank_name, original?.bank_name);
  setIfChanged("account_number", form.account_number, original?.account_number);
  setIfChanged("commission_transfer_date", form.commission_transfer_date, original?.commission_transfer_date);
  setIfChanged("assisted_by", form.assisted_by, original?.assisted_by);
  setIfChanged("cancel_by", form.cancel_by, original?.cancel_by);
  setIfChanged("cancel_reason", form.cancel_reason, original?.cancel_reason);
  setIfChanged("cancel_date", toDateInputValue(form.cancel_date), toDateInputValue(original?.cancel_date));

  const origSales = [...(original?.sales_ids ?? [])].map(String).sort().join(",");
  const newSales = [...(form.sales_ids ?? [])].map(String).sort().join(",");
  if (origSales !== newSales && Array.isArray(form.sales_ids)) {
    form.sales_ids.forEach((id) => {
      if (id) fd.append("sales_ids[]", String(id));
    });
  }

  return fd;
}

export async function updateTrip(tripId, form, original) {
  const fd = buildTripUpdateFormData(form, original);
  const res = await fetch(`${API_BASE}/trips/${tripId}`, {
    method: "POST",
    headers: { Accept: "application/json" },
    body: fd,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      json?.message ||
      json?.error ||
      (typeof json?.errors === "object"
        ? Object.values(json.errors).flat().join(" — ")
        : null) ||
      `خطأ ${res.status}`;
    throw new Error(msg);
  }
  return fetchTripById(tripId);
}

async function parseJsonResponse(res) {
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      json?.message ||
      json?.error ||
      (typeof json?.errors === "object"
        ? Object.values(json.errors).flat().join(" — ")
        : null) ||
      `خطأ ${res.status}`;
    throw new Error(msg);
  }
  return json;
}

/** POST /api/tripwithoutdriver/create */
export async function createTripWithoutDriver(payload) {
  const res = await fetch(`${API_BASE}/tripwithoutdriver/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(payload),
  });
  return parseJsonResponse(res);
}

/** DELETE /api/trip-without-driver/{id} */
export async function deleteTripWithoutDriver(tripId) {
  const res = await fetch(`${API_BASE}/trip-without-driver/${tripId}`, {
    method: "DELETE",
    headers: { Accept: "application/json" },
  });
  return parseJsonResponse(res);
}

/** POST /api/trip/passenger/request-add */
export async function requestAddPassenger(payload) {
  const body = { ...payload };
  if (body.customer_id != null && body.customer_id !== "") {
    const cid = Number(body.customer_id);
    if (Number.isNaN(cid) || cid <= 0) {
      throw new Error("معرّف العميل غير صالح — اختر العميل من القائمة");
    }
    body.customer_id = cid;
  }
  if (body.gender === "ذكر") body.gender = "male";
  if (body.gender === "أنثى") body.gender = "female";

  const res = await fetch(`${API_BASE}/trip/passenger/request-add`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
  return parseJsonResponse(res);
}

/** POST /api/trip/passenger/request-delete — يتطلب trip_id + customer_id */
export async function requestDeletePassenger({ tripId, customerId, passengerId }) {
  const body = { trip_id: Number(tripId) };

  const cid = customerId ?? null;
  if (cid != null && cid !== "") {
    body.customer_id = Number(cid);
  } else if (passengerId != null && passengerId !== "") {
    body.customer_id = Number(passengerId);
  }

  if (body.customer_id == null || Number.isNaN(body.customer_id)) {
    throw new Error("لا يمكن تحديد العميل المراد حذفه من الرحلة");
  }

  const res = await fetch(`${API_BASE}/trip/passenger/request-delete`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
  return parseJsonResponse(res);
}

/** GET /api/passenger-requests */
export async function fetchPassengerRequests(status) {
  const qs = status ? `?status=${encodeURIComponent(status)}` : "";
  const res = await fetch(`${API_BASE}/passenger-requests${qs}`, {
    headers: { Accept: "application/json" },
  });
  const json = await parseJsonResponse(res);
  if (Array.isArray(json)) return json;
  return json?.data ?? json?.requests ?? [];
}

/** POST /api/trip/passenger/request-action/{id} — status: approved | rejected */
export async function passengerRequestAction(requestId, status) {
  const id = String(requestId ?? "").trim();
  if (!id) throw new Error("معرّف الطلب غير صالح");
  const res = await fetch(`${API_BASE}/trip/passenger/request-action/${encodeURIComponent(id)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ status }),
  });
  return parseJsonResponse(res);
}

import { fetchCustomersList } from "./customerService.js";

/** @deprecated استخدم fetchCustomersList */
export async function fetchAllCustomers() {
  return fetchCustomersList();
}
