import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import PageShell from '@/components/layout/PageShell';
import PageHeader from '@/components/layout/PageHeader';
import ContentSection from '@/components/layout/ContentSection';
import MetricsBar from '@/components/layout/MetricsBar';
import { CheckCircle2, Clock, AlertTriangle, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO, isPast, isWithinInterval, addDays } from 'date-fns';

export default function MyActionItems() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('all');
  const [dueDateFilter, setDueDateFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('all');

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me()
  });

  const { data: allActions = [] } = useQuery({
    queryKey: ['my-actions', user?.email],
    queryFn: () => base44.entities.ProductionNote.filter({ 
      note_type: 'action',
      owner_email: user?.email 
    }),
    enabled: !!user?.email
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list()
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ProductionNote.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-actions'] });
      toast.success('Action updated');
    }
  });

  const projectMap = useMemo(() => {
    const map = {};
    projects.forEach(p => { map[p.id] = p; });
    return map;
  }, [projects]);

  const filteredActions = useMemo(() => {
    return allActions.filter(action => {
      if (statusFilter !== 'all' && action.status !== statusFilter) return false;
      if (projectFilter !== 'all' && action.project_id !== projectFilter) return false;
      
      if (dueDateFilter !== 'all' && action.due_date) {
        const dueDate = parseISO(action.due_date);
        const now = new Date();
        
        if (dueDateFilter === 'overdue' && !isPast(dueDate)) return false;
        if (dueDateFilter === 'today' && format(dueDate, 'yyyy-MM-dd') !== format(now, 'yyyy-MM-dd')) return false;
        if (dueDateFilter === 'this_week' && !isWithinInterval(dueDate, { start: now, end: addDays(now, 7) })) return false;
        if (dueDateFilter === 'this_month' && !isWithinInterval(dueDate, { start: now, end: addDays(now, 30) })) return false;
      } else if (dueDateFilter !== 'all' && !action.due_date) {
        return false;
      }
      
      return true;
    });
  }, [allActions, statusFilter, dueDateFilter, projectFilter]);

  const stats = useMemo(() => {
    const overdue = allActions.filter(a => a.due_date && isPast(parseISO(a.due_date)) && a.status !== 'done').length;
    const open = allActions.filter(a => a.status === 'open' || a.status === 'in_progress').length;
    const done = allActions.filter(a => a.status === 'done').length;
    
    return { total: allActions.length, overdue, open, done };
  }, [allActions]);

  const handleStatusChange = (actionId, newStatus) => {
    updateMutation.mutate({ id: actionId, data: { status: newStatus } });
  };

  const metrics = [
    { label: 'Total', value: stats.total, color: 'text-white', icon: null },
    { label: 'Open', value: stats.open, color: 'text-blue-400', icon: Clock },
    { label: 'Overdue', value: stats.overdue, color: 'text-red-400', icon: AlertTriangle },
    { label: 'Done', value: stats.done, color: 'text-green-400', icon: CheckCircle2 }
  ];

  return (
    <PageShell>
      <PageHeader 
        title="My Action Items"
        subtitle={`${stats.total} total • ${stats.open} open • ${stats.overdue} overdue`}
      />

      <MetricsBar metrics={metrics} />

      <ContentSection>
      {/* Filters */}
      <div className="flex gap-3 mt-6">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="blocked">Blocked</SelectItem>
            <SelectItem value="done">Done</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>

        <Select value={dueDateFilter} onValueChange={setDueDateFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Due Date" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Dates</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
            <SelectItem value="today">Due Today</SelectItem>
            <SelectItem value="this_week">This Week</SelectItem>
            <SelectItem value="this_month">This Month</SelectItem>
          </SelectContent>
        </Select>

        <Select value={projectFilter} onValueChange={setProjectFilter}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Project" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Projects</SelectItem>
            {projects.map(p => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Action Items List */}
      <div className="mt-6 space-y-3">
        {filteredActions.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center text-muted-foreground">
              No action items found
            </CardContent>
          </Card>
        )}

        {filteredActions.map(action => {
          const project = projectMap[action.project_id];
          const isOverdue = action.due_date && isPast(parseISO(action.due_date)) && action.status !== 'done';
          const isDone = action.status === 'done';

          return (
            <Card key={action.id} className={isOverdue ? 'border-red-600' : ''}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <button
                      onClick={() => handleStatusChange(action.id, isDone ? 'open' : 'done')}
                      className="mt-1"
                    >
                      {isDone ? (
                        <CheckCircle2 size={20} className="text-green-500" />
                      ) : (
                        <Clock size={20} className="text-zinc-500" />
                      )}
                    </button>

                    <div className="flex-1">
                      <div className={`font-medium text-lg ${isDone ? 'line-through text-muted-foreground' : ''}`}>
                        {action.title || action.body}
                      </div>
                      
                      <div className="flex items-center gap-2 mt-2">
                        {project && (
                          <Badge variant="outline">{project.name}</Badge>
                        )}
                        <Badge className="capitalize">{action.status}</Badge>
                        {action.category && (
                          <Badge variant="outline" className="capitalize">{action.category}</Badge>
                        )}
                        {action.priority && action.priority !== 'normal' && (
                          <Badge className={
                            action.priority === 'critical' ? 'bg-red-700' :
                            action.priority === 'high' ? 'bg-orange-700' : 'bg-blue-700'
                          }>
                            {action.priority}
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        {action.due_date && (
                          <div className={`flex items-center gap-1 ${isOverdue ? 'text-red-500 font-medium' : ''}`}>
                            <Calendar size={14} />
                            Due: {format(parseISO(action.due_date), 'MMM d, yyyy')}
                            {isOverdue && <AlertTriangle size={14} className="ml-1" />}
                          </div>
                        )}
                        <div>Week: {action.week_id}</div>
                      </div>
                    </div>
                  </div>

                  <Select 
                    value={action.status} 
                    onValueChange={(val) => handleStatusChange(action.id, val)}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="blocked">Blocked</SelectItem>
                      <SelectItem value="done">Done</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      </ContentSection>
    </PageShell>
  );
}