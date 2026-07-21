import { useMemo, useState, useEffect } from "react";
import { useGlobalSearch } from "../hooks/useGlobalSearch";
import AppModal from "./ui/AppModal";

const fmtMoney = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n.toLocaleString("en-US") : "0";
};

const MONTH_LABELS = {
  "2026-07": "يوليو 2026",
  "2026-06": "يونيو 2026",
  "2026-05": "مايو 2026",
  "2026-04": "أبريل 2026",
};

const CURRENT_MONTH = "2026-07";

const emptyScope = () => ({
  tripsCount: 0,
  tripsAmount: 0,
  assignedCount: 0,
  assignedAmount: 0,
  refundsCount: 0,
  refundsAmount: 0,
  cancelledPercent: 0,
  completedPercent: 0,
});

const sumScope = (acc, scope) => ({
  tripsCount: acc.tripsCount + (Number(scope.tripsCount) || 0),
  tripsAmount: acc.tripsAmount + (Number(scope.tripsAmount) || 0),
  assignedCount: acc.assignedCount + (Number(scope.assignedCount) || 0),
  assignedAmount: acc.assignedAmount + (Number(scope.assignedAmount) || 0),
  refundsCount: acc.refundsCount + (Number(scope.refundsCount) || 0),
  refundsAmount: acc.refundsAmount + (Number(scope.refundsAmount) || 0),
});

function targetPercentOfBase(employeeTarget, mainTarget) {
  const emp = Number(employeeTarget) || 0;
  const main = Number(mainTarget) || 0;
  if (main <= 0) return 0;
  return Math.round((emp / main) * 1000) / 10;
}

