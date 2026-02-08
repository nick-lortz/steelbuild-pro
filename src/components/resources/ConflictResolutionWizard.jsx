import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { apiClient } from '@/api/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Calendar, Users, AlertTriangle, CheckCircle2, ArrowRight } from 'lucide-react';
import { format, addDays, parseISO } from 'date-fns';
import { toast } from 'sonner';

export default function ConflictResolutionWizard({ conflict, allResources, onClose, onResolved }) {
  const [step, setStep] = useState(1);
  const [resolutionMethod, setResolutionMethod] = useState('');
  const [selectedResource, setSelectedResource] = useState('');
  const [dateAdjustments, setDateAdjustments] = useState({});
  const queryClient = useQueryClient();

  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, updates }) => {
      return await apiClient.entities.Task.update(taskId, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['resourceConflicts'] });
    }
  });

  if (!conflict) return null;

  const { resource, tasks, overlap_days, severity, conflict_type } = conflict;

  const handleReassignResource = async () => {
    if (!selectedResource) {
      toast.error('Please select a resource');
      return;
    }

    try {
      // Reassign the second task to the new resource
      await updateTaskMutation.mutateAsync({
        taskId: tasks[1].id,
        updates: { assigned_resources: [selectedResource] }
      });

      toast.success('Resource reassigned successfully');
      onResolved?.();
      onClose();
    } catch (error) {
      toast.error('Failed to reassign resource');
    }
  };

  const handleAdjustDates = async () => {
    try {
      // Adjust the second task to start after the first one ends
      const firstTaskEnd = parseISO(tasks[0].end_date);
      const newStartDate = format(addDays(firstTaskEnd, 1), 'yyyy-MM-dd');
      const duration = Math.ceil(
        (parseISO(tasks[1].end_date) - parseISO(tasks[1].start_date)) / (1000 * 60 * 60 * 24)
      );
      const newEndDate = format(addDays(parseISO(newStartDate), duration), 'yyyy-MM-dd');

      await updateTaskMutation.mutateAsync({
        taskId: tasks[1].id,
        updates: {
          start_date: newStartDate,
          end_date: newEndDate
        }
      });

      toast.success('Task dates adjusted successfully');
      onResolved?.();
      onClose();
    } catch (error) {
      toast.error('Failed to adjust dates');
    }
  };

  const handleSplitTask = async () => {
    try {
      // Adjust first task to end before second task starts
      const secondTaskStart = parseISO(tasks[1].start_date);
      const newEndDate = format(addDays(secondTaskStart, -1), 'yyyy-MM-dd');

      await updateTaskMutation.mutateAsync({
        taskId: tasks[0].id,
        updates: { end_date: newEndDate }
      });

      toast.success('Task duration adjusted to eliminate overlap');
      onResolved?.();
      onClose();
    } catch (error) {
      toast.error('Failed to adjust task');
    }
  };

  const availableResources = allResources?.filter(r => 
    r.type === 'labor' && 
    r.id !== resource.id &&
    r.status === 'available'
  ) || [];

  const resolutionOptions = [
    {
      id: 'reassign',
      label: 'Reassign Resource',
      description: `Assign ${tasks[1].name} to a different resource`,
      icon: Users,
      enabled: availableResources.length > 0
    },
    {
      id: 'adjust_dates',
      label: 'Adjust Task Dates',
      description: `Schedule ${tasks[1].name} to start after ${tasks[0].name} completes`,
      icon: Calendar,
      enabled: true
    },
    {
      id: 'split_task',
      label: 'Reduce Task Duration',
      description: `Shorten ${tasks[0].name} to eliminate overlap`,
      icon: ArrowRight,
      enabled: true
    }
  ];

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Resolve Resource Conflict
          </DialogTitle>
          <DialogDescription>
            {resource.name} is assigned to overlapping tasks
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Conflict Summary */}
          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-500 mt-0.5" />
              <div className="flex-1 space-y-2">
                <p className="font-semibold text-sm">
                  {overlap_days} day{overlap_days !== 1 ? 's' : ''} of overlap detected
                </p>
                <div className="space-y-1 text-xs">
                  {tasks.map((task, idx) => (
                    <div key={task.id} className="flex items-center justify-between">
                      <span className="font-medium">{task.name}</span>
                      <span className="text-muted-foreground">
                        {format(parseISO(task.start_date), 'MMM d')} - {format(parseISO(task.end_date), 'MMM d')}
                      </span>
                    </div>
                  ))}
                </div>
                {conflict_type === 'cross-project' && (
                  <Badge variant="outline" className="text-xs">
                    Cross-Project Conflict
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Step 1: Choose Resolution Method */}
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-sm">Select Resolution Method</h3>
              <div className="space-y-2">
                {resolutionOptions.map((option) => {
                  const Icon = option.icon;
                  return (
                    <button
                      key={option.id}
                      disabled={!option.enabled}
                      onClick={() => {
                        setResolutionMethod(option.id);
                        setStep(2);
                      }}
                      className="w-full text-left p-4 border rounded-lg hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="flex items-start gap-3">
                        <Icon className="h-5 w-5 mt-0.5 text-primary" />
                        <div className="flex-1">
                          <p className="font-medium text-sm">{option.label}</p>
                          <p className="text-xs text-muted-foreground mt-1">{option.description}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 2: Configure Resolution */}
          {step === 2 && resolutionMethod === 'reassign' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm">Reassign to Different Resource</h3>
                <Button variant="ghost" size="sm" onClick={() => setStep(1)}>
                  Back
                </Button>
              </div>
              
              <div className="space-y-2">
                <Label>Select Resource</Label>
                <Select value={selectedResource} onValueChange={setSelectedResource}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a resource..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableResources.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.name} - {r.classification || r.role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Reassigning: <strong>{tasks[1].name}</strong>
                </p>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  onClick={handleReassignResource}
                  disabled={!selectedResource || updateTaskMutation.isPending}
                  className="flex-1"
                >
                  {updateTaskMutation.isPending ? 'Applying...' : 'Apply Resolution'}
                </Button>
              </div>
            </div>
          )}

          {step === 2 && resolutionMethod === 'adjust_dates' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm">Adjust Task Dates</h3>
                <Button variant="ghost" size="sm" onClick={() => setStep(1)}>
                  Back
                </Button>
              </div>

              <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
                <p className="font-medium">Proposed Changes:</p>
                <div className="space-y-1 text-xs">
                  <p>
                    <strong>{tasks[1].name}</strong> will be rescheduled to start on{' '}
                    <strong>{format(addDays(parseISO(tasks[0].end_date), 1), 'MMM d, yyyy')}</strong>
                  </p>
                  <p className="text-muted-foreground">
                    This ensures no overlap with {tasks[0].name}
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleAdjustDates}
                  disabled={updateTaskMutation.isPending}
                  className="flex-1"
                >
                  {updateTaskMutation.isPending ? 'Applying...' : 'Apply Resolution'}
                </Button>
              </div>
            </div>
          )}

          {step === 2 && resolutionMethod === 'split_task' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm">Reduce Task Duration</h3>
                <Button variant="ghost" size="sm" onClick={() => setStep(1)}>
                  Back
                </Button>
              </div>

              <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
                <p className="font-medium">Proposed Changes:</p>
                <div className="space-y-1 text-xs">
                  <p>
                    <strong>{tasks[0].name}</strong> will be shortened to end on{' '}
                    <strong>{format(addDays(parseISO(tasks[1].start_date), -1), 'MMM d, yyyy')}</strong>
                  </p>
                  <p className="text-muted-foreground">
                    This eliminates the {overlap_days}-day overlap
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleSplitTask}
                  disabled={updateTaskMutation.isPending}
                  className="flex-1"
                >
                  {updateTaskMutation.isPending ? 'Applying...' : 'Apply Resolution'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}