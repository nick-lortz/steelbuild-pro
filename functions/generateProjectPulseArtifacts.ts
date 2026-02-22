/**
 * GENERATE PROJECT PULSE ARTIFACTS
 * 
 * Creates/updates Alerts and AIInsight from project pulse.
 * Single source of truth for both alerts and AI briefs.
 * 
 * Flow:
 * 1. Compute pulse (same logic as getProjectPulse)
 * 2. Upsert alerts for top blockers
 * 3. Generate AI executive brief
 * 4. Store AIInsight record
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { parseInput, requireUser, requireProjectAccess, ok, badRequest, forbidden, serverError, logServiceRoleAccess } from './_lib/guard.js';

Deno.serve(async (req) => {
  try {
    const { project_id } = await parseInput(req, {
      project_id: { required: true, type: 'string' }
    });
    
    const user = await requireUser(req);
    const base44 = createClientFromRequest(req);
    await requireProjectAccess(user, project_id, base44);
    
    // Get project name for context
    const projects = await base44.entities.Project.filter({ id: project_id });
    const project = projects[0];
    
    if (!project) {
      return notFound('Project not found');
    }
    
    // Compute pulse by calling getProjectPulse
    const pulseResponse = await fetch(`${req.url.replace(/\/[^/]+$/, '')}/getProjectPulse`, {
      method: 'POST',
      headers: req.headers,
      body: JSON.stringify({ project_id })
    });
    
    if (!pulseResponse.ok) {
      return serverError('Failed to compute pulse');
    }
    
    const { data: pulse } = await pulseResponse.json();
    
    const pulseRunId = `pulse-${project_id}-${Date.now()}`;
    
    // Service role needed for upserting alerts (may delete old auto-generated ones)
    logServiceRoleAccess({
      function_name: 'generateProjectPulseArtifacts',
      project_id,
      user_id: user.id,
      user_email: user.email,
      action: 'upsert_alerts',
      entity_name: 'Alert',
      reason: 'Auto-generate alerts from pulse blockers'
    });
    
    // Delete old auto-generated alerts for this project
    const oldAlerts = await base44.asServiceRole.entities.Alert.filter({ 
      project_id, 
      auto_generated: true,
      status: 'active'
    });
    
    await Promise.all(oldAlerts.map(alert => 
      base44.asServiceRole.entities.Alert.delete(alert.id)
    ));
    
    // Create new alerts from top blockers (limit to top 10)
    const topBlockers = pulse.blockers.slice(0, 10);
    
    await Promise.all(topBlockers.map(blocker =>
      base44.asServiceRole.entities.Alert.create({
        project_id,
        alert_type: blocker.type,
        severity: blocker.severity,
        title: blocker.title,
        message: blocker.reason,
        entity_type: blocker.entity,
        entity_id: blocker.entity_id,
        days_open: blocker.days_open,
        recommended_action: blocker.recommended_action,
        status: 'active',
        auto_generated: true,
        pulse_run_id: pulseRunId
      })
    ));
    
    // Generate AI executive brief
    const briefPrompt = buildBriefPrompt(project, pulse);
    
    const aiResponse = await base44.integrations.Core.InvokeLLM({
      prompt: briefPrompt,
      response_json_schema: {
        type: "object",
        properties: {
          summary: { type: "string" },
          key_findings: { type: "array", items: { type: "string" } },
          risks_identified: {
            type: "array",
            items: {
              type: "object",
              properties: {
                risk: { type: "string" },
                severity: { type: "string" },
                mitigation: { type: "string" }
              }
            }
          },
          recommendations: { type: "array", items: { type: "string" } }
        }
      }
    });
    
    // Store AIInsight
    logServiceRoleAccess({
      function_name: 'generateProjectPulseArtifacts',
      project_id,
      user_id: user.id,
      user_email: user.email,
      action: 'create_insight',
      entity_name: 'AIInsight',
      reason: 'Store AI-generated brief'
    });
    
    const insight = await base44.asServiceRole.entities.AIInsight.create({
      project_id,
      insight_type: 'project_pulse',
      title: `Project Pulse: ${project.name}`,
      summary: aiResponse.summary,
      detailed_analysis: aiResponse.summary,
      key_findings: aiResponse.key_findings,
      risks_identified: aiResponse.risks_identified,
      recommendations: aiResponse.recommendations,
      data_snapshot: pulse,
      generated_at: new Date().toISOString(),
      generated_by: user.email,
      is_published: true
    });
    
    return ok({
      pulse_run_id: pulseRunId,
      alerts_created: topBlockers.length,
      insight_id: insight.id,
      blockers_count: pulse.blockers.length,
      summary: aiResponse.summary
    });
    
  } catch (error) {
    if (error.status) throw error;
    throw { status: 500, message: error.message };
  }
});

function buildBriefPrompt(project, pulse) {
  return `You are a construction project manager assistant analyzing project health.

Project: ${project.name} (${project.project_number})
Phase: ${project.phase}
Status: ${project.status}

Current Metrics:
- Open RFIs: ${pulse.counts.rfi_open}
- Open Submittals: ${pulse.counts.submittal_open}
- Pending Change Orders: ${pulse.counts.co_open}
- Overdue Deliveries: ${pulse.counts.deliveries_overdue}
- Overdue Tasks: ${pulse.counts.tasks_overdue}
- Pending Drawings: ${pulse.counts.drawings_pending}

Top Blockers (${pulse.blockers.length} total):
${pulse.blockers.slice(0, 5).map(b => 
  `- [${b.severity.toUpperCase()}] ${b.title}: ${b.reason}`
).join('\n')}

Generate a concise executive brief (3-4 sentences max) covering:
1. Overall project health status
2. Top 2-3 critical issues requiring PM attention
3. Recommended immediate actions

Also provide:
- 3-5 key findings (bullet points)
- Top risks with severity and mitigation
- 2-3 specific recommendations

Be direct, actionable, and focused on what needs decisions or escalation.
Use construction industry terminology.`;
}