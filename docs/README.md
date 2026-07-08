# Drivo Admin Dashboard — Documentation

Complete documentation for the Drivo admin dashboard project. All documents are generated from a full codebase analysis.

---

## Document Index

| # | Document | Description |
|---|---|---|
| 01 | [Project Overview](./01-project-overview.md) | What the project is, its stack, and current status |
| 02 | [Product Requirements (PRD)](./02-product-requirements.md) | Product vision, personas, feature requirements, acceptance criteria |
| 03 | [Business Requirements (BRS)](./03-business-requirements.md) | Business context, objectives, stakeholders, business rules |
| 04 | [Functional Requirements (FRS)](./04-functional-requirements.md) | Module-by-module functional requirements with implementation status |
| 05 | [System Architecture](./05-system-architecture.md) | Architecture diagram, component layers, data flows, deployment |
| 06 | [Frontend Architecture](./06-frontend-architecture.md) | Source tree, routing, component patterns, styling conventions |
| 07 | [Backend API Documentation](./07-backend-api-documentation.md) | All discovered API endpoints with request/response shapes |
| 08 | [Database Documentation](./08-database-documentation.md) | Firestore schema + inferred backend database tables |
| 09 | [ER Diagram](./09-er-diagram.md) | Mermaid entity-relationship diagram |
| 10 | [Data Dictionary](./10-data-dictionary.md) | Domain values, field definitions, computed values |
| 11 | [Authentication & Authorization](./11-authentication-authorization.md) | Clerk auth, RBAC, route guards, security gaps |
| 12 | [User Flows](./12-user-flows.md) | Step-by-step flows for all major operations |
| 13 | [Driver Flows](./13-driver-flows.md) | All interactions affecting driver records |
| 14 | [Admin Flows](./14-admin-flows.md) | Admin-exclusive flows and capabilities |
| 15 | [API Contracts](./15-api-contracts.md) | Formalised request/response contracts for all endpoints |
| 16 | [Security Documentation](./16-security-documentation.md) | Vulnerabilities, risks, and remediation guidance |
| 17 | [Deployment Guide](./17-deployment-guide.md) | Build steps, hosting options, env vars, CI/CD |
| 18 | [Testing Strategy](./18-testing-strategy.md) | Recommended test stack, priorities, and examples |
| 19 | [Technical Debt](./19-technical-debt.md) | 33 catalogued debt items with severity and fix guidance |
| 20 | [Coding Standards](./20-coding-standards.md) | Conventions, patterns, and contribution guidelines |
| 21 | [AI Context](./21-ai-context.md) | Structured context for AI coding assistants |
| 22 | [Project Roadmap](./22-project-roadmap.md) | Phased plan from critical fixes through feature enhancements |

---

## Quick Reference

### Technology Stack
React 19 · Vite 8 · Tailwind CSS 3 · Clerk Auth · Firebase Firestore · React Router 7

### Backend API
`https://drivo1.elmoroj.com/api`

### Three User Roles
`admin` → `support` → `accountant`

### Immediate Priority Actions
1. Fix default role fallback (`ProtectedRoute.jsx`) — 1 line
2. Add `.env` to `.gitignore`
3. Move Firebase config to env variables
4. Add auth token to API requests
5. Wire driver status modals to backend API

---

*Documentation generated: June 2026 · Source: full codebase analysis*
