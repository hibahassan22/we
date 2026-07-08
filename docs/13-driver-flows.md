# Driver Flows

This document describes all interactions that affect drivers — both actions that admin/support staff take on driver records from the dashboard, and how those actions relate to the driver's experience in the mobile app.

> **Note:** The driver mobile app is outside this repository. All driver-side behaviour described here is inferred from the dashboard's data model and business rules.

---

## 1. Driver Lifecycle

```
Registration (via mobile app or admin)
  ↓
Profile Created (status = 1: Active)
  ↓
Can Receive Trips
  ↓
  ├── Temporary Pause (status = 4) ──→ Auto-resume after duration
  ├── Freeze (status = 2) ──────────→ Manual unfreeze required
  ├── Block (status = 3) ──────────→ Permanent (requires admin)
  └── Active (status = 1) ←──────── Can be restored from pause/freeze
```

---

## 2. Driver Onboarding Flow (Admin/Support)

```
1. Support/admin navigates to /drivers
2. Clicks "إضافة سائق جديد"
3. DriverFormModal opens

4. Section 1 — Personal Information:
   - Full name (required)
   - Phone number (required)
   - City/address
   - Nationality
   - Gender
   - Email
   - Upload: Identity image (هوية)

5. Section 2 — Financial Information:
   - Bank name
   - Account owner name (must match driver name)
   - IBAN number

6. Section 3 — Vehicle Information:
   - Car type (brand)
   - Car model
   - Vehicle size (small/medium/large)
   - Upload: Car image
   - Upload: Driving licence image

7. System generates a unique driver ID + FCM token on submission
8. POST /api/drivers with FormData
9. Driver appears in list with status = Active (1)
```

---

## 3. Driver Profile Edit Flow

```
1. Staff clicks edit icon on driver row
2. DriverFormModal opens (isEditing = true)
3. Form pre-filled with existing driver data
4. Note: Financial fields (bank_name, account_owner, iban) are always blank on edit
   (they are not returned from GET /api/drivers for security reasons)
5. Staff updates desired fields
6. POST /api/driverstest/update/{driverId}
7. List refreshes on success
```

---

## 4. Driver Status Change Flows

### 4.1 Temporary Pause (موقوف مؤقتاً)
```
1. Staff clicks pause icon on driver row
2. PauseModal opens:
   - Duration selector: 24 hours / 48 hours / 1 week
   - Reason text area
   - Warning: driver cannot receive new trips during pause
3. Staff confirms

⚠️ Current state: Modal closes but NO API call is made.
API endpoint for status change not yet wired.
```

### 4.2 Freeze Account (تجميد)
```
1. Staff clicks freeze icon on driver row
2. FreezeModal opens:
   - Explains freeze consequences:
     • Cannot receive new trips
     • Financial settlement still allowed
     • Can be reversed at any time
   - Asks: "هل أنت متأكد من تجميد حساب [name]؟"
3. Staff confirms

⚠️ Current state: Modal closes but NO API call is made.
```

### 4.3 Permanent Block (حظر نهائي)
```
1. Staff clicks block icon on driver row
2. BlockModal opens:
   - Clear warning: irreversible action
   - Consequences:
     • Permanently blocks login
     • Driver cannot use the app
     • Marked as "محظور" in system
   - Asks: "هل أنت متأكد من حظر [name] نهائياً؟"
3. Staff confirms

⚠️ Current state: Modal closes but NO API call is made.
This is a critical missing feature for platform safety.
```

---

## 5. Delete Driver Flow

```
1. Staff clicks delete (trash) icon on driver row
2. DeleteConfirmModal opens: "هل أنت متأكد أنك تريد حذف [name]؟"
3. Staff clicks "حذف السائق"
4. DELETE /api/drivers/{driverId}
5. On success: driver removed from the list immediately
6. On error: error message shown
```

---

## 6. Add Violation / Note Flow

```
1. Staff clicks notes icon on driver row
2. AddNoteModal opens
3. Staff selects note type:
   - ملاحظة (general note)
   - شكوى (complaint)
   - إنذار (formal warning)
   - مخالفة (violation)
   - تنبيه (alert)
4. Staff enters:
   - Message text (required)
   - Date (defaults to today)
   - Rating 1–5 (optional)
5. POST /api/driver-violations with:
   { driver_id, message, type, violation_date, rating? }
6. On success: modal closes
```

---

## 7. Send Notification to Driver Flow (Currently UI-Only)

```
1. Staff clicks alert/notification icon on driver row
2. AlertModal opens:
   - Select notification type: تنبيه / إنذار / رسالة عادية
   - Enter message text
3. Staff clicks "إرسال الإشعار"

⚠️ Current state: Modal closes with no API call.
The intended endpoint would be POST /api/send-driver-notification.
```

---

## 8. Assign Trip to Driver Flow (Currently UI-Only)

```
1. Staff opens a trip listing on /create-trip
2. Clicks "إسناد رحلة" on a listing
   OR clicks assign icon on a driver row in DriversPage
3. AssignTripModal opens:
   - Enter trip number (رقم الرحلة)
   - Enter driver phone number (for lookup)
   - Financial section: amount paid, commission, full trip price
   - Transfer details: from account, to account, transfer method, proof image
4. Staff clicks "إسناد رحلة"
5. Confirmation dialog: "هل تم الاتفاق مع سائق لهذه الرحلة؟"
6. Staff confirms with "نعم"

⚠️ Current state: No API call is made after confirmation.
```

---

## 9. Driver in Trip Edit Request Flow

```
Driver side (mobile app):
1. Driver submits a request to modify a trip (e.g., change price or route)

Admin side (dashboard):
2. Request appears in /approvals as "معلق"
3. Admin/support reviews the diff
4. Approves → POST /api/trip-edit-approve/{id} → trip is updated
   OR
   Rejects → POST /api/trip-edit-reject/{id} → change is discarded
5. Driver presumably notified via mobile app push notification
```

---

## 10. Driver in Support Ticket Flow

```
1. Support creates a ticket linked to a driver:
   POST /api/tickets with driver_id
2. Ticket appears in support queue
3. Support adds notes as investigation progresses
4. Status updated: open → in_progress → resolved → closed
5. Driver is not directly notified from the dashboard
   (notification is presumably handled by the backend/mobile app)
```

---

## 11. Driver Activity Log Flow (Admin View)

```
1. Admin navigates to /activity
2. Switches to "السائق" tab
3. Selects a driver from the dropdown (loaded from GET /api/drivers)
4. GET /api/logs/driver/{driverId} fetched
5. All logged actions for that driver displayed:
   - create_trip, trip_payment, edit_trip, etc.
   - Each entry: action type icon, title, description, timestamp
6. Admin can filter by action type or search by description/trip ID
```

---

## 12. Driver Data Fields Reference

| Category | Fields |
|---|---|
| Identity | name, last_name, phone, email, gender, nationality, address |
| Documents | identity_image, car_image, license_image |
| Vehicle | car_type, car_model, vehicle_size |
| Financial | bank_name, account_owner, iban |
| System | id, fcm_token, city_id, region, status |
| Stats | profile_completion (%) |
