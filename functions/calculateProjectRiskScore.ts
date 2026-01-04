import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { project_id } = await req.json();

    const [project, tasks, financials, rfis, changeOrders, drawings, risks] = await Promise.all([
      base44.entities.Project.list().then(p => p.find(pr => pr.id === project_id)),
      base44.entities.Task.filter({ project_id }),
      base44.entities.Financial.filter({ project_id }),
      base44.entities.RFI.filter({ project_id }),
      base44.entities.ChangeOrder.filter({ project_id }),
      base44.entities.DrawingSet.filter({ project_id }),
      base44.entities.ProjectRisk.filter({ project_id })
    ]);

    const now = new Date();
    const targetDate = project?.target_completion ? new Date(project.target_completion) : null;
    const daysToCompletion = targetDate ? Math.ceil((targetDate - now) / (1000 * 60 * 60 * 24)) : null;

    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const totalTasks = tasks.length;
    const avgProgress = totalTasks > 0 ? tasks.reduce((sum, t) => sum + (t.progress_percent || 0), 0) / totalTasks : 0;

    const budgetUsed = financials.reduce((sum, f) => sum + (f.actual_amount || 0), 0);
    const budgetTotal = project?.contract_value || 0;
    const budgetPercent = budgetTotal > 0 ? (budgetUsed / budgetTotal) * 100 : 0;

    const overdueRFIs = rfis.filter(r => r.due_date && new Date(r.due_date) < now && ['pending', 'submitted'].includes(r.status)).length;
    const pendingCOs = changeOrders.filter(c => c.status === 'pending').length;
    const overdueDrawings = drawings.filter(d => d.due_date && new Date(d.due_date) < now && !['FFF', 'As-Built'].includes(d.status)).length;
    const openRisks = risks.filter(r => r.status === 'open').length;
    const criticalRisks = risks.filter(r => r.status === 'open' && r.severity === 'critical').length;

    const prompt = `Analyze risk for this structural steel project and calculate a risk score (0-100, where 0=lowest risk, 100=highest risk).

PROJECT: ${project?.name}
CONTRACT VALUE: $${(budgetTotal || 0).toLocaleString()}
TARGET COMPLETION: ${project?.target_completion || 'Not set'}
DAYS TO COMPLETION: ${daysToCompletion || 'Unknown'}

SCHEDULE METRICS:
- Progress: ${avgProgress.toFixed(1)}% average
- Tasks Completed: ${completedTasks}/${totalTasks}
- Status: ${project?.status}

FINANCIAL METRICS:
- Budget Used: ${budgetPercent.toFixed(1)}%
- Actual Costs: $${budgetUsed.toLocaleString()}

RISK INDICATORS:
- Overdue RFIs: ${overdueRFIs}
- Pending Change Orders: ${pendingCOs}
- Overdue Drawings: ${overdueDrawings}
- Open Risks: ${openRisks} (${criticalRisks} critical)

Evaluate these risk factors for structural steel projects:
1. Schedule adherence (progress vs time remaining)
2. Budget performance (spending rate vs progress)
3. Drawing approvals and submittals
4. RFI response times
5. Change order impact
6. Open risk severity

Return JSON:
{
  "overall_risk_score": number 0-100,
  "risk_level": "low" | "medium" | "high" | "critical",
  "risk_factors": [{"category": "string", "score": number 0-100, "description": "string"}],
  "top_concerns": ["string"],
  "trend": "improving" | "stable" | "worsening",
  "recommendation": "string"
}`;

    const response = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          overall_risk_score: { type: "number" },
          risk_level: { type: "string" },
          risk_factors: {
            type: "array",
            items: {
              type: "object",
              properties: {
                category: { type: "string" },
                score: { type: "number" },
                description: { type: "string" }
              }
            }
          },
          top_concerns: { type: "array", items: { type: "string" } },
          trend: { type: "string" },
          recommendation: { type: "string" }
        }
      }
    });

    return Response.json(response);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});