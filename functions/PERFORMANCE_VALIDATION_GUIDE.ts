# Performance Validation & Index Verification Guide

**Purpose**: Confirm indexes are used, query performance is acceptable, and no regressions occur.

---

## Index Creation & Verification

### Step 1: Verify Indexes Exist (Pre/Post-Migration)

```bash
# Connect to staging/prod database
psql -h $DB_HOST -U $DB_USER -d steelbuild
```

```sql
-- List all relevant indexes
SELECT 
  schemaname, 
  tablename, 
  indexname, 
  indexdef
FROM pg_indexes
WHERE tablename IN ('RFI', 'ChangeOrder', 'Project', 'Task', 'Drawing')
ORDER BY tablename, indexname;
```

**Expected Indexes** (should show all):
```
RFI             | idx_rfi_number_numeric     | ... ASC ...
RFI             | idx_rfi_number_created     | ... ASC, created_date ASC ...
ChangeOrder     | idx_co_number_numeric      | ... ASC ...
Project         | idx_project_name           | ... COLLATE "en_US.utf8" ...
Task            | idx_task_start_date        | ... NULLS LAST ...
Drawing         | idx_drawing_number_numeric | ... ASC, sheet_sequence ...
```

**Pass Criteria**: All 6 indexes exist with correct column definitions.

---

## Query Performance Baseline

### Step 2: Capture Pre-Migration Baseline

**Before** creating indexes, run these queries and record results:

```bash
# Test 1: RFI list (50 records)
psql -h $DB_HOST -U $DB_USER -d steelbuild -c \
"EXPLAIN ANALYZE SELECT * FROM RFI 
 WHERE (CAST(regexp_substr(rfi_number, '\d+') AS INT) > 0 OR true)
 ORDER BY CAST(regexp_substr(rfi_number, '\d+') AS INT) ASC, created_date ASC
 LIMIT 51;" > /tmp/rfi_baseline.txt

# Test 2: Change Order list
psql -h $DB_HOST -U $DB_USER -d steelbuild -c \
"EXPLAIN ANALYZE SELECT * FROM ChangeOrder 
 ORDER BY CAST(regexp_substr(co_number, '\d+') AS INT) ASC
 LIMIT 51;" > /tmp/co_baseline.txt

# Test 3: Project list (1000 records)
psql -h $DB_HOST -U $DB_USER -d steelbuild -c \
"EXPLAIN ANALYZE SELECT * FROM Project 
 WHERE LOWER(name) COLLATE 'en_US.utf8' > ''
 ORDER BY LOWER(name) COLLATE 'en_US.utf8' ASC, created_date ASC
 LIMIT 51;" > /tmp/project_baseline.txt

# Test 4: Task list with date sort
psql -h $DB_HOST -U $DB_USER -d steelbuild -c \
"EXPLAIN ANALYZE SELECT * FROM Task 
 ORDER BY start_date ASC NULLS LAST, id ASC
 LIMIT 51;" > /tmp/task_baseline.txt

# Test 5: Drawing list
psql -h $DB_HOST -U $DB_USER -d steelbuild -c \
"EXPLAIN ANALYZE SELECT * FROM Drawing 
 ORDER BY CAST(regexp_substr(drawing_number, '\d+') AS INT) ASC, sheet_sequence ASC
 LIMIT 51;" > /tmp/drawing_baseline.txt
```

**Record Baseline Metrics** (from EXPLAIN output):
| Query | Execution Plan | Cost | Rows | Time (ms) |
|-------|---|---|---|---|
| RFI (50) | Seq Scan or Index Scan | _____ | _____ | _____ |
| CO (50) | Seq Scan or Index Scan | _____ | _____ | _____ |
| Project (1000) | Seq Scan or Index Scan | _____ | _____ | _____ |
| Task (1000) | Seq Scan or Index Scan | _____ | _____ | _____ |
| Drawing (1000) | Seq Scan or Index Scan | _____ | _____ | _____ |

---

### Step 3: Post-Migration Index Verification

**After** index creation, re-run same queries and compare:

```bash
# Compare execution plans (all should use Index Scan, not Seq Scan)
diff /tmp/rfi_baseline.txt <(psql -h $DB_HOST -U $DB_USER -d steelbuild -c "EXPLAIN ANALYZE ...")
```

