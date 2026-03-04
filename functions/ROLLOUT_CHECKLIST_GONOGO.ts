# SteelBuild-Pro Sorting Rollout: Go/No-Go Checklist

**Release**: Default Ascending Sort v1.0  
**Environment**: Staging → Canary → Production  
**Decision Date**: [DATE]  
**Approved By**: [RELEASE MANAGER] | [OPS] | [PM]

---

## Pre-Staging Sign-Off

### Code & Testing
- [ ] All comparison logic implemented (numeric, alphanumeric, text, date)
- [ ] Frontend tests: 15+ unit tests passing
- [ ] Backend tests: 25+ Deno tests passing  
- [ ] Integration tests: RFI, CO, Project, Task, Drawing datasets validated
- [ ] Code review approved (2 reviewers minimum)
- [ ] No critical bugs in staging

### Infrastructure
- [ ] Feature flag system deployed and tested
- [ ] Monitoring dashboards configured (latency, errors, locks)
- [ ] Alerts configured and tested (fire at: error rate >1%, latency p95 >500ms)
- [ ] Database backup automated
- [ ] Rollback runbook tested on staging

**Staging Sign-Off**: _____________________ (Release Manager)  
**Date/Time**: _____________________

---

## Staging Validation (24 hours)

### 10 Manual Acceptance Tests
1. [ ] RFI Hub: numeric codes sort ascending (A-001, A-007, A-042), nulls last
2. [ ] Change Orders: CO numbers sorted numerically (CO-1, CO-2, CO-10), not text
3. [ ] Projects: names sorted A–Z case-insensitive, nulls last
4. [ ] Tasks: start_date sorted chronologically, nulls at bottom
5. [ ] Drawings: drawing numbers split and sorted by numeric prefix
6. [ ] Pagination: keyset cursor works, no gaps or duplicates between pages
7. [ ] Sort Toggle: clicking column re-fetches from server (not client-side re-sort)
8. [ ] Type Mismatch: mixed numeric/text data handled gracefully, logged warning
9. [ ] Null/Empty: all null/empty variants ("", null, whitespace) sort to end
10. [ ] UI Consistency: chevron icons, badges visible, styling matches theme

**Manual Test Results**: _____ / 10 PASS _____ / 10 FAIL

### Performance Validation
- [ ] Query latency p95 < 150ms (50 records)
- [ ] Query latency p95 < 300ms (1000 records)
- [ ] Index usage > 95% (confirmed via EXPLAIN ANALYZE)
- [ ] Load test: >= 100 req/s, 0 failures, p95 < 200ms
- [ ] No type mismatch errors in logs
- [ ] No pagination cursor decode failures

### Regression Testing
- [ ] Pagination: no gaps, duplicates, out-of-order between pages
- [ ] Cursor decode failure: gracefully fallback, not 500 error
- [ ] Sort override: uses server fetch, not client-side re-sort
- [ ] URL injection: invalid sort field rejected with 400
- [ ] Tiebreaker: identical primary values sort by created_at

**Performance Sign-Off**: _____________________ (QA Lead)  
**Date/Time**: _____________________

---

## Database Migration (Dry Run)

### Pre-Migration
- [ ] Production database backed up
- [ ] WAL archiving enabled
- [ ] Estimated lock time < 4 hours (or index creation concurrent method)
- [ ] Maintenance window scheduled: 2-4 AM MST, communicated to support

### Migration Dry Run
- [ ] Create indexes CONCURRENTLY on staging (no lock)
- [ ] Measure creation time: __________ hours
- [ ] Run ANALYZE on all tables
- [ ] Verify all indexes exist: 
  - [ ] idx_rfi_number_numeric
  - [ ] idx_rfi_number_created
  - [ ] idx_co_number_numeric
  - [ ] idx_project_name
  - [ ] idx_task_start_date
  - [ ] idx_drawing_number_numeric

