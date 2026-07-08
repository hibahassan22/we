# Technical Debt

This document catalogues all identified technical debt in the Drivo admin dashboard, organised by severity.

---

## Severity Levels
- 🔴 **Critical** — Blocking security, data integrity, or core functionality
- 🟠 **High** — Significant maintainability or correctness issues
- 🟡 **Medium** — Code quality and developer experience issues
- 🟢 **Low** — Minor polish and cleanup items

---

## 1. Security Debt (Critical)

### TD-01 — Default Role Fallback Grants Admin Access
**Location:** `src/auth/ProtectedRoute.jsx`
**Impact:** Any user without an explicit Clerk role becomes a full admin.
**Fix:** `const role = user?.publicMetadata?.role ?? "support";`

### TD-02 — No Auth Headers on API Requests
**Location:** All `fetch()` calls across all page components
**Impact:** Backend API is effectively unauthenticated from the frontend.
**Fix:** Create a centralised `apiFetch()` wrapper that attaches the Clerk session token.

### TD-03 — Firebase Credentials in Source Code
**Location:** `src/lib/firebase.js`
**Impact:** Credentials committed to version control.
**Fix:** Move all Firebase config values to `.env` and read via `import.meta.env`.

### TD-04 — `.env` Not in `.gitignore`
**Location:** `.gitignore`
**Impact:** `.env` may be committed, exposing `VITE_CLERK_PUBLISHABLE_KEY`.
**Fix:** Add `.env`, `.env.local`, `.env.production` to `.gitignore`.

---

## 2. Non-Functional Features (High)

### TD-05 — Driver Status Actions Have No API Integration
**Location:** `DriversPage.jsx` — `PauseModal`, `FreezeModal`, `BlockModal`, `AlertModal`
**Impact:** Staff believe they are pausing/blocking/notifying drivers but nothing actually happens.
**Fix:** Wire each modal's confirm button to the appropriate backend endpoint.

### TD-06 — Trip Details Page Uses Static Mock Data
**Location:** `TripDetailsPage.jsx`
**Impact:** Staff navigating to a trip detail sees static hardcoded data, not the real trip.
**Fix:** Use `useParams()` to get `tripId` and fetch from API on mount.

### TD-07 — Users Page Has No Backend Integration
**Location:** `UsersPage.jsx`
**Impact:** Creating/editing/deleting users has no effect after page refresh.
**Fix:** Integrate with Clerk user management API or a backend users endpoint.

### TD-08 — Permissions Page Has No Backend Integration
**Location:** `PermissionsPage.jsx`
**Impact:** Role and permission configurations are lost on page refresh.
**Fix:** Design and implement a permissions storage endpoint; persist on save.

### TD-09 — Settings Page Shows Hardcoded Data
**Location:** `SettingsPage.jsx`
**Impact:** Profile shows "احمد علي / خدمة عملاء" regardless of who is signed in.
**Fix:** Use `useUser()` from Clerk to populate name and role.

### TD-10 — Rewards Settings Not Pre-loaded from API
**Location:** `RewardsPage.jsx`
**Impact:** Each time the rewards page is opened, all settings show their default (blank/default) values, not the saved values.
**Fix:** Add a GET endpoint for rewards settings and call it on page mount.

### TD-11 — Create Trip Page Uses Static Mock Data
**Location:** `CreateTripPage.jsx`
**Impact:** The list of available trip listings is static and not from the database.
**Fix:** Implement `GET /api/trip-listings` and load on mount.

### TD-12 — Chat System Is UI-Only Mock
**Location:** `SupportPage.jsx` (Live Chat tab), `Layout.jsx` (ChatModal)
**Impact:** Messages entered by staff are lost on close/refresh. No real communication happens.
**Fix:** Implement a real-time messaging solution (WebSocket, Firebase, or third-party chat SDK).

### TD-13 — System Management Targets Tab Not Persisted
**Location:** `SystemManagementPage.jsx` (TargetsTab)
**Impact:** Sales target rules disappear on page refresh.
**Fix:** Add CRUD API endpoints for targets and wire the tab.

---

## 3. Architecture Debt (High)

### TD-14 — API Base URL Hardcoded in Every Component
**Location:** ~10 components each define `const BASE = "https://drivo1.elmoroj.com/api"`
**Impact:** Changing the API URL requires editing every component. No environment separation possible.
**Fix:** Create `src/lib/api.js`:
```js
export const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "https://drivo1.elmoroj.com/api";
export async function apiFetch(path, options = {}) { ... }
```

### TD-15 — Duplicate Notifications Service
**Location:** `src/lib/notificationsService.js` and `src/services/notifications.js`
**Impact:** Two files implement overlapping Firestore notification logic with subtle differences. Risk of divergence and bugs.
**Fix:** Delete `src/lib/notificationsService.js`; consolidate everything in `src/services/notifications.js`.

### TD-16 — No Code Splitting / Lazy Loading
**Location:** `src/App.jsx`
**Impact:** All 21 page components load in a single bundle at startup. Initial load time increases as the app grows.
**Fix:**
```jsx
const DashboardPage = React.lazy(() => import('./components/DashboardPage'));
// Wrap routes in <Suspense fallback={<Spinner />}>
```

### TD-17 — No Global Error Boundary
**Location:** Missing from `src/App.jsx` or `src/main.jsx`
**Impact:** An unhandled error in any component crashes the entire application with a blank white screen.
**Fix:** Add a React `ErrorBoundary` component at the root level.

### TD-18 — No Centralised HTTP Client
**Location:** All page components
**Impact:** No consistent error handling, no auth headers, no request/response interceptors, no retry logic.
**Fix:** Create a thin fetch wrapper or configure TanStack React Query (already installed).