**Expected Changes**:
- BEFORE: `Seq Scan on RFI (cost=X..Y rows=Z)`  ❌ Sequential scan (slow)
- AFTER: `Index Scan using idx_rfi_number_numeric (cost=X..Y rows=Z)`  ✓ Index used (fast)

**Index Usage Confirmation** (SHOW in EXPLAIN output):
```
✓ Index Scan using idx_rfi_number_numeric
✓ Index Scan using idx_co_number_numeric
✓ Index Scan using idx_project_name
✓ Index Scan using idx_task_start_date
✓ Index Scan using idx_drawing_number_numeric
```

**Pass Criteria**: All 5 queries show "Index Scan" (not "Seq Scan").

---

## Query Performance Targets

### Acceptable Response Times

| Scenario | Target | Threshold (Alert if > ) |
|----------|--------|--------------------------|
| Sorted list fetch (50 records) | < 100ms | 200ms |
| Sorted list fetch (1000 records) | < 300ms | 500ms |
| Sort toggle (re-fetch different column) | < 150ms | 300ms |
| Pagination (cursor-based, next/prev) | < 50ms | 100ms |
| Type mismatch fallback | < 200ms | 400ms |

### Load Test Simulation

**Tool**: Apache Bench (ab) or Locust

```bash
# 1000 concurrent requests over 1 minute
# Simulates peak load (worst-case scenario)

ab -n 1000 -c 100 -t 60 \
  "https://staging.steelbuild.app/api/rfis?sort=rfi_number&sort_direction=asc&limit=50"

# Expected Results:
# Requests per second: >= 100
# Failed requests: 0
# 95th percentile response time: < 200ms
# 99th percentile response time: < 500ms
# Slowest request: < 1000ms
```

**Load Test Results**:
```
Requests per second:  __________ (target: >= 100)
Failed requests:      __________ (target: 0)
95th percentile:      __________ ms (target: < 200ms)
99th percentile:      __________ ms (target: < 500ms)
Slowest request:      __________ ms (target: < 1000ms)
```

**Pass Criteria**: All metrics meet targets.

---

## Real-Time Monitoring (Production)

### Prometheus Metrics Setup

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'steelbuild-api'
    static_configs:
      - targets: ['localhost:9090']

# Alert Rules
groups:
  - name: sorting_alerts
    rules:
      - alert: SortQueryLatencyHigh
        expr: http_request_duration_seconds{handler="/api/rfis"} > 0.3
        for: 5m
        annotations:
          summary: "Sort query latency > 300ms"
          
      - alert: IndexNotUsed
        expr: postgres_query_plan_type{index_used="false"} > 0
        for: 5m
        annotations:
          summary: "Sequential scan detected (index not used)"
          
      - alert: TypeMismatchErrors
        expr: rate(sort_type_mismatch_total[1m]) > 0.1
        for: 5m
        annotations:
          summary: "Type mismatch errors > 0.1/sec"
          
      - alert: DatabaseLockWait
        expr: postgres_lock_wait_seconds > 1
        for: 1m
        annotations:
          summary: "DB lock wait time > 1 second"
```

### Grafana Dashboard

**Create dashboard with these panels**:

1. **Query Latency (p95)**
   ```
   histogram_quantile(0.95, http_request_duration_seconds{handler="/api/rfis"})
   ```
   - Target: < 150ms
   - Alert threshold: > 300ms

2. **Index Usage %**
   ```
   (postgres_index_scans / (postgres_index_scans + postgres_sequential_scans)) * 100
   ```
   - Target: > 95%
   - Alert threshold: < 90%

3. **Type Mismatch Errors/min**
   ```
   rate(sort_type_mismatch_total[1m])
   ```
   - Target: 0
   - Alert threshold: > 0.1

4. **Pagination Cursor Failures/min**
   ```
   rate(pagination_cursor_decode_failures[1m])
   ```
   - Target: 0
   - Alert threshold: > 0.05

5. **Database Lock Wait Time**
   ```
   postgres_lock_wait_seconds
   ```
   - Target: < 100ms
   - Alert threshold: > 1000ms

---

## Stress Testing (Pre-Production)

### Scenario 1: Large Dataset Sort (Scale Test)

```sql
-- Create 100k test records in RFI
INSERT INTO RFI (project_id, rfi_number, title, created_date)
SELECT 
  'proj-1',
  'A-' || LPAD(CAST(seq AS VARCHAR), 6, '0'),
  'Test RFI',
  NOW() - INTERVAL '1 day' * (seq % 365)
