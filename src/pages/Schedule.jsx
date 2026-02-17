import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Calendar, Download, Sliders, Sparkles } from 'lucide-react';
import TaskForm from '@/components/schedule/TaskForm';
import GanttChart from '@/components/schedule/GanttChart';
import TaskListView from '@/components/schedule/TaskListView';
import CalendarView from '@/components/schedule/CalendarView';
import { useActiveProject } from '@/components/shared/hooks/useActiveProject';
import { toast } from '@/components/ui/notifications';
import { useEntitySubscription } from '@/components/shared/hooks/useSubscription';
import AIWBSGenerator from '@/components/schedule/AIWBSGenerator';
import AITaskPrioritizer from '@/components/schedule/AITaskPrioritizer';
import DependencyVisualizer from '@/components/schedule/DependencyVisualizer';
import QuickStatusUpdate from '@/components/schedule/QuickStatusUpdate';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

export default function Schedule() {
  const { activeProjectId, setActiveProjectId } = useActiveProject();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [phaseFilter, setPhaseFilter] = useState('all');
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [viewMode, setViewMode] = useState('gantt');
  const [zoomLevel, setZoomLevel] = useState('week');
  const [selectedProjects, setSelectedProjects] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [pmFilter, setPmFilter] = useState('all');
  const [wbsGeneratorOpen, setWbsGeneratorOpen] = useState(false);
  const [taskPrioritizerOpen, setTaskPrioritizerOpen] = useState(false);
  const [quickStatusOpen, setQuickStatusOpen] = useState(false);

  const queryClient = useQueryClient();

  // Fetch current user
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnMount: false
  });

  // Fetch projects for multi-project scheduling
  const { data: allProjects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('name'),
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000
  });

  // Filter projects by user access
  const projects = useMemo(() => {
    if (!currentUser) return [];
    let filtered = currentUser.role === 'admin' 
      ? allProjects 
      : allProjects.filter(p => 
          p.project_manager === currentUser.email || 
          p.superintendent === currentUser.email ||
          (p.assigned_users && p.assigned_users.includes(currentUser.email))
        );
    
    // Apply PM filter
    if (pmFilter !== 'all') {
      filtered = filtered.filter(p => p.project_manager === pmFilter);
    }
    
    return [...filtered].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [currentUser, allProjects, pmFilter]);

  // Get unique PMs
  const projectManagers = useMemo(() => {
    const pms = new Set();
    allProjects.forEach(p => {
      if (p.project_manager) pms.add(p.project_manager);
    });
    return Array.from(pms).sort();
  }, [allProjects]);

  // Determine which projects to show
  const activeProjects = useMemo(() => {
    if (selectedProjects.length > 0) {
      return projects.filter(p => selectedProjects.includes(p.id));
    }
    if (activeProjectId) {
      return projects.filter(p => p.id === activeProjectId);
    }
    return projects;
  }, [projects, activeProjectId, selectedProjects]);

  const activeProjectIds = useMemo(() => 
    activeProjects.map(p => p.id), 
    [activeProjects]
  );

  // Fetch tasks for selected projects
  const { data: allScheduleTasks = [], isLoading, refetch } = useQuery({
    queryKey: ['schedule-tasks', activeProjectIds],
    queryFn: async () => {
      if (activeProjectIds.length === 0) return [];
      const results = await Promise.all(
        activeProjectIds.map(projectId => 
          base44.entities.Task.filter({ project_id: projectId }, 'end_date')
        )
      );
      return results.flat();
    },
    enabled: activeProjectIds.length > 0,
    staleTime: 2 * 60 * 1000
  });

  // Real-time subscription with delta updates
  useEntitySubscription('Task', ['schedule-tasks', activeProjectIds], {
    onEvent: (event) => {
      // Only process if task belongs to active projects
      if (!event.data?.project_id || !activeProjectIds.includes(event.data.project_id)) {
        return;
      }
      toast.info(`Task ${event.type}d: ${event.data.name || 'Unknown'}`);
    }
  });

  // Fetch resources
  const { data: resources = [] } = useQuery({
    queryKey: ['resources'],
    queryFn: () => base44.entities.Resource.list(),
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000
  });

  const { data: rfis = [] } = useQuery({
    queryKey: ['rfis', activeProjectIds],
    queryFn: async () => {
      if (activeProjectIds.length === 0) return [];
      const results = await Promise.all(
        activeProjectIds.map(projectId => 
          base44.entities.RFI.filter({ project_id: projectId })
        )
      );
      return results.flat();
    },
    enabled: activeProjectIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  const { data: changeOrders = [] } = useQuery({
    queryKey: ['changeOrders', activeProjectIds],
    queryFn: async () => {
      if (activeProjectIds.length === 0) return [];
      const results = await Promise.all(
        activeProjectIds.map(projectId => 
          base44.entities.ChangeOrder.filter({ project_id: projectId })
        )
      );
      return results.flat();
    },
    enabled: activeProjectIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  const { data: drawingSets = [] } = useQuery({
    queryKey: ['drawings', activeProjectIds],
    queryFn: async () => {
      if (activeProjectIds.length === 0) return [];
      const results = await Promise.all(
        activeProjectIds.map(projectId => 
          base44.entities.DrawingSet.filter({ project_id: projectId })
        )
      );
      return results.flat();
    },
    enabled: activeProjectIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  // Filter tasks
  const filteredTasks = useMemo(() => {
    let filtered = [...allScheduleTasks];

    // Search
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(t => 
        t.name?.toLowerCase().includes(search) ||
        t.wbs_code?.toLowerCase().includes(search)
      );
    }

    // Status filter
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

    // Priority filter
    if (priorityFilter !== 'all') {
      filtered = filtered.filter(t => t.is_critical === (priorityFilter === 'critical'));
    }

    // Phase filter
    if (phaseFilter !== 'all') {
      filtered = filtered.filter(t => t.phase === phaseFilter);
    }

    return filtered;
  }, [allScheduleTasks, searchTerm, statusFilter, priorityFilter, phaseFilter]);

  const createMutation = useMutation({
    mutationFn: async (data) => {
      return await base44.entities.Task.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule-tasks'] });
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
      return await base44.entities.Task.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule-tasks'] });
      setShowTaskForm(false);
      setEditingTask(null);
      toast.success('Task updated');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to update task');
    }
  });

  const bulkUpdateMutation = useMutation({
    mutationFn: async (updates) => {
      await Promise.all(
        updates.map(({ id, status }) => 
          base44.entities.Task.update(id, { status })
        )
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule-tasks'] });
      toast.success('Tasks updated');
    },
    onError: (error) => {
      toast.error('Failed to update tasks');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      return await base44.entities.Task.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule-tasks'] });
      toast.success('Task deleted');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to delete task');
    }
  });

  const handleCreateTask = () => {
    if (activeProjectIds.length === 0) {
      toast.error('Please select at least one project');
      return;
    }
    setEditingTask({
      project_id: activeProjectIds[0],
      phase: 'fabrication',
      status: 'not_started',
      is_milestone: false
    });
    setShowTaskForm(true);
  };

  const handleTaskClick = (task) => {
    setEditingTask(task);
    setShowTaskForm(true);
  };

  const handleExportICS = () => {
    // Generate ICS file for calendar export
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Schedule Management//EN',
      ...filteredTasks.map(task => {
        return [
          'BEGIN:VEVENT',
          `UID:${task.id}@scheduleapp`,
          `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
          `DTSTART:${task.start_date?.replace(/[-]/g, '')}`,
          `DTEND:${task.end_date?.replace(/[-]/g, '')}`,
          `SUMMARY:${task.name}`,
          `DESCRIPTION:${task.notes || ''}`,
          'END:VEVENT'
        ].join('\n');
      }),
      'END:VCALENDAR'
    ].join('\n');

    const blob = new Blob([icsContent], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'schedule.ics';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Calendar exported');
  };

  const statusCounts = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const counts = {
      all: filteredTasks.length,
      not_started: 0,
      in_progress: 0,
      completed: 0,
      overdue: 0
    };
    
    filteredTasks.forEach(t => {
      if (t.status === 'not_started') counts.not_started++;
      else if (t.status === 'in_progress') counts.in_progress++;
      else if (t.status === 'completed') counts.completed++;
      
      if (t.status !== 'completed' && t.end_date && t.end_date < today) {
        counts.overdue++;
      }
    });
    
    return counts;
  }, [filteredTasks]);

  return (
    <ErrorBoundary>
    <div className="min-h-screen bg-[#0A0E13]">
      {/* Header */}
      <div className="border-b border-[rgba(255,255,255,0.05)] bg-[#0F1419]/80 backdrop-blur-md">
        <div className="max-w-[1800px] mx-auto px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-[#E5E7EB] tracking-tight">Schedule</h1>
              <p className="text-sm text-[#6B7280] font-mono mt-1">
                multi-project scheduling with dependencies
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => setWbsGeneratorOpen(true)}
                disabled={!activeProjectId}
                variant="outline"
              >
                <Sparkles size={18} className="mr-2" />
                Generate WBS
              </Button>
              <Button
                onClick={() => setTaskPrioritizerOpen(true)}
                disabled={filteredTasks.length === 0}
                variant="outline"
              >
                <Sparkles size={18} className="mr-2" />
                Prioritize Tasks
              </Button>
              <Button
                onClick={() => setQuickStatusOpen(true)}
                disabled={filteredTasks.length === 0}
                variant="outline"
              >
                Bulk Status Update
              </Button>
              <Button
                onClick={handleCreateTask}
                disabled={activeProjectIds.length === 0}
              >
                <Plus size={18} className="mr-2" />
                Add Task
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div className="border-b border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.02)]">
        <div className="max-w-[1800px] mx-auto px-8 py-4">
          <div className="grid grid-cols-5 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-[10px] text-[#6B7280] uppercase tracking-wider font-semibold mb-1">Total Tasks</div>
                <div className="text-3xl font-bold text-[#E5E7EB]">{statusCounts.all}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-[10px] text-[#6B7280] uppercase tracking-wider font-semibold mb-1">Not Started</div>
                <div className="text-3xl font-bold text-[#9CA3AF]">{statusCounts.not_started}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-[10px] text-[#3B82F6] uppercase tracking-wider font-semibold mb-1">In Progress</div>
                <div className="text-3xl font-bold text-[#3B82F6]">{statusCounts.in_progress}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-[10px] text-[#10B981] uppercase tracking-wider font-semibold mb-1">Completed</div>
                <div className="text-3xl font-bold text-[#10B981]">{statusCounts.completed}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-[10px] text-[#EF4444] uppercase tracking-wider font-semibold mb-1">Overdue</div>
                <div className="text-3xl font-bold text-[#EF4444]">{statusCounts.overdue}</div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="border-b border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.01)]">
        <div className="max-w-[1800px] mx-auto px-8 py-3">
          <div className="flex items-center gap-4">
            {/* Project Selector */}
            <div className="w-64">
              <Select 
                value={selectedProjects.length > 0 ? 'multi' : (activeProjectId || '')} 
                onValueChange={(value) => {
                  if (value === 'all') {
                    setSelectedProjects(projects.map(p => p.id));
                    setActiveProjectId(null);
                  } else if (value === 'multi') {
                    // Keep multi-select active
                  } else {
                    setSelectedProjects([]);
                    setActiveProjectId(value);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Project(s)">
                    {selectedProjects.length > 1 
                      ? `${selectedProjects.length} Projects` 
                      : selectedProjects.length === 1
                        ? projects.find(p => p.id === selectedProjects[0])?.name
                        : activeProjectId
                          ? projects.find(p => p.id === activeProjectId)?.name
                          : 'Select Project(s)'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="max-h-96">
                  <SelectItem value="all">
                    All Projects ({projects.length})
                  </SelectItem>
                  <div className="border-t border-[rgba(255,255,255,0.05)] my-1" />
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.project_number} - {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* PM Filter */}
            <div className="w-56">
              <Select value={pmFilter} onValueChange={setPmFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-96">
                  <SelectItem value="all">
                    All PMs
                  </SelectItem>
                  {projectManagers.map((pm) => (
                    <SelectItem key={pm} value={pm}>
                      {pm}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Search */}
            <div className="flex-1 relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280]" />
              <Input
                placeholder="Search tasks by name or WBS..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filters Toggle */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className={showFilters ? 'bg-[rgba(255,157,66,0.08)] text-[#FF9D42]' : ''}
            >
              <Sliders size={16} className="mr-2" />
              Filters
            </Button>

            {/* View Mode */}
            <div className="flex gap-1 border border-[rgba(255,255,255,0.1)] bg-[#0F1419] rounded-lg overflow-hidden p-1">
              {[
                { value: 'gantt', label: 'Gantt' },
                { value: 'list', label: 'List' },
                { value: 'calendar', label: 'Calendar' }
              ].map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setViewMode(value)}
                  className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                    viewMode === value 
                      ? 'bg-gradient-to-r from-[#FF6B2C] to-[#FF9D42] text-[#0A0E13] shadow-md' 
                      : 'text-[#9CA3AF] hover:text-[#E5E7EB] hover:bg-[rgba(255,157,66,0.05)]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Zoom Level (for Gantt) */}
            {viewMode === 'gantt' && (
              <div className="flex gap-1 border border-[rgba(255,255,255,0.1)] bg-[#0F1419] rounded-lg overflow-hidden p-1">
                {[
                  { value: 'day', label: 'Day' },
                  { value: 'week', label: 'Week' },
                  { value: 'month', label: 'Month' }
                ].map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => setZoomLevel(value)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                      zoomLevel === value 
                        ? 'bg-[#151B24] text-[#FF9D42]' 
                        : 'text-[#6B7280] hover:text-[#E5E7EB]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}

            {/* Export Calendar */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportICS}
              disabled={filteredTasks.length === 0}
            >
              <Download size={16} className="mr-2" />
              Export .ics
            </Button>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <div className="grid grid-cols-4 gap-4 mt-4 pt-4 border-t border-[rgba(255,255,255,0.05)]">
              <div>
                <label className="text-xs text-[#6B7280] uppercase mb-2 block">Status</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="not_started">Not Started</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                    <SelectItem value="on_hold">On Hold</SelectItem>
                    <SelectItem value="blocked">Blocked</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs text-[#6B7280] uppercase mb-2 block">Priority</label>
                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priorities</SelectItem>
                    <SelectItem value="critical">Critical Path Only</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs text-[#6B7280] uppercase mb-2 block">Phase</label>
                <Select value={phaseFilter} onValueChange={setPhaseFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Phases</SelectItem>
                    <SelectItem value="detailing">Detailing</SelectItem>
                    <SelectItem value="fabrication">Fabrication</SelectItem>
                    <SelectItem value="delivery">Delivery</SelectItem>
                    <SelectItem value="erection">Erection</SelectItem>
                    <SelectItem value="closeout">Closeout</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setStatusFilter('all');
                    setPriorityFilter('all');
                    setPhaseFilter('all');
                    setSearchTerm('');
                  }}
                  className="w-full"
                >
                  Clear All Filters
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[1800px] mx-auto px-8 py-6">
        {/* Dependency Visualizer */}
        {filteredTasks.length > 0 && (
          <div className="mb-6">
            <DependencyVisualizer tasks={filteredTasks} />
          </div>
        )}

        {activeProjectIds.length === 0 ? (
          <div className="flex items-center justify-center py-32">
            <div className="text-center">
              <Calendar size={64} className="mx-auto mb-4 text-[#4B5563]" />
              <h3 className="text-xl font-semibold text-[#E5E7EB] mb-2">No Project Selected</h3>
              <p className="text-sm text-[#9CA3AF] max-w-md">
                Select one or more projects to view and manage their schedules
              </p>
            </div>
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center py-32">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-[#FF9D42] border-t-transparent animate-spin mx-auto mb-4 rounded-full" />
              <p className="text-sm text-[#9CA3AF]">Loading schedule...</p>
            </div>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="text-center py-32">
            <Calendar size={64} className="mx-auto mb-4 text-[#4B5563]" />
            <h3 className="text-xl font-semibold text-[#E5E7EB] mb-2">No Tasks Found</h3>
            <p className="text-sm text-[#9CA3AF] mb-6 max-w-md mx-auto">
              {allScheduleTasks.length === 0 
                ? 'Create your first task to begin scheduling'
                : 'No tasks match your current filters'}
            </p>
            {allScheduleTasks.length === 0 && (
              <Button
                onClick={handleCreateTask}
              >
                <Plus size={18} className="mr-2" />
                Create First Task
              </Button>
            )}
          </div>
        ) : viewMode === 'gantt' ? (
          <GanttChart
            tasks={filteredTasks}
            projects={activeProjects}
            viewMode={zoomLevel}
            onTaskUpdate={(id, data) => updateMutation.mutate({ id, data })}
            onTaskEdit={handleTaskClick}
            onTaskDelete={(id) => deleteMutation.mutate(id)}
            resources={resources}
            rfis={rfis}
            changeOrders={changeOrders}
          />
        ) : viewMode === 'calendar' ? (
          <CalendarView
            tasks={filteredTasks}
            projects={activeProjects}
            onTaskClick={handleTaskClick}
            onTaskUpdate={(id, data) => updateMutation.mutate({ id, data })}
          />
        ) : (
          <TaskListView
            tasks={filteredTasks}
            projects={activeProjects}
            resources={resources}
            onTaskUpdate={(id, data) => updateMutation.mutate({ id, data })}
            onTaskClick={handleTaskClick}
            onTaskDelete={(id) => deleteMutation.mutate(id)}
          />
        )}
      </div>

      {/* Task Form Sheet */}
      <Sheet open={showTaskForm} onOpenChange={(open) => {
        setShowTaskForm(open);
        if (!open) setEditingTask(null);
      }}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {editingTask?.id ? 'Edit Task' : 'New Task'}
            </SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            <TaskForm
              task={editingTask}
              projects={projects}
              tasks={allScheduleTasks}
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

      <AIWBSGenerator
        project={projects.find(p => p.id === activeProjectId)}
        open={wbsGeneratorOpen}
        onClose={() => setWbsGeneratorOpen(false)}
      />

      <AITaskPrioritizer
        projectId={activeProjectId}
        tasks={filteredTasks}
        open={taskPrioritizerOpen}
        onClose={() => setTaskPrioritizerOpen(false)}
      />

      <Sheet open={quickStatusOpen} onOpenChange={setQuickStatusOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Quick Status Update</SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            <QuickStatusUpdate
              tasks={filteredTasks}
              onBulkUpdate={(updates) => bulkUpdateMutation.mutate(updates)}
              onClose={() => setQuickStatusOpen(false)}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
    </ErrorBoundary>
  );
}