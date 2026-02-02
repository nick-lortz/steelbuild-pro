import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import PageHeader from '@/components/ui/PageHeader';
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
      
      if (dueDateFilter !== 'all') {
        if (!action.due_date && dueDateFilter !== 'all') return false;
        
        try {
          const dueDate = parseISO(action.due_date);
          const now = new Date();
          now.setHours(0, 0, 0, 0);
          dueDate.setHours(0, 0, 0, 0);
          
          if (dueDateFilter === 'overdue' && dueDate >= now) return false;
          if (dueDateFilter === 'today' && format(dueDate, 'yyyy-MM-dd') !== format(now, 'yyyy-MM-dd')) return false;
          if (dueDateFilter === 'this_week' && !isWithinInterval(dueDate, { start: now, end: addDays(now, 7) })) return false;
          if (dueDateFilter === 'this_month' && !isWithinInterval(dueDate, { start: now, end: addDays(now, 30) })) return false;
        } catch {
          return false;
        }
      }
      
      return true;
    });
  }, [allActions, statusFilter, dueDateFilter, projectFilter]);

  const stats = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Start of today in local time
    
    const overdue = allActions.filter(a => {
      if (!a.due_date || a.status === 'done') return false;
      try {
        const dueDate = parseISO(a.due_date);
        dueDate.setHours(0, 0, 0, 0);
        return dueDate < now;
      } catch {
        return false;
      }
    }).length;
    
    const open = allActions.filter(a => a.status === 'open' || a.status === 'in_progress').length;
    const done = allActions.filter(a => a.status === 'done').length;
    
    return { total: allActions.length, overdue, open, done };
  }, [allActions]);

  const handleStatusChange = (actionId, newStatus) => {
    updateMutation.mutate({ id: actionId, data: { status: newStatus } });
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <PageHeader 
        title="My Action Items"
        subtitle={`${stats.total} total • ${stats.open} open • ${stats.overdue} overdue`}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4 mt-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Open</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">{stats.open}</div>
          </CardContent>
        </Card>
        <Card className="border-red-600">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{stats.overdue}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{stats.done}</div>
          </CardContent>
        </Card>
      </div>

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
          let isOverdue = false;
          if (action.due_date && action.status !== 'done') {
            try {
              const dueDate = parseISO(action.due_date);
              const now = new Date();
              dueDate.setHours(0, 0, 0, 0);
              now.setHours(0, 0, 0, 0);
              isOverdue = dueDate < now;
            } catch {
              isOverdue = false;
            }
          }
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
    </div>
  );
}