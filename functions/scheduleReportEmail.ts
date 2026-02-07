import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { 
      report_type, 
      recipients, 
      frequency = 'weekly', 
      project_id = null,
      include_pdf = true 
    } = await req.json();

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return Response.json({ error: 'Recipients required' }, { status: 400 });
    }

    // Generate report data
    let reportData;
    if (report_type === 'dashboard') {
      const response = await base44.functions.invoke('getDashboardData', {
        page: 1,
        pageSize: 100,
        search: '',
        status: 'all',
        risk: 'all',
        sort: 'risk'
      });
      reportData = response.data;
    } else if (report_type === 'work_package' && project_id) {
      const workPackages = await base44.entities.WorkPackage.filter({ project_id });
      reportData = { workPackages };
    } else {
      return Response.json({ error: 'Invalid report_type or missing project_id' }, { status: 400 });
    }

    // Build email content
    const subject = `${frequency.charAt(0).toUpperCase() + frequency.slice(1)} Report - ${report_type === 'dashboard' ? 'Portfolio Dashboard' : 'Work Package Status'}`;
    
    let emailBody = `<html><body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">`;
    emailBody += `<h2>${subject}</h2>`;
    emailBody += `<p>Report generated on ${new Date().toLocaleDateString()}</p>`;
    
    if (report_type === 'dashboard' && reportData.metrics) {
      const { metrics } = reportData;
      emailBody += `<h3>Portfolio Summary</h3>`;
      emailBody += `<ul>`;
      emailBody += `<li>Total Projects: ${metrics.totalProjects || 0}</li>`;
      emailBody += `<li>Active Projects: ${metrics.activeProjects || 0}</li>`;
      emailBody += `<li>At Risk: ${metrics.atRiskProjects || 0}</li>`;
      emailBody += `<li>Contract Value: $${((metrics.totalContractValue || 0) / 1000000).toFixed(2)}M</li>`;
      emailBody += `<li>Budget Variance: ${(metrics.avgBudgetVariance || 0).toFixed(1)}%</li>`;
      emailBody += `<li>Avg Progress: ${(metrics.avgScheduleProgress || 0).toFixed(0)}%</li>`;
      emailBody += `<li>Open RFIs: ${metrics.openRFIs || 0}</li>`;
      emailBody += `<li>Overdue Tasks: ${metrics.overdueTasks || 0}</li>`;
      emailBody += `</ul>`;
      
      if (reportData.projects && reportData.projects.length > 0) {
        emailBody += `<h3>Projects Requiring Attention</h3>`;
        const atRiskProjects = reportData.projects.filter(p => p.isAtRisk).slice(0, 10);
        if (atRiskProjects.length > 0) {
          emailBody += `<ul>`;
          atRiskProjects.forEach(p => {
            emailBody += `<li><strong>${p.name}</strong> - Progress: ${p.progress}%, Open RFIs: ${p.openRFIs}, Days Slip: ${p.daysSlip}</li>`;
          });
          emailBody += `</ul>`;
        } else {
          emailBody += `<p>No projects currently at risk.</p>`;
        }
      }
    }
    
    emailBody += `<p style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 12px;">`;
    emailBody += `This is an automated report from SteelBuild Pro. To modify your report preferences, please contact your administrator.`;
    emailBody += `</p>`;
    emailBody += `</body></html>`;

    // Send emails
    for (const recipient of recipients) {
      await base44.integrations.Core.SendEmail({
        to: recipient,
        subject,
        body: emailBody
      });
    }

    return Response.json({ 
      success: true, 
      message: `Report sent to ${recipients.length} recipient(s)` 
    });

  } catch (error) {
    console.error('Schedule report error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});