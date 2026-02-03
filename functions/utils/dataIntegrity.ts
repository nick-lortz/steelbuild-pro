/**
 * Data Integrity Checks and Repairs
 * 
 * Run these periodically to ensure database consistency
 */

/**
 * Check for orphaned records (references to non-existent parents)
 */
export async function findOrphanedRecords(base44) {
  const issues = [];
  
  // 1. Tasks without valid project
  const tasks = await base44.entities.Task.list();
  const projects = await base44.entities.Project.list();
  const projectIds = new Set(projects.map(p => p.id));
  
  const orphanedTasks = tasks.filter(t => !projectIds.has(t.project_id));
  if (orphanedTasks.length > 0) {
    issues.push({
      type: 'orphaned_tasks',
      count: orphanedTasks.length,
      ids: orphanedTasks.map(t => t.id)
    });
  }
  
  // 2. RFIs without valid project
  const rfis = await base44.entities.RFI.list();
  const orphanedRFIs = rfis.filter(r => !projectIds.has(r.project_id));
  if (orphanedRFIs.length > 0) {
    issues.push({
      type: 'orphaned_rfis',
      count: orphanedRFIs.length,
      ids: orphanedRFIs.map(r => r.id)
    });
  }
  
  // 3. Tasks with invalid work package references
  const workPackages = await base44.entities.WorkPackage.list();
  const wpIds = new Set(workPackages.map(wp => wp.id));
  
  const tasksWithInvalidWP = tasks.filter(t => 
    t.work_package_id && !wpIds.has(t.work_package_id)
  );
  if (tasksWithInvalidWP.length > 0) {
    issues.push({
      type: 'tasks_invalid_work_package',
      count: tasksWithInvalidWP.length,
      ids: tasksWithInvalidWP.map(t => t.id)
    });
  }
  
  // 4. Tasks with circular dependencies
  const circularDeps = findCircularDependencies(tasks);
  if (circularDeps.length > 0) {
    issues.push({
      type: 'circular_dependencies',
      count: circularDeps.length,
      cycles: circularDeps
    });
  }
  
  // 5. Drawing sheets without valid drawing set
  const sheets = await base44.entities.DrawingSheet.list();
  const drawingSets = await base44.entities.DrawingSet.list();
  const setIds = new Set(drawingSets.map(ds => ds.id));
  
  const orphanedSheets = sheets.filter(s => !setIds.has(s.drawing_set_id));
  if (orphanedSheets.length > 0) {
    issues.push({
      type: 'orphaned_drawing_sheets',
      count: orphanedSheets.length,
      ids: orphanedSheets.map(s => s.id)
    });
  }
  
  return issues;
}

/**
 * Find circular task dependencies
 */
function findCircularDependencies(tasks) {
  const cycles = [];
  const visited = new Set();
  const recursionStack = new Set();
  
  function hasCycle(taskId, path = []) {
    if (recursionStack.has(taskId)) {
      cycles.push([...path, taskId]);
      return true;
    }
    
    if (visited.has(taskId)) return false;
    
    visited.add(taskId);
    recursionStack.add(taskId);
    
    const task = tasks.find(t => t.id === taskId);
    if (task?.predecessor_ids) {
      for (const predId of task.predecessor_ids) {
        if (hasCycle(predId, [...path, taskId])) {
          return true;
        }
      }
    }
    
    recursionStack.delete(taskId);
    return false;
  }
  
  for (const task of tasks) {
    if (!visited.has(task.id)) {
      hasCycle(task.id);
    }
  }
  
  return cycles;
}

/**
 * Check for date ordering violations
 */
export async function findDateOrderingViolations(base44) {
  const violations = [];
  
  // 1. Projects: start_date > target_completion
  const projects = await base44.entities.Project.list();
  for (const p of projects) {
    if (p.start_date && p.target_completion) {
      if (new Date(p.start_date) > new Date(p.target_completion)) {
        violations.push({
          type: 'project_date_order',
          entity_id: p.id,
          entity_name: p.name,
          issue: 'start_date after target_completion'
        });
      }
    }
  }
  
  // 2. Tasks: start_date > end_date
  const tasks = await base44.entities.Task.list();
  for (const t of tasks) {
    if (t.start_date && t.end_date) {
      if (new Date(t.start_date) > new Date(t.end_date)) {
        violations.push({
          type: 'task_date_order',
          entity_id: t.id,
          entity_name: t.name,
          issue: 'start_date after end_date'
        });
      }
    }
  }
  
  // 3. RFIs: submitted_date > response_date > closed_date
  const rfis = await base44.entities.RFI.list();
  for (const r of rfis) {
    if (r.submitted_date && r.response_date) {
      if (new Date(r.submitted_date) > new Date(r.response_date)) {
        violations.push({
          type: 'rfi_date_order',
          entity_id: r.id,
          entity_name: `RFI #${r.rfi_number}`,
          issue: 'submitted_date after response_date'
        });
      }
    }
    if (r.response_date && r.closed_date) {
      if (new Date(r.response_date) > new Date(r.closed_date)) {
        violations.push({
          type: 'rfi_date_order',
          entity_id: r.id,
          entity_name: `RFI #${r.rfi_number}`,
          issue: 'response_date after closed_date'
        });
      }
    }
  }
  
  return violations;
}

/**
 * Check for numeric range violations
 */
export async function findNumericViolations(base44) {
  const violations = [];
  
  // 1. Projects: negative budgets
  const projects = await base44.entities.Project.list();
  for (const p of projects) {
    if (p.contract_value !== undefined && p.contract_value < 0) {
      violations.push({
        type: 'negative_value',
        entity: 'Project',
        entity_id: p.id,
        field: 'contract_value',
        value: p.contract_value
      });
    }
  }
  
  // 2. Tasks: invalid progress percentage
  const tasks = await base44.entities.Task.list();
  for (const t of tasks) {
    if (t.progress_percent !== undefined) {
      if (t.progress_percent < 0 || t.progress_percent > 100) {
        violations.push({
          type: 'invalid_percentage',
          entity: 'Task',
          entity_id: t.id,
          field: 'progress_percent',
          value: t.progress_percent
        });
      }
    }
  }
  
  // 3. Financials: negative amounts
  const financials = await base44.entities.Financial.list();
  for (const f of financials) {
    const fields = ['original_budget', 'current_budget', 'committed_amount', 'actual_amount'];
    for (const field of fields) {
      if (f[field] !== undefined && f[field] < 0) {
        violations.push({
          type: 'negative_value',
          entity: 'Financial',
          entity_id: f.id,
          field,
          value: f[field]
        });
      }
    }
  }
  
  return violations;
}

/**
 * Run full integrity check
 */
export async function runIntegrityCheck(base44) {
  const results = {
    timestamp: new Date().toISOString(),
    orphaned_records: await findOrphanedRecords(base44),
    date_violations: await findDateOrderingViolations(base44),
    numeric_violations: await findNumericViolations(base44)
  };
  
  results.total_issues = 
    results.orphaned_records.length +
    results.date_violations.length +
    results.numeric_violations.length;
  
  return results;
}