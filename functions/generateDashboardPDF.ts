import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { jsPDF } from 'npm:jspdf@2.5.2';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { report_type = 'portfolio', date_range = 'current' } = await req.json();

    // Get dashboard data
    const response = await base44.functions.invoke('getDashboardData', {
      page: 1,
      pageSize: 1000,
      search: '',
      status: 'all',
      risk: 'all',
      sort: 'risk'
    });

    const { projects, metrics } = response.data;

    // Generate PDF
    const doc = new jsPDF();
    const leftMargin = 20;
    const pageWidth = doc.internal.pageSize.width;
    let y = 20;

    // Header
    doc.setFontSize(22);
    doc.setFont(undefined, 'bold');
    doc.text('Portfolio Dashboard Report', leftMargin, y);
    y += 10;

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(100);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, leftMargin, y);
    y += 3;
    doc.text(`User: ${user.full_name || user.email}`, leftMargin, y);
    y += 15;

    // Executive Summary
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(0);
    doc.text('Executive Summary', leftMargin, y);
    y += 10;

    doc.setFontSize(11);
    doc.setFont(undefined, 'normal');
    
    // Metrics Grid
    const col1X = leftMargin;
    const col2X = pageWidth / 2 + 10;

    doc.setFont(undefined, 'bold');
    doc.text('Portfolio Metrics', col1X, y);
    y += 7;

    doc.setFont(undefined, 'normal');
    doc.text(`Total Projects: ${metrics.totalProjects || 0}`, col1X, y);
    doc.text(`Active Projects: ${metrics.activeProjects || 0}`, col2X, y);
    y += 6;

    doc.text(`At Risk: ${metrics.atRiskProjects || 0}`, col1X, y);
    doc.text(`Critical Issues: ${metrics.criticalIssues || 0}`, col2X, y);
    y += 6;

    doc.text(`Contract Value: $${((metrics.totalContractValue || 0) / 1000000).toFixed(2)}M`, col1X, y);
    doc.text(`Avg Progress: ${(metrics.avgScheduleProgress || 0).toFixed(0)}%`, col2X, y);
    y += 6;

    doc.text(`Budget Variance: ${(metrics.avgBudgetVariance || 0) > 0 ? '+' : ''}${(metrics.avgBudgetVariance || 0).toFixed(1)}%`, col1X, y);
    doc.text(`Open RFIs: ${metrics.openRFIs || 0}`, col2X, y);
    y += 6;

    doc.text(`Overdue Tasks: ${metrics.overdueTasks || 0}`, col1X, y);
    doc.text(`Pending Approvals: ${metrics.pendingApprovals || 0}`, col2X, y);
    y += 12;

    // Project Health Table
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text('Project Health Overview', leftMargin, y);
    y += 10;

    doc.setFontSize(9);
    doc.setFont(undefined, 'bold');
    doc.text('Project', leftMargin, y);
    doc.text('Status', leftMargin + 60, y);
    doc.text('Progress', leftMargin + 90, y);
    doc.text('Risk', leftMargin + 120, y);
    doc.text('Open RFIs', leftMargin + 145, y);
    y += 5;

    doc.setFont(undefined, 'normal');
    const projectsToShow = projects.slice(0, 30); // Top 30 projects
    
    projectsToShow.forEach(project => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }

      doc.text(project.name.substring(0, 30), leftMargin, y);
      doc.text(project.status, leftMargin + 60, y);
      doc.text(`${project.progress}%`, leftMargin + 90, y);
      doc.text(project.isAtRisk ? 'At Risk' : 'Healthy', leftMargin + 120, y);
      doc.text(`${project.openRFIs}`, leftMargin + 145, y);
      y += 5;
    });

    const pdfBytes = doc.output('arraybuffer');

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Dashboard_Report_${new Date().toISOString().split('T')[0]}.pdf"`
      }
    });

  } catch (error) {
    console.error('PDF generation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});