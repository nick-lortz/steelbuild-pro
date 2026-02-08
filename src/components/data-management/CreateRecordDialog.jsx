import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { base44 } from '@/api/base44Client';
import { apiClient } from '@/api/client';
import { toast } from '@/components/ui/notifications';
import { Loader2 } from 'lucide-react';

const ENTITY_TEMPLATES = {
  RFI: [
    { key: 'subject', label: 'Subject', type: 'text', required: true },
    { key: 'rfi_type', label: 'RFI Type', type: 'select', options: ['connection_detail', 'member_size_length', 'embed_anchor', 'tolerance_fitup', 'coating_finish', 'erection_sequence', 'other'], required: true },
    { key: 'question', label: 'Question', type: 'textarea', required: true },
    { key: 'location_area', label: 'Location/Gridline', type: 'text' },
    { key: 'priority', label: 'Priority', type: 'select', options: ['low', 'medium', 'high', 'critical'], required: true },
    { key: 'ball_in_court', label: 'Ball in Court', type: 'select', options: ['internal', 'external', 'gc', 'architect', 'engineer'], required: true },
    { key: 'due_date', label: 'Due Date', type: 'date' }
  ],
  Task: [
    { key: 'name', label: 'Task Name', type: 'text', required: true },
    { key: 'phase', label: 'Phase', type: 'select', options: ['detailing', 'fabrication', 'delivery', 'erection', 'closeout'], required: true },
    { key: 'start_date', label: 'Start Date', type: 'date', required: true },
    { key: 'end_date', label: 'End Date', type: 'date', required: true },
    { key: 'estimated_hours', label: 'Est. Hours', type: 'number' },
    { key: 'notes', label: 'Notes', type: 'textarea' }
  ],
  WorkPackage: [
    { key: 'name', label: 'Package Name', type: 'text', required: true },
    { key: 'phase', label: 'Phase', type: 'select', options: ['detailing', 'fabrication', 'delivery', 'erection'], required: true },
    { key: 'tonnage', label: 'Tonnage', type: 'number' },
    { key: 'piece_count', label: 'Piece Count', type: 'number' },
    { key: 'target_fab_date', label: 'Target Fab Date', type: 'date' },
    { key: 'notes', label: 'Notes', type: 'textarea' }
  ],
  ChangeOrder: [
    { key: 'title', label: 'Title', type: 'text', required: true },
    { key: 'description', label: 'Description', type: 'textarea', required: true },
    { key: 'cost_impact', label: 'Cost Impact', type: 'number' },
    { key: 'schedule_impact_days', label: 'Schedule Impact (Days)', type: 'number' },
    { key: 'status', label: 'Status', type: 'select', options: ['draft', 'submitted', 'under_review', 'approved', 'rejected'] }
  ],
  Delivery: [
    { key: 'description', label: 'Description', type: 'text', required: true },
    { key: 'scheduled_date', label: 'Scheduled Date', type: 'date', required: true },
    { key: 'tonnage', label: 'Tonnage', type: 'number' },
    { key: 'piece_count', label: 'Piece Count', type: 'number' },
    { key: 'location', label: 'Delivery Location', type: 'text' }
  ]
};

export default function CreateRecordDialog({ entityName, projectId, onClose, onSave }) {
  const template = ENTITY_TEMPLATES[entityName] || [
    { key: 'name', label: 'Name', type: 'text' },
    { key: 'description', label: 'Description', type: 'textarea' },
    { key: 'notes', label: 'Notes', type: 'textarea' }
  ];

  const initialData = { project_id: projectId || '' };
  if (entityName === 'RFI') {
    initialData.rfi_number = Date.now(); // Temp number
    initialData.status = 'draft';
  }

  const [formData, setFormData] = useState(initialData);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiClient.entities[entityName].create(formData);
      toast.success(`${entityName} created`);
      onSave();
    } catch (error) {
      toast.error('Create failed: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const renderField = (field) => {
    if (field.type === 'textarea') {
      return (
        <div key={field.key} className="space-y-1">
          <label className="text-xs text-zinc-400 font-medium">
            {field.label} {field.required && <span className="text-red-500">*</span>}
          </label>
          <Textarea
            value={formData[field.key] || ''}
            onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
            className="bg-zinc-800 border-zinc-700 text-white"
            rows={3}
            required={field.required}
          />
        </div>
      );
    }

    if (field.type === 'select') {
      return (
        <div key={field.key} className="space-y-1">
          <label className="text-xs text-zinc-400 font-medium">
            {field.label} {field.required && <span className="text-red-500">*</span>}
          </label>
          <Select
            value={formData[field.key] || ''}
            onValueChange={(v) => setFormData({ ...formData, [field.key]: v })}
          >
            <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
              <SelectValue placeholder={`Select ${field.label}`} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map(opt => (
                <SelectItem key={opt} value={opt}>
                  {opt.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
    }

    if (field.type === 'date') {
      return (
        <div key={field.key} className="space-y-1">
          <label className="text-xs text-zinc-400 font-medium">
            {field.label} {field.required && <span className="text-red-500">*</span>}
          </label>
          <Input
            type="date"
            value={formData[field.key] || ''}
            onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
            className="bg-zinc-800 border-zinc-700 text-white"
            required={field.required}
          />
        </div>
      );
    }

    if (field.type === 'number') {
      return (
        <div key={field.key} className="space-y-1">
          <label className="text-xs text-zinc-400 font-medium">
            {field.label} {field.required && <span className="text-red-500">*</span>}
          </label>
          <Input
            type="number"
            value={formData[field.key] || ''}
            onChange={(e) => setFormData({ ...formData, [field.key]: parseFloat(e.target.value) || 0 })}
            className="bg-zinc-800 border-zinc-700 text-white"
            required={field.required}
          />
        </div>
      );
    }

    return (
      <div key={field.key} className="space-y-1">
        <label className="text-xs text-zinc-400 font-medium">
          {field.label} {field.required && <span className="text-red-500">*</span>}
        </label>
        <Input
          value={formData[field.key] || ''}
          onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
          className="bg-zinc-800 border-zinc-700 text-white"
          required={field.required}
        />
      </div>
    );
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-zinc-900 border-zinc-800 text-white max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New {entityName}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 mt-4">
          {template.map(field => renderField(field))}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
          <Button variant="outline" onClick={onClose} disabled={saving} className="border-zinc-700">
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving} className="bg-amber-500 hover:bg-amber-600 text-black">
            {saving ? <><Loader2 size={14} className="animate-spin mr-2" />Creating...</> : `Create ${entityName}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}