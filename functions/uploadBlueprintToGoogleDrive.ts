import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectName, fileName, fileData, mimeType } = await req.json();

    if (!projectName || !fileName || !fileData) {
      return Response.json(
        { error: 'projectName, fileName, and fileData required' },
        { status: 400 }
      );
    }

    // Get access token for Google Drive
    const accessToken = await base44.asServiceRole.connectors.getAccessToken('googledrive');

    // Create project folder if it doesn't exist
    const folderQuery = encodeURIComponent(
      `name='${projectName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`
    );

    const searchResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${folderQuery}&spaces=drive&pageSize=1`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    const searchData = await searchResponse.json();
    let folderId = searchData.files?.[0]?.id;

    // Create folder if not found
    if (!folderId) {
      const createFolderResponse = await fetch(
        'https://www.googleapis.com/drive/v3/files?supportsAllDrives=true',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: projectName,
            mimeType: 'application/vnd.google-apps.folder',
            properties: {
              project_id: projectName,
            },
          }),
        }
      );

      const folderData = await createFolderResponse.json();
      folderId = folderData.id;
    }

    // Decode base64 file data
    const binaryString = atob(fileData.split(',')[1] || fileData);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Upload file to project folder
    const uploadUrl = 'https://www.googleapis.com/upload/drive/v3/files?supportsAllDrives=true&uploadType=multipart';

    const metadata = {
      name: fileName,
      parents: [folderId],
      description: `Blueprint for project: ${projectName}`,
      properties: {
        document_type: 'blueprint',
      },
    };

    const boundary = '===============1234567890==';
    const body = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(
      metadata
    )}\r\n--${boundary}\r\nContent-Type: ${mimeType || 'application/pdf'}\r\n\r\n`;

    const bodyBytes = new TextEncoder().encode(body);
    const footerBytes = new TextEncoder().encode(`\r\n--${boundary}--`);

    const uploadBody = new Uint8Array(bodyBytes.length + bytes.length + footerBytes.length);
    uploadBody.set(bodyBytes, 0);
    uploadBody.set(bytes, bodyBytes.length);
    uploadBody.set(footerBytes, bodyBytes.length + bytes.length);

    const uploadResponse = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary="${boundary}"`,
      },
      body: uploadBody,
    });

    if (!uploadResponse.ok) {
      throw new Error(`Drive upload failed: ${uploadResponse.statusText}`);
    }

    const fileData_resp = await uploadResponse.json();

    return Response.json({
      success: true,
      fileId: fileData_resp.id,
      fileName: fileData_resp.name,
      projectFolder: folderId,
      webViewLink: `https://drive.google.com/file/d/${fileData_resp.id}/view`,
    });
  } catch (error) {
    console.error('Blueprint upload error:', error);
    return Response.json(
      { error: error.message || 'Failed to upload blueprint' },
      { status: 500 }
    );
  }
});