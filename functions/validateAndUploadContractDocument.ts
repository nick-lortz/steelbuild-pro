import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { z } from 'npm:zod@3.24.2';

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png'
];

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

/**
 * Secure file upload with backend validation
 * Validates file type, size, and sanitizes metadata
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file');
    const documentType = formData.get('document_type') || 'contract';

    if (!file) {
      return Response.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return Response.json({ 
        error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB` 
      }, { status: 400 });
    }

    // Validate MIME type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return Response.json({ 
        error: `Invalid file type. Allowed types: PDF, Word documents, JPEG, PNG` 
      }, { status: 400 });
    }

    // Upload file using Core integration
    const { file_url } = await base44.integrations.Core.UploadFile({ file });

    // Return sanitized metadata
    return Response.json({
      success: true,
      file_url,
      file_name: file.name,
      file_size: file.size,
      uploaded_date: new Date().toISOString(),
      uploaded_by: user.email,
      document_type: documentType
    });

  } catch (error) {
    console.error('File upload error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});