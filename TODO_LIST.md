# TODO LIST — Drivo Admin Dashboard

---

## 🔴 CRITICAL (Must fix before any production use)

### C-1. Add Authentication System
- **Description:** There is no login page, no JWT/token handling, no protected routes, and no session management. Any person with the URL has full admin access.
- **Reason:** Security — the system manages driver data, customer PII, payments, and promo codes with zero access control.
- **Difficulty:** High
- **Affected Files:** `src/App.jsx`, `src/main.jsx`, new `src/components/LoginPage.jsx`, new `src/context/AuthContext.jsx`
- **Dependencies:** Backend API must expose a login endpoint. All existing API calls need `Authorization` headers.

### C-2. Fix Nested BrowserRouter
- **Description:** `<BrowserRouter>` is imported and rendered in **both** `main.jsx` and `App.jsx`. The outer router in `main.jsx` wraps the inner one in `App.jsx` — this is invalid and will cause warnings and unexpected routing behavior.
- **Reason:** React Router throws warnings for nested routers; routing behavior is unpredictable.
- **Difficulty:** Easy
- **Affected Files:** `src/main.jsx` (remove `BrowserRouter` import and wrapper)
- **Dependencies:** None

### C-3. Connect TripDetailsPage to API
- **Description:** `TripDetailsPage.jsx` reads the `tripId` from `useParams()` but never fetches data from the API. All displayed trip data (location, dates, passenger info, financial details) is hardcoded.
- **Reason:** The page is functionally broken — it always shows the same fake trip regardless of which trip is clicked.
- **Difficulty:** Medium
- **Affected Files:** `src/components/TripDetailsPage.jsx`
- **Dependencies:** Backend must expose `GET /api/trips/:id`

### C-4. Fix "Change Status" and "Edit Trip" in TripsListPage — Connect to API
- **Description:** `ChangeStatusModal` only calls `console.log`. `EditTripModal` saves to local state only. Neither persists to the server.
- **Reason:** Edits are lost on page refresh. Status changes have no effect on the actual trip.
- **Difficulty:** Medium
- **Affected Files:** `src/components/TripsListPage.jsx`
- **Dependencies:** Backend must expose `PUT /api/trips/:id` and `POST /api/trips/:id/status`

### C-5. Add Payment & Refund Modals in TripDetailsPage — Connect to API
- **Description:** `AddPaymentModal` and `RefundModal` inside `TripDetailsPage.jsx` have no API calls — the submit buttons close the modal only.
- **Reason:** Financial operations silently fail with no data saved.
- **Difficulty:** Medium
- **Affected Files:** `src/components/TripDetailsPage.jsx`
- **Dependencies:** Backend endpoints for payment and refund on trip detail

### C-6. Remove Hardcoded SALES_ID in ClientsPage
- **Description:** `const SALES_ID = "1HDYgTwX7UQ64wFENRSMMY5dND33"` is hardcoded. Notes will always be attributed to this static ID.
- **Reason:** Data integrity issue — notes attribution is incorrect for all users.
- **Difficulty:** Easy (depends on auth system)
- **Affected Files:** `src/components/ClientsPage.jsx`
- **Dependencies:** C-1 (Authentication)

---

## 🟠 HIGH PRIORITY

### H-1. Connect All Driver Action Modals to API
- **Description:** `AlertModal`, `PauseModal`, `FreezeModal`, and `BlockModal` in `DriversPage.jsx` all call `onClose()` on submit without making any API call.
- **Reason:** Critical driver management actions (blocking, freezing) have no effect.
- **Difficulty:** Medium
- **Affected Files:** `src/components/DriversPage.jsx`
- **Dependencies:** Backend endpoints for driver status changes

### H-2. Connect Notifications Panel to API
- **Description:** `NotificationsPanel.jsx` (route `/notifications`) shows static mock data. The "Send Notification" modal does not call any API.
- **Reason:** The notification management page is completely non-functional.
- **Difficulty:** Medium
- **Affected Files:** `src/components/NotificationsPanel.jsx`
- **Dependencies:** Backend endpoints for listing and sending notifications

