import { useState, useEffect, useCallback, useMemo } from "react";
import { useGlobalSearch } from "../../hooks/useGlobalSearch";
import { filterByGlobalSearch } from "../../lib/searchUtils";
import { fetchAccountsSummary } from "../../services/accountsService";
import { fetchAllDrivers } from "../../services/driverSaleChatService.js";
import { getDriverBankingData } from "../../lib/driverBanking.js";
import { exportToExcel } from "../../lib/exportExcel.js";
import { useToast } from "../../lib/toast.jsx";

const ITEMS_PER_PAGE = 8;
const EMPLOYEES = ["سارة خالد", "نورة العتيبي", "ريم الشمري", "هند القحطاني"];
const APPROVERS = ["م. أحمد السالم", "أ. خالد المطيري", "م. فهد العنزي", "أ. سعد الدوسري"];
const CITIES = ["الرياض", "جدة", "الدمام", "مكة", "المدينة", "الخبر", "أبها", "الطائف"];

const fmtMoney = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n.toLocaleString("en-US") : "0";
};

const fmtDate = (v) => {
  if (!v) return "—";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "—" : d.toISOString().slice(0, 10);
};

function seedFromKey(key) {
  let seed = 0;
  const text = String(key ?? "");
  for (let i = 0; i < text.length; i += 1) {
    seed = ((seed << 5) - seed + text.charCodeAt(i)) | 0;
  }
  return Math.abs(Math.imul(seed || 1, 2654435761));
}

function buildMockRow(trip, driver, index) {
  const key = `${trip?.id ?? index}-${driver?.id ?? index}`;
  const random = seedFromKey(key);
  const amount = Number(trip?.total_price ?? trip?.price ?? ((random % 90) + 10) * 100);
  const returnValue = random % 5 === 0 ? Math.round(amount * 0.1) : 0;
  const linkCommission = Math.round(amount * 0.05);
  const commission = Math.round(amount * 0.15);
  const brokerCommission =
    Number(trip?.broker_commission ?? trip?.brokerCommission) || Math.round(amount * 0.08);
  const net = Math.max(0, amount - brokerCommission);
  const collected = random % 3 !== 0;
  const paidFromTrip = Number(trip?.amount_paid ?? trip?.paid_amount);
  const remainingFromTrip = trip?.remaining_amount != null ? Number(trip.remaining_amount) : NaN;
  const paid = Number.isFinite(paidFromTrip) && paidFromTrip > 0
    ? paidFromTrip
    : collected
      ? Math.max(0, amount - returnValue)
      : 0;
  const remaining = Number.isFinite(remainingFromTrip)
    ? remainingFromTrip
    : collected
      ? 0
      : Math.max(0, amount - returnValue - paid);
  const tripFrom = trip?.from ?? CITIES[random % CITIES.length];
  const tripTo = trip?.to ?? CITIES[(random + 3) % CITIES.length];
  const driverPhone = driver?.phone ?? driver?.phone_number ?? "—";

  return {
    id: `${trip?.id ?? "t"}-${driver?.id ?? index}`,
    tripId: trip?.id ?? trip?.trip_id ?? `TR-${1000 + index}`,
    driverId: driver?.id ?? null,
    driverNumber: driverPhone,
    driverName: [driver?.name, driver?.last_name].filter(Boolean).join(" ") || "—",
    driverCode: driver?.id ? `DBY-${String(driver.id).slice(-4).toUpperCase()}` : `DBY-${1000 + index}`,
    driverPhone,
    driverAddress: driver?.address ?? driver?.city ?? "—",
    driverNationality: driver?.nationality ?? "—",
    driverEmail: driver?.email ?? "—",
    customerName: trip?.customer_name ?? trip?.client_name ?? trip?.name ?? "عميل Drivo",
    customerPhone: trip?.customer_phone ?? trip?.phone ?? trip?.client_phone ?? "05XXXXXXXX",
    tripFrom,
    tripTo,
    route: `${tripFrom} ← ${tripTo}`,
    employee: EMPLOYEES[random % EMPLOYEES.length],
    approvedBy: APPROVERS[random % APPROVERS.length],
    amount,
    returnValue,
    linkCommission,
    commission,
    paid,
    remaining,
    brokerCommission,
    net,
    status: collected ? "تم التحصيل" : "لم يتم",
    accountOwner: driver?.account_owner ?? driver?.name ?? "—",
    bankName: driver?.bank_name ?? "—",
    accountNumber: driver?.bank_account_number ?? driver?.iban ?? "—",
    date: trip?.created_at ?? trip?.date ?? new Date(Date.now() - (index + 1) * 86400000).toISOString(),
  };
}

