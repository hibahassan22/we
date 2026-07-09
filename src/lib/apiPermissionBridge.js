import { PERMISSIONS } from "./permissions.js";

/** تطبيع النص العربي للمقارنة */
export function normKey(value) {
  return String(value ?? "")
    .trim()
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

/** صلاحيات الشريط الجانبي (module = sidebar) */
const SIDEBAR_MAP = {
  [normKey("لوحة التحكم")]: [PERMISSIONS.DASHBOARD_READ],
  [normKey("سجل الرحلات")]: [PERMISSIONS.TRIPS_READ],
  [normKey("إنشاء رحلة")]: [PERMISSIONS.TRIPS_CREATE, PERMISSIONS.TRIPS_ADS_CREATE],
  [normKey("الرحلات المعروضة")]: [PERMISSIONS.TRIPS_ADS_READ],
  [normKey("العملاء")]: [PERMISSIONS.CLIENTS_READ],
  [normKey("قائمة العملاء")]: [PERMISSIONS.CLIENTS_READ],
  [normKey("السائقين")]: [PERMISSIONS.DRIVERS_READ],
  [normKey("سجل السائقين")]: [PERMISSIONS.DRIVERS_READ],
  [normKey("ادارة المكافآت")]: [PERMISSIONS.REWARDS_SETTINGS_READ, PERMISSIONS.REWARDS_READ],
  [normKey("المكافآت والأكواد الترويجية")]: [PERMISSIONS.REWARDS_SETTINGS_READ, PERMISSIONS.REWARDS_READ],
  [normKey("الدعم الفني")]: [PERMISSIONS.SUPPORT_TICKETS_READ, PERMISSIONS.SUPPORT_READ],
  [normKey("الدعم الفنى")]: [PERMISSIONS.SUPPORT_TICKETS_READ, PERMISSIONS.SUPPORT_READ],
  [normKey("إدارة الاشعارات")]: [PERMISSIONS.NOTIFICATIONS_READ],
  [normKey("ادارة الاشعارات")]: [PERMISSIONS.NOTIFICATIONS_READ],
  [normKey("سجل النشاطات")]: [PERMISSIONS.ACTIVITY_READ],
  [normKey("مركز الموافقات")]: [PERMISSIONS.APPROVALS_READ],
  [normKey("الصلاحيات")]: [PERMISSIONS.PERMISSIONS_READ, PERMISSIONS.ROLES_READ],
  [normKey("المستخدمين")]: [PERMISSIONS.USERS_READ],
  [normKey("إدارة النظام")]: [PERMISSIONS.SYSTEM_READ],
  [normKey("الحسابات")]: [PERMISSIONS.DASHBOARD_READ, PERMISSIONS.TRIPS_READ],
  [normKey("الاعدادات")]: [PERMISSIONS.SETTINGS_READ],
  [normKey("الإعدادات")]: [PERMISSIONS.SETTINGS_READ],
};

/** صلاحيات الإجراءات حسب module + permission_name */
const ACTION_MAP = {
  [`${normKey("السائقين")}|${normKey("delete driver")}`]: [PERMISSIONS.DRIVERS_DELETE],
  [`${normKey("السائقين")}|${normKey("drivers_read")}`]: [PERMISSIONS.DRIVERS_READ],
  [`${normKey("السائقين")}|${normKey("drivers_create")}`]: [PERMISSIONS.DRIVERS_CREATE],
  [`${normKey("السائقين")}|${normKey("drivers_edit")}`]: [PERMISSIONS.DRIVERS_EDIT],
  [`${normKey("السائقين")}|${normKey("drivers_suspend")}`]: [PERMISSIONS.DRIVERS_SUSPEND],
  [`${normKey("السائقين")}|${normKey("حذف السائق")}`]: [PERMISSIONS.DRIVERS_DELETE],
  [`${normKey("السائقين")}|${normKey("عرض السائقين")}`]: [PERMISSIONS.DRIVERS_READ],
  [`${normKey("السائقين")}|${normKey("إضافة سائق")}`]: [PERMISSIONS.DRIVERS_CREATE],
  [`${normKey("السائقين")}|${normKey("تعديل السائقين")}`]: [PERMISSIONS.DRIVERS_EDIT],
  [`${normKey("Customers")}|${normKey("customer_view")}`]: [PERMISSIONS.CLIENTS_READ],
  [`${normKey("Customers")}|${normKey("customer_create")}`]: [PERMISSIONS.CLIENTS_CREATE],
  [`${normKey("Customers")}|${normKey("customer_edit")}`]: [PERMISSIONS.CLIENTS_EDIT],
  [`${normKey("Customers")}|${normKey("customer_delete")}`]: [PERMISSIONS.CLIENTS_DELETE],
  [`${normKey("Customers")}|${normKey("customer_export")}`]: [PERMISSIONS.CLIENTS_EXPORT],
  [`${normKey("العملاء")}|${normKey("customer_view")}`]: [PERMISSIONS.CLIENTS_READ],
  [`${normKey("العملاء")}|${normKey("عرض العملاء")}`]: [PERMISSIONS.CLIENTS_READ],
  [`${normKey("العملاء")}|${normKey("إضافة عميل")}`]: [PERMISSIONS.CLIENTS_CREATE],
  [`${normKey("العملاء")}|${normKey("تعديل العملاء")}`]: [PERMISSIONS.CLIENTS_EDIT],
  [`${normKey("العملاء")}|${normKey("حذف العملاء")}`]: [PERMISSIONS.CLIENTS_DELETE],
  [`${normKey("الدعم الفني")}|${normKey("support_tickets_read")}`]: [PERMISSIONS.SUPPORT_TICKETS_READ],
  [`${normKey("الدعم الفني")}|${normKey("support_tickets_reply")}`]: [PERMISSIONS.SUPPORT_TICKETS_REPLY],
  [`${normKey("الدعم الفني")}|${normKey("support_tickets_delete")}`]: [PERMISSIONS.SUPPORT_TICKETS_DELETE],
  [`${normKey("الدعم الفني")}|${normKey("support_tickets_escalate")}`]: [PERMISSIONS.SUPPORT_TICKETS_ESCALATE],
  [`${normKey("الرحلات")}|${normKey("trips_read")}`]: [PERMISSIONS.TRIPS_READ],
  [`${normKey("الرحلات")}|${normKey("trips_create")}`]: [PERMISSIONS.TRIPS_CREATE],
  [`${normKey("الرحلات")}|${normKey("trips_edit")}`]: [PERMISSIONS.TRIPS_EDIT],
  [`${normKey("الرحلات")}|${normKey("trips_cancel")}`]: [PERMISSIONS.TRIPS_CANCEL],
  [`${normKey("المستخدمين")}|${normKey("users_read")}`]: [PERMISSIONS.USERS_READ],
  [`${normKey("المستخدمين")}|${normKey("users_create")}`]: [PERMISSIONS.USERS_CREATE],
  [`${normKey("المستخدمين")}|${normKey("users_edit")}`]: [PERMISSIONS.USERS_EDIT],
  [`${normKey("المستخدمين")}|${normKey("users_delete")}`]: [PERMISSIONS.USERS_DELETE],
  [`${normKey("الصلاحيات")}|${normKey("permissions_read")}`]: [PERMISSIONS.PERMISSIONS_READ],
  [`${normKey("الصلاحيات")}|${normKey("permissions_edit")}`]: [PERMISSIONS.PERMISSIONS_EDIT],
  [`${normKey("الصلاحيات")}|${normKey("roles_read")}`]: [PERMISSIONS.ROLES_READ],
  [`${normKey("الصلاحيات")}|${normKey("roles_edit")}`]: [PERMISSIONS.ROLES_EDIT],
  [`${normKey("مركز الموافقات")}|${normKey("approvals_read")}`]: [PERMISSIONS.APPROVALS_READ],
  [`${normKey("مركز الموافقات")}|${normKey("approvals_edit")}`]: [PERMISSIONS.APPROVALS_EDIT],
  [`${normKey("إدارة الاشعارات")}|${normKey("notifications_read")}`]: [PERMISSIONS.NOTIFICATIONS_READ],
  [`${normKey("إدارة الاشعارات")}|${normKey("notifications_send")}`]: [PERMISSIONS.NOTIFICATIONS_SEND],
  [`${normKey("إدارة الاشعارات")}|${normKey("notifications_edit")}`]: [PERMISSIONS.NOTIFICATIONS_EDIT],
  [`${normKey("إدارة الاشعارات")}|${normKey("notifications_delete")}`]: [PERMISSIONS.NOTIFICATIONS_DELETE],
  [`${normKey("المكافآت")}|${normKey("rewards_read")}`]: [PERMISSIONS.REWARDS_SETTINGS_READ],
  [`${normKey("المكافآت")}|${normKey("rewards_code_create")}`]: [PERMISSIONS.REWARDS_CODE_CREATE],
  [`${normKey("المكافآت")}|${normKey("rewards_code_edit")}`]: [PERMISSIONS.REWARDS_CODE_EDIT],
  [`${normKey("المكافآت")}|${normKey("rewards_code_delete")}`]: [PERMISSIONS.REWARDS_CODE_DELETE],
  [`${normKey("المكافآت والاكواد الترويجية")}|${normKey("code view")}`]: [PERMISSIONS.REWARDS_SETTINGS_READ],
  [`${normKey("المكافآت والاكواد الترويجية")}|${normKey("code add")}`]: [PERMISSIONS.REWARDS_CODE_CREATE],
  [`${normKey("المكافآت والاكواد الترويجية")}|${normKey("code edit")}`]: [PERMISSIONS.REWARDS_CODE_EDIT],
  [`${normKey("المكافآت والاكواد الترويجية")}|${normKey("code remove")}`]: [PERMISSIONS.REWARDS_CODE_DELETE],
  [`${normKey("المكافآت والاكواد الترويجية")}|${normKey("code active")}`]: [PERMISSIONS.REWARDS_CODE_TOGGLE],
  [`${normKey("السائقين")}|${normKey("add driver")}`]: [PERMISSIONS.DRIVERS_CREATE],
  [`${normKey("السائقين")}|${normKey("update driver")}`]: [PERMISSIONS.DRIVERS_EDIT],
  [`${normKey("الدعم الفني")}|${normKey("tickets")}`]: [PERMISSIONS.SUPPORT_TICKETS_READ],
  [`${normKey("الدعم الفني")}|${normKey("chats")}`]: [PERMISSIONS.SUPPORT_TICKETS_REPLY],
  [`${normKey("الدعم الفني")}|${normKey("create tickets")}`]: [PERMISSIONS.SUPPORT_TICKETS_REPLY],
  [`${normKey("الدعم الفني")}|${normKey("update tickets")}`]: [PERMISSIONS.SUPPORT_TICKETS_CLOSE],
  [`${normKey("الدعم الفني")}|${normKey("delete tickets")}`]: [PERMISSIONS.SUPPORT_TICKETS_DELETE],
  [`${normKey("ادارة الاشعارات")}|${normKey("notification")}`]: [PERMISSIONS.NOTIFICATIONS_SEND],
  [`${normKey("إدارة النظام")}|${normKey("cities view")}`]: [PERMISSIONS.SYSTEM_READ],
  [`${normKey("المدن")}|${normKey("add city")}`]: [PERMISSIONS.SYSTEM_EDIT],
  [`${normKey("المدن")}|${normKey("edit city")}`]: [PERMISSIONS.SYSTEM_EDIT],
  [`${normKey("المدن")}|${normKey("editadd city")}`]: [PERMISSIONS.SYSTEM_EDIT],
  [`${normKey("المدن")}|${normKey("remove city")}`]: [PERMISSIONS.SYSTEM_EDIT],
  [`${normKey("انواع المصروفات")}|${normKey("إضافة المصروفات")}`]: [PERMISSIONS.SYSTEM_EDIT],
  [`${normKey("انواع المصروفات")}|${normKey("تعديل المصروفات")}`]: [PERMISSIONS.SYSTEM_EDIT],
  [`${normKey("انواع المصروفات")}|${normKey("حذف المصروفات")}`]: [PERMISSIONS.SYSTEM_EDIT],
  [`${normKey("إدارة النظام")}|${normKey("انواع المصروفات")}`]: [PERMISSIONS.SYSTEM_READ],
  [`${normKey("سجل النشاطات")}|${normKey("admin")}`]: [PERMISSIONS.ACTIVITY_READ],
  [`${normKey("سجل النشاطات")}|${normKey("driver")}`]: [PERMISSIONS.ACTIVITY_READ],
  [`${normKey("سجل النشاطات")}|${normKey("sales")}`]: [PERMISSIONS.ACTIVITY_READ],
};

const MODULE_ICONS = {
  sidebar: { icon: "📂", iconBg: "bg-amber-100" },
  السائقين: { icon: "🚗", iconBg: "bg-green-100" },
  drivers: { icon: "🚗", iconBg: "bg-green-100" },
  Customers: { icon: "👥", iconBg: "bg-blue-100" },
  العملاء: { icon: "👥", iconBg: "bg-blue-100" },
  الرحلات: { icon: "📋", iconBg: "bg-teal-100" },
  trips: { icon: "📋", iconBg: "bg-teal-100" },
  المستخدمين: { icon: "👤", iconBg: "bg-gray-100" },
  الصلاحيات: { icon: "🔐", iconBg: "bg-amber-100" },
  "الدعم الفني": { icon: "🎧", iconBg: "bg-purple-100" },
  "إدارة الاشعارات": { icon: "🔔", iconBg: "bg-yellow-100" },
  المكافآت: { icon: "🎁", iconBg: "bg-pink-100" },
  "مركز الموافقات": { icon: "✅", iconBg: "bg-emerald-100" },
};

function lookupInternalKeys(permission) {
  const name = permission?.permission_name ?? "";
  const module = permission?.module ?? "";
  const nName = normKey(name);
  const nModule = normKey(module);

  if (nModule === normKey("sidebar") || module === "sidebar") {
    return SIDEBAR_MAP[nName] ?? [];
  }

  const actionKey = `${nModule}|${nName}`;
  if (ACTION_MAP[actionKey]) return ACTION_MAP[actionKey];

  if (SIDEBAR_MAP[nName]) return SIDEBAR_MAP[nName];

  if (Object.values(PERMISSIONS).includes(name)) return [name];

  return [];
}

/** تحويل صلاحيات الـ API إلى مفاتيح داخلية للتحقق */
export function apiPermissionsToInternalKeys(apiPermissions = []) {
  const keys = new Set();
  for (const p of apiPermissions) {
    const mapped = lookupInternalKeys(p);
    if (mapped.length) {
      mapped.forEach((k) => keys.add(k));
    } else if (p?.permission_name) {
      keys.add(p.permission_name);
    }
  }
  return [...keys];
}

/** تجميع صلاحيات الـ API حسب الوحدة لعرضها في الواجهة */
export function groupPermissionsByModule(permissions = []) {
  const groups = new Map();

  for (const p of permissions) {
    const moduleName = p.module || "عام";
    if (!groups.has(moduleName)) {
      const style = MODULE_ICONS[moduleName] ?? MODULE_ICONS[normKey(moduleName)] ?? {
        icon: "📌",
        iconBg: "bg-gray-100",
      };
      groups.set(moduleName, {
        id: normKey(moduleName) || "general",
        name: moduleName,
        icon: style.icon,
        iconBg: style.iconBg,
        permissions: [],
      });
    }
    groups.get(moduleName).permissions.push({
      id: p.id,
      key: String(p.id),
      label: p.display_name || p.permission_name,
      permission_name: p.permission_name,
      module: p.module,
      raw: p,
    });
  }

  return [...groups.values()].sort((a, b) => {
    if (a.name === "sidebar") return -1;
    if (b.name === "sidebar") return 1;
    return a.name.localeCompare(b.name, "ar");
  });
}

export function moduleStateFromPermissionIds(modules, assignedIds = new Set()) {
  const state = {};
  for (const mod of modules) {
    state[mod.id] = mod.permissions.map((p) => assignedIds.has(String(p.id)));
  }
  return state;
}

export function permissionIdsFromModuleState(modules, moduleState) {
  const ids = [];
  for (const mod of modules) {
    mod.permissions.forEach((p, i) => {
      if (moduleState[mod.id]?.[i]) ids.push(p.id);
    });
  }
  return ids;
}

export function selectAllModuleState(modules, enabled = true) {
  const state = {};
  for (const mod of modules) {
    state[mod.id] = mod.permissions.map(() => enabled);
  }
  return state;
}
