import { collection, addDoc, getDocs, doc, updateDoc, query, orderBy, onSnapshot, serverTimestamp, where } from "firebase/firestore";
import { db } from "./firebase";

const COL = "notifications";

export async function saveNotification(data) {
  return addDoc(collection(db, COL), {
    title:     data.title    ?? "",
    body:      data.body     ?? "",
    driverId:  String(data.driverId ?? ""),
    type:      data.type     ?? "driver",
    read:      false,
    createdAt: serverTimestamp(),
  });
}

export async function markAsRead(docId) {
  await updateDoc(doc(db, COL, docId), { read: true });
}

export async function markAllAsRead() {
  const snap = await getDocs(query(collection(db, COL), where("read", "==", false)));
  await Promise.all(snap.docs.map(d => updateDoc(d.ref, { read: true })));
}

export function subscribeNotifications(callback) {
  const q = query(collection(db, COL), orderBy("createdAt", "desc"));
  return onSnapshot(q, snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
}

export async function syncBackendNotifications(backendItems = []) {
  if (!backendItems.length) return;
  const snap = await getDocs(collection(db, COL));
  const existingKeys = new Set(snap.docs.map(d => { const x = d.data(); return (x.title ?? "") + "|" + (x.driverId ?? ""); }));
  const writes = backendItems
    .filter(item => !existingKeys.has((item.title ?? item.type ?? "") + "|" + (item.driver_id ?? item.driverId ?? "")))
    .map(item => addDoc(collection(db, COL), {
      title:    item.title   ?? item.type ?? "اشعار",
      body:     item.content ?? item.body ?? "",
      driverId: String(item.driver_id ?? item.driverId ?? ""),
      type:     item.type    ?? "system",
      read:     item.status === "read",
      createdAt: serverTimestamp(),
    }));
  await Promise.all(writes);
}