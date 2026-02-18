import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { callLLMSafe } from './_lib/aiPolicy.js';
import { requireProjectAccess } from './utils/requireProjectAccess.js';
import { redactFinancials } from './_lib/redact.js';

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

    // Fetch comprehensive project data (capped)
    const [project, tasks, workPackages, rfis, changeOrders, expenses, laborHours] = await Promise.all([
      base44.entities.Project.filter({ id: project_id }).then(r => r[0]),
      base44.entities.Task.filter({ project_id }, null, MAX_ITEMS),
      base44.entities.WorkPackage.filter({ project_id }, null, MAX_ITEMS),
      base44.entities.RFI.filter({ project_id }, null, MAX_ITEMS),
      base44.entities.ChangeOrder.filter({ project_id }, null, MAX_ITEMS),
      base44.entities.Expense.filter({ project_id }, null, MAX_ITEMS),
      base44.entities.LaborHours.filter({ project_id }, null, MAX_ITEMS)
    ]);

    if (!project) {
      return Response.json({ error: 'Project not found' }, { status: 404 });
    }

    // Calculate current metrics
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const blockedTasks = tasks.filter(t => t.status === 'blocked').length;
    const overdueTasks = tasks.filter(t => new Date(t.end_date) < new Date() && t.status !== 'completed').length;
    const progressPct = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    const openRFIs = rfis.filter(r => !['closed', 'answered'].includes(r.status)).length;
    const blockerRFIs = rfis.filter(r => r.blocker_info?.is_blocker).length;
    const overdueRFIs = rfis.filter(r => r.due_date && new Date(r.due_date) < new Date() && !['closed', 'answered'].includes(r.status)).length;

    const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const budgetUsedPct = project.contract_value > 0 ? (totalExpenses / project.contract_value) * 100 : 0;

    const approvedCOs = changeOrders.filter(co => co.status === 'approved');
    const totalCOImpact = approvedCOs.reduce((sum, co) => sum + (co.cost_impact || 0), 0);
    const totalScheduleImpact = approvedCOs.reduce((sum, co) => sum + (co.schedule_impact_days || 0), 0);

    const totalLaborHours = laborHours.reduce((sum, lh) => sum + (lh.hours || 0) + (lh.overtime_hours || 0), 0);
    const baselineHours = (project.baseline_shop_hours || 0) + (project.baseline_field_hours || 0);
    const laborBurnRate = baselineHours > 0 ? (totalLaborHours / baselineHours) * 100 : 0;

    // Days elapsed and remaining
    const startDate = new Date(project.start_date);
    const targetDate = new Date(project.target_completion);
    const today = new Date();
    const totalDays = Math.max((targetDate - startDate) / (1000 * 60 * 60 * 24), 1);
    const daysElapsed = Math.max((today - startDate) / (1000 * 60 * 60 * 24), 0);
    const daysRemaining = Math.max((targetDate - today) / (1000 * 60 * 60 * 24), 0);
    const schedulePct = totalDays > 0 ? (daysElapsed / totalDays) * 100 : 0;

    // Build comprehensive analysis prompt (anonymized)
    const analysisPrompt = `You are an expert construction project analyst specializing in structural steel fabrication and erection. Analyze this project data and provide detailed forecasting:

PROJECT OVERVIEW:
- Phase: ${project.phase}
- Start: ${project.start_date}, Target: ${project.target_completion}
- Days Elapsed: ${daysElapsed.toFixed(0)} / ${totalDays.toFixed(0)} (${schedulePct.toFixed(1)}% schedule elapsed)
- Days Remaining: ${daysRemaining.toFixed(0)}

PROGRESS METRICS:
- Task Completion: ${completedTasks}/${totalTasks} (${progressPct.toFixed(1)}%)
- Overdue Tasks: ${overdueTasks}
- Blocked Tasks: ${blockedTasks}
- Schedule vs Progress Variance: ${(schedulePct - progressPct).toFixed(1)}%

RISK INDICATORS:
- Open RFIs: ${openRFIs} (${blockerRFIs} blockers, ${overdueRFIs} overdue)
- Approved Change Orders: ${approvedCOs.length}
- Total Schedule Impact from COs: ${totalScheduleImpact} days

FINANCIAL STATUS (RATIOS):
- Budget Used: ${budgetUsedPct.toFixed(1)}%
- Budget vs Schedule Variance: ${(budgetUsedPct - schedulePct).toFixed(1)}%

LABOR PERFORMANCE:
- Total Hours: ${totalLaborHours.toFixed(0)}
- Baseline Hours: ${baselineHours.toFixed(0)}
- Labor Burn Rate: ${laborBurnRate.toFixed(1)}%

WORK PACKAGES:
- Total: ${workPackages.length}
- By Phase: ${['detailing', 'fabrication', 'delivery', 'erection', 'closeout'].map(p => 
    `${p}: ${workPackages.filter(wp => wp.phase === p).length}`).join(', ')}

Provide a detailed forecast analyzing:
1. Projected completion date (consider schedule variance, blocker RFIs, remaining work, labor productivity)
2. Budget variance percentage forecast (NO specific dollar amounts)
3. Milestone achievement probability (assess readiness, constraints, dependencies)
4. Critical risk factors affecting delivery
5. Recommended corrective actions

NO PII, NO exact costs. Think like a steel PM managing detailing → fab → erection workflow.`;

    const forecast = await callLLMSafe(base44, {
      prompt: analysisPrompt,
      payload: null,
      project_id,
      response_json_schema: {
        type: "object",
        properties: {
          completion_forecast: {
            type: "object",
            properties: {
              projected_date: { type: "string", description: "ISO date" },
              variance_days: { type: "number", description: "Days early/late from target (negative = early)" },
              confidence: { type: "string", enum: ["low", "medium", "high"] },
              reasoning: { type: "string" }
            }
          },
          budget_forecast: {
            type: "object",
            properties: {
              projected_final_cost: { type: "number" },
              projected_overrun: { type: "number", description: "Amount over/under budget (negative = under)" },
              overrun_percentage: { type: "number" },
              confidence: { type: "string", enum: ["low", "medium", "high"] },
              reasoning: { type: "string" }
            }
          },
          milestone_forecast: {
            type: "array",
            items: {
              type: "object",
              properties: {
                milestone: { type: "string", description: "Milestone name (e.g., Detailing Complete, Fab 50%, Erection Start)" },
                target_date: { type: "string", description: "Target date if known, or estimated" },
                probability: { type: "number", description: "0-100% probability of meeting target" },
                status: { type: "string", enum: ["on_track", "at_risk", "critical"] },
                constraints: { type: "array", items: { type: "string" } }
              }
            }
          },
          critical_risks: {
            type: "array",
            items: {
              type: "object",
              properties: {
                risk: { type: "string" },
                impact: { type: "string", enum: ["schedule", "cost", "both"] },
                severity: { type: "string", enum: ["low", "medium", "high", "critical"] },
                mitigation: { type: "string" }
              }
            }
          },
          recommended_actions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                action: { type: "string" },
                priority: { type: "string", enum: ["low", "medium", "high", "urgent"] },
                owner: { type: "string", description: "Who should own this (PM, Super, Detailer, etc)" },
                timeline: { type: "string", description: "When to complete (e.g., 'This week', 'Before erection')" }
              }
            }
          },
          overall_health_score: {
            type: "number",
            description: "0-100 overall project health score"
          },
          summary: {
            type: "string",
            description: "2-3 sentence executive summary"
          }
        }
      }
    });

    return Response.json({
      success: true,
      project_id,
      analysis_date: new Date().toISOString(),
      current_metrics: {
        progress_pct: progressPct,
        schedule_pct: schedulePct,
        budget_used_pct: budgetUsedPct,
        days_remaining: daysRemaining,
        open_rfis: openRFIs,
        blocker_rfis: blockerRFIs,
        total_expenses: totalExpenses
      },
      forecast
    });

  } catch (error) {
    console.error('AI forecast error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});