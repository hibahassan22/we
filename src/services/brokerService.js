const API_BASE = "https://drivo1.elmoroj.com/api";
const STORAGE_KEY = "drivo_brokers_local";

function asList(json) {
  if (Array.isArray(json)) return json;
  if (Array.isArray(json?.data)) return json.data;
  if (Array.isArray(json?.brokers)) return json.brokers;
  return [];
}

function createId() {
  return `br_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function generateBrokerCode() {
  const n = Math.floor(1000 + Math.random() * 9000);
  return `MED-${n}#`;
}

/** بيانات أولية مطابقة لتصميم إدارة الوسطاء */
const SEED_BROKERS = [
  {
    id: "1",
    name: "عادل المنصوري",
    phone: "501234567",
    email: "adel@example.com",
    address: "الرياض",
    broker_code: "MED-8892#",
    commission: 5,
    commission_type: "نسبة مئوية",
    balance: 2450,
    completed_trips: 120,
    trips_count: 8,
    active_trips: 3,
    clients_count: 45,
    nationality: "سعودي",
    status: "active",
  },
  {
    id: "2",
    name: "سارة أحمد",
    phone: "509876543",
    email: "sara@example.com",
    address: "جدة",
    broker_code: "MED-4410#",
    commission: 7,
    balance: 1890.5,
    completed_trips: 86,
    trips_count: 2,
    clients_count: 28,
    nationality: "سعودية",
    status: "active",
  },
  {
    id: "3",
    name: "خالد العتيبي",
    phone: "555112233",
    email: "khaled@example.com",
    address: "الدمام",
    broker_code: "MED-2201#",
    commission: 5,
    balance: 3200,
    completed_trips: 150,
    trips_count: 5,
    clients_count: 62,
    nationality: "سعودي",
    status: "active",
  },
  {
    id: "4",
    name: "نورة الحربي",
    phone: "0544332211",
    email: "noura@example.com",
    address: "مكة",
    broker_code: "MED-7788#",
    commission: 6,
    balance: 980,
    completed_trips: 44,
    trips_count: 1,
    clients_count: 15,
    nationality: "سعودية",
    status: "active",
  },
  {
    id: "5",
    name: "فهد الشمري",
    phone: "500998877",
    email: "fahd@example.com",
    address: "الرياض",
    broker_code: "MED-3303#",
    commission: 8,
    balance: 5100,
    completed_trips: 200,
    trips_count: 12,
    clients_count: 90,
    nationality: "سعودي",
    status: "active",
  },
  {
    id: "6",
    name: "لينا القحطاني",
    phone: "566778899",
    email: "lina@example.com",
    address: "الخبر",
    broker_code: "MED-5566#",
    commission: 5,
    balance: 640,
    completed_trips: 30,
    trips_count: 3,
    clients_count: 12,
    nationality: "سعودية",
    status: "active",
  },
  {
    id: "7",
    name: "ماجد الدوسري",
    phone: "512345678",
    email: "majed@example.com",
    address: "القصيم",
    broker_code: "MED-9911#",
    commission: 4,
    balance: 1120,
    completed_trips: 55,
    trips_count: 4,
    clients_count: 20,
    nationality: "سعودي",
    status: "active",
  },
  {
    id: "8",
    name: "ريم السبيعي",
    phone: "598765432",
    email: "reem@example.com",
    address: "الطائف",
    broker_code: "MED-1122#",
    commission: 7,
    balance: 2755.25,
    completed_trips: 98,
    trips_count: 6,
    clients_count: 37,
    nationality: "سعودية",
    status: "active",
  },
];

export function normalizeBroker(item) {
  if (!item) return null;
  return {
    id: item.id ?? createId(),
    name: item.name ?? item.full_name ?? "",
    last_name: item.last_name ?? "",
    phone: item.phone ?? "",
    email: item.email ?? "",
    address: item.address ?? item.city ?? "",
    broker_code: item.broker_code ?? item.code ?? generateBrokerCode(),
    commission: Number(item.commission ?? item.commission_percent ?? item.commission_value ?? 0) || 0,
    commission_type: item.commission_type === "نقدي" || item.commission_type === "cash" ? "نقدي" : "نسبة مئوية",
    balance: Number(item.balance ?? item.wallet ?? 0) || 0,
    completed_trips: Number(item.completed_trips ?? item.completed_trips_count ?? 0) || 0,
    trips_count: Number(item.trips_count ?? 0) || 0,
    active_trips: Number(item.active_trips ?? item.active_trips_count ?? item.trips_count ?? 0) || 0,
    clients_count: Number(item.clients_count ?? item.total_clients ?? 0) || 0,
    nationality: item.nationality ?? "",
    identity_number: item.identity_number ?? item.national_id ?? item.id_number ?? "",
    photo: item.photo ?? item.image ?? item.avatar ?? null,
    photo_url: item.photo_url ?? item.image_url ?? "",
    driver_id: item.driver_id ?? null,
    status: item.status ?? "active",
    notes: item.notes ?? "",
  };
}

