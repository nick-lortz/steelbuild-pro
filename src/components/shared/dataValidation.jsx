/**
 * Data validation and integrity utilities for SteelBuild Pro
 * Ensures reliable, deterministic calculations and data consistency
 */

/**
 * Validates that all required references exist and are valid
 */
export function validateFinancialRecord(financial, costCodes, projects) {
  const errors = [];
  
  // Check project exists
  if (!financial.project_id) {
    errors.push('Missing project_id');
  } else if (!projects.find(p => p.id === financial.project_id)) {
    errors.push(`Invalid project_id: ${financial.project_id}`);
  }
  
  // Check cost code exists
  if (!financial.cost_code_id) {
    errors.push('Missing cost_code_id');
  } else if (!costCodes.find(c => c.id === financial.cost_code_id)) {
    errors.push(`Invalid cost_code_id: ${financial.cost_code_id}`);
  }
  
  // Validate amounts are numbers
  const numericFields = ['budget_amount', 'committed_amount', 'actual_amount', 'forecast_amount'];
  numericFields.forEach(field => {
    if (financial[field] !== undefined && typeof financial[field] !== 'number') {
      errors.push(`${field} must be a number`);
    }
  });
  
  return errors;
}

/**
 * Calculates deterministic financial totals by project and cost code
 * Same inputs always produce same outputs
 */
export function calculateFinancialTotals(financials, projectId = null, costCodeId = null) {
  const filtered = financials.filter(f => {
    const matchesProject = !projectId || f.project_id === projectId;
    const matchesCostCode = !costCodeId || f.cost_code_id === costCodeId;
    return matchesProject && matchesCostCode;
  });
  
  return filtered.reduce((acc, f) => ({
    budget: acc.budget + (Number(f.budget_amount) || 0),
    committed: acc.committed + (Number(f.committed_amount) || 0),
    actual: acc.actual + (Number(f.actual_amount) || 0),
    forecast: acc.forecast + (Number(f.forecast_amount) || 0),
    count: acc.count + 1
  }), { budget: 0, committed: 0, actual: 0, forecast: 0, count: 0 });
}

/**
 * Calculates variance and performance metrics
 */
export function calculateVariance(budget, actual) {
  const variance = (Number(budget) || 0) - (Number(actual) || 0);
  const variancePercent = budget > 0 ? (variance / budget * 100) : 0;
  const performanceIndex = actual > 0 ? (budget / actual) : 1;
  
  return {
    variance,
    variancePercent,
    performanceIndex,
    status: variancePercent >= -10 ? 'on_track' : variancePercent >= -20 ? 'at_risk' : 'over_budget'
  };
}

/**
 * Validates cost code references across all entities
 */
export function validateCostCodeUsage(costCodeId, financials, expenses, laborHours) {
  const inFinancials = financials.filter(f => f.cost_code_id === costCodeId).length;
  const inExpenses = expenses.filter(e => e.cost_code_id === costCodeId).length;
  const inLaborHours = laborHours.filter(l => l.cost_code_id === costCodeId).length;
  return {
    inFinancials,
    inExpenses,
    inLaborHours,
    total: inFinancials + inExpenses + inLaborHours
  };
}

/**
 * Ensures all cost code linkages are valid
 */
export function checkCostCodeIntegrity(entities, costCodes) {
  const costCodeIds = new Set(costCodes.map(c => c.id));
  const issues = [];
  
  // Check financials
  entities.financials?.forEach(f => {
    if (f.cost_code_id && !costCodeIds.has(f.cost_code_id)) {
      issues.push({
        type: 'financial',
        id: f.id,
        issue: 'References non-existent cost code',
        costCodeId: f.cost_code_id
      });
    }
  });
  
  // Check expenses
  entities.expenses?.forEach(e => {
    if (e.cost_code_id && !costCodeIds.has(e.cost_code_id)) {
      issues.push({
        type: 'expense',
        id: e.id,
        issue: 'References non-existent cost code',
        costCodeId: e.cost_code_id
      });
    }
  });
  
  // Check labor hours
  entities.laborHours?.forEach(l => {
    if (l.cost_code_id && !costCodeIds.has(l.cost_code_id)) {
      issues.push({
        type: 'labor',
        id: l.id,
        issue: 'References non-existent cost code',
        costCodeId: l.cost_code_id
      });
    }
  });
  
  return issues;
}

