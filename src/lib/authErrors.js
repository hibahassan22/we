/**
 * Arabic error messages for Firebase Auth and API errors.
 */

const AUTH_CODE_MESSAGES = {
  "auth/invalid-email": "صيغة البريد الإلكتروني غير صحيحة",
  "auth/user-disabled": "تم تعطيل هذا الحساب. تواصل مع مدير النظام",
  "auth/user-not-found": "البريد الإلكتروني أو كلمة المرور غير صحيحة",
  "auth/wrong-password": "البريد الإلكتروني أو كلمة المرور غير صحيحة",
  "auth/invalid-credential": "البريد الإلكتروني أو كلمة المرور غير صحيحة",
  "auth/too-many-requests": "محاولات كثيرة، يرجى الانتظار قليلاً ثم المحاولة مجدداً",
  "auth/weak-password": "كلمة المرور ضعيفة. يجب أن تكون 8 أحرف على الأقل",
  "auth/email-already-in-use": "البريد الإلكتروني مسجل مسبقاً",
  "auth/network-request-failed": "خطأ في الاتصال. تحقق من الإنternet وحاول مجدداً",
  "auth/requires-recent-login": "يرجى تسجيل الدخول مجدداً لتأكيد العملية",
  "auth/operation-not-allowed": "العملية غير مسموحة",
  "auth/profile-not-found": "حسابك غير مكتمل في النظام. تواصل مع مدير النظام لإكمال إعداد الحساب",
};

const API_CODE_MESSAGES = {
  DUPLICATE_EMAIL: "البريد الإلكتروني مسجل مسبقاً",
  WEAK_PASSWORD: "كلمة المرور ضعيفة. يجب أن تكون 8 أحرف على الأقل",
  INVALID_EMAIL: "صيغة البريد الإلكتروني غير صحيحة",
  PERMISSION_DENIED: "ليس لديك صلاحية لتنفيذ هذه العملية",
  UNAUTHORIZED: "يجب تسجيل الدخول أولاً",
  USER_NOT_FOUND: "المستخدم غير موجود",
  INVALID_STATUS: "حالة المستخدم غير صالحة",
  OFFLINE: "لا يوجد اتصال بالإنternet",
  ADMIN_SDK_NOT_CONFIGURED:
    "خادم الإدارة غير مهيأ. ضع ملف serviceAccountKey.json في مجلد server/ وشغّل npm run dev:admin-api",
  SERVER_ERROR: "خطأ في الخادم",
};

export function getAuthErrorMessage(error) {
  if (!error) return "حدث خطأ غير متوقع";
  if (error.code && AUTH_CODE_MESSAGES[error.code]) {
    return AUTH_CODE_MESSAGES[error.code];
  }
  if (error.message?.includes("Failed to fetch") || error.message?.includes("NetworkError")) {
    return API_CODE_MESSAGES.OFFLINE;
  }
  return error.message || "حدث خطأ، يرجى المحاولة مجدداً";
}

export function getApiErrorMessage(error, fallback = "حدث خطأ في الخادم") {
  if (!error) return fallback;
  if (typeof error === "string") return error;
  if (error.code && API_CODE_MESSAGES[error.code]) return API_CODE_MESSAGES[error.code];
  return error.message || fallback;
}

export const STATUS_MESSAGES = {
  inactive: "حسابك غير نشط. تواصل مع مدير النظام",
  suspended: "تم تعليق حسابك. تواصل مع مدير النظام",
  blocked: "تم حظر حسابك. تواصل مع مدير النظام",
  disabled: "تم تعطيل حسابك. تواصل مع مدير النظام",
};
