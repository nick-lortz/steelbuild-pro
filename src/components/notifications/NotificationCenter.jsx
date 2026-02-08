import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { apiClient } from '@/api/client';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Bell, Clock, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

export default function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => apiClient.auth.me()
  });

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications', currentUser?.email],
    queryFn: () => {
      if (!currentUser?.email) return [];
      return apiClient.entities.Notification.filter(
        { user_id: currentUser.email },
        '-created_date',
        20
      );
    },
    enabled: !!currentUser?.email,
    staleTime: 30 * 1000
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsReadMutation = useMutation({
    mutationFn: (notificationId) =>
      apiClient.entities.Notification.update(notificationId, {
        read: true,
        read_at: new Date().toISOString()
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: (notificationId) =>
      apiClient.entities.Notification.delete(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const unread = notifications.filter(n => !n.read);
      await Promise.all(
        unread.map(n =>
          apiClient.entities.Notification.update(n.id, {
            read: true,
            read_at: new Date().toISOString()
          })
        )
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  const getPriorityColor = (priority) => {
    const colors = {
      critical: 'text-red-400',
      high: 'text-orange-400',
      normal: 'text-blue-400',
      low: 'text-gray-400'
    };
    return colors[priority] || colors.normal;
  };

  const getTypeIcon = (type) => {
    const icons = {
      deadline: <Clock size={14} />,
      status_change: <CheckCircle2 size={14} />,
      task_assigned: <AlertCircle size={14} />,
      rfi_response: <CheckCircle2 size={14} />,
      delivery_update: <AlertCircle size={14} />
    };
    return icons[type] || <Bell size={14} />;
  };

  const handleNotificationClick = (notification) => {
    if (!notification.read) {
      markAsReadMutation.mutate(notification.id);
    }
    if (notification.action_url) {
      window.location.href = notification.action_url;
    }
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        className="relative text-zinc-400 hover:text-white"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <Badge className="absolute -top-2 -right-2 bg-red-500 text-white text-xs h-5 w-5 p-0 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </Badge>
        )}
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-full sm:max-w-md bg-zinc-900 border-zinc-800 text-white overflow-y-auto">
          <SheetHeader className="border-b border-zinc-800 pb-4">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-white">Notifications</SheetTitle>
              {unreadCount > 0 && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => markAllAsReadMutation.mutate()}
                  className="text-xs text-amber-400 hover:text-amber-300"
                  disabled={markAllAsReadMutation.isPending}
                >
                  Mark all as read
                </Button>
              )}
            </div>
          </SheetHeader>

          <div className="mt-4 space-y-2">
            {notifications.length === 0 ? (
              <div className="text-center py-8 text-zinc-500">
                <Bell size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">No notifications</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={cn(
                    'p-3 rounded border cursor-pointer transition-colors group',
                    notification.read
                      ? 'bg-zinc-800/50 border-zinc-700 hover:bg-zinc-800'
                      : 'bg-zinc-800 border-amber-600/50 hover:bg-zinc-750'
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn('mt-1', getPriorityColor(notification.priority))}>
                      {getTypeIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white line-clamp-1">
                        {notification.title}
                      </p>
                      <p className="text-xs text-zinc-400 mt-1 line-clamp-2">
                        {notification.message}
                      </p>
                      <p className="text-xs text-zinc-500 mt-1">
                        {formatDistanceToNow(parseISO(notification.created_date), { addSuffix: true })}
                      </p>
                    </div>
                    {!notification.read && (
                      <div className="h-2 w-2 rounded-full bg-amber-500 mt-1 flex-shrink-0" />
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotificationMutation.mutate(notification.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 h-6 w-6 text-zinc-400 hover:text-red-400"
                      disabled={deleteNotificationMutation.isPending}
                    >
                      <X size={14} />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}