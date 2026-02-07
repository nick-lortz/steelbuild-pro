import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { jsPDF } from 'npm:jspdf@2.5.2';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { work_package_id } = await req.json();
    if (!work_package_id) {
      return Response.json({ error: 'work_package_id required' }, { status: 400 });
    }

    // Fetch work package and related data
    const [workPackages, project] = await Promise.all([
      base44.entities.WorkPackage.filter({ id: work_package_id }),
      base44.entities.WorkPackage.filter({ id: work_package_id }).then(async (wps) => {
        if (wps.length === 0) return null;
        const projects = await base44.entities.Project.filter({ id: wps[0].project_id });
        return projects[0];
      })
    ]);

    const pkg = workPackages[0];
    if (!pkg) {
      return Response.json({ error: 'Work package not found' }, { status: 404 });
    }

    const [tasks, laborHours, expenses] = await Promise.all([
      base44.entities.Task.filter({ work_package_id: pkg.id }),
      base44.entities.LaborHours.filter({ work_package_id: pkg.id }),
      base44.entities.Expense.filter({ project_id: pkg.project_id })
    ]);

    // Generate PDF
    const doc = new jsPDF();
    const leftMargin = 20;
    const pageWidth = doc.internal.pageSize.width;
    let y = 20;

    // Header
    doc.setFontSize(22);
    doc.setFont(undefined, 'bold');
    doc.text('Work Package Status Report', leftMargin, y);
    y += 10;

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(100);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, leftMargin, y);
    y += 15;

    // Project Info
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(0);
    doc.text('Project Information', leftMargin, y);
    y += 7;

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Project: ${project?.name || 'N/A'} (${project?.project_number || 'N/A'})`, leftMargin, y);
    y += 5;
    doc.text(`Work Package: ${pkg.wpid || pkg.id.slice(0, 8)}`, leftMargin, y);
    y += 5;
    doc.text(`Title: ${pkg.title}`, leftMargin, y);
    y += 5;
    doc.text(`Phase: ${pkg.phase}`, leftMargin, y);
    y += 5;
    doc.text(`Status: ${pkg.status}`, leftMargin, y);
    y += 10;

    // Budget Summary
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('Budget Summary', leftMargin, y);
    y += 7;

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Budget at Award: $${(pkg.budget_at_award || 0).toLocaleString()}`, leftMargin, y);
    y += 5;
    doc.text(`Forecast at Completion: $${(pkg.forecast_at_completion || 0).toLocaleString()}`, leftMargin, y);
    y += 5;
    const variance = ((pkg.forecast_at_completion || 0) - (pkg.budget_at_award || 0));
    doc.text(`Variance: $${variance.toLocaleString()} (${pkg.budget_at_award > 0 ? ((variance / pkg.budget_at_award) * 100).toFixed(1) : 0}%)`, leftMargin, y);
    y += 10;

    // Schedule Summary
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('Schedule Summary', leftMargin, y);
    y += 7;

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Start Date: ${pkg.start_date || 'Not set'}`, leftMargin, y);
    y += 5;
    doc.text(`Target Date: ${pkg.target_date || 'Not set'}`, leftMargin, y);
    y += 5;
    doc.text(`End Date: ${pkg.end_date || 'Not set'}`, leftMargin, y);
    y += 5;
    doc.text(`Completion: ${pkg.percent_complete || 0}%`, leftMargin, y);
    y += 10;

    // Tasks Summary
    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('Tasks Summary', leftMargin, y);
    y += 7;

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Total Tasks: ${tasks.length}`, leftMargin, y);
    y += 5;
    doc.text(`Completed: ${completedTasks} (${tasks.length > 0 ? ((completedTasks / tasks.length) * 100).toFixed(0) : 0}%)`, leftMargin, y);
    y += 5;
    doc.text(`In Progress: ${tasks.filter(t => t.status === 'in_progress').length}`, leftMargin, y);
    y += 5;
    doc.text(`Not Started: ${tasks.filter(t => t.status === 'not_started').length}`, leftMargin, y);
    y += 10;

    // Labor Summary
    const totalHours = laborHours.reduce((sum, lh) => sum + (lh.hours || 0) + (lh.overtime_hours || 0), 0);
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('Labor Summary', leftMargin, y);
    y += 7;

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Total Hours Logged: ${totalHours.toFixed(1)}`, leftMargin, y);
    y += 5;
    doc.text(`Estimated Hours: ${pkg.estimated_hours || 0}`, leftMargin, y);
    y += 5;
    doc.text(`Hours Remaining: ${Math.max(0, (pkg.estimated_hours || 0) - totalHours).toFixed(1)}`, leftMargin, y);
    y += 10;

    if (pkg.notes) {
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text('Notes', leftMargin, y);
      y += 7;

      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      const splitNotes = doc.splitTextToSize(pkg.notes, pageWidth - leftMargin * 2);
      doc.text(splitNotes, leftMargin, y);
    }

    const pdfBytes = doc.output('arraybuffer');

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="WorkPackage_${pkg.wpid || pkg.id.slice(0, 8)}_${new Date().toISOString().split('T')[0]}.pdf"`
      }
    });

  } catch (error) {
    console.error('PDF generation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});