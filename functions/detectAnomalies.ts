import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { project_id } = await req.json();

    const [project, financials, expenses, rfis, changeOrders, tasks] = await Promise.all([
      base44.entities.Project.list().then(p => p.find(pr => pr.id === project_id)),
      base44.entities.Financial.filter({ project_id }),
      base44.entities.Expense.filter({ project_id }),
      base44.entities.RFI.filter({ project_id }),
      base44.entities.ChangeOrder.filter({ project_id }),
      base44.entities.Task.filter({ project_id })
    ]);

    const totalBudget = project?.contract_value || 0;
    const totalActual = financials.reduce((sum, f) => sum + (f.actual_amount || 0), 0);
    const recentExpenses = expenses.filter(e => {
      const expDate = new Date(e.expense_date);
      const daysAgo = (Date.now() - expDate) / (1000 * 60 * 60 * 24);
      return daysAgo <= 30;
    });

    const rfiResponseTimes = rfis
      .filter(r => r.submitted_date && r.response_date)
      .map(r => {
        const submitted = new Date(r.submitted_date);
        const responded = new Date(r.response_date);
        return Math.ceil((responded - submitted) / (1000 * 60 * 60 * 24));
      });

    const avgRFIResponse = rfiResponseTimes.length > 0 
      ? rfiResponseTimes.reduce((a, b) => a + b, 0) / rfiResponseTimes.length 
      : 0;

    const coImpacts = changeOrders.map(c => c.cost_impact || 0);
    const totalCOImpact = coImpacts.reduce((a, b) => a + b, 0);

    const prompt = `Detect anomalies and unusual patterns in this structural steel project data.

PROJECT: ${project?.name}
CONTRACT VALUE: $${totalBudget.toLocaleString()}
ACTUAL COSTS: $${totalActual.toLocaleString()}

FINANCIAL DATA:
- Budget categories: ${financials.length}
- Recent expenses (30d): ${recentExpenses.length} totaling $${recentExpenses.reduce((s, e) => s + e.amount, 0).toLocaleString()}
- Largest recent expense: $${Math.max(...recentExpenses.map(e => e.amount), 0).toLocaleString()}

RFI PATTERNS:
- Total RFIs: ${rfis.length}
- Average response time: ${avgRFIResponse.toFixed(1)} days
- Pending RFIs: ${rfis.filter(r => ['pending', 'submitted'].includes(r.status)).length}
- High priority RFIs: ${rfis.filter(r => r.priority === 'high' || r.priority === 'critical').length}

CHANGE ORDER PATTERNS:
- Total COs: ${changeOrders.length}
- Total cost impact: $${totalCOImpact.toLocaleString()}
- Pending approval: ${changeOrders.filter(c => c.status === 'pending').length}

TASK PATTERNS:
- Behind schedule: ${tasks.filter(t => {
  if (!t.end_date || t.status === 'completed') return false;
  return new Date(t.end_date) < new Date() && t.progress_percent < 100;
}).length}
- Blocked tasks: ${tasks.filter(t => t.status === 'blocked').length}

Identify anomalies like:
1. Unusual spending patterns (spikes, categories over budget)
2. RFI response delays beyond typical 7-14 days
3. Clustering of change orders (sign of scope issues)
4. Tasks with progress/time mismatches
5. Budget categories with high variance

Return JSON:
{
  "anomalies": [{"type": "financial" | "rfi" | "change_order" | "schedule", "severity": "low" | "medium" | "high", "description": "string", "metric": "string", "threshold_exceeded": "string"}],
  "patterns": [{"category": "string", "observation": "string", "is_concerning": boolean}],
  "recommendations": ["string"]
}`;

    const response = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          anomalies: {
            type: "array",
            items: {
              type: "object",
              properties: {
                type: { type: "string" },
                severity: { type: "string" },
                description: { type: "string" },
                metric: { type: "string" },
                threshold_exceeded: { type: "string" }
              }
            }
          },
          patterns: {
            type: "array",
            items: {
              type: "object",
              properties: {
                category: { type: "string" },
                observation: { type: "string" },
                is_concerning: { type: "boolean" }
              }
            }
          },
          recommendations: { type: "array", items: { type: "string" } }
        }
      }
    });

    return Response.json(response);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});