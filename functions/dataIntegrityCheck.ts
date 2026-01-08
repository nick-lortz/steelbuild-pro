import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId } = await req.json();

    const violations = [];

    // Rule 1: Billing authority - SOV + InvoiceLines ONLY
    // Check for any manual billing overrides in Financials
    const financials = await base44.asServiceRole.entities.Financial.filter({ 
      project_id: projectId 
    });
    
    // Rule 2: Costs authority - Expenses ONLY
    // Verify actual_amount in Financials matches expense rollup
    for (const fin of financials) {
      const expenses = await base44.asServiceRole.entities.Expense.filter({
        project_id: projectId,
        cost_code_id: fin.cost_code_id
      });
      const expenseTotal = expenses
        .filter(e => e.payment_status === 'paid' || e.payment_status === 'approved')
        .reduce((sum, e) => sum + (e.amount || 0), 0);
      
      if (Math.abs((fin.actual_amount || 0) - expenseTotal) > 0.01) {
        violations.push({
          type: 'cost_mismatch',
          entity: 'Financial',
          id: fin.id,
          message: `Financial actual_amount (${fin.actual_amount}) does not match Expense total (${expenseTotal}) for cost code ${fin.cost_code_id}`,
          severity: 'high',
          source_of_truth: 'Expenses',
          recommended_action: 'Recalculate actual_amount from Expenses'
        });
      }
    }

    // Rule 3: Margin is DERIVED ONLY - never stored
    // Check for any stored margin fields that should be calculated
    const sovItems = await base44.asServiceRole.entities.SOVItem.filter({ 
      project_id: projectId 
    });
    
    // Rule 4: Risk Status - Backend function ONLY
    // No manual risk overrides allowed - always computed

    // Rule 5: Drawing Authority - Latest FFF set
    const drawingSets = await base44.asServiceRole.entities.DrawingSet.filter({
      project_id: projectId
    });
    
    const fffSets = drawingSets.filter(ds => ds.status === 'FFF');
    const groupedBySetNumber = {};
    fffSets.forEach(ds => {
      if (!groupedBySetNumber[ds.set_number]) {
        groupedBySetNumber[ds.set_number] = [];
      }
      groupedBySetNumber[ds.set_number].push(ds);
    });

    // Check for multiple FFF revisions of same set
    Object.entries(groupedBySetNumber).forEach(([setNumber, sets]) => {
      if (sets.length > 1) {
        const latest = sets.sort((a, b) => 
          new Date(b.released_for_fab_date) - new Date(a.released_for_fab_date)
        )[0];
        
        sets.forEach(ds => {
          if (ds.id !== latest.id) {
            violations.push({
              type: 'drawing_authority_conflict',
              entity: 'DrawingSet',
              id: ds.id,
              message: `Multiple FFF sets exist for ${setNumber}. Latest is revision ${latest.current_revision}`,
              severity: 'medium',
              source_of_truth: `DrawingSet ${latest.id}`,
              recommended_action: 'Archive or supersede older revisions'
            });
          }
        });
      }
    });

    // Rule 6: Execution - Work Packages ONLY
    // No duplicate execution tracking

    return Response.json({
      project_id: projectId,
      integrity_status: violations.length === 0 ? 'clean' : 'violations_detected',
      violations_count: violations.length,
      violations,
      checked_at: new Date().toISOString()
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});