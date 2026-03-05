/**
 * Enhanced File Validation — Magic-byte verification + extension blocking
 * 
 * Supplements client-side MIME check with actual file header inspection.
 * Blocks dangerous double extensions (e.g., report.pdf.exe).
 */

// Magic bytes for common file types
const MAGIC_BYTES = {
  'application/pdf':  [0x25, 0x50, 0x44, 0x46], // %PDF
  'image/jpeg':       [0xFF, 0xD8, 0xFF],
  'image/png':        [0x89, 0x50, 0x4E, 0x47],  // .PNG
  'image/gif':        [0x47, 0x49, 0x46],         // GIF
  'image/webp':       [0x52, 0x49, 0x46, 0x46],   // RIFF (WebP container)
  'application/zip':  [0x50, 0x4B, 0x03, 0x04],   // PK..
};

// Dangerous extensions that should never be uploaded
const BLOCKED_EXTENSIONS = [
  '.exe', '.bat', '.cmd', '.com', '.scr', '.pif',
  '.vbs', '.vbe', '.js', '.jse', '.wsf', '.wsh',
  '.ps1', '.psm1', '.msi', '.msp', '.dll', '.sys',
  '.cpl', '.hta', '.inf', '.reg', '.rgs', '.sct',
  '.shb', '.shs', '.lnk', '.url', '.iso', '.img',
];

/**
 * Read first N bytes of a file as Uint8Array
 */
async function readFileHeader(file, byteCount = 8) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(new Uint8Array(reader.result));
    };
    reader.onerror = () => reject(new Error('Failed to read file header'));
    reader.readAsArrayBuffer(file.slice(0, byteCount));
  });
}

/**
 * Verify file magic bytes match declared MIME type
 */
export async function verifyFileMagicBytes(file) {
  const expectedBytes = MAGIC_BYTES[file.type];
  
  // If we don't have magic bytes for this type, allow (Office docs, CSV, etc. have complex headers)
  if (!expectedBytes) return { valid: true, reason: 'no-magic-bytes-check' };

  const header = await readFileHeader(file, expectedBytes.length);

  for (let i = 0; i < expectedBytes.length; i++) {
    if (header[i] !== expectedBytes[i]) {
      return {
        valid: false,
        reason: `File header does not match declared type ${file.type}. Possible MIME spoofing.`,
      };
    }
  }

  return { valid: true, reason: 'magic-bytes-match' };
}

/**
 * Check for dangerous file extensions (including double extensions)
 */
export function checkDangerousExtension(filename) {
  if (!filename) return { safe: false, reason: 'No filename' };

  const lower = filename.toLowerCase();

  // Check all extensions in the filename (catches report.pdf.exe)
  const parts = lower.split('.');
  for (let i = 1; i < parts.length; i++) {
    const ext = '.' + parts[i];
    if (BLOCKED_EXTENSIONS.includes(ext)) {
      return { safe: false, reason: `Blocked file extension: ${ext}` };
    }
  }

  // Check for null bytes in filename (path traversal)
  if (filename.includes('\0') || filename.includes('..')) {
    return { safe: false, reason: 'Filename contains path traversal characters' };
  }

  // Check length
  if (filename.length > 255) {
    return { safe: false, reason: 'Filename too long (max 255 chars)' };
  }

  return { safe: true };
}

/**
 * Full file validation pipeline — call before any upload
 * 
 * @param {File} file
 * @param {string} category - 'documents' | 'images' | 'drawings' | 'archives'
 * @returns {Promise<{valid: boolean, errors: string[]}>}
 */
export async function validateFileEnhanced(file, category = 'documents') {
  const errors = [];

  if (!file) {
    return { valid: false, errors: ['No file selected'] };
  }

  // 1. Extension check
  const extCheck = checkDangerousExtension(file.name);
  if (!extCheck.safe) {
    errors.push(extCheck.reason);
  }

  // 2. Magic byte check
  try {
    const magicCheck = await verifyFileMagicBytes(file);
    if (!magicCheck.valid) {
      errors.push(magicCheck.reason);
    }
  } catch {
    // If we can't read the header, still allow but log
    console.warn('Could not verify file magic bytes for:', file.name);
  }

  // 3. Size check (import limits from existing config)
  const SIZE_LIMITS = {
    images: 10 * 1024 * 1024,
    documents: 50 * 1024 * 1024,
    drawings: 100 * 1024 * 1024,
    archives: 200 * 1024 * 1024,
  };
  const maxSize = SIZE_LIMITS[category] || 25 * 1024 * 1024;
  if (file.size > maxSize) {
    errors.push(`File size (${(file.size / 1024 / 1024).toFixed(1)}MB) exceeds ${(maxSize / 1024 / 1024).toFixed(0)}MB limit for ${category}`);
  }

  // 4. Zero-byte file check
  if (file.size === 0) {
    errors.push('File is empty (0 bytes)');
  }

  return { valid: errors.length === 0, errors };
}