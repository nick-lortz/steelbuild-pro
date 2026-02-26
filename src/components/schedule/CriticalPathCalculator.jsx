/**
 * Critical Path Calculator
 * Determines which tasks are on the critical path using forward/backward pass
 */

export function calculateCriticalPath(tasks) {
  if (!tasks || tasks.length === 0) return [];

  try {
    const tasksWithDeps = tasks.filter(t => (t.predecessor_ids || []).length > 0);
    if (tasksWithDeps.length === 0) return [];

    const taskMap = new Map(tasks.map(t => [t.id, t]));
    const successorMap = new Map(tasks.map(t => [t.id, []]));
    const inDegree = new Map(tasks.map(t => [t.id, 0]));

    tasks.forEach(task => {
      (task.predecessor_ids || []).forEach(predId => {
        if (taskMap.has(predId)) {
          inDegree.set(task.id, (inDegree.get(task.id) || 0) + 1);
          successorMap.get(predId).push(task.id);
        }
      });
    });

    // Topological sort (Kahn's algorithm - iterative, no recursion)
    const queue = tasks.filter(t => (inDegree.get(t.id) || 0) === 0).map(t => t.id);
    const topoOrder = [];
    const tempInDegree = new Map(inDegree);

    while (queue.length > 0) {
      const current = queue.shift();
      topoOrder.push(current);
      (successorMap.get(current) || []).forEach(succId => {
        const newDeg = (tempInDegree.get(succId) || 0) - 1;
        tempInDegree.set(succId, newDeg);
        if (newDeg === 0) queue.push(succId);
      });
    }

    // Cycle detected - bail out safely
    if (topoOrder.length !== tasks.length) return [];

    // Forward pass (iterative)
    const earliest = new Map();
    topoOrder.forEach(taskId => {
      const task = taskMap.get(taskId);
      const preds = (task.predecessor_ids || []).filter(id => taskMap.has(id));
      const maxPred = preds.length > 0 ? Math.max(...preds.map(id => (earliest.get(id)?.finish || 0))) : 0;
      const dur = calculateDuration(task);
      earliest.set(taskId, { start: maxPred, finish: maxPred + dur });
    });

    const projectEnd = Math.max(...Array.from(earliest.values()).map(e => e.finish || 0));

    // Backward pass (iterative - reverse topo order)
    const latest = new Map();
    [...topoOrder].reverse().forEach(taskId => {
      const task = taskMap.get(taskId);
      const succs = successorMap.get(taskId) || [];
      const minSucc = succs.length > 0 ? Math.min(...succs.map(id => (latest.get(id)?.start ?? projectEnd))) : projectEnd;
      const dur = calculateDuration(task);
      latest.set(taskId, { start: minSucc - dur, finish: minSucc });
    });

    // Identify critical tasks
    const criticalTasks = [];
    tasks.forEach(task => {
      const e = earliest.get(task.id);
      const l = latest.get(task.id);
      if (e && l) {
        const slack = l.start - e.start;
        if (slack <= 1) criticalTasks.push(task.id);
        task._float_days = Math.round(slack * 10) / 10;
        task._earliest = e;
        task._latest = l;
      }
    });

    return criticalTasks;
  } catch {
    return [];
  }
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