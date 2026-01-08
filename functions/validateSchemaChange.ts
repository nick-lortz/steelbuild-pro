import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// FROZEN CORE ENTITIES - Cannot be modified without explicit approval
const FROZEN_ENTITIES = [
  'Project',
  'SOVItem',
  'Invoice',
  'InvoiceLine',
  'Expense',
  'Financial',
  'EstimatedCostToComplete',
  'ChangeOrder',
  'DrawingSet',
  'CostCode',
  'SOVCostCodeMap',
  'WorkPackage',
  'Task',
  'LaborBreakdown'
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { entity_name, proposed_changes, justification } = await req.json();

    // Check if entity is frozen
    if (FROZEN_ENTITIES.includes(entity_name)) {
      // Log as feature request
      const featureRequest = await base44.asServiceRole.entities.FeatureRequest.create({
        title: `Schema change request: ${entity_name}`,
        description: `Proposed changes: ${JSON.stringify(proposed_changes, null, 2)}\n\nJustification: ${justification}`,
        request_type: 'schema_change',
        priority: 'medium',
        status: 'submitted',
        requested_by: user.email,
        impact_areas: [entity_name]
      });

      return Response.json({
        allowed: false,
        reason: 'Entity schema is frozen per governance policy',
        message: `${entity_name} is a core entity and cannot be modified without explicit approval.`,
        action: 'Feature request created',
        feature_request_id: featureRequest.id,
        next_steps: 'PM will review request and determine if change is justified'
      }, { status: 403 });
    }

    // Non-frozen entity - allow but log
    await base44.asServiceRole.entities.FeatureRequest.create({
      title: `Schema change: ${entity_name}`,
      description: `Changes applied: ${JSON.stringify(proposed_changes, null, 2)}`,
      request_type: 'schema_change',
      priority: 'low',
      status: 'implemented',
      requested_by: user.email,
      impact_areas: [entity_name]
    });

    return Response.json({
      allowed: true,
      message: `${entity_name} is not a frozen entity. Change logged for audit.`
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});