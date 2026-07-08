# Functional Requirements Specification (FRS)

## Conventions
- **FR-** prefix = Functional Requirement
- **Status:** `Implemented` | `Partial` | `UI-Only` | `Missing`
- "UI-Only" means the UI exists but the feature is not connected to the API.

---

## Module 1 — Authentication

| ID | Requirement | Status |
|---|---|---|
| FR-AUTH-01 | Users must authenticate via Clerk before accessing any route | Implemented |
| FR-AUTH-02 | Unauthenticated users accessing any route must be redirected to `/sign-in` | Implemented |
| FR-AUTH-03 | After successful sign-in, users must be redirected to `/dashboard` | Implemented |
| FR-AUTH-04 | The sign-in page must display the Drivo logo and Arabic subtitle | Implemented |
| FR-AUTH-05 | Clerk `publicMetadata.role` must determine user permissions | Implemented |
| FR-AUTH-06 | Users with no role set must default to least-privilege (`support`), not `admin` | Missing |

---

## Module 2 — Navigation & Layout

| ID | Requirement | Status |
|---|---|---|
| FR-NAV-01 | Sidebar must show only routes permitted for the current user's role | Implemented |
| FR-NAV-02 | Sidebar must be collapsible to icon-only mode | Implemented |
| FR-NAV-03 | Active route must be visually highlighted in the sidebar | Implemented |
| FR-NAV-04 | Topbar must show a real-time unread notification count badge | Implemented |
| FR-NAV-05 | Clicking the bell icon must open a notification dropdown | Implemented |
| FR-NAV-06 | Topbar must show the current user's name and avatar | Implemented |
| FR-NAV-07 | Topbar search must be functional (currently renders but is not wired) | UI-Only |
| FR-NAV-08 | Sign-out button must terminate the Clerk session and redirect to `/sign-in` | Implemented |
| FR-NAV-09 | Page transitions must have a smooth animation | Implemented |
| FR-NAV-10 | Breadcrumb must reflect the current page location | Implemented |

---

## Module 3 — Dashboard

| ID | Requirement | Status |
|---|---|---|
| FR-DASH-01 | Dashboard must load KPI data from `GET /api/dashboard-counts` | Implemented |
| FR-DASH-02 | Must display: total trips, active trips, total customers, active drivers | Implemented |
| FR-DASH-03 | Must show percentage change vs. previous month per KPI | Partial (mock ±18% hardcoded) |
| FR-DASH-04 | Must show a monthly trip-performance bar chart | Partial (static mock data) |
| FR-DASH-05 | Must show a trip-status donut chart | Partial (percentages are fixed ratios, not real data) |
| FR-DASH-06 | Dashboard must be printable via the browser print dialog | Implemented |

---

## Module 4 — Trips

| ID | Requirement | Status |
|---|---|---|
| FR-TRIP-01 | Trips list must load from `GET /api/trips` | Implemented |
| FR-TRIP-02 | User must be able to refresh the list | Implemented |
| FR-TRIP-03 | Trips list must be printable | Implemented |
| FR-TRIP-04 | Clicking a trip must navigate to the trip details page | Implemented (routing) |
| FR-TRIP-05 | Trip details must load real data using `tripId` from the URL | Missing |
| FR-TRIP-06 | User must be able to add a payment record with proof image upload | Partial (modal exists, API call implemented in TripsListPage only) |
| FR-TRIP-07 | User must be able to change a trip's status with a reason | UI-Only |
| FR-TRIP-08 | User must be able to edit trip fields | UI-Only |
| FR-TRIP-09 | User must be able to add notes to a trip | UI-Only (local state) |
| FR-TRIP-10 | User must be able to initiate a refund process | UI-Only |

---

## Module 5 — Drivers

