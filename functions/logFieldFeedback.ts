import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      project_id,
      issue_type,
      connection_type,
      piece_marks,
      description,
      photo_urls,
      suggested_fix
    } = await req.json();

    if (!project_id || !issue_type || !connection_type) {
      return Response.json({ error: 'Required fields missing' }, { status: 400 });
    }

    // Get all existing feedback for this project
    const existingFeedback = await base44.asServiceRole.entities.Document.filter({
      project_id,
      category: 'field_feedback',
      status: 'approved'
    });

    // Track rework frequency
    const feedbackKey = `${connection_type}|${issue_type}`;
    const frequencyMap = {};

    existingFeedback.forEach(doc => {
      try {
        const meta = doc.description ? JSON.parse(doc.description) : null;
        if (meta) {
          const key = `${meta.connection_type}|${meta.issue_type}`;
          frequencyMap[key] = (frequencyMap[key] || 0) + 1;
        }
      } catch (e) {
        // skip
      }
    });

    const reworkFrequency = frequencyMap[feedbackKey] || 0;
    const isRecurring = reworkFrequency >= 2;

    // Create feedback record
    const feedbackRecord = await base44.asServiceRole.entities.Document.create({
      project_id,
      title: `Field Feedback: ${issue_type} - ${connection_type}`,
      category: 'field_feedback',
      status: 'approved',
      description: JSON.stringify({
        issue_type,
        connection_type,
        piece_marks: piece_marks || [],
        field_notes: description,
        suggested_fix,
        is_recurring: isRecurring,
        rework_frequency: reworkFrequency + 1,
        logged_by: user.email,
        logged_at: new Date().toISOString()
      }),
      file_url: photo_urls?.[0] || null
    });

    // AI analysis if recurring issue
    let aiSuggestion = null;
    if (isRecurring) {
      const aiPrompt = `Field has reported this issue ${reworkFrequency + 1} times:
Connection Type: ${connection_type}
Issue: ${issue_type}
Field Notes: ${description}
Suggested Fix: ${suggested_fix || 'None provided'}

Suggest detail library improvements or drawing callout changes to prevent future rework.
Keep response concise and actionable for detailing team.`;

      const aiResult = await base44.integrations.Core.InvokeLLM({
        prompt: aiPrompt,
        response_json_schema: {
          type: 'object',
          properties: {
            suggestion: { type: 'string' },
            drawing_change: { type: 'string' },
            estimated_rework_hours_saved: { type: 'number' }
          }
        }
      });

      aiSuggestion = aiResult.data;
    }

    return Response.json({
      success: true,
      feedback_id: feedbackRecord.id,
      rework_frequency: reworkFrequency + 1,
      is_recurring: isRecurring,
      ai_suggestion: aiSuggestion
    });
  } catch (error) {
    console.error('Field feedback logging error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});