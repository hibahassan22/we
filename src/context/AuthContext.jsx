import { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth } from "../firebase/auth.js";
import { db } from "../firebase/firestore.js";
import {
  loginWithEmail,
  logout as authLogout,
  fetchUserProfile,
} from "../services/authService.js";
import { ROLES, ROLE_LABELS } from "../lib/roles.js";
import { resolvePermissions, createRoleAccess } from "../lib/roleAccess.js";

const AuthContext = createContext(null);

function mapProfile(fbUser, profile, access, claimRole) {
  if (!fbUser) return null;
  const fullName = profile?.fullName ?? fbUser.displayName ?? "";
  const parts = fullName.split(" ");
  const role = claimRole ?? profile?.role ?? ROLES.SUPPORT;
  return {
    uid: fbUser.uid,
    email: profile?.email ?? fbUser.email ?? "",
    displayName: fullName,
    fullName,
    firstName: parts[0] ?? "",
    lastName: parts.slice(1).join(" "),
    phone: profile?.phone ?? "",
    department: profile?.department ?? "",
    photoURL: profile?.avatar ?? fbUser.photoURL ?? null,
    imageUrl: profile?.avatar ?? fbUser.photoURL ?? null,
    role,
    status: profile?.status ?? "active",
    permissions: access.permissions,
    firstLogin: profile?.firstLogin ?? false,
    createdBy: profile?.createdBy ?? "",
  };
}

export function AuthProvider({ children }) {
  const [firebaseUser, setFirebaseUser] = useState(undefined);
  const [profile, setProfile] = useState(null);
  const [claimRole, setClaimRole] = useState(null);
  const [rolePermissions, setRolePermissions] = useState(undefined);
  const [roleMeta, setRoleMeta] = useState(null);
  const [loading, setLoading] = useState(true);

  const effectiveRole = claimRole ?? profile?.role ?? ROLES.SUPPORT;

  const login = useCallback(async (email, password) => loginWithEmail(email, password), []);
  const logout = useCallback(async () => authLogout(), []);

  const permissions = useMemo(
    () => resolvePermissions(effectiveRole, rolePermissions, profile?.permissions),
    [effectiveRole, rolePermissions, profile?.permissions]
  );

  const access = useMemo(
    () => createRoleAccess({ roleId: effectiveRole, permissions }),
    [effectiveRole, permissions]
  );

  const user = useMemo(
    () => (firebaseUser ? mapProfile(firebaseUser, profile, access, claimRole) : null),
    [firebaseUser, profile, access, claimRole]
  );

  const refreshUser = useCallback(async () => {
    if (!firebaseUser) return null;
    const p = await fetchUserProfile(firebaseUser.uid);
    setProfile(p);
    const tokenResult = await firebaseUser.getIdTokenResult(true);
    setClaimRole(tokenResult.claims?.role ?? null);
    return p;
  }, [firebaseUser]);

  useEffect(() => {
    let profileUnsub = null;
    let roleUnsub = null;

    const authUnsub = onAuthStateChanged(auth, async (fbUser) => {
      profileUnsub?.();
      profileUnsub = null;
      roleUnsub?.();
      roleUnsub = null;

      if (fbUser) {
        setLoading(true);
        setFirebaseUser(fbUser);
        try {
          const tokenResult = await fbUser.getIdTokenResult(true);
          setClaimRole(tokenResult.claims?.role ?? null);
        } catch {
          setClaimRole(null);
        }

        profileUnsub = onSnapshot(
          doc(db, "users", fbUser.uid),
          async (snap) => {
            try {
              const data = snap.exists() ? { uid: snap.id, ...snap.data() } : null;
              setProfile(data);

              let claimsRole = null;
              try {
                const tokenResult = await fbUser.getIdTokenResult(true);
                claimsRole = tokenResult.claims?.role ?? null;
                setClaimRole(claimsRole);
              } catch {
                setClaimRole(null);
              }

              const role = claimsRole ?? data?.role ?? ROLES.SUPPORT;
              roleUnsub?.();
              roleUnsub = onSnapshot(
                doc(db, "roles", role),
                (roleSnap) => {
                  if (roleSnap.exists()) {
                    const rd = roleSnap.data();
                    setRolePermissions(rd.permissions ?? []);
                    setRoleMeta({ id: roleSnap.id, name: rd.name, description: rd.description });
                  } else {
                    setRolePermissions(null);
                    setRoleMeta({ id: role, name: ROLE_LABELS[role] ?? role });
                  }
                },
                () => {
                  setRolePermissions(null);
                  setRoleMeta({ id: role, name: ROLE_LABELS[role] ?? role });
                }
              );
            } finally {
              setLoading(false);
            }
          },
          () => setLoading(false)
        );
      } else {
        setFirebaseUser(null);
        setProfile(null);
        setClaimRole(null);
        setRolePermissions(undefined);
        setRoleMeta(null);
        setLoading(false);
      }
    });

    return () => {
      authUnsub();
      profileUnsub?.();
      roleUnsub?.();
    };
  }, []);

  const isLoaded = firebaseUser !== undefined && !loading;
  const isSignedIn = isLoaded && firebaseUser !== null;

  const roleLabel = roleMeta?.name ?? ROLE_LABELS[effectiveRole] ?? effectiveRole;

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
    firebaseUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuthContext must be used inside <AuthProvider>");
  return ctx;
}
