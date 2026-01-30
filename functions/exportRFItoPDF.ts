import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { jsPDF } from 'npm:jspdf@2.5.2';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { rfi_id } = await req.json();

    if (!rfi_id) {
      return Response.json({ error: 'rfi_id required' }, { status: 400 });
    }

    // Fetch RFI data
    const rfis = await base44.entities.RFI.filter({ id: rfi_id });
    if (!rfis.length) {
      return Response.json({ error: 'RFI not found' }, { status: 404 });
    }

    const rfi = rfis[0];
    const projects = await base44.entities.Project.filter({ id: rfi.project_id });
    const project = projects[0];

    // Generate PDF
    const doc = new jsPDF();
    let y = 20;

    // Header
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.text(`RFI-${String(rfi.rfi_number).padStart(3, '0')}`, 20, y);
    y += 10;

    doc.setFontSize(11);
    doc.setFont(undefined, 'normal');
    doc.text(rfi.subject, 20, y);
    y += 15;

    // Project Info
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.text('Project:', 20, y);
    doc.setFont(undefined, 'normal');
    doc.text(project?.name || 'N/A', 50, y);
    y += 7;

    doc.setFont(undefined, 'bold');
    doc.text('Status:', 20, y);
    doc.setFont(undefined, 'normal');
    doc.text(rfi.status?.toUpperCase() || 'N/A', 50, y);
    y += 7;

    doc.setFont(undefined, 'bold');
    doc.text('Priority:', 20, y);
    doc.setFont(undefined, 'normal');
    doc.text(rfi.priority?.toUpperCase() || 'N/A', 50, y);
    y += 7;

    doc.setFont(undefined, 'bold');
    doc.text('Category:', 20, y);
    doc.setFont(undefined, 'normal');
    doc.text(rfi.category || 'N/A', 50, y);
    y += 7;

    if (rfi.location_area) {
      doc.setFont(undefined, 'bold');
      doc.text('Location:', 20, y);
      doc.setFont(undefined, 'normal');
      doc.text(rfi.location_area, 50, y);
      y += 7;
    }

    if (rfi.spec_section) {
      doc.setFont(undefined, 'bold');
      doc.text('Spec Section:', 20, y);
      doc.setFont(undefined, 'normal');
      doc.text(rfi.spec_section, 50, y);
      y += 7;
    }

    y += 5;

    // Question
    doc.setFont(undefined, 'bold');
    doc.setFontSize(12);
    doc.text('Question:', 20, y);
    y += 7;

    doc.setFont(undefined, 'normal');
    doc.setFontSize(10);
    const questionLines = doc.splitTextToSize(rfi.question || 'No question provided', 170);
    doc.text(questionLines, 20, y);
    y += questionLines.length * 5 + 10;

    // Response
    if (rfi.response) {
      doc.setFont(undefined, 'bold');
      doc.setFontSize(12);
      doc.text('Response:', 20, y);
      y += 7;

      doc.setFont(undefined, 'normal');
      doc.setFontSize(10);
      const responseLines = doc.splitTextToSize(rfi.response, 170);
      doc.text(responseLines, 20, y);
      y += responseLines.length * 5 + 10;
    }

    // Dates
    y += 5;
    doc.setFont(undefined, 'bold');
    doc.setFontSize(11);
    doc.text('Timeline:', 20, y);
    y += 7;

    doc.setFontSize(9);
    if (rfi.submitted_date) {
      doc.setFont(undefined, 'normal');
      doc.text(`Submitted: ${rfi.submitted_date}`, 20, y);
      y += 5;
    }
    if (rfi.due_date) {
      doc.text(`Due: ${rfi.due_date}`, 20, y);
      y += 5;
    }
    if (rfi.response_date) {
      doc.text(`Responded: ${rfi.response_date}`, 20, y);
      y += 5;
    }
    if (rfi.response_days_actual) {
      doc.text(`Response Time: ${rfi.response_days_actual} days`, 20, y);
      y += 5;
    }

    // Footer
    const pageHeight = doc.internal.pageSize.height;
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text(`Generated: ${new Date().toLocaleDateString()} by ${user.full_name || user.email}`, 20, pageHeight - 10);

    const pdfBytes = doc.output('arraybuffer');

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=RFI-${String(rfi.rfi_number).padStart(3, '0')}.pdf`
      }
    });
  } catch (error) {
    console.error('PDF generation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});