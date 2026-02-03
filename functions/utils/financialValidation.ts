/**
 * Financial Calculation Validation
 * 
 * Validates SOV, budget, actuals, ETC, and invoice calculations
 */

/**
 * Validate SOV line item calculations
 */
export function validateSOVItem(item) {
  const errors = [];
  
  // Scheduled value must be positive
  if (item.scheduled_value < 0) {
    errors.push('Scheduled value cannot be negative');
  }
  
  // Percent complete range
  if (item.percent_complete < 0 || item.percent_complete > 100) {
    errors.push('Percent complete must be between 0 and 100');
  }
  
  // Current billing calculation
  const calculatedCurrentBilling = (item.scheduled_value * item.percent_complete) / 100;
  const previousBilling = item.previous_billing || 0;
  const thisPeriodBilling = item.this_period_billing || 0;
  const currentBilling = previousBilling + thisPeriodBilling;
  
  // Check if current billing matches percent complete
  const tolerance = 0.01; // $0.01 tolerance
  if (Math.abs(currentBilling - calculatedCurrentBilling) > tolerance) {
    errors.push(`Current billing ($${currentBilling.toFixed(2)}) doesn't match percent complete calculation ($${calculatedCurrentBilling.toFixed(2)})`);
  }
  
  // Current billing cannot exceed scheduled value
  if (currentBilling > item.scheduled_value + tolerance) {
    errors.push('Current billing cannot exceed scheduled value');
  }
  
  // Balance to finish calculation
  const calculatedBalance = item.scheduled_value - currentBilling;
  const balance = item.balance_to_finish || 0;
  
  if (Math.abs(balance - calculatedBalance) > tolerance) {
    errors.push(`Balance to finish ($${balance.toFixed(2)}) doesn't match calculation ($${calculatedBalance.toFixed(2)})`);
  }
  
  return {
    valid: errors.length === 0,
    errors,
    corrections: {
      current_billing: calculatedCurrentBilling,
      balance_to_finish: calculatedBalance,
      percent_complete: item.scheduled_value > 0 ? (currentBilling / item.scheduled_value) * 100 : 0
    }
  };
}

/**
 * Validate project SOV totals
 */
export function validateSOVTotals(sovItems) {
  const errors = [];
  
  const totals = sovItems.reduce((acc, item) => ({
    scheduled_value: acc.scheduled_value + (item.scheduled_value || 0),
    current_billing: acc.current_billing + (item.current_billing || 0),
    balance_to_finish: acc.balance_to_finish + (item.balance_to_finish || 0)
  }), { scheduled_value: 0, current_billing: 0, balance_to_finish: 0 });
  
  // Balance equation: scheduled_value = current_billing + balance_to_finish
  const tolerance = 0.01;
  const calculatedBalance = totals.scheduled_value - totals.current_billing;
  
  if (Math.abs(totals.balance_to_finish - calculatedBalance) > tolerance) {
    errors.push(`SOV balance equation doesn't balance: $${totals.scheduled_value.toFixed(2)} ≠ $${totals.current_billing.toFixed(2)} + $${totals.balance_to_finish.toFixed(2)}`);
  }
  
  return {
    valid: errors.length === 0,
    errors,
    totals
  };
}

/**
 * Validate budget vs actuals
 */
export function validateBudgetActuals(financial) {
  const errors = [];
  
  // Current budget = original budget + approved changes
  const calculatedCurrentBudget = (financial.original_budget || 0) + (financial.approved_changes || 0);
  const currentBudget = financial.current_budget || 0;
  
  const tolerance = 0.01;
  if (Math.abs(currentBudget - calculatedCurrentBudget) > tolerance) {
    errors.push(`Current budget ($${currentBudget.toFixed(2)}) doesn't match original ($${financial.original_budget || 0}) + changes ($${financial.approved_changes || 0})`);
  }
  
  // Forecast should be >= actual
  if (financial.forecast_amount < financial.actual_amount) {
    errors.push('Forecast cannot be less than actual costs');
  }
  
  // Variance calculations
  const budgetVariance = currentBudget - financial.actual_amount;
  const forecastVariance = currentBudget - financial.forecast_amount;
  
  return {
    valid: errors.length === 0,
    errors,
    corrections: {
      current_budget: calculatedCurrentBudget,
      budget_variance: budgetVariance,
      forecast_variance: forecastVariance
    }
  };
}

/**
 * Validate ETC (Estimate to Complete) calculation
 */
export function validateETC(financial, completionPercent = 50) {
  const errors = [];
  
  const actual = financial.actual_amount || 0;
  const budget = financial.current_budget || 0;
  
  // ETC = (Budget - Actual) / (1 - PercentComplete/100)
  // But simplified: if 50% complete, ETC should roughly equal actual
  
  if (completionPercent >= 100) {
    // Project complete, ETC should be 0
    if (financial.forecast_amount > actual + 0.01) {
      errors.push('Project 100% complete but forecast exceeds actuals');
    }
  } else if (completionPercent > 0) {
    // Forecast = Actual + ETC
    // ETC = (Budget - Actual) adjusted for performance
    const earnedValue = (budget * completionPercent) / 100;
    const costPerformanceIndex = earnedValue > 0 ? earnedValue / actual : 1;
    
    // If CPI < 1, we're over budget
    // If CPI > 1, we're under budget
    const estimateAtCompletion = actual + ((budget - earnedValue) / costPerformanceIndex);
    
    return {
      valid: true,
      errors: [],
      metrics: {
        earned_value: earnedValue,
        cost_performance_index: costPerformanceIndex,
        estimate_at_completion: estimateAtCompletion,
        variance_at_completion: budget - estimateAtCompletion
      }
    };
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate invoice line items match SOV
 */
export function validateInvoiceAgainstSOV(invoiceLines, sovItems) {
  const errors = [];
  
  // Check each invoice line has corresponding SOV item
  for (const line of invoiceLines) {
    const sovItem = sovItems.find(s => s.id === line.sov_item_id);
    
    if (!sovItem) {
      errors.push(`Invoice line references non-existent SOV item ${line.sov_item_id}`);
      continue;
    }
    
    // Billed this month shouldn't exceed remaining balance
    const tolerance = 0.01;
    if (line.billed_this_month > sovItem.balance_to_finish + tolerance) {
      errors.push(`Invoice line ${sovItem.description} bills $${line.billed_this_month.toFixed(2)} but only $${sovItem.balance_to_finish.toFixed(2)} remains`);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Auto-correct financial calculations
 */
export function autoCorrectFinancials(financial) {
  const corrected = { ...financial };
  
  // Fix current budget
  corrected.current_budget = (financial.original_budget || 0) + (financial.approved_changes || 0);
  
  // Ensure forecast >= actual
  if (corrected.forecast_amount < corrected.actual_amount) {
    corrected.forecast_amount = corrected.actual_amount;
  }
  
  return corrected;
}

/**
 * Auto-correct SOV item
 */
export function autoCorrectSOVItem(item) {
  const corrected = { ...item };
  
  // Clamp percent complete
  corrected.percent_complete = Math.max(0, Math.min(100, item.percent_complete || 0));
  
  // Calculate current billing
  const previousBilling = item.previous_billing || 0;
  const thisPeriodBilling = item.this_period_billing || 0;
  corrected.current_billing = previousBilling + thisPeriodBilling;
  
  // Calculate balance
  corrected.balance_to_finish = (item.scheduled_value || 0) - corrected.current_billing;
  
  // Recalc percent based on billing if needed
  if (item.scheduled_value > 0) {
    corrected.percent_complete = (corrected.current_billing / item.scheduled_value) * 100;
  }
  
  return corrected;
}