import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * 10-14 DAY LOOKAHEAD EXECUTION SCAN
 * Daily background process that evaluates execution readiness
 * for all tasks within lookahead window
 * 
 * Run via automation: daily at 6am
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Service role for background automation
    const now = new Date();
    const lookaheadStart = now;
    const lookaheadEnd = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

    // Get all active projects
    const projects = await base44.asServiceRole.entities.Project.filter({
      status: { $in: ['awarded', 'in_progress'] }
    });

    const results = {
      projects_scanned: projects.length,
      tasks_evaluated: 0,
      blocked_tasks: 0,
      conditional_tasks: 0,
      ready_tasks: 0,
      alerts_generated: 0
    };

    for (const project of projects) {
      // Get entities in lookahead window
      const [workPackages, deliveries, tasks] = await Promise.all([
        base44.asServiceRole.entities.WorkPackage.filter({
          project_id: project.id,
          install_day: {
            $gte: lookaheadStart.toISOString().split('T')[0],
            $lte: lookaheadEnd.toISOString().split('T')[0]
          }
        }),
        base44.asServiceRole.entities.Delivery.filter({
          project_id: project.id,
          scheduled_date: {
            $gte: lookaheadStart.toISOString().split('T')[0],
            $lte: lookaheadEnd.toISOString().split('T')[0]
          }
        }),
        base44.asServiceRole.entities.Task.filter({
          project_id: project.id,
          start_date: {
            $gte: lookaheadStart.toISOString().split('T')[0],
            $lte: lookaheadEnd.toISOString().split('T')[0]
          }
        })
      ]);

      // Evaluate each entity
      const evaluations = [];

      for (const wp of workPackages) {
        try {
          const response = await base44.asServiceRole.functions.invoke('evaluateExecutionReadiness', {
            project_id: project.id,
            source_entity_type: 'WorkPackage',
            source_entity_id: wp.id,
            execution_gate: 'Install'
          });

          if (response.data?.success) {
            evaluations.push(response.data.evaluation);
            results.tasks_evaluated++;

            const status = response.data.evaluation.readiness_status;
            if (status === 'Blocked') results.blocked_tasks++;
            else if (status === 'Conditional') results.conditional_tasks++;
            else if (status === 'Ready') results.ready_tasks++;

            // Generate alert if blocked or conditional within 7 days
            if ((status === 'Blocked' || status === 'Conditional') && 
                response.data.evaluation.days_until_execution <= 7) {
              await generateExecutionAlert(base44, project.id, wp, response.data.evaluation);
              results.alerts_generated++;
            }
          }
        } catch (error) {
          console.error(`Error evaluating WP ${wp.id}:`, error.message);
        }
      }

      for (const delivery of deliveries) {
        try {
          const response = await base44.asServiceRole.functions.invoke('evaluateExecutionReadiness', {
            project_id: project.id,
            source_entity_type: 'Delivery',
            source_entity_id: delivery.id,
            execution_gate: 'Ship'
          });

          if (response.data?.success) {
            evaluations.push(response.data.evaluation);
            results.tasks_evaluated++;

            const status = response.data.evaluation.readiness_status;
            if (status === 'Blocked') results.blocked_tasks++;
            else if (status === 'Conditional') results.conditional_tasks++;
            else if (status === 'Ready') results.ready_tasks++;

            if ((status === 'Blocked' || status === 'Conditional') && 
                response.data.evaluation.days_until_execution <= 7) {
              await generateExecutionAlert(base44, project.id, delivery, response.data.evaluation);
              results.alerts_generated++;
            }
          }
        } catch (error) {
          console.error(`Error evaluating Delivery ${delivery.id}:`, error.message);
        }
      }
    }

    return Response.json({
      success: true,
      scan_timestamp: now.toISOString(),
      ...results
    });

  } catch (error) {
    console.error('[lookaheadExecutionScan] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function generateExecutionAlert(base44, project_id, entity, evaluation) {
  const alertType = evaluation.execution_gate === 'Install' 
    ? 'install_readiness_risk'
    : evaluation.execution_gate === 'Ship'
    ? 'delivery_risk'
    : 'fabrication_hold';

  const severity = evaluation.readiness_status === 'Blocked' ? 'critical' : 'high';

  const message = `${entity.title || entity.package_name}: ${evaluation.ai_reasoning}`;

  const recommendedActions = [
    ...evaluation.required_gc_actions,
    ...evaluation.blocking_dependencies.map(b => b.description)
  ];

  await base44.asServiceRole.entities.Alert.create({
    project_id,
    alert_type: alertType,
    severity,
    title: `Execution Risk: ${evaluation.execution_gate} Gate ${evaluation.readiness_status}`,
    message,
    entity_type: entity.phase ? 'WorkPackage' : 'Delivery',
    entity_id: entity.id,
    days_open: 0,
    recommended_action: recommendedActions.join('; '),
    status: 'active',
    auto_generated: true
  });
}