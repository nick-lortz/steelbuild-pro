import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Advanced financial forecasting with:
 * - Historical cost trend analysis
 * - Burn rate acceleration/deceleration detection
 * - Market trend integration (labor escalation, material inflation)
 * - Multi-scenario analysis (optimistic, realistic, pessimistic)
 * - Variance analysis vs budget and forecast
 * - Cost driver decomposition
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { project_id, include_market_trends = true } = await req.json();

    const [project, financials, expenses, tasks, laborHours, changeOrders, workPackages] = 
      await Promise.all([
        base44.entities.Project.filter({ id: project_id }).then(p => p[0]),
        base44.entities.Financial.filter({ project_id }),
        base44.entities.Expense.filter({ project_id }, '-expense_date'),
        base44.entities.Task.filter({ project_id }),
        base44.entities.LaborHours.filter({ project_id }, '-work_date'),
        base44.entities.ChangeOrder.filter({ project_id }),
        base44.entities.WorkPackage.filter({ project_id })
      ]);

    if (!project) return Response.json({ error: 'Project not found' }, { status: 404 });

    // === HISTORICAL ANALYSIS ===
    const expensesByMonth = {};
    expenses.forEach(e => {
      const month = e.expense_date?.substring(0, 7) || 'unknown';
      if (!expensesByMonth[month]) expensesByMonth[month] = 0;
      expensesByMonth[month] += e.amount || 0;
    });

    const sortedMonths = Object.keys(expensesByMonth).sort();
    const historicalTrend = sortedMonths.map(month => ({
      month,
      amount: expensesByMonth[month]
    }));

    // === BURN RATE ANALYSIS ===
    let burnRateAcceleration = 0;
    if (historicalTrend.length >= 2) {
      const recentBurn = historicalTrend.slice(-3).reduce((sum, m) => sum + m.amount, 0) / 3;
      const earlierBurn = historicalTrend.slice(0, 3).reduce((sum, m) => sum + m.amount, 0) / 3;
      burnRateAcceleration = earlierBurn > 0 ? ((recentBurn - earlierBurn) / earlierBurn) * 100 : 0;
    }

    const totalActual = financials.reduce((sum, f) => sum + (f.actual_amount || 0), 0);
    const totalBudget = financials.reduce((sum, f) => sum + (f.current_budget || 0), 0);
    const totalCommitted = financials.reduce((sum, f) => sum + (f.committed_amount || 0), 0);
    
    // Progress metrics
    const workComplete = workPackages.length > 0
      ? workPackages.reduce((sum, wp) => sum + (wp.percent_complete || 0), 0) / workPackages.length / 100
      : 0;
    const tasksComplete = tasks.length > 0
      ? tasks.filter(t => t.status === 'completed').length / tasks.length
      : 0;

    // Cost drivers by category
    const costsByCategory = {};
    financials.forEach(f => {
      const cat = f.category || 'other';
      if (!costsByCategory[cat]) costsByCategory[cat] = { budget: 0, actual: 0, committed: 0 };
      costsByCategory[cat].budget += f.current_budget || 0;
      costsByCategory[cat].actual += f.actual_amount || 0;
      costsByCategory[cat].committed += f.committed_amount || 0;
    });

    // Variance analysis
    const categoryVariances = Object.entries(costsByCategory).map(([cat, data]) => ({
      category: cat,
      budget: data.budget,
      actual: data.actual,
      committed: data.committed,
      variance: data.budget - data.actual,
      variance_pct: data.budget > 0 ? ((data.budget - data.actual) / data.budget) * 100 : 0,
      spend_rate: data.budget > 0 ? (data.actual / data.budget) * 100 : 0
    })).sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance));

    // === AI SOPHISTICATED FORECAST ===
    const marketContext = include_market_trends 
      ? `Current market conditions (Feb 2026): Steel labor rates +3-5% YoY, material costs stable, supply chain normalized. Typical project escalation 1.5-2% per month.`
      : '';

    const approvedCOs = changeOrders.filter(co => co.status === 'approved');
    const coImpact = approvedCOs.reduce((sum, co) => sum + (co.cost_impact || 0), 0);

    const forecastResponse = await base44.integrations.Core.InvokeLLM({
      prompt: `Sophisticated cost forecast for steel fabrication/erection project.

PROJECT: ${project.name}
Contract: $${(project.contract_value || 0).toLocaleString()}
Phase: ${project.phase || 'fabrication'}
Target Completion: ${project.target_completion || 'TBD'}

CURRENT FINANCIAL STATE (as of today):
- Total Budget (all categories): $${totalBudget.toLocaleString()}
- Actual Costs to Date: $${totalActual.toLocaleString()}
- Committed (POs, contracts): $${totalCommitted.toLocaleString()}
- Remaining Unspent: $${(totalBudget - totalActual - totalCommitted).toLocaleString()}

PROGRESS:
- Work Package Completion: ${(workComplete * 100).toFixed(1)}%
- Task Completion: ${(tasksComplete * 100).toFixed(1)}%
- Pace: ${workComplete > 0 && tasksComplete > 0 ? 'On track' : workComplete > tasksComplete ? 'Ahead on scope' : 'Behind on schedule'}

BURN RATE TREND:
- Recent burn rate acceleration: ${burnRateAcceleration.toFixed(1)}% (${burnRateAcceleration > 0 ? 'accelerating' : 'decelerating'})
- Monthly average: $${(totalActual / Math.max(sortedMonths.length, 1)).toLocaleString()}

COST DRIVERS BY CATEGORY:
${categoryVariances.map(cv => `- ${cv.category}: Budget $${cv.budget.toLocaleString()}, Actual $${cv.actual.toLocaleString()}, ${cv.variance_pct.toFixed(1)}% ${cv.variance_pct > 0 ? 'under' : 'over'} budget`).join('\n')}

CHANGE ORDERS:
- Approved CO impact: $${coImpact.toLocaleString()}
- Pending: ${changeOrders.filter(co => co.status === 'submitted').length} items

MARKET CONTEXT:
${marketContext}

REQUIRED FORECAST OUTPUT:
1. Best-case final cost (optimistic, 20th percentile)
2. Likely-case final cost (realistic, 50th percentile) 
3. Worst-case final cost (pessimistic, 80th percentile)
4. Estimated completion date
5. By-category ETC (estimate to complete) for each cost driver
6. Key risks that could increase final cost
7. Recommended management actions
8. Confidence assessment (high/medium/low)

Provide actionable insights grounded in historical project data and market conditions. Consider remaining work scope, current burn rate trajectory, and market escalation.`,
      
      response_json_schema: {
        type: "object",
        properties: {
          scenarios: {
            type: "array",
            items: {
              type: "object",
              properties: {
                scenario: { type: "string", enum: ["optimistic", "realistic", "pessimistic"] },
                final_cost: { type: "number" },
                variance_from_budget: { type: "number" },
                variance_pct: { type: "number" },
                probability_pct: { type: "number" }
              }
            }
          },
          category_forecasts: {
            type: "array",
            items: {
              type: "object",
              properties: {
                category: { type: "string" },
                budget: { type: "number" },
                actual_to_date: { type: "number" },
                etc: { type: "number" },
                eac: { type: "number" },
                variance: { type: "number" }
              }
            }
          },
          estimated_completion: { type: "string" },
          key_risks: {
            type: "array",
            items: {
              type: "object",
              properties: {
                risk: { type: "string" },
                impact_usd: { type: "number" },
                mitigation: { type: "string" }
              }
            }
          },
          burn_rate_analysis: {
            type: "object",
            properties: {
              current_monthly_burn: { type: "number" },
              projected_monthly_burn_end: { type: "number" },
              acceleration_deceleration: { type: "string" }
            }
          },
          recommended_actions: {
            type: "array",
            items: { type: "string" }
          },
          confidence: { type: "string", enum: ["high", "medium", "low"] },
          confidence_reason: { type: "string" }
        }
      }
    });

    return Response.json({
      project_id,
      project_name: project.name,
      generated_at: new Date().toISOString(),
      current_state: {
        total_budget: totalBudget,
        actual_cost: totalActual,
        committed: totalCommitted,
        remaining_unspent: totalBudget - totalActual - totalCommitted,
        work_complete_pct: (workComplete * 100).toFixed(1),
        cost_complete_pct: totalBudget > 0 ? ((totalActual / totalBudget) * 100).toFixed(1) : 0
      },
      historical_trend: historicalTrend,
      burn_rate_acceleration_pct: burnRateAcceleration.toFixed(2),
      category_variances: categoryVariances,
      forecast: forecastResponse
    });

  } catch (error) {
    console.error('[advancedFinancialForecasting]', error.message);
    return Response.json({ error: 'Forecast failed', details: error.message }, { status: 500 });
  }
});