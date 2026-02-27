import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { fileName, fileData, mimeType, folderId, projectId } = await req.json();

    if (!fileName || !fileData || !projectId) {
      return Response.json(
        { error: 'fileName, fileData, and projectId required' },
        { status: 400 }
      );
    }

    // Get access token for Google Drive
    const accessToken = await base44.asServiceRole.connectors.getAccessToken('googledrive');

    // Create metadata for the file
    const metadata = {
      name: fileName,
      mimeType: mimeType || 'application/octet-stream',
      ...(folderId && { parents: [folderId] }),
      properties: {
        projectId: projectId,
        uploadedBy: user.email,
        uploadedAt: new Date().toISOString(),
      },
    };

    // Prepare multipart upload
    const boundary = '===============7330845974216740156==';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelim = `\r\n--${boundary}--`;

    const metadataPart = `Content-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}`;
    const filePart = `Content-Type: ${mimeType || 'application/octet-stream'}\r\nContent-Transfer-Encoding: base64\r\n\r\n${fileData}`;

    const multipartBody = delimiter + metadataPart + delimiter + filePart + closeDelim;

    // Upload to Google Drive
    const driveResponse = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': `multipart/related; boundary="${boundary}"`,
        },
        body: multipartBody,
      }
    );

    if (!driveResponse.ok) {
      const errorText = await driveResponse.text();
      console.error('Drive upload error:', errorText);
      throw new Error('Failed to upload to Google Drive');
    }

    const uploadResult = await driveResponse.json();

    // Save file reference to Document entity
    await base44.entities.Document.create({
      project_id: projectId,
      title: fileName,
      file_name: fileName,
      file_url: `https://drive.google.com/uc?id=${uploadResult.id}`,
      category: 'drawing',
      status: 'issued',
      tags: ['blueprint', 'google-drive'],
      notes: `Google Drive ID: ${uploadResult.id}`,
    });

    return Response.json({
      success: true,
      fileId: uploadResult.id,
      fileName: uploadResult.name,
      driveLink: `https://drive.google.com/file/d/${uploadResult.id}/view`,
    });
  } catch (error) {
    console.error('Blueprint upload error:', error);
    return Response.json(
      { error: error.message || 'Failed to upload blueprint' },
      { status: 500 }
    );
  }
});