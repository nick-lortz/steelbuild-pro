import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Analyzes completed/active projects to identify:
 * 1. Performance patterns (cost overruns, schedule slip patterns)
 * 2. Bottlenecks (RFI delays, detailing duration, fabrication velocity)
 * 3. Resource utilization patterns
 * 4. AI-powered optimization recommendations for future projects
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Load all projects (for analysis, not user-filtered)
    const allProjects = await base44.entities.Project.list('-start_date');
    if (allProjects.length === 0) {
      return Response.json({ 
        trends: {}, 
        bottlenecks: [], 
        optimization_recommendations: [],
        confidence: 'low'
      });
    }

    // Filter to completed or near-complete projects (min 50% progress)
    const completedProjects = allProjects.filter(p => 
      p.status === 'completed' || p.status === 'closed'
    );

    const projectIds = allProjects.map(p => p.id);

    // Parallel load all related data
    const [tasks, financials, rfis, changeOrders, laborHours, workPackages] = await Promise.all([
      base44.entities.Task.filter({ project_id: { $in: projectIds } }),
      base44.entities.Financial.filter({ project_id: { $in: projectIds } }),
      base44.entities.RFI.filter({ project_id: { $in: projectIds } }),
      base44.entities.ChangeOrder.filter({ project_id: { $in: projectIds } }),
      base44.entities.LaborHours.filter({ project_id: { $in: projectIds } }),
      base44.entities.WorkPackage.filter({ project_id: { $in: projectIds } })
    ]);

    // Index by project
    const indexByProject = (arr) => {
      const idx = {};
      arr.forEach(item => {
        if (!idx[item.project_id]) idx[item.project_id] = [];
        idx[item.project_id].push(item);
      });
      return idx;
    };

    const tasksByProject = indexByProject(tasks);
    const financialsByProject = indexByProject(financials);
    const rfisByProject = indexByProject(rfis);
    const cosByProject = indexByProject(changeOrders);
    const laborByProject = indexByProject(laborHours);
    const wpByProject = indexByProject(workPackages);

    // === ANALYZE EACH PROJECT ===
    const projectMetrics = completedProjects.map(proj => {
      const pTasks = tasksByProject[proj.id] || [];
      const pFinancials = financialsByProject[proj.id] || [];
      const pRFIs = rfisByProject[proj.id] || [];
      const pCOs = cosByProject[proj.id] || [];
      const pLabor = laborByProject[proj.id] || [];
      const pWP = wpByProject[proj.id] || [];

      // Cost metrics
      const budget = pFinancials.reduce((sum, f) => sum + (f.current_budget || 0), 0);
      const actual = pFinancials.reduce((sum, f) => sum + (f.actual_amount || 0), 0);
      const costVariance = budget > 0 ? ((budget - actual) / budget) * 100 : 0;

      // Schedule metrics
      const plannedDays = proj.target_completion && proj.start_date
        ? Math.ceil((new Date(proj.target_completion) - new Date(proj.start_date)) / (1000 * 60 * 60 * 24))
        : 0;
      
      const actualDays = proj.actual_completion && proj.start_date
        ? Math.ceil((new Date(proj.actual_completion) - new Date(proj.start_date)) / (1000 * 60 * 60 * 24))
        : plannedDays;

      const scheduleVariance = plannedDays > 0 ? ((plannedDays - actualDays) / plannedDays) * 100 : 0;

      // RFI delays (days to respond)
      const closedRFIs = pRFIs.filter(r => r.status === 'closed' || r.status === 'answered');
      const avgRFIResponseDays = closedRFIs.length > 0
        ? closedRFIs.reduce((sum, rfi) => {
            if (rfi.submitted_date && rfi.response_date) {
              const days = Math.ceil((new Date(rfi.response_date) - new Date(rfi.submitted_date)) / (1000 * 60 * 60 * 24));
              return sum + days;
            }
            return sum;
          }, 0) / closedRFIs.length
        : 0;

      // Labor utilization (actual hours vs planned)
      const plannedLaborHours = pWP.reduce((sum, wp) => sum + (wp.planned_hours || 0), 0);
      const actualLaborHours = pLabor.reduce((sum, lh) => sum + (lh.hours || 0) + (lh.overtime_hours || 0), 0);
      const laborProductivity = plannedLaborHours > 0 ? (plannedLaborHours / actualLaborHours) : 0;

      // Change order impact
      const approvedCOs = pCOs.filter(c => c.status === 'approved');
      const totalCODollars = approvedCOs.reduce((sum, co) => sum + (co.cost_impact || 0), 0);
      const totalCODays = approvedCOs.reduce((sum, co) => sum + (co.schedule_impact_days || 0), 0);

      return {
        project_id: proj.id,
        project_name: proj.name,
        contract_value: proj.contract_value,
        budget,
        actual,
        cost_variance_pct: Math.round(costVariance),
        planned_days: plannedDays,
        actual_days: actualDays,
        schedule_variance_pct: Math.round(scheduleVariance),
        rfi_count: closedRFIs.length,
        avg_rfi_response_days: Math.round(avgRFIResponseDays),
        change_orders: approvedCOs.length,
        co_cost_impact: totalCODollars,
        co_schedule_impact_days: totalCODays,
        labor_productivity: Math.round(laborProductivity * 100),
        phase: proj.phase || 'fabrication'
      };
    });

    // === IDENTIFY TRENDS ===
    const trends = {
      avg_cost_variance_pct: Math.round(projectMetrics.reduce((sum, p) => sum + p.cost_variance_pct, 0) / projectMetrics.length),
      avg_schedule_variance_pct: Math.round(projectMetrics.reduce((sum, p) => sum + p.schedule_variance_pct, 0) / projectMetrics.length),
      avg_rfi_response_days: Math.round(projectMetrics.reduce((sum, p) => sum + p.avg_rfi_response_days, 0) / projectMetrics.length),
      avg_labor_productivity_pct: Math.round(projectMetrics.reduce((sum, p) => sum + p.labor_productivity, 0) / projectMetrics.length),
      avg_change_orders_per_project: (projectMetrics.reduce((sum, p) => sum + p.change_orders, 0) / projectMetrics.length).toFixed(1),
      overrun_projects: projectMetrics.filter(p => p.cost_variance_pct < 0).length,
      delayed_projects: projectMetrics.filter(p => p.schedule_variance_pct < 0).length,
      projects_analyzed: projectMetrics.length
    };

    // === BOTTLENECK DETECTION ===
    const bottlenecks = [];

    // Slow RFI turnaround
    if (trends.avg_rfi_response_days > 7) {
      bottlenecks.push({
        bottleneck: 'RFI Response Delays',
        metric: `Avg ${trends.avg_rfi_response_days} days to respond`,
        impact: 'Delays design release, triggers fabrication delays',
        affected_projects: projectMetrics.filter(p => p.avg_rfi_response_days > 10).length,
        severity: trends.avg_rfi_response_days > 14 ? 'critical' : 'warning'
      });
    }

    // High change order frequency
    if (parseFloat(trends.avg_change_orders_per_project) > 2) {
      bottlenecks.push({
        bottleneck: 'Scope Creep / Change Orders',
        metric: `Avg ${trends.avg_change_orders_per_project} COs per project`,
        impact: 'Cost overruns, schedule delays, rework',
        affected_projects: projectMetrics.filter(p => p.change_orders > 2).length,
        severity: parseFloat(trends.avg_change_orders_per_project) > 3.5 ? 'critical' : 'warning'
      });
    }

    // Labor inefficiency
    if (trends.avg_labor_productivity_pct < 85) {
      bottlenecks.push({
        bottleneck: 'Labor Inefficiency',
        metric: `${trends.avg_labor_productivity_pct}% productivity (planned/actual)`,
        impact: 'Higher labor costs, extended schedules',
        affected_projects: projectMetrics.filter(p => p.labor_productivity < 80).length,
        severity: trends.avg_labor_productivity_pct < 75 ? 'critical' : 'warning'
      });
    }

    // Cost overruns
    if (trends.avg_cost_variance_pct < -5) {
      bottlenecks.push({
        bottleneck: 'Budget Overruns',
        metric: `Avg ${trends.avg_cost_variance_pct}% under budget`,
        impact: 'Margin erosion, profitability impact',
        affected_projects: projectMetrics.filter(p => p.cost_variance_pct < -10).length,
        severity: trends.avg_cost_variance_pct < -15 ? 'critical' : 'warning'
      });
    }

    // Schedule slips
    if (trends.avg_schedule_variance_pct < -5) {
      bottlenecks.push({
        bottleneck: 'Schedule Delays',
        metric: `Avg ${Math.abs(trends.avg_schedule_variance_pct)}% over planned duration`,
        impact: 'Crew conflicts, premium labor, client penalties',
        affected_projects: projectMetrics.filter(p => p.schedule_variance_pct < -10).length,
        severity: trends.avg_schedule_variance_pct < -20 ? 'critical' : 'warning'
      });
    }

    // === AI OPTIMIZATION ANALYSIS ===
    const projectSummary = `Historical Performance Analysis (${projectMetrics.length} completed projects):

COST PERFORMANCE:
- Average cost variance: ${trends.avg_cost_variance_pct}% (negative = overrun)
- Projects over budget: ${trends.overrun_projects} / ${projectMetrics.length}

SCHEDULE PERFORMANCE:
- Average schedule variance: ${trends.avg_schedule_variance_pct}% (negative = delayed)
- Delayed projects: ${trends.delayed_projects} / ${projectMetrics.length}
- Average delay: ${Math.abs(trends.avg_schedule_variance_pct)}% beyond planned

KEY BOTTLENECKS:
- RFI response time: ${trends.avg_rfi_response_days} days avg
- Change orders: ${trends.avg_change_orders_per_project} per project
- Labor productivity: ${trends.avg_labor_productivity_pct}% of planned

HIGHEST-IMPACT PROJECTS (for pattern analysis):
${projectMetrics
  .sort((a, b) => Math.abs(b.cost_variance_pct) - Math.abs(a.cost_variance_pct))
  .slice(0, 3)
  .map(p => `${p.project_name}: ${p.cost_variance_pct}% cost var, ${p.schedule_variance_pct}% schedule var, ${p.change_orders} COs`)
  .join('\n')}

Based on these patterns, identify:
1. Root causes of cost overruns and delays
2. Specific process improvements for future projects
3. Key metrics to monitor/control on new projects
4. Staffing/resource adjustments needed`;

    const aiResponse = await base44.integrations.Core.InvokeLLM({
      prompt: projectSummary + `

Provide optimization recommendations as a structured list of HIGH-IMPACT, ACTIONABLE strategies specific to structural steel fabrication/erection projects. Focus on:
- Detailing acceleration techniques
- RFI prevention/reduction
- Change order management
- Labor productivity improvements
- Schedule compression tactics

Each recommendation should include: action, expected benefit (cost/schedule), and implementation timeline.`,
      
      response_json_schema: {
        type: "object",
        properties: {
          recommendations: {
            type: "array",
            items: {
              type: "object",
              properties: {
                action: { type: "string" },
                category: { type: "string", enum: ["detailing", "design", "fabrication", "logistics", "labor", "coordination"] },
                expected_cost_savings_pct: { type: "number" },
                expected_schedule_improvement_days: { type: "number" },
                implementation_effort: { type: "string", enum: ["low", "medium", "high"] },
                timeframe_weeks: { type: "number" }
              }
            }
          },
          critical_focus_areas: {
            type: "array",
            items: { type: "string" }
          },
          confidence_level: { type: "string", enum: ["high", "medium", "low"] }
        }
      }
    });

    return Response.json({
      trends,
      bottlenecks: bottlenecks.sort((a, b) => 
        (b.severity === 'critical' ? 1 : 0) - (a.severity === 'critical' ? 1 : 0)
      ),
      project_metrics: projectMetrics.slice(0, 10), // Top 10 for detail
      optimization_recommendations: aiResponse.recommendations || [],
      critical_focus_areas: aiResponse.critical_focus_areas || [],
      confidence: aiResponse.confidence_level || 'medium',
      generated_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('[getProjectAnalytics]', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});