const API_BASE = "https://drivo1.elmoroj.com/api";

function asList(json) {
  if (Array.isArray(json)) return json;
  if (Array.isArray(json?.data)) return json.data;
  return [];
}

export function normalizeBank(item) {
  if (!item) return null;
  const bankName = item.bank_name ?? item.name ?? "";
  const accountNumber = item.account_number ?? item.bank_number ?? item.number ?? "";
  return {
    id: item.id,
    bank_name: bankName,
    account_name: item.account_name ?? "",
    account_number: accountNumber,
    iban: item.iban ?? "",
    status: item.status ?? 1,
    created_at: item.created_at ?? null,
    updated_at: item.updated_at ?? null,
    // aliases used elsewhere in the app
    name: bankName,
    bank_number: accountNumber,
  };
}

export function bankFormFromItem(item) {
  return {
    bank_name: item?.bank_name ?? item?.name ?? "",
    account_name: item?.account_name ?? "",
    account_number: item?.account_number ?? item?.bank_number ?? "",
    iban: item?.iban ?? "",
  };
}

export function buildBankPayload(form) {
  return {
    bank_name: String(form.bank_name ?? form.name ?? "").trim(),
    account_name: String(form.account_name ?? "").trim(),
    account_number: String(form.account_number ?? form.bank_number ?? "").trim(),
    iban: String(form.iban ?? "").trim(),
  };
}

export function applyBankSelection(bank) {
  if (!bank) {
    return {
      bank_id: "",
      bank_name: "",
      recipient_account: "",
    };
  }
  return {
    bank_id: String(bank.id),
    bank_name: bank.bank_name ?? bank.name ?? "",
    recipient_account: bank.account_number ?? bank.bank_number ?? "",
  };
}

export function getActiveBanks(banks = []) {
  return banks.filter((bank) => Number(bank.status ?? 1) === 1);
}

export async function fetchBanks(signal) {
  const res = await fetch(`${API_BASE}/banks`, {
    headers: { Accept: "application/json" },
    signal,
  });
  if (!res.ok) throw new Error(`فشل تحميل البنوك (${res.status})`);
  const json = await res.json();
  return asList(json).map(normalizeBank).filter(Boolean);
}

export async function createBank(payload) {
  const res = await fetch(`${API_BASE}/banks`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(buildBankPayload(payload)),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.message || json?.error || `فشل إضافة البنك (${res.status})`);
  return normalizeBank(json?.bank ?? json?.data ?? json);
}

export async function updateBank(id, payload) {
  const res = await fetch(`${API_BASE}/banks/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(buildBankPayload(payload)),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.message || json?.error || `فشل تعديل البنك (${res.status})`);
  return normalizeBank(json?.bank ?? json?.data ?? json);
}

export async function deleteBank(id) {
  const res = await fetch(`${API_BASE}/banks/${id}`, {
    method: "DELETE",
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json?.message || json?.error || `فشل حذف البنك (${res.status})`);
  }
  return true;
}
