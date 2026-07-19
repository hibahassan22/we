/**
 * Enterprise permission keys for Drivo Admin Dashboard.
 * Assigned via API /api/role-permissions and roles.
 */

export const PERMISSIONS = {
  TRIPS_READ: "Trips.Read",
  TRIPS_EDIT: "Trips.Edit",
  TRIPS_DELETE: "Trips.Delete",
  TRIPS_CREATE: "Trips.Create",
  DRIVERS_READ: "Drivers.Read",
  DRIVERS_CREATE: "Drivers.Create",
  DRIVERS_EDIT: "Drivers.Edit",
  DRIVERS_DELETE: "Drivers.Delete",
  BROKERS_READ: "Brokers.Read",
  BROKERS_CREATE: "Brokers.Create",
  BROKERS_EDIT: "Brokers.Edit",
  BROKERS_DELETE: "Brokers.Delete",
  CLIENTS_READ: "Clients.Read",
  CLIENTS_CREATE: "Clients.Create",
  CLIENTS_EDIT: "Clients.Edit",
  CLIENTS_DELETE: "Clients.Delete",
  USERS_READ: "Users.Read",
  USERS_CREATE: "Users.Create",
  USERS_EDIT: "Users.Edit",
  USERS_DELETE: "Users.Delete",
  ROLES_READ: "Roles.Read",
  ROLES_EDIT: "Roles.Edit",
  PERMISSIONS_READ: "Permissions.Read",
  PERMISSIONS_EDIT: "Permissions.Edit",
  NOTIFICATIONS_READ: "Notifications.Read",
  NOTIFICATIONS_SEND: "Notifications.Send",
  SUPPORT_READ: "Support.Read",
  SUPPORT_EDIT: "Support.Edit",
  REWARDS_READ: "Rewards.Read",
  REWARDS_EDIT: "Rewards.Edit",
  REWARDS_SETTINGS_READ: "Rewards.Settings.Read",
  REWARDS_CODE_CREATE: "Rewards.Code.Create",
  REWARDS_CODE_EDIT: "Rewards.Code.Edit",
  REWARDS_CODE_DELETE: "Rewards.Code.Delete",
  REWARDS_CODE_TOGGLE: "Rewards.Code.Toggle",
  CLIENTS_EXPORT: "Clients.Export",
  DRIVERS_SUSPEND: "Drivers.Suspend",
  TRIPS_EXPORT: "Trips.Export",
  TRIPS_CANCEL: "Trips.Cancel",
  TRIPS_PAYMENT_ADD: "Trips.Payment.Add",
  TRIPS_STATUS_CHANGE: "Trips.Status.Change",
  TRIPS_VIEW_DETAILS: "Trips.ViewDetails",
  TRIPS_DRIVER_TAB: "Trips.DriverTab",
  TRIPS_OFFERED_TAB: "Trips.OfferedTab",
  TRIPS_OFFERED_ASSIGN: "Trips.Offered.Assign",
  TRIPS_OFFERED_CHAT: "Trips.Offered.Chat",
  TRIPS_ADS_READ: "Trips.Ads.Read",
  TRIPS_ADS_CREATE: "Trips.Ads.Create",
  TRIPS_ADS_EDIT: "Trips.Ads.Edit",
  TRIPS_ADS_DELETE: "Trips.Ads.Delete",
  TRIPS_ADS_PUBLISH: "Trips.Ads.Publish",
  SUPPORT_TICKETS_READ: "Support.Tickets.Read",
  SUPPORT_TICKETS_CREATE: "Support.Tickets.Create",
  SUPPORT_TICKETS_REPLY: "Support.Tickets.Reply",
  SUPPORT_TICKETS_CLOSE: "Support.Tickets.Close",
  SUPPORT_TICKETS_DELETE: "Support.Tickets.Delete",
  SUPPORT_TICKETS_ESCALATE: "Support.Tickets.Escalate",
  NOTIFICATIONS_EDIT: "Notifications.Edit",
  NOTIFICATIONS_DELETE: "Notifications.Delete",
  NOTIFICATIONS_SCHEDULE: "Notifications.Schedule",
  ACTIVITY_READ: "Activity.Read",
  ACTIVITY_ADMIN: "Activity.Admin",
  ACTIVITY_SALES: "Activity.Sales",
  ACTIVITY_DRIVER: "Activity.Driver",
  SETTINGS_READ: "Settings.Read",
  SETTINGS_EDIT: "Settings.Edit",
  SYSTEM_READ: "System.Read",
  SYSTEM_EDIT: "System.Edit",
  APPROVALS_READ: "Approvals.Read",
  APPROVALS_EDIT: "Approvals.Edit",
  DASHBOARD_READ: "Dashboard.Read",
  ACCOUNTS_READ: "Accounts.Read",
};

export const ALL_PERMISSIONS = Object.values(PERMISSIONS);