### H-3. Connect Activity Log to API
- **Description:** `ActivityLogPage.jsx` shows 8 hardcoded static activities. The role filter does not work (no logic tied to it).
- **Reason:** Admins cannot see real system activity.
- **Difficulty:** Medium
- **Affected Files:** `src/components/ActivityLogPage.jsx`
- **Dependencies:** Backend endpoint for activity logs

### H-4. Connect Approvals Center to API
- **Description:** `ApprovalsPage.jsx` shows 5 hardcoded requests. Approve/Reject buttons have no handler.
- **Reason:** The approval workflow is completely non-functional.
- **Difficulty:** Medium
- **Affected Files:** `src/components/ApprovalsPage.jsx`
- **Dependencies:** Backend endpoints for listing and processing approvals

### H-5. Connect Users Page to API
- **Description:** `UsersPage.jsx` uses local state only. Users added/edited/deleted are lost on refresh.
- **Reason:** User management has no persistence.
- **Difficulty:** Medium
- **Affected Files:** `src/components/UsersPage.jsx`
- **Dependencies:** Backend CRUD endpoints for admin users

### H-6. Connect Permissions Page to API
- **Description:** `PermissionsPage.jsx` has full UI but the "Save Changes" button has no API call. Roles in the registry are static mock data.
- **Reason:** Permission changes are not saved or enforced anywhere.
- **Difficulty:** High
- **Affected Files:** `src/components/PermissionsPage.jsx`
- **Dependencies:** Backend endpoints for roles and permissions CRUD

### H-7. NewTripFormPage — Add Form Submission
- **Description:** The trip creation form in `NewTripFormPage.jsx` has no submit handler and collects no aggregated state.
- **Reason:** The core "create trip" workflow cannot be completed.
- **Difficulty:** High (form is very complex with many nested sections)
- **Affected Files:** `src/components/NewTripFormPage.jsx`
- **Dependencies:** Backend `POST /api/trips` endpoint with defined payload structure

### H-8. Load Reward Settings on Mount
- **Description:** `RewardsPage.jsx` never fetches current reward settings — always shows hardcoded defaults.
- **Reason:** Admins think they see current settings but they may be stale defaults.
- **Difficulty:** Easy
- **Affected Files:** `src/components/RewardsPage.jsx`
- **Dependencies:** Backend `GET /api/admin/rewards/settings` endpoint

### H-9. Connect Settings/Profile Page to API
- **Description:** `SettingsPage.jsx` is 100% static with hardcoded user name, role, and performance stats.
- **Reason:** Each agent sees "احمد علي" as their name regardless of who is logged in.
- **Difficulty:** Medium
- **Affected Files:** `src/components/SettingsPage.jsx`
- **Dependencies:** C-1 (Authentication), backend profile endpoint

### H-10. Implement Logout Functionality
- **Description:** The logout button in `Layout.jsx` has no `onClick` handler.
- **Reason:** Users cannot log out of the system.
- **Difficulty:** Easy (depends on auth system)
- **Affected Files:** `src/components/Layout.jsx`
- **Dependencies:** C-1 (Authentication)

---

## 🟡 MEDIUM PRIORITY

### M-1. Remove / Consolidate Duplicate Components
- **Description:** `AddPaymentModal.jsx` and `EditTripModal.jsx` exist as standalone files but are never imported — equivalent components are duplicated inline in `TripsListPage.jsx` and `TripDetailsPage.jsx`.
- **Reason:** Code duplication, confusion, dead files.
- **Difficulty:** Easy
- **Affected Files:** `src/components/AddPaymentModal.jsx`, `src/components/EditTripModal.jsx`, `src/components/TripsListPage.jsx`, `src/components/TripDetailsPage.jsx`
- **Dependencies:** None

### M-2. Create Trip Page — Connect to API
- **Description:** `CreateTripPage.jsx` shows 4 hardcoded mock trips. Toggle and assign actions are local-state only.
- **Reason:** The "available trips" listing is fake data.
- **Difficulty:** Medium
- **Affected Files:** `src/components/CreateTripPage.jsx`
- **Dependencies:** Backend endpoint for published/available trips

### M-3. Add Global Search Functionality
- **Description:** The search bar in `Layout.jsx` (topbar) has no functionality.
- **Reason:** User expectation — search bars that do nothing erode trust.
- **Difficulty:** Medium-High
- **Affected Files:** `src/components/Layout.jsx`, possibly a new `SearchResultsPage.jsx`
- **Dependencies:** None (or backend search endpoint)

