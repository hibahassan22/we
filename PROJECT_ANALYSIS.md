# PROJECT ANALYSIS — Drivo Admin Dashboard

---

## 1. What the Project Does

Drivo is an **Arabic-language, RTL (right-to-left) web-based admin dashboard** for managing a **ride-hailing / transportation service** called "Drivo". It provides company administrators and customer-service agents with a centralised control panel to manage drivers, customers, trips, payments, rewards, support tickets, notifications, and internal system configuration.

The entire UI is in **Arabic** with `dir="rtl"` enforced at every level. The colour theme is a **gold/dark (#c9a84c, #9C6402, #1a1a1a)** palette.

---

## 2. Purpose & Target Users

| Role | Purpose |
|---|---|
| System Admin | Full access to all modules, permissions, cities, and targets |
| Customer Service Agent | Manage trips, clients, payments, support tickets |
| Supervisor / Quality | Approve/reject change requests, view activity logs |
| Accountant | Monitor payments, rewards, financial details |

---

## 3. Technology Stack

| Layer | Technology | Version |
|---|---|---|
| UI Framework | React | ^19.2.6 |
| Build Tool | Vite | ^8.0.12 |
| Routing | react-router-dom | ^7.17.0 |
| Data Fetching | Native `fetch` (primary), @tanstack/react-query installed but **not used** | ^5.101.0 |
| HTTP Client | axios installed but **not used** | ^1.17.0 |
| Styling | Tailwind CSS | ^3.4.19 |
| Icons | lucide-react (partial), inline SVG (dominant) | ^1.21.0 |
| Charts | Custom CSS/SVG BarChart + DonutChart in DashboardPage; recharts installed but **not used** | ^3.8.1 |
| Language | JavaScript (JSX) — no TypeScript |
| Map | Leaflet 1.9.4 loaded dynamically via CDN in NewTripFormPage |
| Geocoding | Nominatim (OpenStreetMap, free) |
| Linting | ESLint 10 + react-hooks + react-refresh plugins |

---

## 4. API / Backend

All API calls target `https://drivo1.elmoroj.com/api` (or `https://drivo.elmoroj.com/api` for one driver mutation).

A **Vite dev-server proxy** is configured in `vite.config.js`:
```js
'/api' → 'https://drivo1.elmoroj.com'
```
This means during development, relative `/api` calls are proxied. In production, `API_BASE` constants point directly to the absolute URL.

### Known API Endpoints (discovered from code)

| Endpoint | Method | Used In |
|---|---|---|
| `GET /api/dashboard-counts` | GET | DashboardPage |
| `GET /api/trips` | GET | TripsListPage, SupportPage |
| `POST /api/trips/:id/add-payment` | POST | TripsListPage (AddPaymentModal) |
| `GET /api/drivers` | GET | DriversPage, SupportPage |
| `POST /api/drivers` | POST | DriversPage (DriverFormModal) |
| `POST /api/driverstest/update/:id` | POST | DriversPage (DriverFormModal edit) |
| `DELETE /api/drivers/:id` | DELETE | DriversPage |
| `GET /api/drivers/:id` | GET | DriversPage (DriverDetailsPage) |
| `GET /api/driver-trips/:driverId` | GET | DriversPage (DriverTripsTab) |
| `GET /api/driver-violations/:driverId` | GET | DriversPage (DriverViolationsTab) |
| `GET /api/driver-notes/:driverId` | GET | DriversPage (DriverNotesTab) |
| `GET /api/driver-rating/:driverId` | GET | DriversPage (DriverRatingsTab) |
| `GET /api/Allcustomers` | GET | ClientsPage |
| `GET /api/customers-details/:id` | GET | ClientsPage |
| `POST /api/customers` | POST | ClientsPage |
| `POST /api/customers/update/:id` | POST | ClientsPage |
| `DELETE /api/customers/:id` | DELETE | ClientsPage |
| `GET /api/customer-notes/:id` | GET | ClientsPage |
| `POST /api/customer-notes` | POST | ClientsPage |
| `GET /api/tickets` | GET | SupportPage |
| `POST /api/tickets` | POST | SupportPage |
| `PUT /api/tickets/:id` | PUT | SupportPage |
| `DELETE /api/tickets/:id` | DELETE | SupportPage |
| `POST /api/tickets/:id/note` | POST | SupportPage |
| `GET /api/promo-codes` | GET | RewardsPage |
| `POST /api/promo-codes` | POST | RewardsPage |
| `PUT /api/promo-codes/:id` | PUT | RewardsPage |
| `DELETE /api/promo-codes/:id` | DELETE | RewardsPage |
| `POST /api/admin/rewards/settings/update` | POST | RewardsPage |
| `GET /api/drivo/admin/notifications` | GET | NotificationsBellPage |
| `POST /api/drivo/admin/notifications/mark-read` | POST | NotificationsBellPage |
| `GET /api/cities` | GET | SystemManagementPage |
| `POST /api/cities` | POST | SystemManagementPage |
| `PUT /api/cities/:id` | PUT | SystemManagementPage |
| `DELETE /api/cities/:id` | DELETE | SystemManagementPage |

---

## 5. Architecture

```
Single-Page Application (SPA)
├── React 19 + Vite
├── Client-side routing (react-router-dom v7)
├── No global state manager (no Redux, no Zustand, no Context)
├── Local component state only (useState, useEffect)
├── Direct fetch() calls inside components (no abstraction layer)
└── Tailwind CSS for all styling
```

The architecture is flat and monolithic. All logic, data fetching, and UI live directly in page-level components. There are no custom hooks, no services layer, no shared context, and no abstraction for API calls.

---

## 6. Folder Structure

```
jud/
├── public/
│   ├── favicon.svg
│   ├── icons.svg
│   ├── judy.png              ← app logo
│   ├── path_to_your_image.png ← decorative banner image (placeholder name)
│   └── person-icon.svg
├── src/
│   ├── main.jsx              ← entry point (wraps App in BrowserRouter)
│   ├── App.jsx               ← route definitions
│   ├── index.css             ← Tailwind directives only
│   ├── App.css               ← EMPTY
│   └── components/
│       ├── Layout.jsx        ← sidebar + topbar shell
│       ├── DashboardPage.jsx
│       ├── TripsListPage.jsx
│       ├── TripDetailsPage.jsx
│       ├── CreateTripPage.jsx
│       ├── NewTripFormPage.jsx
│       ├── DriversPage.jsx
│       ├── ClientsPage.jsx
│       ├── UsersPage.jsx
│       ├── ActivityLogPage.jsx
│       ├── ApprovalsPage.jsx
│       ├── PermissionsPage.jsx
│       ├── SystemManagementPage.jsx
│       ├── RewardsPage.jsx
│       ├── SupportPage.jsx
│       ├── SettingsPage.jsx
│       ├── NotificationsPanel.jsx
│       ├── NotificationsBellPage.jsx
│       ├── AddPaymentModal.jsx  ← standalone file (unused standalone, duplicated inline)
│       └── EditTripModal.jsx    ← standalone file (unused standalone, duplicated inline)
├── index.html
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── eslint.config.js
├── package.json
├── README.md (default Vite boilerplate)
└── TODO.md
```

**Note:** `AddPaymentModal.jsx` and `EditTripModal.jsx` exist as separate files but are **not imported anywhere** — equivalent components are re-implemented inline inside `TripsListPage.jsx` and `TripDetailsPage.jsx`.

---

## 7. Routing

Defined in `App.jsx`. All routes are wrapped in `<Layout>`.

| Path | Component | Notes |
|---|---|---|
| `/dashboard` | DashboardPage | Analytics & stats |
| `/trips` | TripsListPage | Trip list with API data |
| `/trips/:tripId` | TripDetailsPage | Static mock data only |
| `/notifications` | NotificationsPanel | Mock data |
| `/alerts` | NotificationsBellPage | Live API |
| `/users` | UsersPage | Mock data |
| `/activity` | ActivityLogPage | Mock data |
| `/approvals` | ApprovalsPage | Mock data |
| `/permissions` | PermissionsPage | Mock data |
| `/system` | SystemManagementPage | Partially live (Cities API) |
| `/settings` | SettingsPage | Fully static |
| `/rewards` | RewardsPage | Live API |
| `/clients` | ClientsPage | Live API |
| `/support` | SupportPage | Live API |
| `/drivers` | DriversPage | Live API |
| `/drivers/:driverId` | DriversPage | Same component, handles detail view |
| `/create-trip` | CreateTripPage | Mock data |
| `/new-trip` | NewTripFormPage | UI-only form |
| `/*` | TripsListPage | Catch-all fallback |

**Issue:** `BrowserRouter` is imported in **both** `main.jsx` and `App.jsx`, creating a **nested router**. The outer one in `main.jsx` is redundant and potentially problematic.

---

## 8. Component Hierarchy

```
App (BrowserRouter)
└── Layout (sidebar + topbar)
    ├── DashboardPage
    │   ├── StatCard (×4)
    │   ├── BarChart (custom SVG)
    │   └── DonutChart (custom SVG)
    ├── TripsListPage
    │   ├── AddPaymentModal (inline)
    │   ├── ChangeStatusModal (inline, UI-only)
    │   └── EditTripModal (inline, local-state only)
    ├── TripDetailsPage
    │   ├── AddNoteModal
    │   ├── RefundModal (UI-only)
    │   ├── ChangeStatusModal (UI-only)
    │   ├── AddPaymentModal (UI-only)
    │   └── EditTripDataModal (UI-only)
    ├── CreateTripPage
    │   └── AssignTripModal (UI-only)
    ├── NewTripFormPage
    │   ├── MapPickerModal (Leaflet CDN)
    │   ├── ExceptionModal
    │   ├── CopyScheduleModal
    │   ├── AddPassengerModal
    │   ├── DayRouteRow
    │   └── PassengerCard
    ├── DriversPage (dual-mode: list + detail)
    │   ├── DriverFormModal (Add/Edit — live API)
    │   ├── AlertModal (UI-only)
    │   ├── PauseModal (UI-only)
    │   ├── FreezeModal (UI-only)
    │   ├── BlockModal (UI-only)
    │   ├── DeleteConfirmModal (live API)
    │   ├── AssignTripModal (UI-only)
    │   ├── AddNoteModal (UI-only)
    │   ├── DriverDetailsPage (inline)
    │   │   ├── DriverTripsTab (live API)
    │   │   ├── DriverViolationsTab (live API)
    │   │   ├── DriverNotesTab (live API)
    │   │   └── DriverRatingsTab (live API)
    │   └── ProgressBar
    ├── ClientsPage
    │   ├── AddClientModal (live API)
    │   └── ClientDetailsModal (live API)
    ├── UsersPage
    │   ├── DeleteModal
    │   ├── PermissionsModal (UI-only)
    │   └── EditUserModal
    ├── ActivityLogPage
    ├── ApprovalsPage
    ├── PermissionsPage
    │   ├── ModuleRow
    │   └── ModuleExpanded
    ├── SystemManagementPage
    │   ├── TargetsTab (local state)
    │   ├── ExpenseTypesTab (local state)
    │   └── CitiesTab (live API)
    ├── RewardsPage
    │   └── PromoCodeModal (live API)
    ├── SupportPage
    │   ├── TicketModal (live API)
    │   ├── NoteModal (live API)
    │   └── DeleteModal (live API)
    ├── SettingsPage
    ├── NotificationsPanel (mock data)
    └── NotificationsBellPage (live API)
```

---

## 9. State Management

There is **no global state**. Every piece of state is managed locally inside the component that owns it using React `useState`. There is no React Context, no Redux, no Zustand, no Jotai, and no external state manager.

`@tanstack/react-query` is installed in `package.json` but **never imported or used** anywhere in the code.

`axios` is installed in `package.json` but **never imported or used** anywhere in the code.

---

## 10. Data Flow

```
Component mounts
  └── useEffect → fetch(API_URL)
        ├── Success → setState(data)
        └── Error   → setState(errorMessage)

User action (button click / form submit)
  └── Event handler → fetch(API_URL, { method: POST/PUT/DELETE, body })
        ├── Success → refresh data (re-fetch) or update local state
        └── Error   → console.error or alert()
```

Data flows **downward** via props to child modals. No upward data flow through context or event bus — callbacks (`onSave`, `onClose`, `onSaved`) are passed as props.

---

## 11. Styling

- **100% Tailwind CSS** utility classes.
- `index.css` contains only the three Tailwind directives (`@tailwind base/components/utilities`).
- `App.css` is **completely empty**.
- Custom colour palette: `#c9a84c` (gold), `#9C6402` (dark gold), `#1a1a1a` (dark sidebar), `#f5f0e8` (warm off-white background).
- `dir="rtl"` is applied on containers in every component, plus `font-sans`.
- No custom Tailwind theme extensions are defined in `tailwind.config.js`.
- No CSS animations beyond Tailwind's built-in `animate-spin`.
- A class `hide-scrollbar` is referenced in `TripDetailsPage.jsx` but **never defined** anywhere (missing custom CSS).
- `animate-in fade-in zoom-in-95 duration-200` classes are used but belong to `tailwindcss-animate` plugin which is **not installed**.

---

## 12. Performance

- No code splitting or lazy loading — all 20 components are eagerly imported in `App.jsx`.
- No `React.memo`, `useMemo`, or `useCallback` except in `SystemManagementPage.jsx` (`useCallback` for `fetchCities`).
- No pagination on TripsListPage (renders all API trips).
- No debouncing on search inputs.
- Leaflet (188 KB gzipped) is loaded dynamically from CDN only when `NewTripFormPage` opens the map modal — this is a positive performance pattern.
- Images in the banner use `path_to_your_image.png` which is a placeholder name and the file exists in `/public` — it will load but with incorrect naming.

---

## 13. Security

- **No authentication or authorization layer**. There is no login page, no JWT token management, no protected routes, no session handling.
- The logout button in the sidebar is purely decorative — it does nothing (no `onClick`).
- A hardcoded `SALES_ID = "1HDYgTwX7UQ64wFENRSMMY5dND33"` exists in `ClientsPage.jsx` as a comment saying "replace with authenticated sales ID if available".
- API calls use no `Authorization` headers.
- No CSRF protection on POST/PUT/DELETE calls.
- No input sanitization.
- Error messages from the API are surfaced directly to the user (potential information disclosure).

---

## 14. Accessibility

- No `aria-label`, `aria-describedby`, or `role` attributes on interactive elements.
- `<button>` elements are used correctly, but icons-only buttons have no text alternative.
- No keyboard navigation management (modals don't trap focus).
- No `<label for>` associations on most form inputs.
- Colour contrast may fail WCAG 2.1 AA for some light-grey-on-white text combinations.
- No skip-to-content links.

---

## 15. User Journey

```
1. User lands on /* → redirected to /trips (catch-all)
2. Sidebar navigation → click any item → navigate to route
3. Dashboard: view statistics cards, bar chart, donut chart, export button (window.print)
4. Trips List: fetch trips from API, view cards, add payment (API), change status (UI-only), edit (local state only)
5. Trip Details: view tabs (trip data / financial / notes), add notes (local state), modals for refund/status/payment (UI-only)
6. Drivers: fetch from API, search, view detail page with 5 tabs, add/edit (API), delete (API), modals for alert/pause/freeze/block (UI-only)
7. Clients: fetch from API, add/edit/delete (API), add notes (API), view trip history
8. Support: fetch/create/edit/delete tickets (API), live chat tab (mock UI only)
9. Rewards: manage promo codes (API), configure reward settings (API)
10. Notifications (Bell): fetch from API, mark all read (API)
11. Notifications (Panel): mock data, create notification modal (UI-only, no API)
12. System Management → Cities: full CRUD via API
13. Create Trip: static mock list, assign trip modal (UI-only)
14. New Trip Form: complex multi-step form with map picker — UI-only, no submission
15. Users: local state only (no API)
16. Activity Log: static mock data
17. Approvals: static mock data
18. Permissions: local state only
19── Settings: fully static profile display
```
