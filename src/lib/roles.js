/**
 * Role-based access — integrates with Firestore roles + permission keys.
 */


export { canAccessRoute, ADMIN_ONLY_ROUTES } from "./permissions.js";
export { resolvePermissions, createRoleAccess, getFirstAccessibleRoute } from "./roleAccess.js";

export const ROLES = {
  ADMIN: "admin",
  SUPPORT: "support",
  ACCOUNTANT: "accountant",
  SUPERVISOR: "supervisor",
};

export const ROLE_LABELS = {
  admin: "مدير النظام",
  support: "خدمة عملاء",
  accountant: "محاسب",
  supervisor: "مشرف",
};

export const USER_STATUSES = {
  ACTIVE: "active",
  INACTIVE: "inactive",
  SUSPENDED: "suspended",
  BLOCKED: "blocked",
  DISABLED: "disabled",
};

export const STATUS_LABELS = {
  active: "نشط",
  inactive: "غير نشط",
  suspended: "معلق",
  blocked: "محظور",
  disabled: "معطل",
};

/** Default permissions per built-in role (until Admin configures Firestore roles) */
export const DEFAULT_ROLE_PERMISSIONS = {
  admin: ["*"],
  support: [
    "Dashboard.Read",
    "Trips.Read", "Trips.Edit",
    "Clients.Read", "Clients.Edit",
    "Support.Read", "Support.Edit",
    "Notifications.Read", "Notifications.Send",
  ],
  accountant: [
    "Dashboard.Read", "Trips.Read", "Rewards.Read", "Rewards.Edit",
  ],
  supervisor: [
    "Dashboard.Read", "Trips.Read", "Trips.Edit",
    "Clients.Read", "Drivers.Read", "Support.Read",
    "Notifications.Read", "Approvals.Read",
  ],
};

export function hasWildcard(permissions) {
  return permissions?.includes("*");
}
