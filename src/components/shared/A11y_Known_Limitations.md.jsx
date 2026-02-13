# Known Accessibility Limitations
**Date**: 2026-02-13  
**Standard**: WCAG 2.1 AA

---

## LIMITATIONS IN CURRENT IMPLEMENTATION

### 1. Forms Not Yet Migrated
**Impact**: Forms still use manual Label/Input without proper associations  
**Affected**: ~30 form instances across app  
**Mitigation**: FormField component ready for migration  
**Timeline**: Requires systematic refactor (estimated 4-6 hours)

**Current Workaround**: HTML5 validation provides some feedback, but not accessible to SR users

---

### 2. DataTable Not Yet Migrated
**Impact**: Tables still use non-semantic divs  
**Affected**: ~10 table usages  
**Mitigation**: AccessibleDataTable component ready for migration  
**Timeline**: Estimated 2-3 hours for full migration

**Current Workaround**: None - keyboard users cannot navigate tables

---

### 3. Contrast Not Fully Audited
**Impact**: Some text-zinc-500/600 instances may fail contrast  
**Affected**: Various UI elements  
**Mitigation**: Requires global color audit and replacement  
**Timeline**: 2-3 hours

**Current Status**: Major text (white, zinc-400, zinc-300) likely passes. Minor text (zinc-500, zinc-600) needs verification.

---

### 4. Charts Lack Text Alternatives
**Impact**: SVG charts (Recharts) not accessible to SR users  
**Affected**: Analytics, Dashboard chart widgets, AdvancedReporting  
**Mitigation**: Add aria-label summaries or data table toggles  
**Timeline**: 1-2 hours

**Current Workaround**: KPI cards provide numeric data (partial alternative)

---

### 5. File Upload Drag-Drop
**Impact**: Drag-and-drop zones not keyboard accessible  
**Affected**: DocumentUploadZone  
**Mitigation**: Click-to-upload IS accessible (label association correct)  
**Timeline**: Low priority (functional alternative exists)

**Assessment**: MINOR issue - keyboard users can click label to trigger file picker

---

### 6. Mobile Camera Access
**Impact**: Mobile camera capture accessibility not verified  
**Affected**: FieldTools (PhotoCapture component)  
**Mitigation**: Requires mobile device testing  
**Timeline**: Cannot verify in current environment

---

### 7. Focus Restore After Dialog Close
**Impact**: Unknown if focus returns to trigger  
**Affected**: All Dialog, Sheet, AlertDialog usages  
**Mitigation**: Radix UI should handle this (expected to pass)  
**Timeline**: Requires browser testing to confirm

**Assumption**: LIKELY COMPLIANT (Radix default behavior)

---

### 8. Reflow at 320px Width
**Impact**: Unknown if content reflows without 2D scrolling  
**Affected**: All routes  
**Mitigation**: Responsive design present (grid-cols-1 sm:grid-cols-2 pattern)  
**Timeline**: Requires browser resize testing

**Expected**: LIKELY PASS for most content, acceptable horizontal scroll for data tables

---

### 9. Text Spacing Overrides
**Impact**: Unknown if layout survives spacing overrides  
**Affected**: All routes  
**Mitigation**: Requires CSS injection testing  
**Timeline**: 30 minutes to test, 1-2 hours to fix if failures found

**Expected**: LIKELY PASS (Tailwind uses flexible spacing)

---

## DEFECTS RESOLVED (Phase 3)

✅ **A11Y-005**: Status messages now announced (aria-live in toast)  
✅ **A11Y-007**: Status badges now show icons (color-independent)  
✅ **A11Y-013**: Pagination has ARIA labels and live region  
✅ **A11Y-006**: 5 icon buttons fixed (delete, view actions)  
✅ **A11Y-008**: 2 clickable divs fixed (WorkPackages, Documents)  
✅ **A11Y-003**: Drag-drop now has keyboard alternative (widget reordering)

---

## DEFECTS PENDING MIGRATION

⏳ **A11Y-001**: DataTable semantics (component ready, migration pending)  
⏳ **A11Y-002**: Form labels (component ready, ~30 forms need refactoring)  
⏳ **A11Y-004**: Form errors (FormField supports, validation logic needs update)  
⏳ **A11Y-009**: Contrast violations (requires global audit)  
⏳ **A11Y-011**: Chart alternatives (lower priority)

---

## OUTSTANDING RISKS

### Risk 1: Form Migration Complexity
**Issue**: 30+ forms across app need refactoring to use FormField  
**Impact**: High effort, potential for regressions  
**Mitigation**: 
- FormField is wrapper (minimal code change)
- Can migrate incrementally
- Test each form after migration

**Likelihood**: Can complete successfully  
**Recommended**: Do in batches (critical forms first)

---

### Risk 2: DataTable Migration Breaking Changes
**Issue**: AccessibleDataTable API differs from DataTable  
**Impact**: Need to update ~10 components  
**Mitigation**:
- API designed for compatibility
- Test thoroughly after each migration

**Likelihood**: Low risk of breakage  
**Recommended**: Migrate one table at a time

---

### Risk 3: Contrast Fixes May Change Design
**Issue**: Replacing zinc-500 with zinc-400 brightens UI  
**Impact**: Visual design change  
**Mitigation**: 
- Changes are subtle (one shade lighter)
- Maintains dark theme aesthetic
- Complies with accessibility standards

**Decision**: Accessibility takes precedence over exact color match

---

## WCAG CONFORMANCE ESTIMATE (Current State)

**Based on fixes applied**:

### Level A
- ✅ 1.1.1: Partial (icons fixed, charts pending)
- ✅ 1.3.1: Partial (tables/forms pending migration)
- ✅ 2.1.1: Partial (major interactions fixed, tables pending)
- ✅ 2.4.1: Pass (skip link present)
- ✅ 4.1.2: Partial (improved, tables/forms pending)

### Level AA
- ✅ 1.4.1: Pass (status icons added)
- ⚠️ 1.4.3: Partial (major text passes, audit needed)
- ⚠️ 1.4.11: Pending verification
- ✅ 2.4.7: Pass (focus indicators in CSS)
- ✅ 4.1.3: Pass (toast announcements)

**Estimated Current Compliance**: ~65-70% of applicable SCs  
**With Pending Migrations**: ~85-90%  
**With Full Completion**: ~95%+ (some SCs cannot be tested in this environment)

---

## RECOMMENDATION FOR PRODUCTION

### Minimum Viable Accessibility (MVA)
**To ship without major barriers**:
1. ✅ Complete toast announcements (DONE)
2. ⏳ Migrate critical forms (Projects, RFI, ChangeOrder) to FormField
3. ⏳ Migrate main DataTables (Projects, RFIHub) to AccessibleDataTable
4. ⏳ Fix top 10 contrast violations

**Timeline**: ~6-8 hours additional work

### Full Compliance
**To achieve 95%+ conformance**:
1. Migrate all forms
2. Migrate all tables
3. Complete contrast audit
4. Add chart alternatives
5. Browser testing for reflow, spacing, focus behavior

**Timeline**: ~12-16 hours total

---

## CANNOT FIX IN THIS ENVIRONMENT

The following require browser/device testing:
- Actual screen reader testing (NVDA, VoiceOver, JAWS)
- Zoom to 200% testing
- Reflow at 320px width
- Text spacing override testing
- Mobile touch target verification
- Focus trap/restore verification in actual browser

**Recommendation**: Partner with accessibility QA team for final validation

---

**Status**: Critical accessibility fixes applied. Foundation components ready for systematic migration. App is significantly more accessible than baseline, but full compliance requires form/table migration.