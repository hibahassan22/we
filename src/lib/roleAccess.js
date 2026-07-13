/**
 * RoleAccess — سياسة صلاحيات الحساب (مثل Class في OOP)
 *
 * - كل مستخدم له roleId (مثلاً admin, support, خدمة_عملاء)
 * - المدير يحدد صلاحيات كل دور عبر API → /api/role-permissions
 * - عند تسجيل الدخول تُحمَّل صلاحيات الدور وتُطبَّق على القائمة والصفحات والأزرار
 * - admin دائماً لديه ["*"] = وصول كامل
 */
import { expandPermissions, hasPermission, hasAnyPermission, canAccessRoute } from "./permissions.js";
import { expandPermIdKeys } from "./apiPermissionBridge.js";
import { ROLES, DEFAULT_ROLE_PERMISSIONS } from "./roles.js";

const ROUTE_PRIORITY = [
  "/dashboard",
  "/trips",
  "/create-trip",
  "/clients",
  "/drivers",
  "/rewards",
  "/support",
  "/notifications",
  "/activity",
  "/approvals",
  "/users",
  "/permissions",
  "/system",
  "/accounts",
  "/settings",
];

/** توسيع perm:47 وغيرها إلى مفاتيح Trips.Read */
function expandWithPermIds(permissions = []) {
  const set = new Set(expandPermissions(permissions));
  for (const p of permissions) {
    if (typeof p === "string" && p.startsWith("perm:")) {
      set.add(p);
      expandPermIdKeys(p).forEach((k) => set.add(k));
    }
  }
  for (const p of set) {
    if (typeof p === "string" && p.startsWith("perm:")) {
      expandPermIdKeys(p).forEach((k) => set.add(k));
    }
  }
  return [...set];
}

/** دمج دور المستخدم + قالب الدور من Firebase + أي صلاحيات فردية */
export function resolvePermissions(roleId, roleDocPermissions, userPermissions = []) {
  const role = roleId || ROLES.SUPPORT;

  if (Array.isArray(roleDocPermissions) && roleDocPermissions.includes("*")) return ["*"];

  if (role === ROLES.ADMIN) return ["*"];

  if (Array.isArray(userPermissions) && userPermissions.length > 0) {
    return userPermissions;
  }

  if (Array.isArray(roleDocPermissions)) {
    return roleDocPermissions;
  }

  if (roleId && Object.prototype.hasOwnProperty.call(DEFAULT_ROLE_PERMISSIONS, role)) {
    return DEFAULT_ROLE_PERMISSIONS[role];
  }

  return [];
}

export function createRoleAccess({ roleId, permissions = [] } = {}) {
  const expanded = expandWithPermIds(permissions);
  const isAdmin = expanded.includes("*");

  return {
    roleId: roleId ?? ROLES.SUPPORT,
    permissions: expanded,
    isAdmin,

    can(permission) {
      if (!permission) return true;
      return isAdmin || hasPermission(expanded, permission);
    },

    canAny(perms = []) {
      if (!perms.length) return true;
      return isAdmin || hasAnyPermission(expanded, perms);
    },

    canRoute(pathname) {
      if (!pathname || pathname === "/change-password") return true;
      if (isAdmin) return true;
      return canAccessRoute(expanded, pathname);
    },

    /** أول صفحة مسموح بها — للتوجيه عند منع الوصول */
    firstRoute() {
      if (isAdmin) return "/dashboard";
      for (const route of ROUTE_PRIORITY) {
        if (canAccessRoute(expanded, route)) return route;
      }
      return "/settings";
    },
  };
}

export function getFirstAccessibleRoute(permissions = []) {
  return createRoleAccess({ permissions }).firstRoute();
}
