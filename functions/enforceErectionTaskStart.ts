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

    // Get task
    const tasks = await base44.asServiceRole.entities.Task.filter({ id: task_id });
    const task = tasks[0];
    
    if (!task) {
      return Response.json({ error: 'Task not found' }, { status: 404 });
    }
    
    await requireProjectAccess(base44, user, task.project_id);

    // Only enforce for ERECTION tasks
    if (task.task_type !== 'ERECTION') {
      // Allow start for non-erection tasks
      await base44.asServiceRole.entities.Task.update(task_id, {
        actual_start: new Date().toISOString().split('T')[0],
        status: 'in_progress'
      });

      return Response.json({
        success: true,
        task_id,
        started: true,
        message: 'Non-erection task started'
      });
    }

    // Run readiness evaluation
    const evalResp = await base44.asServiceRole.functions.invoke('evaluateErectionReadiness', {
      task_id
    });

    const evaluation = evalResp.data;

    if (evaluation.readiness_status === 'NOT_READY') {
      // Block start
      return Response.json({
        blocked: true,
        task_id,
        readiness_status: evaluation.readiness_status,
        blocker_count: evaluation.blocker_count,
        drivers: evaluation.drivers,
        message: 'Cannot start: constraints not met',
        constraints_open: evaluation.blocker_count
      }, { status: 403 });
    }

    // Allow start (with or without warnings)
    await base44.asServiceRole.entities.Task.update(task_id, {
      actual_start: new Date().toISOString().split('T')[0],
      status: 'in_progress'
    });

    return Response.json({
      success: true,
      task_id,
      started: true,
      readiness_status: evaluation.readiness_status,
      warning_count: evaluation.warning_count,
      warnings: evaluation.readiness_status === 'READY_WITH_WARNINGS' ? evaluation.drivers : []
    });

  } catch (error) {
    console.error('Enforce task start error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});