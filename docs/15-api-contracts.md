# API Contracts

This document formalises the request/response contracts for all backend API endpoints consumed by the Drivo admin dashboard. All contracts are **inferred from frontend source code** — no official API specification exists.

## Conventions
- Base URL: `https://drivo1.elmoroj.com/api`
- All responses: `Content-Type: application/json`
- File uploads: `Content-Type: multipart/form-data`
- No auth headers currently sent from frontend (security gap)

---

## Dashboard

### `GET /api/dashboard-counts`
**Response 200**
```json
{
  "data": {
    "total_trips": 450,
    "total_drivers": 38,
    "total_customers": 212
  }
}
```

---

## Trips

### `GET /api/trips`
**Response 200** — Array or wrapped object
```json
[
  {
    "id": 35,
    "trip_status": "تم",
    "trip_type": "فردي",
    "driver_id": "abc123",
    "driver": {
      "name": "احمد",
      "last_name": "علي",
      "phone": "0501234567"
    },
    "from": "حي الملقا",
    "to": "جامعة الملك سعود",
    "price": 570,
    "city": "الرياض",
    "date_from": "2026-01-01",
    "date_to": "2026-06-30"
  }
]
```
Also accepted: `{ "value": [...] }` or `{ "data": [...] }`

---

### `POST /api/trips/{tripId}/add-payment`
**Request** `multipart/form-data`
```
amount_paid: "800"
transfer_method: "تحويل بنكي"
account_number: "123456"
recipient_account: "78910111"
commission_transfer_date: "2026-06-24"
payment_note: "دفعة أولى"
transfer_image: [FILE]
```
**Response 200/201**
```json
{ "message": "Payment added successfully" }
```
**Response 4xx**
```json
{ "message": "Error description" }
```

---

### `POST /api/trips`
**Request** JSON (payload mapping incomplete in frontend)
```json
{
  "trip_type": "فردي",
  "from": "...",
  "to": "...",
  "price": 500,
  "city_id": 1
}
```

---

## Drivers

### `GET /api/drivers`
**Response 200**
```json
[
  {
    "id": "abc123",
    "name": "محمد",
    "last_name": "السالم",
    "phone": "0501234567",
    "address": "الرياض",
    "nationality": "سعودي",
    "gender": "ذكر",
    "email": "driver@email.com",
    "car_type": "تويوتا",
    "car_model": "كامري",
    "vehicle_size": "متوسطه",
    "status": 1,
    "profile_completion": 80
  }
]
```
Also accepted: `{ "data": [...] }` or `{ "drivers": [...] }`

---

### `POST /api/drivers`
**Request** `multipart/form-data`
```
id: "generatedId123"
fcm_token: "web_generatedId123"
city_id: "1"
region: "1"
name: "محمد"
phone: "0501234567"
address: "الرياض"
nationality: "سعودي"
gender: "ذكر"
email: "driver@email.com"
car_type: "تويوتا"
car_model: "كامري"
vehicle_size: "متوسطه"
bank_name: "الراجحي"
account_owner: "محمد السالم"
iban: "SA1234567890123456789012"
identity_image: [FILE]
car_image: [FILE]
license_image: [FILE]
```
**Response** Any status < 500 treated as success by frontend.

---

### `POST /api/driverstest/update/{driverId}`
**Request** `multipart/form-data` — same optional fields as create.
> ⚠️ "test" suffix in endpoint name suggests this may not be the production endpoint.

---

### `DELETE /api/drivers/{driverId}`
**Response 200/204** — Success, driver removed.

---

### `POST /api/driver-violations`
**Request** JSON
```json
{
  "driver_id": "abc123",
  "message": "تأخر عن موعد الرحلة",
  "type": "تنبيه",
  "violation_date": "2026-06-24",
  "rating": 3
}
```
**Response 200/201**
```json
{ "message": "Violation recorded" }
```
**Response 4xx**
```json
{ "message": "Validation error" }
```

---

## Customers

### `GET /api/Allcustomers`
**Response 200**
```json
{
  "customers": [
    {
      "id": 1,
      "full_name": "عبدالرحمن احمد",
      "phone": "0544222333",
      "address": "جدة - حي الفيصلية",
      "gender": "ذكر",
      "nationality": "سعودي",
      "rating": 3.0,
      "total_trips": 22,
      "active_trips": 2,
      "completed_trips": 10,
      "cancelled_trips": 5,
      "pending_trips": 3
    }
  ],
  "total_customers": 500
}
```

---

### `GET /api/customers-details/{customerId}`
**Response 200**
```json
{
  "customer": {
    "id": 1,
    "full_name": "...",
    "phone": "...",
    "trips": [
      {
        "id": 35,
        "from": "حي الملقا",
        "to": "جامعة الملك سعود",
        "trip_date": "2026-06-01",
        "status": "completed"
      }
    ]
  }
}
```

