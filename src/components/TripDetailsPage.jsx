import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  CheckCircle2, XCircle, ArrowRight,
  RefreshCw, Pencil, Plus, Image as ImageIcon,
  Users, UserPlus, UserCheck, Trash2,
} from "lucide-react";
import { useToast, toast as globalToast } from "../lib/toast";
import { ConfirmModal } from "./ui/AppModal";
import AddPaymentModal from "./AddPaymentModal";
import EditOfferedTripModal from "./EditOfferedTripModal";
import TripNoteModal from "./trip-details/TripNoteModal";
import TripRefundModal from "./trip-details/TripRefundModal";
import TripChangeStatusModal from "./trip-details/TripChangeStatusModal";
import CustomerProfileModal from "./trip-details/CustomerProfileModal";
import TripCustomerCard from "./trip-details/TripCustomerCard";
import DriverProfileModal from "./trip-details/DriverProfileModal";
import TripPassengerModal from "./trip-details/TripPassengerModal";
import AssignTripModal from "./AssignTripModal";
import ImageProofModal from "./trip-details/ImageProofModal";
import {
  fetchTripDetailsById,
  normalizeWithoutDriverTrip,
  extractTripPassengers,
  hasAssignedDriver,
  requestDeletePassenger,
} from "../services/tripService.js";
import { loadTripPayments, saveTripPayment } from "../lib/tripPaymentProofs.js";
import {
  fetchCustomersList,
  findCustomerIdByPassenger,
} from "../services/customerService.js";
import { usePermissions } from "../hooks/usePermissions.js";
import { PERMISSIONS } from "../lib/permissions.js";

const TABS = [
  { id: "trip", label: "بيانات الرحلة" },
  { id: "financial", label: "التفاصيل المالية" },
  { id: "notes", label: "الملاحظات" },
];

function normalizeTrip(raw) {
  return raw?.data ?? raw?.trip ?? raw ?? null;
}

function fmtMoney(v) {
  if (v == null || v === "") return "—";
  const n = Number(v);
  return Number.isFinite(n) ? n.toLocaleString("ar-SA") : String(v);
}

function fmtDate(v) {
  if (!v) return "—";
  const d = new Date(v);
  if (!Number.isNaN(d.getTime())) return d.toLocaleDateString("ar-EG");
  return String(v);
}

function driverName(driver) {
  if (!driver) return null;
  return [driver.name, driver.last_name].filter(Boolean).join(" ");
}

function statusBadgeClass(status) {
  const s = String(status ?? "");
  if (s.includes("معلق") || s === "suspended") return "border-[#c9a84c] text-[#c9a84c] bg-[#fffcf5]";
  if (s.includes("تم") || s === "completed") return "border-emerald-400 text-emerald-600 bg-emerald-50";
  if (s.includes("ملغ") || s === "cancelled") return "border-red-400 text-red-600 bg-red-50";
  if (s.includes("معروض") || s === "offered") return "border-purple-400 text-purple-600 bg-purple-50";
  if (s.includes("تنفيذ") || s === "progress") return "border-blue-400 text-blue-600 bg-blue-50";
  return "border-gray-300 text-gray-600 bg-gray-50";
}

function normalizeTripStatus(trip) {
  const raw = trip?.trip_status ?? trip?.status ?? "معلقة";
  const map = {
    pending: "معلقة",
    offered: "معروضة",
    suspended: "معلقة",
    completed: "تم",
    cancelled: "ملغية",
    progress: "قيد التنفيذ",
    in_progress: "قيد التنفيذ",
  };
  return map[raw] ?? raw;
}

function fmtTime(v) {
  if (!v) return "—";
  const s = String(v);
  const match = s.match(/^(\d{2}:\d{2})/);
  return match ? match[1] : s;
}

function extractPaymentImage(payment) {
  if (!payment) return null;
  const raw =
    payment.transfer_image ??
    payment.transfer_image_url ??
    payment.image ??
    payment.proof_image ??
    payment.receipt_image;
  return resolveMediaUrl(raw);
}

function mapApiPayment(p, index) {
  const amount = p.amount ?? p.amount_paid ?? p.paid_amount;
  return {
    ...p,
    id: p.id ?? `api-${index}`,
    amount,
    date: p.date ?? p.created_at ?? p.commission_transfer_date,
    payer_type: p.payer_type ?? p.payer ?? "السائق",
    from_label: p.from_label ?? p.from_account ?? (p.account_number ? `حساب ${p.account_number}` : "حساب السائق"),
    to_label: p.to_label ?? p.to_account ?? p.recipient_account ?? "حساب الشركة",
    transfer_method: p.transfer_method ?? "تحويل بنكي",
    note: p.note ?? p.payment_note ?? p.notes,
    transfer_image: extractPaymentImage(p),
  };
}

