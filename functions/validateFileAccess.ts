import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { requireAuth } from './utils/auth.js';
import { logger } from './utils/logging.js';

/**
 * Validate user has permission to access a file/document
 * Enforces project-based authorization
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await requireAuth(base44);

    const { document_id, file_url } = await req.json();

    if (!document_id && !file_url) {
      return Response.json({ error: 'document_id or file_url required' }, { status: 400 });
    }

    // If document_id provided, check project access
    if (document_id) {
      const [document] = await base44.entities.Document.filter({ id: document_id });
      
      if (!document) {
        logger.warn('validateFileAccess', 'Document not found', { document_id, user: user.email });
        return Response.json({ error: 'Document not found' }, { status: 404 });
      }

      // Check project access
      const [project] = await base44.entities.Project.filter({ id: document.project_id });
      
      if (!project) {
        return Response.json({ error: 'Project not found' }, { status: 404 });
      }

      // Admin has access to all
      if (user.role === 'admin') {
        logger.info('validateFileAccess', 'Admin access granted', { document_id, user: user.email });
        return Response.json({ 
          allowed: true, 
          file_url: document.file_url,
          document 
        });
      }

      // Check if user is assigned to project
      const isAssigned = 
        project.project_manager === user.email ||
        project.superintendent === user.email ||
        (project.assigned_users && project.assigned_users.includes(user.email));

      if (!isAssigned) {
        logger.warn('validateFileAccess', 'Access denied - not assigned to project', {
          document_id,
          project_id: project.id,
          user: user.email
        });
        return Response.json({ error: 'Access denied' }, { status: 403 });
      }

      logger.info('validateFileAccess', 'Access granted', {
        document_id,
        project_id: project.id,
        user: user.email
      });

      return Response.json({ 
        allowed: true, 
        file_url: document.file_url,
        document 
      });
    }

    // If just validating a file_url (less secure, should have document_id)
    logger.warn('validateFileAccess', 'File URL validation without document_id', { user: user.email });
    return Response.json({ 
      allowed: true, 
      file_url,
      warning: 'Direct file access not fully validated'
    });

  } catch (error) {
    logger.error('validateFileAccess', 'Validation error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});