---

### `POST /api/customers`
**Request** JSON
```json
{
  "full_name": "سارة عبدالله",
  "phone": "0512345679",
  "gender": "أنثى",
  "customer_nationality": "سعودية"
}
```
**Response 200/201**
```json
{
  "data": {
    "id": 42,
    "full_name": "سارة عبدالله",
    "phone": "0512345679",
    "gender": "أنثى",
    "customer_nationality": "سعودية"
  }
}
```

---

### `POST /api/customers/update/{customerId}`
**Request** JSON
```json
{
  "full_name": "سارة محمد",
  "phone": "0512345679",
  "address": "الدمام",
  "customer_nationality": "سعودية",
  "gender": "أنثى"
}
```
**Response 200**
```json
{
  "customer": {
    "id": 42,
    "full_name": "سارة محمد",
    "phone": "0512345679"
  }
}
```

---

### `DELETE /api/customers/{customerId}`
**Response 200/204** — Success.

---

### `GET /api/customer-notes/{customerId}`
**Response 200**
```json
{
  "notes": [
    {
      "id": 101,
      "author": "احمد الاداري",
      "note_date": "2026-06-01",
      "message": "تم التواصل مع قسم المحاسبة"
    }
  ]
}
```

---

### `POST /api/customer-notes`
**Request** JSON
```json
{
  "customer_id": 1,
  "sales_id": "1HDYgTwX7UQ64wFENRSMMY5dND33",
  "message": "ملاحظة جديدة",
  "type": "ملاحظة",
  "note_date": "2026-06-24"
}
```
**Response 200/201**
```json
{
  "data": {
    "id": 102,
    "author": "...",
    "note_date": "2026-06-24",
    "message": "ملاحظة جديدة"
  }
}
```

---

## Approvals

### `GET /api/trip-edit-requeststest`
**Response 200** — Flexible shape
```json
{
  "data": [
    {
      "id": 1,
      "trip_id": 35,
      "status": "pending",
      "old_values": { "price": 500, "from": "الملقا" },
      "new_values": { "price": 600, "from": "العليا" },
      "submitted_by": "محمد السائق",
      "submitted_from": "سائق",
      "created_at": "2026-06-20T10:00:00Z"
    }
  ]
}
```
Also accepted: `{ "requests": [...] }`, `{ "trip_edit_requests": [...] }`, `[...]`

---

### `POST /api/trip-edit-approve/{requestId}`
**Response 200** — Request approved, trip updated.

---

### `POST /api/trip-edit-reject/{requestId}`
**Response 200** — Request rejected.

---

## Support Tickets

### `GET /api/tickets`
**Response 200**
```json
{
  "tickets": [
    {
      "id": 1,
      "status": "open",
      "priority": "high",
      "issue_type": "driver_late",
      "description": "السائق تأخر 30 دقيقة",
      "driver_id": 12,
      "driver": { "name": "محمد", "last_name": "العتيبي" },
      "trip_id": 35,
      "created_type": "خدمة عملاء",
      "notes": [],
      "attachment": null,
      "created_at": "2026-06-20T09:00:00Z",
      "updated_at": "2026-06-21T11:00:00Z"
    }
  ]
}
```

---

### `POST /api/tickets`
**Request** JSON
```json
{
  "driver_id": 12,
  "trip_id": 35,
  "issue_type": "payment",
  "priority": "medium",
  "description": "مشكلة في الدفع",
  "created_type": "خدمة عملاء",
  "status": "open"
}
```

---

### `PUT /api/tickets/{ticketId}`
**Request** JSON
```json
{
  "issue_type": "payment",
  "priority": "high",
  "description": "تم التحقق من المشكلة",
  "status": "in_progress"
}
```

---

### `POST /api/tickets/{ticketId}/note`
**Request** JSON
```json
{ "note": "تم التواصل مع السائق" }
```

---

## Notifications

### `GET /api/general-notifications`
**Response 200**
```json
{
  "data": [
    {
      "id": 1,
      "title": "عيد مبارك",
      "body": "نتمنى لكم عيداً سعيداً",
      "type": "general",
      "status": "مرسل",
      "created_at": "2026-06-10T08:00:00Z"
    }
  ]
}
```
Also accepted: `[...]`

---

### `POST /api/notifications/drivers/send`
**Request** JSON
```json
{
  "title": "تنبيه مهم",
  "content": "يرجى الالتزام بالمواعيد",
  "type": "alert",
  "status": "مرسل",
  "scheduled_at": "2026-07-01T08:00:00"
}
```
**Response 200/201**
```json
{ "message": "Notifications sent successfully" }
```
**Response 4xx**
```json
{
  "message": "Validation failed",
  "errors": {
    "title": ["The title field is required."]
  }
}
```

