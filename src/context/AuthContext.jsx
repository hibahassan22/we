import { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import {
  loginWithEmail,
  logout as authLogout,
  getSession,
  fetchUserProfile,
  saleToProfile,
} from "../services/authService.js";
import { fetchRolePermissionLinksByRoleId } from "../services/permissionService.js";
import { apiPermissionsToInternalKeys } from "../lib/apiPermissionBridge.js";
import { fetchRoles, isProtectedRole } from "../services/roleService.js";
import { ROLES, ROLE_LABELS } from "../lib/roles.js";
import { resolvePermissions, createRoleAccess } from "../lib/roleAccess.js";

const AuthContext = createContext(null);

function mapUser(profile, access, roleLabel) {
  if (!profile) return null;
  const fullName = profile.fullName ?? profile.name ?? "";
  const parts = fullName.split(" ");
  return {
    uid: profile.uid ?? profile.id,
    id: profile.uid ?? profile.id,
    email: profile.email ?? "",
    displayName: fullName,
    fullName,
    firstName: parts[0] ?? "",
    lastName: parts.slice(1).join(" "),
    phone: profile.phone ?? "",
    department: profile.department ?? "",
    photoURL: profile.avatar ?? null,
    imageUrl: profile.avatar ?? null,
    role: profile.role_id != null ? String(profile.role_id) : (profile.role ?? ROLES.SUPPORT),
    role_id: profile.role_id ?? null,
    status: profile.status ?? "active",
    permissions: access.permissions,
    roleLabel,
  };
}

async function loadRolePermissions(roleId, roleName) {
  if (isProtectedRole({ id: roleId, name: roleName })) return ["*"];
  if (roleId == null || roleId === "") return null;

  try {
    const links = await fetchRolePermissionLinksByRoleId(roleId);
    const permObjects = links.map((l) => l.permission).filter(Boolean);
    return apiPermissionsToInternalKeys(permObjects);
  } catch (err) {
    console.warn("[auth] load role permissions:", err);
    return [];
  }
}

async function resolveRoleLabel(roleId) {
  if (roleId == null || roleId === "") return "";
  try {
    const roles = await fetchRoles();
    const match = roles.find((r) => String(r.id) === String(roleId));
    return match?.name ?? "";
  } catch {
    return "";
  }
}

export function AuthProvider({ children }) {
  const [profile, setProfile] = useState(null);
  const [rolePermissions, setRolePermissions] = useState(undefined);
  const [roleLabel, setRoleLabel] = useState("");
  const [loading, setLoading] = useState(true);

  const effectiveRole =
    profile?.role_id != null ? String(profile.role_id) : (profile?.role ?? ROLES.SUPPORT);

  const applyProfile = useCallback(async (p) => {
    setProfile(p);
    if (!p) {
      setRolePermissions(undefined);
      setRoleLabel("");
      return;
    }

    const label = await resolveRoleLabel(p.role_id);
    setRoleLabel(label || ROLE_LABELS[p.role] || String(p.role_id ?? ""));
    const perms = await loadRolePermissions(p.role_id, label);
    setRolePermissions(perms);
  }, []);

  const bootstrap = useCallback(async () => {
    setLoading(true);
    try {
      const session = getSession();
      if (!session?.sale) {
        await applyProfile(null);
        return;
      }
      await applyProfile(saleToProfile(session.sale));
    } finally {
      setLoading(false);
    }
  }, [applyProfile]);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  const login = useCallback(
    async (email, password) => {
      const { sale } = await loginWithEmail(email, password);
      await applyProfile(saleToProfile(sale));
    },
    [applyProfile]
  );

  const logout = useCallback(async () => {
    await authLogout();
    setProfile(null);
    setRolePermissions(undefined);
    setRoleLabel("");
  }, []);

  const refreshUser = useCallback(async () => {
    const session = getSession();
    if (!session?.sale?.id) return null;
    const p = await fetchUserProfile(session.sale.id);
    if (p) await applyProfile(p);
    return p;
  }, [applyProfile]);

  const permissions = useMemo(
    () => resolvePermissions(effectiveRole, rolePermissions, profile?.permissions),
    [effectiveRole, rolePermissions, profile?.permissions]
  );

  const access = useMemo(
    () => createRoleAccess({ roleId: effectiveRole, permissions }),
    [effectiveRole, permissions]
  );

  const user = useMemo(() => mapUser(profile, access, roleLabel), [profile, access, roleLabel]);

  const isLoaded = !loading;
  const isSignedIn = isLoaded && profile !== null;

  const value = {
    user,
    profile,
    role: effectiveRole,
    roleLabel,
    permissions: access.permissions,
    access,
    loading: !isLoaded,
    isLoaded,
    isSignedIn,
    login,
    logout,
    signOut: logout,
    refreshUser,
    firebaseUser: null,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuthContext must be used inside <AuthProvider>");
  return ctx;
}
