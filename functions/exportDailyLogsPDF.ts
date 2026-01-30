import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { jsPDF } from 'npm:jspdf@2.5.2';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { project_id, start_date, end_date } = await req.json();

    if (!project_id) {
      return Response.json({ error: 'project_id required' }, { status: 400 });
    }

    // Fetch project
    const projects = await base44.entities.Project.filter({ id: project_id });
    const project = projects[0];

    // Fetch daily logs
    let logs = await base44.entities.DailyLog.filter({ project_id });

    // Filter by date range if provided
    if (start_date || end_date) {
      logs = logs.filter(log => {
        const logDate = log.log_date;
        if (start_date && logDate < start_date) return false;
        if (end_date && logDate > end_date) return false;
        return true;
      });
    }

    // Sort by date
    logs.sort((a, b) => a.log_date.localeCompare(b.log_date));

    // Generate PDF
    const doc = new jsPDF();
    let y = 20;

    // Header
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text('Daily Logs Report', 20, y);
    y += 8;

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(project?.name || 'Unknown Project', 20, y);
    y += 6;

    if (start_date || end_date) {
      const dateRange = `${start_date || 'Start'} to ${end_date || 'End'}`;
      doc.text(`Date Range: ${dateRange}`, 20, y);
      y += 6;
    }

    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, y);
    y += 10;

    // Logs
    for (const log of logs) {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }

      doc.setFont(undefined, 'bold');
      doc.setFontSize(11);
      doc.text(log.log_date, 20, y);
      y += 6;

      doc.setFont(undefined, 'normal');
      doc.setFontSize(9);

      // Weather
      doc.text(`Weather: ${log.weather_condition || 'N/A'}`, 20, y);
      if (log.temperature_high || log.temperature_low) {
        doc.text(`Temp: ${log.temperature_low || '-'}°F - ${log.temperature_high || '-'}°F`, 80, y);
      }
      y += 5;

      // Crew
      if (log.crew_count) {
        doc.text(`Crew: ${log.crew_count} workers`, 20, y);
        y += 5;
      }

      if (log.hours_worked) {
        doc.text(`Hours: ${log.hours_worked}`, 20, y);
        y += 5;
      }

      // Work performed
      if (log.work_performed) {
        doc.setFont(undefined, 'bold');
        doc.text('Work Performed:', 20, y);
        y += 5;
        doc.setFont(undefined, 'normal');
        const workLines = doc.splitTextToSize(log.work_performed, 170);
        doc.text(workLines, 20, y);
        y += workLines.length * 4 + 3;
      }

      // Delays
      if (log.delays) {
        doc.setTextColor(255, 0, 0);
        doc.text(`Delays: ${log.delay_reason || 'Yes'}`, 20, y);
        doc.setTextColor(0);
        y += 5;
      }

      // Safety incidents
      if (log.safety_incidents) {
        doc.setTextColor(255, 0, 0);
        doc.text(`Safety Incident: ${log.safety_notes || 'Yes'}`, 20, y);
        doc.setTextColor(0);
        y += 5;
      }

      y += 8;
    }

    // Footer
    const pageHeight = doc.internal.pageSize.height;
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text(`Total Logs: ${logs.length}`, 20, pageHeight - 10);

    const pdfBytes = doc.output('arraybuffer');

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=DailyLogs-${project?.project_number || 'Report'}.pdf`
      }
    });
  } catch (error) {
    console.error('PDF generation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});