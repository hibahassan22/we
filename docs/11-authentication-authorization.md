# Authentication & Authorization

## 1. Authentication

### Provider
Authentication is fully delegated to **Clerk** (`@clerk/clerk-react` v5). No custom authentication logic, JWT handling, or session management exists in this codebase.

### Configuration
```env
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
```
This key is loaded in `src/main.jsx` and passed to `<ClerkProvider>`. If the key is missing, the app throws an error at startup.

### Sign-In Flow
```
User visits /any-protected-route
  → ProtectedRoute: Clerk not yet loaded → show spinner
  → ProtectedRoute: not signed in → Navigate to /sign-in
  → SignInPage renders <SignIn routing="path" path="/sign-in" afterSignInUrl="/dashboard" />
  → Clerk handles: email/password, OAuth, MFA
  → On success: redirect to /dashboard
```

### Sign-In Page Customisation
Located in `src/auth/SignInPage.jsx`. Custom Clerk appearance:
- Primary colour: `#c9a84c` (Drivo gold)
- Border radius: `12px`
- Submit button: gold background with white text

### Sign-Out
Triggered by the sidebar button, calling `useClerk().signOut({ redirectUrl: '/sign-in' })`.

### Auth State Hooks Used
| Hook | Source | Purpose |
|---|---|---|
| `useAuth()` | `@clerk/clerk-react` | `isLoaded`, `isSignedIn` |
| `useUser()` | `@clerk/clerk-react` | `user.publicMetadata`, `user.firstName`, etc. |
| `useClerk()` | `@clerk/clerk-react` | `signOut()` |

---

## 2. Authorization (RBAC)

### Role Storage
Roles are stored in **Clerk `publicMetadata`**:
```json
{
  "publicMetadata": {
    "role": "admin"
  }
}
```
`publicMetadata` is server-set and cannot be modified by the end user from the browser.

### Roles Defined

| Role Value | Arabic | Access Level |
|---|---|---|
| `admin` | مدير النظام | Full access to all routes and features |
| `support` | خدمة عملاء | Operational pages only |
| `accountant` | محاسب | Financial pages only |

### Route-Level Access Control

Defined in `src/lib/roles.js` as `ROLE_ROUTES`:

```js
support: [
  "/dashboard", "/trips", "/clients", "/drivers",
  "/support", "/notifications", "/alerts", "/activity",
  "/approvals", "/settings"
],
accountant: [
  "/dashboard", "/trips", "/rewards", "/settings"
]
```

Admins bypass this check (`if (!role || role === "admin") return true`).

The `canAccess(role, pathname)` function is called in `ProtectedRoute.jsx`:
- If the user's role does not permit the pathname → redirect to `/dashboard`.

### Navigation Visibility Control

Defined in `src/lib/roles.js` as `NAV_ROLE_MAP`:

| Route | Visible To |
|---|---|
| `/dashboard` | All |
| `/trips` | All |
| `/create-trip` | admin, support |
| `/clients` | admin, support |
| `/drivers` | admin, support |
| `/rewards` | admin, accountant |
| `/support` | admin, support |
| `/notifications` | admin, support |
| `/activity` | admin, support |
| `/approvals` | admin, support |
| `/permissions` | admin only |
| `/users` | admin only |
| `/system` | admin only |
| `/settings` | All |

Sidebar items for routes not in the user's allowed set are filtered out in `Layout.jsx`.

---

## 3. ProtectedRoute Logic

```jsx
export default function ProtectedRoute({ children }) {
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const location = useLocation();

  // 1. Wait for Clerk to initialise
  if (!isLoaded) return <LoadingSpinner />;

  // 2. Redirect unauthenticated users
  if (!isSignedIn) return <Navigate to="/sign-in" state={{ from: location }} replace />;

  // 3. Check role access
  const role = user?.publicMetadata?.role ?? "admin"; // ⚠️ SECURITY RISK
  if (!canAccess(role, location.pathname)) return <Navigate to="/dashboard" replace />;

  return children;
}
```

### ⚠️ Security Gap — Default Role
The fallback `?? "admin"` on line 3 means any user authenticated via Clerk **without a role set** is treated as a full administrator. This is a privilege escalation vulnerability.

**Fix required:**
```js
// Should be:
const role = user?.publicMetadata?.role ?? "support";
```

---

## 4. Activity Log Tab Authorization

`ActivityLogPage.jsx` also implements role-based access:
- **Admin:** can switch between Admin, Sales, and Driver tabs.
- **Support / Accountant:** locked to their own role's tab using the `currentRole` from Clerk metadata.

---

## 5. Feature-Level Authorization

There is **no feature-level authorization** beyond route access. Once a user reaches a permitted route, they can see and attempt all actions on that page regardless of their role. For example:
- A support agent on `/drivers` can see the "permanently block" button (even if the action should be admin-only).
- Action-level role checking does not exist in the frontend.

---

## 6. API Authorization

**No auth headers are sent to the backend API.** All `fetch()` calls in the codebase omit Authorization headers:
```js
fetch(`${BASE}/drivers`)  // No Authorization header
```
This means the backend either:
- Has its own session/cookie-based auth that is set elsewhere, or
- Accepts unauthenticated requests for admin operations (critical security risk)

This must be investigated and resolved with the backend team.

---

## 7. Firebase Firestore Authorization

Firebase Firestore is accessed directly from the browser using the hardcoded config. Security depends entirely on Firestore Security Rules configured in the Firebase Console, which are **not visible in this repository**.

Without proper rules, any person with the Firebase config (which is in the committed source code) could read or write to the `notifications` collection.

---

## 8. Recommendations

| Priority | Recommendation |
|---|---|
| Critical | Change the default role fallback from `"admin"` to `"support"` |
| Critical | Add `Authorization` headers to all API calls using Clerk session token |
| High | Review and document Firestore Security Rules |
| High | Move Firebase config to environment variables |
| Medium | Add feature/action-level role checks for destructive operations (block driver, delete records) |
| Medium | Validate role on the backend API, not just the frontend |
