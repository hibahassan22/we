# Admin Flows

This document covers flows exclusive to the `admin` role, or flows that behave differently for admins compared to `support` and `accountant` roles.

---

## 1. Admin vs. Other Roles — Access Summary

| Section | Admin | Support | Accountant |
|---|---|---|---|
| Dashboard | ✅ | ✅ | ✅ |
| Trips | ✅ | ✅ | ✅ |
| Create Trip | ✅ | ✅ | ❌ |
| Clients | ✅ | ✅ | ❌ |
| Drivers | ✅ | ✅ | ❌ |
| Rewards | ✅ | ❌ | ✅ |
| Support Tickets | ✅ | ✅ | ❌ |
| Notifications | ✅ | ✅ | ❌ |
| Activity Log | ✅ (all tabs) | ❌ | ❌ |
| Approvals | ✅ | ✅ | ❌ |
| Permissions | ✅ only | ❌ | ❌ |
| Users | ✅ only | ❌ | ❌ |
| System Management | ✅ only | ❌ | ❌ |
| Settings | ✅ | ✅ | ✅ |

---

## 2. User Management Flow (Admin Only)

Currently UI-only — not connected to the API or Clerk user provisioning.

```
1. Admin navigates to /users
2. Info strip shows admin's own name and role from Clerk
3. Admin sees the user list (static mock data)

4. Create new user:
   - Fills: username, password, role (from dropdown)
   - Clicks "حفظ"
   - New row added to local list (no API call)
   ⚠️ User is not actually created in Clerk or the backend

5. Edit user:
   - Clicks "تعديل" on a row
   - EditUserModal opens with name, role, status fields
   - Clicks "حفظ التعديلات"
   - Local state updated (no API call)

6. Delete user:
   - Clicks "حذف" on a row
   - DeleteModal opens for confirmation
   - Local state updated (no API call)

7. Filter users by role and search by name
```

---

## 3. Permissions & Roles Flow (Admin Only)

Currently UI-only — permissions are not persisted.

```
1. Admin navigates to /permissions

2. Define Role section:
   - Enter role name (e.g., "مدير النظام")
   - Enter optional description
   - Permission summary shows: total enabled/disabled across all modules

3. Permission Matrix section:
   - 8 modules listed: Rewards, Clients, Support, Drivers, Notifications,
     Promos, Trip Ads, Trips Log
   - Each module is collapsible
   - Within each module: 5 permission toggles
   - "تفعيل الكل" / "إلغاء الكل" per module
   - Progress bar shows % permissions enabled per module

4. Clicks "حفظ التعديلات"
   ⚠️ No API call — changes lost on page refresh

5. Roles Registry section:
   - Lists 8 predefined roles (static mock data)
   - Search by role name
   - Admin can view permissions (no API) or delete a role
   - "إضافة" button (+ icon) exists but is not wired

6. Role Ordering section:
   - Drag-and-drop interface to reorder roles
   - Rankings shown as numbers
   ⚠️ Drag functionality is not implemented — just styling
```

---

## 4. System Management Flow (Admin Only)

### 4.1 Expense Types
```
1. Admin navigates to /system → "أنواع المصروفات" tab
2. GET /api/expenses fetched → list renders

3. Add expense:
   - Clicks "إضافة"
   - Modal: type name, SAR amount, EGP amount, date, description
   - POST /api/expenses
   - List refreshes

4. Edit expense:
   - Clicks blue edit button on row
   - Modal pre-fills via GET /api/expenses/{id}
   - Admin updates fields
   - PUT /api/expenses/{id}
   - List refreshes

5. Delete expense:
   - Clicks red X button on row
   - Confirmation modal appears
   - DELETE /api/expenses/{id}
   - List refreshes
```

### 4.2 Sales Targets
```
1. Admin switches to "التارجت" tab
2. Pre-populated target rules shown (static local state)

3. Add target rule:
   - Clicks "إضافة"
   - Modal: from amount, to amount, percentage, label, colour picker
   - Clicks "إضافة" → added to local state only
   ⚠️ Not persisted to API

4. Delete target rule:
   - Clicks red X → removed from local state only
```

### 4.3 Cities
```
1. Admin switches to "المدن" tab
2. GET /api/cities fetched → list renders

3. Add city:
   - Clicks "إضافة"
   - Modal: city name
   - POST /api/cities { name }
   - List refreshes

4. Edit city:
   - Clicks blue edit button on row
   - Modal with city name pre-filled
   - PUT /api/cities/{id} { name }
   - List refreshes

5. Delete city:
   - Clicks red X → confirmation modal
   - DELETE /api/cities/{id}
   - List refreshes
```

---

## 5. Activity Log Flow — Admin Multi-Tab View

```
1. Admin navigates to /activity
2. Three tabs shown: "الأدمن" / "السيلز" / "السائق"

3. Admin tab (default):
   - GET /api/logs/admin fetched
   - All admin actions shown

4. Sales tab:
   - Sales agent dropdown loads from GET /api/sales
   - Admin selects a specific sales agent
   - GET /api/logs/sales/{salesId} fetched
   - Agent's actions shown

5. Driver tab:
   - Driver dropdown loads from GET /api/drivers
   - Admin selects a specific driver
   - GET /api/logs/driver/{driverId} fetched
   - Driver's actions shown

6. Across all tabs:
   - Filter by action type dropdown (populated from current log data)
   - Full-text search by trip ID, description
   - Manual refresh button
```

---

## 6. Full Trip Management Flow (Admin)

Admins have the same trip access as support agents. However, admin is the only role expected to:
- Permanently block drivers after reviewing trip/violation history
- Approve trip edit requests
- Access the full audit trail via activity logs

---

## 7. Admin Identity in Context

When an admin creates users or adds notes, their identity is sourced from Clerk:
```js
const { user } = useUser();
const currentUserName = [user?.firstName, user?.lastName].filter(Boolean).join(" ");
const currentUserPosition = POSITION_LABELS[user?.publicMetadata?.role] ?? "موظف";
```
This is correctly implemented in `UsersPage.jsx`. The `addedBy` field in the user table shows who created each record.

---

## 8. Admin-Specific Notifications

Admin users see all three notification sources:
1. **Bell dropdown** (in topbar) — Firestore real-time, all types
2. **/notifications** — Broadcast notification management (send to all drivers)
3. **/alerts** — Backend admin notifications feed

Support agents see only notifications and alerts. Accountants see neither notifications management page nor alerts.

---

## 9. Planned Admin-Only Features (Not Yet Implemented)

| Feature | Status | Notes |
|---|---|---|
| Create dashboard users in Clerk | Missing | UsersPage is UI-only |
| Persist custom roles to API | Missing | PermissionsPage is UI-only |
| Persist target rules to API | Missing | SystemManagementPage targets tab is UI-only |
| Permanently block a driver via API | Missing | BlockModal has no API call |
| Freeze/pause driver via API | Missing | Freeze/PauseModal have no API calls |
| Send individual driver notifications via API | Missing | AlertModal has no API call |
