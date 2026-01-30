import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

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

    // Fetch project context
    const projects = await base44.entities.Project.filter({ id: project_id });
    const project = projects[0];

    if (!project) {
      return Response.json({ error: 'Project not found' }, { status: 404 });
    }

    // Fetch tasks
    const tasks = await base44.entities.Task.filter({ 
      project_id,
      status: { $in: ['not_started', 'in_progress', 'blocked'] }
    });

    // Fetch related data
    const rfis = await base44.entities.RFI.filter({ 
      project_id,
      status: { $in: ['submitted', 'under_review'] }
    });

    const changeOrders = await base44.entities.ChangeOrder.filter({
      project_id,
      status: { $in: ['submitted', 'under_review'] }
    });

    const drawingSets = await base44.entities.DrawingSet.filter({
      project_id,
      status: { $in: ['IFA', 'BFA', 'BFS', 'Revise & Resubmit'] }
    });

    // Build context for AI
    const context = {
      project: {
        name: project.name,
        phase: project.phase,
        status: project.status,
        target_completion: project.target_completion,
        baseline_shop_hours: project.baseline_shop_hours,
        baseline_field_hours: project.baseline_field_hours
      },
      tasks: tasks.map(t => ({
        id: t.id,
        name: t.name,
        phase: t.phase,
        status: t.status,
        start_date: t.start_date,
        end_date: t.end_date,
        estimated_hours: t.estimated_hours,
        actual_hours: t.actual_hours,
        progress_percent: t.progress_percent,
        is_critical: t.is_critical,
        predecessor_ids: t.predecessor_ids,
        linked_rfi_ids: t.linked_rfi_ids,
        linked_drawing_set_ids: t.linked_drawing_set_ids
      })),
      blocking_factors: {
        open_rfis: rfis.length,
        pending_change_orders: changeOrders.length,
        drawings_pending_approval: drawingSets.filter(d => d.status === 'IFA' || d.status === 'BFA').length,
        critical_rfis: rfis.filter(r => r.priority === 'critical' || r.priority === 'high').length
      }
    };

    const prompt = `You are an AI assistant for a structural steel project manager. Analyze the following project data and prioritize tasks.

Project: ${context.project.name}
Phase: ${context.project.phase}
Target Completion: ${context.project.target_completion}

Tasks (${tasks.length}):
${JSON.stringify(context.tasks, null, 2)}

Blocking Factors:
- ${context.blocking_factors.open_rfis} open RFIs (${context.blocking_factors.critical_rfis} critical/high priority)
- ${context.blocking_factors.pending_change_orders} pending change orders
- ${context.blocking_factors.drawings_pending_approval} drawings pending approval

For each task, provide:
1. Priority score (1-10, where 10 is highest priority)
2. Priority rationale (construction logic: detailing → fabrication → delivery → erection)
3. Recommended action
4. Blockers or dependencies to address
5. Estimated impact on schedule if delayed

Consider:
- Steel erection sequencing logic
- Critical path analysis
- Drawing approval dependencies
- RFI impacts
- Resource conflicts
- Weather/safety windows
- Subcontractor coordination

Return ONLY valid JSON matching this schema:
{
  "prioritized_tasks": [
    {
      "task_id": "string",
      "task_name": "string",
      "priority_score": number,
      "priority_level": "critical|high|medium|low",
      "rationale": "string",
      "recommended_action": "string",
      "blockers": ["string"],
      "schedule_impact_days": number,
      "must_start_by": "YYYY-MM-DD or null"
    }
  ],
  "critical_path_tasks": ["task_id"],
  "immediate_attention": ["task_id"],
  "summary": "string"
}`;

    const response = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          prioritized_tasks: {
            type: "array",
            items: {
              type: "object",
              properties: {
                task_id: { type: "string" },
                task_name: { type: "string" },
                priority_score: { type: "number" },
                priority_level: { type: "string" },
                rationale: { type: "string" },
                recommended_action: { type: "string" },
                blockers: { type: "array", items: { type: "string" } },
                schedule_impact_days: { type: "number" },
                must_start_by: { type: ["string", "null"] }
              }
            }
          },
          critical_path_tasks: { type: "array", items: { type: "string" } },
          immediate_attention: { type: "array", items: { type: "string" } },
          summary: { type: "string" }
        }
      }
    });

    return Response.json({
      success: true,
      analysis: response,
      analyzed_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('AI Task Prioritization Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});