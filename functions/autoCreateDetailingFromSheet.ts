import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    const { event, data } = payload;

    // Only process create events
    if (event.type !== 'create') {
      return Response.json({ success: true, message: 'Not a create event, skipping' });
    }

    // Validate DrawingSheet has required fields
    if (!data?.project_id || !data?.sheet_number) {
      return Response.json({ 
        success: false, 
        error: 'DrawingSheet missing project_id or sheet_number' 
      }, { status: 400 });
    }

    // Infer discipline from sheet_name
    const sheetName = (data.sheet_name || data.sheet_number || '').toLowerCase();
    let discipline = 'structural';
    
    if (sheetName.includes('stair')) discipline = 'stairs';
    else if (sheetName.includes('rail') || sheetName.includes('handrail')) discipline = 'rails';
    else if (sheetName.includes('misc')) discipline = 'misc_metals';
    else if (sheetName.includes('other')) discipline = 'other';

    // Create Detailing record
    const detailing = await base44.asServiceRole.entities.Detailing.create({
      project_id: data.project_id,
      title: data.sheet_name || `Detailing - ${data.sheet_number}`,
      discipline,
      status: 'not_started',
      drawing_set_id: data.drawing_set_id || null,
      sheet_number: data.sheet_number,
      priority: 'medium',
      design_intent_change: false,
      cost_impact: 0,
      schedule_impact_days: 0,
      engineer_review_required: false
    });

    return Response.json({
      success: true,
      message: 'Detailing record created',
      detailing_id: detailing.id,
      discipline
    });

  } catch (error) {
    console.error('Error auto-creating Detailing:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});