import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { full_name, phone, title, department, display_preferences, workflow_preferences } = body;

  try {
    const updatePayload = {};

    // Profile fields
    if (full_name !== undefined) updatePayload.full_name = full_name;
    if (phone !== undefined) updatePayload.phone = phone;
    if (title !== undefined) updatePayload.title = title;
    if (department !== undefined) updatePayload.department = department;

    // Preference blobs — merge with existing
    if (display_preferences !== undefined) {
      updatePayload.display_preferences = {
        ...(user.display_preferences || {}),
        ...display_preferences
      };
    }
    if (workflow_preferences !== undefined) {
      updatePayload.workflow_preferences = {
        ...(user.workflow_preferences || {}),
        ...workflow_preferences
      };
    }

    // Use auth.updateMe for full_name (it's a protected built-in field)
    if (updatePayload.full_name !== undefined) {
      await base44.auth.updateMe({ full_name: updatePayload.full_name });
      delete updatePayload.full_name;
    }

    // Update remaining custom fields on the User entity
    if (Object.keys(updatePayload).length > 0) {
      await base44.asServiceRole.entities.User.update(user.id, updatePayload);
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('Update error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});