import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { callLLMSafe, preparePayload } from './_lib/aiPolicy.js';
import { requireProjectAccess } from './utils/requireProjectAccess.js';
import { requireRole } from './_lib/authz.js';

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
    
    // Financial forecasting requires PM/Admin/Finance
    requireRole(user, ['admin', 'pm', 'finance']);
    await requireProjectAccess(base44, user, project_id);
    
    const MAX_ITEMS = 500;

    const [project, financials, workPackages, changeOrders, tasks] = await Promise.all([
      base44.asServiceRole.entities.Project.filter({ id: project_id }).then(p => p[0]),
      base44.asServiceRole.entities.Financial.filter({ project_id }, null, MAX_ITEMS),
      base44.asServiceRole.entities.WorkPackage.filter({ project_id }, null, MAX_ITEMS),
      base44.asServiceRole.entities.ChangeOrder.filter({ project_id }, null, MAX_ITEMS),
      base44.asServiceRole.entities.Task.filter({ project_id }, null, MAX_ITEMS)
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
    
    // Use AI for sophisticated forecast (anonymized)
    const prompt = `Analyze construction project cost forecast.

PROJECT PHASE: ${project.phase}
Target: ${project.target_completion || 'Not set'}

FINANCIAL DATA (RATIOS):
- Budget/Actual Ratio: ${(totalBudget > 0 ? totalActual / totalBudget : 0).toFixed(2)}
- Committed %: ${(totalBudget > 0 ? (totalCommitted / totalBudget) * 100 : 0).toFixed(1)}%
- Forecast Variance: ${(totalForecast - totalBudget).toFixed(0)} (magnitude)

PROGRESS:
- Work Package Completion: ${overallProgress.toFixed(1)}%
- Task Completion: ${(taskProgress * 100).toFixed(1)}%

CHANGE ORDERS:
- Approved COs: ${approvedCOs.length} items
- Pending COs: ${pendingCOs.length} items

Provide cost forecast including:
1. Estimated variance percentages (best, likely, worst case)
2. Key cost drivers (categories only, no amounts)
3. Confidence level
4. Risk factors

NO specific dollar amounts in output, NO names.`;

    const forecast = await callLLMSafe(base44, {
      prompt,
      payload: null,
      project_id,
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

    // Return sanitized response (real financials, AI insights)
    return Response.json({
      project_id,
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