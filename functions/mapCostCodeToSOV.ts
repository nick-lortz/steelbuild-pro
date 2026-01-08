import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { project_id, sov_item_id, cost_code_id, allocation_percent } = await req.json();

    if (!project_id || !sov_item_id || !cost_code_id) {
      return Response.json({ error: 'project_id, sov_item_id, and cost_code_id required' }, { status: 400 });
    }

    // Validate SOV item exists
    const sovItems = await base44.entities.SOVItem.filter({ id: sov_item_id, project_id });
    if (sovItems.length === 0) {
      return Response.json({ error: 'SOV item not found for this project' }, { status: 404 });
    }

    // Validate cost code exists
    const costCodes = await base44.entities.CostCode.filter({ id: cost_code_id, project_id });
    if (costCodes.length === 0) {
      return Response.json({ error: 'Cost code not found for this project' }, { status: 404 });
    }

    // Check for duplicate mapping
    const existing = await base44.entities.SOVCostCodeMap.filter({ 
      sov_item_id, 
      cost_code_id 
    });
    if (existing.length > 0) {
      return Response.json({ error: 'Mapping already exists' }, { status: 409 });
    }

    // Validate allocation_percent if provided
    if (allocation_percent !== undefined && (allocation_percent < 0 || allocation_percent > 100)) {
      return Response.json({ error: 'allocation_percent must be 0-100' }, { status: 400 });
    }

    const mapping = await base44.entities.SOVCostCodeMap.create({
      project_id,
      sov_item_id,
      cost_code_id,
      allocation_percent: allocation_percent !== undefined ? allocation_percent : 100
    });

    return Response.json({ mapping });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});