| ID | Requirement | Status |
|---|---|---|
| FR-DRV-01 | Drivers list must load from `GET /api/drivers` | Implemented |
| FR-DRV-02 | Drivers must be filterable by status and searchable by name | Implemented |
| FR-DRV-03 | User must be able to add a driver with all required fields and document uploads | Implemented |
| FR-DRV-04 | User must be able to edit a driver's profile | Implemented |
| FR-DRV-05 | User must be able to delete a driver with a confirmation modal | Implemented |
| FR-DRV-06 | Driver status must display as a colour-coded badge | Implemented |
| FR-DRV-07 | User must be able to send a notification/alert to a driver | UI-Only |
| FR-DRV-08 | User must be able to pause a driver account temporarily | UI-Only |
| FR-DRV-09 | User must be able to freeze a driver account | UI-Only |
| FR-DRV-10 | User must be able to permanently block a driver | UI-Only |
| FR-DRV-11 | User must be able to add a violation/note to a driver's record | Implemented (`POST /api/driver-violations`) |
| FR-DRV-12 | User must be able to assign a trip to a driver | UI-Only |

---

## Module 6 — Clients

| ID | Requirement | Status |
|---|---|---|
| FR-CLI-01 | Clients list must load from `GET /api/Allcustomers` | Implemented |
| FR-CLI-02 | User must be able to add a client | Implemented |
| FR-CLI-03 | User must be able to view and edit client details | Implemented |
| FR-CLI-04 | User must be able to delete a client | Implemented |
| FR-CLI-05 | Client detail modal must have three tabs: basic info, notes, trip history | Implemented |
| FR-CLI-06 | Notes must be persisted via `POST /api/customer-notes` | Implemented |
| FR-CLI-07 | Trip history must be loaded from the client-details API | Implemented |
| FR-CLI-08 | Trip history must be exportable as a text file | Implemented |

---

## Module 7 — Create Trip / Trip Listings

| ID | Requirement | Status |
|---|---|---|
| FR-CRT-01 | Page must list current trip listings available to drivers | UI-Only (static mock) |
| FR-CRT-02 | User must be able to toggle a listing active/inactive | UI-Only (local state) |
| FR-CRT-03 | User must be able to delete a listing | UI-Only (local state) |
| FR-CRT-04 | User must be able to assign a driver to a listing | UI-Only |
| FR-CRT-05 | "Create new trip" button must navigate to the New Trip Form | Implemented |

---

## Module 8 — New Trip Form

| ID | Requirement | Status |
|---|---|---|
| FR-NTF-01 | Form must support individual and group trip types | Implemented |
| FR-NTF-02 | Form must support one-way, return, and both directions | Implemented |
| FR-NTF-03 | Form must support single and multi-route | Implemented |
| FR-NTF-04 | Form must support daily and subscription (weekly/monthly) schedule types | Implemented |
| FR-NTF-05 | Operating days must be selectable via day buttons | Implemented |
| FR-NTF-06 | Pickup/dropoff must be selectable via an interactive Leaflet map | Implemented |
| FR-NTF-07 | Map must support geocoding search via Nominatim | Implemented |
| FR-NTF-08 | Group trips must support adding multiple passengers | Implemented |
| FR-NTF-09 | Time exceptions (different times for specific dates) must be supported | UI-Only |
| FR-NTF-10 | Schedule must be copyable from one day to another | UI-Only |
| FR-NTF-11 | Completed form must submit to `POST /api/trips` | Partial (submission exists; payload mapping incomplete) |

---

## Module 9 — Approvals

| ID | Requirement | Status |
|---|---|---|
| FR-APR-01 | Pending edit requests must load from `GET /api/trip-edit-requeststest` | Implemented |
| FR-APR-02 | Each request must display a diff of old vs new field values | Implemented |
| FR-APR-03 | User must be able to approve a request | Implemented |
| FR-APR-04 | User must be able to reject a request | Implemented |
| FR-APR-05 | List must be filterable by status and searchable | Implemented |
| FR-APR-06 | Already actioned requests must display a read-only status label | Implemented |

---

## Module 10 — Notifications

| ID | Requirement | Status |
|---|---|---|
| FR-NOT-01 | User must be able to broadcast a notification to all drivers | Implemented |
| FR-NOT-02 | Notification must support scheduled delivery | Implemented |
| FR-NOT-03 | Notification types: general, promotional, alert, scheduled | Implemented |
| FR-NOT-04 | Sent notifications must be listed from `GET /api/general-notifications` | Implemented |
| FR-NOT-05 | Topbar bell must show real-time unread count via Firestore | Implemented |
| FR-NOT-06 | Bell dropdown must allow marking all as read | Implemented |
| FR-NOT-07 | Bell dropdown must filter: all, unread, read | Implemented |
| FR-NOT-08 | `/alerts` page must list backend notifications | Implemented |

