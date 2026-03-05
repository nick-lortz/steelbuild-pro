# SteelBuild-Pro — Release Validation Checklist

**Use before every production push or major feature merge.**

---

## Pre-Release Checks

### Security
- [ ] All form inputs pass through `useSanitizedSubmit` or `sanitizeHTML` before entity write
- [ ] File uploads validated with `validateFileEnhanced()` (magic bytes + extension)
- [ ] No new `dangerouslySetInnerHTML` without DOMPurify
- [ ] No hardcoded secrets, API keys, or tokens in source files
- [ ] Backend functions authenticate user with `base44.auth.me()` before any operation
- [ ] Admin-only functions check `user.role === 'admin'`
- [ ] No new `eval()`, `Function()`, or `innerHTML` assignments

### Data Integrity
- [ ] Entity schema changes don't break existing records (backward compatible)
- [ ] New required fields have defaults or migration path
- [ ] Foreign key relationships validated (no orphan risk)
- [ ] Bulk operations have confirmation dialogs
- [ ] Delete operations have cascade warnings

### UI / UX
- [ ] All new pages accessible via navigation (TopNav or MoreDropdown)
- [ ] Loading states shown during data fetches
- [ ] Error states shown on fetch failures (not blank screens)
- [ ] Forms disable submit button while mutation is pending
- [ ] Mobile responsive — test at 375px width
- [ ] Back button works (no `window.location.href` — use `useNavigate`)

### Performance
- [ ] React Query uses `QUERY_CONFIG` constants (not ad-hoc staleTime)
- [ ] Large lists use pagination or virtual scrolling
- [ ] Images use `loading="lazy"` attribute
- [ ] No unnecessary re-renders (check with React DevTools Profiler)
- [ ] Backend functions respond within 10s for normal operations

### Testing
- [ ] Health check endpoint returns 200: `test_backend_function('healthCheck', {})`
- [ ] Critical user flows verified:
  - [ ] Create project → appears in project list
  - [ ] Create RFI → appears in RFI Hub
  - [ ] Create change order → shows in CO list
  - [ ] File upload → file accessible after upload
  - [ ] Login → dashboard loads
  - [ ] Logout → session cleared

### Monitoring
- [ ] Sentry DSN configured (or acknowledged as deferred)
- [ ] ErrorBoundary wraps all page content (via Layout)
- [ ] Console has no uncaught errors on normal user flows

---

## Post-Release Verification

- [ ] Spot-check 3 pages on production after deploy
- [ ] Verify no new Sentry errors in first 30 minutes
- [ ] Check health endpoint returns `"status": "healthy"`
- [ ] Notify team of successful release

---

## Rollback Procedure

1. If a deployed change causes issues:
   - Identify the problematic file via Sentry error or runtime logs
   - Revert the change in Base44 chat: "revert [file] to previous version"
   - Or: manually undo the change using find_replace
2. Entity schema changes **cannot** be rolled back if records were already created with new fields
   - In this case: make the new field optional and handle `null` gracefully