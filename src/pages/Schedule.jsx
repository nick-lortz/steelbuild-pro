import React, { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, RefreshCw, Filter } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import TaskCard from '@/components/schedule/TaskCard';
import TaskForm from '@/components/schedule/TaskForm';
import GanttView from '@/components/schedule/GanttView';
import ScreenContainer from '@/components/layout/ScreenContainer';
import WeatherWidget from '@/components/integrations/WeatherWidget';
import BulkActions from '@/components/shared/BulkActions';
import ViewConfiguration from '@/components/shared/ViewConfiguration';
import { useKeyboardShortcuts } from '@/components/shared/hooks/useKeyboardShortcuts';
import { toast } from '@/components/ui/notifications';
import { Card, CardContent } from "@/components/ui/card";

export default function Schedule() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('all');
  const [viewMode, setViewMode] = useState('list');
  const [page, setPage] = useState(1);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState([]);
  const PAGE_SIZE = 30;

  const queryClient = useQueryClient();

  // Fetch projects for filter
  const { data: rawProjects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('name'),
    staleTime: 5 * 60 * 1000
  });

  const projects = useMemo(() => 
    [...rawProjects].sort((a, b) => (a.name || '').localeCompare(b.name || '')),
    [rawProjects]
  );

  // Fetch all tasks and filter on frontend
  const { data: allScheduleTasks = [], isLoading, refetch } = useQuery({
    queryKey: ['schedule-tasks'],
    queryFn: () => base44.entities.Task.list('end_date'),
    staleTime: 2 * 60 * 1000
  });

  // Filter and paginate tasks
  const { tasks, hasMore, totalCount } = useMemo(() => {
    let filtered = [...allScheduleTasks];

    // Filter by project
    if (projectFilter !== 'all') {
      filtered = filtered.filter(t => t.project_id === projectFilter);
    }

    // Filter by status
    if (statusFilter !== 'all') {
      if (statusFilter === 'overdue') {
        const today = new Date().toISOString().split('T')[0];
        filtered = filtered.filter(t => 
          t.status !== 'completed' && 
          t.end_date && 
          t.end_date < today
        );
      } else {
        filtered = filtered.filter(t => t.status === statusFilter);
      }
    }

    // Filter by search term
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(t => 
        t.name?.toLowerCase().includes(search) ||
        t.wbs_code?.toLowerCase().includes(search)
      );
    }

    // Paginate
    const startIdx = 0;
    const endIdx = page * PAGE_SIZE;
    const paginated = filtered.slice(startIdx, endIdx);
    
    return {
      tasks: paginated,
      hasMore: endIdx < filtered.length,
      totalCount: filtered.length
    };
  }, [allScheduleTasks, projectFilter, statusFilter, searchTerm, page]);

  // Fetch all resources for task form
  const { data: resources = [] } = useQuery({
    queryKey: ['resources'],
    queryFn: () => base44.entities.Resource.list(),
    staleTime: 10 * 60 * 1000
  });

  const { data: rfis = [] } = useQuery({
    queryKey: ['rfis'],
    queryFn: () => base44.entities.RFI.list(),
    staleTime: 5 * 60 * 1000
  });

  const { data: changeOrders = [] } = useQuery({
    queryKey: ['changeOrders'],
    queryFn: () => base44.entities.ChangeOrder.list(),
    staleTime: 5 * 60 * 1000
  });

  const { data: drawingSets = [] } = useQuery({
    queryKey: ['drawings'],
    queryFn: () => base44.entities.DrawingSet.list(),
    staleTime: 5 * 60 * 1000
  });

  const { data: allTasks = [] } = useQuery({
    queryKey: ['all-tasks'],
    queryFn: () => base44.entities.Task.list('start_date'),
    staleTime: 2 * 60 * 1000
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Task.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['all-tasks'] });
      setShowTaskForm(false);
      setEditingTask(null);
      toast.success('Task created');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Task.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['all-tasks'] });
      setShowTaskForm(false);
      setEditingTask(null);
      toast.success('Task updated');
    }
  });

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  }, [refetch]);

  const handleTaskClick = (task) => {
    setEditingTask(task);
    setShowTaskForm(true);
  };

  const handleCreateTask = () => {
    setEditingTask({
      project_id: projectFilter !== 'all' ? projectFilter : '',
      phase: 'fabrication',
      status: 'not_started',
      is_milestone: false
    });
    setShowTaskForm(true);
  };

  const bulkUpdateStatus = (newStatus) => {
    selectedTasks.forEach(taskId => {
      updateMutation.mutate({ id: taskId, data: { status: newStatus } });
    });
    setSelectedTasks([]);
    toast.success(`${selectedTasks.length} tasks updated`);
  };

  const loadView = (filters) => {
    setProjectFilter(filters.projectFilter || 'all');
    setStatusFilter(filters.statusFilter || 'all');
    setSearchTerm(filters.searchTerm || '');
  };

  useKeyboardShortcuts([
    { key: 'n', ctrl: true, action: handleCreateTask },
    { key: 'r', ctrl: true, action: handleRefresh },
    { key: 'f', ctrl: true, action: () => setShowFilters(!showFilters) }
  ]);

  const statusCounts = useMemo(() => {
    const filtered = allScheduleTasks.filter(t => {
      if (projectFilter !== 'all' && t.project_id !== projectFilter) return false;
      if (searchTerm && !t.name?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      return true;
    });

    const today = new Date().toISOString().split('T')[0];
    return {
      all: filtered.length,
      not_started: filtered.filter(t => t.status === 'not_started').length,
      in_progress: filtered.filter(t => t.status === 'in_progress').length,
      completed: filtered.filter(t => t.status === 'completed').length,
      overdue: filtered.filter(t => t.status !== 'completed' && t.end_date && t.end_date < today).length
    };
  }, [allScheduleTasks, projectFilter, searchTerm]);

  // Group tasks by project for Gantt view
  const tasksByProject = useMemo(() => {
    const filtered = allScheduleTasks.filter(t => {
      if (projectFilter !== 'all' && t.project_id !== projectFilter) return false;
      if (searchTerm && !t.name?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      return true;
    });

    const grouped = {};
    filtered.forEach(task => {
      if (!grouped[task.project_id]) grouped[task.project_id] = [];
      grouped[task.project_id].push(task);
    });

    return grouped;
  }, [allScheduleTasks, projectFilter, searchTerm]);

  return (
    <ScreenContainer>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-2xl font-bold">Schedule</h1>
          <p className="text-sm text-muted-foreground">{statusCounts.all} tasks total</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={viewMode} onValueChange={setViewMode}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="list">List</SelectItem>
              <SelectItem value="gantt">Timeline</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter size={18} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} />
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search tasks..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setPage(1);
          }}
          className="pl-10"
        />
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="space-y-4 mb-4">
          <div className="flex items-center justify-between gap-2">
            <Select value={projectFilter} onValueChange={(v) => { setProjectFilter(v); setPage(1); }}>
              <SelectTrigger>
                <SelectValue placeholder="Project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <ViewConfiguration 
              viewKey="schedule"
              currentFilters={{ projectFilter, statusFilter, searchTerm }}
              onLoadView={loadView}
            />
          </div>
          {projectFilter !== 'all' && <WeatherWidget projectId={projectFilter} />}
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-4">
        <Card className={statusFilter === 'all' ? 'bg-amber-500/10 border-amber-500/20' : 'bg-card'}>
          <CardContent className="p-3 cursor-pointer" onClick={() => setStatusFilter('all')}>
            <p className="text-xs text-muted-foreground">All</p>
            <p className="text-xl font-bold">{statusCounts.all}</p>
          </CardContent>
        </Card>
        <Card className={statusFilter === 'not_started' ? 'bg-blue-500/10 border-blue-500/20' : 'bg-card'}>
          <CardContent className="p-3 cursor-pointer" onClick={() => setStatusFilter('not_started')}>
            <p className="text-xs text-muted-foreground">To Do</p>
            <p className="text-xl font-bold text-blue-400">{statusCounts.not_started}</p>
          </CardContent>
        </Card>
        <Card className={statusFilter === 'in_progress' ? 'bg-amber-500/10 border-amber-500/20' : 'bg-card'}>
          <CardContent className="p-3 cursor-pointer" onClick={() => setStatusFilter('in_progress')}>
            <p className="text-xs text-muted-foreground">Active</p>
            <p className="text-xl font-bold text-amber-400">{statusCounts.in_progress}</p>
          </CardContent>
        </Card>
        <Card className={statusFilter === 'completed' ? 'bg-green-500/10 border-green-500/20' : 'bg-card'}>
          <CardContent className="p-3 cursor-pointer" onClick={() => setStatusFilter('completed')}>
            <p className="text-xs text-muted-foreground">Done</p>
            <p className="text-xl font-bold text-green-400">{statusCounts.completed}</p>
          </CardContent>
        </Card>
        <Card className={statusFilter === 'overdue' ? 'bg-red-500/10 border-red-500/20' : 'bg-card'}>
          <CardContent className="p-3 cursor-pointer" onClick={() => setStatusFilter('overdue')}>
            <p className="text-xs text-muted-foreground">Late</p>
            <p className="text-xl font-bold text-red-400">{statusCounts.overdue}</p>
          </CardContent>
        </Card>
      </div>

      {/* Content Area */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      ) : viewMode === 'gantt' ? (
        <div className="space-y-4">
          {Object.keys(tasksByProject).length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No tasks to display</p>
            </div>
          ) : (
            Object.entries(tasksByProject).map(([projectId, projectTasks]) => {
              const project = projects.find(p => p.id === projectId);
              return (
                <div key={projectId}>
                  <h3 className="text-sm font-semibold text-white mb-2 px-1">
                    {project?.name || 'Unknown Project'}
                    <span className="text-xs text-zinc-500 ml-2">({projectTasks.length} tasks)</span>
                  </h3>
                  <GanttView tasks={projectTasks} compact={projectTasks.length > 20} />
                </div>
              );
            })
          )}
        </div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No tasks found</p>
        </div>
      ) : (
        <>
          <div className="space-y-2 mb-4">
            {tasks.map((task) => {
              const project = projects.find(p => p.id === task.project_id);
              const isSelected = selectedTasks.includes(task.id);
              return (
                <div key={task.id} className="relative">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => {
                      setSelectedTasks(prev => 
                        prev.includes(task.id) 
                          ? prev.filter(id => id !== task.id)
                          : [...prev, task.id]
                      );
                    }}
                    className="absolute top-3 left-3 z-10 w-4 h-4"
                  />
                  <TaskCard
                    task={task}
                    project={project}
                    onClick={() => handleTaskClick(task)}
                  />
                </div>
              );
            })}
          </div>

          {hasMore && (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setPage(p => p + 1)}
            >
              Load More
            </Button>
          )}
        </>
      )}

      {/* Bulk Actions */}
      <BulkActions
        selectedCount={selectedTasks.length}
        onClear={() => setSelectedTasks([])}
        actions={[
          { label: 'Complete', onClick: () => bulkUpdateStatus('completed') },
          { label: 'In Progress', onClick: () => bulkUpdateStatus('in_progress') },
          { label: 'Cancel', variant: 'ghost', onClick: () => setSelectedTasks([]) }
        ]}
      />

      {/* Floating Action Button */}
      <Button
        className="fixed right-4 bottom-20 lg:bottom-4 w-14 h-14 rounded-full shadow-lg bg-amber-500 hover:bg-amber-600 text-black z-40"
        onClick={handleCreateTask}
      >
        <Plus size={24} />
      </Button>

      {/* Task Form Sheet */}
      <Sheet open={showTaskForm} onOpenChange={(open) => {
        setShowTaskForm(open);
        if (!open) setEditingTask(null);
      }}>
        <SheetContent className="w-full overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editingTask?.id ? 'Edit Task' : 'New Task'}</SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            <TaskForm
              task={editingTask}
              projects={projects}
              tasks={allTasks}
              resources={resources}
              rfis={rfis}
              changeOrders={changeOrders}
              drawingSets={drawingSets}
              onSubmit={(data) => {
                if (editingTask?.id) {
                  updateMutation.mutate({ id: editingTask.id, data });
                } else {
                  createMutation.mutate(data);
                }
              }}
              onCancel={() => {
                setShowTaskForm(false);
                setEditingTask(null);
              }}
              isLoading={createMutation.isPending || updateMutation.isPending}
            />
          </div>
        </SheetContent>
      </Sheet>
    </ScreenContainer>
  );
}