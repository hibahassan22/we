import { useState, useEffect } from "react";
import { subscribeNotifications, isNotificationUnread } from "../services/notifications";

/**
 * Real-time unread notification count (Firestore + synced backend state).
 */
export function useUnreadCount() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const unsub = subscribeNotifications((items) => {
      setCount(items.filter(isNotificationUnread).length);
    });
    return unsub;
  }, []);

  return count;
}
