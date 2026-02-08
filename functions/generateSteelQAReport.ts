import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { drawing_set_id } = await req.json();

    if (!drawing_set_id) {
      return Response.json({ error: 'drawing_set_id required' }, { status: 400 });
    }

    const [drawingSet] = await base44.entities.DrawingSet.filter({ id: drawing_set_id });
    if (!drawingSet) {
      return Response.json({ error: 'Drawing set not found' }, { status: 404 });
    }

    const blockers = drawingSet.qa_blockers || [];
    const p0Issues = blockers.filter(b => b.severity === 'P0');
    const p1Issues = blockers.filter(b => b.severity === 'P1');

    // Group by sheet for readability
    const bySheet = {};
    blockers.forEach(blocker => {
      if (!bySheet[blocker.sheet_number]) {
        bySheet[blocker.sheet_number] = [];
      }
      bySheet[blocker.sheet_number].push(blocker);
    });

    // Generate HTML report
    const reportHTML = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
    h1 { border-bottom: 3px solid #c85d00; padding-bottom: 10px; }
    .header { background: #f5f5f5; padding: 15px; border-radius: 4px; margin-bottom: 20px; }
    .status-pass { color: #22c55e; font-weight: bold; }
    .status-fail { color: #ef4444; font-weight: bold; }
    .summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin: 20px 0; }
    .metric { background: #f9fafb; padding: 15px; border-radius: 4px; border-left: 4px solid #c85d00; }
    .metric-value { font-size: 24px; font-weight: bold; }
    .metric-label { color: #6b7280; font-size: 12px; }
    .section { margin: 30px 0; }
    .p0-list { background: #fee2e2; padding: 15px; border-radius: 4px; border-left: 4px solid #dc2626; margin-bottom: 15px; }
    .p1-list { background: #fef3c7; padding: 15px; border-radius: 4px; border-left: 4px solid #f59e0b; margin-bottom: 15px; }
    .issue { margin: 8px 0; padding: 8px; background: rgba(255,255,255,0.5); border-radius: 2px; }
    .issue-sheet { font-weight: bold; color: #1f2937; font-family: monospace; }
    .issue-msg { color: #4b5563; font-size: 14px; }
    .sheet-section { margin: 15px 0; }
    .sheet-title { background: #e5e7eb; padding: 8px 12px; border-radius: 3px; font-weight: bold; }
    table { width: 100%; border-collapse: collapse; margin: 15px 0; }
    th { background: #f3f4f6; padding: 10px; text-align: left; border-bottom: 2px solid #d1d5db; }
    td { padding: 10px; border-bottom: 1px solid #e5e7eb; }
    tr:hover { background: #f9fafb; }
    .footer { color: #6b7280; font-size: 12px; margin-top: 30px; border-top: 1px solid #e5e7eb; padding-top: 15px; }
  </style>
</head>
<body>
  <h1>Steel QA Report</h1>
  
  <div class="header">
    <div><strong>Drawing Set:</strong> ${drawingSet.set_name}</div>
    <div><strong>Revision:</strong> ${drawingSet.current_revision}</div>
    <div><strong>Status:</strong> <span class="${drawingSet.qa_status === 'pass' ? 'status-pass' : 'status-fail'}">${drawingSet.qa_status.toUpperCase()}</span></div>
    <div><strong>Report Date:</strong> ${new Date().toLocaleString()}</div>
  </div>

  <div class="summary">
    <div class="metric">
      <div class="metric-value">${blockers.length}</div>
      <div class="metric-label">Total Issues</div>
    </div>
    <div class="metric">
      <div class="metric-value" style="color: #dc2626;">${p0Issues.length}</div>
      <div class="metric-label">P0 Critical</div>
    </div>
    <div class="metric">
      <div class="metric-value" style="color: #f59e0b;">${p1Issues.length}</div>
      <div class="metric-label">P1 Warnings</div>
    </div>
  </div>

  ${p0Issues.length > 0 ? `
  <div class="section">
    <h2>P0 Critical Issues (Must Fix Before FFF)</h2>
    <div class="p0-list">
      ${p0Issues.map(issue => `
        <div class="issue">
          <div class="issue-sheet">${issue.sheet_number}${issue.detail_number ? ' / ' + issue.detail_number : ''}</div>
          <div class="issue-msg"><strong>${issue.rule}:</strong> ${issue.message}</div>
        </div>
      `).join('')}
    </div>
  </div>
  ` : ''}

  ${p1Issues.length > 0 ? `
  <div class="section">
    <h2>P1 Warnings (Review)</h2>
    <div class="p1-list">
      ${p1Issues.map(issue => `
        <div class="issue">
          <div class="issue-sheet">${issue.sheet_number}${issue.detail_number ? ' / ' + issue.detail_number : ''}</div>
          <div class="issue-msg"><strong>${issue.rule}:</strong> ${issue.message}</div>
        </div>
      `).join('')}
    </div>
  </div>
  ` : ''}

  <div class="section">
    <h2>Issues by Sheet</h2>
    <table>
      <thead>
        <tr>
          <th>Sheet</th>
          <th>Critical (P0)</th>
          <th>Warnings (P1)</th>
        </tr>
      </thead>
      <tbody>
        ${Object.entries(bySheet).map(([sheet, issues]) => {
          const p0 = issues.filter(i => i.severity === 'P0').length;
          const p1 = issues.filter(i => i.severity === 'P1').length;
          return `
            <tr>
              <td><strong>${sheet}</strong></td>
              <td style="color: ${p0 > 0 ? '#dc2626' : '#6b7280'}">${p0}</td>
              <td style="color: ${p1 > 0 ? '#f59e0b' : '#6b7280'}">${p1}</td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  </div>

  <div class="section">
    <h2>Recommendations</h2>
    ${p0Issues.length > 0 ? `
      <p><strong style="color: #dc2626;">Cannot release for fabrication until all P0 issues are resolved.</strong></p>
      <ul>
        <li>Review and address each critical issue</li>
        <li>Resubmit revised drawings for QA verification</li>
        <li>Update RFI responses if applicable</li>
      </ul>
    ` : `
      <p><strong style="color: #22c55e;">✓ Ready for fabrication release.</strong></p>
      ${p1Issues.length > 0 ? `<p>Address P1 warnings before erection phase.</p>` : ''}
    `}
  </div>

  <div class="footer">
    <p>Report generated by Steel QA automation | ${new Date().toLocaleString()}</p>
  </div>
</body>
</html>
    `;

    // Save as document
    const doc = await base44.asServiceRole.entities.Document.create({
      project_id: drawingSet.project_id,
      title: `Steel QA Report - ${drawingSet.set_name} Rev ${drawingSet.current_revision}`,
      category: 'report',
      status: 'issued',
      file_url: `data:text/html;base64,${btoa(reportHTML)}`,
      file_name: `SteelQA_${drawingSet.set_name.replace(/\s+/g, '_')}_${drawingSet.current_revision}.html`,
      description: `Automated Steel QA report - ${p0Issues.length} critical, ${p1Issues.length} warnings`
    });

    return Response.json({
      success: true,
      report_id: doc.id,
      p0_count: p0Issues.length,
      p1_count: p1Issues.length,
      qa_status: drawingSet.qa_status,
      html: reportHTML
    });
  } catch (error) {
    console.error('Report generation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});