function SummaryCard({ label, value, tone = "gold" }) {
  const tones = {
    gold: "from-[#9C6402] to-[#E6C76A] text-white",
    green: "bg-green-50 border-green-100 text-green-700",
    white: "bg-white border-gray-100 text-gray-800",
  };

  if (tone === "gold") {
    return (
      <div className={`rounded-2xl border shadow-sm p-5 bg-gradient-to-l ${tones.gold}`}>
        <p className="text-xs opacity-90">{label}</p>
        <p className="text-3xl font-extrabold mt-2">{fmtMoney(value)} <span className="text-sm font-normal">ر.س</span></p>
      </div>
    );
  }

  return (
    <div className={`rounded-2xl border shadow-sm p-5 ${tones[tone]}`}>
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-3xl font-extrabold mt-2">{fmtMoney(value)} <span className="text-sm font-normal text-gray-400">ر.س</span></p>
    </div>
  );
}

function buildFinancialChanges(row) {
  const base = new Date(row.date);
  const at = (days) => new Date(base.getTime() - days * 86400000).toISOString();
  const list = [
    {
      id: `${row.id}-price`,
      date: at(0),
      action: "تحديد سعر الرحلة",
      detail: `تم تحديد قيمة الرحلة بـ ${fmtMoney(row.amount)} ر.س`,
      tone: "gold",
    },
    {
      id: `${row.id}-commission`,
      date: at(1),
      action: "احتساب العمولة",
      detail: `عمولة الشركة ${fmtMoney(row.commission)} ر.س وعمولة وسيط ${fmtMoney(row.brokerCommission)} ر.س — الصافي ${fmtMoney(row.net)} ر.س`,
      tone: "gray",
    },
  ];
  if (row.returnValue > 0) {
    list.push({
      id: `${row.id}-return`,
      date: at(2),
      action: "تسجيل مرتجع",
      detail: `تم تسجيل مرتجع بقيمة ${fmtMoney(row.returnValue)} ر.س`,
      tone: "red",
    });
  }
  list.push(
    row.status === "تم التحصيل"
      ? {
          id: `${row.id}-collected`,
          date: at(3),
          action: "تحصيل دفعة",
          detail: `تم تحصيل ${fmtMoney(row.amount)} ر.س بنجاح`,
          approvedBy: row.approvedBy,
          tone: "green",
        }
      : {
          id: `${row.id}-pending`,
          date: at(3),
          action: "بانتظار التحصيل",
          detail: "لم يتم تحصيل المبلغ بعد",
          tone: "red",
        }
  );
  return list.sort((a, b) => new Date(b.date) - new Date(a.date));
}

function DetailRow({ label, value, ltr }) {
  return (
    <div className="flex justify-between border-b border-gray-50 pb-2 text-sm">
      <span className="text-gray-400">{label}</span>
      <span className="text-gray-700 font-medium" dir={ltr ? "ltr" : undefined}>{value ?? "—"}</span>
    </div>
  );
}

