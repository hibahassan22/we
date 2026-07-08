import { Navigate } from "react-router-dom";
import { useAuthContext } from "../context/AuthContext.jsx";
import { hasPermission } from "../lib/permissions.js";

/**
 * Restricts content to specific roles or permission keys.
 * Prefer permission keys — roles are templates configured by Admin.
 */
export default function RoleGuard({
  children,
  allowedRoles = [],
  allowedPermissions = [],
  fallback = "/dashboard",
}) {
  const { isLoaded, isSignedIn, user, access } = useAuthContext();

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center py-20" dir="rtl">
        <div className="w-10 h-10 border-4 border-[#c9a84c] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!isSignedIn) return <Navigate to="/login" replace />;

  if (access.isAdmin) return children;

  const roleOk = !allowedRoles.length || allowedRoles.includes(user?.role);
  const permOk =
    !allowedPermissions.length ||
    allowedPermissions.some((p) => access.can(p) || hasPermission(access.permissions, p));

  if (roleOk && permOk) return children;
  return <Navigate to={access.canRoute(fallback) ? fallback : access.firstRoute()} replace />;
}
