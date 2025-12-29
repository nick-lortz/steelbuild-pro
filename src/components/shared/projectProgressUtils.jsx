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
 * Adjust dependent task dates when predecessor changes
 */
export function adjustDependentTaskDates(task, allTasks, dependencyType = 'FS', lagDays = 0) {
  const updates = [];
  
  // Find all tasks that depend on this task
  const dependentTasks = allTasks.filter(t => 
    t.predecessor_ids && t.predecessor_ids.includes(task.id)
  );
  
  dependentTasks.forEach(depTask => {
    const type = depTask.dependency_type || 'FS';
    const lag = depTask.lag_days || 0;
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