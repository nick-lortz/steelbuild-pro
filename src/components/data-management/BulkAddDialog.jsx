import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { apiClient } from '@/api/client';
import { toast } from '@/components/ui/notifications';
import { Loader2, Plus, Download, Upload, Table2, FileText, X } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const getEntityFields = (entityName) => {
  const fieldConfigs = {
    RFI: [
      { key: 'rfi_number', label: 'RFI #', type: 'number', required: false },
      { key: 'subject', label: 'Subject', type: 'text', required: true },
      { key: 'rfi_type', label: 'Type', type: 'select', options: ['connection_detail', 'member_size_length', 'embed_anchor', 'tolerance_fitup', 'coating_finish', 'erection_sequence', 'other'], required: false },
      { key: 'question', label: 'Question', type: 'textarea', required: true },
      { key: 'location_area', label: 'Location', type: 'text', required: false },
      { key: 'priority', label: 'Priority', type: 'select', options: ['low', 'medium', 'high', 'critical'], required: false },
      { key: 'ball_in_court', label: 'Ball in Court', type: 'select', options: ['internal', 'external', 'gc', 'architect', 'engineer', 'vendor'], required: false },
    ],
    Task: [
      { key: 'name', label: 'Task Name', type: 'text', required: true },
      { key: 'phase', label: 'Phase', type: 'select', options: ['detailing', 'fabrication', 'delivery', 'erection', 'closeout'], required: false },
      { key: 'start_date', label: 'Start Date', type: 'date', required: true },
      { key: 'end_date', label: 'End Date', type: 'date', required: true },
      { key: 'estimated_hours', label: 'Est. Hours', type: 'number', required: false },
    ],
    WorkPackage: [
      { key: 'name', label: 'Package Name', type: 'text', required: true },
      { key: 'phase', label: 'Phase', type: 'select', options: ['detailing', 'fabrication', 'delivery', 'erection', 'closeout'], required: false },
      { key: 'tonnage', label: 'Tonnage', type: 'number', required: false },
      { key: 'piece_count', label: 'Piece Count', type: 'number', required: false },
      { key: 'target_fab_date', label: 'Target Fab Date', type: 'date', required: false },
    ],
    Delivery: [
      { key: 'description', label: 'Description', type: 'text', required: true },
      { key: 'scheduled_date', label: 'Scheduled Date', type: 'date', required: true },
      { key: 'tonnage', label: 'Tonnage', type: 'number', required: false },
      { key: 'piece_count', label: 'Piece Count', type: 'number', required: false },
      { key: 'location', label: 'Location', type: 'text', required: false },
    ],
    ChangeOrder: [
      { key: 'co_number', label: 'CO #', type: 'number', required: false },
      { key: 'title', label: 'Title', type: 'text', required: true },
      { key: 'description', label: 'Description', type: 'textarea', required: false },
      { key: 'cost_impact', label: 'Cost Impact', type: 'number', required: false },
      { key: 'schedule_impact_days', label: 'Schedule Impact (days)', type: 'number', required: false },
    ],
  };
  
  return fieldConfigs[entityName] || [
    { key: 'name', label: 'Name', type: 'text', required: true },
    { key: 'description', label: 'Description', type: 'text', required: false },
  ];
};

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
  const fields = getEntityFields(entityName);
  const [mode, setMode] = useState('manual');
  const [rows, setRows] = useState([{}]);
  const [csvText, setCsvText] = useState('');
  const [saving, setSaving] = useState(false);

  const addRow = () => {
    setRows([...rows, {}]);
  };

  const removeRow = (index) => {
    setRows(rows.filter((_, i) => i !== index));
  };

  const updateCell = (rowIndex, fieldKey, value) => {
    const newRows = [...rows];
    newRows[rowIndex] = { ...newRows[rowIndex], [fieldKey]: value };
    setRows(newRows);
  };

  const parseCSVData = () => {
    try {
      const parsed = parseCSV(csvText);
      if (parsed.length < 2) {
        toast.error('Need header row + data rows');
        return;
      }

      const headers = parsed[0].map(h => h.replace(/"/g, '').trim());
      const newRows = [];

      for (let i = 1; i < parsed.length; i++) {
        const row = {};
        headers.forEach((header, idx) => {
          const value = parsed[i][idx]?.replace(/^"|"$/g, '').trim();
          if (value) {
            const field = fields.find(f => f.key === header || f.label.toLowerCase() === header.toLowerCase());
            if (field) {
              if (field.type === 'number') {
                row[field.key] = parseFloat(value) || 0;
              } else {
                row[field.key] = value;
              }
            }
          }
        });
        if (Object.keys(row).length > 0) {
          newRows.push(row);
        }
      }

      setRows(newRows);
      setMode('manual');
      toast.success(`Loaded ${newRows.length} rows from CSV`);
    } catch (err) {
      toast.error('CSV parse failed: ' + err.message);
    }
  };

  const downloadTemplate = () => {
    const headers = fields.map(f => f.key).join(',');
    const sampleRow = fields.map(f => {
      if (f.type === 'select') return f.options[0];
      if (f.type === 'number') return '0';
      if (f.type === 'date') return '2026-03-01';
      return 'Sample';
    }).join(',');
    
    const csv = `${headers}\n${sampleRow}`;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${entityName}_template.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const validRows = useMemo(() => {
    return rows.filter(row => {
      const requiredFields = fields.filter(f => f.required);
      return requiredFields.every(f => row[f.key] && String(row[f.key]).trim());
    });
  }, [rows, fields]);

  const handleSave = async () => {
    if (validRows.length === 0) {
      toast.error('No valid rows to save');
      return;
    }

    setSaving(true);
    try {
      const records = validRows.map(row => ({
        project_id: projectId,
        ...row,
      }));

      await apiClient.entities[entityName].bulkCreate(records);
      toast.success(`Created ${records.length} ${entityName}${records.length > 1 ? 's' : ''}`);
      onSave();
    } catch (error) {
      toast.error('Save failed: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const renderCell = (field, rowIndex, value) => {
    if (field.type === 'select') {
      return (
        <Select value={value || ''} onValueChange={(v) => updateCell(rowIndex, field.key, v)}>
          <SelectTrigger className="h-8 bg-zinc-800 border-zinc-700 text-white text-xs">
            <SelectValue placeholder="Select..." />
          </SelectTrigger>
          <SelectContent>
            {field.options.map(opt => (
              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    if (field.type === 'textarea') {
      return (
        <Textarea
          value={value || ''}
          onChange={(e) => updateCell(rowIndex, field.key, e.target.value)}
          className="bg-zinc-800 border-zinc-700 text-white text-xs min-h-[60px]"
          placeholder={field.label}
        />
      );
    }

    return (
      <Input
        type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
        value={value || ''}
        onChange={(e) => {
          const val = field.type === 'number' ? (parseFloat(e.target.value) || 0) : e.target.value;
          updateCell(rowIndex, field.key, val);
        }}
        className="h-8 bg-zinc-800 border-zinc-700 text-white text-xs"
        placeholder={field.label}
      />
    );
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] bg-zinc-900 border-zinc-800 text-white max-h-[95vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Bulk Add {entityName}s</DialogTitle>
        </DialogHeader>

        <Tabs value={mode} onValueChange={setMode} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="bg-zinc-800 mb-4">
            <TabsTrigger value="manual" className="data-[state=active]:bg-amber-500 data-[state=active]:text-black">
              <Table2 size={14} className="mr-2" />
              Manual Entry
            </TabsTrigger>
            <TabsTrigger value="csv" className="data-[state=active]:bg-amber-500 data-[state=active]:text-black">
              <FileText size={14} className="mr-2" />
              CSV Import
            </TabsTrigger>
          </TabsList>

          <TabsContent value="manual" className="flex-1 overflow-hidden flex flex-col mt-0">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-400">
                  {validRows.length} of {rows.length} rows valid
                </span>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={addRow} className="bg-amber-500 hover:bg-amber-600 text-black">
                  <Plus size={14} className="mr-1" />
                  Add Row
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-auto border border-zinc-800 rounded">
              <table className="w-full text-xs">
                <thead className="bg-zinc-800 sticky top-0 z-10">
                  <tr>
                    <th className="w-10 p-2"></th>
                    {fields.map(field => (
                      <th key={field.key} className="text-left p-2 text-zinc-400 font-medium min-w-[150px]">
                        {field.label}
                        {field.required && <span className="text-red-500 ml-1">*</span>}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, rowIndex) => {
                    const isValid = fields.filter(f => f.required).every(f => row[f.key] && String(row[f.key]).trim());
                    return (
                      <tr key={rowIndex} className={`border-t border-zinc-800 ${!isValid ? 'bg-red-500/5' : ''}`}>
                        <td className="p-2">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => removeRow(rowIndex)}
                            className="h-6 w-6 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                          >
                            <X size={12} />
                          </Button>
                        </td>
                        {fields.map(field => (
                          <td key={field.key} className="p-2">
                            {renderCell(field, rowIndex, row[field.key])}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="csv" className="flex-1 flex flex-col mt-0 space-y-3">
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={downloadTemplate} className="border-zinc-700">
                <Download size={14} className="mr-2" />
                Download Template
              </Button>
              <Button size="sm" variant="outline" onClick={parseCSVData} className="border-amber-700 text-amber-400 hover:text-amber-300">
                <Upload size={14} className="mr-2" />
                Import CSV to Table
              </Button>
            </div>

            <Textarea
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder="Paste CSV data here (headers in first row)..."
              className="flex-1 bg-zinc-800 border-zinc-700 text-white font-mono text-xs"
              rows={15}
            />
          </TabsContent>
        </Tabs>

        <div className="flex justify-between items-center pt-4 border-t border-zinc-800 mt-4">
          <div className="text-xs text-zinc-400">
            {validRows.length > 0 ? (
              <span className="text-green-500">✓ {validRows.length} records ready to create</span>
            ) : (
              <span>Fill required fields (*) to enable save</span>
            )}
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} disabled={saving} className="border-zinc-700">
              Cancel
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={saving || validRows.length === 0} 
              className="bg-amber-500 hover:bg-amber-600 text-black"
            >
              {saving ? (
                <>
                  <Loader2 size={14} className="animate-spin mr-2" />
                  Creating...
                </>
              ) : (
                `Create ${validRows.length} Record${validRows.length !== 1 ? 's' : ''}`
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}