import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Get all open RFIs
    const openRFIs = await base44.asServiceRole.entities.RFI.filter({
      status: { $in: ['submitted', 'under_review', 'internal_review'] }
    });

    const now = new Date();
    const reminders = [];

    for (const rfi of openRFIs) {
      if (!rfi.submitted_date) continue;

      const submittedDate = new Date(rfi.submitted_date);
      const daysOpen = Math.floor((now - submittedDate) / (1000 * 60 * 60 * 24));
      const sla = rfi.days_to_respond || 7;
      const daysOverdue = daysOpen - sla;

      // Determine if reminder needed based on criticality and age
      let shouldRemind = false;
      let severity = 'medium';

      if (rfi.priority === 'critical' && daysOverdue >= 3) {
        shouldRemind = true;
        severity = 'critical';
      } else if (rfi.priority === 'high' && daysOverdue >= 5) {
        shouldRemind = true;
        severity = 'high';
      } else if (daysOverdue >= 7) {
        shouldRemind = true;
        severity = 'medium';
      }

      // Check if blocking fabrication or erection
      if (rfi.fabrication_hold || rfi.is_install_blocker || rfi.is_release_blocker) {
        if (daysOverdue >= 2) {
          shouldRemind = true;
          severity = 'critical';
        }
      }

      if (shouldRemind) {
        // Create alert
        await base44.asServiceRole.entities.Alert.create({
          project_id: rfi.project_id,
          alert_type: 'rfi_overdue',
          severity: severity,
          title: `RFI-${rfi.rfi_number} Overdue`,
          message: `RFI-${rfi.rfi_number} "${rfi.subject}" is ${daysOverdue} days overdue (submitted ${submittedDate.toLocaleDateString()}, ${daysOpen} days open). Ball in court: ${rfi.ball_in_court}. ${rfi.fabrication_hold ? 'FABRICATION ON HOLD. ' : ''}${rfi.is_install_blocker ? 'BLOCKING ERECTION. ' : ''}`,
          entity_type: 'RFI',
          entity_id: rfi.id,
          days_open: daysOpen,
          recommended_action: `Escalate to ${rfi.ball_in_court}. Contact ${rfi.response_owner || 'GC'} immediately.`,
          status: 'active'
        });

        reminders.push({
          rfi_number: rfi.rfi_number,
          subject: rfi.subject,
          days_overdue: daysOverdue,
          severity: severity,
          project_id: rfi.project_id
        });

        // Update RFI escalation level
        let escalationLevel = 'normal';
        if (daysOverdue >= 14) escalationLevel = 'overdue';
        else if (daysOverdue >= 10) escalationLevel = 'urgent';
        else if (daysOverdue >= 7) escalationLevel = 'warning';

        await base44.asServiceRole.entities.RFI.update(rfi.id, {
          escalation_level: escalationLevel,
          escalation_flag: daysOverdue >= 7,
          business_days_open: daysOpen
        });
      }
    }

    return Response.json({
      success: true,
      reminders_created: reminders.length,
      reminders: reminders
    });

  } catch (error) {
    console.error('Error checking overdue RFIs:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});