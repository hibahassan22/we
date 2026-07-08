const API_BASE = "/api";

const NOTE_TYPE_VALUES = new Set(["ملاحظه", "ملاحظة", "note"]);

export function formatSalesId(uid) {
  if (!uid) return "";
  const value = String(uid).trim();
  return value.startsWith("#") ? value : `#${value}`;
}

export function normalizeViolationType(type) {
  const value = String(type ?? "").trim();
  if (value === "انذار") return "إنذار";
  if (value === "ملاحظة") return "ملاحظه";
  return value || "تنبيه";
}

function parseViolationsList(json) {
  if (!json) return [];
  if (Array.isArray(json)) return json;
  if (Array.isArray(json.violations)) return json.violations;
  if (Array.isArray(json.driver?.violations)) return json.driver.violations;
  if (Array.isArray(json.data)) return json.data;
  if (Array.isArray(json.data?.violations)) return json.data.violations;
  if (Array.isArray(json.notes)) return json.notes;
  if (Array.isArray(json.driver?.notes)) return json.driver.notes;
  return [];
}

export function isNoteRecord(record) {
  const type = normalizeViolationType(record?.type ?? record?.violation_type);
  return NOTE_TYPE_VALUES.has(type) || type.includes("ملاحظ");
}

export function isViolationRecord(record) {
  return !isNoteRecord(record);
}

export function getViolationSalesName(record) {
  return (
    record?.sales?.name
    ?? record?.sales_name
    ?? record?.added_by_name
    ?? record?.created_by_name
    ?? record?.employee_name
    ?? null
  );
}

export function getViolationDate(record) {
  return record?.violation_date ?? record?.created_at ?? record?.date ?? null;
}

async function parseJsonResponse(res) {
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      json?.message
      ?? json?.error
      ?? (typeof json?.errors === "object"
        ? Object.values(json.errors).flat().join(" — ")
        : null)
      ?? `خطأ ${res.status}`;
    throw new Error(msg);
  }
  return json;
}

/** GET /api/driver-violations/{driverId} */
export async function fetchDriverViolations(driverId, signal) {
  if (!driverId) return [];
  const res = await fetch(`${API_BASE}/driver-violations/${driverId}`, {
    headers: { Accept: "application/json" },
    signal,
  });
  const json = await parseJsonResponse(res);
  return parseViolationsList(json);
}

/** POST /api/driver-violations */
export async function createDriverViolation({
  driverId,
  salesId,
  message,
  type,
  violationDate,
  rating,
}) {
  const body = {
    driver_id: driverId,
    sales_id: formatSalesId(salesId),
    message: String(message ?? "").trim(),
    type: normalizeViolationType(type),
    violation_date: violationDate ?? new Date().toISOString().split("T")[0],
  };

  if (rating != null && rating !== "") {
    body.rating = Number(rating);
  }

  const res = await fetch(`${API_BASE}/driver-violations`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });

  return parseJsonResponse(res);
}
