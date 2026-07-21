import { useEffect, useMemo, useState } from "react";
import { exportToExcel } from "../../lib/exportExcel.js";
import { fetchBrokerTrips } from "../../services/brokerService.js";
import { useToast } from "../../lib/toast.jsx";

const PAGE_SIZE = 6;

const STATUS_MAP = {
  completed: { label: "مكتملة", cls: "bg-green-50 text-green-700" },
  تم: { label: "مكتملة", cls: "bg-green-50 text-green-700" },
  active: { label: "نشطة", cls: "bg-amber-50 text-amber-700" },
  in_progress: { label: "قيد التنفيذ", cls: "bg-blue-50 text-blue-700" },
  progress: { label: "قيد التنفيذ", cls: "bg-blue-50 text-blue-700" },
  pending: { label: "معلقة", cls: "bg-gray-100 text-gray-600" },
  offered: { label: "معروضة", cls: "bg-amber-50 text-amber-700" },
  cancelled: { label: "ملغاة", cls: "bg-red-50 text-red-600" },
};

const statusInfo = (s) => STATUS_MAP[s] ?? { label: s || "—", cls: "bg-gray-100 text-gray-600" };

function fmtMoney(n) {
  const num = Number(n) || 0;
  return `${num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س`;
}

function fmtDate(v) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toISOString().slice(0, 10);
}

/** من فوق، اللوكيشن (إلى) تحتها مباشرة — بدون خط زمني */
function RouteCell({ from, to }) {
  return (
    <div className="text-right min-w-[100px] leading-tight">
      <p className="font-medium text-gray-800">{from || "—"}</p>
      <p className="text-xs text-gray-500 mt-0.5">{to || "—"}</p>
    </div>
  );
}

/**
 * BrokerTripsTab — سجل رحلات الوسيط من الـ API (GET /api/brokers/:id/trips)
 */
