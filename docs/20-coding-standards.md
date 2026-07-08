# Coding Standards

These standards describe the conventions to follow when contributing to the Drivo admin dashboard codebase. They are derived from patterns already present in the codebase, normalised and extended.

---

## 1. Language & Runtime

- **JavaScript** (no TypeScript currently). New complex files may be written in TypeScript if the team decides to migrate incrementally.
- **ES Modules** (`"type": "module"` in `package.json`). Use `import`/`export` exclusively — no `require()`.
- **Target browsers:** Modern evergreen (Chrome, Edge, Firefox latest). No IE support.

---

## 2. File & Folder Naming

| Item | Convention | Example |
|---|---|---|
| Component files | PascalCase | `DriversPage.jsx` |
| Utility/service files | camelCase | `notificationsService.js` |
| Hooks | camelCase starting with `use` | `useUnreadCount.js` |
| Test files | `*.test.jsx` or `*.spec.jsx` | `roles.test.js` |
| Constants | `UPPER_SNAKE_CASE` for module-level | `const API_BASE = ...` |
| CSS files | PascalCase matching component | `App.css` |

---

## 3. Component Structure

Follow this order within each component file:

```jsx
// 1. Imports
import { useState, useEffect } from "react";
import { useToast } from "../lib/toast";

// 2. Constants (file-level)
const BASE = "https://drivo1.elmoroj.com/api";

// 3. Helper/sub-components (small, local-only)
const Spinner = () => ( <div className="..." /> );

// 4. Main component (default export last)
export default function DriverPage() {
  // 4a. Hooks (Clerk, Router, custom hooks)
  const toast = useToast();

  // 4b. State
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);

  // 4c. Derived values / useMemo
  const activeDrivers = drivers.filter(d => d.status === 1);

  // 4d. Event handlers / useCallback
  const handleDelete = useCallback(async (id) => { ... }, []);

  // 4e. Effects
  useEffect(() => { ... }, []);

  // 4f. Render
  return ( <div> ... </div> );
}
```

---

## 4. API Calls

### Do: Use the shared API base
```js
// Import from a shared lib (target state)
import { apiFetch } from "../lib/api";

// Until migrated, define at the top of the file:
const BASE = "https://drivo1.elmoroj.com/api";
```

### Do: Always handle errors and loading state
```js
const [loading, setLoading] = useState(true);
const [error, setError] = useState(null);

useEffect(() => {
  fetch(BASE + "/drivers")
    .then(r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    })
    .then(data => {
      setDrivers(Array.isArray(data) ? data : (data.data ?? []));
    })
    .catch(e => setError(e.message))
    .finally(() => setLoading(false));
}, []);
```

### Don't: Treat `status < 500` as success
```js
// ❌ Wrong — 4xx errors are NOT successes
if (res.ok || res.status < 500) { ... }

// ✅ Correct
if (res.ok) { ... }
```

### Do: Use `useCallback` when the fetch function is a dependency
```js
const fetchDrivers = useCallback(async () => {
  setLoading(true);
  try { ... }
  catch { ... }
  finally { setLoading(false); }
}, [/* deps */]);

useEffect(() => { fetchDrivers(); }, [fetchDrivers]);
```

---

## 5. State Management

- Use `useState` for local component state.
- Never store derived data in state — compute it with `useMemo` or inline in render.
- Use `useContext` only for cross-tree concerns (toast, auth). For everything else use props or local state.
- Do **not** introduce new global state managers (Redux, Zustand) without team discussion.

---

## 6. Component Design

### Keep components focused
A component should do one thing. If a file exceeds 300 lines, split it.

### Extract shared UI
Common patterns must be extracted to `src/components/ui/`:
- `Spinner` — loading indicator
- `Badge` — status label
- `ConfirmModal` — reusable delete confirmation
- `Portal` — `createPortal` wrapper

