# Frontend Architecture

## 1. Technology Stack

| Concern | Library | Version |
|---|---|---|
| UI Framework | React | 19.2.x |
| Build Tool | Vite + `@vitejs/plugin-react` | 8.x / 6.x |
| Routing | React Router DOM | 7.x |
| Styling | Tailwind CSS | 3.4.x |
| Auth | `@clerk/clerk-react` | 5.x |
| Realtime | Firebase SDK (Firestore) | 12.x |
| Charts | Recharts (installed) + custom SVG/CSS | 3.x |
| Icons | Lucide React + inline SVG | 1.x |
| Modals | `react-dom` `createPortal` (selected pages) | — |
| Notifications (UI) | Custom `ToastProvider` context | — |
| Map | Leaflet (CDN) | 1.9.4 |
| Geocoding | Nominatim REST | — |

---

## 2. Source Tree

```
src/
├── main.jsx                   App bootstrap & provider hierarchy
├── App.jsx                    Router and route definitions
├── index.css                  Global CSS (Tailwind base + custom)
├── App.css                    Additional global styles
│
├── auth/
│   ├── ProtectedRoute.jsx     Auth + RBAC route guard
│   └── SignInPage.jsx         Clerk sign-in wrapper
│
├── components/                All page components (flat)
│   ├── Layout.jsx             Shell: sidebar, topbar, chat modal
│   ├── Layout.bak.jsx         ⚠️ Stale backup — should be deleted
│   ├── Breadcrumb.jsx         Topbar breadcrumb
│   ├── PageTransition.jsx     Route animation wrapper
│   ├── DashboardPage.jsx
│   ├── TripsListPage.jsx
│   ├── TripDetailsPage.jsx
│   ├── CreateTripPage.jsx
│   ├── NewTripFormPage.jsx
│   ├── DriversPage.jsx
│   ├── ClientsPage.jsx
│   ├── ApprovalsPage.jsx
│   ├── NotificationsPanel.jsx
│   ├── NotificationsBellPage.jsx
│   ├── SupportPage.jsx
│   ├── RewardsPage.jsx
│   ├── ActivityLogPage.jsx
│   ├── PermissionsPage.jsx
│   ├── UsersPage.jsx
│   ├── SystemManagementPage.jsx
│   ├── SettingsPage.jsx
│   ├── AddPaymentModal.jsx    (standalone modal file — partially used)
│   └── EditTripModal.jsx      (standalone modal file — partially used)
│
├── lib/
│   ├── firebase.js            Firebase initialisation
│   ├── roles.js               RBAC constants and helpers
│   ├── toast.jsx              Toast context + hook + global singleton
│   ├── notificationsService.js Legacy Firestore helpers
│   └── useUnreadCount.js      Firestore unread count hook
│
└── services/
    └── notifications.js       Active notification service
```

---

## 3. Provider Hierarchy

```jsx
<StrictMode>
  <ClerkProvider publishableKey={VITE_CLERK_PUBLISHABLE_KEY}>
    <ToastProvider>
      <BrowserRouter>           {/* inside App.jsx */}
        <Routes>
          <Route ... element={
            <ProtectedRoute>
              <Layout>
                <PageComponent />
              </Layout>
            </ProtectedRoute>
          } />
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  </ClerkProvider>
</StrictMode>
```

---

## 4. Routing Table

| Path | Component | Roles Allowed |
|---|---|---|
| `/sign-in/*` | `SignInPage` | Public |
| `/` | Redirect → `/dashboard` | — |
| `/dashboard` | `DashboardPage` | All |
| `/trips` | `TripsListPage` | All |
| `/trips/:tripId` | `TripDetailsPage` | All |
| `/create-trip` | `CreateTripPage` | admin, support |
| `/new-trip` | `NewTripFormPage` | admin, support |
| `/clients` | `ClientsPage` | admin, support |
| `/drivers` | `DriversPage` | admin, support |
| `/drivers/:driverId` | `DriversPage` | admin, support |
| `/notifications` | `NotificationsPanel` | admin, support |
| `/alerts` | `NotificationsBellPage` | admin, support |
| `/activity` | `ActivityLogPage` | admin, support |
| `/approvals` | `ApprovalsPage` | admin, support |
| `/support` | `SupportPage` | admin, support |
| `/rewards` | `RewardsPage` | admin, accountant |
| `/permissions` | `PermissionsPage` | admin |
| `/users` | `UsersPage` | admin |
| `/system` | `SystemManagementPage` | admin |
| `/settings` | `SettingsPage` | All |
| `*` | Redirect → `/dashboard` | — |

---

## 5. Layout Component (`Layout.jsx`)

