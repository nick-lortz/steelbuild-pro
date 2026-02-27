import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    const { project_id, format, filters, timeframe, reportData } = payload;

    if (!project_id || !format || !reportData) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Build report content
    if (format === 'csv') {
      return buildCSVReport(reportData);
    } else if (format === 'pdf') {
      return buildPDFReport(reportData, project_id, timeframe);
    } else {
      return Response.json({ error: 'Invalid format' }, { status: 400 });
    }
  } catch (error) {
    console.error('Export error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function buildCSVReport(reportData) {
  const { kpis, rfis, tasks, cos } = reportData;

  let csv = 'Project Report - CSV Export\n';
  csv += `Generated: ${new Date().toISOString()}\n\n`;

  // KPIs Section
  csv += 'KEY PERFORMANCE INDICATORS\n';
  csv += 'Metric,Value\n';
  csv += `Gross Margin,$${kpis.grossMargin.toLocaleString()}\n`;
  csv += `Gross Margin %,${kpis.grossMarginPct}%\n`;
  csv += `Budget Spent,$${kpis.totalActual.toLocaleString()}\n`;
  csv += `Forecast at Completion,$${kpis.totalForecast.toLocaleString()}\n`;
  csv += `Overall Progress,${kpis.overallProgress}%\n`;
  csv += `RFI Blockers,${kpis.rfiBlockers}\n`;
  csv += `Aging RFIs,${kpis.agingRFIs}\n`;
  csv += `Fabrication Ready,${kpis.fabricationReady}\n`;
  csv += `Erection Ready,${kpis.erectionReady}\n`;
  csv += `Pending Change Orders,${kpis.pendingCOs}\n\n`;

  // RFI Summary
  csv += 'RFI SUMMARY\n';
  csv += 'RFI #,Subject,Status,Days Open,Blocker\n';
  rfis.slice(0, 10).forEach(rfi => {
    const daysOpen = Math.floor((new Date() - new Date(rfi.created_date)) / 86400000);
    const blocker = (rfi.is_release_blocker || rfi.is_install_blocker) ? 'Yes' : 'No';
    csv += `RFI-${rfi.rfi_number},"${rfi.subject}",${rfi.status},${daysOpen},${blocker}\n`;
  });
  csv += '\n';

  // Change Order Summary
  csv += 'CHANGE ORDER SUMMARY\n';
  csv += 'CO #,Title,Status,Cost Impact\n';
  cos.slice(0, 10).forEach(co => {
    csv += `CO-${co.co_number},"${co.title}",${co.status},$${(co.cost_impact || 0).toLocaleString()}\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  return Response.json({ 
    file_url: url,
    message: 'CSV exported successfully'
  });
}

function buildPDFReport(reportData, projectId, timeframe) {
  const { kpis, rfis, tasks, cos } = reportData;

  // Generate simple HTML table (for basic PDF export)
  let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        h1 { color: #1f2937; border-bottom: 2px solid #3b82f6; padding-bottom: 10px; }
        h2 { color: #374151; margin-top: 30px; font-size: 16px; }
        table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        th { background: #3b82f6; color: white; padding: 8px; text-align: left; font-size: 12px; }
        td { padding: 8px; border-bottom: 1px solid #e5e7eb; font-size: 12px; }
        tr:nth-child(even) { background: #f9fafb; }
        .kpi-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0; }
        .kpi-box { padding: 15px; border: 1px solid #ddd; border-radius: 4px; }
        .kpi-label { font-size: 11px; color: #6b7280; text-transform: uppercase; }
        .kpi-value { font-size: 24px; font-weight: bold; color: #1f2937; margin-top: 5px; }
        .footer { margin-top: 40px; font-size: 10px; color: #9ca3af; }
      </style>
    </head>
    <body>
      <h1>Project Report — ${timeframe}</h1>
      <p>Generated: ${new Date().toLocaleDateString()}</p>

      <h2>Executive Summary</h2>
      <div class="kpi-grid">
        <div class="kpi-box">
          <div class="kpi-label">Gross Margin</div>
          <div class="kpi-value">$${kpis.grossMargin.toLocaleString()}</div>
          <p style="font-size: 11px; margin: 5px 0 0 0; color: #6b7280;">${kpis.grossMarginPct}% of revised contract</p>
        </div>
        <div class="kpi-box">
          <div class="kpi-label">Budget Spent</div>
          <div class="kpi-value">${((kpis.totalActual / kpis.totalBudget) * 100).toFixed(0)}%</div>
          <p style="font-size: 11px; margin: 5px 0 0 0; color: #6b7280;">$${kpis.totalActual.toLocaleString()} / $${kpis.totalBudget.toLocaleString()}</p>
        </div>
        <div class="kpi-box">
          <div class="kpi-label">Overall Progress</div>
          <div class="kpi-value">${kpis.overallProgress}%</div>
        </div>
        <div class="kpi-box">
          <div class="kpi-label">RFI Blockers</div>
          <div class="kpi-value">${kpis.rfiBlockers}</div>
          <p style="font-size: 11px; margin: 5px 0 0 0; color: #6b7280;">${kpis.agingRFIs} aging (14d+)</p>
        </div>
      </div>

      <h2>Open RFIs (Top 10)</h2>
      <table>
        <tr>
          <th>RFI #</th>
          <th>Subject</th>
          <th>Status</th>
          <th>Days Open</th>
          <th>Blocker</th>
        </tr>
        ${rfis.slice(0, 10).map(rfi => {
          const daysOpen = Math.floor((new Date() - new Date(rfi.created_date)) / 86400000);
          const blocker = (rfi.is_release_blocker || rfi.is_install_blocker) ? '✓' : '—';
          return `<tr>
            <td>RFI-${rfi.rfi_number}</td>
            <td>${rfi.subject}</td>
            <td>${rfi.status}</td>
            <td>${daysOpen}</td>
            <td>${blocker}</td>
          </tr>`;
        }).join('')}
      </table>

      <h2>Pending Change Orders (Top 10)</h2>
      <table>
        <tr>
          <th>CO #</th>
          <th>Title</th>
          <th>Status</th>
          <th>Cost Impact</th>
        </tr>
        ${cos.slice(0, 10).map(co => `<tr>
          <td>CO-${co.co_number}</td>
          <td>${co.title}</td>
          <td>${co.status}</td>
          <td>$${(co.cost_impact || 0).toLocaleString()}</td>
        </tr>`).join('')}
      </table>

      <div class="footer">
        <p>This report is for internal project management use only.</p>
        <p>For questions, contact your Project Manager.</p>
      </div>
    </body>
    </html>
  `;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  return Response.json({ 
    file_url: url,
    message: 'PDF report generated (HTML format for browser download)'
  });
}