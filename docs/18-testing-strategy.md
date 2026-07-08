# Testing Strategy

## Current State
**Zero tests exist in this codebase.** No test framework is configured, no test files are present, and no testing libraries are installed. This is a significant risk for a system that manages driver data, financial records, and user access control.

---

## 1. Recommended Testing Stack

| Layer | Tool | Purpose |
|---|---|---|
| Unit tests | Vitest | Fast, Vite-native test runner |
| Component tests | React Testing Library + Vitest | Test React components in isolation |
| Integration tests | React Testing Library | Test page-level flows with mocked API |
| E2E tests | Playwright | Full browser automation for critical paths |
| API mocking | MSW (Mock Service Worker) | Intercept fetch calls in tests |
| Coverage | Vitest (built-in) + c8 | Track coverage metrics |

### Installation
```bash
npm install --save-dev vitest @testing-library/react @testing-library/user-event @testing-library/jest-dom msw playwright
```

### Vitest Config (`vite.config.js` addition)
```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
    }
  }
})
```

---

## 2. Test Pyramid

```
         /\
        /  \     E2E Tests (few, slow, high confidence)
       /    \    Critical user journeys
      /------\
     /        \   Integration Tests (moderate)
    /  Flows   \  Page-level with mocked API
   /------------\
  /              \  Unit Tests (many, fast)
 /  Utilities &   \ Helpers, business logic, hooks
/  Components     \
/------------------\
```

---

## 3. Unit Test Priorities

### 3.1 `src/lib/roles.js` — HIGH PRIORITY
This is the access control layer. It must be thoroughly tested.

```js
// canAccess.test.js
import { canAccess } from '../lib/roles';

describe('canAccess', () => {
  it('admin can access all routes', () => {
    expect(canAccess('admin', '/permissions')).toBe(true);
    expect(canAccess('admin', '/users')).toBe(true);
    expect(canAccess('admin', '/system')).toBe(true);
  });

  it('support cannot access admin-only routes', () => {
    expect(canAccess('support', '/permissions')).toBe(false);
    expect(canAccess('support', '/users')).toBe(false);
    expect(canAccess('support', '/system')).toBe(false);
  });

  it('accountant can only access permitted routes', () => {
    expect(canAccess('accountant', '/dashboard')).toBe(true);
    expect(canAccess('accountant', '/rewards')).toBe(true);
    expect(canAccess('accountant', '/drivers')).toBe(false);
    expect(canAccess('accountant', '/clients')).toBe(false);
  });

  it('null role (missing) should NOT grant admin access', () => {
    // This test will FAIL with current code — documents the bug
    expect(canAccess(null, '/permissions')).toBe(false);
    expect(canAccess(undefined, '/permissions')).toBe(false);
  });

  it('unknown role falls back to support permissions', () => {
    expect(canAccess('unknown_role', '/dashboard')).toBe(true);
    expect(canAccess('unknown_role', '/permissions')).toBe(false);
  });
});
```

### 3.2 `src/lib/notificationsService.js` and `src/services/notifications.js`
- Test `syncBackendNotifications` deduplication logic.
- Test `markAllAsRead` triggers correct Firestore updates.
- Mock Firebase SDK.

### 3.3 Utility Functions
- Date formatting helpers (implemented inline in multiple components — extract and test).
- `normalizeRequest` in `ApprovalsPage.jsx` — flexible response normalisation.
- `buildChanges` in `ApprovalsPage.jsx` — diff computation.
- `parseList` flexible array extraction.
- `mapCustomerToClient` in `ClientsPage.jsx`.

---

## 4. Component Test Priorities

