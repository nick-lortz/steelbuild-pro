import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { full_name, phone, title, department } = await req.json();

  try {
    // Update using service role to ensure it persists
    const updatedUser = await base44.asServiceRole.entities.User.update(user.id, {
      full_name: full_name || user.full_name,
      phone: phone !== undefined ? phone : user.phone,
      title: title !== undefined ? title : user.title,
      department: department !== undefined ? department : user.department
    });

    return Response.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error('Update error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});