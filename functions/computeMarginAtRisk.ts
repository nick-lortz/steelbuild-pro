import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const DEFAULT_WEIGHTS = {
  'rfi_shop_rework': 0.35,
  'rfi_field_rework': 0.40,
  'install_blocked': 0.45,
  'delivery_waste': 0.20,
  'design_intent_change': 0.50,
  'float_consumed': 0.30,
  'crew_idle': 0.35
};

const CREW_HOURLY_RATE = 85;
const CRANE_HOURLY_RATE = 175;
const SHOP_LABOR_RATE = 65;
const AVG_SHOP_REWORK_HOURS = 8;
const AVG_FIELD_REWORK_HOURS = 12;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { entity_type, entity_id, project_id } = await req.json();
    
    if (!entity_type || !entity_id || !project_id) {
      return Response.json({ error: 'entity_type, entity_id, project_id required' }, { status: 400 });
    }

    const ran_at = new Date().toISOString();
    const correlation_id = `${entity_type}_${entity_id}_${Date.now()}`;

    // Fetch active weights (use defaults if none exist)
    const customWeights = await base44.asServiceRole.entities.RiskFactorWeight?.filter({
      active_to: null // Currently active
    }) || [];
    
    const weightMap = new Map(
      customWeights.map(w => [w.factor_key, w.weight])
    );
    
    const getWeight = (key) => weightMap.get(key) || DEFAULT_WEIGHTS[key] || 0.25;

    // Fetch entity data
    let entity;
    let inputs = {};
    let factors = [];
    let predicted_cost_delta_usd = 0;
    let predicted_schedule_delta_hours = 0;
    let predicted_float_consumed_days = 0;
    let predicted_crew_idle_hours = 0;
    let double_handling_probability = 0;
    let rework_probability = 0;
    let design_intent_change = false;

    // RFI Risk Computation
    if (entity_type === 'RFI') {
      const rfis = await base44.entities.RFI.filter({ id: entity_id });
      entity = rfis[0];
      
      if (!entity) {
        return Response.json({ error: 'Entity not found' }, { status: 404 });
      }

      inputs = {
        rfi_type: entity.rfi_type,
        status: entity.status,
        fabrication_hold: entity.fabrication_hold,
        field_rework_risk: entity.field_rework_risk,
        est_detail_hours: entity.est_detail_hours || 0,
        business_days_open: entity.business_days_open || 0
      };

      // Design intent change detection
      const designIntentTypes = ['connection_detail', 'member_size_length', 'embed_anchor'];
      design_intent_change = designIntentTypes.includes(entity.rfi_type);

      // Shop rework risk
      if (entity.fabrication_hold || entity.status === 'under_review') {
        const cost = AVG_SHOP_REWORK_HOURS * SHOP_LABOR_RATE;
        predicted_cost_delta_usd += cost;
        rework_probability = 0.7;
        
        factors.push({
          name: 'Shop Fabrication Hold',
          value: entity.fabrication_hold ? 'Yes' : 'Under Review',
          weight: getWeight('rfi_shop_rework'),
          contribution: cost,
          source_link: `RFI-${entity.rfi_number}`
        });
      }

      // Field rework risk
      if (entity.field_rework_risk === 'high' || entity.field_rework_risk === 'med') {
        const cost = AVG_FIELD_REWORK_HOURS * CREW_HOURLY_RATE;
        const probability = entity.field_rework_risk === 'high' ? 0.8 : 0.5;
        predicted_cost_delta_usd += cost * probability;
        rework_probability = Math.max(rework_probability, probability);
        
        factors.push({
          name: 'Field Rework Risk',
          value: entity.field_rework_risk,
          weight: getWeight('rfi_field_rework'),
          contribution: cost * probability,
          source_link: `RFI-${entity.rfi_number}`
        });
      }

      // Detailing hours
      if (entity.est_detail_hours > 0) {
        const cost = entity.est_detail_hours * SHOP_LABOR_RATE;
        predicted_cost_delta_usd += cost;
        predicted_schedule_delta_hours += entity.est_detail_hours;
        
        factors.push({
          name: 'Estimated Detailing Hours',
          value: entity.est_detail_hours,
          weight: 0.3,
          contribution: cost,
          source_link: `RFI-${entity.rfi_number}`
        });
      }

      // Design intent change penalty
      if (design_intent_change) {
        const penalty = 1500;
        predicted_cost_delta_usd += penalty;
        
        factors.push({
          name: 'Design Intent Change',
          value: 'Yes',
          weight: getWeight('design_intent_change'),
          contribution: penalty,
          source_link: `RFI-${entity.rfi_number}`
        });
      }

      // Aging RFI penalty
      if (entity.business_days_open > 10) {
        const floatDays = Math.min(entity.business_days_open - 10, 5);
        predicted_float_consumed_days += floatDays;
        
        factors.push({
          name: 'Business Days Open',
          value: entity.business_days_open,
          weight: getWeight('float_consumed'),
          contribution: floatDays,
          source_link: `RFI-${entity.rfi_number}`
        });
      }
    }

    // DetailImprovement Risk Computation
    else if (entity_type === 'DetailImprovement') {
      const improvements = await base44.asServiceRole.entities.DetailImprovement?.filter({ id: entity_id }) || [];
      entity = improvements[0];
      
      if (!entity) {
        return Response.json({ error: 'Entity not found' }, { status: 404 });
      }

      inputs = {
        severity: entity.severity,
        estimated_cost_avoidance: entity.estimated_cost_avoidance || 0,
        estimated_hours_saved: entity.estimated_hours_saved || 0
      };

      // Positive impact (cost avoidance)
      if (entity.estimated_cost_avoidance > 0) {
        predicted_cost_delta_usd -= entity.estimated_cost_avoidance;
        
        factors.push({
          name: 'Cost Avoidance',
          value: `$${entity.estimated_cost_avoidance}`,
          weight: 0.4,
          contribution: -entity.estimated_cost_avoidance,
          source_link: `DetailImprovement-${entity.id}`
        });
      }

      if (entity.estimated_hours_saved > 0) {
        predicted_schedule_delta_hours -= entity.estimated_hours_saved;
        
        factors.push({
          name: 'Hours Saved',
          value: entity.estimated_hours_saved,
          weight: 0.3,
          contribution: -entity.estimated_hours_saved,
          source_link: `DetailImprovement-${entity.id}`
        });
      }
    }

    // Delivery Risk Computation
    else if (entity_type === 'Delivery') {
      const deliveries = await base44.asServiceRole.entities.Delivery?.filter({ id: entity_id }) || [];
      entity = deliveries[0];
      
      if (!entity) {
        return Response.json({ error: 'Entity not found' }, { status: 404 });
      }

      inputs = {
        arrival_date: entity.arrival_date,
        area: entity.area,
        tonnage: entity.tonnage || 0
      };

      // Early delivery double handling risk
      const installStatuses = await base44.asServiceRole.entities.InstallableWorkStatus?.filter({
        project_id,
        area_id: entity.area
      }) || [];

      if (installStatuses.length > 0) {
        const status = installStatuses[0];
        if (status.install_blocked_tons > 0) {
          const handlingCost = 4 * CREW_HOURLY_RATE;
          predicted_cost_delta_usd += handlingCost;
          double_handling_probability = 0.6;
          
          factors.push({
            name: 'Double Handling Risk',
            value: 'Area Blocked',
            weight: getWeight('delivery_waste'),
            contribution: handlingCost,
            source_link: `Delivery-${entity.id}`
          });
        }
      }
    }

    // ErectionSequence placeholder
    else if (entity_type === 'ErectionSequence') {
      // Future implementation - System 3
      predicted_cost_delta_usd = 0;
    }

    // Confidence score (based on data completeness)
    const factorCount = factors.length;
    const confidence_score = Math.min(1.0, 0.4 + (factorCount * 0.15));

    const outputs = {
      predicted_cost_delta_usd: Math.round(predicted_cost_delta_usd),
      predicted_schedule_delta_hours: Math.round(predicted_schedule_delta_hours * 10) / 10,
      predicted_float_consumed_days: Math.round(predicted_float_consumed_days * 10) / 10,
      predicted_crew_idle_hours: Math.round(predicted_crew_idle_hours * 10) / 10,
      double_handling_probability: Math.round(double_handling_probability * 100) / 100,
      rework_probability: Math.round(rework_probability * 100) / 100,
      confidence_score: Math.round(confidence_score * 100) / 100,
      design_intent_change
    };

    const explain = {
      factors,
      model_version: 'v1',
      weights_used: Object.fromEntries(
        Array.from(new Set(factors.map(f => f.name))).map(name => [
          name,
          factors.find(f => f.name === name)?.weight || 0
        ])
      )
    };

    // Store computation run
    await base44.asServiceRole.entities.RiskComputationRun.create({
      project_id,
      entity_type,
      entity_id,
      version: 'v1',
      ran_at,
      inputs_json: JSON.stringify(inputs),
      outputs_json: JSON.stringify(outputs),
      explain_json: JSON.stringify(explain),
      correlation_id
    });

    return Response.json({
      success: true,
      correlation_id,
      outputs,
      explain,
      inputs
    });

  } catch (error) {
    console.error('Risk computation error:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});