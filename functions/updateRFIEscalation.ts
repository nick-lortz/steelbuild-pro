import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { logger } from './utils/logging.js';

/**
 * Auto-update RFI escalation level and business days
 * Triggered by entity automation on RFI create/update
 */

const RISK_THRESHOLDS = {
  rfi_aging_warning: 10,
  rfi_aging_urgent: 15,
  rfi_aging_overdue: 16
};

function getBusinessDaysBetween(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  let count = 0;
  let current = new Date(start);
  
  while (current <= end) {
    if (current.getDay() !== 0 && current.getDay() !== 6) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  
  return count;
}

function getRFIEscalationLevel(submittedDate, status, businessDaysOpen) {
  if (status === 'closed' || status === 'answered') return 'normal';
  
  if (businessDaysOpen >= RISK_THRESHOLDS.rfi_aging_overdue) return 'overdue';
  if (businessDaysOpen >= RISK_THRESHOLDS.rfi_aging_urgent) return 'urgent';
  if (businessDaysOpen >= RISK_THRESHOLDS.rfi_aging_warning) return 'warning';
  return 'normal';
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const { event, data } = await req.json();
    
    if (!event || !data) {
      return Response.json({ error: 'Invalid automation payload' }, { status: 400 });
    }

    const rfi = data;
    
    // Skip if no submitted date
    if (!rfi.submitted_date && !rfi.created_date) {
      logger.info('updateRFIEscalation', 'Skipped - no date available', { rfi_id: event.entity_id });
      return Response.json({ skipped: true });
    }

    const submittedDate = rfi.submitted_date || rfi.created_date;
    const businessDaysOpen = getBusinessDaysBetween(new Date(submittedDate), new Date());
    const escalationLevel = getRFIEscalationLevel(submittedDate, rfi.status, businessDaysOpen);

    // Only update if changed
    if (rfi.business_days_open === businessDaysOpen && rfi.escalation_level === escalationLevel) {
      return Response.json({ unchanged: true });
    }

    // Update RFI with computed fields
    await base44.asServiceRole.entities.RFI.update(event.entity_id, {
      business_days_open: businessDaysOpen,
      escalation_level: escalationLevel
    });

    logger.info('updateRFIEscalation', 'Updated RFI escalation', {
      rfi_id: event.entity_id,
      rfi_number: rfi.rfi_number,
      business_days_open: businessDaysOpen,
      escalation_level: escalationLevel
    });

    return Response.json({ 
      updated: true,
      business_days_open: businessDaysOpen,
      escalation_level: escalationLevel
    });

  } catch (error) {
    logger.error('updateRFIEscalation', 'Update failed', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});