### M-4. Add Pagination to Clients Page
- **Description:** The clients list fetches all clients at once. The "View More" button in the detail modal does nothing.
- **Reason:** Performance and usability as client count grows.
- **Difficulty:** Medium
- **Affected Files:** `src/components/ClientsPage.jsx`
- **Dependencies:** Backend must support pagination params

### M-5. Add a Dedicated 404 Page
- **Description:** The catch-all `/*` route silently redirects to `TripsListPage` with no indication to the user.
- **Reason:** Poor UX — users hitting invalid URLs see trip data with no explanation.
- **Difficulty:** Easy
- **Affected Files:** `src/App.jsx`, new `src/components/NotFoundPage.jsx`
- **Dependencies:** None

### M-6. Fix `hide-scrollbar` CSS Class
- **Description:** `TripDetailsPage.jsx` uses className `hide-scrollbar` but this class is never defined anywhere.
- **Reason:** Scrollbars will show unexpectedly on some browsers.
- **Difficulty:** Easy
- **Affected Files:** `src/index.css` (add `.hide-scrollbar { scrollbar-width: none; }`)
- **Dependencies:** None

### M-7. Fix Missing `tailwindcss-animate` Plugin
- **Description:** `animate-in`, `fade-in`, `zoom-in-95`, `duration-200` classes are used throughout but `tailwindcss-animate` is not installed.
- **Reason:** Animations will silently fail — components appear with no transition.
- **Difficulty:** Easy
- **Affected Files:** `package.json`, `tailwind.config.js`
- **Dependencies:** None

### M-8. Replace Hardcoded `../judy.png` Path in Layout
- **Description:** `Layout.jsx` uses `src="../judy.png"` — a relative path that will break in production.
- **Reason:** Logo won't load in production builds.
- **Difficulty:** Easy
- **Affected Files:** `src/components/Layout.jsx`
- **Dependencies:** None (change to `/judy.png`)

### M-9. Fix Unused Dependencies
- **Description:** `@tanstack/react-query`, `axios`, and `recharts` are in `package.json` but never used. They add ~380 KB to bundle size.
- **Reason:** Unnecessary bundle bloat.
- **Difficulty:** Easy
- **Affected Files:** `package.json`
- **Dependencies:** None (remove unless planned for future use)

### M-10. Handle Token and Auth Headers in All Fetch Calls
- **Description:** Once authentication is added (C-1), all ~35 fetch calls across the app need `Authorization: Bearer <token>` headers.
- **Reason:** API calls will fail with 401 once auth is enforced.
- **Difficulty:** Medium
- **Affected Files:** All component files that call `fetch()`
- **Dependencies:** C-1

### M-11. Add Error Boundary
- **Description:** No `<ErrorBoundary>` component exists. Any runtime error in a child component will crash the entire UI.
- **Reason:** Production resilience.
- **Difficulty:** Easy
- **Affected Files:** `src/App.jsx`, new `src/components/ErrorBoundary.jsx`
- **Dependencies:** None

### M-12. Implement Dynamic Bell Badge Count
- **Description:** The yellow dot in `Layout.jsx` on the bell icon is always visible — it is not connected to the unread count from `NotificationsBellPage`.
- **Reason:** Visual noise — users can't distinguish real unread from decoration.
- **Difficulty:** Medium (needs shared state or context)
- **Affected Files:** `src/components/Layout.jsx`, `src/components/NotificationsBellPage.jsx`
- **Dependencies:** Either a context or a small global state solution

---

## 🟢 LOW PRIORITY

### L-1. Add TypeScript
- **Description:** The project uses plain JavaScript (.jsx). @types/react and @types/react-dom are already installed as devDependencies.
- **Reason:** Type safety, better IDE support, fewer runtime bugs.
- **Difficulty:** High
- **Affected Files:** All source files
- **Dependencies:** None

### L-2. Create API Abstraction Layer
- **Description:** All 35+ `fetch()` calls are directly inside components. Create a `src/api/` folder with service files per domain (trips, drivers, clients, etc.).
- **Reason:** DRY, maintainability, easier to change base URL or add auth headers in one place.
- **Difficulty:** Medium
- **Affected Files:** All component files with fetch calls, new `src/api/` directory
- **Dependencies:** None

