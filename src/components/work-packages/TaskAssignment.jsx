import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function TaskAssignment({ workPackage, tasks, projectId }) {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    task_type: 'ERECTION',
    start_date: '',
    end_date: '',
    assigned_resources: []
  });
  const queryClient = useQueryClient();

  const createTaskMutation = useMutation({
    mutationFn: (data) => base44.entities.Task.create({
      ...data,
      project_id: projectId,
      work_package_id: workPackage.id,
      status: 'not_started'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['tasks', projectId]);
      setShowForm(false);
      setFormData({
        name: '',
        task_type: 'ERECTION',
        start_date: '',
        end_date: '',
        assigned_resources: []
      });
      toast.success('Task created');
    }
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (taskId) => base44.entities.Task.delete(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries(['tasks', projectId]);
      toast.success('Task deleted');
    }
  });

  const updateTaskStatusMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.Task.update(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries(['tasks', projectId]);
      toast.success('Status updated');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.start_date || !formData.end_date) {
      toast.error('Name and dates are required');
      return;
    }
    createTaskMutation.mutate(formData);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return <CheckCircle2 size={14} className="text-green-400" />;
      case 'in_progress': return <Clock size={14} className="text-blue-400" />;
      case 'blocked': return <AlertCircle size={14} className="text-red-400" />;
      default: return <Clock size={14} className="text-zinc-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'in_progress': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'blocked': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'on_hold': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      default: return 'bg-zinc-700/20 text-zinc-400 border-zinc-600/30';
    }
  };

  return (
    <Card className="bg-zinc-800/50 border-zinc-700">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm">Tasks ({tasks.length})</CardTitle>
        <Button
          size="sm"
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus size={14} className="mr-1" />
          Add Task
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {showForm && (
          <form onSubmit={handleSubmit} className="p-4 bg-zinc-900/50 rounded-lg border border-zinc-700 space-y-3">
            <div className="space-y-2">
              <Label className="text-xs text-zinc-300">Task Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Install Level 2 columns"
                className="bg-zinc-800 border-zinc-700 text-white h-9 text-sm"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-xs text-zinc-300">Task Type</Label>
              <Select value={formData.task_type} onValueChange={(v) => setFormData({ ...formData, task_type: v })}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700 h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ERECTION">Erection</SelectItem>
                  <SelectItem value="FABRICATION">Fabrication</SelectItem>
                  <SelectItem value="DELIVERY">Delivery</SelectItem>
                  <SelectItem value="DETAILING">Detailing</SelectItem>
                  <SelectItem value="INSPECTION">Inspection</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs text-zinc-300">Start Date *</Label>
                <Input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  className="bg-zinc-800 border-zinc-700 text-white h-9 text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-zinc-300">End Date *</Label>
                <Input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  className="bg-zinc-800 border-zinc-700 text-white h-9 text-sm"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setShowForm(false)}
                className="h-8 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={createTaskMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700 h-8 text-xs"
              >
                Create Task
              </Button>
            </div>
          </form>
        )}

        {tasks.length === 0 ? (
          <div className="text-center py-8 text-zinc-500 text-sm">
            No tasks assigned yet
          </div>
        ) : (
          <div className="space-y-2">
            {tasks.map(task => (
              <div
                key={task.id}
                className="flex items-center gap-3 p-3 bg-zinc-900/50 rounded-lg border border-zinc-700/50 hover:border-zinc-600/50 transition-colors"
              >
                <div className="flex-shrink-0">
                  {getStatusIcon(task.status)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="text-sm font-medium text-white truncate">
                      {task.name}
                    </div>
                    <Badge variant="outline" className={cn("text-[9px] font-semibold", getStatusColor(task.status))}>
                      {task.status?.replace('_', ' ').toUpperCase()}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-zinc-500">
                    <span className="font-mono">{task.task_type}</span>
                    {task.start_date && task.end_date && (
                      <>
                        <span>•</span>
                        <span>
                          {format(new Date(task.start_date), 'MMM d')} - {format(new Date(task.end_date), 'MMM d')}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {task.status !== 'completed' && (
                    <Select
                      value={task.status}
                      onValueChange={(status) => updateTaskStatusMutation.mutate({ id: task.id, status })}
                    >
                      <SelectTrigger className="w-28 h-7 text-xs bg-zinc-800 border-zinc-700">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="not_started">Not Started</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="on_hold">On Hold</SelectItem>
                        <SelectItem value="blocked">Blocked</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                  
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteTaskMutation.mutate(task.id)}
                    className="h-7 w-7 p-0 text-zinc-500 hover:text-red-500 hover:bg-red-500/10"
                  >
                    <Trash2 size={12} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}