export default function BrokerTripsTab({ broker }) {
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");
  const [filterOpen, setFilterOpen] = useState(false);
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const brokerId = broker?.id;

  useEffect(() => {
    if (brokerId == null || brokerId === "") return undefined;
    const ctrl = new AbortController();
    setLoading(true);
    setError(null);
    fetchBrokerTrips(brokerId, ctrl.signal)
      .then((list) => setTrips(list))
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message || "فشل تحميل رحلات الوسيط");
      })
      .finally(() => setLoading(false));
    return () => ctrl.abort();
  }, [brokerId]);

  const filtered = useMemo(() => {
    if (statusFilter === "all") return trips;
    return trips.filter((t) => t.status === statusFilter);
  }, [trips, statusFilter]);

  const totals = useMemo(
    () =>
      filtered.reduce(
        (acc, t) => ({
          total_price: acc.total_price + (Number(t.total_price) || 0),
          broker_commission: acc.broker_commission + (Number(t.broker_commission) || 0),
          our_commission: acc.our_commission + (Number(t.our_commission) || 0),
          remaining_amount: acc.remaining_amount + (Number(t.remaining_amount) || 0),
        }),
        { total_price: 0, broker_commission: 0, our_commission: 0, remaining_amount: 0 },
      ),
    [filtered],
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const rangeFrom = filtered.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeTo = Math.min(page * PAGE_SIZE, filtered.length);

  const handleExport = () => {
    const rows = filtered.map((t) => ({
      من: t.from,
      إلى: t.to,
      الحالة: statusInfo(t.status).label,
      "السعر الإجمالي": t.total_price,
      العمولة: t.broker_commission,
      عمولتنا: t.our_commission,
      المتبقي: t.remaining_amount,
      التاريخ: fmtDate(t.date),
    }));
    exportToExcel(rows, `رحلات_الوسيط_${broker?.broker_code || brokerId || "all"}`, "الرحلات");
  };

  const handleWithdraw = (trip) => {
    const amount = Number(trip.broker_commission) || 0;
    if (amount <= 0) {
      toast.error("لا توجد عمولة للسحب");
      return;
    }
    toast.success(`تم تسجيل طلب سحب ${fmtMoney(amount)}`);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2 order-2 sm:order-1">
          <div className="relative">
            <button
              type="button"
              onClick={() => setFilterOpen((v) => !v)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-gray-600 hover:bg-gray-50"
            >
              تصفية
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {filterOpen && (
              <div className="absolute left-0 mt-1 z-20 w-40 rounded-xl border border-gray-200 bg-white shadow-lg py-1 text-right">
                {[
                  { id: "all", label: "الكل" },
                  { id: "completed", label: "مكتملة" },
                  { id: "active", label: "نشطة" },
                  { id: "cancelled", label: "ملغاة" },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setStatusFilter(opt.id);
                      setPage(1);
                      setFilterOpen(false);
                    }}
                    className={`w-full px-3 py-2 text-xs hover:bg-gray-50 ${
                      statusFilter === opt.id ? "text-[#c9a84c] font-bold" : "text-gray-600"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={handleExport}
            disabled={loading || !filtered.length}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#4a4746] hover:bg-[#383534] text-white text-xs font-bold disabled:opacity-50"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            تصدير الكل
          </button>
        </div>
        <h3 className="text-sm font-bold text-gray-800 text-right order-1 sm:order-2">
          تفاصيل رحلات الوسيط
        </h3>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-right">
          <thead>
            <tr className="bg-[#f9f6f0] border-b border-gray-100">
              {[
                "تفاصيل الرحلة",
                "الحالة",
                "السعر الإجمالي",
                "العمولة",
                "عمولتنا",
                "المتبقي",
                "التاريخ",
                "سحب",
              ].map((h) => (
                <th key={h} className="px-4 py-3.5 text-xs font-semibold text-gray-500 whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center">
                  <div className="w-8 h-8 mx-auto border-4 border-[#c9a84c] border-t-transparent rounded-full animate-spin" />
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-red-500 text-sm">
                  {error}
                </td>
              </tr>
            ) : paginated.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-gray-400 text-sm">
                  لا توجد رحلات
                </td>
              </tr>
            ) : (
              <>
                {paginated.map((trip) => {
                  const status = statusInfo(trip.status);
                  return (
                    <tr
                      key={trip.id}
                      className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors"
                    >
                      <td className="px-4 py-3.5">
                        <RouteCell from={trip.from} to={trip.to} />
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`text-xs px-2.5 py-1 rounded-lg font-medium ${status.cls}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-gray-700 whitespace-nowrap">
                        {fmtMoney(trip.total_price)}
                      </td>
                      <td className="px-4 py-3.5 text-[#bd8b2a] font-medium whitespace-nowrap">
                        {fmtMoney(trip.broker_commission)}
                      </td>
                      <td className="px-4 py-3.5 text-gray-700 whitespace-nowrap">
                        {fmtMoney(trip.our_commission)}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {Number(trip.remaining_amount) > 0 ? (
                          <span className="text-red-500 font-medium">{fmtMoney(trip.remaining_amount)}</span>
                        ) : (
                          <span className="text-gray-600">{fmtMoney(0)}</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-gray-500 whitespace-nowrap">
                        {fmtDate(trip.date)}
                      </td>
                      <td className="px-4 py-3.5">
                        <button
                          type="button"
                          onClick={() => handleWithdraw(trip)}
                          className="px-3 py-1.5 rounded-lg bg-[#c9a84c] hover:bg-[#b8973d] text-white text-xs font-bold whitespace-nowrap"
                        >
                          سحب
                        </button>
                      </td>
                    </tr>
                  );
                })}
                <tr className="bg-[#f9f6f0] border-t-2 border-[#e8dfc8]">
                  <td className="px-4 py-3.5 text-sm font-bold text-gray-800" colSpan={2}>
                    الإجمالي
                  </td>
                  <td className="px-4 py-3.5 text-sm font-bold text-gray-800 whitespace-nowrap">
                    {fmtMoney(totals.total_price)}
                  </td>
                  <td className="px-4 py-3.5 text-sm font-bold text-[#bd8b2a] whitespace-nowrap">
                    {fmtMoney(totals.broker_commission)}
                  </td>
                  <td className="px-4 py-3.5 text-sm font-bold text-gray-800 whitespace-nowrap">
                    {fmtMoney(totals.our_commission)}
                  </td>
                  <td className="px-4 py-3.5 text-sm font-bold text-red-500 whitespace-nowrap">
                    {fmtMoney(totals.remaining_amount)}
                  </td>
                  <td className="px-4 py-3.5" colSpan={2} />
                </tr>
              </>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      {!loading && !error && filtered.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-gray-100">
          <p className="text-xs text-gray-500 order-2 sm:order-1">
            عرض {rangeFrom} - {rangeTo} من أصل {filtered.length} رحلة
          </p>
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-1 text-xs text-gray-600 order-1 sm:order-2" dir="ltr">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 bg-white border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-40"
              >
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setPage(n)}
                  className={`w-7 h-7 rounded font-bold transition-colors ${
                    page === n
                      ? "bg-amber-500 text-white shadow-sm"
                      : "bg-white border border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  {n}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 bg-white border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-40"
              >
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
