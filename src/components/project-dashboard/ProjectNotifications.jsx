import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { apiClient } from '@/api/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Bell, 
  AlertTriangle, 
  Clock, 
  CheckCircle2, 
  Truck,
  FileText,
  MessageSquare,
  DollarSign,
  ChevronRight
} from 'lucide-react';
import { format, parseISO, isPast, isToday, isTomorrow, differenceInDays, addDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function ProjectNotifications({ projectId }) {
  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks', projectId],
    queryFn: () => base44.entities.Task.filter({ project_id: projectId }),
    enabled: !!projectId
  });

  const { data: deliveries = [] } = useQuery({
    queryKey: ['deliveries', projectId],
    queryFn: () => base44.entities.Delivery.filter({ project_id: projectId }),
    enabled: !!projectId
  });

  const { data: rfis = [] } = useQuery({
    queryKey: ['rfis', projectId],
    queryFn: () => base44.entities.RFI.filter({ project_id: projectId }),
    enabled: !!projectId
  });

  const { data: fabrication = [] } = useQuery({
    queryKey: ['fabrication', projectId],
    queryFn: () => base44.entities.Fabrication.filter({ project_id: projectId }),
    enabled: !!projectId
  });

  const { data: changeOrders = [] } = useQuery({
    queryKey: ['change-orders', projectId],
    queryFn: () => base44.entities.ChangeOrder.filter({ project_id: projectId }),
    enabled: !!projectId
  });

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => apiClient.auth.me()
  });

  const notifications = useMemo(() => {
    const notifs = [];
    const now = new Date();

    // Overdue tasks (not completed)
    tasks.forEach(task => {
      if (task.status !== 'completed' && task.end_date && isPast(new Date(task.end_date))) {
        const daysOverdue = Math.abs(differenceInDays(now, new Date(task.end_date)));
        notifs.push({
          id: `task-overdue-${task.id}`,
          type: 'critical',
          category: 'task',
          title: `Task Overdue: ${task.name}`,
          message: `${daysOverdue} day${daysOverdue !== 1 ? 's' : ''} overdue`,
          timestamp: task.end_date,
          link: createPageUrl('Schedule'),
          icon: AlertTriangle,
          priority: 'high',
          color: 'red'
        });
      }
    });

    // Tasks due in next 3 days
    tasks.forEach(task => {
      if (task.status !== 'completed' && task.end_date) {
        const daysUntil = differenceInDays(new Date(task.end_date), now);
        if (daysUntil >= 0 && daysUntil <= 3) {
          notifs.push({
            id: `task-upcoming-${task.id}`,
            type: 'warning',
            category: 'task',
            title: `Task Due ${daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `in ${daysUntil}d`}: ${task.name}`,
            message: `Target: ${format(new Date(task.end_date), 'MMM d')}`,
            timestamp: task.end_date,
            link: createPageUrl('Schedule'),
            icon: Clock,
            priority: daysUntil === 0 ? 'high' : 'normal',
            color: daysUntil === 0 ? 'amber' : 'blue'
          });
        }
      }
    });

    // Blocked tasks
    tasks.forEach(task => {
      if (task.status === 'blocked' || task.status === 'on_hold') {
        notifs.push({
          id: `task-blocked-${task.id}`,
          type: 'warning',
          category: 'task',
          title: `Task ${task.status === 'blocked' ? 'Blocked' : 'On Hold'}: ${task.name}`,
          message: task.notes || 'Requires attention',
          timestamp: task.updated_date,
          link: createPageUrl('Schedule'),
          icon: AlertTriangle,
          priority: 'normal',
          color: 'orange'
        });
      }
    });

    // Deliveries arriving today/tomorrow
    deliveries.forEach(delivery => {
      if (delivery.delivery_status === 'in_transit' || delivery.delivery_status === 'confirmed') {
        const arrivalDate = delivery.estimated_arrival || delivery.confirmed_date || delivery.scheduled_date;
        if (arrivalDate) {
          const arrival = new Date(arrivalDate);
          if (isToday(arrival) || isTomorrow(arrival)) {
            notifs.push({
              id: `delivery-${delivery.id}`,
              type: 'info',
              category: 'delivery',
              title: `Delivery ${isToday(arrival) ? 'Today' : 'Tomorrow'}: ${delivery.package_name}`,
              message: `${delivery.vendor_supplier || 'Vendor'} • ${delivery.weight_tons || 0} tons`,
              timestamp: arrivalDate,
              link: createPageUrl('Deliveries'),
              icon: Truck,
              priority: isToday(arrival) ? 'high' : 'normal',
              color: 'green'
            });
          }
        }
      }
    });

    // Open RFIs awaiting response
    rfis.forEach(rfi => {
      if (rfi.status === 'submitted' || rfi.status === 'under_review') {
        const daysOpen = rfi.submitted_date ? differenceInDays(now, new Date(rfi.submitted_date)) : 0;
        const isDueSoon = rfi.due_date && differenceInDays(new Date(rfi.due_date), now) <= 2;
        
        if (daysOpen > 5 || isDueSoon) {
          notifs.push({
            id: `rfi-${rfi.id}`,
            type: 'warning',
            category: 'rfi',
            title: `RFI #${rfi.rfi_number}: ${rfi.subject}`,
            message: isDueSoon 
              ? `Due: ${format(new Date(rfi.due_date), 'MMM d')}` 
              : `Open ${daysOpen} days`,
            timestamp: rfi.submitted_date || rfi.created_date,
            link: createPageUrl('RFIs'),
            icon: MessageSquare,
            priority: isDueSoon ? 'high' : 'normal',
            color: isDueSoon ? 'red' : 'amber'
          });
        }
      }
    });

    // Fabrication holds
    fabrication.forEach(fab => {
      if (fab.on_hold) {
        notifs.push({
          id: `fab-hold-${fab.id}`,
          type: 'warning',
          category: 'fabrication',
          title: `Fabrication Hold: ${fab.piece_mark}`,
          message: fab.hold_reason ? fab.hold_reason.replace('_', ' ') : 'On hold',
          timestamp: fab.hold_date || fab.updated_date,
          link: createPageUrl('Fabrication'),
          icon: AlertTriangle,
          priority: 'normal',
          color: 'orange'
        });
      }
    });

    // Change orders pending approval
    changeOrders.forEach(co => {
      if (co.status === 'pending' || co.status === 'submitted') {
        notifs.push({
          id: `co-${co.id}`,
          type: 'info',
          category: 'financial',
          title: `Change Order #${co.co_number} Pending`,
          message: `${co.cost_impact >= 0 ? '+' : ''}$${co.cost_impact?.toLocaleString() || 0}`,
          timestamp: co.submitted_date || co.created_date,
          link: createPageUrl('ChangeOrders'),
          icon: DollarSign,
          priority: Math.abs(co.cost_impact) > 50000 ? 'high' : 'normal',
          color: 'blue'
        });
      }
    });

    // Sort by priority then timestamp
    return notifs.sort((a, b) => {
      if (a.priority === 'high' && b.priority !== 'high') return -1;
      if (a.priority !== 'high' && b.priority === 'high') return 1;
      return new Date(b.timestamp) - new Date(a.timestamp);
    }).slice(0, 25);
  }, [tasks, deliveries, rfis, fabrication, changeOrders]);

  const criticalCount = notifications.filter(n => n.type === 'critical').length;
  const warningCount = notifications.filter(n => n.type === 'warning').length;

  const getColorClasses = (color, priority) => {
    const base = priority === 'high' ? 'border-2' : 'border';
    
    switch(color) {
      case 'red': return `${base} border-red-500/30 bg-red-950/20 hover:border-red-500/50`;
      case 'amber': return `${base} border-amber-500/30 bg-amber-950/20 hover:border-amber-500/50`;
      case 'orange': return `${base} border-orange-500/30 bg-orange-950/20 hover:border-orange-500/50`;
      case 'green': return `${base} border-green-500/30 bg-green-950/20 hover:border-green-500/50`;
      case 'blue': return `${base} border-blue-500/30 bg-blue-950/20 hover:border-blue-500/50`;
      default: return `${base} border-zinc-700 hover:border-zinc-600`;
    }
  };

  return (
    <Card className="bg-zinc-900/50 border-zinc-800">
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-base">
          <span className="text-zinc-300 flex items-center gap-2">
            <Bell size={16} />
            Project Alerts
          </span>
          <div className="flex items-center gap-2">
            {criticalCount > 0 && (
              <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                {criticalCount} Critical
              </Badge>
            )}
            {warningCount > 0 && (
              <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                {warningCount} Warning
              </Badge>
            )}
            <Badge variant="outline" className="bg-zinc-800 border-zinc-700">
              {notifications.length} Total
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[500px]">
          {notifications.length === 0 ? (
            <div className="text-center py-12 px-4">
              <CheckCircle2 size={32} className="mx-auto mb-2 text-green-500" />
              <p className="text-sm text-zinc-400">All clear - no active alerts</p>
            </div>
          ) : (
            <div className="space-y-2 p-4">
              {notifications.map((notif) => {
                const Icon = notif.icon;
                return (
                  <Link
                    key={notif.id}
                    to={notif.link}
                    className={cn(
                      "block p-3 rounded-lg transition-all",
                      getColorClasses(notif.color, notif.priority)
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        "mt-1 p-2 rounded",
                        notif.color === 'red' && "bg-red-500/20",
                        notif.color === 'amber' && "bg-amber-500/20",
                        notif.color === 'orange' && "bg-orange-500/20",
                        notif.color === 'green' && "bg-green-500/20",
                        notif.color === 'blue' && "bg-blue-500/20",
                        !notif.color && "bg-zinc-800"
                      )}>
                        <Icon size={14} className={cn(
                          notif.color === 'red' && "text-red-400",
                          notif.color === 'amber' && "text-amber-400",
                          notif.color === 'orange' && "text-orange-400",
                          notif.color === 'green' && "text-green-400",
                          notif.color === 'blue' && "text-blue-400",
                          !notif.color && "text-zinc-400"
                        )} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <p className={cn(
                            "text-sm font-semibold truncate",
                            notif.priority === 'high' ? 'text-white' : 'text-zinc-200'
                          )}>
                            {notif.title}
                          </p>
                          {notif.priority === 'high' && (
                            <Badge className="bg-red-500 text-white text-[10px] flex-shrink-0">
                              URGENT
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-zinc-500">{notif.message}</p>
                        <p className="text-[10px] text-zinc-600 mt-1 uppercase tracking-wider">
                          {notif.category}
                        </p>
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