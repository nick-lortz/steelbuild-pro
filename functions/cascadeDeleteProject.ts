import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Cascade delete all project-related data when a project is deleted
 * This ensures no orphaned records remain in the system
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    const { project_id } = await req.json();

    if (!project_id) {
      return Response.json(
        { error: 'project_id is required' },
        { status: 400 }
      );
    }

    console.log(`Starting cascade delete for project: ${project_id}`);

    const deletionCounts = {};

    // Define all entities that have project_id relationships
    const entitiesToDelete = [
      'Task',
      'Document',
      'Expense',
      'Financial',
      'DrawingSet',
      'RFI',
      'ChangeOrder',
      'DailyLog',
      'LaborBreakdown',
      'SpecialtyDiscussionItem',
      'ScopeGap',
      'Meeting',
      'LaborHours',
      'EquipmentBooking',
      'Fabrication',
      'Delivery',
      'ProductionNote',
      'ResourceAllocation',
      'WorkPackage',
      'ProjectRisk',
      'Notification',
      'DrawingSheet',
      'DrawingRevision',
      'DrawingAnnotation',
      'ProductionNote',
      'CalendarNote',
      'ClientInvoice'
    ];

    // Delete all child records for each entity
    for (const entityName of entitiesToDelete) {
      try {
        const records = await base44.asServiceRole.entities[entityName].filter({
          project_id: project_id
        });

        if (records && records.length > 0) {
          console.log(`Deleting ${records.length} ${entityName} records...`);
          
          for (const record of records) {
            await base44.asServiceRole.entities[entityName].delete(record.id);
          }
          
          deletionCounts[entityName] = records.length;
        } else {
          deletionCounts[entityName] = 0;
        }
      } catch (error) {
        console.error(`Error deleting ${entityName} records:`, error.message);
        deletionCounts[entityName] = `Error: ${error.message}`;
      }
    }

    // Finally delete the project itself
    await base44.asServiceRole.entities.Project.delete(project_id);

    console.log('Cascade delete completed:', deletionCounts);

    return Response.json({
      success: true,
      message: 'Project and all related data deleted successfully',
      deletionCounts,
      totalDeleted: Object.values(deletionCounts)
        .filter(v => typeof v === 'number')
        .reduce((sum, count) => sum + count, 0)
    });

  } catch (error) {
    console.error('Cascade delete error:', error);
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
});