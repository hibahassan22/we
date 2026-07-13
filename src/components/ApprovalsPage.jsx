import { useState, useEffect, useCallback } from "react";
import { useGlobalSearch } from "../hooks/useGlobalSearch";
import { usePermissions } from "../hooks/usePermissions.js";
import { PERMISSIONS } from "../lib/permissions.js";
import { fetchAllRefunds } from "../services/refundService";
import {
  fetchPaymentRequests,
  approvePaymentRequest,
  rejectPaymentRequest,
} from "../services/paymentRequestService";
import {
  fetchPassengerRequests,
  passengerRequestAction,
} from "../services/tripService.js";
import RefundHandleModal from "./approvals/RefundHandleModal";

const BASE = "https://drivo1.elmoroj.com/api";

const STATUS_MAP = {
  pending: { label: "معلق", color: "bg-amber-100 text-amber-600" },
  approved: { label: "موافق", color: "bg-green-100 text-green-600" },
  rejected: { label: "مرفوض", color: "bg-red-100 text-red-500" },
  معلق: { label: "معلق", color: "bg-amber-100 text-amber-600" },
  موافق: { label: "موافق", color: "bg-green-100 text-green-600" },
  مرفوض: { label: "مرفوض", color: "bg-red-100 text-red-500" },
};

const FIELD_LABELS = {
  driver_id: "السائق",
  driver: "السائق",
  driver_name: "السائق",
  from: "من",
  to: "إلى",
  city: "المدينة",
  city_id: "المدينة",
  price: "سعر الرحلة",
  trip_price: "سعر الرحلة",
  amount: "المبلغ",
  date_from: "تاريخ البداية",
  date_to: "تاريخ النهاية",
  time_from: "وقت المغادرة",
  time_to: "وقت الوصول",
  departure_time: "وقت المغادرة",
  arrival_time: "وقت الوصول",
  trip_type: "نوع الرحلة",
  subscription_type: "نوع الاشتراك",
  commission: "العمولة",
  remaining: "المتبقي",
  customer_name: "اسم العميل",
  customer_phone: "هاتف العميل",
  phone: "رقم الهاتف",
  status: "حالة الرحلة",
  notes: "ملاحظات",
  description: "الوصف",
};

const typeOptions = ["الكل", "تعديل رحلة", "طلبات الدفعات", "طلبات الركاب", "مرتجعات"];

const isPendingRequest = (req) => req.status === "معلق" || String(req.raw?.status ?? "").toLowerCase() === "pending";

function parseOperationDays(raw) {
  if (raw == null || raw === "") return "";
  if (Array.isArray(raw)) return raw.join("، ");
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (trimmed.startsWith("[")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) return parsed.join("، ");
      } catch {
        /* keep raw string */
      }
    }
    return trimmed;
  }
  return String(raw);
}

const typeConfig = {
  "تعديل رحلة": {
    bg: "bg-purple-50",
    icon: "text-purple-500",
    d: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z",
  },
  "طلبات الدفعات": {
    bg: "bg-blue-50",
    icon: "text-blue-500",
    d: "M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z",
  },
  "طلبات الركاب": {
    bg: "bg-teal-50",
    icon: "text-teal-600",
    d: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z",
  },
  مرتجعات: {
    bg: "bg-orange-50",
    icon: "text-orange-500",
    d: "M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z",
  },
};

function fmtMoney(v) {
  if (v == null || v === "") return "—";
  const n = Number(v);
  return Number.isFinite(n) ? n.toLocaleString("ar-SA") : String(v);
}

function fmtVal(val) {
  if (val === null || val === undefined || val === "") return "—";
  if (typeof val === "object") return JSON.stringify(val);
  return String(val);
}

function normalizeStatus(raw) {
  const key = String(raw ?? "pending").toLowerCase();
  return STATUS_MAP[key] || STATUS_MAP[raw] || STATUS_MAP.pending;
}

