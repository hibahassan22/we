const API_BASE = "/api";

/**
 * إنشاء رابط دفع لرحلة.
 * POST /api/trips/{tripId}/payment-link
 */
export async function createTripPaymentLink(tripId, { amount, driverId } = {}) {
  const body = {};
  if (amount != null && amount !== "") body.amount = Number(amount);
  if (driverId) body.driver_id = driverId;

  const res = await fetch(`${API_BASE}/trips/${encodeURIComponent(tripId)}/payment-link`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json?.message ?? json?.error ?? `فشل إنشاء رابط الدفع (${res.status})`);
  }

  const link =
    json?.link ??
    json?.payment_link ??
    json?.url ??
    json?.data?.link ??
    json?.data?.payment_link ??
    json?.data?.url ??
    null;

  if (!link) {
    throw new Error("تم إنشاء الطلب لكن لم يُرجع السيرفر رابط دفع");
  }

  return { link, raw: json };
}
