# Project Overview

## Name
**Drivo** — Admin Dashboard

## Firebase Project ID
`drivo-project-6f3fd`

## Purpose
Drivo is an Arabic-language (RTL), browser-based administration dashboard for a ride-booking service operating in Saudi Arabia. It provides internal operations staff with tools to manage trips, drivers, clients, payments, notifications, support tickets, rewards programs, and system configuration.

The dashboard is the **admin front-end only**. Drivers and passengers interact through a separate mobile application that is outside the scope of this repository.

## Language & Locale
- All UI text is Arabic
- Layout direction: `dir="rtl"` throughout
- Date/number formatting: `ar-EG` locale

## Application Type
Static Single-Page Application (SPA) — the built output (`dist/`) is deployable to any CDN or static-file host with no server-side rendering.

## Backend Dependency
All business data is served by a separate REST API (assumed Laravel/PHP) at:
```
https://drivo1.elmoroj.com
```
This repository contains **no backend code**.

## Active User Roles
| Role | Arabic Label | Description |
|---|---|---|
| `admin` | مدير النظام | Full system access |
| `support` | خدمة عملاء | Trips, drivers, clients, support, notifications, approvals |
| `accountant` | محاسب | Dashboard, trips, rewards, settings |

## Key External Integrations
| Integration | Purpose | Notes |
|---|---|---|
| Clerk | Authentication & identity | `@clerk/clerk-react` v5 |
| Firebase Firestore | Real-time notification store | Project: `drivo-project-6f3fd` |
| OpenStreetMap / Nominatim | Free geocoding | No API key required |
| Leaflet | Interactive map picker | Loaded from CDN at runtime |

## Technology Summary
| Concern | Technology | Version |
|---|---|---|
| UI Framework | React | 19.2.x |
| Build Tool | Vite | 8.x |
| Routing | React Router DOM | 7.x |
| Styling | Tailwind CSS | 3.4.x |
| Charts | Recharts + custom SVG | 3.x |
| HTTP | Native `fetch` | — |
| State | Local `useState` / Context | — |
| Linting | ESLint | 10.x |
| Language | JavaScript (no TypeScript) | — |

## Repository Structure (top-level)
```
/
├── src/                  Application source code
├── public/               Static assets
├── docs/                 Project documentation (this folder)
├── docs-analysis/        Initial discovery analysis
├── tools/                External tooling (project-docs-builder)
├── .agents/              Agent skill definitions
├── index.html            Vite entry HTML
├── vite.config.js        Vite configuration
├── tailwind.config.js    Tailwind configuration
├── package.json          Dependencies and scripts
└── .env                  Environment variables (not gitignored — risk)
```

## Current Version
`0.0.0` — never updated from the Vite scaffold default.

## Project Status
**Active development / partial production.** Core data flows (drivers, clients, approvals, notifications, support tickets, rewards) are connected to the real API. Several sections (permissions, users, settings profile, live chat, trip details) remain UI prototypes not yet integrated with the backend.
