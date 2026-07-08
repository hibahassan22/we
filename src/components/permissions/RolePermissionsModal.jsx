import { useState, useEffect } from "react";
import AppModal from "../ui/AppModal";
import { useToast } from "../../lib/toast.jsx";
import { usePermissions } from "../../hooks/usePermissions.js";
import { PERMISSIONS } from "../../lib/permissions.js";
import { updateRolePermissions, isProtectedRole } from "../../services/roleService.js";
import PermissionModuleList from "./PermissionModuleList.jsx";
import {
  PERMISSION_MODULES,
  moduleStateFromPermissions,
  permissionsFromModuleState,
  countEnabledInState,
  totalPermissionCount,
} from "../../lib/permissionModules.js";

export default function RolePermissionsModal({ isOpen, onClose, role, onSaved }) {
  const toast = useToast();
  const { can } = usePermissions();
  const canEdit = can(PERMISSIONS.PERMISSIONS_EDIT);
  const [moduleState, setModuleState] = useState(() => moduleStateFromPermissions([]));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen || !role) return;
    setModuleState(moduleStateFromPermissions(role.permissions ?? []));
  }, [isOpen, role]);

  if (!role) return null;

  const enabledCount = countEnabledInState(moduleState);
  const total = totalPermissionCount();

  const handleSave = async () => {
    setSaving(true);
    try {
      const permissions = isProtectedRole(role) ? ["*"] : permissionsFromModuleState(moduleState);
      await updateRolePermissions(role.id, permissions);
      toast.success(`تم حفظ صلاحيات «${role.name}»`);
      onSaved?.();
      onClose();
    } catch (err) {
      toast.error(err.message || "فشل حفظ الصلاحيات");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppModal
      isOpen={isOpen}
      onClose={onClose}
      title="صلاحيات الدور"
      subtitle={role.name}
      size="xl"
      isSubmitting={saving}
      footer={
        <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
          <button type="button" onClick={onClose} disabled={saving} className="px-5 py-2.5 border border-gray-200 text-gray-600 text-sm rounded-xl hover:bg-gray-50">
            {canEdit ? "إلغاء" : "إغلاق"}
          </button>
          {canEdit && (
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || (!isProtectedRole(role) && enabledCount === 0)}
              className="px-6 py-2.5 bg-[#c9a84c] hover:bg-[#b8973d] disabled:opacity-60 text-white text-sm font-bold rounded-xl"
            >
              {saving ? "جارٍ الحفظ..." : "حفظ الصلاحيات"}
            </button>
          )}
        </div>
      }
    >
      <div className="space-y-4">
        <div className="bg-[#fffcf5] border border-amber-100 rounded-xl px-4 py-3 text-right">
          <p className="text-sm font-bold text-gray-800">{role.name}</p>
          {role.description && <p className="text-xs text-gray-500 mt-0.5">{role.description}</p>}
          <p className="text-[11px] text-[#c9a84c] mt-2">
            مفعّل: {enabledCount} / {total} — ما لا تفعّله لن يظهر للمستخدمين بهذا الدور
          </p>
        </div>

        {isProtectedRole(role) ? (
          <p className="text-sm text-gray-600 text-right bg-gray-50 border border-gray-100 rounded-xl p-4">
            دور مدير النظام لديه صلاحيات كاملة تلقائياً.
          </p>
        ) : (
          <div className="max-h-[60vh] overflow-y-auto">
            <PermissionModuleList
              modules={PERMISSION_MODULES}
              moduleState={moduleState}
              onChange={setModuleState}
              readOnly={!canEdit}
            />
          </div>
        )}
      </div>
    </AppModal>
  );
}
