import { useState, useEffect } from "react";
import { useGlobalSearch } from "../hooks/useGlobalSearch";
import { filterByGlobalSearch } from "../lib/searchUtils";
import { useToast } from "../lib/toast.jsx";
import { usePermissions } from "../hooks/usePermissions.js";
import { PERMISSIONS } from "../lib/permissions.js";
import { fetchRoles, createRole, deleteRole, formatRoleDate, isProtectedRole, findAdminRole } from "../services/roleService.js";
import { grantAllPermissionsToRole } from "../services/permissionService.js";
import { ConfirmModal } from "./ui/AppModal";
import RolePermissionsModal from "./permissions/RolePermissionsModal.jsx";
import EditRoleModal from "./permissions/EditRoleModal.jsx";

function RoleActions({ role, onEdit, onDelete, onViewPerms, onGrantAll, granting }) {
  const protectedRole = isProtectedRole(role);
  return (
    <div className="flex items-center justify-center gap-2 flex-wrap">
      <button
        type="button"
        onClick={onViewPerms}
        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-[#9C6402] bg-[#faf7f0] border border-amber-100 hover:bg-amber-50 transition-colors"
        title="عرض الصلاحيات"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
        الصلاحيات
      </button>
      {!protectedRole && (
        <button
          type="button"
          onClick={onGrantAll}
          disabled={granting}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-green-700 bg-green-50 border border-green-100 hover:bg-green-100 transition-colors disabled:opacity-50"
          title="تفعيل كل الصلاحيات لهذا الدور"
        >
          تفعيل الكل
        </button>
      )}
      <button
        type="button"
        onClick={onEdit}
        disabled={protectedRole}
        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-blue-600 bg-blue-50 border border-blue-100 hover:bg-blue-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        title="تعديل الدور"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
        تعديل
      </button>
      <button
        type="button"
        onClick={onDelete}
        disabled={protectedRole}
        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-red-600 bg-red-50 border border-red-100 hover:bg-red-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        title="حذف الدور"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
        حذف
      </button>
    </div>
  );
}

export default function PermissionsPage() {
  const toast = useToast();
  const { can } = usePermissions();
  const canManageRoles = can(PERMISSIONS.ROLES_EDIT);
  const canEditPermissions = can(PERMISSIONS.PERMISSIONS_EDIT);
  const [roles, setRoles] = useState([]);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [addingRole, setAddingRole] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [permRole, setPermRole] = useState(null);
  const [grantingAdmin, setGrantingAdmin] = useState(false);
  const [grantTarget, setGrantTarget] = useState(null);
  const [grantingRole, setGrantingRole] = useState(false);

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
    if (isProtectedRole(role)) return "الكل";
    const count = role.permissionIds?.length ?? role.permissions?.length ?? 0;
    return count;
  };

  const handleGrantRoleAll = async (role) => {
    if (!role || isProtectedRole(role)) return;
    setGrantTarget(role);
    setGrantingRole(true);
    try {
      const count = await grantAllPermissionsToRole(role.id);
      toast.success(`تم تفعيل ${count} صلاحية لدور «${role.name}»`);
      await loadRoles();
    } catch (err) {
      toast.error(err.message || "فشل منح الصلاحيات");
    } finally {
      setGrantingRole(false);
      setGrantTarget(null);
    }
  };

  const handleGrantAdminAll = async () => {
    const adminRole = findAdminRole(roles);
    if (!adminRole) {
      toast.error("لم يُعثر على دور ادمن — أنشئ دوراً باسم Admin أو ادمن");
      return;
    }
    setGrantingAdmin(true);
    try {
      const count = await grantAllPermissionsToRole(adminRole.id);
      toast.success(`تم تفعيل ${count} صلاحية لدور «${adminRole.name}»`);
      await loadRoles();
    } catch (err) {
      toast.error(err.message || "فشل منح الصلاحيات للادمن");
    } finally {
      setGrantingAdmin(false);
    }
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
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            {canEditPermissions && (
              <button
                type="button"
                onClick={handleGrantAdminAll}
                disabled={grantingAdmin || rolesLoading}
                className="text-xs px-3 py-2 rounded-lg border border-amber-200 text-amber-800 hover:bg-amber-50 disabled:opacity-60 font-medium"
              >
                {grantingAdmin ? "جارٍ التفعيل..." : "تفعيل كل الصلاحيات للادمن"}
              </button>
            )}
            <span className="text-xs text-gray-400">{roles.length} دور</span>
          </div>
          <div className="text-right">
            <h2 className="text-base font-semibold text-gray-800">سجل الأدوار</h2>
            <p className="text-[11px] text-gray-400 mt-0.5">كل دور (Sales أو غيره) يحصل فقط على ما تفعّله له من صلاحيات</p>
          </div>
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
                    <td className="px-4 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => setPermRole(role)}
                        className="text-[#c9a84c] font-medium hover:underline text-sm"
                      >
                        {permCount(role)}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-center text-xs text-gray-400">{formatRoleDate(role.createdAt)}</td>
                    <td className="px-4 py-3">
                      <RoleActions
                        role={role}
                        onEdit={() => setEditTarget(role)}
                        onDelete={() => setDeleteTarget(role)}
                        onViewPerms={() => setPermRole(role)}
                        onGrantAll={() => handleGrantRoleAll(role)}
                        granting={grantingRole && grantTarget?.id === role.id}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <EditRoleModal
        isOpen={!!editTarget}
        onClose={() => setEditTarget(null)}
        role={editTarget}
        onSaved={loadRoles}
      />

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
