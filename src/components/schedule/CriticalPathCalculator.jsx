/**
 * Critical Path Calculator
 * Determines which tasks are on the critical path using forward/backward pass
 */

export function calculateCriticalPath(tasks) {
  if (!tasks || tasks.length === 0) return [];

  // Build task dependency map
  const taskMap = new Map(tasks.map(t => [t.id, t]));
  const successorMap = new Map();
  const predecessorMap = new Map();

  // Initialize maps
  tasks.forEach(task => {
    successorMap.set(task.id, []);
    predecessorMap.set(task.id, task.predecessor_ids || []);
  });

  // Build successor relationships
  tasks.forEach(task => {
    (task.predecessor_ids || []).forEach(predId => {
      const successors = successorMap.get(predId) || [];
      successors.push(task.id);
      successorMap.set(predId, successors);
    });
  });

  // Forward pass - calculate earliest start/finish
  const earliest = new Map();
  const visited = new Set();

  function forwardPass(taskId, depth = 0) {
    if (visited.has(taskId)) return earliest.get(taskId)?.finish || 0;

    const task = taskMap.get(taskId);
    if (!task) return 0;

    const predecessors = predecessorMap.get(taskId) || [];
    
    let maxPredFinish = 0;
    predecessors.forEach(predId => {
      const predEarliest = forwardPass(predId, depth + 1);
      maxPredFinish = Math.max(maxPredFinish, predEarliest);
    });

    const duration = calculateDuration(task);
    const start = maxPredFinish;
    const finish = start + duration;

    earliest.set(taskId, { start, finish });
    visited.add(taskId);

    return finish;
  }

  // Run forward pass on all tasks
  tasks.forEach(task => forwardPass(task.id));

  // Find project end date
  const projectEnd = Math.max(...Array.from(earliest.values()).map(e => e.finish || 0));

  // Backward pass - calculate latest start/finish
  const latest = new Map();
  const visitedBack = new Set();

  function backwardPass(taskId) {
    if (visitedBack.has(taskId)) return latest.get(taskId)?.start || projectEnd;

    const task = taskMap.get(taskId);
    if (!task) return projectEnd;

    const successors = successorMap.get(taskId) || [];
    
    let minSuccStart = projectEnd;
    if (successors.length === 0) {
      minSuccStart = projectEnd;
    } else {
      successors.forEach(succId => {
        const succLatest = backwardPass(succId);
        minSuccStart = Math.min(minSuccStart, succLatest);
      });
    }

    const duration = calculateDuration(task);
    const finish = minSuccStart;
    const start = finish - duration;

    latest.set(taskId, { start, finish });
    visitedBack.add(taskId);

    return start;
  }

  // Run backward pass
  tasks.forEach(task => backwardPass(task.id));

  // Identify critical tasks (no float/slack)
  const criticalTasks = [];
  tasks.forEach(task => {
    const e = earliest.get(task.id);
    const l = latest.get(task.id);

    if (e && l) {
      const slack = l.start - e.start;
      // Float should be 0 or very close (within 1 day for rounding)
      if (slack <= 1) {
        criticalTasks.push(task.id);
      }

      // Store float on task for display
      task._float_days = Math.round(slack * 10) / 10;
      task._earliest = e;
      task._latest = l;
    }
  });

  return criticalTasks;
}

function calculateDuration(task) {
  if (!task.start_date || !task.end_date) return 1;
  
  try {
    const start = new Date(task.start_date);
    const end = new Date(task.end_date);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return 1;
    
    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    return Math.max(days, 1);
  } catch {
    return 1;
  }
}