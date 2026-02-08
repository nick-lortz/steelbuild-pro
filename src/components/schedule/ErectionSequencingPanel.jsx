import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, CheckCircle2, Truck, FileText, Lock } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

export default function ErectionSequencingPanel({ projectId }) {
  const queryClient = useQueryClient();
  const [selectedTask, setSelectedTask] = useState(null);

  const { data: erectionTasks = [] } = useQuery({
    queryKey: ['erection-tasks', projectId],
    queryFn: () =>
      base44.entities.Task.filter({
        project_id: projectId,
        phase: 'erection'
      }),
    enabled: !!projectId
  });

  const { data: deliveries = [] } = useQuery({
    queryKey: ['deliveries', projectId],
    queryFn: () => base44.entities.Delivery.filter({ project_id: projectId }),
    enabled: !!projectId
  });

  const { data: drawingSets = [] } = useQuery({
    queryKey: ['drawing-sets', projectId],
    queryFn: () => base44.entities.DrawingSet.filter({ project_id: projectId }),
    enabled: !!projectId
  });

  const updateTaskMutation = useMutation({
    mutationFn: (data) =>
      base44.entities.Task.update(data.taskId, {
        linked_delivery_ids: data.linked_delivery_ids,
        linked_drawing_set_ids: data.linked_drawing_set_ids
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['erection-tasks'] });
    }
  });

  // Compute erection readiness for each task
  const erectionReadiness = useMemo(() => {
    const readiness = new Map();

    erectionTasks.forEach(task => {
      const checks = {
        deliveriesReceived: true,
        drawingApproved: true,
        predecessorComplete: true,
        issues: []
      };

      // Check 1: All required deliveries received
      if (task.linked_delivery_ids?.length) {
        const requiredDeliveries = deliveries.filter(d => task.linked_delivery_ids.includes(d.id));
        requiredDeliveries.forEach(delivery => {
          if (delivery.status !== 'received') {
            checks.deliveriesReceived = false;
            checks.issues.push(`Delivery ${delivery.package_number} not yet received`);
          }
        });
      }

      // Check 2: Erection drawing approved (FFF status)
      if (task.linked_drawing_set_ids?.length) {
        const requiredDrawings = drawingSets.filter(d => task.linked_drawing_set_ids.includes(d.id));
        requiredDrawings.forEach(drawing => {
          if (drawing.status !== 'FFF' && drawing.qa_status !== 'pass') {
            checks.drawingApproved = false;
            checks.issues.push(`Drawing ${drawing.set_name} not approved for fabrication`);
          }
        });
      }

      // Check 3: All predecessors complete
      if (task.predecessor_ids?.length) {
        const predecessors = task.predecessor_ids
          .map(id => erectionTasks.find(t => t.id === id))
          .filter(Boolean);
        predecessors.forEach(pred => {
          if (pred.status !== 'completed') {
            checks.predecessorComplete = false;
            checks.issues.push(`Prerequisite task "${pred.name}" not complete`);
          }
        });
      }

      const isReady = checks.deliveriesReceived && checks.drawingApproved && checks.predecessorComplete;
      readiness.set(task.id, { ...checks, isReady });
    });

    return readiness;
  }, [erectionTasks, deliveries, drawingSets]);

  // Sort tasks by readiness: ready first, then by start date
  const sortedTasks = useMemo(() => {
    return [...erectionTasks].sort((a, b) => {
      const aReady = erectionReadiness.get(a.id)?.isReady ? 0 : 1;
      const bReady = erectionReadiness.get(b.id)?.isReady ? 0 : 1;
      if (aReady !== bReady) return aReady - bReady;
      return new Date(a.start_date) - new Date(b.start_date);
    });
  }, [erectionTasks, erectionReadiness]);

  const handleDeliveryToggle = (taskId, deliveryId) => {
    const task = erectionTasks.find(t => t.id === taskId);
    const current = task.linked_delivery_ids || [];
    const updated = current.includes(deliveryId)
      ? current.filter(id => id !== deliveryId)
      : [...current, deliveryId];
    updateTaskMutation.mutate({ taskId, linked_delivery_ids: updated });
  };

  const handleDrawingToggle = (taskId, drawingId) => {
    const task = erectionTasks.find(t => t.id === taskId);
    const current = task.linked_drawing_set_ids || [];
    const updated = current.includes(drawingId)
      ? current.filter(id => id !== drawingId)
      : [...current, drawingId];
    updateTaskMutation.mutate({ taskId, linked_drawing_set_ids: updated });
  };

  return (
    <div className="space-y-4">
      <Card className="bg-zinc-800/50 border-zinc-700">
        <CardHeader>
          <CardTitle className="text-lg">Erection Sequencing</CardTitle>
          <p className="text-xs text-zinc-400 mt-1">
            {sortedTasks.filter(t => erectionReadiness.get(t.id)?.isReady).length} of {sortedTasks.length} tasks ready to start
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {sortedTasks.length === 0 ? (
            <div className="text-center py-8 text-zinc-500 text-sm">No erection tasks scheduled</div>
          ) : (
            sortedTasks.map((task) => {
              const readiness = erectionReadiness.get(task.id);
              const isSelected = selectedTask === task.id;

              return (
                <div key={task.id}>
                  <button
                    onClick={() => setSelectedTask(isSelected ? null : task.id)}
                    className={cn(
                      'w-full flex items-center gap-3 p-3 rounded border transition-all',
                      readiness.isReady
                        ? 'bg-green-950/30 border-green-800 hover:bg-green-950/40'
                        : 'bg-red-950/30 border-red-800 hover:bg-red-950/40'
                    )}
                  >
                    {readiness.isReady ? (
                      <CheckCircle2 size={18} className="text-green-400 flex-shrink-0" />
                    ) : (
                      <AlertCircle size={18} className="text-red-400 flex-shrink-0" />
                    )}

                    <div className="flex-1 text-left">
                      <div className="text-sm font-bold text-white">{task.name}</div>
                      <div className="text-xs text-zinc-400">
                        {format(parseISO(task.start_date), 'MMM d')} — {format(parseISO(task.end_date), 'MMM d')}
                      </div>
                    </div>

                    <Badge className={readiness.isReady ? 'bg-green-600' : 'bg-red-600'}>
                      {readiness.isReady ? 'Ready' : 'Blocked'}
                    </Badge>
                  </button>

                  {/* Details */}
                  {isSelected && (
                    <div className="mt-2 ml-6 space-y-3 p-3 bg-zinc-900/50 rounded border border-zinc-700">
                      {/* Deliveries */}
                      <div>
                        <div className="text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2 flex items-center gap-1">
                          <Truck size={12} />
                          Required Deliveries
                        </div>
                        {deliveries.length === 0 ? (
                          <p className="text-xs text-zinc-500">No deliveries in project</p>
                        ) : (
                          <div className="space-y-1">
                            {deliveries.map(delivery => {
                              const isLinked = task.linked_delivery_ids?.includes(delivery.id);
                              const isReceived = delivery.status === 'received';
                              return (
                                <label
                                  key={delivery.id}
                                  className="flex items-center gap-2 text-xs cursor-pointer hover:bg-zinc-800 p-1 rounded"
                                >
                                  <Checkbox
                                    checked={isLinked}
                                    onCheckedChange={() => handleDeliveryToggle(task.id, delivery.id)}
                                  />
                                  <span className={isReceived ? 'text-zinc-300' : 'text-zinc-500'}>
                                    {delivery.package_number}
                                  </span>
                                  <Badge
                                    variant="outline"
                                    className={cn(
                                      'text-[10px]',
                                      isReceived
                                        ? 'border-green-600 text-green-400'
                                        : 'border-yellow-600 text-yellow-400'
                                    )}
                                  >
                                    {delivery.status}
                                  </Badge>
                                </label>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Drawings */}
                      <div>
                        <div className="text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2 flex items-center gap-1">
                          <FileText size={12} />
                          Erection Drawings
                        </div>
                        {drawingSets.length === 0 ? (
                          <p className="text-xs text-zinc-500">No drawings in project</p>
                        ) : (
                          <div className="space-y-1">
                            {drawingSets.map(drawing => {
                              const isLinked = task.linked_drawing_set_ids?.includes(drawing.id);
                              const isApproved = drawing.status === 'FFF' || drawing.qa_status === 'pass';
                              return (
                                <label
                                  key={drawing.id}
                                  className="flex items-center gap-2 text-xs cursor-pointer hover:bg-zinc-800 p-1 rounded"
                                >
                                  <Checkbox
                                    checked={isLinked}
                                    onCheckedChange={() => handleDrawingToggle(task.id, drawing.id)}
                                  />
                                  <span className={isApproved ? 'text-zinc-300' : 'text-zinc-500'}>
                                    {drawing.set_name}
                                  </span>
                                  <Badge
                                    variant="outline"
                                    className={cn(
                                      'text-[10px]',
                                      isApproved
                                        ? 'border-green-600 text-green-400'
                                        : 'border-red-600 text-red-400'
                                    )}
                                  >
                                    {drawing.status}
                                  </Badge>
                                </label>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Issues summary */}
                      {readiness.issues.length > 0 && (
                        <div className="p-2 bg-red-950/30 rounded border border-red-900 space-y-1">
                          {readiness.issues.map((issue, idx) => (
                            <div key={idx} className="text-xs text-red-300 flex items-start gap-2">
                              <Lock size={10} className="flex-shrink-0 mt-0.5" />
                              <span>{issue}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}