function buildPayments(trip, localPayments = []) {
  const historySource =
    (Array.isArray(trip?.payment_history) && trip.payment_history.length && trip.payment_history) ||
    (Array.isArray(trip?.payments) && trip.payments.length && trip.payments) ||
    (Array.isArray(trip?.trip_payments) && trip.trip_payments.length && trip.trip_payments) ||
    null;

  let apiPayments = [];
  if (historySource) {
    apiPayments = historySource.map(mapApiPayment);
  } else {
    const paid = Number(trip?.amount_paid ?? 0);
    if (paid || trip?.transfer_image) {
      apiPayments = [mapApiPayment({
        id: "primary",
        amount: paid,
        date: trip.commission_transfer_date ?? trip.updated_at ?? trip.created_at,
        payer_type: trip.payer_type ?? "السائق",
        from_label: trip.bank_name ? `حساب السائق - ${trip.bank_name}` : "حساب السائق",
        to_label: trip.recipient_account ?? "حساب الشركة",
        transfer_method: trip.transfer_method ?? "تحويل بنكي",
        note: trip.payment_note ?? trip.notes ?? "",
        transfer_image: trip.transfer_image,
      }, 0)];
    }
  }

  const localMapped = localPayments.map((p, i) => mapApiPayment(p, `local-${i}`));
  if (localMapped.length && apiPayments.length === 1 && apiPayments[0].id === "primary") {
    return localMapped;
  }
  if (localMapped.length) {
    const apiIds = new Set(apiPayments.map((p) => String(p.id)));
    const extra = localMapped.filter((p) => !apiIds.has(String(p.id)));
    return [...apiPayments, ...extra];
  }
  return apiPayments;
}

function resolveMediaUrl(url) {
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("data:")) return trimmed;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  if (trimmed.startsWith("//")) return `https:${trimmed}`;
  if (trimmed.startsWith("/")) return `https://drivo1.elmoroj.com${trimmed}`;
  if (trimmed.startsWith("storage/")) return `https://drivo1.elmoroj.com/${trimmed}`;
  return `https://drivo1.elmoroj.com/storage/${trimmed}`;
}

