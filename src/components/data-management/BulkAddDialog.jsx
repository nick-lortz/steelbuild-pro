import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { base44 } from '@/api/base44Client';
import { toast } from '@/components/ui/notifications';
import { Loader2, Info, Download, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const parseCSV = (text) => {
  const lines = text.trim().split('\n');
  const result = [];
  
  for (let line of lines) {
    const row = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        row.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    row.push(current.trim());
    result.push(row);
  }
  
  return result;
};

export default function BulkAddDialog({ entityName, projectId, onClose, onSave }) {
  const [csvData, setCsvData] = useState('');
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const getTemplate = () => {
    switch (entityName) {
      case 'RFI':
        return 'subject,rfi_type,question,location_area,priority,ball_in_court\n"Missing connection detail",connection_detail,"What is the connection detail at grid A-5?",Grid A-5,high,architect\n"Member size clarification",member_size_length,"Confirm beam size for level 2",Level 2,medium,engineer';
      case 'Task':
        return 'name,phase,start_date,end_date,estimated_hours\n"Fabricate columns",fabrication,2026-02-10,2026-02-20,120\n"Deliver steel - Phase 1",delivery,2026-02-25,2026-02-25,8';
      case 'WorkPackage':
        return 'name,phase,tonnage,piece_count,target_fab_date\n"Level 1 Columns",fabrication,45,24,2026-03-01\n"Level 2 Beams",fabrication,67,38,2026-03-15';
      case 'Delivery':
        return 'description,scheduled_date,tonnage,piece_count,location\n"Level 1 Steel",2026-03-05,45,24,North Yard\n"Level 2 Steel",2026-03-20,67,38,South Yard';
      case 'ChangeOrder':
        return 'title,description,cost_impact,schedule_impact_days,status\n"Additional bracing","Add seismic bracing to grid lines 1-5",15000,7,draft\n"Revised connections","Update connection details per RFI-023",8000,3,submitted';
      default:
        return 'name,description,notes\n"Record 1","Description 1","Notes 1"\n"Record 2","Description 2","Notes 2"';
    }
  };

  const downloadTemplate = () => {
    const blob = new Blob([getTemplate()], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${entityName}_bulk_template.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const { parsedData, errors } = useMemo(() => {
    if (!csvData.trim()) return { parsedData: [], errors: [] };
    
    try {
      const rows = parseCSV(csvData);
      if (rows.length < 2) {
        return { parsedData: [], errors: ['Need at least header + 1 data row'] };
      }

      const headers = rows[0].map(h => h.replace(/"/g, ''));
      const records = [];
      const errs = [];

      rows.slice(1).forEach((row, idx) => {
        if (row.length !== headers.length) {
          errs.push(`Row ${idx + 2}: Column count mismatch (expected ${headers.length}, got ${row.length})`);
          return;
        }

        const record = { project_id: projectId };
        headers.forEach((header, i) => {
          const value = row[i].replace(/^"|"$/g, '');
          if (value) {
            // Type coercion
            if (header.includes('number') || header.includes('count') || header.includes('hours') || header.includes('tonnage')) {
              record[header] = parseFloat(value) || 0;
            } else if (header.includes('impact') && header.includes('cost')) {
              record[header] = parseFloat(value) || 0;
            } else {
              record[header] = value;
            }
          }
        });

        if (entityName === 'RFI') {
          if (!record.rfi_number) {
            record.rfi_number = 1000 + idx;
          }
          record.status = record.status || 'draft';
          
          if (!record.subject) {
            errs.push(`Row ${idx + 2}: Missing required field 'subject'`);
          }
        }

        records.push(record);
      });

      return { parsedData: records, errors: errs };
    } catch (err) {
      return { parsedData: [], errors: [err.message] };
    }
  }, [csvData, entityName, projectId]);

  const handleSave = async () => {
    if (errors.length > 0) {
      toast.error('Fix validation errors before saving');
      return;
    }

    setSaving(true);
    try {
      await base44.entities[entityName].bulkCreate(parsedData);
      toast.success(`${parsedData.length} records created`);
      onSave();
    } catch (error) {
      toast.error('Bulk add failed: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-6xl bg-zinc-900 border-zinc-800 text-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Add {entityName}s</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div className="bg-zinc-800/50 border border-zinc-700 rounded p-3 flex gap-2">
            <Info size={16} className="text-amber-500 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-zinc-400">
              <p className="mb-1">Paste CSV data with headers. Use quotes for values with commas.</p>
              <p>Format: header1,header2,header3 (first row) then data rows</p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={downloadTemplate}
              className="border-zinc-700 text-zinc-400 hover:text-white"
            >
              <Download size={14} className="mr-2" />
              Download Template
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setCsvData(getTemplate())}
              className="border-zinc-700 text-zinc-400 hover:text-white"
            >
              Load Sample Data
            </Button>
            {parsedData.length > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowPreview(!showPreview)}
                className="border-amber-700 text-amber-400 hover:text-amber-300"
              >
                {showPreview ? 'Hide' : 'Show'} Preview ({parsedData.length} records)
              </Button>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-xs text-zinc-400 font-medium">CSV Data</label>
            <Textarea
              value={csvData}
              onChange={(e) => setCsvData(e.target.value)}
              placeholder="Paste your CSV data here..."
              className="bg-zinc-800 border-zinc-700 text-white font-mono text-xs"
              rows={10}
            />
          </div>

          {errors.length > 0 && (
            <div className="bg-red-500/10 border border-red-500/30 rounded p-3">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle size={16} className="text-red-500" />
                <span className="text-sm font-semibold text-red-500">Validation Errors</span>
              </div>
              <ul className="space-y-1">
                {errors.map((err, i) => (
                  <li key={i} className="text-xs text-red-400">• {err}</li>
                ))}
              </ul>
            </div>
          )}

          {showPreview && parsedData.length > 0 && (
            <div className="border border-zinc-700 rounded">
              <div className="bg-zinc-800 px-4 py-2 border-b border-zinc-700 flex items-center gap-2">
                <CheckCircle2 size={14} className="text-green-500" />
                <span className="text-sm font-semibold text-white">Preview ({parsedData.length} records)</span>
              </div>
              <div className="max-h-[300px] overflow-auto">
                <table className="w-full text-xs">
                  <thead className="bg-zinc-800/50 sticky top-0">
                    <tr>
                      {parsedData[0] && Object.keys(parsedData[0]).map(key => (
                        <th key={key} className="text-left p-2 text-zinc-400 font-medium">
                          {key.replace(/_/g, ' ')}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {parsedData.map((record, i) => (
                      <tr key={i} className="border-t border-zinc-800 hover:bg-zinc-800/30">
                        {Object.entries(record).map(([key, val]) => (
                          <td key={key} className="p-2 text-white">
                            {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-between items-center pt-4 border-t border-zinc-800">
          <div className="flex items-center gap-2">
            {parsedData.length > 0 && errors.length === 0 && (
              <Badge variant="outline" className="text-green-500 border-green-500">
                <CheckCircle2 size={12} className="mr-1" />
                {parsedData.length} records ready
              </Badge>
            )}
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} disabled={saving} className="border-zinc-700">
              Cancel
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={saving || !csvData.trim() || parsedData.length === 0 || errors.length > 0} 
              className="bg-amber-500 hover:bg-amber-600 text-black"
            >
              {saving ? <><Loader2 size={14} className="animate-spin mr-2" />Creating...</> : `Create ${parsedData.length} Records`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}