/**
 * SECURE PROJECT DELETION ENDPOINT
 * 
 * With cascade deletion of all related entities
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { requireAdmin } from './utils/auth.js';

Deno.serve(async (req) => {
  try {
    // 1. AUTH - Only admins can delete projects
    const { user, error, base44 } = await requireAdmin(req);
    if (error) return error;
    
    // 2. PARSE
    const { id } = await req.json();
    
    if (!id) {
      return Response.json({
        error: 'Project ID is required'
      }, { status: 400 });
    }
    
    // 3. VERIFY PROJECT EXISTS
    const projects = await base44.asServiceRole.entities.Project.filter({ id });
    if (projects.length === 0) {
      return Response.json({
        error: 'Project not found'
      }, { status: 404 });
    }
    
    // 4. CASCADE DELETE ALL RELATED ENTITIES
    // NOTE: This is a simplified version. Production should use cascadeDeleteProject function
    const deletePromises = [
      // Work packages and tasks
      base44.asServiceRole.entities.WorkPackage.filter({ project_id: id })
        .then(wps => Promise.all(wps.map(wp => base44.asServiceRole.entities.WorkPackage.delete(wp.id)))),
      
      base44.asServiceRole.entities.Task.filter({ project_id: id })
        .then(tasks => Promise.all(tasks.map(t => base44.asServiceRole.entities.Task.delete(t.id)))),
      
      // Financials
      base44.asServiceRole.entities.Financial.filter({ project_id: id })
        .then(fins => Promise.all(fins.map(f => base44.asServiceRole.entities.Financial.delete(f.id)))),
      
      base44.asServiceRole.entities.Expense.filter({ project_id: id })
        .then(exps => Promise.all(exps.map(e => base44.asServiceRole.entities.Expense.delete(e.id)))),
      
      // RFIs and change orders
      base44.asServiceRole.entities.RFI.filter({ project_id: id })
        .then(rfis => Promise.all(rfis.map(r => base44.asServiceRole.entities.RFI.delete(r.id)))),
      
      base44.asServiceRole.entities.ChangeOrder.filter({ project_id: id })
        .then(cos => Promise.all(cos.map(c => base44.asServiceRole.entities.ChangeOrder.delete(c.id)))),
      
      // Documents and drawings
      base44.asServiceRole.entities.Document.filter({ project_id: id })
        .then(docs => Promise.all(docs.map(d => base44.asServiceRole.entities.Document.delete(d.id)))),
      
      base44.asServiceRole.entities.DrawingSet.filter({ project_id: id })
        .then(sets => Promise.all(sets.map(s => base44.asServiceRole.entities.DrawingSet.delete(s.id)))),
      
      // Other entities
      base44.asServiceRole.entities.DailyLog.filter({ project_id: id })
        .then(logs => Promise.all(logs.map(l => base44.asServiceRole.entities.DailyLog.delete(l.id)))),
      
      base44.asServiceRole.entities.Meeting.filter({ project_id: id })
        .then(mtgs => Promise.all(mtgs.map(m => base44.asServiceRole.entities.Meeting.delete(m.id)))),
      
      base44.asServiceRole.entities.ProductionNote.filter({ project_id: id })
        .then(notes => Promise.all(notes.map(n => base44.asServiceRole.entities.ProductionNote.delete(n.id))))
    ];
    
    await Promise.all(deletePromises);
    
    // 5. DELETE PROJECT ITSELF
    await base44.asServiceRole.entities.Project.delete(id);
    
    return Response.json({
      success: true,
      message: 'Project and all related data deleted successfully'
    });
    
  } catch (error) {
    console.error('Delete project error:', error);
    return Response.json({
      error: 'Internal server error',
      message: error.message
    }, { status: 500 });
  }
});