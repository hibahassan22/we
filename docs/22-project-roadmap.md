# Project Roadmap

This roadmap organises all known work into prioritised phases based on severity, user impact, and dependencies.

---

## Phase 0 — Critical Security Fixes
**Target:** Complete immediately, before any production traffic

| ID | Task | File | Effort |
|---|---|---|---|
| P0-01 | Change default role fallback from `"admin"` to `"support"` | `ProtectedRoute.jsx` | XS (1 line) |
| P0-02 | Add `.env`, `.env.local`, `.env.production` to `.gitignore` | `.gitignore` | XS |
| P0-03 | Move Firebase config to environment variables | `firebase.js`, `.env` | S |
| P0-04 | Add Clerk session token to all API requests | Centralise in `src/lib/api.js` | M |
| P0-05 | Review and restrict Firestore Security Rules | Firebase Console | M |

---

## Phase 1 — Core Data Completeness
**Target:** Complete before full operational rollout

These features exist in the UI but have no backend integration. Staff currently believe they work.

| ID | Task | File | Effort |
|---|---|---|---|
| P1-01 | Wire driver pause modal to backend API | `DriversPage.jsx` | S |
| P1-02 | Wire driver freeze modal to backend API | `DriversPage.jsx` | S |
| P1-03 | Wire driver block modal to backend API | `DriversPage.jsx` | S |
| P1-04 | Wire individual driver notification to `POST /api/send-driver-notification` | `DriversPage.jsx` | S |
| P1-05 | Load real trip data in TripDetailsPage using `tripId` param | `TripDetailsPage.jsx` | M |
| P1-06 | Wire trip status change to backend API | `TripDetailsPage.jsx`, `TripsListPage.jsx` | M |
| P1-07 | Wire trip edit to backend API | `TripDetailsPage.jsx`, `TripsListPage.jsx` | M |
| P1-08 | Wire trip notes to backend API | `TripDetailsPage.jsx` | S |
| P1-09 | Load rewards settings from API on page open | `RewardsPage.jsx` | S |
| P1-10 | Fix Settings page to use Clerk user data | `SettingsPage.jsx` | S |
| P1-11 | Fix hardcoded `SALES_ID` in ClientsPage | `ClientsPage.jsx` | S |

---

## Phase 2 — Architecture Refactoring
**Target:** Complete within first month of production use

| ID | Task | Files | Effort |
|---|---|---|---|
| P2-01 | Create centralised `src/lib/api.js` with `apiFetch()` | New file | M |
| P2-02 | Replace all 10+ hardcoded `BASE` constants with `apiFetch` | All page components | M |
| P2-03 | Delete `src/lib/notificationsService.js` (duplicate) | `notificationsService.js` | S |
| P2-04 | Add `React.lazy()` + `Suspense` code splitting to all routes | `App.jsx` | M |
| P2-05 | Add global `ErrorBoundary` component | `App.jsx` | S |
| P2-06 | Delete `Layout.bak.jsx` | `Layout.bak.jsx` | XS |
| P2-07 | Consolidate duplicate `AddPaymentModal`, `ChangeStatusModal`, `EditTripModal` | Multiple files | M |
| P2-08 | Create `src/components/ui/` with shared `Spinner`, `Badge`, `ConfirmModal` | New files | M |
| P2-09 | Create shared `formatDate` utility and replace 4+ inline implementations | `src/lib/formatDate.js` | S |

---

## Phase 3 — Missing Features
**Target:** Complete as sprint deliverables

### 3.1 Users Management
| ID | Task | Effort |
|---|---|---|
| P3-01 | Connect UsersPage to backend users API or Clerk user management | L |
| P3-02 | Wire create user to real API call | M |
| P3-03 | Wire edit/delete user to real API call | M |

### 3.2 Permissions
| ID | Task | Effort |
|---|---|---|
| P3-04 | Design and implement `GET /api/roles` and `POST /api/roles` backend endpoints (with backend team) | L |
| P3-05 | Wire PermissionsPage save to `POST /api/roles` | M |
| P3-06 | Load existing roles from API on page open | S |

### 3.3 System Management — Targets
| ID | Task | Effort |
|---|---|---|
| P3-07 | Add CRUD API endpoints for sales targets (with backend team) | L |
| P3-08 | Wire TargetsTab to API | M |

