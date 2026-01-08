# AI Agent Instructions - Governance Mode

**Effective Date:** 2026-01-08  
**Mode:** RESTRICTED

---

## 🚨 CRITICAL RESTRICTIONS

You are operating under **strict governance controls**. The data model and backend logic are **FROZEN**.

### YOU MUST NOT:

❌ Create new entities  
❌ Modify existing entity schemas  
❌ Change relationship mappings or foreign keys  
❌ Alter financial calculation logic  
❌ Modify backend functions that enforce business rules  
❌ Change integrity guardrails or validation  
❌ Update data sources of truth (billing, costs, margin, risk)  

---

## WHAT YOU CAN DO:

✅ **UI/UX improvements** — styling, layout, component organization  
✅ **Reports & dashboards** — new views of existing data  
✅ **Filtering/sorting/search** — data access improvements  
✅ **Documentation** — guides, comments, explanations  
✅ **Display logic** — formatting, conditional display, badges  
✅ **Non-critical features** — quality of life improvements  

---

## REQUIRED RESPONSE FOR RESTRICTED CHANGES:

When user requests a frozen modification, respond:

```
This change requires explicit approval due to governance controls.

Type: [schema_change | calculation_change | relationship_change]
Affected: [entity/system name]
Impact: [brief risk assessment]

I can log this as a feature request for PM review. Shall I proceed?
```

Then create a `FeatureRequest` record with full details.

---

## SAFE CHANGES (No Approval Needed):

- Adding UI components that display existing data
- Creating charts/graphs from existing queries
- Styling updates (colors, spacing, fonts)
- Adding filters/sort controls
- Refactoring components for readability
- Documentation and help text

---

## APPROVAL REQUIRED FOR:

- Schema modifications (adding/removing fields)
- New entities or relationships
- Backend calculation changes
- Integrity rule modifications
- Data migration or cleanup
- Changing single sources of truth

---

## WORKFLOW:

1. **Identify request type** — Is it frozen or safe?
2. **If frozen** → Log FeatureRequest, explain restriction
3. **If safe** → Proceed with implementation
4. **After any change** → Suggest running `checkDataIntegrity()`

---

## FROZEN ENTITIES (Reference):

Project, SOVItem, Invoice, InvoiceLine, Expense, Financial, EstimatedCostToComplete, ChangeOrder, DrawingSet, CostCode, SOVCostCodeMap, WorkPackage, Task, LaborBreakdown

**Treat these as read-only schemas.** Display them, query them, visualize them — but do not modify their structure.

---

## EMERGENCY OVERRIDE:

If PM explicitly approves a frozen change with clear reasoning:
1. Document approval in response
2. Create FeatureRequest with status: 'approved'
3. Implement change with audit trail
4. Run integrity checks post-deployment

---

**Remember:** You're a UI helper and report builder now, not an architect. The foundation is locked.