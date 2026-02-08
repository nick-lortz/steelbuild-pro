import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, Truck, AlertCircle } from 'lucide-react';
import { useActiveProject } from '@/components/shared/hooks/useActiveProject';

export default function ErectionReadinessDashboard() {
  const { activeProjectId } = useActiveProject();

  const { data: deliveries = [] } = useQuery({
    queryKey: ['deliveries', activeProjectId],
    queryFn: () => base44.entities.Delivery.filter({
      project_id: activeProjectId
    }),
    enabled: !!activeProjectId
  });

  const { data: erectionTasks = [] } = useQuery({
    queryKey: ['erectionTasks', activeProjectId],
    queryFn: () => base44.entities.Task.filter({
      project_id: activeProjectId,
      phase: 'erection'
    }),
    enabled: !!activeProjectId
  });

  const { data: fieldRFIs = [] } = useQuery({
    queryKey: ['fieldRFIs', activeProjectId],
    queryFn: () => base44.entities.RFI.filter({
      project_id: activeProjectId,
      status: { $in: ['submitted', 'under_review'] },
      discipline: { $regex: 'field|erection|fitup' }
    }),
    enabled: !!activeProjectId
  });

  // Calculate metrics
  const totalDeliveries = deliveries.length;
  const completedDeliveries = deliveries.filter(d => d.status === 'received').length;
  const deliveryPercent = totalDeliveries > 0 ? Math.round((completedDeliveries / totalDeliveries) * 100) : 0;

  const totalTonsRequired = erectionTasks.reduce((sum, t) => sum + (t.tons_required || 0), 0);
  const tonsDelivered = deliveries
    .filter(d => d.status === 'received')
    .reduce((sum, d) => sum + (d.est_tonnage || 0), 0);
  const erectionPercent = totalTonsRequired > 0 ? Math.round((tonsDelivered / totalTonsRequired) * 100) : 0;

  const blockedErectionTasks = erectionTasks.filter(t => t.status === 'blocked').length;
  const openFieldRFIs = fieldRFIs.length;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        {/* Deliveries Complete */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Truck size={16} className="text-blue-500" />
              Deliveries Complete
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between items-baseline">
                <span className="text-2xl font-bold">{deliveryPercent}%</span>
                <span className="text-xs text-muted-foreground">{completedDeliveries} of {totalDeliveries}</span>
              </div>
              <Progress value={deliveryPercent} />
            </div>
            {deliveryPercent === 100 ? (
              <div className="text-xs text-green-400 flex items-center gap-1">
                <CheckCircle size={14} /> All on site
              </div>
            ) : (
              <div className="text-xs text-yellow-400">
                {totalDeliveries - completedDeliveries} in transit
              </div>
            )}
          </CardContent>
        </Card>

        {/* Erection Tonnage Ready */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <CheckCircle size={16} className="text-green-500" />
              Tonnage Available
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between items-baseline">
                <span className="text-2xl font-bold">{erectionPercent}%</span>
                <span className="text-xs text-muted-foreground">{Math.round(tonsDelivered)} of {Math.round(totalTonsRequired)} tons</span>
              </div>
              <Progress value={erectionPercent} />
            </div>
            {erectionPercent >= 80 ? (
              <div className="text-xs text-green-400">Ready to sequence</div>
            ) : (
              <div className="text-xs text-orange-400">
                {Math.round(totalTonsRequired - tonsDelivered)} tons pending
              </div>
            )}
          </CardContent>
        </Card>

        {/* Field Issues */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertCircle size={16} className="text-orange-500" />
              Open Field RFIs
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-3xl font-bold">{openFieldRFIs}</div>
            <div className="text-xs text-muted-foreground">
              {blockedErectionTasks > 0 && (
                <div className="text-red-400">{blockedErectionTasks} tasks blocked</div>
              )}
              {openFieldRFIs > 0 && (
                <div>Awaiting response</div>
              )}
              {openFieldRFIs === 0 && blockedErectionTasks === 0 && (
                <div className="text-green-400">✓ Field clear</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Erection Readiness by Task */}
      <Card>
        <CardHeader>
          <CardTitle>Erection Task Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {erectionTasks.slice(0, 10).map((task) => {
              const taskDeliveries = deliveries.filter(d => d.linked_task_ids?.includes(task.id));
              const taskTonsDelivered = taskDeliveries.filter(d => d.status === 'received').reduce((sum, d) => sum + (d.est_tonnage || 0), 0);
              const taskTonsRequired = task.tons_required || 0;
              const readyPercent = taskTonsRequired > 0 ? Math.round((taskTonsDelivered / taskTonsRequired) * 100) : 100;

              return (
                <div key={task.id} className="p-3 bg-card rounded border space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-medium text-sm">{task.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {Math.round(taskTonsDelivered)} / {Math.round(taskTonsRequired)} tons
                      </div>
                    </div>
                    {task.status === 'blocked' && (
                      <Badge variant="destructive" className="text-xs">Blocked</Badge>
                    )}
                    {task.status === 'in_progress' && (
                      <Badge className="bg-blue-600 text-xs">Active</Badge>
                    )}
                    {task.status === 'not_started' && readyPercent >= 80 && (
                      <Badge className="bg-green-600 text-xs">Ready</Badge>
                    )}
                  </div>
                  {taskTonsRequired > 0 && (
                    <Progress value={readyPercent} className="h-1.5" />
                  )}
                </div>
              );
            })}
            {erectionTasks.length === 0 && (
              <div className="text-center text-sm text-muted-foreground py-4">
                No erection tasks scheduled
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Field Issues Detail */}
      {fieldRFIs.length > 0 && (
        <Card className="border-orange-800">
          <CardHeader>
            <CardTitle className="text-orange-500">Open Field RFIs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {fieldRFIs.slice(0, 6).map((rfi) => (
                <div key={rfi.id} className="flex items-start justify-between p-3 bg-card rounded border border-orange-900/30">
                  <div className="flex-1">
                    <div className="font-mono text-sm">RFI-{rfi.rfi_number}</div>
                    <div className="text-sm text-muted-foreground line-clamp-1">{rfi.subject}</div>
                    {rfi.location_area && (
                      <div className="text-xs text-muted-foreground mt-1">{rfi.location_area}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    {rfi.blocker_info?.is_blocker && (
                      <Badge variant="destructive" className="text-xs">Blocks work</Badge>
                    )}
                    <Badge 
                      variant={rfi.priority === 'critical' ? 'destructive' : 'secondary'}
                      className="text-xs"
                    >
                      {rfi.priority}
                    </Badge>
                  </div>
                </div>
              ))}
              {fieldRFIs.length > 6 && (
                <div className="text-center text-sm text-muted-foreground pt-2">
                  +{fieldRFIs.length - 6} more
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}