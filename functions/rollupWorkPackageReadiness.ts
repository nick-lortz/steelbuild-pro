import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { requireProjectAccess } from './utils/requireProjectAccess.js';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { work_package_id } = await req.json();
    
    if (!work_package_id) {
      return Response.json({ error: 'work_package_id required' }, { status: 400 });
    }

    // Get work package
    const workPackages = await base44.asServiceRole.entities.WorkPackage.filter({ id: work_package_id });
    const workPackage = workPackages[0];
    
    if (!workPackage) {
      return Response.json({ error: 'Work package not found' }, { status: 404 });
    }
    
    await requireProjectAccess(base44, user, workPackage.project_id);

    // Fetch all ERECTION tasks for this work package
    const erectionTasks = await base44.asServiceRole.entities.Task.filter({
      work_package_id,
      task_type: 'ERECTION'
    });

    if (erectionTasks.length === 0) {
      // No erection tasks, mark as READY
      await base44.asServiceRole.entities.WorkPackage.update(work_package_id, {
        lookahead_ready: 'READY',
        lookahead_blockers: 0,
        lookahead_warnings: 0
      });

      return Response.json({
        success: true,
        work_package_id,
        lookahead_ready: 'READY',
        message: 'No erection tasks found'
      });
    }

    // Get readiness for all erection tasks
    const taskIds = erectionTasks.map(t => t.id);
    const readinessRecords = await base44.asServiceRole.entities.ErectionReadiness.filter({
      task_id: { $in: taskIds }
    });

    // Rollup logic
    const hasNotReady = readinessRecords.some(r => r.readiness_status === 'NOT_READY');
    const hasWarnings = readinessRecords.some(r => r.readiness_status === 'READY_WITH_WARNINGS');

    let wpReadiness;
    if (hasNotReady) {
      wpReadiness = 'NOT_READY';
    } else if (hasWarnings) {
      wpReadiness = 'READY_WITH_WARNINGS';
    } else {
      wpReadiness = 'READY';
    }

    // Count total blockers and warnings
    const totalBlockers = readinessRecords.reduce((sum, r) => sum + (r.blocker_count || 0), 0);
    const totalWarnings = readinessRecords.reduce((sum, r) => sum + (r.warning_count || 0), 0);

    // Update WorkPackage
    await base44.asServiceRole.entities.WorkPackage.update(work_package_id, {
      lookahead_ready: wpReadiness,
      lookahead_blockers: totalBlockers,
      lookahead_warnings: totalWarnings
    });

    return Response.json({
      success: true,
      work_package_id,
      lookahead_ready: wpReadiness,
      lookahead_blockers: totalBlockers,
      lookahead_warnings: totalWarnings,
      evaluated_tasks: erectionTasks.length
    });

  } catch (error) {
    console.error('Rollup work package readiness error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});