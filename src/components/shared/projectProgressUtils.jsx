/**
 * Calculate project completion percentage based on tasks
 * Uses weighted average based on task estimated hours
 */
export function calculateProjectProgress(projectId, tasks) {
  const projectTasks = tasks.filter(t => t.project_id === projectId && !t.parent_task_id);
  
  if (projectTasks.length === 0) return 0;
  
  // Calculate weighted average based on task hours
  const totalHours = projectTasks.reduce((sum, t) => sum + (t.estimated_hours || 1), 0);
  
  if (totalHours === 0) {
    // Fall back to simple average if no hours defined
    const totalProgress = projectTasks.reduce((sum, t) => sum + (t.progress_percent || 0), 0);
    return Math.round(totalProgress / projectTasks.length);
  }
  
  const weightedProgress = projectTasks.reduce((sum, t) => {
    const weight = (t.estimated_hours || 1) / totalHours;
    return sum + ((t.progress_percent || 0) * weight);
  }, 0);
  
  return Math.round(weightedProgress);
}

/**
 * Get dependency configuration for a task
 */
export function getTaskDependencies(task) {
  if (!task.predecessor_ids || task.predecessor_ids.length === 0) return [];
  
  // Handle both old format (global dependency_type/lag_days) and new format (per-predecessor config)
  if (task.predecessor_configs && Array.isArray(task.predecessor_configs)) {
    return task.predecessor_configs;
  }
  
  // Legacy: use global dependency type and lag
  return task.predecessor_ids.map(predId => ({
    predecessor_id: predId,
    type: task.dependency_type || 'FS',
    lag_days: task.lag_days || 0
  }));
}

/**
 * Adjust dependent task dates when predecessor changes
 */
export function adjustDependentTaskDates(task, allTasks) {
  const updates = [];
  
  // Find all tasks that depend on this task
  const dependentTasks = allTasks.filter(t => {
    if (!t.predecessor_ids) return false;
    return t.predecessor_ids.includes(task.id);
  });
  
  dependentTasks.forEach(depTask => {
    const dependencies = getTaskDependencies(depTask);
    const thisDepConfig = dependencies.find(d => d.predecessor_id === task.id);
    
    if (!thisDepConfig) return;
    
    const type = thisDepConfig.type || 'FS';
    const lag = thisDepConfig.lag_days || 0;
    let newStartDate;
    
    switch(type) {
      case 'FS': // Finish-to-Start
        newStartDate = new Date(task.end_date);
        newStartDate.setDate(newStartDate.getDate() + lag + 1);
        break;
      case 'SS': // Start-to-Start
        newStartDate = new Date(task.start_date);
        newStartDate.setDate(newStartDate.getDate() + lag);
        break;
      case 'FF': // Finish-to-Finish
        const depDuration = depTask.duration_days || 0;
        newStartDate = new Date(task.end_date);
        newStartDate.setDate(newStartDate.getDate() - depDuration + lag);
        break;
      case 'SF': // Start-to-Finish
        newStartDate = new Date(task.start_date);
        newStartDate.setDate(newStartDate.getDate() + lag - (depTask.duration_days || 0));
        break;
      default:
        newStartDate = new Date(task.end_date);
        newStartDate.setDate(newStartDate.getDate() + 1);
    }
    
    const newEndDate = new Date(newStartDate);
    newEndDate.setDate(newEndDate.getDate() + (depTask.duration_days || 0));
    
    updates.push({
      id: depTask.id,
      data: {
        start_date: newStartDate.toISOString().split('T')[0],
        end_date: newEndDate.toISOString().split('T')[0],
      }
    });
  });
  
  return updates;
}