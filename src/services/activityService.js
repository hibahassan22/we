import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase/firestore.js";

function getDeviceInfo() {
  if (typeof navigator === "undefined") return "unknown";
  return navigator.userAgent?.slice(0, 120) ?? "unknown";
}

export async function logActivity({
  action,
  performedBy,
  targetUser = "",
  metadata = {},
}) {
  return addDoc(collection(db, "activityLogs"), {
    action,
    performedBy,
    targetUser,
    timestamp: serverTimestamp(),
    device: getDeviceInfo(),
    ip: metadata.ip ?? null,
    ...metadata,
  });
}

export const ACTIVITY_ACTIONS = {
  LOGIN: "login",
  LOGOUT: "logout",
  CREATE_USER: "create_user",
  UPDATE_USER: "update_user",
  DELETE_USER: "delete_user",
  ROLE_CHANGED: "role_changed",
  PERMISSION_CHANGED: "permission_changed",
  PASSWORD_RESET: "password_reset",
  PASSWORD_CHANGED: "password_changed",
  STATUS_CHANGED: "status_changed",
};
