import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle, Clock, AlertCircle, Pause, XCircle } from 'lucide-react';
import { toast } from '@/components/ui/notifications';

const statusOptions = [
  { value: 'not_started', label: 'Not Started', icon: Clock, color: 'text-zinc-400' },
  { value: 'in_progress', label: 'In Progress', icon: Clock, color: 'text-blue-400' },
  { value: 'completed', label: 'Completed', icon: CheckCircle, color: 'text-green-400' },
  { value: 'on_hold', label: 'On Hold', icon: Pause, color: 'text-amber-400' },
  { value: 'blocked', label: 'Blocked', icon: XCircle, color: 'text-red-400' }
];

export default function QuickStatusUpdate({ tasks, onBulkUpdate, onClose }) {
  const [selectedTasks, setSelectedTasks] = useState(new Set());
  const [targetStatus, setTargetStatus] = useState('completed');

  const toggleTask = (taskId) => {
    const newSet = new Set(selectedTasks);
    if (newSet.has(taskId)) {
      newSet.delete(taskId);
    } else {
      newSet.add(taskId);
    }
    setSelectedTasks(newSet);
  };

  const selectAll = () => {
    if (selectedTasks.size === tasks.length) {
      setSelectedTasks(new Set());
    } else {
      setSelectedTasks(new Set(tasks.map(t => t.id)));
    }
  };

  const handleUpdate = async () => {
    if (selectedTasks.size === 0) {
      toast.error('Select at least one task');
      return;
    }

    const updates = Array.from(selectedTasks).map(taskId => ({
      id: taskId,
      status: targetStatus
    }));

    await onBulkUpdate(updates);
    onClose();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <Checkbox
            checked={selectedTasks.size === tasks.length && tasks.length > 0}
            onCheckedChange={selectAll}
          />
          <span className="text-sm text-zinc-400">
            {selectedTasks.size} of {tasks.length} selected
          </span>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setSelectedTasks(new Set())}
          className="text-xs border-zinc-700"
        >
          Clear
        </Button>
      </div>

      <div className="max-h-96 overflow-y-auto space-y-1">
        {tasks.map(task => (
          <div
            key={task.id}
            className={`flex items-center gap-3 p-2 rounded transition-colors ${
              selectedTasks.has(task.id) ? 'bg-amber-500/10 border border-amber-500/30' : 'hover:bg-zinc-800/50'
            }`}
          >
            <Checkbox
              checked={selectedTasks.has(task.id)}
              onCheckedChange={() => toggleTask(task.id)}
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white truncate">{task.name}</p>
              <p className="text-xs text-zinc-500">{task.phase} • Current: {task.status}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="pt-3 border-t border-zinc-800 space-y-3">
        <div>
          <label className="text-xs text-zinc-400 mb-2 block">Change Status To:</label>
          <Select value={targetStatus} onValueChange={setTargetStatus}>
            <SelectTrigger className="bg-zinc-800 border-zinc-700">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-700">
              {statusOptions.map(option => {
                const Icon = option.icon;
                return (
                  <SelectItem key={option.value} value={option.value} className="text-white">
                    <div className="flex items-center gap-2">
                      <Icon size={14} className={option.color} />
                      {option.label}
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={onClose}
            variant="outline"
            className="flex-1 border-zinc-700"
          >
            Cancel
          </Button>
          <Button
            onClick={handleUpdate}
            disabled={selectedTasks.size === 0}
            className="flex-1 bg-amber-500 hover:bg-amber-600 text-black font-semibold"
          >
            Update {selectedTasks.size} Task{selectedTasks.size !== 1 ? 's' : ''}
          </Button>
        </div>
      </div>
    </div>
  );
}