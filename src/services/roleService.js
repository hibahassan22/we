import { getIdToken } from "./authService.js";
import { fetchRolePermissionLinks, syncRolePermissions } from "./permissionService.js";

const API_BASE = "/api";

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

function normalizeRole(apiRole, permissionLinks = []) {
  const rolePerms = permissionLinks
    .filter((rp) => String(rp.role_id) === String(apiRole.id))
    .map((rp) => rp.permission ?? { id: rp.permission_id })
    .filter(Boolean);

  return {
    id: apiRole.id,
    name: apiRole.role_name ?? apiRole.name ?? "",
    description: apiRole.description ?? "",
    createdAt: apiRole.created_at ?? apiRole.createdAt,
    updatedAt: apiRole.updated_at ?? apiRole.updatedAt,
    permissions: rolePerms,
    permissionIds: rolePerms.map((p) => p.id),
  };
}

export function isProtectedRole(role) {
  if (!role) return false;
  const id = String(role.id ?? role).toLowerCase();
  const name = String(role.name ?? role.role_name ?? "").trim();
  return id === "admin" || name === "مدير النظام" || name.toLowerCase() === "admin";
}

export async function fetchRoles() {
  const [rolesRes, links] = await Promise.all([
    fetch(`${API_BASE}/roles`, { headers: await authHeaders() }).then(parseResponse),
    fetchRolePermissionLinks().catch(() => []),
  ]);

  const list = Array.isArray(rolesRes?.data) ? rolesRes.data : [];
  const roles = list.map((r) => normalizeRole(r, links));
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

export async function createRole({ name, description = "" }) {
  const trimmedName = name?.trim();
  if (!trimmedName) throw new Error("اسم الدور مطلوب");

  const res = await fetch(`${API_BASE}/roles`, {
    method: "POST",
    headers: await authHeaders(true),
    body: JSON.stringify({
      role_name: trimmedName,
      description: description?.trim() || "",
    }),
  });

  const data = await parseResponse(res);
  return normalizeRole(data?.data ?? data, []);
}

export async function updateRole(roleId, patch) {
  if (!roleId) throw new Error("معرّف الدور مطلوب");

  const body = {};
  if (patch.name !== undefined) body.role_name = patch.name;
  if (patch.description !== undefined) body.description = patch.description;

  if (Object.keys(body).length) {
    const res = await fetch(`${API_BASE}/roles/${roleId}`, {
      method: "PUT",
      headers: await authHeaders(true),
      body: JSON.stringify(body),
    });
    await parseResponse(res);
  }

  if (patch.permissionIds !== undefined) {
    await syncRolePermissions(roleId, patch.permissionIds);
  }
}

export async function updateRolePermissions(roleId, permissionIds) {
  if (!roleId) throw new Error("معرّف الدور مطلوب");
  if (isProtectedRole({ id: roleId })) return;
  await syncRolePermissions(roleId, Array.isArray(permissionIds) ? permissionIds : []);
}

export async function deleteRole(roleId) {
  if (!roleId) throw new Error("معرّف الدور مطلوب");
  if (isProtectedRole({ id: roleId })) throw new Error("لا يمكن حذف دور مدير النظام");

  const res = await fetch(`${API_BASE}/roles/${roleId}`, {
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
