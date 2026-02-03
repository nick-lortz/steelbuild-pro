/**
 * Schedule & Dependency Validation
 * 
 * Validates task dependencies, detects circular dependencies, auto-adjusts dates
 */

import { addDays, parseISO, differenceInDays, isBefore, isAfter } from 'npm:date-fns@3.6.0';

/**
 * Detect circular dependencies in task graph
 */
export function detectCircularDependencies(tasks) {
  const errors = [];
  const visited = new Set();
  const recursionStack = new Set();
  
  function dfs(taskId, path = []) {
    if (recursionStack.has(taskId)) {
      // Found a cycle
      const cycle = [...path, taskId];
      const cycleStart = cycle.indexOf(taskId);
      const cyclePath = cycle.slice(cycleStart).map(id => {
        const task = tasks.find(t => t.id === id);
        return task?.name || id;
      }).join(' → ');
      
      errors.push({
        type: 'circular_dependency',
        message: `Circular dependency detected: ${cyclePath}`,
        taskIds: cycle.slice(cycleStart)
      });
      return true;
    }
    
    if (visited.has(taskId)) {
      return false;
    }
    
    visited.add(taskId);
    recursionStack.add(taskId);
    path.push(taskId);
    
    const task = tasks.find(t => t.id === taskId);
    if (task && task.predecessor_ids) {
      for (const predId of task.predecessor_ids) {
        if (dfs(predId, [...path])) {
          return true;
        }
      }
    }
    
    recursionStack.delete(taskId);
    return false;
  }
  
  // Check each task
  for (const task of tasks) {
    if (!visited.has(task.id)) {
      dfs(task.id);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate task date ordering
 */
export function validateTaskDates(task) {
  const errors = [];
  
  if (!task.start_date || !task.end_date) {
    errors.push('Task must have start and end dates');
    return { valid: false, errors };
  }
  
  const start = parseISO(task.start_date);
  const end = parseISO(task.end_date);
  
  if (isAfter(start, end)) {
    errors.push(`Start date (${task.start_date}) cannot be after end date (${task.end_date})`);
  }
  
  // Validate baseline dates if present
  if (task.baseline_start && task.baseline_end) {
    const baselineStart = parseISO(task.baseline_start);
    const baselineEnd = parseISO(task.baseline_end);
    
    if (isAfter(baselineStart, baselineEnd)) {
      errors.push('Baseline start cannot be after baseline end');
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Calculate task duration in working days
 */
export function calculateDuration(startDate, endDate, workingDaysPerWeek = 5) {
  const start = typeof startDate === 'string' ? parseISO(startDate) : startDate;
  const end = typeof endDate === 'string' ? parseISO(endDate) : endDate;
  
  let totalDays = differenceInDays(end, start) + 1; // Include both start and end
  
  // Approximate working days (excludes weekends)
  const weeks = Math.floor(totalDays / 7);
  const remainingDays = totalDays % 7;
  
  let workingDays = weeks * workingDaysPerWeek;
  
  // Add remaining days (rough approximation)
  workingDays += Math.min(remainingDays, workingDaysPerWeek);
  
  return Math.max(1, workingDays);
}

/**
 * Auto-adjust task dates based on dependencies
 * 
 * Implements forward pass scheduling
 */
export function autoAdjustDatesForward(tasks) {
  const adjustedTasks = [];
  const taskMap = new Map(tasks.map(t => [t.id, { ...t }]));
  
  // Topological sort to process in dependency order
  const sorted = topologicalSort(tasks);
  
  for (const taskId of sorted) {
    const task = taskMap.get(taskId);
    if (!task) continue;
    
    // Get predecessor configurations
    const predConfigs = task.predecessor_configs || [];
    
    if (predConfigs.length === 0 && task.predecessor_ids?.length > 0) {
      // Legacy: convert to configs (default FS with 0 lag)
      task.predecessor_configs = task.predecessor_ids.map(id => ({
        predecessor_id: id,
        type: 'FS',
        lag_days: 0
      }));
    }
    
    let earliestStart = task.start_date ? parseISO(task.start_date) : new Date();
    
    // Calculate earliest start based on predecessors
    for (const config of (task.predecessor_configs || [])) {
      const pred = taskMap.get(config.predecessor_id);
      if (!pred) continue;
      
      const predStart = parseISO(pred.start_date);
      const predEnd = parseISO(pred.end_date);
      const lag = config.lag_days || 0;
      
      let constraintDate;
      
      switch (config.type) {
        case 'FS': // Finish-to-Start (default)
          constraintDate = addDays(predEnd, lag);
          break;
        case 'SS': // Start-to-Start
          constraintDate = addDays(predStart, lag);
          break;
        case 'FF': // Finish-to-Finish
          // Work backwards from pred finish
          const duration = task.duration_days || 1;
          constraintDate = addDays(predEnd, lag - duration);
          break;
        case 'SF': // Start-to-Finish (rare)
          constraintDate = addDays(predStart, lag - (task.duration_days || 1));
          break;
        default:
          constraintDate = addDays(predEnd, lag);
      }
      
      if (isAfter(constraintDate, earliestStart)) {
        earliestStart = constraintDate;
      }
    }
    
    // Update task dates
    task.start_date = earliestStart.toISOString().split('T')[0];
    
    if (task.duration_days) {
      const newEnd = addDays(earliestStart, task.duration_days - 1);
      task.end_date = newEnd.toISOString().split('T')[0];
    } else {
      // Calculate from existing end date
      const existingEnd = parseISO(task.end_date);
      const duration = differenceInDays(existingEnd, parseISO(task.start_date)) + 1;
      const newEnd = addDays(earliestStart, Math.max(1, duration) - 1);
      task.end_date = newEnd.toISOString().split('T')[0];
      task.duration_days = Math.max(1, duration);
    }
    
    adjustedTasks.push(task);
  }
  
  return adjustedTasks;
}

/**
 * Calculate backward pass (latest start/finish times)
 */
export function calculateBackwardPass(tasks, projectEndDate) {
  const taskMap = new Map(tasks.map(t => [t.id, { ...t }]));
  const sorted = topologicalSort(tasks).reverse(); // Process in reverse order
  
  const projectEnd = projectEndDate ? parseISO(projectEndDate) : 
    new Date(Math.max(...tasks.map(t => parseISO(t.end_date).getTime())));
  
  for (const taskId of sorted) {
    const task = taskMap.get(taskId);
    if (!task) continue;
    
    // Find successors
    const successors = tasks.filter(t => 
      t.predecessor_ids?.includes(taskId) || 
      t.predecessor_configs?.some(c => c.predecessor_id === taskId)
    );
    
    let latestFinish = projectEnd;
    
    if (successors.length > 0) {
      // Latest finish is minimum of all successor constraints
      for (const successor of successors) {
        const succStart = parseISO(successor.start_date);
        const config = successor.predecessor_configs?.find(c => c.predecessor_id === taskId) || 
          { type: 'FS', lag_days: 0 };
        
        let constraintDate;
        
        switch (config.type) {
          case 'FS':
            constraintDate = addDays(succStart, -(config.lag_days || 0));
            break;
          case 'SS':
            constraintDate = addDays(succStart, task.duration_days - (config.lag_days || 0));
            break;
          default:
            constraintDate = addDays(succStart, -(config.lag_days || 0));
        }
        
        if (isBefore(constraintDate, latestFinish)) {
          latestFinish = constraintDate;
        }
      }
    }
    
    const latestStart = addDays(latestFinish, -(task.duration_days || 1) + 1);
    
    task.latest_start = latestStart.toISOString().split('T')[0];
    task.latest_finish = latestFinish.toISOString().split('T')[0];
    
    // Calculate float (slack)
    const earlyStart = parseISO(task.start_date);
    const floatDays = differenceInDays(latestStart, earlyStart);
    task.float_days = Math.max(0, floatDays);
    task.is_critical = floatDays <= 0;
  }
  
  return Array.from(taskMap.values());
}

/**
 * Topological sort for task dependency graph
 */
function topologicalSort(tasks) {
  const result = [];
  const visited = new Set();
  const taskMap = new Map(tasks.map(t => [t.id, t]));
  
  function visit(taskId) {
    if (visited.has(taskId)) return;
    visited.add(taskId);
    
    const task = taskMap.get(taskId);
    if (task && task.predecessor_ids) {
      for (const predId of task.predecessor_ids) {
        visit(predId);
      }
    }
    
    result.push(taskId);
  }
  
  for (const task of tasks) {
    visit(task.id);
  }
  
  return result;
}

/**
 * Validate task dependencies
 */
export function validateDependencies(task, allTasks) {
  const errors = [];
  
  if (!task.predecessor_ids || task.predecessor_ids.length === 0) {
    return { valid: true, errors: [] };
  }
  
  for (const predId of task.predecessor_ids) {
    const pred = allTasks.find(t => t.id === predId);
    
    if (!pred) {
      errors.push(`Predecessor task ${predId} not found`);
      continue;
    }
    
    // Check same project
    if (pred.project_id !== task.project_id) {
      errors.push(`Predecessor ${pred.name} is from a different project`);
    }
    
    // Check date logic (predecessor should finish before successor starts for FS)
    if (pred.end_date && task.start_date) {
      const predEnd = parseISO(pred.end_date);
      const taskStart = parseISO(task.start_date);
      
      if (isAfter(predEnd, taskStart)) {
        errors.push(`Predecessor "${pred.name}" finishes (${pred.end_date}) after this task starts (${task.start_date})`);
      }
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Get critical path tasks
 */
export function getCriticalPath(tasks) {
  const tasksWithFloat = calculateBackwardPass(tasks);
  return tasksWithFloat.filter(t => t.is_critical);
}