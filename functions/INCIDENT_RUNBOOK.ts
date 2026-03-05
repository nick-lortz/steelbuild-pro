# SteelBuild-Pro — Incident Response Runbook

**Version**: 1.0  
**Last Updated**: 2026-03-05  
**Audience**: Project Managers, Admins, DevOps

---

## §1. Incident Severity Levels

| Level | Definition | Response Time | Example |
|-------|-----------|---------------|---------|
| **SEV-1** | App completely down, data loss, security breach | 15 min | Auth service down, entity data deleted, XSS exploit |
| **SEV-2** | Major feature broken, data corruption | 1 hour | Financials page blank, RFI creation fails, duplicate records |
| **SEV-3** | Minor feature degraded, workaround exists | 4 hours | Slow dashboard load, filter not working, cosmetic UI bug |
| **SEV-4** | Enhancement request, non-blocking issue | Next sprint | Mobile layout off, tooltip missing |

---

## §2. Immediate Response Checklist

### Step 1: Assess and Triage (5 min)
- [ ] Identify affected users / pages / entities
- [ ] Check Sentry dashboard for error spike (if configured)
- [ ] Check Base44 dashboard → Functions → Logs for backend errors
- [ ] Determine severity level
- [ ] Notify affected team members

### Step 2: Containment (15 min)
- [ ] If data corruption: **STOP all writes** — notify users to pause data entry
- [ ] If security breach: Change affected secrets immediately (Dashboard → Settings → Environment Variables)
- [ ] If function failure: Check function logs in Base44 dashboard → Code → Functions → [function name]
- [ ] If UI crash: ErrorBoundary should have caught it — check Sentry for component stack

### Step 3: Diagnosis
- [ ] Reproduce the issue in preview mode
- [ ] Check runtime logs (Base44 chat: "check runtime logs")
- [ ] For backend functions: use `test_backend_function` to test with sample payload
- [ ] For entity issues: check Data Management page for record inspection
- [ ] Check recent deployments — was anything changed in the last hour?

### Step 4: Resolution
- [ ] Apply fix via Base44 chat
- [ ] Test the fix in preview
- [ ] Verify affected records are correct
- [ ] If data was corrupted: restore from entity export (see §3)

### Step 5: Post-Incident
- [ ] Document what happened, root cause, and fix
- [ ] Update this runbook if a new failure mode was discovered
- [ ] Add monitoring/alerting for the failure mode

---

## §3. Data Backup & Recovery

### Backup Strategy (Manual — No Auto-Backup Available)

**Weekly Export** (Admin → Data Management):
1. Navigate to Data Management page
2. For each critical entity (Project, Task, RFI, ChangeOrder, SOVItem, Financial), click Export
3. Save CSV/JSON files to a secure location (Google Drive, shared folder)
4. Label with date: `SBP_backup_2026-03-05/`

**Critical Entities to Back Up**:
- `Project` — all project metadata
- `Task` — schedule data
- `RFI` — RFI records and responses
- `ChangeOrder` — CO records
- `SOVItem` — billing data
- `Financial` — financial records
- `SOVVersion` — version history snapshots

### Recovery Procedure
1. If records were deleted: Use the backup CSV/JSON to re-import via Data Management → Import
2. If records were corrupted: Export current data, compare with backup, manually correct
3. For SOV: Use `SOVVersion` entity to revert to a previous snapshot

---

## §4. Common Failure Modes

### "White Screen" / App Won't Load
1. Check browser console (F12) for errors
2. Most likely: a component import failed or a runtime error bypassed ErrorBoundary
3. Fix: Clear browser cache, hard refresh (Ctrl+Shift+R)
4. If persists: Check Base44 dashboard for build errors

### "Failed to load data" Errors
1. Check network tab — are API calls returning 401?
2. If 401: Session expired. Log out and log back in.
3. If 500: Backend function error. Check function logs.
4. If network error: Check internet connection.

### "Duplicate Records" Created
1. This can happen with slow networks + double-clicks
2. Check `created_date` — duplicates will have timestamps within seconds
3. Manually delete the duplicate via Data Management
4. Prevention: mutation hooks should disable submit button while `isPending`

### Backend Function Returns 500
1. Go to Base44 dashboard → Code → Functions → [function name]
2. Check the execution logs for the error
3. Common causes: missing secret, entity schema mismatch, rate limit
4. Test with: `test_backend_function('functionName', { ... })`

### File Upload Fails
1. Check file size (max 100MB for drawings, 50MB for documents)
2. Check file type — only PDF, images, Office docs, ZIP allowed
3. If the file has a double extension (e.g., `.pdf.exe`), it will be blocked
4. Try renaming the file to remove special characters

---

## §5. Emergency Contacts

| Role | Contact Method |
|------|---------------|
| Base44 Platform Support | Base44 dashboard → Help / Support |
| App Admin | Your organization's admin user |
| This Runbook Author | Maintained in-app |

---

## §6. Monitoring Setup

### Currently Active
- [x] ErrorBoundary catches React crashes → shows "Something went wrong" page
- [x] Structured logging (`EnterpriseLogger`) → console + local storage for errors
- [x] Performance monitoring (LCP, FID, CLS, long tasks, memory)
- [x] Offline detection → `OfflineIndicator` component
- [x] Health check endpoint → `functions/healthCheck`

### Needs Configuration (Manual Ops)
- [ ] **Sentry DSN**: Set `VITE_SENTRY_DSN` in environment variables for production error tracking
- [ ] **Uptime monitor**: Point UptimeRobot/Pingdom at the `healthCheck` function URL
- [ ] **Log shipping**: Set `VITE_LOG_ENDPOINT` and `VITE_LOG_API_KEY` for centralized logging