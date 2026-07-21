import {
  sendDriverSaleChatMessage,
  fetchDriverSaleConversation,
  messageAttachments,
} from "./driverSaleChatService.js";
import { normalizeMediaUrl } from "../lib/driverMedia.js";

const API_BASE = "https://drivo1.elmoroj.com/api";

async function parseJsonResponse(res) {
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      json?.message
      ?? json?.error
      ?? `خطأ ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }
  return json;
}

/** تصغير الصورة قبل الرفع */
async function compressImageFile(file, { maxSide = 1280, quality = 0.75 } = {}) {
  if (!file?.type?.startsWith("image/")) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();
    const blob = await new Promise((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", quality);
    });
    if (!blob) return file;
    const name = String(file.name || "image.jpg").replace(/\.\w+$/, ".jpg");
    return new File([blob], name, { type: "image/jpeg", lastModified: Date.now() });
  } catch {
    return file;
  }
}

function isAudioAttachmentUrl(url) {
  const s = String(url ?? "").toLowerCase();
  if (!s) return false;
  if (s.startsWith("data:audio/")) return true;
  return /\.(webm|ogg|mp3|m4a|wav|aac|opus)(\?|$)/i.test(s);
}

function isImageAttachmentUrl(url) {
  const s = String(url ?? "").toLowerCase();
  if (!s) return false;
  if (s.startsWith("data:image/")) return true;
  if (/\.(jpg|jpeg|png|gif|webp|bmp)(\?|$)/i.test(s)) return true;
  if (s.includes("/storage/") && !isAudioAttachmentUrl(s)) return true;
  return false;
}

const AUDIO_MARK = "AUDIO:";

function audioMarkRegex() {
  return /AUDIO:((?:https?:\/\/|data:audio\/)[^\s"'<>]+)/gi;
}

/** يستخرج أي روابط http من الرسالة */
export function extractInlineMediaUrls(message) {
  const text = String(message ?? "");
  if (!text) return [];
  const found = [];
  const re = /https?:\/\/[^\s"'<>]+/gi;
  const matches = text.match(re) || [];
  matches.forEach((m) => {
    const cleaned = m.replace(/[),.;]+$/, "").trim();
    if (cleaned && !found.includes(cleaned)) found.push(cleaned);
  });
  return found;
}

/** روابط صوت معلَّمة صراحة في النص (http أو data:) */
export function extractMarkedAudioUrls(message) {
  const text = String(message ?? "");
  const found = [];
  const re = audioMarkRegex();
  let match;
  while ((match = re.exec(text)) !== null) {
    const cleaned = match[1].replace(/[),.;]+$/, "").trim();
    if (cleaned && !found.includes(cleaned)) found.push(cleaned);
  }
  return found;
}

/** @deprecated استخدم extractInlineMediaUrls */
export function extractInlineImageUrls(message) {
  return extractInlineMediaUrls(message).filter((u) => isImageAttachmentUrl(u));
}

/** نص الرسالة للعرض — يخفي الروابط وplaceholder المرفقات */
export function tripChatDisplayText(message) {
  let raw = String(message ?? "").replace(/\u200b/g, "").trim();
  if (!raw) return "";
  if (/^📷\s*صورة$/.test(raw) || /^صورة$/.test(raw) || /^تسجيل صوت$/.test(raw) || /^مرفق$/.test(raw)) {
    return "";
  }
  raw = raw.replace(audioMarkRegex(), " ");
  extractInlineMediaUrls(raw).forEach((url) => {
    raw = raw.split(url).join(" ");
  });
  return raw.replace(/\s+/g, " ").trim();
}

/** معاينة مختصرة للقائمة */
export function tripChatPreviewText(message) {
  const text = tripChatDisplayText(message);
  if (text) return text.length > 50 ? `${text.slice(0, 50)}…` : text;
  if (extractMarkedAudioUrls(message).length || extractInlineMediaUrls(message).some((u) => isAudioAttachmentUrl(u))) {
    return "🎙️ تسجيل صوت";
  }
  if (extractInlineMediaUrls(message).length > 0) return "📷 صورة";
  if (/تسجيل صوت/.test(String(message ?? ""))) return "🎙️ تسجيل صوت";
  if (/^📷/.test(String(message ?? "").trim()) || /صورة/.test(String(message ?? ""))) return "📷 صورة";
  return "";
}

/** كل روابط المرفقات من الرسالة */
export function tripMessageFiles(m) {
  const fromField = [];
  const raw = m?.attachments ?? m?.attachment ?? m?.files ?? m?.images ?? m?.media;
  if (Array.isArray(raw)) {
    raw.forEach((item) => {
      if (typeof item === "string" && item) fromField.push(normalizeMediaUrl(item));
      else if (item && typeof item === "object") {
        const u = item.url ?? item.path ?? item.src ?? "";
        if (u) fromField.push(normalizeMediaUrl(u));
      }
    });
  } else if (typeof raw === "string" && raw.trim()) {
    fromField.push(normalizeMediaUrl(raw.trim()));
  }
  const inline = extractInlineMediaUrls(m?.message).map((u) => normalizeMediaUrl(u));
  return [...new Set([...fromField, ...inline].filter(Boolean))];
}

/** صور فقط */
export function tripMessageImages(m) {
  const markedAudio = new Set(extractMarkedAudioUrls(m?.message).map((u) => normalizeMediaUrl(u)));
  const voiceHint = /AUDIO:|تسجيل صوت/i.test(String(m?.message ?? ""));
  return tripMessageFiles(m).filter((url) => {
    if (markedAudio.has(url)) return false;
    // رسالة صوت: متتجاهل روابط التخزين بدون امتداد صورة واضح
    if (voiceHint && !/\.(jpg|jpeg|png|gif|webp|bmp)(\?|$)/i.test(url) && !String(url).startsWith("data:image/")) {
      return false;
    }
    return isImageAttachmentUrl(url);
  });
}

/** تسجيلات صوت فقط */
export function tripMessageAudios(m) {
  const marked = extractMarkedAudioUrls(m?.message).map((u) => normalizeMediaUrl(u));
  const files = tripMessageFiles(m);
  const fromExt = files.filter((url) => isAudioAttachmentUrl(url));
  const voiceHint = /AUDIO:|تسجيل صوت/i.test(String(m?.message ?? ""));
  // رسالة صوت: أي رابط مش صورة بامتداد واضح = صوت (حتى /storage/ بدون امتداد)
  const inferred = voiceHint
    ? files.filter((url) => {
        if (/\.(jpg|jpeg|png|gif|webp|bmp)(\?|$)/i.test(url) || String(url).startsWith("data:image/")) {
          return false;
        }
        return true;
      })
    : [];
  return [...new Set([...marked, ...fromExt, ...inferred].filter(Boolean))];
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

/**
 * الصور: تُرفع عبر driver-sale-chat (الـ API بيقبل jpg/png/...)
 * الصوت: الـ API بيرفضه — نضمّنه data URL جوّه رسالة الرحلة مباشرة
 */
function collectAttachmentUrls(payload) {
  const roots = [
    payload,
    payload?.data,
    payload?.message,
    payload?.data?.message,
    payload?.attachments,
    payload?.data?.attachments,
  ];
  const found = [];
  roots.forEach((node) => {
    if (node == null) return;
    if (typeof node === "string" && (/^https?:\/\//i.test(node) || node.startsWith("/storage/") || node.startsWith("storage/"))) {
      if (!found.includes(node)) found.push(node);
      return;
    }
    messageAttachments(node).forEach((u) => {
      if (u && !found.includes(u)) found.push(u);
    });
  });
  return found;
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("فشل قراءة الملف"));
    reader.readAsDataURL(file);
  });
}

/** حد آمن تقريبًا لعمود TEXT (~65KB) بعد base64 */
const MAX_INLINE_AUDIO_BYTES = 45_000;

async function uploadImageFilesGetUrls({ senderId, receiverId, uploadReceiverIds = [], files }) {
  if (!files.length) return [];

  const receivers = [...new Set(
    [...uploadReceiverIds, receiverId].map((id) => String(id || "").trim()).filter(Boolean),
  )];

  let lastError = null;

  for (const rid of receivers) {
    try {
      const sent = await sendDriverSaleChatMessage({
        senderId,
        receiverId: rid,
        message: "صورة",
        attachments: files,
      });

      const fromResponse = collectAttachmentUrls(sent).map((u) => normalizeMediaUrl(u)).filter(Boolean);
      if (fromResponse.length) return fromResponse;

      for (let attempt = 0; attempt < 4; attempt += 1) {
        if (attempt > 0) await new Promise((r) => setTimeout(r, 350 * attempt));
        const msgs = await fetchDriverSaleConversation(rid, senderId);
        for (let i = msgs.length - 1; i >= 0; i -= 1) {
          const m = msgs[i];
          if (String(m.sender_id) !== String(senderId)) continue;
          const urls = messageAttachments(m).map((u) => normalizeMediaUrl(u)).filter(Boolean);
          if (urls.length) return urls;
        }
      }
    } catch (err) {
      lastError = err;
    }
  }

  // صور: بديل data URL لو الرفع فشل
  const dataUrls = [];
  for (const file of files) {
    if (!file) continue;
    if (file.size > 750_000) continue;
    try {
      const dataUrl = await fileToDataUrl(file);
      if (dataUrl) dataUrls.push(dataUrl);
    } catch {
      /* ignore */
    }
  }
  if (dataUrls.length) return dataUrls;
  throw new Error(lastError?.message || "فشل رفع الصورة — جرّبي مرة أخرى");
}

async function resolveMediaUrls({ senderId, receiverId, uploadReceiverIds = [], files }) {
  const prepared = [];
  for (const file of files.slice(0, 3)) {
    prepared.push(file?.type?.startsWith("image/") ? await compressImageFile(file) : file);
  }

  const urls = [];
  const imageBatch = [];

  for (const file of prepared) {
    const isAudio = String(file?.type || "").startsWith("audio/");
    if (isAudio) {
      // السيرفر بيرفض مرفقات الصوت — نبعته جوّه الرسالة
      if (file.size > MAX_INLINE_AUDIO_BYTES) {
        throw new Error("التسجيل طويل جدًا — سجّلي أقل من ٢٠ ثانية");
      }
      urls.push(await fileToDataUrl(file));
    } else {
      imageBatch.push(file);
      urls.push(null); // placeholder يُملأ بعد رفع الصور
    }
  }

  if (imageBatch.length) {
    const imageUrls = await uploadImageFilesGetUrls({
      senderId,
      receiverId,
      uploadReceiverIds,
      files: imageBatch,
    });
    let imgIdx = 0;
    for (let i = 0; i < urls.length; i += 1) {
      if (urls[i] == null) {
        urls[i] = imageUrls[imgIdx] || "";
        imgIdx += 1;
      }
    }
  }

  const cleaned = urls.filter(Boolean);
  if (!cleaned.length) throw new Error("فشل تجهيز المرفق — جرّبي مرة أخرى");
  return cleaned;
}

/**
 * POST /api/trip-chat/send
 *
 * trip-chat ما بيحفظش attachments[] — عشان كده:
 * 1) نرفع الملف ونحصل على رابط تخزين (أو data URL)
 * 2) نبعت الرابط جوّه رسالة الرحلة عشان يظهر player صوت/صورة
 */
export async function sendTripChatMessage({
  tripId,
  senderId,
  receiverId,
  message,
  attachments = [],
  uploadReceiverId,
}) {
  const files = Array.isArray(attachments) ? attachments.filter(Boolean) : [];
  const text = String(message ?? "").replace(/\u200b/g, "").trim();

  let mediaUrls = [];
  if (files.length > 0) {
    mediaUrls = await resolveMediaUrls({
      senderId,
      receiverId,
      uploadReceiverIds: [uploadReceiverId, receiverId].filter(Boolean),
      files,
    });
    if (mediaUrls.length === 0) {
      throw new Error("فشل رفع الملف — جرّبي مرة أخرى");
    }
  }

  // روابط الصوت تتعلّم بـ AUDIO: عشان تظهر كمشغّل حتى لو الامتداد مش واضح
  const hasAudioFile = files.some((f) => String(f?.type || "").startsWith("audio/"));
  const messageParts = [text];
  mediaUrls.forEach((url, i) => {
    const file = files[i];
    const isAudio =
      file?.type?.startsWith("audio/")
      || isAudioAttachmentUrl(url)
      || String(url).startsWith("data:audio/")
      || (hasAudioFile && !isImageAttachmentUrl(url));
    messageParts.push(isAudio ? `${AUDIO_MARK}${url}` : url);
  });
  const finalMessage = messageParts.filter(Boolean).join("\n").trim();
  if (!finalMessage) {
    throw new Error("أدخل رسالة أو أرفق ملف");
  }

  // form-data للرسائل الطويلة؛ لو فشل نجرب JSON
  if (finalMessage.length > 2000 || mediaUrls.some((u) => String(u).startsWith("data:"))) {
    const fd = new FormData();
    fd.append("trip_id", String(tripId));
    fd.append("sender_id", String(senderId ?? ""));
    fd.append("receiver_id", String(receiverId ?? ""));
    fd.append("message", finalMessage);
    const formRes = await fetch(`${API_BASE}/trip-chat/send`, {
      method: "POST",
      headers: { Accept: "application/json" },
      body: fd,
    });
    if (formRes.ok) return parseJsonResponse(formRes);
    // لو فشل form-data، نكمل ونحاول JSON
  }

  const res = await fetch(`${API_BASE}/trip-chat/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      trip_id: Number(tripId) || tripId,
      sender_id: senderId,
      receiver_id: receiverId,
      message: finalMessage,
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
