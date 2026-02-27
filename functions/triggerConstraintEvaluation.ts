import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Triggered by Task entity changes.
 * Re-evaluates constraints and readiness for the affected task (and its work package).
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    let body = {};
    try { body = await req.json(); } catch (_) {}

    const event = body.event || {};
    const data = body.data || {};
    const entityId = event.entity_id || data.id;

    // If payload_too_large or data missing project_id, fetch the task directly
    let projectId = data.project_id;
    let taskData = data;

    if (!projectId && entityId) {
      const fetched = await base44.asServiceRole.entities.Task.filter({ id: entityId });
      if (fetched.length) {
        taskData = fetched[0];
        projectId = taskData.project_id;
      }
    }

    if (!projectId) {
      return Response.json({ success: true, message: 'No project_id resolvable — skipping' });
    }

    // --- Re-evaluate constraints for the specific changed task only ---
    let tasksToEvaluate = [];

    if (entityId) {
      const task = await base44.asServiceRole.entities.Task.filter({ id: entityId, project_id: projectId });
      tasksToEvaluate = task || [];
    }

    // Fallback: evaluate all erection tasks for the project
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
        const constraints = await base44.asServiceRole.entities.Constraint.filter({
          project_id: projectId,
          task_id: task.id,
          status: 'open'
        });

        // Auto-close date_dependency/schedule constraints when task has dates set
        if (task.start_date && task.end_date) {
          await Promise.all(
            constraints
              .filter(c => ['date_dependency', 'schedule'].includes(c.constraint_type))
              .map(c => base44.asServiceRole.entities.Constraint.update(c.id, {
                status: 'resolved',
                resolved_at: new Date().toISOString(),
                resolution_notes: 'Auto-resolved: task dates updated'
              }))
          );
        }

        evaluatedTaskIds.push(task.id);
        if (task.work_package_id) evaluatedWPs.add(task.work_package_id);
      } catch (taskError) {
        console.error(`Failed to evaluate task ${task.id}:`, taskError.message);
      }
    }

    // --- Rollup work package readiness inline ---
    const wpResults = await Promise.all(
      Array.from(evaluatedWPs).map(async (wpId) => {
        try {
          const [wpTasks, openConstraints] = await Promise.all([
            base44.asServiceRole.entities.Task.filter({ work_package_id: wpId }),
            base44.asServiceRole.entities.Constraint.filter({ project_id: projectId, status: 'open' })
          ]);

          const wpBlockingConstraints = openConstraints.filter(c =>
            wpTasks.some(t => t.id === c.task_id)
          );

          const readinessStatus = (wpTasks.length > 0 && wpBlockingConstraints.length === 0) ? 'ready' : 'blocked';

          await base44.asServiceRole.entities.WorkPackage.update(wpId, {
            readiness_status: readinessStatus,
            readiness_last_checked: new Date().toISOString()
          });

          return { wp_id: wpId, status: readinessStatus };
        } catch (wpError) {
          console.error(`Failed to rollup WP ${wpId}:`, wpError.message);
          return { wp_id: wpId, status: 'error' };
        }
      })
    );

    return Response.json({
      success: true,
      event_type: event.type,
      entity_name: event.entity_name,
      project_id: projectId,
      tasks_evaluated: evaluatedTaskIds.length,
      work_packages_rolled_up: wpResults
    });

  } catch (error) {
    console.error('triggerConstraintEvaluation error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});