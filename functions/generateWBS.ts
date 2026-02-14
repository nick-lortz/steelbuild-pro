import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { project_id, project_type, scope_description, square_footage, key_deliverables, baseline_shop_hours, baseline_field_hours } = await req.json();

        if (!project_id) {
            return Response.json({ error: 'project_id required' }, { status: 400 });
        }

        const project = await base44.entities.Project.filter({ id: project_id }).then(p => p[0]);
        if (!project) {
            return Response.json({ error: 'Project not found' }, { status: 404 });
        }

        const prompt = `You are an expert steel fabrication and erection project planner. Generate a detailed Work Breakdown Structure (WBS) for this project.

PROJECT DETAILS:
- Name: ${project.name}
- Project Number: ${project.project_number}
- Type: ${project_type || project.structure_anatomy_job_type || 'General Steel Structure'}
- Square Footage: ${square_footage || project.rough_square_footage || 'Not specified'}
- Contract Value: $${project.contract_value?.toLocaleString() || '0'}
- Baseline Shop Hours: ${baseline_shop_hours || project.baseline_shop_hours || 0}
- Baseline Field Hours: ${baseline_field_hours || project.baseline_field_hours || 0}

SCOPE:
${scope_description || project.scope_of_work || 'Steel fabrication and erection'}

KEY DELIVERABLES:
${key_deliverables || 'Standard steel package'}

Generate a comprehensive WBS organized by the standard steel project phases:
1. **Detailing** - shop drawings, connection design, submittals
2. **Fabrication** - material procurement, shop production, quality control
3. **Delivery** - logistics planning, transportation, site coordination
4. **Erection** - field installation, bolting, welding, safety
5. **Closeout** - punchlist, as-builts, warranty, final inspections

For each task, provide:
- Task name (specific to steel construction)
- Phase (detailing/fabrication/delivery/erection/closeout)
- Estimated duration in days
- WBS code (e.g., 1.1, 1.2, 2.1, etc.)
- Brief description
- Whether it's a milestone

Consider:
- Typical steel project sequences (detailing before fabrication, fabrication before delivery, etc.)
- Industry standard durations
- Common dependencies in steel work
- Critical milestones (shop drawing approval, material release, first piece erection, topping out)

Generate 15-30 tasks depending on project complexity.`;

        const aiResponse = await base44.integrations.Core.InvokeLLM({
            prompt,
            response_json_schema: {
                type: "object",
                properties: {
                    tasks: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                name: { type: "string" },
                                phase: { 
                                    type: "string",
                                    enum: ["detailing", "fabrication", "delivery", "erection", "closeout"]
                                },
                                wbs_code: { type: "string" },
                                description: { type: "string" },
                                duration_days: { type: "number" },
                                is_milestone: { type: "boolean" },
                                estimated_hours: { type: "number" }
                            }
                        }
                    },
                    phase_summaries: {
                        type: "object",
                        properties: {
                            detailing: { type: "string" },
                            fabrication: { type: "string" },
                            delivery: { type: "string" },
                            erection: { type: "string" },
                            closeout: { type: "string" }
                        }
                    },
                    total_estimated_duration_days: { type: "number" },
                    critical_milestones: {
                        type: "array",
                        items: { type: "string" }
                    }
                }
            }
        });

        return Response.json({
            wbs: aiResponse.tasks,
            phase_summaries: aiResponse.phase_summaries,
            total_duration: aiResponse.total_estimated_duration_days,
            critical_milestones: aiResponse.critical_milestones,
            generated_at: new Date().toISOString()
        });

    } catch (error) {
        console.error("Error generating WBS:", error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});