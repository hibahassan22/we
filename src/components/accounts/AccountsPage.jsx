import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useGlobalSearch } from "../../hooks/useGlobalSearch";
import { filterByGlobalSearch } from "../../lib/searchUtils";
import {
  fetchAccountsSummary,
  fetchMonthlyReport,
  buildEmployeeFinance,
} from "../../services/accountsService";
import { fetchApprovedPayments, normalizeApprovedPayment } from "../../services/paymentRequestService.js";
import { fetchAllRefunds } from "../../services/refundService";
import RefundHandleModal from "../approvals/RefundHandleModal";
import { exportToExcel } from "../../lib/exportExcel.js";
import { useToast } from "../../lib/toast.jsx";
import {
  getAllAccountMeta,
  enrichUserWithAccount,
  groupUsersByAccount,
  formatAccountPhone,
  syncAccountMetaFromSales,
} from "../../services/accountRegistryService.js";
import { salesRecordToUser } from "../../services/salesService.js";

const BASE = "https://drivo1.elmoroj.com/api";

const TABS = [
  { id: "payments", label: "الدفعات", route: "/accounts/payments" },
  { id: "employees", label: "الأكاونتات", route: "/accounts/employees" },
  { id: "refunds", label: "الاستردادات", route: "/accounts/refunds" },
  { id: "expenses", label: "المصروفات", route: "/accounts/expenses" },
];

const fmtMoney = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n.toLocaleString("en-US") : "0";
};

const fmtDate = (v) => {
  if (!v) return "—";
  const d = new Date(String(v).replace(" ", "T"));
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-GB");
};

function SummaryCard({ label, value, icon }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center justify-between gap-3">
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 text-white"
        style={{ background: "linear-gradient(135deg,#9C6402,#E6C76A)" }}
      >
        {icon}
      </div>
      <div className="text-right flex-1 min-w-0">
        <p className="text-[11px] text-gray-400">{label}</p>
        <p className="text-xl font-extrabold text-gray-800 mt-0.5">{fmtMoney(value)} <span className="text-xs font-normal text-gray-400">ر.س</span></p>
      </div>
    </div>
  );
}

