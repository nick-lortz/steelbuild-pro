import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Triggered by entity changes (RFI, DrawingRevision, Delivery, etc.)
 * Re-evaluates constraints and readiness for affected work packages/tasks
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data } = await req.json();
    
    if (!data?.project_id) {
      return Response.json({ success: false, message: 'No project_id' });
    }

    const projectId = data.project_id;

    // Sync constraints from all project events
    await base44.asServiceRole.functions.invoke('syncConstraintsFromProjectEvents', {
      project_id: projectId
    });

    // Get all erection tasks for this project
    const erectionTasks = await base44.asServiceRole.entities.Task.filter({
      project_id: projectId,
      task_type: 'ERECTION'
    });

    const evaluatedTasks = [];
    const evaluatedWPs = new Set();

    // Re-evaluate each erection task
    for (const task of erectionTasks) {
      try {
        await base44.asServiceRole.functions.invoke('evaluateErectionReadiness', {
          task_id: task.id
        });
        evaluatedTasks.push(task.id);

        // Track work package for rollup
        if (task.work_package_id) {
          evaluatedWPs.add(task.work_package_id);
        }
      } catch (error) {
        console.error(`Failed to evaluate task ${task.id}:`, error.message);
      }
    }

    // Rollup work package readiness
    for (const wpId of evaluatedWPs) {
      try {
        await base44.asServiceRole.functions.invoke('rollupWorkPackageReadiness', {
          work_package_id: wpId
        });
      } catch (error) {
        console.error(`Failed to rollup WP ${wpId}:`, error.message);
      }
    }

    return Response.json({
      success: true,
      event_type: event.type,
      entity_name: event.entity_name,
      project_id: projectId,
      tasks_evaluated: evaluatedTasks.length,
      work_packages_rolled_up: evaluatedWPs.size
    });

  } catch (error) {
    console.error('Trigger constraint evaluation error:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});