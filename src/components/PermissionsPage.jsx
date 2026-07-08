import { useState, useEffect } from "react";
import { useGlobalSearch } from "../hooks/useGlobalSearch";
import { filterByGlobalSearch } from "../lib/searchUtils";
import { useToast } from "../lib/toast.jsx";
import { usePermissions } from "../hooks/usePermissions.js";
import { PERMISSIONS } from "../lib/permissions.js";
import {
  fetchRoles,
  createRole,
  deleteRole,
  formatRoleDate,
  isProtectedRole,
} from "../services/roleService.js";
import { ConfirmModal } from "./ui/AppModal";
import RolePermissionsModal from "./permissions/RolePermissionsModal.jsx";

export default function PermissionsPage() {
  const toast = useToast();
  const { can, canAny } = usePermissions();
  const canManageRoles = can(PERMISSIONS.ROLES_EDIT);
  const canViewPermissions = canAny([PERMISSIONS.PERMISSIONS_READ, PERMISSIONS.ROLES_READ]);
  const canEditPermissions = can(PERMISSIONS.PERMISSIONS_EDIT);
  const [roles, setRoles] = useState([]);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [addingRole, setAddingRole] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [permRole, setPermRole] = useState(null);

  const [roleName, setRoleName] = useState("");
  const [roleDesc, setRoleDesc] = useState("");
  const { searchQuery, setSearchQuery } = useGlobalSearch();

  const loadRoles = async () => {
    setRolesLoading(true);
    try {
      setRoles(await fetchRoles());
    } catch (err) {
      toast.error(err.message || "فشل تحميل الأدوار");
      setRoles([]);
    } finally {
      setRolesLoading(false);
    }
  };

  useEffect(() => {
    loadRoles();
  }, []);

  const filteredRoles = filterByGlobalSearch(roles, searchQuery, (r) => [
    r.name,
    r.description,
    r.id,
  ]);

  const handleAddRole = async (e) => {
    e.preventDefault();
    if (!roleName.trim()) {
      toast.error("اسم الدور مطلوب");
      return;
    }
    setAddingRole(true);
    try {
      await createRole({ name: roleName, description: roleDesc, permissions: [] });
      toast.success(`تم إضافة «${roleName.trim()}» — اضغط عرض الصلاحيات لتحديدها`);
      setRoleName("");
      setRoleDesc("");
      await loadRoles();
    } catch (err) {
      toast.error(err.message || "فشل إضافة الدور");
    } finally {
      setAddingRole(false);
    }
  };

  const handleDeleteRole = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteRole(deleteTarget.id);
      toast.success(`تم حذف الدور «${deleteTarget.name}»`);
      setDeleteTarget(null);
      await loadRoles();
    } catch (err) {
      toast.error(err.message || "فشل حذف الدور");
    } finally {
      setDeleting(false);
    }
  };

  const permCount = (role) => {
    if (!Array.isArray(role.permissions)) return 0;
    if (role.permissions.includes("*")) return "الكل";
    return role.permissions.length;
  };

  return (
    <div className="w-full space-y-5" dir="rtl">

      <form onSubmit={handleAddRole} className="bg-white rounded-2xl shadow-sm p-5 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <button
            type="submit"
            disabled={addingRole || !roleName.trim() || !canManageRoles}
            className="flex items-center gap-1.5 bg-[#c9a84c] hover:bg-[#b8973d] disabled:opacity-60 text-white text-sm font-bold px-5 py-2.5 rounded-xl"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {addingRole ? "جارٍ الإضافة..." : "إضافة دور"}
          </button>
          <div className="text-right">
            <h2 className="text-base font-semibold text-gray-800">إضافة دور جديد</h2>
            <p className="text-xs text-gray-400">يُحفظ في النظام ويظهر في صفحة المستخدمين</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500 text-right">اسم الدور <span className="text-red-400">*</span></label>
            <input
              value={roleName}
              onChange={(e) => setRoleName(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#c9a84c] text-right"
              placeholder="مثال: خدمة عملاء"
              disabled={addingRole}
              required
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500 text-right">وصف الدور (اختياري)</label>
            <input
              value={roleDesc}
              onChange={(e) => setRoleDesc(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#c9a84c] text-right"
              placeholder="أدخل وصف الدور"
              disabled={addingRole}
            />
          </div>
        </div>
      </form>

      <div className="bg-white rounded-2xl shadow-sm p-5 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400">{roles.length} دور</span>
          <h2 className="text-base font-semibold text-gray-800">سجل الأدوار</h2>
        </div>

        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="ابحث بالاسم..."
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none text-right"
          dir="rtl"
        />

        {rolesLoading ? (
          <div className="flex justify-center py-10">
            <div className="w-8 h-8 border-4 border-[#c9a84c] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredRoles.length === 0 ? (
          <p className="text-center text-sm text-gray-400 py-8">لا توجد أدوار — أضف دوراً جديداً</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-100">
            <table className="w-full text-sm text-right">
              <thead>
                <tr className="bg-[#faf7f0] border-b border-gray-100">
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500">اسم الدور</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 text-center">الصلاحيات</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 text-center">تاريخ الإنشاء</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredRoles.map((role) => (
                  <tr key={role.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-800">{role.name}</p>
                      {role.description && <p className="text-xs text-gray-400">{role.description}</p>}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600">{permCount(role)}</td>
                    <td className="px-4 py-3 text-center text-xs text-gray-400">{formatRoleDate(role.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-3">
                        {canViewPermissions && (
                        <button
                          type="button"
                          onClick={() => setPermRole(role)}
                          className="text-xs text-[#c9a84c] font-medium hover:underline"
                        >
                          عرض الصلاحيات
                        </button>
                        )}
                        {canManageRoles && !isProtectedRole(role) && (
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(role)}
                            className="text-xs text-red-500 hover:underline"
                          >
                            حذف
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <RolePermissionsModal
        isOpen={!!permRole}
        onClose={() => setPermRole(null)}
        role={permRole}
        onSaved={loadRoles}
      />

      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteRole}
        title="حذف الدور"
        message={`هل تريد حذف الدور «${deleteTarget?.name}»؟`}
        confirmLabel="حذف"
        isSubmitting={deleting}
        variant="danger"
      />
    </div>
  );
}
