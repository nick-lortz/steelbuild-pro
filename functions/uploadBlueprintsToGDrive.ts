import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { fileName, fileBase64, mimeType, projectId, folderId } = await req.json();

    if (!fileName || !fileBase64 || !projectId) {
      return Response.json(
        { error: 'fileName, fileBase64, and projectId required' },
        { status: 400 }
      );
    }

    // Get access token for Google Drive
    const accessToken = await base44.asServiceRole.connectors.getAccessToken('googledrive');

    // Prepare file metadata
    const fileMetadata = {
      name: fileName,
      parents: folderId ? [folderId] : [],
    };

    // Create multipart upload body
    const boundary = 'boundary_string_12345';
    const multipartBody = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(fileMetadata)}\r\n--${boundary}\r\nContent-Type: ${mimeType || 'application/octet-stream'}\r\nContent-Transfer-Encoding: base64\r\n\r\n${fileBase64}\r\n--${boundary}--`;

    // Upload to Google Drive
    const uploadResponse = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartBody,
    });

    if (!uploadResponse.ok) {
      const errorData = await uploadResponse.json();
      throw new Error(errorData.error?.message || 'Failed to upload to Google Drive');
    }

    const uploadedFile = await uploadResponse.json();

    // Optionally: Create Document record linked to project
    const document = await base44.entities.Document.create({
      project_id: projectId,
      title: fileName,
      file_name: fileName,
      file_url: `https://drive.google.com/file/d/${uploadedFile.id}`,
      category: 'drawing',
      status: 'issued',
      workflow_stage: 'uploaded',
      tags: ['blueprint', 'google_drive'],
      notes: `Google Drive ID: ${uploadedFile.id}`,
    });

    return Response.json({
      success: true,
      driveFileId: uploadedFile.id,
      driveFileUrl: `https://drive.google.com/file/d/${uploadedFile.id}`,
      documentId: document.id,
    });
  } catch (error) {
    console.error('Google Drive upload error:', error);
    return Response.json(
      { error: error.message || 'Failed to upload to Google Drive' },
      { status: 500 }
    );
  }
});