export const PERMISSION_LABELS = {
  [PERMISSIONS.TRIPS_READ]: "عرض الرحلات",
  [PERMISSIONS.TRIPS_EDIT]: "تعديل الرحلات",
  [PERMISSIONS.TRIPS_DELETE]: "حذف الرحلات",
  [PERMISSIONS.TRIPS_CREATE]: "إنشاء الرحلات",
  [PERMISSIONS.DRIVERS_READ]: "عرض السائقين",
  [PERMISSIONS.DRIVERS_CREATE]: "إضافة سائق",
  [PERMISSIONS.DRIVERS_EDIT]: "تعديل السائقين",
  [PERMISSIONS.DRIVERS_DELETE]: "حذف السائقين",
  [PERMISSIONS.BROKERS_READ]: "عرض الوسطاء",
  [PERMISSIONS.BROKERS_CREATE]: "إضافة وسيط",
  [PERMISSIONS.BROKERS_EDIT]: "تعديل الوسطاء",
  [PERMISSIONS.BROKERS_DELETE]: "حذف الوسطاء",
  [PERMISSIONS.CLIENTS_READ]: "عرض العملاء",
  [PERMISSIONS.CLIENTS_CREATE]: "إضافة عميل",
  [PERMISSIONS.CLIENTS_EDIT]: "تعديل العملاء",
  [PERMISSIONS.CLIENTS_DELETE]: "حذف العملاء",
  [PERMISSIONS.USERS_READ]: "عرض المستخدمين",
  [PERMISSIONS.USERS_CREATE]: "إنشاء مستخدم",
  [PERMISSIONS.USERS_EDIT]: "تعديل المستخدمين",
  [PERMISSIONS.USERS_DELETE]: "حذف المستخدمين",
  [PERMISSIONS.ROLES_READ]: "عرض الأدوار",
  [PERMISSIONS.ROLES_EDIT]: "تعديل الأدوار",
  [PERMISSIONS.PERMISSIONS_READ]: "عرض الصلاحيات",
  [PERMISSIONS.PERMISSIONS_EDIT]: "تعديل الصلاحيات",
  [PERMISSIONS.NOTIFICATIONS_READ]: "عرض الإشعارات",
  [PERMISSIONS.NOTIFICATIONS_SEND]: "إرسال إشعارات",
  [PERMISSIONS.SUPPORT_READ]: "عرض الدعم",
  [PERMISSIONS.SUPPORT_EDIT]: "إدارة الدعم",
  [PERMISSIONS.REWARDS_READ]: "عرض المكافآت",
  [PERMISSIONS.REWARDS_EDIT]: "تعديل المكافآت",
  [PERMISSIONS.REWARDS_SETTINGS_READ]: "عرض الإعدادات",
  [PERMISSIONS.REWARDS_CODE_CREATE]: "إضافة كود ترويجي",
  [PERMISSIONS.REWARDS_CODE_EDIT]: "تعديل الكود",
  [PERMISSIONS.REWARDS_CODE_DELETE]: "حذف الكود",
  [PERMISSIONS.REWARDS_CODE_TOGGLE]: "تفعيل/إيقاف الكود",
  [PERMISSIONS.CLIENTS_EXPORT]: "تصدير البيانات",
  [PERMISSIONS.DRIVERS_SUSPEND]: "تعليق السائق",
  [PERMISSIONS.TRIPS_EXPORT]: "تصدير التقارير",
  [PERMISSIONS.TRIPS_CANCEL]: "إلغاء رحلة",
  [PERMISSIONS.TRIPS_PAYMENT_ADD]: "إضافة دفعة",
  [PERMISSIONS.TRIPS_STATUS_CHANGE]: "تغيير حالة الرحلة",
  [PERMISSIONS.TRIPS_VIEW_DETAILS]: "عرض تفاصيل الرحلة",
  [PERMISSIONS.TRIPS_DRIVER_TAB]: "رحلات مسندة لسائق",
  [PERMISSIONS.TRIPS_OFFERED_TAB]: "الرحلات المعروضة",
  [PERMISSIONS.TRIPS_OFFERED_ASSIGN]: "إسناد رحلة",
  [PERMISSIONS.TRIPS_OFFERED_CHAT]: "محادثات الرحلة",
  [PERMISSIONS.TRIPS_ADS_READ]: "عرض الإعلانات",
  [PERMISSIONS.TRIPS_ADS_CREATE]: "إضافة إعلان",
  [PERMISSIONS.TRIPS_ADS_EDIT]: "تعديل إعلان",
  [PERMISSIONS.TRIPS_ADS_DELETE]: "حذف إعلان",
  [PERMISSIONS.TRIPS_ADS_PUBLISH]: "نشر الإعلان",
  [PERMISSIONS.SUPPORT_TICKETS_READ]: "عرض التذاكر",
  [PERMISSIONS.SUPPORT_TICKETS_CREATE]: "إنشاء تذكرة",
  [PERMISSIONS.SUPPORT_TICKETS_REPLY]: "الرد على التذاكر",
  [PERMISSIONS.SUPPORT_TICKETS_CLOSE]: "إغلاق التذكرة",
  [PERMISSIONS.SUPPORT_TICKETS_DELETE]: "حذف التذكرة",
  [PERMISSIONS.SUPPORT_TICKETS_ESCALATE]: "تصعيد التذكرة",
  [PERMISSIONS.NOTIFICATIONS_EDIT]: "تعديل إشعار",
  [PERMISSIONS.NOTIFICATIONS_DELETE]: "حذف إشعار",
  [PERMISSIONS.NOTIFICATIONS_SCHEDULE]: "جدولة إشعار",
  [PERMISSIONS.ACTIVITY_READ]: "عرض سجل النشاط",
  [PERMISSIONS.ACTIVITY_ADMIN]: "سجل نشاط الأدمن",
  [PERMISSIONS.ACTIVITY_SALES]: "سجل نشاط السيلز",
  [PERMISSIONS.ACTIVITY_DRIVER]: "سجل نشاط السائق",
  [PERMISSIONS.SETTINGS_READ]: "عرض الإعدادات",
  [PERMISSIONS.SETTINGS_EDIT]: "تعديل الإعدادات",
  [PERMISSIONS.SYSTEM_READ]: "عرض إعدادات النظام",
  [PERMISSIONS.SYSTEM_EDIT]: "تعديل النظام",
  [PERMISSIONS.APPROVALS_READ]: "عرض الموافقات",
  [PERMISSIONS.APPROVALS_EDIT]: "إدارة الموافقات",
  [PERMISSIONS.DASHBOARD_READ]: "عرض لوحة التحكم",
  [PERMISSIONS.ACCOUNTS_READ]: "عرض الحسابات",
};

