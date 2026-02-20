import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    
    const { event, data } = payload;
    
    if (event.type !== 'update') {
      return Response.json({ message: 'No action required' });
    }

    let updates = [];

    // Handle Drawing approval workflow
    if (event.entity_name === 'DrawingRevision' && data.status === 'FFF') {
      const drawingSets = await base44.asServiceRole.entities.DrawingSet.filter({
        current_revision_id: data.id
      });
      
      for (const drawingSet of drawingSets) {
        const linkedWPs = drawingSet.linked_work_package_ids || [];
        
        for (const wpId of linkedWPs) {
          const wps = await base44.asServiceRole.entities.WorkPackage.filter({ id: wpId });
          const wp = wps[0];
          
          if (wp && wp.phase === 'pre_fab') {
            await base44.asServiceRole.entities.WorkPackage.update(wpId, {
              phase: 'shop'
            });
            updates.push(`WP ${wp.wpid} advanced to shop`);
          }
        }
      }
    }

    // Handle Change Order approval workflow
    if (event.entity_name === 'ChangeOrder' && data.status === 'approved') {
      const linkedTaskIds = data.linked_task_ids || [];
      
      for (const taskId of linkedTaskIds) {
        const tasks = await base44.asServiceRole.entities.Task.filter({ id: taskId });
        const task = tasks[0];
        
        if (task && task.status === 'on_hold') {
          // Assign to project superintendent if available
          const projects = await base44.asServiceRole.entities.Project.filter({ 
            id: task.project_id 
          });
          const project = projects[0];
          
          const updates_data = {
            status: 'not_started',
            notes: `${task.notes || ''}\n[AUTO] CO-${data.co_number} approved - ${new Date().toISOString()}`
          };
          
          if (project?.superintendent && !task.assigned_resources?.length) {
            updates_data.assigned_resources = [project.superintendent];
          }
          
          await base44.asServiceRole.entities.Task.update(taskId, updates_data);
          updates.push(`Task ${task.name} released and assigned`);
        }
      }
    }

    // Handle Delivery confirmation workflow
    if (event.entity_name === 'Delivery' && data.delivery_status === 'received') {
      // Find tasks waiting for this delivery
      const tasks = await base44.asServiceRole.entities.Task.filter({
        project_id: data.project_id,
        status: 'blocked',
        procurement_status: 'ORDERED'
      });
      
      for (const task of tasks) {
        // Match by delivery notes or package name
        const isRelated = task.notes?.includes(data.package_name) || 
                         task.notes?.includes(data.delivery_number);
        
        if (isRelated) {
          await base44.asServiceRole.entities.Task.update(task.id, {
            status: 'not_started',
            procurement_status: 'DELIVERED',
            notes: `${task.notes || ''}\n[AUTO] Material delivered: ${data.package_name} - ${new Date().toISOString()}`
          });
          updates.push(`Task ${task.name} material received`);
        }
      }
    }

    return Response.json({ 
      success: true, 
      updates,
      message: `Processed ${updates.length} auto-assignments`
    });
    
  } catch (error) {
    console.error('Auto-assign error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});