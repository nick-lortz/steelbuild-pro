import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { project_id } = await req.json();

    if (!project_id) {
      return Response.json({ error: 'project_id required' }, { status: 400 });
    }

    // Get labor breakdowns for this project
    const breakdowns = await base44.asServiceRole.entities.LaborBreakdown.filter({ project_id });
    
    // Get specialty items for this project
    const specialtyItems = await base44.asServiceRole.entities.SpecialtyDiscussionItem.filter({ project_id });
    
    // Get all tasks for this project
    const allTasks = await base44.asServiceRole.entities.Task.filter({ project_id });
    
    // Get all labor categories
    const categories = await base44.asServiceRole.entities.LaborCategory.list('sequence_order');

    const updates = [];
    const warnings = [];

    // Process each labor category
    for (const category of categories) {
      const breakdown = breakdowns.find(b => b.labor_category_id === category.id);
      if (!breakdown) continue;

      const shopHours = breakdown.shop_hours || 0;
      const fieldHours = breakdown.field_hours || 0;

      // Get fabrication tasks for this category
      const fabTasks = allTasks.filter(t => 
        t.phase === 'fabrication' && 
        t.labor_category_id === category.id &&
        !t.is_milestone
      );

      // Get erection tasks for this category
      const erectionTasks = allTasks.filter(t => 
        t.phase === 'erection' && 
        t.labor_category_id === category.id &&
        !t.is_milestone
      );

      // Allocate shop hours to fabrication tasks
      if (shopHours > 0 && fabTasks.length > 0) {
        const totalFabDuration = fabTasks.reduce((sum, t) => sum + (t.duration_days || 1), 0);
        
        for (const task of fabTasks) {
          const weight = (task.duration_days || 1) / totalFabDuration;
          const allocatedShop = Math.round(shopHours * weight * 100) / 100;
          
          updates.push({
            id: task.id,
            data: { planned_shop_hours: allocatedShop }
          });
        }
      } else if (shopHours > 0 && fabTasks.length === 0) {
        warnings.push(`${category.name}: ${shopHours} shop hours but no fabrication tasks`);
      }

      // Allocate field hours to erection tasks
      if (fieldHours > 0 && erectionTasks.length > 0) {
        const totalErectionDuration = erectionTasks.reduce((sum, t) => sum + (t.duration_days || 1), 0);
        
        for (const task of erectionTasks) {
          const weight = (task.duration_days || 1) / totalErectionDuration;
          const allocatedField = Math.round(fieldHours * weight * 100) / 100;
          
          updates.push({
            id: task.id,
            data: { planned_field_hours: allocatedField }
          });
        }
      } else if (fieldHours > 0 && erectionTasks.length === 0) {
        warnings.push(`${category.name}: ${fieldHours} field hours but no erection tasks`);
      }
    }

    // Allocate specialty item hours
    for (const item of specialtyItems) {
      if (item.status === 'closed') continue;

      const shopHours = item.shop_hours || 0;
      const fieldHours = item.field_hours || 0;

      // Find tasks that could be associated with specialty work (typically unassigned category)
      const fabTasks = allTasks.filter(t => 
        t.phase === 'fabrication' && 
        !t.labor_category_id &&
        !t.is_milestone
      );

      const erectionTasks = allTasks.filter(t => 
        t.phase === 'erection' && 
        !t.labor_category_id &&
        !t.is_milestone
      );

      if (shopHours > 0 && fabTasks.length > 0) {
        const perTask = Math.round((shopHours / fabTasks.length) * 100) / 100;
        for (const task of fabTasks) {
          const current = task.planned_shop_hours || 0;
          updates.push({
            id: task.id,
            data: { planned_shop_hours: current + perTask }
          });
        }
      }

      if (fieldHours > 0 && erectionTasks.length > 0) {
        const perTask = Math.round((fieldHours / erectionTasks.length) * 100) / 100;
        for (const task of erectionTasks) {
          const current = task.planned_field_hours || 0;
          updates.push({
            id: task.id,
            data: { planned_field_hours: current + perTask }
          });
        }
      }
    }

    // Apply all updates
    for (const update of updates) {
      await base44.asServiceRole.entities.Task.update(update.id, update.data);
    }

    return Response.json({
      success: true,
      updated: updates.length,
      warnings
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});