/** بيانات تجريبية — تُستبدل لاحقاً بربط API */
const MOCK_EMPLOYEE_REPORTS = [
  {
    id: "e1",
    name: "أحمد محمد",
    phone: "0501112233",
    role: "موظف مبيعات",
    accountName: "أكونت المبيعات الرئيسي",
    accountPhone: "0501234567",
    monthlyTargets: {
      "2026-07": { employeeTarget: 45000, mainTarget: 150000 },
      "2026-06": { employeeTarget: 40000, mainTarget: 140000 },
      "2026-05": { employeeTarget: 38000, mainTarget: 130000 },
      "2026-04": { employeeTarget: 35000, mainTarget: 120000 },
    },
    inside: {
      tripsCount: 28, tripsAmount: 56000, assignedCount: 25, assignedAmount: 50000,
      refundsCount: 2, refundsAmount: 3000, cancelledPercent: 10, completedPercent: 82,
    },
    outside: {
      tripsCount: 14, tripsAmount: 28000, assignedCount: 13, assignedAmount: 26000,
      refundsCount: 1, refundsAmount: 1500, cancelledPercent: 15, completedPercent: 70,
    },
  },
  {
    id: "e2",
    name: "سارة علي",
    phone: "0502223344",
    role: "موظفة مبيعات",
    accountName: "أكونت المبيعات الرئيسي",
    accountPhone: "0501234567",
    monthlyTargets: {
      "2026-07": { employeeTarget: 35000, mainTarget: 150000 },
      "2026-06": { employeeTarget: 32000, mainTarget: 140000 },
      "2026-05": { employeeTarget: 30000, mainTarget: 130000 },
      "2026-04": { employeeTarget: 28000, mainTarget: 120000 },
    },
    inside: {
      tripsCount: 20, tripsAmount: 40000, assignedCount: 19, assignedAmount: 38000,
      refundsCount: 0, refundsAmount: 0, cancelledPercent: 6, completedPercent: 88,
    },
    outside: {
      tripsCount: 11, tripsAmount: 22000, assignedCount: 10, assignedAmount: 20000,
      refundsCount: 1, refundsAmount: 1200, cancelledPercent: 12, completedPercent: 80,
    },
  },
  {
    id: "e3",
    name: "خالد حسن",
    phone: "0503334455",
    role: "موظف دعم",
    accountName: "أكونت الدعم",
    accountPhone: "0559876543",
    monthlyTargets: {
      "2026-07": { employeeTarget: 25000, mainTarget: 80000 },
      "2026-06": { employeeTarget: 22000, mainTarget: 75000 },
      "2026-05": { employeeTarget: 20000, mainTarget: 70000 },
      "2026-04": { employeeTarget: 18000, mainTarget: 65000 },
    },
    inside: {
      tripsCount: 12, tripsAmount: 25000, assignedCount: 11, assignedAmount: 23000,
      refundsCount: 1, refundsAmount: 1800, cancelledPercent: 14, completedPercent: 72,
    },
    outside: {
      tripsCount: 7, tripsAmount: 15500, assignedCount: 6, assignedAmount: 13000,
      refundsCount: 1, refundsAmount: 1000, cancelledPercent: 18, completedPercent: 65,
    },
  },
  {
    id: "e4",
    name: "نورة عبدالله",
    phone: "0504445566",
    role: "موظفة مبيعات",
    accountName: "أكونت الدعم",
    accountPhone: "0559876543",
    monthlyTargets: {
      "2026-07": { employeeTarget: 30000, mainTarget: 80000 },
      "2026-06": { employeeTarget: 28000, mainTarget: 75000 },
      "2026-05": { employeeTarget: 26000, mainTarget: 70000 },
      "2026-04": { employeeTarget: 24000, mainTarget: 65000 },
    },
    inside: {
      tripsCount: 18, tripsAmount: 36000, assignedCount: 17, assignedAmount: 34000,
      refundsCount: 0, refundsAmount: 0, cancelledPercent: 4, completedPercent: 92,
    },
    outside: {
      tripsCount: 7, tripsAmount: 14000, assignedCount: 7, assignedAmount: 14000,
      refundsCount: 0, refundsAmount: 0, cancelledPercent: 7, completedPercent: 86,
    },
  },
  {
    id: "e5",
    name: "يوسف إبراهيم",
    phone: "0505556677",
    role: "موظف مبيعات",
    accountName: "أكونت الرياض",
    accountPhone: "0533344556",
    monthlyTargets: {
      "2026-07": { employeeTarget: 20000, mainTarget: 60000 },
      "2026-06": { employeeTarget: 18000, mainTarget: 55000 },
      "2026-05": { employeeTarget: 16000, mainTarget: 50000 },
      "2026-04": { employeeTarget: 15000, mainTarget: 48000 },
    },
    inside: {
      tripsCount: 9, tripsAmount: 15000, assignedCount: 8, assignedAmount: 13500,
      refundsCount: 2, refundsAmount: 3200, cancelledPercent: 20, completedPercent: 68,
    },
    outside: {
      tripsCount: 5, tripsAmount: 9200, assignedCount: 4, assignedAmount: 7500,
      refundsCount: 2, refundsAmount: 2400, cancelledPercent: 25, completedPercent: 60,
    },
  },
  {
    id: "e6",
    name: "hiba",
    phone: "0506667788",
    role: "موظفة مبيعات",
    accountName: "أكونت الرياض",
    accountPhone: "0533344556",
    monthlyTargets: {
      "2026-07": { employeeTarget: 15000, mainTarget: 60000 },
      "2026-06": { employeeTarget: 14000, mainTarget: 55000 },
      "2026-05": { employeeTarget: 12000, mainTarget: 50000 },
      "2026-04": { employeeTarget: 10000, mainTarget: 48000 },
    },
    inside: {
      tripsCount: 5, tripsAmount: 10500, assignedCount: 4, assignedAmount: 9000,
      refundsCount: 1, refundsAmount: 600, cancelledPercent: 9, completedPercent: 81,
    },
    outside: {
      tripsCount: 3, tripsAmount: 6300, assignedCount: 3, assignedAmount: 5700,
      refundsCount: 0, refundsAmount: 0, cancelledPercent: 12, completedPercent: 78,
    },
  },
];

const METRIC_HEADERS = [
  "عدد المشاوير",
  "المبلغ",
  "عدد الإسناد",
  "المبلغ",
  "عدد الإرجاعات",
  "المبلغ",
  "نسبة الملغي",
  "نسبة المكتمل",
];

function PercentCell({ value, tone = "neutral" }) {
  const toneCls =
    tone === "danger"
      ? "text-red-600 bg-red-50"
      : tone === "success"
        ? "text-green-700 bg-green-50"
        : "text-gray-700 bg-gray-50";

  return (
    <span className={`inline-flex items-center justify-center min-w-[3.25rem] px-2 py-1 rounded-lg text-xs font-bold ${toneCls}`}>
      {Number(value) || 0}%
    </span>
  );
}

function ScopeCells({ scope }) {
  const s = scope || emptyScope();
  return (
    <>
      <td className="px-4 py-3 text-gray-700 font-semibold whitespace-nowrap">{s.tripsCount}</td>
      <td className="px-4 py-3 text-[#9C6402] font-medium whitespace-nowrap">
        {fmtMoney(s.tripsAmount)} <span className="text-gray-400 text-[11px] font-normal">ر.س</span>
      </td>
      <td className="px-4 py-3 text-gray-700 font-semibold whitespace-nowrap">{s.assignedCount}</td>
      <td className="px-4 py-3 text-[#9C6402] font-medium whitespace-nowrap">
        {fmtMoney(s.assignedAmount)} <span className="text-gray-400 text-[11px] font-normal">ر.س</span>
      </td>
      <td className="px-4 py-3 text-gray-700 font-semibold whitespace-nowrap">{s.refundsCount}</td>
      <td className="px-4 py-3 text-[#9C6402] font-medium whitespace-nowrap">
        {fmtMoney(s.refundsAmount)} <span className="text-gray-400 text-[11px] font-normal">ر.س</span>
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        <PercentCell value={s.cancelledPercent} tone="danger" />
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        <PercentCell value={s.completedPercent} tone="success" />
      </td>
    </>
  );
}

