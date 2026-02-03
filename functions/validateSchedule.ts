/**
 * VALIDATE SCHEDULE & DEPENDENCIES ENDPOINT
 * 
 * Detects circular dependencies, validates dates, auto-adjusts if requested
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { requireAuth } from './utils/auth.js';
import { 
  detectCircularDependencies,
  validateTaskDates,
  validateDependencies,
  autoAdjustDatesForward,
  calculateBackwardPass,
  getCriticalPath
} from './utils/scheduleValidation.js';

Deno.serve(async (req) => {
  try {
    const { user, base44, error } = await requireAuth(req);
    if (error) return error;
    
    const { project_id, auto_adjust = false } = await req.json();
    
    if (!project_id) {
      return Response.json({ error: 'project_id required' }, { status: 400 });
    }
    
    const results = {
      project_id,
      timestamp: new Date().toISOString(),
      circular_dependencies: [],
      date_errors: [],
      dependency_errors: [],
      critical_path: [],
      summary: {
        total_errors: 0,
        tasks_adjusted: 0
      }
    };
    
    // Get all project tasks
    const tasks = await base44.entities.Task.filter({ project_id });
    
    if (tasks.length === 0) {
      return Response.json({
        ...results,
        message: 'No tasks found for project'
      });
    }
    
    // Check for circular dependencies
    const circularCheck = detectCircularDependencies(tasks);
    if (!circularCheck.valid) {
      results.circular_dependencies = circularCheck.errors;
      results.summary.total_errors += circularCheck.errors.length;
    }
    
    // Validate each task
    for (const task of tasks) {
      // Validate dates
      const dateValidation = validateTaskDates(task);
      if (!dateValidation.valid) {
        results.date_errors.push({
          task_id: task.id,
          task_name: task.name,
          errors: dateValidation.errors
        });
        results.summary.total_errors += dateValidation.errors.length;
      }
      
      // Validate dependencies
      const depValidation = validateDependencies(task, tasks);
      if (!depValidation.valid) {
        results.dependency_errors.push({
          task_id: task.id,
          task_name: task.name,
          errors: depValidation.errors
        });
        results.summary.total_errors += depValidation.errors.length;
      }
    }
    
    // Auto-adjust dates if requested and no circular deps
    if (auto_adjust && results.circular_dependencies.length === 0) {
      const adjustedTasks = autoAdjustDatesForward(tasks);
      
      for (const adjusted of adjustedTasks) {
        const original = tasks.find(t => t.id === adjusted.id);
        
        if (original.start_date !== adjusted.start_date || original.end_date !== adjusted.end_date) {
          await base44.asServiceRole.entities.Task.update(adjusted.id, {
            start_date: adjusted.start_date,
            end_date: adjusted.end_date,
            duration_days: adjusted.duration_days
          });
          results.summary.tasks_adjusted++;
        }
      }
      
      // Recalculate critical path with adjusted dates
      const tasksWithCritical = calculateBackwardPass(adjustedTasks);
      results.critical_path = getCriticalPath(tasksWithCritical).map(t => ({
        task_id: t.id,
        task_name: t.name,
        start_date: t.start_date,
        end_date: t.end_date,
        float_days: t.float_days
      }));
    } else {
      // Just calculate critical path
      const tasksWithCritical = calculateBackwardPass(tasks);
      results.critical_path = getCriticalPath(tasksWithCritical).map(t => ({
        task_id: t.id,
        task_name: t.name,
        start_date: t.start_date,
        end_date: t.end_date,
        float_days: t.float_days || 0
      }));
    }
    
    results.summary.has_errors = results.summary.total_errors > 0;
    results.summary.critical_path_length = results.critical_path.length;
    
    return Response.json(results);
    
  } catch (error) {
    console.error('Validate schedule error:', error);
    return Response.json({
      error: 'Internal server error',
      message: error.message
    }, { status: 500 });
  }
});