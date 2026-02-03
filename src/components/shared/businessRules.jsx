/**
 * Centralized Business Rules & Thresholds
 * 
 * Steel Erection & Fabrication Industry Standards
 */

// Project Health Thresholds
export const RISK_THRESHOLDS = {
  // Cost overrun percentage (negative = over budget)
  cost_warning: -5,     // 5% over budget = warning
  cost_critical: -10,   // 10% over budget = critical
  
  // Schedule slip (business days)
  schedule_warning: 5,   // 5 business days slip = warning
  schedule_critical: 10, // 10 business days slip = critical
  
  // Task overdue
  tasks_overdue_warning: 1,  // 1+ overdue tasks = warning
  tasks_overdue_critical: 5, // 5+ overdue tasks = critical
  
  // Budget variance (actual vs budget %)
  budget_variance_warning: 90,  // >90% spent = warning
  budget_variance_critical: 100, // >100% spent = critical
  
  // RFI aging (business days)
  rfi_aging_normal: 5,      // 0-5 days = normal
  rfi_aging_warning: 10,    // 6-10 days = warning
  rfi_aging_urgent: 15,     // 11-15 days = urgent
  rfi_aging_overdue: 16,    // 16+ days = overdue/critical
  
  // Progress deviation
  progress_behind_warning: -10,  // 10% behind schedule
  progress_behind_critical: -20  // 20% behind schedule
};

// Steel Industry Standard Phases
export const STEEL_PHASES = {
  detailing: { order: 1, typical_duration_weeks: 4 },
  fabrication: { order: 2, typical_duration_weeks: 8 },
  delivery: { order: 3, typical_duration_weeks: 2 },
  erection: { order: 4, typical_duration_weeks: 6 },
  closeout: { order: 5, typical_duration_weeks: 2 }
};

// RFI Escalation Levels
export const RFI_ESCALATION = {
  normal: { 
    label: 'Normal', 
    color: 'green',
    maxDays: RISK_THRESHOLDS.rfi_aging_normal 
  },
  warning: { 
    label: 'Warning', 
    color: 'amber',
    maxDays: RISK_THRESHOLDS.rfi_aging_warning 
  },
  urgent: { 
    label: 'Urgent', 
    color: 'orange',
    maxDays: RISK_THRESHOLDS.rfi_aging_urgent 
  },
  overdue: { 
    label: 'Overdue', 
    color: 'red',
    maxDays: Infinity 
  }
};

// Business Days Calculation (excludes weekends)
export function addBusinessDays(startDate, days) {
  let current = new Date(startDate);
  let added = 0;
  
  while (added < days) {
    current.setDate(current.getDate() + 1);
    // Skip weekends (0 = Sunday, 6 = Saturday)
    if (current.getDay() !== 0 && current.getDay() !== 6) {
      added++;
    }
  }
  
  return current;
}

export function getBusinessDaysBetween(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  let count = 0;
  let current = new Date(start);
  
  while (current <= end) {
    // Count only weekdays
    if (current.getDay() !== 0 && current.getDay() !== 6) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  
  return count;
}

// RFI Escalation Level Calculator
export function getRFIEscalationLevel(submittedDate, status) {
  // Closed/answered RFIs don't escalate
  if (status === 'closed' || status === 'answered') {
    return 'normal';
  }
  
  const businessDaysOpen = getBusinessDaysBetween(
    new Date(submittedDate),
    new Date()
  );
  
  if (businessDaysOpen >= RISK_THRESHOLDS.rfi_aging_overdue) return 'overdue';
  if (businessDaysOpen >= RISK_THRESHOLDS.rfi_aging_urgent) return 'urgent';
  if (businessDaysOpen >= RISK_THRESHOLDS.rfi_aging_warning) return 'warning';
  return 'normal';
}

// Project Risk Score Calculator (0-100, higher = more risk)
export function calculateProjectRiskScore(project, tasks, financials, rfis) {
  let score = 0;
  let factors = [];
  
  // Cost Health (0-30 points)
  const budget = financials.reduce((sum, f) => sum + (f.current_budget || 0), 0);
  const actual = financials.reduce((sum, f) => sum + (f.actual_amount || 0), 0);
  const costHealth = budget > 0 ? ((budget - actual) / budget * 100) : 0;
  
  if (costHealth < RISK_THRESHOLDS.cost_critical) {
    score += 30;
    factors.push('Critical cost overrun');
  } else if (costHealth < RISK_THRESHOLDS.cost_warning) {
    score += 15;
    factors.push('Cost overrun warning');
  }
  
  // Schedule Health (0-30 points)
  const overdueTasks = tasks.filter(t => 
    t.status !== 'completed' && 
    t.end_date && 
    t.end_date < new Date().toISOString().split('T')[0]
  ).length;
  
  if (overdueTasks >= RISK_THRESHOLDS.tasks_overdue_critical) {
    score += 30;
    factors.push('Critical task delays');
  } else if (overdueTasks >= RISK_THRESHOLDS.tasks_overdue_warning) {
    score += 15;
    factors.push('Task delays');
  }
  
  // RFI Health (0-25 points)
  const overdueRFIs = rfis.filter(r => 
    getRFIEscalationLevel(r.submitted_date, r.status) === 'overdue'
  ).length;
  const urgentRFIs = rfis.filter(r => 
    getRFIEscalationLevel(r.submitted_date, r.status) === 'urgent'
  ).length;
  
  if (overdueRFIs > 0) {
    score += 25;
    factors.push(`${overdueRFIs} overdue RFIs`);
  } else if (urgentRFIs > 0) {
    score += 12;
    factors.push(`${urgentRFIs} urgent RFIs`);
  }
  
  // Progress vs Schedule (0-15 points)
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const progress = tasks.length > 0 ? (completedTasks / tasks.length * 100) : 0;
  const expectedProgress = 50; // Placeholder - should be based on schedule baseline
  const progressDeviation = progress - expectedProgress;
  
  if (progressDeviation < RISK_THRESHOLDS.progress_behind_critical) {
    score += 15;
    factors.push('Significantly behind schedule');
  } else if (progressDeviation < RISK_THRESHOLDS.progress_behind_warning) {
    score += 8;
    factors.push('Behind schedule');
  }
  
  return {
    score: Math.min(score, 100),
    level: score >= 70 ? 'critical' : score >= 40 ? 'warning' : 'healthy',
    factors
  };
}

// Health Status Colors
export function getHealthColor(healthValue, thresholdType = 'cost') {
  switch (thresholdType) {
    case 'cost':
      if (healthValue < RISK_THRESHOLDS.cost_critical) return 'red';
      if (healthValue < RISK_THRESHOLDS.cost_warning) return 'amber';
      return 'green';
    
    case 'schedule':
      if (healthValue > RISK_THRESHOLDS.schedule_critical) return 'red';
      if (healthValue > RISK_THRESHOLDS.schedule_warning) return 'amber';
      return 'green';
    
    case 'progress':
      if (healthValue < RISK_THRESHOLDS.progress_behind_critical) return 'red';
      if (healthValue < RISK_THRESHOLDS.progress_behind_warning) return 'amber';
      return 'green';
    
    default:
      return 'gray';
  }
}