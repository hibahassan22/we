const API_BASE = "/api";

function parseList(json) {
  if (Array.isArray(json)) return json;
  return json?.data ?? [];
}

/** GET /api/trip/payment-requests — طلبات تقديم دفعات جديدة */
export async function fetchPaymentRequests({ status } = {}) {
  const params = new URLSearchParams();
  if (status) params.set("status", status);

  const qs = params.toString();
  const url = `${API_BASE}/trip/payment-requests${qs ? `?${qs}` : ""}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`فشل تحميل طلبات الدفعات (${res.status})`);
  return parseList(await res.json());
}

/** GET /api/trip/payment-requests?status=approved — الدفعات المعتمدة للحسابات */
export async function fetchApprovedPayments() {
  return fetchPaymentRequests({ status: "approved" });
}

export function normalizeApprovedPayment(item) {
  return {
    id: item.id,
    tripId: item.trip_id,
    driverName: item.driver_id ?? item.driver_name ?? "—",
    amount: Number(item.paid_amount ?? 0),
    fromAccount: item.from_account ?? "",
    toAccount: item.to_account ?? "",
    transferMethod: item.transfer_method ?? "",
    transferImage: item.transfer_image ?? null,
    paymentDate: item.payment_date ?? "",
    notes: item.notes ?? "",
    status: item.status ?? "approved",
    createdAt: item.created_at ?? "",
  };
}

/** POST /api/trip/payment/approve/{id} */
export async function approvePaymentRequest(id) {
  const res = await fetch(`${API_BASE}/trip/payment/approve/${id}`, {
    method: "POST",
    headers: { Accept: "application/json" },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json?.message ?? json?.error ?? `فشل الموافقة (${res.status})`);
  }
  return json;
}

/** POST /api/trip/payment/reject/{id} */
export async function rejectPaymentRequest(id) {
  const res = await fetch(`${API_BASE}/trip/payment/reject/${id}`, {
    method: "POST",
    headers: { Accept: "application/json" },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json?.message ?? json?.error ?? `فشل الرفض (${res.status})`);
  }
  return json;
}
