# User Flows

This document covers all major user interaction flows across the three roles: Admin, Support, and Accountant.

---

## 1. Authentication Flows

### 1.1 Sign In
```
1. User opens the application URL
2. ProtectedRoute detects: not signed in
3. Redirect to /sign-in
4. User sees Drivo logo + Clerk sign-in form
5. User enters credentials (email/password or OAuth)
6. Clerk authenticates → sets session
7. Redirect to /dashboard
8. ProtectedRoute reads Clerk user + role metadata
9. Layout renders with role-filtered sidebar
10. Dashboard page loads KPI data from API
```

### 1.2 Sign Out
```
1. User clicks "تسجيل الخروج" in the sidebar bottom
2. Clerk signOut() called with redirectUrl: /sign-in
3. Clerk clears session
4. User redirected to /sign-in
```

### 1.3 Access Denied
```
1. Authenticated user navigates to a restricted route (e.g., accountant visits /permissions)
2. ProtectedRoute: canAccess(role, pathname) returns false
3. Navigate to /dashboard (no error message shown)
```

---

## 2. Dashboard Flow

```
1. User navigates to /dashboard
2. Page fetches GET /api/dashboard-counts
3. During load: skeleton spinners shown in stat cards
4. On success: KPIs render (total trips, active trips, customers, drivers)
5. Charts render (bar chart with static data, donut with computed ratios)
6. User can click "تصدير" to print the dashboard
```

---

## 3. Driver Management Flows

### 3.1 View Drivers
```
1. User navigates to /drivers
2. Page fetches GET /api/drivers
3. List renders with: name, phone, status badge, profile completion bar, action icons
4. User can search by name or filter by status
```

### 3.2 Add Driver
```
1. User clicks "إضافة سائق" button
2. DriverFormModal opens (isEditing = false)
3. User fills: personal info, financial info, vehicle info
4. User optionally uploads: identity image, car image, license image
5. User clicks "إضافة سائق"
6. POST /api/drivers with FormData
7. On success: toast "تم إضافة السائق بنجاح" + modal closes + list refreshes
8. On error: toast "حدث خطأ أثناء الإضافة"
```

### 3.3 Edit Driver
```
1. User clicks the edit icon on a driver row
2. DriverFormModal opens (isEditing = true) pre-filled with driver data
3. User modifies fields
4. User clicks "حفظ التعديلات"
5. POST /api/driverstest/update/{id} with FormData
6. On success: toast + modal closes + list refreshes
```

### 3.4 Delete Driver
```
1. User clicks the delete icon on a driver row
2. DeleteConfirmModal opens: "هل أنت متأكد من حذف [name]؟"
3. User clicks "حذف السائق"
4. DELETE /api/drivers/{id}
5. On success: driver removed from list
6. On error: error toast shown
```

### 3.5 Add Violation/Note
```
1. User clicks the notes icon on a driver row
2. AddNoteModal opens
3. User selects type (ملاحظة / شكوى / إنذار / مخالفة / تنبيه)
4. User enters message text, date, optional rating
5. POST /api/driver-violations
6. On success: modal closes, notes list refreshes
```

### 3.6 Change Driver Status (Currently UI-Only)
```
1. User clicks: Send Alert / Pause / Freeze / Block
2. Respective modal opens with relevant form
3. User fills form and confirms
4. Modal closes — NO API CALL IS MADE (status not persisted)
```

---

## 4. Client Management Flows

### 4.1 View Clients
```
1. User navigates to /clients
2. GET /api/Allcustomers fetched
3. Client list renders (initially shows mock data until API responds)
4. Total client count shown
```

### 4.2 Add Client
```
1. User clicks "إضافة عميل جديد"
2. AddClientModal opens
3. User fills: name, phone, address, nationality, gender
4. POST /api/customers
5. On success: new client prepended to list + success toast
```

### 4.3 View Client Details
```
1. User clicks on a client row
2. GET /api/customers-details/{id} fetched
3. GET /api/customer-notes/{id} fetched
4. ClientDetailsModal opens with 3 tabs:
   - المعلومات الأساسية: editable fields + star rating
   - الملاحظات: note list + add note form
   - سجل الرحلات: trip history with export button
```

### 4.4 Edit Client
```
1. User edits fields in the basic info tab
2. Clicks "حفظ التغييرات"
3. POST /api/customers/update/{id}
4. On success: client list updated + modal closes
```

### 4.5 Delete Client
```
1. User clicks delete icon on client row
2. Confirmation modal appears
3. DELETE /api/customers/{id}
4. On success: client removed from list
```

### 4.6 Add Client Note
```
1. User opens client details → ملاحظات tab
2. User types note in textarea
3. Clicks "إضافة ملاحظة"
4. POST /api/customer-notes with customer_id, message, type, note_date
5. Note prepended to list in modal
```

---

## 5. Trip Flows