function buildChanges(item) {
  if (Array.isArray(item.changes) && item.changes.length) {
    return item.changes.map((ch) => ({
      label: ch.label || ch.field || ch.key || "حقل",
      from: fmtVal(ch.from ?? ch.old ?? ch.old_value),
      to: fmtVal(ch.to ?? ch.new ?? ch.new_value),
    }));
  }

  const oldVals = item.old_values ?? item.old_data ?? item.before ?? item.original ?? {};
  const newVals = item.new_values ?? item.new_data ?? item.after ?? item.requested ?? item.changes_data ?? {};

  if (typeof oldVals === "object" && typeof newVals === "object" && !Array.isArray(oldVals)) {
    const keys = [...new Set([...Object.keys(oldVals), ...Object.keys(newVals)])];
    return keys
      .filter((k) => fmtVal(oldVals[k]) !== fmtVal(newVals[k]))
      .map((k) => ({
        label: FIELD_LABELS[k] || k,
        from: fmtVal(oldVals[k]),
        to: fmtVal(newVals[k]),
      }));
  }

  if (item.change_summary) {
    return [{ label: "ملخص التعديل", from: "—", to: fmtVal(item.change_summary) }];
  }

  return [];
}

function normalizeRequest(item) {
  const statusInfo = normalizeStatus(item.status ?? item.request_status);
  const trip = item.trip ?? {};
  const created = item.created_at ?? item.date ?? "";

  let date = "";
  let time = "";
  if (created) {
    const d = new Date(created);
    if (!Number.isNaN(d.getTime())) {
      date = d.toLocaleDateString("ar-EG");
      time = d.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
    } else {
      date = String(created);
    }
  }

  return {
    id: item.id,
    type: "تعديل رحلة",
    status: statusInfo.label,
    statusColor: statusInfo.color,
    tripId: item.trip_id ?? trip.id ?? item.tripId,
    from: item.from ?? trip.from ?? trip.pickup_location ?? trip.origin ?? "",
    to: item.to ?? trip.to ?? trip.dropoff_location ?? trip.destination ?? "",
    submittedBy: item.submitted_by ?? item.requested_by ?? item.user_name ?? item.user?.name ?? "—",
    submittedFrom: item.submitted_from ?? item.requested_from ?? item.user_role ?? item.source ?? "—",
    date,
    time,
    changes: buildChanges(item),
    raw: item,
  };
}

function normalizeRefundStatus(raw) {
  const s = String(raw ?? "بانتظار");
  if (s === "بانتظار" || s === "pending" || s === "معلق") return normalizeStatus("معلق");
  if (s === "تم القبول" || s.includes("قبول")) return normalizeStatus("موافق");
  if (s === "تم الرفض" || s.includes("رفض")) return normalizeStatus("مرفوض");
  return normalizeStatus(raw);
}

function normalizeRefund(item) {
  const statusInfo = normalizeRefundStatus(item.status);
  const created = item.date ?? item.created_at ?? "";

  let date = "";
  let time = "";
  if (created) {
    const d = new Date(String(created).replace(" ", "T"));
    if (!Number.isNaN(d.getTime())) {
      date = d.toLocaleDateString("ar-EG");
      time = d.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
    } else {
      date = String(created);
    }
  }

  return {
    id: item.id,
    type: "مرتجعات",
    status: statusInfo.label,
    statusColor: statusInfo.color,
    tripId: item.tripId ?? item.tripNumber,
    from: item.from ?? "",
    to: item.to ?? "",
    driverName: item.driverName ?? "—",
    driverNumber: item.driverNumber ?? "",
    proposedAmount: item.proposedAmount,
    reason: item.reason ?? "",
    amountPaid: item.amountPaid,
    totalPrice: item.totalPrice,
    sales: item.sales ?? [],
    date,
    time,
    raw: item,
  };
}

function normalizePaymentRequest(item) {
  const statusInfo = normalizeStatus(item.status);
  const created = item.created_at ?? "";

  let date = "";
  let time = "";
  if (created) {
    const d = new Date(String(created).replace(" ", "T"));
    if (!Number.isNaN(d.getTime())) {
      date = d.toLocaleDateString("ar-EG");
      time = d.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
    } else {
      date = String(created);
    }
  }

  return {
    id: item.id,
    type: "طلبات الدفعات",
    status: statusInfo.label,
    statusColor: statusInfo.color,
    tripId: item.trip_id,
    driverName: item.driver_id ?? "—",
    paidAmount: item.paid_amount,
    fromAccount: item.from_account,
    toAccount: item.to_account,
    transferMethod: item.transfer_method,
    transferImage: item.transfer_image,
    paymentDate: item.payment_date,
    notes: item.notes ?? "",
    date,
    time,
    raw: item,
  };
}

