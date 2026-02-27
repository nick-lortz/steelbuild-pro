import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Triggered by Task entity changes.
 * Re-evaluates constraints and readiness for the affected task (and its work package).
 * Runs logic inline instead of chaining other function invocations to avoid 404/503 failures.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { event, data } = body;

    if (!data?.project_id) {
      return Response.json({ success: false, message: 'No project_id in payload' });
    }

    const projectId = data.project_id;
    const entityId = event?.entity_id || data?.id;

    // --- Re-evaluate constraints for the specific changed task only ---
    let tasksToEvaluate = [];

    if (entityId) {
      // Single task changed — only re-evaluate that task
      const task = await base44.asServiceRole.entities.Task.filter({ id: entityId, project_id: projectId });
      tasksToEvaluate = task || [];
    }

    // Fallback: if we couldn't resolve the specific task, evaluate all erection tasks
    if (tasksToEvaluate.length === 0) {
      tasksToEvaluate = await base44.asServiceRole.entities.Task.filter({
        project_id: projectId,
        task_type: 'erection'
      });
    }

    const evaluatedTaskIds = [];
    const evaluatedWPs = new Set();

    for (const task of tasksToEvaluate) {
      try {
        // Resolve open constraints for this task
        const constraints = await base44.asServiceRole.entities.Constraint.filter({
          project_id: projectId,
          task_id: task.id,
          status: 'open'
        });

        // If task now has dates set, auto-close constraints that were waiting on them
        if (task.start_date && task.end_date) {
          for (const c of constraints) {
            if (c.constraint_type === 'date_dependency' || c.constraint_type === 'schedule') {
              await base44.asServiceRole.entities.Constraint.update(c.id, {
                status: 'resolved',
                resolved_at: new Date().toISOString(),
                resolution_notes: 'Auto-resolved: task dates updated'
              });
            }
          }
        }

        evaluatedTaskIds.push(task.id);

        if (task.work_package_id) {
          evaluatedWPs.add(task.work_package_id);
        }
      } catch (taskError) {
        console.error(`Failed to evaluate task ${task.id}:`, taskError.message);
      }
    }

    // --- Rollup work package readiness inline ---
    const wpResults = [];
    for (const wpId of evaluatedWPs) {
      try {
        const wpTasks = await base44.asServiceRole.entities.Task.filter({
          work_package_id: wpId
        });

        const openConstraints = await base44.asServiceRole.entities.Constraint.filter({
          project_id: projectId,
          status: 'open'
        });
        const wpBlockingConstraints = openConstraints.filter(c =>
          wpTasks.some(t => t.id === c.task_id)
        );

        const allTasksReady = wpTasks.length > 0 && wpBlockingConstraints.length === 0;
        const readinessStatus = allTasksReady ? 'ready' : 'blocked';

        await base44.asServiceRole.entities.WorkPackage.update(wpId, {
          readiness_status: readinessStatus,
          readiness_last_checked: new Date().toISOString()
        });

        wpResults.push({ wp_id: wpId, status: readinessStatus });
      } catch (wpError) {
        console.error(`Failed to rollup WP ${wpId}:`, wpError.message);
      }
    }

    return Response.json({
      success: true,
      event_type: event?.type,
      entity_name: event?.entity_name,
      project_id: projectId,
      tasks_evaluated: evaluatedTaskIds.length,
      work_packages_rolled_up: wpResults
    });

  } catch (error) {
    console.error('triggerConstraintEvaluation error:', error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});