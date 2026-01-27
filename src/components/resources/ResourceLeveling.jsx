import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, TrendingUp, Calendar, Clock, CheckCircle, Shuffle, Users2 } from 'lucide-react';
import { format, addDays, differenceInDays, parseISO, isAfter, isBefore } from 'date-fns';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function ResourceLeveling({ tasks, resources, projects, allocations, workPackages }) {
  const [analyzing, setAnalyzing] = useState(false);
  const [recommendations, setRecommendations] = useState([]);
  const [levelingStrategy, setLevelingStrategy] = useState('balanced'); // balanced, minimize_delay, maximize_efficiency
  const [selectedResource, setSelectedResource] = useState('all');
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

  // Advanced leveling algorithm with dependency awareness
  const analyzeAndLevel = () => {
    setAnalyzing(true);
    const newRecommendations = [];
    const processedConflicts = new Set();

    // Filter conflicts by selected resource
    const relevantConflicts = selectedResource === 'all' 
      ? conflicts 
      : conflicts.filter(c => c.resourceId === selectedResource);

    relevantConflicts.forEach(conflict => {
      const conflictKey = `${conflict.task1.id}-${conflict.task2.id}`;
      if (processedConflicts.has(conflictKey)) return;
      processedConflicts.add(conflictKey);

      const { task1, task2, resource, overlapDays } = conflict;
      
      // Determine priority-based scheduling
      const task1Priority = task1.is_critical ? 4 : 
                           task1.priority === 'critical' ? 3 :
                           task1.priority === 'high' ? 2 : 1;
      const task2Priority = task2.is_critical ? 4 : 
                           task2.priority === 'critical' ? 3 :
                           task2.priority === 'high' ? 2 : 1;

      // Check for dependency chains
      const task1HasPredecessors = (task1.predecessor_ids || []).length > 0;
      const task2HasPredecessors = (task2.predecessor_ids || []).length > 0;
      
      // Determine which task to delay based on strategy
      let delayTask, keepTask;
      if (levelingStrategy === 'minimize_delay') {
        // Delay shorter task
        delayTask = (task1.duration_days || 0) < (task2.duration_days || 0) ? task1 : task2;
        keepTask = delayTask === task1 ? task2 : task1;
      } else if (levelingStrategy === 'maximize_efficiency') {
        // Delay task with fewer dependencies
        delayTask = task1HasPredecessors && !task2HasPredecessors ? task2 : task1;
        keepTask = delayTask === task1 ? task2 : task1;
      } else {
        // Balanced: delay lower priority
        delayTask = task1Priority >= task2Priority ? task2 : task1;
        keepTask = delayTask === task1 ? task2 : task1;
      }

      const delayDays = differenceInDays(new Date(keepTask.end_date), new Date(delayTask.start_date)) + 2;

      // Calculate impact on downstream tasks
      const affectedSuccessors = tasks.filter(t => 
        (t.predecessor_ids || []).includes(delayTask.id) && t.status !== 'completed'
      );

      const newStart = addDays(new Date(delayTask.start_date), delayDays);
      const newEnd = addDays(new Date(delayTask.end_date), delayDays);
      
      // Check if delay violates work package deadlines
      const delayedTaskWP = workPackages?.find(wp => wp.id === delayTask.work_package_id);
      const violatesDeadline = delayedTaskWP?.target_delivery && 
                               isAfter(newEnd, new Date(delayedTaskWP.target_delivery));

      newRecommendations.push({
        type: 'delay',
        severity: violatesDeadline ? 'critical' : overlapDays > 7 ? 'high' : overlapDays > 3 ? 'medium' : 'low',
        resourceId: resource.id,
        resourceName: resource.name,
        task: delayTask,
        delayDays,
        description: `Delay "${delayTask.name}" by ${delayDays} days to resolve ${resource.name} conflict`,
        originalStart: delayTask.start_date,
        newStart: format(newStart, 'yyyy-MM-dd'),
        originalEnd: delayTask.end_date,
        newEnd: format(newEnd, 'yyyy-MM-dd'),
        impactedTasks: affectedSuccessors.length,
        violatesDeadline,
        workPackageName: delayedTaskWP?.name,
        recommendation: violatesDeadline ? 
          'Consider resource reallocation instead of delay to meet deadlines' : 
          affectedSuccessors.length > 0 ? 
            `Will affect ${affectedSuccessors.length} downstream task${affectedSuccessors.length > 1 ? 's' : ''}` : 
            'No downstream impact'
      });

      // Recommendation 2: Reallocate to alternative resource with skill match
      const taskRequiredSkills = delayTask.required_skills || [];
      const alternativeResources = resources.filter(r => {
        if (r.id === resource.id || r.type !== resource.type) return false;
        if (r.status !== 'available' && r.status !== 'assigned') return false;
        
        // Check skill match
        if (taskRequiredSkills.length > 0) {
          const hasSkills = taskRequiredSkills.every(skill => 
            (r.skills || []).includes(skill)
          );
          if (!hasSkills) return false;
        }

        // Check availability during task period
        const resourceTasks = tasks.filter(t => 
          (t.assigned_resources || []).includes(r.id) &&
          t.start_date && t.end_date && t.id !== delayTask.id
        );
        
        const hasConflict = resourceTasks.some(t => {
          const tStart = new Date(t.start_date);
          const tEnd = new Date(t.end_date);
          const taskStart = new Date(delayTask.start_date);
          const taskEnd = new Date(delayTask.end_date);
          return tEnd >= taskStart && tStart <= taskEnd;
        });

        return !hasConflict;
      });

      if (alternativeResources.length > 0) {
        // Score alternatives by utilization
        const scoredAlternatives = alternativeResources.map(alt => {
          const altTasks = tasks.filter(t => 
            (t.assigned_resources || []).includes(alt.id)
          );
          const utilization = altTasks.length;
          return { resource: alt, utilization };
        }).sort((a, b) => a.utilization - b.utilization);

        const bestAlternative = scoredAlternatives[0].resource;

        newRecommendations.push({
          type: 'reallocate',
          severity: violatesDeadline ? 'medium' : 'low',
          resourceId: resource.id,
          resourceName: resource.name,
          task: delayTask,
          alternativeResource: bestAlternative,
          alternativeCount: alternativeResources.length,
          description: `Reassign "${delayTask.name}" to ${bestAlternative.name}`,
          recommendation: `${bestAlternative.name} has matching skills and ${scoredAlternatives[0].utilization} active task${scoredAlternatives[0].utilization !== 1 ? 's' : ''}`
        });
      }

      // Recommendation 3: Split task if duration > 5 days
      if ((delayTask.duration_days || 0) > 5 && alternativeResources.length > 0) {
        newRecommendations.push({
          type: 'split',
          severity: 'low',
          resourceId: resource.id,
          resourceName: resource.name,
          task: delayTask,
          alternativeResource: alternativeResources[0],
          description: `Split "${delayTask.name}" between ${resource.name} and ${alternativeResources[0].name}`,
          recommendation: 'Task duration allows parallel execution by multiple resources'
        });
      }
    });

    // Sort by severity
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    newRecommendations.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

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
    critical: 'bg-red-600/20 border-red-600/40 text-red-300',
    high: 'bg-red-500/10 border-red-500/20 text-red-400',
    medium: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
    low: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
  };

  const overallocatedResources = useMemo(() => {
    const resourceTaskCount = {};
    tasks.filter(t => t.status === 'in_progress').forEach(task => {
      (task.assigned_resources || []).forEach(resId => {
        resourceTaskCount[resId] = (resourceTaskCount[resId] || 0) + 1;
      });
    });
    return resources.filter(r => resourceTaskCount[r.id] > 3)
      .map(r => ({ ...r, taskCount: resourceTaskCount[r.id] }));
  }, [tasks, resources]);

  return (
    <div className="space-y-6">
      {/* Overallocation Alert */}
      {overallocatedResources.length > 0 && (
        <Card className="bg-red-500/10 border-red-500/30">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="text-red-400 mt-1" size={20} />
              <div>
                <h3 className="font-semibold text-red-400 mb-2">
                  {overallocatedResources.length} Overallocated Resource{overallocatedResources.length !== 1 ? 's' : ''}
                </h3>
                <div className="space-y-1">
                  {overallocatedResources.map(r => (
                    <p key={r.id} className="text-sm text-zinc-300">
                      • {r.name}: {r.taskCount} active tasks (max recommended: 3)
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <CardTitle className="text-lg mb-2">Resource Leveling & Optimization</CardTitle>
              <p className="text-xs text-zinc-400">
                Detect conflicts, suggest schedule adjustments, and optimize resource allocation
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Select value={selectedResource} onValueChange={setSelectedResource}>
                <SelectTrigger className="w-48 bg-zinc-800 border-zinc-700">
                  <Users2 size={14} className="mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-700">
                  <SelectItem value="all">All Resources</SelectItem>
                  {resources.map(r => (
                    <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={levelingStrategy} onValueChange={setLevelingStrategy}>
                <SelectTrigger className="w-52 bg-zinc-800 border-zinc-700">
                  <Shuffle size={14} className="mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-700">
                  <SelectItem value="balanced">Balanced (Priority-based)</SelectItem>
                  <SelectItem value="minimize_delay">Minimize Delays</SelectItem>
                  <SelectItem value="maximize_efficiency">Maximize Efficiency</SelectItem>
                </SelectContent>
              </Select>
              <Button
                onClick={analyzeAndLevel}
                disabled={analyzing || tasks.length === 0}
                className="bg-amber-500 hover:bg-amber-600 text-black"
              >
                {analyzing ? 'Analyzing...' : 'Analyze & Level'}
              </Button>
            </div>
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
                          <div className="text-xs space-y-1">
                            <div>
                              <span className="opacity-70">Reassign to: </span>
                              <span className="font-medium">{rec.alternativeResource.name}</span>
                            </div>
                            {rec.alternativeCount > 1 && (
                              <p className="text-[10px] opacity-60">
                                +{rec.alternativeCount - 1} other option{rec.alternativeCount > 2 ? 's' : ''} available
                              </p>
                            )}
                          </div>
                        )}
                        
                        {rec.type === 'split' && (
                          <div className="text-xs">
                            <span className="opacity-70">Parallel execution with: </span>
                            <span className="font-medium">{rec.alternativeResource.name}</span>
                          </div>
                        )}
                        
                        {rec.recommendation && (
                          <p className="text-[10px] mt-2 opacity-70 italic">
                            💡 {rec.recommendation}
                          </p>
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
    </div>
  );
}