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

    // Fetch comprehensive project data
    const projects = await base44.entities.Project.filter({ id: project_id });
    const project = projects[0];

    if (!project) {
      return Response.json({ error: 'Project not found' }, { status: 404 });
    }

    const [tasks, rfis, changeOrders, drawingSets, financials, expenses, deliveries, dailyLogs] = await Promise.all([
      base44.entities.Task.filter({ project_id }),
      base44.entities.RFI.filter({ project_id }),
      base44.entities.ChangeOrder.filter({ project_id }),
      base44.entities.DrawingSet.filter({ project_id }),
      base44.entities.Financial.filter({ project_id }),
      base44.entities.Expense.filter({ project_id }),
      base44.entities.Delivery.filter({ project_id }),
      base44.entities.DailyLog.filter({ project_id })
    ]);

    // Calculate metrics
    const today = new Date().toISOString().split('T')[0];
    const overdueTasks = tasks.filter(t => t.status !== 'completed' && t.end_date < today);
    const overdueRFIs = rfis.filter(r => r.status !== 'closed' && r.due_date && r.due_date < today);
    const escalatedRFIs = rfis.filter(r => r.escalation_flag);
    const criticalPathDelayed = tasks.filter(t => t.is_critical && t.status !== 'completed' && t.end_date < today);
    
    const totalBudget = financials.reduce((sum, f) => sum + (f.current_budget || 0), 0);
    const totalActual = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const budgetVariance = totalBudget > 0 ? ((totalActual - totalBudget) / totalBudget) * 100 : 0;

    const drawingsNotApproved = drawingSets.filter(d => d.status === 'IFA' || d.status === 'BFA' || d.status === 'BFS');
    
    const recentLogs = dailyLogs
      .filter(log => log.log_date >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .sort((a, b) => new Date(b.log_date) - new Date(a.log_date))
      .slice(0, 5);

    const safetyIncidents = dailyLogs.filter(log => log.safety_incidents).length;
    const delayDays = dailyLogs.filter(log => log.delays).length;

    const prompt = `You are an AI risk analyst for structural steel construction projects. Analyze this project for risks, delays, and issues.

PROJECT: ${project.name}
Phase: ${project.phase} | Status: ${project.status}
Target Completion: ${project.target_completion}
Contract Value: $${project.contract_value?.toLocaleString() || 'N/A'}

SCHEDULE METRICS:
- Total Tasks: ${tasks.length}
- Overdue Tasks: ${overdueTasks.length}
- Critical Path Tasks Delayed: ${criticalPathDelayed.length}
- Blocked Tasks: ${tasks.filter(t => t.status === 'blocked').length}

RFI/COORDINATION:
- Open RFIs: ${rfis.filter(r => r.status !== 'closed').length}
- Overdue RFIs: ${overdueRFIs.length}
- Escalated RFIs: ${escalatedRFIs.length}
- Pending Change Orders: ${changeOrders.filter(co => co.status !== 'approved' && co.status !== 'rejected').length}

DRAWINGS:
- Total Drawing Sets: ${drawingSets.length}
- Pending Approval: ${drawingsNotApproved.length}
- Status Breakdown: IFA: ${drawingSets.filter(d => d.status === 'IFA').length}, BFA: ${drawingSets.filter(d => d.status === 'BFA').length}, FFF: ${drawingSets.filter(d => d.status === 'FFF').length}

FINANCIAL:
- Budget Variance: ${budgetVariance.toFixed(1)}%
- Total Actual Costs: $${totalActual.toLocaleString()}
- Total Budget: $${totalBudget.toLocaleString()}

FIELD CONDITIONS (Last 7 Days):
- Safety Incidents: ${safetyIncidents}
- Days with Delays: ${delayDays}
- Recent Issues: ${recentLogs.filter(l => l.delays || l.safety_incidents).map(l => l.delay_reason || l.safety_notes).filter(Boolean).join('; ')}

Provide a comprehensive risk assessment:

Return ONLY valid JSON:
{
  "risk_score": number (0-100),
  "risk_level": "low|medium|high|critical",
  "risks": [
    {
      "category": "schedule|cost|quality|safety|coordination",
      "severity": "low|medium|high|critical",
      "title": "string",
      "description": "string",
      "likelihood": "low|medium|high",
      "impact": "string",
      "mitigation": "string",
      "owner": "string (role or person type)"
    }
  ],
  "red_flags": ["string"],
  "recommended_actions": [
    {
      "priority": "immediate|high|medium",
      "action": "string",
      "rationale": "string",
      "due_by": "YYYY-MM-DD or null"
    }
  ],
  "forecast": {
    "schedule_outlook": "on_track|at_risk|delayed",
    "cost_outlook": "under_budget|on_budget|over_budget",
    "completion_date_estimate": "YYYY-MM-DD",
    "confidence_level": "string"
  },
  "summary": "string"
}`;

    const response = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          risk_score: { type: "number" },
          risk_level: { type: "string" },
          risks: {
            type: "array",
            items: {
              type: "object",
              properties: {
                category: { type: "string" },
                severity: { type: "string" },
                title: { type: "string" },
                description: { type: "string" },
                likelihood: { type: "string" },
                impact: { type: "string" },
                mitigation: { type: "string" },
                owner: { type: "string" }
              }
            }
          },
          red_flags: { type: "array", items: { type: "string" } },
          recommended_actions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                priority: { type: "string" },
                action: { type: "string" },
                rationale: { type: "string" },
                due_by: { type: ["string", "null"] }
              }
            }
          },
          forecast: {
            type: "object",
            properties: {
              schedule_outlook: { type: "string" },
              cost_outlook: { type: "string" },
              completion_date_estimate: { type: "string" },
              confidence_level: { type: "string" }
            }
          },
          summary: { type: "string" }
        }
      }
    });

    return Response.json({
      success: true,
      assessment: response,
      metrics: {
        overdue_tasks: overdueTasks.length,
        overdue_rfis: overdueRFIs.length,
        critical_delayed: criticalPathDelayed.length,
        budget_variance: budgetVariance,
        drawings_pending: drawingsNotApproved.length
      },
      analyzed_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('AI Risk Assessment Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});