The `Layout` component is a monolithic shell that renders on every authenticated page. Its responsibilities:

- Collapsible sidebar with role-filtered navigation links.
- Topbar: search bar (UI only), chat button, notification bell, user pill.
- `NotificationsDropdown` — inline sub-component using Firestore `onSnapshot`.
- `ChatModal` — fetches driver list, maintains local message state per driver.
- Calls `initNotificationsCollection()` on mount to seed and sync Firestore.
- Calls `useUnreadCount()` to drive the bell badge.
- Signs out via `useClerk().signOut()`.

**Risk:** `Layout.jsx` is 710 lines. It mixes shell rendering, real-time subscription, API fetching, and chat state in a single file.

---

## 6. Component Patterns

### 6.1 Standard Page Pattern
```jsx
export default function SomePage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const toast = useToast();

  useEffect(() => {
    fetch(BASE + "/endpoint")
      .then(r => r.json())
      .then(d => { setData(d.items ?? []); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  return ( /* JSX */ );
}
```

### 6.2 Modal Pattern (Inline)
Most modals are defined as local functions inside the same file as their parent page. Some large pages define 5–8 modal sub-components inline. This is pragmatic but makes the files very long.

### 6.3 Portal Pattern
Some modals use `react-dom`'s `createPortal` to render outside the component tree (avoiding z-index clipping by the sidebar/topbar). Usage is inconsistent — some pages use portals, others render modals inline.

### 6.4 Toast Usage
```jsx
// Inside a component:
const toast = useToast();
toast.success("تم الحفظ بنجاح");
toast.error("حدث خطأ");

// Outside React tree:
import { toast } from "../lib/toast";
toast.info("رسالة");
```

---

## 7. Styling Conventions

- **Tailwind CSS utility classes** are used throughout. No component-level CSS modules.
- **Colour palette:**
  - Primary gold: `#c9a84c` / `#9C6402` / `#E6C76A`
  - Dark background (sidebar): `#1a1a1a`
  - Light background (pages): `#f0ede8` / `#f5f0e8`
  - Text: `text-gray-800` (body), `text-gray-400` (muted)
- **Rounded corners:** `rounded-xl` (cards), `rounded-2xl` (modals/panels), `rounded-full` (badges/pills)
- **Shadows:** `shadow-sm` on cards, `shadow-xl` on modals
- **Animations:** Inline `@keyframes` via `<style>` tags for toasts and modal entries
- **RTL:** All containers use `dir="rtl"`; `text-right` is the default text alignment

---

## 8. Icon Strategy

Two icon sources are mixed:
1. **Lucide React** — imported by name in `TripsListPage.jsx` and `TripDetailsPage.jsx`
2. **Inline SVG** — handwritten SVG paths directly in JSX, used everywhere else

This inconsistency should be standardised to one approach.

---

## 9. Charts

| Chart | Implementation |
|---|---|
| Bar chart (dashboard) | Pure CSS + Tailwind flex layout |
| Donut chart (dashboard) | Custom SVG with `strokeDasharray` |
| Progress bars (drivers) | Tailwind `w-full h-1.5` divs |
| Promo usage bar | Tailwind inline-width div |

Recharts is installed but **not used** in any component.

---

## 10. Map Integration (`NewTripFormPage.jsx`)

Leaflet is loaded on-demand from CDN when the `MapPickerModal` is first opened:
```js
// Inject CSS
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">

// Inject JS
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js">
```
The map is centred on Riyadh by default (`[24.7136, 46.6753]`). Users click to place a marker. Geocoding is done via a direct `fetch` to `nominatim.openstreetmap.org`.

**Risks:** External CDN dependency; Nominatim rate limits (1 request/second policy); no persistent marker state between modal opens.

---

## 11. Known Frontend Issues

| Issue | Location | Severity |
|---|---|---|
| `Layout.bak.jsx` committed to repo | `src/components/` | Low |
| All pages load upfront (no lazy loading) | `App.jsx` | High |
| `AddPaymentModal` defined in 2 separate files | `TripsListPage`, `TripDetailsPage` | Medium |
| `ChangeStatusModal` defined in 2 separate files | Same | Medium |
| `EditTripModal` defined in 3 places | Multiple | Medium |
| `BASE` API URL redefined in every component | All pages | High |
| Recharts installed, never used | `package.json` | Low |
| Axios installed, never used | `package.json` | Low |
| React Query installed, never used | `package.json` | Low |
| Topbar search has no functionality | `Layout.jsx` | Medium |
| Settings page shows hardcoded user data | `SettingsPage.jsx` | Medium |
| `SALES_ID` hardcoded in ClientsPage | `ClientsPage.jsx` | High |
