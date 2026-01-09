import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // This function is meant to be called by scheduled tasks
    // It generates and emails reports based on configured schedules
    
    const { reportId } = await req.json();
    
    // Fetch the report configuration
    const reports = await base44.asServiceRole.entities.Report.filter({ id: reportId });
    const report = reports[0];
    
    if (!report) {
      return Response.json({ error: 'Report not found' }, { status: 404 });
    }
    
    if (!report.active) {
      return Response.json({ message: 'Report is not active' }, { status: 200 });
    }
    
    console.log(`[scheduleReportDelivery] Processing report: ${report.name}`);
    
    // Generate the report
    const reportData = await base44.asServiceRole.functions.invoke('generateReport', {
      reportType: report.report_type,
      projectIds: report.filters?.project_ids || [],
      dateRange: report.filters?.date_range || '30',
      format: 'json'
    });
    
    if (!reportData.data) {
      return Response.json({ error: 'Failed to generate report data' }, { status: 500 });
    }
    
    // Format email content
    const emailBody = formatReportEmail(reportData.data, report);
    
    // Send email to each recipient
    if (report.recipients && report.recipients.length > 0) {
      for (const recipient of report.recipients) {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: recipient,
          subject: `${report.name} - ${new Date().toLocaleDateString()}`,
          body: emailBody
        });
      }
    }
    
    // Update last_run timestamp
    await base44.asServiceRole.entities.Report.update(reportId, {
      last_run: new Date().toISOString()
    });
    
    console.log(`[scheduleReportDelivery] Report sent to ${report.recipients?.length || 0} recipients`);
    
    return Response.json({ 
      success: true, 
      reportName: report.name,
      recipientCount: report.recipients?.length || 0
    });
    
  } catch (error) {
    console.error('[scheduleReportDelivery] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function formatReportEmail(reportData, reportConfig) {
  let html = `
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; color: #333; }
          .header { background-color: #f59e0b; padding: 20px; color: white; }
          .content { padding: 20px; }
          .project { margin-bottom: 20px; border-bottom: 1px solid #ddd; padding-bottom: 15px; }
          .metric { display: inline-block; margin-right: 20px; }
          .label { font-weight: bold; color: #666; }
          .value { font-size: 18px; color: #000; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th { background-color: #f0f0f0; padding: 8px; text-align: left; }
          td { padding: 8px; border-bottom: 1px solid #ddd; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${reportConfig.name}</h1>
          <p>Generated: ${new Date(reportData.generatedAt).toLocaleString()}</p>
        </div>
        <div class="content">
  `;
  
  if (reportData.projects && reportData.projects.length > 0) {
    reportData.projects.forEach(proj => {
      html += `<div class="project">`;
      html += `<h2>${proj.projectNumber} - ${proj.name}</h2>`;
      
      if (reportConfig.report_type === 'financial') {
        html += `
          <div class="metric">
            <div class="label">Budget</div>
            <div class="value">$${proj.budget?.toLocaleString() || '0'}</div>
          </div>
          <div class="metric">
            <div class="label">Actual</div>
            <div class="value">$${proj.actual?.toLocaleString() || '0'}</div>
          </div>
          <div class="metric">
            <div class="label">Variance</div>
            <div class="value" style="color: ${proj.variance >= 0 ? 'green' : 'red'}">
              $${proj.variance?.toLocaleString() || '0'}
            </div>
          </div>
          <div class="metric">
            <div class="label">Billed</div>
            <div class="value">$${proj.billedToDate?.toLocaleString() || '0'}</div>
          </div>
        `;
      } else if (reportConfig.report_type === 'resource') {
        html += `
          <div class="metric">
            <div class="label">Total Resources</div>
            <div class="value">${proj.totalResources || 0}</div>
          </div>
          <div class="metric">
            <div class="label">Labor</div>
            <div class="value">${proj.labor || 0}</div>
          </div>
          <div class="metric">
            <div class="label">Equipment</div>
            <div class="value">${proj.equipment || 0}</div>
          </div>
          <div class="metric">
            <div class="label">Hours Logged</div>
            <div class="value">${proj.hoursLogged || 0} / ${proj.hoursEstimated || 0}</div>
          </div>
        `;
      } else if (reportConfig.report_type === 'detailing') {
        html += `
          <div class="metric">
            <div class="label">Total Sets</div>
            <div class="value">${proj.totalSets || 0}</div>
          </div>
          <div class="metric">
            <div class="label">FFF</div>
            <div class="value">${proj.statusBreakdown?.fff || 0}</div>
          </div>
          <div class="metric">
            <div class="label">Progress</div>
            <div class="value">${proj.percentComplete || 0}%</div>
          </div>
          <div class="metric">
            <div class="label">Overdue</div>
            <div class="value" style="color: ${proj.overdueSets > 0 ? 'red' : 'green'}">
              ${proj.overdueSets || 0}
            </div>
          </div>
        `;
      } else if (reportConfig.report_type === 'progress') {
        html += `
          <div class="metric">
            <div class="label">Total Tasks</div>
            <div class="value">${proj.totalTasks || 0}</div>
          </div>
          <div class="metric">
            <div class="label">Completed</div>
            <div class="value">${proj.completed || 0} (${proj.percentComplete || 0}%)</div>
          </div>
          <div class="metric">
            <div class="label">Blocked</div>
            <div class="value" style="color: ${proj.blocked > 0 ? 'red' : 'green'}">
              ${proj.blocked || 0}
            </div>
          </div>
        `;
      }
      
      html += `</div>`;
    });
  }
  
  html += `
        </div>
      </body>
    </html>
  `;
  
  return html;
}