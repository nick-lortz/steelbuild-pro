import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { X, Plus, Info } from 'lucide-react';

export default function DependencyConfigurator({ 
  predecessorConfigs = [],
  availableTasks = [],
  onChange,
  onClose
}) {
  const [configs, setConfigs] = useState(predecessorConfigs);
  const [selectedTask, setSelectedTask] = useState('');

  const addPredecessor = () => {
    if (!selectedTask) return;
    
    const newConfig = {
      predecessor_id: selectedTask,
      type: 'FS',
      lag_days: 0
    };
    
    const updated = [...configs, newConfig];
    setConfigs(updated);
    setSelectedTask('');
  };

  const removePredecessor = (index) => {
    const updated = configs.filter((_, i) => i !== index);
    setConfigs(updated);
  };

  const updateConfig = (index, field, value) => {
    const updated = [...configs];
    updated[index] = { ...updated[index], [field]: value };
    setConfigs(updated);
  };

  const handleSave = () => {
    onChange(configs);
    onClose();
  };

  const usedTaskIds = configs.map(c => c.predecessor_id);
  const availableToAdd = availableTasks.filter(t => !usedTaskIds.includes(t.id));

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-zinc-900 border-zinc-800 text-white">
        <DialogHeader>
          <DialogTitle>Configure Task Dependencies</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Info */}
          <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg flex gap-2">
            <Info size={16} className="text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-blue-300 space-y-1">
              <p><strong>FS</strong> (Finish-to-Start): Successor starts after predecessor finishes</p>
              <p><strong>SS</strong> (Start-to-Start): Successor starts when predecessor starts</p>
              <p><strong>FF</strong> (Finish-to-Finish): Successor finishes when predecessor finishes</p>
              <p><strong>SF</strong> (Start-to-Finish): Successor finishes when predecessor starts</p>
              <p><strong>Lag</strong>: Delay (positive) or overlap (negative) in days</p>
            </div>
          </div>

          {/* Existing Dependencies */}
          {configs.length > 0 && (
            <div className="space-y-3">
              <Label>Current Dependencies</Label>
              {configs.map((config, index) => {
                const task = availableTasks.find(t => t.id === config.predecessor_id);
                return (
                  <div key={index} className="p-3 bg-zinc-800 rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-white">
                        {task?.name || 'Unknown Task'}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removePredecessor(index)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <X size={14} />
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs text-zinc-400">Dependency Type</Label>
                        <Select 
                          value={config.type} 
                          onValueChange={(v) => updateConfig(index, 'type', v)}
                        >
                          <SelectTrigger className="bg-zinc-900 border-zinc-700 h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="FS">Finish-to-Start (FS)</SelectItem>
                            <SelectItem value="SS">Start-to-Start (SS)</SelectItem>
                            <SelectItem value="FF">Finish-to-Finish (FF)</SelectItem>
                            <SelectItem value="SF">Start-to-Finish (SF)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-1.5">
                        <Label className="text-xs text-zinc-400">Lag Days</Label>
                        <Input
                          type="number"
                          value={config.lag_days}
                          onChange={(e) => updateConfig(index, 'lag_days', parseInt(e.target.value) || 0)}
                          className="bg-zinc-900 border-zinc-700 h-8"
                          placeholder="0"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Add New Dependency */}
          {availableToAdd.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-zinc-800">
              <Label>Add Predecessor Task</Label>
              <div className="flex gap-2">
                <Select value={selectedTask} onValueChange={setSelectedTask}>
                  <SelectTrigger className="flex-1 bg-zinc-800 border-zinc-700">
                    <SelectValue placeholder="Select task..." />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-700">
                    {availableToAdd.map(t => (
                      <SelectItem key={t.id} value={t.id} className="text-white">
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  onClick={addPredecessor}
                  disabled={!selectedTask}
                  className="bg-amber-500 hover:bg-amber-600 text-black"
                >
                  <Plus size={16} className="mr-1" />
                  Add
                </Button>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t border-zinc-800">
            <Button variant="outline" onClick={onClose} className="border-zinc-700">
              Cancel
            </Button>
            <Button onClick={handleSave} className="bg-amber-500 hover:bg-amber-600 text-black">
              Save Dependencies
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}