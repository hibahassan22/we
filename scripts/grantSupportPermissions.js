/**
 * Grant all API permissions to the customer-service role.
 *
 * Usage: node scripts/grantSupportPermissions.js [roleId]
 * Default roleId: auto-detect «خدمة عملاء» from GET /api/roles
 */
const API_BASE = process.env.DRIVO_API_BASE ?? "https://drivo1.elmoroj.com/api";

async function fetchJson(path) {
  const res = await fetch(`${API_BASE}${path}`, { headers: { Accept: "application/json" } });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);
  return data;
}

function findSupportRole(roles = []) {
  return roles.find((r) => {
    const name = String(r.role_name ?? r.name ?? "").trim();
    return (
      name === "خدمة عملاء" ||
      name === "خدمة العملاء" ||
      (name.includes("خدمة") && name.includes("عمل"))
    );
  });
}

async function syncRolePermissions(roleId, permissionIds) {
  const linksRes = await fetchJson("/role-permissions");
  const links = Array.isArray(linksRes?.data) ? linksRes.data : linksRes;
  const current = links.filter((rp) => String(rp.role_id) === String(roleId));
  const target = new Set(permissionIds.map(String));
  const currentIds = new Set(current.map((rp) => String(rp.permission_id)));

  for (const rp of current) {
    if (!target.has(String(rp.permission_id))) {
      await fetch(`${API_BASE}/role-permissions/${rp.id}`, { method: "DELETE" });
    }
  }

  for (const pid of target) {
    if (!currentIds.has(pid)) {
      const res = await fetch(`${API_BASE}/role-permissions`, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ role_id: Number(roleId), permission_id: Number(pid) }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.warn(`skip permission ${pid}:`, err?.message || res.status);
      }
    }
  }
}

async function main() {
  const argRoleId = process.argv[2];
  const [rolesRes, permsRes] = await Promise.all([
    fetchJson("/roles"),
    fetchJson("/permissions"),
  ]);

  const roles = Array.isArray(rolesRes?.data) ? rolesRes.data : rolesRes;
  const permissions = Array.isArray(permsRes?.data) ? permsRes.data : permsRes;

  const role = argRoleId
    ? roles.find((r) => String(r.id) === String(argRoleId))
    : findSupportRole(roles);

  if (!role) {
    console.error("Role not found. Pass role id: node scripts/grantSupportPermissions.js 6");
    process.exit(1);
  }

  const ids = permissions.map((p) => p.id).filter(Boolean);
  await syncRolePermissions(role.id, ids);
  console.log(`Granted ${ids.length} permissions to role #${role.id} (${role.role_name ?? role.name})`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
