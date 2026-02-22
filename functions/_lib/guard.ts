/**
 * BACKEND GUARD MODULE
 * 
 * Centralized authentication, authorization, and validation for all backend functions.
 * Every function should use these guards to ensure consistent security enforcement.
 * 
 * Usage pattern:
 * 1. parseInput(req, schema) - validate and parse request body
 * 2. requireUser(req) - authenticate user
 * 3. requireProjectAccess(user, project_id) - authorize project access
 * 4. Do work
 * 5. Return ok(data) / badRequest(msg) / forbidden(msg) / notFound(msg)
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Parse and validate request input against a schema
 * @param {Request} req - HTTP request
 * @param {object} schema - Validation schema (simple object with field names)
 * @returns {Promise<object>} Parsed input or throws badRequest
 */
export async function parseInput(req, schema = {}) {
  try {
    const body = await req.json();
    
    // Validate required fields
    for (const field of Object.keys(schema)) {
      if (schema[field].required && !body[field] && body[field] !== 0 && body[field] !== false) {
        throw new Error(`Missing required field: ${field}`);
      }
      
      // Type validation
      if (body[field] !== undefined && schema[field].type) {
        const actualType = typeof body[field];
        const expectedType = schema[field].type;
        
        if (expectedType === 'number' && actualType !== 'number') {
          throw new Error(`Field ${field} must be a number`);
        }
        if (expectedType === 'string' && actualType !== 'string') {
          throw new Error(`Field ${field} must be a string`);
        }
        if (expectedType === 'boolean' && actualType !== 'boolean') {
          throw new Error(`Field ${field} must be a boolean`);
        }
        if (expectedType === 'array' && !Array.isArray(body[field])) {
          throw new Error(`Field ${field} must be an array`);
        }
      }
    }
    
    return body;
  } catch (error) {
    throw {
      status: 400,
      message: error.message || 'Invalid request body'
    };
  }
}

/**
 * Require authenticated user
 * @param {Request} req - HTTP request
 * @returns {Promise<object>} User object or throws unauthorized
 */
export async function requireUser(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      throw { status: 401, message: 'Unauthorized' };
    }
    
    return user;
  } catch (error) {
    if (error.status) throw error;
    throw { status: 401, message: 'Authentication failed' };
  }
}

/**
 * Require project access for user
 * @param {object} user - User object from requireUser
 * @param {string} project_id - Project ID to check access
 * @param {object} base44 - Base44 client instance
 * @returns {Promise<boolean>} True if access granted or throws forbidden
 */
export async function requireProjectAccess(user, project_id, base44) {
  if (!project_id) {
    throw { status: 400, message: 'project_id is required' };
  }
  
  // Admin users have access to all projects
  if (user.role === 'admin') {
    return true;
  }
  
  try {
    // Check ProjectMember table
    const members = await base44.asServiceRole.entities.ProjectMember.filter({ 
      project_id, 
      user_email: user.email 
    });
    
    if (members.length === 0) {
      // Fallback: check if user is in project's assigned_users array
      const projects = await base44.asServiceRole.entities.Project.filter({ id: project_id });
      const project = projects[0];
      
      if (!project || !project.assigned_users?.includes(user.email)) {
        throw { status: 403, message: 'Access denied: not a project member' };
      }
    }
    
    return true;
  } catch (error) {
    if (error.status) throw error;
    throw { status: 403, message: 'Project access validation failed' };
  }
}

/**
 * Log service role access for audit trail
 * @param {object} context - Logging context
 */
export function logServiceRoleAccess(context) {
  const {
    function_name,
    project_id,
    user_id,
    user_email,
    action,
    entity_name,
    reason
  } = context;
  
  console.log('[SERVICE_ROLE_ACCESS]', JSON.stringify({
    timestamp: new Date().toISOString(),
    function_name,
    project_id,
    user_id,
    user_email,
    action,
    entity_name,
    reason
  }));
}

/**
 * Validate entity data against contract
 * @param {string} entityName - Entity type
 * @param {object} data - Entity data
 * @returns {object} Validation result
 */
export function validateEntityContract(entityName, data) {
  // Contract definitions (subset of key project entities)
  const contracts = {
    WorkPackage: { requiredFields: ['project_id', 'title'], titleField: 'title' },
    Task: { requiredFields: ['project_id', 'title'], titleField: 'title' },
    RFI: { requiredFields: ['project_id', 'subject'], titleField: 'subject' },
    ChangeOrder: { requiredFields: ['project_id', 'title'], titleField: 'title' },
    Delivery: { requiredFields: ['project_id', 'description'], titleField: 'description' },
    Document: { requiredFields: ['project_id', 'title'], titleField: 'title' },
    Expense: { requiredFields: ['project_id', 'description'], titleField: 'description' }
  };
  
  const contract = contracts[entityName];
  if (!contract) {
    return { valid: true, errors: [] };
  }
  
  const errors = [];
  for (const field of contract.requiredFields) {
    if (!data[field] && data[field] !== 0) {
      errors.push(`Missing required field: ${field}`);
    }
  }
  
  return { valid: errors.length === 0, errors };
}

// Response helpers
export function ok(data, status = 200) {
  return Response.json({ success: true, data }, { status });
}

export function badRequest(message, details = null) {
  return Response.json({ 
    success: false, 
    error: message,
    details 
  }, { status: 400 });
}

export function unauthorized(message = 'Unauthorized') {
  return Response.json({ 
    success: false, 
    error: message 
  }, { status: 401 });
}

export function forbidden(message = 'Forbidden') {
  return Response.json({ 
    success: false, 
    error: message 
  }, { status: 403 });
}

export function notFound(message = 'Not found') {
  return Response.json({ 
    success: false, 
    error: message 
  }, { status: 404 });
}

export function serverError(message = 'Internal server error', error = null) {
  console.error('[SERVER_ERROR]', message, error);
  return Response.json({ 
    success: false, 
    error: message 
  }, { status: 500 });
}