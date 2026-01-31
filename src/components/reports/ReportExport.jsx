import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, FileText, FileSpreadsheet } from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function ReportExport({ data, reportName, chartType, projects, dateRange }) {
  const [exporting, setExporting] = useState(false);

  const exportToPDF = async () => {
    setExporting(true);
    try {
      const doc = new jsPDF();
      
      // Title
      doc.setFontSize(20);
      doc.text(reportName, 20, 20);
      
      // Metadata
      doc.setFontSize(10);
      doc.text(`Generated: ${format(new Date(), 'MMM dd, yyyy HH:mm')}`, 20, 30);
      if (projects.length > 0) {
        doc.text(`Projects: ${projects.join(', ')}`, 20, 36);
      }
      if (dateRange.start && dateRange.end) {
        doc.text(`Date Range: ${dateRange.start} to ${dateRange.end}`, 20, 42);
      }

      // Prepare table data
      const tableData = data.map(item => {
        if (item.isGrouped) {
          const groupedStr = Object.entries(item.value)
            .map(([k, v]) => `${k}: ${v}`)
            .join(', ');
          return [item.module, item.label, groupedStr];
        }
        return [
          item.module,
          item.label,
          typeof item.value === 'number' 
            ? item.value.toLocaleString(undefined, { maximumFractionDigits: 2 })
            : item.value
        ];
      });

      // Add table
      doc.autoTable({
        startY: dateRange.start ? 50 : 44,
        head: [['Module', 'Metric', 'Value']],
        body: tableData,
        theme: 'grid',
        headStyles: {
          fillColor: [245, 158, 11],
          textColor: [0, 0, 0],
          fontStyle: 'bold'
        },
        styles: {
          fontSize: 9,
          cellPadding: 4
        }
      });

      // Footer
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.text(
          `Page ${i} of ${pageCount}`,
          doc.internal.pageSize.width / 2,
          doc.internal.pageSize.height - 10,
          { align: 'center' }
        );
      }

      doc.save(`${reportName.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd')}.pdf`);
      toast.success('PDF exported successfully');
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error('Failed to export PDF');
    } finally {
      setExporting(false);
    }
  };

  const exportToCSV = () => {
    setExporting(true);
    try {
      // CSV Header
      let csv = 'Module,Metric,Value\n';

      // Add metadata as comments
      csv += `# Report: ${reportName}\n`;
      csv += `# Generated: ${format(new Date(), 'MMM dd, yyyy HH:mm')}\n`;
      if (projects.length > 0) {
        csv += `# Projects: ${projects.join(', ')}\n`;
      }
      if (dateRange.start && dateRange.end) {
        csv += `# Date Range: ${dateRange.start} to ${dateRange.end}\n`;
      }
      csv += '\n';

      // Add data rows
      data.forEach(item => {
        const module = item.module.replace(/,/g, ';');
        const label = item.label.replace(/,/g, ';');
        
        if (item.isGrouped) {
          // For grouped data, create separate rows
          Object.entries(item.value).forEach(([key, value]) => {
            csv += `"${module}","${label} - ${key}",${value}\n`;
          });
        } else {
          const value = typeof item.value === 'number' 
            ? item.value.toFixed(2)
            : String(item.value).replace(/,/g, ';');
          csv += `"${module}","${label}",${value}\n`;
        }
      });

      // Create download
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${reportName.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd')}.csv`;
      link.click();
      URL.revokeObjectURL(link.href);

      toast.success('CSV exported successfully');
    } catch (error) {
      console.error('CSV export error:', error);
      toast.error('Failed to export CSV');
    } finally {
      setExporting(false);
    }
  };

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5 text-amber-500" />
          Export Report
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <Button
            onClick={exportToPDF}
            disabled={exporting}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            <FileText className="mr-2 h-4 w-4" />
            Export as PDF
          </Button>
          
          <Button
            onClick={exportToCSV}
            disabled={exporting}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Export as CSV
          </Button>
        </div>

        <div className="mt-4 p-3 bg-zinc-800/50 rounded-lg">
          <p className="text-xs text-zinc-400">
            <strong className="text-zinc-300">PDF</strong> includes formatted tables with metadata
          </p>
          <p className="text-xs text-zinc-400 mt-1">
            <strong className="text-zinc-300">CSV</strong> provides raw data for Excel analysis
          </p>
        </div>
      </CardContent>
    </Card>
  );
}