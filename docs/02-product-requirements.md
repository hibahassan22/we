# Product Requirements Document (PRD)

## Product Name
Drivo Admin Dashboard

## Product Vision
A centralised, Arabic-language web dashboard that gives Drivo operations staff full visibility and control over the ride-booking platform — covering drivers, clients, trips, financials, support, and system configuration — from a single interface.

## Goals
1. Reduce manual coordination effort by exposing all operational data in one place.
2. Enable non-technical staff (support, accountants) to perform day-to-day operations without developer assistance.
3. Provide real-time awareness of driver activity and trip status through live notifications.
4. Enforce role-based access so staff can only act within their permitted scope.

## Non-Goals
- Driver-facing mobile application.
- Passenger-facing booking interface.
- Payment gateway processing (handled by the backend API).
- Server-side rendering or SEO optimisation.

---

## User Personas

### Persona 1 — System Administrator (Admin)
- **Arabic title:** مدير النظام
- **Responsibilities:** Configure the system, manage all users, set permissions, oversee all operations.
- **Technical level:** Moderate — comfortable with web tools.
- **Key needs:** Full data access, user and role management, system configuration.

### Persona 2 — Customer Support Agent (Support)
- **Arabic title:** خدمة عملاء
- **Responsibilities:** Handle day-to-day trip operations, communicate with drivers and clients, process support tickets.
- **Technical level:** Low — needs a simple, guided UI.
- **Key needs:** Quick access to trips and drivers, ability to create and resolve support tickets, send notifications.

### Persona 3 — Accountant
- **Arabic title:** محاسب
- **Responsibilities:** Monitor financial performance, manage reward programs, review trip revenue.
- **Technical level:** Low.
- **Key needs:** Dashboard KPIs, trip financial details, promo code management, reward settings.

---

## Core Feature Requirements

### F1 — Dashboard & Analytics
- Display real-time KPIs: total trips, active trips, total customers, active drivers.
- Show trip status distribution (completed, active, cancelled, paused).
- Monthly performance trend chart.
- Printable / exportable report.

### F2 — Trip Management
- List all trips with status, driver, client, route, and price.
- View full trip details: route, schedule, financial breakdown, payment history, notes.
- Edit trip data.
- Change trip status (in progress, completed, cancelled, paused).
- Add payment records with transfer proof upload.
- Process refund requests.

### F3 — Driver Management
- List all drivers with status badge and profile completion percentage.
- Add new drivers with personal, vehicle, and financial information and document uploads.
- Edit driver profiles.
- Delete drivers.
- Change driver status: active, frozen, blocked, temporarily paused.
- Add violation notes and complaints against drivers.
- Assign trips to drivers.
- Send in-app notifications/alerts to individual drivers.

### F4 — Client Management
- List all clients with rating, trip counts, and status.
- Add new clients.
- Edit client profiles.
- Delete clients.
- View client trip history.
- Add internal notes against client records.
- Export trip history.

### F5 — Trip Creation
- Create new trip listings available to drivers in the mobile app.
- Support trip types: individual, group.
- Support directions: one-way, round-trip, both.
- Support route types: single route, multi-route.
- Support subscription types: daily, weekly, monthly.
- Select pickup/dropoff coordinates using an interactive map.
- Define operating days and departure/return times.
- Manage multiple passengers per group trip.

### F6 — Approvals
- Review pending trip-edit requests submitted from the mobile app.
- Approve or reject each request.
- View the diff of changes requested.

### F7 — Notifications
- Broadcast notifications to all drivers.
- Schedule notifications for a future date/time.
- View notification history.
- Real-time unread notification count in the header bell.

### F8 — Support & Tickets
- Create, edit, delete support tickets linked to drivers and trips.
- Set ticket priority (high, medium, low) and type.
- Add notes to tickets.
- Update ticket status (open, in progress, resolved, closed).
- Live chat interface for direct driver communication (roadmap item).

### F9 — Rewards & Promotions
- Configure app download reward.
- Configure invitation reward system.
- Configure points earning and redemption rates.
- Set points expiry and usage limits.
- Full CRUD for promotional codes (cash, points, discount types).

### F10 — Activity Log
- View all admin actions with timestamp and actor.
- View sales-agent activity logs.
- View driver activity logs.
- Filter by action type and search.

### F11 — Permissions & Roles
- Define custom roles with descriptive names.
- Assign granular permissions per module.
- Rank roles by hierarchy.

### F12 — User Management
- Create internal dashboard users with roles.
- Edit user details and role.
- Enable / disable users.

### F13 — System Management
- Manage expense types and records (SAR and EGP amounts).
- Manage sales target rules (amount ranges, percentages, labels).
- Manage city list.

### F14 — Settings / Profile
- View and edit personal profile.
- View personal performance metrics and monthly goal progress.

---

## Acceptance Criteria Summary
| Feature | Minimum Acceptance Criteria |
|---|---|
| F1 Dashboard | Live API data displayed in < 3 s on standard connection |
| F2 Trips | All CRUD operations reflected in API and UI without page reload |
| F3 Drivers | Status changes persisted via API; modals call real endpoints |
| F4 Clients | Full CRUD wired; notes persisted; trip history loaded from API |
| F5 Trip Creation | Form submits valid payload to API; map picker returns coordinates |
| F6 Approvals | Approve/reject actions call API and update UI state |
| F7 Notifications | Broadcast reaches API; Firestore unread count updates in real-time |
| F8 Support | Ticket CRUD fully wired; priority and status persisted |
| F9 Rewards | Settings loaded from API on page open; promo CRUD fully wired |
| F10 Activity | Logs loaded per role tab from correct API endpoints |
| F11 Permissions | Role and permission changes persisted to API |
| F12 Users | User creation/edit persisted via Clerk or API |
| F13 System | Expense and city CRUD wired; targets persisted |
| F14 Settings | Profile data sourced from Clerk `useUser()` |

---

## Constraints
- All text must be Arabic; no bilingual toggle is required.
- Must function on modern desktop browsers (Chrome, Edge, Firefox latest).
- Must not require mobile-specific responsive design (tablet/desktop primary).
- No offline capability required.
- Authentication is fully delegated to Clerk — no custom login screen logic.
