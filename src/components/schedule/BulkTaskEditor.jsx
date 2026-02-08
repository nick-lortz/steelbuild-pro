import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X, Save, Zap } from 'lucide-react';

export default function BulkTaskEditor({ tasks, resources = [], onSave, onCancel }) {
  const [updates, setUpdates] = useState({
    status: '',
    priority: '',
    phase: '',
    assigned_resources: [],
    duration_days: '',
    progress_percent: ''
  });

  const [changedFields, setChangedFields] = useState(new Set());

  const handleFieldChange = (field, value) => {
    setUpdates(prev => ({
      ...prev,
      [field]: value
    }));
    setChangedFields(prev => new Set([...prev, field]));
  };

  const handleResourceToggle = (resourceId) => {
    setUpdates(prev => ({
      ...prev,
      assigned_resources: prev.assigned_resources.includes(resourceId)
        ? prev.assigned_resources.filter(id => id !== resourceId)
        : [...prev.assigned_resources, resourceId]
    }));
    setChangedFields(prev => new Set([...prev, 'assigned_resources']));
  };

  const handleSave = () => {
    const dataToUpdate = {};
    changedFields.forEach(field => {
      if (updates[field] !== '' && updates[field].length > 0) {
        dataToUpdate[field] = updates[field];
      }
    });

    if (Object.keys(dataToUpdate).length === 0) {
      alert('No changes to save');
      return;
    }

    onSave(dataToUpdate);
  };

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader className="border-b border-zinc-800 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-lg flex items-center gap-2">
            <Zap size={20} className="text-amber-500" />
            Bulk Edit {tasks.length} Tasks
          </CardTitle>
          <p className="text-xs text-zinc-400 mt-2">
            Only changed fields will be updated
          </p>
        </div>
        <button onClick={onCancel} className="text-zinc-400 hover:text-white">
          <X size={20} />
        </button>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        {/* Status */}
        <div>
          <label className="text-xs font-bold text-zinc-400 uppercase mb-2 block">Status</label>
          <Select value={updates.status} onValueChange={(v) => handleFieldChange('status', v)}>
            <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
              <SelectValue placeholder="No change" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-700">
              <SelectItem value="not_started" className="text-white">Not Started</SelectItem>
              <SelectItem value="in_progress" className="text-white">In Progress</SelectItem>
              <SelectItem value="completed" className="text-white">Completed</SelectItem>
              <SelectItem value="on_hold" className="text-white">On Hold</SelectItem>
              <SelectItem value="blocked" className="text-white">Blocked</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Phase */}
        <div>
          <label className="text-xs font-bold text-zinc-400 uppercase mb-2 block">Phase</label>
          <Select value={updates.phase} onValueChange={(v) => handleFieldChange('phase', v)}>
            <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
              <SelectValue placeholder="No change" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-700">
              <SelectItem value="detailing" className="text-white">Detailing</SelectItem>
              <SelectItem value="fabrication" className="text-white">Fabrication</SelectItem>
              <SelectItem value="delivery" className="text-white">Delivery</SelectItem>
              <SelectItem value="erection" className="text-white">Erection</SelectItem>
              <SelectItem value="closeout" className="text-white">Closeout</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Priority */}
        <div>
          <label className="text-xs font-bold text-zinc-400 uppercase mb-2 block">Priority</label>
          <Select value={updates.priority} onValueChange={(v) => handleFieldChange('priority', v)}>
            <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
              <SelectValue placeholder="No change" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-700">
              <SelectItem value="low" className="text-white">Low</SelectItem>
              <SelectItem value="medium" className="text-white">Medium</SelectItem>
              <SelectItem value="high" className="text-white">High</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Duration */}
        <div>
          <label className="text-xs font-bold text-zinc-400 uppercase mb-2 block">Duration (days)</label>
          <Input
            type="number"
            min="1"
            value={updates.duration_days}
            onChange={(e) => handleFieldChange('duration_days', e.target.value)}
            placeholder="No change"
            className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-600"
          />
        </div>

        {/* Progress */}
        <div>
          <label className="text-xs font-bold text-zinc-400 uppercase mb-2 block">Progress (%)</label>
          <Input
            type="number"
            min="0"
            max="100"
            value={updates.progress_percent}
            onChange={(e) => handleFieldChange('progress_percent', e.target.value)}
            placeholder="No change"
            className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-600"
          />
        </div>

        {/* Resources */}
        {resources.length > 0 && (
          <div>
            <label className="text-xs font-bold text-zinc-400 uppercase mb-3 block">
              Add Resources (to all selected tasks)
            </label>
            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-3 bg-zinc-950 rounded border border-zinc-800">
              {resources.slice(0, 20).map(resource => (
                <button
                  key={resource.id}
                  onClick={() => handleResourceToggle(resource.id)}
                  className={`p-2 rounded text-sm text-left transition-colors ${
                    updates.assigned_resources.includes(resource.id)
                      ? 'bg-amber-500/20 border border-amber-500 text-amber-400'
                      : 'bg-zinc-800 border border-zinc-700 text-zinc-300 hover:bg-zinc-700'
                  }`}
                >
                  <div className="font-medium truncate">{resource.name}</div>
                  <div className="text-xs text-zinc-500">{resource.type}</div>
                </button>
              ))}
            </div>
            {updates.assigned_resources.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {updates.assigned_resources.map(resId => {
                  const res = resources.find(r => r.id === resId);
                  return res ? (
                    <Badge key={resId} variant="outline" className="text-amber-400 border-amber-500">
                      {res.name}
                      <button
                        onClick={() => handleResourceToggle(resId)}
                        className="ml-1 text-xs hover:text-amber-300"
                      >
                        ×
                      </button>
                    </Badge>
                  ) : null;
                })}
              </div>
            )}
          </div>
        )}

        {/* Changed Fields Summary */}
        {changedFields.size > 0 && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded">
            <p className="text-xs text-amber-400 font-semibold">
              {changedFields.size} field{changedFields.size > 1 ? 's' : ''} will be updated on all {tasks.length} task{tasks.length > 1 ? 's' : ''}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t border-zinc-800">
          <Button
            onClick={onCancel}
            variant="outline"
            className="border-zinc-700 text-zinc-400 hover:text-white flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={changedFields.size === 0}
            className="bg-amber-500 hover:bg-amber-600 text-black flex-1 gap-2"
          >
            <Save size={16} />
            Apply Changes
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}