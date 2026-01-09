import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { jsPDF } from 'npm:jspdf@2.5.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { reportType, projectIds, dateRange, format: exportFormat = 'pdf' } = await req.json();

    // Fetch data
    const projects = projectIds?.length > 0 
      ? await base44.entities.Project.filter({ id: { $in: projectIds } })
      : await base44.entities.Project.list();

    let reportData = {};

    // Generate report based on type
    switch (reportType) {
      case 'financial':
        reportData = await generateFinancialReport(base44, projects);
        break;
      case 'resource':
        reportData = await generateResourceReport(base44, projects);
        break;
      case 'detailing':
        reportData = await generateDetailingReport(base44, projects);
        break;
      case 'progress':
        reportData = await generateProgressReport(base44, projects);
        break;
      default:
        return Response.json({ error: 'Invalid report type' }, { status: 400 });
    }

    // Export to requested format
    if (exportFormat === 'pdf') {
      const pdfBytes = generatePDF(reportData, reportType);
      return new Response(pdfBytes, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename=${reportType}_report_${new Date().toISOString().split('T')[0]}.pdf`
        }
      });
    } else {
      return Response.json(reportData);
    }
  } catch (error) {
    console.error('Report generation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function generateFinancialReport(base44, projects) {
  const summary = {
    reportType: 'Financial Summary',
    generatedAt: new Date().toISOString(),
    projects: []
  };

  for (const project of projects) {
    const financials = await base44.entities.Financial.filter({ project_id: project.id });
    const expenses = await base44.entities.Expense.filter({ project_id: project.id });
    const sovItems = await base44.entities.SOVItem.filter({ project_id: project.id });

    const budget = financials.reduce((sum, f) => sum + (f.current_budget || 0), 0);
    const committed = financials.reduce((sum, f) => sum + (f.committed_amount || 0), 0);
    const actual = financials.reduce((sum, f) => sum + (f.actual_amount || 0), 0);
    const forecast = financials.reduce((sum, f) => sum + (f.forecast_amount || 0), 0);
    
    const scheduledValue = sovItems.reduce((sum, s) => sum + (s.scheduled_value || 0), 0);
    const billedToDate = sovItems.reduce((sum, s) => sum + (s.billed_to_date || 0), 0);

    summary.projects.push({
      name: project.name,
      projectNumber: project.project_number,
      status: project.status,
      budget,
      committed,
      actual,
      forecast,
      variance: budget - actual,
      scheduledValue,
      billedToDate,
      remainingToInvoice: scheduledValue - billedToDate
    });
  }

  return summary;
}

async function generateResourceReport(base44, projects) {
  const summary = {
    reportType: 'Resource Allocation',
    generatedAt: new Date().toISOString(),
    projects: []
  };

  const allResources = await base44.entities.Resource.list();
  
  for (const project of projects) {
    const allocations = await base44.entities.ResourceAllocation.filter({ project_id: project.id });
    const tasks = await base44.entities.Task.filter({ project_id: project.id });

    const resourceIds = [...new Set(allocations.map(a => a.resource_id))];
    const resources = allResources.filter(r => resourceIds.includes(r.id));

    const laborCount = resources.filter(r => r.type === 'labor').length;
    const equipmentCount = resources.filter(r => r.type === 'equipment').length;
    const subCount = resources.filter(r => r.type === 'subcontractor').length;

    const totalHours = allocations.reduce((sum, a) => sum + (a.actual_hours || 0), 0);
    const estimatedHours = allocations.reduce((sum, a) => sum + (a.estimated_hours || 0), 0);

    summary.projects.push({
      name: project.name,
      projectNumber: project.project_number,
      totalResources: resources.length,
      labor: laborCount,
      equipment: equipmentCount,
      subcontractors: subCount,
      hoursLogged: totalHours,
      hoursEstimated: estimatedHours,
      variance: estimatedHours - totalHours
    });
  }

  return summary;
}

async function generateDetailingReport(base44, projects) {
  const summary = {
    reportType: 'Detailing Progress',
    generatedAt: new Date().toISOString(),
    projects: []
  };

  for (const project of projects) {
    const drawingSets = await base44.entities.DrawingSet.filter({ project_id: project.id });

    const total = drawingSets.length;
    const ifa = drawingSets.filter(d => d.status === 'IFA').length;
    const bfa = drawingSets.filter(d => d.status === 'BFA').length;
    const bfs = drawingSets.filter(d => d.status === 'BFS').length;
    const fff = drawingSets.filter(d => d.status === 'FFF').length;
    
    const totalSheets = drawingSets.reduce((sum, d) => sum + (d.sheet_count || 0), 0);
    
    const overdue = drawingSets.filter(d => {
      if (!d.due_date || d.status === 'FFF') return false;
      return new Date(d.due_date) < new Date();
    }).length;

    summary.projects.push({
      name: project.name,
      projectNumber: project.project_number,
      totalSets: total,
      totalSheets,
      statusBreakdown: { ifa, bfa, bfs, fff },
      percentComplete: total > 0 ? ((fff / total) * 100).toFixed(1) : 0,
      overdueSets: overdue
    });
  }

  return summary;
}

async function generateProgressReport(base44, projects) {
  const summary = {
    reportType: 'Project Progress',
    generatedAt: new Date().toISOString(),
    projects: []
  };

  for (const project of projects) {
    const tasks = await base44.entities.Task.filter({ project_id: project.id });

    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'completed').length;
    const inProgress = tasks.filter(t => t.status === 'in_progress').length;
    const blocked = tasks.filter(t => t.status === 'blocked').length;
    const overdue = tasks.filter(t => {
      if (t.status === 'completed' || !t.end_date) return false;
      return new Date(t.end_date) < new Date();
    }).length;

    summary.projects.push({
      name: project.name,
      projectNumber: project.project_number,
      status: project.status,
      startDate: project.start_date,
      targetCompletion: project.target_completion,
      totalTasks: total,
      completed,
      inProgress,
      blocked,
      overdue,
      percentComplete: total > 0 ? ((completed / total) * 100).toFixed(1) : 0
    });
  }

  return summary;
}

function generatePDF(reportData, reportType) {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(20);
  doc.text(reportData.reportType, 20, 20);
  
  doc.setFontSize(10);
  doc.text(`Generated: ${new Date(reportData.generatedAt).toLocaleString()}`, 20, 30);
  
  let yPos = 45;
  
  // Project data
  reportData.projects.forEach((proj, idx) => {
    if (yPos > 270) {
      doc.addPage();
      yPos = 20;
    }
    
    doc.setFontSize(14);
    doc.text(`${proj.projectNumber} - ${proj.name}`, 20, yPos);
    yPos += 8;
    
    doc.setFontSize(10);
    
    // Different layouts based on report type
    if (reportType === 'financial') {
      doc.text(`Budget: $${proj.budget.toLocaleString()}`, 25, yPos);
      doc.text(`Actual: $${proj.actual.toLocaleString()}`, 25, yPos + 5);
      doc.text(`Variance: $${proj.variance.toLocaleString()}`, 25, yPos + 10);
      doc.text(`Billed: $${proj.billedToDate.toLocaleString()}`, 25, yPos + 15);
      yPos += 25;
    } else if (reportType === 'resource') {
      doc.text(`Total Resources: ${proj.totalResources}`, 25, yPos);
      doc.text(`Labor: ${proj.labor} | Equipment: ${proj.equipment} | Subs: ${proj.subcontractors}`, 25, yPos + 5);
      doc.text(`Hours: ${proj.hoursLogged} / ${proj.hoursEstimated}`, 25, yPos + 10);
      yPos += 20;
    } else if (reportType === 'detailing') {
      doc.text(`Sets: ${proj.totalSets} (${proj.totalSheets} sheets)`, 25, yPos);
      doc.text(`FFF: ${proj.statusBreakdown.fff} | Overdue: ${proj.overdueSets}`, 25, yPos + 5);
      doc.text(`Progress: ${proj.percentComplete}%`, 25, yPos + 10);
      yPos += 20;
    } else if (reportType === 'progress') {
      doc.text(`Tasks: ${proj.totalTasks} | Completed: ${proj.completed} (${proj.percentComplete}%)`, 25, yPos);
      doc.text(`In Progress: ${proj.inProgress} | Blocked: ${proj.blocked} | Overdue: ${proj.overdue}`, 25, yPos + 5);
      yPos += 15;
    }
    
    yPos += 5;
  });
  
  return doc.output('arraybuffer');
}