/**
 * Rolls up costs by category from cost codes
 */
export function rollupByCategory(financials, costCodes) {
  const byCategory = {};
  
  financials.forEach(f => {
    const costCode = costCodes.find(c => c.id === f.cost_code_id);
    const category = costCode?.category || 'other';
    
    if (!byCategory[category]) {
      byCategory[category] = {
        budget: 0,
        committed: 0,
        actual: 0,
        forecast: 0,
        count: 0
      };
    }
    
    byCategory[category].budget += Number(f.budget_amount) || 0;
    byCategory[category].committed += Number(f.committed_amount) || 0;
    byCategory[category].actual += Number(f.actual_amount) || 0;
    byCategory[category].forecast += Number(f.forecast_amount) || 0;
    byCategory[category].count += 1;
  });
  
  return byCategory;
}

/**
 * Validates resource allocation doesn't exceed 100% for overlapping periods
 */
export function validateResourceAllocation(allocations, resourceId) {
  const resourceAllocations = allocations
    .filter(a => a.resource_id === resourceId)
    .sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
  
  const conflicts = [];
  
  for (let i = 0; i < resourceAllocations.length; i++) {
    for (let j = i + 1; j < resourceAllocations.length; j++) {
      const a = resourceAllocations[i];
      const b = resourceAllocations[j];
      
      const aStart = new Date(a.start_date);
      const aEnd = new Date(a.end_date);
      const bStart = new Date(b.start_date);
      const bEnd = new Date(b.end_date);
      
      // Check for overlap
      if (aStart <= bEnd && bStart <= aEnd) {
        const totalAllocation = (a.allocation_percentage || 0) + (b.allocation_percentage || 0);
        if (totalAllocation > 100) {
          conflicts.push({
            allocation1: a,
            allocation2: b,
            totalPercentage: totalAllocation,
            overAllocation: totalAllocation - 100
          });
        }
      }
    }
  }
  
  return conflicts;
}

/**
 * Ensures change order cost impacts are properly reflected in project financials
 */
export function validateChangeOrderImpact(changeOrders, financials, projectId) {
  const projectCOs = changeOrders.filter(co => 
    co.project_id === projectId && 
    co.status === 'approved'
  );
  
  const totalCOImpact = projectCOs.reduce((sum, co) => sum + (Number(co.cost_impact) || 0), 0);
  const projectFinancials = financials.filter(f => f.project_id === projectId);
  const totalBudget = projectFinancials.reduce((sum, f) => sum + (Number(f.budget_amount) || 0), 0);
  
  return {
    changeOrderTotal: totalCOImpact,
    originalBudget: totalBudget,
    revisedBudget: totalBudget + totalCOImpact,
    changeOrderCount: projectCOs.length
  };
}

/**
 * Validates that expense records properly link to projects and cost codes
 */
export function validateExpenseLinks(expense, projects, costCodes) {
  const errors = [];
  
  if (!expense.project_id) {
    errors.push('Missing project_id');
  } else if (!projects.find(p => p.id === expense.project_id)) {
    errors.push(`Invalid project_id: ${expense.project_id}`);
  }
  
  if (expense.cost_code_id && !costCodes.find(c => c.id === expense.cost_code_id)) {
    errors.push(`Invalid cost_code_id: ${expense.cost_code_id}`);
  }
  
  if (!expense.amount || typeof expense.amount !== 'number' || expense.amount < 0) {
    errors.push('Invalid amount');
  }
  
  return errors;
}