/** Route → required permission (any one of listed) */
export const ROUTE_PERMISSIONS = {
  "/dashboard": [PERMISSIONS.DASHBOARD_READ],
  "/trips": [PERMISSIONS.TRIPS_READ],
  "/create-trip": [PERMISSIONS.TRIPS_ADS_READ, PERMISSIONS.TRIPS_CREATE, PERMISSIONS.TRIPS_ADS_CREATE],
  "/new-trip": [PERMISSIONS.TRIPS_ADS_CREATE, PERMISSIONS.TRIPS_CREATE],
  "/clients": [PERMISSIONS.CLIENTS_READ],
  "/drivers": [PERMISSIONS.DRIVERS_READ],
  "/brokers": [PERMISSIONS.BROKERS_READ, PERMISSIONS.DRIVERS_READ],
  "/rewards": [PERMISSIONS.REWARDS_SETTINGS_READ, PERMISSIONS.REWARDS_READ],
  "/support": [PERMISSIONS.SUPPORT_TICKETS_READ, PERMISSIONS.SUPPORT_READ],
  "/notifications": [PERMISSIONS.NOTIFICATIONS_READ],
  "/alerts": [PERMISSIONS.NOTIFICATIONS_READ],
  "/activity": [PERMISSIONS.ACTIVITY_READ],
  "/approvals": [PERMISSIONS.APPROVALS_READ],
  "/permissions": [PERMISSIONS.PERMISSIONS_READ, PERMISSIONS.ROLES_READ],
  "/users": [PERMISSIONS.USERS_READ],
  "/system": [PERMISSIONS.SYSTEM_READ],
  "/accounts": [PERMISSIONS.ACCOUNTS_READ, PERMISSIONS.DASHBOARD_READ, PERMISSIONS.TRIPS_READ, PERMISSIONS.APPROVALS_READ, PERMISSIONS.USERS_READ],
  "/accounts/drivers": [PERMISSIONS.ACCOUNTS_READ, PERMISSIONS.DRIVERS_READ, PERMISSIONS.TRIPS_READ],
  "/accounts/payments": [PERMISSIONS.TRIPS_READ],
  "/accounts/employees": [PERMISSIONS.USERS_READ, PERMISSIONS.DASHBOARD_READ],
  "/accounts/refunds": [PERMISSIONS.APPROVALS_READ],
  "/accounts/expenses": [PERMISSIONS.SYSTEM_READ, PERMISSIONS.DASHBOARD_READ],
  "/settings": [PERMISSIONS.SETTINGS_READ],
};

/** Admin-only routes (RoleGuard) */
export const ADMIN_ONLY_ROUTES = [
  "/users",
  "/permissions",
  "/activity",
  "/system",
];