### Modal pattern
Use `createPortal` for all modals to avoid z-index issues:
```jsx
import { createPortal } from "react-dom";

const Portal = ({ children }) =>
  typeof document !== "undefined"
    ? createPortal(children, document.body)
    : null;
```

---

## 7. Styling

- Use **Tailwind CSS utility classes** exclusively — no inline `style` props except for dynamic values (e.g., chart widths, gradients).
- Use the project colour palette:
  ```
  Primary gold:   #c9a84c  /  #9C6402  /  #E6C76A
  Sidebar dark:   #1a1a1a
  Page bg:        #f0ede8
  Card bg:        white
  Text body:      text-gray-800
  Text muted:     text-gray-400 / text-gray-500
  Border:         border-gray-100 / border-gray-200
  ```
- All layouts must have `dir="rtl"` at the top-level container.
- Text alignment default is `text-right`.

---

## 8. Icons

**Standardise on a single approach.** Recommendation: use **Lucide React** consistently.

```jsx
// ✅ Preferred
import { Trash2, Edit, Eye } from "lucide-react";
<Trash2 className="w-4 h-4 text-red-400" />
```

Avoid mixing Lucide imports with inline SVG paths in the same component.

---

## 9. Forms

- Use controlled inputs (value + onChange) for all form fields.
- Show validation errors inline, not via browser alerts.
- Disable submit buttons during loading (`disabled={loading}`).
- Show success state briefly (`✓ تم الحفظ`) before closing modals.

```jsx
<button
  type="submit"
  disabled={saving || success}
  className={success ? "bg-green-600 ..." : "bg-[#c9a84c] ..."}
>
  {success ? "✓ تم الحفظ" : saving ? "جارٍ الحفظ..." : "حفظ"}
</button>
```

---

## 10. Toast Notifications

Use `useToast()` for user feedback inside components:
```js
const toast = useToast();
toast.success("تم الحفظ بنجاح");
toast.error("حدث خطأ، حاول مجدداً");
toast.warning("تحذير: سيتم حذف البيانات");
toast.info("معلومة");
```

Use the global `toast` singleton only when outside a React component:
```js
import { toast } from "../lib/toast";
toast.success("Done");
```

---

## 11. Error Handling

```js
// ✅ Correct pattern
try {
  const r = await fetch(...);
  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    throw new Error(err.message ?? `HTTP ${r.status}`);
  }
  const data = await r.json();
  // handle success
} catch (e) {
  console.error(e);
  toast.error(e.message || "حدث خطأ، حاول مجدداً");
} finally {
  setLoading(false);
}
```

Never swallow errors silently. Always show user-facing feedback.

---

## 12. Arabic Text & RTL

- All user-facing strings must be in Arabic.
- Do not use English placeholder text in production UI.
- Use `placeholder-gray-300` Tailwind class for placeholder styling.
- Phone number fields should use `dir="ltr"` for correct numeral display.
- Dates should use `toLocaleDateString("ar-EG")` for formatting.

---

## 13. Git Conventions

### Branch naming
```
feature/driver-status-api
fix/protected-route-default-role
chore/remove-unused-dependencies
docs/add-api-contracts
```

### Commit message format
```
type(scope): short description

feat(drivers): wire freeze modal to API endpoint
fix(auth): default role fallback changed to 'support'
chore(deps): remove unused axios and react-query
docs(api): add customer notes endpoint contract
```

Types: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `style`

### Pull Request checklist
- [ ] No new hardcoded API URLs (use `API_BASE`)
- [ ] Loading and error states handled
- [ ] Toast feedback for user actions
- [ ] No console.log left in production code
- [ ] Component under 300 lines
- [ ] ESLint passes (`npm run lint`)

---

## 14. ESLint Configuration

Current rules are in `eslint.config.js`. Key enforced rules:
- `react-hooks/rules-of-hooks` — hooks called correctly
- `react-hooks/exhaustive-deps` — `useEffect` dependencies complete
- `react-refresh/only-export-components` — HMR compatibility

Run before every commit:
```bash
npm run lint
```
