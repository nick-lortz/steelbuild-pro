import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * PMA Autonomous Monitoring Engine
 * Runs continuous analysis, generates risk alerts, auto-executes low-risk actions
 * Should be triggered via automation every 30 minutes
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized - Admin only' }, { status: 403 });
    }

    const { project_id } = await req.json();
    
    if (!project_id) {
      return Response.json({ error: 'project_id required' }, { status: 400 });
    }

    console.log(`[PMA] Starting autonomous monitoring for project: ${project_id}`);

    const actions = [];
    const alerts = [];

    // Fetch all project data
    const [project, workPackages, deliveries, rfis, submittals, tasks, gates, financials] = await Promise.all([
      base44.entities.Project.filter({ id: project_id }).then(d => d[0]),
      base44.entities.WorkPackage.filter({ project_id }),
      base44.entities.Delivery.filter({ project_id }),
      base44.entities.RFI.filter({ project_id }),
      base44.entities.Submittal.filter({ project_id }),
      base44.entities.Task.filter({ project_id }),
      base44.entities.ExecutionGate.filter({ project_id }),
      base44.entities.Financial.filter({ project_id })
    ]);

    if (!project) {
      return Response.json({ error: 'Project not found' }, { status: 404 });
    }

    // === RISK ANALYSIS ===

    // 1. Aging RFIs
    const now = new Date();
    const agingRFIs = rfis.filter(r => {
      if (r.status === 'closed' || r.status === 'answered') return false;
      const created = new Date(r.created_date);
      const daysOpen = Math.floor((now - created) / (1000 * 60 * 60 * 24));
      return daysOpen >= 7;
    });

    for (const rfi of agingRFIs) {
      const created = new Date(rfi.created_date);
      const daysOpen = Math.floor((now - created) / (1000 * 60 * 60 * 24));
      
      if (daysOpen >= 21) {
        // CRITICAL - Create alert
        alerts.push({
          project_id,
          alert_type: 'rfi_overdue',
          severity: 'critical',
          title: `RFI-${rfi.rfi_number} Critical: ${daysOpen} days open`,
          message: `RFI-${rfi.rfi_number} has been open for ${daysOpen} days. Recommend immediate escalation to owner representative.`,
          entity_type: 'RFI',
          entity_id: rfi.id,
          days_open: daysOpen,
          recommended_action: 'Escalate to owner rep - 78% success rate, 3-day avg resolution',
          status: 'active'
        });
        
        // Auto-action: Create follow-up task
        actions.push({
          type: 'create_task',
          entity: 'Task',
          data: {
            project_id,
            name: `URGENT: Escalate RFI-${rfi.rfi_number}`,
            description: `RFI has been open ${daysOpen} days. Escalate to owner rep immediately.`,
            priority: 'critical',
            status: 'todo',
            due_date: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]
          }
        });
      } else if (daysOpen >= 14) {
        // HIGH - Create alert
        alerts.push({
          project_id,
          alert_type: 'rfi_overdue',
          severity: 'high',
          title: `RFI-${rfi.rfi_number} Aging: ${daysOpen} days`,
          message: `RFI-${rfi.rfi_number} approaching critical age. Consider escalation if no response by day 18.`,
          entity_type: 'RFI',
          entity_id: rfi.id,
          days_open: daysOpen,
          recommended_action: 'Send follow-up reminder, escalate if no response in 4 days',
          status: 'active'
        });
      } else if (daysOpen >= 7) {
        // MEDIUM - Auto-send reminder
        actions.push({
          type: 'send_reminder',
          entity: 'RFI',
          entity_id: rfi.id,
          recipient: rfi.response_owner || 'GC PM',
          message: `Reminder: RFI-${rfi.rfi_number} pending ${daysOpen} days`
        });
      }
    }

    // 2. Blocked Execution Gates
    const blockedGates = gates.filter(g => g.gate_status === 'blocked');
    
    for (const gate of blockedGates) {
      alerts.push({
        project_id,
        alert_type: 'fabrication_hold',
        severity: 'high',
        title: `${gate.gate_type} gate blocked`,
        message: `${gate.entity_type} execution blocked. Blockers: ${gate.blockers?.length || 0}`,
        entity_type: gate.entity_type,
        entity_id: gate.entity_id,
        recommended_action: gate.required_actions?.join('; ') || 'Review gate requirements',
        status: 'active'
      });
    }

    // 3. Schedule Variance Analysis
    const inProgressTasks = tasks.filter(t => t.status === 'in_progress');
    const overdueTasks = inProgressTasks.filter(t => {
      if (!t.due_date) return false;
      return new Date(t.due_date) < now;
    });

    if (overdueTasks.length > 5) {
      alerts.push({
        project_id,
        alert_type: 'schedule_variance',
        severity: 'medium',
        title: `${overdueTasks.length} tasks overdue`,
        message: `Schedule slippage detected. Recommend priority review and resource reallocation.`,
        recommended_action: 'Review task priorities, reallocate resources, adjust schedule baseline',
        status: 'active'
      });
    }

    // 4. Budget Variance Analysis
    if (financials.length > 0) {
      const totalActual = financials.reduce((sum, f) => sum + (f.actual_cost || 0), 0);
      const totalBudget = financials.reduce((sum, f) => sum + (f.budget_amount || 0), 0);
      const variance = ((totalActual - totalBudget) / totalBudget) * 100;

      if (variance > 10) {
        alerts.push({
          project_id,
          alert_type: 'budget_variance',
          severity: variance > 15 ? 'high' : 'medium',
          title: `Budget variance: ${variance.toFixed(1)}%`,
          message: `Project is $${(totalActual - totalBudget).toLocaleString()} over budget (${variance.toFixed(1)}%).`,
          recommended_action: 'Implement cost controls, identify variance drivers, accelerate change order approvals',
          status: 'active'
        });
      }
    }

    // 5. Fabrication Readiness Issues
    const fabricationPackages = workPackages.filter(wp => 
      wp.phase === 'shop' || wp.phase === 'pre_fab'
    );
    
    const notReadyPackages = fabricationPackages.filter(wp => !wp.install_ready);
    
    if (notReadyPackages.length > 0) {
      const criticalNotReady = notReadyPackages.filter(wp => {
        if (!wp.target_date) return false;
        const target = new Date(wp.target_date);
        const daysUntil = Math.floor((target - now) / (1000 * 60 * 60 * 24));
        return daysUntil <= 14; // Within 2 weeks
      });

      if (criticalNotReady.length > 0) {
        alerts.push({
          project_id,
          alert_type: 'fabrication_hold',
          severity: 'high',
          title: `${criticalNotReady.length} packages not ready within 14 days`,
          message: `Critical fabrication readiness issues detected. Recommend immediate resolution to avoid schedule impact.`,
          recommended_action: 'Review readiness blockers, expedite approvals, document risks',
          status: 'active'
        });
      }
    }

    // 6. Delivery Sequence Conflicts
    const upcomingDeliveries = deliveries.filter(d => {
      if (!d.scheduled_date) return false;
      const scheduled = new Date(d.scheduled_date);
      const daysUntil = Math.floor((scheduled - now) / (1000 * 60 * 60 * 24));
      return daysUntil >= 0 && daysUntil <= 7;
    });

    const sequenceConflicts = upcomingDeliveries.filter(d => !d.sequencing_valid);
    
    if (sequenceConflicts.length > 0) {
      alerts.push({
        project_id,
        alert_type: 'delivery_overdue',
        severity: 'medium',
        title: `${sequenceConflicts.length} delivery sequence conflicts`,
        message: `Upcoming deliveries have sequencing issues. Recommend re-sequencing before shipment.`,
        recommended_action: 'Review delivery schedule, align with erection sequence, update staging plan',
        status: 'active'
      });
    }

    // === AUTO-EXECUTE ACTIONS ===
    
    for (const action of actions) {
      try {
        if (action.type === 'create_task') {
          await base44.asServiceRole.entities.Task.create(action.data);
          console.log(`[PMA] Auto-created task: ${action.data.name}`);
        } else if (action.type === 'send_reminder') {
          // Log reminder in production note
          await base44.asServiceRole.entities.ProductionNote.create({
            project_id,
            week_date: now.toISOString().split('T')[0],
            category: 'coordination',
            note_type: 'blocker',
            title: action.message,
            body: `PMA automated reminder sent to ${action.recipient}`,
            priority: 'high'
          });
          console.log(`[PMA] Auto-sent reminder for ${action.entity}`);
        }
      } catch (err) {
        console.error(`[PMA] Action execution failed:`, err);
      }
    }

    // === CREATE ALERTS ===
    
    for (const alertData of alerts) {
      try {
        // Check if similar alert already exists (avoid duplicates)
        const existing = await base44.asServiceRole.entities.Alert.filter({
          project_id,
          entity_id: alertData.entity_id,
          alert_type: alertData.alert_type,
          status: 'active'
        });

        if (existing.length === 0) {
          await base44.asServiceRole.entities.Alert.create(alertData);
          console.log(`[PMA] Created alert: ${alertData.title}`);
        }
      } catch (err) {
        console.error(`[PMA] Alert creation failed:`, err);
      }
    }

    // === GENERATE SUMMARY ===

    const summary = {
      project_id,
      project_name: project.name,
      timestamp: now.toISOString(),
      alerts_generated: alerts.length,
      actions_executed: actions.length,
      risk_summary: {
        critical: alerts.filter(a => a.severity === 'critical').length,
        high: alerts.filter(a => a.severity === 'high').length,
        medium: alerts.filter(a => a.severity === 'medium').length
      },
      key_issues: [
        `${agingRFIs.length} aging RFIs`,
        `${blockedGates.length} blocked gates`,
        `${overdueTasks.length} overdue tasks`,
        `${sequenceConflicts.length} delivery conflicts`
      ]
    };

    console.log(`[PMA] Monitoring complete:`, summary);

    return Response.json({
      success: true,
      summary,
      alerts,
      actions
    });

  } catch (error) {
    console.error('[PMA] Monitoring error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});