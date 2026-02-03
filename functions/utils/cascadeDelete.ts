/**
 * Cascade Delete Utilities
 * 
 * Ensures referential integrity by deleting all dependent entities
 * before deleting parent entities.
 */

/**
 * Cascade delete all entities related to a project
 */
export async function cascadeDeleteProject(base44, projectId) {
  // Order matters: delete children before parents
  
  // 1. Tasks and their dependencies
  const tasks = await base44.entities.Task.filter({ project_id: projectId });
  await Promise.all(tasks.map(t => base44.entities.Task.delete(t.id)));
  
  // 2. Work packages
  const workPackages = await base44.entities.WorkPackage.filter({ project_id: projectId });
  await Promise.all(workPackages.map(wp => base44.entities.WorkPackage.delete(wp.id)));
  
  // 3. Labor entries and hours
  const laborHours = await base44.entities.LaborHours.filter({ project_id: projectId });
  await Promise.all(laborHours.map(lh => base44.entities.LaborHours.delete(lh.id)));
  
  // 4. Financials, expenses, budgets
  const financials = await base44.entities.Financial.filter({ project_id: projectId });
  await Promise.all(financials.map(f => base44.entities.Financial.delete(f.id)));
  
  const expenses = await base44.entities.Expense.filter({ project_id: projectId });
  await Promise.all(expenses.map(e => base44.entities.Expense.delete(e.id)));
  
  const budgetItems = await base44.entities.BudgetLineItem.filter({ project_id: projectId });
  await Promise.all(budgetItems.map(b => base44.entities.BudgetLineItem.delete(b.id)));
  
  // 5. RFIs and Change Orders
  const rfis = await base44.entities.RFI.filter({ project_id: projectId });
  await Promise.all(rfis.map(r => base44.entities.RFI.delete(r.id)));
  
  const changeOrders = await base44.entities.ChangeOrder.filter({ project_id: projectId });
  await Promise.all(changeOrders.map(co => base44.entities.ChangeOrder.delete(co.id)));
  
  // 6. Drawing sets and sheets
  const drawingSets = await base44.entities.DrawingSet.filter({ project_id: projectId });
  for (const set of drawingSets) {
    // Delete sheets first
    const sheets = await base44.entities.DrawingSheet.filter({ drawing_set_id: set.id });
    await Promise.all(sheets.map(s => base44.entities.DrawingSheet.delete(s.id)));
    
    // Delete revisions
    const revisions = await base44.entities.DrawingRevision.filter({ drawing_set_id: set.id });
    await Promise.all(revisions.map(r => base44.entities.DrawingRevision.delete(r.id)));
    
    // Delete set
    await base44.entities.DrawingSet.delete(set.id);
  }
  
  // 7. Documents
  const documents = await base44.entities.Document.filter({ project_id: projectId });
  await Promise.all(documents.map(d => base44.entities.Document.delete(d.id)));
  
  // 8. Submittals
  const submittals = await base44.entities.Submittal.filter({ project_id: projectId });
  await Promise.all(submittals.map(s => base44.entities.Submittal.delete(s.id)));
  
  // 9. Deliveries
  const deliveries = await base44.entities.Delivery.filter({ project_id: projectId });
  await Promise.all(deliveries.map(d => base44.entities.Delivery.delete(d.id)));
  
  // 10. Fabrication packages
  const fabPackages = await base44.entities.FabricationPackage.filter({ project_id: projectId });
  await Promise.all(fabPackages.map(fp => base44.entities.FabricationPackage.delete(fp.id)));
  
  // 11. Daily logs
  const dailyLogs = await base44.entities.DailyLog.filter({ project_id: projectId });
  await Promise.all(dailyLogs.map(dl => base44.entities.DailyLog.delete(dl.id)));
  
  // 12. Meetings
  const meetings = await base44.entities.Meeting.filter({ project_id: projectId });
  await Promise.all(meetings.map(m => base44.entities.Meeting.delete(m.id)));
  
  // 13. Production notes
  const notes = await base44.entities.ProductionNote.filter({ project_id: projectId });
  await Promise.all(notes.map(n => base44.entities.ProductionNote.delete(n.id)));
  
  // 14. SOV items and invoices
  const sovItems = await base44.entities.SOVItem.filter({ project_id: projectId });
  await Promise.all(sovItems.map(si => base44.entities.SOVItem.delete(si.id)));
  
  const invoices = await base44.entities.ClientInvoice.filter({ project_id: projectId });
  await Promise.all(invoices.map(inv => base44.entities.ClientInvoice.delete(inv.id)));
  
  // 15. Resource allocations for this project
  const allocations = await base44.entities.ResourceAllocation.filter({ project_id: projectId });
  await Promise.all(allocations.map(a => base44.entities.ResourceAllocation.delete(a.id)));
  
  // 16. Finally, delete the project
  await base44.entities.Project.delete(projectId);
}

/**
 * Cascade delete work package and related entities
 */
export async function cascadeDeleteWorkPackage(base44, workPackageId) {
  // 1. Delete tasks linked to this work package
  const tasks = await base44.entities.Task.filter({ work_package_id: workPackageId });
  await Promise.all(tasks.map(t => base44.entities.Task.delete(t.id)));
  
  // 2. Delete labor hours linked to this work package
  const laborHours = await base44.entities.LaborHours.filter({ work_package_id: workPackageId });
  await Promise.all(laborHours.map(lh => base44.entities.LaborHours.delete(lh.id)));
  
  // 3. Delete the work package
  await base44.entities.WorkPackage.delete(workPackageId);
}

/**
 * Cascade delete task and handle dependencies
 */
export async function cascadeDeleteTask(base44, taskId) {
  // 1. Find and update tasks that depend on this task
  const allTasks = await base44.entities.Task.list();
  const dependentTasks = allTasks.filter(t => 
    t.predecessor_ids && t.predecessor_ids.includes(taskId)
  );
  
  for (const task of dependentTasks) {
    const updatedPredecessors = task.predecessor_ids.filter(id => id !== taskId);
    const updatedConfigs = task.predecessor_configs?.filter(c => c.predecessor_id !== taskId);
    
    await base44.entities.Task.update(task.id, {
      predecessor_ids: updatedPredecessors,
      predecessor_configs: updatedConfigs
    });
  }
  
  // 2. Delete child tasks (subtasks)
  const subtasks = await base44.entities.Task.filter({ parent_task_id: taskId });
  await Promise.all(subtasks.map(st => base44.entities.Task.delete(st.id)));
  
  // 3. Delete the task
  await base44.entities.Task.delete(taskId);
}

/**
 * Cascade delete drawing set and related entities
 */
export async function cascadeDeleteDrawingSet(base44, drawingSetId) {
  // 1. Delete sheets
  const sheets = await base44.entities.DrawingSheet.filter({ drawing_set_id: drawingSetId });
  await Promise.all(sheets.map(s => base44.entities.DrawingSheet.delete(s.id)));
  
  // 2. Delete revisions
  const revisions = await base44.entities.DrawingRevision.filter({ drawing_set_id: drawingSetId });
  await Promise.all(revisions.map(r => base44.entities.DrawingRevision.delete(r.id)));
  
  // 3. Delete annotations
  const annotations = await base44.entities.DrawingAnnotation.filter({ drawing_set_id: drawingSetId });
  await Promise.all(annotations.map(a => base44.entities.DrawingAnnotation.delete(a.id)));
  
  // 4. Delete the drawing set
  await base44.entities.DrawingSet.delete(drawingSetId);
}