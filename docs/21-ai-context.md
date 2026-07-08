# AI Context Document

This document provides structured context for AI assistants (Kiro, Copilot, Claude, GPT, etc.) working on the Drivo admin dashboard codebase. Load this file before making code suggestions or edits.

---

## Project Identity

- **Name:** Drivo Admin Dashboard
- **Type:** React SPA (admin panel for a ride-booking service)
- **Language:** Arabic (RTL) UI, JavaScript (no TypeScript)
- **Framework:** React 19 + Vite 8
- **Styling:** Tailwind CSS 3
- **Auth:** Clerk (`@clerk/clerk-react`)
- **Realtime:** Firebase Firestore (notifications only)
- **Backend:** External REST API at `https://drivo1.elmoroj.com/api`

---

## Repository Layout

```
src/
├── main.jsx            → Bootstrap: ClerkProvider > ToastProvider > App
├── App.jsx             → BrowserRouter + all 22 routes
├── auth/
│   ├── ProtectedRoute.jsx   → Auth guard + RBAC using Clerk metadata
│   └── SignInPage.jsx       → Clerk SignIn component wrapper
├── components/         → 21 page components (flat directory)
│   └── Layout.jsx      → Shell: collapsible sidebar + topbar + chat modal
├── lib/
│   ├── firebase.js     → Firestore db instance (HARDCODED config — needs env vars)
│   ├── roles.js        → canAccess(), ROLE_ROUTES, NAV_ROLE_MAP
│   ├── toast.jsx       → ToastProvider, useToast(), global toast singleton
│   ├── notificationsService.js  → LEGACY — superseded by services/notifications.js
│   └── useUnreadCount.js   → Firestore real-time unread count hook
└── services/
    └── notifications.js    → Active notification service (Firestore + API sync)
```

---

## Critical Rules for AI Contributions

### 1. Do NOT introduce new dependencies
The project already has unused packages (`axios`, `@tanstack/react-query`, `recharts`). Do not suggest adding new libraries without explicit user request.

### 2. API calls must use `fetch()` with error handling
```js
// Pattern to follow:
const r = await fetch(BASE + "/endpoint");
if (!r.ok) {
  const err = await r.json().catch(() => ({}));
  throw new Error(err.message ?? `HTTP ${r.status}`);
}
const data = await r.json();
```

### 3. All UI text must be Arabic
All user-facing strings, labels, placeholders, and messages must be in Arabic.

### 4. RTL layout
All containers must have `dir="rtl"`. Text is right-aligned by default.

### 5. Use the project's colour palette
- Gold primary: `#c9a84c`
- Dark (sidebar): `#1a1a1a`
- Page background: `#f0ede8`
- Card background: `white`

### 6. Do NOT modify the default role fallback without flagging it
The current `?? "admin"` default in `ProtectedRoute.jsx` is a known security bug. If asked to edit auth code, flag this.

### 7. Toast notifications for all user actions
```js
const toast = useToast();
toast.success("تم الحفظ بنجاح");
toast.error("حدث خطأ");
```

### 8. Modals should use `createPortal`
```jsx
import { createPortal } from "react-dom";
const Portal = ({ children }) =>
  typeof document !== "undefined" ? createPortal(children, document.body) : null;
```

---

## Known Bugs to Preserve Awareness Of

| Bug | Location | Notes |
|---|---|---|
| Default role = `"admin"` | `ProtectedRoute.jsx` line ~19 | Security risk — flag but don't fix without instruction |
| `SALES_ID` hardcoded | `ClientsPage.jsx` top of file | Should come from Clerk user |
| Driver status modals have no API calls | `DriversPage.jsx` — all 4 status modals | Block/freeze/pause/alert are UI-only |
| Trip details page shows static data | `TripDetailsPage.jsx` | `tripId` param not used |
| Rewards settings not loaded from API | `RewardsPage.jsx` | No GET on mount |
| Settings page hardcoded name | `SettingsPage.jsx` | "احمد علي" — not from Clerk |

---

## Roles & Access Control

```js
// From src/lib/roles.js
ROLES = { ADMIN: "admin", SUPPORT: "support", ACCOUNTANT: "accountant" }

// Admin: full access
// Support: /dashboard /trips /clients /drivers /support /notifications /alerts /activity /approvals /settings
// Accountant: /dashboard /trips /rewards /settings
// Unauthenticated: redirect to /sign-in
// Wrong role: redirect to /dashboard
```

---

## Firestore Data Model

```
Collection: notifications
Document fields: title(str), body(str), driverId(str), type(str), read(bool), createdAt(Timestamp)
Operations: addDoc, onSnapshot, updateDoc
Used by: Layout.jsx (bell dropdown), useUnreadCount.js (badge count)
Synced from: GET /api/drivo/admin/notifications → syncBackendNotifications()
```

---

## API Base URL Pattern

Every page component currently has:
```js
const BASE = "https://drivo1.elmoroj.com/api";
```
This is technical debt (TD-14). When asked to add a new API call, use the same pattern for now, but note the debt.

---

## Component Patterns

### Standard page skeleton
```jsx
export default function SomePage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const toast = useToast();

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(BASE + "/endpoint", { headers: { Accept: "application/json" } });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const d = await r.json();
      setData(Array.isArray(d) ? d : (d.data ?? []));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) return <Spinner />;
  if (error) return <ErrorMessage message={error} onRetry={fetchData} />;

  return ( /* JSX */ );
}
```

### Inline spinner (until shared component is created)
```jsx
const Spinner = () => (
  <div className="flex items-center justify-center py-20">
    <div className="w-10 h-10 border-4 border-[#c9a84c] border-t-transparent rounded-full animate-spin" />
  </div>
);
```

---

## Files to Avoid Editing Unless Necessary

| File | Reason |
|---|---|
| `src/lib/notificationsService.js` | Legacy — superseded by `services/notifications.js` |
| `src/components/Layout.bak.jsx` | Should be deleted, not edited |
| `src/lib/firebase.js` | Config should move to env vars before edits |

---

## What "Done" Looks Like for New Features

When implementing a feature (e.g., wiring the freeze driver modal to the API):
1. API call implemented with correct endpoint and payload.
2. Loading state shown during the request.
3. Success toast shown on completion.
4. Error toast shown on failure.
5. Relevant list or state refreshed after success.
6. Modal closes after success (with brief success visual if applicable).
7. No console.log left in the code.
8. ESLint passes.
