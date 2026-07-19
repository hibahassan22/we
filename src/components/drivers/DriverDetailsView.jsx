import { useState, useEffect, useCallback } from "react";
import { Plus, Eye, Edit2, MapPin, Calendar } from "lucide-react";
import AddPaymentModal from "../AddPaymentModal";
import EditOfferedTripModal from "../EditOfferedTripModal";
import TripDetailModal from "../TripDetailModal";
import { fetchTripDetailsById } from "../../services/tripService.js";
import {
  fetchDriverViolations,
  getViolationDate,
  getViolationSalesName,
  isNoteRecord,
  isViolationRecord,
  normalizeViolationType,
} from "../../services/driverViolationsService.js";
import {
  DRIVER_IMAGE_FIELDS,
  normalizeMediaUrl,
  normalizeDriverMedia,
  getDriverAvatarUrl,
} from "../../lib/driverMedia";
import { statusButtonClass, isSameDriverStatus, resolveDriverStatusId } from "../../lib/driverStatuses";
import { usePermissions } from "../../hooks/usePermissions.js";
import { PERMISSIONS } from "../../lib/permissions.js";

const BASE = "https://drivo1.elmoroj.com/api";

const fmtMoney = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n.toLocaleString("ar-SA") : "0";
};

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("ar-EG") : "—");

const fmtTripDate = (d) => {
  if (!d) return "—";
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return "—";
  return `${date.getDate()}-${date.getMonth() + 1}-${date.getFullYear()}`;
};

