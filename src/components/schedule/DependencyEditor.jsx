import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { X, Link as LinkIcon } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { apiClient } from '@/api/client';
import { toast } from 'sonner';
import { addDays, format } from 'date-fns';

export default function DependencyEditor({ task, tasks, open, onOpenChange }) {
  const [predecessorId, setPredecessorId] = useState('');
  const [dependencyType, setDependencyType] = useState('FS');
  const [lagDays, setLagDays] = useState(0);
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => apiClient.entities.Task.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Dependencies updated');
    },
  });

  const availablePredecessors = tasks.filter(t => 
    t.id !== task.id && 
    t.project_id === task.project_id &&
    !task.predecessor_ids?.includes(t.id)
  );

  const addDependency = () => {
    if (!predecessorId) return;

    const predecessor = tasks.find(t => t.id === predecessorId);
    if (!predecessor) return;

    const updatedPredecessors = [...(task.predecessor_ids || []), predecessorId];
    
    // Calculate new dates based on dependency type
    let newStartDate = task.start_date;
    let newEndDate = task.end_date;

    if (predecessor.end_date && dependencyType === 'FS') {
      // Finish-to-Start: this task starts after predecessor finishes
      const predEnd = new Date(predecessor.end_date);
      newStartDate = format(addDays(predEnd, parseInt(lagDays) || 0), 'yyyy-MM-dd');
      const duration = task.duration_days || 0;
      newEndDate = format(addDays(new Date(newStartDate), duration), 'yyyy-MM-dd');
    } else if (predecessor.start_date && dependencyType === 'SS') {
      // Start-to-Start: this task starts when predecessor starts
      const predStart = new Date(predecessor.start_date);
      newStartDate = format(addDays(predStart, parseInt(lagDays) || 0), 'yyyy-MM-dd');
      const duration = task.duration_days || 0;
      newEndDate = format(addDays(new Date(newStartDate), duration), 'yyyy-MM-dd');
    } else if (predecessor.end_date && dependencyType === 'FF') {
      // Finish-to-Finish: this task finishes when predecessor finishes
      const predEnd = new Date(predecessor.end_date);
      newEndDate = format(addDays(predEnd, parseInt(lagDays) || 0), 'yyyy-MM-dd');
      const duration = task.duration_days || 0;
      newStartDate = format(addDays(new Date(newEndDate), -duration), 'yyyy-MM-dd');
    }

    updateMutation.mutate({
      id: task.id,
      data: {
        predecessor_ids: updatedPredecessors,
        dependency_type: dependencyType,
        lag_days: parseInt(lagDays) || 0,
        start_date: newStartDate,
        end_date: newEndDate,
      },
    });

    setPredecessorId('');
    setLagDays(0);
  };

  const removeDependency = (predId) => {
    const updatedPredecessors = (task.predecessor_ids || []).filter(id => id !== predId);
    updateMutation.mutate({
      id: task.id,
      data: { predecessor_ids: updatedPredecessors },
    });
  };

  const dependencyTypeLabels = {
    FS: 'Finish-to-Start',
    SS: 'Start-to-Start',
    FF: 'Finish-to-Finish',
    SF: 'Start-to-Finish',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-zinc-900 border-zinc-800 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LinkIcon size={18} />
            Manage Dependencies: {task.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Dependencies */}
          {task.predecessor_ids && task.predecessor_ids.length > 0 && (
            <div className="space-y-3">
              <Label>Current Dependencies</Label>
              <div className="space-y-2">
                {task.predecessor_ids.map(predId => {
                  const pred = tasks.find(t => t.id === predId);
                  if (!pred) return null;
                  return (
                    <div key={predId} className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg">
                      <div>
                        <p className="font-medium text-white">{pred.name}</p>
                        <p className="text-xs text-zinc-400">
                          {dependencyTypeLabels[task.dependency_type || 'FS']}
                          {task.lag_days ? ` + ${task.lag_days} day${task.lag_days !== 1 ? 's' : ''} lag` : ''}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeDependency(predId)}
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      >
                        <X size={16} />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Add New Dependency */}
          <div className="border-t border-zinc-800 pt-4 space-y-4">
            <Label>Add New Dependency</Label>
            
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-2">
                <Label className="text-xs">Predecessor Task</Label>
                <Select value={predecessorId} onValueChange={setPredecessorId}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700">
                    <SelectValue placeholder="Select predecessor" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-700 max-h-64">
                    {availablePredecessors.map(t => (
                      <SelectItem key={t.id} value={t.id} className="text-white">
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Type</Label>
                <Select value={dependencyType} onValueChange={setDependencyType}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-700">
                    <SelectItem value="FS" className="text-white">FS</SelectItem>
                    <SelectItem value="SS" className="text-white">SS</SelectItem>
                    <SelectItem value="FF" className="text-white">FF</SelectItem>
                    <SelectItem value="SF" className="text-white">SF</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs">Lag (days)</Label>
                <Input
                  type="number"
                  value={lagDays}
                  onChange={(e) => setLagDays(e.target.value)}
                  placeholder="0"
                  className="bg-zinc-800 border-zinc-700"
                />
              </div>
              <div className="flex items-end">
                <Button
                  onClick={addDependency}
                  disabled={!predecessorId || updateMutation.isPending}
                  className="w-full bg-amber-500 hover:bg-amber-600 text-black"
                >
                  Add Dependency
                </Button>
              </div>
            </div>

            {/* Dependency Type Explanations */}
            <div className="p-3 bg-zinc-800/30 rounded-lg text-xs space-y-2">
              <p className="text-zinc-400 font-medium">Dependency Types:</p>
              <div className="grid grid-cols-2 gap-2 text-zinc-500">
                <div><span className="text-amber-400">FS:</span> Finish-to-Start (most common)</div>
                <div><span className="text-amber-400">SS:</span> Start-to-Start</div>
                <div><span className="text-amber-400">FF:</span> Finish-to-Finish</div>
                <div><span className="text-amber-400">SF:</span> Start-to-Finish</div>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-zinc-800">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-zinc-700"
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}