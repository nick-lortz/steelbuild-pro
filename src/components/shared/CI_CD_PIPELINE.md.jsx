# SteelBuild Pro - CI/CD Pipeline

**Platform:** Base44 Auto-Deploy  
**Version Control:** Git

---

## Pipeline Stages

### 1. Source Control

**Branch Strategy:**
```
main          → Production
staging       → Staging/QA
develop       → Development
feature/*     → Feature branches (not auto-deployed)
hotfix/*      → Urgent fixes
```

---

### 2. Build Stage

**Automatic Steps (Base44):**
1. Install dependencies
2. Lint code
3. Build React app
4. Deploy backend functions
5. Update entity schemas

**Build Time:** 2-5 minutes

---

### 3. Deployment

**Zero-Downtime Deployment:**
- New version deployed alongside old
- Traffic switched after health check
- Old version remains for rollback

**Deployment Time:** < 2 minutes

---

## Environment Configuration

### Development
**URL:** `https://dev-steelbuild.base44.app`  
**Auto-Deploy:** Yes (on push to `develop`)  
**Logs:** Verbose (`VITE_LOG_LEVEL=debug`)

### Staging
**URL:** `https://staging-steelbuild.base44.app`  
**Auto-Deploy:** Yes (on push to `staging`)  
**Logs:** Info (`VITE_LOG_LEVEL=info`)

### Production
**URL:** Custom domain  
**Auto-Deploy:** Yes (on push to `main`)  
**Logs:** Warnings only (`VITE_LOG_LEVEL=warn`)

---

## Rollback Procedure

### Via Base44 Dashboard
1. Navigate to Deployments
2. Select previous stable version
3. Click "Rollback"
4. Confirm

**Rollback Time:** < 2 minutes

---

## Release Process

### Version Numbering
**Format:** `MAJOR.MINOR.PATCH` (Semantic Versioning)

**Examples:**
- `1.0.0` - Initial production release
- `1.1.0` - New feature
- `1.1.1` - Bug fix
- `2.0.0` - Breaking change

### Release Checklist

**1 Week Before:**
- [ ] Code freeze on `develop`
- [ ] Merge to `staging`
- [ ] QA testing

**1 Day Before:**
- [ ] Final staging test
- [ ] Backup production database
- [ ] Notify users

**Release Day:**
- [ ] Merge `staging` → `main`
- [ ] Monitor deployment
- [ ] Run smoke tests

---

## Monitoring & Alerts

**Metrics Tracked:**
- API response time (p50, p95, p99)
- Error rate
- Uptime

**Alerts:**
- Error rate > 5% → Email
- Response time > 10s → Slack/Email