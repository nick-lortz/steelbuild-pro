import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Auto-route RFI to appropriate stakeholders based on type & discipline
 * Structural engineer → connection_detail, member_size_length, tolerance_fitup
 * Detailer → erection_sequence, embed_anchor, coating_finish
 * Architect → coordination questions
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { project_id, rfi_type, discipline, is_internal } = await req.json();

    const routing = {
      connection_detail: { role: 'structural_engineer', internal: true },
      member_size_length: { role: 'structural_engineer', internal: true },
      embed_anchor: { role: 'detailer', internal: true },
      tolerance_fitup: { role: 'detailer', internal: true },
      coating_finish: { role: 'detailer', internal: false },
      erection_sequence: { role: 'pm', internal: true },
      other: { role: 'pm', internal: false }
    };

    const route = routing[rfi_type] || routing.other;

    // Fetch project PM & team
    const project = await base44.entities.Project.filter({
      id: project_id
    });

    if (!project || project.length === 0) {
      return Response.json({ error: 'Project not found' }, { status: 404 });
    }

    const proj = project[0];
    const pm_email = proj.project_manager;
    const assigned_users = proj.assigned_users || [];

    // Route decision
    const recipients = [];
    const ballInCourt = route.internal ? 'internal' : 'external';

    if (route.role === 'structural_engineer' && assigned_users.length > 0) {
      recipients.push(...assigned_users);
    } else if (route.role === 'detailer' && assigned_users.length > 0) {
      recipients.push(assigned_users[0]);
    } else if (pm_email) {
      recipients.push(pm_email);
    }

    return Response.json({
      recommended_ball_in_court: ballInCourt,
      recommended_recipients: recipients,
      routed_by_type: route.role,
      send_to_external: !route.internal
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});