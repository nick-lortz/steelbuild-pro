import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * PMA Predictive Analytics Engine
 * Forecasts completion dates, budget overruns, risk exposure with confidence intervals
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { project_id, forecast_type = 'all' } = await req.json();
    
    if (!project_id) {
      return Response.json({ error: 'project_id required' }, { status: 400 });
    }

    console.log(`[PMA] Running predictive analytics: ${forecast_type} for project ${project_id}`);

    const forecasts = {};

    // Fetch project and historical data
    const [project, workPackages, tasks, financials, laborEntries] = await Promise.all([
      base44.entities.Project.filter({ id: project_id }).then(d => d[0]),
      base44.entities.WorkPackage.filter({ project_id }),
      base44.entities.Task.filter({ project_id }),
      base44.entities.Financial.filter({ project_id }),
      base44.entities.LaborEntry.filter({ project_id })
    ]);

    if (!project) {
      return Response.json({ error: 'Project not found' }, { status: 404 });
    }

    const now = new Date();

    // === FABRICATION COMPLETION FORECAST ===
    if (forecast_type === 'all' || forecast_type === 'fabrication') {
      const fabWPs = workPackages.filter(wp => 
        ['pre_fab', 'shop'].includes(wp.phase) && wp.status === 'in_progress'
      );

      if (fabWPs.length > 0) {
        // Calculate current productivity (last 14 days)
        const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
        const recentLabor = laborEntries.filter(l => 
          new Date(l.date) >= fourteenDaysAgo && l.phase === 'fabrication'
        );

        const avgCompletion = fabWPs.reduce((sum, wp) => sum + (wp.percent_complete || 0), 0) / fabWPs.length;
        const remainingPercent = 100 - avgCompletion;
        
        const totalHours = recentLabor.reduce((sum, l) => sum + (l.hours || 0), 0);
        const productivity = totalHours > 0 ? avgCompletion / totalHours : 0;

        const estimatedRemainingHours = productivity > 0 ? remainingPercent / productivity : 0;
        const estimatedDays = estimatedRemainingHours / 8; // 8 hours per day

        const targetDate = project.target_completion ? new Date(project.target_completion) : null;
        const forecastDate = new Date(now.getTime() + estimatedDays * 24 * 60 * 60 * 1000);
        const variance = targetDate ? Math.floor((forecastDate - targetDate) / (1000 * 60 * 60 * 24)) : 0;

        const confidence = recentLabor.length >= 14 ? 90 : recentLabor.length >= 7 ? 70 : 50;

        forecasts.fabrication = {
          baseline_completion: project.target_completion,
          forecast_completion: forecastDate.toISOString().split('T')[0],
          variance_days: variance,
          confidence_pct: confidence,
          current_completion_pct: avgCompletion.toFixed(1),
          remaining_hours_est: estimatedRemainingHours.toFixed(0),
          status: variance <= 0 ? 'on_track' : variance <= 7 ? 'caution' : 'critical',
          recommendation: variance > 7 ? 'Add weekend shifts to recover schedule' : 'Monitor productivity trends'
        };
      }
    }

    // === BUDGET AT COMPLETION FORECAST ===
    if (forecast_type === 'all' || forecast_type === 'budget') {
      const totalBudget = financials.reduce((sum, f) => sum + (f.budget_amount || 0), 0);
      const totalActual = financials.reduce((sum, f) => sum + (f.actual_cost || 0), 0);
      const totalETC = financials.reduce((sum, f) => sum + (f.etc || 0), 0);
      
      const forecastTotal = totalActual + totalETC;
      const variance = forecastTotal - totalBudget;
      const variancePct = totalBudget > 0 ? (variance / totalBudget) * 100 : 0;

      const avgCompletion = workPackages.reduce((sum, wp) => sum + (wp.percent_complete || 0), 0) / (workPackages.length || 1);
      const confidence = avgCompletion > 50 ? 90 : avgCompletion > 25 ? 70 : 50;

      forecasts.budget = {
        baseline_budget: totalBudget,
        forecast_at_completion: forecastTotal,
        variance_dollars: variance,
        variance_pct: variancePct.toFixed(1),
        confidence_pct: confidence,
        percent_complete: avgCompletion.toFixed(1),
        status: Math.abs(variancePct) <= 5 ? 'on_track' : Math.abs(variancePct) <= 10 ? 'caution' : 'critical',
        recommendation: variancePct > 5 ? 'Implement cost controls, accelerate CO approvals' : 'Continue monitoring variance trends'
      };
    }

    // === ERECTION COMPLETION FORECAST ===
    if (forecast_type === 'all' || forecast_type === 'erection') {
      const erectionWPs = workPackages.filter(wp => 
        wp.phase === 'erection' && wp.status === 'in_progress'
      );

      if (erectionWPs.length > 0) {
        const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);
        const recentFieldLabor = laborEntries.filter(l => 
          new Date(l.date) >= tenDaysAgo && l.phase === 'erection'
        );

        const avgCompletion = erectionWPs.reduce((sum, wp) => sum + (wp.percent_complete || 0), 0) / erectionWPs.length;
        const remainingPercent = 100 - avgCompletion;

        const totalHours = recentFieldLabor.reduce((sum, l) => sum + (l.hours || 0), 0);
        const productivity = totalHours > 0 ? avgCompletion / totalHours : 0;

        const estimatedRemainingHours = productivity > 0 ? remainingPercent / productivity : 0;
        const estimatedDays = estimatedRemainingHours / 8;

        const targetDate = project.target_completion ? new Date(project.target_completion) : null;
        const forecastDate = new Date(now.getTime() + estimatedDays * 24 * 60 * 60 * 1000);
        const variance = targetDate ? Math.floor((forecastDate - targetDate) / (1000 * 60 * 60 * 24)) : 0;

        const confidence = recentFieldLabor.length >= 10 ? 85 : recentFieldLabor.length >= 5 ? 65 : 40;

        forecasts.erection = {
          baseline_completion: project.target_completion,
          forecast_completion: forecastDate.toISOString().split('T')[0],
          variance_days: variance,
          confidence_pct: confidence,
          current_completion_pct: avgCompletion.toFixed(1),
          remaining_hours_est: estimatedRemainingHours.toFixed(0),
          status: variance <= 0 ? 'on_track' : variance <= 5 ? 'caution' : 'critical',
          recommendation: variance > 5 ? 'Add field crews or extend work hours' : 'Maintain current pace'
        };
      }
    }

    // === RISK EXPOSURE CALCULATION ===
    if (forecast_type === 'all' || forecast_type === 'risk_exposure') {
      const openRFIs = await base44.entities.RFI.filter({ 
        project_id, 
        status: { $in: ['submitted', 'under_review'] }
      });
      
      const pendingCOs = await base44.entities.ChangeOrder.filter({
        project_id,
        status: { $in: ['draft', 'submitted', 'under_review'] }
      });

      const rfiExposure = openRFIs.reduce((sum, rfi) => {
        const estimate = rfi.estimated_cost_impact || 0;
        const probability = rfi.is_install_blocker ? 0.8 : 0.5;
        return sum + (estimate * probability);
      }, 0);

      const coExposure = pendingCOs.reduce((sum, co) => {
        const amount = co.amount || 0;
        const probability = 0.7; // Historical approval rate
        return sum + (amount * probability);
      }, 0);

      const totalExposure = rfiExposure + coExposure;

      forecasts.risk_exposure = {
        total_at_risk: totalExposure,
        rfi_exposure: rfiExposure,
        co_exposure: coExposure,
        breakdown: {
          rfis: openRFIs.length,
          change_orders: pendingCOs.length
        },
        status: totalExposure > 500000 ? 'critical' : totalExposure > 200000 ? 'high' : 'medium',
        recommendation: totalExposure > 200000 ? 'Expedite RFI responses and CO approvals to reduce exposure' : 'Monitor aging items'
      };
    }

    // === GENERATE AI INSIGHTS ===

    const insightsPrompt = `Analyze these project forecasts and provide strategic insights.

FORECASTS:
${JSON.stringify(forecasts, null, 2)}

PROJECT CONTEXT:
- Name: ${project.name}
- Phase: ${project.phase}
- Target Completion: ${project.target_completion}

Provide:
1. Executive summary (2-3 sentences)
2. Top 3 risks with mitigation strategies
3. Opportunities to accelerate or optimize
4. Recommended actions for next 7 days

Be precise, quantitative, and PM-ready.`;

    const aiInsights = await base44.integrations.Core.InvokeLLM({
      prompt: insightsPrompt
    });

    return Response.json({
      success: true,
      forecasts,
      ai_insights: aiInsights,
      generated_at: now.toISOString()
    });

  } catch (error) {
    console.error('[PMA] Predictive analytics error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});