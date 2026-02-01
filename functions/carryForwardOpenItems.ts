import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Carry forward open action items to next week
 * Run this weekly (Sunday 11:59pm) or on-demand
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { from_week_id, to_week_id } = await req.json();

    if (!from_week_id || !to_week_id) {
      return Response.json({ error: 'from_week_id and to_week_id required' }, { status: 400 });
    }

    // Fetch open action items from source week
    const openItems = await base44.asServiceRole.entities.ProductionNote.filter({
      week_id: from_week_id,
      note_type: 'action',
      status: { $in: ['open', 'in_progress', 'blocked'] }
    });

    if (openItems.length === 0) {
      return Response.json({ message: 'No open items to carry forward', carried: 0 });
    }

    // Create copies in new week with carried_from_week_id set
    const carriedItems = openItems.map(item => ({
      project_id: item.project_id,
      week_id: to_week_id,
      note_type: item.note_type,
      category: item.category,
      title: item.title,
      body: item.body,
      owner_email: item.owner_email,
      due_date: item.due_date,
      status: item.status,
      priority: item.priority,
      carried_from_week_id: from_week_id,
      tags: item.tags,
      linked_rfi_ids: item.linked_rfi_ids,
      linked_change_order_ids: item.linked_change_order_ids
    }));

    await base44.asServiceRole.entities.ProductionNote.bulkCreate(carriedItems);

    return Response.json({
      success: true,
      carried: carriedItems.length,
      from: from_week_id,
      to: to_week_id
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});