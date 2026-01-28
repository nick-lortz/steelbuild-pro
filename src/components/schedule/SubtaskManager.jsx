import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, ChevronRight, CheckCircle2, Circle, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import StatusBadge from '@/components/ui/StatusBadge';

export default function SubtaskManager({ parentTask, subtasks = [], onAddSubtask, onUpdateSubtask, onDeleteSubtask }) {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    estimated_hours: '',
    start_date: parentTask.start_date || '',
    end_date: parentTask.end_date || ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    onAddSubtask({
      ...formData,
      project_id: parentTask.project_id,
      work_package_id: parentTask.work_package_id,
      parent_task_id: parentTask.id,
      phase: parentTask.phase,
      status: 'not_started',
      estimated_hours: formData.estimated_hours ? parseFloat(formData.estimated_hours) : 0,
      duration_days: parentTask.duration_days || 1
    });

    setFormData({
      name: '',
      estimated_hours: '',
      start_date: parentTask.start_date || '',
      end_date: parentTask.end_date || ''
    });
    setShowForm(false);
  };

  const completedCount = subtasks.filter(s => s.status === 'completed').length;
  const totalHours = subtasks.reduce((sum, s) => sum + (s.actual_hours || 0), 0);
  const estimatedHours = subtasks.reduce((sum, s) => sum + (s.estimated_hours || 0), 0);

  return (
    <Card className="bg-zinc-900/50 border-zinc-800">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <ChevronRight size={14} className="text-amber-500" />
            Sub-Tasks
            {subtasks.length > 0 && (
              <Badge variant="outline" className="ml-2">
                {completedCount}/{subtasks.length}
              </Badge>
            )}
          </CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowForm(!showForm)}
            className="text-xs"
          >
            <Plus size={12} className="mr-1" />
            Add
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {showForm && (
          <form onSubmit={handleSubmit} className="mb-4 p-3 bg-zinc-800 rounded-lg space-y-3">
            <div>
              <Input
                placeholder="Subtask name *"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="bg-zinc-900 border-zinc-700 text-sm"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="number"
                placeholder="Est. hours"
                value={formData.estimated_hours}
                onChange={(e) => setFormData({ ...formData, estimated_hours: e.target.value })}
                className="bg-zinc-900 border-zinc-700 text-sm"
              />
              <Input
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                className="bg-zinc-900 border-zinc-700 text-sm"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setShowForm(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-amber-500 hover:bg-amber-600 text-black"
              >
                Add Subtask
              </Button>
            </div>
          </form>
        )}

        {subtasks.length === 0 ? (
          <p className="text-xs text-zinc-500 text-center py-4">No subtasks</p>
        ) : (
          <div className="space-y-2">
            {subtasks.map((subtask) => (
              <div
                key={subtask.id}
                className="flex items-start gap-2 p-2 bg-zinc-800/50 rounded hover:bg-zinc-800 transition-colors"
              >
                <button
                  onClick={() => onUpdateSubtask(subtask.id, {
                    status: subtask.status === 'completed' ? 'not_started' : 'completed'
                  })}
                  className="mt-0.5 flex-shrink-0"
                >
                  {subtask.status === 'completed' ? (
                    <CheckCircle2 size={16} className="text-green-400" />
                  ) : (
                    <Circle size={16} className="text-zinc-600" />
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${subtask.status === 'completed' ? 'line-through text-zinc-600' : 'text-white'}`}>
                    {subtask.name}
                  </p>
                  <div className="flex items-center gap-2 mt-1 text-xs text-zinc-500">
                    {subtask.estimated_hours > 0 && (
                      <span>{subtask.actual_hours || 0}h / {subtask.estimated_hours}h</span>
                    )}
                    {subtask.end_date && (
                      <span>Due: {format(new Date(subtask.end_date), 'MMM d')}</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => onDeleteSubtask(subtask.id)}
                  className="p-1 text-zinc-600 hover:text-red-400"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}

            {estimatedHours > 0 && (
              <div className="mt-3 pt-3 border-t border-zinc-800 text-xs text-zinc-400">
                Total: {totalHours}h / {estimatedHours}h tracked
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}