---

### `POST /api/send-driver-notification`
**Request** JSON
```json
{
  "driver_id": "abc123",
  "title": "تنبيه",
  "body": "يرجى الالتزام بالمواعيد"
}
```

---

### `GET /api/drivo/admin/notifications`
**Response 200**
```json
[
  {
    "id": 1,
    "type": "مكافأة",
    "content": "تم إضافة مكافأة جديدة",
    "status": "unread",
    "created_at": "2026-06-20T10:00:00Z"
  }
]
```

---

### `POST /api/drivo/admin/notifications/mark-read`
**Response 200** — All notifications marked as read.

---

## Rewards

### `GET /api/promo-codes`
**Response 200**
```json
{
  "data": [
    {
      "id": 1,
      "code": "SUMMER26",
      "reward_type": "cash",
      "reward_value": 50.0,
      "start_date": "2026-06-01",
      "end_date": "2026-08-31",
      "max_total_usage": 500,
      "current_used": 123,
      "is_active": 1
    }
  ]
}
```

---

### `POST /api/promo-codes`
**Request** JSON
```json
{
  "code": "PROMO123",
  "reward_type": "cash",
  "reward_value": 50,
  "start_date": "2026-07-01",
  "end_date": "2026-12-31",
  "max_total_usage": 1000,
  "is_active": 1
}
```

---

### `PUT /api/promo-codes/{id}`
**Request** JSON — same fields as POST, all optional.

---

### `DELETE /api/promo-codes/{id}`
**Response 200/204** — Code deleted.

---

### `POST /api/admin/rewards/settings/update`
**Request** JSON
```json
{
  "app_download_enabled": 1,
  "app_download_reward": 100,
  "invite_enabled": 1,
  "invite_required_count": 5,
  "invite_reward_amount": 100,
  "points_enabled": 1,
  "points_per_amount": 10,
  "points_value": 10,
  "point_money_value": 10,
  "points_min_convert": 50,
  "points_expiration_days": 30
}
```
**Response 200**
```json
{ "message": "تم حفظ الإعدادات بنجاح" }
```

---

## Activity Logs

### `GET /api/logs/admin`
### `GET /api/logs/sales/{salesId}`
### `GET /api/logs/driver/{driverId}`

**Response 200**
```json
{
  "logs": [
    {
      "id": 1,
      "action_type": "create_trip",
      "title": "إنشاء رحلة",
      "description": "تم إنشاء رحلة جديدة من الملقا إلى الجامعة",
      "trip_id": 35,
      "driver_id": "abc123",
      "sales_id": "def456",
      "driver": { "name": "محمد", "last_name": "السالم" },
      "sales_user": { "name": "احمد" },
      "performed_by": "احمد الاداري",
      "created_at": "2026-06-20T09:00:00Z"
    }
  ]
}
```
Also accepted: `{ "data": [...] }` or `[...]`

---

### `GET /api/sales`
**Response 200** — Array of sales agents
```json
[
  { "id": "def456", "name": "احمد الاداري" }
]
```
Also accepted: `{ "data": [...] }`

---

## System Management

### `GET /api/expenses`
**Response 200**
```json
{
  "data": [
    {
      "id": 1,
      "type": "رواتب",
      "amount_sar": 5000.00,
      "amount_egp": 0.00,
      "expense_date": "2026-06-01",
      "description": "رواتب شهر يونيو"
    }
  ]
}
```

### `POST /api/expenses`
**Request** JSON
```json
{
  "type": "رواتب",
  "amount_sar": 5000.00,
  "amount_egp": 0.00,
  "expense_date": "2026-06-01",
  "description": "رواتب شهر يونيو"
}
```

### `PUT /api/expenses/{id}`
**Request** JSON — same fields, all optional.

### `DELETE /api/expenses/{id}`
**Response 200/204**

---

### `GET /api/cities`
**Response 200**
```json
{
  "cities": [
    { "id": 1, "name": "الرياض" },
    { "id": 2, "name": "جدة" }
  ]
}
```
Also accepted: `{ "data": [...] }` or `[...]`

### `POST /api/cities`
**Request** JSON `{ "name": "الدمام" }`

### `PUT /api/cities/{id}`
**Request** JSON `{ "name": "الدمام" }`

### `DELETE /api/cities/{id}`
**Response 200/204**

---

## Standard Error Format
```json
{
  "message": "Human-readable error description",
  "errors": {
    "field_name": ["Specific validation error"]
  }
}
```
HTTP status: `422` for validation, `404` for not found, `500` for server errors.
