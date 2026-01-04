import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { project_id } = await req.json();

    // Fetch project data
    const [tasks, project, drawings, rfis, changeOrders] = await Promise.all([
      base44.entities.Task.filter({ project_id }),
      base44.entities.Project.list().then(p => p.find(pr => pr.id === project_id)),
      base44.entities.DrawingSet.filter({ project_id }),
      base44.entities.RFI.filter({ project_id }),
      base44.entities.ChangeOrder.filter({ project_id })
    ]);

    const prompt = `Analyze this structural steel project schedule and predict potential delays.

PROJECT: ${project?.name || 'Unknown'}
STATUS: ${project?.status || 'Unknown'}
TARGET COMPLETION: ${project?.target_completion || 'Not set'}

TASKS (${tasks.length} total):
${tasks.map(t => `- ${t.name} | Phase: ${t.phase} | Status: ${t.status} | Start: ${t.start_date} | End: ${t.end_date} | Progress: ${t.progress_percent}%`).join('\n')}

DRAWINGS: ${drawings.length} total, ${drawings.filter(d => d.status === 'IFA').length} IFA, ${drawings.filter(d => d.status === 'FFF').length} released
RFIS: ${rfis.length} total, ${rfis.filter(r => r.status === 'pending' || r.status === 'submitted').length} pending
CHANGE ORDERS: ${changeOrders.length} total, ${changeOrders.filter(c => c.status === 'pending').length} pending

Based on typical structural steel project patterns, identify:
1. Tasks at high risk of delay with specific reasons
2. Critical path impacts
3. Upstream dependencies blocking progress
4. Drawing approval bottlenecks
5. Estimated delay duration in days

Return structured JSON with this schema:
{
  "high_risk_tasks": [{"task_id": "string", "task_name": "string", "delay_probability": number 0-100, "estimated_delay_days": number, "reason": "string"}],
  "critical_path_impact": {"affected": boolean, "impact_days": number, "description": "string"},
  "blocking_dependencies": ["string descriptions"],
  "drawing_bottlenecks": ["string descriptions"],
  "overall_delay_risk": number 0-100,
  "mitigation_actions": ["string recommendations"]
}`;

    const response = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          high_risk_tasks: {
            type: "array",
            items: {
              type: "object",
              properties: {
                task_id: { type: "string" },
                task_name: { type: "string" },
                delay_probability: { type: "number" },
                estimated_delay_days: { type: "number" },
                reason: { type: "string" }
              }
            }
          },
          critical_path_impact: {
            type: "object",
            properties: {
              affected: { type: "boolean" },
              impact_days: { type: "number" },
              description: { type: "string" }
            }
          },
          blocking_dependencies: { type: "array", items: { type: "string" } },
          drawing_bottlenecks: { type: "array", items: { type: "string" } },
          overall_delay_risk: { type: "number" },
          mitigation_actions: { type: "array", items: { type: "string" } }
        }
      }
    });

    return Response.json(response);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});