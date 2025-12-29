import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Calendar, Download, BarChart3, AlertTriangle, FileSpreadsheet, TrendingUp } from 'lucide-react';
import CSVUpload from '@/components/shared/CSVUpload';
import LookAheadSchedule from '@/components/schedule/LookAheadSchedule';
import KanbanView from '@/components/schedule/KanbanView';
import TaskFinancialImpact from '@/components/schedule/TaskFinancialImpact';
import { getDrawingRisks } from '@/components/shared/drawingScheduleUtils';
import PageHeader from '@/components/ui/PageHeader';
import GanttChart from '@/components/schedule/GanttChart';
import TaskList from '@/components/schedule/TaskList';
import TaskForm from '@/components/schedule/TaskForm';
import ResourceConflicts from '@/components/schedule/ResourceConflicts';
import CriticalPathAnalysis from '@/components/schedule/CriticalPathAnalysis';
import BulkEditForm from '@/components/schedule/BulkEditForm';
import BulkAddForm from '@/components/schedule/BulkAddForm';
import WeatherWidget from '@/components/weather/WeatherWidget';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { calculateCriticalPath, detectResourceConflicts } from '@/components/shared/scheduleUtils';

export default function Schedule() {
  const [selectedProject, setSelectedProject] = useState('all');
  const [viewMode, setViewMode] = useState('week'); // day, week, month
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [selectedPhase, setSelectedPhase] = useState('all');
  const [showCSVImport, setShowCSVImport] = useState(false);
  const [showBulkEdit, setShowBulkEdit] = useState(false);
  const [bulkEditTasks, setBulkEditTasks] = useState([]);
  const [showBulkAdd, setShowBulkAdd] = useState(false);

  const queryClient = useQueryClient();

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('name'),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list('start_date'),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  const { data: resources = [] } = useQuery({
    queryKey: ['resources'],
    queryFn: () => base44.entities.Resource.list(),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  const { data: rfis = [] } = useQuery({
    queryKey: ['rfis'],
    queryFn: () => base44.entities.RFI.list(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const { data: changeOrders = [] } = useQuery({
    queryKey: ['changeOrders'],
    queryFn: () => base44.entities.ChangeOrder.list(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const { data: drawingSets = [] } = useQuery({
    queryKey: ['drawings'],
    queryFn: () => base44.entities.DrawingSet.list(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Task.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setShowTaskForm(false);
      setEditingTask(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Task.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setShowTaskForm(false);
      setEditingTask(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Task.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  const bulkCreateMutation = useMutation({
    mutationFn: (tasksData) => base44.entities.Task.bulkCreate(tasksData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setShowBulkAdd(false);
    },
  });

  // Clean up invalid task references - optimized with debounce
  React.useEffect(() => {
    if (tasks.length === 0) return;
    
    const validTaskIds = new Set(tasks.map(t => t.id));
    const invalidTasks = [];
    
    // Collect all invalid tasks
    tasks.forEach(task => {
      if (task.predecessor_ids && task.predecessor_ids.length > 0) {
        const validPredecessors = task.predecessor_ids.filter(id => validTaskIds.has(id));
        if (validPredecessors.length !== task.predecessor_ids.length) {
          invalidTasks.push({ id: task.id, data: { predecessor_ids: validPredecessors } });
        }
      }
    });
    
    // Only update if there are invalid tasks (prevents infinite loops)
    if (invalidTasks.length > 0 && invalidTasks.length < 5) {
      invalidTasks.forEach(update => updateMutation.mutate(update));
    }
  }, [tasks.length]); // Only run when task count changes

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      const matchesProject = selectedProject === 'all' || t.project_id === selectedProject;
      const matchesPhase = selectedPhase === 'all' || t.phase === selectedPhase;
      return matchesProject && matchesPhase;
    });
  }, [tasks, selectedProject, selectedPhase]);

  // Calculate critical path
  const criticalPathData = useMemo(() => {
    return calculateCriticalPath(filteredTasks);
  }, [filteredTasks]);

  // Detect resource conflicts
  const resourceConflicts = useMemo(() => {
    return detectResourceConflicts(filteredTasks, resources);
  }, [filteredTasks, resources]);

  // Drawing risks
  const drawingRisks = useMemo(() => {
    return getDrawingRisks(filteredTasks, drawingSets);
  }, [filteredTasks, drawingSets]);

  const handleTaskUpdate = (taskId, updates) => {
    updateMutation.mutate({ id: taskId, data: updates });
  };

  const handleEditTask = (task) => {
    setEditingTask(task);
    setShowTaskForm(true);
  };

  const handleBulkDelete = async (taskIds) => {
    for (const id of taskIds) {
      await deleteMutation.mutateAsync(id);
    }
  };

  const handleBulkEdit = (taskIds) => {
    setBulkEditTasks(taskIds);
    setShowBulkEdit(true);
  };

  const handleExportPDF = () => {
    // PDF export logic would go here
    alert('PDF export feature - integrate with jspdf library');
  };

  const selectedProjectData = projects.find(p => p.id === selectedProject);

  return (
    <div>
      <PageHeader
        title="Project Schedule"
        subtitle="Gantt chart with dependencies and critical path"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setEditingTask(null);
                setShowTaskForm(true);
              }}
              className="border-amber-700 text-amber-400 hover:bg-amber-500/10"
            >
              <Plus size={16} className="mr-2" />
              Add Task
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowBulkAdd(true)}
              className="border-zinc-700 text-white hover:bg-zinc-800"
            >
              <Plus size={16} className="mr-2" />
              Bulk Add
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowCSVImport(true)}
              className="border-zinc-700 text-white hover:bg-zinc-800"
            >
              <FileSpreadsheet size={16} className="mr-2" />
              Import CSV
            </Button>
            <Button
              variant="outline"
              onClick={handleExportPDF}
              className="border-zinc-700 text-white hover:bg-zinc-800"
            >
              <Download size={16} className="mr-2" />
              Export
            </Button>
            <Button 
              onClick={() => {
                setEditingTask(null);
                setShowTaskForm(true);
              }}
              className="bg-amber-500 hover:bg-amber-600 text-black"
            >
              <Plus size={18} className="mr-2" />
              Quick Add
            </Button>
          </div>
        }
      />

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-4">
        <Select value={selectedProject} onValueChange={setSelectedProject}>
          <SelectTrigger className="w-64 bg-zinc-900 border-zinc-800">
            <SelectValue placeholder="Select project" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Projects</SelectItem>
            {projects.map(p => (
              <SelectItem key={p.id} value={p.id}>
                {p.project_number} - {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedPhase} onValueChange={setSelectedPhase}>
          <SelectTrigger className="w-48 bg-zinc-900 border-zinc-800">
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

        <Select value={viewMode} onValueChange={setViewMode}>
          <SelectTrigger className="w-40 bg-zinc-900 border-zinc-800">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="day">Day View</SelectItem>
            <SelectItem value="week">Week View</SelectItem>
            <SelectItem value="month">Month View</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Financial Impact */}
      <div className="mb-6">
        <TaskFinancialImpact tasks={filteredTasks} changeOrders={changeOrders} />
      </div>

      {/* Warning Indicators */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {resourceConflicts.length > 0 && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-center gap-2 text-amber-400">
            <AlertTriangle size={18} />
            <span>{resourceConflicts.length} resource conflict{resourceConflicts.length !== 1 ? 's' : ''} detected</span>
          </div>
        )}
        {drawingRisks.length > 0 && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 text-red-400">
            <AlertTriangle size={18} />
            <span>{drawingRisks.length} task{drawingRisks.length !== 1 ? 's' : ''} blocked or at risk due to drawings</span>
          </div>
        )}
      </div>

      {/* Look-Ahead Schedule and Weather */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2">
          <LookAheadSchedule 
            tasks={filteredTasks} 
            drawingSets={drawingSets} 
            weeks={2} 
            projects={projects}
          />
        </div>
        <WeatherWidget 
          tasks={filteredTasks.filter(t => t.status !== 'completed' && t.status !== 'cancelled')} 
          projectLocation={selectedProjectData?.location || 'Chicago,US'}
        />
      </div>

      <Tabs defaultValue="gantt" className="space-y-6">
        <TabsList className="bg-zinc-900 border border-zinc-800">
          <TabsTrigger value="gantt">
            <BarChart3 size={14} className="mr-2" />
            Gantt Chart
          </TabsTrigger>
          <TabsTrigger value="kanban">Kanban Board</TabsTrigger>
          <TabsTrigger value="list">Task List</TabsTrigger>
          <TabsTrigger value="critical">Critical Path</TabsTrigger>
          <TabsTrigger value="resources">Resources</TabsTrigger>
          <TabsTrigger value="lookahead">
            <TrendingUp size={14} className="mr-2" />
            Look-Ahead
          </TabsTrigger>
        </TabsList>

        <TabsContent value="gantt">
          <GanttChart
            tasks={filteredTasks}
            viewMode={viewMode}
            onTaskUpdate={handleTaskUpdate}
            onTaskEdit={handleEditTask}
            criticalPath={criticalPathData.criticalTasks}
            resources={resources}
            rfis={rfis}
            changeOrders={changeOrders}
            projects={projects}
          />
        </TabsContent>

        <TabsContent value="kanban">
          <KanbanView
            tasks={filteredTasks}
            projects={projects}
            onTaskUpdate={handleTaskUpdate}
            onTaskClick={handleEditTask}
          />
        </TabsContent>

        <TabsContent value="list">
          <TaskList
            tasks={filteredTasks}
            projects={projects}
            resources={resources}
            drawingSets={drawingSets}
            onTaskEdit={handleEditTask}
            onTaskUpdate={handleTaskUpdate}
            onBulkDelete={handleBulkDelete}
            onBulkEdit={handleBulkEdit}
          />
        </TabsContent>

        <TabsContent value="critical">
          <CriticalPathAnalysis
            tasks={filteredTasks}
            criticalPathData={criticalPathData}
            projects={projects}
          />
        </TabsContent>

        <TabsContent value="resources">
          <ResourceConflicts
            conflicts={resourceConflicts}
            tasks={filteredTasks}
            resources={resources}
            projects={projects}
          />
        </TabsContent>

        <TabsContent value="lookahead">
          <LookAheadSchedule 
            tasks={filteredTasks} 
            drawingSets={drawingSets} 
            weeks={4} 
            projects={projects}
          />
        </TabsContent>
      </Tabs>

      {/* Task Form Dialog */}
      <Dialog open={showTaskForm} onOpenChange={setShowTaskForm}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-zinc-900 border-zinc-800 text-white">
          <DialogHeader>
            <DialogTitle>{editingTask ? 'Edit Task' : 'Add Task'}</DialogTitle>
          </DialogHeader>
          <TaskForm
            task={editingTask}
            projects={projects}
            tasks={tasks}
            resources={resources}
            rfis={rfis}
            changeOrders={changeOrders}
            drawingSets={drawingSets}
            onSubmit={(data) => {
              if (editingTask) {
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
        </DialogContent>
      </Dialog>

      {/* Bulk Edit Dialog */}
      <Dialog open={showBulkEdit} onOpenChange={setShowBulkEdit}>
        <DialogContent className="max-w-2xl bg-zinc-900 border-zinc-800 text-white">
          <DialogHeader>
            <DialogTitle>Bulk Edit {bulkEditTasks.length} Task(s)</DialogTitle>
          </DialogHeader>
          <BulkEditForm
            taskIds={bulkEditTasks}
            tasks={tasks}
            onSubmit={async (updates) => {
              for (const id of bulkEditTasks) {
                await updateMutation.mutateAsync({ id, data: updates });
              }
              setShowBulkEdit(false);
              setBulkEditTasks([]);
            }}
            onCancel={() => {
              setShowBulkEdit(false);
              setBulkEditTasks([]);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Bulk Add Dialog */}
      <Dialog open={showBulkAdd} onOpenChange={setShowBulkAdd}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-zinc-900 border-zinc-800 text-white">
          <DialogHeader>
            <DialogTitle>Bulk Add Tasks</DialogTitle>
          </DialogHeader>
          <BulkAddForm
            projects={projects}
            onSubmit={(tasksData) => bulkCreateMutation.mutate(tasksData)}
            onCancel={() => setShowBulkAdd(false)}
            isLoading={bulkCreateMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* CSV Import */}
      <CSVUpload
        entityName="Task"
        templateFields={[
          { label: 'Project Number', key: 'project_number', example: 'P-001' },
          { label: 'Task Name', key: 'name', example: 'Fabricate Level 1 Columns' },
          { label: 'Phase', key: 'phase', example: 'fabrication' },
          { label: 'Start Date', key: 'start_date', example: '2025-01-10' },
          { label: 'End Date', key: 'end_date', example: '2025-01-20' },
          { label: 'Duration Days', key: 'duration_days', example: '10' },
        ]}
        transformRow={(row) => {
          const project = projects.find(p => p.project_number === row.project_number);
          return {
            project_id: project?.id || '',
            name: row.name || '',
            phase: row.phase || 'fabrication',
            start_date: row.start_date || '',
            end_date: row.end_date || '',
            duration_days: parseInt(row.duration_days) || 0,
            status: 'not_started',
            progress_percent: 0,
            is_milestone: false,
          };
        }}
        onImportComplete={() => {
          queryClient.invalidateQueries({ queryKey: ['tasks'] });
        }}
        open={showCSVImport}
        onOpenChange={setShowCSVImport}
      />
    </div>
  );
}