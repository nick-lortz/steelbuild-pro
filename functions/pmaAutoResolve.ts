import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * PMA Auto-Resolution Engine
 * Attempts autonomous resolution of common blockers
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized - Admin only' }, { status: 403 });
    }

    const { project_id, issue_type, entity_id, auto_execute = false } = await req.json();
    
    if (!project_id || !issue_type) {
      return Response.json({ error: 'project_id and issue_type required' }, { status: 400 });
    }

    console.log(`[PMA] Auto-resolve attempt: ${issue_type} for project ${project_id}`);

    const resolutions = [];

    // === RFI FOLLOW-UP ===
    if (issue_type === 'rfi_aging') {
      const rfi = await base44.entities.RFI.filter({ id: entity_id }).then(d => d[0]);
      
      if (rfi) {
        const daysOpen = Math.floor((new Date() - new Date(rfi.created_date)) / (1000 * 60 * 60 * 24));
        
        // Generate escalation email
        const escalationEmail = await base44.integrations.Core.InvokeLLM({
          prompt: `Draft a professional escalation email for an overdue RFI.

RFI Number: ${rfi.rfi_number}
Subject: ${rfi.subject}
Days Open: ${daysOpen}
Current Status: ${rfi.status}
Ball in Court: ${rfi.ball_in_court}

Generate a polite but firm escalation email requesting immediate response. Include:
- Reference to original RFI submission date
- Impact on project schedule/cost if applicable
- Request for response by specific date (2 business days)
- Professional tone suitable for owner/architect

Format as ready-to-send email with subject line.`
        });

        resolutions.push({
          issue: 'rfi_aging',
          entity_id: rfi.id,
          action: 'escalation_email_drafted',
          content: escalationEmail,
          auto_executed: false,
          requires_approval: true,
          recommendation: `Send escalation to ${rfi.response_owner || 'architect'} - 78% historical success rate`
        });

        if (auto_execute) {
          // Create task for PM to review and send
          await base44.asServiceRole.entities.Task.create({
            project_id,
            name: `Review Escalation: RFI-${rfi.rfi_number}`,
            description: `PMA generated escalation email for ${daysOpen}-day old RFI. Review and send.\n\n${escalationEmail}`,
            priority: 'high',
            status: 'todo',
            due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]
          });
        }
      }
    }

    // === GATE UNBLOCKING ===
    if (issue_type === 'gate_blocked') {
      const gate = await base44.entities.ExecutionGate.filter({ id: entity_id }).then(d => d[0]);
      
      if (gate && gate.blockers) {
        const resolutionPlan = [];
        
        for (const blocker of gate.blockers) {
          if (blocker.type === 'rfi' && blocker.entity_id) {
            // Check RFI status
            const rfi = await base44.entities.RFI.filter({ id: blocker.entity_id }).then(d => d[0]);
            if (rfi && rfi.status === 'answered') {
              resolutionPlan.push({
                blocker_type: 'rfi',
                action: 'auto_clear',
                details: `RFI-${rfi.rfi_number} is answered, can clear from gate`
              });
            }
          }
          
          if (blocker.type === 'submittal' && blocker.entity_id) {
            const submittal = await base44.entities.Submittal.filter({ id: blocker.entity_id }).then(d => d[0]);
            if (submittal && submittal.status === 'approved') {
              resolutionPlan.push({
                blocker_type: 'submittal',
                action: 'auto_clear',
                details: `Submittal approved, can clear from gate`
              });
            }
          }
        }

        resolutions.push({
          issue: 'gate_blocked',
          entity_id: gate.id,
          gate_type: gate.gate_type,
          resolution_plan: resolutionPlan,
          auto_clearable: resolutionPlan.filter(p => p.action === 'auto_clear').length,
          requires_manual_review: gate.blockers.length - resolutionPlan.length
        });

        if (auto_execute && resolutionPlan.length > 0) {
          // Clear resolved blockers
          const remainingBlockers = gate.blockers.filter(b => {
            return !resolutionPlan.some(p => 
              p.blocker_type === b.type && p.action === 'auto_clear'
            );
          });

          const newStatus = remainingBlockers.length === 0 ? 'open' : 'conditional';

          await base44.asServiceRole.entities.ExecutionGate.update(gate.id, {
            blockers: remainingBlockers,
            gate_status: newStatus,
            last_evaluated_at: new Date().toISOString()
          });

          console.log(`[PMA] Auto-cleared ${resolutionPlan.length} blockers from gate ${gate.gate_type}`);
        }
      }
    }

    // === SCHEDULE RECOVERY ANALYSIS ===
    if (issue_type === 'schedule_delay') {
      const inProgressWPs = workPackages.filter(wp => 
        wp.status === 'in_progress' && wp.phase === 'shop'
      );
      
      const delayed = inProgressWPs.filter(wp => {
        if (!wp.target_date || !wp.start_date) return false;
        const target = new Date(wp.target_date);
        const daysUntil = Math.floor((target - new Date()) / (1000 * 60 * 60 * 24));
        return daysUntil < 5 && wp.percent_complete < 90;
      });

      if (delayed.length > 0) {
        const recoveryPlan = await base44.integrations.Core.InvokeLLM({
          prompt: `Analyze schedule recovery options for delayed fabrication.

DELAYED PACKAGES: ${delayed.length}
AVG COMPLETION: ${(delayed.reduce((sum, wp) => sum + (wp.percent_complete || 0), 0) / delayed.length).toFixed(1)}%
DAYS TO TARGET: 3-5 days average

RECOVERY OPTIONS:
1. Weekend shifts - Calculate cost and recovery potential
2. Additional welders - Calculate resource requirements
3. Split erection sequence - Assess feasibility and cost

Provide recommendation with cost-benefit analysis and success probability.`,
          response_json_schema: {
            type: 'object',
            properties: {
              recommended_option: { type: 'string' },
              cost_estimate: { type: 'number' },
              recovery_days: { type: 'number' },
              success_probability: { type: 'number' },
              implementation_steps: { type: 'array', items: { type: 'string' } }
            }
          }
        });

        resolutions.push({
          issue: 'schedule_delay',
          affected_packages: delayed.length,
          recovery_analysis: recoveryPlan,
          auto_executed: false,
          requires_approval: true
        });
      }
    }

    // === GENERATE SUMMARY ===

    const brief = `🤖 PMA AUTO-RESOLUTION ANALYSIS

Project: ${project.name}
Date: ${now.toISOString().split('T')[0]}

RESOLUTIONS IDENTIFIED: ${resolutions.length}

${resolutions.map((r, i) => `
${i + 1}. ${r.issue.toUpperCase()}
   Entity: ${r.entity_id || 'N/A'}
   Action: ${r.action || r.resolution_plan?.length > 0 ? 'Plan Ready' : 'Analysis Complete'}
   Auto-Execute: ${r.auto_executed ? 'YES' : 'Requires Approval'}
`).join('\n')}

Next Steps: ${resolutions.filter(r => r.requires_approval).length} items require PM approval
Auto-Executed: ${resolutions.filter(r => r.auto_executed).length} items

PMA standing by for further instructions.`;

    return Response.json({
      success: true,
      resolutions,
      brief
    });

  } catch (error) {
    console.error('[PMA] Auto-resolve error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});