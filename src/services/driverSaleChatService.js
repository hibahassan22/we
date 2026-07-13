const API_BASE = "/api";

async function parseJsonResponse(res) {
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = json?.message ?? json?.error ?? `خطأ ${res.status}`;
    throw new Error(msg);
  }
  return json;
}

function normalizeChat(item) {
  const senderId = item.sender_id ?? item.senderId ?? "";
  const receiverId = item.receiver_id ?? item.receiverId ?? "";
  return {
    senderId: String(senderId),
    receiverId: String(receiverId),
    name: item.name ?? "",
    phone: item.phone ?? "",
    lastMessage: item.last_message ?? item.lastMessage ?? item.message ?? "",
    createdAt: item.created_at ?? item.createdAt ?? null,
    time: item.time ?? "",
  };
}

function normalizePhone(value) {
  return String(value ?? "").replace(/\D/g, "");
}

/** معرّف السائق المستخدم في محادثات الـ API */
export function getDriverChatUserId(driver) {
  if (!driver) return "";
  return String(
    driver.user_id
    ?? driver.firebase_uid
    ?? driver.uid
    ?? driver.id
    ?? "",
  );
}

/** GET /api/drivers */
export async function fetchAllDrivers(signal) {
  const res = await fetch(`${API_BASE}/drivers`, {
    headers: { Accept: "application/json" },
    signal,
  });
  const json = await res.json().catch(() => []);
  if (Array.isArray(json)) return json;
  return json?.data ?? json?.drivers ?? [];
}

/** GET /api/driver-sale-chats */
export async function fetchDriverSaleChats(signal) {
  const res = await fetch(`${API_BASE}/driver-sale-chats`, {
    headers: { Accept: "application/json" },
    signal,
  });
  const json = await parseJsonResponse(res);
  const list = Array.isArray(json?.data) ? json.data : (Array.isArray(json) ? json : []);
  return list.map(normalizeChat);
}

/** GET /api/driver-sale-chat/{senderId}/{receiverId} */
export async function fetchDriverSaleChatMessages(senderId, receiverId, signal) {
  if (!senderId || !receiverId) return [];
  const res = await fetch(
    `${API_BASE}/driver-sale-chat/${encodeURIComponent(senderId)}/${encodeURIComponent(receiverId)}`,
    { headers: { Accept: "application/json" }, signal },
  );
  const json = await parseJsonResponse(res);
  return Array.isArray(json?.messages) ? json.messages : [];
}

/** جلب محادثة واحدة بين سائق ومبيعات — نفس الخيط مهما كان ترتيب الإرسال */
export async function fetchDriverSaleConversation(driverId, salesId, signal) {
  if (!driverId || !salesId) return [];
  const attempts = [
    [driverId, salesId],
    [salesId, driverId],
  ];
  let lastEmpty = [];
  for (const [a, b] of attempts) {
    try {
      const messages = await fetchDriverSaleChatMessages(a, b, signal);
      if (messages.length > 0) {
        return sortMessages(messages);
      }
      lastEmpty = messages;
    } catch {
      /* جرّب الترتيب الآخر */
    }
  }
  return lastEmpty;
}

function sortMessages(messages) {
  return [...messages].sort(
    (a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0),
  );
}

/** POST /api/driver-sale-chat/send */
export async function sendDriverSaleChatMessage({ senderId, receiverId, message }) {
  const res = await fetch(`${API_BASE}/driver-sale-chat/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      sender_id: senderId,
      receiver_id: receiverId,
      message: String(message ?? "").trim(),
    }),
  });
  return parseJsonResponse(res);
}

export function resolvePartnerId(chat, myId = "") {
  if (!chat) return "";
  const me = String(myId);
  const sender = String(chat.senderId ?? "");
  const receiver = String(chat.receiverId ?? "");
  if (me && sender === me) return receiver;
  if (me && receiver === me) return sender;
  return receiver || sender;
}

/** فهرس آخر رسالة لكل طرف (سائق) — محادثة واحدة لكل سائق */
export function indexChatsByPartner(chats = [], myId = "") {
  const map = new Map();
  for (const chat of chats) {
    const partnerId = resolvePartnerId(chat, myId);
    if (!partnerId) continue;
    const at = new Date(chat.createdAt || 0).getTime();
    const prev = map.get(partnerId);
    if (!prev || at >= new Date(prev.createdAt || 0).getTime()) {
      map.set(partnerId, chat);
    }
    if (chat.phone) {
      const phoneKey = normalizePhone(chat.phone);
      if (phoneKey && (!map.has(phoneKey) || at >= new Date(map.get(phoneKey)?.createdAt || 0).getTime())) {
        map.set(phoneKey, chat);
      }
    }
  }
  return map;
}

export function mergeDriversWithChatPreviews(drivers = [], chatByPartner = new Map()) {
  return drivers.map((driver) => {
    const chatUserId = getDriverChatUserId(driver);
    const phoneKey = normalizePhone(driver.phone);
    const preview =
      chatByPartner.get(chatUserId)
      ?? chatByPartner.get(String(driver.id))
      ?? (phoneKey ? chatByPartner.get(phoneKey) : null);

    return {
      ...driver,
      chatUserId,
      lastMessage: preview?.lastMessage ?? "",
      lastMessageTime: preview?.time ?? "",
      lastMessageAt: preview?.createdAt ? new Date(preview.createdAt).getTime() : 0,
      chatSenderId: preview?.senderId ?? chatUserId,
      chatReceiverId: preview?.receiverId ?? "",
    };
  }).sort((a, b) => {
    if (b.lastMessageAt !== a.lastMessageAt) return b.lastMessageAt - a.lastMessageAt;
    const nameA = [a.name, a.last_name].filter(Boolean).join(" ");
    const nameB = [b.name, b.last_name].filter(Boolean).join(" ");
    return nameA.localeCompare(nameB, "ar");
  });
}

export async function fetchMessagesForDriver(driver, salesId, signal) {
  if (!driver) return [];
  const driverId = driver.chatUserId ?? getDriverChatUserId(driver);
  if (driver.chatSenderId && driver.chatReceiverId) {
    const direct = await fetchDriverSaleChatMessages(
      driver.chatSenderId,
      driver.chatReceiverId,
      signal,
    );
    if (direct.length > 0) return sortMessages(direct);
  }
  return fetchDriverSaleConversation(driverId, salesId, signal);
}
