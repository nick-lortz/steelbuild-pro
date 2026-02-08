import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { base44 } from '@/api/base44Client';
import { toast } from '@/components/ui/notifications';
import { Loader2 } from 'lucide-react';

export default function CreateRecordDialog({ entityName, projectId, onClose, onSave }) {
  const [formData, setFormData] = useState({ project_id: projectId || '' });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await base44.entities[entityName].create(formData);
      toast.success('Record created');
      onSave();
    } catch (error) {
      toast.error('Create failed: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const commonFields = [
    { key: 'name', label: 'Name', type: 'text' },
    { key: 'title', label: 'Title', type: 'text' },
    { key: 'description', label: 'Description', type: 'textarea' },
    { key: 'status', label: 'Status', type: 'select', options: ['draft', 'active', 'completed', 'cancelled'] },
    { key: 'notes', label: 'Notes', type: 'textarea' }
  ];

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-zinc-900 border-zinc-800 text-white max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New {entityName}</DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 gap-4 mt-4">
          {projectId && (
            <div className="space-y-1">
              <label className="text-xs text-zinc-400 font-medium">Project</label>
              <Input
                value={projectId}
                disabled
                className="bg-zinc-800/50 border-zinc-700 text-zinc-500"
              />
            </div>
          )}
          
          {commonFields.map(field => {
            if (field.type === 'textarea') {
              return (
                <div key={field.key} className="space-y-1">
                  <label className="text-xs text-zinc-400 font-medium">{field.label}</label>
                  <Textarea
                    value={formData[field.key] || ''}
                    onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                    className="bg-zinc-800 border-zinc-700 text-white"
                    rows={3}
                  />
                </div>
              );
            }
            
            if (field.type === 'select') {
              return (
                <div key={field.key} className="space-y-1">
                  <label className="text-xs text-zinc-400 font-medium">{field.label}</label>
                  <Select
                    value={formData[field.key] || ''}
                    onValueChange={(v) => setFormData({ ...formData, [field.key]: v })}
                  >
                    <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                      <SelectValue placeholder={`Select ${field.label}`} />
                    </SelectTrigger>
                    <SelectContent>
                      {field.options?.map(opt => (
                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              );
            }
            
            return (
              <div key={field.key} className="space-y-1">
                <label className="text-xs text-zinc-400 font-medium">{field.label}</label>
                <Input
                  value={formData[field.key] || ''}
                  onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
            );
          })}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
          <Button variant="outline" onClick={onClose} disabled={saving} className="border-zinc-700">
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving} className="bg-amber-500 hover:bg-amber-600 text-black">
            {saving ? <><Loader2 size={14} className="animate-spin mr-2" />Creating...</> : 'Create Record'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}