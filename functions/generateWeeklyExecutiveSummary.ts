import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const today = new Date();
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const dateFilter = weekAgo.toISOString().split('T')[0];

    // Fetch all project data
    const [projects, tasks, rfis, changeOrders, expenses, deliveries, laborHours] = await Promise.all([
      base44.entities.Project.list(),
      base44.entities.Task.list(),
      base44.entities.RFI.list(),
      base44.entities.ChangeOrder.list(),
      base44.entities.Expense.list(),
      base44.entities.Delivery.list(),
      base44.entities.LaborHours.list()
    ]);

    const activeProjects = projects.filter(p => p.status === 'in_progress' || p.status === 'awarded');
    
    // Calculate portfolio metrics
    const totalContractValue = activeProjects.reduce((s, p) => s + (p.contract_value || 0), 0);
    const weeklyExpenses = expenses.filter(e => e.expense_date >= dateFilter);
    const weeklySpend = weeklyExpenses.reduce((s, e) => s + (e.amount || 0), 0);
    
    const weeklyCompletedTasks = tasks.filter(t => 
      t.status === 'completed' && 
      t.updated_date >= dateFilter
    ).length;

    const weeklyLaborHours = laborHours
      .filter(h => h.work_date >= dateFilter)
      .reduce((s, h) => s + (h.hours || 0) + (h.overtime_hours || 0), 0);

    const newRFIsThisWeek = rfis.filter(r => r.created_date >= dateFilter).length;
    const closedRFIsThisWeek = rfis.filter(r => 
      (r.status === 'answered' || r.status === 'closed') && 
      r.updated_date >= dateFilter
    ).length;

    const deliveriesThisWeek = deliveries.filter(d => 
      d.actual_date >= dateFilter || d.scheduled_date >= dateFilter
    ).length;

    // Calculate project health scores
    const projectHealthScores = await Promise.all(
      activeProjects.slice(0, 10).map(async (project) => {
        const projectTasks = tasks.filter(t => t.project_id === project.id);
        const completedTasks = projectTasks.filter(t => t.status === 'completed').length;
        const progress = projectTasks.length > 0 ? (completedTasks / projectTasks.length) * 100 : 0;
        
        const projectRFIs = rfis.filter(r => r.project_id === project.id);
        const openRFIs = projectRFIs.filter(r => !['answered', 'closed'].includes(r.status)).length;
        
        const overdueTasks = projectTasks.filter(t => 
          t.status !== 'completed' && 
          t.end_date && 
          new Date(t.end_date) < today
        ).length;

        const riskScore = (openRFIs * 10) + (overdueTasks * 15);
        const healthScore = Math.max(0, 100 - riskScore);

        return {
          name: project.name,
          number: project.project_number,
          progress,
          healthScore,
          openRFIs,
          overdueTasks,
          status: project.status
        };
      })
    );

    // Top concerns
    const topConcerns = [];
    const overdueRFIs = rfis.filter(r => 
      !['answered', 'closed'].includes(r.status) && 
      r.due_date && 
      new Date(r.due_date) < today
    );
    if (overdueRFIs.length > 0) {
      topConcerns.push(`${overdueRFIs.length} overdue RFIs across projects`);
    }

    const criticalTasks = tasks.filter(t => 
      t.is_critical && 
      t.status !== 'completed' && 
      t.end_date && 
      new Date(t.end_date) < today
    );
    if (criticalTasks.length > 0) {
      topConcerns.push(`${criticalTasks.length} critical path tasks delayed`);
    }

    const highRiskProjects = projectHealthScores.filter(p => p.healthScore < 50);
    if (highRiskProjects.length > 0) {
      topConcerns.push(`${highRiskProjects.length} projects at high risk`);
    }

    // Generate AI forecasts for top projects
    const projectForecasts = await Promise.all(
      activeProjects.slice(0, 3).map(async (proj) => {
        try {
          const forecastResp = await base44.functions.invoke('aiProjectForecast', { project_id: proj.id });
          return {
            project_id: proj.id,
            project_name: proj.name,
            project_number: proj.project_number,
            forecast: forecastResp.data?.forecast
          };
        } catch (err) {
          return null;
        }
      })
    );

    const validForecasts = projectForecasts.filter(f => f && f.forecast);

    // Build summary
    const executiveSummary = {
      period: {
        start: dateFilter,
        end: today.toISOString().split('T')[0],
        type: 'weekly'
      },
      portfolio: {
        active_projects: activeProjects.length,
        total_contract_value: totalContractValue,
        weekly_spend: weeklySpend,
        avg_health_score: projectHealthScores.length > 0 
          ? projectHealthScores.reduce((s, p) => s + p.healthScore, 0) / projectHealthScores.length 
          : 0
      },
      activity: {
        tasks_completed: weeklyCompletedTasks,
        labor_hours: weeklyLaborHours,
        rfis_opened: newRFIsThisWeek,
        rfis_closed: closedRFIsThisWeek,
        deliveries: deliveriesThisWeek
      },
      forecasts: validForecasts,
      top_performers: projectHealthScores
        .filter(p => p.healthScore >= 80)
        .sort((a, b) => b.healthScore - a.healthScore)
        .slice(0, 5),
      concerns: topConcerns,
      projects_needing_attention: projectHealthScores
        .filter(p => p.healthScore < 60 || p.overdueTasks > 0 || p.openRFIs > 5)
        .sort((a, b) => a.healthScore - b.healthScore)
        .slice(0, 5),
      generated_at: today.toISOString(),
      generated_for: user.email
    };

    return Response.json({
      success: true,
      summary: executiveSummary
    });

  } catch (error) {
    console.error('Executive summary error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});