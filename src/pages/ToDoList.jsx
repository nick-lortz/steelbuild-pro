import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Edit, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { format, differenceInDays, isPast, parseISO } from 'date-fns';
import { toast } from '@/components/ui/notifications';
import { cn } from '@/lib/utils';
import { useActiveProject } from '@/components/shared/hooks/useActiveProject';

export default function ToDoList() {
  const { activeProjectId, setActiveProjectId } = useActiveProject();
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [quickAddTitle, setQuickAddTitle] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    due_date: '',
    priority: 'medium',
    status: 'to_do',
    assigned_to: ''
  });

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: allProjects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list(),
    staleTime: 5 * 60 * 1000
  });

  const userProjects = useMemo(() => {
    if (!currentUser) return [];
    return currentUser.role === 'admin' 
      ? allProjects 
      : allProjects.filter(p => p.assigned_users?.includes(currentUser?.email));
  }, [currentUser, allProjects]);

  const { data: tasks = [] } = useQuery({
    queryKey: ['todo-items', activeProjectId],
    queryFn: () => activeProjectId 
      ? base44.entities.TodoItem.filter({ project_id: activeProjectId }, '-due_date')
      : [],
    enabled: !!activeProjectId
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
    staleTime: 10 * 60 * 1000
  });

  const createTaskMutation = useMutation({
    mutationFn: (data) => base44.entities.TodoItem.create({
      ...data,
      project_id: activeProjectId
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todo-items'] });
      setShowDialog(false);
      setQuickAddTitle('');
      resetForm();
      toast.success('Task created');
    },
    onError: () => toast.error('Failed to create task')
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.TodoItem.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todo-items'] });
      setShowDialog(false);
      setEditingTask(null);
      resetForm();
      toast.success('Task updated');
    },
    onError: () => toast.error('Failed to update task')
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (id) => base44.entities.TodoItem.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todo-items'] });
      toast.success('Task deleted');
    },
    onError: () => toast.error('Failed to delete task')
  });

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      due_date: '',
      priority: 'medium',
      status: 'to_do',
      assigned_to: ''
    });
  };

  const handleQuickAdd = () => {
    if (!quickAddTitle.trim()) return;
    
    createTaskMutation.mutate({
      title: quickAddTitle,
      status: 'to_do',
      priority: 'medium'
    });
  };

  const handleEdit = (task) => {
    setEditingTask(task);
    setFormData({
      title: task.title,
      description: task.description || '',
      due_date: task.due_date || '',
      priority: task.priority || 'medium',
      status: task.status,
      assigned_to: task.assigned_to || ''
    });
    setShowDialog(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (editingTask) {
      updateTaskMutation.mutate({ id: editingTask.id, data: formData });
    } else {
      createTaskMutation.mutate(formData);
    }
  };

  const toggleTaskStatus = (task) => {
    const newStatus = task.status === 'done' ? 'to_do' : 'done';
    updateTaskMutation.mutate({
      id: task.id,
      data: { status: newStatus }
    });
  };

  const filteredTasks = useMemo(() => {
    let filtered = tasks;

    if (filterStatus !== 'all') {
      filtered = filtered.filter(t => t.status === filterStatus);
    }
    if (filterPriority !== 'all') {
      filtered = filtered.filter(t => t.priority === filterPriority);
    }

    // Sort: overdue first, then by due date, then by priority
    return filtered.sort((a, b) => {
      const aDate = a.due_date ? parseISO(a.due_date) : null;
      const bDate = b.due_date ? parseISO(b.due_date) : null;
      
      const aOverdue = aDate && isPast(aDate);
      const bOverdue = bDate && isPast(bDate);
      
      if (aOverdue !== bOverdue) return aOverdue ? -1 : 1;
      if (aDate && bDate) return aDate - bDate;
      if (aDate) return -1;
      if (bDate) return 1;
      
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }, [tasks, filterStatus, filterPriority]);

  const stats = useMemo(() => {
    const total = tasks.length;
    const done = tasks.filter(t => t.status === 'done').length;
    const overdue = tasks.filter(t => t.status !== 'done' && t.due_date && isPast(parseISO(t.due_date))).length;
    const today = tasks.filter(t => {
      if (t.status === 'done' || !t.due_date) return false;
      const daysUntil = differenceInDays(parseISO(t.due_date), new Date());
      return daysUntil === 0;
    }).length;

    return { total, done, overdue, today };
  }, [tasks]);

  const selectedProject = allProjects.find(p => p.id === activeProjectId);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="max-w-[1400px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold uppercase tracking-wide">To-Do List</h1>
              {selectedProject && (
                <p className="text-xs text-muted-foreground font-mono mt-1">
                  {selectedProject.project_number} • {selectedProject.name}
                </p>
              )}
            </div>
            <div className="flex items-center gap-3">
              <label className="text-xs text-muted-foreground uppercase tracking-widest font-bold">
                PROJECT:
              </label>
              <Select value={activeProjectId || ''} onValueChange={setActiveProjectId}>
                <SelectTrigger className="w-64 bg-secondary">
                  <SelectValue placeholder="Select a project..." />
                </SelectTrigger>
                <SelectContent>
                  {userProjects.length === 0 ? (
                    <div className="p-2 text-xs text-muted-foreground">No projects assigned</div>
                  ) : (
                    userProjects.map(project => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.project_number} - {project.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {!activeProjectId ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <CheckCircle2 size={48} className="mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-bold uppercase tracking-wide mb-2">No Project Selected</h3>
            <p className="text-muted-foreground text-xs uppercase tracking-widest">
              Select a project to view tasks
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Stats Bar */}
          <div className="border-b border-border bg-card">
            <div className="max-w-[1400px] mx-auto px-6 py-4">
              <div className="grid grid-cols-4 gap-6">
                <div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">
                    TOTAL
                  </div>
                  <div className="text-2xl font-bold font-mono">{stats.total}</div>
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">
                    COMPLETED
                  </div>
                  <div className="text-2xl font-bold font-mono text-green-500">{stats.done}</div>
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">
                    DUE TODAY
                  </div>
                  <div className="text-2xl font-bold font-mono text-amber-500">{stats.today}</div>
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">
                    OVERDUE
                  </div>
                  <div className="text-2xl font-bold font-mono text-red-500">{stats.overdue}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Add & Filters */}
          <div className="border-b border-border bg-card">
            <div className="max-w-[1400px] mx-auto px-6 py-4">
              <div className="flex items-center gap-3">
                <Input
                  placeholder="Quick add task... (press Enter)"
                  value={quickAddTitle}
                  onChange={(e) => setQuickAddTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleQuickAdd();
                  }}
                  className="flex-1 bg-secondary"
                />
                <Button
                  onClick={handleQuickAdd}
                  disabled={!quickAddTitle.trim()}
                  size="sm"
                  className="bg-primary text-primary-foreground"
                >
                  <Plus size={16} className="mr-2" />
                  Add
                </Button>
                <Button
                  onClick={() => {
                    setEditingTask(null);
                    resetForm();
                    setShowDialog(true);
                  }}
                  variant="outline"
                  size="sm"
                >
                  Detailed Task
                </Button>

                <div className="border-l border-border h-8 mx-2" />

                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-36 bg-secondary">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="to_do">To Do</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="done">Done</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filterPriority} onValueChange={setFilterPriority}>
                  <SelectTrigger className="w-36 bg-secondary">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priority</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Tasks List */}
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-[1400px] mx-auto px-6 py-6 space-y-2">
              {filteredTasks.map(task => {
                const daysUntil = task.due_date ? differenceInDays(parseISO(task.due_date), new Date()) : null;
                const isOverdue = daysUntil !== null && daysUntil < 0;
                const isDueToday = daysUntil === 0;
                const isDone = task.status === 'done';

                return (
                  <div
                    key={task.id}
                    className={cn(
                      "bg-card border rounded p-4 hover:border-primary/50 transition-colors",
                      isOverdue && !isDone && "border-red-500/30 bg-red-950/10",
                      isDone && "opacity-60"
                    )}
                  >
                    <div className="flex items-start gap-4">
                      <Checkbox
                        checked={isDone}
                        onCheckedChange={() => toggleTaskStatus(task)}
                        className="mt-1"
                      />

                      <div className="flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <h3 className={cn(
                              "font-semibold mb-1",
                              isDone && "line-through text-muted-foreground"
                            )}>
                              {task.title}
                            </h3>
                            {task.description && (
                              <p className="text-sm text-muted-foreground mb-2">{task.description}</p>
                            )}
                            <div className="flex items-center gap-3 text-xs">
                              {task.due_date && (
                                <div className={cn(
                                  "flex items-center gap-1",
                                  isOverdue && !isDone && "text-red-500",
                                  isDueToday && !isDone && "text-amber-500"
                                )}>
                                  <Clock size={12} />
                                  {format(parseISO(task.due_date), 'MMM d, yyyy')}
                                  {daysUntil !== null && !isDone && (
                                    <span className="font-mono">
                                      ({isOverdue ? `${Math.abs(daysUntil)}d overdue` : `${daysUntil}d`})
                                    </span>
                                  )}
                                </div>
                              )}
                              {task.assigned_to && (
                                <Badge variant="outline" className="text-xs">
                                  {users.find(u => u.email === task.assigned_to)?.full_name || task.assigned_to}
                                </Badge>
                              )}
                              <Badge
                                variant="secondary"
                                className={cn(
                                  "text-xs",
                                  task.priority === 'critical' && "bg-red-500/20 text-red-400",
                                  task.priority === 'high' && "bg-orange-500/20 text-orange-400"
                                )}
                              >
                                {task.priority}
                              </Badge>
                              <Badge variant="outline" className="text-xs capitalize">
                                {task.status.replace('_', ' ')}
                              </Badge>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleEdit(task)}
                              className="h-8 w-8"
                            >
                              <Edit size={14} />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => {
                                if (confirm('Delete this task?')) {
                                  deleteTaskMutation.mutate(task.id);
                                }
                              }}
                              className="h-8 w-8 text-red-400 hover:text-red-300"
                            >
                              <Trash2 size={14} />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {filteredTasks.length === 0 && (
                <div className="text-center py-20">
                  <CheckCircle2 size={48} className="mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-sm font-bold uppercase tracking-wide mb-2">No Tasks</h3>
                  <p className="text-xs text-muted-foreground uppercase tracking-widest">
                    Add a task to get started
                  </p>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Task Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingTask ? 'Edit Task' : 'New Task'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Title *</label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                className="bg-secondary"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="bg-secondary"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Due Date</label>
                <Input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  className="bg-secondary"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Priority</label>
                <Select value={formData.priority} onValueChange={(v) => setFormData({ ...formData, priority: v })}>
                  <SelectTrigger className="bg-secondary">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                  <SelectTrigger className="bg-secondary">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="to_do">To Do</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="done">Done</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Assign To</label>
                <Select value={formData.assigned_to} onValueChange={(v) => setFormData({ ...formData, assigned_to: v })}>
                  <SelectTrigger className="bg-secondary">
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>Unassigned</SelectItem>
                    {users.map(u => (
                      <SelectItem key={u.email} value={u.email}>{u.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createTaskMutation.isPending || updateTaskMutation.isPending}>
                {editingTask ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}