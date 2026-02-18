import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// DSL evaluator
function evaluateCondition(condition, context) {
  const { field, op, value } = condition;
  const fieldValue = context[field];

  switch (op) {
    case '>': return fieldValue > value;
    case '>=': return fieldValue >= value;
    case '<': return fieldValue < value;
    case '<=': return fieldValue <= value;
    case '=': return fieldValue === value;
    case '!=': return fieldValue !== value;
    case 'in': return Array.isArray(value) && value.includes(fieldValue);
    case 'not_in': return Array.isArray(value) && !value.includes(fieldValue);
    default: return false;
  }
}

function evaluateDSL(dsl, context) {
  if (dsl.any) {
    return dsl.any.some(cond => evaluateCondition(cond, context));
  }
  if (dsl.all) {
    return dsl.all.every(cond => evaluateCondition(cond, context));
  }
  return evaluateCondition(dsl, context);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { entity_type, entity_id, project_id, shadow_mode = false } = await req.json();
    
    if (!entity_type || !entity_id || !project_id) {
      return Response.json({ error: 'entity_type, entity_id, project_id required' }, { status: 400 });
    }

    // Run risk computation first
    const riskResult = await base44.functions.invoke('computeMarginAtRisk', {
      entity_type,
      entity_id,
      project_id
    });

    if (!riskResult.data?.success) {
      return Response.json({ error: 'Risk computation failed' }, { status: 500 });
    }

    const { outputs, explain, inputs, correlation_id } = riskResult.data;

    // Fetch active rules for this entity type
    const allRules = await base44.asServiceRole.entities.ApprovalGateRule.filter({
      applies_to_entity_type: entity_type,
      is_active: true
    }) || [];

    // Filter rules by project or org scope
    const rules = allRules
      .filter(r => !r.project_id || r.project_id === project_id)
      .sort((a, b) => a.priority - b.priority);

    let matchedRule = null;
    let gateRequired = false;

    // Evaluate rules in priority order
    for (const rule of rules) {
      const conditions = JSON.parse(rule.conditions_json || '{}');
      const thresholds = JSON.parse(rule.thresholds_json || '{}');
      
      // Build evaluation context
      const context = {
        ...outputs,
        ...inputs,
        entity_type,
        ...thresholds
      };

      // Evaluate DSL
      if (evaluateDSL(conditions, context)) {
        matchedRule = rule;
        gateRequired = true;
        break;
      }
    }

    let decision = null;

    if (gateRequired) {
      // Check if decision already exists for this entity
      const existingDecisions = await base44.asServiceRole.entities.ApprovalGateDecision?.filter({
        entity_type,
        entity_id,
        status: 'pending'
      }) || [];

      if (existingDecisions.length === 0) {
        // Create new decision
        const audit_trail = [
          {
            timestamp: new Date().toISOString(),
            user: user.email,
            action: 'gate_triggered',
            rule_id: matchedRule.id,
            rule_name: matchedRule.rule_name
          }
        ];

        decision = await base44.asServiceRole.entities.ApprovalGateDecision.create({
          entity_type,
          entity_id,
          project_id,
          rule_id: matchedRule.id,
          status: 'pending',
          requested_by: user.email,
          requested_at: new Date().toISOString(),
          inputs_snapshot_json: JSON.stringify(inputs),
          outputs_snapshot_json: JSON.stringify(outputs),
          audit_trail_json: JSON.stringify(audit_trail)
        });
      } else {
        decision = existingDecisions[0];
      }
    }

    return Response.json({
      success: true,
      gate_required: gateRequired,
      shadow_mode,
      would_have_blocked: shadow_mode && gateRequired,
      blocked: !shadow_mode && gateRequired,
      matched_rule: matchedRule ? {
        id: matchedRule.id,
        name: matchedRule.rule_name,
        required_approvers: matchedRule.required_approver_roles
      } : null,
      decision_id: decision?.id,
      risk_metrics: outputs,
      explanation: explain,
      correlation_id
    });

  } catch (error) {
    console.error('Gate evaluation error:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});