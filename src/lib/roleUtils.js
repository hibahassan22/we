import { ROLE_LABELS } from "./roles.js";

/** خيارات الأدوار من API — apiOnly يمنع الأدوار الافتراضية النصية */
export function buildRoleOptions(roles = [], { apiOnly = false } = {}) {
  if (!roles.length) {
    if (apiOnly) return [];
    return Object.entries(ROLE_LABELS).map(([id, name]) => ({ id, name }));
  }
  return roles.map((r) => ({
    id: String(r.id),
    name: r.name ?? ROLE_LABELS[r.id] ?? r.id,
    description: r.description ?? "",
  }));
}

export function getRoleLabel(roleId, roles = []) {
  if (roleId == null || roleId === "") return "غير محدد";
  const id = String(roleId);
  const match = roles.find((r) => String(r.id) === id);
  return match?.name ?? ROLE_LABELS[roleId] ?? roleId;
}

export function getDefaultRoleId(roles = []) {
  const support = findSupportRole(roles);
  if (support) return String(support.id);
  return roles[0]?.id != null ? String(roles[0].id) : "";
}

/** هل الدور هو «خدمة عملاء»؟ يقبل كائن دور أو roleId + name */
export function isSupportRole(roleOrId, roleName = "") {
  if (roleOrId && typeof roleOrId === "object") {
    const id = String(roleOrId.id ?? roleOrId.role_id ?? "");
    const name = String(roleOrId.name ?? roleOrId.role_name ?? "").trim();
    return (
      id === "6" ||
      id === "support" ||
      name === "خدمة عملاء" ||
      name === "خدمة العملاء" ||
      (name.includes("خدمة") && name.includes("عمل"))
    );
  }
  const id = String(roleOrId ?? "");
  const name = String(roleName ?? "").trim();
  return (
    id === "6" ||
    id === "support" ||
    name === "خدمة عملاء" ||
    name === "خدمة العملاء" ||
    (name.includes("خدمة") && name.includes("عمل"))
  );
}

/** يُعثر على دور خدمة العملاء من قائمة الأدوار */
export function findSupportRole(roles = []) {
  return roles.find((r) => isSupportRole(r));
}

/** يُرجع معرّف دور رقمي صالح للـ API أو null */
export function parseApiRoleId(roleId) {
  if (roleId == null || roleId === "") return null;
  const n = Number(String(roleId).trim());
  return Number.isInteger(n) && n > 0 ? n : null;
}

/** يحل معرّف الدور من القيمة المختارة أو من قائمة الأدوار */
export function resolveApiRoleId(roleId, roles = []) {
  const direct = parseApiRoleId(roleId);
  if (direct) return direct;

  const match = roles.find((r) => String(r.id) === String(roleId));
  return parseApiRoleId(match?.id);
}
