/**
 * ROI CALCULATIONS LIBRARY
 * 
 * Standard cost impact calculations for execution gating ROI tracking
 */

export function calculateCostImpact(severity) {
  const rates = {
    critical: { hours: 16, trades: 2, rate: 120 },
    high: { hours: 8, trades: 2, rate: 120 },
    medium: { hours: 4, trades: 1, rate: 100 },
    low: { hours: 2, trades: 1, rate: 80 }
  };
  
  const config = rates[severity] || rates.low;
  const hoursSaved = config.hours * config.trades;
  const costImpact = hoursSaved * config.rate;
  
  return {
    estimated_hours_saved: hoursSaved,
    estimated_cost_impact: costImpact
  };
}

export function determineSeverityFromGate(gate) {
  if (!gate.blockers || gate.blockers.length === 0) return 'low';
  
  const hasCritical = gate.blockers.some(b => 
    b.severity === 'critical' || b.severity === 'blocking'
  );
  const hasHigh = gate.blockers.some(b => b.severity === 'high');
  
  if (hasCritical) return 'critical';
  if (hasHigh) return 'high';
  if (gate.blockers.length > 2) return 'medium';
  return 'low';
}

export function createROIEvent(projectId, eventType, entityType, entityId, severity, reason, additionalData = {}) {
  const { estimated_hours_saved, estimated_cost_impact } = calculateCostImpact(severity);
  
  return {
    project_id: projectId,
    event_type: eventType,
    related_entity_type: entityType,
    related_entity_id: entityId,
    severity,
    estimated_hours_saved,
    estimated_cost_impact,
    reason,
    ...additionalData
  };
}