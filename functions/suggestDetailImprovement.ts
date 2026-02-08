import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { field_issue_id, project_id } = await req.json();

    if (!field_issue_id || !project_id) {
      return Response.json({ error: 'Missing field_issue_id or project_id' }, { status: 400 });
    }

    // Get the field issue
    const issues = await base44.entities.FieldIssue.filter({ id: field_issue_id });
    const fieldIssue = issues?.[0];

    if (!fieldIssue) {
      return Response.json({ error: 'Field issue not found' }, { status: 404 });
    }

    // Analyze for repeat pattern
    const allIssues = await base44.entities.FieldIssue.filter({
      project_id: project_id,
      issue_type: fieldIssue.issue_type,
      affected_connection_types: fieldIssue.affected_connection_types?.[0]
    });

    // Find similar issues (same type, connection, root cause)
    const similarIssues = allIssues.filter(
      i => i.root_cause === fieldIssue.root_cause &&
           i.severity !== 'minor' &&
           i.id !== field_issue_id
    );

    const isRepeat = similarIssues.length > 0;
    const evidenceCount = similarIssues.length + 1;

    // Check for design-intent implications
    const designIntentChanges = [
      'fit_up_tolerance',
      'member_size',
      'plate_thickness',
      'bolt_spec',
      'weld_spec',
      'code_requirement'
    ];
    const isDesignIntentChange = designIntentChanges.includes(fieldIssue.root_cause);

    // AI prompt
    const prompt = `
You are a structural steel detailing expert analyzing a field issue to suggest a preventive detail improvement.

FIELD ISSUE:
Type: ${fieldIssue.issue_type}
Root Cause: ${fieldIssue.root_cause}
Description: ${fieldIssue.description}
Severity: ${fieldIssue.severity}
Connection Types Affected: ${fieldIssue.affected_connection_types?.join(', ') || 'N/A'}
Is Repeat Issue: ${isRepeat ? 'YES - ' + evidenceCount + ' similar instances found' : 'No (single occurrence)'}

TASK:
Suggest a DetailImprovement that:
1. Fixes the root cause
2. Is constructible and fabrication-friendly
3. Respects existing design intent if possible
4. Avoids over-engineering

RESPONSE FORMAT (JSON):
{
  "title": "Brief title for detail improvement",
  "recommended_change": "Specific, measurable change (e.g., 'Increase edge distance from 1.5\" to 2.0\". Revise detail callout. Add note: \"Min 2.0\" clearance req for bolt access during erection.\"')",
  "confidence_score": 70-95,
  "confidence_reasoning": "Why you're confident in this suggestion",
  "applicability_tags": ["tag1", "tag2"],
  "constraints": {
    "min_thickness": null,
    "max_thickness": null,
    "bolt_diameter_range": "applicable range or null",
    "member_series": "applicable members or null",
    "erection_access_required": "requirement or null"
  },
  "recommended_for": "shop|field|both",
  "cost_impact_estimate": 0,
  "schedule_impact_estimate": 0,
  "design_intent_change": ${isDesignIntentChange},
  "ai_confidence_notes": "Detailed reasoning"
}

Return ONLY valid JSON, no markdown.
`;

    const aiResponse = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          recommended_change: { type: 'string' },
          confidence_score: { type: 'number' },
          confidence_reasoning: { type: 'string' },
          applicability_tags: { type: 'array', items: { type: 'string' } },
          constraints: { type: 'object' },
          recommended_for: { type: 'string' },
          cost_impact_estimate: { type: 'number' },
          schedule_impact_estimate: { type: 'number' },
          design_intent_change: { type: 'boolean' },
          ai_confidence_notes: { type: 'string' }
        }
      }
    });

    // Create DetailImprovement
    const detailImprovement = await base44.entities.DetailImprovement.create({
      project_id,
      title: aiResponse.title,
      connection_type: fieldIssue.affected_connection_types?.[0] || 'other',
      root_cause: fieldIssue.root_cause,
      description: fieldIssue.description,
      recommended_change: aiResponse.recommended_change,
      design_intent_change: aiResponse.design_intent_change,
      source_field_issues: [field_issue_id],
      applicability_tags: aiResponse.applicability_tags,
      constraints: aiResponse.constraints,
      recommended_for: aiResponse.recommended_for,
      confidence_score: aiResponse.confidence_score,
      evidence_count: evidenceCount,
      cost_impact_estimate: aiResponse.cost_impact_estimate,
      schedule_impact_estimate: aiResponse.schedule_impact_estimate,
      approval_threshold: aiResponse.design_intent_change ||
                          aiResponse.cost_impact_estimate > 0 ||
                          aiResponse.schedule_impact_estimate > 0
        ? 'requires_pm_approval'
        : 'detailing_lead_only',
      ai_generated: true,
      ai_confidence_notes: aiResponse.ai_confidence_notes,
      status: 'draft'
    });

    return Response.json({
      detail_improvement_id: detailImprovement.id,
      title: detailImprovement.title,
      confidence_score: detailImprovement.confidence_score,
      approval_threshold: detailImprovement.approval_threshold,
      design_intent_change: detailImprovement.design_intent_change,
      is_repeat: isRepeat,
      evidence_count: evidenceCount
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});