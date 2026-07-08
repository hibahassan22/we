# Data Dictionary

This dictionary defines all significant data fields and domain values used across the Drivo admin dashboard, sourced from API responses, frontend constants, and component logic.

---

## Domain Values

### Driver Status (`status` field in drivers)
| Code | Arabic Label | Meaning |
|---|---|---|
| `1` | نشط | Active — can receive trips |
| `2` | مجمد | Frozen — blocked from new trips; financial settlement allowed |
| `3` | محظور | Blocked — permanently barred; cannot log in to mobile app |
| `4` | موقوف مؤقتاً | Temporarily paused — blocked for a defined duration (24h, 48h, 1 week) |

---

### Trip Status (`trip_status` in trips)
| Value | Arabic | Meaning |
|---|---|---|
| `تم` | تم | Completed |
| `قيد التنفيذ` | قيد التنفيذ | In progress |
| `ملغية` | ملغية | Cancelled |
| `معلقة` | معلقة | Suspended/paused |
| `موقوفة` | موقوفة | Stopped (variant of paused used in some responses) |

---

### Trip Type (`trip_type`)
| Value | Meaning |
|---|---|
| `فردي` | Individual (single passenger) |
| `جماعي (N)` | Group trip with N passengers |

---

### Trip Direction
| Value | Meaning |
|---|---|
| `ذهاب` | One-way (outbound) |
| `عودة` | One-way (return) |
| `ذهاب وعودة` | Round-trip |

---

### Trip Route Type
| Value | Meaning |
|---|---|
| `مسار واحد` | Single fixed route |
| `مسارات متعددة` | Multiple routes / stops per day |

---

### Subscription Type
| Value | Meaning |
|---|---|
| `يومي` | Daily (not subscription) |
| `أسبوعي` | Weekly subscription |
| `شهري` | Monthly subscription |

---

### Vehicle Size (`vehicle_size`)
| Value | Seats |
|---|---|
| `صغيرة` | 4 passengers |
| `متوسطه` | 5–6 passengers |
| `كبيرة` | 7+ passengers |

---

### Ticket Status (`status`)
| Value | Arabic | Meaning |
|---|---|---|
| `open` | مفتوحة | New, unresolved |
| `in_progress` | قيد المعالجة | Being actively worked on |
| `resolved` | محلولة | Resolution found |
| `closed` | مغلقة | Closed with no further action |

---

### Ticket Priority (`priority`)
| Value | Arabic | Style |
|---|---|---|
| `high` | عالية | Red |
| `medium` | متوسطة | Amber |
| `low` | منخفضة | Gray |

---

### Ticket Issue Type (`issue_type`)
| Value | Arabic |
|---|---|
| `driver_late` | تأخر السائق |
| `payment` | مشكلة مالية |
| `accident` | حادث |
| `behavior` | سلوك السائق |
| `other` | أخرى |

---

### Driver Violation Type (`type`)
| Value | Meaning |
|---|---|
| `ملاحظة` | General note |
| `شكوى` | Complaint |
| `إنذار` | Warning |
| `مخالفة` | Formal violation |
| `تنبيه` | Alert/reminder |

---

### Approval Request Status
| Value | Arabic | Colour |
|---|---|---|
| `pending` | معلق | Amber |
| `approved` | موافق | Green |
| `rejected` | مرفوض | Red |

---

### Notification Type (`type` in Firestore)
| Value | Meaning |
|---|---|
| `driver` | Driver-specific notification |
| `system` | System-generated notification |

---

### General Notification Type (`type` in API)
| Value | Arabic |
|---|---|
| `general` | عام |
| `promotional` | ترويجي |
| `alert` | تنبيه |
| `scheduled` | مجدول |

---

### Promo Code Reward Type (`reward_type`)
| Value | Arabic | Description |
|---|---|---|
| `cash` | نقدي | Fixed SAR cash reward |
| `points` | نقاط | Points credit |
| `discount` | خصم | Percentage discount |

---

### Activity Log Action Types (`action_type`)
| Value | Arabic Label | Icon Colour |
|---|---|---|
| `create_trip` | إنشاء رحلة | Blue |
| `trip_payment` | دفعة | Green |
| `edit_trip` | تعديل رحلة | Purple |
| `driver_violation` | شكوى سائق | Red |
| `delete_trip` | حذف رحلة | Red |
| `approve_trip` | موافقة رحلة | Green |
| `reject_trip` | رفض رحلة | Red |

---

### User Roles (Clerk `publicMetadata.role`)
| Value | Arabic | Dashboard Label |
|---|---|---|
| `admin` | أدمن | مدير النظام |
| `support` | خدمة عملاء | خدمة عملاء |
| `accountant` | محاسب | محاسب |

---

### Transfer Methods (Payment)
| Value | Arabic |
|---|---|
| `تحويل بنكي` | Bank transfer |
| `كاش` | Cash |
| `محفظة إلكترونية` | Digital wallet |

---

## Key Field Definitions

| Field | Source | Definition |
|---|---|---|
| `driverId` | Firestore notifications | String representation of the driver's backend ID |
| `fcm_token` | drivers API | Firebase Cloud Messaging device token for push notifications |
| `iban` | drivers form | International Bank Account Number (Saudi format: SA followed by 22 characters) |
| `city_id` | drivers form | Integer foreign key referencing the `cities` table |
| `region` | drivers form | Currently hardcoded to `1` on creation — region identifier |
| `sales_id` | customer notes | Hardcoded static string in `ClientsPage.jsx` — represents the current sales agent ID |
| `profile_completion` | drivers API | Integer 0–100 representing how complete the driver's profile is |
| `max_total_usage` | promo codes | Maximum number of times a promo code can be redeemed across all users |
| `current_used` | promo codes | How many times the code has been redeemed so far |
| `points_per_amount` | rewards settings | How many SAR must be spent to earn points |
| `points_value` | rewards settings | How many points are earned per `points_per_amount` SAR spent |
| `point_money_value` | rewards settings | SAR value of each point when converting points to cash |
| `points_min_convert` | rewards settings | Minimum number of points required before conversion is allowed |
| `points_expiration_days` | rewards settings | Number of days before unused points expire |

---

## Computed/Derived Values (Frontend Only)

| Computed Value | Formula | Location |
|---|---|---|
| Active trips count | `Math.round(total_trips * 0.24)` | `DashboardPage.jsx` |
| Donut chart segments | Fixed percentages of `total_trips` (60/15/20/5) | `DashboardPage.jsx` |
| Profile completion % | Displayed from API response | `DriversPage.jsx` |
| Unread notification count | `items.filter(n => !n.read).length` | `useUnreadCount.js` |
| Promo usage % | `(current_used / max_total_usage) * 100` | `RewardsPage.jsx` |
