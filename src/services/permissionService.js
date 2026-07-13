import { getIdToken } from "./authService.js";
import { apiPermissionsToInternalKeys, expandPermIdKeys } from "../lib/apiPermissionBridge.js";

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

function parseList(json) {
  if (Array.isArray(json)) return json;
  return json?.data ?? [];
}

/** GET /api/permissions */
export async function fetchPermissions() {
  const res = await fetch(`${API_BASE}/permissions`, { headers: await authHeaders() });
  const data = await parseResponse(res);
  return parseList(data);
}

/** GET /api/permissions/{id} */
export async function fetchPermissionById(id) {
  const res = await fetch(`${API_BASE}/permissions/${encodeURIComponent(id)}`, {
    headers: await authHeaders(),
  });
  const data = await parseResponse(res);
  return data?.data ?? data;
}

/** POST /api/permissions */
export async function createPermission({ permission_name, display_name, module }) {
  const res = await fetch(`${API_BASE}/permissions`, {
    method: "POST",
    headers: await authHeaders(true),
    body: JSON.stringify({ permission_name, display_name, module }),
  });
  const data = await parseResponse(res);
  return data?.data ?? data;
}

/** PUT /api/permissions/{id} */
export async function updatePermission(id, patch) {
  const res = await fetch(`${API_BASE}/permissions/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: await authHeaders(true),
    body: JSON.stringify(patch),
  });
  const data = await parseResponse(res);
  return data?.data ?? data;
}

/** DELETE /api/permissions/{id} */
export async function deletePermission(id) {
  const res = await fetch(`${API_BASE}/permissions/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: await authHeaders(),
  });
  await parseResponse(res);
}

/** GET /api/role-permissions */
export async function fetchRolePermissionLinks() {
  const res = await fetch(`${API_BASE}/role-permissions`, { headers: await authHeaders() });
  const data = await parseResponse(res);
  return parseList(data);
}

/** روابط صلاحيات دور معيّن */
export async function fetchRolePermissionLinksByRoleId(roleId) {
  if (roleId == null || roleId === "") return [];
  const all = await fetchRolePermissionLinks();
  return all.filter((rp) => String(rp.role_id) === String(roleId));
}

/** POST /api/role-permissions */
export async function assignRolePermission(roleId, permissionId) {
  const res = await fetch(`${API_BASE}/role-permissions`, {
    method: "POST",
    headers: await authHeaders(true),
    body: JSON.stringify({
      role_id: Number(roleId) || roleId,
      permission_id: Number(permissionId) || permissionId,
    }),
  });
  const data = await parseResponse(res);
  return data?.data ?? data;
}

/** PUT /api/role-permissions/{id} */
export async function updateRolePermissionLink(linkId, { role_id, permission_id }) {
  const res = await fetch(`${API_BASE}/role-permissions/${encodeURIComponent(linkId)}`, {
    method: "PUT",
    headers: await authHeaders(true),
    body: JSON.stringify({ role_id, permission_id }),
  });
  const data = await parseResponse(res);
  return data?.data ?? data;
}

/** DELETE /api/role-permissions/{id} */
export async function deleteRolePermissionLink(linkId) {
  const res = await fetch(`${API_BASE}/role-permissions/${encodeURIComponent(linkId)}`, {
    method: "DELETE",
    headers: await authHeaders(),
  });
  await parseResponse(res);
}

/** يملأ كائن الصلاحية من permission_id عند غياب permission في رابط الدور */
export function enrichRolePermissionLinks(links = [], catalog = []) {
  const byId = new Map(catalog.map((p) => [String(p.id), p]));
  return links.map((link) => {
    if (link?.permission?.id != null) return link.permission;
    const pid = link?.permission_id ?? link?.permission?.id;
    if (pid == null) return null;
    return byId.get(String(pid)) ?? { id: pid, permission_name: "", module: "" };
  }).filter((p) => p?.id != null);
}

/** تحميل مفاتيح الصلاحيات الداخلية لدور — من /api/role-permissions فقط */
export async function loadRolePermissionKeys(roleId) {
  const [links, catalog] = await Promise.all([
    fetchRolePermissionLinksByRoleId(roleId),
    fetchPermissions(),
  ]);

  const permObjects = enrichRolePermissionLinks(links, catalog);
  const keys = new Set(apiPermissionsToInternalKeys(permObjects));

  for (const link of links) {
    const pid = link?.permission_id ?? link?.permission?.id;
    if (pid == null) continue;
    const token = `perm:${pid}`;
    keys.add(token);
    expandPermIdKeys(token).forEach((k) => keys.add(k));
  }

  return [...keys];
}

/** ربط كل صلاحيات النظام بدور معيّن */
export async function grantAllPermissionsToRole(roleId) {
  const all = await fetchPermissions();
  const ids = all.map((p) => p.id).filter((id) => id != null);
  await syncRolePermissions(roleId, ids);
  return ids.length;
}

/** مزامنة صلاحيات الدور — إضافة الجديد وحذف الملغى */
export async function syncRolePermissions(roleId, permissionIds = []) {
  const rid = String(roleId);
  const target = new Set(permissionIds.map((id) => String(id)));
  const current = await fetchRolePermissionLinksByRoleId(rid);

  const toRemove = current.filter((rp) => !target.has(String(rp.permission_id)));
  const currentIds = new Set(current.map((rp) => String(rp.permission_id)));
  const toAdd = [...target].filter((pid) => !currentIds.has(pid));

  await Promise.all([
    ...toRemove.map((rp) => deleteRolePermissionLink(rp.id)),
    ...toAdd.map((pid) => assignRolePermission(rid, pid)),
  ]);
}