function readLocal() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_BROKERS));
      return SEED_BROKERS.map(normalizeBroker);
    }
    const parsed = JSON.parse(raw);
    return (Array.isArray(parsed) ? parsed : []).map(normalizeBroker).filter(Boolean);
  } catch {
    return SEED_BROKERS.map(normalizeBroker);
  }
}

function writeLocal(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export async function fetchBrokers(signal) {
  try {
    const res = await fetch(`${API_BASE}/brokers`, {
      headers: { Accept: "application/json" },
      signal,
    });
    if (!res.ok) throw new Error(`status ${res.status}`);
    const json = await res.json();
    const list = asList(json).map(normalizeBroker).filter(Boolean);
    if (list.length) return list;
    return readLocal();
  } catch {
    return readLocal();
  }
}

export async function createBroker(payload) {
  const body = {
    name: payload.name,
    phone: payload.phone,
    email: payload.email,
    address: payload.address,
    broker_code: payload.broker_code || generateBrokerCode(),
    commission: Number(payload.commission) || 0,
    commission_type: payload.commission_type || "نسبة مئوية",
    nationality: payload.nationality,
    identity_number: payload.identity_number,
    driver_id: payload.driver_id || undefined,
    notes: payload.notes,
    balance: Number(payload.balance) || 0,
  };

  try {
    const fd = new FormData();
    Object.entries(body).forEach(([k, v]) => {
      if (v != null && v !== "") fd.append(k, String(v));
    });
    if (payload.photo instanceof File) fd.append("photo", payload.photo);

    const res = await fetch(`${API_BASE}/brokers`, {
      method: "POST",
      headers: { Accept: "application/json" },
      body: fd,
    });
    const json = await res.json().catch(() => ({}));
    if (res.ok) return normalizeBroker(json?.data ?? json?.broker ?? json);
  } catch {
    /* fallback local */
  }

  const list = readLocal();
  let photo_url = "";
  if (payload.photo instanceof File) {
    try {
      photo_url = URL.createObjectURL(payload.photo);
    } catch {
      photo_url = "";
    }
  }
  const created = normalizeBroker({
    ...body,
    id: createId(),
    photo_url,
    completed_trips: 0,
    trips_count: 0,
    active_trips: 0,
    clients_count: 0,
    status: "active",
  });
  writeLocal([created, ...list]);
  return created;
}

export async function updateBroker(id, payload) {
  const body = {
    name: payload.name,
    phone: payload.phone,
    email: payload.email,
    address: payload.address,
    broker_code: payload.broker_code,
    commission: Number(payload.commission) || 0,
    commission_type: payload.commission_type || "نسبة مئوية",
    nationality: payload.nationality,
    identity_number: payload.identity_number,
    driver_id: payload.driver_id || undefined,
    notes: payload.notes,
    balance: payload.balance != null ? Number(payload.balance) : undefined,
  };

  try {
    const fd = new FormData();
    Object.entries(body).forEach(([k, v]) => {
      if (v != null && v !== "") fd.append(k, String(v));
    });
    if (payload.photo instanceof File) fd.append("photo", payload.photo);

    const res = await fetch(`${API_BASE}/brokers/${id}`, {
      method: "PUT",
      headers: { Accept: "application/json" },
      body: fd,
    });
    const json = await res.json().catch(() => ({}));
    if (res.ok) return normalizeBroker(json?.data ?? json?.broker ?? { ...body, id });
  } catch {
    /* fallback local */
  }

  const list = readLocal();
  let photo_url;
  if (payload.photo instanceof File) {
    try {
      photo_url = URL.createObjectURL(payload.photo);
    } catch {
      photo_url = undefined;
    }
  }
  const next = list.map((b) =>
    String(b.id) === String(id)
      ? normalizeBroker({ ...b, ...body, id, ...(photo_url ? { photo_url } : {}) })
      : b
  );
  writeLocal(next);
  return next.find((b) => String(b.id) === String(id));
}

export async function deleteBroker(id) {
  try {
    const res = await fetch(`${API_BASE}/brokers/${id}`, { method: "DELETE" });
    if (res.ok) return true;
  } catch {
    /* fallback local */
  }
  const list = readLocal().filter((b) => String(b.id) !== String(id));
  writeLocal(list);
  return true;
}

export { generateBrokerCode };
