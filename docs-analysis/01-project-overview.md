# Project Overview

## Name
**Drivo** — Admin Dashboard (`drivo-project-6f3fd`)

## Purpose
Drivo is an Arabic-language (RTL), browser-based admin dashboard for managing a ride-booking service. It provides operations staff with tools to manage trips, drivers, clients, payments, notifications, support tickets, rewards, and system configuration. The dashboard is the **admin front-end only**; drivers and passengers interact through a separate mobile application that is not part of this repository.

## Language & Direction
All UI text is Arabic. The entire layout uses `dir="rtl"`.

## Hosting Target
A purely static Single-Page Application (SPA). The built output (`dist/`) can be deployed to any CDN or static-file host. No server-side rendering.

## Backend Dependency
All business data is served by a separate Laravel/PHP REST API hosted at:
```
https://drivo1.elmoroj.com
```
This repository contains **no backend code**.

## Active Users / Roles
| Role | Description |
|---|---|
| `admin` | Full system access |
| `support` | Trips, drivers, clients, support, notifications, approvals |
| `accountant` | Dashboard, trips, rewards, settings |

## Key Integrations
| Integration | Purpose |
|---|---|
| Clerk | Authentication and user identity |
| Firebase Firestore | Real-time notification storage and unread count |
| OpenStreetMap / Nominatim | Free geocoding in trip creation form |
| Leaflet (CDN) | Interactive map picker |

## Current Version
`0.0.0` (package.json — never updated from Vite scaffold default)

## Project Status
The project is in an **active development / partial production** state. Core data flows (drivers, clients, approvals, notifications) are wired to the real API. Several UI sections (permissions, users, settings, chat, trip details) are UI prototypes not yet connected to the backend.
