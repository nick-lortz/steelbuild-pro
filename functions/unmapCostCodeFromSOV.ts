import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { requireRole } from './_lib/authz.js';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Financial operations require PM/Finance/Admin
    requireRole(user, ['admin', 'pm', 'finance']);

    const { sov_cost_code_map_id } = await req.json();

    if (!sov_cost_code_map_id) {
      return Response.json({ error: 'sov_cost_code_map_id required' }, { status: 400 });
    }

    const mappings = await base44.entities.SOVCostCodeMap.filter({ id: sov_cost_code_map_id });
    if (mappings.length === 0) {
      return Response.json({ error: 'Mapping not found' }, { status: 404 });
    }

    const mapping = mappings[0];

    // Check for existing expenses
    const expenses = await base44.entities.Expense.filter({ 
      cost_code_id: mapping.cost_code_id,
      project_id: mapping.project_id
    });

    if (expenses.length > 0) {
      return Response.json({ 
        error: 'Cannot unmap: expenses exist for this cost code. Reassign expenses first.',
        expense_count: expenses.length
      }, { status: 409 });
    }

    await base44.entities.SOVCostCodeMap.delete(sov_cost_code_map_id);

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});