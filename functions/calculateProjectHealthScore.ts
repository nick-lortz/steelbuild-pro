import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

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

    // Fetch all relevant data
    const [project, tasks, financials, rfis, changeOrders, drawingSets] = await Promise.all([
      base44.entities.Project.filter({ id: project_id }),
      base44.entities.Task.filter({ project_id }),
      base44.entities.Financial.filter({ project_id }),
      base44.entities.RFI.filter({ project_id }),
      base44.entities.ChangeOrder.filter({ project_id }),
      base44.entities.DrawingSet.filter({ project_id })
    ]);

    if (!project[0]) {
      return Response.json({ error: 'Project not found' }, { status: 404 });
    }

    const projectData = project[0];
    const today = new Date();

    // 1. SCHEDULE HEALTH (0-100)
    let scheduleScore = 100;
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const overdueTasks = tasks.filter(t => 
      t.status !== 'completed' && 
      t.end_date && 
      new Date(t.end_date) < today
    ).length;
    const criticalTasks = tasks.filter(t => t.is_critical && t.status !== 'completed').length;

    if (totalTasks > 0) {
      const completionRate = completedTasks / totalTasks;
      scheduleScore = completionRate * 100;
      
      // Penalties
      if (overdueTasks > 0) scheduleScore -= (overdueTasks / totalTasks) * 20;
      if (criticalTasks > 0) scheduleScore -= criticalTasks * 5;
    }

    // 2. COST HEALTH (0-100)
    let costScore = 100;
    const totalBudget = financials.reduce((sum, f) => sum + (f.current_budget || 0), 0);
    const totalActual = financials.reduce((sum, f) => sum + (f.actual_amount || 0), 0);
    const costVariance = totalBudget - totalActual;
    const variancePercent = totalBudget > 0 ? (costVariance / totalBudget) * 100 : 0;

    if (variancePercent < -20) costScore = 40; // Over budget by 20%+
    else if (variancePercent < -10) costScore = 60;
    else if (variancePercent < 0) costScore = 80;
    else costScore = 100;

    // 3. QUALITY HEALTH (0-100)
    let qualityScore = 100;
    const openRFIs = rfis.filter(r => !['answered', 'closed'].includes(r.status)).length;
    const overdueRFIs = rfis.filter(r => 
      !['answered', 'closed'].includes(r.status) &&
      r.due_date && 
      new Date(r.due_date) < today
    ).length;
    const pendingCOs = changeOrders.filter(c => c.status === 'pending' || c.status === 'submitted').length;

    if (overdueRFIs > 5) qualityScore -= 30;
    else if (overdueRFIs > 0) qualityScore -= overdueRFIs * 5;
    
    if (openRFIs > 10) qualityScore -= 20;
    else if (openRFIs > 5) qualityScore -= 10;
    
    if (pendingCOs > 3) qualityScore -= 15;

    // 4. DRAWING HEALTH (0-100)
    let drawingScore = 100;
    const totalSets = drawingSets.length;
    const releasedSets = drawingSets.filter(d => d.status === 'FFF' || d.status === 'As-Built').length;
    const overdueSets = drawingSets.filter(d => 
      d.status !== 'FFF' && 
      d.status !== 'As-Built' &&
      d.due_date && 
      new Date(d.due_date) < today
    ).length;

    if (totalSets > 0) {
      const releaseRate = releasedSets / totalSets;
      drawingScore = releaseRate * 100;
      
      if (overdueSets > 0) drawingScore -= (overdueSets / totalSets) * 30;
    }

    // 5. OVERALL HEALTH (weighted average)
    const weights = {
      schedule: 0.35,
      cost: 0.35,
      quality: 0.15,
      drawing: 0.15
    };

    const overallScore = Math.max(0, Math.min(100, 
      scheduleScore * weights.schedule +
      costScore * weights.cost +
      qualityScore * weights.quality +
      drawingScore * weights.drawing
    ));

    // Determine health status
    let status = 'healthy';
    let statusColor = 'green';
    if (overallScore < 50) {
      status = 'critical';
      statusColor = 'red';
    } else if (overallScore < 70) {
      status = 'at_risk';
      statusColor = 'yellow';
    } else if (overallScore < 85) {
      status = 'warning';
      statusColor = 'amber';
    }

    // Key risks
    const risks = [];
    if (overdueTasks > 3) risks.push({ type: 'schedule', message: `${overdueTasks} overdue tasks`, severity: 'high' });
    if (criticalTasks > 0) risks.push({ type: 'schedule', message: `${criticalTasks} critical tasks incomplete`, severity: 'high' });
    if (variancePercent < -10) risks.push({ type: 'cost', message: `Budget overrun: ${Math.abs(variancePercent).toFixed(1)}%`, severity: 'high' });
    if (overdueRFIs > 0) risks.push({ type: 'quality', message: `${overdueRFIs} overdue RFIs`, severity: 'medium' });
    if (overdueSets > 0) risks.push({ type: 'drawing', message: `${overdueSets} overdue drawing sets`, severity: 'medium' });

    return Response.json({
      success: true,
      project_id,
      project_name: projectData.name,
      health: {
        overall_score: Math.round(overallScore),
        status,
        status_color: statusColor,
        components: {
          schedule: Math.round(scheduleScore),
          cost: Math.round(costScore),
          quality: Math.round(qualityScore),
          drawing: Math.round(drawingScore)
        },
        weights
      },
      metrics: {
        schedule: {
          total_tasks: totalTasks,
          completed: completedTasks,
          overdue: overdueTasks,
          critical: criticalTasks,
          completion_rate: totalTasks > 0 ? ((completedTasks / totalTasks) * 100).toFixed(1) : 0
        },
        cost: {
          budget: totalBudget,
          actual: totalActual,
          variance: costVariance,
          variance_percent: variancePercent.toFixed(1)
        },
        quality: {
          open_rfis: openRFIs,
          overdue_rfis: overdueRFIs,
          pending_cos: pendingCOs
        },
        drawing: {
          total_sets: totalSets,
          released: releasedSets,
          overdue: overdueSets,
          release_rate: totalSets > 0 ? ((releasedSets / totalSets) * 100).toFixed(1) : 0
        }
      },
      risks: risks.sort((a, b) => (b.severity === 'high' ? 1 : 0) - (a.severity === 'high' ? 1 : 0)),
      calculated_at: new Date().toISOString()
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});