/** توسيع الصلاحيات القديمة إلى صلاحيات فرعية */
export function expandPermissions(permissions = []) {
  if (!permissions?.length) return [];
  if (permissions.includes("*")) return ["*"];

  const set = new Set(permissions);
  const add = (...keys) => keys.forEach((k) => set.add(k));

  if (set.has(PERMISSIONS.REWARDS_READ)) {
    add(PERMISSIONS.REWARDS_SETTINGS_READ);
  }
  if (set.has(PERMISSIONS.REWARDS_SETTINGS_READ)) {
    add(PERMISSIONS.REWARDS_READ);
  }
  if (set.has(PERMISSIONS.REWARDS_CODE_EDIT)) {
    add(PERMISSIONS.REWARDS_EDIT);
  }
  if (set.has(PERMISSIONS.REWARDS_EDIT)) {
    add(
      PERMISSIONS.REWARDS_SETTINGS_READ,
      PERMISSIONS.REWARDS_CODE_CREATE,
      PERMISSIONS.REWARDS_CODE_EDIT,
      PERMISSIONS.REWARDS_CODE_DELETE,
      PERMISSIONS.REWARDS_CODE_TOGGLE
    );
  }
  if (set.has(PERMISSIONS.SUPPORT_READ)) add(PERMISSIONS.SUPPORT_TICKETS_READ);
  if (set.has(PERMISSIONS.SUPPORT_EDIT)) {
    add(
      PERMISSIONS.SUPPORT_TICKETS_READ,
      PERMISSIONS.SUPPORT_TICKETS_CREATE,
      PERMISSIONS.SUPPORT_TICKETS_REPLY,
      PERMISSIONS.SUPPORT_TICKETS_CLOSE,
      PERMISSIONS.SUPPORT_TICKETS_ESCALATE
    );
  }
  if (set.has(PERMISSIONS.TRIPS_READ)) {
    add(
      PERMISSIONS.TRIPS_ADS_READ,
      PERMISSIONS.TRIPS_VIEW_DETAILS,
      PERMISSIONS.TRIPS_DRIVER_TAB,
      PERMISSIONS.TRIPS_OFFERED_TAB
    );
  }
  if (set.has(PERMISSIONS.TRIPS_EDIT)) {
    add(PERMISSIONS.TRIPS_PAYMENT_ADD, PERMISSIONS.TRIPS_STATUS_CHANGE);
  }
  if (set.has(PERMISSIONS.TRIPS_CREATE)) add(PERMISSIONS.TRIPS_ADS_CREATE, PERMISSIONS.TRIPS_ADS_PUBLISH);
  if (set.has(PERMISSIONS.TRIPS_ADS_READ)) add(PERMISSIONS.TRIPS_OFFERED_TAB);
  if (set.has(PERMISSIONS.TRIPS_ADS_EDIT)) add(PERMISSIONS.TRIPS_OFFERED_ASSIGN);
  if (set.has(PERMISSIONS.TRIPS_ADS_CREATE)) add(PERMISSIONS.TRIPS_ADS_PUBLISH);
  if (set.has(PERMISSIONS.TRIPS_DELETE)) add(PERMISSIONS.TRIPS_CANCEL, PERMISSIONS.TRIPS_ADS_DELETE);
  if (set.has(PERMISSIONS.ACTIVITY_READ)) {
    add(PERMISSIONS.ACTIVITY_ADMIN, PERMISSIONS.ACTIVITY_SALES, PERMISSIONS.ACTIVITY_DRIVER);
  }
  if (set.has(PERMISSIONS.DRIVERS_EDIT)) add(PERMISSIONS.DRIVERS_SUSPEND);
  if (set.has(PERMISSIONS.DRIVERS_SUSPEND)) add(PERMISSIONS.DRIVERS_EDIT);
  if (set.has(PERMISSIONS.APPROVALS_READ)) add(PERMISSIONS.APPROVALS_EDIT);
  if (set.has(PERMISSIONS.APPROVALS_EDIT)) add(PERMISSIONS.APPROVALS_READ);

  return [...set];
}

export function hasPermission(userPermissions, permission) {
  if (!permission) return true;
  const expanded = expandPermissions(userPermissions);
  if (!expanded.length) return false;
  if (expanded.includes("*")) return true;
  return expanded.includes(permission);
}

/** تحقق بمعرّف صلاحية API مباشرة (perm:47) */
export function hasPermissionId(userPermissions, permissionId) {
  if (permissionId == null) return true;
  return hasPermission(userPermissions, `perm:${permissionId}`);
}

export function hasAnyPermission(userPermissions, permissions = []) {
  if (!permissions.length) return true;
  return permissions.some((p) => hasPermission(userPermissions, p));
}

export function canAccessRoute(userPermissions, pathname) {
  const key = Object.keys(ROUTE_PERMISSIONS).find(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );
  if (!key) return true;
  return hasAnyPermission(userPermissions, ROUTE_PERMISSIONS[key]);
}