function getPageNumbers(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set([1, 2, 3, total, current, current - 1, current + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const result = [];
  let prev = 0;
  for (const p of sorted) {
    if (p - prev > 1) result.push("…");
    result.push(p);
    prev = p;
  }
  return result;
}

function genderLabel(gender) {
  if (gender === "male" || gender === "ذكر") return "ذكر";
  if (gender === "female" || gender === "أنثى") return "أنثى";
  return gender || "—";
}

function DriverImage({ src, alt, className }) {
  const [failed, setFailed] = useState(false);
  const [currentSrc, setCurrentSrc] = useState("");

  useEffect(() => {
    setFailed(false);
    setCurrentSrc(normalizeMediaUrl(src));
  }, [src]);

  if (!currentSrc || failed) {
    return (
      <div className={`bg-gray-100 text-gray-400 flex items-center justify-center text-xs ${className || ""}`}>
        لا توجد صورة
      </div>
    );
  }

  return (
    <img
      src={currentSrc}
      alt={alt || ""}
      className={className}
      referrerPolicy="no-referrer"
      loading="lazy"
      onError={() => {
        if (currentSrc.startsWith("https://")) {
          setCurrentSrc(currentSrc.replace(/^https:/, "http:"));
          return;
        }
        setFailed(true);
      }}
    />
  );
}

function DriverDocumentsGrid({ driver }) {
  const items = DRIVER_IMAGE_FIELDS
    .map(([label, key]) => ({ label, url: normalizeMediaUrl(driver?.[key]) }))
    .filter((item) => item.url);

  if (!items.length) {
    return <p className="text-center text-sm text-gray-400 py-4">لا توجد وثائق مرفوعة</p>;
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      {items.map(({ label, url }) => (
        <div key={label} className="space-y-1">
          <p className="text-xs text-gray-400 text-right">{label}</p>
          <a href={url} target="_blank" rel="noreferrer">
            <DriverImage src={url} alt={label} className="w-full h-24 object-cover rounded-xl" />
          </a>
        </div>
      ))}
    </div>
  );
}

const TRIP_STATUS = {
  completed: { label: "مكتملة", cls: "bg-green-600 text-white" },
  in_progress: { label: "قيد التنفيذ", cls: "bg-blue-600 text-white" },
  progress: { label: "قيد التنفيذ", cls: "bg-blue-600 text-white" },
  cancelled: { label: "ملغية", cls: "bg-red-600 text-white" },
  pending: { label: "معلقة", cls: "bg-gray-400 text-white" },
  offered: { label: "معروضة", cls: "bg-amber-600 text-white" },
  تم: { label: "مكتملة", cls: "bg-green-600 text-white" },
  "قيد التنفيذ": { label: "قيد التنفيذ", cls: "bg-blue-600 text-white" },
};
const tripStatusInfo = (s) => TRIP_STATUS[s] || { label: s || "—", cls: "bg-gray-200 text-gray-600" };

function DriverTripsTab({ driverId, driverName, tripsCount, totalDues, refreshKey = 0 }) {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [paymentModal, setPaymentModal] = useState({ open: false, tripId: null, tripTotalPrice: "" });
  const [detailModal, setDetailModal] = useState({ open: false, tripId: null });
  const [editModal, setEditModal] = useState({ open: false, trip: null });
  const [editLoading, setEditLoading] = useState(false);
  const PER_PAGE = 5;

  const openEditTrip = useCallback(async (trip) => {
    const tripId = trip?.id ?? trip?.trip_id;
    if (!tripId) return;
    setEditLoading(true);
    try {
      const { trip: fullTrip } = await fetchTripDetailsById(tripId);
      setEditModal({ open: true, trip: fullTrip ?? trip });
    } catch {
      setEditModal({ open: true, trip });
    } finally {
      setEditLoading(false);
    }
  }, []);

  const loadTrips = useCallback(() => {
    if (!driverId) return;
    setLoading(true);
    fetch(`${BASE}/driver-trips/${driverId}`)
      .then((r) => r.json())
      .then((d) => { setTrips(Array.isArray(d.trips) ? d.trips : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [driverId]);

  useEffect(() => { loadTrips(); }, [loadTrips, refreshKey]);

  const totalPages = Math.max(1, Math.ceil(trips.length / PER_PAGE));
  const paged = trips.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const pageNumbers = getPageNumbers(page, totalPages);

  return (
    <div className="space-y-4" dir="rtl">
      <div className="grid grid-cols-2 gap-4">
        <div className="border border-gray-100 rounded-xl p-4 flex items-center justify-between bg-white shadow-sm">
          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg,#9C6402,#E6C76A)" }}>
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7" /></svg>
          </div>
          <div className="text-right">
            <p className="text-xl font-bold text-gray-800">{tripsCount ?? trips.length ?? 0}</p>
            <p className="text-xs text-gray-400 mt-0.5">إجمالي عدد الرحلات</p>
          </div>
        </div>
        <div className="border border-gray-100 rounded-xl p-4 flex items-center justify-between bg-white shadow-sm">
          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8V7m0 1v8m0 0v1" /></svg>
          </div>
          <div className="text-right">
            <p className="text-xl font-bold text-gray-800">{fmtMoney(totalDues)} ر.س</p>
            <p className="text-xs text-gray-400 mt-0.5">إجمالي المستحقات</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="w-8 h-8 border-4 border-[#c9a84c] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : paged.length === 0 ? (
        <p className="text-center text-sm text-gray-400 py-8">لا توجد رحلات للعرض</p>
      ) : (
        paged.map((trip) => {
          const st = tripStatusInfo(trip.trip_status ?? trip.status);
          const tripId = trip.id ?? trip.trip_id;
          const total = Number(trip.total_price ?? trip.price ?? 0);
          const paid = Number(trip.amount_paid ?? 0);
          const remaining = Number(trip.remaining_amount ?? 0) || Math.max(0, total - paid);
          const commission = Number(trip.our_commission ?? trip.commission_amount ?? 0);
          const customerName = trip.customer?.name ?? trip.customer_name ?? trip.client_name ?? null;
          const customerPhone = trip.customer?.phone ?? trip.customer_phone ?? trip.client_phone ?? "";
          const salesName = trip.sales?.[0]?.name ?? trip.sales_name ?? trip.employee_name ?? null;
          const isRegistered = Boolean(trip.customer_id ?? customerName);
          const dateFrom = trip.start_date ?? trip.date_from ?? trip.trip_date;
          const dateTo = trip.end_date ?? trip.date_to;
          const subType = trip.subscription_type ?? trip.trip_type ?? "اشتراك";
          const region = trip.region ?? trip.city ?? "";

          return (
            <div key={tripId} className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row overflow-hidden">
              <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                <div className="flex flex-wrap justify-between items-center gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-base font-bold text-gray-800">#{tripId}</span>
                    <span className={`${st.cls} text-xs px-2.5 py-0.5 rounded-full font-medium`}>{st.label}</span>
                    <span className={`text-xs px-2.5 py-0.5 rounded-md font-medium ${isRegistered ? "bg-green-50 text-green-700 border border-green-200" : "bg-amber-50 text-amber-700 border border-amber-200"}`}>
                      {isRegistered ? "مسجل" : "غير مسجل"}
                    </span>
                    <span className="border border-gray-200 text-gray-500 text-xs px-2.5 py-0.5 rounded-md bg-white">{subType}</span>
                    {salesName && <span className="text-xs text-gray-600 font-medium">{salesName}</span>}
                  </div>
                  <div className="text-[#bd8b2a] font-bold text-xl">{fmtMoney(total)} ر.س</div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-gray-600">
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5 justify-end">
                      <span className="font-semibold text-gray-800 text-right">{trip.from ?? "—"}</span>
                      {trip.to && (
                        <>
                          <span className="text-gray-400">←</span>
                          <span className="text-gray-500">{trip.to}</span>
                        </>
                      )}
                      <MapPin className="w-4 h-4 text-[#bd8b2a] shrink-0" />
                    </div>
                    {region && (
                      <div className="flex items-center gap-2 justify-end pr-5">
                        <span>{region}</span>
                        <span className="bg-amber-50 text-amber-700 text-[10px] px-1.5 py-0.5 rounded">المنطقة</span>
                      </div>
                    )}
                    <div className="text-gray-500 text-right pr-5">
                      السائق: <span className="font-medium text-gray-800">{driverName || "—"}</span>
                    </div>
                  </div>

                  <div className="space-y-1.5 md:border-r md:border-l border-gray-100 md:px-4">
                    <div className="flex items-center gap-1.5 text-gray-500 justify-end">
                      <span>{fmtTripDate(dateFrom)}{dateTo ? ` إلى ${fmtTripDate(dateTo)}` : ""}</span>
                      <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    </div>
                    {(customerName || customerPhone) && (
                      <div className="text-gray-500 text-right">
                        {customerName && <span className="font-medium text-gray-800">{customerName}</span>}
                        {customerName && customerPhone && <span> — </span>}
                        {customerPhone && <span className="font-medium text-gray-800">{customerPhone}</span>}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col justify-center space-y-1.5 md:mr-auto text-right min-w-[120px]">
                    <div className="text-gray-500">
                      العمولة: <span className="font-semibold text-[#bd8b2a]">{fmtMoney(commission)} ر.س</span>
                    </div>
                    <div className="text-gray-500">
                      المتبقي: <span className="font-semibold text-[#bd8b2a]">{fmtMoney(remaining)} ر.س</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50/50 p-4 border-r border-gray-100 flex flex-col gap-2 justify-center w-full md:w-44 text-center shrink-0">
                <span className="text-xs font-semibold text-gray-400 mb-1 block">الإجراءات</span>

                <button
                  type="button"
                  onClick={() => setPaymentModal({ open: true, tripId, tripTotalPrice: total })}
                  className="flex items-center justify-center gap-1 bg-[#474747] text-white text-xs py-1.5 px-3 rounded hover:bg-black transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> إضافة دفعة
                </button>

                <button
                  type="button"
                  onClick={() => tripId && setDetailModal({ open: true, tripId })}
                  disabled={!tripId}
                  className="flex items-center justify-center gap-1 bg-white border border-gray-300 text-gray-700 text-xs py-1.5 px-3 rounded hover:bg-gray-50 transition-colors disabled:opacity-40"
                >
                  <Eye className="w-3.5 h-3.5 text-gray-400" /> عرض التفاصيل
                </button>

                <button
                  type="button"
                  onClick={() => openEditTrip(trip)}
                  disabled={editLoading}
                  className="flex items-center justify-center gap-1 bg-white border border-gray-300 text-gray-700 text-xs py-1.5 px-3 rounded hover:bg-gray-50 transition-colors disabled:opacity-40"
                >
                  <Edit2 className="w-3.5 h-3.5 text-gray-400" /> تعديل
                </button>
              </div>
            </div>
          );
        })
      )}

      {trips.length > PER_PAGE && (
        <div className="flex items-center justify-center gap-1.5 pt-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 text-sm"
          >
            ‹
          </button>
          {pageNumbers.map((n, i) =>
            n === "…" ? (
              <span key={`ellipsis-${i}`} className="w-8 h-8 flex items-center justify-center text-gray-400 text-xs">…</span>
            ) : (
              <button
                key={n}
                type="button"
                onClick={() => setPage(n)}
                className={`w-8 h-8 rounded-full text-xs font-bold border transition-colors ${
                  page === n ? "bg-[#c9a84c] text-white border-[#c9a84c]" : "border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                {n}
              </button>
            )
          )}
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 text-sm"
          >
            ›
          </button>
        </div>
      )}

      <AddPaymentModal
        isOpen={paymentModal.open}
        onClose={() => setPaymentModal({ open: false, tripId: null, tripTotalPrice: "" })}
        tripId={paymentModal.tripId}
        tripTotalPrice={paymentModal.tripTotalPrice}
        onSuccess={() => loadTrips()}
      />

      <TripDetailModal
        isOpen={detailModal.open}
        onClose={() => setDetailModal({ open: false, tripId: null })}
        tripId={detailModal.tripId}
      />

      <EditOfferedTripModal
        isOpen={editModal.open}
        trip={editModal.trip}
        title={editModal.trip ? `تعديل الرحلة #${editModal.trip.id ?? editModal.trip.trip_id}` : undefined}
        onClose={() => setEditModal({ open: false, trip: null })}
        onSuccess={() => {
          setEditModal({ open: false, trip: null });
          loadTrips();
        }}
      />
    </div>
  );
}

function tripFinancials(trip) {
  const total = Number(trip.total_price ?? trip.price ?? 0) || 0;
  const paid = Number(trip.amount_paid ?? trip.paid_amount ?? 0) || 0;
  const remaining = Number(trip.remaining_amount ?? 0) || Math.max(0, total - paid);
  const commission = Number(trip.our_commission ?? trip.commission_amount ?? trip.commission ?? 0) || 0;
  const payments = Array.isArray(trip.payments) ? trip.payments : [];
  const paymentsCount = payments.length || Number(trip.payments_count ?? 0) || 0;
  return { total, paid, remaining, commission, paymentsCount };
}

function DriverFinancialsTab({ driverId, refreshKey = 0 }) {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const PER_PAGE = 8;

  useEffect(() => {
    if (!driverId) return;
    setLoading(true);
    fetch(`${BASE}/driver-trips/${driverId}`)
      .then((r) => r.json())
      .then((d) => { setTrips(Array.isArray(d.trips) ? d.trips : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [driverId, refreshKey]);

  const totals = trips.reduce(
    (acc, t) => {
      const f = tripFinancials(t);
      acc.total += f.total;
      acc.paid += f.paid;
      acc.remaining += f.remaining;
      acc.commission += f.commission;
      return acc;
    },
    { total: 0, paid: 0, remaining: 0, commission: 0 }
  );

  const totalPages = Math.max(1, Math.ceil(trips.length / PER_PAGE));
  const paged = trips.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const pageNumbers = getPageNumbers(page, totalPages);

  const summaryCards = [
    { label: "إجمالي أسعار الرحلات", value: totals.total, cls: "text-gray-800" },
    { label: "إجمالي المدفوع", value: totals.paid, cls: "text-green-600" },
    { label: "إجمالي المتبقي", value: totals.remaining, cls: "text-red-600" },
    { label: "إجمالي عمولتنا", value: totals.commission, cls: "text-[#bd8b2a]" },
  ];

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <div className="w-8 h-8 border-4 border-[#c9a84c] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4" dir="rtl">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {summaryCards.map((c) => (
          <div key={c.label} className="border border-gray-100 rounded-xl p-4 bg-white shadow-sm text-right">
            <p className={`text-lg font-bold ${c.cls}`}>{fmtMoney(c.value)} ر.س</p>
            <p className="text-xs text-gray-400 mt-1">{c.label}</p>
          </div>
        ))}
      </div>

      {trips.length === 0 ? (
        <p className="text-center text-sm text-gray-400 py-8">لا توجد رحلات لعرض تفاصيلها المالية</p>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right">
              <thead>
                <tr className="bg-[#f9f6f0] border-b border-gray-100">
                  {["الرحلة", "التاريخ", "الحالة", "سعر الرحلة", "المدفوع", "عدد الدفعات", "المتبقي", "عمولتنا"].map((h) => (
                    <th key={h} className="px-4 py-3 text-xs font-semibold text-gray-500 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paged.map((trip) => {
                  const tripId = trip.id ?? trip.trip_id;
                  const st = tripStatusInfo(trip.trip_status ?? trip.status);
                  const f = tripFinancials(trip);
                  const dateFrom = trip.start_date ?? trip.date_from ?? trip.trip_date;
                  return (
                    <tr key={tripId} className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors">
                      <td className="px-4 py-3 font-bold text-gray-800 whitespace-nowrap">#{tripId}</td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{fmtTripDate(dateFrom)}</td>
                      <td className="px-4 py-3"><span className={`${st.cls} text-xs px-2.5 py-0.5 rounded-full font-medium`}>{st.label}</span></td>
                      <td className="px-4 py-3 font-semibold text-gray-800 whitespace-nowrap">{fmtMoney(f.total)} ر.س</td>
                      <td className="px-4 py-3 font-semibold text-green-600 whitespace-nowrap">{fmtMoney(f.paid)} ر.س</td>
                      <td className="px-4 py-3 text-gray-600 text-center">{f.paymentsCount}</td>
                      <td className={`px-4 py-3 font-semibold whitespace-nowrap ${f.remaining > 0 ? "text-red-600" : "text-gray-500"}`}>{fmtMoney(f.remaining)} ر.س</td>
                      <td className="px-4 py-3 font-semibold text-[#bd8b2a] whitespace-nowrap">{fmtMoney(f.commission)} ر.س</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-[#f9f6f0] border-t border-gray-200 font-bold text-gray-800">
                  <td className="px-4 py-3 whitespace-nowrap" colSpan={3}>الإجمالي</td>
                  <td className="px-4 py-3 whitespace-nowrap">{fmtMoney(totals.total)} ر.س</td>
                  <td className="px-4 py-3 text-green-600 whitespace-nowrap">{fmtMoney(totals.paid)} ر.س</td>
                  <td className="px-4 py-3" />
                  <td className="px-4 py-3 text-red-600 whitespace-nowrap">{fmtMoney(totals.remaining)} ر.س</td>
                  <td className="px-4 py-3 text-[#bd8b2a] whitespace-nowrap">{fmtMoney(totals.commission)} ر.س</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {trips.length > PER_PAGE && (
            <div className="flex items-center justify-center gap-1.5 py-3">
              <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 text-sm">›</button>
              {pageNumbers.map((n, i) =>
                n === "…" ? (
                  <span key={`ellipsis-${i}`} className="w-8 h-8 flex items-center justify-center text-gray-400 text-xs">…</span>
                ) : (
                  <button key={n} type="button" onClick={() => setPage(n)} className={`w-8 h-8 rounded-full text-xs font-bold border transition-colors ${page === n ? "bg-[#c9a84c] text-white border-[#c9a84c]" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}>{n}</button>
                )
              )}
              <button type="button" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 text-sm">‹</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const VIOLATION_TYPE = {
  تنبيه: { cls: "bg-blue-100 text-blue-600 border border-blue-200" },
  إنذار: { cls: "bg-red-100 text-red-500 border border-red-200" },
  شكوى: { cls: "bg-red-50 text-red-600 border border-red-100" },
  مخالفة: { cls: "bg-orange-50 text-orange-700 border border-orange-100" },
  ملاحظه: { cls: "bg-amber-100 text-amber-600 border border-amber-200" },
};
const violationInfo = (t) => VIOLATION_TYPE[normalizeViolationType(t)] || { cls: "bg-gray-100 text-gray-500 border border-gray-200" };

function useDriverViolationsData(driverId, refreshKey) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!driverId) {
      setRecords([]);
      setLoading(false);
      return undefined;
    }

    const ctrl = new AbortController();
    setLoading(true);
    setError(null);

    fetchDriverViolations(driverId, ctrl.signal)
      .then((list) => {
        if (!ctrl.signal.aborted) setRecords(list);
      })
      .catch((err) => {
        if (err?.name === "AbortError") return;
        if (!ctrl.signal.aborted) setError(err.message || "فشل تحميل البيانات");
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setLoading(false);
      });

    return () => ctrl.abort();
  }, [driverId, refreshKey]);

  return { records, loading, error };
}

function ViolationRecordCard({ record, index, showRating = false }) {
  const type = normalizeViolationType(record.type ?? record.violation_type ?? "تنبيه");
  const info = violationInfo(type);
  const salesName = getViolationSalesName(record);
  const message = record.message ?? record.description ?? record.reason ?? "—";
  const rating = record.rating != null ? Number(record.rating) : null;

  return (
    <div key={record.id || index} className="bg-white border border-gray-100 rounded-2xl px-5 py-4 space-y-1.5">
      <div className="flex items-center justify-end gap-3 flex-wrap">
        {showRating && rating != null && !Number.isNaN(rating) && (
          <StarDisplay value={rating} />
        )}
        <span className="text-xs text-gray-400">{fmtDate(getViolationDate(record))}</span>
        <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${info.cls}`}>
          {isNoteRecord(record) ? "ملاحظة" : type}
        </span>
      </div>
      <p className="text-sm font-semibold text-gray-800 text-right">{message}</p>
      {salesName && (
        <p className="text-xs text-gray-500 text-right">
          بواسطة: <span className="font-medium text-gray-700">{salesName}</span>
        </p>
      )}
    </div>
  );
}

function DriverViolationsTab({ driverId, refreshKey }) {
  const { records, loading, error } = useDriverViolationsData(driverId, refreshKey);
  const violations = records.filter(isViolationRecord);

  if (loading) return <div className="flex justify-center py-10"><div className="w-8 h-8 border-4 border-[#c9a84c] border-t-transparent rounded-full animate-spin" /></div>;
  if (error) return <p className="text-center text-sm text-gray-400 py-8">{error}</p>;
  if (!violations.length) return <p className="text-center text-sm text-gray-400 py-8">لا توجد مخالفات أو تنبيهات</p>;

  return (
    <div className="space-y-3">
      {violations.map((record, index) => (
        <ViolationRecordCard key={record.id || index} record={record} index={index} />
      ))}
    </div>
  );
}

function DriverNotesTab({ driverId, refreshKey, onAddNote }) {
  const { records, loading, error } = useDriverViolationsData(driverId, refreshKey);
  const notes = records.filter(isNoteRecord);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center px-2">
        <button
          type="button"
          onClick={onAddNote}
          className="flex items-center gap-1.5 text-xs border border-gray-200 px-3 py-1.5 rounded-lg text-gray-500 hover:bg-gray-50 bg-white"
        >
          <Plus className="w-3.5 h-3.5" />
          إضافة ملاحظة
        </button>
        <h3 className="font-semibold text-gray-700">الملاحظات الإدارية</h3>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="w-8 h-8 border-4 border-[#c9a84c] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : error ? (
        <p className="text-center text-sm text-gray-400 py-8">{error}</p>
      ) : !notes.length ? (
        <p className="text-center text-sm text-gray-400 py-8">لا توجد ملاحظات</p>
      ) : (
        <div className="space-y-3">
          {notes.map((record, index) => (
            <ViolationRecordCard key={record.id || index} record={record} index={index} showRating />
          ))}
        </div>
      )}
    </div>
  );
}

function StarDisplay({ value, size = "sm" }) {
  const score = Number(value);
  const filled = Number.isFinite(score) ? Math.round(score) : 0;
  const sizeClass = size === "lg" ? "w-5 h-5" : "w-4 h-4";

  return (
    <span className="inline-flex items-center gap-0.5" dir="ltr" aria-label={filled ? `${filled} من 5` : "بدون تقييم"}>
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          className={`${sizeClass} ${star <= filled ? "fill-amber-400 text-amber-400" : "text-gray-200 fill-gray-200"}`}
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </span>
  );
}

const RATING_TYPE_STYLES = {
  "شكوى": "bg-red-50 text-red-600 border border-red-100",
  "ملاحظة": "bg-blue-50 text-blue-600 border border-blue-100",
  "تنبيه": "bg-amber-50 text-amber-700 border border-amber-100",
  "مخالفة": "bg-orange-50 text-orange-700 border border-orange-100",
};

function DriverRatingsTab({ driverId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!driverId) return;
    setLoading(true);
    setError(null);
    fetch(`${BASE}/driver-rating/${driverId}`, { headers: { Accept: "application/json" } })
      .then((r) => {
        if (!r.ok) throw new Error(`فشل تحميل التقييمات (${r.status})`);
        return r.json();
      })
      .then((d) => { setData(d); setLoading(false); })
      .catch((err) => { setError(err.message); setLoading(false); });
  }, [driverId]);

  if (loading) return <div className="flex justify-center py-10"><div className="w-8 h-8 border-4 border-[#c9a84c] border-t-transparent rounded-full animate-spin" /></div>;
  if (error) return <p className="text-center text-sm text-red-500 py-8">{error}</p>;

  const avg = parseFloat(data?.average_rating) || 0;
  const total = data?.total_records || 0;
  const details = Array.isArray(data?.details) ? data.details : [];

  return (
    <div className="space-y-4" dir="rtl">
      <div className="bg-white border border-gray-100 rounded-2xl p-6 flex items-center justify-between gap-4">
        <div className="text-center">
          <p className="text-3xl font-extrabold text-gray-800">{total}</p>
          <p className="text-xs text-gray-400 mt-1">إجمالي التقييمات</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <p className="text-xs font-semibold text-gray-500">متوسط التقييم</p>
          <div className="flex items-center gap-2">
            <StarDisplay value={avg} size="lg" />
            <span className="text-lg font-bold text-gray-800">{avg > 0 ? avg.toFixed(1) : "—"} / 5</span>
          </div>
        </div>
      </div>

      {details.length === 0 ? (
        <p className="text-center text-sm text-gray-400 py-6">لا توجد تقييمات بعد</p>
      ) : details.map((item, i) => {
        const rating = item.rating != null ? Number(item.rating) : null;
        const message = item.message || item.comment || item.note || item.review || "";
        const type = item.type || "تقييم";
        const typeCls = RATING_TYPE_STYLES[type] || "bg-gray-50 text-gray-600 border border-gray-100";
        const salesName = item.sales?.name || item.sales_name || null;
        const date = item.violation_date || item.created_at;

        return (
          <div key={item.id || i} className="bg-white border border-gray-100 rounded-2xl px-5 py-4 space-y-2">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${typeCls}`}>{type}</span>
                {date && (
                  <span className="text-xs text-gray-400">{fmtDate(date)}</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {rating != null && Number.isFinite(rating) ? (
                  <>
                    <StarDisplay value={rating} />
                    <span className="text-xs font-semibold text-amber-600">{rating}/5</span>
                  </>
                ) : (
                  <span className="text-xs text-gray-400">بدون نجوم</span>
                )}
              </div>
            </div>
            {message ? (
              <p className="text-sm text-gray-700 text-right leading-relaxed">{message}</p>
            ) : (
              <p className="text-sm text-gray-400 text-right">—</p>
            )}
            {salesName && (
              <p className="text-xs text-gray-500 text-right">
                بواسطة: <span className="font-medium text-gray-700">{salesName}</span>
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function DriverDetailsView({
  driver,
  driverId,
  loading,
  onBack,
  onEditRequest,
  onDeleteRequest,
  onOpenModal,
  statusLabel,
  statusColor,
  statuses = [],
  onStatusChange,
  statusChanging = false,
  violRefreshKey = 0,
  tripsRefreshKey = 0,
}) {
  const [activeTab, setActiveTab] = useState("personal");
  const { can } = usePermissions();
  const canEdit = can(PERMISSIONS.DRIVERS_EDIT);
  const canDelete = can(PERMISSIONS.DRIVERS_DELETE);
  const canChangeStatus = can(PERMISSIONS.DRIVERS_SUSPEND) || can(PERMISSIONS.DRIVERS_EDIT);

  const d = normalizeDriverMedia(driver);
  const fullName = [d?.name, d?.last_name].filter(Boolean).join(" ");
  const avatarUrl = getDriverAvatarUrl(d);
  const currentStatusId = resolveDriverStatusId(d, statuses);

  const tabs = [
    { id: "personal", label: "المعلومات الشخصية" },
    { id: "trips", label: "سجل الرحلات" },
    { id: "financials", label: "التفاصيل المالية" },
    { id: "violations", label: "المخالفات والتنبيهات" },
    { id: "notes", label: "الملاحظات" },
    { id: "ratings", label: "التقييمات" },
  ];

  if (loading) {
    return (
      <div className="flex justify-center py-20" dir="rtl">
        <div className="w-10 h-10 border-4 border-[#c9a84c] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div dir="rtl" className="w-full space-y-4">
      <button type="button" onClick={onBack} className="flex items-center gap-1.5 text-[#c9a84c] text-sm font-semibold hover:opacity-80">
        <span>العودة إلى السائقين</span>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
      </button>

      {/* Profile Card */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div className="flex flex-wrap gap-1.5 text-xs font-semibold">
          <button type="button" onClick={() => onOpenModal("alert")} className="bg-blue-600 text-white px-3 py-2 rounded-xl">إرسال تنبيه</button>
          {canChangeStatus && statuses.map((s) => {
            const isCurrent = isSameDriverStatus(currentStatusId, s.id);
            return (
              <button
                key={s.id}
                type="button"
                disabled={isCurrent || statusChanging}
                onClick={() => onStatusChange?.(s.id)}
                className={`px-3 py-2 rounded-xl transition-colors disabled:cursor-not-allowed ${statusButtonClass(s.id, isCurrent)}`}
              >
                {s.name}
              </button>
            );
          })}
          {canEdit && (
          <button type="button" onClick={() => onEditRequest(d)} className="border border-gray-200 text-gray-600 px-3 py-2 rounded-xl">تعديل</button>
          )}
          {canDelete && (
          <button type="button" onClick={() => onDeleteRequest(d)} className="border border-red-200 text-red-500 px-3 py-2 rounded-xl">حذف</button>
          )}
          {canEdit && (
          <button type="button" onClick={() => onOpenModal("assignTrip")} className="bg-neutral-800 text-white px-3 py-2 rounded-xl">+ إسناد رحلة</button>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <h2 className="text-xl font-bold text-gray-800">{fullName}</h2>
            <p className="text-xs text-gray-400 mt-1" dir="ltr">{d?.phone}</p>
            <div className="flex gap-2 mt-2 justify-end">
              <span className={`text-xs px-2.5 py-0.5 rounded-full ${statusColor(currentStatusId)}`}>{statusLabel(currentStatusId)}</span>
            </div>
          </div>
          {avatarUrl ? (
            <DriverImage src={avatarUrl} alt={fullName} className="w-14 h-14 rounded-full object-cover border border-gray-200 shrink-0" />
          ) : (
            <div className="w-14 h-14 rounded-full bg-gray-700 text-white flex items-center justify-center text-2xl font-bold shrink-0">{(d?.name || "?")[0]}</div>
          )}
        </div>
      </div>

      {/* Progress */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm space-y-2">
        <div className="flex justify-between text-xs text-gray-500 font-medium">
          <span>{d?.profile_completion || 0}%</span>
          <span>نسبة اكتمال الملف الشخصي</span>
        </div>
        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-green-500 rounded-full" style={{ width: `${d?.profile_completion || 0}%` }} />
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl p-2 border border-gray-100 shadow-sm flex gap-4 text-sm font-semibold text-gray-400 overflow-x-auto">
        {tabs.map((tab) => (
          <span
            key={tab.id}
            role="button"
            tabIndex={0}
            onClick={() => setActiveTab(tab.id)}
            onKeyDown={(e) => e.key === "Enter" && setActiveTab(tab.id)}
            className={`px-3 py-1 cursor-pointer whitespace-nowrap transition-colors ${activeTab === tab.id ? "text-[#c9a84c] border-b-2 border-[#c9a84c]" : "hover:text-gray-700"}`}
          >
            {tab.label}
          </span>
        ))}
      </div>

      {/* Tab content */}
      <div className="mt-2">
        {activeTab === "personal" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-3">
              <h3 className="text-sm font-bold text-[#c9a84c]">المعلومات الشخصية</h3>
              {[["الاسم", fullName], ["الهاتف", d?.phone], ["العنوان", d?.address], ["الجنسية", d?.nationality], ["البريد", d?.email || "—"], ["الجنس", genderLabel(d?.gender)], ["حالة الحساب", statusLabel(currentStatusId)], ["رقم الحالة", currentStatusId != null ? String(currentStatusId) : "—"]].map(([label, value]) => (
                <div key={label} className="flex justify-between border-b border-gray-50 pb-2 text-sm">
                  <span className="text-gray-400">{label}</span>
                  <span className="text-gray-700 font-medium" dir={label === "الهاتف" ? "ltr" : undefined}>{value || "—"}</span>
                </div>
              ))}
            </div>
            <div className="space-y-4">
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-3">
                <h3 className="text-sm font-bold text-[#c9a84c]">المعلومات المالية</h3>
                {[["اسم البنك", d?.bank_name], ["صاحب الحساب", d?.account_owner], ["رقم حساب السائق", d?.bank_account_number], ["الآيبان", d?.iban]].map(([label, value]) => (
                  <div key={label} className="flex justify-between border-b border-gray-50 pb-2 text-sm">
                    <span className="text-gray-400">{label}</span>
                    <span className="text-gray-700 font-medium" dir={label === "رقم حساب السائق" || label === "الآيبان" ? "ltr" : undefined}>{value || "—"}</span>
                  </div>
                ))}
              </div>
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-3">
                <h3 className="text-sm font-bold text-[#c9a84c]">معلومات السيارة</h3>
                {[["نوع السيارة", d?.car_type], ["موديل السيارة", d?.car_model], ["حجم السيارة", d?.vehicle_size]].map(([label, value]) => (
                  <div key={label} className="flex justify-between border-b border-gray-50 pb-2 text-sm">
                    <span className="text-gray-400">{label}</span>
                    <span className="text-gray-700 font-medium">{value || "—"}</span>
                  </div>
                ))}
                {normalizeMediaUrl(d?.car_image) && (
                  <DriverImage src={d.car_image} alt="صورة السيارة" className="w-full h-32 object-cover rounded-xl mt-2" />
                )}
              </div>
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-3">
                <h3 className="text-sm font-bold text-[#c9a84c]">الوثائق</h3>
                <DriverDocumentsGrid driver={d} />
              </div>
            </div>
          </div>
        )}

        {activeTab === "trips" && (
          <DriverTripsTab driverId={driverId} driverName={fullName} tripsCount={d?.trips_count} totalDues={d?.total_dues} refreshKey={tripsRefreshKey} />
        )}

        {activeTab === "financials" && (
          <DriverFinancialsTab driverId={driverId} refreshKey={tripsRefreshKey} />
        )}

        {activeTab === "notes" && (
          <DriverNotesTab
            driverId={driverId}
            refreshKey={violRefreshKey}
            onAddNote={() => onOpenModal("addNote")}
          />
        )}

        {activeTab === "violations" && (
          <DriverViolationsTab driverId={driverId} refreshKey={violRefreshKey} />
        )}

        {activeTab === "ratings" && (
          <DriverRatingsTab driverId={driverId} />
        )}
      </div>
    </div>
  );
}