const PinIcon = () => (
  <svg className="w-4 h-4 text-[#c9a84c]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

function SectionTitle({ children }) {
  return (
    <div className="flex items-center gap-2 text-gray-800 font-bold text-sm mb-3">
      <PinIcon />
      <span>{children}</span>
    </div>
  );
}

function FieldCol({ label, value, dir }) {
  return (
    <div className="text-right">
      <p className="text-gray-400 text-xs mb-1">{label}</p>
      <p className="text-gray-800 text-xs font-medium" dir={dir}>{value ?? "—"}</p>
    </div>
  );
}

function PersonCard({ title, name, phone, onProfile, profileDisabled, emptyMessage, primaryAction }) {
  return (
    <div className="bg-white border border-gray-200 rounded-[1.2rem] p-5 shadow-sm text-right h-full flex flex-col">
      <h4 className="font-bold text-gray-800 text-sm mb-4 border-b border-gray-100 pb-2 text-center">{title}</h4>
      {emptyMessage ? (
        <p className="text-gray-400 text-xs text-center flex-1 py-4">{emptyMessage}</p>
      ) : (
        <div className="space-y-3 text-xs text-gray-600 mb-5 flex-1">
          <div className="flex items-center justify-between gap-3">
            <span className="font-medium text-gray-800">{name ?? "—"}</span>
            <span className="text-gray-400 flex items-center gap-1 shrink-0">
              الاسم
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="font-medium text-gray-800" dir="ltr">{phone ?? "—"}</span>
            <span className="text-gray-400 flex items-center gap-1 shrink-0">
              الهاتف
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
            </span>
          </div>
        </div>
      )}
      <div className="space-y-2">
        {primaryAction}
        {!emptyMessage && (
          <button
            type="button"
            onClick={onProfile}
            disabled={profileDisabled}
            className="w-full border border-gray-200 text-gray-500 rounded-xl py-2 text-xs font-semibold hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            عرض الملف الشخصي
          </button>
        )}
      </div>
    </div>
  );
}

function PaymentCard({ payment, onShowProof }) {
  const amount = payment.amount ?? payment.amount_paid ?? payment.paid_amount;
  const date = payment.date ?? payment.created_at ?? payment.commission_transfer_date;
  const payer = payment.payer_type ?? payment.payer ?? "السائق";
  const fromLabel = payment.from_label ?? payment.from_account ?? "حساب السائق - البنك الاهلي";
  const toLabel = payment.to_label ?? payment.to_account ?? "حساب الشركة الراجحي";
  const method = payment.transfer_method ?? "تحويل بنكي";
  const note = payment.note ?? payment.payment_note ?? payment.notes;
  const image = payment.transfer_image;

  return (
    <div className="border border-gray-100 rounded-2xl p-5 bg-white shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            disabled={!image}
            onClick={() => image && onShowProof?.(image)}
            className="inline-flex items-center gap-1.5 bg-white border border-gray-200 text-gray-600 text-[10px] font-bold px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ImageIcon className="w-3.5 h-3.5" /> عرض الإثبات
          </button>
          <span className="border border-gray-200 text-gray-500 bg-white text-[10px] px-3 py-1 rounded-md">{payer}</span>
        </div>
        <div className="flex items-center gap-2 text-right">
          <div>
            <div className="font-bold text-gray-800 text-base">{fmtMoney(amount)} ر.س</div>
            <div className="text-[10px] text-gray-400 mt-0.5">{fmtDate(date)}</div>
          </div>
          <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="flex items-center gap-2 bg-[#f8f8f8] rounded-xl px-3 py-2.5">
          <span className="text-[11px] text-gray-400 shrink-0">الدافع:</span>
          <span className="border border-gray-200 text-gray-600 bg-white text-[10px] px-3 py-0.5 rounded-md">{payer}</span>
        </div>
        <div className="flex items-center gap-2 bg-[#f8f8f8] rounded-xl px-3 py-2.5">
          <svg className="w-4 h-4 text-[#c9a84c] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
          <span className="text-[11px] text-gray-600">{fromLabel} ← {toLabel}</span>
        </div>
        <div className="bg-[#f8f8f8] rounded-xl px-3 py-2.5 flex items-center gap-2">
          <span className="text-[11px] text-gray-400">طريقة التحويل:</span>
          <span className="text-[11px] font-semibold text-gray-700">{method}</span>
        </div>
        {note && (
          <div className="bg-[#fffcf5] border border-amber-100 rounded-xl px-3.5 py-3 text-right">
            <div className="text-[11px] font-bold text-amber-700 mb-0.5">ملاحظة:</div>
            <div className="text-[11px] text-amber-600">{note}</div>
          </div>
        )}
        {image && (
          <button
            type="button"
            onClick={() => onShowProof?.(image)}
            className="text-[10px] text-[#c9a84c] hover:underline block text-left"
          >
            فتح صورة الإثبات
          </button>
        )}
      </div>
    </div>
  );
}

function mapOperationDayIds(days) {
  if (!Array.isArray(days)) return [];
  const map = {
    السبت: "sat", الأحد: "sun", الاثنين: "mon", الثلاثاء: "tue",
    الأربعاء: "wed", الخميس: "thu", الجمعة: "fri",
    sat: "sat", sun: "sun", mon: "mon", tue: "tue", wed: "wed", thu: "thu", fri: "fri",
  };
  return days.map((d) => map[d] ?? d).filter(Boolean);
}

/** معرّف العميل المرتبط بالرحلة — من customer_id أو مطابقة الاسم/الهاتف */
function resolveTripCustomerId(trip, passengers = [], customers = []) {
  for (const p of passengers) {
    const id = p.customerId ?? findCustomerIdByPassenger(p, customers);
    if (id != null) return id;
  }
  const mp = trip?.main_passenger ?? trip?.["الراكب الاساسى"] ?? trip?.["الراكب الأساسي"];
  if (mp?.customer_id != null) return String(mp.customer_id);
  if (mp) {
    const matched = findCustomerIdByPassenger(mp, customers);
    if (matched) return matched;
  }
  if (trip?.customer_id != null) return String(trip.customer_id);
  if (trip?.customer?.id != null) return String(trip.customer.id);
  return null;
}

function enrichPassengersWithCustomerIds(passengers = [], customers = []) {
  return passengers.map((p) => ({
    ...p,
    resolvedCustomerId: p.customerId ?? findCustomerIdByPassenger(p, customers),
  }));
}

export default function TripDetailsPage() {
  const navigate = useNavigate();
  const { tripId } = useParams();
  const toast = useToast();
  const { can } = usePermissions();
  const canEdit = can(PERMISSIONS.TRIPS_EDIT);
  const canAddPayment = can(PERMISSIONS.TRIPS_PAYMENT_ADD);
  const canChangeStatus = can(PERMISSIONS.TRIPS_STATUS_CHANGE);
  const canAssign = can(PERMISSIONS.TRIPS_OFFERED_ASSIGN);
  const canDeleteOffered = can(PERMISSIONS.TRIPS_ADS_DELETE);

  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [noteList, setNoteList] = useState([]);
  const [activeTab, setActiveTab] = useState("trip");

  const [showAddNote, setShowAddNote] = useState(false);
  const [showRefund, setShowRefund] = useState(false);
  const [showStatus, setShowStatus] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showCustomerProfile, setShowCustomerProfile] = useState(false);
  const [showDriverProfile, setShowDriverProfile] = useState(false);
  const [showPassengerModal, setShowPassengerModal] = useState(false);
  const [showAssignDriver, setShowAssignDriver] = useState(false);
  const [passengerProfileId, setPassengerProfileId] = useState(null);
  const [deletePassenger, setDeletePassenger] = useState(null);
  const [deletePassengerLoading, setDeletePassengerLoading] = useState(false);
  const [proofImageUrl, setProofImageUrl] = useState(null);
  const [customersList, setCustomersList] = useState([]);
  const [localPayments, setLocalPayments] = useState(() => loadTripPayments(tripId));

  useEffect(() => {
    setLocalPayments(loadTripPayments(tripId));
  }, [tripId]);

  useEffect(() => {
    fetchCustomersList()
      .then(setCustomersList)
      .catch(() => setCustomersList([]));
  }, []);

  const fetchTrip = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const { trip: raw } = await fetchTripDetailsById(tripId);
      const data = normalizeWithoutDriverTrip(normalizeTrip(raw));
      setTrip(data);
      if (typeof data?.notes === "string" && data.notes.trim()) {
        setNoteList([{ id: "trip-note", content: data.notes, created_at: fmtDate(data.updated_at), author: data.assisted_by ?? "—" }]);
      } else if (typeof data?.trip_notes === "string" && data.trip_notes.trim()) {
        setNoteList([{ id: "trip-note", content: data.trip_notes, created_at: fmtDate(data.updated_at), author: data.assisted_by ?? "—" }]);
      }
    } catch (err) {
      if (!silent) setError(err.message || "حدث خطأ أثناء التحميل");
      else globalToast.error(err.message || "فشل تحديث بيانات الرحلة");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [tripId]);

  useEffect(() => { fetchTrip(); }, [tripId, fetchTrip]);

  const applyTripUpdate = useCallback((updated) => {
    const next = normalizeWithoutDriverTrip(normalizeTrip(updated?.trip ?? updated));
    if (!next) return;
    setTrip((prev) => ({
      ...prev,
      ...next,
      driver: next.driver ?? prev?.driver,
      sales: next.sales ?? prev?.sales,
      customer: next.customer ?? prev?.customer,
      main_passenger: next.main_passenger ?? prev?.main_passenger,
    }));
  }, []);

  const handleAddNote = (text) => {
    const note = {
      id: Date.now(),
      content: text,
      created_at: new Date().toLocaleDateString("ar-EG"),
      author: "أنت",
    };
    setNoteList((prev) => [note, ...prev]);
    toast.success("تمت إضافة الملاحظة محلياً");
  };

  const handlePaymentSuccess = async (data, meta) => {
    const saved = await saveTripPayment(tripId, {
      id: `local-${Date.now()}`,
      amount: meta?.amount_paid ?? data?.amount_paid,
      amount_paid: meta?.amount_paid ?? data?.amount_paid,
      date: meta?.commission_transfer_date,
      commission_transfer_date: meta?.commission_transfer_date,
      transfer_method: meta?.transfer_method,
      account_number: meta?.account_number,
      recipient_account: meta?.recipient_account,
      note: meta?.payment_note,
      payment_note: meta?.payment_note,
      transfer_image: resolveMediaUrl(data?.transfer_image),
      from_label: meta?.account_number ? `حساب ${meta.account_number}` : undefined,
      to_label: meta?.recipient_account,
    }, meta?.transfer_image);

    setLocalPayments(saved);
    setTrip((prev) => ({
      ...prev,
      total_price: data?.total_price ?? prev?.total_price,
      amount_paid: data?.amount_paid ?? prev?.amount_paid,
      remaining_amount: data?.remaining_amount ?? prev?.remaining_amount,
      transfer_image: data?.transfer_image ?? prev?.transfer_image,
    }));
    await fetchTrip({ silent: true });
  };

  const handleDeletePassenger = async () => {
    const cid = deletePassenger?.resolvedCustomerId ?? deletePassenger?.customerId;
    if (!cid) {
      toast.error("لا يمكن تحديد العميل — جرّبي تحديث الصفحة");
      return;
    }
    setDeletePassengerLoading(true);
    try {
      await requestDeletePassenger({
        tripId,
        customerId: cid,
      });
      toast.success("تم إرسال طلب حذف الراكب لمركز الموافقات");
      setDeletePassenger(null);
    } catch (err) {
      const msg = err.message || "فشل إرسال طلب الحذف";
      const lower = msg.toLowerCase();
      toast.error(
        lower.includes("not found") || lower.includes("غير موجود") || lower.includes("لم يتم") || lower.includes("pending")
          ? "تعذّر الحذف — تأكدي أن طلب الإضافة تمت الموافقة عليه وأن الراكب مرتبط فعلياً بالرحلة"
          : msg
      );
    } finally {
      setDeletePassengerLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-24" dir="rtl">
        <div className="w-10 h-10 border-4 border-[#c9a84c] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !trip) {
    return (
      <div className="flex justify-center items-center py-24 p-4" dir="rtl">
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-red-100 text-center max-w-sm space-y-3">
          <XCircle className="w-10 h-10 text-red-400 mx-auto" />
          <p className="text-sm font-bold text-gray-700">{error ?? "لا توجد بيانات"}</p>
          <button type="button" onClick={fetchTrip} className="bg-[#4a4746] text-white text-xs px-5 py-2 rounded-lg">إعادة المحاولة</button>
        </div>
      </div>
    );
  }

  const total = Number(trip.total_price ?? 0);
  const paid = Number(trip.amount_paid ?? 0);
  const remaining = Number(trip.remaining_amount ?? 0) || Math.max(0, total - paid);
  const payments = buildPayments(trip, localPayments);
  const dName = driverName(trip.driver);
  const tripHasDriver = hasAssignedDriver(trip);
  const passengers = extractTripPassengers(trip);
  const enrichedPassengers = enrichPassengersWithCustomerIds(passengers, customersList);
  const tripCustomerId = resolveTripCustomerId(trip, passengers, customersList);
  const showCustomerCard = tripCustomerId != null;
  const operatingDays = Array.isArray(trip.operation_days) && trip.operation_days.length
    ? trip.operation_days
    : (Array.isArray(trip.days) ? trip.days : []);
  const tripStatus = normalizeTripStatus(trip);
  const ourCommission = Number(trip.our_commission ?? 0);
  const driverId = trip.driver?.id ?? trip.driver_id;
  const operationDayIds = mapOperationDayIds(trip.operation_days ?? trip.days);

  return (
    <div className="w-full flex flex-col gap-5" dir="rtl">

      <div className="w-full bg-white rounded-[1.5rem] shadow-[0_2px_16px_rgba(0,0,0,0.04)] border border-gray-100 flex flex-col overflow-hidden">
        <div className="px-6 pt-6 pb-4">
          <div className="flex justify-between items-start gap-4 flex-wrap">
            <div className="min-w-0">
              <button type="button" onClick={() => navigate("/trips")}
                className="flex items-center gap-2 text-[#4a4746] font-bold text-lg mb-3 w-fit hover:text-[#c9a84c] transition-colors">
                <ArrowRight className="w-5 h-5 shrink-0" />
                <span>تفاصيل الرحلة #{trip.id ?? tripId}</span>
              </button>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="bg-[#4a4746] text-white text-[11px] px-3.5 py-1.5 rounded-lg inline-flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                  {trip.trip_type ?? "فردي"}
                </span>
                <span className="border border-gray-200 text-gray-500 text-[11px] px-3.5 py-1.5 rounded-lg inline-flex items-center gap-1.5 bg-white">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                  {trip.route_type ?? "مسار واحد"}
                </span>
                <span className="border border-gray-200 text-gray-500 text-[11px] px-3.5 py-1.5 rounded-lg bg-white">{trip.subscription_type ?? "اشتراك"}</span>
                <span className={`border text-[11px] px-3.5 py-1.5 rounded-lg ${statusBadgeClass(tripStatus)}`}>
                  {tripStatus}
                </span>
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              {canChangeStatus && (
              <button type="button" onClick={() => setShowStatus(true)}
                className="inline-flex items-center gap-1.5 bg-white border border-gray-200 text-gray-600 text-xs font-semibold px-4 py-2 rounded-xl hover:bg-gray-50 transition-colors">
                <RefreshCw className="w-3.5 h-3.5" /> تغيير الحالة
              </button>
              )}
              {canEdit && (
              <button type="button" onClick={() => setShowEdit(true)}
                className="inline-flex items-center gap-1.5 bg-[#4a4746] text-white text-xs font-semibold px-4 py-2 rounded-xl hover:bg-[#383534] transition-colors">
                <Pencil className="w-3.5 h-3.5" /> تعديل الرحلة
              </button>
              )}
            </div>
          </div>
        </div>

        <div className="mx-6 mb-3 bg-[#f4efe8] p-1 rounded-full flex gap-0.5 overflow-x-auto hide-scrollbar">
          {TABS.map((tab) => (
            <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-2.5 px-3 whitespace-nowrap text-[13px] font-bold rounded-full transition-all ${
                activeTab === tab.id ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}>
              {tab.label}
            </button>
          ))}
        </div>

        <div className="px-6 pb-6 pt-2 bg-[#faf9f6] rounded-b-[1.5rem] min-h-[300px]">

          {/* ── Trip tab ── */}
          {activeTab === "trip" && (
            <div className="space-y-6">
              <div>
                <SectionTitle>مسار الرحلة</SectionTitle>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <FieldCol label="نقطة الانطلاق:" value={trip.from ?? trip.start_point} />
                  <FieldCol label="نقطة الوصول:" value={trip.to ?? trip.end_point} />
                  <FieldCol label="المدينة:" value={trip.city ?? trip.region} />
                </div>
              </div>
              <hr className="border-gray-200" />
              <div>
                <SectionTitle>مواعيد الرحلة</SectionTitle>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FieldCol label="تاريخ البداية:" value={fmtDate(trip.start_date ?? trip.trip_date)} />
                  <FieldCol label="تاريخ النهاية:" value={fmtDate(trip.end_date)} />
                </div>
                <div className="mt-4">
                  <p className="text-gray-400 text-xs mb-2 text-right">أيام التشغيل:</p>
                  <div className="flex flex-wrap gap-1.5 justify-end">
                    {operatingDays.length ? operatingDays.map((day, i) => (
                      <span key={i} className="border border-gray-200 text-gray-600 text-[10px] px-3 py-1 rounded-md bg-white shadow-sm">{day}</span>
                    )) : <span className="text-gray-400 text-xs">—</span>}
                  </div>
                </div>
              </div>
              <hr className="border-gray-200" />
              <div>
                <SectionTitle>أوقات الرحلة</SectionTitle>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FieldCol label="وقت الانطلاق:" value={fmtTime(trip.departure_time ?? trip.start_time)} />
                  <FieldCol label="وقت العودة:" value={fmtTime(trip.return_time ?? trip.end_time)} />
                </div>
              </div>
              <hr className="border-gray-200" />
              <div>
                <div className="flex justify-between items-center gap-3 mb-3 flex-wrap">
                  <SectionTitle>الركاب</SectionTitle>
                  {canEdit && (
                  <button
                    type="button"
                    onClick={() => setShowPassengerModal(true)}
                    className="inline-flex items-center gap-1.5 bg-[#4a4746] text-white text-[11px] font-bold px-3.5 py-2 rounded-xl hover:bg-[#383534] transition-colors"
                  >
                    <UserPlus className="w-3.5 h-3.5" /> إضافة راكب
                  </button>
                  )}
                </div>
                {passengers.length === 0 ? (
                  <p className="text-center text-gray-400 text-xs py-6 bg-white rounded-xl border border-gray-100">
                    لا يوجد ركاب مسجّلون لهذه الرحلة
                  </p>
                ) : (
                  <div className="space-y-2">
                    {enrichedPassengers.map((p, index) => (
                      <div
                        key={p.passengerId ?? p.resolvedCustomerId ?? `${p.name}-${index}`}
                        className="bg-white border border-gray-100 rounded-xl px-4 py-3 flex items-center justify-between gap-3 flex-wrap"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Users className="w-4 h-4 text-[#c9a84c] shrink-0" />
                          <div className="text-right min-w-0">
                            <p className="text-sm font-semibold text-gray-800 truncate">
                              {p.name}
                              {p.isMain && (
                                <span className="mr-2 text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-md">
                                  راكب رئيسي
                                </span>
                              )}
                            </p>
                            <p className="text-[11px] text-gray-400" dir="ltr">{p.phone}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          {p.resolvedCustomerId && (
                            <button
                              type="button"
                              onClick={() => {
                                setPassengerProfileId(p.resolvedCustomerId);
                                setShowCustomerProfile(true);
                              }}
                              className="text-[11px] text-[#c9a84c] font-semibold hover:underline"
                            >
                              عرض الملف الشخصي
                            </button>
                          )}
                          {canEdit && p.resolvedCustomerId && !p.isMain && (
                            <button
                              type="button"
                              onClick={() => setDeletePassenger(p)}
                              className="inline-flex items-center gap-1 text-[11px] text-red-500 font-semibold hover:text-red-600"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> حذف
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="bg-[#eef6ff] border border-blue-100 rounded-xl p-5 text-center">
                  <span className="text-blue-500 text-xs font-bold block mb-1">نوع الرحلة</span>
                  <p className="text-blue-700 font-bold text-sm">{trip.route_direction ?? trip.route_type ?? "ذهاب وعودة"}</p>
                </div>
                <div className="bg-[#ecfdf5] border border-green-100 rounded-xl p-5 text-center">
                  <span className="text-green-500 text-xs font-bold block mb-1">نوع الاشتراك</span>
                  <p className="text-green-700 font-bold text-sm">{trip.subscription_type ?? trip.trip_type ?? "—"}</p>
                </div>
              </div>
            </div>
          )}

          {/* ── Financial tab ── */}
          {activeTab === "financial" && (
            <div className="space-y-5">
              <div className="flex justify-between items-center flex-wrap gap-3">
                <h3 className="font-bold text-gray-800 text-sm flex items-center gap-1">
                  <span className="text-[#c9a84c] text-lg leading-none">$</span>
                  التفاصيل المالية
                </h3>
                <div className="flex gap-2">
                  {canEdit && (
                  <button type="button" onClick={() => setShowRefund(true)}
                    className="inline-flex items-center gap-1.5 bg-white border border-gray-200 text-gray-600 text-[11px] font-bold px-3.5 py-2 rounded-xl hover:bg-gray-50 transition-colors">
                    <RefreshCw className="w-3.5 h-3.5" /> معالجة إسترداد
                  </button>
                  )}
                  {canAddPayment && (
                  <button type="button" onClick={() => setShowPayment(true)}
                    className="inline-flex items-center gap-1.5 bg-[#4a4746] text-white text-[11px] font-bold px-3.5 py-2 rounded-xl hover:bg-[#383534] transition-colors">
                    <Plus className="w-3.5 h-3.5" /> اضافة دفعة
                  </button>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-[#eef4ff] border border-blue-100 rounded-2xl py-5 px-4 text-center">
                  <span className="text-blue-500 text-[11px] font-bold block mb-1.5">إجمالي سعر الرحلة</span>
                  <span className="text-blue-600 text-2xl font-bold">{fmtMoney(total)}</span>
                  <span className="text-blue-400 text-xs mr-1">ريال</span>
                </div>
                <div className="bg-[#ecfdf5] border border-green-100 rounded-2xl py-5 px-4 text-center">
                  <span className="text-green-500 text-[11px] font-bold block mb-1.5">المبلغ المدفوع</span>
                  <span className="text-green-600 text-2xl font-bold">{fmtMoney(paid)}</span>
                  <span className="text-green-400 text-xs mr-1">ريال</span>
                </div>
                <div className="bg-[#fef2f2] border border-red-100 rounded-2xl py-5 px-4 text-center">
                  <span className="text-red-500 text-[11px] font-bold block mb-1.5">الرصيد المستحق</span>
                  <span className="text-red-600 text-2xl font-bold">{fmtMoney(remaining)}</span>
                  <span className="text-red-400 text-xs mr-1">ريال</span>
                </div>
              </div>
              {ourCommission !== 0 && (
                <div className="bg-[#fffcf5] border border-amber-100 rounded-2xl py-4 px-5 text-center">
                  <span className="text-amber-600 text-[11px] font-bold block mb-1">عمولتنا</span>
                  <span className="text-amber-700 text-xl font-bold">{fmtMoney(ourCommission)}</span>
                  <span className="text-amber-500 text-xs mr-1">ريال</span>
                </div>
              )}
              {resolveMediaUrl(trip.transfer_image) && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setProofImageUrl(resolveMediaUrl(trip.transfer_image))}
                    className="inline-flex items-center gap-1.5 bg-white border border-gray-200 text-gray-600 text-[11px] font-bold px-4 py-2 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    <ImageIcon className="w-4 h-4" /> عرض إثبات التحويل
                  </button>
                </div>
              )}
              <div className="space-y-4">
                {payments.length === 0 ? (
                  <p className="text-center text-gray-400 text-sm py-8">لا توجد دفعات مسجلة</p>
                ) : payments.map((p) => (
                  <PaymentCard key={p.id} payment={p} onShowProof={setProofImageUrl} />
                ))}
              </div>
            </div>
          )}

          {/* ── Notes tab ── */}
          {activeTab === "notes" && (
            <div>
              <div className="flex justify-between items-center flex-wrap gap-3 mb-5">
                <h3 className="font-bold text-gray-800 text-sm">الملاحظات الإدارية</h3>
                {canEdit && (
                <button type="button" onClick={() => setShowAddNote(true)}
                  className="flex items-center gap-1.5 bg-white border border-gray-200 text-gray-600 text-[11px] font-bold px-4 py-2 rounded-full hover:bg-gray-50 shadow-sm">
                  <Plus className="w-3.5 h-3.5" /> اضافة ملاحظة
                </button>
                )}
              </div>
              <div className="space-y-3">
                {noteList.length === 0 ? (
                  <p className="text-center text-gray-400 text-xs py-8">لا توجد ملاحظات حتى الآن</p>
                ) : noteList.map((note) => (
                  <div key={note.id} className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm text-right">
                    <p className="text-gray-800 font-bold text-sm mb-3 leading-relaxed">{note.content ?? note.text}</p>
                    <p className="text-gray-400 text-[11px] text-left" dir="ltr">
                      {note.created_at ?? note.date} · <span className="text-gray-500">{note.author ?? note.created_by}</span>
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* بطاقات السائق والعميل */}
      {activeTab === "trip" && (
        <div className={`grid grid-cols-1 gap-4 ${showCustomerCard ? "md:grid-cols-2" : ""}`}>
          <PersonCard
            title="معلومات السائق"
            name={tripHasDriver ? (dName ?? "—") : null}
            phone={trip.driver?.phone}
            emptyMessage={!tripHasDriver ? "لا يوجد سائق مسند لهذه الرحلة" : null}
            profileDisabled={!driverId}
            onProfile={() => driverId && setShowDriverProfile(true)}
            primaryAction={!tripHasDriver && canAssign ? (
              <button
                type="button"
                onClick={() => setShowAssignDriver(true)}
                className="w-full inline-flex items-center justify-center gap-1.5 bg-[#c9a84c] text-white rounded-xl py-2 text-xs font-semibold hover:bg-[#b8953f] transition-colors"
              >
                <UserCheck className="w-3.5 h-3.5" /> إسناد سائق
              </button>
            ) : null}
          />
          {showCustomerCard && (
            <TripCustomerCard
              customerId={tripCustomerId}
              onOpenProfile={() => {
                setPassengerProfileId(null);
                setShowCustomerProfile(true);
              }}
            />
          )}
        </div>
      )}

      {/* Modals — props موحّدة: isOpen | onClose | onSuccess */}
      <TripNoteModal isOpen={showAddNote} onClose={() => setShowAddNote(false)} onSave={handleAddNote} />
      <TripRefundModal
        isOpen={showRefund}
        onClose={() => setShowRefund(false)}
        tripId={tripId}
        driverId={trip.driver?.id ?? trip.driver_id}
        amountPaid={paid}
        onSuccess={() => fetchTrip({ silent: true })}
      />
      <TripChangeStatusModal
        isOpen={showStatus}
        onClose={() => setShowStatus(false)}
        trip={trip}
        onSuccess={(updated) => {
          const next = updated?.trip ?? updated;
          if (next) applyTripUpdate(next);
          else fetchTrip({ silent: true });
        }}
      />
      <AddPaymentModal isOpen={showPayment} onClose={() => setShowPayment(false)} tripId={tripId} onSuccess={handlePaymentSuccess} />
      <EditOfferedTripModal
        isOpen={showEdit}
        onClose={() => setShowEdit(false)}
        trip={trip}
        onSuccess={(result) => {
          const updated = result?.trip ?? result;
          if (updated) applyTripUpdate(updated);
          else fetchTrip({ silent: true });
        }}
      />

      <CustomerProfileModal
        isOpen={showCustomerProfile}
        onClose={() => {
          setShowCustomerProfile(false);
          setPassengerProfileId(null);
        }}
        customerId={passengerProfileId ?? tripCustomerId}
      />
      <DriverProfileModal
        isOpen={showDriverProfile}
        onClose={() => setShowDriverProfile(false)}
        driverId={driverId}
      />
      <TripPassengerModal
        isOpen={showPassengerModal}
        onClose={() => setShowPassengerModal(false)}
        tripId={tripId}
        defaultDays={operationDayIds}
        onSuccess={() => fetchTrip({ silent: true })}
      />
      <AssignTripModal
        isOpen={showAssignDriver}
        onClose={() => setShowAssignDriver(false)}
        tripId={tripId}
        onSuccess={() => fetchTrip({ silent: true })}
      />
      <ConfirmModal
        isOpen={!!deletePassenger}
        onClose={() => !deletePassengerLoading && setDeletePassenger(null)}
        onConfirm={handleDeletePassenger}
        title="طلب حذف راكب"
        message={`هل تريد إرسال طلب حذف «${deletePassenger?.name ?? "الراكب"}» لمركز الموافقات؟ لن يُحذف الراكب إلا بعد الموافقة.`}
        confirmLabel="إرسال الطلب"
        isSubmitting={deletePassengerLoading}
      />
      <ImageProofModal
        isOpen={!!proofImageUrl}
        onClose={() => setProofImageUrl(null)}
        imageUrl={resolveMediaUrl(proofImageUrl)}
      />
    </div>
  );
}
