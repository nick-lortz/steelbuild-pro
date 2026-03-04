# SteelBuild-Pro Sorting Rollout Plan

**Release**: Default Ascending Sort v1.0  
**Timeline**: Phased rollout (staging → canary → production)  
**Risk Level**: Medium (data ordering affects all list views)  
**Rollback Window**: 24 hours

---

## Phase 1: Staging Validation (24 hours)

### Pre-Deployment Checklist

- [ ] All code merged to `main` and built in staging environment
- [ ] DB migrations staged (indexes created, no locks running)
- [ ] Feature flag system ready (`FEATURE_DEFAULT_SORT` env var per tenant)
- [ ] Monitoring alerts configured (query latency, lock wait time, error rates)
- [ ] Rollback runbook reviewed and tested
- [ ] Comms: stakeholders notified of 2-hour validation window

---

## Acceptance Testing: 10 Quick Manual Checks

**Time Estimate**: 30 minutes  
**Environment**: Staging (realistic data, >= 1000 records per list)  
**Tester**: QA + PM (1 each)

### Check 1: RFI Hub Default Sort
```
✓ Load RFI Hub list
✓ Verify RFI numbers sorted ascending (A-001, A-007, A-042...)
✓ Verify null/empty rfi_numbers at bottom
✓ Confirm chevron icon visible in header
✓ Verify accessibility label: aria-sort="ascending"
```
**Pass Criteria**: Records in correct order, icon visible, nulls last

### Check 2: Change Orders Code Sorting
```
✓ Load Change Orders list
✓ Sort by CO number (default)
✓ Verify numeric order (CO-1, CO-2, CO-10, not CO-1, CO-10, CO-2)
✓ Verify whitespace/punctuation normalized (CO-001, CO - 001, -CO-001 all treated same)
```
**Pass Criteria**: Correct numeric prefix extraction and sorting

### Check 3: Projects Name Alphabetical
```
✓ Load Projects list
✓ Verify names sorted A–Z (case-insensitive)
✓ Test with mixed case (apple, Banana, Zebra → apple, Banana, Zebra)
✓ Verify nulls at bottom
```
**Pass Criteria**: Case-insensitive alpha sort, nulls last

### Check 4: Tasks Date Sort
```
✓ Load Tasks list
✓ Sort by start_date (default)
✓ Verify chronological order (earliest to latest)
✓ Verify NULL start_date tasks at bottom
✓ Confirm created_at tiebreaker works (two tasks, same start_date, sort by created_date)
```
**Pass Criteria**: Dates in order, nulls last, tiebreaker confirmed

### Check 5: Drawings Code Numeric Parsing
```
✓ Load Drawings list
✓ Verify drawing numbers sorted by numeric prefix (S-007, S-020, S-042, S-101)
✓ Test mixed prefixes (A-001, B-002, A-003 → A-001, A-003, B-002)
```
**Pass Criteria**: Numeric-first sorting, then alphabetic suffix

### Check 6: Pagination Integrity
```
✓ Load RFI list (limit 50)
✓ Verify page 1 has correct sort order
✓ Click "next" → verify page 2 is continuous (no gaps, no duplicates)
✓ Click "prev" → verify returns to page 1 with same data
✓ Verify cursor-based pagination (not offset-based)
```
**Pass Criteria**: No gaps, duplicates, or out-of-order records between pages

### Check 7: Client-Side Override (Sort Toggle)
```
✓ Load any list with sort toggle control
✓ Click toggle, select different sort column
✓ Verify data re-fetches from server (not client-side re-sort)
✓ Verify new column shows ascending icon
✓ Verify descending sort reverses order (nulls still last)
```
**Pass Criteria**: Server fetch occurs, new sort applied, nulls always last

### Check 8: Type Mismatch Handling
```
✓ Create test data: one "007", one "abc" in same field
✓ Sort as numeric
✓ Verify no crash, warning in logs: "Type mismatch: expected numeric"
✓ Verify fallback comparator used, data still in predictable order
```
**Pass Criteria**: Graceful degradation, no exceptions, logged warning

