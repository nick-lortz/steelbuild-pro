import React, { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Upload, Download, FileSpreadsheet, AlertCircle } from 'lucide-react';
import { toast } from '@/components/ui/notifications';

export default function SOVImportExport({ projectId, sovItems = [], canEdit }) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importPreview, setImportPreview] = useState([]);
  const [importErrors, setImportErrors] = useState([]);

  const handleExportCSV = () => {
    const headers = [
      'SOV Code',
      'Description',
      'Category',
      'Scheduled Value',
      'Percent Complete',
      'Earned to Date',
      'Billed to Date',
      'Ready to Bill'
    ];

    const rows = sovItems.map(item => {
      const earned = ((item.scheduled_value || 0) * (item.percent_complete || 0)) / 100;
      const toBill = earned - (item.billed_to_date || 0);
      return [
        item.sov_code,
        item.description,
        item.sov_category,
        item.scheduled_value || 0,
        item.percent_complete || 0,
        earned.toFixed(2),
        item.billed_to_date || 0,
        toBill.toFixed(2)
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SOV_Export_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success('SOV exported to CSV');
  };

  const parseCSV = (text) => {
    const lines = text.split('\n').filter(line => line.trim());
    const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
    
    const data = [];
    const errors = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.replace(/"/g, '').trim());
      
      if (values.length !== headers.length) {
        errors.push(`Line ${i + 1}: Column count mismatch`);
        continue;
      }

      const row = {
        sov_code: values[0],
        description: values[1],
        sov_category: values[2],
        scheduled_value: parseFloat(values[3]) || 0
      };

      // Validation
      if (!row.sov_code) {
        errors.push(`Line ${i + 1}: Missing SOV code`);
        continue;
      }
      if (!row.description) {
        errors.push(`Line ${i + 1}: Missing description`);
        continue;
      }
      if (!['labor', 'material', 'equipment', 'subcontract', 'other'].includes(row.sov_category)) {
        errors.push(`Line ${i + 1}: Invalid category "${row.sov_category}"`);
        continue;
      }

      data.push(row);
    }

    return { data, errors };
  };

  const handleFileUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result;
      if (typeof text === 'string') {
        const { data, errors } = parseCSV(text);
        setImportPreview(data);
        setImportErrors(errors);
        setShowImportDialog(true);
      }
    };
    reader.readAsText(file);
  };

  const importMutation = useMutation({
    mutationFn: async (items) => {
      return base44.entities.SOVItem.bulkCreate(
        items.map(item => ({ ...item, project_id: projectId }))
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sov-items', projectId] });
      toast.success(`Imported ${importPreview.length} SOV lines`);
      setShowImportDialog(false);
      setImportPreview([]);
      setImportErrors([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
    },
    onError: (err) => toast.error(err?.message || 'Import failed')
  });

  return (
    <>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleExportCSV}
          disabled={sovItems.length === 0}
        >
          <Download size={16} className="mr-2" />
          Export CSV
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={!canEdit}
        >
          <Upload size={16} className="mr-2" />
          Import CSV
        </Button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        onChange={handleFileUpload}
        className="hidden"
      />

      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet size={20} />
              Import Preview
            </DialogTitle>
            <DialogDescription>
              Review the data before importing. {importPreview.length} lines will be added.
            </DialogDescription>
          </DialogHeader>

          {importErrors.length > 0 && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded">
              <div className="flex items-start gap-2 mb-2">
                <AlertCircle size={16} className="text-red-400 mt-0.5" />
                <p className="text-sm font-semibold text-red-400">Import Errors</p>
              </div>
              <ul className="text-xs text-muted-foreground space-y-1 ml-6">
                {importErrors.map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="max-h-[50vh] overflow-y-auto border rounded">
            <table className="w-full text-sm">
              <thead className="bg-muted sticky top-0">
                <tr>
                  <th className="text-left p-2">Code</th>
                  <th className="text-left p-2">Description</th>
                  <th className="text-left p-2">Category</th>
                  <th className="text-right p-2">Value</th>
                </tr>
              </thead>
              <tbody>
                {importPreview.map((item, idx) => (
                  <tr key={idx} className="border-t">
                    <td className="p-2 font-mono text-xs">{item.sov_code}</td>
                    <td className="p-2 text-xs">{item.description}</td>
                    <td className="p-2 text-xs capitalize">{item.sov_category}</td>
                    <td className="p-2 text-xs text-right">${item.scheduled_value.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowImportDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => importMutation.mutate(importPreview)}
              disabled={importPreview.length === 0 || importMutation.isPending}
            >
              Import {importPreview.length} Lines
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}