const API_BASE = "/api";

async function parseJsonResponse(res) {
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      json?.message
      ?? json?.error
      ?? `خطأ ${res.status}`;
    throw new Error(msg);
  }
  return json;
}

/** GET /api/trip-chats */
export async function fetchTripChatsList(signal) {
  const res = await fetch(`${API_BASE}/trip-chats`, {
    headers: { Accept: "application/json" },
    signal,
  });
  const json = await parseJsonResponse(res);
  const list = Array.isArray(json?.data) ? json.data : (Array.isArray(json) ? json : []);
  return list.map((item) => ({
    tripId: item.trip_id ?? item.tripId,
    senderId: item.sender_id ?? item.senderId ?? "",
    receiverId: item.receiver_id ?? item.receiverId ?? "",
    lastMessage: item.last_message ?? item.message ?? "",
    createdAt: item.created_at ?? item.createdAt ?? null,
    time: item.time ?? "",
  }));
}

/** GET /api/trip-chat/{tripId} */
export async function fetchTripChatMessages(tripId, signal) {
  if (!tripId) return [];
  const res = await fetch(`${API_BASE}/trip-chat/${tripId}`, {
    headers: { Accept: "application/json" },
    signal,
  });
  const json = await parseJsonResponse(res);
  return Array.isArray(json?.messages) ? json.messages : [];
}

/** GET /api/trip-without-drivers/{tripId}/payment-status → { payment_status: boolean } */
export async function fetchTripPaymentStatus(tripId, signal) {
  if (!tripId) return false;
  const res = await fetch(`${API_BASE}/trip-without-drivers/${tripId}/payment-status`, {
    headers: { Accept: "application/json" },
    signal,
  });
  const json = await parseJsonResponse(res);
  const raw = json?.payment_status ?? json?.paymentStatus ?? json?.data?.payment_status;
  return raw === true || raw === 1 || raw === "1" || raw === "true" || raw === "paid";
}

/** POST /api/trip-chat/send */
export async function sendTripChatMessage({ tripId, senderId, receiverId, message }) {
  const res = await fetch(`${API_BASE}/trip-chat/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      trip_id: Number(tripId),
      sender_id: senderId,
      receiver_id: receiverId,
      message: String(message ?? "").trim(),
    }),
  });
  return parseJsonResponse(res);
}

export function resolveDriverIdFromChat(chat, drivers = [], myId = "") {
  if (!chat) return "";
  const driverIds = new Set(drivers.map((d) => String(d.id)));
  const sender = String(chat.senderId ?? chat.sender_id ?? "");
  const receiver = String(chat.receiverId ?? chat.receiver_id ?? "");
  if (driverIds.has(sender)) return sender;
  if (driverIds.has(receiver)) return receiver;
  if (myId && sender && sender !== String(myId)) return sender;
  if (myId && receiver && receiver !== String(myId)) return receiver;
  return receiver || sender;
}

export function formatChatTime(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
}

export function driverDisplayName(driver, fallbackId = "") {
  if (!driver) return fallbackId ? `سائق ${fallbackId}` : "سائق";
  return [driver.name, driver.last_name].filter(Boolean).join(" ") || driver.name || `سائق ${driver.id}`;
}