### L-3. Activate and Use @tanstack/react-query
- **Description:** React Query is installed but never used. It would handle caching, loading/error states, refetch-on-focus, and background refresh automatically.
- **Reason:** Reduces boilerplate, improves UX with automatic cache invalidation.
- **Difficulty:** Medium
- **Affected Files:** All components with data fetching
- **Dependencies:** None

### L-4. Add Route-Level Code Splitting
- **Description:** All 20 components are eagerly imported in `App.jsx`. Add `React.lazy` and `<Suspense>` for route-level splitting.
- **Reason:** Reduces initial bundle size and time-to-interactive.
- **Difficulty:** Easy
- **Affected Files:** `src/App.jsx`
- **Dependencies:** None

### L-5. Add Input Validation and Sanitization
- **Description:** Form inputs throughout the app have minimal or no validation. Numbers accept non-numeric strings, required fields aren't consistently enforced.
- **Reason:** Data quality and security.
- **Difficulty:** Medium
- **Affected Files:** Most modal/form components
- **Dependencies:** None (or add a library like zod/react-hook-form)

### L-6. Implement Drag-and-Drop for Role Ordering
- **Description:** `PermissionsPage.jsx` shows a drag-cursor and drag icons on role items but has no drag-and-drop implementation.
- **Reason:** Feature appears broken — "drag" cursor sets incorrect user expectations.
- **Difficulty:** Medium
- **Affected Files:** `src/components/PermissionsPage.jsx`
- **Dependencies:** Install `@dnd-kit/core` or `react-beautiful-dnd`

### L-7. Rename `path_to_your_image.png` Asset
- **Description:** The file `/public/path_to_your_image.png` has a placeholder filename and is referenced by that literal name in multiple banners.
- **Reason:** Confusing asset naming, unprofessional.
- **Difficulty:** Easy
- **Affected Files:** `public/`, `src/components/DashboardPage.jsx`, `src/components/TripsListPage.jsx`, `src/components/CreateTripPage.jsx`
- **Dependencies:** None

### L-8. Add Real-time Live Chat
- **Description:** The live chat tab in `SupportPage.jsx` is a fully static mock. Implement WebSocket or polling.
- **Reason:** Live chat is expected to be real-time.
- **Difficulty:** High
- **Affected Files:** `src/components/SupportPage.jsx`
- **Dependencies:** Backend WebSocket or chat endpoint

### L-9. Add Accessibility Attributes
- **Description:** No ARIA labels, no focus trapping in modals, no keyboard navigation, no screen reader support.
- **Reason:** WCAG compliance, legal requirements in some markets.
- **Difficulty:** Medium
- **Affected Files:** All component files (especially modals and forms)
- **Dependencies:** None

### L-10. Fix Topbar Title in `index.html`
- **Description:** The page title is `my-react-app` from the Vite template.
- **Reason:** Browser tab shows "my-react-app" instead of the app name.
- **Difficulty:** Trivial
- **Affected Files:** `index.html`
- **Dependencies:** None

---

## 🔵 FUTURE / NICE-TO-HAVE

### F-1. Progressive Web App (PWA)
- Add service worker and manifest for offline support and installability.

### F-2. Multi-Language Support (i18n)
- Currently Arabic only. Add i18n for potential English-speaking admin users.

### F-3. Dark Mode
- Add Tailwind dark mode support.

### F-4. Real Charts with recharts
- Replace the custom CSS BarChart and SVG DonutChart in `DashboardPage` with `recharts` (already installed) for interactive, exportable charts.

### F-5. Audit Trail / Version History
- Add per-record change history for trips, drivers, and clients.

### F-6. Role-Based UI Rendering
- Once permissions are connected to the API, hide/disable UI elements based on the logged-in user's actual permissions.

### F-7. Push Notifications (Browser)
- Use the Web Push API to deliver real-time notifications to browser even when the tab is not active.

### F-8. CSV/Excel Export
- Replace the current print-to-browser-window export with proper CSV or XLSX generation (e.g., `xlsx` library).

### F-9. Environment Variables
- Move all hardcoded API base URLs to `.env` files (`VITE_API_BASE=...`).

### F-10. Unit and Integration Tests
- No test files exist anywhere in the project. Add Vitest + React Testing Library.
