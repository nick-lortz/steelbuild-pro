import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileSpreadsheet, FileText, Download } from 'lucide-react';
import { toast } from '@/components/ui/notifications';
import jsPDF from 'jspdf';

export default function ExportReports({ projectId, projectName, data }) {
  const [format, setFormat] = useState('excel');
  const [exporting, setExporting] = useState(false);

  const exportToExcel = () => {
    const { financials = [], tasks = [], rfis = [], changeOrders = [] } = data;

    let csvContent = `${projectName} - Project Report\n\n`;
    
    // Financial Summary
    csvContent += 'FINANCIAL SUMMARY\n';
    csvContent += 'Cost Code,Budget,Committed,Actual,Forecast\n';
    financials.forEach(f => {
      csvContent += `${f.cost_code_id || 'N/A'},${f.budget_amount},${f.committed_amount},${f.actual_amount},${f.forecast_amount}\n`;
    });

    // Tasks
    csvContent += '\n\nTASKS\n';
    csvContent += 'Task Name,Phase,Status,Start Date,End Date,Progress %\n';
    tasks.forEach(t => {
      csvContent += `"${t.name}",${t.phase},${t.status},${t.start_date},${t.end_date},${t.progress_percent}\n`;
    });

    // RFIs
    csvContent += '\n\nRFIS\n';
    csvContent += 'RFI #,Subject,Status,Priority,Submitted,Response\n';
    rfis.forEach(r => {
      csvContent += `RFI-${String(r.rfi_number).padStart(3, '0')},"${r.subject}",${r.status},${r.priority},${r.submitted_date || ''},${r.response_date || ''}\n`;
    });

    // Change Orders
    csvContent += '\n\nCHANGE ORDERS\n';
    csvContent += 'CO #,Title,Status,Cost Impact,Schedule Impact\n';
    changeOrders.forEach(c => {
      csvContent += `CO-${String(c.co_number).padStart(3, '0')},"${c.title}",${c.status},${c.cost_impact},${c.schedule_impact_days}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${projectName.replace(/\s/g, '_')}_Report_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const exportToPDF = () => {
    const { financials = [], tasks = [], rfis = [], changeOrders = [] } = data;
    const doc = new jsPDF();

    // Title
    doc.setFontSize(20);
    doc.text(projectName, 20, 20);
    doc.setFontSize(12);
    doc.text(`Project Report - ${new Date().toLocaleDateString()}`, 20, 30);

    let y = 45;

    // Financial Summary
    doc.setFontSize(14);
    doc.text('Financial Summary', 20, y);
    y += 10;
    doc.setFontSize(10);
    const totalBudget = financials.reduce((sum, f) => sum + (f.budget_amount || 0), 0);
    const totalActual = financials.reduce((sum, f) => sum + (f.actual_amount || 0), 0);
    doc.text(`Total Budget: $${totalBudget.toLocaleString()}`, 20, y);
    y += 7;
    doc.text(`Actual Cost: $${totalActual.toLocaleString()}`, 20, y);
    y += 7;
    doc.text(`Variance: $${(totalBudget - totalActual).toLocaleString()}`, 20, y);
    y += 15;

    // Tasks Summary
    doc.setFontSize(14);
    doc.text('Task Summary', 20, y);
    y += 10;
    doc.setFontSize(10);
    const completed = tasks.filter(t => t.status === 'completed').length;
    doc.text(`Total Tasks: ${tasks.length}`, 20, y);
    y += 7;
    doc.text(`Completed: ${completed} (${((completed / tasks.length) * 100).toFixed(1)}%)`, 20, y);
    y += 7;
    doc.text(`In Progress: ${tasks.filter(t => t.status === 'in_progress').length}`, 20, y);
    y += 15;

    // RFIs Summary
    if (y > 250) {
      doc.addPage();
      y = 20;
    }
    doc.setFontSize(14);
    doc.text('RFI Summary', 20, y);
    y += 10;
    doc.setFontSize(10);
    doc.text(`Total RFIs: ${rfis.length}`, 20, y);
    y += 7;
    doc.text(`Pending: ${rfis.filter(r => ['pending', 'submitted'].includes(r.status)).length}`, 20, y);
    y += 7;
    doc.text(`Answered: ${rfis.filter(r => r.status === 'answered').length}`, 20, y);
    y += 15;

    // Change Orders Summary
    if (y > 250) {
      doc.addPage();
      y = 20;
    }
    doc.setFontSize(14);
    doc.text('Change Order Summary', 20, y);
    y += 10;
    doc.setFontSize(10);
    const totalCOImpact = changeOrders.reduce((sum, c) => sum + (c.cost_impact || 0), 0);
    doc.text(`Total COs: ${changeOrders.length}`, 20, y);
    y += 7;
    doc.text(`Total Impact: $${totalCOImpact.toLocaleString()}`, 20, y);
    y += 7;
    doc.text(`Approved: ${changeOrders.filter(c => c.status === 'approved').length}`, 20, y);

    doc.save(`${projectName.replace(/\s/g, '_')}_Report_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      if (format === 'excel') {
        exportToExcel();
      } else {
        exportToPDF();
      }
      toast.success('Report exported successfully');
    } catch (error) {
      toast.error('Export failed');
    } finally {
      setExporting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Export Report</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Select value={format} onValueChange={setFormat}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="excel">
              <FileSpreadsheet size={14} className="inline mr-2" />
              Excel (CSV)
            </SelectItem>
            <SelectItem value="pdf">
              <FileText size={14} className="inline mr-2" />
              PDF
            </SelectItem>
          </SelectContent>
        </Select>

        <Button onClick={handleExport} disabled={exporting} className="w-full">
          <Download size={16} className="mr-2" />
          {exporting ? 'Exporting...' : 'Export Report'}
        </Button>
      </CardContent>
    </Card>
  );
}