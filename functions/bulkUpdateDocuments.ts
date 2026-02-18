import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { requireRole } from './_lib/authz.js';
import { requireProjectAccess } from './utils/requireProjectAccess.js';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { document_ids, action, updates } = await req.json();

    if (!document_ids || !Array.isArray(document_ids) || document_ids.length === 0) {
      return Response.json({ error: 'document_ids array required' }, { status: 400 });
    }
    
    // Bulk updates require PM/Admin
    requireRole(user, ['admin', 'pm', 'superintendent']);

    const results = [];
    const notifications = [];

    // Process bulk action
    if (action === 'approve') {
      for (const docId of document_ids) {
        const docs = await base44.asServiceRole.entities.Document.filter({ id: docId });
        const doc = docs[0];

        if (!doc) {
          results.push({ id: docId, status: 'not_found' });
          continue;
        }
        
        // Verify project access for each document
        await requireProjectAccess(base44, user, doc.project_id, 'edit');

        // Update document to approved
        await base44.asServiceRole.entities.Document.update(docId, {
          workflow_stage: 'approved',
          status: 'approved',
          reviewer: user.email,
          review_date: new Date().toISOString().split('T')[0]
        });

        // Notify uploader
        if (doc.created_by) {
          notifications.push({
            user_email: doc.created_by,
            type: 'drawing_update',
            title: `Document Approved: ${doc.title}`,
            message: `Your document "${doc.title}" has been approved by ${user.full_name || user.email}.`,
            priority: 'medium',
            related_entity_type: 'Document',
            related_entity_id: doc.id,
            project_id: doc.project_id,
            is_read: false
          });
        }

        results.push({ id: docId, status: 'approved' });
      }
    } else if (action === 'reject') {
      for (const docId of document_ids) {
        const docs = await base44.asServiceRole.entities.Document.filter({ id: docId });
        const doc = docs[0];

        if (!doc) {
          results.push({ id: docId, status: 'not_found' });
          continue;
        }
        
        // Verify project access for each document
        await requireProjectAccess(base44, user, doc.project_id, 'edit');

        // Update document to rejected
        await base44.asServiceRole.entities.Document.update(docId, {
          workflow_stage: 'rejected',
          status: 'void',
          reviewer: user.email,
          review_date: new Date().toISOString().split('T')[0],
          review_notes: updates?.rejection_reason || 'Rejected via bulk action'
        });

        // Notify uploader
        if (doc.created_by) {
          notifications.push({
            user_email: doc.created_by,
            type: 'drawing_update',
            title: `Document Rejected: ${doc.title}`,
            message: `Document "${doc.title}" rejected by ${user.full_name || user.email}. Reason: ${updates?.rejection_reason || 'See review notes'}.`,
            priority: 'high',
            related_entity_type: 'Document',
            related_entity_id: doc.id,
            project_id: doc.project_id,
            is_read: false
          });
        }

        results.push({ id: docId, status: 'rejected' });
      }
    } else if (action === 'update' && updates) {
      // Bulk update with custom data
      for (const docId of document_ids) {
        const docs = await base44.asServiceRole.entities.Document.filter({ id: docId });
        if (!docs.length) {
          results.push({ id: docId, status: 'not_found' });
          continue;
        }
        
        // Verify project access for each document
        await requireProjectAccess(base44, user, docs[0].project_id, 'edit');
        
        await base44.asServiceRole.entities.Document.update(docId, updates);
        results.push({ id: docId, status: 'updated' });
      }
    } else {
      return Response.json({ error: 'Invalid action or missing updates' }, { status: 400 });
    }

    // Create notifications
    if (notifications.length > 0) {
      await base44.asServiceRole.entities.Notification.bulkCreate(notifications);
    }

    return Response.json({
      success: true,
      processed: results.length,
      notifications: notifications.length,
      results
    });

  } catch (error) {
    console.error('Bulk document update error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});