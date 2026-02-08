import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2 } from 'lucide-react';

export default function BulkEditDialog({ records, entityName, fields, onClose, onSave }) {
  const [updates, setUpdates] = useState({});
  const [enabledFields, setEnabledFields] = useState(new Set());
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const updateData = {};
    enabledFields.forEach(field => {
      updateData[field] = updates[field];
    });
    await onSave(updateData);
    setSaving(false);
    onClose();
  };

  const toggleField = (field) => {
    const newEnabled = new Set(enabledFields);
    if (newEnabled.has(field)) {
      newEnabled.delete(field);
    } else {
      newEnabled.add(field);
    }
    setEnabledFields(newEnabled);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-zinc-900 border-zinc-800 text-white">
        <DialogHeader>
          <DialogTitle>Bulk Edit {records.length} Records</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-3 mt-4">
          <p className="text-xs text-zinc-500">Select fields to update across all selected records</p>
          
          {fields.map(field => (
            <div key={field} className="flex items-center gap-3 p-3 rounded bg-zinc-800/50">
              <Checkbox
                checked={enabledFields.has(field)}
                onCheckedChange={() => toggleField(field)}
              />
              <div className="flex-1">
                <label className="text-xs text-zinc-400 font-medium block mb-1">
                  {field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </label>
                <Input
                  disabled={!enabledFields.has(field)}
                  value={updates[field] || ''}
                  onChange={(e) => setUpdates({ ...updates, [field]: e.target.value })}
                  className="bg-zinc-800 border-zinc-700 text-white"
                  placeholder="New value"
                />
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800 mt-4">
          <Button variant="outline" onClick={onClose} disabled={saving} className="border-zinc-700">
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || enabledFields.size === 0} className="bg-amber-500 hover:bg-amber-600 text-black">
            {saving ? <><Loader2 size={14} className="animate-spin mr-2" />Updating...</> : `Update ${records.length} Records`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}