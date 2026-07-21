import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import AppModal from "../ui/AppModal";
import AccountWizardForm from "./AccountWizardForm.jsx";
import { getRoleLabel } from "../../lib/roleUtils.js";
import { formatAccountPhone, enrichUserWithAccount } from "../../services/accountRegistryService.js";
import { salesRecordToUser } from "../../services/salesService.js";
import { normalizeSaudiPhoneForInputFiveStart } from "../../lib/phoneValidation.js";

const ASSIGN_STORAGE_KEY = "drivo_account_assignto";

function readAssignments() {
  try {
    const raw = localStorage.getItem(ASSIGN_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeAssignments(store) {
  localStorage.setItem(ASSIGN_STORAGE_KEY, JSON.stringify(store));
}

function getAccountAssignKey(account) {
  return account?.accountKey
    || `phone:${String(account?.accountNumber ?? "").replace(/\D/g, "")}`
    || `name:${String(account?.accountName ?? "").trim().toLowerCase()}`;
}

function UserSearchInput({ users = [], value, selected, onChange, onSelect, disabled }) {
  const ref = useRef(null);
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    const term = String(value ?? "").trim().toLowerCase();
    if (!term) return users.slice(0, 8);
    const digits = term.replace(/\D/g, "");
    return users
      .filter((u) => {
        const name = String(u.fullName ?? u.name ?? "").toLowerCase();
        const email = String(u.email ?? "").toLowerCase();
        const phone = String(u.phone ?? "").replace(/\D/g, "");
        return name.includes(term) || email.includes(term) || (digits && phone.includes(digits));
      })
      .slice(0, 8);
  }, [users, value]);

  useEffect(() => {
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div ref={ref} className="relative flex-1 min-w-0">
      <input
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          if (selected) onSelect(null);
        }}
        onFocus={() => !disabled && setOpen(true)}
        placeholder="ابحث في المستخدمين..."
        className="w-full h-10 border border-gray-200 rounded-xl px-3 text-sm text-right focus:border-[#c9a84c] focus:outline-none bg-white"
        disabled={disabled}
        autoComplete="off"
      />
      {open && !disabled && filtered.length > 0 && (
        <ul className="absolute z-40 mt-1 w-full max-h-44 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg py-1">
          {filtered.map((u) => (
            <li key={u.uid ?? u.id}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onSelect(u);
                  onChange(u.fullName || u.name || "");
                  setOpen(false);
                }}
                className="w-full px-3 py-2 text-sm text-right hover:bg-amber-50 text-gray-700"
              >
                <span className="block font-medium">{u.fullName || u.name || "—"}</span>
                <span className="block text-[11px] text-gray-400" dir="ltr">
                  {u.phone || "—"}
                  {u.email ? ` · ${u.email}` : ""}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function AccountDetailsModal({
  isOpen,
  onClose,
  account,
  members = [],
  roles = [],
  existingSales = [],
  accountMeta = {},
  canAddEmployee = false,
  canDeleteEmployee = false,
  rolesReady = true,
  defaultRoleId,
  submitting = false,
  onAddEmployeeSubmit,
  onRemoveMember,
  onAssignTo,
}) {
  const [showAssign, setShowAssign] = useState(false);
  const [assignQuery, setAssignQuery] = useState("");
  const [assignUser, setAssignUser] = useState(null);
  const [assignDays, setAssignDays] = useState("");
  const [assignments, setAssignments] = useState([]);
  const [showAddPopup, setShowAddPopup] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const accountName = account?.accountName || "—";
  const accountPhone = account?.accountPhoneDisplay || formatAccountPhone(account?.accountNumber);
  const accountKey = getAccountAssignKey(account);

  const displayMembers = useMemo(() => {
    const list = Array.isArray(members) ? [...members] : [];
    // لو أقل من 2 نعرض مثالين للتجربة البصرية (مع علامة تجريبية)
    if (list.length >= 2) return list.map((m) => ({ ...m, _demo: false }));
    const demos = [
      {
        id: "demo-1",
        uid: "demo-1",
        fullName: "سارة أحمد",
        phone: "+966501111111",
        email: "sara@example.com",
        role: list[0]?.role || "sales",
        _demo: true,
      },
      {
        id: "demo-2",
        uid: "demo-2",
        fullName: "محمد علي",
        phone: "+966502222222",
        email: "mohamed@example.com",
        role: list[0]?.role || "sales",
        _demo: true,
      },
    ];
    if (list.length === 1) return [{ ...list[0], _demo: false }, demos[1]];
    if (list.length === 0) return demos;
    return list;
  }, [members]);

  const searchableUsers = useMemo(() => {
    return existingSales.map((sale) => {
      const user = salesRecordToUser(sale);
      return enrichUserWithAccount(user, accountMeta[String(user.uid ?? user.id)]);
    });
  }, [existingSales, accountMeta]);

  useEffect(() => {
    if (!isOpen || !accountKey) {
      setAssignments([]);
      setShowAssign(false);
      setAssignQuery("");
      setAssignUser(null);
      setAssignDays("");
      setShowAddPopup(false);
      setConfirmDelete(null);
      return;
    }
    const store = readAssignments();
    setAssignments(Array.isArray(store[accountKey]) ? store[accountKey] : []);
  }, [isOpen, accountKey]);

  const saveAssign = () => {
    if (!assignUser) return;
    const days = Number(assignDays);
    if (!Number.isFinite(days) || days <= 0) return;

    const entry = {
      id: `${assignUser.uid ?? assignUser.id}-${Date.now()}`,
      userId: assignUser.uid ?? assignUser.id,
      userName: assignUser.fullName || assignUser.name || "—",
      phone: assignUser.phone || "",
      days,
      assignedAt: new Date().toISOString(),
    };

    const store = readAssignments();
    const next = [...(store[accountKey] || []), entry];
    store[accountKey] = next;
    writeAssignments(store);
    setAssignments(next);
    onAssignTo?.(entry, account);
    setAssignQuery("");
    setAssignUser(null);
    setAssignDays("");
    setShowAssign(false);
  };

  const removeAssignment = (id) => {
    const store = readAssignments();
    const next = (store[accountKey] || []).filter((a) => a.id !== id);
    store[accountKey] = next;
    writeAssignments(store);
    setAssignments(next);
  };

  const accountDraft = {
    accountName: account?.accountName ?? "",
    accountNumber: normalizeSaudiPhoneForInputFiveStart(account?.accountNumber ?? ""),
  };

  return (
    <>
      <AppModal
        isOpen={isOpen}
        onClose={onClose}
        title="تفاصيل الأكونت"
        subtitle={accountName}
        size="xl"
      >
        <div className="space-y-5 text-right" dir="rtl">
          <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-4 flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#9C6402] to-[#E6C76A] flex items-center justify-center text-white font-bold shrink-0">
              {(accountName?.trim()?.[0] || "#").toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-gray-800 truncate">{accountName}</p>
              <p className="text-xs text-gray-500 mt-0.5" dir="ltr">{accountPhone || "—"}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-gray-500 bg-white border border-gray-200 rounded-full px-3 py-1">
                {displayMembers.length} موظف
              </span>
              {canAddEmployee && (
                <button
                  type="button"
                  onClick={() => setShowAddPopup(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#4a4644] hover:bg-black text-white text-xs font-bold"
                >
                  <Plus className="w-3.5 h-3.5" />
                  إضافة موظف
                </button>
              )}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-bold text-gray-800 mb-3">الموظفين داخل الأكونت</h4>

            {displayMembers.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">لا يوجد موظفين داخل هذا الأكونت</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-gray-100">
                <table className="w-full text-sm text-right">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500">#</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500">الاسم</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500">رقم الهاتف</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500">البريد الإلكتروني</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500">الدور</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500">إجراء</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {displayMembers.map((member, index) => (
                      <tr key={member.uid ?? member.id} className="hover:bg-gray-50/60">
                        <td className="px-4 py-3 text-gray-400 text-xs">{index + 1}</td>
                        <td className="px-4 py-3 font-medium text-gray-800 whitespace-nowrap">
                          {member.fullName || "—"}
                          {member._demo && (
                            <span className="mr-2 text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">مثال</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap" dir="ltr">
                          {member.phone || "—"}
                        </td>
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap" dir="ltr">
                          {member.email || "—"}
                        </td>
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                          {getRoleLabel(member.role, roles)}
                        </td>
                        <td className="px-4 py-3">
                          {canDeleteEmployee && !member._demo && (
                            <button
                              type="button"
                              onClick={() => setConfirmDelete(member)}
                              className="inline-flex items-center gap-1 text-xs text-red-500 hover:text-red-700 font-medium"
                              title="حذف الموظف"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              حذف
                            </button>
                          )}
                          {member._demo && <span className="text-[11px] text-gray-300">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="border-t border-gray-200 pt-4 space-y-3">
            <button
              type="button"
              onClick={() => setShowAssign((v) => !v)}
              className="text-sm font-bold text-[#9C6402] hover:text-[#7a4f02] tracking-wide"
            >
              assignto
            </button>

            {showAssign && (
              <div className="rounded-xl border border-amber-100 bg-[#faf7f0] p-4 space-y-3">
                <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
                  <span className="text-xs font-semibold text-gray-500 shrink-0 sm:w-20">المستخدم</span>
                  <UserSearchInput
                    users={searchableUsers}
                    value={assignQuery}
                    selected={assignUser}
                    onChange={setAssignQuery}
                    onSelect={setAssignUser}
                  />
                </div>
                <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
                  <span className="text-xs font-semibold text-gray-500 shrink-0 sm:w-20">الفترة</span>
                  <div className="flex gap-2 items-center flex-1">
                    <input
                      type="number"
                      min="1"
                      value={assignDays}
                      onChange={(e) => setAssignDays(e.target.value)}
                      placeholder="كم يوم؟"
                      className="w-full sm:w-40 h-10 border border-gray-200 rounded-xl px-3 text-sm text-right focus:border-[#c9a84c] focus:outline-none bg-white"
                    />
                    <span className="text-xs text-gray-400 shrink-0">يوم</span>
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={saveAssign}
                    disabled={!assignUser || !(Number(assignDays) > 0)}
                    className="px-5 py-2 rounded-xl bg-gradient-to-l from-[#9C6402] to-[#E6C76A] text-white text-sm font-bold disabled:opacity-50"
                  >
                    حفظ
                  </button>
                </div>
              </div>
            )}

            {assignments.length > 0 && (
              <div className="rounded-xl border border-gray-100 overflow-hidden">
                <table className="w-full text-sm text-right">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="px-3 py-2 text-xs font-semibold text-gray-500">المستخدم</th>
                      <th className="px-3 py-2 text-xs font-semibold text-gray-500">الفترة</th>
                      <th className="px-3 py-2 text-xs font-semibold text-gray-500">من</th>
                      <th className="px-3 py-2 text-xs font-semibold text-gray-500">إجراء</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {assignments.map((a) => (
                      <tr key={a.id}>
                        <td className="px-3 py-2 font-medium text-gray-800">{a.userName}</td>
                        <td className="px-3 py-2 text-gray-600">{a.days} يوم</td>
                        <td className="px-3 py-2 text-gray-500 text-xs">
                          {a.assignedAt ? new Date(a.assignedAt).toLocaleDateString("ar-EG") : "—"}
                        </td>
                        <td className="px-3 py-2">
                          <button
                            type="button"
                            onClick={() => removeAssignment(a.id)}
                            className="text-xs text-red-500 hover:text-red-700"
                          >
                            إزالة
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </AppModal>

      <AppModal
        isOpen={showAddPopup}
        onClose={() => setShowAddPopup(false)}
        title="إضافة موظف"
        subtitle={accountName}
        isSubmitting={submitting}
        size="lg"
        zIndex={10050}
      >
        <AccountWizardForm
          mode="user"
          accountDraft={accountDraft}
          existingSales={existingSales}
          accountMeta={accountMeta}
          roles={roles}
          rolesReady={rolesReady}
          defaultRoleId={defaultRoleId}
          loading={submitting}
          onSubmit={async (form) => {
            await onAddEmployeeSubmit?.(form);
            setShowAddPopup(false);
          }}
          onCancel={() => setShowAddPopup(false)}
        />
      </AppModal>

      <AppModal
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="حذف موظف"
        size="sm"
        zIndex={10050}
      >
        <div className="space-y-4 text-right" dir="rtl">
          <p className="text-sm text-gray-600">
            هل أنت متأكد من حذف الموظف
            {" "}
            <span className="font-bold text-gray-800">{confirmDelete?.fullName}</span>
            ؟
          </p>
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <button
              type="button"
              onClick={() => setConfirmDelete(null)}
              className="px-5 py-2.5 border border-gray-200 text-gray-600 text-sm rounded-xl hover:bg-gray-50"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={async () => {
                const member = confirmDelete;
                setConfirmDelete(null);
                await onRemoveMember?.(member, account);
              }}
              className="px-5 py-2.5 bg-red-600 text-white text-sm font-bold rounded-xl hover:bg-red-700"
            >
              حذف
            </button>
          </div>
        </div>
      </AppModal>
    </>
  );
}
