import { useState, useEffect, useCallback } from "react";
import AppModal from "./ui/AppModal";

const BASE = "https://drivo1.elmoroj.com/api";

const EMPTY_EXPENSE = {
  type: "",
  amount_sar: "",
  amount_egp: "",
  expense_date: "",
  description: "",
};

const TARGETS_INIT = [
  { id: 1, from: 0,     to: 5000,  pct: 0,  label: "ضعيف",  color: "red" },
  { id: 2, from: 5000,  to: 10000, pct: 5,  label: "موقوف", color: "orange" },
  { id: 3, from: 15000, to: 10000, pct: 10, label: "جيد",   color: "green" },
];

const COLOR_OPTIONS = [
  { value: "green",  label: "أخضر",   bg: "bg-green-500",  text: "text-white" },
  { value: "orange", label: "برتقالي", bg: "bg-orange-500", text: "text-white" },
  { value: "red",    label: "أحمر",   bg: "bg-red-500",    text: "text-white" },
  { value: "blue",   label: "أزرق",   bg: "bg-blue-500",   text: "text-white" },
];

const labelColorMap = {
  green:  { badge: "bg-green-500 text-white" },
  orange: { badge: "bg-orange-500 text-white" },
  red:    { badge: "bg-red-500 text-white" },
  blue:   { badge: "bg-blue-500 text-white" },
};

// ======= Modal wrapper — AppModal موحّد =======
function Modal({ title, onClose, children, isSubmitting = false, size = "md" }) {
  return (
    <AppModal isOpen onClose={onClose} title={title} isSubmitting={isSubmitting} size={size}>
      <div className="space-y-4">{children}</div>
    </AppModal>
  );
}

function ExpenseFormFields({ form, setForm, disabled }) {
  return (
    <>
      <div className="space-y-1">
        <label className="text-xs text-gray-500 text-right block">النوع</label>
        <input
          value={form.type}
          onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}
          placeholder="مثال: رواتب"
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 text-right placeholder-gray-300"
          dir="rtl"
          disabled={disabled}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs text-gray-500 text-right block">المبلغ (ريال)</label>
          <input
            type="number"
            step="0.01"
            value={form.amount_sar}
            onChange={(e) => setForm((p) => ({ ...p, amount_sar: e.target.value }))}
            placeholder="0.00"
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 text-right"
            dir="rtl"
            disabled={disabled}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-gray-500 text-right block">المبلغ (جنيه)</label>
          <input
            type="number"
            step="0.01"
            value={form.amount_egp}
            onChange={(e) => setForm((p) => ({ ...p, amount_egp: e.target.value }))}
            placeholder="0.00"
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 text-right"
            dir="rtl"
            disabled={disabled}
          />
        </div>
      </div>
      <div className="space-y-1">
        <label className="text-xs text-gray-500 text-right block">تاريخ المصروف</label>
        <input
          type="date"
          value={form.expense_date}
          onChange={(e) => setForm((p) => ({ ...p, expense_date: e.target.value }))}
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 text-right"
          dir="rtl"
          disabled={disabled}
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs text-gray-500 text-right block">الوصف</label>
        <textarea
          value={form.description}
          onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
          placeholder="وصف المصروف..."
          rows={3}
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 text-right placeholder-gray-300 resize-none"
          dir="rtl"
          disabled={disabled}
        />
      </div>
    </>
  );
}

function expenseToForm(item) {
  return {
    type: item?.type ?? "",
    amount_sar: item?.amount_sar ?? "",
    amount_egp: item?.amount_egp ?? "",
    expense_date: item?.expense_date ?? "",
    description: item?.description ?? "",
  };
}

function buildExpensePayload(form) {
  return {
    type: form.type.trim(),
    amount_sar: parseFloat(form.amount_sar) || 0,
    amount_egp: parseFloat(form.amount_egp) || 0,
    expense_date: form.expense_date || new Date().toISOString().slice(0, 10),
    description: form.description.trim(),
  };
}

// ======= Shared delete button =======
function DeleteBtn({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-6 h-6 rounded-md bg-red-500 flex items-center justify-center shrink-0 hover:bg-red-600 transition-colors"
    >
      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  );
}

