import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { requireProjectAccess } from './utils/requireProjectAccess.js';
import { requireRole } from './_lib/authz.js';

/**
 * Predict RFI response time & impact risk based on historical project data
 * Returns: response_time_days, cost_impact_likelihood, schedule_impact_likelihood, risk_level
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { project_id, rfi_type, discipline, is_blocker } = await req.json();
    
    if (!project_id) {
      return Response.json({ error: 'project_id required' }, { status: 400 });
    }
    
    // RFI risk prediction requires PM/Detailer/Admin
    requireRole(user, ['admin', 'pm', 'detailer']);
    
    // Verify project access
    await requireProjectAccess(base44, user, project_id);

    // Fetch historical RFIs from project (cap for performance)
    const MAX_HISTORICAL = 500;
    const historicalRFIs = await base44.entities.RFI.filter({
      project_id,
      status: 'closed'
    }, null, MAX_HISTORICAL);

    if (historicalRFIs.length === 0) {
      return Response.json({
        response_time_days: 5,
        cost_impact_likelihood: 'unknown',
        schedule_impact_likelihood: 'unknown',
        risk_level: 'medium',
        reasoning: 'No historical data available'
      });
    }

    // Analyze by type
    const typeMatches = historicalRFIs.filter(r => r.rfi_type === rfi_type);
    const disciplineMatches = historicalRFIs.filter(r => r.discipline === discipline);

    // Calculate avg response time
    const responseTimeSamples = typeMatches
      .filter(r => r.response_days_actual)
      .map(r => r.response_days_actual);

    const avgResponseTime = responseTimeSamples.length > 0
      ? (responseTimeSamples.reduce((a, b) => a + b, 0) / responseTimeSamples.length).toFixed(1)
      : 5;

    // Calculate cost impact likelihood
    const typeWithCost = typeMatches.filter(r => r.cost_impact === 'yes').length;
    const typeTotal = typeMatches.length || 1;
    const costLikelihood = (typeWithCost / typeTotal) * 100;

    // Calculate schedule impact likelihood
    const typeWithSchedule = typeMatches.filter(r => r.schedule_impact === 'yes').length;
    const scheduleLikelihood = (typeWithSchedule / typeTotal) * 100;

    // Determine risk level
    let riskLevel = 'low';
    if (is_blocker) riskLevel = 'high';
    else if (costLikelihood > 60 || scheduleLikelihood > 60) riskLevel = 'high';
    else if (costLikelihood > 30 || scheduleLikelihood > 30) riskLevel = 'medium';

    return Response.json({
      response_time_days: parseInt(avgResponseTime),
      cost_impact_likelihood: costLikelihood > 0 ? `${costLikelihood.toFixed(0)}%` : 'low',
      schedule_impact_likelihood: scheduleLikelihood > 0 ? `${scheduleLikelihood.toFixed(0)}%` : 'low',
      risk_level: riskLevel,
      sample_size: typeMatches.length,
      reasoning: `Based on ${typeMatches.length} similar RFIs (type: ${rfi_type})`
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});