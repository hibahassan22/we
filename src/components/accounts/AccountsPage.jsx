import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useGlobalSearch } from "../../hooks/useGlobalSearch";
import { filterByGlobalSearch } from "../../lib/searchUtils";
import { fetchAccountsSummary, extractTripPayments } from "../../services/accountsService";
import { fetchAllRefunds } from "../../services/refundService";
import RefundHandleModal from "../approvals/RefundHandleModal";

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

const pctChange = () => "+18%";

function SummaryCard({ label, value, icon, trendColor = "text-green-500" }) {
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
        <p className={`text-[10px] mt-1 ${trendColor}`}>{pctChange()} عن الشهر الماضي</p>
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

function PaymentsTab({ payments, loading }) {
  if (loading) return <LoadingBlock />;
  if (!payments.length) {
    return <EmptyBlock text="لا توجد دفعات مسجّلة حالياً" />;
  }

  return (
    <div className="space-y-3">
      {payments.map((p) => (
        <div key={p.id} className="bg-white border border-gray-100 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center gap-4">
          <button
            type="button"
            className="flex items-center justify-center gap-2 bg-[#4a4644] hover:bg-black text-white text-sm font-bold px-5 py-2.5 rounded-xl shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            مراجعة
          </button>
          <div className="flex-1 text-right space-y-2 min-w-0">
            <div className="flex flex-wrap items-center justify-end gap-2">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${p.registered ? "bg-green-100 text-green-600" : "bg-amber-100 text-amber-600"}`}>
                {p.registered ? "مسجّل" : "غير مسجّل"}
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">قيد المراجعة</span>
            </div>
            <p className="text-sm font-bold text-gray-800">{p.customerName}</p>
            <p className="text-xs text-gray-500">سبب الدفعة: {p.note || "—"}</p>
            <div className="flex flex-wrap items-center justify-end gap-3 text-xs text-gray-400">
              <span>{fmtMoney(p.amount)} ر.س</span>
              <span>{p.date ? fmtDate(p.date) : "—"}</span>
              <span dir="ltr">{p.phone}</span>
            </div>
          </div>
        </div>
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

  const totalMonth = expenses.reduce((s, e) => s + (Number(e.amount_sar) || 0), 0);
  const opening = 2324;
  const carried = 1670;
  const remaining = Math.max(0, opening - totalMonth);

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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "الرصيد الافتتاحي (العهدة)", value: opening, sub: "ر.س" },
          { label: "المرحل للشهر القادم", value: carried, sub: "ر.س" },
          { label: "المصروفات خلال هذا الشهر", value: totalMonth, sub: "ر.س", bar: true, barPct: Math.min(100, (totalMonth / opening) * 100), barColor: "bg-red-400" },
          { label: "المتبقي", value: remaining, sub: "ر.س", bar: true, barPct: Math.min(100, (remaining / opening) * 100), barColor: "bg-green-400" },
        ].map((c) => (
          <div key={c.label} className="bg-white border border-gray-100 rounded-2xl p-4 text-right">
            <p className="text-[11px] text-gray-400">{c.label}</p>
            <p className="text-lg font-extrabold text-gray-800 mt-1">{fmtMoney(c.value)} <span className="text-xs font-normal">{c.sub}</span></p>
            {c.bar && (
              <div className="h-1.5 bg-gray-100 rounded-full mt-3 overflow-hidden">
                <div className={`h-full rounded-full ${c.barColor}`} style={{ width: `${c.barPct}%` }} />
              </div>
            )}
          </div>
        ))}
      </div>

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
  const activeTab = TABS.some((t) => t.id === tabParam) ? tabParam : "employees";
  const { searchQuery } = useGlobalSearch();

  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [refunds, setRefunds] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [data, refundsData] = await Promise.all([
        fetchAccountsSummary(),
        fetchAllRefunds().catch(() => []),
      ]);
      setSummary(data);
      setRefunds(refundsData);
    } catch {
      setSummary(null);
      setRefunds([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const payments = useMemo(
    () => extractTripPayments(summary?.trips ?? []),
    [summary?.trips]
  );

  const filteredPayments = filterByGlobalSearch(payments, searchQuery, (p) => [
    p.customerName, p.phone, p.note, String(p.amount),
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

  return (
    <div className="space-y-5" dir="rtl">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-right">
        <div>
          <h1 className="text-xl font-bold text-[#c9a84c]">الإدارة المالية المتقدمة</h1>
          <p className="text-xs text-gray-400 mt-0.5">نظام شامل لإدارة الوارد والمصروفات والموظفين</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button type="button" className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 bg-white hover:bg-gray-50">
            تصفية
          </button>
          <button type="button" className="px-4 py-2 bg-[#c9a84c] hover:bg-[#b8973d] rounded-xl text-sm font-bold text-white">
            تصدير
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <SummaryCard
          label="إجمالي الوارد"
          value={summary?.totalIncome ?? 0}
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <SummaryCard
          label="إجمالي المصروفات"
          value={summary?.totalExpenses ?? 0}
          trendColor="text-red-500"
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}
        />
        <SummaryCard
          label="إجمالي الاسترجاعات"
          value={summary?.totalRefunds ?? 0}
          trendColor="text-teal-500"
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>}
        />
        <SummaryCard
          label="صافي الربح"
          value={summary?.netProfit ?? 0}
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
