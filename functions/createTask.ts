/**
 * SECURE TASK CREATION ENDPOINT
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { validateInput, TaskCreateSchema } from './utils/schemas.js';
import { handleFunctionError } from './utils/errorHandler.js';
import { requireProjectAccess } from './utils/auth.js';
import { validateTask } from './utils/validation.js';

Deno.serve(async (req) => {
  try {
    const data = await req.json();
    
    // 1. INPUT VALIDATION
    const validation = validateInput(TaskCreateSchema, data);
    if (!validation.valid) {
      return Response.json({ error: validation.error }, { status: 400 });
    }
    
    // 2. AUTH - Verify project access
    const { user, project, error, base44 } = await requireProjectAccess(req, data.project_id);
    if (error) return error;
    
    // 3. CIRCULAR DEPENDENCY CHECK (if predecessors provided)
    if (data.predecessor_ids && data.predecessor_ids.length > 0) {
      // Simple check: ensure task isn't its own predecessor
      if (data.id && data.predecessor_ids.includes(data.id)) {
        return Response.json({
          error: 'Task cannot be its own predecessor'
        }, { status: 400 });
      }
      
      // TODO: Full cycle detection algorithm
    }
    
    // 4. CREATE TASK
    const task = await base44.entities.Task.create({
      ...data,
      created_by: user.email
    });
    
    return Response.json({
      success: true,
      task
    }, { status: 201 });
    
  } catch (error) {
    const { status, body } = handleFunctionError(error, 'createTask');
    return new Response(body, { status, headers: { 'Content-Type': 'application/json' } });
  }
});