FROM generate_series(1, 100000) AS seq;

-- Measure query time
EXPLAIN ANALYZE SELECT * FROM RFI 
ORDER BY CAST(regexp_substr(rfi_number, '\d+') AS INT) ASC
LIMIT 50;
```

**Expected**: Index Scan, < 150ms execution time

### Scenario 2: Cursor Pagination Under Load

```bash
# Simulate pagination through 10k records
for i in {1..200}; do
  curl -s "https://staging.steelbuild.app/api/rfis?limit=50&cursor=$CURSOR" \
    | jq '.pagination.cursor' | read CURSOR
  echo "Page $i fetched"
done
```

**Expected**: No cursor decode failures, consistent latency (< 100ms per page)

### Scenario 3: Mixed Workload (Read + Write)

```bash
# Concurrent reads (sorting) + writes (new RFIs)
locust -f load_test.py --users 200 --spawn-rate 10 -t 5m
```

**Expected**: Reads maintain < 300ms latency even with concurrent writes

---

## Lock Contention Monitoring (During Migration)

### Real-Time Lock Monitoring

```bash
# Monitor database locks during index creation
watch -n 1 'psql -c "SELECT * FROM pg_locks ORDER BY locktype, relation;"'
```

```sql
-- View active locks
SELECT pid, usename, application_name, state, 
       query, wait_event_type, wait_event
FROM pg_stat_activity
WHERE wait_event_type = 'Lock'
ORDER BY query_start DESC;
```

**Expected** (during CONCURRENT index creation):
- No TABLE locks (only INDEX locks)
- Lock wait time < 100ms
- Active queries continue without blocking

**Expected** (after index creation complete):
- No locks
- Normal query latency restored

---

## Post-Deployment Validation Script

**Run this daily for 7 days post-deploy**:

```bash
#!/bin/bash
# check_sort_health.sh

DATE=$(date +%Y-%m-%d)
LOG_FILE="/var/log/steelbuild/sort_health_$DATE.log"

echo "=== Sort Health Check: $DATE ===" >> $LOG_FILE

# 1. Verify indexes exist
psql -c "SELECT count(*) as index_count FROM pg_indexes 
         WHERE tablename IN ('RFI', 'ChangeOrder', 'Project', 'Task', 'Drawing');" >> $LOG_FILE

# 2. Query latency (last 100 requests)
psql -c "SELECT 
  handler, 
  round(avg(duration)::numeric, 2) as avg_ms,
  round(percentile_cont(0.95) within group (order by duration)::numeric, 2) as p95_ms
FROM http_requests 
WHERE timestamp > now() - interval '1 hour'
  AND handler IN ('/api/rfis', '/api/change-orders', '/api/projects', '/api/tasks', '/api/drawings')
GROUP BY handler;" >> $LOG_FILE

# 3. Type mismatch errors (last 1 hour)
grep "Type mismatch" /var/log/steelbuild/app.log | wc -l >> $LOG_FILE

# 4. Pagination cursor failures (last 1 hour)
grep "cursor_decode_failures" /var/log/steelbuild/app.log | wc -l >> $LOG_FILE

# 5. Alert if any threshold exceeded
LATENCY=$(psql -tc "SELECT max(duration) FROM http_requests WHERE timestamp > now() - interval '1 min';")
if [ $(echo "$LATENCY > 0.5" | bc) -eq 1 ]; then
  echo "⚠️  ALERT: Latency spike detected ($LATENCY s)" >> $LOG_FILE
  # Page on-call
fi

echo "Health check complete." >> $LOG_FILE
echo ""
```

**Run via cron**:
```bash
# Every 6 hours
0 */6 * * * /usr/local/bin/check_sort_health.sh
```

---

## Rollback Decision Criteria

### Auto-Rollback Triggers
If ANY of these for 5+ consecutive minutes:
- ❌ Error rate > 1%
- ❌ Query latency p95 > 500ms
- ❌ Type mismatch errors > 10/min
- ❌ Database lock wait > 1 second
- ❌ Pagination cursor failures > 5/min

### Manual Rollback Triggers
- ❌ Support tickets spike > 3x baseline
- ❌ User feedback: "sorting is broken" (> 5 reports)
- ❌ Customer escalation

---

## Sign-Off

**Performance Validation Completed By**: _____________________ 

**Date**: _____________________ 

**All Checks Passed**: ☐ YES ☐ NO

**Notes**: _________________________________________________________________