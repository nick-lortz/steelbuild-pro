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
import { toast } from '@/components/ui/notifications';

export default function Schedule() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const PAGE_SIZE = 30;

  const queryClient = useQueryClient();

  // Fetch projects for filter
  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('name'),
    staleTime: 5 * 60 * 1000
  });

  // Fetch tasks via getFilteredTasks endpoint
  const { data: taskData, isLoading, refetch } = useQuery({
    queryKey: ['filtered-tasks', projectFilter, statusFilter, searchTerm, page],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: PAGE_SIZE.toString(),
        sort_by: 'end_date',
        sort_order: 'asc'
      });

      if (projectFilter !== 'all') params.append('project_id', projectFilter);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (searchTerm) params.append('search_term', searchTerm);

      const response = await base44.functions.invoke('getFilteredTasks', {}, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      // Parse query params for the backend function
      const url = new URL(response.config?.url || 'http://localhost');
      params.forEach((value, key) => url.searchParams.set(key, value));
      
      const finalResponse = await fetch(url.toString(), {
        headers: response.config?.headers || {}
      });

      return finalResponse.json();
    },
    staleTime: 2 * 60 * 1000
  });

  const tasks = taskData?.tasks || [];
  const hasMore = taskData?.hasMore || false;

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
      queryClient.invalidateQueries({ queryKey: ['filtered-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['all-tasks'] });
      setShowTaskForm(false);
      setEditingTask(null);
      toast.success('Task created');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Task.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['filtered-tasks'] });
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

  const statusCounts = useMemo(() => {
    return {
      all: taskData?.total || 0,
      not_started: 0,
      in_progress: 0,
      completed: 0,
      overdue: 0
    };
  }, [taskData]);

  return (
    <ScreenContainer>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">Schedule</h1>
          <p className="text-sm text-muted-foreground">{statusCounts.all} tasks</p>
        </div>
        <div className="flex items-center gap-2">
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
        <div className="grid grid-cols-2 gap-2 mb-4">
          <Select value={projectFilter} onValueChange={(v) => { setProjectFilter(v); setPage(1); }}>
            <SelectTrigger>
              <SelectValue placeholder="Project" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.project_number}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Status Filter Tabs */}
      <Tabs value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }} className="mb-4">
        <TabsList className="grid w-full grid-cols-5 h-auto">
          <TabsTrigger value="all" className="text-xs py-2">All</TabsTrigger>
          <TabsTrigger value="not_started" className="text-xs py-2">To Do</TabsTrigger>
          <TabsTrigger value="in_progress" className="text-xs py-2">Active</TabsTrigger>
          <TabsTrigger value="completed" className="text-xs py-2">Done</TabsTrigger>
          <TabsTrigger value="overdue" className="text-xs py-2">Late</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Task Cards */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading tasks...</p>
          </div>
        </div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No tasks found</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 mb-4">
            {tasks.map((task) => {
              const project = projects.find(p => p.id === task.project_id);
              return (
                <TaskCard
                  key={task.id}
                  task={task}
                  project={project}
                  onClick={() => handleTaskClick(task)}
                />
              );
            })}
          </div>

          {/* Load More */}
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