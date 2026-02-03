/**
 * Centralized Financial Calculation Utilities
 * 
 * Single source of truth for all financial formulas across the app.
 * Used by: Dashboard, Financials, ProjectHealthTable, calculateProjectHealth
 */

/**
 * Calculate cost health percentage
 * Positive = under budget (good), Negative = over budget (bad)
 * 
 * @param {number} budget - Total current budget
 * @param {number} actual - Total actual cost
 * @returns {number} Percentage (-100 to +100)
 */
export function calculateCostHealth(budget, actual) {
  if (budget > 0) {
    return ((budget - actual) / budget) * 100;
  }
  // Edge case: no budget but have costs
  if (actual > 0) return -100;
  // Edge case: no budget and no costs
  return 0;
}

/**
 * Calculate budget vs actual percentage
 * 
 * @param {number} budget - Total current budget
 * @param {number} actual - Total actual cost
 * @returns {number} Percentage (0 to 100+)
 */
export function calculateBudgetVsActual(budget, actual) {
  if (budget > 0) {
    return (actual / budget) * 100;
  }
  // Edge case: no budget but have costs
  if (actual > 0) return 100;
  // Edge case: no budget and no costs
  return 0;
}

/**
 * Calculate cost variance (dollar amount)
 * 
 * @param {number} budget - Total current budget
 * @param {number} actual - Total actual cost
 * @returns {number} Dollar variance (positive = under budget)
 */
export function calculateCostVariance(budget, actual) {
  return budget - actual;
}

/**
 * Calculate task progress percentage
 * 
 * @param {number} completedTasks - Number of completed tasks
 * @param {number} totalTasks - Total number of tasks
 * @returns {number} Percentage (0 to 100)
 */
export function calculateTaskProgress(completedTasks, totalTasks) {
  if (totalTasks > 0) {
    return (completedTasks / totalTasks) * 100;
  }
  return 0;
}

/**
 * Calculate SOV-based metrics
 * 
 * @param {Array} sovItems - Array of SOV items
 * @returns {Object} SOV metrics
 */
export function calculateSOVMetrics(sovItems) {
  const contractValue = sovItems.reduce((sum, s) => sum + (s.scheduled_value || 0), 0);
  const earnedToDate = sovItems.reduce((sum, s) => 
    sum + ((s.scheduled_value || 0) * ((s.percent_complete || 0) / 100)), 0);
  const billedToDate = sovItems.reduce((sum, s) => sum + (s.billed_to_date || 0), 0);
  const remainingToBill = contractValue - billedToDate;
  
  const percentBilled = contractValue > 0 ? (billedToDate / contractValue) * 100 : 0;
  const percentEarned = contractValue > 0 ? (earnedToDate / contractValue) * 100 : 0;
  
  return {
    contractValue,
    earnedToDate,
    billedToDate,
    remainingToBill,
    percentBilled,
    percentEarned
  };
}

/**
 * Format currency for display
 * 
 * @param {number} value - Dollar amount
 * @param {boolean} compact - Use compact notation (K/M)
 * @returns {string} Formatted currency
 */
export function formatCurrency(value, compact = false) {
  if (!value && value !== 0) return '$0';
  
  if (compact) {
    const absValue = Math.abs(value);
    if (absValue >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
    if (absValue >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  }
  
  return `$${value.toLocaleString()}`;
}