function ScopeTotals({ totals }) {
  return (
    <>
      <td className="px-4 py-3 whitespace-nowrap">{totals.tripsCount}</td>
      <td className="px-4 py-3 text-[#9C6402] whitespace-nowrap">
        {fmtMoney(totals.tripsAmount)} <span className="text-gray-400 text-[11px] font-normal">ر.س</span>
      </td>
      <td className="px-4 py-3 whitespace-nowrap">{totals.assignedCount}</td>
      <td className="px-4 py-3 text-[#9C6402] whitespace-nowrap">
        {fmtMoney(totals.assignedAmount)} <span className="text-gray-400 text-[11px] font-normal">ر.س</span>
      </td>
      <td className="px-4 py-3 whitespace-nowrap">{totals.refundsCount}</td>
      <td className="px-4 py-3 text-[#9C6402] whitespace-nowrap">
        {fmtMoney(totals.refundsAmount)} <span className="text-gray-400 text-[11px] font-normal">ر.س</span>
      </td>
      <td className="px-4 py-3" colSpan={2} />
    </>
  );
}

function DetailField({ label, value, dir }) {
  return (
    <div className="text-right space-y-1">
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-sm font-medium text-gray-800 bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5" dir={dir}>
        {value ?? "—"}
      </p>
    </div>
  );
}

