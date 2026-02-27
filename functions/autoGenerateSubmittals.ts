import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Standard lead times in days per submittal type/phase
const PHASE_LEAD_TIMES = {
  detailing: { shop_drawing: 14, material: 7, certification: 10, test_report: 7 },
  fabrication: { shop_drawing: 10, material: 5, certification: 7, test_report: 5 },
  erection: { shop_drawing: 7, material: 3, certification: 5, test_report: 3 },
  default: { shop_drawing: 14, material: 7, certification: 10, test_report: 7, equipment: 10, other: 7 }
};

function addBusinessDays(startDate, days) {
  const date = new Date(startDate);
  let added = 0;
  while (added < days) {
    date.setDate(date.getDate() + 1);
    const dow = date.getDay();
    if (dow !== 0 && dow !== 6) added++;
  }
  return date.toISOString().split('T')[0];
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    // Accept direct call { project_id, drawing_set_id } or entity automation payload
    const drawingSetId = body.drawing_set_id || body.data?.id || body.event?.entity_id;
    const projectId = body.project_id || body.data?.project_id;

    if (!drawingSetId || !projectId) {
      return Response.json({ error: 'project_id and drawing_set_id required' }, { status: 400 });
    }

    // Fetch drawing set, project, existing submittals
    const [drawingSet, project, existingSubmittals, existingSubmittalsAll] = await Promise.all([
      base44.asServiceRole.entities.DrawingSet.filter({ id: drawingSetId }).then(r => r[0]),
      base44.asServiceRole.entities.Project.filter({ id: projectId }).then(r => r[0]),
      base44.asServiceRole.entities.Submittal.filter({ project_id: projectId }),
      base44.asServiceRole.entities.Submittal.filter({ project_id: projectId })
    ]);

    if (!drawingSet || !project) {
      return Response.json({ error: 'Drawing set or project not found' }, { status: 404 });
    }

    const phase = project.phase || 'detailing';
    const leadTimes = PHASE_LEAD_TIMES[phase] || PHASE_LEAD_TIMES.default;
    const today = new Date().toISOString().split('T')[0];
    const nextSubNum = Math.max(...existingSubmittals.map(s => s.submittal_number || 0), 0) + 1;

    // Use AI to identify required submittals based on drawing set context + project scope
    const aiPrompt = `You are a structural steel project manager reviewing a newly uploaded drawing set to determine required submittals.

Drawing Set Info:
- Title: ${drawingSet.title}
- Set Number: ${drawingSet.set_number}
- Discipline: ${drawingSet.discipline}
- Status: ${drawingSet.status}
- Spec Section: ${drawingSet.spec_section || 'Not specified'}

Project Info:
- Name: ${project.name}
- Phase: ${phase}
- Scope of Work: ${project.scope_of_work || 'Structural steel fabrication and erection'}

Current phase is: ${phase}

Identify ONLY the submittals that are genuinely required for this drawing set and phase. Be specific and practical — think like a PM who needs to track these through approval.

Return a JSON array of submittal objects. Each object must have:
{
  "title": "specific submittal title",
  "type": one of ["shop_drawing", "material", "equipment", "certification", "test_report", "other"],
  "description": "what needs to be included and why it's required",
  "priority": one of ["low", "medium", "high", "critical"],
  "reviewer": null
}

Typical required submittals for structural steel by phase:
- detailing: Shop drawings for each drawing set, connection details, anchor bolt plans
- fabrication: Mill certs, material test reports, bolt certifications, weld procedure specs (WPS), welder qualifications (WQR/CWI), paint/coating data sheets
- erection: Erection sequence drawings, crane/rigging plans, temporary bracing details, bolt torque records

Return ONLY the JSON array. No markdown, no explanation.`;

    const aiResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: aiPrompt,
      response_json_schema: {
        type: 'object',
        properties: {
          submittals: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                type: { type: 'string' },
                description: { type: 'string' },
                priority: { type: 'string' },
                reviewer: { type: ['string', 'null'] }
              },
              required: ['title', 'type', 'description', 'priority']
            }
          }
        },
        required: ['submittals']
      }
    });

    const suggestedSubmittals = aiResult?.submittals || [];

    if (suggestedSubmittals.length === 0) {
      return Response.json({ success: true, created: 0, message: 'No submittals identified by AI' });
    }

    // Deduplicate against existing submittal titles (case-insensitive)
    const existingTitles = new Set(existingSubmittals.map(s => s.title?.toLowerCase()));
    const newSubmittals = suggestedSubmittals.filter(s => !existingTitles.has(s.title?.toLowerCase()));

    // Create submittals
    const created = [];
    for (let i = 0; i < newSubmittals.length; i++) {
      const s = newSubmittals[i];
      const leadDays = leadTimes[s.type] || 14;
      const dueDate = addBusinessDays(today, leadDays);

      const submittal = await base44.asServiceRole.entities.Submittal.create({
        project_id: projectId,
        submittal_number: nextSubNum + i,
        title: s.title,
        description: s.description,
        type: s.type,
        priority: s.priority || 'medium',
        status: 'draft',
        due_date: dueDate,
        reviewer: project.project_manager || null,
        linked_drawing_set_ids: [drawingSetId],
        notes: `Auto-generated from drawing set: ${drawingSet.set_number} – ${drawingSet.title} (${phase} phase)`
      });

      created.push(submittal);
    }

    return Response.json({
      success: true,
      drawing_set: drawingSet.title,
      phase,
      identified: suggestedSubmittals.length,
      skipped_duplicates: suggestedSubmittals.length - newSubmittals.length,
      created: created.length,
      submittal_ids: created.map(s => s.id)
    });

  } catch (error) {
    console.error('autoGenerateSubmittals error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});