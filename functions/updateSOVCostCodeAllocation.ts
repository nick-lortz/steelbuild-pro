import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { requireProjectAccess } from './utils/requireProjectAccess.js';
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

    const { sov_cost_code_map_id, allocation_percent } = await req.json();

    if (!sov_cost_code_map_id || allocation_percent === undefined) {
      return Response.json({ error: 'sov_cost_code_map_id and allocation_percent required' }, { status: 400 });
    }

    if (allocation_percent < 0 || allocation_percent > 100) {
      return Response.json({ error: 'allocation_percent must be 0-100' }, { status: 400 });
    }

    const mappings = await base44.entities.SOVCostCodeMap.filter({ id: sov_cost_code_map_id });
    if (mappings.length === 0) {
      return Response.json({ error: 'Mapping not found' }, { status: 404 });
    }

    await requireProjectAccess(base44, user, mappings[0].project_id);

    await base44.entities.SOVCostCodeMap.update(sov_cost_code_map_id, {
      allocation_percent
    });

    return Response.json({ success: true, allocation_percent });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});