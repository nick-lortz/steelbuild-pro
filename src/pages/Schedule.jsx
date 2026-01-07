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
import ScreenContainer from '@/components/layout/ScreenContainer';
import WeatherWidget from '@/components/integrations/WeatherWidget';
import BulkActions from '@/components/shared/BulkActions';
import ViewConfiguration from '@/components/shared/ViewConfiguration';
import { useKeyboardShortcuts } from '@/components/shared/hooks/useKeyboardShortcuts';
import { toast } from '@/components/ui/notifications';
import CalendarView from '@/components/schedule/CalendarView';
import GanttChart from '@/components/schedule/GanttChart';
import TaskListView from '@/components/schedule/TaskListView';
import ExportButton from '@/components/shared/ExportButton';

export default function Schedule() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState([]);
  const [viewMode, setViewMode] = useState('list'); // 'list', 'gantt', 'calendar'
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

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Task.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['all-tasks'] });
      toast.success('Task deleted');
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
    return {
      all: totalCount,
      not_started: 0,
      in_progress: 0,
      completed: 0,
      overdue: 0
    };
  }, [totalCount]);

  return (
    <ScreenContainer>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">Schedule</h1>
          <p className="text-sm text-muted-foreground">{statusCounts.all} tasks</p>
        </div>
        <div className="flex items-center gap-2">
          <ExportButton
            data={viewMode === 'list' ? tasks : allScheduleTasks}
            entityType="tasks"
            filename="schedule"
          />
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

      {/* View Mode and Status Tabs */}
      <div className="space-y-4 mb-4">
        <Tabs value={viewMode} onValueChange={setViewMode}>
          <TabsList className="grid w-full grid-cols-3 h-auto">
            <TabsTrigger value="list" className="text-xs py-2">List</TabsTrigger>
            <TabsTrigger value="gantt" className="text-xs py-2">Gantt</TabsTrigger>
            <TabsTrigger value="calendar" className="text-xs py-2">Calendar</TabsTrigger>
          </TabsList>
        </Tabs>

        {viewMode === 'list' && (
          <Tabs value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
            <TabsList className="grid w-full grid-cols-5 h-auto">
              <TabsTrigger value="all" className="text-xs py-2">All</TabsTrigger>
              <TabsTrigger value="not_started" className="text-xs py-2">To Do</TabsTrigger>
              <TabsTrigger value="in_progress" className="text-xs py-2">Active</TabsTrigger>
              <TabsTrigger value="completed" className="text-xs py-2">Done</TabsTrigger>
              <TabsTrigger value="overdue" className="text-xs py-2">Late</TabsTrigger>
            </TabsList>
          </Tabs>
        )}
      </div>

      {/* Content Area */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      ) : viewMode === 'calendar' ? (
        <CalendarView
          tasks={allScheduleTasks}
          projects={projects}
          onTaskClick={handleTaskClick}
        />
      ) : viewMode === 'gantt' ? (
        <GanttChart
          tasks={allScheduleTasks}
          projects={projects}
          viewMode="week"
          onTaskUpdate={(id, data) => updateMutation.mutate({ id, data })}
          onTaskEdit={handleTaskClick}
          resources={resources}
          rfis={rfis}
          changeOrders={changeOrders}
        />
      ) : tasks.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No tasks found</p>
        </div>
      ) : (
        <TaskListView
          tasks={allScheduleTasks}
          projects={projects}
          resources={resources}
          onTaskUpdate={(id, data) => updateMutation.mutate({ id, data })}
          onTaskClick={handleTaskClick}
          onTaskDelete={(id) => deleteMutation.mutate(id)}
        />
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