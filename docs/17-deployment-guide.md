# Deployment Guide

## Overview
The Drivo admin dashboard is a static Single-Page Application (SPA). Deployment consists of building the source into static assets and serving them from any static hosting provider.

---

## 1. Prerequisites

| Requirement | Details |
|---|---|
| Node.js | v18 or later (v20 LTS recommended) |
| npm | v9 or later |
| Clerk account | A configured Clerk application with user roles set |
| Firebase project | `drivo-project-6f3fd` with Firestore enabled |
| Backend API | `https://drivo1.elmoroj.com` running and accessible |

---

## 2. Environment Variables

Create a `.env` file in the project root (do **not** commit this file):

```env
# Required
VITE_CLERK_PUBLISHABLE_KEY=pk_live_xxxxxxxxxx

# Recommended — Move Firebase config out of source code
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=drivo-project-6f3fd.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=drivo-project-6f3fd
VITE_FIREBASE_STORAGE_BUCKET=drivo-project-6f3fd.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=961325177377
VITE_FIREBASE_APP_ID=1:961325177377:web:3c702f8dd143d08693a160
```

> **Note:** Currently only `VITE_CLERK_PUBLISHABLE_KEY` is read from env. Firebase config is hardcoded in `src/lib/firebase.js`. Migrating Firebase config to env variables is strongly recommended before production deployment.

---

## 3. Build Steps

```bash
# 1. Install dependencies
npm install

# 2. Build for production
npm run build

# Output: dist/ directory containing:
# - index.html
# - assets/ (JS bundles, CSS, images)
```

### Available Scripts
| Command | Description |
|---|---|
| `npm run dev` | Start Vite dev server with HMR |
| `npm run build` | Build production bundle to `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint |

---

## 4. Static Hosting Options

### Option A — Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

Vercel automatically detects Vite projects. Set environment variables in the Vercel dashboard under Project → Settings → Environment Variables.

**Required `vercel.json` for SPA routing:**
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

---

### Option B — Netlify

```bash
# Install Netlify CLI
npm i -g netlify-cli

# Deploy
netlify deploy --prod --dir=dist
```

**Required `public/_redirects` file:**
```
/*    /index.html   200
```

---

### Option C — AWS S3 + CloudFront

1. Build: `npm run build`
2. Upload `dist/` to S3 bucket with static website hosting enabled.
3. Set bucket policy for public read access.
4. Configure CloudFront distribution pointing to S3.
5. Add a CloudFront error page rule: 404 → `/index.html` (status 200) for SPA routing.
6. Set environment variables at build time using CI/CD pipeline.

---

### Option D — Traditional Web Server (Nginx)

```nginx
server {
    listen 80;
    server_name admin.drivo.com;
    root /var/www/drivo-admin/dist;
    index index.html;

    # SPA routing — all unknown routes serve index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|svg|ico|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-Content-Type-Options "nosniff";
    add_header X-XSS-Protection "1; mode=block";
    add_header Referrer-Policy "strict-origin-when-cross-origin";
}
```

---

## 5. Clerk Configuration

In the Clerk Dashboard:
1. Add the production domain to **Allowed Origins**.
2. Set `afterSignInUrl` to the production dashboard URL.
3. For each admin user, set `publicMetadata`:
   ```json
   { "role": "admin" }
   ```
4. For support users:
   ```json
   { "role": "support" }
   ```
5. For accountant users:
   ```json
   { "role": "accountant" }
   ```

> Users without a role currently default to `"admin"` (security risk — fix before production).

---

## 6. Firebase Configuration

In the Firebase Console (`drivo-project-6f3fd`):

1. **Firestore:** Ensure the `notifications` collection and required indexes exist.
2. **Security Rules:** Restrict read/write access appropriately (see Security Documentation).
3. **Authorized Domains:** Add the production domain under Authentication → Settings → Authorized domains.
4. **App Check:** Consider enabling Firebase App Check to prevent abuse of the Firestore API key.

### Required Firestore Index
The `subscribeNotifications()` function uses `orderBy("createdAt", "desc")`. Ensure this index exists:
- Collection: `notifications`
- Field: `createdAt` — Descending
- Query scope: Collection

---

## 7. Backend API CORS

The backend at `https://drivo1.elmoroj.com` must allow requests from the production admin dashboard domain:

```
Access-Control-Allow-Origin: https://admin.drivo.com
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Accept, Authorization
```

In development, the Vite proxy (`vite.config.js`) handles CORS by proxying `/api` requests server-side.

---

## 8. CI/CD Pipeline (Recommended)

Example GitHub Actions workflow (`.github/workflows/deploy.yml`):

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build
        env:
          VITE_CLERK_PUBLISHABLE_KEY: ${{ secrets.VITE_CLERK_PUBLISHABLE_KEY }}
          VITE_FIREBASE_API_KEY: ${{ secrets.VITE_FIREBASE_API_KEY }}
          # ... other env vars

      - name: Deploy to Vercel
        run: vercel --prod --token ${{ secrets.VERCEL_TOKEN }}
```

---

## 9. Post-Deployment Verification Checklist

- [ ] Application loads at production URL
- [ ] Sign-in page renders correctly with Drivo branding
- [ ] Signing in with a test admin account succeeds
- [ ] Dashboard KPI data loads from API
- [ ] Sidebar shows correct navigation items for each role
- [ ] Notification bell shows real-time count
- [ ] Driver list loads from API
- [ ] Client list loads from API
- [ ] Approvals page loads requests from API
- [ ] Sending a notification succeeds
- [ ] Browser console has no uncaught errors
- [ ] Network tab shows all API calls returning 2xx

---

## 10. Rollback Procedure

Since the app is stateless and the build output is immutable:

1. Keep the previous build artefact (`dist/` directory or previous deployment snapshot).
2. Re-deploy the previous version via the hosting provider's rollback feature (Vercel/Netlify provide one-click rollbacks).
3. Alternatively, revert the git commit and trigger a new build.

No database migrations are involved in frontend deployments.
