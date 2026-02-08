import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bell, FileText, MessageSquare, CheckCircle2, Clock, ChevronRight } from 'lucide-react';
import { format, parseISO, isToday, isYesterday, differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function DashboardNotificationCenter({ projectId }) {
  const { data: drawingSets = [] } = useQuery({
    queryKey: ['drawing-sets-notif', projectId],
    queryFn: () => apiClient.entities.DrawingSet.filter({ project_id: projectId }, '-updated_date'),
    enabled: !!projectId
  });

  const { data: rfis = [] } = useQuery({
    queryKey: ['rfis-notif', projectId],
    queryFn: () => apiClient.entities.RFI.filter({ project_id: projectId }, '-updated_date'),
    enabled: !!projectId
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks-notif', projectId],
    queryFn: () => apiClient.entities.Task.filter({ project_id: projectId }, '-updated_date'),
    enabled: !!projectId
  });

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => apiClient.auth.me()
  });

  const notifications = useMemo(() => {
    const notifs = [];
    const now = new Date();

    // Drawing updates (updated in last 24 hours)
    drawingSets.forEach(ds => {
      const updatedDate = parseISO(ds.updated_date);
      if (differenceInDays(now, updatedDate) <= 1) {
        notifs.push({
          id: `ds-${ds.id}`,
          type: 'drawing',
          title: `Drawing ${ds.set_number} updated`,
          message: `${ds.set_name} - ${ds.status}`,
          timestamp: ds.updated_date,
          link: createPageUrl('Detailing'),
          icon: FileText,
          priority: ds.status === 'BFA' ? 'high' : 'normal'
        });
      }
    });

    // New RFIs (created in last 3 days or status changed)
    rfis.forEach(rfi => {
      const createdDate = parseISO(rfi.created_date);
      const updatedDate = parseISO(rfi.updated_date);
      
      if (differenceInDays(now, createdDate) <= 3) {
        notifs.push({
          id: `rfi-new-${rfi.id}`,
          type: 'rfi',
          title: `New RFI #${rfi.rfi_number}`,
          message: rfi.subject,
          timestamp: rfi.created_date,
          link: createPageUrl('RFIs'),
          icon: MessageSquare,
          priority: rfi.priority === 'high' || rfi.priority === 'critical' ? 'high' : 'normal'
        });
      } else if (differenceInDays(now, updatedDate) <= 1 && rfi.status === 'answered') {
        notifs.push({
          id: `rfi-ans-${rfi.id}`,
          type: 'rfi',
          title: `RFI #${rfi.rfi_number} answered`,
          message: rfi.subject,
          timestamp: rfi.updated_date,
          link: createPageUrl('RFIs'),
          icon: CheckCircle2,
          priority: 'normal'
        });
      }
    });

    // Assigned tasks (assigned to current user, due soon or overdue)
    if (currentUser) {
      tasks.filter(t => t.assigned_to === currentUser.email).forEach(task => {
        if (task.due_date) {
          const dueDate = parseISO(task.due_date);
          const daysUntil = differenceInDays(dueDate, now);
          
          if (daysUntil < 0) {
            notifs.push({
              id: `task-overdue-${task.id}`,
              type: 'task',
              title: `Task overdue: ${task.name}`,
              message: `${Math.abs(daysUntil)} days overdue`,
              timestamp: task.due_date,
              link: createPageUrl('Schedule'),
              icon: Clock,
              priority: 'high'
            });
          } else if (daysUntil <= 3) {
            notifs.push({
              id: `task-due-${task.id}`,
              type: 'task',
              title: `Task due soon: ${task.name}`,
              message: `Due in ${daysUntil} days`,
              timestamp: task.due_date,
              link: createPageUrl('Schedule'),
              icon: Clock,
              priority: 'normal'
            });
          }
        }
      });
    }

    // Sort by priority then timestamp
    return notifs.sort((a, b) => {
      if (a.priority === 'high' && b.priority !== 'high') return -1;
      if (a.priority !== 'high' && b.priority === 'high') return 1;
      return new Date(b.timestamp) - new Date(a.timestamp);
    }).slice(0, 20); // Limit to 20 most recent
  }, [drawingSets, rfis, tasks, currentUser]);

  const formatTimestamp = (timestamp) => {
    const date = parseISO(timestamp);
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'MMM d');
  };

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-sm">
          <span className="text-zinc-400 uppercase tracking-widest font-bold flex items-center gap-2">
            <Bell size={14} />
            Notifications
          </span>
          <Badge variant="secondary">{notifications.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[400px]">
          {notifications.length === 0 ? (
            <div className="text-center py-12 px-4">
              <Bell size={32} className="mx-auto mb-2 text-zinc-700" />
              <p className="text-sm text-zinc-600">No recent notifications</p>
            </div>
          ) : (
            <div className="space-y-1 p-4">
              {notifications.map((notif) => {
                const Icon = notif.icon;
                return (
                  <Link
                    key={notif.id}
                    to={notif.link}
                    className={cn(
                      "block p-3 rounded-lg border border-zinc-800 hover:border-zinc-700 transition-colors",
                      notif.priority === 'high' && "bg-red-950/20 border-red-500/30"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        "mt-1 p-1.5 rounded",
                        notif.priority === 'high' ? 'bg-red-500/20 text-red-500' : 'bg-zinc-800 text-zinc-400'
                      )}>
                        <Icon size={14} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <p className="text-sm font-semibold text-white truncate">{notif.title}</p>
                          <span className="text-xs text-zinc-600 whitespace-nowrap">
                            {formatTimestamp(notif.timestamp)}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-500 truncate">{notif.message}</p>
                      </div>
                      <ChevronRight size={14} className="text-zinc-600 mt-2 flex-shrink-0" />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}