function TabBar({ active, onChange }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-1.5 flex flex-wrap gap-1">
      {TABS.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onChange(t)}
          className={`flex-1 min-w-[5.5rem] py-2.5 px-3 rounded-xl text-sm font-semibold transition-all ${
            active === t.id
              ? "bg-[#faf7f0] text-[#9C6402] shadow-sm border border-amber-100"
              : "text-gray-400 hover:text-gray-600 hover:bg-gray-50"
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

function PaymentCard({ p }) {
  const [showProof, setShowProof] = useState(false);

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-4">
      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
        <div className="flex-1 text-right space-y-2 min-w-0">
          <div className="flex flex-wrap items-center justify-end gap-2">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-600">
              معتمدة
            </span>
            <span className="text-xs text-gray-400">#{p.id}</span>
          </div>
          <p className="text-sm font-bold text-gray-800">رحلة #{p.tripId} — السائق: {p.driverName}</p>
          <div className="space-y-1 text-xs text-gray-600">
            <p>
              <span className="text-gray-400">المبلغ: </span>
              <span className="font-semibold text-gray-800">{fmtMoney(p.amount)} ر.س</span>
            </p>
            <p>
              <span className="text-gray-400">تاريخ الدفع: </span>
              {p.paymentDate ? fmtDate(p.paymentDate) : "—"}
            </p>
            <p>
              <span className="text-gray-400">طريقة التحويل: </span>
              {p.transferMethod || "—"}
            </p>
            <p dir="ltr" className="text-right">
              <span className="text-gray-400">من: </span>
              {p.fromAccount || "—"}
            </p>
            <p dir="ltr" className="text-right">
              <span className="text-gray-400">إلى: </span>
              {p.toAccount || "—"}
            </p>
            {p.notes && (
              <p>
                <span className="text-gray-400">ملاحظات: </span>
                {p.notes}
              </p>
            )}
          </div>
        </div>

        {p.transferImage && (
          <div className="shrink-0 flex flex-col items-end sm:items-start gap-2">
            {!showProof ? (
              <button
                type="button"
                onClick={() => setShowProof(true)}
                className="text-xs font-semibold text-[#9C6402] hover:text-[#7a4f02] underline underline-offset-2"
              >
                صورة إثبات
              </button>
            ) : (
              <div className="space-y-2 text-right">
                <a
                  href={p.transferImage}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                >
                  <img
                    src={p.transferImage}
                    alt="إثبات التحويل"
                    className="max-h-32 max-w-[160px] rounded-lg border border-gray-200 object-contain"
                  />
                </a>
                <button
                  type="button"
                  onClick={() => setShowProof(false)}
                  className="text-[10px] text-gray-400 hover:text-gray-600"
                >
                  إخفاء الصورة
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function PaymentsTab({ payments, loading }) {
  if (loading) return <LoadingBlock />;
  if (!payments.length) {
    return <EmptyBlock text="لا توجد دفعات معتمدة حالياً" />;
  }

  return (
    <div className="space-y-3">
      {payments.map((p) => (
        <PaymentCard key={p.id} p={p} />
      ))}
    </div>
  );
}

function getSaleTarget(sale) {
  const n = Number(sale?.target ?? sale?.main_target ?? sale?.admin_target ?? 0);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function AccountsTab({ accounts, loading }) {
  const [selectedKey, setSelectedKey] = useState("");

  useEffect(() => {
    if (!accounts.length) {
      setSelectedKey("");
      return;
    }
    if (!selectedKey || !accounts.some((a) => a.accountKey === selectedKey)) {
      setSelectedKey(accounts[0].accountKey);
    }
  }, [accounts, selectedKey]);

  if (loading) return <LoadingBlock />;
  if (!accounts.length) return <EmptyBlock text="لا توجد أكونتات" />;

  const selected = accounts.find((a) => a.accountKey === selectedKey) ?? accounts[0];
  const target = selected?.target ?? 0;
  const achieved = selected?.achieved ?? 0;
  const percent = target > 0 ? Math.min(100, Math.round((achieved / target) * 1000) / 10) : 0;

  return (
    <div className="space-y-4" dir="rtl">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <label className="text-xs font-medium text-gray-500 block text-right mb-1.5">اختر الأكونت</label>
        <div className="relative">
          <select
            value={selected?.accountKey ?? ""}
            onChange={(e) => setSelectedKey(e.target.value)}
            className="w-full h-11 border border-gray-200 rounded-xl px-4 text-sm focus:border-[#c9a84c] focus:outline-none bg-white text-right appearance-none"
          >
            {accounts.map((account) => (
              <option key={account.accountKey} value={account.accountKey}>
                {account.accountName || "بدون اسم"}
                {account.accountPhoneDisplay ? ` — ${account.accountPhoneDisplay}` : ""}
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

      {selected && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#9C6402] to-[#E6C76A] flex items-center justify-center text-white font-bold shrink-0">
              {(selected.accountName?.[0] || "#").toUpperCase()}
            </div>
            <div className="text-right min-w-0">
              <h2 className="text-lg font-bold text-gray-800 truncate">{selected.accountName || "—"}</h2>
              <p className="text-xs text-gray-400 mt-0.5" dir="ltr">
                {selected.accountPhoneDisplay || formatAccountPhone(selected.accountNumber) || "—"}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-xl border border-amber-100 bg-[#faf7f0] p-4 text-right">
              <p className="text-[11px] text-gray-400">التارجت</p>
              <p className="text-2xl font-extrabold text-gray-800 mt-1">
                {fmtMoney(target)}
                <span className="text-xs font-normal text-gray-400 mr-1">ر.س</span>
              </p>
            </div>
            <div className="rounded-xl border border-amber-100 bg-[#faf7f0] p-4 text-right">
              <p className="text-[11px] text-gray-400">نسبة التارجت</p>
              <p className="text-2xl font-extrabold text-[#9C6402] mt-1">
                {percent}
                <span className="text-sm font-bold mr-0.5">%</span>
              </p>
              <div className="mt-3 h-2 rounded-full bg-white/80 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-l from-[#9C6402] to-[#E6C76A] transition-all"
                  style={{ width: `${Math.min(100, percent)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function RefundsTab({ refunds, loading, onRefresh }) {
  const [modal, setModal] = useState(null);

  if (loading) return <LoadingBlock />;
  if (!refunds.length) return <EmptyBlock text="لا توجد طلبات استرداد" />;

  return (
    <>
      <div className="space-y-3">
        {refunds.map((r) => {
          const status = String(r.status ?? "pending").toLowerCase();
          const pending = status === "pending" || status === "معلق" || status === "بانتظار";
          return (
            <div key={r.id ?? r.tripId} className="bg-white border border-gray-100 rounded-2xl p-4 text-right space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${pending ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"}`}>
                  {pending ? "معلق" : "تمت المعالجة"}
                </span>
                <p className="text-sm font-bold text-gray-800">رحلة #{r.tripId ?? r.trip_id}</p>
              </div>
              <p className="text-xs text-gray-500">{r.refund_reason ?? r.reason ?? "—"}</p>
              <p className="text-sm font-semibold text-gray-800">
                {fmtMoney(r.proposed_refund_amount ?? r.proposedAmount)} ر.س
              </p>
              {pending && (
                <button
                  type="button"
                  onClick={() => setModal(r)}
                  className="w-full mt-1 py-2 rounded-xl bg-[#c9a84c] hover:bg-[#b8973d] text-white text-sm font-medium"
                >
                  معالجة طلب الاسترداد
                </button>
              )}
            </div>
          );
        })}
      </div>
      <RefundHandleModal
        isOpen={!!modal}
        onClose={() => setModal(null)}
        refund={modal}
        onSuccess={onRefresh}
      />
    </>
  );
}

function ExpensesTab({ expenses, loading, onRefresh }) {
  const toast = useToast();
  const [form, setForm] = useState({ type: "", amount_sar: "", amount_egp: "", expense_date: "", description: "" });
  const [saving, setSaving] = useState(false);

  if (loading) return <LoadingBlock />;

  const handleAdd = async () => {
    if (!form.type.trim() || !form.amount_sar) {
      toast.error("أدخل نوع المصروف والمبلغ");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`${BASE}/expenses`, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({
          type: form.type.trim(),
          amount_sar: Number(form.amount_sar),
          amount_egp: Number(form.amount_egp || 0),
          expense_date: form.expense_date || new Date().toISOString().slice(0, 10),
          description: form.description.trim(),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.message || `HTTP ${res.status}`);
      toast.success("تم إضافة المصروف");
      setForm({ type: "", amount_sar: "", amount_egp: "", expense_date: "", description: "" });
      onRefresh?.();
    } catch (err) {
      toast.error(err.message || "فشل إضافة المصروف");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white border border-gray-100 rounded-2xl p-4 space-y-3">
        <h3 className="text-sm font-bold text-[#c9a84c] text-right">إضافة مصروف</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm text-right"
            placeholder="نوع المصروف"
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
          />
          <input
            type="number"
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm text-right"
            placeholder="المبلغ (ر.س)"
            value={form.amount_sar}
            onChange={(e) => setForm({ ...form, amount_sar: e.target.value })}
            dir="ltr"
          />
          <input
            type="number"
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm text-right"
            placeholder="المبلغ (ج.م)"
            value={form.amount_egp}
            onChange={(e) => setForm({ ...form, amount_egp: e.target.value })}
            dir="ltr"
          />
          <input
            type="date"
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm text-right"
            value={form.expense_date}
            onChange={(e) => setForm({ ...form, expense_date: e.target.value })}
          />
          <input
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm text-right sm:col-span-2"
            placeholder="الوصف"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>
        <button
          type="button"
          disabled={saving}
          onClick={handleAdd}
          className="w-full py-2.5 rounded-xl bg-[#4a4746] text-white text-sm font-semibold disabled:opacity-50"
        >
          {saving ? "جاري الحفظ..." : "إضافة"}
        </button>
      </div>

      {!expenses.length ? (
        <EmptyBlock text="لا توجد مصروفات" />
      ) : (
        <div className="space-y-2">
          {expenses.map((e, i) => (
            <div key={e.id ?? i} className="bg-white border border-gray-100 rounded-2xl p-4 flex justify-between gap-3 text-right">
              <div>
                <p className="text-sm font-bold text-gray-800">{e.type}</p>
                <p className="text-xs text-gray-400 mt-0.5">{e.description || "—"}</p>
                <p className="text-[11px] text-gray-400 mt-1">{e.expense_date ?? "—"}</p>
              </div>
              <p className="text-sm font-bold text-gray-800 shrink-0">{fmtMoney(e.amount_sar)} ر.س</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function LoadingBlock() {
  return (
    <div className="flex justify-center py-16">
      <div className="w-10 h-10 border-4 border-[#c9a84c] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function EmptyBlock({ text }) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl py-12 text-center text-sm text-gray-400">
      {text}
    </div>
  );
}

export default function AccountsPage() {
  const navigate = useNavigate();
  const { tab } = useParams();
  const activeTab = TABS.some((t) => t.id === tab) ? tab : "payments";
  const { searchQuery } = useGlobalSearch();
  const toast = useToast();

  const [summary, setSummary] = useState(null);
  const [monthlyReport, setMonthlyReport] = useState(null);
  const [refunds, setRefunds] = useState([]);
  const [approvedPayments, setApprovedPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sum, report, refundsData, paymentsData] = await Promise.all([
        fetchAccountsSummary(),
        fetchMonthlyReport().catch(() => null),
        fetchAllRefunds().catch(() => []),
        fetchApprovedPayments().catch(() => []),
      ]);
      setSummary(sum);
      setMonthlyReport(report);
      setRefunds(refundsData);
      setApprovedPayments(paymentsData.map(normalizeApprovedPayment));
    } catch {
      setSummary(null);
      setMonthlyReport(null);
      setRefunds([]);
      setApprovedPayments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const payments = useMemo(() => approvedPayments, [approvedPayments]);

  const employeesFinance = useMemo(
    () => buildEmployeeFinance(summary?.sales ?? [], summary?.trips ?? [], refunds.length ? refunds : (summary?.refunds ?? [])),
    [summary, refunds],
  );

  const financeById = useMemo(() => {
    const map = new Map();
    employeesFinance.forEach((emp) => map.set(String(emp.id), emp));
    return map;
  }, [employeesFinance]);

  const accountsList = useMemo(() => {
    const sales = summary?.sales ?? [];
    syncAccountMetaFromSales(sales);
    const meta = getAllAccountMeta();
    const enriched = sales.map((sale) => {
      const user = enrichUserWithAccount(salesRecordToUser(sale), meta[String(sale.id)]);
      const finance = financeById.get(String(sale.id));
      return {
        ...user,
        name: sale.name,
        target: getSaleTarget(sale),
        revenue: finance?.revenue ?? 0,
        role_id: sale.role_id,
      };
    });

    return groupUsersByAccount(enriched).map((account) => {
      const members = account.members ?? [];
      const target = members.reduce((sum, m) => sum + getSaleTarget(m), 0);
      const achieved = members.reduce((sum, m) => sum + (Number(m.revenue) || 0), 0);
      return {
        ...account,
        target,
        achieved,
        members,
      };
    });
  }, [summary, financeById]);

  const filteredPayments = filterByGlobalSearch(payments, searchQuery, (p) => [
    p.driverName, p.notes, String(p.amount), String(p.tripId),
    p.fromAccount, p.toAccount, p.transferMethod,
  ]);
  const filteredAccounts = filterByGlobalSearch(accountsList, searchQuery, (a) => [
    a.accountName,
    a.accountPhoneDisplay,
    a.accountNumber,
    ...(a.members ?? []).flatMap((m) => [m.fullName, m.name, m.email, m.phone]),
  ]);
  const filteredRefunds = filterByGlobalSearch(refunds, searchQuery, (r) => [
    r.tripId, r.trip_id, r.refund_reason, r.reason,
  ]);
  const filteredExpenses = filterByGlobalSearch(summary?.expenses ?? [], searchQuery, (e) => [
    e.type, e.description,
  ]);

  const handleExport = () => {
    let rows = [];
    let filename = "الحسابات";

    if (activeTab === "payments") {
      filename = "الدفعات";
      rows = filteredPayments.map((p) => ({
        "رقم الدفعة": p.id ?? "—",
        "رقم الرحلة": p.tripId ?? "—",
        "السائق": p.driverName ?? "—",
        "المبلغ (ر.س)": p.amount ?? 0,
        "تاريخ الدفع": p.paymentDate ? fmtDate(p.paymentDate) : "—",
        "طريقة التحويل": p.transferMethod || "—",
        "من حساب": p.fromAccount || "—",
        "إلى حساب": p.toAccount || "—",
        "ملاحظات": p.notes || "—",
        "الحالة": "معتمدة",
      }));
    } else if (activeTab === "employees") {
      filename = "الأكاونتات";
      rows = filteredAccounts.map((a) => {
        const target = a.target ?? 0;
        const achieved = a.achieved ?? 0;
        const percent = target > 0 ? Math.round((achieved / target) * 1000) / 10 : 0;
        return {
          "اسم الأكونت": a.accountName ?? "—",
          "رقم الأكونت": a.accountPhoneDisplay || a.accountNumber || "—",
          "عدد الموظفين": a.memberCount ?? a.members?.length ?? 0,
          "التارجت (ر.س)": target,
          "المحقق (ر.س)": achieved,
          "نسبة التارجت %": percent,
        };
      });
    } else if (activeTab === "refunds") {
      filename = "الاستردادات";
      rows = filteredRefunds.map((r) => {
        const status = String(r.status ?? "pending").toLowerCase();
        const pending = status === "pending" || status === "معلق";
        return {
          "رقم الرحلة": r.tripId ?? r.trip_id ?? "—",
          "المبلغ المقترح (ر.س)": r.proposed_refund_amount ?? r.proposedAmount ?? "—",
          "السبب": r.refund_reason ?? r.reason ?? "—",
          "الحالة": pending ? "معلق" : "تمت المعالجة",
        };
      });
    } else if (activeTab === "expenses") {
      filename = "المصروفات";
      rows = filteredExpenses.map((e) => ({
        "النوع": e.type ?? "—",
        "المبلغ (ريال)": e.amount_sar ?? 0,
        "المبلغ (جنية)": e.amount_egp ?? 0,
        "التاريخ": e.expense_date ?? "—",
        "الوصف": e.description || "—",
      }));
    }

    try {
      exportToExcel(rows, filename);
      toast.success("تم تصدير البيانات بنجاح");
    } catch (err) {
      toast.error(err.message || "فشل التصدير");
    }
  };

  return (
    <div className="space-y-5" dir="rtl">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-right">
        <div>
          <h1 className="text-xl font-bold text-[#c9a84c]">الإدارة المالية المتقدمة</h1>
          <p className="text-xs text-gray-400 mt-0.5">نظام شامل لإدارة الوارد والمصروفات والأكونتات</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button type="button" onClick={handleExport} className="px-4 py-2 bg-[#c9a84c] hover:bg-[#b8973d] rounded-xl text-sm font-bold text-white">
            تصدير
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <SummaryCard
          label="إجمالي الوارد"
          value={monthlyReport?.totalIncome ?? summary?.totalIncome ?? 0}
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <SummaryCard
          label="إجمالي المصروفات"
          value={monthlyReport?.totalExpenses ?? summary?.totalExpenses ?? 0}
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}
        />
        <SummaryCard
          label="إجمالي الاسترجاعات"
          value={monthlyReport?.totalRefunds ?? summary?.totalRefunds ?? 0}
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>}
        />
        <SummaryCard
          label="صافي الربح"
          value={monthlyReport?.netProfit ?? summary?.netProfit ?? 0}
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>}
        />
      </div>

      <TabBar
        active={activeTab}
        onChange={(t) => navigate(t.route)}
      />

      {activeTab === "payments" && <PaymentsTab payments={filteredPayments} loading={loading} />}
      {activeTab === "employees" && <AccountsTab accounts={filteredAccounts} loading={loading} />}
      {activeTab === "refunds" && <RefundsTab refunds={filteredRefunds} loading={loading} onRefresh={load} />}
      {activeTab === "expenses" && <ExpensesTab expenses={filteredExpenses} loading={loading} onRefresh={load} />}
    </div>
  );
}
