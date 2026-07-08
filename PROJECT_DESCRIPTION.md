# Drivo — Transportation Service Admin Dashboard

> A comprehensive Arabic-language web admin panel for managing the Drivo ride-hailing and transportation service platform.

---

## Vision

Drivo Admin Dashboard is a centralised operations hub that gives transportation company administrators and customer-service agents complete visibility and control over every aspect of the Drivo platform — from driver onboarding and trip lifecycle management to financial tracking, reward programs, and support ticketing.

---

## Goals

- Provide a **single interface** for all operational workflows: drivers, clients, trips, payments, notifications, and system configuration.
- Enable **real-time monitoring** of trip statuses and driver performance.
- Support **financial management** through payment recording, promo codes, and reward configuration.
- Offer a **multi-role access model** where different users (admin, customer service, quality, accountant) see and do only what their role permits.
- Deliver a **polished, professional Arabic-first RTL experience** consistent with the cultural and linguistic context of the target market.

---

## Architecture

```
React 19 SPA
  ├── Vite 8 build tool (HMR, optimised production bundles)
  ├── react-router-dom v7 (client-side routing, 19 routes)
  ├── Tailwind CSS v3 (utility-first styling, RTL-aware)
  ├── Native fetch() for all API communication
  └── Backend: REST API at drivo1.elmoroj.com
```

The application is a classic SPA with no server-side rendering. All routing is client-side. State is managed locally in each component with React `useState` and `useEffect`.

---

## Technical Highlights

### Arabic-First Design
Every component is built with `dir="rtl"` and Arabic text. Navigation labels, form placeholders, modal titles, error messages, and status badges are all in Arabic. Date formatting uses `ar-EG` and `ar-SA` locale strings.

### Rich Trip Management
The trips module (`TripsListPage`, `TripDetailsPage`, `CreateTripPage`) supports complex trip types: individual vs. group, one-way vs. round-trip, weekly subscriptions vs. monthly schedules, single-route vs. multi-route. Financial details include total price, commission, amount paid, and transfer method.

### Comprehensive Driver Management
`DriversPage.jsx` is the most feature-complete module (~1,044 lines): driver CRUD with image uploads (FormData), status management (active/frozen/blocked/suspended), and a 5-tab detail view covering personal info, trip history (paginated), violations, admin notes, and star ratings — all backed by live API calls.

### Reward System Configuration
`RewardsPage.jsx` allows full configuration of the rewards engine: app-download bonuses, invite-a-driver rewards, a points earn/redeem system with exchange rates, usage limits, and promo code management (add/edit/delete/usage-progress) — all connected to the live API.

### Map-Integrated Trip Creation
`NewTripFormPage.jsx` includes a Leaflet map picker (dynamically loaded from CDN) with Nominatim geocoding for location search, per-day multi-stop scheduling, time exception handling, and passenger management — one of the most complex forms in the system.

### Support Ticketing with Driver Context
`SupportPage.jsx` creates tickets linked to specific drivers and optionally to specific trips (dynamically loaded per driver). It supports priority levels, issue categorisation, status updates, and note threads.

### System Administration
`SystemManagementPage.jsx` manages foundational reference data: cities (full CRUD via API), performance target bands (colour-coded by range), and expense type categories.

---

## User Experience

- **Warm gold (#c9a84c) and dark (#1a1a1a) colour scheme** creates a premium, trustworthy feel.
- **Card-based layout** with rounded corners, subtle shadows, and clean whitespace.
- **Consistent modal pattern** across the app: backdrop blur, zoom-in animation, scrollable body, action button at bottom.
- **Responsive banner sections** on each page with the total count prominently displayed.
- **Loading spinners and error states** on all API-fetching components.
- **Inline confirmation modals** before destructive actions (delete driver, delete promo code, delete client).

---

## Current Limitations

1. **No authentication** — the system has no login page, no token management, and no route protection.
2. **Mixed live/mock data** — roughly half the pages show real API data; the other half show hardcoded static data.
3. **No form submission on trip creation** — the most complex form (`NewTripFormPage`) cannot actually create a trip.
4. **No global state** — installed libraries (React Query, axios) are unused; state management does not scale beyond the current module count.
5. **No TypeScript** — the codebase has no type safety despite having `@types/react` installed.
6. **Duplicate components** — `AddPaymentModal.jsx` and `EditTripModal.jsx` exist as files but are unused; their logic is duplicated inline.

---

## Future Potential

- **Role-based access control**: permissions infrastructure is designed and the UI is built — connecting it to the backend and using it to conditionally render UI elements would complete the RBAC system.
- **Real-time operations**: WebSocket integration would enable live trip tracking, driver location updates, and instant chat.
- **Analytics expansion**: the dashboard's chart infrastructure can be enhanced with the already-installed `recharts` library for interactive, exportable analytics.
- **Mobile PWA**: the responsive Tailwind layout would translate well to a Progressive Web App for field supervisors using tablets.
- **Full financial reporting**: the payment and commission data already flowing through the API can be aggregated into a dedicated financial reporting module.

---

## Quick Stats

| Metric | Value |
|---|---|
| Total source files | 22 JSX + 4 config |
| Total lines of code | ~9,500 |
| Live API pages | 8 |
| Mock-only pages | 7 |
| Partially connected pages | 5 |
| Defined routes | 19 |
| API endpoints used | 35+ |
| Dependencies (runtime) | 6 |
| Dependencies unused | 3 (axios, react-query, recharts) |
