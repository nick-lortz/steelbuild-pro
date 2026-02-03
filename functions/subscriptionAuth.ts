/**
 * SUBSCRIPTION AUTHORIZATION MIDDLEWARE
 * 
 * Server-side filtering for real-time subscriptions
 * Ensures users only receive events for records they can access
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { requireAuth } from './utils/auth.js';

Deno.serve(async (req) => {
  try {
    const { user, base44, error } = await requireAuth(req);
    if (error) return error;
    
    const { entity_name, event } = await req.json();
    
    if (!entity_name || !event) {
      return Response.json({ error: 'entity_name and event required' }, { status: 400 });
    }
    
    // Check if user can access this event
    const canAccess = await checkSubscriptionAccess(user, entity_name, event, base44);
    
    return Response.json({ 
      allowed: canAccess,
      filtered_event: canAccess ? event : null
    });
    
  } catch (error) {
    console.error('Subscription auth error:', error);
    return Response.json({
      error: 'Internal server error',
      message: error.message
    }, { status: 500 });
  }
});

/**
 * Check if user can access this subscription event
 */
async function checkSubscriptionAccess(user, entityName, event, base44) {
  // Admin can access everything
  if (user.role === 'admin') {
    return true;
  }
  
  // Check project-based entities
  const projectBasedEntities = [
    'Task', 'RFI', 'ChangeOrder', 'WorkPackage', 'DrawingSet',
    'Financial', 'SOVItem', 'Expense', 'LaborHours', 'Delivery',
    'Document', 'Meeting', 'DailyLog', 'ProductionNote'
  ];
  
  if (projectBasedEntities.includes(entityName)) {
    const projectId = event.data?.project_id;
    
    if (!projectId) {
      // No project_id, deny access
      return false;
    }
    
    // Check if user has access to this project
    const project = await base44.entities.Project.filter({ id: projectId });
    
    if (!project || project.length === 0) {
      return false;
    }
    
    const proj = project[0];
    
    // User is PM, superintendent, or assigned
    if (proj.project_manager === user.email ||
        proj.superintendent === user.email ||
        (proj.assigned_users && proj.assigned_users.includes(user.email))) {
      return true;
    }
    
    return false;
  }
  
  // For non-project entities, allow if user created it
  if (event.data?.created_by === user.email) {
    return true;
  }
  
  // Default deny
  return false;
}