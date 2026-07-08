const BASE = "https://drivo1.elmoroj.com/api";

export async function fetchAllRefunds() {
  const res = await fetch(`${BASE}/all-refunds`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  return Array.isArray(json?.data) ? json.data : [];
}

/** طلب استرداد لرحلة محددة من قائمة all-refunds */
export async function fetchRefundByTripId(tripId) {
  const list = await fetchAllRefunds();
  const id = String(tripId ?? "");
  return list.find((item) => String(item.tripId ?? item.tripNumber ?? "") === id) ?? null;
}

/** POST /trip-refund/request — إنشاء طلب استرداد من الأدمن */
export async function createTripRefundRequest(payload) {
  const res = await fetch(`${BASE}/trip-refund/request`, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({
      trip_id: Number(payload.tripId),
      driver_id: String(payload.driverId ?? ""),
      refund_reason: String(payload.refundReason ?? "").trim(),
      proposed_refund_amount: Number(payload.proposedRefundAmount),
      refund_method: String(payload.refundMethod ?? "").trim(),
      bank_transfer_details: String(payload.bankTransferDetails ?? "").trim(),
    }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = json.message
      ?? (json.errors ? Object.values(json.errors).flat().join(" — ") : `HTTP ${res.status}`);
    throw new Error(msg);
  }
  return json;
}

/** PUT /trip-refund/handle/{tripId} */
export async function handleTripRefund(tripId, { confirmedRefundAmount, status }) {
  const res = await fetch(`${BASE}/trip-refund/handle/${tripId}`, {
    method: "PUT",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({
      confirmed_refund_amount: Number(confirmedRefundAmount),
      status,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? `HTTP ${res.status}`);
  }
  return res.json();
}