### Check 9: Empty/Null Edge Cases
```
✓ Create test data: mix of null, "", "  " (whitespace), and valid values
✓ Sort by that field
✓ Verify order: [valid values sorted], then [null, "", "  "]
✓ Verify tiebreaker works: two nulls → sorted by created_at
```
**Pass Criteria**: Nulls/empty at end, tiebreaker applied

### Check 10: UI Consistency
```
✓ Table header: chevron icon present and styled
✓ Card view: "Sorted A→Z" badge present
✓ Kanban: "Sorted by Start Date" badge present
✓ All icons match theme (gray/dark, not jarring)
✓ Hover states visible, tooltips functional
```
**Pass Criteria**: All views show indicator, styling consistent

---

## Performance Validation

### Index Verification (Before Migration)

```sql
-- Check if indexes exist
SELECT indexname, indexdef FROM pg_indexes 
WHERE tablename IN ('RFI', 'ChangeOrder', 'Project', 'Task', 'Drawing');

-- Expected indexes:
-- idx_rfi_number_numeric (on RFI)
-- idx_co_number_numeric (on ChangeOrder)
-- idx_project_name (on Project)
-- idx_task_start_date (on Task)
-- idx_drawing_number_numeric (on Drawing)
```

### Query Performance Baseline

**Before Migration**:
```bash
# Run on staging DB (1000+ records per table)
psql -h staging-db -U admin -d steelbuild -c \
"EXPLAIN ANALYZE SELECT * FROM RFI ORDER BY rfi_number ASC LIMIT 50;"
```

**Expected Output**:
```
Seq Scan on RFI (cost=0.00..50.00 rows=50) ✗ (sequential scan = bad)
Index Scan using idx_rfi_number_numeric (cost=0.10..10.00 rows=50) ✓ (index used = good)
```

**Acceptable Response Times**:
- Sorted list fetch (50 records): < 100ms
- Sorted list fetch (1000 records): < 300ms
- Sort toggle (re-fetch with different column): < 150ms
- Pagination (cursor-based, next/prev): < 50ms

### Monitoring Setup (Prometheus/CloudWatch)

```yaml
Metrics to track (during staging):
- query_latency_p95: < 150ms (list fetch with sort)
- pagination_cursor_decode_latency: < 5ms
- type_mismatch_errors: 0 (should not occur)
- index_usage_percent: > 95% (confirms indexes used)
- db_lock_wait_time: < 100ms (during migration)
```

### Load Test (Staging)

```bash
# Simulate 100 concurrent list fetches with sort
# Expected: all complete < 200ms, no 5xx errors

ab -n 1000 -c 100 \
  "https://staging.steelbuild.app/api/rfis?sort=rfi_number&sort_direction=asc&limit=50"

# Results:
# Requests per second: >= 100
# Failed requests: 0
# 95th percentile response time: < 200ms
```

---

## Regression Testing

### Pagination Regression Tests

**Scenario 1: Keyset Cursor Integrity**
```
1. Fetch page 1 (limit 50): records 1-50, cursor = "eyJyZmlfbnVtYmVyIjogIkEtMDUwIiwgImNyZWF0ZWRfZGF0ZSI6IjIwMjYtMDItMDEifQ=="
2. Fetch page 2 using cursor: verify records 51-100
3. Verify record 50 NOT in page 2
4. Verify record 51 in page 2
```
**Pass Criteria**: No gaps, no duplicates, continuous sequence

**Scenario 2: Cursor Decode Failure**
```
1. Manually corrupt cursor: "eyJyZmlfbnVtYmVyIjog...XXX"
2. Fetch with corrupted cursor
3. Verify graceful fallback (return to page 1, log warning)
```
**Pass Criteria**: Error handled, no 500, user redirected

**Scenario 3: Sort Direction Change Mid-Pagination**
```
1. Fetch page 1 ascending (limit 25): A-001...A-025
2. Click "Descending" button
3. Re-fetch page 1 with cursor from ascending
4. Verify correct descending order is returned
```
**Pass Criteria**: Direction changes applied, cursor logic correct

