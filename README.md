SteelBuild Pro

SteelBuild Pro is a construction project management platform purpose-built for structural steel contractors. It centralizes project execution across scheduling, financials, RFIs, documents, and field coordination, with a strong emphasis on data integrity, access control, and operational visibility.

⚠️ Important Status Notice
SteelBuild Pro is under active development.
Migration and enterprise hardening are not complete.
The application is not yet approved for enterprise or large-scale production use.

Current Status

Development Phase: Late Alpha / Early Beta
Migration Status: ❌ In Progress (not complete)
Production Readiness: ❌ Not enterprise-ready
Recommended Use: Pilot testing, internal validation, controlled environments only

Core functionality is implemented and operational, but several critical areas (performance, security hardening, observability, testing, and scalability) are still being actively addressed.

Implemented Features
Project Management

Project creation, updates, and lifecycle tracking

Strict backend uniqueness enforcement for project_number

Role-based access (admin vs assigned users)

Active project context with persistent selection

Scheduling

Task creation and updates

Dependency support (FS relationships)

Gantt, calendar, and list views

Critical path calculation (backend)

Business-day calculations (weekends supported; holidays pending)

Financials

Budget and actual cost tracking

Cost health and budget-vs-actual calculations

Division-by-zero protections implemented

Change order impact support (partial)

RFIs

RFI creation, updates, escalation tracking

Strict backend uniqueness enforcement for (project_id, rfi_number)

Business-day aging logic

XSS-safe rendering (plain React text rendering)

Friendly user-facing validation and conflict errors

Documents

Secure file upload and storage

Project-scoped access enforcement via backend (validateFileAccess)

Unauthorized access correctly blocked (403)

Backend Functions

Deployed and operational:

createProject

updateProject

createRFI

updateRFI

calculateProjectHealth

validateFileAccess

Manual uniqueness enforcement implemented due to platform limitations

Cleanup utilities created and verified for duplicate data

Error Handling

Page-level error boundaries:

Dashboard

RFI Hub

Financials

Schedule

Friendly user-facing error toasts (no raw stack traces)

What Is Not Complete Yet
❌ Migration & Infrastructure

Database migration validation incomplete

Platform-level unique indexes not enforced (handled manually for now)

No verified rollback strategy

❌ Performance & Scalability

Dashboard currently loads global datasets (no server-side pagination)

Gantt chart not virtualized (performance degrades with large task counts)

No load testing results for large accounts

❌ Security Hardening

Full IDOR (Insecure Direct Object Reference) audit not complete

No rate limiting on public endpoints

CSRF strategy not verified

Secret rotation policies not documented

❌ Testing

Backend tests exist but are incomplete

No frontend unit tests

No E2E (Playwright/Cypress) test suite

No automated load or stress testing

❌ Observability

No centralized error tracking (Sentry/LogRocket/etc.)

No performance metrics or alerting

Limited structured audit logging for sensitive actions

❌ Enterprise Readiness

No CI/CD pipeline documented

No runbooks or incident response procedures

No SLA or uptime guarantees

Accessibility audit (WCAG 2.1) not completed

Known Risks

Performance degradation on large datasets (>1,000 projects/tasks)

Potential authorization gaps in unreviewed endpoints

Missing concurrency controls on simultaneous edits

Financial calculation consistency still under audit

External integrations (Google Calendar, email, LLM) lack retry/fallback logic

Recommended Usage

✅ Internal development
✅ Controlled pilot projects
✅ Feature validation and UX testing

🚫 Enterprise rollout
🚫 Large production datasets
🚫 Compliance-sensitive environments

Roadmap (High Level)
Short Term

Server-side pagination for projects, tasks, RFIs

IDOR audit and authorization enforcement

Rate limiting and abuse prevention

Financial formula centralization

Medium Term

Frontend and E2E test suites

Gantt virtualization

Observability (logs, metrics, alerts)

Security hardening (CSRF, retries, concurrency control)

Long Term

Enterprise deployment pipeline

Compliance documentation (SOC2/GDPR readiness)

Offline support and sync

Advanced analytics and reporting

Disclaimer

This software is provided as-is during active development.
Features, behavior, and data models may change without notice.

Do not rely on SteelBuild Pro for contractual, compliance, or financial reporting purposes until migration and enterprise readiness are formally completed.
