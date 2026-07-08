import { useMemo, useCallback } from "react";
import { useAuthContext } from "../context/AuthContext.jsx";
import { createRoleAccess } from "../lib/roleAccess.js";

/**
 * Hook للتحقق من صلاحيات الحساب الحالي.
 * يعتمد على دور المستخدم وقالب الصلاحيات من Firebase (يحدده المدير).
 */
export function usePermissions() {
  const { access, role, roleLabel, permissions } = useAuthContext();

  const policy = useMemo(
    () => access ?? createRoleAccess({ roleId: role, permissions }),
    [access, role, permissions]
  );

  const can = useCallback((permission) => policy.can(permission), [policy]);
  const canAny = useCallback((perms = []) => policy.canAny(perms), [policy]);
  const canRoute = useCallback((pathname) => policy.canRoute(pathname), [policy]);

  return {
    role,
    roleLabel,
    permissions: policy.permissions,
    isAdmin: policy.isAdmin,
    can,
    canAny,
    canRoute,
    access: policy,
  };
}
