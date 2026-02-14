import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { project_id, task_ids } = await req.json();

    if (!project_id) {
      return Response.json({ error: 'project_id is required' }, { status: 400 });
    }

    // Fetch project and tasks
    const projects = await base44.entities.Project.filter({ id: project_id });
    const project = projects[0];

    if (!project) {
      return Response.json({ error: 'Project not found' }, { status: 404 });
    }

    // Get tasks to analyze
    const tasks = task_ids 
      ? await Promise.all(task_ids.map(id => base44.entities.Task.filter({ id })))
          .then(results => results.map(r => r[0]).filter(Boolean))
      : await base44.entities.Task.filter({ project_id, status: { $in: ['not_started', 'in_progress'] } });

    if (tasks.length === 0) {
      return Response.json({
        prioritized_tasks: [],
        bottlenecks: [],
        critical_tasks: [],
        optimizations: []
      });
    }

    // Analyze with AI
    const prompt = `You are a construction project scheduling expert specializing in structural steel fabrication and erection.

Project: ${project.name}
Type: ${project.structure_anatomy_job_type || 'Steel Construction'}
Target Completion: ${project.target_completion || 'Not set'}

Tasks to prioritize (${tasks.length} total):
${tasks.map((t, idx) => `
${idx + 1}. ${t.name}
   - Phase: ${t.phase}
   - Duration: ${t.duration_days || 0} days
   - End Date: ${t.end_date || 'Not set'}
   - Status: ${t.status}
   - Dependencies: ${t.predecessor_ids?.length || 0}
   - Float: ${t.float_days || 0} days
   - Critical: ${t.is_critical ? 'Yes' : 'No'}
`).join('\n')}

Analyze these tasks considering:
1. Steel sequencing logic (detailing → fabrication → delivery → erection)
2. Critical path and float
3. Dependencies and blocking conditions
4. Deadline proximity
5. Resource constraints
6. Practical field conditions

Provide a JSON response with:
{
  "prioritized_tasks": [
    {
      "task_id": "task_id",
      "task_name": "task name",
      "priority_rank": 1,
      "severity": "critical|high|medium|low",
      "reasoning": "why this task should be prioritized",
      "deadline": "YYYY-MM-DD or null"
    }
  ],
  "bottlenecks": [
    {
      "task_id": "task_id",
      "task_name": "task name",
      "reason": "why this is a bottleneck"
    }
  ],
  "critical_tasks": ["task_id1", "task_id2"],
  "optimizations": [
    {
      "type": "parallel|resequence|resource",
      "description": "optimization recommendation"
    }
  ]
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
                priority_rank: { type: "number" },
                severity: { type: "string" },
                reasoning: { type: "string" },
                deadline: { type: "string" }
              }
            }
          },
          bottlenecks: {
            type: "array",
            items: {
              type: "object",
              properties: {
                task_id: { type: "string" },
                task_name: { type: "string" },
                reason: { type: "string" }
              }
            }
          },
          critical_tasks: {
            type: "array",
            items: { type: "string" }
          },
          optimizations: {
            type: "array",
            items: {
              type: "object",
              properties: {
                type: { type: "string" },
                description: { type: "string" }
              }
            }
          }
        }
      }
    });

    return Response.json(response);
  } catch (error) {
    console.error('AI task prioritization error:', error);
    return Response.json({ 
      error: error.message || 'Failed to analyze tasks',
      prioritized_tasks: [],
      bottlenecks: [],
      critical_tasks: [],
      optimizations: []
    }, { status: 500 });
  }
});