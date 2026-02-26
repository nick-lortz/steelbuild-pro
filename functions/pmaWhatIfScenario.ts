import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * PMA What-If Scenario Engine
 * Models the schedule and budget impact of a proposed project decision.
 * Scenarios: add_crew, delay_delivery, hold_rfi, add_shift, drop_scope,
 *            accelerate_phase, remove_rfi_blocker, extend_schedule, etc.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { project_id, scenario_type, scenario_params, custom_scenario } = await req.json();
    if (!project_id) return Response.json({ error: 'project_id required' }, { status: 400 });
    if (!scenario_type && !custom_scenario) return Response.json({ error: 'scenario_type or custom_scenario required' }, { status: 400 });

    const now = new Date();

    const [project, workPackages, tasks, financials, rfis, deliveries, resources] = await Promise.all([
      base44.entities.Project.filter({ id: project_id }).then(r => r[0]),
      base44.entities.WorkPackage.filter({ project_id }),
      base44.entities.Task.filter({ project_id }),
      base44.entities.Financial.filter({ project_id }),
      base44.entities.RFI.filter({ project_id }),
      base44.entities.Delivery.filter({ project_id }),
      base44.entities.Resource.filter({ current_project_id: project_id })
    ]);

    if (!project) return Response.json({ error: 'Project not found' }, { status: 404 });

    // ── Baseline metrics ──────────────────────────────────────────────────────
    const targetDate = project.target_completion ? new Date(project.target_completion) : null;
    const daysRemaining = targetDate ? Math.floor((targetDate - now) / 86400000) : null;

    const totalBudget = financials.reduce((sum, f) => sum + (f.current_budget || f.original_budget || 0), 0);
    const totalActual = financials.reduce((sum, f) => sum + (f.actual_amount || 0), 0);
    const totalForecast = financials.reduce((sum, f) => sum + (f.forecast_amount || f.actual_amount || 0), 0);

    const activeTasks = tasks.filter(t => !['completed', 'cancelled'].includes(t.status));
    const overdueTasks = activeTasks.filter(t => t.due_date && new Date(t.due_date) < now);
    const openRFIs = rfis.filter(r => !['closed', 'answered'].includes(r.status));
    const installBlockers = openRFIs.filter(r => r.is_install_blocker || r.fab_blocker);

    const laborResources = resources.filter(r => r.type === 'labor');
    const currentCrewSize = laborResources.length;

    const activeWPs = workPackages.filter(wp => !['completed', 'cancelled'].includes(wp.status));
    const avgWPCompletion = activeWPs.length > 0
      ? activeWPs.reduce((s, wp) => s + (wp.percent_complete || 0), 0) / activeWPs.length
      : 0;

    // ── Predefined scenario models ────────────────────────────────────────────
    const SCENARIO_MODELS = {
      add_crew: {
        label: 'Add Field Crew',
        fn: (params) => {
          const crewCount = params?.crew_count || 1;
          const dailyRate = params?.daily_rate || 2400;
          const durationDays = params?.duration_days || 30;
          const scheduleImpactDays = -Math.round(durationDays * 0.25 * crewCount);
          const costImpact = crewCount * dailyRate * durationDays;
          return { scheduleImpactDays, costImpact, description: `Add ${crewCount} crew(s) for ${durationDays} days` };
        }
      },
      add_shift: {
        label: 'Add Overtime / Second Shift',
        fn: (params) => {
          const durationDays = params?.duration_days || 14;
          const crewSize = params?.crew_size || currentCrewSize || 6;
          const otPremium = params?.ot_hourly_premium || 28;
          const scheduleImpactDays = -Math.round(durationDays * 0.35);
          const costImpact = crewSize * otPremium * 4 * durationDays; // 4 OT hrs/day avg
          return { scheduleImpactDays, costImpact, description: `${durationDays}-day overtime push for ${crewSize}-person crew` };
        }
      },
      delay_delivery: {
        label: 'Delay a Delivery',
        fn: (params) => {
          const delayDays = params?.delay_days || 7;
          const affectedPieces = params?.piece_count || 20;
          const scheduleImpactDays = delayDays;
          const costImpact = delayDays * 1500; // idle crew estimate
          return { scheduleImpactDays, costImpact, description: `${delayDays}-day delivery delay (~${affectedPieces} pieces)` };
        }
      },
      hold_rfi: {
        label: 'Hold Work on Open RFI',
        fn: (params) => {
          const holdDays = params?.hold_days || 5;
          const crewSize = params?.crew_size || currentCrewSize || 6;
          const dailyRate = params?.daily_rate || 2400;
          const scheduleImpactDays = holdDays;
          const costImpact = crewSize * dailyRate * holdDays * 0.6; // partial productivity
          return { scheduleImpactDays, costImpact, description: `${holdDays}-day hold on ${installBlockers.length} RFI blocker(s)` };
        }
      },
      accelerate_phase: {
        label: 'Accelerate a Phase',
        fn: (params) => {
          const phase = params?.phase || 'fabrication';
          const targetReductionDays = params?.target_days || 10;
          const costPremium = params?.cost_premium || 15000;
          const scheduleImpactDays = -targetReductionDays;
          const costImpact = costPremium;
          return { scheduleImpactDays, costImpact, description: `Accelerate ${phase} by ${targetReductionDays} days` };
        }
      },
      drop_scope: {
        label: 'Drop / Defer Scope',
        fn: (params) => {
          const scopeValue = params?.scope_value || 50000;
          const daysRecovered = params?.days_recovered || 5;
          const scheduleImpactDays = -daysRecovered;
          const costImpact = -scopeValue;
          return { scheduleImpactDays, costImpact, description: `Defer $${scopeValue.toLocaleString()} in scope, recover ${daysRecovered} days` };
        }
      },
      extend_schedule: {
        label: 'Extend Schedule',
        fn: (params) => {
          const extensionDays = params?.extension_days || 14;
          const dailyJobCost = params?.daily_job_cost || 3500; // trailer, super, etc.
          const costImpact = extensionDays * dailyJobCost;
          const scheduleImpactDays = extensionDays;
          return { scheduleImpactDays, costImpact, description: `${extensionDays}-day schedule extension at $${dailyJobCost}/day job cost` };
        }
      },
      resolve_rfi_blockers: {
        label: 'Resolve All Install Blockers',
        fn: () => {
          const scheduleImpactDays = -Math.max(installBlockers.length * 2, 0);
          const costImpact = 0;
          return { scheduleImpactDays, costImpact, description: `Resolve ${installBlockers.length} install blocker RFI(s)` };
        }
      }
    };

    let baseModel = null;
    if (scenario_type && SCENARIO_MODELS[scenario_type]) {
      const model = SCENARIO_MODELS[scenario_type];
      baseModel = model.fn(scenario_params || {});
      baseModel.scenario_label = model.label;
    }

    // ── AI scenario modeling ──────────────────────────────────────────────────
    const scenarioDescription = baseModel?.description || custom_scenario || 'Custom scenario';

    const aiPrompt = `You are a structural steel PM AI. Model the schedule and budget impact of the following scenario.

PROJECT BASELINE:
- Name: ${project.name} | Phase: ${project.phase}
- Target Completion: ${project.target_completion || 'Not set'} (${daysRemaining !== null ? daysRemaining + ' days remaining' : 'unknown'})
- Total Budget: $${totalBudget.toLocaleString()} | Actual to Date: $${totalActual.toLocaleString()} | Current Forecast: $${totalForecast.toLocaleString()}
- Active Work Packages: ${activeWPs.length} (avg ${avgWPCompletion.toFixed(0)}% complete)
- Overdue Tasks: ${overdueTasks.length}
- Open RFIs: ${openRFIs.length} | Install Blockers: ${installBlockers.length}
- Current Crew Size: ${currentCrewSize} labor resources
- Active Deliveries Pending: ${deliveries.filter(d => !['delivered'].includes(d.status)).length}

SCENARIO: ${scenarioDescription}
${baseModel ? `PRE-MODELED IMPACT: Schedule ${baseModel.scheduleImpactDays > 0 ? '+' : ''}${baseModel.scheduleImpactDays} days | Cost ${baseModel.costImpact >= 0 ? '+' : ''}$${Math.abs(baseModel.costImpact).toLocaleString()}` : ''}

Provide a rigorous, quantitative what-if analysis as JSON:
{
  "scenario_label": "...",
  "executive_summary": "2-3 sentence direct assessment",
  "schedule_impact": {
    "days": number (negative = time saved, positive = delay),
    "new_completion_date": "YYYY-MM-DD estimate",
    "confidence": "low|medium|high",
    "critical_path_affected": true/false,
    "float_consumed": number
  },
  "cost_impact": {
    "direct_cost": number,
    "indirect_cost": number,
    "total_impact": number,
    "budget_variance_new_pct": number,
    "notes": "..."
  },
  "risks": ["risk 1", "risk 2"],
  "opportunities": ["opportunity 1"],
  "recommendation": "DO IT | DON'T DO IT | CONDITIONAL — with reason",
  "alternative_approaches": ["..."],
  "second_order_effects": ["downstream effect 1", "downstream effect 2"]
}`;

    const analysis = await base44.integrations.Core.InvokeLLM({
      prompt: aiPrompt,
      response_json_schema: {
        type: 'object',
        properties: {
          scenario_label: { type: 'string' },
          executive_summary: { type: 'string' },
          schedule_impact: { type: 'object' },
          cost_impact: { type: 'object' },
          risks: { type: 'array', items: { type: 'string' } },
          opportunities: { type: 'array', items: { type: 'string' } },
          recommendation: { type: 'string' },
          alternative_approaches: { type: 'array', items: { type: 'string' } },
          second_order_effects: { type: 'array', items: { type: 'string' } }
        }
      }
    });

    return Response.json({
      success: true,
      scenario_type: scenario_type || 'custom',
      scenario_description: scenarioDescription,
      pre_model: baseModel,
      baseline: {
        target_completion: project.target_completion,
        days_remaining: daysRemaining,
        total_budget: totalBudget,
        forecast_at_completion: totalForecast,
        active_wps: activeWPs.length,
        install_blockers: installBlockers.length
      },
      analysis,
      generated_at: now.toISOString()
    });

  } catch (err) {
    console.error('[PMA] What-if error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
});