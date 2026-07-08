# Backend API Documentation

## Overview

The Drivo admin dashboard communicates with a REST API hosted at:
```
https://drivo1.elmoroj.com/api
```

This API is **external to this repository**. No source code, OpenAPI spec, or Swagger file exists in the project. All endpoint information below is **reverse-engineered** from frontend fetch calls.

### Common Conventions
- Base URL: `https://drivo1.elmoroj.com/api`
- Response format: JSON
- No auth headers are sent from the frontend (potential security gap)
- `Accept: application/json` header is sent on most requests
- File uploads use `multipart/form-data` (FormData)

---

## 1. Dashboard

### GET `/api/dashboard-counts`
Returns aggregate KPI counts.

**Response (inferred):**
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

## 2. Trips

### GET `/api/trips`
Returns a list of all trips.

**Response (inferred):**
```json
[
  {
    "id": 35,
    "trip_status": "تم",
    "trip_type": "فردي",
    "driver_id": 12,
    "driver": { "name": "احمد", "last_name": "علي", "phone": "..." },
    "from": "حي الملقا",
    "to": "جامعة الملك سعود",
    "price": 570,
    "city": "الرياض"
  }
]
```
Also accepted wrapped as `{ "value": [...] }` or `{ "data": [...] }`.

---

### POST `/api/trips/{tripId}/add-payment`
Adds a payment record to a trip.

**Request:** `multipart/form-data`
| Field | Type | Required |
|---|---|---|
| `amount_paid` | number | Yes |
| `transfer_method` | string | No |
| `account_number` | string | No |
| `recipient_account` | string | No |
| `commission_transfer_date` | date | No |
| `payment_note` | string | No |
| `transfer_image` | file (image) | No |

**Response:** JSON with success message or error.

---

### POST `/api/trips`
Creates a new trip listing. (Payload mapping is incomplete in the frontend.)

---

## 3. Drivers

### GET `/api/drivers`
Returns a list of all drivers.

