# SteelBuild Pro - Disaster Recovery

**Platform:** Base44  
**RTO (Recovery Time Objective):** 4 hours  
**RPO (Recovery Point Objective):** 24 hours

---

## Backup Strategy

### Automated Backups (Base44 Platform)

**Database:**
- **Frequency:** Daily (automatic)
- **Retention:** 30 days
- **Storage:** AWS S3 (encrypted)
- **Scope:** All entities

**File Storage:**
- **Frequency:** Continuous (S3 versioning)
- **Retention:** 90 days
- **Scope:** All uploaded files

**Backend Functions:**
- **Frequency:** On every deployment (Git)
- **Retention:** Unlimited (Git)

---

## Disaster Scenarios

### Scenario 1: Data Corruption

**Recovery Steps:**
1. Identify scope (which entities, time range)
2. Stop further damage (disable automations)
3. Restore from backup (Base44 Dashboard → Backups)
4. Verify data integrity (`checkDataIntegrity`)
5. Resume operations

**RTO:** 2-4 hours  
**RPO:** 24 hours

---

### Scenario 2: Accidental Deletion

**Recovery Steps:**
1. Check if soft-delete exists (un-archive)
2. If hard-deleted, restore from backup
3. Train users on delete confirmation

**RTO:** 1-2 hours  
**RPO:** 24 hours

---

### Scenario 3: Security Breach

**Recovery Steps:**
1. Disable all user accounts
2. Revoke OAuth tokens
3. Change all API keys
4. Investigate (review audit logs)
5. Patch vulnerability
6. Restore from clean backup
7. Reset all passwords

**RTO:** 6-24 hours  
**RPO:** 24-48 hours

---

### Scenario 4: Application Bug

**Recovery Steps:**
1. Immediate rollback (Base44 Dashboard)
2. OR create hotfix branch
3. Data repair if needed
4. Post-mortem documentation

**RTO:** < 1 hour (rollback)  
**RPO:** 0 (code rollback)

---

## Database Restore

### Via Base44 Dashboard
1. Navigate to Backups
2. Select backup date/time
3. Choose entities to restore
4. Confirm
5. Wait for completion (5-30 minutes)

---

## Business Continuity

### Critical Operations
**Must Remain Functional:**
- Project access (read-only minimum)
- RFI viewing
- Schedule viewing
- Document access

---

## Testing & Drills

### Quarterly Disaster Recovery Drill

**Steps:**
1. Create test project with sample data
2. Backup manually
3. Simulate disaster (delete)
4. Restore from backup
5. Verify accuracy
6. Document time taken

---

## Escalation Contacts

**Internal:** IT Lead/Admin  
**External:** Base44 Support (support@base44.com)