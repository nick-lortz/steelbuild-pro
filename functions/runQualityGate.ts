import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Quality gate thresholds
const GATE_THRESHOLDS = {
  blocking: 0,      // FAIL if any CRITICAL
  high: 5,          // FAIL if >5 HIGH
  medium: 20,       // WARN if >20 MEDIUM
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const findings = [];
    const timestamp = new Date().toISOString();

    // 1. Backend Security
    console.log('[GATE] Scanning backend security...');
    findings.push(...await scanBackendSecurity());

    // 2. UI Theme Correctness
    console.log('[GATE] Scanning UI theme compliance...');
    findings.push(...await scanThemeCompliance());

    // 3. Navigation & State
    console.log('[GATE] Scanning navigation patterns...');
    findings.push(...await scanNavigationPatterns());

    // 4. Data Correctness
    console.log('[GATE] Scanning data validation...');
    findings.push(...await scanDataCorrectness());

    // Calculate gate result
    const gate = calculateGateResult(findings);
    
    // Generate diff-friendly summary
    const summary = generateSummary(findings, gate);

    // Save audit run
    const auditRun = await base44.asServiceRole.entities.AuditRun.create({
      started_at: timestamp,
      completed_at: new Date().toISOString(),
      status: gate.status,
      scope: 'QUALITY_GATE',
      triggered_by_user_id: user.email,
      counts: gate.counts,
      summary: JSON.stringify(summary),
    });

    // Save individual findings
    for (const finding of findings) {
      await base44.asServiceRole.entities.AuditFinding.create({
        audit_run_id: auditRun.id,
        ...finding,
      });
    }

    return Response.json({
      success: true,
      gate,
      audit_run_id: auditRun.id,
      timestamp,
      summary,
      findings: findings.slice(0, 100),
    });
  } catch (error) {
    console.error('[GATE] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

// ========================================
// BACKEND SECURITY SCANS
// ========================================
async function scanBackendSecurity() {
  const findings = [];
  
  // Check for functions without auth
  findings.push(...await scanFunctionAuth());
  
  // Check asServiceRole usage
  findings.push(...await scanServiceRoleUsage());
  
  // Check entity RLS coverage
  findings.push(...await scanRLSCoverage());
  
  return findings;
}

async function scanFunctionAuth() {
  const findings = [];
  const functionDir = './functions';
  
  try {
    for await (const entry of Deno.readDir(functionDir)) {
      if (!entry.isFile || !entry.name.endsWith('.js')) continue;
      
      const path = `${functionDir}/${entry.name}`;
      const content = await Deno.readTextFile(path);
      
      // Skip test, utility, and webhook files
      if (entry.name.startsWith('test') || 
          path.includes('/_lib/') || 
          path.includes('webhook') ||
          entry.name.includes('README')) continue;
      
      // Check for Deno.serve without auth.me()
      if (content.includes('Deno.serve') && 
          !content.includes('auth.me()') && 
          !content.includes('webhook') &&
          !content.includes('public')) {
        findings.push({
          severity: 'CRITICAL',
          category: 'AUTHZ',
          title: `Unauthenticated function: ${entry.name}`,
          description: 'Function has no auth.me() check',
          location: `functions/${entry.name}`,
          proposed_fix: 'Add: const user = await base44.auth.me(); if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });',
          auto_fixable: false,
        });
      }
      
      // Check asServiceRole without project check
      if (content.includes('asServiceRole') && 
          !content.includes('project_id') &&
          !content.includes('admin') &&
          !content.includes('AuditRun') &&
          !content.includes('AuditFinding')) {
        findings.push({
          severity: 'HIGH',
          category: 'AUTHZ',
          title: `Unchecked asServiceRole usage: ${entry.name}`,
          description: 'Using service role without project-level authorization',
          location: `functions/${entry.name}`,
          proposed_fix: 'Verify user has access to project_id before asServiceRole operations',
          auto_fixable: false,
        });
      }
    }
  } catch (error) {
    console.error('[GATE] Error scanning functions:', error);
  }
  
  return findings;
}

async function scanServiceRoleUsage() {
  // Additional service role checks - placeholder
  return [];
}

async function scanRLSCoverage() {
  const findings = [];
  const entitiesDir = './entities';
  
  try {
    for await (const entry of Deno.readDir(entitiesDir)) {
      if (!entry.isFile || !entry.name.endsWith('.json')) continue;
      
      const content = await Deno.readTextFile(`${entitiesDir}/${entry.name}`);
      const schema = JSON.parse(content);
      
      // Check if project-owned entity has RLS
      if (schema.properties?.project_id && !schema.rls) {
        findings.push({
          severity: 'HIGH',
          category: 'AUTHZ',
          title: `Missing RLS: ${schema.name}`,
          description: 'Project-owned entity has no RLS rules',
          location: `entities/${entry.name}`,
          proposed_fix: 'Add RLS rules to restrict access by project_id',
          auto_fixable: false,
        });
      }
    }
  } catch (error) {
    console.error('[GATE] Error scanning RLS:', error);
  }
  
  return findings;
}

// ========================================
// UI THEME COMPLIANCE
// ========================================
async function scanThemeCompliance() {
  const findings = [];
  
  const componentsDir = './components';
  const pagesDir = './pages';
  
  await scanDirectoryForTheme(componentsDir, findings);
  await scanDirectoryForTheme(pagesDir, findings);
  
  return findings;
}

async function scanDirectoryForTheme(dir, findings) {
  try {
    for await (const entry of Deno.readDir(dir)) {
      if (entry.isDirectory) {
        await scanDirectoryForTheme(`${dir}/${entry.name}`, findings);
      } else if (entry.name.endsWith('.jsx') || entry.name.endsWith('.js')) {
        const path = `${dir}/${entry.name}`;
        const content = await Deno.readTextFile(path);
        
        // Skip README and docs
        if (entry.name.includes('README') || entry.name.includes('.md')) continue;
        
        // Detect hardcoded hex colors
        const hexPattern = /#[0-9A-Fa-f]{6}\b|#[0-9A-Fa-f]{3}\b/g;
        const hexMatches = content.match(hexPattern) || [];
        
        // Allowed theme colors (from design system)
        const allowedHex = [
          '#0A0E13', '#151B24', '#FF6B2C', '#FF9D42', '#FFB84D',
          '#0A0A0A', '#0F0F0F', '#000000', '#E5E7EB', '#9CA3AF',
          '#6B7280', '#4B5563', '#3B82F6', '#EF4444', '#10B981', '#F59E0B'
        ];
        
        for (const hex of hexMatches) {
          if (!allowedHex.includes(hex.toUpperCase())) {
            findings.push({
              severity: 'MEDIUM',
              category: 'UI_ACTIONS',
              title: `Hardcoded color: ${hex}`,
              description: `Found hardcoded color ${hex} instead of design token`,
              location: path,
              proposed_fix: `Replace with CSS variable or Tailwind class`,
              auto_fixable: false,
            });
          }
        }
        
        // Detect rgb/rgba (not in comments)
        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (line.includes('//') && line.indexOf('rgb') > line.indexOf('//')) continue;
          if (line.match(/rgb\(|rgba\(/)) {
            findings.push({
              severity: 'MEDIUM',
              category: 'UI_ACTIONS',
              title: `Hardcoded rgb() color at line ${i + 1}`,
              description: 'Using rgb/rgba instead of design tokens',
              location: `${path}:${i + 1}`,
              proposed_fix: 'Use CSS variables or Tailwind classes',
              auto_fixable: false,
            });
          }
        }
      }
    }
  } catch (error) {
    // Directory doesn't exist or permission issue
    console.log(`[GATE] Skipping ${dir}:`, error.message);
  }
}

// ========================================
// NAVIGATION & STATE PRESERVATION
// ========================================
async function scanNavigationPatterns() {
  const findings = [];
  
  const pagesDir = './pages';
  
  try {
    for await (const entry of Deno.readDir(pagesDir)) {
      if (!entry.isFile || !entry.name.endsWith('.jsx')) continue;
      
      const path = `${pagesDir}/${entry.name}`;
      const content = await Deno.readTextFile(path);
      
      // Check for window.location.reload() which resets state
      if (content.includes('window.location.reload()')) {
        findings.push({
          severity: 'MEDIUM',
          category: 'UI_ACTIONS',
          title: `Hard reload detected: ${entry.name}`,
          description: 'Using window.location.reload() loses app state',
          location: path,
          proposed_fix: 'Use queryClient.invalidateQueries() instead',
          auto_fixable: false,
        });
      }
      
      // Check for missing key prop in lists (simplified check)
      const mapMatches = content.match(/\.map\([^)]+\)/g) || [];
      for (const mapCall of mapMatches) {
        const nextChars = content.substring(content.indexOf(mapCall) + mapCall.length, content.indexOf(mapCall) + mapCall.length + 200);
        if (!nextChars.includes('key=')) {
          findings.push({
            severity: 'LOW',
            category: 'UI_ACTIONS',
            title: `Potential missing key prop: ${entry.name}`,
            description: 'Map without visible key prop can cause re-renders',
            location: path,
            proposed_fix: 'Add key prop to mapped elements',
            auto_fixable: false,
          });
          break; // Only report once per file
        }
      }
    }
  } catch (error) {
    console.error('[GATE] Error scanning navigation:', error);
  }
  
  return findings;
}

// ========================================
// DATA CORRECTNESS
// ========================================
async function scanDataCorrectness() {
  const findings = [];
  
  // Scan for currency math without proper rounding
  await scanCurrencyMath(findings);
  
  // Scan for missing validation
  await scanMissingValidation(findings);
  
  return findings;
}

async function scanCurrencyMath(findings) {
  const dirs = ['./components', './pages', './functions'];
  
  for (const dir of dirs) {
    await scanDirectoryForCurrency(dir, findings);
  }
}

async function scanDirectoryForCurrency(dir, findings) {
  try {
    for await (const entry of Deno.readDir(dir)) {
      if (entry.isDirectory) {
        await scanDirectoryForCurrency(`${dir}/${entry.name}`, findings);
      } else if (entry.name.endsWith('.jsx') || entry.name.endsWith('.js')) {
        const path = `${dir}/${entry.name}`;
        const content = await Deno.readTextFile(path);
        
        // Skip docs
        if (entry.name.includes('README')) continue;
        
        // Check for currency operations without toFixed
        if ((content.includes('price') || content.includes('cost') || content.includes('amount') || content.includes('total')) &&
            content.match(/\+\s*\w+\.\w+|\*\s*\w+\.\w+/) &&
            !content.includes('toFixed') &&
            !content.includes('Math.round')) {
          findings.push({
            severity: 'HIGH',
            category: 'DATA_FLOW',
            title: `Unsafe currency math: ${entry.name}`,
            description: 'Currency calculation without rounding',
            location: path,
            proposed_fix: 'Use .toFixed(2) or Math.round() for currency',
            auto_fixable: false,
          });
        }
      }
    }
  } catch (error) {
    // Directory doesn't exist or can't read
  }
}

async function scanMissingValidation(findings) {
  const functionsDir = './functions';
  
  try {
    for await (const entry of Deno.readDir(functionsDir)) {
      if (!entry.isFile || !entry.name.endsWith('.js')) continue;
      
      const path = `${functionsDir}/${entry.name}`;
      const content = await Deno.readTextFile(path);
      
      // Skip README
      if (entry.name.includes('README')) continue;
      
      // Check for creates without project_id validation
      if (content.includes('.create(') && 
          content.includes('project_id') &&
          !content.includes('if (!') &&
          !content.includes('throw')) {
        findings.push({
          severity: 'MEDIUM',
          category: 'DATA_FLOW',
          title: `Missing validation: ${entry.name}`,
          description: 'Entity creation without input validation',
          location: path,
          proposed_fix: 'Add validation: if (!project_id) throw new Error(...)',
          auto_fixable: false,
        });
      }
    }
  } catch (error) {
    console.error('[GATE] Error scanning validation:', error);
  }
}

// ========================================
// GATE CALCULATION
// ========================================
function calculateGateResult(findings) {
  const counts = {
    CRITICAL: findings.filter(f => f.severity === 'CRITICAL').length,
    HIGH: findings.filter(f => f.severity === 'HIGH').length,
    MEDIUM: findings.filter(f => f.severity === 'MEDIUM').length,
    LOW: findings.filter(f => f.severity === 'LOW').length,
  };
  
  let status = 'PASS';
  const blockers = [];
  
  if (counts.CRITICAL > GATE_THRESHOLDS.blocking) {
    status = 'FAIL';
    blockers.push(`${counts.CRITICAL} CRITICAL issues (threshold: ${GATE_THRESHOLDS.blocking})`);
  }
  
  if (counts.HIGH > GATE_THRESHOLDS.high) {
    status = 'FAIL';
    blockers.push(`${counts.HIGH} HIGH severity issues (threshold: ${GATE_THRESHOLDS.high})`);
  }
  
  if (counts.MEDIUM > GATE_THRESHOLDS.medium) {
    if (status === 'PASS') status = 'WARN';
    blockers.push(`${counts.MEDIUM} MEDIUM issues (threshold: ${GATE_THRESHOLDS.medium})`);
  }
  
  return {
    status,
    counts,
    blockers,
    total: findings.length,
  };
}

function generateSummary(findings, gate) {
  const byCategory = findings.reduce((acc, f) => {
    acc[f.category] = (acc[f.category] || 0) + 1;
    return acc;
  }, {});
  
  const bySeverity = gate.counts;
  
  return {
    gate_status: gate.status,
    total_findings: gate.total,
    by_severity: bySeverity,
    by_category: byCategory,
    blockers: gate.blockers,
  };
}