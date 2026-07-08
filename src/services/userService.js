import {
  collection,
  doc,
  onSnapshot,
  query,
  orderBy,
  limit,
  startAfter,
  getDocs,
  where,
} from "firebase/firestore";
import { db } from "../firebase/firestore.js";
import { getIdToken } from "./authService.js";
import { getApiErrorMessage } from "../lib/authErrors.js";
import { fetchRoles } from "./roleService.js";

export { fetchRoles };

const ADMIN_BASE = "/api/admin";

async function adminFetch(path, options = {}) {
  const token = await getIdToken();
  if (!token) throw new Error("يجب تسجيل الدخول أولاً");

  const res = await fetch(`${ADMIN_BASE}${path}`, {
    ...options,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers ?? {}),
    },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(getApiErrorMessage(data, `خطأ ${res.status}`));
  }
  return data;
}

export function subscribeUsers(callback, { search = "", role = "", status = "" } = {}) {
  const constraints = [orderBy("createdAt", "desc")];
  if (role) constraints.unshift(where("role", "==", role));
  if (status) constraints.unshift(where("status", "==", status));

  const q = query(collection(db, "users"), ...constraints);
  return onSnapshot(
    q,
    (snap) => {
      let users = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      if (search.trim()) {
        const term = search.trim().toLowerCase();
        users = users.filter(
          (u) =>
            u.fullName?.toLowerCase().includes(term) ||
            u.email?.toLowerCase().includes(term) ||
            u.phone?.includes(term)
        );
      }
      callback(users);
    },
    (err) => {
      console.error("[users] listener error:", err);
      callback([]);
    }
  );
}

export async function fetchUsersPage({ pageSize = 10, lastDoc = null, filters = {} } = {}) {
  const constraints = [orderBy("createdAt", "desc"), limit(pageSize)];
  if (filters.role) constraints.unshift(where("role", "==", filters.role));
  if (filters.status) constraints.unshift(where("status", "==", filters.status));
  if (lastDoc) constraints.push(startAfter(lastDoc));

  const q = query(collection(db, "users"), ...constraints);
  const snap = await getDocs(q);
  return {
    users: snap.docs.map((d) => ({ id: d.id, ...d.data() })),
    lastDoc: snap.docs[snap.docs.length - 1] ?? null,
  };
}

export async function createUser(payload) {
  return adminFetch("/create-user", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateUser(uid, payload) {
  return adminFetch(`/users/${uid}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function deleteUser(uid) {
  return adminFetch(`/users/${uid}`, { method: "DELETE" });
}

export async function updateUserStatus(uid, status) {
  return adminFetch(`/users/${uid}/status`, {
    method: "POST",
    body: JSON.stringify({ status }),
  });
}

export async function resetUserPassword(uid) {
  return adminFetch(`/users/${uid}/reset-password`, { method: "POST" });
}

export async function fetchDepartments() {
  const snap = await getDocs(collection(db, "departments"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function fetchPermissions() {
  const snap = await getDocs(collection(db, "permissions"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
