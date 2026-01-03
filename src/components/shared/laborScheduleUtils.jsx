/**
 * Validate labor breakdown vs schedule allocation
 * Returns mismatches and warnings
 */
export function validateLaborScheduleAlignment(breakdowns, tasks, categories) {
  const mismatches = [];
  
  for (const breakdown of breakdowns) {
    const category = categories.find(c => c.id === breakdown.labor_category_id);
    const categoryName = category?.name || 'Unknown';
    
    // Sum up planned hours from tasks
    const categoryTasks = tasks.filter(t => t.labor_category_id === breakdown.labor_category_id);
    
    const scheduledShop = categoryTasks.reduce((sum, t) => sum + (Number(t.planned_shop_hours) || 0), 0);
    const scheduledField = categoryTasks.reduce((sum, t) => sum + (Number(t.planned_field_hours) || 0), 0);
    
    const breakdownShop = Number(breakdown.shop_hours) || 0;
    const breakdownField = Number(breakdown.field_hours) || 0;
    
    const shopVariance = scheduledShop - breakdownShop;
    const fieldVariance = scheduledField - breakdownField;
    
    if (shopVariance !== 0 || fieldVariance !== 0) {
      mismatches.push({
        category_id: breakdown.labor_category_id,
        category_name: categoryName,
        breakdown_shop: breakdownShop,
        breakdown_field: breakdownField,
        scheduled_shop: scheduledShop,
        scheduled_field: scheduledField,
        shop_variance: shopVariance,
        field_variance: fieldVariance,
        total_variance: shopVariance + fieldVariance
      });
    }
  }
  
  return mismatches;
}

/**
 * Calculate project-wide labor totals
 */
export function calculateProjectLaborTotals(breakdowns, tasks) {
  const breakdownShop = breakdowns.reduce((sum, b) => sum + (Number(b.shop_hours) || 0), 0);
  const breakdownField = breakdowns.reduce((sum, b) => sum + (Number(b.field_hours) || 0), 0);
  
  const scheduledShop = tasks.reduce((sum, t) => sum + (Number(t.planned_shop_hours) || 0), 0);
  const scheduledField = tasks.reduce((sum, t) => sum + (Number(t.planned_field_hours) || 0), 0);
  
  return {
    breakdown_shop: breakdownShop,
    breakdown_field: breakdownField,
    scheduled_shop: scheduledShop,
    scheduled_field: scheduledField,
    shop_variance: scheduledShop - breakdownShop,
    field_variance: scheduledField - breakdownField,
    has_mismatch: (scheduledShop !== breakdownShop) || (scheduledField !== breakdownField)
  };
}

/**
 * Identify tasks with labor allocation that exceed category budget
 */
export function findOverallocatedTasks(tasks, breakdowns, categories) {
  const overallocated = [];
  
  for (const breakdown of breakdowns) {
    const categoryTasks = tasks.filter(t => t.labor_category_id === breakdown.labor_category_id);
    
    const totalScheduled = categoryTasks.reduce((sum, t) => 
      sum + (Number(t.planned_shop_hours) || 0) + (Number(t.planned_field_hours) || 0), 0
    );
    
    const totalBudget = (Number(breakdown.shop_hours) || 0) + (Number(breakdown.field_hours) || 0);
    
    if (totalScheduled > totalBudget) {
      const category = categories.find(c => c.id === breakdown.labor_category_id);
      categoryTasks.forEach(task => {
        overallocated.push({
          task_id: task.id,
          task_name: task.name,
          category_name: category?.name || 'Unknown',
          overallocation: totalScheduled - totalBudget
        });
      });
    }
  }
  
  return overallocated;
}

/**
 * Link scope gaps to schedule risk
 */
export function identifyScopeRiskTasks(tasks, breakdowns, scopeGaps, categories) {
  const risks = [];
  
  for (const breakdown of breakdowns) {
    const categoryTasks = tasks.filter(t => t.labor_category_id === breakdown.labor_category_id);
    
    const totalScheduled = categoryTasks.reduce((sum, t) => 
      sum + (Number(t.planned_shop_hours) || 0) + (Number(t.planned_field_hours) || 0), 0
    );
    
    const totalBudget = (Number(breakdown.shop_hours) || 0) + (Number(breakdown.field_hours) || 0);
    
    // If scheduled exceeds budget, check for related scope gaps
    if (totalScheduled > totalBudget) {
      const category = categories.find(c => c.id === breakdown.labor_category_id);
      const categoryName = category?.name || '';
      
      // Look for open scope gaps that mention this category
      const relatedGaps = scopeGaps.filter(gap => 
        gap.status === 'open' && 
        (gap.location_description?.toLowerCase().includes(categoryName.toLowerCase()) ||
         gap.explanation?.toLowerCase().includes(categoryName.toLowerCase()))
      );
      
      if (relatedGaps.length > 0) {
        const totalGapCost = relatedGaps.reduce((sum, g) => sum + (Number(g.rough_cost) || 0), 0);
        
        risks.push({
          category_id: breakdown.labor_category_id,
          category_name: categoryName,
          overallocation_hours: totalScheduled - totalBudget,
          related_gaps: relatedGaps.length,
          potential_cost_exposure: totalGapCost,
          gap_ids: relatedGaps.map(g => g.id)
        });
      }
    }
  }
  
  return risks;
}