---

## Module 11 — Support & Tickets

| ID | Requirement | Status |
|---|---|---|
| FR-SUP-01 | Tickets list must load from `GET /api/tickets` | Implemented |
| FR-SUP-02 | User must be able to create a ticket linked to a driver and optional trip | Implemented |
| FR-SUP-03 | User must be able to edit a ticket's issue type, priority, and status | Implemented |
| FR-SUP-04 | User must be able to delete (close) a ticket | Implemented |
| FR-SUP-05 | User must be able to add a note to a ticket | Implemented |
| FR-SUP-06 | Live chat tab must show real-time driver messages | UI-Only (mock) |

---

## Module 12 — Rewards

| ID | Requirement | Status |
|---|---|---|
| FR-RWD-01 | App download reward must be configurable and saveable | Partial (save works; load does not pre-populate) |
| FR-RWD-02 | Invite reward must be configurable | Partial |
| FR-RWD-03 | Points system must be configurable | Partial |
| FR-RWD-04 | Promo codes must be loadable from `GET /api/promo-codes` | Implemented |
| FR-RWD-05 | User must be able to create a promo code | Implemented |
| FR-RWD-06 | User must be able to edit a promo code | Implemented |
| FR-RWD-07 | User must be able to delete a promo code | Implemented |
| FR-RWD-08 | Settings must be pre-loaded from API on page open | Missing |

---

## Module 13 — Activity Log

| ID | Requirement | Status |
|---|---|---|
| FR-ACT-01 | Admin tab must load from `GET /api/logs/admin` | Implemented |
| FR-ACT-02 | Sales tab must load from `GET /api/logs/sales/{id}` | Implemented |
| FR-ACT-03 | Driver tab must load from `GET /api/logs/driver/{id}` | Implemented |
| FR-ACT-04 | Non-admin users must only see their own role's logs | Implemented |
| FR-ACT-05 | Logs must be filterable by action type and searchable | Implemented |

---

## Module 14 — Permissions

| ID | Requirement | Status |
|---|---|---|
| FR-PRM-01 | Admin must be able to define a role with a name and description | UI-Only |
| FR-PRM-02 | Permissions must be configurable per module with enable/disable toggles | UI-Only |
| FR-PRM-03 | Roles must be listable and sortable by rank | UI-Only |
| FR-PRM-04 | Role definitions must be persisted to the API | Missing |

---

## Module 15 — Users

| ID | Requirement | Status |
|---|---|---|
| FR-USR-01 | User list must be loadable (currently static) | Missing |
| FR-USR-02 | Admin must be able to create a new dashboard user | UI-Only |
| FR-USR-03 | Admin must be able to edit a user's role and status | UI-Only |
| FR-USR-04 | Admin must be able to delete a user | UI-Only |
| FR-USR-05 | User creation must record the creating admin's identity | Implemented (Clerk) |

---

## Module 16 — System Management

| ID | Requirement | Status |
|---|---|---|
| FR-SYS-01 | Expense types must load from `GET /api/expenses` | Implemented |
| FR-SYS-02 | User must be able to add, edit, delete expense records | Implemented |
| FR-SYS-03 | City list must load from `GET /api/cities` | Implemented |
| FR-SYS-04 | User must be able to add, edit, delete cities | Implemented |
| FR-SYS-05 | Target rules must be configurable with amount ranges, percentages, labels | UI-Only (local state) |

---

## Module 17 — Settings / Profile

| ID | Requirement | Status |
|---|---|---|
| FR-SET-01 | Profile page must display the authenticated user's name from Clerk | Missing (hardcoded) |
| FR-SET-02 | Profile page must display the authenticated user's role | Missing (hardcoded) |
| FR-SET-03 | Performance stats must load from a real data source | Missing (static mock) |
| FR-SET-04 | Monthly goal progress must reflect real data | Missing (static mock) |
