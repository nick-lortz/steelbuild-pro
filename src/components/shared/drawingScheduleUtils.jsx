// Utilities for linking drawings to schedule

export function isTaskBlockedByDrawings(task, drawingSets) {
  if (!task.linked_drawing_set_ids || task.linked_drawing_set_ids.length === 0) {
    return { blocked: false, reason: null };
  }

  // Tasks in fabrication, delivery, or erection phases require FFF status
  const requiresFFFPhases = ['fabrication', 'delivery', 'erection'];
  if (!requiresFFFPhases.includes(task.phase)) {
    return { blocked: false, reason: null };
  }

  const linkedDrawings = drawingSets.filter(d => 
    task.linked_drawing_set_ids.includes(d.id)
  );

  const notReleasedDrawings = linkedDrawings.filter(d => d.status !== 'FFF');
  
  if (notReleasedDrawings.length > 0) {
    return {
      blocked: true,
      reason: `Waiting for ${notReleasedDrawings.length} drawing set(s) to be released (FFF)`,
      drawings: notReleasedDrawings,
    };
  }

  return { blocked: false, reason: null };
}

export function getDrawingRisks(tasks, drawingSets) {
  const risks = [];
  const today = new Date();
  const twoWeeksFromNow = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000);

  tasks.forEach(task => {
    if (!task.linked_drawing_set_ids || task.linked_drawing_set_ids.length === 0) {
      return;
    }

    const taskStartDate = new Date(task.start_date);
    const linkedDrawings = drawingSets.filter(d => 
      task.linked_drawing_set_ids.includes(d.id)
    );

    linkedDrawings.forEach(drawing => {
      // Risk 1: Task starts soon but drawing not released
      if (taskStartDate <= twoWeeksFromNow && drawing.status !== 'FFF') {
        risks.push({
          type: 'drawing_not_released',
          severity: taskStartDate <= today ? 'critical' : 'high',
          task,
          drawing,
          message: `${drawing.set_name} not released - ${task.name} starts ${taskStartDate.toLocaleDateString()}`,
        });
      }

      // Risk 2: Drawing overdue
      if (drawing.due_date && drawing.status !== 'FFF') {
        const dueDate = new Date(drawing.due_date);
        if (dueDate < today) {
          risks.push({
            type: 'drawing_overdue',
            severity: 'critical',
            task,
            drawing,
            message: `${drawing.set_name} overdue - blocking ${task.name}`,
          });
        }
      }
    });
  });

  return risks;
}

export function calculateDrawingDelay(task, drawingSets) {
  if (!task.linked_drawing_set_ids || task.linked_drawing_set_ids.length === 0) {
    return 0;
  }

  const linkedDrawings = drawingSets.filter(d => 
    task.linked_drawing_set_ids.includes(d.id)
  );

  let maxDelay = 0;
  const taskStartDate = new Date(task.start_date);

  linkedDrawings.forEach(drawing => {
    if (drawing.status !== 'FFF' && drawing.due_date) {
      const dueDate = new Date(drawing.due_date);
      if (dueDate > taskStartDate) {
        const delayDays = Math.ceil((dueDate - taskStartDate) / (1000 * 60 * 60 * 24));
        maxDelay = Math.max(maxDelay, delayDays);
      }
    }
  });

  return maxDelay;
}

export function getAffectedTasks(drawingSet, tasks) {
  return tasks.filter(task => 
    task.linked_drawing_set_ids && 
    task.linked_drawing_set_ids.includes(drawingSet.id)
  );
}