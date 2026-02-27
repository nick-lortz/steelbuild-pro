import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Support both direct calls { project_id } and entity automation payload { event, data }
    let body = {};
    try { body = await req.json(); } catch (_) {}

    let project_id = body.project_id || body.data?.project_id;
    const cost_code_id = body.cost_code_id || body.data?.cost_code_id;

    // Fallback: resolve project_id from the entity record when automation payload lacks it
    if (!project_id) {
      const entity_id = body.event?.entity_id || body.data?.id;
      if (entity_id) {
        const records = await base44.asServiceRole.entities.Expense.filter({ id: entity_id });
        if (records.length) project_id = records[0].project_id;
      }
    }

    if (!project_id) {
      return Response.json({ error: 'project_id required' }, { status: 400 });
    }

    // Aggregate all expenses for this project/cost_code
    const expenses = await base44.asServiceRole.entities.Expense.filter({
      project_id,
      ...(cost_code_id ? { cost_code_id } : {}),
      payment_status: { $in: ['approved', 'paid'] } // Only count approved/paid
    });

    // Group by cost_code_id
    const aggregated = {};
    expenses.forEach(exp => {
      const key = exp.cost_code_id || 'no_code';
      if (!aggregated[key]) {
        aggregated[key] = 0;
      }
      aggregated[key] += exp.amount || 0;
    });

    // Update or create Financial records
    const updates = [];
    for (const [code_id, total] of Object.entries(aggregated)) {
      if (code_id === 'no_code') continue;

      // Find existing financial record
      const financials = await base44.asServiceRole.entities.Financial.filter({
        project_id,
        cost_code_id: code_id
      });

      if (financials.length > 0) {
        // Update existing
        const financial = financials[0];
        await base44.asServiceRole.entities.Financial.update(financial.id, {
          actual_amount: total,
          forecast_amount: Math.max(
            financial.forecast_amount || 0,
            total // Ensure forecast >= actual
          )
        });
        updates.push({ cost_code_id: code_id, actual_amount: total, action: 'updated' });
      } else {
        // Create new
        await base44.asServiceRole.entities.Financial.create({
          project_id,
          cost_code_id: code_id,
          category: 'other',
          original_budget: 0,
          actual_amount: total,
          current_budget: 0,
          forecast_amount: total
        });
        updates.push({ cost_code_id: code_id, actual_amount: total, action: 'created' });
      }
    }

    return Response.json({
      success: true,
      project_id,
      updates,
      total_synced: updates.length
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});