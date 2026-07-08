import { useState, useEffect } from "react";
import RoleSelector, { StatusSelector } from "./RoleSelector.jsx";
import PermissionSelector from "./PermissionSelector.jsx";
import { ROLES } from "../../lib/roles.js";
import { isSalesLinkedRole } from "../../services/salesService.js";

const inputCls =
  "w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:border-[#c9a84c] focus:outline-none bg-white text-right placeholder-gray-300";

const gridCls = "grid grid-cols-1 sm:grid-cols-2 gap-3";

export default function UserForm({
  mode = "create",
  initial = {},
  roles = [],
  departments = [],
  onSubmit,
  onCancel,
  loading = false,
}) {
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    phone: "",
    department: "",
    role: ROLES.SUPPORT,
    permissions: [],
    status: "active",
  });

  useEffect(() => {
    if (mode === "edit" && initial) {
      setForm({
        fullName: initial.fullName ?? "",
        email: initial.email ?? "",
        password: "",
        phone: initial.phone ?? "",
        department: initial.department ?? "",
        role: initial.role ?? ROLES.SUPPORT,
        permissions: initial.permissions ?? [],
        status: initial.status ?? "active",
      });
    }
  }, [mode, initial]);

  const set = (key, val) => setForm((p) => ({ ...p, [key]: val }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(form);
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
            className={inputCls}
            required
            disabled={mode === "edit"}
          />
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
            className={inputCls}
            required
            minLength={8}
          />
        </div>
      )}

      <div className={gridCls}>
        <div className="space-y-1.5">
          <label className="text-xs text-gray-500 block text-right">الهاتف</label>
          <input
            value={form.phone}
            onChange={(e) => set("phone", e.target.value)}
            placeholder="05xxxxxxxx"
            dir="ltr"
            className={inputCls}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-gray-500 block text-right">القسم</label>
          {departments.length ? (
            <select
              value={form.department}
              onChange={(e) => set("department", e.target.value)}
              className={inputCls + " appearance-none"}
            >
              <option value="">—</option>
              {departments.map((d) => (
                <option key={d.id} value={d.name}>{d.name}</option>
              ))}
            </select>
          ) : (
            <input
              value={form.department}
              onChange={(e) => set("department", e.target.value)}
              placeholder="القسم"
              className={inputCls}
            />
          )}
        </div>
      </div>

      <div className={gridCls}>
        <div className="space-y-1.5">
          <label className="text-xs text-gray-500 block text-right">الدور</label>
          <RoleSelector value={form.role} onChange={(v) => set("role", v)} roles={roles} />
          {isSalesLinkedRole(form.role) && (
            <p className="text-[11px] text-amber-700 text-right leading-relaxed">
              الدور يُحفظ في Firebase. عند الإنشاء يُسجَّل الموظف في نظام المبيعات بنفس معرّف Firebase (uid).
            </p>
          )}
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-gray-500 block text-right">الحالة</label>
          <StatusSelector value={form.status} onChange={(v) => set("status", v)} />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs text-gray-500 block text-right">صلاحيات إضافية</label>
        <PermissionSelector
          selected={form.permissions}
          onChange={(p) => set("permissions", p)}
        />
      </div>

      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="w-full sm:w-auto px-5 py-2.5 border border-gray-200 text-gray-600 text-sm rounded-xl hover:bg-gray-50"
          >
            إلغاء
          </button>
        )}
        <button
          type="submit"
          disabled={loading}
          className="w-full sm:w-auto flex items-center justify-center gap-1.5 bg-[#4a4644] text-white text-sm font-bold px-6 py-2.5 rounded-xl hover:bg-black transition-colors disabled:opacity-60"
        >
          {loading ? "جارٍ الحفظ..." : mode === "create" ? "إنشاء المستخدم" : "حفظ التعديلات"}
        </button>
      </div>
    </form>
  );
}
