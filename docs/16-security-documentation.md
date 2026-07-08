# Security Documentation

## 1. Executive Summary

The Drivo admin dashboard has **several critical security vulnerabilities** that must be addressed before the application handles sensitive production data at scale. The most severe issues are:

1. Default role fallback grants admin access to unauthenticated-role users.
2. No Authorization headers sent to the backend API.
3. Firebase credentials hardcoded in committed source code.
4. `.env` file not excluded by `.gitignore`.

---

## 2. Authentication Security

### 2.1 Clerk Authentication
| Control | Status | Notes |
|---|---|---|
| Session management | ✅ Delegated to Clerk | Industry-standard, secure |
| MFA support | ✅ Clerk supports MFA | Not enforced by the app |
| Password policy | ✅ Clerk managed | Not enforced by the app |
| Brute force protection | ✅ Clerk managed | — |
| Session expiry | ✅ Clerk managed | — |

### 2.2 Session Token
Clerk issues a session JWT. The frontend reads auth state via `useAuth()` but **never attaches this token to API requests**.

---

## 3. Authorization Vulnerabilities

### CRITICAL — Default Role Grants Admin Access

**Location:** `src/auth/ProtectedRoute.jsx` line:
```js
const role = user?.publicMetadata?.role ?? "admin";
```

**Risk:** Any user who signs in via Clerk without an explicit role set in `publicMetadata` is treated as a full system administrator. This includes:
- Newly invited Clerk users before their role is assigned.
- Users whose role metadata was accidentally deleted.

**CVSS-like Severity:** Critical

**Fix:**
```js
const role = user?.publicMetadata?.role ?? "support"; // least privilege
```

---

### HIGH — No API Authorization Headers

**Location:** All `fetch()` calls in all page components.

**Risk:** The backend API at `https://drivo1.elmoroj.com/api` receives no authentication token. One of the following is true:
- The backend uses IP-allowlisting (fragile).
- The backend has no authentication (critical).
- Cookie-based auth is set elsewhere (not visible in this codebase).

If the backend has no auth, any person who discovers the API URL can read, create, edit, and delete all driver, client, and trip data.

**Fix:** Attach the Clerk session token to all API requests:
```js
import { useAuth } from "@clerk/clerk-react";

const { getToken } = useAuth();
const token = await getToken();

fetch(BASE + "/endpoint", {
  headers: {
    "Authorization": `Bearer ${token}`,
    "Accept": "application/json"
  }
});
```

---

### HIGH — No Feature-Level Authorization

**Risk:** Any authenticated user who reaches a permitted page can see and trigger all actions on that page regardless of fine-grained role. For example:
- A support agent can see the "permanently block driver" button.
- An accountant on `/trips` can see all trip management actions.

**Fix:** Add action-level role checks:
```jsx
{role === "admin" && (
  <button onClick={handlePermanentBlock}>حظر نهائي</button>
)}
```

---

## 4. Credential Exposure

### CRITICAL — Firebase Config in Source Code

**Location:** `src/lib/firebase.js`

```js
const firebaseConfig = {
  apiKey:            "AIzaSyDJdX1lcGLB35TG4FFxkFPxIhJtvpnhyZU",
  authDomain:        "drivo-project-6f3fd.firebaseapp.com",
  projectId:         "drivo-project-6f3fd",
  storageBucket:     "drivo-project-6f3fd.firebasestorage.app",
  messagingSenderId: "961325177377",
  appId:             "1:961325177377:web:3c702f8dd143d08693a160",
};
```

**Risk:** While Firebase API keys for web apps are technically public-facing and protected by Firestore Security Rules, hardcoding them in source code means:
- Any contributor can see the production Firebase project credentials.
- If the repository becomes public, the credentials are fully exposed.
- There is no environment separation (dev vs. production use the same project).

**Fix:**
```env
# .env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```
```js
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  // ...
};
```

---

### HIGH — `.env` File Not in `.gitignore`

**Location:** `.gitignore` does not include `.env`.

**Risk:** If `.env` is committed (it may already be), the Clerk publishable key is exposed in version control history.