function normalizePassengerRequest(item) {
  const statusInfo = normalizeStatus(item.status ?? item.request_status);
  const created = item.created_at ?? item.date ?? "";
  const actionRaw = String(item.request_type ?? item.action ?? item.type ?? item.operation ?? "add").toLowerCase();
  const isDelete = actionRaw.includes("delete") || actionRaw.includes("حذف") || actionRaw === "remove";

  let date = "";
  let time = "";
  if (created) {
    const d = new Date(String(created).replace(" ", "T"));
    if (!Number.isNaN(d.getTime())) {
      date = d.toLocaleDateString("ar-EG");
      time = d.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
    } else {
      date = String(created);
    }
  }

  const operationDays = parseOperationDays(item.operation_days);

  return {
    id: item.id ?? item.request_id,
    type: "طلبات الركاب",
    status: statusInfo.label,
    statusColor: statusInfo.color,
    tripId: item.trip_id ?? item.trip?.id,
    customerId: item.customer_id ?? item.customer?.id,
    passengerName: item.full_name ?? item.customer_name ?? item.customer?.name ?? "—",
    passengerPhone: item.phone ?? item.customer_phone ?? item.customer?.phone ?? "",
    requestKind: isDelete ? "حذف راكب" : "إضافة راكب",
    nationality: item.nationality,
    gender: item.gender,
    operationDays,
    departureTime: item.departure_time,
    returnTime: item.return_time,
    startLat: item.start_lat,
    startLng: item.start_lng,
    endLat: item.end_lat,
    endLng: item.end_lng,
    notes: item.notes ?? "",
    submittedBy: item.submitted_by ?? item.requested_by ?? item.user_name ?? "—",
    date,
    time,
    raw: item,
  };
}

function parseList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.requests)) return data.requests;
  if (Array.isArray(data?.trip_edit_requests)) return data.trip_edit_requests;
  return [];
}

