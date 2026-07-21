import { normalizeSaudiPhoneFromApi } from "../lib/phoneValidation.js";

const STORAGE_KEY = "drivo_platform_accounts_meta";

function readStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeStore(store) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function getAccountMeta(userId) {
  if (!userId) return null;
  const store = readStore();
  return store[String(userId)] ?? null;
}

export function getAllAccountMeta() {
  return readStore();
}

function normalizeAccountPhone(phone) {
  const raw = String(phone ?? "").trim();
  if (!raw) return "";
  return normalizeSaudiPhoneFromApi(raw) || raw.replace(/\D/g, "");
}

/** يضمن رقم جوال واسم لكل أكونت */
export function ensureAccountMeta(userId, { accountName = "", accountNumber } = {}) {
  const id = String(userId ?? "").trim();
  if (!id) return null;

  const store = readStore();
  const existing = store[id];
  const normalizedPhone = accountNumber != null && accountNumber !== ""
    ? normalizeAccountPhone(accountNumber)
    : "";

  if (existing?.accountNumber) {
    const next = { ...existing };
    if (accountName && !next.accountName) next.accountName = String(accountName).trim();
    if (normalizedPhone) next.accountNumber = normalizedPhone;
    store[id] = next;
    writeStore(store);
    return store[id];
  }

  const meta = {
    accountNumber: normalizedPhone,
    accountName: String(accountName || "").trim(),
  };
  store[id] = meta;
  writeStore(store);
  return meta;
}

export function updateAccountMeta(userId, { accountName, accountNumber } = {}) {
  const id = String(userId ?? "").trim();
  if (!id) return null;

  const store = readStore();
  const current = store[id] ?? { accountNumber: "", accountName: "" };

  if (accountName !== undefined) current.accountName = String(accountName).trim();
  if (accountNumber !== undefined) {
    current.accountNumber = normalizeAccountPhone(accountNumber);
  }

  store[id] = current;
  writeStore(store);
  return current;
}

export function removeAccountMeta(userId) {
  const id = String(userId ?? "").trim();
  if (!id) return;
  const store = readStore();
  delete store[id];
  writeStore(store);
}

/** مزامنة الأرقام لكل سجلات المبيعات الموجودة */
export function syncAccountMetaFromSales(salesList = []) {
  const store = readStore();
  let changed = false;

  salesList.forEach((sale) => {
    const id = String(sale.id ?? "");
    if (!id) return;
    if (!store[id]?.accountNumber) {
      const phone = normalizeAccountPhone(sale.phone);
      store[id] = {
        accountNumber: phone,
        accountName: store[id]?.accountName ?? sale.account_name ?? "",
      };
      if (phone) changed = true;
    }
  });

  if (changed) writeStore(store);
  return store;
}

export function formatAccountPhone(phone) {
  const digits = String(phone ?? "").replace(/\D/g, "");
  if (!digits) return "—";
  if (digits.startsWith("966") && digits.length >= 12) {
    return `0${digits.slice(3)}`;
  }
  if (digits.length === 9 && digits.startsWith("5")) {
    return `0${digits}`;
  }
  if (digits.length === 10 && digits.startsWith("05")) {
    return digits;
  }
  return digits;
}

/** @deprecated استخدم formatAccountPhone */
export function formatAccountNumber(phone) {
  return formatAccountPhone(phone);
}

export function enrichUserWithAccount(user, meta) {
  const m = meta ?? getAccountMeta(user.uid ?? user.id);
  const accountName = m?.accountName ?? "";
  const accountNumber = m?.accountNumber ?? "";
  return {
    ...user,
    accountNumber,
    accountName,
    accountLabel: accountName || formatAccountPhone(accountNumber),
    accountPhoneDisplay: formatAccountPhone(accountNumber),
  };
}

/** مفتاح تجميع الأكونت — رقم الأكونت أو id المستخدم */
export function getAccountGroupKey(user) {
  const phone = String(user?.accountNumber ?? "").replace(/\D/g, "");
  if (phone) return `phone:${phone}`;
  const name = String(user?.accountName ?? "").trim().toLowerCase();
  if (name) return `name:${name}`;
  return `id:${String(user?.uid ?? user?.id ?? "")}`;
}

/** تجميع المستخدمين حسب الأكونت (رقم/اسم) */
export function groupUsersByAccount(users = []) {
  const map = new Map();

  users.forEach((user) => {
    const key = getAccountGroupKey(user);
    if (!map.has(key)) {
      map.set(key, {
        ...user,
        accountKey: key,
        members: [user],
        memberCount: 1,
      });
      return;
    }

    const group = map.get(key);
    group.members.push(user);
    group.memberCount = group.members.length;
    if (!group.accountName && user.accountName) group.accountName = user.accountName;
    if (!group.accountNumber && user.accountNumber) {
      group.accountNumber = user.accountNumber;
      group.accountPhoneDisplay = formatAccountPhone(user.accountNumber);
      group.accountLabel = user.accountName || formatAccountPhone(user.accountNumber);
    }
  });

  return [...map.values()];
}
