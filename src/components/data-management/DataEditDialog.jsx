import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { apiClient } from '@/api/client';
import { toast } from '@/components/ui/notifications';
import { Loader2 } from 'lucide-react';

export default function DataEditDialog({ record, entityName, onClose, onSave }) {
  const [editData, setEditData] = useState({ ...record });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiClient.entities[entityName].update(record.id, editData);
      toast.success('Record updated');
      onSave();
    } catch (error) {
      toast.error('Update failed: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const renderField = (key, value) => {
    if (key === 'id' || key === 'created_date' || key === 'updated_date' || key === 'created_by') {
      return null;
    }
    
    // Allow editing rfi_number
    if (key === 'rfi_number') {
      return (
        <div key={key} className="space-y-1">
          <label className="text-xs text-zinc-400 font-medium">RFI Number</label>
          <Input
            type="number"
            value={editData[key] || 0}
            onChange={(e) => setEditData({ ...editData, [key]: parseInt(e.target.value) || 0 })}
            className="bg-zinc-800 border-zinc-700 text-white"
          />
        </div>
      );
    }

    if (typeof value === 'boolean') {
      return (
        <div key={key} className="space-y-1">
          <label className="text-xs text-zinc-400 font-medium">{key.replace(/_/g, ' ')}</label>
          <Select
            value={String(editData[key])}
            onValueChange={(v) => setEditData({ ...editData, [key]: v === 'true' })}
          >
            <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">True</SelectItem>
              <SelectItem value="false">False</SelectItem>
            </SelectContent>
          </Select>
        </div>
      );
    }

    if (typeof value === 'object' && value !== null) {
      return (
        <div key={key} className="space-y-1">
          <label className="text-xs text-zinc-400 font-medium">{key.replace(/_/g, ' ')}</label>
          <Textarea
            value={JSON.stringify(editData[key], null, 2)}
            onChange={(e) => {
              try {
                setEditData({ ...editData, [key]: JSON.parse(e.target.value) });
              } catch (err) {
                // Invalid JSON - keep as-is
              }
            }}
            className="bg-zinc-800 border-zinc-700 text-white font-mono text-xs"
            rows={6}
          />
        </div>
      );
    }

    if (key.includes('date') && value && !key.includes('_date')) {
      return (
        <div key={key} className="space-y-1">
          <label className="text-xs text-zinc-400 font-medium">{key.replace(/_/g, ' ')}</label>
          <Input
            type="date"
            value={editData[key] || ''}
            onChange={(e) => setEditData({ ...editData, [key]: e.target.value })}
            className="bg-zinc-800 border-zinc-700 text-white"
          />
        </div>
      );
    }

    if (typeof value === 'number') {
      return (
        <div key={key} className="space-y-1">
          <label className="text-xs text-zinc-400 font-medium">{key.replace(/_/g, ' ')}</label>
          <Input
            type="number"
            value={editData[key] || 0}
            onChange={(e) => setEditData({ ...editData, [key]: parseFloat(e.target.value) || 0 })}
            className="bg-zinc-800 border-zinc-700 text-white"
          />
        </div>
      );
    }

    if (typeof value === 'string' && value.length > 100) {
      return (
        <div key={key} className="space-y-1">
          <label className="text-xs text-zinc-400 font-medium">{key.replace(/_/g, ' ')}</label>
          <Textarea
            value={editData[key] || ''}
            onChange={(e) => setEditData({ ...editData, [key]: e.target.value })}
            className="bg-zinc-800 border-zinc-700 text-white"
            rows={4}
          />
        </div>
      );
    }

    return (
      <div key={key} className="space-y-1">
        <label className="text-xs text-zinc-400 font-medium">{key.replace(/_/g, ' ')}</label>
        <Input
          value={editData[key] || ''}
          onChange={(e) => setEditData({ ...editData, [key]: e.target.value })}
          className="bg-zinc-800 border-zinc-700 text-white"
        />
      </div>
    );
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl bg-zinc-900 border-zinc-800 text-white max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit {entityName}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 mt-4">
          {Object.entries(record).map(([key, value]) => renderField(key, value))}
        </div>
        <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={saving}
            className="border-zinc-700 text-white hover:bg-zinc-800"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-amber-500 hover:bg-amber-600 text-black"
          >
            {saving ? (
              <>
                <Loader2 size={14} className="animate-spin mr-2" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}