### Client-Side Override Regression Tests

**Scenario 1: Override Doesn't Mutate Server Sort**
```
1. Load RFI list (default: rfi_number ascending)
2. Client-side: click sort toggle → select "created_date"
3. Verify server fetches with sort=created_date
4. Verify backend returns created_date-sorted data
5. Refresh page → verify default sort (rfi_number) restored
```
**Pass Criteria**: No client-side re-sort, server truth maintained

**Scenario 2: Type Override with Mixed-Type Data**
```
1. Load Projects list (default: name)
2. Override to sort by contract_value (numeric)
3. Verify numeric sort applied (not text sort)
4. Verify nulls at bottom
```
**Pass Criteria**: Type detection correct, nulls last

**Scenario 3: URL Parameter Injection**
```
1. Manually append ?sort=foo to URL (invalid field)
2. Verify backend rejects (400 Bad Request)
3. Verify logging: "Unsupported sort field: foo"
```
**Pass Criteria**: Validation blocks injection, error logged

---

## Feature Flag Plan (Phased Rollout)

### Tenant Configuration

```javascript
// Environment variable per environment
FEATURE_DEFAULT_SORT_ENABLED=true|false (default: false in staging, true in canary)
FEATURE_DEFAULT_SORT_TENANTS=["tenant_a", "tenant_b"] // whitelist during canary

// In API:
const isEnabled = process.env.FEATURE_DEFAULT_SORT_ENABLED === 'true';
const enabledTenants = process.env.FEATURE_DEFAULT_SORT_TENANTS?.split(',') || [];

if (isEnabled && (enabledTenants.length === 0 || enabledTenants.includes(user.tenant_id))) {
  // Apply default sort
  const sorted = sortBy(items, sortField, fieldType, descending);
} else {
  // Fall back to insertion order or old logic
  return items;
}
```

### Rollout Phases

**Phase 1: Staging** (24 hours)
- Env: `FEATURE_DEFAULT_SORT_ENABLED=true`
- All tenants affected
- Full acceptance testing

**Phase 2: Canary** (48 hours)
- Env: `FEATURE_DEFAULT_SORT_ENABLED=true`
- Tenants: `["alpha_steel", "beta_fab"]` (2 pilot tenants)
- Monitor error rates, response times
- Gather feedback from pilot users

**Phase 3: Production** (phased over 7 days)
- Day 1: 10% of tenants
- Day 2: 25% of tenants
- Day 3: 50% of tenants
- Day 4-7: 100% of tenants
- Kill switch available at each step

### Monitoring During Rollout

```yaml
Alerts (trigger rollback if any fires):
- Error rate (5xx) > 1% for 5 min
- Query latency p95 > 500ms
- Database lock wait time > 1 second
- Type mismatch errors > 10/min
- Pagination cursor failures > 5/min
```

---

## Database Migration Tasks

### Pre-Migration Checklist

- [ ] Backup production database (full backup + WAL archive enabled)
- [ ] Identify downtime window: 2-4 AM MST (low traffic)
- [ ] Test migration on staging (run twice, measure time)
- [ ] Verify rollback plan: restore from backup, validate data
- [ ] Notify ops team, on-call engineer, PM

### Migration Script: Index Creation

```sql
-- Phase 1: Create indexes CONCURRENTLY (no table locks)
CREATE INDEX CONCURRENTLY idx_rfi_number_numeric 
  ON RFI(CAST(regexp_substr(rfi_number, '\d+') AS INT));

CREATE INDEX CONCURRENTLY idx_rfi_number_created 
  ON RFI(CAST(regexp_substr(rfi_number, '\d+') AS INT), created_date);

CREATE INDEX CONCURRENTLY idx_co_number_numeric 
  ON ChangeOrder(CAST(regexp_substr(co_number, '\d+') AS INT));

CREATE INDEX CONCURRENTLY idx_project_name 
  ON Project(LOWER(name) COLLATE "en_US.utf8");

CREATE INDEX CONCURRENTLY idx_task_start_date 
  ON Task(start_date ASC NULLS LAST, id);

CREATE INDEX CONCURRENTLY idx_drawing_number_numeric 
  ON Drawing(CAST(regexp_substr(drawing_number, '\d+') AS INT), sheet_sequence);

-- Phase 2: Analyze to update stats
ANALYZE RFI;
ANALYZE ChangeOrder;
ANALYZE Project;
ANALYZE Task;
ANALYZE Drawing;
```

