const storageKey = (tripId) => `drivo_trip_payments_${tripId}`;

export function loadTripPayments(tripId) {
  if (!tripId) return [];
  try {
    const raw = sessionStorage.getItem(storageKey(tripId));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function saveTripPayment(tripId, payment, imageFile) {
  if (!tripId) return [];
  const payments = loadTripPayments(tripId);
  let transfer_image = payment.transfer_image ?? null;
  if (!transfer_image && imageFile) {
    transfer_image = await fileToDataUrl(imageFile);
  }
  payments.push({
    ...payment,
    id: payment.id ?? `local-${Date.now()}`,
    transfer_image,
  });
  sessionStorage.setItem(storageKey(tripId), JSON.stringify(payments));
  return payments;
}