export default function ApprovalsPage() {
  const { can } = usePermissions();
  const canApprove = can(PERMISSIONS.APPROVALS_EDIT) || can(PERMISSIONS.APPROVALS_READ);
  const [requests, setRequests] = useState([]);
  const [paymentRequests, setPaymentRequests] = useState([]);
  const [passengerRequests, setPassengerRequests] = useState([]);
  const [refunds, setRefunds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [typeFilter, setTypeFilter] = useState("الكل");
  const { searchQuery, setSearchQuery } = useGlobalSearch();
  const [actionLoading, setActionLoading] = useState(null);
  const [refundModal, setRefundModal] = useState(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [editRes, paymentsData, passengerData, refundsData] = await Promise.all([
        fetch(`${BASE}/trip-edit-requeststest`, { headers: { Accept: "application/json" } })
          .then(async (r) => (r.ok ? r.json() : null))
          .catch(() => null),
        fetchPaymentRequests({ status: "pending" }).catch((e) => {
          console.warn("fetchPaymentRequests:", e);
          return [];
        }),
        fetchPassengerRequests("pending").catch((e) => {
          console.warn("fetchPassengerRequests:", e);
          return [];
        }),
        fetchAllRefunds().catch((e) => {
          console.warn("fetchAllRefunds:", e);
          return [];
        }),
      ]);
      setRequests(editRes ? parseList(editRes).map(normalizeRequest).filter(isPendingRequest) : []);
      setPaymentRequests(paymentsData.map(normalizePaymentRequest).filter(isPendingRequest));
      setPassengerRequests(passengerData.map(normalizePassengerRequest).filter(isPendingRequest));
      setRefunds(refundsData.map(normalizeRefund).filter(isPendingRequest));
      if (!editRes && !paymentsData.length && !passengerData.length && !refundsData.length) {
        setError("تعذر تحميل الطلبات. يرجى التحقق من اتصال الشبكة.");
      }
    } catch (err) {
      console.error("fetchAll error:", err);
      setError("حدث خطأ أثناء تحميل الطلبات. يرجى التحقق من اتصال الشبكة.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleApprove = async (id) => {
    setActionLoading(id);
    try {
      const r = await fetch(`${BASE}/trip-edit-approve/${id}`, {
        method: "POST",
        headers: { Accept: "application/json" },
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      await r.json();
      fetchAll();
    } catch (err) {
      console.error("handleApprove error:", err);
      alert("حدث خطأ أثناء الموافقة على الطلب");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id) => {
    setActionLoading(id);
    try {
      const r = await fetch(`${BASE}/trip-edit-reject/${id}`, {
        method: "POST",
        headers: { Accept: "application/json" },
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      await r.json();
      fetchAll();
    } catch (err) {
      console.error("handleReject error:", err);
      alert("حدث خطأ أثناء رفض الطلب");
    } finally {
      setActionLoading(null);
    }
  };

  const handleApprovePayment = async (id) => {
    const key = `payment-${id}`;
    setActionLoading(key);
    try {
      await approvePaymentRequest(id);
      fetchAll();
    } catch (err) {
      console.error("handleApprovePayment error:", err);
      alert(err.message || "حدث خطأ أثناء الموافقة على طلب الدفعة");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectPayment = async (id) => {
    const key = `payment-${id}`;
    setActionLoading(key);
    try {
      await rejectPaymentRequest(id);
      fetchAll();
    } catch (err) {
      console.error("handleRejectPayment error:", err);
      alert(err.message || "حدث خطأ أثناء رفض طلب الدفعة");
    } finally {
      setActionLoading(null);
    }
  };

  const handleApprovePassenger = async (id) => {
    const key = `passenger-${id}`;
    setActionLoading(key);
    try {
      await passengerRequestAction(id, "approved");
      fetchAll();
    } catch (err) {
      console.error("handleApprovePassenger error:", err);
      alert(err.message || "حدث خطأ أثناء الموافقة على طلب الراكب");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectPassenger = async (id) => {
    const key = `passenger-${id}`;
    setActionLoading(key);
    try {
      await passengerRequestAction(id, "rejected");
      fetchAll();
    } catch (err) {
      console.error("handleRejectPassenger error:", err);
      alert(err.message || "حدث خطأ أثناء رفض طلب الراكب");
    } finally {
      setActionLoading(null);
    }
  };

  const allItems = [...requests, ...paymentRequests, ...passengerRequests, ...refunds];

  const filtered = allItems.filter((r) => {
    const matchType = typeFilter === "الكل" || r.type === typeFilter;
    const q = searchQuery.trim();
    const matchSearch =
      q === "" ||
      String(r.submittedBy ?? "").includes(q) ||
      String(r.driverName ?? "").includes(q) ||
      String(r.paidAmount ?? "").includes(q) ||
      String(r.notes ?? "").includes(q) ||
      String(r.id).includes(q) ||
      String(r.tripId ?? "").includes(q) ||
      String(r.passengerName ?? "").includes(q) ||
      String(r.requestKind ?? "").includes(q);
    return matchType && matchSearch;
  });

  const renderEditRequest = (req) => {
    const config = typeConfig["تعديل رحلة"];
    return (
      <div key={`edit-${req.id}`} className="border border-gray-100 rounded-xl p-4 space-y-3 hover:bg-gray-50/40 transition-colors">
        <div className="flex items-center justify-end gap-2">
          <span className="text-xs text-gray-400 font-mono">{req.id}#</span>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${req.statusColor}`}>{req.status}</span>
          <span className="text-sm font-semibold text-gray-700">{req.type}</span>
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${config.bg}`}>
            <svg className={`w-4 h-4 ${config.icon}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={config.d} />
            </svg>
          </div>
        </div>

        <div className="text-right">
          {req.tripId && (
            <p className="text-sm font-bold text-gray-800">
              #{req.tripId}
              {(req.from || req.to) && (
                <>
                  {" "}
                  {req.from}
                  {req.from && req.to && <span className="text-gray-400 mx-1">→</span>}
                  {req.to}
                </>
              )}
            </p>
          )}
          <div className="flex items-center justify-end gap-2 mt-1 text-xs text-gray-400 flex-wrap">
            <span>مقدم من: {req.submittedFrom} ({req.submittedBy})</span>
            {(req.date || req.time) && (
              <>
                <span className="text-gray-300">•</span>
                <span>{req.date}{req.time && ` • ${req.time}`}</span>
              </>
            )}
          </div>
        </div>

        <div className="bg-gray-50 rounded-xl p-3 space-y-1.5">
          <p className="text-xs font-semibold text-gray-500 text-right mb-2">التغييرات المطلوبة</p>
          {req.changes.length > 0 ? (
            req.changes.map((ch, ci) => (
              <div key={ci} className="flex items-center justify-end gap-2 text-xs">
                <span className="text-green-600 font-medium">{ch.to}</span>
                <span className="text-gray-300">←</span>
                <span className="text-red-400 line-through">{ch.from}</span>
                <span className="text-gray-500 font-medium">{ch.label}:</span>
              </div>
            ))
          ) : (
            <p className="text-xs text-gray-400 text-right">لا توجد تفاصيل تغيير متاحة</p>
          )}
        </div>

        {req.status === "معلق" && canApprove && (
          <div className="grid grid-cols-2 gap-3 pt-1">
            <button
              disabled={actionLoading === req.id}
              onClick={() => handleReject(req.id)}
              className="flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium py-2.5 rounded-xl transition-colors disabled:opacity-50"
            >
              {actionLoading === req.id ? "جارٍ الرفض..." : "رفض الطلب"}
            </button>
            <button
              disabled={actionLoading === req.id}
              onClick={() => handleApprove(req.id)}
              className="flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white text-sm font-medium py-2.5 rounded-xl transition-colors disabled:opacity-50"
            >
              {actionLoading === req.id ? "جارٍ الموافقة..." : "الموافقة على الطلب"}
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderPaymentRequest = (req) => {
    const config = typeConfig["طلبات الدفعات"];
    const loadingKey = `payment-${req.id}`;
    const isLoading = actionLoading === loadingKey;

    return (
      <div key={`payment-${req.id}`} className="border border-gray-100 rounded-xl p-4 space-y-3 hover:bg-gray-50/40 transition-colors">
        <div className="flex items-center justify-end gap-2">
          <span className="text-xs text-gray-400 font-mono">{req.id}#</span>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${req.statusColor}`}>{req.status}</span>
          <span className="text-sm font-semibold text-gray-700">طلب دفعة جديدة</span>
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${config.bg}`}>
            <svg className={`w-4 h-4 ${config.icon}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={config.d} />
            </svg>
          </div>
        </div>

        <div className="text-right">
          <p className="text-sm font-bold text-gray-800">رحلة #{req.tripId}</p>
          <div className="flex items-center justify-end gap-2 mt-1 text-xs text-gray-400 flex-wrap">
            <span>السائق: {req.driverName}</span>
            {(req.date || req.time) && (
              <>
                <span className="text-gray-300">•</span>
                <span>{req.date}{req.time && ` • ${req.time}`}</span>
              </>
            )}
          </div>
        </div>

        <div className="bg-gray-50 rounded-xl p-3 space-y-1.5 text-xs text-right">
          <div className="flex justify-between gap-2">
            <span className="text-gray-800 font-semibold">{fmtMoney(req.paidAmount)} ر.س</span>
            <span className="text-gray-500">المبلغ المدفوع</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-gray-800">{req.transferMethod || "—"}</span>
            <span className="text-gray-500">طريقة التحويل</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-gray-800 font-mono">{req.fromAccount || "—"}</span>
            <span className="text-gray-500">من حساب</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-gray-800 font-mono">{req.toAccount || "—"}</span>
            <span className="text-gray-500">إلى حساب</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-gray-800">{req.paymentDate || "—"}</span>
            <span className="text-gray-500">تاريخ الدفع</span>
          </div>
          {req.notes && (
            <div className="pt-2 border-t border-gray-200">
              <p className="text-gray-500 mb-1">ملاحظات</p>
              <p className="text-gray-700 leading-relaxed">{req.notes}</p>
            </div>
          )}
          {req.transferImage && (
            <div className="pt-2 border-t border-gray-200">
              <p className="text-gray-500 mb-2">صورة إثبات التحويل</p>
              <a
                href={req.transferImage}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block"
              >
                <img
                  src={req.transferImage}
                  alt="إثبات التحويل"
                  className="max-h-32 rounded-lg border border-gray-200 object-contain"
                />
              </a>
            </div>
          )}
        </div>

        {req.status === "معلق" && canApprove && (
          <div className="grid grid-cols-2 gap-3 pt-1">
            <button
              disabled={isLoading}
              onClick={() => handleRejectPayment(req.id)}
              className="flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium py-2.5 rounded-xl transition-colors disabled:opacity-50"
            >
              {isLoading ? "جارٍ الرفض..." : "رفض الطلب"}
            </button>
            <button
              disabled={isLoading}
              onClick={() => handleApprovePayment(req.id)}
              className="flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white text-sm font-medium py-2.5 rounded-xl transition-colors disabled:opacity-50"
            >
              {isLoading ? "جارٍ الموافقة..." : "الموافقة على الطلب"}
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderPassengerRequest = (req) => {
    const config = typeConfig["طلبات الركاب"];
    const actionKey = `passenger-${req.id}`;
    const coords =
      req.startLat != null && req.startLng != null
        ? `${req.startLat}, ${req.startLng}`
        : null;
    const endCoords =
      req.endLat != null && req.endLng != null
        ? `${req.endLat}, ${req.endLng}`
        : null;

    return (
      <div key={`passenger-${req.id}`} className="border border-gray-100 rounded-xl p-4 space-y-3 hover:bg-gray-50/40 transition-colors">
        <div className="flex items-center justify-end gap-2">
          <span className="text-xs text-gray-400 font-mono">{req.id}#</span>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${req.statusColor}`}>{req.status}</span>
          <span className="text-sm font-semibold text-gray-700">{req.requestKind}</span>
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${config.bg}`}>
            <svg className={`w-4 h-4 ${config.icon}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={config.d} />
            </svg>
          </div>
        </div>

        <div className="text-right">
          <p className="text-sm font-bold text-gray-800">
            رحلة #{req.tripId} — {req.passengerName}
          </p>
          <div className="flex items-center justify-end gap-2 mt-1 text-xs text-gray-400 flex-wrap">
            {req.passengerPhone && <span dir="ltr">{req.passengerPhone}</span>}
            {(req.date || req.time) && (
              <>
                {req.passengerPhone && <span className="text-gray-300">•</span>}
                <span>{req.date}{req.time && ` • ${req.time}`}</span>
              </>
            )}
          </div>
        </div>

        <div className="bg-gray-50 rounded-xl p-3 space-y-1.5 text-xs text-right">
          {req.nationality && (
            <div className="flex justify-between gap-2"><span className="text-gray-800">{req.nationality}</span><span className="text-gray-500">الجنسية</span></div>
          )}
          {req.gender && (
            <div className="flex justify-between gap-2"><span className="text-gray-800">{req.gender}</span><span className="text-gray-500">الجنس</span></div>
          )}
          {req.operationDays && (
            <div className="flex justify-between gap-2"><span className="text-gray-800">{req.operationDays}</span><span className="text-gray-500">أيام التشغيل</span></div>
          )}
          {(req.departureTime || req.returnTime) && (
            <div className="flex justify-between gap-2">
              <span className="text-gray-800" dir="ltr">{req.departureTime ?? "—"} → {req.returnTime ?? "—"}</span>
              <span className="text-gray-500">الأوقات</span>
            </div>
          )}
          {coords && (
            <div className="flex justify-between gap-2"><span className="text-gray-800" dir="ltr">{coords}</span><span className="text-gray-500">انطلاق</span></div>
          )}
          {endCoords && (
            <div className="flex justify-between gap-2"><span className="text-gray-800" dir="ltr">{endCoords}</span><span className="text-gray-500">وصول</span></div>
          )}
          {req.notes && (
            <div className="pt-2 border-t border-gray-200">
              <p className="text-gray-500 mb-1">ملاحظات</p>
              <p className="text-gray-700 leading-relaxed">{req.notes}</p>
            </div>
          )}
        </div>

        {req.status === "معلق" && canApprove && (
          <div className="grid grid-cols-2 gap-3 pt-1">
            <button
              type="button"
              disabled={actionLoading === actionKey}
              onClick={() => handleRejectPassenger(req.id)}
              className="flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium py-2.5 rounded-xl transition-colors disabled:opacity-50"
            >
              {actionLoading === actionKey ? "جارٍ الرفض..." : "رفض الطلب"}
            </button>
            <button
              type="button"
              disabled={actionLoading === actionKey}
              onClick={() => handleApprovePassenger(req.id)}
              className="flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white text-sm font-medium py-2.5 rounded-xl transition-colors disabled:opacity-50"
            >
              {actionLoading === actionKey ? "جارٍ الموافقة..." : "الموافقة على الطلب"}
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderRefund = (req) => {
    const config = typeConfig.مرتجعات;
    const salesNames = (req.sales ?? []).map((s) => s.name).filter(Boolean).join("، ");
    return (
      <div key={`refund-${req.id}`} className="border border-gray-100 rounded-xl p-4 space-y-3 hover:bg-gray-50/40 transition-colors">
        <div className="flex items-center justify-end gap-2">
          <span className="text-xs text-gray-400 font-mono">{req.id}#</span>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${req.statusColor}`}>{req.status}</span>
          <span className="text-sm font-semibold text-gray-700">طلب استرداد</span>
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${config.bg}`}>
            <svg className={`w-4 h-4 ${config.icon}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={config.d} />
            </svg>
          </div>
        </div>

        <div className="text-right">
          <p className="text-sm font-bold text-gray-800">
            رحلة #{req.tripId}
            {(req.from || req.to) && (
              <>
                {" "}
                {req.from}
                {req.from && req.to && <span className="text-gray-400 mx-1">→</span>}
                {req.to}
              </>
            )}
          </p>
          <div className="flex items-center justify-end gap-2 mt-1 text-xs text-gray-400 flex-wrap">
            <span>السائق: {req.driverName} ({req.driverNumber})</span>
            {(req.date || req.time) && (
              <>
                <span className="text-gray-300">•</span>
                <span>{req.date}{req.time && ` • ${req.time}`}</span>
              </>
            )}
          </div>
        </div>

        <div className="bg-gray-50 rounded-xl p-3 space-y-1.5 text-xs text-right">
          <div className="flex justify-between gap-2"><span className="text-gray-800">{fmtMoney(req.proposedAmount)} ر.س</span><span className="text-gray-500">المبلغ المقترح</span></div>
          <div className="flex justify-between gap-2"><span className="text-gray-800">{fmtMoney(req.amountPaid)} ر.س</span><span className="text-gray-500">المبلغ المدفوع</span></div>
          <div className="flex justify-between gap-2"><span className="text-gray-800">{fmtMoney(req.totalPrice)} ر.س</span><span className="text-gray-500">إجمالي الرحلة</span></div>
          {salesNames && <div className="flex justify-between gap-2"><span className="text-gray-800">{salesNames}</span><span className="text-gray-500">المبيعات</span></div>}
          <div className="pt-2 border-t border-gray-200">
            <p className="text-gray-500 mb-1">سبب الاسترداد</p>
            <p className="text-gray-700 leading-relaxed">{req.reason || "—"}</p>
          </div>
        </div>

        {req.status === "معلق" && canApprove && (
          <button
            type="button"
            onClick={() => setRefundModal(req.raw)}
            className="w-full flex items-center justify-center gap-2 bg-[#c9a84c] hover:bg-[#b8973d] text-white text-sm font-medium py-2.5 rounded-xl transition-colors"
          >
            معالجة طلب الاسترداد
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="w-full space-y-5 pb-8" dir="rtl">

      <div className="bg-white rounded-2xl shadow-sm px-5 py-4">
        <h1 className="text-2xl font-semibold text-[#c9a84c] text-right">مركز الموافقات</h1>
        <p className="text-xs text-gray-400 mt-0.5 text-right">
          الطلبات المعلقة فقط — تختفي تلقائياً بعد الموافقة أو الرفض
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-5 space-y-4">

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500 text-right">نوع الطلب</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 text-gray-600 text-right"
            >
              {typeOptions.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500 text-right">بحث</label>
            <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2">
              <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث برقم الطلب أو الرحلة أو اسم الموظف..."
                className="bg-transparent text-sm outline-none w-full placeholder-gray-300 text-right"
                dir="rtl"
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="w-10 h-10 border-4 border-[#c9a84c] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="text-center py-10 space-y-3 bg-[#faf7f0] rounded-xl border border-gray-100">
            <p className="text-sm text-red-500">{error}</p>
            <button onClick={fetchAll} className="px-4 py-2 bg-[#c9a84c] hover:bg-[#b8973d] text-white text-xs font-medium rounded-xl transition-colors">
              إعادة المحاولة
            </button>
          </div>
        ) : (
          <div className="space-y-4 pt-1">
            {filtered.map((req) => {
              if (req.type === "مرتجعات") return renderRefund(req);
              if (req.type === "طلبات الدفعات") return renderPaymentRequest(req);
              if (req.type === "طلبات الركاب") return renderPassengerRequest(req);
              return renderEditRequest(req);
            })}

            {filtered.length === 0 && (
              <p className="text-center text-gray-400 text-sm py-8">لا توجد طلبات</p>
            )}
          </div>
        )}
      </div>

      <RefundHandleModal
        isOpen={!!refundModal}
        onClose={() => setRefundModal(null)}
        refund={refundModal}
        onSuccess={fetchAll}
      />
    </div>
  );
}
