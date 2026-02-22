/**
 * WORKFLOW RISK STATE
 * 
 * Detects critical path blockers and execution bottlenecks.
 * Analyzes task dependencies and correlates with blocking entities.
 * 
 * Detection Rules:
 * - RFI blocking task: RFI linked to task AND status not answered/closed
 * - Submittal blocking: Submittal required before task start AND not approved
 * - Fabrication delay: Fab item behind plan AND linked to task
 * - Delivery delay: Delivery overdue AND linked to task or work package
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { parseInput, requireUser, requireProjectAccess, ok, badRequest, unauthorized, forbidden, serverError } from './_lib/guard.js';

Deno.serve(async (req) => {
  try {
    const { project_id } = await parseInput(req, {
      project_id: { required: true, type: 'string' }
    });
    
    const user = await requireUser(req);
    const base44 = createClientFromRequest(req);
    await requireProjectAccess(user, project_id, base44);
    
    const riskState = await computeWorkflowRisk(base44, project_id);
    
    return ok(riskState);
    
  } catch (error) {
    if (error.status === 400) return badRequest(error.message);
    if (error.status === 401) return unauthorized(error.message);
    if (error.status === 403) return forbidden(error.message);
    return serverError('Failed to compute workflow risk', error);
  }
});

async function computeWorkflowRisk(base44, project_id) {
  const now = new Date();
  
  // Fetch all relevant entities (RLS-enforced, user-scoped)
  const [tasks, rfis, submittals, changeOrders, fabrications, deliveries, workPackages] = await Promise.all([
    base44.entities.Task.filter({ project_id }),
    base44.entities.RFI.filter({ project_id }),
    base44.entities.Submittal.filter({ project_id }),
    base44.entities.ChangeOrder.filter({ project_id }),
    base44.entities.Fabrication.filter({ project_id }),
    base44.entities.Delivery.filter({ project_id }),
    base44.entities.WorkPackage.filter({ project_id })
  ]);
  
  const at_risk_tasks = [];
  const blockerMap = new Map(); // Track blockers for aggregation
  
  // Analyze each incomplete task
  tasks
    .filter(task => task.status !== 'completed')
    .forEach(task => {
      const taskBlockers = [];
      
      // Rule 1: RFI blockers
      // Check linked_rfi_ids on task OR RFIs that reference this task
      const linkedRFIs = rfis.filter(rfi => 
        (task.linked_rfi_ids?.includes(rfi.id) || rfi.linked_task_ids?.includes(task.id)) &&
        !['answered', 'closed'].includes(rfi.status)
      );
      
      linkedRFIs.forEach(rfi => {
        const daysBlocked = getDaysOpen(rfi.submitted_date, now);
        taskBlockers.push({
          type: 'rfi',
          entity: 'RFI',
          entity_id: rfi.id,
          title: `RFI #${rfi.rfi_number}: ${rfi.subject}`,
          reason: `Waiting on RFI response (${rfi.ball_in_court})`,
          days_blocked: daysBlocked,
          severity: rfi.fab_blocker ? 'critical' : 'high'
        });
        
        // Track for top blockers
        const key = `rfi-${rfi.id}`;
        if (!blockerMap.has(key)) {
          blockerMap.set(key, {
            type: 'rfi',
            entity: 'RFI',
            entity_id: rfi.id,
            title: `RFI #${rfi.rfi_number}: ${rfi.subject}`,
            severity: rfi.fab_blocker ? 'critical' : 'high',
            impacted_tasks: [],
            reason: `Open ${daysBlocked}d, ball in court: ${rfi.ball_in_court}`
          });
        }
        blockerMap.get(key).impacted_tasks.push(task.id);
      });
      
      // Rule 2: Submittal blockers
      const linkedSubmittals = submittals.filter(sub =>
        task.linked_submittal_ids?.includes(sub.id) &&
        !['approved', 'closed'].includes(sub.status)
      );
      
      linkedSubmittals.forEach(submittal => {
        const daysBlocked = getDaysOpen(submittal.submitted_date, now);
        taskBlockers.push({
          type: 'submittal',
          entity: 'Submittal',
          entity_id: submittal.id,
          title: submittal.title || `Submittal #${submittal.submittal_number}`,
          reason: 'Approval pending',
          days_blocked: daysBlocked,
          severity: daysBlocked > 21 ? 'high' : 'medium'
        });
        
        const key = `submittal-${submittal.id}`;
        if (!blockerMap.has(key)) {
          blockerMap.set(key, {
            type: 'submittal',
            entity: 'Submittal',
            entity_id: submittal.id,
            title: submittal.title || `Submittal #${submittal.submittal_number}`,
            severity: daysBlocked > 21 ? 'high' : 'medium',
            impacted_tasks: [],
            reason: `Pending approval for ${daysBlocked}d`
          });
        }
        blockerMap.get(key).impacted_tasks.push(task.id);
      });
      
      // Rule 3: Fabrication delays
      const taskWorkPackage = workPackages.find(wp => wp.id === task.work_package_id);
      if (taskWorkPackage?.phase === 'fabrication' || task.phase === 'fabrication') {
        const fab = fabrications.find(f => 
          f.work_package_id === task.work_package_id || 
          f.linked_task_ids?.includes(task.id)
        );
        
        if (fab && fab.status !== 'completed' && fab.percent_complete < 100) {
          const expectedComplete = fab.planned_completion_date;
          if (expectedComplete && new Date(expectedComplete) < now) {
            const daysLate = getDaysOpen(expectedComplete, now);
            taskBlockers.push({
              type: 'fabrication',
              entity: 'Fabrication',
              entity_id: fab.id,
              title: 'Fabrication behind plan',
              reason: `${daysLate}d past planned completion`,
              days_blocked: daysLate,
              severity: daysLate > 7 ? 'high' : 'medium'
            });
          }
        }
      }
      
      // Rule 4: Delivery delays
      const linkedDeliveries = deliveries.filter(del =>
        (task.linked_delivery_ids?.includes(del.id) || 
         del.linked_task_ids?.includes(task.id)) &&
        !['delivered', 'received', 'cancelled'].includes(del.status)
      );
      
      linkedDeliveries.forEach(delivery => {
        const scheduledDate = delivery.scheduled_date || delivery.expected_date;
        if (scheduledDate && new Date(scheduledDate) < now) {
          const daysLate = getDaysOpen(scheduledDate, now);
          taskBlockers.push({
            type: 'delivery',
            entity: 'Delivery',
            entity_id: delivery.id,
            title: delivery.description || 'Material Delivery',
            reason: `${daysLate}d past scheduled delivery`,
            days_blocked: daysLate,
            severity: daysLate > 3 ? 'critical' : 'high'
          });
          
          const key = `delivery-${delivery.id}`;
          if (!blockerMap.has(key)) {
            blockerMap.set(key, {
              type: 'delivery',
              entity: 'Delivery',
              entity_id: delivery.id,
              title: delivery.description || 'Material Delivery',
              severity: daysLate > 3 ? 'critical' : 'high',
              impacted_tasks: [],
              reason: `${daysLate}d overdue`
            });
          }
          blockerMap.get(key).impacted_tasks.push(task.id);
        }
      });
      
      // Rule 5: Task is itself overdue
      if (task.end_date && new Date(task.end_date) < now) {
        const daysLate = getDaysOpen(task.end_date, now);
        taskBlockers.push({
          type: 'schedule',
          entity: 'Task',
          entity_id: task.id,
          title: 'Task overdue',
          reason: `${daysLate}d past due date`,
          days_blocked: daysLate,
          severity: task.is_critical ? 'critical' : 'medium'
        });
      }
      
      // If task has blockers, add to at-risk list
      if (taskBlockers.length > 0) {
        const maxSeverity = getMaxSeverity(taskBlockers.map(b => b.severity));
        at_risk_tasks.push({
          schedule_task_id: task.id,
          title: task.title,
          risk_level: maxSeverity,
          blockers: taskBlockers,
          end_date: task.end_date,
          is_critical: task.is_critical
        });
      }
    });
  
  // Build top blockers from blocker map
  const top_blockers = Array.from(blockerMap.values())
    .map(blocker => ({
      ...blocker,
      impacted_tasks_count: blocker.impacted_tasks.length
    }))
    .sort((a, b) => {
      // Sort by severity then impacted task count
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      if (a.severity !== b.severity) {
        return severityOrder[a.severity] - severityOrder[b.severity];
      }
      return b.impacted_tasks_count - a.impacted_tasks_count;
    });
  
  return {
    project_id,
    generated_at: now.toISOString(),
    at_risk_tasks: at_risk_tasks.sort((a, b) => {
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return severityOrder[a.risk_level] - severityOrder[b.risk_level];
    }),
    top_blockers: top_blockers.slice(0, 10)
  };
}

function getDaysOpen(startDate, endDate) {
  if (!startDate) return 0;
  const start = new Date(startDate);
  const end = new Date(endDate);
  return Math.floor((end - start) / (1000 * 60 * 60 * 24));
}

function getMaxSeverity(severities) {
  if (severities.includes('critical')) return 'critical';
  if (severities.includes('high')) return 'high';
  if (severities.includes('medium')) return 'medium';
  return 'low';
}