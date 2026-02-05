import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { folder_id, project_id } = await req.json();

    if (!folder_id) {
      return Response.json({ error: 'folder_id required' }, { status: 400 });
    }

    // Get Google Drive access token
    const accessToken = await base44.asServiceRole.connectors.getAccessToken('googledrive');

    // Fetch documents to sync
    const query = project_id ? { project_id } : {};
    const documents = await base44.entities.Document.filter(query);

    let syncedCount = 0;
    const errors = [];

    // Upload each document to Google Drive
    for (const doc of documents) {
      try {
        // Fetch the file from Base44 storage
        const fileResponse = await fetch(doc.file_url);
        const fileBlob = await fileResponse.blob();

        // Upload to Google Drive
        const metadata = {
          name: doc.file_name,
          parents: [folder_id]
        };

        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        form.append('file', fileBlob);

        const uploadResponse = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`
          },
          body: form
        });

        if (uploadResponse.ok) {
          syncedCount++;
        } else {
          const error = await uploadResponse.json();
          errors.push({ file: doc.file_name, error: error.error?.message || 'Upload failed' });
        }

      } catch (err) {
        errors.push({ file: doc.file_name, error: err.message });
      }
    }

    return Response.json({
      success: true,
      synced_count: syncedCount,
      total_documents: documents.length,
      errors: errors.length > 0 ? errors : undefined,
      folder_id
    });

  } catch (error) {
    console.error('Google Drive sync error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});