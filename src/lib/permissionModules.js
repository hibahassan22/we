import { PERMISSIONS, PERMISSION_LABELS, expandPermissions } from "./permissions.js";

function perm(key) {
  return { key, label: PERMISSION_LABELS[key] ?? key };
}

/** وحدات الصلاحيات — كل وحدة فيها صلاحيات فرعية قابلة للتفعيل */
export const PERMISSION_MODULES = [
  {
    id: "rewards",
    name: "المكافآت والأكواد الترويجية",
    icon: "🎁",
    iconBg: "bg-pink-100",
    permissions: [
      perm(PERMISSIONS.REWARDS_SETTINGS_READ),
      perm(PERMISSIONS.REWARDS_CODE_CREATE),
      perm(PERMISSIONS.REWARDS_CODE_EDIT),
      perm(PERMISSIONS.REWARDS_CODE_DELETE),
      perm(PERMISSIONS.REWARDS_CODE_TOGGLE),
    ],
  },
  {
    id: "clients",
    name: "قائمة العملاء",
    icon: "👥",
    iconBg: "bg-blue-100",
    permissions: [
      perm(PERMISSIONS.CLIENTS_READ),
      perm(PERMISSIONS.CLIENTS_CREATE),
      perm(PERMISSIONS.CLIENTS_EDIT),
      perm(PERMISSIONS.CLIENTS_DELETE),
      perm(PERMISSIONS.CLIENTS_EXPORT),
    ],
  },
  {
    id: "support",
    name: "الدعم الفني والتذاكر",
    icon: "🎧",
    iconBg: "bg-purple-100",
    permissions: [
      perm(PERMISSIONS.SUPPORT_TICKETS_READ),
      perm(PERMISSIONS.SUPPORT_TICKETS_REPLY),
      perm(PERMISSIONS.SUPPORT_TICKETS_CLOSE),
      perm(PERMISSIONS.SUPPORT_TICKETS_DELETE),
      perm(PERMISSIONS.SUPPORT_TICKETS_ESCALATE),
    ],
  },
  {
    id: "drivers",
    name: "سجل السائقين",
    icon: "🚗",
    iconBg: "bg-green-100",
    permissions: [
      perm(PERMISSIONS.DRIVERS_READ),
      perm(PERMISSIONS.DRIVERS_CREATE),
      perm(PERMISSIONS.DRIVERS_EDIT),
      perm(PERMISSIONS.DRIVERS_DELETE),
      perm(PERMISSIONS.DRIVERS_SUSPEND),
    ],
  },
  {
    id: "notifications",
    name: "إدارة الإشعارات",
    icon: "🔔",
    iconBg: "bg-yellow-100",
    permissions: [
      perm(PERMISSIONS.NOTIFICATIONS_READ),
      perm(PERMISSIONS.NOTIFICATIONS_SEND),
      perm(PERMISSIONS.NOTIFICATIONS_EDIT),
      perm(PERMISSIONS.NOTIFICATIONS_DELETE),
      perm(PERMISSIONS.NOTIFICATIONS_SCHEDULE),
    ],
  },
  {
    id: "trips_ads",
    name: "الرحلات المعروضة / الإعلانات",
    icon: "📢",
    iconBg: "bg-orange-100",
    permissions: [
      perm(PERMISSIONS.TRIPS_ADS_READ),
      perm(PERMISSIONS.TRIPS_ADS_CREATE),
      perm(PERMISSIONS.TRIPS_ADS_EDIT),
      perm(PERMISSIONS.TRIPS_ADS_DELETE),
      perm(PERMISSIONS.TRIPS_ADS_PUBLISH),
    ],
  },
  {
    id: "trips",
    name: "سجل الرحلات والتفاصيل",
    icon: "📋",
    iconBg: "bg-teal-100",
    permissions: [
      perm(PERMISSIONS.TRIPS_READ),
      perm(PERMISSIONS.TRIPS_CREATE),
      perm(PERMISSIONS.TRIPS_EDIT),
      perm(PERMISSIONS.TRIPS_CANCEL),
      perm(PERMISSIONS.TRIPS_EXPORT),
    ],
  },
  {
    id: "users",
    name: "المستخدمين",
    icon: "👤",
    iconBg: "bg-gray-100",
    permissions: [
      perm(PERMISSIONS.USERS_READ),
      perm(PERMISSIONS.USERS_CREATE),
      perm(PERMISSIONS.USERS_EDIT),
      perm(PERMISSIONS.USERS_DELETE),
    ],
  },
  {
    id: "permissions",
    name: "الصلاحيات والأدوار",
    icon: "🔐",
    iconBg: "bg-amber-100",
    permissions: [
      perm(PERMISSIONS.PERMISSIONS_READ),
      perm(PERMISSIONS.PERMISSIONS_EDIT),
      perm(PERMISSIONS.ROLES_READ),
      perm(PERMISSIONS.ROLES_EDIT),
    ],
  },
  {
    id: "dashboard",
    name: "لوحة التحكم",
    icon: "📊",
    iconBg: "bg-blue-100",
    permissions: [perm(PERMISSIONS.DASHBOARD_READ)],
  },
  {
    id: "activity",
    name: "سجل النشاطات",
    icon: "📝",
    iconBg: "bg-slate-100",
    permissions: [perm(PERMISSIONS.ACTIVITY_READ)],
  },
  {
    id: "approvals",
    name: "مركز الموافقات",
    icon: "✅",
    iconBg: "bg-emerald-100",
    permissions: [perm(PERMISSIONS.APPROVALS_READ), perm(PERMISSIONS.APPROVALS_EDIT)],
  },
  {
    id: "system",
    name: "إدارة النظام",
    icon: "⚙️",
    iconBg: "bg-zinc-100",
    permissions: [perm(PERMISSIONS.SYSTEM_READ), perm(PERMISSIONS.SYSTEM_EDIT)],
  },
  {
    id: "settings",
    name: "الإعدادات",
    icon: "🛠️",
    iconBg: "bg-orange-100",
    permissions: [perm(PERMISSIONS.SETTINGS_READ), perm(PERMISSIONS.SETTINGS_EDIT)],
  },
];

export function buildEmptyModuleState() {
  const state = {};
  PERMISSION_MODULES.forEach((m) => {
    state[m.id] = m.permissions.map(() => false);
  });
  return state;
}

export function moduleStateFromPermissions(permissions = []) {
  const expanded = new Set(expandPermissions(permissions));
  if (expanded.has("*")) {
    const all = {};
    PERMISSION_MODULES.forEach((m) => {
      all[m.id] = m.permissions.map(() => true);
    });
    return all;
  }
  const state = buildEmptyModuleState();
  PERMISSION_MODULES.forEach((m) => {
    state[m.id] = m.permissions.map((p) => expanded.has(p.key));
  });
  return state;
}

export function permissionsFromModuleState(moduleState) {
  const keys = [];
  PERMISSION_MODULES.forEach((m) => {
    m.permissions.forEach((p, i) => {
      if (moduleState[m.id]?.[i]) keys.push(p.key);
    });
  });
  return keys;
}

export function countEnabledInState(moduleState) {
  return Object.values(moduleState).flat().filter(Boolean).length;
}

export function totalPermissionCount() {
  return PERMISSION_MODULES.reduce((n, m) => n + m.permissions.length, 0);
}
