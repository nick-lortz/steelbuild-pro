import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { apiClient } from '@/api/client';
import { useActiveProject } from '@/components/shared/hooks/useActiveProject';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PageShell from '@/components/layout/PageShell';
import PageHeader from '@/components/layout/PageHeader';
import ContentSection from '@/components/layout/ContentSection';
import EmptyState from '@/components/layout/EmptyState';
import StatusBadge from '@/components/ui/StatusBadge';
import { CheckCircle2, Circle, Plus, LayoutGrid, List } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function ToDoListPage() {
  const { activeProjectId } = useActiveProject();
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState('my-tasks');
  const [showForm, setShowForm] = useState(false);

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => apiClient.auth.me()
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['todo-items', activeProjectId],
    queryFn: async () => {
      if (activeProjectId) {
        return apiClient.entities.TodoItem.filter({ project_id: activeProjectId });
      }
      return apiClient.entities.TodoItem.list();
    }
  });

  const createMutation = useMutation({
    mutationFn: (data) => apiClient.entities.TodoItem.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todo-items'] });
      toast.success('Task created');
      setShowForm(false);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => apiClient.entities.TodoItem.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todo-items'] });
      toast.success('Updated');
    }
  });

  const myTasks = useMemo(() => {
    return tasks.filter(t => 
      t.owner === currentUser?.email || 
      t.assignees?.includes(currentUser?.email)
    );
  }, [tasks, currentUser]);

  const handleToggleComplete = (task) => {
    const newStatus = task.status === 'done' ? 'in_progress' : 'done';
    updateMutation.mutate({
      id: task.id,
      data: {
        status: newStatus,
        completed_date: newStatus === 'done' ? new Date().toISOString() : null
      }
    });
  };

  const tasksByStatus = useMemo(() => {
    const filtered = viewMode === 'my-tasks' ? myTasks : tasks;
    return {
      backlog: filtered.filter(t => t.status === 'backlog'),
      ready: filtered.filter(t => t.status === 'ready'),
      in_progress: filtered.filter(t => t.status === 'in_progress'),
      blocked: filtered.filter(t => t.status === 'blocked'),
      done: filtered.filter(t => t.status === 'done')
    };
  }, [tasks, myTasks, viewMode]);

  return (
    <PageShell>
      <PageHeader 
        title="To-Do List"
        subtitle={`${tasks.length} tasks`}
        actions={
          <Button onClick={() => setShowForm(true)} className="bg-amber-500 hover:bg-amber-600 text-black font-bold">
            <Plus size={16} className="mr-2" />
            Add Task
          </Button>
        }
      />

      <ContentSection>

      <Tabs value={viewMode} onValueChange={setViewMode}>
        <TabsList className="bg-zinc-900 border border-zinc-800">
          <TabsTrigger value="my-tasks">My Tasks ({myTasks.length})</TabsTrigger>
          <TabsTrigger value="project-tasks">Project Tasks ({tasks.length})</TabsTrigger>
          <TabsTrigger value="kanban">
            <LayoutGrid size={14} className="mr-2" />
            Kanban
          </TabsTrigger>
        </TabsList>

        <TabsContent value="my-tasks" className="space-y-3">
          {myTasks.map(task => (
            <TaskCard 
              key={task.id} 
              task={task} 
              onToggle={() => handleToggleComplete(task)}
              onUpdate={(data) => updateMutation.mutate({ id: task.id, data })}
            />
          ))}
          {myTasks.length === 0 && (
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-12 text-center">
                <CheckCircle2 size={48} className="mx-auto mb-4 text-zinc-600" />
                <p className="text-zinc-400">No tasks assigned to you</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="project-tasks" className="space-y-3">
          {tasks.map(task => (
            <TaskCard 
              key={task.id} 
              task={task} 
              onToggle={() => handleToggleComplete(task)}
              onUpdate={(data) => updateMutation.mutate({ id: task.id, data })}
            />
          ))}
          {tasks.length === 0 && (
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-12 text-center">
                <List size={48} className="mx-auto mb-4 text-zinc-600" />
                <p className="text-zinc-400">No tasks found</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="kanban">
          <div className="grid grid-cols-5 gap-4">
            {Object.entries(tasksByStatus).map(([status, statusTasks]) => (
              <Card key={status} className="bg-zinc-900 border-zinc-800">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-medium text-sm capitalize">{status.replace('_', ' ')}</h3>
                    <Badge>{statusTasks.length}</Badge>
                  </div>
                  <div className="space-y-2">
                    {statusTasks.map(task => (
                      <div key={task.id} className="p-3 bg-zinc-800 rounded text-sm">
                        <div className="font-medium mb-1">{task.title}</div>
                        {task.due_date && (
                          <div className="text-xs text-zinc-500">
                            Due: {format(new Date(task.due_date), 'MMM d')}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {showForm && (
        <TaskForm
          projectId={activeProjectId}
          currentUser={currentUser}
          onSubmit={(data) => createMutation.mutate(data)}
          onCancel={() => setShowForm(false)}
        />
      )}
      </ContentSection>
    </PageShell>
  );
}

function TaskCard({ task, onToggle, onUpdate }) {
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done';

  return (
    <Card className={`bg-zinc-900 border-zinc-800 ${isOverdue ? 'ring-2 ring-red-500/50' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <button
            onClick={onToggle}
            className="mt-1 flex-shrink-0"
          >
            {task.status === 'done' ? (
              <CheckCircle2 className="text-green-500" size={20} />
            ) : (
              <Circle className="text-zinc-600" size={20} />
            )}
          </button>
          <div className="flex-1">
            <h3 className={`font-medium ${task.status === 'done' ? 'line-through text-zinc-600' : ''}`}>
              {task.title}
            </h3>
            {task.description && (
              <p className="text-sm text-zinc-400 mt-1">{task.description}</p>
            )}
            <div className="flex items-center gap-3 mt-2 text-xs text-zinc-500">
              <StatusBadge status={task.status} />
              {task.priority !== 'normal' && (
                <Badge className={
                  task.priority === 'urgent' ? 'bg-red-500' :
                  task.priority === 'high' ? 'bg-orange-500' :
                  'bg-blue-500'
                }>
                  {task.priority}
                </Badge>
              )}
              {task.due_date && (
                <span className={isOverdue ? 'text-red-500 font-medium' : ''}>
                  Due: {format(new Date(task.due_date), 'MMM d')}
                </span>
              )}
              {task.owner && <span>Owner: {task.owner.split('@')[0]}</span>}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TaskForm({ projectId, currentUser, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    project_id: projectId,
    task_number: Date.now(),
    title: '',
    description: '',
    status: 'backlog',
    priority: 'normal',
    owner: currentUser?.email
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="bg-zinc-900 border-zinc-800 w-full max-w-2xl">
        <CardContent className="p-6 space-y-4">
          <h2 className="text-xl font-bold">New Task</h2>
          <div>
            <label className="text-xs text-zinc-400 mb-2 block">Title *</label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="bg-zinc-800 border-zinc-700"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-2 block">Description</label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="bg-zinc-800 border-zinc-700"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-zinc-400 mb-2 block">Priority</label>
              <Select
                value={formData.priority}
                onValueChange={(val) => setFormData({ ...formData, priority: val })}
              >
                <SelectTrigger className="bg-zinc-800 border-zinc-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-2 block">Due Date</label>
              <Input
                type="date"
                value={formData.due_date || ''}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                className="bg-zinc-800 border-zinc-700"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="ghost" onClick={onCancel}>Cancel</Button>
            <Button 
              onClick={() => onSubmit(formData)}
              disabled={!formData.title}
              className="bg-amber-500 hover:bg-amber-600 text-black"
            >
              Create Task
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}