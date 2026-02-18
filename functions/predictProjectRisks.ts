import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { requireProjectAccess } from './utils/requireProjectAccess.js';
import { callLLMSafe } from './_lib/aiPolicy.js';

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
    
    await requireProjectAccess(base44, user, project_id);
    const MAX_ITEMS = 500;

    // Fetch project data (capped)
    const projects = await base44.asServiceRole.entities.Project.filter({ id: project_id });
    const project = projects[0];

    if (!project) {
      return Response.json({ error: 'Project not found' }, { status: 404 });
    }

    // Fetch related data
    const [workPackages, tasks, drawingSets, fabrications, deliveries, financials] = await Promise.all([
      base44.asServiceRole.entities.WorkPackage.filter({ project_id }, null, MAX_ITEMS),
      base44.asServiceRole.entities.Task.filter({ project_id }, null, MAX_ITEMS),
      base44.asServiceRole.entities.DrawingSet.filter({ project_id }, null, MAX_ITEMS),
      base44.asServiceRole.entities.Fabrication.filter({ project_id }, null, MAX_ITEMS),
      base44.asServiceRole.entities.Delivery.filter({ project_id }, null, MAX_ITEMS),
      base44.asServiceRole.entities.Financial.filter({ project_id }, null, MAX_ITEMS)
    ]);

    // Calculate risk metrics
    const today = new Date().toISOString().split('T')[0];
    
    // Schedule risk
    const overdueTasks = tasks.filter(t => t.end_date < today && t.status !== 'completed');
    const taskCompletionRate = tasks.length > 0 ? tasks.filter(t => t.status === 'completed').length / tasks.length : 0;
    const avgProgressPercent = tasks.length > 0 ? tasks.reduce((sum, t) => sum + (t.progress_percent || 0), 0) / tasks.length : 0;
    
    // Drawing risk
    const overdueDrawings = drawingSets.filter(d => d.due_date && d.due_date < today && d.status !== 'FFF');
    const drawingApprovalRate = drawingSets.length > 0 ? drawingSets.filter(d => d.status === 'FFF').length / drawingSets.length : 0;
    
    // Fabrication risk
    const delayedFab = fabrications.filter(f => f.target_completion && f.target_completion < today && f.fabrication_status !== 'completed');
    const fabCompletionRate = fabrications.length > 0 ? fabrications.filter(f => f.fabrication_status === 'completed').length / fabrications.length : 0;
    
    // Delivery risk
    const lateDeliveries = deliveries.filter(d => d.scheduled_date < today && d.delivery_status !== 'delivered');
    const onTimeDeliveryRate = deliveries.filter(d => d.delivery_status === 'delivered').length > 0
      ? deliveries.filter(d => d.delivery_status === 'delivered' && (!d.actual_date || d.actual_date <= d.scheduled_date)).length / deliveries.filter(d => d.delivery_status === 'delivered').length
      : 1;
    
    // Cost risk
    const budgetVariance = financials.reduce((sum, f) => sum + ((f.actual_amount || 0) - (f.current_budget || 0)), 0);
    const budgetTotal = financials.reduce((sum, f) => sum + (f.current_budget || 0), 0);
    const costOverrunPct = budgetTotal > 0 ? (budgetVariance / budgetTotal) * 100 : 0;

    // Predictive analysis using AI (anonymized)
    const prediction = await callLLMSafe(base44, {
      prompt: `You are analyzing a structural steel construction project for risk prediction.

Target Completion: ${project.target_completion || 'Not set'}
Current Phase: ${project.phase}

SCHEDULE METRICS:
- Total tasks: ${tasks.length}
- Overdue tasks: ${overdueTasks.length}
- Completion rate: ${(taskCompletionRate * 100).toFixed(1)}%
- Avg progress: ${avgProgressPercent.toFixed(1)}%

DRAWING METRICS:
- Total drawing sets: ${drawingSets.length}
- Overdue drawings: ${overdueDrawings.length}
- Approval rate (FFF): ${(drawingApprovalRate * 100).toFixed(1)}%

FABRICATION METRICS:
- Total packages: ${fabrications.length}
- Delayed packages: ${delayedFab.length}
- Completion rate: ${(fabCompletionRate * 100).toFixed(1)}%

DELIVERY METRICS:
- Total deliveries: ${deliveries.length}
- Late deliveries: ${lateDeliveries.length}
- On-time delivery rate: ${(onTimeDeliveryRate * 100).toFixed(1)}%

COST METRICS:
- Budget variance: ${costOverrunPct.toFixed(1)}%

Based on these metrics, predict (NO PII, NO names):
1. Probability of project delay (low, medium, high) and estimated days at risk
2. Top 3 critical risks (schedule, cost, quality, coordination)
3. Recommended actions to mitigate risks
4. Cost forecast at completion (likely final cost overrun %)

Be specific and construction-focused. Think like a PM analyzing project health.`,
      payload: null,
      project_id,
      response_json_schema: {
        type: "object",
        properties: {
          delay_probability: {
            type: "string",
            enum: ["low", "medium", "high", "critical"]
          },
          estimated_delay_days: {
            type: "number"
          },
          critical_risks: {
            type: "array",
            items: {
              type: "object",
              properties: {
                category: { type: "string" },
                description: { type: "string" },
                impact: { type: "string" },
                mitigation: { type: "string" }
              }
            }
          },
          recommended_actions: {
            type: "array",
            items: { type: "string" }
          },
          cost_forecast_overrun_pct: {
            type: "number"
          },
          overall_health_score: {
            type: "number",
            description: "0-100 score"
          }
        }
      }
    });

    return Response.json({
      project_id,
      metrics: {
        schedule: {
          total_tasks: tasks.length,
          overdue_tasks: overdueTasks.length,
          completion_rate: taskCompletionRate,
          avg_progress: avgProgressPercent
        },
        drawings: {
          total: drawingSets.length,
          overdue: overdueDrawings.length,
          approval_rate: drawingApprovalRate
        },
        fabrication: {
          total: fabrications.length,
          delayed: delayedFab.length,
          completion_rate: fabCompletionRate
        },
        delivery: {
          total: deliveries.length,
          late: lateDeliveries.length,
          on_time_rate: onTimeDeliveryRate
        },
        cost: {
          budget_total: budgetTotal,
          budget_variance: budgetVariance,
          overrun_pct: costOverrunPct
        }
      },
      prediction
    });

  } catch (error) {
    console.error('Risk prediction error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});