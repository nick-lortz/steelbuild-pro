import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { requireProjectAccess } from './utils/requireProjectAccess.js';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { task_id } = await req.json();
    
    if (!task_id) {
      return Response.json({ error: 'task_id required' }, { status: 400 });
    }

    // Get task and verify access
    const tasks = await base44.asServiceRole.entities.Task.filter({ id: task_id });
    const task = tasks[0];
    
    if (!task) {
      return Response.json({ error: 'Task not found' }, { status: 404 });
    }
    
    await requireProjectAccess(base44, user, task.project_id);

    // Fetch OPEN constraints for this task or its work package
    const constraintQuery = {
      project_id: task.project_id,
      status: 'OPEN',
      $or: [
        { task_id: task_id },
        ...(task.work_package_id ? [{
          work_package_id: task.work_package_id,
          scope_type: 'WORK_PACKAGE'
        }] : [])
      ]
    };

    const constraints = await base44.asServiceRole.entities.Constraint.filter(constraintQuery);

    // Count by severity
    const blockers = constraints.filter(c => c.severity === 'BLOCKER');
    const warnings = constraints.filter(c => c.severity === 'WARNING');
    const blockerCount = blockers.length;
    const warningCount = warnings.length;

    // Determine readiness status
    let readinessStatus;
    if (blockerCount > 0) {
      readinessStatus = 'NOT_READY';
    } else if (warningCount > 0) {
      readinessStatus = 'READY_WITH_WARNINGS';
    } else {
      readinessStatus = 'READY';
    }

    // Build drivers from top 5 constraints
    const topConstraints = [...blockers, ...warnings].slice(0, 5);
    const drivers = topConstraints.map(c => {
      const typeLabel = c.constraint_type.replace(/_/g, ' ');
      const notePreview = c.notes ? ` - ${c.notes.substring(0, 50)}` : '';
      return `${typeLabel}${notePreview}`;
    });

    const openConstraintIds = constraints.map(c => c.id);

    // Create or update ErectionReadiness
    const existingReadiness = await base44.asServiceRole.entities.ErectionReadiness.filter({
      task_id
    });

    let readiness;
    if (existingReadiness.length > 0) {
      readiness = await base44.asServiceRole.entities.ErectionReadiness.update(
        existingReadiness[0].id,
        {
          readiness_status: readinessStatus,
          blocker_count: blockerCount,
          warning_count: warningCount,
          open_constraints: openConstraintIds,
          drivers,
          last_evaluated_at: new Date().toISOString()
        }
      );
    } else {
      readiness = await base44.asServiceRole.entities.ErectionReadiness.create({
        project_id: task.project_id,
        task_id,
        work_package_id: task.work_package_id,
        readiness_status: readinessStatus,
        blocker_count: blockerCount,
        warning_count: warningCount,
        open_constraints: openConstraintIds,
        drivers,
        last_evaluated_at: new Date().toISOString()
      });
    }

    // Update Task fields
    const cannotStartReason = readinessStatus === 'NOT_READY' 
      ? drivers.join('; ') 
      : null;

    await base44.asServiceRole.entities.Task.update(task_id, {
      ready_to_start: readinessStatus !== 'NOT_READY',
      cannot_start_reason: cannotStartReason
    });

    return Response.json({
      success: true,
      readiness_id: readiness.id,
      task_id,
      readiness_status: readinessStatus,
      blocker_count: blockerCount,
      warning_count: warningCount,
      drivers,
      ready_to_start: readinessStatus !== 'NOT_READY'
    });

  } catch (error) {
    console.error('Evaluate erection readiness error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});