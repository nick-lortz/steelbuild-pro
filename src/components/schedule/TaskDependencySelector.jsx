import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Plus, Link2 } from 'lucide-react';
import { Input } from '@/components/ui/input';

const DEPENDENCY_TYPES = [
  { value: 'FS', label: 'Finish-to-Start (FS)' },
  { value: 'SS', label: 'Start-to-Start (SS)' },
  { value: 'FF', label: 'Finish-to-Finish (FF)' },
  { value: 'SF', label: 'Start-to-Finish (SF)' }
];

export default function TaskDependencySelector({ projectId, currentTaskId, dependencies = [], onChange }) {
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [depType, setDepType] = useState('FS');
  const [lagDays, setLagDays] = useState(0);

  const { data: availableTasks = [] } = useQuery({
    queryKey: ['tasks', projectId],
    queryFn: () => base44.entities.Task.filter({ project_id: projectId }),
    enabled: !!projectId,
    select: (tasks) => tasks.filter(t => t.id !== currentTaskId)
  });

  const handleAdd = () => {
    if (!selectedTaskId) return;
    const newDep = {
      predecessor_id: selectedTaskId,
      type: depType,
      lag_days: parseInt(lagDays) || 0
    };
    onChange([...dependencies, newDep]);
    setSelectedTaskId('');
    setDepType('FS');
    setLagDays(0);
  };

  const handleRemove = (predId) => {
    onChange(dependencies.filter(d => d.predecessor_id !== predId));
  };

  const getTaskName = (taskId) => {
    const task = availableTasks.find(t => t.id === taskId);
    return task?.name || 'Unknown Task';
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs font-bold text-zinc-300 uppercase">
        <Link2 size={14} />
        Task Dependencies
      </div>

      {dependencies.length > 0 && (
        <div className="space-y-2">
          {dependencies.map((dep, idx) => (
            <div key={idx} className="flex items-center gap-2 p-2 bg-zinc-800 rounded border border-zinc-700">
              <div className="flex-1">
                <p className="text-xs font-medium text-white">{getTaskName(dep.predecessor_id)}</p>
                <div className="flex gap-2 mt-1">
                  <Badge variant="outline" className="text-[10px]">{dep.type}</Badge>
                  {dep.lag_days !== 0 && (
                    <Badge variant="outline" className="text-[10px]">
                      {dep.lag_days > 0 ? '+' : ''}{dep.lag_days}d lag
                    </Badge>
                  )}
                </div>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleRemove(dep.predecessor_id)}
                className="h-6 w-6 p-0"
              >
                <X size={14} />
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="p-3 bg-zinc-800/50 rounded border border-zinc-700 space-y-3">
        <Select value={selectedTaskId} onValueChange={setSelectedTaskId}>
          <SelectTrigger className="bg-zinc-700 border-zinc-600">
            <SelectValue placeholder="Select predecessor task..." />
          </SelectTrigger>
          <SelectContent>
            {availableTasks.map(task => (
              <SelectItem key={task.id} value={task.id}>
                {task.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="grid grid-cols-2 gap-2">
          <Select value={depType} onValueChange={setDepType}>
            <SelectTrigger className="bg-zinc-700 border-zinc-600">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DEPENDENCY_TYPES.map(type => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-1">
            <Input
              type="number"
              value={lagDays}
              onChange={(e) => setLagDays(e.target.value)}
              placeholder="Lag days"
              className="bg-zinc-700 border-zinc-600 text-white"
            />
          </div>
        </div>

        <Button
          size="sm"
          onClick={handleAdd}
          disabled={!selectedTaskId}
          className="w-full bg-blue-600 hover:bg-blue-700"
        >
          <Plus size={14} className="mr-1" />
          Add Dependency
        </Button>
      </div>
    </div>
  );
}