function DriverAccountDetailsView({ row, onBack }) {
  const [activeTab, setActiveTab] = useState("financial");
  const banking = getDriverBankingData({ id: row.driverId ?? row.driverPhone, name: row.driverName });
  const remaining = row.remaining ?? (row.status === "تم التحصيل" ? 0 : Math.max(0, row.amount - row.returnValue));
  const changes = useMemo(() => buildFinancialChanges(row), [row]);

  const tabs = [
    { id: "financial", label: "التفاصيل المالية" },
    { id: "personal", label: "المعلومات الشخصية" },
    { id: "changes", label: "سجل التغيرات المالية" },
  ];

  const toneCls = {
    gold: "bg-amber-50 text-[#b88121] border-amber-200",
    green: "bg-green-50 text-green-600 border-green-200",
    red: "bg-red-50 text-red-600 border-red-200",
    gray: "bg-gray-50 text-gray-600 border-gray-200",
  };

  return (
    <div dir="rtl" className="w-full space-y-4">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1.5 text-[#c9a84c] text-sm font-semibold hover:opacity-80"
      >
        <span>العودة إلى حسابات السائقين</span>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div className="flex flex-wrap gap-2">
          <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${banking.isDebtor ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"}`}>
            {banking.bankingStatus}
          </span>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-50 text-[#b88121] font-semibold" dir="ltr">
            رقم السائق: {row.driverPhone}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <h2 className="text-xl font-bold text-gray-800">{row.driverName}</h2>
            <p className="text-xs text-gray-400 mt-1" dir="ltr">{row.driverPhone}</p>
          </div>
          <div className="w-14 h-14 rounded-full bg-[#c9a84c]/15 text-[#c9a84c] flex items-center justify-center text-2xl font-bold shrink-0">
            {(row.driverName || "?").trim().charAt(0) || "؟"}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-2 border border-gray-100 shadow-sm flex gap-4 text-sm font-semibold text-gray-400 overflow-x-auto">
        {tabs.map((tab) => (
          <span
            key={tab.id}
            role="button"
            tabIndex={0}
            onClick={() => setActiveTab(tab.id)}
            onKeyDown={(e) => e.key === "Enter" && setActiveTab(tab.id)}
            className={`px-3 py-1 cursor-pointer whitespace-nowrap transition-colors ${
              activeTab === tab.id ? "text-[#c9a84c] border-b-2 border-[#c9a84c]" : "hover:text-gray-700"
            }`}
          >
            {tab.label}
          </span>
        ))}
      </div>

      {activeTab === "financial" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-[#c9a84c]">تفاصيل الرحلة المالية</h3>
            <DetailRow label="رقم الرحلة" value={`#${row.tripId}`} ltr />
            <DetailRow label="المسار" value={row.route} />
            <DetailRow label="قيمة الرحلة" value={`${fmtMoney(row.amount)} ر.س`} />
            <DetailRow label="قيمة المرتجع" value={`${fmtMoney(row.returnValue)} ر.س`} />
            <DetailRow label="عمولة وسيط" value={`${fmtMoney(row.brokerCommission)} ر.س`} />
            <DetailRow label="الصافي (بعد عمولة وسيط)" value={`${fmtMoney(row.net)} ر.س`} />
            <DetailRow label="عمولتنا" value={`${fmtMoney(row.commission)} ر.س`} />
            <DetailRow label="مدفوع" value={`${fmtMoney(row.paid)} ر.س`} />
            <DetailRow label="المتبقي" value={`${fmtMoney(remaining)} ر.س`} />
            <DetailRow label="حالة التحصيل" value={row.status} />
          </div>
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-[#c9a84c]">الحساب البنكي والرصيد</h3>
            <DetailRow label="الحالة البنكية" value={banking.bankingStatus} />
            <DetailRow label="الرصيد الحالي" value={`${fmtMoney(banking.balance)} ر.س`} />
            <DetailRow label="صاحب الحساب" value={row.accountOwner} />
            <DetailRow label="البنك" value={row.bankName} />
            <DetailRow label="رقم الحساب" value={row.accountNumber} ltr />
            <DetailRow label="الموظفة" value={row.employee} />
          </div>
        </div>
      )}

      {activeTab === "personal" && (
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-3 max-w-2xl">
          <h3 className="text-sm font-bold text-[#c9a84c]">المعلومات الشخصية</h3>
          <DetailRow label="اسم السائق" value={row.driverName} />
          <DetailRow label="رقم السائق" value={row.driverPhone} ltr />
          <DetailRow label="المدينة" value={row.driverAddress} />
          <DetailRow label="الجنسية" value={row.driverNationality} />
          <DetailRow label="البريد الإلكتروني" value={row.driverEmail} ltr />
        </div>
      )}

      {activeTab === "changes" && (
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-3">
          <h3 className="text-sm font-bold text-[#c9a84c]">سجل التغيرات المالية</h3>
          <div className="space-y-3">
            {changes.map((c) => (
              <div key={c.id} className="flex items-start gap-3 border-b border-gray-50 pb-3 last:border-0">
                <span className={`shrink-0 text-[11px] px-2.5 py-1 rounded-lg font-bold border ${toneCls[c.tone] || toneCls.gray}`}>
                  {c.action}
                </span>
                <div className="flex-1 text-right">
                  <p className="text-sm text-gray-700">{c.detail}</p>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                    <p className="text-[11px] text-gray-400">{fmtDate(c.date)}</p>
                    {c.approvedBy && (
                      <p className="text-[11px] text-green-600 font-semibold">اعتمدها: {c.approvedBy}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CustomerAccountDetailsView({ row, onBack }) {
  const remaining = row.remaining ?? (row.status === "تم التحصيل" ? 0 : Math.max(0, row.amount - row.returnValue));
  return (
    <div dir="rtl" className="w-full space-y-4">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1.5 text-[#c9a84c] text-sm font-semibold hover:opacity-80"
      >
        <span>العودة إلى حسابات السائقين</span>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex items-center gap-3">
        <div className="w-14 h-14 rounded-full bg-[#c9a84c]/15 text-[#c9a84c] flex items-center justify-center text-2xl font-bold shrink-0">
          {(row.customerName || "?").trim().charAt(0) || "؟"}
        </div>
        <div className="text-right">
          <h2 className="text-xl font-bold text-gray-800">{row.customerName}</h2>
          <p className="text-xs text-gray-400 mt-1" dir="ltr">{row.customerPhone}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-3">
          <h3 className="text-sm font-bold text-[#c9a84c]">بيانات العميل والرحلة</h3>
          <DetailRow label="اسم العميل" value={row.customerName} />
          <DetailRow label="رقم العميل" value={row.customerPhone} ltr />
          <DetailRow label="رقم الرحلة" value={`#${row.tripId}`} ltr />
          <DetailRow label="من" value={row.tripFrom} />
          <DetailRow label="إلى" value={row.tripTo} />
          <DetailRow label="المسار" value={row.route} />
          <DetailRow label="السائق" value={row.driverName} />
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-3">
          <h3 className="text-sm font-bold text-[#c9a84c]">التفاصيل المالية</h3>
          <DetailRow label="قيمة الرحلة" value={`${fmtMoney(row.amount)} ر.س`} />
          <DetailRow label="قيمة المرتجع" value={`${fmtMoney(row.returnValue)} ر.س`} />
          <DetailRow label="عمولة وسيط" value={`${fmtMoney(row.brokerCommission)} ر.س`} />
          <DetailRow label="الصافي (بعد عمولة وسيط)" value={`${fmtMoney(row.net)} ر.س`} />
          <DetailRow label="مدفوع" value={`${fmtMoney(row.paid)} ر.س`} />
          <DetailRow label="المتبقي" value={`${fmtMoney(remaining)} ر.س`} />
          <DetailRow label="حالة التحصيل" value={row.status} />
          <DetailRow label="اعتمد الدفعة" value={row.status === "تم التحصيل" ? row.approvedBy : "—"} />
        </div>
      </div>
    </div>
  );
}

export default function DriverAccountsPage() {
  const toast = useToast();
  const { searchQuery } = useGlobalSearch();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [period, setPeriod] = useState("month");
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [summary, drivers] = await Promise.all([
        fetchAccountsSummary().catch(() => ({ trips: [] })),
        fetchAllDrivers().catch(() => []),
      ]);

      const trips = Array.isArray(summary?.trips) ? summary.trips : [];
      const driverList = Array.isArray(drivers) ? drivers : [];
      const driverById = new Map(driverList.map((d) => [String(d.id), d]));

      const built = trips.length
        ? trips.slice(0, 40).map((trip, index) => {
            const driver =
              driverById.get(String(trip.driver_id ?? trip.driver?.id ?? "")) ??
              driverList[index % Math.max(driverList.length, 1)] ??
              null;
            return buildMockRow(trip, driver, index);
          })
        : driverList.slice(0, 24).map((driver, index) => buildMockRow(null, driver, index));

      setRows(built);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, period]);

  const filteredRows = useMemo(() => {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const byPeriod = rows.filter((row) => {
      const date = new Date(row.date);
      if (Number.isNaN(date.getTime())) return true;
      if (period === "today") return date >= startOfDay;
      if (period === "month") return date >= startOfMonth;
      return true;
    });

    return filterByGlobalSearch(byPeriod, searchQuery, (row) => [
      row.driverName,
      row.driverNumber,
      row.driverPhone,
      row.driverCode,
      row.customerName,
      row.customerPhone,
      row.route,
      row.employee,
      row.status,
      row.approvedBy,
      row.bankName,
      row.accountOwner,
      row.accountNumber,
    ]);
  }, [rows, searchQuery, period]);

  const summary = useMemo(() => {
    const totalDebt = filteredRows.reduce((sum, row) => {
      const banking = getDriverBankingData({ id: row.driverId ?? row.driverPhone, name: row.driverName });
      return sum + (banking.isDebtor ? banking.balance : 0);
    }, 0);
    const dueCommissions = filteredRows.reduce((sum, row) => sum + (row.status === "لم يتم" ? row.commission : 0), 0);
    const totalCollected = filteredRows.reduce(
      (sum, row) => sum + (row.status === "تم التحصيل" ? row.amount : 0),
      0,
    );
    return { totalDebt, dueCommissions, totalCollected };
  }, [filteredRows]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / ITEMS_PER_PAGE));
  const paginated = filteredRows.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const handleExport = () => {
    if (!filteredRows.length) {
      toast.error("لا توجد بيانات للتصدير");
      return;
    }
    try {
      exportToExcel(
        filteredRows.map((row) => ({
          "اسم السائق": row.driverName,
          "رقم السائق": row.driverPhone,
          "اسم العميل": row.customerName,
          "رقم العميل": row.customerPhone,
          "المسار": row.route,
          "الموظفة": row.employee,
          "الصافي": row.net,
          "قيمة المرتجع": row.returnValue,
          "العمولة": row.commission,
          "مدفوع": row.paid,
          "متبقي": row.remaining,
          "عمولة وسيط": row.brokerCommission,
          "الحالة": row.status,
          "اعتمد الدفعة": row.status === "تم التحصيل" ? row.approvedBy : "—",
          "صاحب الحساب": row.accountOwner,
          "البنك": row.bankName,
          "رقم الحساب": row.accountNumber,
          "التاريخ": fmtDate(row.date),
        })),
        "حسابات_السائقين",
        "حسابات السائقين",
      );
      toast.success("تم تصدير البيانات بنجاح");
    } catch (err) {
      toast.error(err.message || "فشل التصدير");
    }
  };

  if (selectedDriver) {
    return <DriverAccountDetailsView row={selectedDriver} onBack={() => setSelectedDriver(null)} />;
  }

  if (selectedCustomer) {
    return <CustomerAccountDetailsView row={selectedCustomer} onBack={() => setSelectedCustomer(null)} />;
  }

  return (
    <div className="space-y-5" dir="rtl">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-right">
        <div>
          <h1 className="text-xl font-bold text-[#c9a84c]">حسابات السائقين</h1>
          <p className="text-xs text-gray-400 mt-0.5">إدارة ومتابعة العمليات المالية والمعاملات الخاصة بالسائقين بشكل مركزي</p>
        </div>
        <button
          type="button"
          onClick={handleExport}
          disabled={loading || !filteredRows.length}
          className="shrink-0 px-4 py-2 bg-[#4a4644] hover:bg-black rounded-xl text-sm font-bold text-white disabled:opacity-50"
        >
          تصدير البيانات
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <SummaryCard label="إجمالي المديونية" value={summary.totalDebt} tone="gold" />
        <SummaryCard label="العمولات المستحقة" value={summary.dueCommissions} tone="white" />
        <SummaryCard label="إجمالي المبالغ" value={summary.totalCollected} tone="green" />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-4 sm:px-5 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h2 className="text-sm font-bold text-gray-800">سجل العمليات التفصيلي</h2>
          <div className="flex flex-wrap gap-2">
            {[
              { id: "today", label: "اليوم" },
              { id: "month", label: "هذا الشهر" },
              { id: "all", label: "تصفية متقدمة" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setPeriod(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  period === tab.id
                    ? "bg-[#c9a84c] text-white"
                    : "bg-gray-50 text-gray-500 hover:bg-gray-100"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-10 h-10 border-4 border-[#c9a84c] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : paginated.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-16">لا توجد عمليات</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right min-w-[1200px]">
              <thead>
                <tr className="bg-[#f9f6f0] border-b border-gray-100">
                  {[
                    "اسم السائق",
                    "رقم السائق",
                    "اسم العميل",
                    "رقم العميل",
                    "المسار",
                    "الموظفة",
                    "الصافي",
                    "قيمة المرتجع",
                    "العمولة",
                    "مدفوع",
                    "متبقي",
                    "عمولة وسيط",
                    "الحالة",
                    "صاحب الحساب",
                    "البنك",
                    "رقم الحساب",
                    "التاريخ",
                  ].map((h) => (
                    <th key={h} className="px-3 py-3 text-[11px] font-semibold text-gray-500 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginated.map((row) => (
                  <tr key={row.id} className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors">
                    <td className="px-3 py-3 whitespace-nowrap">
                      <button type="button" onClick={() => setSelectedDriver(row)} className="font-medium text-[#c9a84c] hover:underline">
                        {row.driverName}
                      </button>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap" dir="ltr">
                      <button type="button" onClick={() => setSelectedDriver(row)} className="text-[#c9a84c] hover:underline">
                        {row.driverPhone}
                      </button>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <button type="button" onClick={() => setSelectedCustomer(row)} className="font-medium text-[#c9a84c] hover:underline">
                        {row.customerName}
                      </button>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap" dir="ltr">
                      <button type="button" onClick={() => setSelectedCustomer(row)} className="text-[#c9a84c] hover:underline">
                        {row.customerPhone}
                      </button>
                    </td>
                    <td className="px-3 py-3 text-gray-600 whitespace-nowrap">{row.route}</td>
                    <td className="px-3 py-3 text-gray-600 whitespace-nowrap">{row.employee}</td>
                    <td className="px-3 py-3 font-semibold text-gray-800 whitespace-nowrap">{fmtMoney(row.net)}</td>
                    <td className="px-3 py-3 text-gray-600 whitespace-nowrap">{fmtMoney(row.returnValue)}</td>
                    <td className="px-3 py-3 text-gray-600 whitespace-nowrap">{fmtMoney(row.commission)}</td>
                    <td className="px-3 py-3 text-gray-600 whitespace-nowrap">{fmtMoney(row.paid)}</td>
                    <td className="px-3 py-3 text-gray-600 whitespace-nowrap">{fmtMoney(row.remaining)}</td>
                    <td className="px-3 py-3 text-gray-600 whitespace-nowrap">{fmtMoney(row.brokerCommission)}</td>
                    <td className="px-3 py-3">
                      <span className={`text-[10px] px-2 py-1 rounded-lg font-bold ${
                        row.status === "تم التحصيل" ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"
                      }`}>
                        {row.status}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-gray-600 whitespace-nowrap">{row.accountOwner}</td>
                    <td className="px-3 py-3 text-gray-600 whitespace-nowrap">{row.bankName}</td>
                    <td className="px-3 py-3 text-gray-500 whitespace-nowrap" dir="ltr">{row.accountNumber}</td>
                    <td className="px-3 py-3 text-gray-500 whitespace-nowrap">{fmtDate(row.date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && totalPages > 1 && (
          <div className="flex justify-center items-center gap-1 py-4 text-xs text-gray-600" dir="ltr">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 bg-white border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-40"
            >
              ‹
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setPage(n)}
                className={`w-7 h-7 rounded font-bold transition-colors ${
                  page === n ? "bg-amber-500 text-white shadow-sm" : "bg-white border border-gray-200 hover:bg-gray-50"
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
              ›
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
