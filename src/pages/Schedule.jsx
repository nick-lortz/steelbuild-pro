import React, { useState, useMemo, useCallback, useEffect } from 'react';
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
import BulkResourceAssign from '@/components/resources/BulkResourceAssign';
import ViewConfiguration from '@/components/shared/ViewConfiguration';
import { useKeyboardShortcuts } from '@/components/shared/hooks/useKeyboardShortcuts';
import { useActiveProject } from '@/components/shared/hooks/useActiveProject';
import { toast } from '@/components/ui/notifications';
import CalendarView from '@/components/schedule/CalendarView';
import GanttChart from '@/components/schedule/GanttChart';
import TaskListView from '@/components/schedule/TaskListView';
import PhaseGroupedView from '@/components/schedule/PhaseGroupedView';
import TimelineView from '@/components/schedule/TimelineView';
import ScheduleAIAssistant from '@/components/schedule/ScheduleAIAssistant';
import DependencyGraph from '@/components/schedule/DependencyGraph';
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
  const [viewMode, setViewMode] = useState('phase'); // 'phase', 'timeline', 'list', 'gantt', 'calendar', 'network'
  const [showAI, setShowAI] = useState(false);
  const [showBulkAssign, setShowBulkAssign] = useState(false);
  const PAGE_SIZE = 30;

  const queryClient = useQueryClient();

  // Fetch current user
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    staleTime: Infinity
  });

  // Fetch projects for filter
  const { data: allProjects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('name'),
    staleTime: 5 * 60 * 1000
  });

  // Filter projects by user access
  const projects = useMemo(() => {
    if (!currentUser) return [];
    const filtered = currentUser.role === 'admin' 
      ? allProjects 
      : allProjects.filter(p => 
          p.project_manager === currentUser.email || 
          p.superintendent === currentUser.email ||
          (p.assigned_users && p.assigned_users.includes(currentUser.email))
        );
    return [...filtered].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [currentUser, allProjects]);

  const selectedProject = useMemo(() => 
    activeProjectId ? projects.find(p => p.id === activeProjectId) : null,
    [projects, activeProjectId]
  );

  // Real-time subscriptions - Tasks
  useEffect(() => {
    if (!activeProjectId) return;

    const unsubscribe = base44.entities.Task.subscribe((event) => {
      if (event.data?.project_id === activeProjectId) {
        queryClient.invalidateQueries({ queryKey: ['schedule-tasks', activeProjectId] });
        queryClient.invalidateQueries({ queryKey: ['all-tasks'] });
        queryClient.invalidateQueries({ queryKey: ['schedule-activities', activeProjectId] });
      }
    });

    return unsubscribe;
  }, [activeProjectId, queryClient]);

  // Real-time subscriptions - Activities (for Look-Ahead updates)
  useEffect(() => {
    if (!activeProjectId) return;

    const unsubscribe = base44.entities.ScheduleActivity.subscribe((event) => {
      if (event.data?.project_id === activeProjectId) {
        queryClient.invalidateQueries({ queryKey: ['schedule-activities', activeProjectId] });
      }
    });

    return unsubscribe;
  }, [activeProjectId, queryClient]);

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

  // Fetch work packages
  const { data: workPackages = [] } = useQuery({
    queryKey: ['workPackages', activeProjectId],
    queryFn: () => {
      if (!activeProjectId) return [];
      return base44.entities.WorkPackage.filter({ project_id: activeProjectId });
    },
    enabled: !!activeProjectId,
    staleTime: 5 * 60 * 1000
  });

  // Always use actual tasks, don't convert work packages
  const workPackagesAsTasks = [];

  // Convert deliveries to task-like items for schedule display
  const deliveryTasks = useMemo(() => {
    return deliveries.map(d => ({
      id: `delivery-${d.id}`,
      source_entity: 'Delivery',
      source_id: d.id,
      project_id: d.project_id,
      name: `🚚 ${d.package_name}`,
      phase: 'delivery',
      start_date: d.scheduled_date || d.confirmed_date || d.requested_date,
      end_date: d.scheduled_date || d.confirmed_date || d.requested_date,
      status: d.delivery_status === 'received' || d.delivery_status === 'closed' ? 'completed' :
              d.delivery_status === 'in_transit' || d.delivery_status === 'arrived_on_site' ? 'in_progress' :
              d.delivery_status === 'exception' ? 'blocked' : 'not_started',
      progress_percent: d.delivery_status === 'received' ? 100 :
                        d.delivery_status === 'arrived_on_site' ? 75 :
                        d.delivery_status === 'in_transit' ? 50 : 0,
      is_critical: d.priority === 'high' || d.priority === 'critical',
      notes: `${d.vendor_supplier || ''} → ${d.ship_to_location || ''}\n${d.weight_tons?.toFixed(1)}T • ${d.piece_count || 0} pieces\n${d.notes || ''}`.trim(),
      _deliveryData: d,
      _isDelivery: true
    })).filter(d => d.start_date);
  }, [deliveries]);

  // Convert fabrication packages to task-like items for schedule display
  const fabricationTasks = useMemo(() => {
    return fabricationPackages.map(fp => ({
      id: `fabrication-${fp.id}`,
      source_entity: 'FabricationPackage',
      source_id: fp.id,
      project_id: fp.project_id,
      name: `🔧 ${fp.package_name}`,
      phase: 'fabrication',
      start_date: fp.release_date,
      end_date: fp.planned_ship_date,
      status: fp.status === 'shipped' || fp.status === 'complete' ? 'completed' :
              fp.status === 'in_progress' || fp.status === 'qc' ? 'in_progress' :
              fp.status === 'pending_prereqs' ? 'blocked' : 'not_started',
      progress_percent: fp.completion_percent || 0,
      is_critical: fp.priority === 'high' || fp.priority === 'critical',
      notes: `${fp.total_pieces || 0} pieces • ${(fp.total_weight_tons || 0).toFixed(1)}T\n${fp.scope_summary || ''}`.trim(),
      _fabricationData: fp,
      _isFabrication: true
    })).filter(fp => fp.start_date || fp.end_date);
  }, [fabricationPackages]);

  // Combine all schedule items
  const combinedScheduleItems = useMemo(() => {
    return [...allScheduleTasks, ...deliveryTasks, ...fabricationTasks];
  }, [allScheduleTasks, deliveryTasks, fabricationTasks]);

  // Filter and paginate tasks
  const { tasks, hasMore, totalCount } = useMemo(() => {
    let filtered = [...combinedScheduleItems];

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
    const startIdx = (page - 1) * PAGE_SIZE;
    const endIdx = page * PAGE_SIZE;
    const paginated = filtered.slice(startIdx, endIdx);
    
    return {
      tasks: paginated,
      hasMore: endIdx < filtered.length,
      totalCount: filtered.length
    };
  }, [allScheduleTasks, workPackagesAsTasks, statusFilter, searchTerm, page]);

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

  const { data: deliveries = [] } = useQuery({
    queryKey: ['deliveries', activeProjectId],
    queryFn: () => {
      if (!activeProjectId) return [];
      return base44.entities.Delivery.filter({ project_id: activeProjectId });
    },
    enabled: !!activeProjectId,
    staleTime: 2 * 60 * 1000
  });

  const { data: fabricationPackages = [] } = useQuery({
    queryKey: ['fabrication-packages', activeProjectId],
    queryFn: () => {
      if (!activeProjectId) return [];
      return base44.entities.FabricationPackage.filter({ project_id: activeProjectId });
    },
    enabled: !!activeProjectId,
    staleTime: 2 * 60 * 1000
  });

  const { data: allTasks = [] } = useQuery({
    queryKey: ['all-tasks'],
    queryFn: () => base44.entities.Task.list('start_date'),
    staleTime: 2 * 60 * 1000
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      if (data.work_package_id) {
        const response = await base44.functions.invoke('createTaskForWorkPackage', {
          work_package_id: data.work_package_id,
          task_data: data
        });
        return response.data;
      } else {
        return await base44.entities.Task.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['all-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['schedule-activities'] });
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
      queryClient.invalidateQueries({ queryKey: ['schedule-activities'] });
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
      queryClient.invalidateQueries({ queryKey: ['schedule-activities'] });
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
    // If it's a delivery or fabrication item, don't open task form
    if (task._isDelivery || task._isFabrication) {
      toast.error('Cannot edit schedule items from Delivery/Fabrication modules. Edit them directly in their respective pages.');
      return;
    }

    // If it's a work package display item, create a new task for it
    if (task.is_work_package) {
      setEditingTask({
        project_id: task.project_id,
        work_package_id: task.id,
        phase: task.phase,
        status: 'not_started',
        is_milestone: false
      });
      setShowTaskForm(true);
      return;
    }

    // If task has no work package, it's always editable
    if (!task.work_package_id) {
      setEditingTask({
        ...task,
        _isReadOnly: false
      });
      setShowTaskForm(true);
      return;
    }

    // Get work package to determine editability
    const workPackageData = await base44.entities.WorkPackage.filter({ id: task.work_package_id });
    const workPackage = workPackageData[0];

    if (!workPackage) {
      // Work package doesn't exist - allow editing as standalone
      setEditingTask({
        ...task,
        _isReadOnly: false
      });
      setShowTaskForm(true);
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

  const handleBulkResourceAssign = (resourceIds) => {
    selectedTasks.forEach(taskId => {
      const task = allScheduleTasks.find(t => t.id === taskId);
      if (task) {
        const currentResources = task.assigned_resources || [];
        const currentEquipment = task.assigned_equipment || [];
        const laborIds = resourceIds.filter(rid => {
          const r = resources.find(res => res.id === rid);
          return r && (r.type === 'labor' || r.type === 'subcontractor');
        });
        const equipIds = resourceIds.filter(rid => {
          const r = resources.find(res => res.id === rid);
          return r && r.type === 'equipment';
        });
        
        updateMutation.mutate({ 
          id: taskId, 
          data: { 
            assigned_resources: [...new Set([...currentResources, ...laborIds])],
            assigned_equipment: [...new Set([...currentEquipment, ...equipIds])]
          } 
        });
      }
    });
    toast.success(`Resources assigned to ${selectedTasks.length} tasks`);
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
    const today = new Date().toISOString().split('T')[0];
    const counts = {
      all: totalCount,
      not_started: 0,
      in_progress: 0,
      completed: 0,
      overdue: 0
    };
    
    combinedScheduleItems.forEach(t => {
      if (t.status === 'not_started') counts.not_started++;
      else if (t.status === 'in_progress') counts.in_progress++;
      else if (t.status === 'completed') counts.completed++;
      
      if (t.status !== 'completed' && t.end_date && t.end_date < today) {
        counts.overdue++;
      }
    });
    
    return counts;
  }, [combinedScheduleItems, totalCount]);

  return (
    <div className="min-h-screen bg-black">
      {/* Header Bar */}
      <div className="border-b border-zinc-800 bg-black">
        <div className="max-w-[1600px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-white uppercase tracking-wide">Schedule Management</h1>
              <p className="text-xs text-zinc-600 font-mono mt-1">
                {activeProjectId ? `${statusCounts.all} TASKS` : 'SELECT PROJECT'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Select value={activeProjectId || ''} onValueChange={setActiveProjectId}>
                <SelectTrigger className="w-[280px] bg-zinc-900 border-zinc-800 text-white">
                  <SelectValue placeholder="SELECT PROJECT">
                    {selectedProject ? `${selectedProject.project_number} - ${selectedProject.name}` : 'SELECT PROJECT'}
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
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAI(!showAI)}
                disabled={!activeProjectId}
                className="gap-2"
              >
                <span className="text-amber-500">✨</span>
                AI Assistant
              </Button>
              <ExportButton
                data={viewMode === 'list' ? tasks : combinedScheduleItems}
                entityType="tasks"
                filename="schedule"
                disabled={!activeProjectId}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="border-b border-zinc-800 bg-black">
        <div className="max-w-[1600px] mx-auto px-6 py-3">
          <div className="flex items-center justify-between gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
              <Input
                placeholder="SEARCH TASKS..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                className="pl-9 bg-zinc-950 border-zinc-800 text-white placeholder:text-zinc-600 placeholder:uppercase placeholder:text-xs h-9"
              />
            </div>

            {/* View Mode */}
            <div className="flex gap-1 border border-zinc-800 p-1">
              {[
                { value: 'phase', label: 'PHASE' },
                { value: 'timeline', label: 'TIMELINE' },
                { value: 'list', label: 'LIST' },
                { value: 'gantt', label: 'GANTT' },
                { value: 'calendar', label: 'CAL' },
                { value: 'network', label: 'NETWORK' }
              ].map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setViewMode(value)}
                  className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest transition-colors ${
                    viewMode === value ? 'bg-amber-500 text-black' : 'text-zinc-500 hover:text-white'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Status Filter (hide for network view) */}
            {viewMode !== 'network' && viewMode !== 'gantt' && viewMode !== 'calendar' && (
              <div className="flex gap-1 border border-zinc-800 p-1">
                {[
                  { value: 'all', label: 'ALL' },
                  { value: 'not_started', label: 'TODO' },
                  { value: 'in_progress', label: 'ACTIVE' },
                  { value: 'completed', label: 'DONE' },
                  { value: 'overdue', label: 'LATE' }
                ].map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => { setStatusFilter(value); setPage(1); }}
                    className={`px-2 py-1.5 text-[10px] font-bold uppercase tracking-widest transition-colors ${
                      statusFilter === value ? 'bg-amber-500 text-black' : 'text-zinc-500 hover:text-white'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && activeProjectId && (
        <div className="border-b border-zinc-800 bg-zinc-950">
          <div className="max-w-[1600px] mx-auto px-6 py-4 space-y-4">
            <ViewConfiguration 
              viewKey="schedule"
              currentFilters={{ projectFilter: activeProjectId || 'all', statusFilter, searchTerm }}
              onLoadView={loadView}
            />
            <WeatherWidget projectId={activeProjectId} />
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-[1600px] mx-auto px-6 py-6">
        {/* AI Assistant Panel */}
        {showAI && activeProjectId && (
          <div className="mb-6">
            <ScheduleAIAssistant
              tasks={combinedScheduleItems}
              workPackages={workPackages}
              project={selectedProject}
              resources={resources}
            />
          </div>
        )}

        {!activeProjectId ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <Calendar size={40} className="mx-auto mb-3 text-zinc-700" />
              <p className="text-xs text-zinc-600 uppercase tracking-widest">NO PROJECT SELECTED</p>
            </div>
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="w-10 h-10 border-2 border-amber-500 border-t-transparent animate-spin mx-auto mb-3" />
              <p className="text-xs text-zinc-600 uppercase tracking-widest">LOADING...</p>
            </div>
          </div>
        ) : allScheduleTasks.length === 0 ? (
          <div className="text-center py-20">
            <Calendar size={48} className="mx-auto mb-4 text-zinc-700" />
            <p className="text-sm text-zinc-400 uppercase tracking-widest mb-6">NO TASKS CREATED YET</p>
            <p className="text-xs text-zinc-600 mb-6 max-w-md mx-auto">
              Create tasks to begin scheduling. Tasks drive the project timeline, resource allocation, and RFI/CO tracking.
            </p>
            <Button
              onClick={handleCreateTask}
              className="bg-amber-500 hover:bg-amber-600 text-black"
            >
              <Plus size={18} className="mr-2" />
              Create First Task
            </Button>
          </div>
        ) : viewMode === 'phase' ? (
          <PhaseGroupedView
            tasks={combinedScheduleItems}
            workPackages={workPackages}
            onTaskClick={handleTaskClick}
          />
        ) : viewMode === 'timeline' ? (
          <TimelineView
            tasks={combinedScheduleItems}
            onTaskClick={handleTaskClick}
          />
        ) : viewMode === 'calendar' ? (
          <CalendarView
            tasks={combinedScheduleItems}
            projects={projects}
            onTaskClick={handleTaskClick}
            onTaskUpdate={(id, data) => {
              // Only update actual tasks, not delivery/fab items
              if (!id.toString().startsWith('delivery-') && !id.toString().startsWith('fabrication-')) {
                updateMutation.mutate({ id, data });
              }
            }}
          />
        ) : viewMode === 'gantt' ? (
          <GanttChart
            tasks={combinedScheduleItems}
            projects={projects}
            viewMode="week"
            onTaskUpdate={(id, data) => {
              // Only update actual tasks, not delivery/fab items
              if (!id.toString().startsWith('delivery-') && !id.toString().startsWith('fabrication-')) {
                updateMutation.mutate({ id, data });
              }
            }}
            onTaskEdit={handleTaskClick}
            resources={resources}
            rfis={rfis}
            changeOrders={changeOrders}
          />
        ) : viewMode === 'network' ? (
          <DependencyGraph
            tasks={combinedScheduleItems}
            onTaskClick={handleTaskClick}
          />
        ) : (
          <TaskListView
            tasks={combinedScheduleItems}
            projects={projects}
            resources={resources}
            workPackages={workPackages}
            onTaskUpdate={(id, data) => {
              // Only update actual tasks, not delivery/fab items
              if (!id.toString().startsWith('delivery-') && !id.toString().startsWith('fabrication-')) {
                updateMutation.mutate({ id, data });
              }
            }}
            onTaskClick={handleTaskClick}
            onTaskDelete={(taskId) => {
              // Only delete actual tasks
              if (!taskId.toString().startsWith('delivery-') && !taskId.toString().startsWith('fabrication-')) {
                deleteMutation.mutate(taskId);
              }
            }}
          />
        )}
      </div>

      {/* Bulk Actions */}
      <BulkActions
        selectedCount={selectedTasks.length}
        onClear={() => setSelectedTasks([])}
        actions={[
          { label: 'Assign Resources', onClick: () => setShowBulkAssign(true) },
          { label: 'Complete', onClick: () => bulkUpdateStatus('completed') },
          { label: 'In Progress', onClick: () => bulkUpdateStatus('in_progress') },
          { label: 'Cancel', variant: 'ghost', onClick: () => setSelectedTasks([]) }
        ]}
      />

      {/* Bulk Resource Assignment */}
      <BulkResourceAssign
        open={showBulkAssign}
        onOpenChange={setShowBulkAssign}
        selectedItems={combinedScheduleItems.filter(t => selectedTasks.includes(t.id) && !t._isDelivery && !t._isFabrication)}
        resources={resources}
        onAssign={handleBulkResourceAssign}
        itemType="tasks"
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
    </div>
  );
}