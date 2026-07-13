import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useGlobalSearch } from "../../hooks/useGlobalSearch";
import { filterByGlobalSearch } from "../../lib/searchUtils";
import { fetchAccountsSummary, fetchMonthlyReport } from "../../services/accountsService";
import { fetchApprovedPayments, normalizeApprovedPayment } from "../../services/paymentRequestService.js";
import { fetchAllRefunds } from "../../services/refundService";
import RefundHandleModal from "../approvals/RefundHandleModal";
import { exportToExcel } from "../../lib/exportExcel.js";
import { useToast } from "../../lib/toast.jsx";

const BASE = "https://drivo1.elmoroj.com/api";

const TABS = [
  { id: "payments", label: "الدفعات", route: "/accounts/payments" },
  { id: "employees", label: "الموظفين", route: "/accounts/employees" },
  { id: "refunds", label: "الاستردادات", route: "/accounts/refunds" },
  { id: "expenses", label: "المصروفات", route: "/accounts/expenses" },
];

const fmtMoney = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n.toLocaleString("en-US") : "0";
};

const fmtDate = (v) => {
  if (!v) return "—";
  const d = new Date(v);
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

function EmployeesTab({ sales, loading }) {
  if (loading) return <LoadingBlock />;
  if (!sales.length) return <EmptyBlock text="لا يوجد موظفين" />;

  return (
    <div className="space-y-3">
      {sales.map((s) => {
        const target = Number(s.target ?? s.admin_target ?? 0);
        const mainTarget = Number(s.main_target ?? 0) || 1;
        const pct = Math.min(100, Math.round((target / mainTarget) * 100)) || 0;
        return (
          <div key={s.id} className="bg-white border border-gray-100 rounded-2xl p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-1 rounded-full shrink-0">
                {pct}% من الهدف
              </span>
              <div className="text-right flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-800">{s.name}</p>
                <p className="text-xs text-gray-400 mt-0.5" dir="ltr">{s.phone}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#9C6402] to-[#E6C76A] flex items-center justify-center text-white font-bold text-sm shrink-0">
                {(s.name?.[0] ?? "م").toUpperCase()}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                { label: "الصافي", val: target * 0.4 },
                { label: "الربح", val: target * 0.35 },
                { label: "إجمالي المدخلات", val: target },
              ].map((box) => (
                <div key={box.label} className="bg-[#faf7f0] rounded-xl py-2 px-1">
                  <p className="text-[10px] text-gray-400">{box.label}</p>
                  <p className="text-sm font-bold text-gray-800">{fmtMoney(box.val)} <span className="text-[10px] font-normal">ريال</span></p>
                </div>
              ))}
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "linear-gradient(90deg,#9C6402,#E6C76A)" }} />
            </div>
          </div>
        );
      })}
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
          const pending = status === "pending" || status === "معلق";
          return (
            <div key={r.id ?? r.tripId} className="bg-white border border-gray-100 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-end gap-2 flex-wrap">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${pending ? "bg-amber-100 text-amber-600" : "bg-green-100 text-green-600"}`}>
                  {pending ? "معلق" : "تمت المعالجة"}
                </span>
                <p className="text-sm font-bold text-gray-800">طلب استرداد — رحلة #{r.tripId ?? r.trip_id}</p>
              </div>
              <div className="bg-[#faf7f0] rounded-xl p-3 text-xs text-right space-y-1">
                <div className="flex justify-between gap-2"><span>{fmtMoney(r.proposed_refund_amount ?? r.proposedAmount)} ر.س</span><span className="text-gray-500">المبلغ المقترح</span></div>
                <div className="flex justify-between gap-2"><span>{r.refund_reason ?? r.reason ?? "—"}</span><span className="text-gray-500">السبب</span></div>
              </div>
              {pending && (
                <button
                  type="button"
                  onClick={() => setModal(r)}
                  className="w-full py-2.5 bg-[#c9a84c] hover:bg-[#b8973d] text-white text-sm font-bold rounded-xl"
                >
                  معالجة الطلب
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
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ type: "", amount_sar: "", amount_egp: "", expense_date: "", description: "" });
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    if (!form.type.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`${BASE}/expenses`, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({
          type: form.type.trim(),
          amount_sar: Number(form.amount_sar) || 0,
          amount_egp: Number(form.amount_egp) || 0,
          expense_date: form.expense_date || new Date().toISOString().slice(0, 10),
          description: form.description?.trim() || "",
        }),
      });
      if (!res.ok) throw new Error("فشل الإضافة");
      setShowAdd(false);
      setForm({ type: "", amount_sar: "", amount_egp: "", expense_date: "", description: "" });
      onRefresh();
    } catch {
      alert("فشل إضافة المصروف");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingBlock />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 bg-[#4a4644] hover:bg-black text-white text-sm font-bold px-4 py-2.5 rounded-xl"
        >
          + إضافة مصروف
        </button>
        <h3 className="text-sm font-bold text-gray-800">قائمة المصروفات</h3>
      </div>

      {expenses.length === 0 ? (
        <EmptyBlock text="لا توجد مصروفات" />
      ) : (
        <div className="bg-white border border-gray-100 rounded-2xl overflow-x-auto">
          <table className="w-full text-sm text-right">
            <thead>
              <tr className="bg-[#faf7f0] border-b border-gray-100">
                <th className="px-4 py-3 text-xs font-semibold text-gray-500">النوع</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500">المبلغ (ريال)</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500">المبلغ (جنية)</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500">التاريخ</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500">الوصف</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {expenses.map((e) => (
                <tr key={e.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3 font-medium text-gray-800">{e.type}</td>
                  <td className="px-4 py-3 text-gray-600">{fmtMoney(e.amount_sar)}</td>
                  <td className="px-4 py-3 text-gray-600">{fmtMoney(e.amount_egp)}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{e.expense_date}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{e.description || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowAdd(false)}>
          <div className="bg-white rounded-2xl p-5 w-full max-w-md space-y-3" dir="rtl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-bold text-gray-800 text-right">إضافة مصروف</h3>
            <input className="w-full border rounded-xl px-3 py-2 text-sm text-right" placeholder="النوع" value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))} />
            <div className="grid grid-cols-2 gap-2">
              <input className="border rounded-xl px-3 py-2 text-sm" placeholder="ريال" dir="ltr" value={form.amount_sar} onChange={(e) => setForm((p) => ({ ...p, amount_sar: e.target.value }))} />
              <input className="border rounded-xl px-3 py-2 text-sm" placeholder="جنية" dir="ltr" value={form.amount_egp} onChange={(e) => setForm((p) => ({ ...p, amount_egp: e.target.value }))} />
            </div>
            <input type="date" className="w-full border rounded-xl px-3 py-2 text-sm" value={form.expense_date} onChange={(e) => setForm((p) => ({ ...p, expense_date: e.target.value }))} />
            <input className="w-full border rounded-xl px-3 py-2 text-sm text-right" placeholder="الوصف" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
            <div className="flex gap-2 justify-end pt-2">
              <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2 border rounded-xl text-sm">إلغاء</button>
              <button type="button" disabled={saving} onClick={handleAdd} className="px-4 py-2 bg-[#c9a84c] text-white rounded-xl text-sm font-bold disabled:opacity-60">
                {saving ? "جارٍ الحفظ..." : "إضافة"}
              </button>
            </div>
          </div>
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
    <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 text-sm text-gray-400">
      {text}
    </div>
  );
}

export default function AccountsPage() {
  const navigate = useNavigate();
  const { tab: tabParam } = useParams();
  const activeTab = TABS.some((t) => t.id === tabParam) ? tabParam : "payments";
  const { searchQuery } = useGlobalSearch();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [monthlyReport, setMonthlyReport] = useState(null);
  const [refunds, setRefunds] = useState([]);
  const [approvedPayments, setApprovedPayments] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [data, report, refundsData, paymentsData] = await Promise.all([
        fetchAccountsSummary(),
        fetchMonthlyReport().catch(() => null),
        fetchAllRefunds().catch(() => []),
        fetchApprovedPayments().catch(() => []),
      ]);
      setSummary(data);
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

  const filteredPayments = filterByGlobalSearch(payments, searchQuery, (p) => [
    p.driverName, p.notes, String(p.amount), String(p.tripId),
    p.fromAccount, p.toAccount, p.transferMethod,
  ]);
  const filteredSales = filterByGlobalSearch(summary?.sales ?? [], searchQuery, (s) => [
    s.name, s.phone, s.email,
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
      filename = "الموظفين";
      rows = filteredSales.map((s) => {
        const target = Number(s.target ?? s.admin_target ?? 0);
        const mainTarget = Number(s.main_target ?? 0) || 1;
        const pct = Math.min(100, Math.round((target / mainTarget) * 100)) || 0;
        return {
          "الاسم": s.name ?? "—",
          "الهاتف": s.phone ?? "—",
          "البريد": s.email ?? "—",
          "إجمالي المدخلات": target,
          "الربح": target * 0.35,
          "الصافي": target * 0.4,
          "نسبة الهدف": `${pct}%`,
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
          <p className="text-xs text-gray-400 mt-0.5">نظام شامل لإدارة الوارد والمصروفات والموظفين</p>
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
      {activeTab === "employees" && <EmployeesTab sales={filteredSales} loading={loading} />}
      {activeTab === "refunds" && <RefundsTab refunds={filteredRefunds} loading={loading} onRefresh={load} />}
      {activeTab === "expenses" && <ExpensesTab expenses={filteredExpenses} loading={loading} onRefresh={load} />}
    </div>
  );
}
