const API_BASE = "https://drivo1.elmoroj.com/api";

function asList(json) {
  if (Array.isArray(json)) return json;
  if (Array.isArray(json?.data)) return json.data;
  return [];
}

export function normalizeBank(item) {
  if (!item) return null;
  return {
    id: item.id,
    name: item.name ?? item.bank_name ?? "",
    bank_number: item.bank_number ?? item.number ?? "",
  };
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
    body: JSON.stringify(payload),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.message || json?.error || `فشل إضافة البنك (${res.status})`);
  return normalizeBank(json?.data ?? json);
}

export async function updateBank(id, payload) {
  const res = await fetch(`${API_BASE}/banks/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.message || json?.error || `فشل تعديل البنك (${res.status})`);
  return normalizeBank(json?.data ?? json);
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

export function buildBankPayload(form) {
  return {
    name: String(form.name ?? "").trim(),
    bank_number: String(form.bank_number ?? "").trim(),
  };
}