**Response (inferred):**
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
    "bank_name": "الراجحي",
    "account_owner": "محمد السالم",
    "iban": "SA...",
    "status": 1,
    "profile_completion": 80
  }
]
```
Also accepted wrapped as `{ "data": [...] }` or `{ "drivers": [...] }`.

---

### POST `/api/drivers`
Creates a new driver.

**Request:** `multipart/form-data`
| Field | Type | Required |
|---|---|---|
| `id` | string (generated) | Yes |
| `fcm_token` | string | Yes |
| `city_id` | number | Yes |
| `region` | number | Yes |
| `name` | string | Yes |
| `phone` | string | Yes |
| `address` | string | No |
| `nationality` | string | No |
| `gender` | string | No |
| `email` | email | No |
| `bank_name` | string | No |
| `account_owner` | string | No |
| `iban` | string | No |
| `car_type` | string | No |
| `car_model` | string | No |
| `vehicle_size` | string | No |
| `identity_image` | file | No |
| `car_image` | file | No |
| `license_image` | file | No |

---

### POST `/api/driverstest/update/{driverId}`
Updates an existing driver's profile.

**Request:** `multipart/form-data` (same fields as create, all optional)

---

### DELETE `/api/drivers/{driverId}`
Deletes a driver.

---

### POST `/api/driver-violations`
Adds a violation or note to a driver.

**Request:** JSON
```json
{
  "driver_id": "abc123",
  "message": "تأخر عن الرحلة",
  "type": "تنبيه",
  "violation_date": "2026-06-24",
  "rating": 3
}
```

---

## 4. Customers (Clients)

### GET `/api/Allcustomers`
Returns all customers.

**Response (inferred):**
```json
{
  "customers": [
    {
      "id": 1,
      "full_name": "عبدالرحمن احمد",
      "phone": "0544222333",
      "address": "جدة",
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

### GET `/api/customers-details/{customerId}`
Returns full customer details including trip history.

---

### POST `/api/customers`
Creates a new customer.

**Request:** JSON
```json
{
  "full_name": "سارة عبدالله",
  "phone": "0512345679",
  "gender": "أنثى",
  "customer_nationality": "سعودية"
}
```

---

### POST `/api/customers/update/{customerId}`
Updates a customer.

**Request:** JSON
```json
{
  "full_name": "...",
  "phone": "...",
  "address": "...",
  "customer_nationality": "...",
  "gender": "..."
}
```

---

### DELETE `/api/customers/{customerId}`
Deletes a customer.

---

### GET `/api/customer-notes/{customerId}`
Returns notes for a specific customer.

---

### POST `/api/customer-notes`
Adds a note to a customer record.

**Request:** JSON
```json
{
  "customer_id": 1,
  "sales_id": "1HDYgTwX7UQ64wFENRSMMY5dND33",
  "message": "تم التواصل مع قسم المحاسبة",
  "type": "ملاحظة",
  "note_date": "2026-06-24"
}
```

---

## 5. Approvals

### GET `/api/trip-edit-requeststest`
Returns pending and processed trip edit requests.

**Note:** The "test" suffix suggests this is a non-production endpoint.

**Response (accepted shapes):**
```json
{ "data": [...] }
{ "requests": [...] }
{ "trip_edit_requests": [...] }
[...]
```

Each item contains: `id`, `trip_id`, `status`, `old_values`/`new_values` or `changes[]`, `submitted_by`, `created_at`.

---

### POST `/api/trip-edit-approve/{requestId}`
Approves a trip edit request.

---

### POST `/api/trip-edit-reject/{requestId}`
Rejects a trip edit request.

---

## 6. Support Tickets

### GET `/api/tickets`
Returns all support tickets.

**Response:**
```json
{
  "tickets": [
    {
      "id": 1,
      "status": "open",
      "priority": "high",
      "issue_type": "driver_late",
      "description": "...",
      "driver_id": 12,
      "driver": { "name": "...", "last_name": "..." },
      "trip_id": 35,
      "created_at": "2026-06-01T10:00:00Z",
      "updated_at": "2026-06-02T09:00:00Z",
      "notes": [],
      "attachment": null
    }
  ]
}
```

---

### POST `/api/tickets`
Creates a support ticket.

**Request:** JSON
```json
{
  "driver_id": 12,
  "trip_id": 35,
  "issue_type": "payment",
  "priority": "medium",
  "description": "...",
  "created_type": "خدمة عملاء",
  "status": "open"
}
```

---

### PUT `/api/tickets/{ticketId}`
Updates a ticket's status, issue type, priority, or description.

---

### POST `/api/tickets/{ticketId}/note`
Adds a note to a ticket.

**Request:** JSON `{ "note": "..." }`

---

## 7. Notifications

### GET `/api/general-notifications`
Returns sent general/broadcast notifications.

---

### POST `/api/notifications/drivers/send`
Sends a broadcast notification to all drivers.

**Request:** JSON
```json
{
  "title": "عيد مبارك",
  "content": "نتمنى لكم عيداً سعيداً",
  "type": "general",
  "status": "مرسل"
}
```
Optional: `"scheduled_at": "2026-07-01T08:00:00"` for scheduled delivery.

---

### POST `/api/send-driver-notification`
Sends a notification to an individual driver.

**Request:** JSON
```json
{
  "driver_id": "abc123",
  "title": "تنبيه",
  "body": "يرجى الالتزام بالمواعيد"
}
```

---

### GET `/api/drivo/admin/notifications`
Returns admin/system notifications.

---

### POST `/api/drivo/admin/notifications/mark-read`
Marks all admin notifications as read.

---

## 8. Rewards

### GET `/api/promo-codes`
Returns all promo codes.

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "code": "PROMO123",
      "reward_type": "cash",
      "reward_value": 50,
      "start_date": "2026-01-01",
      "end_date": "2026-12-31",
      "max_total_usage": 1000,
      "current_used": 145,
      "is_active": 1
    }
  ]
}
```

---

### POST `/api/promo-codes`
Creates a promo code.

**Request:** JSON
```json
{
  "code": "PROMO123",
  "reward_type": "cash",
  "reward_value": 50,
  "start_date": "2026-01-01",
  "end_date": "2026-12-31",
  "max_total_usage": 1000,
  "is_active": 1
}
```

---

### PUT `/api/promo-codes/{id}`
Updates a promo code.

---

### DELETE `/api/promo-codes/{id}`
Deletes a promo code.

---

### POST `/api/admin/rewards/settings/update`
Saves reward system settings.

**Request:** JSON
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

---

## 9. Activity Logs

### GET `/api/logs/admin`
Returns admin activity logs.

### GET `/api/logs/sales/{salesId}`
Returns a specific sales agent's activity logs.

### GET `/api/logs/driver/{driverId}`
Returns a specific driver's activity logs.

### GET `/api/sales`
Returns the list of sales agents (for the admin logs tab selector).

---

## 10. System Management

### GET `/api/expenses`
Returns expense records. Response: `{ "data": [...] }` or `[...]`.

### POST `/api/expenses`
Creates an expense record.

**Request:** JSON
```json
{
  "type": "رواتب",
  "amount_sar": 5000.00,
  "amount_egp": 0.00,
  "expense_date": "2026-06-01",
  "description": "رواتب شهر يونيو"
}
```

### PUT `/api/expenses/{id}`
Updates an expense record.

### DELETE `/api/expenses/{id}`
Deletes an expense record.

---

### GET `/api/cities`
Returns the list of cities. Response: `{ "cities": [...] }` or `{ "data": [...] }` or `[...]`.

### POST `/api/cities`
Creates a city. Request: `{ "name": "الرياض" }`

### PUT `/api/cities/{id}`
Updates a city name.

### DELETE `/api/cities/{id}`
Deletes a city.

---

## 11. Error Response Conventions (Inferred)

```json
{
  "message": "Human-readable error in Arabic or English",
  "errors": {
    "field_name": ["Validation error message"]
  }
}
```

HTTP status codes used: `200`, `201`, `204` (success), `4xx` (client error), `5xx` (server error). The frontend treats any status `< 500` as potentially successful in some places — a fragile pattern.
