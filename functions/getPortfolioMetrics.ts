import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Simple in-memory cache (5 min TTL)
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCacheKey(timeframe, projectIds) {
  return `${timeframe}_${projectIds ? projectIds.sort().join(',') : 'all'}`;
}

function getFromCache(key) {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  cache.delete(key);
  return null;
}

function setCache(key, data) {
  cache.set(key, { data, timestamp: Date.now() });
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { timeframe = '12_months', project_ids } = await req.json();

    // Check cache
    const cacheKey = getCacheKey(timeframe, project_ids);
    const cached = getFromCache(cacheKey);
    if (cached) {
      return Response.json({ ...cached, cached: true });
    }

    // Determine months to include
    const monthsToInclude = timeframe === '3_months' ? 3 : timeframe === '6_months' ? 6 : 12;
    
    // Fetch all required data in parallel
    const [allProjects, allFinancials, allExpenses, allTasks] = await Promise.all([
      base44.asServiceRole.entities.Project.list(),
      base44.asServiceRole.entities.Financial.list(),
      base44.asServiceRole.entities.Expense.list(),
      base44.asServiceRole.entities.Task.list()
    ]);

    // Filter projects if project_ids provided
    const projects = project_ids && project_ids.length > 0
      ? allProjects.filter(p => project_ids.includes(p.id))
      : allProjects;

    const projectIdSet = new Set(projects.map(p => p.id));

    // Filter related data
    const financials = allFinancials.filter(f => projectIdSet.has(f.project_id));
    const expenses = allExpenses.filter(e => projectIdSet.has(e.project_id));
    const tasks = allTasks.filter(t => projectIdSet.has(t.project_id));

    // Generate month labels
    const now = new Date();
    const monthLabels = [];
    for (let i = monthsToInclude - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      monthLabels.push({
        label: date.toLocaleDateString('en-US', { month: 'short' }),
        year: date.getFullYear(),
        month: date.getMonth()
      });
    }

    // Initialize financial trends
    const financialTrends = monthLabels.map(m => ({
      month: m.label,
      budget: 0,
      committed: 0,
      actual: 0
    }));

    // Aggregate financials by month (using created_date as proxy)
    const totalBudget = financials.reduce((sum, f) => sum + (Number(f.budget_amount) || 0), 0);
    const totalCommitted = financials.reduce((sum, f) => sum + (Number(f.committed_amount) || 0), 0);
    const totalActualFinancials = financials.reduce((sum, f) => sum + (Number(f.actual_amount) || 0), 0);
    const totalActualExpenses = expenses
      .filter(e => e.payment_status === 'paid' || e.payment_status === 'approved')
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const totalActual = totalActualFinancials + totalActualExpenses;

    // Distribute financial data across months (simplified - equal distribution)
    const monthlyBudget = totalBudget / monthsToInclude;
    const monthlyCommitted = totalCommitted / monthsToInclude;
    const monthlyActual = totalActual / monthsToInclude;

    for (let i = 0; i < monthsToInclude; i++) {
      financialTrends[i].budget = Math.round(monthlyBudget / 1000); // in thousands
      financialTrends[i].committed = Math.round(monthlyCommitted / 1000);
      financialTrends[i].actual = Math.round(monthlyActual / 1000);
    }

    // Portfolio health metrics
    const activeProjects = projects.filter(p => p.status === 'in_progress').length;
    const budgetUtilization = totalBudget > 0 ? Math.round((totalActual / totalBudget) * 100) : 0;

    // Task metrics
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const onTimeTasks = tasks.filter(t => {
      if (t.status === 'completed') return true;
      if (!t.end_date) return true;
      return new Date(t.end_date) >= new Date();
    }).length;

    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    const scheduleAdherence = totalTasks > 0 ? Math.round((onTimeTasks / totalTasks) * 100) : 100;

    // Project phase value
    const phaseMap = new Map();
    const statusLabels = {
      'bidding': 'BIDDING',
      'awarded': 'AWARDED',
      'in_progress': 'IN PROGRESS',
      'on_hold': 'ON HOLD',
      'completed': 'COMPLETED',
      'closed': 'CLOSED'
    };

    for (const project of projects) {
      const status = project.status || 'unknown';
      const label = statusLabels[status] || status.toUpperCase();
      const value = Number(project.contract_value) || 0;

      if (!phaseMap.has(label)) {
        phaseMap.set(label, { value: 0, count: 0 });
      }

      const current = phaseMap.get(label);
      phaseMap.set(label, {
        value: current.value + value,
        count: current.count + 1
      });
    }

    const projectPhaseValue = Array.from(phaseMap.entries()).map(([phase, data]) => ({
      phase,
      value: Math.round(data.value / 1000), // in thousands
      count: data.count
    }));

    const result = {
      financialTrends,
      portfolioHealth: {
        activeProjects,
        totalBudget: Math.round(totalBudget),
        totalActual: Math.round(totalActual),
        totalCommitted: Math.round(totalCommitted),
        budgetUtilization,
        scheduleAdherence,
        completionRate
      },
      projectPhaseValue
    };

    // Cache the result
    setCache(cacheKey, result);

    return Response.json(result);

  } catch (error) {
    console.error('Error fetching portfolio metrics:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});