**Fix:** Add to `.gitignore`:
```
.env
.env.local
.env.production
```

Note: Clerk publishable keys (`pk_test_...`) are designed to be public-facing, but production live keys (`pk_live_...`) must never be committed.

---

### MEDIUM — Hardcoded `SALES_ID`

**Location:** `src/components/ClientsPage.jsx`
```js
const SALES_ID = "1HDYgTwX7UQ64wFENRSMMY5dND33";
```

**Risk:** A real user's ID is hardcoded. Notes added by any staff member are attributed to this one static ID, not the actual logged-in user. This also breaks if the user is removed from the system.

**Fix:** Derive the ID from the authenticated Clerk user:
```js
const { user } = useUser();
const salesId = user?.publicMetadata?.userId ?? user?.id;
```

---

## 5. Data Security

### 5.1 Sensitive Data Transmitted
The following PII/sensitive data flows through the application:

| Data | Route | Risk |
|---|---|---|
| Driver IBAN (bank account) | `POST /api/drivers` | Transmitted as plain text in FormData |
| Driver identity document images | `POST /api/drivers` | Uploaded via HTTPS |
| Driver licence images | `POST /api/drivers` | Uploaded via HTTPS |
| Customer phone numbers | Displayed in UI | Visible to all roles with access |
| Customer ratings | Editable in UI | No audit trail for rating changes |

### 5.2 Data Exposure in UI
- Trip details currently use static mock data, but when the feature is complete, financial details (amounts, IBAN, commission) will be visible to support agents who may not need this level of access.

---

## 6. Firestore Security

**Risk:** Firebase Firestore Security Rules are not in this repository. If rules are overly permissive (e.g., `allow read, write: if true`), anyone with the Firebase config can:
- Read all notification records.
- Write arbitrary data to the `notifications` collection.
- Flood the collection with spam documents.

**Action Required:**
Review the Firestore Security Rules in the Firebase Console and ensure they require valid Clerk session authentication before granting access. Since the frontend does not sign in to Firebase Auth, a custom authentication mechanism or server-side Firestore access should be considered.

**Recommended Firestore Rules (minimum):**
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /notifications/{docId} {
      // Only allow access from your domain (enforce with Firebase App Check)
      allow read, write: if request.auth != null;
    }
  }
}
```

---

## 7. Content Security

### 7.1 Input Validation
- Frontend performs minimal validation: HTML `required` attributes and basic `trim()` checks.
- No input sanitisation against XSS.
- All sanitisation is delegated to the backend.

### 7.2 XSS Risk
- User-supplied content (driver names, notes, descriptions) is rendered directly in JSX using `{variable}`.
- React's JSX escapes string interpolation by default, providing baseline XSS protection.
- No use of `dangerouslySetInnerHTML` found.

### 7.3 File Uploads
- Identity, car, and licence images are uploaded via FormData to the backend.
- No client-side file type validation beyond `accept="image/*"` on the `<input>` element.
- File size limits are not enforced on the frontend.

---

## 8. Network Security

- All API calls use `https://` — encrypted in transit.
- The Vite dev proxy sets `secure: false` for the development server only.
- No Content Security Policy (CSP) headers are defined in the application (these would typically be set at the hosting/CDN level).

---

## 9. Security Recommendations Priority Matrix

| Priority | Issue | Effort |
|---|---|---|
| 🔴 Critical | Change default role fallback to `"support"` | Low — 1 line change |
| 🔴 Critical | Add auth token to all API requests | Medium — centralise HTTP client |
| 🔴 Critical | Add `.env` to `.gitignore` | Low |
| 🔴 Critical | Move Firebase config to env variables | Low |
| 🟠 High | Review and restrict Firestore Security Rules | Medium |
| 🟠 High | Fix hardcoded `SALES_ID` | Low |
| 🟠 High | Add feature-level role checks for destructive actions | Medium |
| 🟡 Medium | Add file upload size and type validation | Low |
| 🟡 Medium | Add rate limiting awareness for Nominatim geocoding | Low |
| 🟢 Low | Enforce MFA in Clerk dashboard for admin accounts | Low (config only) |
