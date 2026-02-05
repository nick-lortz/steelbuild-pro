import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { project_id, date_from, date_to } = await req.json();

    // Fetch relevant data
    const projectQuery = project_id ? { id: project_id } : {};
    const projects = await base44.entities.Project.filter(projectQuery);

    const dateQuery = {
      created_date: {
        $gte: date_from,
        $lte: date_to
      }
    };

    if (project_id) {
      dateQuery.project_id = project_id;
    }

    const [expenses, tasks, rfis, resources, allocations] = await Promise.all([
      base44.entities.Expense.filter({ ...dateQuery }),
      base44.entities.Task.filter({ project_id: project_id || undefined }),
      base44.entities.RFI.filter({ project_id: project_id || undefined }),
      base44.entities.Resource.list(),
      base44.entities.ResourceAllocation.filter({ project_id: project_id || undefined })
    ]);

    // Budget Burn-Down Data
    const budgetData = generateBudgetBurnDown(projects, expenses, date_from, date_to);

    // Schedule Variance Data
    const scheduleData = generateScheduleVariance(tasks, projects);

    // Resource Heatmap Data
    const resourceData = generateResourceHeatmap(allocations, resources, date_from, date_to);

    // Risk Trend Data
    const riskData = generateRiskTrends(rfis, projects, date_from, date_to);

    // Summary Metrics
    const summary = {
      avg_budget_variance: calculateAvgBudgetVariance(projects, expenses),
      schedule_performance: calculateSchedulePerformance(tasks),
      resource_utilization: calculateResourceUtilization(allocations),
      high_risk_count: rfis.filter(r => r.priority === 'high' && r.status !== 'closed').length
    };

    return Response.json({
      budget_data: budgetData,
      schedule_data: scheduleData,
      resource_data: resourceData,
      risk_data: riskData,
      summary
    });

  } catch (error) {
    console.error('Analytics error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function generateBudgetBurnDown(projects, expenses, dateFrom, dateTo) {
  const days = getDaysBetween(dateFrom, dateTo);
  const totalBudget = projects.reduce((sum, p) => sum + (p.contract_value || 0), 0);
  
  return days.map(date => {
    const expensesToDate = expenses.filter(e => new Date(e.expense_date) <= new Date(date));
    const actualCumulative = expensesToDate.reduce((sum, e) => sum + e.amount, 0);
    const plannedCumulative = (totalBudget / days.length) * days.indexOf(date);
    
    return {
      date: formatDate(date),
      planned_cumulative: plannedCumulative,
      actual_cumulative: actualCumulative,
      forecast: actualCumulative * (days.length / (days.indexOf(date) + 1)),
      total_budget: totalBudget,
      variance: actualCumulative - plannedCumulative
    };
  });
}

function generateScheduleVariance(tasks, projects) {
  const phases = ['detailing', 'fabrication', 'delivery', 'erection', 'closeout'];
  
  return phases.map(phase => {
    const phaseTasks = tasks.filter(t => t.phase === phase);
    if (phaseTasks.length === 0) {
      return { phase, planned_progress: 0, actual_progress: 0, variance: 0 };
    }

    const completedTasks = phaseTasks.filter(t => t.status === 'completed').length;
    const actualProgress = (completedTasks / phaseTasks.length) * 100;
    
    const now = new Date();
    const tasksStarted = phaseTasks.filter(t => new Date(t.start_date) <= now).length;
    const plannedProgress = (tasksStarted / phaseTasks.length) * 100;

    return {
      phase,
      planned_progress: Math.round(plannedProgress),
      actual_progress: Math.round(actualProgress),
      variance: Math.round(actualProgress - plannedProgress)
    };
  });
}

function generateResourceHeatmap(allocations, resources, dateFrom, dateTo) {
  const weeks = getWeeksBetween(dateFrom, dateTo);
  const data = [];

  resources.forEach(resource => {
    weeks.forEach(week => {
      const weekAllocations = allocations.filter(a => 
        a.resource_id === resource.id &&
        isDateInWeek(a.start_date, week.start) &&
        isDateInWeek(a.end_date, week.end)
      );

      const utilization = weekAllocations.reduce((sum, a) => 
        sum + (a.allocation_percentage || 0), 0
      );

      data.push({
        resource_name: resource.name,
        week: week.label,
        utilization: Math.min(utilization, 100)
      });
    });
  });

  return data;
}

function generateRiskTrends(rfis, projects, dateFrom, dateTo) {
  const days = getDaysBetween(dateFrom, dateTo);
  
  return days.map(date => {
    const rfisToDate = rfis.filter(r => new Date(r.submitted_date || r.created_date) <= new Date(date));
    
    return {
      date: formatDate(date),
      high_risk: rfisToDate.filter(r => r.priority === 'high' && r.status !== 'closed').length,
      medium_risk: rfisToDate.filter(r => r.priority === 'medium' && r.status !== 'closed').length,
      low_risk: rfisToDate.filter(r => r.priority === 'low' && r.status !== 'closed').length,
      mitigated: rfisToDate.filter(r => r.status === 'closed').length
    };
  });
}

function calculateAvgBudgetVariance(projects, expenses) {
  if (projects.length === 0) return 0;
  
  const variances = projects.map(p => {
    const projectExpenses = expenses.filter(e => e.project_id === p.id);
    const spent = projectExpenses.reduce((sum, e) => sum + e.amount, 0);
    const budget = p.contract_value || 0;
    return budget > 0 ? ((spent - budget) / budget) * 100 : 0;
  });

  return variances.reduce((sum, v) => sum + v, 0) / variances.length;
}

function calculateSchedulePerformance(tasks) {
  if (tasks.length === 0) return 0;
  const completedOnTime = tasks.filter(t => 
    t.status === 'completed' && 
    new Date(t.end_date) >= new Date()
  ).length;
  return (completedOnTime / tasks.length) * 100;
}

function calculateResourceUtilization(allocations) {
  if (allocations.length === 0) return 0;
  const avgUtilization = allocations.reduce((sum, a) => 
    sum + (a.allocation_percentage || 0), 0
  ) / allocations.length;
  return avgUtilization;
}

function getDaysBetween(start, end) {
  const days = [];
  const current = new Date(start);
  const endDate = new Date(end);
  
  while (current <= endDate) {
    days.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  
  return days;
}

function getWeeksBetween(start, end) {
  const weeks = [];
  const current = new Date(start);
  const endDate = new Date(end);
  
  let weekNum = 1;
  while (current <= endDate) {
    const weekStart = new Date(current);
    const weekEnd = new Date(current);
    weekEnd.setDate(weekEnd.getDate() + 6);
    
    weeks.push({
      label: `W${weekNum}`,
      start: weekStart,
      end: weekEnd
    });
    
    current.setDate(current.getDate() + 7);
    weekNum++;
  }
  
  return weeks;
}

function isDateInWeek(date, weekStart, weekEnd) {
  const d = new Date(date);
  return d >= weekStart && d <= weekEnd;
}

function formatDate(date) {
  return new Date(date).toISOString().split('T')[0];
}