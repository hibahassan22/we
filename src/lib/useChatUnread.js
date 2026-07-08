import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "drivo_chat_unread";
const CHANGE_EVENT = "drivo-chat-unread-change";

function readUnreadSet() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

function writeUnreadSet(set) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function markChatDriverRead(driverId) {
  const id = String(driverId);
  const set = readUnreadSet();
  if (!set.delete(id)) return;
  writeUnreadSet(set);
}

export function markChatDriverUnread(driverId) {
  const id = String(driverId);
  const set = readUnreadSet();
  if (set.has(id)) return;
  set.add(id);
  writeUnreadSet(set);
}

/** Sync unread flags from driver API fields (if provided). */
export function syncChatUnreadFromDrivers(drivers = []) {
  const set = readUnreadSet();
  let changed = false;
  let persistedMessages = {};
  try {
    persistedMessages = JSON.parse(localStorage.getItem("drivo_chat_messages") || "{}");
  } catch { /* ignore */ }

  for (const d of drivers) {
    const id = String(d.id);
    const unreadCount = Number(d.unread_count ?? d.unread_messages ?? d.unread ?? 0);
    const msgs = persistedMessages[id] ?? [];
    const lastMsg = msgs[msgs.length - 1];
    const hasUnreadMessage = lastMsg && lastMsg.sender && lastMsg.sender !== "me";

    if (unreadCount > 0 || d.has_unread === true || hasUnreadMessage) {
      if (!set.has(id)) {
        set.add(id);
        changed = true;
      }
    }
  }

  if (changed) writeUnreadSet(set);
}

export function useChatUnreadCount() {
  const [count, setCount] = useState(() => readUnreadSet().size);

  useEffect(() => {
    const refresh = () => setCount(readUnreadSet().size);
    window.addEventListener(CHANGE_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(CHANGE_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  return count;
}

export function useChatUnreadActions() {
  const markRead = useCallback((driverId) => markChatDriverRead(driverId), []);
  const markUnread = useCallback((driverId) => markChatDriverUnread(driverId), []);
  const syncFromDrivers = useCallback((drivers) => syncChatUnreadFromDrivers(drivers), []);
  return { markRead, markUnread, syncFromDrivers };
}

export function isChatDriverUnread(driverId) {
  return readUnreadSet().has(String(driverId));
}
