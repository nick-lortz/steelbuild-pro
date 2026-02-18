import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const DEFAULT_RULES = [
  {
    rule_name: 'High Cost Impact - RFI',
    applies_to_entity_type: 'RFI',
    conditions_json: JSON.stringify({
      any: [
        { field: 'predicted_cost_delta_usd', op: '>', value: 2500 },
        { field: 'predicted_schedule_delta_hours', op: '>', value: 8 }
      ]
    }),
    thresholds_json: JSON.stringify({
      cost_threshold: 2500,
      schedule_threshold: 8
    }),
    required_approver_roles: ['PM', 'Estimating'],
    priority: 10,
    is_active: true
  },
  {
    rule_name: 'Design Intent Change - RFI',
    applies_to_entity_type: 'RFI',
    conditions_json: JSON.stringify({
      any: [
        { field: 'design_intent_change', op: '=', value: true }
      ]
    }),
    thresholds_json: JSON.stringify({}),
    required_approver_roles: ['PM', 'DetailingLead'],
    priority: 5,
    is_active: true
  },
  {
    rule_name: 'Float Consumption - Any',
    applies_to_entity_type: 'RFI',
    conditions_json: JSON.stringify({
      any: [
        { field: 'predicted_float_consumed_days', op: '>', value: 3 }
      ]
    }),
    thresholds_json: JSON.stringify({
      float_threshold: 3
    }),
    required_approver_roles: ['PM'],
    priority: 15,
    is_active: true
  },
  {
    rule_name: 'High Rework Risk - DetailImprovement',
    applies_to_entity_type: 'DetailImprovement',
    conditions_json: JSON.stringify({
      any: [
        { field: 'predicted_cost_delta_usd', op: '<', value: -1000 }
      ]
    }),
    thresholds_json: JSON.stringify({
      cost_avoidance_threshold: 1000
    }),
    required_approver_roles: ['DetailingLead'],
    priority: 20,
    is_active: true
  }
];

const DEFAULT_WEIGHTS = [
  { factor_key: 'rfi_shop_rework', factor_name: 'RFI Shop Rework', weight: 0.35 },
  { factor_key: 'rfi_field_rework', factor_name: 'RFI Field Rework', weight: 0.40 },
  { factor_key: 'install_blocked', factor_name: 'Install Blocked', weight: 0.45 },
  { factor_key: 'delivery_waste', factor_name: 'Delivery Waste', weight: 0.20 },
  { factor_key: 'design_intent_change', factor_name: 'Design Intent Change', weight: 0.50 },
  { factor_key: 'float_consumed', factor_name: 'Float Consumed', weight: 0.30 },
  { factor_key: 'crew_idle', factor_name: 'Crew Idle', weight: 0.35 }
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Check if rules already exist
    const existingRules = await base44.asServiceRole.entities.ApprovalGateRule?.filter({}) || [];
    
    if (existingRules.length > 0) {
      return Response.json({
        message: 'Default rules already exist',
        count: existingRules.length
      });
    }

    // Create rules
    const createdRules = await base44.asServiceRole.entities.ApprovalGateRule.bulkCreate(
      DEFAULT_RULES.map(r => ({
        ...r,
        created_by: user.email
      }))
    );

    // Check if weights exist
    const existingWeights = await base44.asServiceRole.entities.RiskFactorWeight?.filter({}) || [];
    
    if (existingWeights.length === 0) {
      await base44.asServiceRole.entities.RiskFactorWeight.bulkCreate(
        DEFAULT_WEIGHTS.map(w => ({
          ...w,
          active_from: new Date().toISOString()
        }))
      );
    }

    return Response.json({
      success: true,
      rules_created: createdRules.length,
      weights_created: existingWeights.length === 0 ? DEFAULT_WEIGHTS.length : 0
    });

  } catch (error) {
    console.error('Seed error:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});