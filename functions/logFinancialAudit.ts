import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const payload = await req.json();
    const { event, data, old_data } = payload;

    // Determine user (default to system if not available)
    let changedBy = 'system';
    try {
      const user = await base44.auth.me();
      if (user?.email) changedBy = user.email;
    } catch {
      // If no user context, use system
    }

    // Extract project_id from data
    const projectId = data?.project_id || old_data?.project_id;

    // Build changes object for updates
    let changes = {};
    if (event.type === 'update' && old_data && data) {
      // Track financial field changes
      const financialFields = [
        'original_budget', 'approved_changes', 'current_budget',
        'committed_amount', 'actual_amount', 'forecast_amount',
        'amount', 'payment_status', 'scheduled_value', 'percent_complete'
      ];

      for (const field of financialFields) {
        if (data[field] !== undefined && data[field] !== old_data[field]) {
          changes[field] = {
            old: old_data[field],
            new: data[field]
          };
        }
      }
    }

    // Only log if there are meaningful changes or it's create/delete
    if (event.type !== 'update' || Object.keys(changes).length > 0) {
      await base44.asServiceRole.entities.AuditLog.create({
        entity_type: event.entity_name,
        entity_id: event.entity_id,
        project_id: projectId,
        action: event.type,
        changed_by: changedBy,
        changes: Object.keys(changes).length > 0 ? changes : null,
        metadata: {
          timestamp: new Date().toISOString()
        }
      });
    }

    return Response.json({ success: true });

  } catch (error) {
    console.error('Audit log error:', error);
    // Don't fail the main operation if audit logging fails
    return Response.json({ success: false, error: error.message });
  }
});