import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase/firestore.js";

export async function createNotification({
  title,
  body,
  type = "user",
  createdBy = "",
  driverId = "",
  sender = "",
  deliveryStatus = "sent",
  read = false,
}) {
  return addDoc(collection(db, "notifications"), {
    title,
    body,
    type,
    createdBy,
    driverId: String(driverId ?? ""),
    sender,
    deliveryStatus,
    read,
    createdAt: serverTimestamp(),
  });
}

export async function notifyUserAction({ action, targetName, targetRole, adminUid }) {
  const actionLabels = {
    created: "تم إنشاء مستخدم جديد",
    updated: "تم تحديث مستخدم",
    deleted: "تم حذف مستخدم",
    suspended: "تم تعليق مستخدم",
    activated: "تم تفعيل مستخدم",
    status_changed: "تم تغيير حالة مستخدم",
  };

  const title = actionLabels[action] ?? "تحديث مستخدم";
  const body = targetName
    ? `${targetName}${targetRole ? ` — ${targetRole}` : ""}`
    : "عملية على حساب مستخدم";

  return createNotification({
    title,
    body,
    type: "user",
    createdBy: adminUid,
    sender: adminUid,
  });
}

/** Mirror driver notification API result into Firestore */
export async function saveDriverNotificationFromApi(payload, senderUid = "") {
  return createNotification({
    title: payload.title ?? payload.notification?.title ?? "إشعار",
    body: payload.body ?? payload.message ?? payload.notification?.body ?? "",
    type: payload.type ?? "driver",
    driverId: payload.driver_id ?? payload.driverId ?? "",
    sender: senderUid,
    deliveryStatus: "sent",
    createdBy: senderUid,
  });
}
