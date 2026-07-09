const API_BASE = "/api";

export function formatGenderLabel(g) {
  if (g === "male" || g === "ذكر") return "ذكر";
  if (g === "female" || g === "أنثى") return "أنثى";
  return g || "—";
}

export function genderToApi(g) {
  if (g === "ذكر") return "male";
  if (g === "أنثى") return "female";
  return g;
}

const TRIP_STATUS_COLORS = {
  completed: "bg-emerald-500",
  pending: "bg-blue-500",
  cancelled: "bg-red-500",
  suspended: "bg-gray-400",
  in_progress: "bg-blue-600",
};

const TRIP_STATUS_LABELS = {
  completed: "مكتملة",
  pending: "معلقة",
  cancelled: "ملغية",
  suspended: "موقوفة",
  in_progress: "قيد التنفيذ",
};

function mapApiNote(note) {
  return {
    id: note.id?.toString() || `${Date.now()}-${Math.random()}`,
    author: note.author || "إداري",
    date: note.note_date || note.created_at || "",
    content: note.message || note.content || "",
  };
}

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

/** GET /api/customers-details/{id} */
export async function fetchCustomerDetails(customerId) {
  const res = await fetch(`${API_BASE}/customers-details/${customerId}`, {
    headers: { Accept: "application/json" },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json?.message || json?.error || `فشل جلب بيانات العميل (${res.status})`);
  }
  const raw = json.customer ?? json;
  if (!raw) throw new Error("العميل غير موجود");

  const customer = mapCustomerRecord(raw);
  customer.rating = Number(raw.rating || 5);
  customer.status = "نشط";
  customer.trips = {
    total: Number(raw.total_trips || 0),
    active: Number(raw.active_trips || 0),
    completed: Number(raw.completed_trips || 0),
    cancelled: Number(raw.cancelled_trips || 0),
    paused: Number(raw.pending_trips || 0),
  };
  customer.tripHistory = Array.isArray(raw.trips)
    ? raw.trips.map((t) => ({
        id: `#${t.id}`,
        from: t.from || "—",
        to: t.to || "—",
        date: t.trip_date || t.start_date || "",
        status: TRIP_STATUS_LABELS[t.status] || t.status || "—",
        statusColor: TRIP_STATUS_COLORS[t.status] || "bg-gray-400",
        totalPrice: t.total_price,
        amountPaid: t.amount_paid,
      }))
    : [];

  return customer;
}

/** GET /api/customer-notes/{id} */
export async function fetchCustomerNotes(customerId) {
  try {
    const res = await fetch(`${API_BASE}/customer-notes/${customerId}`, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data.notes) ? data.notes.map(mapApiNote) : [];
  } catch {
    return [];
  }
}

/** POST /api/customers/update/{id} */
export async function updateCustomer(id, { name, phone, address, gender, nationality }) {
  const res = await fetch(`${API_BASE}/customers/update/${id}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      full_name: name,
      phone,
      address,
      customer_nationality: nationality,
      gender: genderToApi(gender),
    }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json?.message || json?.error || `فشل تحديث العميل (${res.status})`);
  }
  const customer = json.customer || {};
  return mapCustomerRecord({
    ...customer,
    full_name: customer.full_name ?? name,
    phone: customer.phone ?? phone,
    address: customer.address ?? address,
    gender: customer.gender ?? gender,
    nationality: customer.customer_nationality ?? nationality,
  });
}

/** DELETE /api/customers/{id} */
export async function deleteCustomer(id) {
  const res = await fetch(`${API_BASE}/customers/${id}`, {
    method: "DELETE",
    headers: { Accept: "application/json" },
  });
  if (!res.ok && res.status !== 204) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json?.message || json?.error || `فشل حذف العميل (${res.status})`);
  }
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
