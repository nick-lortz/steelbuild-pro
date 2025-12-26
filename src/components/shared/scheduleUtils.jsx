/**
 * Schedule calculation utilities for critical path, float, and dependencies
 */

/**
 * Calculate critical path using forward and backward pass - PROJECT SPECIFIC
 */
export function calculateCriticalPath(tasks) {
  if (!tasks.length) {
    return { criticalTasks: [], longestPath: 0, paths: [], byProject: {} };
  }

  // Group tasks by project_id
  const tasksByProject = {};
  tasks.forEach(task => {
    const projectId = task.project_id || 'unassigned';
    if (!tasksByProject[projectId]) {
      tasksByProject[projectId] = [];
    }
    tasksByProject[projectId].push(task);
  });

  // Calculate critical path for each project separately
  const projectResults = {};
  const allCriticalTasks = [];
  const allTaskData = {};

  Object.entries(tasksByProject).forEach(([projectId, projectTasks]) => {
    const result = calculateProjectCriticalPath(projectTasks);
    projectResults[projectId] = result;
    allCriticalTasks.push(...result.criticalTasks);
    Object.assign(allTaskData, result.taskData);
  });

  return {
    criticalTasks: allCriticalTasks,
    longestPath: Math.max(...Object.values(projectResults).map(r => r.longestPath), 0),
    taskData: allTaskData,
    byProject: projectResults,
  };
}

/**
 * Calculate critical path for a single project's tasks
 */
function calculateProjectCriticalPath(tasks) {
  if (!tasks.length) {
    return { criticalTasks: [], longestPath: 0, taskData: {} };
  }

  // Create task map
  const taskMap = new Map(tasks.map(t => [t.id, { ...t }]));
  
  // Forward pass - calculate Early Start (ES) and Early Finish (EF)
  const roots = tasks.filter(t => !t.predecessor_ids || t.predecessor_ids.length === 0);
  
  roots.forEach(task => {
    const t = taskMap.get(task.id);
    t.earlyStart = new Date(t.start_date);
    t.earlyFinish = addDays(t.earlyStart, t.duration_days || 0);
  });

  // Process tasks in topological order
  let changed = true;
  let iterations = 0;
  while (changed && iterations < 100) {
    changed = false;
    iterations++;
    
    tasks.forEach(task => {
      const t = taskMap.get(task.id);
      if (!t.predecessor_ids || t.predecessor_ids.length === 0) return;
      
      let maxEF = null;
      t.predecessor_ids.forEach(predId => {
        const pred = taskMap.get(predId);
        if (pred && pred.earlyFinish) {
          const predEF = new Date(pred.earlyFinish);
          if (!maxEF || predEF > maxEF) {
            maxEF = predEF;
          }
        }
      });
      
      if (maxEF) {
        const lagDays = t.lag_days || 0;
        const newES = addDays(maxEF, lagDays);
        if (!t.earlyStart || newES > t.earlyStart) {
          t.earlyStart = newES;
          t.earlyFinish = addDays(newES, t.duration_days || 0);
          changed = true;
        }
      }
    });
  }

  // Find project completion (max EF)
  let projectEnd = null;
  taskMap.forEach(t => {
    if (t.earlyFinish && (!projectEnd || t.earlyFinish > projectEnd)) {
      projectEnd = t.earlyFinish;
    }
  });

  // Backward pass - calculate Late Start (LS) and Late Finish (LF)
  taskMap.forEach(t => {
    t.lateFinish = projectEnd;
    t.lateStart = addDays(t.lateFinish, -(t.duration_days || 0));
  });

  changed = true;
  iterations = 0;
  while (changed && iterations < 100) {
    changed = false;
    iterations++;
    
    tasks.forEach(task => {
      const t = taskMap.get(task.id);
      
      // Find all successors (only within this project)
      const successors = tasks.filter(succ => 
        succ.predecessor_ids && succ.predecessor_ids.includes(task.id)
      );
      
      if (successors.length > 0) {
        let minLS = null;
        successors.forEach(succ => {
          const s = taskMap.get(succ.id);
          if (s && s.lateStart) {
            const lagDays = s.lag_days || 0;
            const succLS = addDays(s.lateStart, -lagDays);
            if (!minLS || succLS < minLS) {
              minLS = succLS;
            }
          }
        });
        
        if (minLS) {
          const newLF = minLS;
          if (!t.lateFinish || newLF < t.lateFinish) {
            t.lateFinish = newLF;
            t.lateStart = addDays(newLF, -(t.duration_days || 0));
            changed = true;
          }
        }
      }
    });
  }

  // Calculate float and identify critical tasks
  const criticalTasks = [];
  taskMap.forEach((t, id) => {
    if (t.earlyStart && t.lateStart) {
      const floatMs = t.lateStart - t.earlyStart;
      t.totalFloat = Math.max(0, Math.round(floatMs / (1000 * 60 * 60 * 24)));
      t.isCritical = t.totalFloat === 0;
      
      if (t.isCritical) {
        criticalTasks.push(id);
      }
    }
  });

  return {
    criticalTasks,
    longestPath: projectEnd && roots[0]?.earlyStart 
      ? Math.round((projectEnd - new Date(roots[0].start_date)) / (1000 * 60 * 60 * 24)) 
      : 0,
    taskData: Object.fromEntries(taskMap),
  };
}

