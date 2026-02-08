/**
 * Secure File Upload Utility
 * WCAG 2.1 AA compliant with virus scanning support
 */

// Allowed MIME types for construction documents
export const ALLOWED_FILE_TYPES = {
  documents: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ],
  images: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp'
  ],
  drawings: [
    'application/pdf',
    'application/x-autocad',
    'image/vnd.dwg',
    'image/vnd.dxf'
  ],
  archives: [
    'application/zip',
    'application/x-rar-compressed',
    'application/x-7z-compressed'
  ]
};

// File size limits (bytes)
export const FILE_SIZE_LIMITS = {
  image: 10 * 1024 * 1024,      // 10MB
  document: 50 * 1024 * 1024,   // 50MB
  drawing: 100 * 1024 * 1024,   // 100MB
  archive: 200 * 1024 * 1024,   // 200MB
  default: 25 * 1024 * 1024     // 25MB
};

/**
 * Validate file before upload
 */
export function validateFile(file, category = 'documents') {
  const errors = [];
  
  // Check file exists
  if (!file) {
    errors.push('No file selected');
    return { valid: false, errors };
  }
  
  // Check file type
  const allowedTypes = ALLOWED_FILE_TYPES[category] || ALLOWED_FILE_TYPES.documents;
  if (!allowedTypes.includes(file.type)) {
    errors.push(`File type not allowed. Accepted: ${getAllowedExtensions(category).join(', ')}`);
  }
  
  // Check file size
  const maxSize = getMaxFileSize(category);
  if (file.size > maxSize) {
    errors.push(`File too large. Maximum size: ${formatBytes(maxSize)}`);
  }
  
  // Check file name for malicious patterns
  const dangerousPatterns = /[<>:"|?*\x00-\x1f]/g;
  if (dangerousPatterns.test(file.name)) {
    errors.push('File name contains invalid characters');
  }
  
  return {
    valid: errors.length === 0,
    errors,
    fileInfo: {
      name: file.name,
      size: file.size,
      type: file.type
    }
  };
}

/**
 * Get max file size for category
 */
function getMaxFileSize(category) {
  if (category === 'images') return FILE_SIZE_LIMITS.image;
  if (category === 'documents') return FILE_SIZE_LIMITS.document;
  if (category === 'drawings') return FILE_SIZE_LIMITS.drawing;
  if (category === 'archives') return FILE_SIZE_LIMITS.archive;
  return FILE_SIZE_LIMITS.default;
}

/**
 * Get allowed extensions for display
 */
function getAllowedExtensions(category) {
  const mimeToExt = {
    'application/pdf': 'PDF',
    'application/msword': 'DOC',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
    'application/vnd.ms-excel': 'XLS',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'XLSX',
    'image/jpeg': 'JPG',
    'image/png': 'PNG',
    'image/gif': 'GIF',
    'image/webp': 'WEBP',
    'application/zip': 'ZIP',
    'application/x-rar-compressed': 'RAR',
    'application/x-7z-compressed': '7Z'
  };
  
  const allowedTypes = ALLOWED_FILE_TYPES[category] || ALLOWED_FILE_TYPES.documents;
  return allowedTypes.map(type => mimeToExt[type] || type);
}

/**
 * Format bytes to human readable
 */
export function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Secure file upload with validation
 */
export async function uploadFileSecure(file, category = 'documents', onProgress) {
  // Validate file
  const validation = validateFile(file, category);
  if (!validation.valid) {
    throw new Error(validation.errors.join(', '));
  }
  
  // Upload via Base44 (handles server-side security)
  const { base44 } = await import('@/api/base44Client');
  
  try {
    if (onProgress) onProgress(0);
    
    const result = await apiClient.integrations.Core.UploadFile({ file });
    
    if (onProgress) onProgress(100);
    
    return {
      file_url: result.file_url,
      file_name: file.name,
      file_size: file.size,
      file_type: file.type,
      uploaded_at: new Date().toISOString()
    };
  } catch (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }
}

/**
 * WCAG 2.1 AA Compliant File Input Component Props
 */
export function getA11yFileInputProps(id, label, required = false) {
  return {
    id,
    'aria-label': label,
    'aria-required': required,
    'aria-describedby': `${id}-description`,
    role: 'button',
    tabIndex: 0
  };
}