import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data, old_data } = await req.json();

    // Only process Document updates
    if (event.type !== 'update') {
      return Response.json({ message: 'Not an update event' });
    }

    const document = data;
    const oldDocument = old_data || {};

    // Only proceed if workflow_stage changed to 'approved'
    if (document.workflow_stage !== 'approved' || oldDocument.workflow_stage === 'approved') {
      return Response.json({ message: 'Document not newly approved' });
    }

    const notifications = [];
    const updates = [];

    // Get project for context
    const projects = await base44.asServiceRole.entities.Project.filter({ id: document.project_id });
    const project = projects[0];

    // Update linked work package (if applicable)
    if (document.work_package_id) {
      const workPackages = await base44.asServiceRole.entities.WorkPackage.filter({ id: document.work_package_id });
      const workPackage = workPackages[0];

      if (workPackage) {
        // Add document to linked_document_ids if not already present
        const linkedDocs = workPackage.linked_document_ids || [];
        if (!linkedDocs.includes(document.id)) {
          await base44.asServiceRole.entities.WorkPackage.update(workPackage.id, {
            linked_document_ids: [...linkedDocs, document.id]
          });
        }

        // Notify work package owner
        if (workPackage.assigned_to) {
          notifications.push({
            user_email: workPackage.assigned_to,
            type: 'drawing_update',
            title: `Document Approved: ${document.title}`,
            message: `Document "${document.title}" (${document.category}) for ${workPackage.name} has been approved. You can proceed with work.`,
            priority: 'medium',
            related_entity_type: 'Document',
            related_entity_id: document.id,
            project_id: document.project_id,
            is_read: false
          });
        }

        updates.push({ type: 'WorkPackage', id: workPackage.id });
      }
    }

    // Update linked fabrication record (if applicable)
    if (document.category === 'drawing' || document.category === 'specification') {
      const fabrications = await base44.asServiceRole.entities.Fabrication.filter({
        project_id: document.project_id,
        package_name: document.title.split(':')[0] // Attempt to match package name from title
      });

      if (fabrications.length > 0 && project?.superintendent) {
        notifications.push({
          user_email: project.superintendent,
          type: 'drawing_update',
          title: `Fabrication Document Approved: ${document.title}`,
          message: `${document.category.toUpperCase()} "${document.title}" approved. You may proceed with fabrication activities.`,
          priority: 'medium',
          related_entity_type: 'Document',
          related_entity_id: document.id,
          project_id: document.project_id,
          is_read: false
        });

        updates.push({ type: 'Fabrication', id: fabrications[0].id });
      }
    }

    // Update linked task (if applicable)
    if (document.task_id) {
      const tasks = await base44.asServiceRole.entities.Task.filter({ id: document.task_id });
      const task = tasks[0];

      if (task) {
        // Notify task assignees
        const assignedResources = task.assigned_resources || [];
        for (const resourceId of assignedResources) {
          const resources = await base44.asServiceRole.entities.Resource.filter({ id: resourceId });
          if (resources[0]?.contact_email) {
            notifications.push({
              user_email: resources[0].contact_email,
              type: 'drawing_update',
              title: `Task Document Approved: ${document.title}`,
              message: `Document "${document.title}" for task "${task.name}" has been approved. Task can proceed.`,
              priority: 'medium',
              related_entity_type: 'Document',
              related_entity_id: document.id,
              project_id: document.project_id,
              is_read: false
            });
          }
        }

        updates.push({ type: 'Task', id: task.id });
      }
    }

    // Notify document uploader
    if (document.created_by) {
      notifications.push({
        user_email: document.created_by,
        type: 'drawing_update',
        title: `Your Document Approved: ${document.title}`,
        message: `Document "${document.title}" has been approved by ${document.reviewer || 'reviewer'}.`,
        priority: 'low',
        related_entity_type: 'Document',
        related_entity_id: document.id,
        project_id: document.project_id,
        is_read: false
      });
    }

    // Notify PM
    if (project?.project_manager && document.category !== 'photo') {
      notifications.push({
        user_email: project.project_manager,
        type: 'drawing_update',
        title: `Document Approved: ${document.title}`,
        message: `${document.category.toUpperCase()} "${document.title}" approved. ${updates.length} related entities updated.`,
        priority: 'low',
        related_entity_type: 'Document',
        related_entity_id: document.id,
        project_id: document.project_id,
        is_read: false
      });
    }

    // Create notifications
    if (notifications.length > 0) {
      await base44.asServiceRole.entities.Notification.bulkCreate(notifications);
    }

    return Response.json({
      message: 'Document approval processed',
      documentId: document.id,
      updates: updates.length,
      notifications: notifications.length
    });

  } catch (error) {
    console.error('Document approval error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});