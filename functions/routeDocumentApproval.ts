import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { documentId, approvers, dueDate, notes } = await req.json();
    
    if (!documentId || !approvers || approvers.length === 0) {
      return Response.json({ error: 'Document ID and approvers required' }, { status: 400 });
    }
    
    // Fetch document
    const documents = await base44.entities.Document.filter({ id: documentId });
    const document = documents[0];
    
    if (!document) {
      return Response.json({ error: 'Document not found' }, { status: 404 });
    }
    
    const project = document.project_id 
      ? (await base44.entities.Project.filter({ id: document.project_id }))[0]
      : null;
    
    console.log(`[routeDocumentApproval] Routing document: ${document.title} to ${approvers.length} approvers`);
    
    // Update document workflow stage
    await base44.entities.Document.update(documentId, {
      workflow_stage: 'pending_review',
      reviewer: approvers[0], // Primary reviewer
      review_due_date: dueDate,
      review_notes: notes
    });
    
    // Send notification emails to all approvers
    for (const approverEmail of approvers) {
      const emailBody = `
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; color: #333; }
              .header { background-color: #f59e0b; padding: 20px; color: white; }
              .content { padding: 20px; }
              .document-info { background-color: #f9f9f9; padding: 15px; margin: 15px 0; border-left: 4px solid #f59e0b; }
              .action-button { 
                background-color: #f59e0b; 
                color: white; 
                padding: 12px 24px; 
                text-decoration: none; 
                border-radius: 4px; 
                display: inline-block;
                margin-top: 15px;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>Document Review Required</h1>
            </div>
            <div class="content">
              <p>Hello,</p>
              <p>You have been assigned to review a document:</p>
              
              <div class="document-info">
                <h3>${document.title}</h3>
                ${project ? `<p><strong>Project:</strong> ${project.project_number} - ${project.name}</p>` : ''}
                <p><strong>Category:</strong> ${document.category}</p>
                <p><strong>Revision:</strong> ${document.revision || 'N/A'}</p>
                ${dueDate ? `<p><strong>Due Date:</strong> ${dueDate}</p>` : ''}
                ${document.description ? `<p><strong>Description:</strong> ${document.description}</p>` : ''}
              </div>
              
              ${notes ? `<p><strong>Review Notes:</strong> ${notes}</p>` : ''}
              
              <p>Please review this document and provide your approval or feedback.</p>
              
              ${document.file_url ? `<a href="${document.file_url}" class="action-button">View Document</a>` : ''}
              
              <p style="margin-top: 20px; color: #666; font-size: 12px;">
                This is an automated notification from SteelBuild Pro.
              </p>
            </div>
          </body>
        </html>
      `;
      
      await base44.integrations.Core.SendEmail({
        to: approverEmail,
        subject: `[Review Required] ${document.title}${project ? ` - ${project.project_number}` : ''}`,
        body: emailBody
      });
    }
    
    console.log(`[routeDocumentApproval] Notifications sent to ${approvers.length} approvers`);
    
    return Response.json({
      success: true,
      documentId,
      approvers,
      notificationsSent: approvers.length
    });
    
  } catch (error) {
    console.error('[routeDocumentApproval] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});