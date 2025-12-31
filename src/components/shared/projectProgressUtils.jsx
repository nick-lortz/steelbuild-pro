/**
 * Calculate project completion percentage based on tasks
 * Uses weighted average based on task estimated hours
 */
export function calculateProjectProgress(projectId, tasks) {
  const projectTasks = (tasks || []).filter(t => t && t.project_id === projectId && !t.parent_task_id);
  
  if (projectTasks.length === 0) return 0;
  
  // Calculate weighted average based on task hours
  const totalHours = projectTasks.reduce((sum, t) => sum + (Number(t.estimated_hours) || 1), 0);
  
  if (totalHours === 0) {
    // Fall back to simple average if no hours defined
    const totalProgress = projectTasks.reduce((sum, t) => sum + (Number(t.progress_percent) || 0), 0);
    return Math.round(totalProgress / projectTasks.length);
  }
  
  const weightedProgress = projectTasks.reduce((sum, t) => {
    const weight = (Number(t.estimated_hours) || 1) / totalHours;
    return sum + ((Number(t.progress_percent) || 0) * weight);
  }, 0);
  
  return Math.round(weightedProgress);
}

/**
 * Get dependency configuration for a task
 */
export function getTaskDependencies(task) {
  if (!task || !task.predecessor_ids || task.predecessor_ids.length === 0) return [];
  
  // Handle both old format (global dependency_type/lag_days) and new format (per-predecessor config)
  if (task.predecessor_configs && Array.isArray(task.predecessor_configs)) {
    return task.predecessor_configs.map(config => ({
      predecessor_id: config.predecessor_id,
      type: config.type || 'FS',
      lag_days: Number(config.lag_days) || 0
    }));
  }
  
  // Legacy: use global dependency type and lag
  return task.predecessor_ids.map(predId => ({
    predecessor_id: predId,
    type: task.dependency_type || 'FS',
    lag_days: Number(task.lag_days) || 0
  }));
}

/**
 * Adjust dependent task dates when predecessor changes
 */
export function adjustDependentTaskDates(task, allTasks) {
  const updates = [];
  
  if (!task || !task.start_date || !task.end_date) return updates;
  
  // Find all tasks that depend on this task
  const dependentTasks = (allTasks || []).filter(t => {
    if (!t || !t.predecessor_ids || !Array.isArray(t.predecessor_ids)) return false;
    return t.predecessor_ids.includes(task.id);
  });
  
  dependentTasks.forEach(depTask => {
    try {
      const dependencies = getTaskDependencies(depTask);
      const thisDepConfig = dependencies.find(d => d.predecessor_id === task.id);
      
      if (!thisDepConfig) return;
      
      const type = thisDepConfig.type || 'FS';
      const lag = Number(thisDepConfig.lag_days) || 0;
      const depDuration = Number(depTask.duration_days) || 0;
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
          newStartDate = new Date(task.end_date);
          newStartDate.setDate(newStartDate.getDate() - depDuration + lag);
          break;
        case 'SF': // Start-to-Finish
          newStartDate = new Date(task.start_date);
          newStartDate.setDate(newStartDate.getDate() + lag - depDuration);
          break;
        default:
          newStartDate = new Date(task.end_date);
          newStartDate.setDate(newStartDate.getDate() + 1);
      }
      
      if (isNaN(newStartDate.getTime())) return;
      
      const newEndDate = new Date(newStartDate);
      newEndDate.setDate(newEndDate.getDate() + depDuration);
      
      if (isNaN(newEndDate.getTime())) return;
      
      updates.push({
        id: depTask.id,
        data: {
          start_date: newStartDate.toISOString().split('T')[0],
          end_date: newEndDate.toISOString().split('T')[0],
        }
      });
    } catch (error) {
      console.error('Error adjusting dependent task:', error);
    }
  });
  
  return updates;
}