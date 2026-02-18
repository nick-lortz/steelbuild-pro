/**
 * Audit logging for schedule operations
 */

export async function auditScheduleAction(base44, {
  project_id,
  event_type,
  actor_user_id,
  actor_email,
  task_ids,
  diff_summary,
  before = null,
  after = null
}) {
  try {
    await base44.asServiceRole.entities.ScheduleAuditLog.create({
      project_id,
      event_type,
      actor_user_id,
      actor_email,
      task_ids: Array.isArray(task_ids) ? task_ids : [task_ids],
      diff_summary,
      before_json: before ? JSON.stringify(before) : null,
      after_json: after ? JSON.stringify(after) : null,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Audit log failed:', error);
    // Don't throw - audit failure shouldn't block operations
  }
}