### Lock Strategy

**Using CONCURRENT indexes (preferred)**:
- No table lock during creation
- Build happens in background
- Query performance not affected
- Slightly slower index creation (hours vs minutes)
- **Estimated time**: 2-4 hours per index

**Downtime approach (faster, requires maintenance window)**:
- Full table lock for duration
- Faster creation (30 min total)
- Application downtime required
- **Only if prod must deploy within 1 hour**

### Rollback: Revert Indexes

```sql
-- If migration fails, drop indexes (immediate, no lock)
DROP INDEX CONCURRENTLY idx_rfi_number_numeric;
DROP INDEX CONCURRENTLY idx_rfi_number_created;
DROP INDEX CONCURRENTLY idx_co_number_numeric;
DROP INDEX CONCURRENTLY idx_project_name;
DROP INDEX CONCURRENTLY idx_task_start_date;
DROP INDEX CONCURRENTLY idx_drawing_number_numeric;

-- Revert feature flag
FEATURE_DEFAULT_SORT_ENABLED=false
```

### Estimated Time Breakdown

| Task | Staging | Canary | Prod |
|------|---------|--------|------|
| Index creation | 2-4h | 2-4h | 2-4h (off-peak) |
| Validation tests | 0.5h | 1h | 1h (ongoing) |
| Monitoring setup | 1h | 0 | 0 |
| **Total** | 3.5-5.5h | 3-5h | 3-5h + 7 days canary |

---

## Rollback Steps (If Issues Detected)

### Automatic Rollback Triggers

```
IF any of these occur for 5+ minutes:
  - Error rate > 1%
  - Query latency p95 > 500ms
  - DB lock wait > 1s
  - Type mismatch errors > 10/min
THEN:
  1. Page on-call engineer
  2. Set FEATURE_DEFAULT_SORT_ENABLED=false
  3. Revert code deployment (last known good)
  4. Monitor for 15 min (verify metrics return to baseline)
  5. Post-mortem within 2 hours
```

### Manual Rollback Procedure (< 5 min)

**Step 1: Disable Feature Flag**
```bash
# Update environment variable in deployment system
export FEATURE_DEFAULT_SORT_ENABLED=false

# Restart API servers (rolling restart)
kubectl rollout restart deployment/steelbuild-api
```

**Step 2: Verify Rollback**
```bash
# Check error rate
curl https://monitoring.steelbuild.app/api/errors?window=5m
# Expected: < 0.1%

# Check query latency
curl https://monitoring.steelbuild.app/api/latency?percentile=95
# Expected: < 300ms

# Check logs for type mismatches
grep "Type mismatch" /var/log/steelbuild/app.log
# Expected: 0 errors
```

**Step 3: Revert Database Indexes (if root cause)**
```sql
-- Drop indexes if causing lock contention
DROP INDEX CONCURRENTLY idx_rfi_number_numeric;
DROP INDEX CONCURRENTLY idx_co_number_numeric;
-- ... etc
```

**Step 4: Notify Stakeholders**
```
Subject: ROLLBACK: Default Sorting Feature [Prod]
Impact: RFI/CO/Project/Task lists now showing insertion order (no default sort)
ETA: Full functionality restored within 24 hours
Root Cause: [performance issue | type mismatch | pagination bug]
```

---

## Go/No-Go Criteria Summary

### ✅ GO Decision (All must pass)

