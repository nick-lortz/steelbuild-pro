/**
 * Backend Secret Validation Function
 * Called in CI/CD to prevent accidental secret commits
 * 
 * Usage: base44.functions.invoke('validateSecrets', { filePath: 'src/...', content: '...' })
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const SENSITIVE_PATTERNS = [
  { pattern: /api[_-]?key\s*[=:]\s*['"]{0,1}[a-z0-9\-._~+/]*/gi, name: 'API Key' },
  { pattern: /secret[_-]?key\s*[=:]\s*['"]{0,1}[a-z0-9\-._~+/]*/gi, name: 'Secret Key' },
  { pattern: /auth[_-]?token\s*[=:]\s*['"]{0,1}[a-z0-9\-._~+/]*/gi, name: 'Auth Token' },
  { pattern: /password\s*[=:]\s*['"]{0,1}[^\s'"]+/gi, name: 'Password' },
  { pattern: /sk_live_[a-z0-9]{20,}/gi, name: 'Stripe Live Key' },
  { pattern: /sk_test_[a-z0-9]{20,}/gi, name: 'Stripe Test Key' },
  { pattern: /ghp_[a-z0-9]{36,}/gi, name: 'GitHub Token' },
  { pattern: /bearer\s+[a-z0-9\-._~+/=]{20,}/gi, name: 'Bearer Token' },
  { pattern: /mongodb\+srv:\/\/[a-z0-9:@\.]+/gi, name: 'MongoDB URI' },
];

const SAFE_FILES = [
  'package-lock.json',
  'yarn.lock',
  '.git',
  'node_modules',
  'dist',
  '.next',
  'build'
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Only allow admin to run
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    const { filePath, content } = await req.json();

    if (!filePath || !content) {
      return Response.json({ error: 'Missing filePath or content' }, { status: 400 });
    }

    // Skip safe files
    const isSafe = SAFE_FILES.some(safe => filePath.includes(safe));
    if (isSafe) {
      return Response.json({ clean: true, message: 'File type safe, skipped' });
    }

    // Scan for secrets
    const findings = [];
    SENSITIVE_PATTERNS.forEach(({ pattern, name }) => {
      const matches = content.match(pattern);
      if (matches) {
        matches.forEach(match => {
          // Get line number
          const lineNum = content.substring(0, content.indexOf(match)).split('\n').length;
          
          findings.push({
            type: name,
            line: lineNum,
            match: match.substring(0, 30) + '...',
            severity: 'HIGH'
          });
        });
      }
    });

    // Respond
    if (findings.length > 0) {
      return Response.json({
        clean: false,
        findings,
        message: `Found ${findings.length} potential secret(s). Do not commit. Use .env for secrets.`
      }, { status: 200 });
    }

    return Response.json({
      clean: true,
      message: 'No secrets detected'
    }, { status: 200 });

  } catch (error) {
    return Response.json({
      error: error.message,
      clean: null // Fail safe - don't allow on error
    }, { status: 500 });
  }
});