### Rollback Dry Run
- [ ] Drop all indexes (immediate)
- [ ] Verify no table locks
- [ ] Revert feature flag: FEATURE_DEFAULT_SORT_ENABLED=false
- [ ] Confirm app still works (no dependencies on indexes)

**DB Migration Sign-Off**: _____________________ (DBA)  
**Date/Time**: _____________________

---

## Canary Decision

### Metrics Baseline (from staging)
- Query latency p95: __________ ms (target: < 150ms)
- Index usage: __________ % (target: > 95%)
- Type mismatch errors: __________ (target: 0/min)
- Error rate baseline: __________ % (target: < 0.1%)

### Canary Rollout Approval
- [ ] All staging checks passed
- [ ] All regression tests passed
- [ ] Performance within acceptable range
- [ ] Ops team ready (monitoring live, runbook ready)
- [ ] PM/stakeholder sign-off

**Canary Approval**: _____________________ (Release Manager)  
**Approved For**: alpha_steel, beta_fab (pilot tenants)  
**Date/Time**: _____________________

### Canary Monitoring (48 hours)
- [ ] Error rate < 1% (monitor every 15 min)
- [ ] Query latency p95 < 500ms (monitor continuously)
- [ ] No type mismatch errors in logs
- [ ] No pagination cursor failures
- [ ] Database lock wait time < 100ms
- [ ] Pilot tenant feedback collected

**Canary Results**: __________ (PASS / FAIL / ISSUE)  
**Issues Found**: _______________________________________________  
**Remediation**: _______________________________________________

**Canary Sign-Off**: _____________________ (Ops Lead)  
**Date/Time**: _____________________

---

## Production Rollout Approval

### Production Prerequisites
- [ ] Canary completed successfully (no critical issues)
- [ ] All metrics acceptable
- [ ] Pilot user feedback positive
- [ ] Code merged to production branch
- [ ] Feature flag system ready for phased deployment

### Production Rollout Schedule
Phase 1 (Day 1): 10% of tenants (~50 tenants)  
Phase 2 (Day 2): 25% of tenants (~125 tenants)  
Phase 3 (Day 3): 50% of tenants (~250 tenants)  
Phase 4 (Days 4-7): 100% of tenants (~500 tenants)

**Production Approval**: _____________________ (Release Manager)  
**Approved By**: _____________________ (VP Ops)  
**Date/Time**: _____________________

---

## Production Deployment Execution

### Pre-Deployment (T-2 hours)
- [ ] Full database backup taken
- [ ] Monitoring dashboards visible to team
- [ ] Alerts connected (page on-call if threshold breached)
- [ ] Support team notified and on standby
- [ ] Rollback runbook open and reviewed

### Deployment Phase 1 (T+0 to T+4 hours)
- [ ] Index creation started (CONCURRENT method)
- [ ] Monitor index creation progress
- [ ] Indexes created successfully: _____ (Time: _____ hours)
- [ ] ANALYZE completed
- [ ] Deploy API code (v1.0-sort-default)
- [ ] Set feature flag: FEATURE_DEFAULT_SORT_ENABLED=true
- [ ] Set Phase 1 tenants: [list 50 tenants]
- [ ] Smoke test: verify RFI/CO/Project lists show default sort
- [ ] Monitor for 1 hour (error rate, latency, locks)

**Phase 1 Status**: __________ (COMPLETE / ROLLBACK)

### Deployment Phase 2 (T+1 day)
- [ ] Verify Phase 1 metrics (error rate < 1%, latency < 300ms)
- [ ] Gather Phase 1 user feedback
- [ ] Set Phase 2 tenants: [list 125 tenants]
- [ ] Monitor for 4 hours
- [ ] No critical issues → proceed to Phase 3

**Phase 2 Status**: __________ (COMPLETE / HALT)

### Deployment Phase 3 (T+2 days)
- [ ] Verify Phase 1+2 metrics remain acceptable
- [ ] Set Phase 3 tenants: [list 250 tenants]
- [ ] Monitor for 8 hours

