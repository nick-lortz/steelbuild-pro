import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { project_id, work_package_id } = await req.json();

    const [project, tasks, workPackage, drawings] = await Promise.all([
      base44.entities.Project.list().then(p => p.find(pr => pr.id === project_id)),
      base44.entities.Task.filter({ project_id }),
      work_package_id ? base44.entities.WorkPackage.list().then(wp => wp.find(w => w.id === work_package_id)) : null,
      base44.entities.DrawingSet.filter({ project_id })
    ]);

    const relevantTasks = work_package_id ? tasks.filter(t => t.work_package_id === work_package_id) : tasks;

    const prompt = `As a structural steel project manager, suggest optimal task sequencing for this work scope.

PROJECT: ${project?.name}
${workPackage ? `WORK PACKAGE: ${workPackage.package_number} - ${workPackage.name}` : 'FULL PROJECT SCOPE'}
${workPackage?.tonnage ? `TONNAGE: ${workPackage.tonnage} tons` : ''}
${workPackage?.piece_count ? `PIECE COUNT: ${workPackage.piece_count}` : ''}

EXISTING TASKS:
${relevantTasks.map(t => `- ${t.name} | Phase: ${t.phase} | Status: ${t.status} | Duration: ${t.duration_days || 0}d`).join('\n')}

DRAWINGS STATUS:
${drawings.map(d => `- ${d.set_name}: ${d.status}`).join('\n')}

Follow standard structural steel sequencing (detailing → fabrication → delivery → erection).

Consider:
1. Phase dependencies (no erection until delivery, no fabrication until detailing complete)
2. Critical path optimization
3. Resource leveling
4. Drawing approval requirements
5. Site access and sequencing logic

Return JSON:
{
  "recommended_sequence": [{"task_id": "string", "task_name": "string", "sequence_order": number, "phase": "string", "rationale": "string"}],
  "critical_dependencies": [{"from_task": "string", "to_task": "string", "reason": "string"}],
  "optimization_notes": ["string"],
  "duration_estimate_days": number
}`;

    const response = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          recommended_sequence: {
            type: "array",
            items: {
              type: "object",
              properties: {
                task_id: { type: "string" },
                task_name: { type: "string" },
                sequence_order: { type: "number" },
                phase: { type: "string" },
                rationale: { type: "string" }
              }
            }
          },
          critical_dependencies: {
            type: "array",
            items: {
              type: "object",
              properties: {
                from_task: { type: "string" },
                to_task: { type: "string" },
                reason: { type: "string" }
              }
            }
          },
          optimization_notes: { type: "array", items: { type: "string" } },
          duration_estimate_days: { type: "number" }
        }
      }
    });

    return Response.json(response);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});