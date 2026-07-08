import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase/firestore.js";
import { getIdToken } from "./authService.js";

const BASE = "https://drivo1.elmoroj.com/api";
const PERMS_COLLECTION = "roles";

async function authHeaders(json = false) {
  const token = await getIdToken();
  const h = { Accept: "application/json" };
  if (token) h["Authorization"] = `Bearer ${token}`;
  if (json) h["Content-Type"] = "application/json";
  return h;
}

async function parseResponse(res) {
  const text = await res.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { message: text };
  }
  if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);
  return data;
}

function normalizeRole(apiRole, permissions = []) {
  return {
    id: apiRole.id,
    name: apiRole.role_name ?? apiRole.name ?? "",
    description: apiRole.description ?? "",
    createdAt: apiRole.created_at ?? apiRole.createdAt,
    updatedAt: apiRole.updated_at ?? apiRole.updatedAt,
    permissions,
  };
}

async function fetchFirebasePermissions(roleId) {
  try {
    const snap = await getDoc(doc(db, PERMS_COLLECTION, String(roleId)));
    if (!snap.exists()) return [];
    return snap.data().permissions ?? [];
  } catch {
    return [];
  }
}

async function saveFirebasePermissions(roleId, permissions) {
  await setDoc(
    doc(db, PERMS_COLLECTION, String(roleId)),
    { permissions, updatedAt: new Date().toISOString() },
    { merge: true }
  );
}

export function isProtectedRole(role) {
  if (!role) return false;
  const id = String(role.id ?? role).toLowerCase();
  const name = String(role.name ?? role.role_name ?? "").trim();
  return id === "admin" || name === "مدير النظام" || name.toLowerCase() === "admin";
}

export async function fetchRoles() {
  const res = await fetch(`${BASE}/roles`, { headers: await authHeaders() });
  const data = await parseResponse(res);
  const list = Array.isArray(data?.data) ? data.data : [];

  const roles = await Promise.all(
    list.map(async (r) => normalizeRole(r, await fetchFirebasePermissions(r.id)))
  );

  return roles.sort((a, b) => Number(a.id) - Number(b.id));
}

/** @deprecated استخدم fetchRoles — لا يوجد realtime من الـ API */
export function subscribeRoles(callback) {
  fetchRoles()
    .then(callback)
    .catch((err) => {
      console.error("[roles] fetch error:", err);
      callback([]);
    });
  return () => {};
}

export async function createRole({ name, description = "", permissions = [] }) {
  const trimmedName = name?.trim();
  if (!trimmedName) throw new Error("اسم الدور مطلوب");

  const res = await fetch(`${BASE}/roles`, {
    method: "POST",
    headers: await authHeaders(true),
    body: JSON.stringify({
      role_name: trimmedName,
      description: description?.trim() || "",
    }),
  });

  const data = await parseResponse(res);
  const role = normalizeRole(data?.data ?? data, permissions);

  if (permissions.length) {
    await saveFirebasePermissions(role.id, permissions);
  }

  return role;
}

export async function updateRole(roleId, patch) {
  if (!roleId) throw new Error("معرّف الدور مطلوب");

  const body = {};
  if (patch.name !== undefined) body.role_name = patch.name;
  if (patch.description !== undefined) body.description = patch.description;

  if (Object.keys(body).length) {
    const res = await fetch(`${BASE}/roles/${roleId}`, {
      method: "PUT",
      headers: await authHeaders(true),
      body: JSON.stringify(body),
    });
    await parseResponse(res);
  }

  if (patch.permissions !== undefined) {
    await saveFirebasePermissions(roleId, patch.permissions);
  }
}

export async function updateRolePermissions(roleId, permissions) {
  if (!roleId) throw new Error("معرّف الدور مطلوب");
  if (isProtectedRole({ id: roleId })) {
    await saveFirebasePermissions(roleId, ["*"]);
    return;
  }
  await saveFirebasePermissions(roleId, Array.isArray(permissions) ? permissions : []);
}

export async function deleteRole(roleId) {
  if (!roleId) throw new Error("معرّف الدور مطلوب");
  if (isProtectedRole({ id: roleId })) throw new Error("لا يمكن حذف دور مدير النظام");

  const res = await fetch(`${BASE}/roles/${roleId}`, {
    method: "DELETE",
    headers: await authHeaders(),
  });
  await parseResponse(res);
}

export function formatRoleDate(value) {
  if (!value) return "—";
  const d = value?.toDate ? value.toDate() : new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("ar-SA");
}
