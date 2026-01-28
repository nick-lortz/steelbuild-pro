import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { operation, data } = await req.json();

    switch (operation) {
      case 'create':
        // Verify user has access to the project
        const createProjects = await base44.asServiceRole.entities.Project.filter({ id: data.project_id });
        if (!createProjects.length) {
          return Response.json({ error: 'Project not found' }, { status: 404 });
        }
        
        const createProject = createProjects[0];
        const createAccess = user.role === 'admin' || 
          createProject.project_manager === user.email || 
          createProject.superintendent === user.email ||
          (createProject.assigned_users && createProject.assigned_users.includes(user.email));

        if (!createAccess) {
          return Response.json({ error: 'Access denied to this project' }, { status: 403 });
        }

        const created = await base44.asServiceRole.entities.Financial.create(data);
        return Response.json({ success: true, data: created });

      case 'update':
        // Verify user has access to the budget line's project
        const updateRecords = await base44.asServiceRole.entities.Financial.filter({ id: data.id });
        if (!updateRecords.length) {
          return Response.json({ error: 'Budget line not found' }, { status: 404 });
        }

        const updateProjects = await base44.asServiceRole.entities.Project.filter({ id: updateRecords[0].project_id });
        if (!updateProjects.length) {
          return Response.json({ error: 'Project not found' }, { status: 404 });
        }
        
        const updateProject = updateProjects[0];
        const updateAccess = user.role === 'admin' || 
          updateProject.project_manager === user.email || 
          updateProject.superintendent === user.email ||
          (updateProject.assigned_users && updateProject.assigned_users.includes(user.email));

        if (!updateAccess) {
          return Response.json({ error: 'Access denied to this project' }, { status: 403 });
        }

        // INTEGRITY: Block manual actual_amount updates
        // Actual costs flow from Expense entity (source of truth)
        if (data.updates.actual_amount !== undefined) {
          return Response.json({ 
            error: 'Cannot manually set actual_amount. Actual costs come from Expenses only.' 
          }, { status: 403 });
        }
        
        // INTEGRITY: Block manual forecast_amount updates
        // Forecast is derived from EAC calculation, not entered manually
        if (data.updates.forecast_amount !== undefined) {
          return Response.json({ 
            error: 'Cannot manually set forecast_amount. It is calculated from EAC.' 
          }, { status: 403 });
        }
        
        // INTEGRITY: Block manual committed_amount (from expenses only)
        if (data.updates.committed_amount !== undefined) {
          return Response.json({
            error: 'Cannot manually set committed_amount. It is calculated from Expense status.'
          }, { status: 403 });
        }
        
        await base44.asServiceRole.entities.Financial.update(data.id, data.updates);
        return Response.json({ success: true });

      case 'delete':
        // Verify user has access to the budget line's project
        const deleteRecords = await base44.asServiceRole.entities.Financial.filter({ id: data.id });
        if (!deleteRecords.length) {
          return Response.json({ error: 'Budget line not found' }, { status: 404 });
        }

        const deleteProjects = await base44.asServiceRole.entities.Project.filter({ id: deleteRecords[0].project_id });
        if (!deleteProjects.length) {
          return Response.json({ error: 'Project not found' }, { status: 404 });
        }
        
        const deleteProject = deleteProjects[0];
        const deleteAccess = user.role === 'admin' || 
          deleteProject.project_manager === user.email || 
          deleteProject.superintendent === user.email ||
          (deleteProject.assigned_users && deleteProject.assigned_users.includes(user.email));

        if (!deleteAccess) {
          return Response.json({ error: 'Access denied to this project' }, { status: 403 });
        }

        await base44.asServiceRole.entities.Financial.delete(data.id);
        return Response.json({ success: true });

      default:
        return Response.json({ error: 'Invalid operation' }, { status: 400 });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});