import { STATUS_MESSAGES } from "../lib/authErrors.js";

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

/** POST /api/sales/login */
export async function loginWithEmail(email, password) {
  const res = await fetch(`${API_BASE}/sales/login`, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({
      email: String(email).trim().toLowerCase(),
      password: String(password),
    }),
  });

  const text = await res.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { message: text };
  }

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

  const session = setSession(sale);
  return { sale: session.sale, message: data?.message };
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
