import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { project_id } = await req.json();

    const [project, financials, workPackages, changeOrders, tasks] = await Promise.all([
      base44.entities.Project.filter({ id: project_id }).then(p => p[0]),
      base44.entities.Financial.filter({ project_id }),
      base44.entities.WorkPackage.filter({ project_id }),
      base44.entities.ChangeOrder.filter({ project_id }),
      base44.entities.Task.filter({ project_id })
    ]);

    if (!project) {
      return Response.json({ error: 'Project not found' }, { status: 404 });
    }

    // Calculate current financial state
    const totalBudget = financials.reduce((sum, f) => sum + (f.current_budget || 0), 0);
    const totalActual = financials.reduce((sum, f) => sum + (f.actual_amount || 0), 0);
    const totalCommitted = financials.reduce((sum, f) => sum + (f.committed_amount || 0), 0);
    const totalForecast = financials.reduce((sum, f) => sum + (f.forecast_amount || 0), 0);
    
    // Calculate progress
    const overallProgress = workPackages.length > 0 
      ? workPackages.reduce((sum, wp) => sum + (wp.percent_complete || 0), 0) / workPackages.length 
      : 0;

    const taskProgress = tasks.length > 0
      ? tasks.filter(t => t.status === 'completed').length / tasks.length
      : 0;

    // Change order impact
    const approvedCOs = changeOrders.filter(co => co.status === 'approved');
    const totalCOImpact = approvedCOs.reduce((sum, co) => sum + (co.cost_impact || 0), 0);
    const pendingCOs = changeOrders.filter(co => co.status === 'pending' || co.status === 'submitted');
    const potentialCOImpact = pendingCOs.reduce((sum, co) => sum + (co.cost_impact || 0), 0);

    // Cost velocity (burn rate)
    const monthlyBurn = totalActual / Math.max((overallProgress / 100), 0.01); // Extrapolate based on progress
    
    // Use AI for sophisticated forecast
    const forecast = await base44.integrations.Core.InvokeLLM({
      prompt: `Analyze construction project cost forecast.

PROJECT: ${project.name}
Contract Value: $${(project.contract_value || 0).toLocaleString()}
Target Completion: ${project.target_completion || 'Not set'}

FINANCIAL DATA:
- Total Budget: $${totalBudget.toLocaleString()}
- Actual Costs: $${totalActual.toLocaleString()}
- Committed: $${totalCommitted.toLocaleString()}
- Current Forecast: $${totalForecast.toLocaleString()}

PROGRESS:
- Work Package Completion: ${overallProgress.toFixed(1)}%
- Task Completion: ${(taskProgress * 100).toFixed(1)}%

CHANGE ORDERS:
- Approved COs: ${approvedCOs.length} totaling $${totalCOImpact.toLocaleString()}
- Pending COs: ${pendingCOs.length} totaling $${potentialCOImpact.toLocaleString()}

BURN RATE:
- Monthly cost velocity: $${monthlyBurn.toLocaleString()}

Provide cost forecast including:
1. Estimated final cost (best case, likely case, worst case)
2. Projected cost overrun or underrun percentage
3. Key cost drivers (labor, material, change orders, delays)
4. Confidence level (high, medium, low)
5. Risk factors that could affect forecast

Be realistic and data-driven.`,
      response_json_schema: {
        type: "object",
        properties: {
          forecast_best_case: { type: "number" },
          forecast_likely_case: { type: "number" },
          forecast_worst_case: { type: "number" },
          projected_variance_pct: { type: "number" },
          cost_drivers: {
            type: "array",
            items: {
              type: "object",
              properties: {
                driver: { type: "string" },
                impact: { type: "string" },
                amount: { type: "number" }
              }
            }
          },
          confidence: {
            type: "string",
            enum: ["high", "medium", "low"]
          },
          risk_factors: {
            type: "array",
            items: { type: "string" }
          },
          recommendation: { type: "string" }
        }
      }
    });

    return Response.json({
      project_id,
      project_name: project.name,
      current_state: {
        contract_value: project.contract_value,
        total_budget: totalBudget,
        actual_cost: totalActual,
        committed: totalCommitted,
        progress_pct: overallProgress,
        approved_co_impact: totalCOImpact,
        pending_co_impact: potentialCOImpact
      },
      forecast
    });

  } catch (error) {
    console.error('Cost forecast error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});