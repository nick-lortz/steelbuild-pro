import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

function calculateDaysDifference(date1, date2) {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diff = d2 - d1;
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { project_id } = await req.json();
    
    if (!project_id) {
      return Response.json({ error: 'project_id required' }, { status: 400 });
    }

    // Fetch logistics model
    const logisticsModels = await base44.asServiceRole.entities.DeliveryLogistics?.filter({
      project_id,
      is_active: true
    }) || [];
    
    const logistics = logisticsModels[0] || {
      storage_cost_per_ton_day: 5,
      double_handling_cost_per_ton: 50,
      optimal_delivery_window_days: 3,
      critical_lag_threshold_days: 2
    };

    // Fetch crew model for idle cost
    const crewModels = await base44.asServiceRole.entities.CrewModel?.filter({
      project_id,
      is_active: true
    }) || [];
    
    const crewModel = crewModels[0] || {
      crew_size: 4,
      composite_rate: 85
    };
    
    const crewDailyCost = crewModel.crew_size * crewModel.composite_rate * 8; // 8h day

    // Fetch deliveries
    const deliveries = await base44.entities.Delivery.filter({ project_id });
    
    // Fetch tasks (to link deliveries to erection schedule)
    const tasks = await base44.entities.Task?.filter({
      project_id,
      phase: 'erection'
    }) || [];

    const newRisks = [];
    const now = new Date().toISOString();

    for (const delivery of deliveries) {
      // Skip if no scheduled date
      if (!delivery.scheduled_delivery_date) continue;

      // Find linked erection task
      const linkedTask = tasks.find(t => 
        delivery.linked_task_ids?.includes(t.id) ||
        delivery.work_package_id === t.work_package_id
      );

      if (!linkedTask) continue;

      const deliveryDate = new Date(delivery.scheduled_delivery_date);
      const erectionStart = new Date(linkedTask.start_date);
      const daysDiff = calculateDaysDifference(delivery.scheduled_delivery_date, linkedTask.start_date);

      const tonnage = delivery.tonnage || 0;

      // Early delivery (storage cost)
      if (daysDiff > logistics.optimal_delivery_window_days) {
        const daysEarly = daysDiff - logistics.optimal_delivery_window_days;
        const storageCost = daysEarly * tonnage * logistics.storage_cost_per_ton_day;
        
        // Check if needs double handling (laydown full)
        let doubleHandlingCost = 0;
        if (logistics.laydown_capacity_tons && tonnage > logistics.laydown_capacity_tons * 0.5) {
          doubleHandlingCost = tonnage * logistics.double_handling_cost_per_ton;
        }

        newRisks.push({
          project_id,
          delivery_id: delivery.id,
          risk_type: daysEarly > 7 ? 'double_handling' : 'early_storage',
          severity: daysEarly > 14 ? 'high' : daysEarly > 7 ? 'medium' : 'low',
          detected_at: now,
          scheduled_delivery_date: delivery.scheduled_delivery_date,
          erection_start_date: linkedTask.start_date,
          days_early: daysEarly,
          days_late: 0,
          storage_cost: Math.round(storageCost),
          crew_idle_cost: 0,
          double_handling_cost: Math.round(doubleHandlingCost),
          total_cost_impact: Math.round(storageCost + doubleHandlingCost),
          tonnage_affected: tonnage,
          mitigation_status: 'identified'
        });
      }

      // Late delivery (crew idle)
      if (daysDiff < -logistics.critical_lag_threshold_days) {
        const daysLate = Math.abs(daysDiff);
        const crewIdleCost = daysLate * crewDailyCost;

        newRisks.push({
          project_id,
          delivery_id: delivery.id,
          risk_type: 'crew_idle',
          severity: daysLate > 5 ? 'critical' : daysLate > 2 ? 'high' : 'medium',
          detected_at: now,
          scheduled_delivery_date: delivery.scheduled_delivery_date,
          erection_start_date: linkedTask.start_date,
          days_early: 0,
          days_late: daysLate,
          storage_cost: 0,
          crew_idle_cost: Math.round(crewIdleCost),
          double_handling_cost: 0,
          total_cost_impact: Math.round(crewIdleCost),
          tonnage_affected: tonnage,
          crew_affected: linkedTask.assigned_to || 'Crew A',
          mitigation_status: 'identified'
        });
      }

      // Sequencing risk (out of order)
      const taskSequence = linkedTask.dependencies || [];
      if (taskSequence.length > 0) {
        const predecessors = tasks.filter(t => taskSequence.includes(t.id));
        const anyPredecessorLate = predecessors.some(pred => {
          const predDelivery = deliveries.find(d => 
            d.linked_task_ids?.includes(pred.id)
          );
          if (predDelivery && predDelivery.scheduled_delivery_date) {
            return new Date(predDelivery.scheduled_delivery_date) > new Date(delivery.scheduled_delivery_date);
          }
          return false;
        });

        if (anyPredecessorLate) {
          newRisks.push({
            project_id,
            delivery_id: delivery.id,
            risk_type: 'sequencing',
            severity: 'high',
            detected_at: now,
            scheduled_delivery_date: delivery.scheduled_delivery_date,
            erection_start_date: linkedTask.start_date,
            days_early: 0,
            days_late: 0,
            storage_cost: 0,
            crew_idle_cost: 0,
            double_handling_cost: Math.round(tonnage * logistics.double_handling_cost_per_ton * 0.5),
            total_cost_impact: Math.round(tonnage * logistics.double_handling_cost_per_ton * 0.5),
            tonnage_affected: tonnage,
            mitigation_status: 'identified',
            notes: 'Delivery sequence out of order with erection dependencies'
          });
        }
      }
    }

    // Delete old risks for this project
    const oldRisks = await base44.asServiceRole.entities.DeliveryRiskEvent?.filter({ project_id }) || [];
    for (const risk of oldRisks) {
      await base44.asServiceRole.entities.DeliveryRiskEvent.delete(risk.id);
    }

    // Create new risks
    if (newRisks.length > 0) {
      await base44.asServiceRole.entities.DeliveryRiskEvent.bulkCreate(newRisks);
    }

    // Calculate summary
    const totalCostImpact = newRisks.reduce((sum, r) => sum + r.total_cost_impact, 0);
    const criticalCount = newRisks.filter(r => r.severity === 'critical').length;
    const highCount = newRisks.filter(r => r.severity === 'high').length;

    const byType = {};
    for (const risk of newRisks) {
      if (!byType[risk.risk_type]) {
        byType[risk.risk_type] = { count: 0, cost: 0 };
      }
      byType[risk.risk_type].count++;
      byType[risk.risk_type].cost += risk.total_cost_impact;
    }

    return Response.json({
      success: true,
      risks_identified: newRisks.length,
      summary: {
        total_cost_impact: totalCostImpact,
        critical_count: criticalCount,
        high_count: highCount
      },
      by_type: byType
    });

  } catch (error) {
    console.error('Delivery risk computation error:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});