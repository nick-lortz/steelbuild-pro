import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { project_id } = await req.json();

    if (!project_id) {
      return Response.json({ error: 'project_id is required' }, { status: 400 });
    }

    // Fetch labor breakdowns for project
    const breakdowns = await base44.asServiceRole.entities.LaborBreakdown.filter({ project_id });
    
    // Fetch all categories to get names
    const categories = await base44.asServiceRole.entities.LaborCategory.list();
    
    // Fetch tasks for project
    const tasks = await base44.asServiceRole.entities.Task.filter({ project_id });

    if (breakdowns.length === 0) {
      return Response.json({ error: 'No labor breakdown found for project' }, { status: 400 });
    }

    const updates = [];
    const warnings = [];

    // Process each labor category breakdown
    for (const breakdown of breakdowns) {
      const category = categories.find(c => c.id === breakdown.labor_category_id);
      const categoryName = category?.name || 'Unknown';

      const shopHours = Number(breakdown.shop_hours) || 0;
      const fieldHours = Number(breakdown.field_hours) || 0;

      // Find relevant tasks for this category
      const fabricationTasks = tasks.filter(t => 
        t.phase === 'fabrication' && 
        t.status !== 'completed' && 
        t.status !== 'cancelled' &&
        !t.is_milestone
      );

      const erectionTasks = tasks.filter(t => 
        t.phase === 'erection' && 
        t.status !== 'completed' && 
        t.status !== 'cancelled' &&
        !t.is_milestone
      );

      // Allocate shop hours to fabrication tasks
      if (shopHours > 0 && fabricationTasks.length > 0) {
        const totalDuration = fabricationTasks.reduce((sum, t) => sum + (Number(t.duration_days) || 1), 0);
        
        for (const task of fabricationTasks) {
          const taskDuration = Number(task.duration_days) || 1;
          const proportion = taskDuration / totalDuration;
          const allocatedHours = Math.round(shopHours * proportion);
          
          updates.push({
            id: task.id,
            data: {
              labor_category_id: breakdown.labor_category_id,
              planned_shop_hours: allocatedHours,
            }
          });
        }
      } else if (shopHours > 0 && fabricationTasks.length === 0) {
        warnings.push(`${categoryName}: ${shopHours} shop hours but no fabrication tasks found`);
      }

      // Allocate field hours to erection tasks
      if (fieldHours > 0 && erectionTasks.length > 0) {
        const totalDuration = erectionTasks.reduce((sum, t) => sum + (Number(t.duration_days) || 1), 0);
        
        for (const task of erectionTasks) {
          const taskDuration = Number(task.duration_days) || 1;
          const proportion = taskDuration / totalDuration;
          const allocatedHours = Math.round(fieldHours * proportion);
          
          const existingShop = updates.find(u => u.id === task.id)?.data?.planned_shop_hours || 0;
          
          if (updates.find(u => u.id === task.id)) {
            updates.find(u => u.id === task.id).data.planned_field_hours = allocatedHours;
          } else {
            updates.push({
              id: task.id,
              data: {
                labor_category_id: breakdown.labor_category_id,
                planned_field_hours: allocatedHours,
              }
            });
          }
        }
      } else if (fieldHours > 0 && erectionTasks.length === 0) {
        warnings.push(`${categoryName}: ${fieldHours} field hours but no erection tasks found`);
      }
    }

    // Apply updates
    for (const update of updates) {
      await base44.asServiceRole.entities.Task.update(update.id, update.data);
    }

    return Response.json({
      success: true,
      message: `Allocated labor to ${updates.length} tasks`,
      allocated_tasks: updates.length,
      warnings: warnings.length > 0 ? warnings : null
    });

  } catch (error) {
    console.error('Error allocating labor:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});