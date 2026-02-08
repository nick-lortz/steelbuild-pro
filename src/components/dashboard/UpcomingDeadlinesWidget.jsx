import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { apiClient } from '@/api/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, AlertTriangle } from 'lucide-react';
import { format, parseISO, differenceInDays, isPast } from 'date-fns';
import { cn } from '@/lib/utils';

export default function UpcomingDeadlinesWidget({ projectId }) {
  const { data: drawingSets = [] } = useQuery({
    queryKey: ['drawing-sets-deadline', projectId],
    queryFn: () => apiClient.entities.DrawingSet.filter({ project_id: projectId }),
    enabled: !!projectId
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks-deadline', projectId],
    queryFn: () => apiClient.entities.Task.filter({ project_id: projectId }),
    enabled: !!projectId
  });

  const { data: rfis = [] } = useQuery({
    queryKey: ['rfis-deadline', projectId],
    queryFn: () => apiClient.entities.RFI.filter({ project_id: projectId }),
    enabled: !!projectId
  });

  const deadlines = useMemo(() => {
    const items = [];
    const now = new Date();

    // Drawing deadlines
    drawingSets.forEach(ds => {
      if (ds.due_date && ds.status !== 'FFF') {
        const dueDate = parseISO(ds.due_date);
        const daysUntil = differenceInDays(dueDate, now);
        items.push({
          id: `ds-${ds.id}`,
          type: 'Drawing',
          title: ds.set_name,
          subtitle: ds.set_number,
          dueDate: ds.due_date,
          daysUntil,
          isOverdue: isPast(dueDate)
        });
      }
    });

    // Task deadlines
    tasks.forEach(task => {
      if (task.due_date && task.status !== 'complete') {
        const dueDate = parseISO(task.due_date);
        const daysUntil = differenceInDays(dueDate, now);
        items.push({
          id: `task-${task.id}`,
          type: 'Task',
          title: task.name,
          subtitle: task.phase || '',
          dueDate: task.due_date,
          daysUntil,
          isOverdue: isPast(dueDate)
        });
      }
    });

    // RFI deadlines
    rfis.forEach(rfi => {
      if (rfi.due_date && rfi.status !== 'closed' && rfi.status !== 'answered') {
        const dueDate = parseISO(rfi.due_date);
        const daysUntil = differenceInDays(dueDate, now);
        items.push({
          id: `rfi-${rfi.id}`,
          type: 'RFI',
          title: rfi.subject,
          subtitle: `#${rfi.rfi_number}`,
          dueDate: rfi.due_date,
          daysUntil,
          isOverdue: isPast(dueDate)
        });
      }
    });

    // Sort: overdue first, then by days until due
    return items
      .sort((a, b) => {
        if (a.isOverdue !== b.isOverdue) return a.isOverdue ? -1 : 1;
        return a.daysUntil - b.daysUntil;
      })
      .slice(0, 8); // Show top 8
  }, [drawingSets, tasks, rfis]);

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-sm">
          <span className="text-zinc-400 uppercase tracking-widest font-bold flex items-center gap-2">
            <Clock size={14} />
            Upcoming Deadlines
          </span>
          <Badge variant="secondary">{deadlines.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {deadlines.length === 0 ? (
          <div className="text-center py-8">
            <Clock size={32} className="mx-auto mb-2 text-zinc-700" />
            <p className="text-sm text-zinc-600">No upcoming deadlines</p>
          </div>
        ) : (
          <div className="space-y-2">
            {deadlines.map((item) => (
              <div
                key={item.id}
                className={cn(
                  "p-3 rounded-lg border",
                  item.isOverdue 
                    ? "bg-red-950/20 border-red-500/30" 
                    : item.daysUntil <= 3
                    ? "bg-amber-950/20 border-amber-500/30"
                    : "bg-zinc-950 border-zinc-800"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-[10px] border-zinc-700">
                        {item.type}
                      </Badge>
                      {item.isOverdue && (
                        <AlertTriangle size={12} className="text-red-500" />
                      )}
                    </div>
                    <p className="text-sm font-semibold text-white truncate">{item.title}</p>
                    <p className="text-xs text-zinc-600 font-mono">{item.subtitle}</p>
                  </div>
                  <div className="text-right">
                    <div className={cn(
                      "text-xs font-bold mb-1",
                      item.isOverdue ? "text-red-500" : item.daysUntil <= 3 ? "text-amber-500" : "text-zinc-400"
                    )}>
                      {item.isOverdue 
                        ? `${Math.abs(item.daysUntil)}d OVD` 
                        : `${item.daysUntil}d`
                      }
                    </div>
                    <div className="text-[10px] text-zinc-600 font-mono">
                      {format(parseISO(item.dueDate), 'MMM d')}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}