- [ ] **Test Coverage**: All 10 manual checks pass on staging
- [ ] **Performance**: 
  - Query latency p95 < 150ms
  - Index usage > 95%
  - Load test: >= 100 req/s, 0 failures
- [ ] **Regression**: Pagination, overrides, null handling all pass
- [ ] **Code Review**: All comparison logic + UI changes approved
- [ ] **Feature Flag**: System tested and operational
- [ ] **DB Migration**: Dry-run on staging successful, rollback tested
- [ ] **Monitoring**: Dashboards live, alerts configured, thresholds validated
- [ ] **Communication**: Stakeholders notified, support team briefed
- [ ] **Runbook**: Rollback plan reviewed and signed off by Ops

### ❌ NO-GO Decision (Any failure requires fix)

- [ ] Any acceptance test fails (redo on staging)
- [ ] Query latency p95 > 300ms (investigate index usage)
- [ ] Type mismatch errors in logs (add type coercion)
- [ ] Pagination cursor fails on any test (fix keyset logic)
- [ ] Load test < 50 req/s or > 1% failures (scale test first)
- [ ] Rollback dry-run fails (update runbook, retry)
- [ ] Any security concern flagged in code review (address before deploy)

---

## Deployment Checklist (Phased)

### Staging → Production

**T-1 Day Before Canary**
- [ ] Final code merge approved
- [ ] All tests passing (unit, integration, regression)
- [ ] Feature flag system ready
- [ ] Monitoring alerts deployed

**T-0 Canary Deployment (2 AM MST)**
- [ ] Create database backup
- [ ] Deploy indexes (CONCURRENT method)
- [ ] Wait 30 min for index creation
- [ ] Deploy API code (v1.0-sort-default)
- [ ] Set feature flag: `FEATURE_DEFAULT_SORT_ENABLED=true`
- [ ] Set tenants: `FEATURE_DEFAULT_SORT_TENANTS=["alpha_steel", "beta_fab"]`
- [ ] Monitor for 1 hour (check error rates, latency, logs)
- [ ] If any alert fires → execute rollback
- [ ] Gather pilot feedback (24-48 hours)

**T+2 Days Production Rollout**
- [ ] Code review final approval
- [ ] Feature flag ready: phased tenant rollout schedule
- [ ] 10% rollout: Day 1 (10 tenants)
- [ ] Monitor 4 hours, then 25% rollout: Day 2 (25 tenants)
- [ ] Monitor 8 hours, then 50% rollout: Day 3 (50 tenants)
- [ ] Monitor 24 hours, then 100% rollout: Day 4+ (all tenants)
- [ ] Full production validation by Day 7

**Post-Deployment**
- [ ] Remove feature flag (code becomes default)
- [ ] Update API docs with sort parameters
- [ ] Archive old sorting logic (keep 30 days for reference)
- [ ] Close related JIRA tickets
- [ ] Schedule post-mortem (if any incidents)

---

## Communication Timeline

| When | Audience | Message |
|------|----------|---------|
| T-3 Days | Stakeholders | Rollout plan review, timeline, risks |
| T-1 Day | Support, PM | Staging complete, feature flag working, standby for canary |
| T-0 (2 AM) | Ops, On-call | Canary deploy starting, monitor dashboard |
| T+30 min | Team | Canary indexes created, API running, monitoring active |
| T+2 Days | Stakeholders | Canary results (✓ no issues), prod rollout approved |
| T+4 Days | Users | Feature released (default sort now active) |
| T+7 Days | All | Rollout complete, soliciting feedback, post-mortem (if needed) |

---

## Success Criteria (Post-Deployment)

- [ ] All lists sort correctly by default (RFI, CO, Project, Task, Drawing)
- [ ] Query latency p95 < 150ms (baseline or better)
- [ ] 0 type mismatch errors in production logs
- [ ] Pagination works seamlessly (0 cursor decode failures)
- [ ] User feedback: "Sorting is intuitive and fast"
- [ ] No rollback required
- [ ] Support ticket volume unchanged