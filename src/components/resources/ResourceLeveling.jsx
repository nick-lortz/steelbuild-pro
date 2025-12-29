import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, TrendingUp, Calendar, Clock, CheckCircle } from 'lucide-react';
import { format, addDays, differenceInDays, parseISO } from 'date-fns';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function ResourceLeveling({ tasks, resources, projects }) {
  const [analyzing, setAnalyzing] = useState(false);
  const [recommendations, setRecommendations] = useState([]);
  const queryClient = useQueryClient();

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Task.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  // Detect resource conflicts and overallocations
  const conflicts = useMemo(() => {
    const conflicts = [];
    const resourceTaskMap = {};

    // Group tasks by resource
    resources.forEach(resource => {
      resourceTaskMap[resource.id] = tasks.filter(task => {
        const isAssigned = 
          (task.assigned_resources || []).includes(resource.id) ||
          (task.assigned_equipment || []).includes(resource.id);
        
        return isAssigned && 
               task.start_date && 
               task.end_date &&
               task.status !== 'completed' && 
               task.status !== 'cancelled';
      }).sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
    });

    // Detect overlapping tasks per resource
    Object.entries(resourceTaskMap).forEach(([resourceId, resourceTasks]) => {
      for (let i = 0; i < resourceTasks.length - 1; i++) {
        const task1 = resourceTasks[i];
        const task1Start = new Date(task1.start_date);
        const task1End = new Date(task1.end_date);

        for (let j = i + 1; j < resourceTasks.length; j++) {
          const task2 = resourceTasks[j];
          const task2Start = new Date(task2.start_date);
          const task2End = new Date(task2.end_date);

          // Check for overlap
          if (task1End >= task2Start && task1Start <= task2End) {
            conflicts.push({
              resourceId,
              resource: resources.find(r => r.id === resourceId),
              task1,
              task2,
              overlapDays: Math.min(
                differenceInDays(task1End, task2Start),
                differenceInDays(task2End, task1Start)
              ),
            });
          }
        }
      }
    });

    return conflicts;
  }, [tasks, resources]);

  // Generate leveling recommendations
  const analyzeAndLevel = () => {
    setAnalyzing(true);
    const newRecommendations = [];

    conflicts.forEach(conflict => {
      const { task1, task2, resource, overlapDays } = conflict;
      
      // Recommendation 1: Delay the lower priority task
      const delayTask = task1.priority === 'critical' || task1.priority === 'high' ? task2 : task1;
      const delayDays = differenceInDays(new Date(task1.end_date), new Date(task2.start_date)) + 1;

      newRecommendations.push({
        type: 'delay',
        severity: overlapDays > 7 ? 'high' : overlapDays > 3 ? 'medium' : 'low',
        resourceId: resource.id,
        resourceName: resource.name,
        task: delayTask,
        delayDays,
        description: `Delay "${delayTask.name}" by ${delayDays} days to resolve conflict`,
        originalStart: delayTask.start_date,
        newStart: format(addDays(new Date(delayTask.start_date), delayDays), 'yyyy-MM-dd'),
        originalEnd: delayTask.end_date,
        newEnd: format(addDays(new Date(delayTask.end_date), delayDays), 'yyyy-MM-dd'),
      });

      // Recommendation 2: Reallocate to different resource
      const alternativeResources = resources.filter(r => 
        r.id !== resource.id &&
        r.type === resource.type &&
        r.status === 'available'
      );

      if (alternativeResources.length > 0) {
        newRecommendations.push({
          type: 'reallocate',
          severity: 'low',
          resourceId: resource.id,
          resourceName: resource.name,
          task: task2,
          alternativeResource: alternativeResources[0],
          description: `Reassign "${task2.name}" to ${alternativeResources[0].name}`,
        });
      }
    });

    setRecommendations(newRecommendations);
    setAnalyzing(false);
    
    if (newRecommendations.length === 0) {
      toast.success('No resource conflicts detected!');
    } else {
      toast.info(`Found ${newRecommendations.length} leveling opportunities`);
    }
  };

  // Apply a recommendation
  const applyRecommendation = async (recommendation) => {
    try {
      if (recommendation.type === 'delay') {
        await updateTaskMutation.mutateAsync({
          id: recommendation.task.id,
          data: {
            start_date: recommendation.newStart,
            end_date: recommendation.newEnd,
          },
        });
        toast.success(`Task "${recommendation.task.name}" rescheduled successfully`);
      } else if (recommendation.type === 'reallocate') {
        const updatedResources = (recommendation.task.assigned_resources || [])
          .filter(id => id !== recommendation.resourceId)
          .concat([recommendation.alternativeResource.id]);

        await updateTaskMutation.mutateAsync({
          id: recommendation.task.id,
          data: { assigned_resources: updatedResources },
        });
        toast.success(`Task "${recommendation.task.name}" reassigned successfully`);
      }

      // Remove applied recommendation
      setRecommendations(prev => prev.filter(r => r !== recommendation));
    } catch (error) {
      toast.error('Failed to apply recommendation');
    }
  };

  const severityColors = {
    high: 'bg-red-500/10 border-red-500/20 text-red-400',
    medium: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
    low: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
  };

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Resource Leveling</CardTitle>
          <Button
            onClick={analyzeAndLevel}
            disabled={analyzing || tasks.length === 0}
            className="bg-amber-500 hover:bg-amber-600 text-black"
          >
            {analyzing ? 'Analyzing...' : 'Analyze & Level'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {conflicts.length === 0 && recommendations.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle className="mx-auto mb-4 text-green-500" size={48} />
            <p className="text-zinc-400">
              {analyzing ? 'Analyzing resource allocation...' : 'Click "Analyze & Level" to detect conflicts'}
            </p>
          </div>
        ) : (
          <>
            {/* Conflict Summary */}
            {conflicts.length > 0 && (
              <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="text-amber-400" size={18} />
                  <p className="font-medium text-amber-400">
                    {conflicts.length} Resource Conflict{conflicts.length !== 1 ? 's' : ''} Detected
                  </p>
                </div>
                <p className="text-sm text-zinc-400">
                  Multiple tasks assigned to the same resources with overlapping schedules
                </p>
              </div>
            )}

            {/* Recommendations */}
            {recommendations.length > 0 && (
              <div className="space-y-4">
                <h3 className="font-medium text-white mb-3">Leveling Recommendations</h3>
                {recommendations.map((rec, idx) => (
                  <div
                    key={idx}
                    className={`p-4 border rounded-lg ${severityColors[rec.severity]}`}
                  >
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {rec.type === 'delay' ? (
                            <Clock size={16} />
                          ) : (
                            <TrendingUp size={16} />
                          )}
                          <span className="font-medium">{rec.description}</span>
                        </div>
                        <p className="text-xs opacity-80 mb-2">
                          Resource: {rec.resourceName}
                        </p>
                        
                        {rec.type === 'delay' && (
                          <div className="text-xs space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="opacity-70">Original:</span>
                              <span>{format(parseISO(rec.originalStart), 'MMM d')} - {format(parseISO(rec.originalEnd), 'MMM d')}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="opacity-70">New:</span>
                              <span className="font-medium">{format(parseISO(rec.newStart), 'MMM d')} - {format(parseISO(rec.newEnd), 'MMM d')}</span>
                            </div>
                          </div>
                        )}
                        
                        {rec.type === 'reallocate' && (
                          <div className="text-xs">
                            <span className="opacity-70">Reassign to: </span>
                            <span className="font-medium">{rec.alternativeResource.name}</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex flex-col gap-2">
                        <Badge variant="outline" className="capitalize">
                          {rec.severity} priority
                        </Badge>
                        <Button
                          size="sm"
                          onClick={() => applyRecommendation(rec)}
                          disabled={updateTaskMutation.isPending}
                          className="bg-amber-500 hover:bg-amber-600 text-black"
                        >
                          Apply
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}