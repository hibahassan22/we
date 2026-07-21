import { useEffect, useMemo, useState, useRef } from "react";
import { Plus } from "lucide-react";
import RoleSelector from "./RoleSelector.jsx";
import { findSalesByEmail, salesRecordToUser } from "../../services/salesService.js";
import { getDefaultRoleId, resolveApiRoleId, getRoleLabel } from "../../lib/roleUtils.js";
import {
  sanitizePhoneInputFiveStart,
  sanitizeUserPhoneInput,
  validatePhoneTenDigitsFiveStart,
  validateUserPhone,
  normalizeSaudiPhoneForInputFiveStart,
} from "../../lib/phoneValidation.js";
import { enrichUserWithAccount } from "../../services/accountRegistryService.js";

const inputCls =
  "w-full h-11 border border-gray-200 rounded-xl px-4 text-sm focus:border-[#c9a84c] focus:outline-none bg-white text-right placeholder-gray-300";

const labelCls = "text-xs font-medium text-gray-600 block text-right mb-1.5";

/**
 * حقل الاسم مع سيرش مستخدمين — الاختيار يملأ باقي البيانات تلقائياً
 */
function NameUserCombobox({
  value,
  onChange,
  employees = [],
  selected,
  onSelect,
  disabled = false,
  roles = [],
}) {
  const containerRef = useRef(null);
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    const term = String(value ?? "").trim().toLowerCase();
    if (!term) return employees.slice(0, 8);
    const digits = term.replace(/\D/g, "");
    return employees
      .filter((u) => {
        const name = String(u.fullName ?? u.name ?? "").toLowerCase();
        const email = String(u.email ?? "").toLowerCase();
        const phone = String(u.phone ?? "").replace(/\D/g, "");
        return (
          name.includes(term)
          || email.includes(term)
          || (digits && phone.includes(digits))
        );
      })
      .slice(0, 8);
  }, [employees, value]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <input
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          if (selected) onSelect?.(null);
        }}
        onFocus={() => !disabled && setOpen(true)}
        placeholder="ابحث بالاسم أو اكتب اسماً جديداً..."
        className={inputCls}
        required
        disabled={disabled}
        autoComplete="off"
      />
      <div className="absolute left-3 top-3 pointer-events-none text-gray-400">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>
      {open && !disabled && filtered.length > 0 && (
        <ul className="absolute z-30 mt-1 w-full max-h-52 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg py-1">
          {filtered.map((u) => (
            <li key={u.uid ?? u.id}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onSelect?.(u);
                  setOpen(false);
                }}
                className={`w-full px-3 py-2.5 text-sm text-right hover:bg-amber-50 transition-colors ${
                  String(selected?.uid ?? selected?.id) === String(u.uid ?? u.id)
                    ? "bg-amber-50 text-[#c9a84c] font-medium"
                    : "text-gray-700"
                }`}
              >
                <span className="block font-medium">{u.fullName || u.name || "بدون اسم"}</span>
                <span className="block text-[11px] text-gray-400 mt-0.5" dir="ltr">
                  {u.phone || "—"}
                  {u.email ? ` · ${u.email}` : ""}
                </span>
                <span className="block text-[10px] text-gray-400 mt-0.5">
                  {getRoleLabel(u.role, roles)}
                  {u.accountName ? ` · ${u.accountName}` : ""}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function AccountStepForm({ form, setForm, loading, onSubmit, disabled, phoneInvalid, phoneMessage }) {
  return (
    <div className="space-y-4" dir="rtl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className={labelCls}>اسم الأكونت</label>
          <input
            value={form.accountName}
            onChange={(e) => setForm((p) => ({ ...p, accountName: e.target.value }))}
            placeholder="مثال: أكونت المبيعات الرئيسي"
            className={inputCls}
            required
            disabled={loading}
          />
        </div>
        <div>
          <label className={labelCls}>رقم الأكونت (جوال سعودي)</label>
          <div className="flex gap-2">
            <span className="h-11 px-3 flex items-center rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-500 shrink-0" dir="ltr">
              +966
            </span>
            <input
              type="tel"
              inputMode="numeric"
              value={form.accountNumber}
              onChange={(e) => setForm((p) => ({ ...p, accountNumber: sanitizePhoneInputFiveStart(e.target.value) }))}
              placeholder="501234567"
              dir="ltr"
              maxLength={10}
              className={`${inputCls} flex-1 ${phoneInvalid ? "border-red-300 focus:border-red-400" : ""}`}
              required
              disabled={loading}
            />
          </div>
          {phoneInvalid && <p className="text-[11px] text-red-600 text-right mt-1">{phoneMessage}</p>}
        </div>
        <div />
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={onSubmit}
          disabled={disabled || loading}
          className="w-full sm:w-auto bg-gradient-to-l from-[#9C6402] to-[#E6C76A] text-white text-sm font-bold px-8 py-2.5 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-60"
        >
          {loading ? "جارٍ الحفظ..." : "إضافة أكونت"}
        </button>
      </div>
    </div>
  );
}

export default function AccountWizardForm({
  mode = "account", // "account" | "user" | "edit"
  accountDraft,
  initial,
  existingSales = [],
  accountMeta = {},
  roles = [],
  rolesReady = true,
  defaultRoleId,
  loading = false,
  showAddAnother = false,
  onAddAnother,
  onAddEmployee,
  onCancel,
  onSubmit,
}) {
  const fallbackRole = defaultRoleId ?? getDefaultRoleId(roles);

  const [accountForm, setAccountForm] = useState({
    accountName: "",
    accountNumber: "",
  });

  const [userForm, setUserForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    role: "",
  });

  const [selectedEmployee, setSelectedEmployee] = useState(null);

  const searchableEmployees = useMemo(() => {
    return existingSales.map((sale) => {
      const user = salesRecordToUser(sale);
      return enrichUserWithAccount(user, accountMeta[String(user.uid ?? user.id)]);
    });
  }, [existingSales, accountMeta]);

  useEffect(() => {
    if (mode === "account") {
      setAccountForm({
        accountName: initial?.accountName ?? "",
        accountNumber: normalizeSaudiPhoneForInputFiveStart(initial?.accountNumber ?? ""),
      });
    }
  }, [mode, initial]);

  useEffect(() => {
    if (mode === "user") {
      setSelectedEmployee(null);
      setUserForm({
        fullName: "",
        email: "",
        phone: "",
        password: "",
        role: "",
      });
    }
  }, [mode]);

  useEffect(() => {
    if (mode !== "user" || selectedEmployee) return;
    if (!roles?.length) return;
    setUserForm((p) => {
      const current = String(p.role ?? "");
      const hasValidRole = !!resolveApiRoleId(current, roles);
      if (hasValidRole) return p;
      const nextRole =
        roles.length === 1
          ? String(roles[0].id)
          : String(getDefaultRoleId(roles) || fallbackRole || roles[0]?.id || "");
      return nextRole ? { ...p, role: nextRole } : p;
    });
  }, [mode, selectedEmployee, roles, fallbackRole]);

  useEffect(() => {
    if (mode === "edit" && initial) {
      setUserForm({
        fullName: initial.fullName ?? "",
        email: initial.email ?? "",
        phone: initial.phone ?? "",
        password: "",
        role: initial.role ?? fallbackRole,
      });
      setSelectedEmployee(null);
    }
  }, [mode, initial, fallbackRole, roles]);

  const isUser = mode === "user";
  const isEdit = mode === "edit";
  const isLinkingExisting = isUser && Boolean(selectedEmployee);

  const emailConflict = useMemo(() => {
    if (!isUser || isLinkingExisting) return null;
    if (!userForm.email.trim()) return null;
    return findSalesByEmail(existingSales, userForm.email);
  }, [isUser, isLinkingExisting, existingSales, userForm.email]);

  const accountPhoneValidation = useMemo(
    () => validatePhoneTenDigitsFiveStart(accountForm.accountNumber),
    [accountForm.accountNumber],
  );
  const accountPhoneInvalid = accountForm.accountNumber.length > 0 && !accountPhoneValidation.valid;

  const selectedRoleId = useMemo(() => resolveApiRoleId(userForm.role, roles), [userForm.role, roles]);
  const phoneValidation = useMemo(() => validateUserPhone(userForm.phone), [userForm.phone]);
  const phoneInvalid = userForm.phone.length > 0 && !phoneValidation.valid;
  const roleInvalid = isUser && !isLinkingExisting && rolesReady && roles.length > 0 && !selectedRoleId;
  const passwordInvalid = isUser && !isLinkingExisting && userForm.password.length > 0 && userForm.password.length < 8;

  const canSubmitAccount =
    String(accountForm.accountName ?? "").trim() !== "" &&
    accountPhoneValidation.valid;

  const canSubmitUser = isLinkingExisting
    ? !!accountDraft?.accountNumber && !!selectedEmployee
    : !emailConflict
      && phoneValidation.valid
      && userForm.password.length >= 8
      && String(userForm.fullName ?? "").trim() !== ""
      && (!rolesReady || roles.length === 0 || !!selectedRoleId)
      && !!accountDraft?.accountNumber;

  const submitAccount = () => {
    if (!canSubmitAccount) return;
    onSubmit?.({
      accountName: String(accountForm.accountName).trim(),
      accountNumber: accountPhoneValidation.normalized ?? accountForm.accountNumber,
    });
  };

  const applyEmployee = (emp) => {
    if (!emp) {
      setSelectedEmployee(null);
      return;
    }
    setSelectedEmployee(emp);
    setUserForm({
      fullName: emp.fullName ?? emp.name ?? "",
      email: emp.email ?? "",
      phone: sanitizeUserPhoneInput(emp.phone ?? ""),
      password: "",
      role: emp.role ?? fallbackRole,
    });
  };

  const clearSelectionKeepName = (name) => {
    setSelectedEmployee(null);
    setUserForm((p) => ({
      ...p,
      fullName: name,
      email: "",
      phone: "",
      password: "",
      role: fallbackRole ? String(fallbackRole) : p.role,
    }));
  };

  const submitUser = (e) => {
    e.preventDefault();
    if (!canSubmitUser) return;

    if (isLinkingExisting) {
      onSubmit?.({
        ...accountDraft,
        linkExisting: true,
        existingUserId: selectedEmployee.uid ?? selectedEmployee.id,
        fullName: selectedEmployee.fullName ?? selectedEmployee.name,
        email: selectedEmployee.email,
        phone: selectedEmployee.phone,
        role: String(selectedEmployee.role ?? ""),
      });
      return;
    }

    onSubmit?.({
      ...accountDraft,
      linkExisting: false,
      fullName: userForm.fullName,
      email: userForm.email,
      phone: phoneValidation.normalized ?? userForm.phone,
      password: userForm.password,
      role: String(selectedRoleId ?? userForm.role),
    });
  };

  const submitEdit = (e) => {
    e.preventDefault();
    if (!initial) return;
    if (!phoneValidation.valid) return;
    if (rolesReady && roles.length > 0 && !selectedRoleId) return;
    onSubmit?.({
      ...initial,
      fullName: userForm.fullName,
      email: initial.email ?? userForm.email,
      phone: phoneValidation.normalized ?? userForm.phone,
      role: String(selectedRoleId ?? userForm.role),
      accountName: initial.accountName ?? accountDraft?.accountName,
      accountNumber: initial.accountNumber ?? accountDraft?.accountNumber,
    });
  };

  if (mode === "account") {
    return (
      <AccountStepForm
        form={accountForm}
        setForm={setAccountForm}
        loading={loading}
        disabled={!canSubmitAccount}
        phoneInvalid={accountPhoneInvalid}
        phoneMessage={accountPhoneValidation.message}
        onSubmit={submitAccount}
      />
    );
  }

  const header = (
    <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-4">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-full bg-[#c9a84c] text-white font-bold flex items-center justify-center text-sm">
          {(accountDraft?.accountName ?? initial?.accountName ?? "#").trim().charAt(0) || "#"}
        </div>
        <div className="flex-1 min-w-0 text-right">
          <p className="font-bold text-gray-800 truncate">
            {accountDraft?.accountName ?? initial?.accountName ?? "—"}
          </p>
          <p className="text-xs text-gray-500" dir="ltr">
            {accountDraft?.accountNumber ?? initial?.accountNumber ?? "—"}
          </p>
          <p className="text-xs text-gray-500">
            {isUser ? "إضافة مستخدم داخل نفس الأكونت" : "تعديل بيانات الأكونت/المستخدم"}
          </p>
        </div>
        {isEdit && onAddEmployee && (
          <button
            type="button"
            onClick={onAddEmployee}
            disabled={loading}
            className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#4a4644] hover:bg-black text-white text-xs font-bold disabled:opacity-50"
          >
            <Plus className="w-3.5 h-3.5" />
            إضافة موظف
          </button>
        )}
      </div>
    </div>
  );

  return (
    <form onSubmit={isEdit ? submitEdit : submitUser} className="space-y-4" dir="rtl">
      {header}

      {isUser && isLinkingExisting && (
        <div className="flex items-center justify-between gap-2 rounded-xl border border-amber-100 bg-amber-50/70 px-3 py-2">
          <span className="text-xs text-[#9C6402] font-medium">تم اختيار موظف موجود — بياناته اتملّت تلقائي</span>
          <button
            type="button"
            onClick={() => clearSelectionKeepName(userForm.fullName)}
            disabled={loading}
            className="text-[11px] text-gray-500 hover:text-gray-700 underline"
          >
            إلغاء الاختيار
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>الاسم الكامل</label>
          {isUser ? (
            <>
              <NameUserCombobox
                value={userForm.fullName}
                onChange={(name) => {
                  if (selectedEmployee) clearSelectionKeepName(name);
                  else setUserForm((p) => ({ ...p, fullName: name }));
                }}
                employees={searchableEmployees}
                selected={selectedEmployee}
                onSelect={applyEmployee}
                disabled={loading}
                roles={roles}
              />
              <p className="text-[11px] text-gray-400 text-right mt-1">
                ابحث واختر مستخدم موجود عشان البيانات تتحط تلقائي، أو اكتب اسماً جديداً
              </p>
            </>
          ) : (
            <input
              value={userForm.fullName}
              onChange={(e) => setUserForm((p) => ({ ...p, fullName: e.target.value }))}
              placeholder="الاسم الكامل"
              className={inputCls}
              required
              disabled={loading}
            />
          )}
        </div>
        <div>
          <label className={labelCls}>البريد الإلكتروني</label>
          <input
            type="email"
            value={userForm.email}
            onChange={(e) => setUserForm((p) => ({ ...p, email: e.target.value }))}
            placeholder="email@domain.com"
            dir="ltr"
            className={`${inputCls} ${emailConflict ? "border-red-300 focus:border-red-400" : ""}`}
            required={!isLinkingExisting}
            disabled={loading || isEdit || isLinkingExisting}
          />
          {emailConflict && <p className="text-[11px] text-red-600 text-right mt-1">هذا البريد مسجّل مسبقاً</p>}
        </div>

        {isUser && !isLinkingExisting && (
          <div>
            <label className={labelCls}>كلمة المرور</label>
            <input
              type="password"
              value={userForm.password}
              onChange={(e) => setUserForm((p) => ({ ...p, password: e.target.value }))}
              placeholder="8 أحرف على الأقل"
              dir="ltr"
              className={`${inputCls} ${passwordInvalid ? "border-red-300 focus:border-red-400" : ""}`}
              required
              minLength={8}
              disabled={loading}
              autoComplete="new-password"
            />
          </div>
        )}

        <div>
          <label className={labelCls}>رقم الهاتف</label>
          <div className="flex gap-2">
            <span className="h-11 px-3 flex items-center rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-500 shrink-0" dir="ltr">
              +966
            </span>
            <input
              type="tel"
              inputMode="numeric"
              value={userForm.phone}
              onChange={(e) => setUserForm((p) => ({ ...p, phone: sanitizeUserPhoneInput(e.target.value) }))}
              placeholder="501234567"
              dir="ltr"
              maxLength={16}
              className={`${inputCls} flex-1 ${phoneInvalid ? "border-red-300 focus:border-red-400" : ""}`}
              required={!isLinkingExisting}
              disabled={loading || isLinkingExisting}
            />
          </div>
          {phoneInvalid && <p className="text-[11px] text-red-600 text-right mt-1">{phoneValidation.message}</p>}
        </div>

        <div className="md:col-span-2">
          <label className={labelCls}>الدور</label>
          {!rolesReady ? (
            <p className="text-xs text-gray-400 text-right py-2">جارٍ تحميل الأدوار...</p>
          ) : (
            <RoleSelector
              value={userForm.role}
              onChange={(v) => setUserForm((p) => ({ ...p, role: v }))}
              roles={roles}
              disabled={loading || !roles.length || isLinkingExisting}
              placeholder={roles.length ? undefined : "لا توجد أدوار"}
            />
          )}
          {isUser && roleInvalid && <p className="text-[11px] text-red-600 text-right mt-1">اختر دوراً من القائمة</p>}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
        {isUser && showAddAnother && (
          <button
            type="button"
            onClick={() => {
              onAddAnother?.();
              setSelectedEmployee(null);
              setUserForm({ fullName: "", email: "", phone: "", password: "", role: fallbackRole ? String(fallbackRole) : "" });
            }}
            disabled={loading}
            className="inline-flex items-center gap-1.5 text-sm text-[#9C6402] hover:text-[#7a4f02] font-medium"
          >
            <Plus className="w-4 h-4" />
            إضافة مستخدم تاني
          </button>
        )}

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:mr-auto">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="w-full sm:w-auto px-5 py-2.5 border border-gray-200 text-gray-600 text-sm rounded-lg hover:bg-gray-50"
            >
              إلغاء
            </button>
          )}
          <button
            type="submit"
            disabled={
              loading
              || (isEdit
                ? !phoneValidation.valid || (rolesReady && roles.length > 0 && !selectedRoleId)
                : !canSubmitUser)
            }
            className="w-full sm:w-auto bg-gradient-to-l from-[#9C6402] to-[#E6C76A] text-white text-sm font-bold px-8 py-2.5 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-60 shadow-sm"
          >
            {loading
              ? "جارٍ الحفظ..."
              : isEdit
                ? "حفظ التعديلات"
                : isLinkingExisting
                  ? "ربط المستخدم بالأكونت"
                  : "إضافة مستخدم"}
          </button>
        </div>
      </div>
    </form>
  );
}
