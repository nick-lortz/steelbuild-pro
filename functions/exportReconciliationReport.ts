/**
 * exportReconciliationReport — CSV + PDF export of reconciliation findings
 * =========================================================================
 * POST { run_id?, project_id?, format: 'csv'|'pdf', severity_filter? }
 * Returns file download (Content-Disposition: attachment).
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const n = (v) => Number(v) || 0;
const fmtUSD = (v) => `$${n(v).toFixed(2)}`;

function escapeCsv(v) {
  const s = String(v == null ? '' : v);
  return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
}

function buildCSV(findings) {
  const headers = ['run_id','project_id','severity','category','check_name','description','expected','actual','delta','status','created_at'];
  const rows = findings.map(f => headers.map(h => escapeCsv(f[h])).join(','));
  return [headers.join(','), ...rows].join('\r\n');
}

function buildPDFHTML(findings, run) {
  const rows = findings.map(f => `
    <tr style="background:${f.severity==='critical'?'#fff0f0':f.severity==='high'?'#fff8ee':'#fff'}">
      <td>${f.project_id || ''}</td>
      <td><b style="color:${f.severity==='critical'?'#c00':f.severity==='high'?'#e65':f.severity==='medium'?'#996600':'#333'}">${(f.severity||'').toUpperCase()}</b></td>
      <td>${f.category || ''}</td>
      <td>${f.check_name || ''}</td>
      <td>${f.description || ''}</td>
      <td style="text-align:right">${fmtUSD(f.expected)}</td>
      <td style="text-align:right">${fmtUSD(f.actual)}</td>
      <td style="text-align:right;color:${n(f.delta)<0?'#c00':'#060'}">${fmtUSD(f.delta)}</td>
      <td>${f.status || ''}</td>
    </tr>`).join('');

  const critical = findings.filter(f=>f.severity==='critical').length;
  const high     = findings.filter(f=>f.severity==='high').length;

  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>body{font-family:Arial,sans-serif;font-size:11px;margin:24px}
h1{font-size:16px;margin-bottom:4px}
h2{font-size:13px;color:#555;font-weight:normal;margin-top:0}
.badge{display:inline-block;padding:2px 8px;border-radius:999px;font-size:10px;font-weight:bold}
.critical{background:#ffecec;color:#c00;border:1px solid #fcc}
.high{background:#fff3e0;color:#e65;border:1px solid #f5c6a0}
table{width:100%;border-collapse:collapse;margin-top:16px}
th{background:#222;color:#fff;padding:6px 8px;text-align:left;font-size:10px}
td{padding:5px 8px;border-bottom:1px solid #eee;vertical-align:top}
.footer{margin-top:24px;font-size:9px;color:#999}
</style></head><body>
<h1>Financial Reconciliation Report</h1>
<h2>Run: ${run?.run_id || 'N/A'} &nbsp;|&nbsp; Generated: ${new Date().toLocaleString()}</h2>
<div>
  <span class="badge critical">${critical} Critical</span>&nbsp;
  <span class="badge high">${high} High</span>&nbsp;
  <span>${findings.filter(f=>f.severity==='medium').length} Medium</span>&nbsp;
  <span>${findings.filter(f=>f.severity==='low').length} Low</span>
  &nbsp; — Total: ${findings.length} mismatches
</div>
<table>
<thead><tr>
  <th>Project</th><th>Severity</th><th>Category</th><th>Check</th>
  <th>Description</th><th>Expected</th><th>Actual</th><th>Delta</th><th>Status</th>
</tr></thead>
<tbody>${rows}</tbody>
</table>
<div class="footer">SteelBuild Pro — Confidential Financial Report. Do not distribute externally without authorization.</div>
</body></html>`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin' && user.role !== 'project_manager') {
      return Response.json({ error: 'PM or Admin required' }, { status: 403 });
    }

    const { run_id, project_id, format = 'csv', severity_filter } = await req.json();

    // Fetch findings
    const filter = {};
    if (run_id) filter.audit_run_id = run_id;
    if (project_id) filter.project_id = project_id;
    if (severity_filter) filter.severity = severity_filter;

    const [findings, runs] = await Promise.all([
      base44.asServiceRole.entities.AuditFinding.filter(filter),
      run_id ? base44.asServiceRole.entities.AuditRun.filter({ run_id }) : Promise.resolve([]),
    ]);

    const run = runs[0] || null;
    const filename = `reconciliation-${run_id || project_id || 'all'}-${new Date().toISOString().slice(0, 10)}`;

    if (format === 'csv') {
      const csv = buildCSV(findings);
      return new Response(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${filename}.csv"`,
        },
      });
    }

    if (format === 'pdf') {
      const html = buildPDFHTML(findings, run);
      // Return as HTML for browser print-to-PDF; or use jsPDF server-side
      return new Response(html, {
        status: 200,
        headers: {
          'Content-Type': 'text/html',
          'Content-Disposition': `inline; filename="${filename}.html"`,
        },
      });
    }

    return Response.json({ error: `Unknown format: ${format}` }, { status: 400 });

  } catch (error) {
    console.error('exportReconciliationReport error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});