import React from 'react';
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, FileSpreadsheet, FileText } from 'lucide-react';
import { exportToCSV, exportColumns } from './exportUtils';
import { toast } from '@/components/ui/notifications';

export default function ExportButton({ 
  data, 
  columns, 
  filename = 'export',
  entityType = null,
  variant = "outline",
  size = "sm",
  disabled = false,
  className = ""
}) {
  const handleExport = (format) => {
    if (!data || data.length === 0) {
      toast.error('No data to export');
      return;
    }

    try {
      // Use predefined columns if entityType is provided
      const exportCols = columns || (entityType && exportColumns[entityType]) || null;
      
      if (format === 'csv') {
        exportToCSV(data, exportCols, filename);
        toast.success(`Exported ${data.length} records to CSV`);
      }
    } catch (error) {
      toast.error('Export failed: ' + error.message);
    }
  };

  // If no data, show simple disabled button
  if (disabled || !data || data.length === 0) {
    return (
      <Button variant={variant} size={size} disabled className={className}>
        <Download size={16} className="mr-2" />
        Export
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} className={className}>
          <Download size={16} className="mr-2" />
          Export ({data.length})
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800">
        <DropdownMenuItem 
          onClick={() => handleExport('csv')}
          className="cursor-pointer text-white hover:bg-zinc-800"
        >
          <FileSpreadsheet size={16} className="mr-2" />
          Export as CSV
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}