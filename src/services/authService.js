import { STATUS_MESSAGES } from "../lib/authErrors.js";
import { normalizePhoneForOtp } from "../lib/phoneValidation.js";

const SESSION_KEY = "drivo_session";
const API_BASE = "/api";
const ACTIVE_STATUSES = new Set(["active"]);

export function getSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function setSession(sale) {
  const { password: _pw, ...safe } = sale ?? {};
  const data = { sale: safe, loggedInAt: new Date().toISOString() };
  localStorage.setItem(SESSION_KEY, JSON.stringify(data));
  return data;
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

export function getCurrentSale() {
  return getSession()?.sale ?? null;
}

export function saleToProfile(sale) {
  if (!sale) return null;
  return {
    uid: sale.id,
    id: sale.id,
    fullName: sale.name ?? "",
    name: sale.name ?? "",
    email: sale.email ?? "",
    phone: sale.phone ?? "",
    role_id: sale.role_id ?? null,
    role: sale.role_id != null ? String(sale.role_id) : "",
    status: sale.status ?? "active",
    permissions: [],
    target: sale.target,
    main_target: sale.main_target,
  };
}

function parseJsonResponse(res, text) {
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { message: text };
  }
  return data;
}

async function parseLoginResponse(res) {
  const text = await res.text();
  const data = parseJsonResponse(res, text);

  if (!res.ok) {
    throw new Error(data?.message || "البريد الإلكتروني أو كلمة المرور غير صحيحة");
  }

  const sale = data?.sale ?? data?.data ?? data?.user;
  if (!sale?.id) {
    throw new Error(data?.message || "استجابة تسجيل الدخول غير صالحة");
  }

  const status = sale.status ?? "active";
  if (!ACTIVE_STATUSES.has(status)) {
    throw new Error(STATUS_MESSAGES[status] ?? "حسابك غير مفعّل");
  }

  return { sale, message: data?.message };
}

/** POST /api/sales/login — تحقق من البيانات بدون إنشاء جلسة */
export async function verifyLoginCredentials(email, password) {
  const res = await fetch(`${API_BASE}/sales/login`, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({
      email: String(email).trim().toLowerCase(),
      password: String(password),
    }),
  });
  return parseLoginResponse(res);
}

/** POST /api/send-otp — إرسال رمز التحقق عبر واتساب */
export async function sendLoginOtp(phone) {
  const normalized = normalizePhoneForOtp(phone);
  if (!normalized) throw new Error("رقم الهاتف غير صالح");

  const res = await fetch(`${API_BASE}/send-otp`, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({ phone: normalized }),
  });

  const text = await res.text();
  const data = parseJsonResponse(res, text);

  if (!res.ok || data?.success === false) {
    throw new Error(data?.message || "فشل إرسال رمز التحقق");
  }

  return { phone: normalized, message: data?.message };
}

/** POST /api/verify-otp — التحقق من رمز OTP */
export async function verifyOtp(phone, otp) {
  return verifyLoginOtp(phone, otp);
}

/** POST /api/send-otp — alias */
export async function sendOtp(phone) {
  return sendLoginOtp(phone);
}

/** إعادة تعيين كلمة المرور بعد التحقق من OTP */
export async function resetPasswordWithOtp({ email, phone, otp, password }) {
  const normalizedPhone = normalizePhoneForOtp(phone);
  const code = String(otp ?? "").trim();
  const pass = String(password ?? "");
  const normalizedEmail = String(email ?? "").trim().toLowerCase();

  if (!normalizedEmail) throw new Error("البريد الإلكتروني مطلوب");
  if (!normalizedPhone) throw new Error("رقم الهاتف غير صالح");
  if (!code) throw new Error("رمز التحقق مطلوب");
  if (pass.length < 8) throw new Error("كلمة المرور يجب أن تكون 8 أحرف على الأقل");

  const verified = await verifyLoginOtp(normalizedPhone, code);
  const saleId =
    verified?.sale?.id
    ?? verified?.data?.sale?.id
    ?? verified?.user?.id
    ?? verified?.data?.id;

  if (saleId) {
    const res = await fetch(`${API_BASE}/sales/${encodeURIComponent(saleId)}`, {
      method: "PUT",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({ password: pass, email: normalizedEmail }),
    });
    const text = await res.text();
    const data = parseJsonResponse(res, text);
    if (!res.ok) throw new Error(data?.message || "فشل تعيين كلمة المرور");
    return data;
  }

  const res = await fetch(`${API_BASE}/sales/reset-password`, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({
      email: normalizedEmail,
      phone: normalizedPhone,
      otp: code,
      password: pass,
    }),
  });
  const text = await res.text();
  const data = parseJsonResponse(res, text);
  if (!res.ok) throw new Error(data?.message || "فشل تعيين كلمة المرور");
  return data;
}

/** POST /api/verify-otp — التحقق من رمز OTP */
export async function verifyLoginOtp(phone, otp) {
  const normalized = normalizePhoneForOtp(phone);
  const code = String(otp ?? "").trim();
  if (!normalized) throw new Error("رقم الهاتف غير صالح");
  if (!code) throw new Error("يرجى إدخال رمز التحقق");

  const res = await fetch(`${API_BASE}/verify-otp`, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({ phone: normalized, otp: code }),
  });

  const text = await res.text();
  const data = parseJsonResponse(res, text);

  if (!res.ok || data?.success === false) {
    throw new Error(data?.message || "رمز التحقق غير صحيح");
  }

  return data;
}

/** حفظ جلسة المستخدم بعد التحقق من OTP */
export function establishSession(sale) {
  return setSession(sale);
}

/** POST /api/sales/login */
export async function loginWithEmail(email, password) {
  const { sale, message } = await verifyLoginCredentials(email, password);
  const session = setSession(sale);
  return { sale: session.sale, message };
}

export async function logout() {
  clearSession();
}

export async function sendResetEmail() {
  throw new Error("تواصل مع مدير النظام لإعادة تعيين كلمة المرور");
}

export async function changePassword(currentPassword, newPassword) {
  const session = getSession();
  const sale = session?.sale;
  if (!sale?.id || !sale?.email) throw new Error("يجب تسجيل الدخول أولاً");

  const verifyRes = await fetch(`${API_BASE}/sales/login`, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({ email: sale.email, password: currentPassword }),
  });
  if (!verifyRes.ok) {
    throw new Error("كلمة المرور الحالية غير صحيحة");
  }

  const res = await fetch(`${API_BASE}/sales/${encodeURIComponent(sale.id)}`, {
    method: "PUT",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({ password: newPassword }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.message || "فشل تغيير كلمة المرور");
  }
}

export async function fetchUserProfile(uid) {
  const session = getSession();
  if (session?.sale?.id === uid) {
    return saleToProfile(session.sale);
  }

  const res = await fetch(`${API_BASE}/sales/${encodeURIComponent(uid)}`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) return null;

  const data = await res.json();
  const sale = data?.sale ?? data?.data ?? data;
  if (!sale?.id) return null;

  setSession(sale);
  return saleToProfile(sale);
}

export async function getIdToken() {
  return getSession()?.token ?? null;
}
