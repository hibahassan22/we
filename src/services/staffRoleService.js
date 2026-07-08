import { doc, setDoc, getDocs, collection } from "firebase/firestore";
import { db } from "../firebase/firestore.js";
import { getIdToken } from "./authService.js";

const COLLECTION = "staffRoles";

/** Firestore لا يتعامل جيداً مع # و / في بعض المسارات — نرمّز المعرّف */
export function staffRoleDocId(salesId) {
  return String(salesId)
    .replace(/#/g, "_h_")
    .replace(/\//g, "_s_");
}

export function salesIdFromDocId(docId) {
  return String(docId).replace(/_h_/g, "#").replace(/_s_/g, "/");
}

function formatStaffRoleError(err) {
  const code = err?.code ?? "";
  if (code === "permission-denied") {
    return "فشل حفظ الدور — تأكد أنك مدير وأن قواعد Firebase منشورة (firebase deploy --only firestore:rules)";
  }
  return err?.message || "فشل حفظ الدور";
}

/** حفظ دور الموظف في Firebase — المفتاح = id من /api/sales */
export async function saveStaffRole(staffId, role) {
  if (!staffId) {
    throw new Error("معرّف الموظف مطلوب لحفظ الدور");
  }
  if (!role) {
    throw new Error("يجب اختيار دور للموظف");
  }

  const salesId = String(staffId);
  const docId = staffRoleDocId(salesId);

  try {
    await setDoc(
      doc(db, COLLECTION, docId),
      {
        role,
        salesId,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (err) {
    throw new Error(formatStaffRoleError(err));
  }
}

/** مزامنة دور حساب Firebase عبر البريد (إن وُجد) — بعد تعيين دور لموظف مبيعات */
export async function syncFirebaseUserRoleByEmail(email, role) {
  const normalized = String(email ?? "").trim().toLowerCase();
  if (!normalized || !role) return { synced: false };

  const token = await getIdToken();
  if (!token) return { synced: false };

  const res = await fetch("/api/admin/users/sync-role-by-email", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ email: normalized, role }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 404) return { synced: false, reason: "no_firebase_user" };
    throw new Error(data.message || "فشل مزامنة دور Firebase");
  }
  return { synced: true, uid: data.uid };
}

/** جلب كل الأدوار: { [salesId]: role } */
export async function fetchStaffRolesMap() {
  const snap = await getDocs(collection(db, COLLECTION));
  const map = {};
  snap.docs.forEach((d) => {
    const data = d.data();
    const salesId = data?.salesId ?? salesIdFromDocId(d.id);
    if (data?.role) map[String(salesId)] = data.role;
  });
  return map;
}
