# Base44 Migration Checklist

This checklist moves Steelbuilder Pro off Base44 and onto infrastructure you control.

## 0) Current Inventory (captured)

- Raw usage map: `migration/base44-usage-map.txt` (`990` references)
- Highest concentration by area (from inventory):
  - `pages`: 481 references
  - `components/project-dashboard`: 47
  - `components/shared`: 44
  - `components/drawings`: 43
  - `components/services`: 36
  - `components/financials`: 29
  - `components/schedule`: 27
- Base44 API surfaces currently used:
  - `base44.entities.*` CRUD and subscribe
  - `base44.auth.*` (`me`, `updateMe`, `logout`, `redirectToLogin`)
  - `base44.functions.invoke(...)` (many server functions)
  - `base44.integrations.Core.UploadFile`
  - `base44.integrations.Core.InvokeLLM`

## 1) Target Architecture (decide once)

- Backend: Supabase (Postgres + Auth + Storage + Edge Functions)
- Frontend hosting: Vercel or Netlify
- AI provider: OpenAI directly from backend only
- Files: Supabase Storage buckets
- Realtime: Supabase Realtime channels where needed

Decision gate:
- [ ] Confirm stack choices (auth, db, storage, hosting, AI provider)
- [ ] Create new infra project(s) under your org account

## 2) Build an Adapter Layer First

Goal: keep UI stable while replacing Base44 under one boundary.

- [ ] Create `src/api/client/` abstraction with modules:
  - [ ] `authClient`
  - [ ] `entityClient`
  - [ ] `functionsClient`
  - [ ] `filesClient`
  - [ ] `realtimeClient`
- [ ] Introduce feature flag/env switch:
  - [ ] `VITE_BACKEND_PROVIDER=base44|owned`
- [ ] Replace direct imports of `@/api/base44Client` with abstraction modules incrementally

Definition of done:
- [ ] No page/component imports `@/api/base44Client` directly

## 3) Data Model and Migrations

- [ ] Extract entity list from usages in `migration/base44-usage-map.txt`
- [ ] Create SQL schema + migrations for all required entities
- [ ] Add indexes for all frequent filter/list fields
- [ ] Map Base44 IDs and timestamps into new schema
- [ ] Define foreign keys and cascade rules explicitly

Definition of done:
- [ ] New DB can serve all reads/writes currently used by app

## 4) Auth and User Context

- [ ] Implement auth replacement for:
  - [ ] `auth.me`
  - [ ] `auth.updateMe`
  - [ ] `auth.logout`
  - [ ] login redirect flow
- [ ] Port role/permission checks to owned backend tables
- [ ] Verify `Layout.jsx`, `AuthContext`, `usePermissions` behavior unchanged

Definition of done:
- [ ] Existing protected routes and permission checks pass smoke tests

## 5) Files and Document Pipeline

- [ ] Replace `Core.UploadFile` with owned upload endpoint + storage bucket
- [ ] Generate signed upload/download URLs server-side
- [ ] Port OCR/analysis/document routing functions currently called via `functions.invoke`
- [ ] Backfill existing file URLs to new storage references

Definition of done:
- [ ] Upload + preview + document workflows work end-to-end

## 6) Server Functions Port

Base44 functions are a major dependency. Prioritize by usage frequency and business criticality.

Top recurring functions (from inventory):
- [ ] `expenseOperations`
- [ ] `sovOperations`
- [ ] `invoiceOperations`
- [ ] `etcOperations`
- [ ] `budgetOperations`
- [ ] `autoProcessDocument`
- [ ] `updateUserProfile`
- [ ] `notifyStatusChange`
- [ ] `getPortfolioMetrics`
- [ ] `getCostRiskSignal`
- [ ] `generateInvoice`
- [ ] `drawingOperations`
- [ ] `deleteInvoice`
- [ ] `approveInvoice`
- [ ] `aiRiskAssessment`

Also required (single-use but feature-critical):
- [ ] `deleteProject`
- [ ] `calculateProjectScheduleHealth`
- [ ] `predictScheduleDelays`
- [ ] `forecastETC`
- [ ] `exportRFItoPDF`
- [ ] `extractDrawingMetadata`
- [ ] `analyzeDrawingSet`
- [ ] `detectRFIImpacts`
- [ ] `autoRouteRFI`

Definition of done:
- [ ] Every `functions.invoke('<name>')` call has an owned backend equivalent

## 7) Realtime / Subscriptions

Current subscriptions found:
- `DrawingSet`, `WorkPackage`, `Task`, `Resource`, `SOVItem`, `RFI`, `Financial`, `FabricationPackage`, `Fabrication`, `Expense`, `Delivery`, `ChangeOrder`

- [ ] Recreate each subscription path using owned realtime transport
- [ ] Ensure unsubscribe on unmount and reconnect behavior

Definition of done:
- [ ] Live updates match current UX in dashboards and planning views

## 8) Cutover Strategy

- [ ] Create one-time export from Base44
- [ ] Transform + import to owned DB
- [ ] Run dual-read verification scripts for critical entities
- [ ] Freeze writes briefly for final delta migration
- [ ] Flip frontend env to owned backend
- [ ] Keep rollback plan for 24-72 hours

Definition of done:
- [ ] Production traffic fully on owned backend with no Base44 calls

## 9) Verification and Exit Criteria

- [ ] `npm run typecheck:strict`
- [ ] `npm run typecheck`
- [ ] `npm run build`
- [ ] Smoke test all top-level pages
- [ ] Validate auth/session persistence
- [ ] Validate project CRUD, docs upload, schedule, financials, RFIs, dashboards
- [ ] Validate exports/report generation

Final exit criteria:
- [ ] `grep -RIn "@/api/base44Client|base44\." src` returns no runtime usage
- [ ] Base44 credentials removed from deployed environment

## 10) Execution Order (recommended)

1. Adapter layer + env switch
2. Auth + user profile path
3. Core entities (Project, Task, User, WorkPackage)
4. Files/upload path
5. Financials + SOV + invoices
6. Drawings + RFIs + analytics functions
7. Realtime subscriptions
8. Data cutover and final switch

## Useful commands

Rebuild usage map:

```bash
grep -REn "base44\\.|from ['\"]@/api/base44Client['\"]" src \
  --include='*.js' --include='*.jsx' --include='*.ts' --include='*.tsx' \
  > migration/base44-usage-map.txt
```

List unique invoked functions:

```bash
grep -REho "base44\\.functions\\.invoke\\('([^']+)'" src \
  --include='*.js' --include='*.jsx' --include='*.ts' --include='*.tsx' \
  | sed -E "s/.*'([^']+)'/\\1/" | sort | uniq -c | sort -nr
```
