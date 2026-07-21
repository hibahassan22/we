import { useMemo, useState } from "react";
import { useGlobalSearch } from "../hooks/useGlobalSearch";

const fmtMoney = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n.toLocaleString("en-US") : "0";
};

/** بيانات تجريبية — تُستبدل لاحقاً بربط API */
const MOCK_ACCOUNT_REPORTS = [
  {
    accountId: "acc-1",
    accountName: "أكونت المبيعات الرئيسي",
    accountPhone: "0501234567",
    income: 186500,
    employees: [
      {
        id: "e1",
        name: "أحمد محمد",
        tripsCount: 42,
        tripsAmount: 84000,
        assignedCount: 38,
        assignedAmount: 76000,
        refundsCount: 3,
        refundsAmount: 4500,
        cancelledPercent: 12,
        completedPercent: 78,
      },
      {
        id: "e2",
        name: "سارة علي",
        tripsCount: 31,
        tripsAmount: 62000,
        assignedCount: 29,
        assignedAmount: 58000,
        refundsCount: 1,
        refundsAmount: 1200,
        cancelledPercent: 8,
        completedPercent: 85,
      },
      {
        id: "e3",
        name: "خالد حسن",
        tripsCount: 19,
        tripsAmount: 40500,
        assignedCount: 17,
        assignedAmount: 36000,
        refundsCount: 2,
        refundsAmount: 2800,
        cancelledPercent: 15,
        completedPercent: 70,
      },
    ],
  },
  {
    accountId: "acc-2",
    accountName: "أكونت الدعم",
    accountPhone: "0559876543",
    income: 74200,
    employees: [
      {
        id: "e4",
        name: "نورة عبدالله",
        tripsCount: 25,
        tripsAmount: 50000,
        assignedCount: 24,
        assignedAmount: 48000,
        refundsCount: 0,
        refundsAmount: 0,
        cancelledPercent: 5,
        completedPercent: 90,
      },
      {
        id: "e5",
        name: "يوسف إبراهيم",
        tripsCount: 14,
        tripsAmount: 24200,
        assignedCount: 12,
        assignedAmount: 21000,
        refundsCount: 4,
        refundsAmount: 5600,
        cancelledPercent: 22,
        completedPercent: 65,
      },
    ],
  },
  {
    accountId: "acc-3",
    accountName: "أكونت الرياض",
    accountPhone: "0533344556",
    income: 39800,
    employees: [
      {
        id: "e6",
        name: "hiba",
        tripsCount: 8,
        tripsAmount: 16800,
        assignedCount: 7,
        assignedAmount: 14700,
        refundsCount: 1,
        refundsAmount: 900,
        cancelledPercent: 10,
        completedPercent: 80,
      },
      {
        id: "e7",
        name: "لالا",
        tripsCount: 11,
        tripsAmount: 23000,
        assignedCount: 10,
        assignedAmount: 21000,
        refundsCount: 2,
        refundsAmount: 1800,
        cancelledPercent: 18,
        completedPercent: 72,
      },
    ],
  },
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

function AccountReportTable({ account }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="text-right">
          <h3 className="text-sm font-bold text-gray-800">{account.accountName}</h3>
          <p className="text-xs text-gray-400 mt-0.5" dir="ltr">{account.accountPhone}</p>
          <p className="text-sm font-bold text-[#9C6402] mt-2">
            الدخل: {fmtMoney(account.income)}{" "}
            <span className="text-xs font-normal text-gray-400">ر.س</span>
          </p>
        </div>
        <span className="text-xs text-gray-500 bg-gray-50 border border-gray-100 rounded-full px-3 py-1 self-start sm:self-auto">
          {account.employees.length} موظف
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-right">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 whitespace-nowrap">اسم الموظف</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 whitespace-nowrap">عدد المشاوير داخل الأكونت</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 whitespace-nowrap">المبلغ</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 whitespace-nowrap">عدد الإسناد</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 whitespace-nowrap">المبلغ</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 whitespace-nowrap">عدد الإرجاعات</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 whitespace-nowrap">المبلغ</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 whitespace-nowrap">نسبة الملغي على الكل</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 whitespace-nowrap">نسبة اللي تم على الكل</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {account.employees.map((emp) => (
              <tr key={emp.id} className="hover:bg-gray-50/60">
                <td className="px-4 py-3 font-medium text-gray-800 whitespace-nowrap">{emp.name}</td>
                <td className="px-4 py-3 text-gray-700 font-semibold whitespace-nowrap">{emp.tripsCount}</td>
                <td className="px-4 py-3 text-[#9C6402] font-medium whitespace-nowrap">
                  {fmtMoney(emp.tripsAmount)} <span className="text-gray-400 text-[11px] font-normal">ر.س</span>
                </td>
                <td className="px-4 py-3 text-gray-700 font-semibold whitespace-nowrap">{emp.assignedCount}</td>
                <td className="px-4 py-3 text-[#9C6402] font-medium whitespace-nowrap">
                  {fmtMoney(emp.assignedAmount)} <span className="text-gray-400 text-[11px] font-normal">ر.س</span>
                </td>
                <td className="px-4 py-3 text-gray-700 font-semibold whitespace-nowrap">{emp.refundsCount}</td>
                <td className="px-4 py-3 text-[#9C6402] font-medium whitespace-nowrap">
                  {fmtMoney(emp.refundsAmount)} <span className="text-gray-400 text-[11px] font-normal">ر.س</span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <PercentCell value={emp.cancelledPercent} tone="danger" />
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <PercentCell value={emp.completedPercent} tone="success" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function ReportsPage() {
  const { searchQuery } = useGlobalSearch();
  const [accountFilter, setAccountFilter] = useState("");

  const accounts = useMemo(() => {
    let list = MOCK_ACCOUNT_REPORTS;
    if (accountFilter) {
      list = list.filter((a) => a.accountId === accountFilter);
    }

    const term = searchQuery.trim().toLowerCase();
    if (!term) return list;

    return list
      .map((account) => {
        const accountMatch =
          account.accountName.toLowerCase().includes(term)
          || account.accountPhone.includes(term);

        const employees = accountMatch
          ? account.employees
          : account.employees.filter((e) => e.name.toLowerCase().includes(term));

        return { ...account, employees };
      })
      .filter((account) => account.employees.length > 0);
  }, [searchQuery, accountFilter]);

  return (
    <div className="w-full space-y-5 pb-8" dir="rtl">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="text-right">
          <h1 className="text-xl font-bold text-gray-800">تقارير الأكاونتات</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            تقارير أداء الموظفين داخل الأكونتات — بيانات تجريبية مؤقتة إلى حين ربط الـ API
          </p>
        </div>
        <div className="relative w-full sm:w-64">
          <select
            value={accountFilter}
            onChange={(e) => setAccountFilter(e.target.value)}
            className="w-full h-10 border border-gray-200 rounded-xl px-4 text-sm focus:border-[#c9a84c] focus:outline-none bg-white text-right appearance-none"
          >
            <option value="">كل الأكونتات</option>
            {MOCK_ACCOUNT_REPORTS.map((account) => (
              <option key={account.accountId} value={account.accountId}>
                {account.accountName}
              </option>
            ))}
          </select>
          <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>

      {accounts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 py-16 text-center text-sm text-gray-400">
          لا توجد نتائج مطابقة
        </div>
      ) : (
        <div className="space-y-4">
          {accounts.map((account) => (
            <AccountReportTable key={account.accountId} account={account} />
          ))}
        </div>
      )}
    </div>
  );
}
