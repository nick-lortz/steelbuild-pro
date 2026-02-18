import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Bypass user auth check for scheduled automations—use service role throughout
    const projects = await base44.asServiceRole.entities.Project.list();
    
    let membersCreated = 0;
    let membersSkipped = 0;
    
    for (const project of projects) {
      // Create ProjectMember for project_manager
      if (project.project_manager) {
        try {
          await base44.asServiceRole.entities.ProjectMember.create({
            project_id: project.id,
            user_email: project.project_manager,
            role: 'pm',
            is_active: true,
            can_edit_financials: true,
            can_approve_invoices: true,
            added_date: new Date().toISOString(),
            added_by: 'system_migration'
          });
          membersCreated++;
        } catch (error) {
          // Skip if already exists (unique constraint)
          if (error?.message?.includes('unique')) {
            membersSkipped++;
          } else {
            console.error(`Failed to create PM membership for ${project.project_number}:`, error);
          }
        }
      }
      
      // Create ProjectMember for superintendent
      if (project.superintendent) {
        try {
          await base44.asServiceRole.entities.ProjectMember.create({
            project_id: project.id,
            user_email: project.superintendent,
            role: 'superintendent',
            is_active: true,
            added_date: new Date().toISOString(),
            added_by: 'system_migration'
          });
          membersCreated++;
        } catch (error) {
          if (error?.message?.includes('unique')) {
            membersSkipped++;
          } else {
            console.error(`Failed to create superintendent membership for ${project.project_number}:`, error);
          }
        }
      }
      
      // Create ProjectMember for assigned_users
      if (project.assigned_users && Array.isArray(project.assigned_users)) {
        for (const userEmail of project.assigned_users) {
          // Skip if already added as PM or superintendent
          if (userEmail === project.project_manager || userEmail === project.superintendent) {
            continue;
          }
          
          try {
            await base44.asServiceRole.entities.ProjectMember.create({
              project_id: project.id,
              user_email: userEmail,
              role: 'viewer',
              is_active: true,
              added_date: new Date().toISOString(),
              added_by: 'system_migration'
            });
            membersCreated++;
          } catch (error) {
            if (error?.message?.includes('unique')) {
              membersSkipped++;
            } else {
              console.error(`Failed to create viewer membership for ${project.project_number}:`, error);
            }
          }
        }
      }
    }
    
    return Response.json({
      success: true,
      projectsProcessed: projects.length,
      membersCreated,
      membersSkipped,
      message: `Seeded ${membersCreated} ProjectMember records from ${projects.length} projects (${membersSkipped} skipped as duplicates)`
    });
    
  } catch (error) {
    console.error('Error seeding project members:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});