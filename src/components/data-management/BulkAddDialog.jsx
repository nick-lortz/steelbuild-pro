import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { base44 } from '@/api/base44Client';
import { toast } from '@/components/ui/notifications';
import { Loader2, Info } from 'lucide-react';

export default function BulkAddDialog({ entityName, projectId, onClose, onSave }) {
  const [csvData, setCsvData] = useState('');
  const [saving, setSaving] = useState(false);

  const getTemplate = () => {
    switch (entityName) {
      case 'RFI':
        return 'subject,rfi_type,question,location_area,priority,ball_in_court\nMissing connection detail,connection_detail,"What is the connection detail at grid A-5?",Grid A-5,high,architect\nMember size clarification,member_size_length,"Confirm beam size for level 2",Level 2,medium,engineer';
      case 'Task':
        return 'name,phase,start_date,end_date,estimated_hours\nFabricate columns,fabrication,2026-02-10,2026-02-20,120\nDeliver steel - Phase 1,delivery,2026-02-25,2026-02-25,8';
      case 'WorkPackage':
        return 'name,phase,tonnage,piece_count,target_fab_date\nLevel 1 Columns,fabrication,45,24,2026-03-01\nLevel 2 Beams,fabrication,67,38,2026-03-15';
      case 'Delivery':
        return 'description,scheduled_date,tonnage,piece_count,location\nLevel 1 Steel,2026-03-05,45,24,North Yard\nLevel 2 Steel,2026-03-20,67,38,South Yard';
      case 'ChangeOrder':
        return 'title,description,cost_impact,schedule_impact_days,status\nAdditional bracing,Add seismic bracing to grid lines 1-5,15000,7,draft\nRevised connections,Update connection details per RFI-023,8000,3,submitted';
      default:
        return 'name,description,notes\nRecord 1,Description 1,Notes 1\nRecord 2,Description 2,Notes 2';
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const lines = csvData.trim().split('\n');
      if (lines.length < 2) {
        toast.error('Please provide at least a header and one data row');
        setSaving(false);
        return;
      }

      const headers = lines[0].split(',').map(h => h.trim());
      const records = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim());
        const record = { project_id: projectId };
        headers.forEach((header, i) => {
          if (values[i]) {
            record[header] = values[i];
          }
        });
        
        if (entityName === 'RFI') {
          record.rfi_number = Date.now() + Math.random();
          record.status = record.status || 'draft';
        }
        
        return record;
      });

      await base44.entities[entityName].bulkCreate(records);
      toast.success(`${records.length} records created`);
      onSave();
    } catch (error) {
      toast.error('Bulk add failed: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl bg-zinc-900 border-zinc-800 text-white max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Add {entityName}s</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div className="bg-zinc-800/50 border border-zinc-700 rounded p-3 flex gap-2">
            <Info size={16} className="text-amber-500 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-zinc-400">
              <p className="mb-1">Paste CSV data with headers in the first row. Use the template below as a guide.</p>
              <p>Format: <code className="text-amber-500">header1,header2,header3</code> then data rows.</p>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-zinc-400 font-medium">CSV Template</label>
            <Textarea
              value={getTemplate()}
              readOnly
              className="bg-zinc-800/50 border-zinc-700 text-zinc-500 font-mono text-xs"
              rows={4}
            />
            <Button
              size="sm"
              variant="outline"
              onClick={() => setCsvData(getTemplate())}
              className="border-zinc-700 text-zinc-400 hover:text-white text-xs"
            >
              Use Template
            </Button>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-zinc-400 font-medium">Your CSV Data</label>
            <Textarea
              value={csvData}
              onChange={(e) => setCsvData(e.target.value)}
              placeholder="Paste your CSV data here..."
              className="bg-zinc-800 border-zinc-700 text-white font-mono text-xs"
              rows={12}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
          <Button variant="outline" onClick={onClose} disabled={saving} className="border-zinc-700">
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !csvData.trim()} className="bg-amber-500 hover:bg-amber-600 text-black">
            {saving ? <><Loader2 size={14} className="animate-spin mr-2" />Creating...</> : 'Create Records'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}