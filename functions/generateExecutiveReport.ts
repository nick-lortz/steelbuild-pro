import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { project_ids, report_type, date_range } = await req.json();

    // Default to all active projects if none specified
    let targetProjectIds = project_ids;
    if (!targetProjectIds || targetProjectIds.length === 0) {
      const allProjects = await base44.entities.Project.filter({ status: 'in_progress' });
      targetProjectIds = allProjects.map(p => p.id);
    }

    // Fetch portfolio data
    const projects = await base44.entities.Project.filter({ id: { $in: targetProjectIds } });
    
    const portfolioData = await Promise.all(projects.map(async (project) => {
      const [workPackages, tasks, financials, deliveries, changeOrders] = await Promise.all([
        base44.entities.WorkPackage.filter({ project_id: project.id }),
        base44.entities.Task.filter({ project_id: project.id }),
        base44.entities.Financial.filter({ project_id: project.id }),
        base44.entities.Delivery.filter({ project_id: project.id }),
        base44.entities.ChangeOrder.filter({ project_id: project.id })
      ]);

      const today = new Date().toISOString().split('T')[0];
      const overdueTasks = tasks.filter(t => t.end_date < today && t.status !== 'completed');
      const totalBudget = financials.reduce((sum, f) => sum + (f.current_budget || 0), 0);
      const actualCost = financials.reduce((sum, f) => sum + (f.actual_amount || 0), 0);
      const onTimeDeliveries = deliveries.filter(d => d.delivery_status === 'delivered' && (!d.actual_date || d.actual_date <= d.scheduled_date)).length;
      const totalDeliveredDeliveries = deliveries.filter(d => d.delivery_status === 'delivered').length;

      return {
        project_number: project.project_number,
        project_name: project.name,
        status: project.status,
        phase: project.phase,
        target_completion: project.target_completion,
        contract_value: project.contract_value,
        total_budget: totalBudget,
        actual_cost: actualCost,
        budget_variance: actualCost - totalBudget,
        tasks_total: tasks.length,
        tasks_overdue: overdueTasks.length,
        tasks_completion_pct: tasks.length > 0 ? (tasks.filter(t => t.status === 'completed').length / tasks.length * 100) : 0,
        work_packages_total: workPackages.length,
        work_packages_complete: workPackages.filter(wp => wp.status === 'complete').length,
        deliveries_total: deliveries.length,
        deliveries_on_time_pct: totalDeliveredDeliveries > 0 ? (onTimeDeliveries / totalDeliveredDeliveries * 100) : 100,
        change_orders_count: changeOrders.length,
        change_orders_value: changeOrders.reduce((sum, co) => sum + (co.cost_impact || 0), 0)
      };
    }));

    // Generate executive summary using AI
    const executiveSummary = await base44.integrations.Core.InvokeLLM({
      prompt: `Generate an executive summary report for a structural steel construction portfolio.

PORTFOLIO: ${projects.length} active projects
REPORT TYPE: ${report_type || 'weekly'}
DATE RANGE: ${date_range || 'current week'}

PROJECT DATA:
${JSON.stringify(portfolioData, null, 2)}

Create a professional executive summary including:
1. Portfolio health overview (Red/Amber/Green status for overall portfolio)
2. Key performance indicators (schedule adherence, budget performance, delivery reliability)
3. Critical issues requiring executive attention (top 3-5)
4. Financial summary (total contract value, budget status, forecast)
5. Recommended actions for leadership

Format as professional business report suitable for executive distribution.
Be concise, data-driven, and action-oriented.`,
      response_json_schema: {
        type: "object",
        properties: {
          portfolio_health: {
            type: "string",
            enum: ["green", "amber", "red"]
          },
          executive_summary: {
            type: "string"
          },
          key_metrics: {
            type: "object",
            properties: {
              schedule_health: { type: "string" },
              cost_health: { type: "string" },
              delivery_health: { type: "string" }
            }
          },
          critical_issues: {
            type: "array",
            items: {
              type: "object",
              properties: {
                severity: { type: "string" },
                issue: { type: "string" },
                project: { type: "string" },
                recommended_action: { type: "string" }
              }
            }
          },
          financial_summary: {
            type: "object",
            properties: {
              total_contract_value: { type: "number" },
              total_budget: { type: "number" },
              total_actual: { type: "number" },
              variance_pct: { type: "number" },
              forecast_at_completion: { type: "string" }
            }
          },
          recommended_actions: {
            type: "array",
            items: { type: "string" }
          }
        }
      }
    });

    return Response.json({
      report_date: new Date().toISOString(),
      portfolio_data: portfolioData,
      executive_summary: executiveSummary,
      generated_by: user.email
    });

  } catch (error) {
    console.error('Executive report generation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});