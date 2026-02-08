import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, AlertTriangle, CheckCircle, Lock, ChevronRight } from 'lucide-react';
import { useActiveProject } from '@/components/shared/hooks/useActiveProject';
import { toast } from '@/components/ui/notifications';

export default function ErectionSequenceManager() {
  const { activeProjectId } = useActiveProject();
  const [selectedTask, setSelectedTask] = useState(null);
  const [blockingDetails, setBlockingDetails] = useState(null);
  const queryClient = useQueryClient();

  const { data: erectionTasks = [], isLoading } = useQuery({
    queryKey: ['erectionTasks', activeProjectId],
    queryFn: () => base44.entities.Task.filter({
      project_id: activeProjectId,
      phase: 'erection'
    }),
    enabled: !!activeProjectId
  });

  const evaluateBlockingMutation = useMutation({
    mutationFn: async (taskId) => {
      const result = await base44.functions.invoke('evaluateErectionTaskBlocking', {
        task_id: taskId
      });
      return result.data;
    },
    onSuccess: (data) => {
      setBlockingDetails(data);
      queryClient.invalidateQueries(['erectionTasks', activeProjectId]);
      if (data.is_blocked) {
        toast.warning(`Task blocked: ${data.critical_count} critical issue(s)`);
      } else {
        toast.success('Task unblocked');
      }
    },
    onError: () => {
      toast.error('Failed to evaluate task blocking');
    }
  });

  // Sort by sequence
  const sortedTasks = [...erectionTasks].sort((a, b) => {
    const aDate = new Date(a.start_date);
    const bDate = new Date(b.start_date);
    return aDate - bDate;
  });

  const blockedCount = sortedTasks.filter(t => t.status === 'blocked').length;
  const readyCount = sortedTasks.filter(t => t.status === 'not_started').length;
  const activeCount = sortedTasks.filter(t => t.status === 'in_progress').length;

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{sortedTasks.length}</div>
            <div className="text-xs text-muted-foreground">Total Tasks</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-red-500">{blockedCount}</div>
            <div className="text-xs text-red-400">Blocked</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-500">{readyCount}</div>
            <div className="text-xs text-green-400">Ready to Start</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-500">{activeCount}</div>
            <div className="text-xs text-blue-400">In Progress</div>
          </CardContent>
        </Card>
      </div>

      {/* Task Sequence */}
      <Card>
        <CardHeader>
          <CardTitle>Erection Sequence</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {isLoading ? (
              <div className="text-sm text-muted-foreground">Loading...</div>
            ) : sortedTasks.length === 0 ? (
              <div className="text-sm text-muted-foreground">No erection tasks</div>
            ) : (
              sortedTasks.map((task, idx) => (
                <div
                  key={task.id}
                  onClick={() => {
                    setSelectedTask(task);
                    evaluateBlockingMutation.mutate(task.id);
                  }}
                  className="p-3 bg-card border rounded cursor-pointer hover:border-amber-500 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    {/* Sequence number */}
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold">
                      {idx + 1}
                    </div>

                    {/* Task info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{task.name}</span>
                        {task.status === 'blocked' && (
                          <Badge variant="destructive" className="text-xs">
                            <Lock size={12} className="mr-1" />
                            Blocked
                          </Badge>
                        )}
                        {task.status === 'in_progress' && (
                          <Badge className="bg-blue-600 text-xs">Active</Badge>
                        )}
                        {task.status === 'completed' && (
                          <Badge className="bg-green-600 text-xs">Done</Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {task.start_date} to {task.end_date}
                      </div>
                    </div>

                    {/* Requirements */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {task.linked_delivery_ids && task.linked_delivery_ids.length > 0 && (
                        <Badge variant="outline" className="text-xs">
                          {task.linked_delivery_ids.length} deliveries
                        </Badge>
                      )}
                      {task.linked_drawing_set_ids && task.linked_drawing_set_ids.length > 0 && (
                        <Badge variant="outline" className="text-xs">
                          {task.linked_drawing_set_ids.length} drawings
                        </Badge>
                      )}
                      <ChevronRight size={16} className="text-muted-foreground" />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Task Details & Blocking Info */}
      {selectedTask && blockingDetails && (
        <Card className={selectedTask.status === 'blocked' ? 'border-red-800' : ''}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{selectedTask.name}</span>
              {selectedTask.status === 'blocked' ? (
                <Badge variant="destructive">
                  <Lock size={14} className="mr-1" />
                  Blocked
                </Badge>
              ) : (
                <Badge className="bg-green-600">
                  <CheckCircle size={14} className="mr-1" />
                  Ready
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Blocking Reasons */}
            {blockingDetails.blocking_reasons.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">Blocking Issues</h4>
                {blockingDetails.blocking_reasons.map((reason, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded border-l-4 ${
                      reason.severity === 'P0'
                        ? 'bg-red-950/20 border-red-800 text-red-400'
                        : 'bg-yellow-950/20 border-yellow-800 text-yellow-400'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {reason.severity === 'P0' ? (
                        <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                      ) : (
                        <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">{reason.type}</div>
                        <div className="text-sm mt-1">{reason.message}</div>
                        {reason.details && reason.details.length > 0 && (
                          <ul className="text-xs mt-2 space-y-1 opacity-90">
                            {reason.details.map((detail, i) => (
                              <li key={i} className="ml-4">
                                • {detail.delivery_number || detail.set_name || detail.task_name} 
                                ({detail.status || detail.current_status || 'pending'})
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {blockingDetails.blocking_reasons.length === 0 && (
              <div className="p-3 bg-green-950/20 border border-green-800 rounded text-green-400 text-sm">
                ✓ All prerequisites met — ready to proceed
              </div>
            )}

            {/* Action */}
            <div className="pt-3 border-t">
              <Button
                variant={selectedTask.status === 'blocked' ? 'outline' : 'default'}
                disabled={selectedTask.status === 'blocked' || selectedTask.status === 'completed'}
                className="w-full"
              >
                {selectedTask.status === 'completed'
                  ? '✓ Completed'
                  : selectedTask.status === 'in_progress'
                  ? 'Mark Complete'
                  : 'Start Task'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}