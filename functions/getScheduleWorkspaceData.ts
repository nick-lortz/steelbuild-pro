import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId } = await req.json();

    if (!projectId) {
      return Response.json({ 
        error: 'Project ID required',
        snapshot: {},
        tasks: [],
        exceptions: {},
        ai: { summary: 'No project selected', flags: [], recommendations: [], confidence: 'low', missingDataReasons: ['No project'] },
        warnings: ['No project selected'],
        lastUpdated: new Date().toISOString()
      }, { status: 400 });
    }

    const project = (await base44.entities.Project.filter({ id: projectId }))[0];
    if (!project) {
      return Response.json({ error: 'Project not found' }, { status: 404 });
    }

    const tasks = await base44.entities.Task.filter({ project_id: projectId }, 'start_date');

    const warnings = [];
    if (tasks.length === 0) warnings.push('No tasks in schedule');

    const now = new Date();
    const today = now.toISOString().split('T')[0];

    // Snapshot metrics
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const overdueTasks = tasks.filter(t => 
      t.status !== 'completed' && 
      t.end_date && 
      t.end_date < today
    ).length;

    // Critical path detection (simplified: tasks marked as critical)
    const criticalTasks = tasks.filter(t => t.is_critical).length;

    // Schedule variance (baseline vs current)
    let totalVarianceDays = 0;
    let varianceCount = 0;
    tasks.forEach(t => {
      if (t.baseline_end && t.end_date) {
        const baselineEnd = new Date(t.baseline_end);
        const currentEnd = new Date(t.end_date);
        const variance = (currentEnd - baselineEnd) / (24 * 60 * 60 * 1000);
        totalVarianceDays += variance;
        varianceCount++;
      }
    });
    const avgScheduleVariance = varianceCount > 0 ? Math.round(totalVarianceDays / varianceCount) : 0;

    // Build enhanced task list
    const enhancedTasks = tasks.map(t => {
      const predecessors = (t.predecessor_ids || []).map(pid => {
        const pred = tasks.find(pt => pt.id === pid);
        return pred ? { id: pred.id, name: pred.name, status: pred.status } : null;
      }).filter(Boolean);

      const successors = tasks.filter(st => 
        (st.predecessor_ids || []).includes(t.id)
      ).map(s => ({ id: s.id, name: s.name }));

      return {
        id: t.id,
        name: t.name,
        start: t.start_date,
        end: t.end_date,
        baseline_start: t.baseline_start,
        baseline_end: t.baseline_end,
        progress_pct: Number(t.progress_percent) || 0,
        status: t.status || 'not_started',
        predecessors,
        successors,
        isCritical: t.is_critical || false,
        owner: t.assigned_resources?.[0] || 'Unassigned',
        phase: t.phase,
        duration_days: t.duration_days
      };
    });

    // Exceptions
    const invalidDates = tasks.filter(t => {
      if (!t.start_date || !t.end_date) return true;
      return new Date(t.end_date) < new Date(t.start_date);
    });

    const missingPredecessors = tasks.filter(t => 
      (t.predecessor_ids || []).some(pid => !tasks.find(pt => pt.id === pid))
    );

    const criticalAtRisk = enhancedTasks.filter(t => 
      t.isCritical && 
      t.status !== 'completed' &&
      (t.end < today || (t.progress_pct < 50 && t.end && new Date(t.end) < new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)))
    );

    // AI analysis
    const flags = criticalAtRisk.slice(0, 5).map(t => ({
      task_id: t.id,
      task_name: t.name,
      risk: 'Critical path task at risk',
      reason: t.end < today ? 'Overdue' : 'Low progress with near deadline'
    }));

    const recommendations = [
      overdueTasks > 0 && {
        action: `Update ${overdueTasks} overdue tasks - revise dates or mark complete`,
        priority: 'critical',
        impact: 'Restore schedule accuracy'
      },
      invalidDates.length > 0 && {
        action: `Fix ${invalidDates.length} tasks with invalid dates`,
        priority: 'high',
        impact: 'Enable critical path calculation'
      },
      tasks.filter(t => !t.baseline_start || !t.baseline_end).length > 0 && {
        action: 'Set baselines for tasks without them',
        priority: 'medium',
        impact: 'Enable variance tracking'
      }
    ].filter(Boolean);

    const missingDataReasons = [];
    if (tasks.length === 0) missingDataReasons.push('No tasks');
    if (tasks.filter(t => !t.baseline_start).length === tasks.length) {
      missingDataReasons.push('No baselines set');
    }

    return Response.json({
      project: {
        id: project.id,
        name: project.name,
        project_number: project.project_number
      },
      snapshot: {
        totalTasks,
        completedTasks,
        overdueTasks,
        criticalTasks,
        avgScheduleVariance
      },
      tasks: enhancedTasks,
      exceptions: {
        overdue: tasks.filter(t => t.status !== 'completed' && t.end_date && t.end_date < today).map(t => ({ id: t.id, name: t.name, end: t.end_date })),
        invalidDates: invalidDates.map(t => ({ id: t.id, name: t.name, start: t.start_date, end: t.end_date })),
        missingPredecessors: missingPredecessors.map(t => ({ id: t.id, name: t.name })),
        criticalAtRisk: criticalAtRisk.map(t => ({ id: t.id, name: t.name, end: t.end, progress: t.progress_pct }))
      },
      ai: {
        summary: overdueTasks > 0 ? `${overdueTasks} tasks overdue - schedule behind` :
                 criticalAtRisk.length > 0 ? `${criticalAtRisk.length} critical tasks at risk` :
                 'Schedule on track',
        flags,
        recommendations,
        confidence: tasks.length > 10 && tasks.filter(t => t.baseline_start).length > 5 ? 'high' : 'medium',
        missingDataReasons
      },
      warnings,
      lastUpdated: new Date().toISOString()
    });

  } catch (error) {
    console.error('getScheduleWorkspaceData error:', error);
    return Response.json({ 
      error: error.message,
      details: error.stack 
    }, { status: 500 });
  }
});