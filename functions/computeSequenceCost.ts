import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const DEFAULT_CRANE_RATE = 175; // per hour
const DEFAULT_CREW_RATE = 85; // per person hour
const DEFAULT_TONNAGE_PER_HOUR = 2.5;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { pick_plan_id } = await req.json();
    
    if (!pick_plan_id) {
      return Response.json({ error: 'pick_plan_id required' }, { status: 400 });
    }

    const ran_at = new Date().toISOString();

    // Fetch pick plan
    const pickPlans = await base44.asServiceRole.entities.ErectionPickPlan.filter({ id: pick_plan_id });
    const pickPlan = pickPlans[0];
    
    if (!pickPlan) {
      return Response.json({ error: 'Pick plan not found' }, { status: 404 });
    }

    // Fetch crew model
    const crewModels = await base44.asServiceRole.entities.CrewModel?.filter({
      project_id: pickPlan.project_id,
      is_active: true
    }) || [];
    
    const crewModel = crewModels[0] || {
      crew_size: 4,
      composite_rate: DEFAULT_CREW_RATE,
      efficiency_factor: 1.0,
      tonnage_per_hour: DEFAULT_TONNAGE_PER_HOUR
    };

    // Fetch constraints
    const constraints = await base44.asServiceRole.entities.ErectionConstraint?.filter({
      pick_plan_id
    }) || [];

    // Fetch risk factors
    const riskFactors = await base44.asServiceRole.entities.PickRiskFactor?.filter({
      pick_plan_id
    }) || [];

    const picks = pickPlan.picks || [];
    
    if (picks.length === 0) {
      return Response.json({
        success: true,
        predicted_install_hours: 0,
        predicted_crane_hours: 0,
        predicted_cost: 0,
        message: 'No picks in sequence'
      });
    }

    // Calculate base metrics
    let totalInstallHours = 0;
    let totalCraneHours = 0;
    const pickBreakdown = [];
    const sensitivityFactors = [];

    for (const pick of picks) {
      const tonnage = pick.tonnage || 0;
      const baseHours = tonnage / (crewModel.tonnage_per_hour * crewModel.efficiency_factor);
      
      // Apply risk factors
      const pickRisks = riskFactors.filter(rf => rf.pick_number === pick.pick_number);
      let costMultiplier = 1.0;
      let scheduleAdder = 0;

      for (const risk of pickRisks) {
        costMultiplier *= (1 + (risk.cost_adder_pct / 100));
        scheduleAdder += risk.schedule_adder_hours || 0;
        
        if (risk.cost_adder_pct > 0 || risk.schedule_adder_hours > 0) {
          sensitivityFactors.push({
            pick_number: pick.pick_number,
            factor: risk.factor_type,
            severity: risk.severity,
            cost_impact: tonnage * crewModel.composite_rate * crewModel.crew_size * (costMultiplier - 1),
            schedule_impact: risk.schedule_adder_hours
          });
        }
      }

      // Apply constraints
      const pickConstraints = constraints.filter(c => 
        c.affected_picks?.includes(pick.pick_number)
      );
      
      for (const constraint of pickConstraints) {
        costMultiplier *= constraint.cost_impact_multiplier || 1.0;
        scheduleAdder += constraint.schedule_impact_hours || 0;
        
        if ((constraint.cost_impact_multiplier || 1.0) > 1.0 || constraint.schedule_impact_hours > 0) {
          sensitivityFactors.push({
            pick_number: pick.pick_number,
            factor: constraint.constraint_type,
            severity: constraint.is_blocker ? 'high' : 'medium',
            cost_impact: tonnage * crewModel.composite_rate * crewModel.crew_size * (constraint.cost_impact_multiplier - 1),
            schedule_impact: constraint.schedule_impact_hours
          });
        }
      }

      const adjustedHours = (baseHours * costMultiplier) + scheduleAdder;
      const craneHours = adjustedHours * 0.85; // Crane typically 85% of crew time

      totalInstallHours += adjustedHours;
      totalCraneHours += craneHours;

      pickBreakdown.push({
        pick_number: pick.pick_number,
        tonnage,
        base_hours: Math.round(baseHours * 10) / 10,
        adjusted_hours: Math.round(adjustedHours * 10) / 10,
        crane_hours: Math.round(craneHours * 10) / 10,
        cost_multiplier: Math.round(costMultiplier * 100) / 100,
        risk_count: pickRisks.length,
        constraint_count: pickConstraints.length
      });
    }

    // Calculate costs
    const crewCost = totalInstallHours * crewModel.composite_rate * crewModel.crew_size;
    const craneCost = totalCraneHours * DEFAULT_CRANE_RATE;
    const totalCost = crewCost + craneCost;

    // Sort sensitivity factors by cost impact
    sensitivityFactors.sort((a, b) => b.cost_impact - a.cost_impact);
    const topDrivers = sensitivityFactors.slice(0, 5);

    const outputs = {
      predicted_install_hours: Math.round(totalInstallHours * 10) / 10,
      predicted_crane_hours: Math.round(totalCraneHours * 10) / 10,
      predicted_cost: Math.round(totalCost),
      crew_cost: Math.round(crewCost),
      crane_cost: Math.round(craneCost),
      total_tonnage: picks.reduce((sum, p) => sum + (p.tonnage || 0), 0),
      pick_count: picks.length
    };

    const explain = {
      crew_model: {
        size: crewModel.crew_size,
        rate: crewModel.composite_rate,
        efficiency: crewModel.efficiency_factor,
        tonnage_per_hour: crewModel.tonnage_per_hour
      },
      pick_breakdown: pickBreakdown,
      top_drivers: topDrivers,
      constraints_applied: constraints.length,
      risk_factors_applied: riskFactors.length
    };

    const inputs = {
      picks: picks.map(p => ({
        pick_number: p.pick_number,
        tonnage: p.tonnage,
        estimated_hours: p.estimated_hours
      })),
      crew_model: {
        crew_size: crewModel.crew_size,
        rate: crewModel.composite_rate,
        efficiency: crewModel.efficiency_factor
      },
      constraints: constraints.length,
      risk_factors: riskFactors.length
    };

    // Store computation run
    await base44.asServiceRole.entities.SequenceComputationRun.create({
      project_id: pickPlan.project_id,
      pick_plan_id,
      version: 'v1',
      ran_at,
      inputs_json: JSON.stringify(inputs),
      outputs_json: JSON.stringify(outputs),
      explain_json: JSON.stringify(explain),
      sensitivity_analysis: JSON.stringify(topDrivers)
    });

    // Update pick plan
    await base44.asServiceRole.entities.ErectionPickPlan.update(pick_plan_id, {
      predicted_install_hours: outputs.predicted_install_hours,
      predicted_crane_hours: outputs.predicted_crane_hours,
      predicted_cost: outputs.predicted_cost,
      last_computed_at: ran_at
    });

    return Response.json({
      success: true,
      outputs,
      explain
    });

  } catch (error) {
    console.error('Sequence cost computation error:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});