import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, MessageSquareWarning, FileCheck, Calendar, Truck, File, AlertTriangle, Filter } from 'lucide-react';
import { format } from 'date-fns';

export default function ActivityFeed({ projectId }) {
  const [filterType, setFilterType] = useState('all');
  const [filterUser, setFilterUser] = useState('all');

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => apiClient.entities.Project.list('-updated_date'),
    staleTime: 5 * 60 * 1000
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['activityTasks', projectId],
    queryFn: () => projectId 
      ? apiClient.entities.Task.filter({ project_id: projectId }, '-updated_date', 50)
      : apiClient.entities.Task.list('-updated_date', 50)
  });

  const { data: rfis = [] } = useQuery({
    queryKey: ['activityRFIs', projectId],
    queryFn: () => projectId
      ? apiClient.entities.RFI.filter({ project_id: projectId }, '-created_date', 50)
      : apiClient.entities.RFI.list('-created_date', 50)
  });

  const { data: changeOrders = [] } = useQuery({
    queryKey: ['activityCOs', projectId],
    queryFn: () => projectId
      ? apiClient.entities.ChangeOrder.filter({ project_id: projectId }, '-created_date', 50)
      : apiClient.entities.ChangeOrder.list('-created_date', 50)
  });

  const { data: drawings = [] } = useQuery({
    queryKey: ['activityDrawings', projectId],
    queryFn: () => projectId
      ? apiClient.entities.DrawingSet.filter({ project_id: projectId }, '-updated_date', 50)
      : apiClient.entities.DrawingSet.list('-updated_date', 50)
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['activityMessages', projectId],
    queryFn: () => projectId
      ? apiClient.entities.Message.filter({ project_id: projectId }, '-created_date', 50)
      : apiClient.entities.Message.list('-created_date', 50)
  });

  const activityItems = useMemo(() => {
    const items = [];

    tasks.forEach(t => {
      items.push({
        id: `task-${t.id}`,
        type: 'task',
        icon: Calendar,
        title: `Task ${t.status === 'completed' ? 'completed' : 'updated'}`,
        description: t.name,
        project: projects.find(p => p.id === t.project_id),
        user: t.updated_by || t.created_by,
        timestamp: new Date(t.updated_date || t.created_date),
        badge: t.status
      });
    });

    rfis.forEach(r => {
      items.push({
        id: `rfi-${r.id}`,
        type: 'rfi',
        icon: MessageSquareWarning,
        title: `RFI-${String(r.rfi_number).padStart(3, '0')} ${r.status}`,
        description: r.subject,
        project: projects.find(p => p.id === r.project_id),
        user: r.created_by,
        timestamp: new Date(r.created_date),
        badge: r.status
      });
    });

    changeOrders.forEach(c => {
      items.push({
        id: `co-${c.id}`,
        type: 'change_order',
        icon: FileCheck,
        title: `CO-${String(c.co_number).padStart(3, '0')} ${c.status}`,
        description: c.title,
        project: projects.find(p => p.id === c.project_id),
        user: c.created_by,
        timestamp: new Date(c.created_date),
        badge: c.status
      });
    });

    drawings.forEach(d => {
      items.push({
        id: `drawing-${d.id}`,
        type: 'drawing',
        icon: FileText,
        title: `Drawing ${d.status}`,
        description: d.set_name,
        project: projects.find(p => p.id === d.project_id),
        user: d.updated_by || d.created_by,
        timestamp: new Date(d.updated_date || d.created_date),
        badge: d.status
      });
    });

    messages.forEach(m => {
      items.push({
        id: `message-${m.id}`,
        type: 'message',
        icon: MessageSquareWarning,
        title: 'New message',
        description: m.content.substring(0, 50) + (m.content.length > 50 ? '...' : ''),
        project: projects.find(p => p.id === m.project_id),
        user: m.sender_email,
        timestamp: new Date(m.created_date),
        badge: m.mentions?.length > 0 ? 'mentioned' : null
      });
    });

    return items
      .filter(item => filterType === 'all' || item.type === filterType)
      .filter(item => filterUser === 'all' || item.user === filterUser)
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [tasks, rfis, changeOrders, drawings, messages, projects, filterType, filterUser]);

  const uniqueUsers = [...new Set(activityItems.map(i => i.user).filter(Boolean))];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="text-base">Activity Feed</span>
          <div className="flex gap-2">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="task">Tasks</SelectItem>
                <SelectItem value="rfi">RFIs</SelectItem>
                <SelectItem value="change_order">COs</SelectItem>
                <SelectItem value="drawing">Drawings</SelectItem>
                <SelectItem value="message">Messages</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterUser} onValueChange={setFilterUser}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                {uniqueUsers.map(email => (
                  <SelectItem key={email} value={email}>{email.split('@')[0]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[500px]">
          <div className="p-4 space-y-3">
            {activityItems.map(item => {
              const Icon = item.icon;
              return (
                <div key={item.id} className="flex gap-3 p-3 bg-secondary rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                    <Icon size={14} className="text-amber-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="text-sm font-medium">{item.title}</p>
                      {item.badge && <Badge variant="outline" className="text-xs">{item.badge}</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                    {item.project && (
                      <p className="text-[10px] text-muted-foreground mt-1">{item.project.project_number}</p>
                    )}
                    <div className="flex items-center gap-2 mt-2 text-[10px] text-muted-foreground">
                      <span>{item.user?.split('@')[0]}</span>
                      <span>•</span>
                      <span>{format(item.timestamp, 'MMM d, h:mm a')}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}