/**
 * Detect resource conflicts (double-booking)
 */
export function detectResourceConflicts(tasks, resources) {
  const conflicts = [];
  const resourceMap = new Map();

  // Group tasks by resource
  tasks.forEach(task => {
    if (task.status === 'cancelled') return;
    
    (task.assigned_resources || []).forEach(resourceId => {
      if (!resourceMap.has(resourceId)) {
        resourceMap.set(resourceId, []);
      }
      resourceMap.get(resourceId).push(task);
    });
  });

  // Check for overlaps
  resourceMap.forEach((resourceTasks, resourceId) => {
    for (let i = 0; i < resourceTasks.length; i++) {
      for (let j = i + 1; j < resourceTasks.length; j++) {
        const t1 = resourceTasks[i];
        const t2 = resourceTasks[j];
        
        const t1Start = new Date(t1.start_date);
        const t1End = new Date(t1.end_date);
        const t2Start = new Date(t2.start_date);
        const t2End = new Date(t2.end_date);
        
        // Check for overlap
        if (t1Start <= t2End && t2Start <= t1End) {
          conflicts.push({
            resourceId,
            task1: t1,
            task2: t2,
            overlapStart: t1Start > t2Start ? t1Start : t2Start,
            overlapEnd: t1End < t2End ? t1End : t2End,
          });
        }
      }
    }
  });

  return conflicts;
}

/**
 * Auto-adjust dependent tasks when a task changes
 */
export function adjustDependentTasks(changedTask, allTasks) {
  const updates = [];
  const visited = new Set();
  
  function processSuccessors(taskId) {
    if (visited.has(taskId)) return;
    visited.add(taskId);
    
    const successors = allTasks.filter(t => 
      t.predecessor_ids && t.predecessor_ids.includes(taskId)
    );
    
    successors.forEach(succ => {
      const pred = allTasks.find(t => t.id === taskId);
      if (!pred) return;
      
      const predEnd = new Date(pred.end_date);
      const lagDays = succ.lag_days || 0;
      const newStart = addDays(predEnd, lagDays);
      const newEnd = addDays(newStart, succ.duration_days || 0);
      
      updates.push({
        id: succ.id,
        start_date: formatDate(newStart),
        end_date: formatDate(newEnd),
      });
      
      processSuccessors(succ.id);
    });
  }
  
  processSuccessors(changedTask.id);
  return updates;
}

/**
 * Check if schedule is compressed (tasks on critical path have minimal float)
 */
export function checkScheduleCompression(criticalPathData) {
  const { taskData } = criticalPathData;
  const compressionRisks = [];
  
  Object.entries(taskData).forEach(([id, task]) => {
    if (task.isCritical && task.duration_days && task.duration_days < 2) {
      compressionRisks.push({
        taskId: id,
        taskName: task.name,
        duration: task.duration_days,
        risk: 'Very short duration on critical path',
      });
    }
  });
  
  return compressionRisks;
}

// Helper functions
function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function formatDate(date) {
  return date.toISOString().split('T')[0];
}

/**
 * Calculate schedule variance baseline vs current
 */
export function calculateScheduleVariance(tasks) {
  const variances = tasks.map(task => {
    if (!task.baseline_start || !task.baseline_end) return null;
    
    const baselineStart = new Date(task.baseline_start);
    const currentStart = new Date(task.start_date);
    const baselineEnd = new Date(task.baseline_end);
    const currentEnd = new Date(task.end_date);
    
    const startVariance = Math.round((currentStart - baselineStart) / (1000 * 60 * 60 * 24));
    const endVariance = Math.round((currentEnd - baselineEnd) / (1000 * 60 * 60 * 24));
    
    return {
      taskId: task.id,
      taskName: task.name,
      startVariance,
      endVariance,
      totalVariance: endVariance,
    };
  }).filter(Boolean);
  
  return variances;
}