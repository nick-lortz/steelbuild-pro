import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized - admin only' }, { status: 403 });
    }

    const notifications = [];
    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    // Get all data
    const [tasks, fabrications, rfis, drawings, projects, users] = await Promise.all([
      base44.asServiceRole.entities.Task.list(),
      base44.asServiceRole.entities.Fabrication.list(),
      base44.asServiceRole.entities.RFI.list(),
      base44.asServiceRole.entities.DrawingSet.list(),
      base44.asServiceRole.entities.Project.list(),
      base44.asServiceRole.entities.User.list()
    ]);

    // Get existing notifications from last 24h to avoid duplicates
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const recentNotifications = await base44.asServiceRole.entities.Notification.filter({
      created_date: { $gte: yesterday }
    });

    const notificationKey = (type, entityId) => `${type}-${entityId}`;
    const existingKeys = new Set(recentNotifications.map(n => 
      notificationKey(n.type, n.related_entity_id)
    ));

    // Helper to get project users
    const getProjectUsers = (projectId) => {
      const project = projects.find(p => p.id === projectId);
      if (!project) return [];
      
      const projectUsers = [];
      if (project.project_manager) {
        const pm = users.find(u => u.full_name === project.project_manager || u.email === project.project_manager);
        if (pm) projectUsers.push(pm);
      }
      
      if (project.assigned_users?.length > 0) {
        project.assigned_users.forEach(email => {
          const u = users.find(user => user.email === email);
          if (u && !projectUsers.find(pu => pu.email === u.email)) {
            projectUsers.push(u);
          }
        });
      }
      
      return projectUsers;
    };

    // 1. Check overdue tasks
    tasks.forEach(task => {
      if (task.status === 'completed' || task.status === 'cancelled') return;
      if (!task.end_date) return;
      
      const endDate = new Date(task.end_date);
      if (endDate < now) {
        const key = notificationKey('overdue_task', task.id);
        if (existingKeys.has(key)) return;

        const daysOverdue = Math.floor((now - endDate) / (1000 * 60 * 60 * 24));
        const projectUsers = getProjectUsers(task.project_id);
        
        projectUsers.forEach(user => {
          notifications.push({
            user_email: user.email,
            type: 'overdue_task',
            title: 'Overdue Task',
            message: `"${task.name}" is ${daysOverdue} day${daysOverdue !== 1 ? 's' : ''} overdue`,
            priority: daysOverdue > 7 ? 'critical' : daysOverdue > 3 ? 'high' : 'medium',
            related_entity_type: 'task',
            related_entity_id: task.id,
            project_id: task.project_id
          });
        });
      }
    });

    // 2. Check fabrication deadlines (within 3 days)
    fabrications.forEach(fab => {
      if (fab.fabrication_status === 'completed' || fab.fabrication_status === 'cancelled') return;
      if (!fab.target_completion) return;
      
      const targetDate = new Date(fab.target_completion);
      if (targetDate >= now && targetDate <= threeDaysFromNow) {
        const key = notificationKey('fabrication_deadline', fab.id);
        if (existingKeys.has(key)) return;

        const daysUntil = Math.ceil((targetDate - now) / (1000 * 60 * 60 * 24));
        const projectUsers = getProjectUsers(fab.project_id);
        
        projectUsers.forEach(user => {
          notifications.push({
            user_email: user.email,
            type: 'fabrication_deadline',
            title: 'Fabrication Deadline Approaching',
            message: `Package "${fab.package_name}" due in ${daysUntil} day${daysUntil !== 1 ? 's' : ''}`,
            priority: daysUntil <= 1 ? 'high' : 'medium',
            related_entity_type: 'fabrication',
            related_entity_id: fab.id,
            project_id: fab.project_id
          });
        });
      }
    });

    // 3. Check new/updated RFIs (submitted in last 24h)
    rfis.forEach(rfi => {
      if (!rfi.submitted_date) return;
      
      const submittedDate = new Date(rfi.submitted_date);
      if (submittedDate >= new Date(yesterday)) {
        const key = notificationKey('rfi_update', rfi.id);
        if (existingKeys.has(key)) return;

        const projectUsers = getProjectUsers(rfi.project_id);
        
        projectUsers.forEach(user => {
          notifications.push({
            user_email: user.email,
            type: 'rfi_update',
            title: 'New RFI Submitted',
            message: `RFI #${rfi.rfi_number}: ${rfi.subject}`,
            priority: rfi.priority === 'critical' || rfi.priority === 'high' ? 'high' : 'medium',
            related_entity_type: 'rfi',
            related_entity_id: rfi.id,
            project_id: rfi.project_id
          });
        });
      }

      // Check for answered RFIs
      if (rfi.status === 'answered' && rfi.response_date) {
        const responseDate = new Date(rfi.response_date);
        if (responseDate >= new Date(yesterday)) {
          const key = notificationKey('rfi_answered', rfi.id);
          if (existingKeys.has(key)) return;

          const projectUsers = getProjectUsers(rfi.project_id);
          
          projectUsers.forEach(user => {
            notifications.push({
              user_email: user.email,
              type: 'rfi_update',
              title: 'RFI Answered',
              message: `RFI #${rfi.rfi_number} has been answered`,
              priority: 'medium',
              related_entity_type: 'rfi',
              related_entity_id: rfi.id,
              project_id: rfi.project_id
            });
          });
        }
      }
    });

    // 4. Check drawing updates (released in last 24h)
    drawings.forEach(drawing => {
      if (drawing.status !== 'FFF' && drawing.status !== 'As-Built') return;
      if (!drawing.released_for_fab_date) return;
      
      const releaseDate = new Date(drawing.released_for_fab_date);
      if (releaseDate >= new Date(yesterday)) {
        const key = notificationKey('drawing_update', drawing.id);
        if (existingKeys.has(key)) return;

        const projectUsers = getProjectUsers(drawing.project_id);
        
        projectUsers.forEach(user => {
          notifications.push({
            user_email: user.email,
            type: 'drawing_update',
            title: 'Drawing Released for Fabrication',
            message: `${drawing.set_name} (${drawing.set_number}) released`,
            priority: 'medium',
            related_entity_type: 'drawing',
            related_entity_id: drawing.id,
            project_id: drawing.project_id
          });
        });
      }
    });

    // 5. Check critical path changes (tasks that became critical)
    const criticalTasks = tasks.filter(t => t.is_critical && t.status !== 'completed');
    criticalTasks.forEach(task => {
      const key = notificationKey('critical_path_change', task.id);
      if (existingKeys.has(key)) return;

      const projectUsers = getProjectUsers(task.project_id);
      
      projectUsers.forEach(user => {
        notifications.push({
          user_email: user.email,
          type: 'critical_path_change',
          title: 'Task on Critical Path',
          message: `"${task.name}" is on the critical path (${task.float_days || 0} days float)`,
          priority: 'high',
          related_entity_type: 'task',
          related_entity_id: task.id,
          project_id: task.project_id
        });
      });
    });

    // Create notifications
    let created = 0;
    for (const notification of notifications) {
      try {
        await base44.asServiceRole.entities.Notification.create(notification);
        created++;
      } catch (error) {
        console.error('Failed to create notification:', error);
      }
    }

    return Response.json({
      success: true,
      created,
      total: notifications.length,
      timestamp: now.toISOString()
    });

  } catch (error) {
    console.error('Notification generation error:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});