### 4.1 `ProtectedRoute` — HIGH PRIORITY
```jsx
// ProtectedRoute.test.jsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ProtectedRoute from '../auth/ProtectedRoute';
import { useAuth, useUser } from '@clerk/clerk-react';

vi.mock('@clerk/clerk-react');

test('shows spinner while Clerk is loading', () => {
  useAuth.mockReturnValue({ isLoaded: false, isSignedIn: false });
  useUser.mockReturnValue({ user: null });
  render(<MemoryRouter><ProtectedRoute><div>Content</div></ProtectedRoute></MemoryRouter>);
  expect(screen.getByText('جاري تحميل النظام...')).toBeInTheDocument();
});

test('redirects unauthenticated users to /sign-in', () => {
  useAuth.mockReturnValue({ isLoaded: true, isSignedIn: false });
  useUser.mockReturnValue({ user: null });
  // assert Navigate to /sign-in
});

test('redirects support user from /permissions to /dashboard', () => {
  useAuth.mockReturnValue({ isLoaded: true, isSignedIn: true });
  useUser.mockReturnValue({ user: { publicMetadata: { role: 'support' } } });
  // render with location: /permissions → expect redirect to /dashboard
});
```

### 4.2 Toast System
- Verify `useToast()` throws outside provider.
- Verify toast renders, auto-dismisses, and uses correct colour per type.

### 4.3 Form Validation
- `DriverFormModal`: submit with missing required fields should not call API.
- `AddClientModal`: submit with blank name/phone should show validation.
- `NewTripFormPage`: days selection, direction, route type toggles.

---

## 5. Integration Test Priorities

Use MSW to mock the API layer:

```js
// src/test/handlers.js
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('https://drivo1.elmoroj.com/api/drivers', () => {
    return HttpResponse.json([
      { id: '1', name: 'محمد', status: 1, phone: '0501234567' }
    ]);
  }),
  http.delete('https://drivo1.elmoroj.com/api/drivers/:id', () => {
    return HttpResponse.json({ message: 'Deleted' });
  }),
];
```

### Priority Flows to Test
1. **DriversPage:** Loads drivers, add driver form submits, delete confirms and removes from list.
2. **ClientsPage:** Loads clients, add client, delete client, view details fetches detail API.
3. **ApprovalsPage:** Loads requests, approve changes status, reject changes status.
4. **NotificationsPanel:** Loads notification list, send form posts to API.
5. **RewardsPage:** Loads promo codes, add code, delete code.

---

## 6. E2E Test Priorities (Playwright)

These tests run against a real (or staging) environment.

### Critical Paths
1. **Sign in → view dashboard → sign out.**
2. **Admin: add a driver → verify in list → delete driver.**
3. **Support: create a support ticket → change status → add note.**
4. **Approve a trip edit request.**
5. **Role access control:** Sign in as `support` → attempt to navigate to `/permissions` → verify redirect.

### Playwright Setup
```js
// playwright.config.js
export default {
  testDir: './e2e',
  use: {
    baseURL: 'http://localhost:5173',
    locale: 'ar',
  },
};
```

---

## 7. Coverage Targets

| Layer | Target Coverage |
|---|---|
| `src/lib/` utilities | 90%+ |
| `src/auth/` | 100% |
| `src/services/` | 80%+ |
| Page components | 60%+ (integration level) |
| E2E critical paths | 100% of flows listed |

---

## 8. Testing for Missing/UI-Only Features

When implementing currently UI-only features, the following must be tested:

| Feature | Test Requirement |
|---|---|
| Driver block/freeze/pause | API call made with correct payload; UI updates on success/error |
| Trip details API fetch | `tripId` param used in fetch; data rendered in tabs |
| Permissions persistence | POST to API on save; success/error feedback |
| Users CRUD | Clerk or API integration with correct request format |
| Settings profile | Displays Clerk `useUser()` data correctly |

---

## 9. Testing RTL Layout

When testing Arabic RTL components:
- Set `document.dir = 'rtl'` in test setup.
- Verify Arabic text renders (not placeholder text).
- For user event tests, remember that RTL inputs read from right to left.

---

## 10. Implementation Roadmap

| Phase | Action | Priority |
|---|---|---|
| 1 | Install Vitest + RTL + MSW | Immediate |
| 2 | Write unit tests for `roles.js` | Immediate |
| 3 | Write component test for `ProtectedRoute` | Immediate |
| 4 | Write integration tests for drivers CRUD | High |
| 5 | Write integration tests for approvals flow | High |
| 6 | Set up Playwright with sign-in flow | Medium |
| 7 | Add coverage reporting to CI pipeline | Medium |
| 8 | Write tests for all new features before merging | Ongoing |