// ======= Shared edit button =======
function EditBtn({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-6 h-6 rounded-md bg-blue-500 flex items-center justify-center shrink-0 hover:bg-blue-600 transition-colors"
      title="تعديل"
    >
      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    </button>
  );
}

// ======= Tab: أنواع المصروفات =======
function ExpenseTypesTab() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_EXPENSE);
  const [editingItem, setEditingItem] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY_EXPENSE);
  const [editLoading, setEditLoading] = useState(false);
  const [deletingItem, setDeletingItem] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchExpenseTypes = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const r = await fetch(`${BASE}/expenses`, {
        headers: { Accept: "application/json" },
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const d = await r.json();
      const list = Array.isArray(d?.data) ? d.data : (Array.isArray(d) ? d : []);
      setItems(list);
    } catch (err) {
      console.error("fetchExpenseTypes error:", err);
      setError("حدث خطأ أثناء تحميل المصروفات. يرجى التحقق من اتصال الشبكة.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchExpenseTypes();
  }, [fetchExpenseTypes]);

  const handleAdd = async () => {
    if (!form.type.trim()) return;
    setActionLoading(true);
    try {
      const r = await fetch(`${BASE}/expenses`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(buildExpensePayload(form)),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      await r.json();
      setForm(EMPTY_EXPENSE);
      setShowModal(false);
      fetchExpenseTypes();
    } catch (err) {
      console.error("handleAdd error:", err);
      alert("حدث خطأ أثناء إضافة المصروف");
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditClick = async (item) => {
    setEditingItem(item);
    setEditForm(expenseToForm(item));
    setEditLoading(true);
    try {
      const r = await fetch(`${BASE}/expenses/${item.id}`, {
        headers: { Accept: "application/json" },
      });
      if (r.ok) {
        const d = await r.json();
        if (d?.data) setEditForm(expenseToForm(d.data));
      }
    } catch (err) {
      console.error("fetchExpense error:", err);
    } finally {
      setEditLoading(false);
    }
  };

  const handleEdit = async () => {
    if (!editingItem || !editForm.type.trim()) return;
    setActionLoading(true);
    try {
      const r = await fetch(`${BASE}/expenses/${editingItem.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(buildExpensePayload(editForm)),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      await r.json();
      setEditingItem(null);
      setEditForm(EMPTY_EXPENSE);
      fetchExpenseTypes();
    } catch (err) {
      console.error("handleEdit error:", err);
      alert("حدث خطأ أثناء تعديل المصروف");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingItem) return;
    setActionLoading(true);
    try {
      const r = await fetch(`${BASE}/expenses/${deletingItem.id}`, {
        method: "DELETE",
        headers: { Accept: "application/json" },
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      await r.json();
      setDeletingItem(null);
      fetchExpenseTypes();
    } catch (err) {
      console.error("handleDelete error:", err);
      alert("حدث خطأ أثناء حذف المصروف");
    } finally {
      setActionLoading(false);
    }
  };

  const fmtAmount = (val) => {
    const n = parseFloat(val);
    return Number.isNaN(n) ? "0.00" : n.toLocaleString("ar-EG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button
          onClick={() => { setForm(EMPTY_EXPENSE); setShowModal(true); }}
          className="flex items-center gap-1.5 bg-[#c9a84c] hover:bg-[#b8973d] text-white text-xs font-medium px-3 py-2 rounded-xl transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          إضافة
        </button>
        <h3 className="text-sm font-semibold text-gray-700">أنواع المصروفات</h3>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="w-10 h-10 border-4 border-[#c9a84c] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : error ? (
        <div className="text-center py-10 space-y-3 bg-[#faf7f0] rounded-xl border border-gray-100">
          <p className="text-sm text-red-500">{error}</p>
          <button
            onClick={fetchExpenseTypes}
            className="px-4 py-2 bg-[#c9a84c] hover:bg-[#b8973d] text-white text-xs font-medium rounded-xl transition-colors"
          >
            إعادة المحاولة
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-10 bg-[#faf7f0] rounded-xl border border-gray-100">
          <p className="text-sm text-gray-400">لا توجد مصروفات مضافة حالياً.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.id} className="flex items-center justify-between bg-[#faf7f0] border border-gray-100 rounded-xl px-4 py-3">
              <div className="text-right space-y-0.5 min-w-0">
                <p className="text-sm font-semibold text-gray-800">{item.type}</p>
                <p className="text-xs text-gray-500">
                  {fmtAmount(item.amount_sar)} ر.س · {fmtAmount(item.amount_egp)} ج.م · {item.expense_date}
                </p>
                {item.description && (
                  <p className="text-xs text-gray-400 truncate">{item.description}</p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <DeleteBtn onClick={() => setDeletingItem(item)} />
                <EditBtn onClick={() => handleEditClick(item)} />
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <Modal title="إضافة مصروف جديد" onClose={() => { setShowModal(false); setForm(EMPTY_EXPENSE); }}>
          <ExpenseFormFields form={form} setForm={setForm} disabled={actionLoading} />
          <div className="flex items-center justify-end gap-3 pt-1">
            <button
              disabled={actionLoading}
              onClick={() => { setShowModal(false); setForm(EMPTY_EXPENSE); }}
              className="px-5 py-2 border border-[#c9a84c] text-[#c9a84c] text-sm font-medium rounded-xl hover:bg-amber-50 transition-colors"
            >
              إلغاء
            </button>
            <button
              disabled={actionLoading || !form.type.trim()}
              onClick={handleAdd}
              className="px-5 py-2 bg-[#c9a84c] hover:bg-[#b8973d] text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
            >
              {actionLoading ? "جارٍ الإضافة..." : "إضافة"}
            </button>
          </div>
        </Modal>
      )}

      {editingItem && (
        <Modal title="تعديل المصروف" onClose={() => { setEditingItem(null); setEditForm(EMPTY_EXPENSE); }}>
          {editLoading ? (
            <div className="flex justify-center py-10">
              <div className="w-8 h-8 border-4 border-[#c9a84c] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              <ExpenseFormFields form={editForm} setForm={setEditForm} disabled={actionLoading} />
              <div className="flex items-center justify-end gap-3 pt-1">
                <button
                  disabled={actionLoading}
                  onClick={() => { setEditingItem(null); setEditForm(EMPTY_EXPENSE); }}
                  className="px-5 py-2 border border-[#c9a84c] text-[#c9a84c] text-sm font-medium rounded-xl hover:bg-amber-50 transition-colors"
                >
                  إلغاء
                </button>
                <button
                  disabled={actionLoading || !editForm.type.trim()}
                  onClick={handleEdit}
                  className="px-5 py-2 bg-[#c9a84c] hover:bg-[#b8973d] text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
                >
                  {actionLoading ? "جارٍ التعديل..." : "تعديل"}
                </button>
              </div>
            </>
          )}
        </Modal>
      )}

      {deletingItem && (
        <Modal title="تأكيد الحذف" onClose={() => setDeletingItem(null)}>
          <div className="text-center space-y-4">
            <div className="w-12 h-12 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <p className="text-sm text-gray-500">
              هل أنت متأكد أنك تريد حذف مصروف <span className="font-bold text-gray-800">{deletingItem.type}</span>؟
            </p>
            <div className="flex gap-3 pt-2">
              <button
                disabled={actionLoading}
                onClick={() => setDeletingItem(null)}
                className="w-full bg-gray-100 text-gray-700 font-medium py-2 rounded-xl text-sm hover:bg-gray-200 transition-colors"
              >
                إلغاء
              </button>
              <button
                disabled={actionLoading}
                onClick={handleDelete}
                className="w-full bg-red-500 text-white font-medium py-2 rounded-xl text-sm hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {actionLoading ? "جارٍ الحذف..." : "حذف"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ======= Tab: التارجت =======
function TargetsTab() {
  const [items, setItems] = useState(TARGETS_INIT);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ from: "", to: "", pct: "", label: "", color: "green" });
  const [colorOpen, setColorOpen] = useState(false);

  const handleAdd = () => {
    if (!form.from || !form.to || !form.label) return;
    setItems((p) => [
      ...p,
      { id: Date.now(), from: +form.from, to: +form.to, pct: +form.pct, label: form.label, color: form.color },
    ]);
    setForm({ from: "", to: "", pct: "", label: "", color: "green" });
    setShowModal(false);
  };

  const selectedColor = COLOR_OPTIONS.find((c) => c.value === form.color);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 bg-[#c9a84c] hover:bg-[#b8973d] text-white text-xs font-medium px-3 py-2 rounded-xl transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          إضافة
        </button>
        <h3 className="text-sm font-semibold text-gray-700">قواعد التارجت</h3>
      </div>

      <div className="space-y-2">
        {items.map((item) => {
          const badgeCls = labelColorMap[item.color]?.badge || "bg-gray-200 text-gray-600";
          return (
            <div key={item.id} className="flex items-center justify-between bg-[#faf7f0] border border-gray-100 rounded-xl px-4 py-3">
              <DeleteBtn onClick={() => setItems((p) => p.filter((x) => x.id !== item.id))} />
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-xs text-gray-400">
                    من {item.from.toLocaleString()} إلى {item.to.toLocaleString()}
                  </p>
                  <p className="text-sm font-bold text-gray-800">{item.pct}%</p>
                </div>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-lg ${badgeCls}`}>
                  {item.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {showModal && (
        <Modal title="إضافة قاعدة تارجت جديدة" onClose={() => { setShowModal(false); setColorOpen(false); }}>
          {/* من / إلى */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-gray-500 text-right block">إلى (مبلغ)</label>
              <input
                type="number"
                value={form.to}
                onChange={(e) => setForm((p) => ({ ...p, to: e.target.value }))}
                placeholder="0.00"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 text-right"
                dir="rtl"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-500 text-right block">من (مبلغ)</label>
              <input
                type="number"
                value={form.from}
                onChange={(e) => setForm((p) => ({ ...p, from: e.target.value }))}
                placeholder="0.00"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 text-right"
                dir="rtl"
              />
            </div>
          </div>

          {/* اللون */}
          <div className="space-y-1 relative">
            <label className="text-xs text-gray-500 text-right block">اللون</label>
            <button
              type="button"
              onClick={() => setColorOpen((p) => !p)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-amber-400"
            >
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
              <div className={`flex-1 h-3 rounded-full mx-3 ${selectedColor?.bg}`} />
            </button>
            {colorOpen && (
              <div className="absolute top-full mt-1 right-0 left-0 bg-white border border-gray-200 rounded-xl shadow-lg z-10 overflow-hidden">
                {COLOR_OPTIONS.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => { setForm((p) => ({ ...p, color: c.value })); setColorOpen(false); }}
                    className="w-full flex items-center justify-end gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors"
                  >
                    <span className="text-sm text-gray-700">{c.label}</span>
                    <div className={`w-5 h-5 rounded-full ${c.bg}`} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* التسمية */}
          <div className="space-y-1">
            <label className="text-xs text-gray-500 text-right block">التسمية</label>
            <input
              value={form.label}
              onChange={(e) => setForm((p) => ({ ...p, label: e.target.value }))}
              placeholder="مثال: جيد"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 text-right"
              dir="rtl"
            />
          </div>

          {/* النسبة */}
          <div className="space-y-1">
            <label className="text-xs text-gray-500 text-right block">النسبة %</label>
            <input
              type="number"
              value={form.pct}
              onChange={(e) => setForm((p) => ({ ...p, pct: e.target.value }))}
              placeholder="10"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 text-right"
              dir="rtl"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-1">
            <button
              onClick={() => { setShowModal(false); setColorOpen(false); }}
              className="px-5 py-2 border border-[#c9a84c] text-[#c9a84c] text-sm font-medium rounded-xl hover:bg-amber-50 transition-colors"
            >
              إلغاء
            </button>
            <button
              onClick={handleAdd}
              className="px-5 py-2 bg-[#c9a84c] hover:bg-[#b8973d] text-white text-sm font-medium rounded-xl transition-colors"
            >
              إضافة
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ======= Tab: المدن =======
function CitiesTab() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [newCity, setNewCity] = useState("");
  const [editingCity, setEditingCity] = useState(null);
  const [editCityName, setEditCityName] = useState("");
  const [deletingCity, setDeletingCity] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchCities = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const r = await fetch(`${BASE}/cities`, {
        headers: { "Accept": "application/json" }
      });
      console.log("GET /cities status:", r.status);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const d = await r.json();
      console.log("GET /cities data:", d);
      const list = Array.isArray(d?.cities) ? d.cities : (Array.isArray(d?.data) ? d.data : (Array.isArray(d) ? d : []));
      setItems(list);
    } catch (err) {
      console.error("fetchCities error:", err);
      setError("حدث خطأ أثناء تحميل المدن. يرجى التحقق من اتصال الشبكة.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCities();
  }, [fetchCities]);

  const handleAdd = async () => {
    if (!newCity.trim()) return;
    setActionLoading(true);
    try {
      const r = await fetch(`${BASE}/cities`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify({ name: newCity.trim() }),
      });
      console.log("POST /cities status:", r.status);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      await r.json();
      setNewCity("");
      setShowModal(false);
      fetchCities();
    } catch (err) {
      console.error("handleAdd error:", err);
      alert("حدث خطأ أثناء إضافة المدينة");
    } finally {
      setActionLoading(false);
    }
  };

  const handleEdit = async () => {
    if (!editingCity || !editCityName.trim()) return;
    setActionLoading(true);
    try {
      const r = await fetch(`${BASE}/cities/${editingCity.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify({ name: editCityName.trim() }),
      });
      console.log("PUT /cities status:", r.status);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      await r.json();
      setEditingCity(null);
      setEditCityName("");
      fetchCities();
    } catch (err) {
      console.error("handleEdit error:", err);
      alert("حدث خطأ أثناء تعديل المدينة");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingCity) return;
    setActionLoading(true);
    try {
      const r = await fetch(`${BASE}/cities/${deletingCity.id}`, {
        method: "DELETE",
        headers: { "Accept": "application/json" },
      });
      console.log("DELETE /cities status:", r.status);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      await r.json();
      setDeletingCity(null);
      fetchCities();
    } catch (err) {
      console.error("handleDelete error:", err);
      alert("حدث خطأ أثناء حذف المدينة");
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditClick = (city) => {
    setEditingCity(city);
    setEditCityName(city.name);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 bg-[#c9a84c] hover:bg-[#b8973d] text-white text-xs font-medium px-3 py-2 rounded-xl transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          إضافة
        </button>
        <h3 className="text-sm font-semibold text-gray-700">المدن</h3>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="w-10 h-10 border-4 border-[#c9a84c] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : error ? (
        <div className="text-center py-10 space-y-3 bg-[#faf7f0] rounded-xl border border-gray-100">
          <p className="text-sm text-red-500">{error}</p>
          <button
            onClick={fetchCities}
            className="px-4 py-2 bg-[#c9a84c] hover:bg-[#b8973d] text-white text-xs font-medium rounded-xl transition-colors"
          >
            إعادة المحاولة
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-10 bg-[#faf7f0] rounded-xl border border-gray-100">
          <p className="text-sm text-gray-400">لا توجد مدن مضافة حالياً.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((city) => (
            <div key={city.id} className="flex items-center justify-between bg-[#faf7f0] border border-gray-100 rounded-xl px-4 py-3">
              <span className="text-sm text-gray-700 font-medium">{city.name}</span>
              <div className="flex items-center gap-2">
                <DeleteBtn onClick={() => setDeletingCity(city)} />
                <EditBtn onClick={() => handleEditClick(city)} />
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <Modal title="إضافة مدينة جديدة" onClose={() => { setShowModal(false); setNewCity(""); }}>
          <div className="space-y-1">
            <label className="text-xs text-gray-500 text-right block">اسم المدينة</label>
            <input
              value={newCity}
              onChange={(e) => setNewCity(e.target.value)}
              placeholder="مثال: الرياض"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 text-right placeholder-gray-300"
              dir="rtl"
              disabled={actionLoading}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            />
          </div>
          <div className="flex items-center justify-end gap-3 pt-1">
            <button
              disabled={actionLoading}
              onClick={() => { setShowModal(false); setNewCity(""); }}
              className="px-5 py-2 border border-[#c9a84c] text-[#c9a84c] text-sm font-medium rounded-xl hover:bg-amber-50 transition-colors"
            >
              إلغاء
            </button>
            <button
              disabled={actionLoading || !newCity.trim()}
              onClick={handleAdd}
              className="px-5 py-2 bg-[#c9a84c] hover:bg-[#b8973d] text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
            >
              {actionLoading ? "جارٍ الإضافة..." : "إضافة"}
            </button>
          </div>
        </Modal>
      )}

      {editingCity && (
        <Modal title="تعديل اسم المدينة" onClose={() => { setEditingCity(null); setEditCityName(""); }}>
          <div className="space-y-1">
            <label className="text-xs text-gray-500 text-right block">اسم المدينة الجديد</label>
            <input
              value={editCityName}
              onChange={(e) => setEditCityName(e.target.value)}
              placeholder="مثال: الرياض"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 text-right placeholder-gray-300"
              dir="rtl"
              disabled={actionLoading}
              onKeyDown={(e) => e.key === "Enter" && handleEdit()}
            />
          </div>
          <div className="flex items-center justify-end gap-3 pt-1">
            <button
              disabled={actionLoading}
              onClick={() => { setEditingCity(null); setEditCityName(""); }}
              className="px-5 py-2 border border-[#c9a84c] text-[#c9a84c] text-sm font-medium rounded-xl hover:bg-amber-50 transition-colors"
            >
              إلغاء
            </button>
            <button
              disabled={actionLoading || !editCityName.trim()}
              onClick={handleEdit}
              className="px-5 py-2 bg-[#c9a84c] hover:bg-[#b8973d] text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
            >
              {actionLoading ? "جارٍ التعديل..." : "تعديل"}
            </button>
          </div>
        </Modal>
      )}

      {deletingCity && (
        <Modal title="تأكيد الحذف" onClose={() => setDeletingCity(null)}>
          <div className="text-center space-y-4">
            <div className="w-12 h-12 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <p className="text-sm text-gray-500">
              هل أنت متأكد أنك تريد حذف مدينة <span className="font-bold text-gray-800">{deletingCity.name}</span>؟
            </p>
            <div className="flex gap-3 pt-2">
              <button
                disabled={actionLoading}
                onClick={() => setDeletingCity(null)}
                className="w-full bg-gray-100 text-gray-700 font-medium py-2 rounded-xl text-sm hover:bg-gray-200 transition-colors"
              >
                إلغاء
              </button>
              <button
                disabled={actionLoading}
                onClick={handleDelete}
                className="w-full bg-red-500 text-white font-medium py-2 rounded-xl text-sm hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {actionLoading ? "جارٍ الحذف..." : "حذف"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ======= Main Page =======
const TABS = ["التارجت", "انواع المصروفات", "المدن"];

export default function SystemManagementPage() {
  const [activeTab, setActiveTab] = useState("التارجت");

  return (
    <div className="w-full min-h-0 space-y-5 pb-8" dir="rtl">

      {/* Page Title */}
      <div className="bg-white rounded-2xl shadow-sm px-5 py-4">
        <div className="flex items-center gap-2 justify-start">
          <div className="w-8 h-8 bg-[#c9a84c] rounded-xl flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-[#c9a84c]">إدارة النظام</h1>
        </div>
        <p className="text-xs text-gray-400 mt-0.5 text-right">تحكم في خيارات النظام والبيانات الأساسية</p>
      </div>

      {/* Tabs + Content */}
      <div className="bg-white rounded-2xl shadow-sm p-5 space-y-5">

        {/* Tab bar */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 text-sm font-medium py-2 rounded-lg transition-all ${
                activeTab === tab
                  ? "bg-white shadow-sm text-gray-800"
                  : "text-gray-400 hover:text-gray-600"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === "التارجت"          && <TargetsTab />}
        {activeTab === "انواع المصروفات" && <ExpenseTypesTab />}
        {activeTab === "المدن"            && <CitiesTab />}
      </div>
    </div>
  );
}
