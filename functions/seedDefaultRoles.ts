import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Check if roles already exist
    const existingRoles = await base44.asServiceRole.entities.Role.list();
    if (existingRoles.length > 0) {
      return Response.json({ 
        success: true, 
        message: 'Roles already initialized',
        count: existingRoles.length 
      });
    }

    const defaultRoles = [
      {
        role_name: 'admin',
        display_name: 'Administrator',
        description: 'Full system access - all permissions',
        permissions: {
          projects: { view: true, create: true, edit: true, delete: true },
          schedule: { view: true, create: true, edit: true, delete: true },
          financials: { view: true, create: true, edit: true, delete: true, approve: true },
          rfis: { view: true, create: true, edit: true, delete: true, submit: true },
          change_orders: { view: true, create: true, edit: true, delete: true, approve: true },
          drawings: { view: true, create: true, edit: true, delete: true, approve: true },
          deliveries: { view: true, create: true, edit: true, delete: true },
          labor: { view: true, create: true, edit: true, delete: true, approve: true },
          equipment: { view: true, create: true, edit: true, delete: true },
          documents: { view: true, upload: true, edit: true, delete: true, approve: true },
          reports: { view: true, create: true, export: true },
          users: { view: true, invite: true, edit: true, delete: true },
          settings: { view: true, edit: true }
        }
      },
      {
        role_name: 'executive',
        display_name: 'Executive',
        description: 'High-level oversight - view and approve',
        permissions: {
          projects: { view: true, create: false, edit: false, delete: false },
          schedule: { view: true, create: false, edit: false, delete: false },
          financials: { view: true, create: false, edit: false, delete: false, approve: false },
          rfis: { view: true, create: false, edit: false, delete: false, submit: false },
          change_orders: { view: true, create: false, edit: false, delete: false, approve: true },
          drawings: { view: true, create: false, edit: false, delete: false, approve: false },
          deliveries: { view: true, create: false, edit: false, delete: false },
          labor: { view: true, create: false, edit: false, delete: false, approve: false },
          equipment: { view: true, create: false, edit: false, delete: false },
          documents: { view: true, upload: false, edit: false, delete: false, approve: false },
          reports: { view: true, create: false, export: true },
          users: { view: true, invite: false, edit: false, delete: false },
          settings: { view: true, edit: false }
        }
      },
      {
        role_name: 'project_manager',
        display_name: 'Project Manager',
        description: 'Full project management - create and edit',
        permissions: {
          projects: { view: true, create: true, edit: true, delete: false },
          schedule: { view: true, create: true, edit: true, delete: true },
          financials: { view: true, create: true, edit: true, delete: false, approve: false },
          rfis: { view: true, create: true, edit: true, delete: true, submit: true },
          change_orders: { view: true, create: true, edit: true, delete: false, approve: false },
          drawings: { view: true, create: true, edit: true, delete: false, approve: false },
          deliveries: { view: true, create: true, edit: true, delete: false },
          labor: { view: true, create: true, edit: true, delete: false, approve: true },
          equipment: { view: true, create: true, edit: true, delete: false },
          documents: { view: true, upload: true, edit: true, delete: true, approve: false },
          reports: { view: true, create: true, export: true },
          users: { view: true, invite: false, edit: false, delete: false },
          settings: { view: true, edit: true }
        }
      },
      {
        role_name: 'field_supervisor',
        display_name: 'Field Supervisor',
        description: 'Field operations - labor, equipment, deliveries',
        permissions: {
          projects: { view: true, create: false, edit: false, delete: false },
          schedule: { view: true, create: true, edit: true, delete: false },
          financials: { view: false, create: false, edit: false, delete: false, approve: false },
          rfis: { view: true, create: true, edit: true, delete: false, submit: true },
          change_orders: { view: true, create: false, edit: false, delete: false, approve: false },
          drawings: { view: true, create: false, edit: false, delete: false, approve: false },
          deliveries: { view: true, create: true, edit: true, delete: false },
          labor: { view: true, create: true, edit: true, delete: false, approve: false },
          equipment: { view: true, create: true, edit: true, delete: false },
          documents: { view: true, upload: true, edit: false, delete: false, approve: false },
          reports: { view: true, create: false, export: false },
          users: { view: false, invite: false, edit: false, delete: false },
          settings: { view: true, edit: true }
        }
      },
      {
        role_name: 'field_crew',
        display_name: 'Field Crew',
        description: 'Field worker - time tracking and photos',
        permissions: {
          projects: { view: true, create: false, edit: false, delete: false },
          schedule: { view: true, create: false, edit: false, delete: false },
          financials: { view: false, create: false, edit: false, delete: false, approve: false },
          rfis: { view: true, create: true, edit: false, delete: false, submit: false },
          change_orders: { view: false, create: false, edit: false, delete: false, approve: false },
          drawings: { view: true, create: false, edit: false, delete: false, approve: false },
          deliveries: { view: true, create: false, edit: false, delete: false },
          labor: { view: true, create: true, edit: true, delete: false, approve: false },
          equipment: { view: true, create: true, edit: false, delete: false },
          documents: { view: true, upload: true, edit: false, delete: false, approve: false },
          reports: { view: false, create: false, export: false },
          users: { view: false, invite: false, edit: false, delete: false },
          settings: { view: true, edit: true }
        }
      },
      {
        role_name: 'detailer',
        display_name: 'Detailer',
        description: 'Detailing and drawings management',
        permissions: {
          projects: { view: true, create: false, edit: false, delete: false },
          schedule: { view: true, create: false, edit: false, delete: false },
          financials: { view: false, create: false, edit: false, delete: false, approve: false },
          rfis: { view: true, create: true, edit: true, delete: false, submit: true },
          change_orders: { view: true, create: false, edit: false, delete: false, approve: false },
          drawings: { view: true, create: true, edit: true, delete: true, approve: false },
          deliveries: { view: true, create: false, edit: false, delete: false },
          labor: { view: false, create: false, edit: false, delete: false, approve: false },
          equipment: { view: false, create: false, edit: false, delete: false },
          documents: { view: true, upload: true, edit: true, delete: false, approve: false },
          reports: { view: true, create: false, export: false },
          users: { view: false, invite: false, edit: false, delete: false },
          settings: { view: true, edit: true }
        }
      },
      {
        role_name: 'viewer',
        display_name: 'Viewer',
        description: 'Read-only access',
        permissions: {
          projects: { view: true, create: false, edit: false, delete: false },
          schedule: { view: true, create: false, edit: false, delete: false },
          financials: { view: false, create: false, edit: false, delete: false, approve: false },
          rfis: { view: true, create: false, edit: false, delete: false, submit: false },
          change_orders: { view: true, create: false, edit: false, delete: false, approve: false },
          drawings: { view: true, create: false, edit: false, delete: false, approve: false },
          deliveries: { view: true, create: false, edit: false, delete: false },
          labor: { view: false, create: false, edit: false, delete: false, approve: false },
          equipment: { view: true, create: false, edit: false, delete: false },
          documents: { view: true, upload: false, edit: false, delete: false, approve: false },
          reports: { view: true, create: false, export: false },
          users: { view: false, invite: false, edit: false, delete: false },
          settings: { view: true, edit: true }
        }
      }
    ];

    const created = await Promise.all(
      defaultRoles.map(role => base44.asServiceRole.entities.Role.create(role))
    );

    return Response.json({
      success: true,
      message: 'Default roles created',
      count: created.length,
      roles: created.map(r => r.role_name)
    });

  } catch (error) {
    console.error('Seed roles error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});