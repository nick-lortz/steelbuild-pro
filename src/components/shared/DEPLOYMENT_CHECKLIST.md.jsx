# SteelBuild Pro - Deployment Checklist

**Platform:** Base44  
**Version:** 1.0

---

## Pre-Deployment

### Code Review
- [ ] All backend functions tested via `test_backend_function`
- [ ] Load testing completed (1,000+ projects, 5,000+ RFIs)
- [ ] Real-time subscriptions tested under load
- [ ] No console errors in browser DevTools

### Data Validation
- [ ] Entity schemas validated
- [ ] Indexes created on high-query fields
- [ ] Load test data cleaned up (`cleanupLoadTestData`)

### Security Review
- [ ] All backend functions use `requireAuth()`
- [ ] Admin-only functions check `user.role === 'admin'`
- [ ] File upload validation active (type, size limits)
- [ ] `validateFileAccess` enforced on document retrieval

### Performance Optimization
- [ ] N+1 query loops eliminated (pre-indexing with `groupBy`)
- [ ] React.memo applied to list/row components
- [ ] Pagination implemented on large tables

### Accessibility (WCAG 2.1 AA)
- [ ] All tables have ARIA roles
- [ ] Keyboard navigation tested
- [ ] Skip to main content link present
- [ ] Color contrast meets 4.5:1 ratio

---

## Deployment Steps

### 1. Environment Setup
- [ ] Production environment created in Base44
- [ ] Domain configured
- [ ] SSL certificate active
- [ ] Environment variables set

### 2. Database Migration
- [ ] Entity schemas deployed
- [ ] Initial cost codes seeded

### 3. Backend Functions Deployment
- [ ] All functions deployed
- [ ] Automations created (updateRFIEscalation)

### 4. User Setup
- [ ] Admin user created
- [ ] Initial users invited

---

## Post-Deployment Verification

### Smoke Tests
- [ ] Login (admin and regular user)
- [ ] Dashboard loads without errors
- [ ] Create Project works
- [ ] Create RFI works
- [ ] Upload File works
- [ ] Real-time update works

### Performance Checks
- [ ] Dashboard loads in < 5s
- [ ] RFI Hub loads in < 6s

### Security Verification
- [ ] Unauthenticated user redirected to login
- [ ] Regular user cannot access admin functions
- [ ] File upload rejects invalid file types

---

## Rollback Plan

1. Notify all users of issue
2. Revert to previous stable version (Base44 Dashboard)
3. Document issue for root cause analysis

---

## Success Criteria

- Zero critical bugs in first week
- < 5s average page load time
- 99.5%+ uptime
- 80%+ user adoption in first month