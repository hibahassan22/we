# System Architecture

## 1. Architecture Style
**Client-side Single-Page Application (SPA)** with external service dependencies. There is no server-side code in this repository. All compute, persistence, and business logic reside in the external backend API and Firebase.

---

## 2. High-Level Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                        Browser (SPA)                             │
│                                                                  │
│  ┌───────────────┐   ┌──────────────────┐   ┌────────────────┐  │
│  │  React App    │   │  Clerk SDK       │   │  Firebase SDK  │  │
│  │  (Vite build) │   │  (Auth context)  │   │  (Firestore)   │  │
│  └──────┬────────┘   └────────┬─────────┘   └───────┬────────┘  │
│         │                     │                      │           │
└─────────┼─────────────────────┼──────────────────────┼───────────┘
          │ HTTPS fetch          │ HTTPS                │ WebSocket
          ▼                     ▼                      ▼
┌─────────────────┐   ┌─────────────────┐   ┌──────────────────┐
│  Drivo REST API │   │  Clerk Backend  │   │  Firebase        │
│  (Laravel/PHP)  │   │  (hosted SaaS)  │   │  Firestore       │
│  drivo1.elmoroj │   │  clerk.accounts │   │  (notifications  │
│  .com/api       │   │  .dev           │   │   collection)    │
└─────────────────┘   └─────────────────┘   └──────────────────┘
```

---

## 3. Component Layers

### 3.1 Entry & Bootstrap (`src/main.jsx`)
```
StrictMode
  └── ClerkProvider (publishableKey from env)
        └── ToastProvider (global toast context)
              └── App
```
Clerk must be the outermost wrapper. `BrowserRouter` lives inside `App.jsx`.

### 3.2 Routing (`src/App.jsx`)
All routes are wrapped through the `AdminPage` helper:
```
AdminPage
  └── ProtectedRoute (auth + RBAC check)
        └── Layout (sidebar + topbar shell)
              └── <PageComponent />
```

### 3.3 Authentication Layer (`src/auth/`)
- `ProtectedRoute.jsx` — Checks Clerk's `isLoaded`, `isSignedIn`, and role-based access.
- `SignInPage.jsx` — Renders Clerk's `<SignIn>` component with custom styling.

### 3.4 Page Components (`src/components/`)
21 page-level components, all flat in one directory. Each component is largely self-contained with local state, API calls, and modal sub-components defined inline.

### 3.5 Shared Library (`src/lib/`)
| File | Responsibility |
|---|---|
| `firebase.js` | Firebase app initialisation, exports `db` (Firestore instance) |
| `roles.js` | Role constants, `ROLE_ROUTES`, `NAV_ROLE_MAP`, `canAccess()` |
| `toast.jsx` | Toast context provider, `useToast()` hook, global `toast` singleton |
| `notificationsService.js` | Legacy Firestore notification helpers (partially superseded) |
| `useUnreadCount.js` | Real-time Firestore unread count hook |

### 3.6 Notification Service (`src/services/notifications.js`)
Active notification service that combines Firestore CRUD with backend API sync. Called from `Layout.jsx` on mount.

---

## 4. Data Flow Patterns

### 4.1 Standard Page Data Load
```
Component mounts
  → useEffect fires
    → fetch(BASE + endpoint)
      → setState(mappedData)
        → render
```

### 4.2 Notification Real-time Flow
```
Layout mounts
  → initNotificationsCollection()
    → syncBackendNotifications() pulls from /api/drivo/admin/notifications
      → writes new items to Firestore notifications collection

Layout + useUnreadCount
  → subscribeNotifications() sets up onSnapshot listener
    → fires callback on every Firestore change
      → updates unread count badge in real time
```

### 4.3 Auth Flow
```
User visits any route
  → ProtectedRoute checks Clerk isLoaded
    → if not loaded: show spinner
    → if not signed in: redirect to /sign-in
    → if signed in but wrong role: redirect to /dashboard
    → if signed in + role OK: render children
```

---

## 5. State Management Strategy
There is **no global client-side state manager**. State is managed through:

| Mechanism | Used For |
|---|---|
| `useState` | All local component state (lists, form values, modals) |
| `useEffect` | Data fetching on mount, subscriptions, side effects |
| Clerk context | Auth state (`useAuth`, `useUser`, `useClerk`) |
| Firestore `onSnapshot` | Real-time notification count |
| React Context (`ToastProvider`) | Global toast notifications |

**Installed but unused:** TanStack React Query (`@tanstack/react-query`) — no `QueryClient` or `useQuery` calls anywhere in the codebase.

---

## 6. Build & Deployment Pipeline

```
Source (src/)
  → Vite build
    → dist/ (static HTML + JS bundles + CSS)
      → Deploy to static host / CDN
```

### Vite Dev Proxy
In development, Vite proxies `/api/*` to `https://drivo1.elmoroj.com` to avoid CORS issues:
```js
server: {
  proxy: {
    '/api': {
      target: 'https://drivo1.elmoroj.com',
      changeOrigin: true,
      secure: false,
    }
  }
}
```
In production builds, the API calls use the absolute URL directly (hardcoded `BASE` constant).

---

## 7. External Service Dependencies

| Service | SDK | Purpose | Config |
|---|---|---|---|
| Clerk | `@clerk/clerk-react` v5 | Auth | `VITE_CLERK_PUBLISHABLE_KEY` env var |
| Firebase | `firebase` v12 | Firestore real-time notifications | Hardcoded config in `firebase.js` |
| Leaflet | CDN (`unpkg.com/leaflet@1.9.4`) | Map picker | Loaded at runtime on demand |
| Nominatim | Direct HTTP to `nominatim.openstreetmap.org` | Geocoding | No key; subject to usage policy |
| Drivo API | Native `fetch` | All business data | Hardcoded base URL |

---

## 8. Code Splitting & Performance Architecture
- **No code splitting.** All 21 pages load in a single bundle. `React.lazy()` and `Suspense` are not used.
- **No service worker** or PWA configuration.
- **No caching layer** — every page mount triggers fresh API calls.
- **Tailwind CSS** is purged at build time (only used classes are included).

---

## 9. Error Handling Architecture
- Per-component `try/catch` around `fetch` calls with local `error` state.
- No global error boundary (`React.ErrorBoundary`) exists.
- No centralised HTTP error interceptor.
- Toast notifications used for user-facing success/error feedback (not universally applied).

---

## 10. Key Architectural Risks
| Risk | Impact | Likelihood |
|---|---|---|
| No code splitting | Slow initial load as app grows | High |
| API base URL hardcoded in every component | Config change requires editing 10+ files | High |
| Firebase config in source code | Credentials exposed in version control | High |
| No global error boundary | Unhandled component errors crash the whole app | Medium |
| Unused dependencies (Axios, React Query) | Bloated bundle, confusion | Medium |
| Dual notification services | Logic divergence, bugs | Medium |
