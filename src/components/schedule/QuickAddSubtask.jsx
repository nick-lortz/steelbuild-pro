import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, X } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { apiClient } from '@/api/client';
import { format, addDays } from 'date-fns';
import { toast } from 'sonner';

export default function QuickAddSubtask({ parentTask, open, onOpenChange }) {
  const [subtasks, setSubtasks] = useState([
    { name: '', duration: 5, phase: parentTask.phase }
  ]);
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data) => apiClient.entities.Task.bulkCreate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Subtasks created successfully');
      onOpenChange(false);
    },
  });

  const addSubtask = () => {
    setSubtasks([...subtasks, { name: '', duration: 5, phase: parentTask.phase }]);
  };

  const removeSubtask = (index) => {
    setSubtasks(subtasks.filter((_, i) => i !== index));
  };

  const updateSubtask = (index, field, value) => {
    const updated = [...subtasks];
    updated[index][field] = value;
    setSubtasks(updated);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const validSubtasks = subtasks.filter(st => st.name.trim());
    if (validSubtasks.length === 0) {
      toast.error('Please add at least one subtask');
      return;
    }

    // Create subtasks with sequential dates
    let currentStart = parentTask.start_date ? new Date(parentTask.start_date) : new Date();
    
    const tasksToCreate = validSubtasks.map((st, index) => {
      const duration = parseInt(st.duration) || 5;
      const startDate = format(currentStart, 'yyyy-MM-dd');
      const endDate = format(addDays(currentStart, duration), 'yyyy-MM-dd');
      
      // Next task starts after this one
      currentStart = addDays(currentStart, duration);

      return {
        project_id: parentTask.project_id,
        parent_task_id: parentTask.id,
        name: st.name,
        phase: st.phase,
        start_date: startDate,
        end_date: endDate,
        duration_days: duration,
        status: 'not_started',
        progress_percent: 0,
        is_milestone: false,
        // Link predecessor if not first task
        predecessor_ids: index > 0 ? [] : [], // Could link to previous if needed
      };
    });

    createMutation.mutate(tasksToCreate);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-zinc-900 border-zinc-800 text-white">
        <DialogHeader>
          <DialogTitle>Add Subtasks to: {parentTask.name}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-sm text-blue-400">
            💡 Quickly add multiple subtasks. They'll be created sequentially starting from the parent task's start date.
          </div>

          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {subtasks.map((subtask, index) => (
              <div key={index} className="flex items-start gap-3 p-3 bg-zinc-800/50 rounded-lg">
                <div className="flex-1 grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Subtask Name</Label>
                    <Input
                      value={subtask.name}
                      onChange={(e) => updateSubtask(index, 'name', e.target.value)}
                      placeholder="e.g., Cut material"
                      className="bg-zinc-900 border-zinc-700"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Duration (days)</Label>
                    <Input
                      type="number"
                      value={subtask.duration}
                      onChange={(e) => updateSubtask(index, 'duration', e.target.value)}
                      min="1"
                      className="bg-zinc-900 border-zinc-700"
                    />
                  </div>
                </div>
                {subtasks.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeSubtask(index)}
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10 mt-6"
                  >
                    <X size={16} />
                  </Button>
                )}
              </div>
            ))}
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={addSubtask}
            className="w-full border-zinc-700"
          >
            <Plus size={16} className="mr-2" />
            Add Another Subtask
          </Button>

          <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-zinc-700"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending}
              className="bg-amber-500 hover:bg-amber-600 text-black"
            >
              {createMutation.isPending ? 'Creating...' : `Create ${subtasks.filter(st => st.name.trim()).length} Subtask(s)`}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}