### 3.4 Trip Creation
| ID | Task | Effort |
|---|---|---|
| P3-09 | Load real trip listings from API in `CreateTripPage` | M |
| P3-10 | Wire toggle active/inactive for trip listings | M |
| P3-11 | Complete trip creation form payload mapping in `NewTripFormPage` | L |
| P3-12 | Wire `AssignTripModal` to assign driver API | M |

### 3.5 Dashboard Analytics
| ID | Task | Effort |
|---|---|---|
| P3-13 | Add `GET /api/dashboard-monthly-stats` endpoint (with backend team) | L |
| P3-14 | Replace static bar chart data with live monthly data | M |
| P3-15 | Add `GET /api/dashboard-trip-status` endpoint (with backend team) | M |
| P3-16 | Replace fixed-ratio donut chart with real status breakdown | M |

---

## Phase 4 — Quality & Testing
**Target:** Ongoing, integrated into development workflow

| ID | Task | Effort |
|---|---|---|
| P4-01 | Install and configure Vitest + React Testing Library + MSW | S |
| P4-02 | Write unit tests for `src/lib/roles.js` | S |
| P4-03 | Write component tests for `ProtectedRoute` | S |
| P4-04 | Write integration tests for drivers CRUD flow | M |
| P4-05 | Write integration tests for approvals flow | M |
| P4-06 | Write integration tests for notifications send | S |
| P4-07 | Set up Playwright with critical E2E flows | M |
| P4-08 | Add test coverage reporting to CI | S |
| P4-09 | Enforce lint + test pass in CI before merge | S |

---

## Phase 5 — Developer Experience
**Target:** Alongside Phase 4

| ID | Task | Effort |
|---|---|---|
| P5-01 | Remove unused dependencies: `axios`, `recharts` (if not used) | XS |
| P5-02 | Adopt TanStack React Query as standard data-fetching solution | L |
| P5-03 | Standardise icons on Lucide React | M |
| P5-04 | Rename `package.json` name to `drivo-admin-dashboard` | XS |
| P5-05 | Organise components into subdirectories (`pages/`, `modals/`, `ui/`, `layout/`) | M |
| P5-06 | Add TypeScript incrementally starting with `src/lib/` | L |

---

## Phase 6 — Feature Enhancements
**Target:** Future product roadmap items

| ID | Feature | Description | Priority |
|---|---|---|---|
| P6-01 | Real-time chat | Replace mock chat with WebSocket or Firebase Realtime DB | High |
| P6-02 | Live driver tracking | Show driver locations on map during active trips | Medium |
| P6-03 | Advanced analytics | Revenue charts, driver performance metrics, conversion funnels | Medium |
| P6-04 | Bulk notifications | Send to specific driver segments (city, vehicle type, status) | Medium |
| P6-05 | Export to Excel | Export drivers/clients/trips data to spreadsheet | Low |
| P6-06 | Dark mode | Toggle between light and dark UI | Low |
| P6-07 | Mobile-responsive layout | Tablet-friendly sidebar and card layouts | Low |
| P6-08 | Two-factor auth enforcement | Require MFA for admin accounts via Clerk | High (security) |

---

## Effort Reference

| Size | Time Estimate |
|---|---|
| XS | < 1 hour |
| S | 1–4 hours |
| M | 1–2 days |
| L | 3–5 days |
| XL | 1–2 weeks |

---

## Dependencies Between Phases

```
Phase 0 (Security) ──→ Phase 1 (must have P0-04 before wiring API calls)
Phase 1 ──────────────→ Phase 2 (refactoring is easier after features are complete)
Phase 2 ──────────────→ Phase 4 (testing is easier on cleaner architecture)
Phase 2 ──────────────→ Phase 5 (DX improvements build on clean architecture)
Phase 1 + 3 ──────────→ Phase 6 (enhancements require core features to be complete)
```

---

## Immediate Action Items (This Week)

1. **P0-01** Fix `ProtectedRoute.jsx` default role — 1 line, 5 minutes.
2. **P0-02** Add `.env` to `.gitignore` — 1 line, 5 minutes.
3. **P0-03** Move Firebase config to env vars — 30 minutes.
4. **P0-04** Create `apiFetch()` wrapper with Clerk token — 2 hours.
5. **P1-10** Fix `SettingsPage.jsx` to use real Clerk user data — 1 hour.
6. **P1-11** Fix hardcoded `SALES_ID` — 30 minutes.
7. **P2-06** Delete `Layout.bak.jsx` — 1 minute.
