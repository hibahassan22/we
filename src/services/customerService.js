const API_BASE = "/api";

export function mapCustomerRecord(item) {
  if (!item) return null;
  return {
    id: item.id,
    name: item.full_name || item.name || item.customer_name || "—",
    full_name: item.full_name || item.name || item.customer_name || "—",
    phone: item.phone || "",
    address: item.address || "",
    gender: item.gender || "",
    nationality: item.nationality || item.customer_nationality || "سعودي",
  };
}

function normalizeCustomerList(json) {
  if (Array.isArray(json)) {
    return json.map(mapCustomerRecord).filter(Boolean);
  }
  if (Array.isArray(json?.customers)) {
    return json.customers.map(mapCustomerRecord).filter(Boolean);
  }
  if (Array.isArray(json?.data)) {
    return json.data.map(mapCustomerRecord).filter(Boolean);
  }
  return [];
}

/** GET /api/Allcustomers — نفس مصدر قائمة العملاء */
export async function fetchCustomersList() {
  const res = await fetch(`${API_BASE}/Allcustomers`, {
    headers: { Accept: "application/json" },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json?.message || json?.error || `فشل جلب العملاء (${res.status})`);
  }
  return normalizeCustomerList(json);
}

/** POST /api/customers */
export async function createCustomer({ name, phone, address, gender, nationality }) {
  const res = await fetch(`${API_BASE}/customers`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      full_name: name,
      phone,
      gender,
      customer_nationality: nationality || "سعودية",
    }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json?.message || json?.error || `فشل إضافة العميل (${res.status})`);
  }
  const created = json.data ?? json.customer ?? json;
  return mapCustomerRecord({
    ...created,
    full_name: created.full_name ?? name,
    phone: created.phone ?? phone,
    gender: created.gender ?? gender,
    customer_nationality: created.customer_nationality ?? nationality,
    address: address ?? created.address,
  });
}
