import { normalizeMediaUrl } from "../lib/driverMedia.js";

// رابط مطلق — على السيرفر مفيش Vite proxy زي المحلي
const API_BASE = "https://drivo1.elmoroj.com/api";

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

/** POST /api/driver-sale-chat/send — يدعم المرفقات (صور) عبر form-data */
export async function sendDriverSaleChatMessage({ senderId, receiverId, message, attachments = [] }) {
  const files = Array.isArray(attachments) ? attachments.filter(Boolean) : [];
  // العمود message NOT NULL في الـ DB — لازم نص ظاهر مش فاضي/مسافة صفرية
  const text = String(message ?? "").replace(/\u200b/g, "").trim() || (files.length ? "صورة" : "");

  if (files.length > 0) {
    const fd = new FormData();
    fd.append("sender_id", String(senderId ?? ""));
    fd.append("receiver_id", String(receiverId ?? ""));
    fd.append("message", text);
    files.forEach((file, i) => {
      const name = file?.name || `image-${i + 1}.jpg`;
      fd.append("attachments[]", file, name);
    });
    const res = await fetch(`${API_BASE}/driver-sale-chat/send`, {
      method: "POST",
      headers: { Accept: "application/json" },
      body: fd,
    });
    return parseJsonResponse(res);
  }

  if (!text) {
    throw new Error("أدخل رسالة أو أرفق صورة");
  }

  const res = await fetch(`${API_BASE}/driver-sale-chat/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      sender_id: senderId,
      receiver_id: receiverId,
      message: text,
    }),
  });
  return parseJsonResponse(res);
}

function attachmentToUrl(item) {
  if (!item) return "";
  if (typeof item === "string") return normalizeMediaUrl(item);
  if (typeof item === "object") {
    const raw = item.url ?? item.path ?? item.src ?? item.attachment ?? item.file ?? "";
    return normalizeMediaUrl(raw);
  }
  return "";
}

/** مرفقات الرسالة كمصفوفة روابط جاهزة للعرض */
export function messageAttachments(m) {
  const raw = m?.attachments ?? m?.attachment ?? m?.files ?? m?.images ?? m?.media;
  let list = [];
  if (Array.isArray(raw)) {
    list = raw;
  } else if (typeof raw === "string" && raw.trim()) {
    try {
      const parsed = JSON.parse(raw);
      list = Array.isArray(parsed) ? parsed : [raw];
    } catch {
      list = [raw];
    }
  }
  return list.map(attachmentToUrl).filter(Boolean);
}

const MAP_LINK_RE = /https?:\/\/(?:www\.)?(?:google\.[^/\s]+\/maps\S+|maps\.google\.[^/\s]+\S*|maps\.app\.goo\.gl\/\S+|goo\.gl\/maps\/\S+)/i;

/** يكتشف رسالة الموقع (رابط خرائط) ويستخرج الإحداثيات إن وُجدت */
export function parseLocationMessage(text) {
  if (!text) return null;
  const str = String(text);
  const match = str.match(MAP_LINK_RE);
  if (!match) return null;
  const url = match[0];
  const coord =
    url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/) ||
    url.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/) ||
    url.match(/[?&]query=(-?\d+\.\d+),(-?\d+\.\d+)/) ||
    url.match(/[?&]destination=(-?\d+\.\d+),(-?\d+\.\d+)/);
  return {
    url,
    lat: coord ? Number(coord[1]) : null,
    lng: coord ? Number(coord[2]) : null,
  };
}

/** حالة قراءة الرسالة (لعرض علامات الصح) */
export function isMessageRead(m) {
  const status = String(m?.status ?? "").toLowerCase();
  const flag = m?.is_read ?? m?.read ?? m?.seen ?? m?.read_at ?? m?.seen_at ?? null;
  return Boolean(flag) || status === "read" || status === "seen";
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