**Phase 3 Status**: __________ (COMPLETE / HALT)

### Deployment Phase 4 (T+4-7 days)
- [ ] Verify all phases stable
- [ ] Set Phase 4 tenants: [ALL remaining tenants]
- [ ] Monitor continuously for 7 days

**Phase 4 Status**: __________ (COMPLETE / HALT)

---

## Post-Deployment Validation

### Day 1-7 Metrics
- [ ] Error rate < 0.2% (all phases)
- [ ] Query latency p95 < 300ms
- [ ] Type mismatch errors: 0
- [ ] Pagination cursor failures: 0
- [ ] DB lock wait time < 100ms

### User Feedback
- [ ] Support tickets related to sorting: __________ (target: 0-2)
- [ ] Positive feedback: __________ %
- [ ] Any reported issues: _______________________________________________

### Code Cleanup
- [ ] Remove feature flag (sorting is now default)
- [ ] Archive old sorting logic
- [ ] Update API documentation
- [ ] Close all related JIRA tickets

**Post-Deployment Sign-Off**: _____________________ (Release Manager)  
**Date/Time**: _____________________

---

## Rollback Readiness (If Needed)

### Automatic Rollback Triggers
If ANY of these occur for 5+ consecutive minutes:
- [ ] Error rate > 1%
- [ ] Query latency p95 > 500ms
- [ ] Type mismatch errors > 10/min
- [ ] Database lock wait > 1 second
- [ ] Pagination cursor failures > 5/min

### Rollback Execution (< 5 min)
- [ ] Page on-call engineer
- [ ] Set FEATURE_DEFAULT_SORT_ENABLED=false
- [ ] Restart API servers (rolling restart)
- [ ] Verify metrics return to baseline within 5 min
- [ ] Document issue and root cause

**Rollback Executed**: _____ (Yes / No)  
**Root Cause**: _______________________________________________  
**Time to Rollback**: _____ min  
**Post-Mortem Scheduled**: _____ (date/time)

---

## Final Approval Summary

| Decision | Status | Owner | Date |
|----------|--------|-------|------|
| Staging Sign-Off | ✓ GO / ❌ NO-GO | __________ | __________ |
| Performance Validated | ✓ GO / ❌ NO-GO | __________ | __________ |
| DB Migration Tested | ✓ GO / ❌ NO-GO | __________ | __________ |
| Canary Approval | ✓ GO / ❌ NO-GO | __________ | __________ |
| Canary Results | ✓ PASS / ❌ FAIL | __________ | __________ |
| Production Approval | ✓ GO / ❌ NO-GO | __________ | __________ |
| Deployment Complete | ✓ DONE / 🟡 IN PROGRESS | __________ | __________ |
| Post-Deployment Validated | ✓ PASS / ❌ FAIL | __________ | __________ |

---

## Release Sign-Off

**Release Manager**: _____________________ **Date**: _____  
**Operations Lead**: _____________________ **Date**: _____  
**Product Manager**: _____________________ **Date**: _____  
**VP Engineering**: _____________________ **Date**: _____

---

## Appendix: Quick Reference

### Critical Metrics
```
✓ GO if:
  - Error rate < 1% (production)
  - Latency p95 < 300ms
  - Index usage > 95%
  - Type mismatch errors = 0
  - All 10 acceptance tests pass

❌ NO-GO if:
  - Any acceptance test fails
  - Latency p95 > 500ms
  - Type mismatch errors > 10/min
  - Pagination cursor failures > 5/min
  - Rollback dry-run fails
```

### Rollback Command
```bash
# Disable feature flag
export FEATURE_DEFAULT_SORT_ENABLED=false

# Restart API (rolling)
kubectl rollout restart deployment/steelbuild-api

# Verify (wait 2 min)
curl https://api.steelbuild.app/health
```

### Escalation
- Latency/Error Rate: Page Ops Lead (+1-555-0100)
- Database Issues: Page DBA (+1-555-0101)
- General: Release Manager (+1-555-0102)