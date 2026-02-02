/**
 * Project Risk Scoring System
 * Calculates comprehensive risk scores based on multiple factors
 */

export const RISK_LEVELS = {
  LOW: { label: 'Low', value: 0, color: 'text-green-500', bg: 'bg-green-500/20', border: 'border-green-500' },
  MEDIUM: { label: 'Medium', value: 1, color: 'text-blue-500', bg: 'bg-blue-500/20', border: 'border-blue-500' },
  HIGH: { label: 'High', value: 2, color: 'text-amber-500', bg: 'bg-amber-500/20', border: 'border-amber-500' },
  CRITICAL: { label: 'Critical', value: 3, color: 'text-red-500', bg: 'bg-red-500/20', border: 'border-red-500' }
};

/**
 * Calculate project risk score based on multiple factors
 * @param {Object} project - Project data
 * @param {Array} projectTasks - Tasks for this project
 * @param {Array} projectRFIs - RFIs for this project
 * @param {Array} projectChangeOrders - Change orders for this project
 * @param {Array} projectFinancials - Financial records for this project
 * @returns {Object} Risk score details
 */
export function calculateProjectRiskScore(project, projectTasks, projectRFIs, projectFinancials, projectChangeOrders) {
  const factors = {};
  let totalScore = 0;
  const today = new Date().toISOString().split('T')[0];

  // Factor 1: Overdue Tasks (0-30 points)
  const overdueTasks = projectTasks.filter(t => 
    t.status !== 'completed' && t.end_date && t.end_date < today
  );
  const overdueRatio = projectTasks.length > 0 ? overdueTasks.length / projectTasks.length : 0;
  factors.overdueTasks = {
    score: Math.min(30, overdueRatio * 100),
    count: overdueTasks.length,
    total: projectTasks.length
  };
  totalScore += factors.overdueTasks.score;

  // Factor 2: RFI Health (0-25 points)
  const openRFIs = projectRFIs.filter(r => !['answered', 'closed'].includes(r.status));
  const agingRFIs = openRFIs.filter(r => {
    if (!r.submitted_date) return false;
    const daysDiff = Math.floor((new Date() - new Date(r.submitted_date)) / (1000 * 60 * 60 * 24));
    return daysDiff > 14;
  });
  const overdueRFIs = openRFIs.filter(r => {
    if (!r.due_date) return false;
    return new Date(r.due_date) < new Date();
  });
  const rfiScore = Math.min(25, (agingRFIs.length * 5) + (overdueRFIs.length * 8));
  factors.rfis = {
    score: rfiScore,
    open: openRFIs.length,
    aging: agingRFIs.length,
    overdue: overdueRFIs.length
  };
  totalScore += rfiScore;

  // Factor 3: Cost Variance (0-25 points)
  const budget = projectFinancials.reduce((sum, f) => sum + (f.current_budget || 0), 0);
  const actual = projectFinancials.reduce((sum, f) => sum + (f.actual_amount || 0), 0);
  const costVariance = budget > 0 ? ((actual - budget) / budget) * 100 : 0;
  const costScore = costVariance > 10 ? 25 : 
                    costVariance > 5 ? 18 : 
                    costVariance > 0 ? 10 : 0;
  factors.costVariance = {
    score: costScore,
    variance: costVariance,
    budget,
    actual
  };
  totalScore += costScore;

  // Factor 4: Schedule Variance (0-20 points)
  let scheduleScore = 0;
  if (project.target_completion) {
    try {
      const targetDate = new Date(project.target_completion);
      const latestTaskEnd = projectTasks
        .filter(t => t.end_date)
        .map(t => new Date(t.end_date))
        .sort((a, b) => b - a)[0];

      if (latestTaskEnd && latestTaskEnd > targetDate) {
        const daysSlip = Math.floor((latestTaskEnd - targetDate) / (1000 * 60 * 60 * 24));
        scheduleScore = daysSlip > 30 ? 20 :
                       daysSlip > 14 ? 15 :
                       daysSlip > 7 ? 10 : 5;
        factors.scheduleVariance = {
          score: scheduleScore,
          daysSlip
        };
      } else {
        factors.scheduleVariance = { score: 0, daysSlip: 0 };
      }
    } catch (error) {
      factors.scheduleVariance = { score: 0, daysSlip: 0 };
    }
  } else {
    factors.scheduleVariance = { score: 0, daysSlip: 0 };
  }
  totalScore += scheduleScore;

  // Factor 5: Pending Change Orders (0-15 points)
  const pendingCOs = projectChangeOrders.filter(co => 
    ['draft', 'submitted', 'under_review'].includes(co.status)
  );
  const coValue = pendingCOs.reduce((sum, co) => sum + Math.abs(co.cost_impact || 0), 0);
  const coScore = pendingCOs.length > 5 ? 15 :
                  pendingCOs.length > 3 ? 12 :
                  pendingCOs.length > 1 ? 8 :
                  coValue > 50000 ? 10 : 0;
  factors.changeOrders = {
    score: coScore,
    pending: pendingCOs.length,
    value: coValue
  };
  totalScore += coScore;

  // Determine risk level
  let riskLevel = RISK_LEVELS.LOW;
  if (totalScore >= 60) {
    riskLevel = RISK_LEVELS.CRITICAL;
  } else if (totalScore >= 40) {
    riskLevel = RISK_LEVELS.HIGH;
  } else if (totalScore >= 20) {
    riskLevel = RISK_LEVELS.MEDIUM;
  }

  return {
    totalScore,
    riskLevel,
    factors
  };
}

/**
 * Get risk badge styling
 */
export function getRiskBadgeStyle(riskLevel) {
  return {
    className: `${riskLevel.bg} ${riskLevel.color} border ${riskLevel.border}`,
    label: riskLevel.label
  };
}