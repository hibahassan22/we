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
  const support = roles.find((r) => String(r.id) === "support" || r.name === "خدمة عملاء");
  if (support) return String(support.id);
  return roles[0]?.id != null ? String(roles[0].id) : "";
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
