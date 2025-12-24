import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Calendar, Download, BarChart3, AlertTriangle } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import GanttChart from '@/components/schedule/GanttChart';
import TaskList from '@/components/schedule/TaskList';
import TaskForm from '@/components/schedule/TaskForm';
import ResourceConflicts from '@/components/schedule/ResourceConflicts';
import CriticalPathAnalysis from '@/components/schedule/CriticalPathAnalysis';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { calculateCriticalPath, detectResourceConflicts } from '@/components/shared/scheduleUtils';

export default function Schedule() {
  const [selectedProject, setSelectedProject] = useState('all');
  const [viewMode, setViewMode] = useState('week'); // day, week, month
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [selectedPhase, setSelectedPhase] = useState('all');

  const queryClient = useQueryClient();

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('name'),
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list('start_date'),
  });

  const { data: resources = [] } = useQuery({
    queryKey: ['resources'],
    queryFn: () => base44.entities.Resource.list(),
  });

  const { data: rfis = [] } = useQuery({
    queryKey: ['rfis'],
    queryFn: () => base44.entities.RFI.list(),
  });

  const { data: changeOrders = [] } = useQuery({
    queryKey: ['changeOrders'],
    queryFn: () => base44.entities.ChangeOrder.list(),
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

  const handleTaskUpdate = (taskId, updates) => {
    updateMutation.mutate({ id: taskId, data: updates });
  };

  const handleEditTask = (task) => {
    setEditingTask(task);
    setShowTaskForm(true);
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
              onClick={handleExportPDF}
              className="border-zinc-700"
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
              Add Task
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
          <SelectTrigger className="w-32 bg-zinc-900 border-zinc-800">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="day">Day</SelectItem>
            <SelectItem value="week">Week</SelectItem>
            <SelectItem value="month">Month</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Warning Indicators */}
      {resourceConflicts.length > 0 && (
        <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-center gap-2 text-amber-400">
          <AlertTriangle size={18} />
          <span>{resourceConflicts.length} resource conflict{resourceConflicts.length !== 1 ? 's' : ''} detected</span>
        </div>
      )}

      <Tabs defaultValue="gantt" className="space-y-6">
        <TabsList className="bg-zinc-900 border border-zinc-800">
          <TabsTrigger value="gantt">
            <BarChart3 size={14} className="mr-2" />
            Gantt Chart
          </TabsTrigger>
          <TabsTrigger value="list">Task List</TabsTrigger>
          <TabsTrigger value="critical">Critical Path</TabsTrigger>
          <TabsTrigger value="resources">Resources</TabsTrigger>
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
          />
        </TabsContent>

        <TabsContent value="list">
          <TaskList
            tasks={filteredTasks}
            projects={projects}
            resources={resources}
            onTaskEdit={handleEditTask}
            onTaskUpdate={handleTaskUpdate}
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
    </div>
  );
}