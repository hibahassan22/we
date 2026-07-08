# Business Requirements Specification (BRS)

## 1. Business Context

Drivo operates a tech-enabled ride-booking service in Saudi Arabia, connecting passengers who need transport (school runs, regular commutes, group travel) with vetted drivers. The platform earns revenue through commissions on completed trips and subscription fees.

The admin dashboard is an internal operational tool. It is **not customer-facing**. Its primary value is reducing the manual overhead of coordinating drivers, trips, payments, and support across multiple staff members with different responsibilities.

---

## 2. Business Objectives

| ID | Objective | Metric |
|---|---|---|
| BO-01 | Reduce operational coordination time | Staff hours spent on manual coordination per week |
| BO-02 | Ensure correct role-based access to sensitive data | Zero unauthorised data access incidents |
| BO-03 | Increase driver retention through timely support | Driver churn rate month-over-month |
| BO-04 | Maximise promo code ROI | Promo code redemption rate vs. cost |
| BO-05 | Maintain accurate financial records | Discrepancy rate in trip payment logs |
| BO-06 | Respond to client support issues quickly | Average ticket resolution time |

---

## 3. Stakeholders

| Stakeholder | Role | Interest |
|---|---|---|
| Operations Manager | Primary user (admin) | Full system visibility and control |
| Customer Support Team | Daily user (support) | Fast, simple trip and driver management |
| Accounting Team | Periodic user (accountant) | Accurate financial data, reward settings |
| Drivers | Indirect — affected by actions | Fair treatment, timely payments, notifications |
| Clients / Passengers | Indirect — affected by trip data | Accurate trip records, responsiveness |
| Development Team | Builder and maintainer | Clean codebase, documented API contracts |

---

## 4. Business Rules

### BR-01 — Role Access Control
Every authenticated user must have a role assigned in Clerk `publicMetadata.role`. Users without a role **must not** default to admin access. They should be denied or assigned the least-privilege role (`support`).

### BR-02 — Driver Status Lifecycle
A driver account may be in one of four states:
- **Active (1):** Can receive trips.
- **Frozen (2):** Cannot receive new trips; financial settlement is still allowed.
- **Blocked (3):** Permanently barred; cannot log in.
- **Temporarily Paused (4):** Cannot receive trips for a defined period (24h, 48h, 1 week).

Only admin users may block a driver permanently. Support may pause or freeze.

### BR-03 — Trip Edit Approval
Any modification to a trip that was requested from outside the admin dashboard (e.g., from the driver mobile app) must pass through the approvals workflow. No trip data may be altered unilaterally by drivers.

### BR-04 — Payment Records
Every payment entry must record: amount, transfer method, date, source account, destination account, and proof image. Partial payments are allowed.

### BR-05 — Promo Code Constraints
- Each promo code has a defined validity period (start date, end date).
- Each promo code has a maximum total usage count.
- Codes may be of type: cash (SAR), points, or percentage discount.
- Expired or exhausted codes must not be redeemable.

### BR-06 — Notification Targeting
Broadcast notifications sent from the dashboard target **all active drivers**. Individual driver notifications (alerts, warnings) are sent from the driver management page. There is no client-targeted notification system in the current scope.

### BR-07 — Violation Records
Violation notes added to a driver's profile must include: type (note, complaint, warning, violation, alert), message, date, and optional rating. These records are permanent and visible to all admin/support users.

### BR-08 — Financial Multi-currency
Expense records must support both Saudi Riyal (SAR) and Egyptian Pound (EGP) amounts simultaneously, reflecting cross-border operational costs.

### BR-09 — Activity Audit Trail
All significant admin and sales-agent actions (trip creation, payment addition, driver status change, etc.) must be logged with the actor's identity and a timestamp. Audit logs are read-only and must not be deletable from the dashboard.

### BR-10 — Data Export
Client trip history must be exportable as a plain-text file. Trip lists must be printable via the browser print dialog.

---

## 5. Business Processes

### BP-01 — Onboarding a New Driver
1. Support or admin navigates to Drivers page.
2. Completes the driver form: personal info, vehicle info, bank/IBAN details.
3. Uploads required documents: identity image, car image, license image.
4. System submits to API; driver appears in list with "active" status.

### BP-02 — Creating and Assigning a Trip
1. Admin or support navigates to Create Trip or New Trip Form.
2. Fills trip details: type, direction, route, schedule, passengers.
3. Submits to API; trip appears in the "available trips" list visible to drivers.
4. Support assigns a specific driver using the Assign Trip modal (driver phone number lookup).

### BP-03 — Processing a Support Ticket
1. Support creates a ticket linking a driver and optionally a trip.
2. Sets priority and issue type.
3. Ticket remains open until the issue is addressed.
4. Support adds notes as investigation progresses.
5. Status updated to resolved or closed.

### BP-04 — Approving a Trip Edit Request
1. Driver submits an edit request from the mobile app.
2. Request appears in Approvals page as "pending."
3. Admin or support reviews the diff of changed fields.
4. Approves (applies change to trip) or rejects (discards change).

### BP-05 — Managing Reward Campaigns
1. Accountant opens Rewards page.
2. Adjusts reward settings (app download, invite, points) and saves.
3. Creates or edits promo codes with validity, type, and usage limit.
4. Active codes are visible and redeemable by drivers in the mobile app.

---

## 6. Regulatory and Compliance Considerations
- Driver identity documents (ID images, license images) are uploaded and stored. Data residency and retention policies should be defined at the infrastructure level.
- Financial records (IBAN, bank name, account owner) are stored in the backend. Access should be restricted to admin and accountant roles.
- No PII encryption is implemented at the frontend layer — this is delegated to the backend API and Firebase.
