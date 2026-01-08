# Data Integrity & Feature Governance

**Effective Date:** 2026-01-08  
**Status:** ENFORCED

---

## 🔒 PHASE 6: LOCKED SYSTEMS

### Core Principles

1. **History is immutable** — No retroactive edits
2. **Single sources of truth** — One place per concept
3. **Supersede, never overwrite** — Old becomes read-only
4. **Change Orders are contract authority** — Only way to change money
5. **Data model is frozen** — No new entities or relationships without approval

---

## DATA MODEL FREEZE

### What is LOCKED:

- ✅ All core entities (Project, SOVItem, Expense, Financial, Invoice, etc.)
- ✅ Entity relationships and foreign keys
- ✅ Financial calculation logic
- ✅ Backend functions governing billing, costs, budgets
- ✅ Integrity guardrails and validation rules

### What CANNOT be changed without explicit approval:

- ❌ New entities
- ❌ Schema modifications (adding/removing fields)
- ❌ Relationship changes (mappings, foreign keys)
- ❌ Financial calculation formulas
- ❌ Backend enforcement logic

### Exception Process:

All change requests must:
1. Be logged in FeatureRequest entity
2. Include business justification
3. Pass impact analysis
4. Receive explicit PM approval
5. Be scheduled for controlled deployment

---

## AI SCOPE RESTRICTIONS

### Base44 AI is ALLOWED to:

✅ Update UI components (styling, layout, UX)  
✅ Create reports and visualizations  
✅ Generate documentation  
✅ Format and display data  
✅ Add filtering/sorting/search  
✅ Build dashboards and summaries  

### Base44 AI is FORBIDDEN from:

❌ Modifying entity schemas  
❌ Changing backend logic  
❌ Altering financial calculations  
❌ Modifying integrity rules  
❌ Creating new core entities  
❌ Changing data relationships  

**Default Response:** "This change requires explicit approval. Logged as feature request."

---

## FROZEN SOURCES OF TRUTH

| Concept | Source of Truth | Modification Path |
|---------|----------------|-------------------|
| **Billing** | SOV + InvoiceLines | New invoices only |
| **Costs** | Expenses | New expense records |
| **Contract Value** | SOVItem.scheduled_value | Change Orders only |
| **Margin** | DERIVED (never stored) | Recalculate from sources |
| **Risk Status** | Backend function | Update calculation logic |
| **Drawing Authority** | Latest FFF DrawingSet | Supersede pattern |
| **Execution** | Work Packages | Phase transitions |

---

## IMMUTABLE HISTORY

Once approved/released, these become **READ-ONLY**:

- Invoice approved → InvoiceLines frozen
- Drawing released (FFF) → Superseded, not edited
- SOV billed_to_date → Locked after invoice approval
- Change Order approved → Contract value updated, CO frozen

---

## CHANGE REQUEST WORKFLOW

1. **Idea raised** → Log in FeatureRequest entity
2. **Impact analysis** → Check data integrity, relationships, downstream effects
3. **PM review** → Approve/reject with reasoning
4. **Schedule** → Controlled deployment window
5. **Deploy** → With rollback plan
6. **Validate** → Run data integrity checks

---

## ENFORCEMENT

- Backend functions validate against frozen schemas
- UI displays lock reasons on disabled actions
- Integrity checks run on-demand via `checkDataIntegrity()`
- Change orders are the ONLY way to modify contract value

---

## EMERGENCY OVERRIDE

In case of critical data correction:

1. Document the issue and impact
2. Get PM sign-off
3. Use `asServiceRole` functions with audit trail
4. Log override in FeatureRequest with `priority: critical`
5. Run post-change integrity validation

---

**Last Updated:** 2026-01-08  
**Next Review:** Quarterly or on major incident