import React, { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, RefreshCw, Filter, Calendar } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import TaskCard from '@/components/schedule/TaskCard';
import TaskForm from '@/components/schedule/TaskForm';
import ScreenContainer from '@/components/layout/ScreenContainer';
import WeatherWidget from '@/components/integrations/WeatherWidget';
import BulkActions from '@/components/shared/BulkActions';
import ViewConfiguration from '@/components/shared/ViewConfiguration';
import { useKeyboardShortcuts } from '@/components/shared/hooks/useKeyboardShortcuts';
import { useActiveProject } from '@/components/shared/hooks/useActiveProject';
import { toast } from '@/components/ui/notifications';
import CalendarView from '@/components/schedule/CalendarView';
import GanttChart from '@/components/schedule/GanttChart';
import TaskListView from '@/components/schedule/TaskListView';
import ExportButton from '@/components/shared/ExportButton';

export default function Schedule() {
  const { activeProjectId, setActiveProjectId } = useActiveProject();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
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

  const selectedProject = useMemo(() => {
    if (!activeProjectId) return null;
    return projects.find(p => p.id === activeProjectId);
  }, [projects, activeProjectId]);

  // Fetch tasks for active project only
  const { data: allScheduleTasks = [], isLoading, refetch } = useQuery({
    queryKey: ['schedule-tasks', activeProjectId],
    queryFn: () => {
      if (!activeProjectId) return [];
      return base44.entities.Task.filter({ project_id: activeProjectId }, 'end_date');
    },
    enabled: !!activeProjectId,
    staleTime: 2 * 60 * 1000
  });

  // Filter and paginate tasks
  const { tasks, hasMore, totalCount } = useMemo(() => {
    let filtered = [...allScheduleTasks];

    // Project filtering already done in query - no need to filter again
    
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
  }, [allScheduleTasks, statusFilter, searchTerm, page]);

  // Fetch work packages first
  const { data: workPackages = [] } = useQuery({
    queryKey: ['workPackages', activeProjectId],
    queryFn: () => {
      if (!activeProjectId) return [];
      return base44.entities.WorkPackage.filter({ project_id: activeProjectId });
    },
    enabled: !!activeProjectId,
    staleTime: 5 * 60 * 1000
  });

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
    mutationFn: async (data) => {
      const response = await base44.functions.invoke('createTaskForWorkPackage', {
        work_package_id: data.work_package_id,
        task_data: data
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['all-tasks'] });
      setShowTaskForm(false);
      setEditingTask(null);
      toast.success('Task created');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to create task');
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const response = await base44.functions.invoke('updateTask', {
        task_id: id,
        task_data: data
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['all-tasks'] });
      setShowTaskForm(false);
      setEditingTask(null);
      toast.success('Task updated');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to update task');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const response = await base44.functions.invoke('deleteTask', {
        task_id: id
      });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['schedule-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['all-tasks'] });
      toast.success(data.message || 'Task deleted');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to delete task');
    }
  });

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  }, [refetch]);

  const handleTaskClick = async (task) => {
    // Get work package to determine editability
    const workPackageData = await base44.entities.WorkPackage.filter({ id: task.work_package_id });
    const workPackage = workPackageData[0];

    if (!workPackage) {
      toast.error('Work package not found');
      return;
    }

    // Determine if task is editable
    const isEditable = workPackage.status === 'active' && workPackage.phase === task.phase;
    
    setEditingTask({
      ...task,
      _isReadOnly: !isEditable,
      _workPackageStatus: workPackage.status,
      _workPackagePhase: workPackage.phase
    });
    setShowTaskForm(true);
  };

  const handleCreateTask = () => {
    if (!activeProjectId) {
      toast.error('Please select a project first');
      return;
    }
    if (selectedProject?.phase === 'detailing') {
      toast.error('Cannot create tasks during detailing phase. Complete detailing first.');
      return;
    }
    setEditingTask({
      project_id: activeProjectId,
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
    if (filters.projectFilter && filters.projectFilter !== 'all') {
      setActiveProjectId(filters.projectFilter);
    }
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
          <p className="text-sm text-muted-foreground">
            {activeProjectId ? `${statusCounts.all} tasks` : 'Select a project'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={activeProjectId || ''} onValueChange={setActiveProjectId}>
            <SelectTrigger className="w-[280px] bg-zinc-800 border-zinc-700">
              <SelectValue placeholder="Select project">
                {selectedProject ? `${selectedProject.project_number} - ${selectedProject.name}` : 'Select project'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-700 max-h-60">
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id} className="text-white">
                  {p.project_number} - {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <ExportButton
            data={viewMode === 'list' ? tasks : allScheduleTasks}
            entityType="tasks"
            filename="schedule"
            disabled={!activeProjectId}
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
            <ViewConfiguration 
              viewKey="schedule"
              currentFilters={{ projectFilter: activeProjectId || 'all', statusFilter, searchTerm }}
              onLoadView={loadView}
            />
          </div>
          {activeProjectId && <WeatherWidget projectId={activeProjectId} />}
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
      {!activeProjectId ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Calendar size={48} className="mx-auto mb-4 text-zinc-600" />
            <h3 className="text-xl font-semibold text-white mb-2">No Project Selected</h3>
            <p className="text-zinc-400">Select a project from the dropdown to view schedule.</p>
          </div>
        </div>
      ) : isLoading ? (
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
          <p className="text-white font-medium mb-2">No tasks found</p>
          <p className="text-zinc-400 text-sm">
            Tasks can only be created inside work packages. Create a work package first, then add tasks to it.
          </p>
        </div>
      ) : (
        <TaskListView
          tasks={allScheduleTasks}
          projects={projects}
          resources={resources}
          workPackages={workPackages}
          onTaskUpdate={(id, data) => updateMutation.mutate({ id, data })}
          onTaskClick={handleTaskClick}
          onTaskDelete={(taskId) => {
            deleteMutation.mutate(taskId);
          }}
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
        className="fixed right-4 bottom-20 lg:bottom-4 w-14 h-14 rounded-full shadow-lg bg-amber-500 hover:bg-amber-600 text-black z-40 disabled:opacity-50 disabled:cursor-not-allowed"
        onClick={handleCreateTask}
        disabled={!activeProjectId}
        title={!activeProjectId ? 'Select a project first' : 'Create new task'}
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
            {workPackages && (
              <TaskForm
                task={editingTask}
                projects={projects}
                tasks={allTasks}
                resources={resources}
                rfis={rfis}
                changeOrders={changeOrders}
                drawingSets={drawingSets}
                workPackages={workPackages}
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
                restrictPhase={selectedProject?.phase === 'detailing' ? 'detailing' : null}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>
    </ScreenContainer>
  );
}