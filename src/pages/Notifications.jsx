import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Bell, Check, Trash2, Mail, AlertTriangle, Calendar, DollarSign, FileText, ClipboardList, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import PageHeader from '@/components/ui/PageHeader';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useNavigate } from 'react-router-dom';
import { format, formatDistanceToNow } from 'date-fns';

const typeIcons = {
  task_assigned: ClipboardList,
  task_due_soon: Calendar,
  task_overdue: AlertTriangle,
  rfi_assigned: FileText,
  rfi_due_soon: Calendar,
  rfi_overdue: AlertTriangle,
  drawing_overdue: AlertTriangle,
  invoice_overdue: DollarSign,
  budget_alert: DollarSign,
  change_order_pending: FileText,
  meeting_reminder: Calendar,
  general: Bell,
};

const typeLabels = {
  task_assigned: 'Task Assigned',
  task_due_soon: 'Task Due Soon',
  task_overdue: 'Task Overdue',
  rfi_assigned: 'RFI Assigned',
  rfi_due_soon: 'RFI Due Soon',
  rfi_overdue: 'RFI Overdue',
  drawing_overdue: 'Drawing Overdue',
  invoice_overdue: 'Invoice Overdue',
  budget_alert: 'Budget Alert',
  change_order_pending: 'Change Order',
  meeting_reminder: 'Meeting',
  general: 'General',
};

const priorityColors = {
  low: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
  medium: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  high: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  critical: 'bg-red-500/20 text-red-400 border-red-500/30',
};

export default function Notifications() {
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      try {
        return await base44.auth.me();
      } catch {
        return null;
      }
    },
  });

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications', currentUser?.email],
    queryFn: async () => {
      if (!currentUser) return [];
      return base44.entities.Notification.filter(
        { user_email: currentUser.email },
        '-created_date',
        200
      );
    },
    enabled: !!currentUser,
  });

  const markAsReadMutation = useMutation({
    mutationFn: (id) => base44.entities.Notification.update(id, {
      is_read: true,
      read_at: new Date().toISOString()
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: (id) => base44.entities.Notification.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const unreadNotifications = filteredNotifications.filter(n => !n.is_read);
      await Promise.all(
        unreadNotifications.map(n =>
          base44.entities.Notification.update(n.id, {
            is_read: true,
            read_at: new Date().toISOString()
          })
        )
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const deleteAllReadMutation = useMutation({
    mutationFn: async () => {
      const readNotifications = notifications.filter(n => n.is_read);
      await Promise.all(
        readNotifications.map(n => base44.entities.Notification.delete(n.id))
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const filteredNotifications = notifications.filter(n => {
    const matchesType = filterType === 'all' || n.type === filterType;
    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'unread' && !n.is_read) ||
      (filterStatus === 'read' && n.is_read);
    return matchesType && matchesStatus;
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const handleNotificationClick = (notification) => {
    if (!notification.is_read) {
      markAsReadMutation.mutate(notification.id);
    }
    if (notification.link) {
      navigate(notification.link);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-zinc-400">Loading notifications...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Notifications"
        subtitle={`${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}`}
        actions={
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button
                variant="outline"
                onClick={() => markAllAsReadMutation.mutate()}
                className="border-zinc-700 text-white hover:bg-zinc-800"
              >
                <Check size={16} className="mr-2" />
                Mark All Read
              </Button>
            )}
            {notifications.filter(n => n.is_read).length > 0 && (
              <Button
                variant="outline"
                onClick={() => deleteAllReadMutation.mutate()}
                className="border-zinc-700 text-white hover:bg-zinc-800"
              >
                <Trash2 size={16} className="mr-2" />
                Clear Read
              </Button>
            )}
          </div>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-48 bg-zinc-900 border-zinc-800">
            <Filter size={16} className="mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Notifications</SelectItem>
            <SelectItem value="unread">Unread Only</SelectItem>
            <SelectItem value="read">Read Only</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-56 bg-zinc-900 border-zinc-800">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="task_assigned">Task Assignments</SelectItem>
            <SelectItem value="task_due_soon">Tasks Due Soon</SelectItem>
            <SelectItem value="task_overdue">Overdue Tasks</SelectItem>
            <SelectItem value="rfi_overdue">Overdue RFIs</SelectItem>
            <SelectItem value="drawing_overdue">Overdue Drawings</SelectItem>
            <SelectItem value="budget_alert">Budget Alerts</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Notifications List */}
      {filteredNotifications.length === 0 ? (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-12 text-center">
            <Bell size={64} className="mx-auto text-zinc-700 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">
              {filterStatus === 'unread' ? 'No unread notifications' : 'No notifications'}
            </h3>
            <p className="text-zinc-400">
              {filterStatus === 'unread' 
                ? "You're all caught up! Check back later for new updates."
                : "You'll be notified about important events like task assignments, deadlines, and budget alerts."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredNotifications.map((notification) => {
            const Icon = typeIcons[notification.type] || Bell;
            const isUnread = !notification.is_read;

            return (
              <Card
                key={notification.id}
                className={`bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-colors cursor-pointer ${
                  isUnread ? 'border-l-4 border-l-blue-500' : ''
                }`}
                onClick={() => handleNotificationClick(notification)}
              >
                <CardContent className="p-5">
                  <div className="flex gap-4">
                    <div className={`mt-1 p-3 rounded-lg ${
                      notification.priority === 'critical' ? 'bg-red-500/20' :
                      notification.priority === 'high' ? 'bg-amber-500/20' :
                      notification.priority === 'medium' ? 'bg-blue-500/20' :
                      'bg-zinc-800'
                    }`}>
                      <Icon size={24} className={
                        notification.priority === 'critical' ? 'text-red-400' :
                        notification.priority === 'high' ? 'text-amber-400' :
                        notification.priority === 'medium' ? 'text-blue-400' :
                        'text-zinc-400'
                      } />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div>
                          <h3 className={`font-semibold ${isUnread ? 'text-white' : 'text-zinc-300'}`}>
                            {notification.title}
                          </h3>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {typeLabels[notification.type] || notification.type}
                            </Badge>
                            <Badge variant="outline" className={priorityColors[notification.priority]}>
                              {notification.priority}
                            </Badge>
                            {notification.email_sent && (
                              <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20">
                                <Mail size={10} className="mr-1" />
                                Email Sent
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {isUnread && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                markAsReadMutation.mutate(notification.id);
                              }}
                              className="text-blue-400 hover:text-blue-300"
                            >
                              <Check size={16} />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNotificationMutation.mutate(notification.id);
                            }}
                            className="text-zinc-500 hover:text-red-400"
                          >
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      </div>
                      <p className="text-zinc-400 text-sm mb-3">
                        {notification.message}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-zinc-500">
                          {formatDistanceToNow(new Date(notification.created_date), { addSuffix: true })}
                          {' • '}
                          {format(new Date(notification.created_date), 'MMM d, yyyy h:mm a')}
                        </span>
                        {notification.link && (
                          <span className="text-xs text-amber-400">
                            Click to view →
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}