// Common utility functions

export function clampInt(value, min, max, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(n)));
}

export function auditLog(base44, action, user, details) {
  // Log sensitive operations for audit trail
  return base44.asServiceRole.entities.AuditLog.create({
    action,
    user_email: user.email,
    timestamp: new Date().toISOString(),
    details: JSON.stringify(details),
    ip_address: details.ip || null
  });
}