import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { requireProjectAccess } from './utils/requireProjectAccess.js';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { project_id, sov_code, description, sov_category, scheduled_value } = await req.json();

  if (!project_id || !sov_code || !description || !scheduled_value) {
    return Response.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // Verify project access
  await requireProjectAccess(base44, user, project_id);

  // Prevent duplicate sov_code per project
  const existing = await base44.entities.SOVItem.filter({ 
    project_id, 
    sov_code 
  });

  if (existing.length > 0) {
    return Response.json({ 
      error: `SOV code ${sov_code} already exists for this project` 
    }, { status: 400 });
  }

  // Create SOV item with immutable scheduled_value
  const sovItem = await base44.entities.SOVItem.create({
    project_id,
    sov_code,
    description,
    sov_category: sov_category || 'other',
    scheduled_value: Number(scheduled_value),
    percent_complete: 0,
    billed_to_date: 0,
    earned_to_date: 0
  });

  return Response.json({
    message: 'SOV item created',
    sov_item: sovItem
  });
});