### TD-19 — Duplicate Modal Implementations
**Location:**
- `AddPaymentModal` exists in `TripsListPage.jsx` AND `TripDetailsPage.jsx`
- `ChangeStatusModal` exists in both pages
- `EditTripModal` exists in `TripsListPage.jsx`, `TripDetailsPage.jsx`, AND as a standalone file `EditTripModal.jsx`

**Impact:** Bug fixes must be applied in multiple places.
**Fix:** Keep only the standalone `EditTripModal.jsx` and import it everywhere.

---

## 4. Code Quality Debt (Medium)

### TD-20 — Monolithic Page Components
**Location:** `DriversPage.jsx` (814 lines), `Layout.jsx` (710 lines), `NewTripFormPage.jsx` (1082 lines), `SystemManagementPage.jsx` (925 lines), `SupportPage.jsx` (700+ lines)
**Impact:** Hard to read, test, and maintain. Multiple concerns mixed in one file.
**Fix:** Extract modal components, form sections, and sub-features into separate files.

### TD-21 — Hardcoded `SALES_ID` String
**Location:** `src/components/ClientsPage.jsx`
```js
const SALES_ID = "1HDYgTwX7UQ64wFENRSMMY5dND33";
```
**Impact:** All customer notes are incorrectly attributed to one hardcoded user ID.
**Fix:** Derive from `useUser()`: `user?.publicMetadata?.userId ?? user?.id`.

### TD-22 — Date Formatting Reimplemented 4+ Times
**Location:** `Layout.jsx`, `ActivityLogPage.jsx`, `NotificationsBellPage.jsx`, `SupportPage.jsx`
**Impact:** Inconsistent formatting, duplicate code to maintain.
**Fix:** Create `src/lib/formatDate.js` and import everywhere.

### TD-23 — Spinner/Loading Component Reimplemented 8+ Times
**Location:** Multiple components define inline `Spinner` or loading divs.
**Impact:** Inconsistent UX, duplicate code.
**Fix:** Create `src/components/ui/Spinner.jsx` and import everywhere.

### TD-24 — Inconsistent Icon Strategy
**Location:** Some pages use Lucide React (`import { Plus } from 'lucide-react'`), most use inline SVG paths.
**Impact:** Inconsistent bundle impact, no design system alignment.
**Fix:** Standardise on Lucide React or on inline SVG — pick one and migrate.

### TD-25 — Missing `useCallback` on Fetch Functions
**Location:** Pages where `fetchData` functions are defined inside the component body and passed to `useEffect`.
**Impact:** Potential infinite re-renders; linting warnings.
**Fix:** Wrap fetch functions with `useCallback` (already correctly done in `ApprovalsPage.jsx` and `ActivityLogPage.jsx` — replicate elsewhere).

### TD-26 — `if (res.ok || res.status < 500)` Pattern
**Location:** `DriversPage.jsx`, `RewardsPage.jsx`
**Impact:** Treating `4xx` responses as success (e.g., 400, 422 errors silently succeed).
**Fix:** Use only `if (res.ok)` or `if (res.status >= 200 && res.status < 300)`.

---

## 5. Dependency Debt (Medium)

### TD-27 — Axios Installed but Never Used
**Location:** `package.json`
**Impact:** Adds ~14KB to the bundle unnecessarily.
**Fix:** `npm uninstall axios`

### TD-28 — TanStack React Query Installed but Never Used
**Location:** `package.json`
**Impact:** Adds ~40KB to the bundle; confuses developers.
**Fix:** Either remove (`npm uninstall @tanstack/react-query`) or adopt it as the standard data-fetching solution.

### TD-29 — `package.json` Name Never Updated
**Location:** `package.json`
```json
"name": "my-react-app"
```
**Impact:** Generic default from Vite scaffold.
**Fix:** `"name": "drivo-admin-dashboard"`

---

## 6. Structural Debt (Low)

### TD-30 — `Layout.bak.jsx` Committed to Repository
**Location:** `src/components/Layout.bak.jsx`
**Impact:** Dead code in the repository. Confuses developers.
**Fix:** Delete the file.

### TD-31 — All Components in One Flat Directory
**Location:** `src/components/` — 21 files all at root level
**Impact:** Difficult to navigate as the app grows.
**Fix:** Organise into subdirectories:
```
src/components/
├── pages/
├── modals/
├── ui/        (shared Button, Spinner, Badge, etc.)
└── layout/    (Layout, Sidebar, Topbar, Breadcrumb)
```

### TD-32 — No TypeScript
**Location:** Entire codebase
**Impact:** No compile-time type checking. Runtime errors from API shape mismatches are common.
**Fix (long-term):** Migrate to TypeScript incrementally, starting with `src/lib/` and `src/auth/`.

### TD-33 — Dashboard Charts Use Mock Data
**Location:** `DashboardPage.jsx`
**Impact:** The bar chart shows static 2025 monthly data; the donut chart uses fixed percentage ratios rather than real breakdown counts.
**Fix:** Add API endpoints for monthly trip counts and status breakdowns.

---

## Debt Summary

| Category | Count | Critical | High | Medium | Low |
|---|---|---|---|---|---|
| Security | 4 | 4 | 0 | 0 | 0 |
| Non-functional features | 9 | 0 | 9 | 0 | 0 |
| Architecture | 6 | 0 | 6 | 0 | 0 |
| Code quality | 7 | 0 | 0 | 7 | 0 |
| Dependencies | 3 | 0 | 0 | 3 | 0 |
| Structural | 4 | 0 | 0 | 0 | 4 |
| **Total** | **33** | **4** | **15** | **10** | **4** |
