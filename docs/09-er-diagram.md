# Entity-Relationship Diagram

## Notes
This ER diagram is **inferred** from API request/response shapes observed in the frontend source code. The actual backend schema may differ. Relationships marked with `?` are assumed based on context.

---

## Mermaid ER Diagram

```mermaid
erDiagram

    DRIVERS {
        string id PK
        string name
        string last_name
        string phone
        string email
        string address
        string nationality
        string gender
        string car_type
        string car_model
        string vehicle_size
        string bank_name
        string account_owner
        string iban
        string fcm_token
        int city_id FK
        int region
        int status
        string identity_image
        string car_image
        string license_image
    }

    CUSTOMERS {
        int id PK
        string full_name
        string phone
        string address
        string gender
        string customer_nationality
        decimal rating
        int total_trips
        int active_trips
        int completed_trips
        int cancelled_trips
        int pending_trips
    }

    TRIPS {
        int id PK
        string trip_status
        string trip_type
        string driver_id FK
        int customer_id FK
        string from
        string to
        decimal price
        string city
        date date_from
        date date_to
        time time_from
        time time_to
    }

    TRIP_EDIT_REQUESTS {
        int id PK
        int trip_id FK
        string status
        json old_values
        json new_values
        string submitted_by
        string submitted_from
        datetime created_at
    }

    TICKETS {
        int id PK
        string driver_id FK
        int trip_id FK
        string issue_type
        string priority
        string description
        string status
        string created_type
        string attachment
        datetime created_at
        datetime updated_at
    }

    TICKET_NOTES {
        int id PK
        int ticket_id FK
        string note
        datetime created_at
    }

    DRIVER_VIOLATIONS {
        int id PK
        string driver_id FK
        string message
        string type
        date violation_date
        int rating
    }

    CUSTOMER_NOTES {
        int id PK
        int customer_id FK
        string sales_id FK
        string message
        string type
        date note_date
        string author
        datetime created_at
    }

    PROMO_CODES {
        int id PK
        string code
        string reward_type
        decimal reward_value
        date start_date
        date end_date
        int max_total_usage
        int current_used
        boolean is_active
    }

    GENERAL_NOTIFICATIONS {
        int id PK
        string title
        string content
        string type
        string status
        datetime scheduled_at
        datetime created_at
    }

    EXPENSES {
        int id PK
        string type
        decimal amount_sar
        decimal amount_egp
        date expense_date
        string description
    }

    CITIES {
        int id PK
        string name
    }

    SALES_AGENTS {
        string id PK
        string name
    }

    ACTIVITY_LOGS {
        int id PK
        string action_type
        string title
        string description
        int trip_id FK
        string driver_id FK
        string sales_id FK
        string performed_by
        datetime created_at
    }

    PAYMENTS {
        int id PK
        int trip_id FK
        decimal amount_paid
        string transfer_method
        string account_number
        string recipient_account
        date commission_transfer_date
        string payment_note
        string transfer_image
    }

    %% Relationships

    DRIVERS ||--o{ TRIPS : "assigned to"
    CUSTOMERS ||--o{ TRIPS : "books"
    TRIPS ||--o{ TRIP_EDIT_REQUESTS : "has"
    TRIPS ||--o{ TICKETS : "linked to"
    DRIVERS ||--o{ TICKETS : "subject of"
    TICKETS ||--o{ TICKET_NOTES : "has"
    DRIVERS ||--o{ DRIVER_VIOLATIONS : "has"
    CUSTOMERS ||--o{ CUSTOMER_NOTES : "has"
    SALES_AGENTS ||--o{ CUSTOMER_NOTES : "writes"
    CITIES ||--o{ DRIVERS : "home city"
    TRIPS ||--o{ PAYMENTS : "has"
    DRIVERS ||--o{ ACTIVITY_LOGS : "logged for"
    SALES_AGENTS ||--o{ ACTIVITY_LOGS : "performed by"
    TRIPS ||--o{ ACTIVITY_LOGS : "related to"
```

---

## Relationship Summary

| From | To | Type | Notes |
|---|---|---|---|
| `DRIVERS` | `TRIPS` | One-to-Many | A driver can have many assigned trips |
| `CUSTOMERS` | `TRIPS` | One-to-Many | A customer can book many trips |
| `TRIPS` | `TRIP_EDIT_REQUESTS` | One-to-Many | A trip can have multiple edit requests |
| `TRIPS` | `TICKETS` | One-to-Many | A trip can have multiple support tickets |
| `DRIVERS` | `TICKETS` | One-to-Many | A driver can be the subject of multiple tickets |
| `TICKETS` | `TICKET_NOTES` | One-to-Many | A ticket can have multiple notes |
| `DRIVERS` | `DRIVER_VIOLATIONS` | One-to-Many | A driver can have multiple violation records |
| `CUSTOMERS` | `CUSTOMER_NOTES` | One-to-Many | A customer can have multiple internal notes |
| `SALES_AGENTS` | `CUSTOMER_NOTES` | One-to-Many | A sales agent can write notes on multiple customers |
| `CITIES` | `DRIVERS` | One-to-Many | A city can have many drivers |
| `TRIPS` | `PAYMENTS` | One-to-Many | A trip can have multiple payment installments |
| `DRIVERS` | `ACTIVITY_LOGS` | One-to-Many | Driver actions are logged |
| `SALES_AGENTS` | `ACTIVITY_LOGS` | One-to-Many | Sales agent actions are logged |
| `TRIPS` | `ACTIVITY_LOGS` | One-to-Many | Trip-related events are logged |

---

## Firestore Data Model (Separate from Backend DB)

```
Firestore Database
└── notifications (collection)
    └── {docId} (document)
        ├── title: string
        ├── body: string
        ├── driverId: string
        ├── type: "driver" | "system"
        ├── read: boolean
        └── createdAt: Timestamp
```

The Firestore `notifications` collection is a **sync cache** of backend notifications plus any notifications sent directly from this admin dashboard. It is not the authoritative source — the backend is.
