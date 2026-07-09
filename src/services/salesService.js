import { getIdToken } from "./authService.js";
import { ROLES } from "../lib/roles.js";
import { resolveApiRoleId } from "../lib/roleUtils.js";

const API_BASE = "/api";

async function salesHeaders(json = false) {
  const token = await getIdToken();
  const h = { Accept: "application/json" };
  if (token) h["Authorization"] = `Bearer ${token}`;
  if (json) h["Content-Type"] = "application/json";
  return h;
}

/** أدوار مرتبطة بسجل /api/sales (للتوافق مع نماذج قديمة) */
export const SALES_LINKED_ROLES = new Set([ROLES.SUPPORT]);

export function isSalesLinkedRole(role) {
  return SALES_LINKED_ROLES.has(role);
}

async function parseResponse(res) {
  const text = await res.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { message: text };
  }

  if (!res.ok) {
    throw new Error(formatSalesApiError(data, text, res.status));
  }
  return data;
}

export function normalizeEmail(email) {
  return String(email ?? "").trim().toLowerCase();
}

/** رسالة عربية واضحة لأخطاء الـ API (بما فيها البريد المكرر) */
export function formatSalesApiError(data, rawText = "", status = 0) {
  const blob = `${data?.message ?? ""} ${rawText}`.toLowerCase();

  if (
    blob.includes("duplicate entry") ||
    blob.includes("sales_email_unique") ||
    blob.includes("1062")
  ) {
    const emailMatch = blob.match(/['"]([^'"]+@[^'"]+)['"]/);
    const email = emailMatch?.[1];
    return email
      ? `البريد الإلكتروني «${email}» مسجّل مسبقاً — استخدم بريداً آخر أو عدّل الموظف الحالي`
      : "البريد الإلكتروني مسجّل مسبقاً — استخدم بريداً آخر";
  }

  if (data?.errors?.email) {
    return Array.isArray(data.errors.email)
      ? data.errors.email.join("، ")
      : String(data.errors.email);
  }

  if (data?.message) return data.message;
  if (data?.errors) return Object.values(data.errors).flat().join("، ");
  return `خطأ ${status || ""}`.trim();
}

export function findSalesByEmail(salesList, email, excludeId = null) {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;
  return (
    salesList.find((s) => {
      if (excludeId && String(s.id) === String(excludeId)) return false;
      return normalizeEmail(s.email) === normalized;
    }) ?? null
  );
}

/** GET /api/sales — كل موظفي المبيعات / خدمة العملاء */
export async function fetchSalesList() {
  const res = await fetch(`${API_BASE}/sales`, { headers: { Accept: "application/json" } });
  const data = await parseResponse(res);
  return Array.isArray(data) ? data : data?.data ?? data?.sales ?? [];
}

/** GET /api/sales/{id} — ملف موظف مبيعات */
export async function fetchSalesById(id) {
  const salesId = String(id ?? "").trim();
  if (!salesId) throw new Error("معرّف الموظف غير صالح");
  const res = await fetch(`${API_BASE}/sales/${encodeURIComponent(salesId)}`, {
    headers: { Accept: "application/json" },
  });
  const data = await parseResponse(res);
  return data?.sale ?? data?.data ?? data;
}

/** تحويل سجل /api/sales لشكل مستخدم في الواجهة */
export function salesRecordToUser(sale) {
  const id = String(sale.id ?? "");
  const role =
    sale.role_id != null && sale.role_id !== ""
      ? String(sale.role_id)
      : "";
  return {
    uid: id,
    id,
    fullName: sale.name ?? "",
    email: sale.email ?? "",
    phone: sale.phone ?? "",
    role,
    status: sale.status ?? "active",
    department: "",
    permissions: [],
    createdAt: sale.created_at ?? null,
    target: sale.target ?? sale.main_target ?? null,
    fromSalesApi: true,
    salesRecord: sale,
  };
}

export function generateSalesId() {
  const suffix = Math.random().toString(36).slice(2, 8);
  return `abc${suffix}${Date.now().toString(36).slice(-3)}`;
}

export function filterSalesUsers(users, { search = "", role = "", status = "" } = {}) {
  let list = users;
  const term = search.trim().toLowerCase();
  if (term) {
    list = list.filter(
      (u) =>
        u.fullName?.toLowerCase().includes(term) ||
        u.email?.toLowerCase().includes(term) ||
        String(u.phone ?? "").includes(term) ||
        String(u.uid ?? u.id ?? "").includes(term)
    );
  }
  if (role) list = list.filter((u) => u.role === role);
  if (status) list = list.filter((u) => u.status === status);
  return list;
}

/** @deprecated استخدم filterSalesUsers */
export function filterMergedUsers(users, filters) {
  return filterSalesUsers(users, filters);
}

/** POST /api/sales — نفس شكل Postman: id, name, phone, role_id, email */
export async function createSalesRecord({ id, name, phone = "", email, password, role_id }) {
  const salesId = String(id);
  const parsedRoleId = resolveApiRoleId(role_id);
  if (!parsedRoleId) {
    throw new Error("يجب اختيار دور صالح من القائمة");
  }

  const body = {
    id: salesId,
    name: String(name).trim(),
    phone: String(phone ?? "").trim(),
    role_id: parsedRoleId,
    email: String(email).trim().toLowerCase(),
  };
  if (password) body.password = String(password);

  const res = await fetch(`${API_BASE}/sales`, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return parseResponse(res);
}

/** DELETE /api/sales/{id} */
export async function deleteSalesRecord(id) {
  const res = await fetch(`${API_BASE}/sales/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: await salesHeaders(),
  });
  if (res.status === 204 || res.status === 200) return true;
  return parseResponse(res);
}

/** PUT /api/sales/{id} */
export async function updateSalesRecord(id, { name, phone, email, role_id, password }) {
  const salesId = String(id);
  const body = {};
  if (name !== undefined) body.name = String(name).trim();
  if (phone !== undefined) body.phone = String(phone ?? "").trim();
  if (email !== undefined) body.email = String(email).trim().toLowerCase();
  if (password) body.password = String(password);

  if (role_id != null && role_id !== "") {
    const parsedRoleId = resolveApiRoleId(role_id);
    if (!parsedRoleId) throw new Error("يجب اختيار دور صالح من القائمة");
    body.role_id = parsedRoleId;
  }

  const res = await fetch(`${API_BASE}/sales/${encodeURIComponent(salesId)}`, {
    method: "PUT",
    headers: await salesHeaders(true),
    body: JSON.stringify(body),
  });
  return parseResponse(res);
}

/** إنشاء أو تحديث سجل المبيعات حسب uid */
export async function syncSalesRecord(uid, { name, phone, email }) {
  try {
    return await updateSalesRecord(uid, { name, phone, email });
  } catch {
    return createSalesRecord({ id: uid, name, phone, email });
  }
}
