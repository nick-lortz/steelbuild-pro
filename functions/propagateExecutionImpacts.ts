import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * IMPACT PROPAGATION ENGINE
 * Re-evaluates all execution tasks when RFI, CO, or Approval changes
 * Automatically updates readiness states and generates alerts
 * 
 * Triggered by: RFI status change, CO approval, Submittal approval
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { 
      project_id,
      trigger_entity_type,
      trigger_entity_id
    } = await req.json();

    if (!project_id || !trigger_entity_type || !trigger_entity_id) {
      return Response.json({ 
        error: 'project_id, trigger_entity_type, trigger_entity_id required' 
      }, { status: 400 });
    }

    // Get trigger entity to determine impact scope
    const triggerEntities = await base44.asServiceRole.entities[trigger_entity_type].filter({ 
      id: trigger_entity_id 
    });
    
    if (!triggerEntities.length) {
      return Response.json({ error: 'Trigger entity not found' }, { status: 404 });
    }

    const triggerEntity = triggerEntities[0];

    // Determine affected entities
    let affectedEntities = [];

    if (trigger_entity_type === 'RFI') {
      // Get work packages affected by this RFI
      const affectedWPIds = triggerEntity.affects_work_package_ids || [];
      const affectedDeliveryIds = triggerEntity.affects_delivery_ids || [];

      if (affectedWPIds.length > 0) {
        const wps = await base44.asServiceRole.entities.WorkPackage.filter({
          id: { $in: affectedWPIds }
        });
        affectedEntities.push(...wps.map(wp => ({
          type: 'WorkPackage',
          id: wp.id,
          entity: wp
        })));
      }

      if (affectedDeliveryIds.length > 0) {
        const deliveries = await base44.asServiceRole.entities.Delivery.filter({
          id: { $in: affectedDeliveryIds }
        });
        affectedEntities.push(...deliveries.map(d => ({
          type: 'Delivery',
          id: d.id,
          entity: d
        })));
      }
    } else if (trigger_entity_type === 'ChangeOrder') {
      // Get linked work packages
      const lineItems = await base44.asServiceRole.entities.ChangeOrderLineItem.filter({
        change_order_id: trigger_entity_id
      });

      const linkedWPIds = [];
      lineItems.forEach(item => {
        if (item.linked_work_package_ids) {
          linkedWPIds.push(...item.linked_work_package_ids);
        }
      });

      if (linkedWPIds.length > 0) {
        const wps = await base44.asServiceRole.entities.WorkPackage.filter({
          id: { $in: linkedWPIds }
        });
        affectedEntities.push(...wps.map(wp => ({
          type: 'WorkPackage',
          id: wp.id,
          entity: wp
        })));
      }
    }

    // Re-evaluate each affected entity
    const results = {
      affected_entities: affectedEntities.length,
      reevaluated: 0,
      state_changes: [],
      alerts_generated: 0
    };

    for (const affected of affectedEntities) {
      try {
        const response = await base44.asServiceRole.functions.invoke('evaluateExecutionReadiness', {
          project_id,
          source_entity_type: affected.type,
          source_entity_id: affected.id
        });

        if (response.data?.success) {
          results.reevaluated++;

          const executionTask = response.data.execution_task;
          const previousState = executionTask.state_history?.[executionTask.state_history.length - 2];

          // Check if state degraded (Ready → Conditional/Blocked)
          if (previousState && 
              previousState.from_state === 'Ready' && 
              ['Conditional', 'Blocked'].includes(executionTask.readiness_status)) {
            
            results.state_changes.push({
              entity_type: affected.type,
              entity_id: affected.id,
              from_state: previousState.from_state,
              to_state: executionTask.readiness_status,
              reason: executionTask.ai_reasoning
            });

            // Generate execution risk alert
            await base44.asServiceRole.entities.Alert.create({
              project_id,
              alert_type: 'execution_risk',
              severity: executionTask.readiness_status === 'Blocked' ? 'critical' : 'high',
              title: `Execution Risk: ${affected.type} readiness degraded`,
              message: `${affected.entity.title || affected.entity.package_name} moved from Ready to ${executionTask.readiness_status} due to: ${executionTask.ai_reasoning}`,
              entity_type: affected.type,
              entity_id: affected.id,
              days_open: 0,
              recommended_action: executionTask.recommended_action,
              status: 'active',
              auto_generated: true
            });

            results.alerts_generated++;
          }
        }
      } catch (error) {
        console.error(`Error re-evaluating ${affected.type} ${affected.id}:`, error.message);
      }
    }

    return Response.json({
      success: true,
      trigger: {
        type: trigger_entity_type,
        id: trigger_entity_id
      },
      ...results
    });

  } catch (error) {
    console.error('[propagateExecutionImpacts] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});