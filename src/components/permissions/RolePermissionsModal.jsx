import { useState, useEffect } from "react";
import AppModal from "../ui/AppModal";
import { useToast } from "../../lib/toast.jsx";
import { usePermissions } from "../../hooks/usePermissions.js";
import { PERMISSIONS } from "../../lib/permissions.js";
import { useAuthContext } from "../../context/AuthContext.jsx";
import { updateRolePermissions, isProtectedRole } from "../../services/roleService.js";
import { fetchPermissions, fetchRolePermissionLinksByRoleId } from "../../services/permissionService.js";
import {
  groupPermissionsByModule,
  moduleStateFromPermissionIds,
  permissionIdsFromModuleState,
  selectAllModuleState,
} from "../../lib/apiPermissionBridge.js";
import PermissionModuleList from "./PermissionModuleList.jsx";

export default function RolePermissionsModal({ isOpen, onClose, role, onSaved }) {
  const toast = useToast();
  const { role: myRoleId, refreshPermissions } = useAuthContext();
  const { can, isAdmin } = usePermissions();
  const canEdit = isAdmin || can(PERMISSIONS.PERMISSIONS_EDIT) || can(PERMISSIONS.ROLES_EDIT);
  const [modules, setModules] = useState([]);
  const [moduleState, setModuleState] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen || !role) return;

    let cancelled = false;
    setLoading(true);

    Promise.all([
      fetchPermissions().catch(() => []),
      fetchRolePermissionLinksByRoleId(role.id).catch(() => []),
    ])
      .then(([allPerms, links]) => {
        if (cancelled) return;
        const grouped = groupPermissionsByModule(allPerms);
        const assigned = new Set(
          links.map((l) => String(l.permission_id ?? l.permission?.id)).filter(Boolean)
        );
        setModules(grouped);
        setModuleState(moduleStateFromPermissionIds(grouped, assigned));
      })
      .catch((err) => {
        if (!cancelled) toast.error(err.message || "فشل تحميل الصلاحيات");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, role, toast]);

  if (!role) return null;

  const enabledCount = Object.values(moduleState).flat().filter(Boolean).length;
  const total = modules.reduce((n, m) => n + m.permissions.length, 0);

  const handleSave = async () => {
    setSaving(true);
    try {
      const permissionIds = permissionIdsFromModuleState(modules, moduleState);
      await updateRolePermissions(role.id, permissionIds);
      if (String(myRoleId) === String(role.id)) {
        await refreshPermissions();
      }
      toast.success(`تم حفظ صلاحيات «${role.name}» — يُفضّل إعادة تسجيل الدخول لتطبيقها`);
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
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-5 py-2.5 border border-gray-200 text-gray-600 text-sm rounded-xl hover:bg-gray-50"
          >
            {canEdit ? "إلغاء" : "إغلاق"}
          </button>
          {canEdit && (
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || loading || (!isProtectedRole(role) && enabledCount === 0)}
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
            مفعّل: {enabledCount} / {total} — ما تفعّله هنا يُطبَّق على كل مستخدم بهذا الدور (Sales أو أي دور آخر)
          </p>
        </div>

        {isProtectedRole(role) ? (
          <p className="text-sm text-gray-600 text-right bg-gray-50 border border-gray-100 rounded-xl p-4">
            دور الأدمن لديه صلاحيات كاملة تلقائياً — يمكنه تفعيل أي صلاحية لأي دور آخر.
          </p>
        ) : loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-[#c9a84c] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : modules.length === 0 ? (
          <p className="text-sm text-gray-500 text-right bg-gray-50 border border-gray-100 rounded-xl p-4">
            لا توجد صلاحيات في النظام — أضفها من الـ API أولاً.
          </p>
        ) : (
          <>
            {canEdit && (
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModuleState(selectAllModuleState(modules, false))}
                  className="text-xs px-3 py-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50"
                >
                  إلغاء الكل
                </button>
                <button
                  type="button"
                  onClick={() => setModuleState(selectAllModuleState(modules, true))}
                  className="text-xs px-3 py-1.5 rounded-lg border border-green-200 text-green-600 hover:bg-green-50"
                >
                  تفعيل الكل
                </button>
              </div>
            )}
            <div className="max-h-[60vh] overflow-y-auto">
              <PermissionModuleList
                modules={modules}
                moduleState={moduleState}
                onChange={setModuleState}
                readOnly={!canEdit}
              />
            </div>
          </>
        )}
      </div>
    </AppModal>
  );
}
