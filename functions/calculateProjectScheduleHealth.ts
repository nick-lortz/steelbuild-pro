import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { differenceInDays, isPast, parseISO } from 'npm:date-fns';

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

    // Fetch project and tasks
    const [project, tasks] = await Promise.all([
      base44.asServiceRole.entities.Project.filter({ id: project_id }),
      base44.asServiceRole.entities.Task.filter({ project_id })
    ]);

    if (!project || project.length === 0) {
      return Response.json({ error: 'Project not found' }, { status: 404 });
    }

    const proj = project[0];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Calculate metrics
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const inProgressTasks = tasks.filter(t => t.status === 'in_progress').length;
    const notStartedTasks = tasks.filter(t => t.status === 'not_started').length;
    const blockedTasks = tasks.filter(t => t.status === 'blocked' || t.status === 'on_hold').length;
    
    // Overdue tasks (not completed and past end date)
    const overdueTasks = tasks.filter(t => {
      if (t.status === 'completed' || !t.end_date) return false;
      try {
        const endDate = parseISO(t.end_date);
        return isPast(endDate);
      } catch {
        return false;
      }
    }).length;

    // Calculate overall progress
    const progressPercent = totalTasks > 0 
      ? Math.round((completedTasks / totalTasks) * 100)
      : 0;

    // Calculate weighted progress (based on task progress_percent)
    const weightedProgress = totalTasks > 0
      ? Math.round(tasks.reduce((sum, t) => sum + (t.progress_percent || 0), 0) / totalTasks)
      : 0;

    // Calculate schedule variance (baseline vs current)
    let scheduleVarianceDays = 0;
    let tasksWithBaseline = 0;
    let tasksWithVariance = 0;

    tasks.forEach(t => {
      if (t.baseline_end && t.end_date) {
        try {
          const baselineEnd = parseISO(t.baseline_end);
          const currentEnd = parseISO(t.end_date);
          const variance = differenceInDays(currentEnd, baselineEnd);
          scheduleVarianceDays += variance;
          tasksWithBaseline++;
          if (variance !== 0) tasksWithVariance++;
        } catch {}
      }
    });

    const avgScheduleVariance = tasksWithBaseline > 0 
      ? Math.round(scheduleVarianceDays / tasksWithBaseline)
      : 0;

    // Critical path analysis
    const criticalTasks = tasks.filter(t => t.is_critical).length;
    const criticalOverdue = tasks.filter(t => 
      t.is_critical && 
      t.status !== 'completed' && 
      t.end_date && 
      isPast(parseISO(t.end_date))
    ).length;

    // Phase completion
    const phases = ['detailing', 'fabrication', 'delivery', 'erection', 'closeout'];
    const phaseProgress = {};
    
    phases.forEach(phase => {
      const phaseTasks = tasks.filter(t => t.phase === phase);
      const phaseCompleted = phaseTasks.filter(t => t.status === 'completed').length;
      phaseProgress[phase] = {
        total: phaseTasks.length,
        completed: phaseCompleted,
        percent: phaseTasks.length > 0 ? Math.round((phaseCompleted / phaseTasks.length) * 100) : 0
      };
    });

    // Determine schedule health status
    let healthStatus = 'on_track';
    let healthScore = 100;

    // Penalties for issues
    if (overdueTasks > 0) {
      healthScore -= Math.min(overdueTasks * 5, 30); // Up to -30 for overdue
      healthStatus = 'at_risk';
    }
    
    if (criticalOverdue > 0) {
      healthScore -= Math.min(criticalOverdue * 10, 40); // Up to -40 for critical overdue
      healthStatus = 'delayed';
    }

    if (blockedTasks > 0) {
      healthScore -= Math.min(blockedTasks * 3, 15); // Up to -15 for blocked
      if (healthStatus === 'on_track') healthStatus = 'at_risk';
    }

    if (avgScheduleVariance > 7) {
      healthScore -= Math.min((avgScheduleVariance - 7) * 2, 20); // Up to -20 for variance
      if (healthStatus === 'on_track') healthStatus = 'at_risk';
    }

    // Ensure score is within bounds
    healthScore = Math.max(0, Math.min(100, healthScore));

    // Determine status from score if not already delayed
    if (healthScore >= 80 && healthStatus !== 'delayed') {
      healthStatus = 'on_track';
    } else if (healthScore >= 60 && healthStatus !== 'delayed') {
      healthStatus = 'at_risk';
    } else if (healthScore < 60) {
      healthStatus = 'delayed';
    }

    // Upcoming milestones (next 30 days)
    const thirtyDaysOut = new Date(today);
    thirtyDaysOut.setDate(thirtyDaysOut.getDate() + 30);
    
    const upcomingMilestones = tasks
      .filter(t => t.is_milestone && t.end_date)
      .filter(t => {
        try {
          const endDate = parseISO(t.end_date);
          return endDate >= today && endDate <= thirtyDaysOut;
        } catch {
          return false;
        }
      })
      .map(t => ({
        id: t.id,
        name: t.name,
        end_date: t.end_date,
        status: t.status
      }))
      .sort((a, b) => a.end_date.localeCompare(b.end_date));

    return Response.json({
      project_id,
      project_name: proj.name,
      project_number: proj.project_number,
      calculated_at: new Date().toISOString(),
      
      // Summary metrics
      health_status: healthStatus,
      health_score: healthScore,
      overall_progress: progressPercent,
      weighted_progress: weightedProgress,
      
      // Task counts
      total_tasks: totalTasks,
      completed_tasks: completedTasks,
      in_progress_tasks: inProgressTasks,
      not_started_tasks: notStartedTasks,
      blocked_tasks: blockedTasks,
      overdue_tasks: overdueTasks,
      
      // Schedule metrics
      avg_schedule_variance_days: avgScheduleVariance,
      tasks_with_baseline: tasksWithBaseline,
      tasks_with_variance: tasksWithVariance,
      
      // Critical path
      critical_tasks: criticalTasks,
      critical_overdue: criticalOverdue,
      
      // Phase breakdown
      phase_progress: phaseProgress,
      
      // Milestones
      upcoming_milestones: upcomingMilestones,
      
      // Alerts
      alerts: [
        ...(overdueTasks > 0 ? [{
          type: 'overdue',
          severity: 'high',
          message: `${overdueTasks} task${overdueTasks > 1 ? 's' : ''} overdue`
        }] : []),
        ...(criticalOverdue > 0 ? [{
          type: 'critical_overdue',
          severity: 'critical',
          message: `${criticalOverdue} critical path task${criticalOverdue > 1 ? 's' : ''} overdue`
        }] : []),
        ...(blockedTasks > 0 ? [{
          type: 'blocked',
          severity: 'medium',
          message: `${blockedTasks} task${blockedTasks > 1 ? 's' : ''} blocked or on hold`
        }] : []),
      ]
    });
  } catch (error) {
    console.error('Error calculating schedule health:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});