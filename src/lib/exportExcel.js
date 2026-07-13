import * as XLSX from "xlsx";

const OFFERED_STATUS_LABELS = {
  pending: "معلقة",
  offered: "معروضة",
  completed: "تم",
  cancelled: "ملغية",
};

function cell(value) {
  if (value == null || value === "") return "—";
  if (typeof value === "object") {
    if (Array.isArray(value)) return value.map(cell).join("، ");
    return JSON.stringify(value);
  }
  return value;
}

function fmtDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString("ar-SA");
}

function driverName(trip) {
  if (!trip?.driver) return "—";
  return `${trip.driver.name ?? ""} ${trip.driver.last_name ?? ""}`.trim() || "—";
}

function salesNames(trip) {
  return trip?.sales?.map((s) => s.name).filter(Boolean).join("، ") || "—";
}

function passengerName(trip) {
  return trip?.main_passenger?.full_name ?? trip?.main_passenger?.name ?? "—";
}

function passengerPhone(trip) {
  return trip?.customer_phone ?? trip?.main_passenger?.phone ?? "—";
}

/** صف تصدير رحلة — نفس البيانات المعروضة في الكارت */
export function tripToExportRow(trip, variant = "driver") {
  const offeredLabel =
    OFFERED_STATUS_LABELS[trip?.status] ?? trip?.status ?? "—";
  const status = variant === "offered" ? offeredLabel : (trip?.trip_status ?? "—");

  return {
    "رقم الرحلة": cell(trip?.id),
    "النوع": variant === "offered" ? "معروضة" : "مسندة لسائق",
    "الحالة": cell(status),
    "نوع الرحلة": cell(trip?.trip_type),
    "من": cell(trip?.from),
    "إلى": cell(trip?.to),
    "المنطقة": cell(trip?.region),
    "السائق": driverName(trip),
    "العميل": passengerName(trip),
    "هاتف العميل": cell(passengerPhone(trip)),
    "السيلز": salesNames(trip),
    "السعر (ر.س)": cell(trip?.total_price),
    "العمولة (ر.س)": cell(trip?.our_commission ?? trip?.commission_amount),
    "المدفوع (ر.س)": cell(trip?.amount_paid),
    "تاريخ الرحلة": fmtDate(trip?.trip_date),
    "طريقة التحويل": cell(trip?.transfer_method),
  };
}

/** تصدير قائمة رحلات معروضة + مسندة */
export function tripsToExportRows({ driverTrips = [], offeredTrips = [] } = {}) {
  return [
    ...driverTrips.map((t) => tripToExportRow(t, "driver")),
    ...offeredTrips.map((t) => tripToExportRow(t, "offered")),
  ];
}

/** تنزيل ملف Excel من صفوف (كائنات) */
export function exportToExcel(rows, filename, sheetName = "البيانات") {
  if (!rows?.length) {
    throw new Error("لا توجد بيانات للتصدير");
  }

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
  const safeName = String(filename).replace(/[\\/:*?"<>|]/g, "_");
  XLSX.writeFile(wb, safeName.endsWith(".xlsx") ? safeName : `${safeName}.xlsx`);
}

/** تنزيل ملف Excel بعدة أوراق */
export function exportWorkbook(sheets, filename) {
  if (!sheets?.length || !sheets.some((s) => s.rows?.length)) {
    throw new Error("لا توجد بيانات للتصدير");
  }

  const wb = XLSX.utils.book_new();
  for (const sheet of sheets) {
    if (!sheet.rows?.length) continue;
    const ws = XLSX.utils.json_to_sheet(sheet.rows);
    XLSX.utils.book_append_sheet(wb, ws, String(sheet.name ?? "Sheet").slice(0, 31));
  }

  const safeName = String(filename).replace(/[\\/:*?"<>|]/g, "_");
  XLSX.writeFile(wb, safeName.endsWith(".xlsx") ? safeName : `${safeName}.xlsx`);
}
