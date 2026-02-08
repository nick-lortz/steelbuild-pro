import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bell, Check, Trash2, AlertTriangle, Clock, FileText, GitBranch, Package } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const notificationIcons = {
  overdue_task: AlertTriangle,
  fabrication_deadline: Package,
  rfi_update: FileText,
  drawing_update: FileText,
  critical_path_change: GitBranch,
};

const notificationColors = {
  critical: 'text-red-500 bg-red-500/10 border-red-500/20',
  high: 'text-orange-500 bg-orange-500/10 border-orange-500/20',
  medium: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
  low: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
};

export default function NotificationPanel() {
  const [activeTab, setActiveTab] = useState('unread');
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => apiClient.auth.me(),
  });

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => apiClient.entities.Notification.filter({ 
      user_email: user?.email 
    }, '-created_date'),
    enabled: !!user,
    refetchInterval: 30000, // Poll every 30 seconds
  });

  const markAsReadMutation = useMutation({
    mutationFn: (id) => apiClient.entities.Notification.update(id, { 
      is_read: true,
      read_date: new Date().toISOString()
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => apiClient.entities.Notification.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const unread = notifications.filter(n => !n.is_read);
      await Promise.all(
        unread.map(n => apiClient.entities.Notification.update(n.id, { 
          is_read: true,
          read_date: new Date().toISOString()
        }))
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const unreadNotifications = useMemo(() => 
    notifications.filter(n => !n.is_read),
    [notifications]
  );

  const readNotifications = useMemo(() => 
    notifications.filter(n => n.is_read),
    [notifications]
  );

  const handleNotificationClick = (notification) => {
    // Mark as read
    if (!notification.is_read) {
      markAsReadMutation.mutate(notification.id);
    }

    // Navigate to related entity
    switch (notification.related_entity_type) {
      case 'task':
        navigate(createPageUrl('Schedule'));
        break;
      case 'fabrication':
        navigate(createPageUrl('Fabrication'));
        break;
      case 'rfi':
        navigate(createPageUrl('RFIs'));
        break;
      case 'drawing':
        navigate(createPageUrl('Drawings'));
        break;
      default:
        break;
    }
  };

  const NotificationItem = ({ notification }) => {
    const Icon = notificationIcons[notification.type] || Bell;
    const colorClass = notificationColors[notification.priority] || notificationColors.medium;

    return (
      <div
        className={`p-3 border-b border-zinc-800 hover:bg-zinc-800/50 transition-colors cursor-pointer ${
          !notification.is_read ? 'bg-zinc-800/30' : ''
        }`}
        onClick={() => handleNotificationClick(notification)}
      >
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded ${colorClass} border flex-shrink-0`}>
            <Icon size={16} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <p className="text-sm font-medium text-white mb-1">{notification.title}</p>
                <p className="text-xs text-zinc-400 line-clamp-2">{notification.message}</p>
                <div className="flex items-center gap-2 mt-2">
                  <Clock size={10} className="text-zinc-500" />
                  <span className="text-xs text-zinc-500">
                    {format(new Date(notification.created_date), 'MMM d, h:mm a')}
                  </span>
                  {notification.priority === 'critical' && (
                    <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs">
                      Critical
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                {!notification.is_read && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={(e) => {
                      e.stopPropagation();
                      markAsReadMutation.mutate(notification.id);
                    }}
                  >
                    <Check size={14} />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-red-400 hover:text-red-300"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteMutation.mutate(notification.id);
                  }}
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell size={20} className="text-zinc-400" />
          {unreadNotifications.length > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
              {unreadNotifications.length > 9 ? '9+' : unreadNotifications.length}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[400px] p-0 bg-zinc-900 border-zinc-800">
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <h3 className="font-semibold text-white">Notifications</h3>
          {unreadNotifications.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => markAllAsReadMutation.mutate()}
              className="text-xs text-zinc-400 hover:text-white"
            >
              Mark all read
            </Button>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-2 bg-zinc-900 border-b border-zinc-800 rounded-none">
            <TabsTrigger value="unread" className="relative">
              Unread
              {unreadNotifications.length > 0 && (
                <Badge className="ml-2 bg-red-500/20 text-red-400 border-red-500/30">
                  {unreadNotifications.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>

          <TabsContent value="unread" className="m-0">
            <ScrollArea className="h-[400px]">
              {unreadNotifications.length === 0 ? (
                <div className="p-8 text-center text-zinc-500">
                  <Bell size={32} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No unread notifications</p>
                </div>
              ) : (
                unreadNotifications.map((notification) => (
                  <NotificationItem key={notification.id} notification={notification} />
                ))
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="all" className="m-0">
            <ScrollArea className="h-[400px]">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-zinc-500">
                  <Bell size={32} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No notifications yet</p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <NotificationItem key={notification.id} notification={notification} />
                ))
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}