import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Get all active projects
    const projects = await base44.asServiceRole.entities.Project.filter({
      status: 'in_progress'
    });

    const alerts = [];

    for (const project of projects) {
      // Check equipment maintenance alerts
      const equipmentLogs = await base44.asServiceRole.entities.EquipmentLog.filter({
        project_id: project.id,
        maintenance_required: true
      });

      for (const log of equipmentLogs) {
        const existingAlert = await base44.asServiceRole.entities.Notification.filter({
          type: 'equipment_maintenance',
          'data.equipment_id': log.equipment_id,
          'data.log_id': log.id
        });

        if (existingAlert.length === 0) {
          alerts.push({
            projectId: project.id,
            type: 'equipment_maintenance',
            priority: 'critical',
            title: `Equipment Maintenance Required - ${project.name}`,
            body: `${log.equipment_id} requires maintenance. ${log.maintenance_notes || ''}`,
            data: {
              type: 'equipment_maintenance',
              projectId: project.id,
              equipmentId: log.equipment_id,
              logId: log.id
            }
          });
        }
      }

      // Check equipment safety incidents
      const safetyLogs = await base44.asServiceRole.entities.EquipmentLog.filter({
        project_id: project.id
      });

      for (const log of safetyLogs) {
        if (log.conflicts?.some(c => c.severity === 'critical')) {
          const existingAlert = await base44.asServiceRole.entities.Notification.filter({
            type: 'equipment_safety',
            'data.log_id': log.id
          });

          if (existingAlert.length === 0) {
            alerts.push({
              projectId: project.id,
              type: 'equipment_safety',
              priority: 'critical',
              title: `Safety Alert - ${project.name}`,
              body: log.conflicts.find(c => c.severity === 'critical')?.msg || 'Critical equipment safety issue',
              data: {
                type: 'equipment_safety',
                projectId: project.id,
                equipmentId: log.equipment_id,
                logId: log.id
              }
            });
          }
        }
      }

      // Check labor delays
      const laborEntries = await base44.asServiceRole.entities.LaborEntry.filter({
        project_id: project.id,
        has_delay: true
      });

      const significantDelays = laborEntries.filter(e => 
        parseFloat(e.delay_hours || 0) >= 4
      );

      for (const entry of significantDelays) {
        const existingAlert = await base44.asServiceRole.entities.Notification.filter({
          type: 'project_delay',
          'data.entry_id': entry.id
        });

        if (existingAlert.length === 0) {
          alerts.push({
            projectId: project.id,
            type: 'project_delay',
            priority: 'high',
            title: `Significant Delay - ${project.name}`,
            body: `${entry.delay_hours}h delay: ${entry.delay_reason}. ${entry.delay_notes || ''}`,
            data: {
              type: 'project_delay',
              projectId: project.id,
              entryId: entry.id,
              delayHours: entry.delay_hours
            }
          });
        }
      }

      // Check overdue certifications
      const laborEntriesWithGaps = await base44.asServiceRole.entities.LaborEntry.filter({
        project_id: project.id
      });

      for (const entry of laborEntriesWithGaps) {
        if (entry.certification_gaps && entry.certification_gaps.length > 0) {
          const existingAlert = await base44.asServiceRole.entities.Notification.filter({
            type: 'certification_overdue',
            'data.entry_id': entry.id
          });

          if (existingAlert.length === 0) {
            alerts.push({
              projectId: project.id,
              type: 'certification_overdue',
              priority: 'high',
              title: `Certification Gaps - ${project.name}`,
              body: `${entry.certification_gaps.length} crew members with missing/expired certifications`,
              data: {
                type: 'certification_overdue',
                projectId: project.id,
                entryId: entry.id,
                gaps: entry.certification_gaps
              }
            });
          }
        }
      }
    }

    // Send push notifications for each alert
    const results = [];
    for (const alert of alerts) {
      // Get project team members
      const project = projects.find(p => p.id === alert.projectId);
      const assignedUsers = project?.assigned_users || [];

      for (const userEmail of assignedUsers) {
        try {
          const response = await base44.asServiceRole.functions.invoke('sendPushNotification', {
            userId: userEmail,
            title: alert.title,
            body: alert.body,
            data: alert.data,
            priority: alert.priority
          });
          results.push({ userEmail, alert: alert.type, success: true });
        } catch (error) {
          results.push({ userEmail, alert: alert.type, success: false, error: error.message });
        }
      }
    }

    return Response.json({
      success: true,
      alertsFound: alerts.length,
      notificationsSent: results.filter(r => r.success).length,
      results
    });

  } catch (error) {
    console.error('Critical events monitor error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});