### 5.1 View Trips List
```
1. User navigates to /trips
2. GET /api/trips fetched (via Vite proxy: /api/trips)
3. Trip cards render: ID, status, driver, route, price
4. User can click "تحديث" to refresh
5. User can click "تصدير" to print trip list
```

### 5.2 View Trip Details
```
1. User clicks "eye" icon on a trip card or navigates to /trips/:tripId
2. TripDetailsPage renders with 3 tabs: بيانات الرحلة / التفاصيل المالية / الملاحظات
3. ⚠️ Currently: static mock data — tripId is not used to fetch real data
```

### 5.3 Add Payment to Trip
```
1. From TripsListPage: user clicks payment icon on a trip card
2. AddPaymentModal opens
3. User fills: amount, transfer method, accounts, date, optional proof image
4. POST /api/trips/{tripId}/add-payment
5. On success: modal closes
```

### 5.4 Create New Trip Listing
```
1. User clicks "إنشاء رحلة جديدة" (from banner on /create-trip or /trips)
2. Navigated to /new-trip
3. User selects: trip type (individual/group), direction, route type, subscription type
4. For group trips: adds passengers with their pickup points
5. Selects operating days and times
6. Optionally uses map picker to select GPS coordinates
7. Fills pricing, vehicle size, city
8. Submits form → POST /api/trips (payload mapping partially complete)
```

---

## 6. Approvals Flow

```
1. User navigates to /approvals
2. GET /api/trip-edit-requeststest fetched
3. Requests listed: pending, approved, rejected
4. User can filter by status and search
5. For pending requests:
   - Diff of changed fields shown (old value → new value)
   - "الموافقة" button: POST /api/trip-edit-approve/{id} → list refreshes
   - "رفض الطلب" button: POST /api/trip-edit-reject/{id} → list refreshes
6. Actioned requests show read-only status label
```

---

## 7. Notification Flows

### 7.1 Send Broadcast Notification
```
1. User navigates to /notifications
2. Clicks "إرسال إشعار جديد"
3. Modal opens: title, content, type, send mode (now / scheduled)
4. If scheduled: datetime picker appears
5. POST /api/notifications/drivers/send
6. On success: toast "تم إرسال الإشعار لجميع السائقين ✓" + list refreshes
```

### 7.2 View Notification Bell (Real-time)
```
1. Layout mounts → initNotificationsCollection() called
   → Firestore seeded if empty
   → syncBackendNotifications() syncs from API
2. useUnreadCount() subscribes to Firestore onSnapshot
3. Bell badge shows live unread count
4. User clicks bell → NotificationsDropdown opens
5. User can filter: all / unread / read
6. Clicking an unread notification → markAsRead(docId)
7. "تحديد الكل مقروء" → markAllAsRead()
```

---

## 8. Support Ticket Flows

### 8.1 Create Ticket
```
1. User navigates to /support → Tickets tab
2. Clicks "إنشاء تذكرة"
3. TicketModal opens:
   - Select driver from dropdown (fetched from GET /api/drivers)
   - Select associated trip (filtered by driver, from GET /api/trips)
   - Set priority and issue type
   - Add description
4. POST /api/tickets
5. Ticket appears in list after reload
```

### 8.2 Add Note to Ticket
```
1. User clicks "إضافة ملاحظة" on a ticket
2. NoteModal opens
3. User types note
4. POST /api/tickets/{id}/note
5. Modal closes, ticket list refreshes
```

### 8.3 Update Ticket Status
```
1. User clicks "تعديل" on a ticket
2. TicketModal opens pre-filled
3. User changes status dropdown
4. PUT /api/tickets/{id}
5. List refreshes
```

---

## 9. Rewards Management Flow

```
1. User navigates to /rewards
2. GET /api/promo-codes fetched → promo code table populates
3. ⚠️ Reward settings (toggles, input values) start at default values (not loaded from API)

4. User adjusts settings (app download reward, invite reward, points system, usage limits)
5. Clicks "حفظ الاعدادات"
6. POST /api/admin/rewards/settings/update → success message shown

7. User clicks "إضافة كود جديد"
8. PromoCodeModal opens
9. User fills: code, type, value, usage limit, dates
10. POST /api/promo-codes → modal closes → list refreshes

11. User can edit (PUT) or delete (DELETE) existing codes
```

---

## 10. Activity Log Flow

```
1. User navigates to /activity
2. Default tab = admin (or user's own role if not admin)
3. GET /api/logs/admin (or per-role endpoint) fetched
4. Log entries render: action type icon, title, actor, trip reference, timestamp
5. User can filter by action type
6. User can search by trip ID, description
7. Admin can switch to Sales tab:
   - Dropdown of sales agents loads (GET /api/sales)
   - Selecting an agent: GET /api/logs/sales/{id}
8. Admin can switch to Driver tab:
   - Dropdown of drivers loads (GET /api/drivers)
   - Selecting a driver: GET /api/logs/driver/{id}
```
