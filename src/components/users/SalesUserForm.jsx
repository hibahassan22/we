import { useState, useEffect, useMemo } from "react";
import RoleSelector from "./RoleSelector.jsx";
import { findSalesByEmail } from "../../services/salesService.js";
import { getDefaultRoleId, resolveApiRoleId } from "../../lib/roleUtils.js";
import { sanitizeUserPhoneInput, validateUserPhone } from "../../lib/phoneValidation.js";

const inputCls =
  "w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:border-[#c9a84c] focus:outline-none bg-white text-right placeholder-gray-300";

const gridCls = "grid grid-cols-1 sm:grid-cols-2 gap-3";

export default function SalesUserForm({
  mode = "create",
  initial = {},
  existingSales = [],
  roles = [],
  rolesReady = true,
  defaultRoleId,
  onSubmit,
  onCancel,
  loading = false,
}) {
  const fallbackRole = defaultRoleId ?? getDefaultRoleId(roles);
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    role: "",
  });

  useEffect(() => {
    if (!roles.length) return;

    setForm((p) => {
      const current = String(p.role ?? "");
      const hasValidRole = !!resolveApiRoleId(current, roles);
      if (hasValidRole) return p;

      const nextRole =
        roles.length === 1
          ? String(roles[0].id)
          : String(getDefaultRoleId(roles) || fallbackRole || roles[0]?.id || "");

      return nextRole ? { ...p, role: nextRole } : p;
    });
  }, [roles, fallbackRole]);

  useEffect(() => {
    if (mode === "edit" && initial) {
      setForm({
        fullName: initial.fullName ?? "",
        email: initial.email ?? "",
        phone: initial.phone ?? "",
        role: initial.role ?? fallbackRole,
      });
    }
  }, [mode, initial, fallbackRole]);

  const set = (key, val) => setForm((p) => ({ ...p, [key]: val }));

  const emailConflict = useMemo(() => {
    if (mode !== "create" || !form.email.trim()) return null;
    return findSalesByEmail(existingSales, form.email);
  }, [mode, form.email, existingSales]);

  const selectedRoleId = useMemo(
    () => resolveApiRoleId(form.role, roles),
    [form.role, roles]
  );
  const phoneValidation = useMemo(() => validateUserPhone(form.phone), [form.phone]);
  const phoneInvalid = form.phone.length > 0 && !phoneValidation.valid;
  const roleInvalid = mode === "create" && rolesReady && roles.length > 0 && !selectedRoleId;

  const passwordInvalid = mode === "create" && form.password.length > 0 && form.password.length < 8;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (emailConflict) return;
    if (!phoneValidation.valid) return;
    if (mode === "create" && form.password.length < 8) return;
    if (mode === "create" && rolesReady && roles.length > 0 && !selectedRoleId) return;
    onSubmit({ ...form, role: String(selectedRoleId ?? form.role), phone: phoneValidation.normalized ?? form.phone });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className={gridCls}>
        <div className="space-y-1.5">
          <label className="text-xs text-gray-500 block text-right">الاسم الكامل</label>
          <input
            value={form.fullName}
            onChange={(e) => set("fullName", e.target.value)}
            placeholder="الاسم الكامل"
            className={inputCls}
            required
            disabled={loading}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-gray-500 block text-right">البريد الإلكتروني</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            placeholder="email@domain.com"
            dir="ltr"
            className={`${inputCls} ${emailConflict ? "border-red-300 focus:border-red-400" : ""}`}
            required
            disabled={loading || mode === "edit"}
          />
          {emailConflict && (
            <p className="text-[11px] text-red-600 text-right">
              هذا البريد مسجّل مسبقاً للموظف «{emailConflict.name || emailConflict.id}»
            </p>
          )}
        </div>
      </div>

      {mode === "create" && (
        <div className="space-y-1.5">
          <label className="text-xs text-gray-500 block text-right">كلمة المرور</label>
          <input
            type="password"
            value={form.password}
            onChange={(e) => set("password", e.target.value)}
            placeholder="8 أحرف على الأقل"
            dir="ltr"
            className={`${inputCls} ${passwordInvalid ? "border-red-300 focus:border-red-400" : ""}`}
            required
            minLength={8}
            disabled={loading}
            autoComplete="new-password"
          />
          {passwordInvalid && (
            <p className="text-[11px] text-red-600 text-right">كلمة المرور يجب أن تكون 8 أحرف على الأقل</p>
          )}
        </div>
      )}

      <div className={gridCls}>
        <div className="space-y-1.5">
          <label className="text-xs text-gray-500 block text-right">رقم الهاتف</label>
          <input
            type="tel"
            inputMode="numeric"
            value={form.phone}
            onChange={(e) => set("phone", sanitizeUserPhoneInput(e.target.value))}
            placeholder="+966501234567"
            dir="ltr"
            maxLength={16}
            className={`${inputCls} ${phoneInvalid ? "border-red-300 focus:border-red-400" : ""}`}
            required
            disabled={loading}
          />
          {phoneInvalid && (
            <p className="text-[11px] text-red-600 text-right">{phoneValidation.message}</p>
          )}
          {!phoneInvalid && form.phone.length > 0 && (
            <p className="text-[11px] text-gray-400 text-right">6–15 رقماً — يمكن إضافة + للأرقام الدولية</p>
          )}
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-gray-500 block text-right">الدور</label>
          {!rolesReady ? (
            <p className="text-xs text-gray-400 text-right py-2">جارٍ تحميل الأدوار...</p>
          ) : (
            <RoleSelector
              value={form.role}
              onChange={(v) => set("role", v)}
              roles={roles}
              disabled={loading || !roles.length}
              placeholder={roles.length ? undefined : "لا توجد أدوار"}
            />
          )}
          {roleInvalid && (
            <p className="text-[11px] text-red-600 text-right">اختر دوراً من القائمة</p>
          )}
        </div>
      </div>

      <p className="text-[11px] text-gray-500 text-right leading-relaxed">
        بيانات الموظف تُحفظ في <span className="font-mono">/api/sales</span> مع الدور وكلمة المرور.
      </p>

      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="w-full sm:w-auto px-5 py-2.5 border border-gray-200 text-gray-600 text-sm rounded-xl hover:bg-gray-50"
          >
            إلغاء
          </button>
        )}
        <button
          type="submit"
          disabled={
            loading
            || !rolesReady
            || (mode === "create" && !!emailConflict)
            || !phoneValidation.valid
            || (mode === "create" && form.password.length < 8)
            || (mode === "create" && roleInvalid)
          }
          className="w-full sm:w-auto flex items-center justify-center gap-1.5 bg-[#4a4644] text-white text-sm font-bold px-6 py-2.5 rounded-xl hover:bg-black transition-colors disabled:opacity-60"
        >
          {loading ? "جارٍ الحفظ..." : mode === "create" ? "إضافة موظف" : "حفظ التعديلات"}
        </button>
      </div>
    </form>
  );
}