function EmployeeDetailsModal({ isOpen, onClose, employee }) {
  const [monthKey, setMonthKey] = useState(CURRENT_MONTH);

  useEffect(() => {
    if (isOpen) setMonthKey(CURRENT_MONTH);
  }, [isOpen, employee?.id]);

  if (!employee) return null;

  const monthData = employee.monthlyTargets?.[monthKey] ?? { employeeTarget: 0, mainTarget: 0 };
  const percentOfBase = targetPercentOfBase(monthData.employeeTarget, monthData.mainTarget);

  return (
    <AppModal
      isOpen={isOpen}
      onClose={onClose}
      title="تفاصيل الموظف"
      subtitle={employee.name}
      size="md"
      footer={
        <button
          type="button"
          onClick={onClose}
          className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#4a4644] hover:bg-black text-white text-sm font-bold"
        >
          إغلاق
        </button>
      }
    >
      <div className="space-y-4" dir="rtl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#9C6402] to-[#E6C76A] flex items-center justify-center text-white font-bold shrink-0">
            {(employee.name?.[0] || "؟").toUpperCase()}
          </div>
          <div className="text-right min-w-0">
            <p className="font-bold text-gray-800 truncate">{employee.name}</p>
            <p className="text-xs text-gray-400 mt-0.5">{employee.role}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <DetailField label="الاسم" value={employee.name} />
          <DetailField label="رقم الهاتف" value={employee.phone} dir="ltr" />
          <DetailField label="الدور" value={employee.role} />
          <DetailField label="الأكونت التابع له" value={employee.accountName} />
          <DetailField label="رقم الأكونت" value={employee.accountPhone} dir="ltr" />
        </div>

        <div className="rounded-2xl border border-amber-100 bg-[#faf7f0] p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <p className="text-sm font-bold text-[#9C6402]">التارجت حسب الشهر</p>
            <div className="relative w-full sm:w-48">
              <select
                value={monthKey}
                onChange={(e) => setMonthKey(e.target.value)}
                className="w-full h-10 border border-amber-200 rounded-xl px-3 text-sm bg-white text-right appearance-none focus:border-[#c9a84c] focus:outline-none"
              >
                {Object.entries(MONTH_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
              <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-xl bg-white border border-amber-100 p-3 text-right">
              <p className="text-[11px] text-gray-400">تارجت الموظف</p>
              <p className="text-lg font-extrabold text-gray-800 mt-1">
                {fmtMoney(monthData.employeeTarget)}
                <span className="text-xs font-normal text-gray-400 mr-1">ر.س</span>
              </p>
            </div>
            <div className="rounded-xl bg-white border border-amber-100 p-3 text-right">
              <p className="text-[11px] text-gray-400">التارجت الأساسي</p>
              <p className="text-lg font-extrabold text-gray-800 mt-1">
                {fmtMoney(monthData.mainTarget)}
                <span className="text-xs font-normal text-gray-400 mr-1">ر.س</span>
              </p>
            </div>
            <div className="rounded-xl bg-white border border-amber-100 p-3 text-right">
              <p className="text-[11px] text-gray-400">نسبته من الأساسي</p>
              <p className="text-lg font-extrabold text-[#9C6402] mt-1">
                {percentOfBase}
                <span className="text-sm font-bold mr-0.5">%</span>
              </p>
              <div className="mt-2 h-2 rounded-full bg-amber-50 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-l from-[#9C6402] to-[#E6C76A]"
                  style={{ width: `${Math.min(100, percentOfBase)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppModal>
  );
}

export default function EmployeeReportsPage() {
  const { searchQuery } = useGlobalSearch();
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  const employees = useMemo(() => {
    const term = searchQuery.trim().toLowerCase();
    if (!term) return MOCK_EMPLOYEE_REPORTS;
    return MOCK_EMPLOYEE_REPORTS.filter(
      (e) =>
        e.name.toLowerCase().includes(term)
        || e.phone.includes(term)
        || e.role.toLowerCase().includes(term)
        || (e.accountName || "").toLowerCase().includes(term),
    );
  }, [searchQuery]);

  const totals = useMemo(
    () =>
      employees.reduce(
        (acc, e) => ({
          inside: sumScope(acc.inside, e.inside),
          outside: sumScope(acc.outside, e.outside),
        }),
        { inside: emptyScope(), outside: emptyScope() },
      ),
    [employees],
  );

  return (
    <div className="w-full space-y-5 pb-8" dir="rtl">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5 text-right">
        <h1 className="text-xl font-bold text-gray-800">تقارير الموظفين</h1>
        <p className="text-xs text-gray-400 mt-0.5">
          اضغط على اسم الموظف لعرض تفاصيله والتارجت حسب الشهر
        </p>
      </div>

      {employees.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 py-16 text-center text-sm text-gray-400">
          لا توجد نتائج مطابقة
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
            <h3 className="text-sm font-bold text-gray-800">سجل أداء الموظفين</h3>
            <span className="text-xs text-gray-500 bg-gray-50 border border-gray-100 rounded-full px-3 py-1">
              {employees.length} موظف
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right min-w-[1600px]">
              <thead className="border-b border-gray-100">
                <tr className="bg-gray-50">
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 whitespace-nowrap" rowSpan={2}>
                    اسم الموظف
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 whitespace-nowrap" rowSpan={2}>
                    الهاتف
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 whitespace-nowrap" rowSpan={2}>
                    الدور
                  </th>
                  <th
                    colSpan={8}
                    className="px-4 py-2.5 text-xs font-bold text-[#9C6402] whitespace-nowrap border-r border-gray-200 bg-amber-50/70 text-center"
                  >
                    داخل الأكونت
                  </th>
                  <th
                    colSpan={8}
                    className="px-4 py-2.5 text-xs font-bold text-gray-700 whitespace-nowrap bg-slate-50 text-center"
                  >
                    خارج الأكونت
                  </th>
                </tr>
                <tr className="bg-gray-50/80">
                  {METRIC_HEADERS.map((h, i) => (
                    <th
                      key={`inside-${h}-${i}`}
                      className="px-4 py-3 text-xs font-semibold text-gray-500 whitespace-nowrap border-r border-gray-100"
                    >
                      {h}
                    </th>
                  ))}
                  {METRIC_HEADERS.map((h, i) => (
                    <th
                      key={`outside-${h}-${i}`}
                      className="px-4 py-3 text-xs font-semibold text-gray-500 whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {employees.map((emp) => (
                  <tr
                    key={emp.id}
                    className="hover:bg-gray-50/60 cursor-pointer"
                    onClick={() => setSelectedEmployee(emp)}
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedEmployee(emp);
                        }}
                        className="font-medium text-[#c9a84c] hover:underline"
                      >
                        {emp.name}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap" dir="ltr">{emp.phone}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap border-r border-gray-100">{emp.role}</td>
                    <ScopeCells scope={emp.inside} />
                    <ScopeCells scope={emp.outside} />
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-[#f9f6f0] border-t border-gray-200 font-bold text-gray-800">
                  <td className="px-4 py-3 whitespace-nowrap border-r border-gray-200" colSpan={3}>
                    الإجمالي
                  </td>
                  <ScopeTotals totals={totals.inside} />
                  <ScopeTotals totals={totals.outside} />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      <EmployeeDetailsModal
        isOpen={Boolean(selectedEmployee)}
        onClose={() => setSelectedEmployee(null)}
        employee={selectedEmployee}
      />
    </div>
  );
}
