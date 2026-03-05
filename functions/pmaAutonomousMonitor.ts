import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        let payload = {};
        if (req.method === 'POST') {
            try {
                payload = await req.json();
            } catch (e) {
                // Ignore if empty body or invalid JSON
            }
        }

        // Use service role since this is often run as a scheduled automation
        let projects = [];
        if (payload.project_id) {
            const project = await base44.asServiceRole.entities.Project.get(payload.project_id);
            if (project) {
                projects.push(project);
            } else {
                return Response.json({ error: "Project not found" }, { status: 404 });
            }
        } else {
            // Fetch all active projects
            const allProjects = await base44.asServiceRole.entities.Project.filter({});
            projects = allProjects.filter(p => ['awarded', 'in_progress'].includes(p.status));
        }

        const results = [];
        const now = new Date();

        for (const project of projects) {
            let alertsCreated = 0;
            
            // 1. Detect Overdue/Aging RFIs
            const rfis = await base44.asServiceRole.entities.RFI.filter({ project_id: project.id });
            const openRfis = rfis.filter(rfi => !['closed', 'answered', 'void'].includes(rfi.status));
            
            for (const rfi of openRfis) {
                let isOverdue = false;
                let daysOpen = 0;
                
                if (rfi.due_date && new Date(rfi.due_date) < now) {
                    isOverdue = true;
                    daysOpen = (now - new Date(rfi.due_date)) / (1000 * 60 * 60 * 24);
                } else if (rfi.submitted_date && !rfi.due_date) {
                    daysOpen = (now - new Date(rfi.submitted_date)) / (1000 * 60 * 60 * 24);
                    if (daysOpen > 7) {
                        isOverdue = true;
                    }
                }
                
                if (isOverdue) {
                    const existingAlerts = await base44.asServiceRole.entities.Alert.filter({
                        project_id: project.id,
                        entity_id: rfi.id,
                        alert_type: 'rfi_overdue'
                    });
                    
                    if (existingAlerts.length === 0) {
                        await base44.asServiceRole.entities.Alert.create({
                            project_id: project.id,
                            title: `Overdue RFI: ${rfi.rfi_number || ''} - ${rfi.subject || ''}`,
                            message: `RFI is overdue by ${Math.round(daysOpen)} days. Follow up with GC/EOR to avoid schedule impacts.`,
                            alert_type: 'rfi_overdue',
                            severity: (rfi.priority === 'critical' || rfi.priority === 'high' || rfi.is_install_blocker || rfi.is_release_blocker) ? 'high' : 'medium',
                            entity_type: 'RFI',
                            entity_id: rfi.id,
                            days_open: Math.round(daysOpen),
                            recommended_action: 'Follow up with AOR/EOR',
                            status: 'active',
                            auto_generated: true
                        });
                        alertsCreated++;
                    }
                }
            }

            // 2. Detect Overdue Tasks
            const tasks = await base44.asServiceRole.entities.Task.filter({ project_id: project.id });
            const overdueTasks = tasks.filter(t => 
                !['completed', 'closed'].includes(t.status) && 
                ((t.due_date && new Date(t.due_date) < now) || (t.target_completion && new Date(t.target_completion) < now))
            );

            for (const task of overdueTasks) {
                const dateToUse = task.due_date || task.target_completion;
                const daysOverdue = (now - new Date(dateToUse)) / (1000 * 60 * 60 * 24);
                
                const existingAlerts = await base44.asServiceRole.entities.Alert.filter({
                    project_id: project.id,
                    entity_id: task.id,
                    alert_type: 'task_overdue'
                });
                
                if (existingAlerts.length === 0) {
                    await base44.asServiceRole.entities.Alert.create({
                        project_id: project.id,
                        title: `Overdue Task: ${task.name || task.title || ''}`,
                        message: `Task is overdue by ${Math.round(daysOverdue)} days.`,
                        alert_type: 'task_overdue',
                        severity: 'medium',
                        entity_type: 'Task',
                        entity_id: task.id,
                        days_open: Math.round(daysOverdue),
                        recommended_action: 'Check with assignee for status update',
                        status: 'active',
                        auto_generated: true
                    });
                    alertsCreated++;
                }
            }
            
            results.push({
                project_id: project.id,
                project_name: project.name,
                alerts_created: alertsCreated
            });
        }

        return Response.json({ success: true, results });
    } catch (error) {
        console.error("pmaAutonomousMonitor Error:", error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});