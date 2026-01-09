import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { X, Settings, Save, User, Copy } from 'lucide-react';
import { differenceInDays, addDays, format } from 'date-fns';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import AITaskHelper from './AITaskHelper';
import DependencyConfigurator from './DependencyConfigurator';
import TaskTemplateManager from './TaskTemplateManager';
import { toast } from '@/components/ui/notifications';

export default function TaskForm({
  task,
  projects,
  tasks,
  resources,
  rfis,
  changeOrders,
  drawingSets,
  onSubmit,
  onCancel,
  isLoading,
  restrictPhase
}) {
  const [showDependencyConfig, setShowDependencyConfig] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const { data: workPackages = [] } = useQuery({
    queryKey: ['work-packages'],
    queryFn: () => base44.entities.WorkPackage.list(),
  });

  const [formData, setFormData] = useState({
    project_id: '',
    work_package_id: '',
    parent_task_id: '',
    name: '',
    phase: 'fabrication',
    wbs_code: '',
    start_date: '',
    end_date: '',
    duration_days: 0,
    estimated_hours: 0,
    actual_hours: 0,
    estimated_cost: 0,
    actual_cost: 0,
    progress_percent: 0,
    status: 'not_started',
    is_milestone: false,
    predecessor_ids: [],
    predecessor_configs: [],
    is_recurring: false,
    recurrence_pattern: 'weekly',
    recurrence_interval: 1,
    recurrence_end_date: '',
    assigned_resources: [],
    assigned_equipment: [],
    linked_rfi_ids: [],
    linked_co_ids: [],
    linked_drawing_set_ids: [],
    notes: ''
  });

  useEffect(() => {
    if (task) {
      setFormData({
        project_id: task.project_id || '',
        work_package_id: task.work_package_id || '',
        parent_task_id: task.parent_task_id || '',
        name: task.name || '',
        phase: task.phase || 'fabrication',
        wbs_code: task.wbs_code || '',
        start_date: task.start_date || '',
        end_date: task.end_date || '',
        duration_days: task.duration_days || 0,
        estimated_hours: task.estimated_hours || 0,
        actual_hours: task.actual_hours || 0,
        estimated_cost: task.estimated_cost || 0,
        actual_cost: task.actual_cost || 0,
        progress_percent: task.progress_percent || 0,
        status: task.status || 'not_started',
        is_milestone: task.is_milestone || false,
        predecessor_ids: task.predecessor_ids || [],
        predecessor_configs: task.predecessor_configs || [],
        is_recurring: task.is_recurring || false,
        recurrence_pattern: task.recurrence_pattern || 'weekly',
        recurrence_interval: task.recurrence_interval || 1,
        recurrence_end_date: task.recurrence_end_date || '',
        assigned_resources: task.assigned_resources || [],
        assigned_equipment: task.assigned_equipment || [],
        linked_rfi_ids: task.linked_rfi_ids || [],
        linked_co_ids: task.linked_co_ids || [],
        linked_drawing_set_ids: task.linked_drawing_set_ids || [],
        notes: task.notes || ''
      });
    } else if (task?.work_package_id) {
      // Pre-fill work package from context
      const wp = workPackages.find(w => w.id === task.work_package_id);
      if (wp) {
        setFormData(prev => ({
          ...prev,
          work_package_id: wp.id,
          project_id: wp.project_id,
          phase: wp.phase
        }));
      }
    }
  }, [task, workPackages]);

  const handleChange = (field, value) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };

      // Auto-calculate duration when dates change
      if (field === 'start_date' || field === 'end_date') {
        if (updated.start_date && updated.end_date) {
          const start = new Date(updated.start_date + 'T00:00:00');
          const end = new Date(updated.end_date + 'T00:00:00');
          updated.duration_days = differenceInDays(end, start);
        }
      }

      // Auto-calculate end date when duration changes
      if (field === 'duration_days' && updated.start_date) {
        const start = new Date(updated.start_date + 'T00:00:00');
        const end = addDays(start, parseInt(value) || 0);
        updated.end_date = format(end, 'yyyy-MM-dd');
      }

      return updated;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.work_package_id) {
      toast.error('Work package is required');
      return;
    }

    // Validate dependencies for circular references
    if (formData.predecessor_ids && formData.predecessor_ids.length > 0) {
      try {
        const validation = await base44.functions.invoke('validateTaskDependencies', {
          task_id: task?.id || 'new',
          predecessor_ids: formData.predecessor_ids,
          project_id: formData.project_id
        });

        if (!validation.data.valid) {
          toast.error(`Circular dependency detected: ${validation.data.circularPath.join(' → ')}`);
          return;
        }
      } catch (error) {
        toast.error('Failed to validate dependencies');
        return;
      }
    }

    if (!formData.baseline_start && formData.start_date) {
      formData.baseline_start = formData.start_date;
      formData.baseline_end = formData.end_date;
    }

    onSubmit(formData);
  };

  const availableTasks = tasks.filter((t) => t.id !== task?.id);
  const laborResources = resources.filter((r) => r.type === 'labor' || r.type === 'subcontractor');
  const equipmentResources = resources.filter((r) => r.type === 'equipment');
  const selectedProject = projects.find((p) => p.id === formData.project_id);

  const toggleArrayItem = (field, itemId) => {
    const current = formData[field] || [];
    if (current.includes(itemId)) {
      handleChange(field, current.filter((id) => id !== itemId));
    } else {
      handleChange(field, [...current, itemId]);
    }
  };

  const handleApplyAISuggestions = (suggestions) => {
    setFormData((prev) => ({ ...prev, ...suggestions }));
  };

  const handleTemplateSelect = async (template) => {
    setFormData((prev) => ({
      ...prev,
      name: prev.name || template.name,
      phase: template.phase,
      duration_days: template.duration_days,
      estimated_hours: template.estimated_hours,
      estimated_cost: template.estimated_cost,
      is_milestone: template.is_milestone,
      notes: template.notes || prev.notes
    }));
    toast.success('Template applied');
  };

  const handleSaveAsTemplate = async () => {
    try {
      await base44.entities.TaskTemplate.create({
        name: formData.name,
        category: 'custom',
        phase: formData.phase,
        duration_days: formData.duration_days,
        estimated_hours: formData.estimated_hours,
        estimated_cost: formData.estimated_cost,
        is_milestone: formData.is_milestone,
        notes: formData.notes
      });
      toast.success('Template saved');
    } catch (error) {
      toast.error('Failed to save template');
    }
  };

  const handleAssignToMe = async () => {
    try {
      const currentUser = await base44.auth.me();
      // Assuming we need to find or create a resource for this user
      const userResources = resources.filter((r) =>
      r.contact_email === currentUser.email || r.name === currentUser.full_name
      );

      if (userResources.length > 0) {
        const current = formData.assigned_resources || [];
        if (!current.includes(userResources[0].id)) {
          handleChange('assigned_resources', [...current, userResources[0].id]);
          toast.success('Assigned to you');
        }
      } else {
        toast.info('No resource profile found. Assign manually.');
      }
    } catch (error) {
      toast.error('Could not assign task');
    }
  };

  const isSummaryTask = formData.parent_task_id === null || formData.parent_task_id === '';
  const childTasks = tasks.filter((t) => t.parent_task_id === task?.id);
  
  // Determine if task is read-only based on work package phase
  const isReadOnly = task?._isReadOnly || false;
  const workPackageStatus = task?._workPackageStatus;
  const workPackagePhase = task?._workPackagePhase;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Read-Only Banner */}
      {isReadOnly && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
          <p className="text-sm text-amber-400">
            🔒 This task is read-only. 
            {workPackageStatus === 'complete' && ' Work package is complete.'}
            {workPackagePhase !== task?.phase && ' Task is in a different phase than the active work package.'}
          </p>
        </div>
      )}

      {/* Action Buttons */}
      {!task && !isReadOnly &&
      <div className="flex gap-2 pb-4 border-b border-zinc-800">
          <Button
          type="button"
          variant="outline"
          onClick={() => setShowTemplates(true)}
          className="border-zinc-700">

            <Copy size={16} className="mr-2" />
            Use Template
          </Button>
          {formData.name &&
        <Button
          type="button"
          variant="outline"
          onClick={handleSaveAsTemplate}
          className="border-zinc-700">

              <Save size={16} className="mr-2" />
              Save as Template
            </Button>
        }
        </div>
      }

      {/* Summary Task Info Banner */}
      {task && isSummaryTask && childTasks.length > 0 &&
      <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
          <p className="text-sm text-amber-400">
            📁 This is a summary task with {childTasks.length} subtask{childTasks.length !== 1 ? 's' : ''}. 
            Its dates are determined by its subtasks.
          </p>
        </div>
      }

      {/* Basic Info */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Project *</Label>
          <Select value={formData.project_id} onValueChange={(v) => handleChange('project_id', v)} disabled={!!task}>
            <SelectTrigger className="bg-zinc-800 border-zinc-700">
              <SelectValue placeholder="Select project" />
            </SelectTrigger>
            <SelectContent>
              {projects.map((p) =>
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Work Package *</Label>
          <Select 
            value={formData.work_package_id || ''} 
            onValueChange={(v) => handleChange('work_package_id', v)}
            disabled={!!task}
          >
            <SelectTrigger className="bg-zinc-800 border-zinc-700">
              <SelectValue placeholder="Select work package" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-700">
              {workPackages
                .filter(wp => wp.project_id === formData.project_id)
                .map((wp) => (
                  <SelectItem key={wp.id} value={wp.id} className="text-white">
                    {wp.name} ({wp.phase})
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          {!!task && (
            <p className="text-xs text-zinc-500 mt-1">
              🔒 Cannot change work package after creation
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Task Type</Label>
          <Select
            value={formData.parent_task_id === null ? 'none' : formData.parent_task_id || 'none'}
            onValueChange={(v) => handleChange('parent_task_id', v === 'none' ? null : v)}>

            <SelectTrigger className="bg-zinc-800 border-zinc-700">
              <SelectValue placeholder="Select task type" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-700">
              <SelectItem value="none" className="text-white">📁 Summary Task (can have subtasks)</SelectItem>
              {formData.project_id && availableTasks.
              filter((t) => !t.parent_task_id && t.project_id === formData.project_id && t.id !== task?.id).
              map((t) =>
              <SelectItem key={t.id} value={t.id} className="text-white">
                    ↳ Subtask under: {t.name}
                  </SelectItem>
              )}
            </SelectContent>
          </Select>
          {isSummaryTask && !task &&
          <p className="text-xs text-zinc-500 mt-1">
              💡 Summary tasks are parent tasks that can contain subtasks
            </p>
          }
        </div>

        <div className="space-y-2">
          <Label>Phase *</Label>
          <Input
            value={formData.phase}
            disabled
            className="bg-zinc-900 border-zinc-700 text-zinc-500 cursor-not-allowed"
          />
          <p className="text-xs text-zinc-500 mt-1">
            🔒 Phase inherited from work package
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>WBS Code</Label>
          <Input
            value={formData.wbs_code}
            onChange={(e) => handleChange('wbs_code', e.target.value)}
            placeholder="e.g., 1.2.3"
            className="bg-zinc-800 border-zinc-700" />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Task Name *</Label>
        <Input
          value={formData.name}
          onChange={(e) => handleChange('name', e.target.value)}
          placeholder="e.g., Fabricate Level 2 Columns"
          required
          disabled={isReadOnly}
          className="bg-zinc-800 border-zinc-700" />

      </div>

      {/* AI Assistant */}
      {!task && formData.name && formData.project_id &&
      <AITaskHelper
        taskName={formData.name}
        projectType={selectedProject?.scope_of_work || 'Steel fabrication'}
        existingTasks={availableTasks.filter((t) => t.project_id === formData.project_id)}
        onApplySuggestions={handleApplyAISuggestions} />

      }

      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea
          value={formData.description || ''}
          onChange={(e) => handleChange('description', e.target.value)}
          rows={2}
          className="bg-zinc-800 border-zinc-700"
          placeholder="Task details..." />

      </div>

      <div className="space-y-2">
        <Label>Status</Label>
        <Select 
          value={formData.status} 
          onValueChange={(v) => handleChange('status', v)}
          disabled={isReadOnly}
        >
          <SelectTrigger className="bg-zinc-800 border-zinc-700">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="not_started">Not Started</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="on_hold">On Hold</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
            <SelectItem value="blocked">Blocked</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Dates */}
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Start Date *</Label>
          <Input
            type="date"
            value={formData.start_date}
            onChange={(e) => handleChange('start_date', e.target.value)}
            required
            disabled={isReadOnly}
            className="bg-zinc-800 border-zinc-700" />

        </div>

        <div className="space-y-2">
          <Label>Duration (days)</Label>
          <Input
            type="number"
            value={formData.duration_days}
            onChange={(e) => handleChange('duration_days', e.target.value)}
            min="0"
            disabled={isReadOnly}
            className="bg-zinc-800 border-zinc-700" />

        </div>

        <div className="space-y-2">
          <Label>End Date *</Label>
          <Input
            type="date"
            value={formData.end_date}
            onChange={(e) => handleChange('end_date', e.target.value)}
            required
            disabled={isReadOnly}
            className="bg-zinc-800 border-zinc-700" />

        </div>
      </div>

      {/* Time & Cost Tracking */}
      <div className="border-t border-zinc-800 pt-4">
        <h4 className="text-sm font-medium mb-3">Time & Cost Tracking</h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Estimated Hours</Label>
            <Input
              type="number"
              value={formData.estimated_hours}
              onChange={(e) => handleChange('estimated_hours', e.target.value)}
              min="0"
              step="0.5"
              className="bg-zinc-800 border-zinc-700" />

          </div>
          <div className="space-y-2">
            <Label>Actual Hours</Label>
            <Input
              type="number"
              value={formData.actual_hours}
              onChange={(e) => handleChange('actual_hours', e.target.value)}
              min="0"
              step="0.5"
              className="bg-zinc-800 border-zinc-700" />

          </div>
          <div className="space-y-2">
            <Label>Estimated Cost ($)</Label>
            <Input
              type="number"
              value={formData.estimated_cost}
              onChange={(e) => handleChange('estimated_cost', e.target.value)}
              min="0"
              step="0.01"
              className="bg-zinc-800 border-zinc-700" />

          </div>
          <div className="space-y-2">
            <Label>Actual Cost ($)</Label>
            <Input
              type="number"
              value={formData.actual_cost}
              onChange={(e) => handleChange('actual_cost', e.target.value)}
              min="0"
              step="0.01"
              className="bg-zinc-800 border-zinc-700" />

          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Progress %</Label>
          <Input
            type="number"
            value={formData.progress_percent}
            onChange={(e) => handleChange('progress_percent', e.target.value)}
            min="0"
            max="100"
            className="bg-zinc-800 border-zinc-700" />

        </div>

        <div className="flex items-center space-x-2 mt-8">
          <Checkbox
            checked={formData.is_milestone}
            onCheckedChange={(checked) => handleChange('is_milestone', checked)}
            id="milestone" />

          <Label htmlFor="milestone" className="cursor-pointer">Milestone</Label>
        </div>
      </div>

      {/* Dependencies */}
      <div className="border-t border-zinc-800 pt-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium">Task Dependencies</h4>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setShowDependencyConfig(true)} className="bg-background text-slate-950 px-3 text-xs font-medium rounded-md inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border shadow-sm hover:bg-accent hover:text-accent-foreground h-8 border-zinc-700">



            <Settings size={14} className="mr-1" />
            Configure Dependencies
          </Button>
        </div>

        {formData.predecessor_configs && formData.predecessor_configs.length > 0 ?
        <div className="space-y-2">
            <Label className="text-xs text-zinc-400">
              {formData.predecessor_configs.length} predecessor{formData.predecessor_configs.length !== 1 ? 's' : ''} configured
            </Label>
            <div className="flex flex-wrap gap-2">
              {formData.predecessor_configs.map((config, idx) => {
              const t = tasks.find((task) => task.id === config.predecessor_id);
              if (!t) return null;

              const typeLabels = {
                FS: 'Finish-Start',
                SS: 'Start-Start',
                FF: 'Finish-Finish',
                SF: 'Start-Finish'
              };

              return (
                <Badge key={idx} variant="outline" className="gap-2 bg-blue-500/10 text-blue-400 border-blue-500/20">
                    <span className="font-medium">{t.name}</span>
                    <span className="text-[10px] text-blue-300">
                      {typeLabels[config.type]}
                      {config.lag_days !== 0 && ` ${config.lag_days > 0 ? '+' : ''}${config.lag_days}d`}
                    </span>
                  </Badge>);

            })}
            </div>
          </div> :

        <p className="text-sm text-zinc-500">No dependencies configured. Click "Configure Dependencies" to add.</p>
        }
      </div>
      
      {showDependencyConfig &&
      <DependencyConfigurator
        predecessorConfigs={formData.predecessor_configs || []}
        availableTasks={availableTasks.filter((t) => t.project_id === formData.project_id)}
        onChange={(configs) => {
          handleChange('predecessor_configs', configs);
          handleChange('predecessor_ids', configs.map((c) => c.predecessor_id));
        }}
        onClose={() => setShowDependencyConfig(false)} />

      }

      {showTemplates &&
      <TaskTemplateManager
        open={showTemplates}
        onOpenChange={setShowTemplates}
        onSelectTemplate={handleTemplateSelect} />

      }

      {/* Recurring Task Options */}
      {!task &&
      <div className="border-t border-zinc-800 pt-4">
          <div className="flex items-center gap-2 mb-3">
            <Checkbox
            checked={formData.is_recurring}
            onCheckedChange={(checked) => handleChange('is_recurring', checked)}
            id="recurring" />

            <Label htmlFor="recurring" className="cursor-pointer">Recurring Task</Label>
          </div>

          {formData.is_recurring &&
        <div className="grid grid-cols-3 gap-4 ml-6">
              <div className="space-y-2">
                <Label>Pattern</Label>
                <Select value={formData.recurrence_pattern} onValueChange={(v) => handleChange('recurrence_pattern', v)}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="biweekly">Bi-weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Every</Label>
                <Input
              type="number"
              value={formData.recurrence_interval}
              onChange={(e) => handleChange('recurrence_interval', parseInt(e.target.value) || 1)}
              min="1"
              className="bg-zinc-800 border-zinc-700" />

              </div>
              <div className="space-y-2">
                <Label>Until Date</Label>
                <Input
              type="date"
              value={formData.recurrence_end_date}
              onChange={(e) => handleChange('recurrence_end_date', e.target.value)}
              className="bg-zinc-800 border-zinc-700" />

              </div>
            </div>
        }
        </div>
      }

      {/* Resources */}
      <div className="border-t border-zinc-800 pt-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium">Resources</h4>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleAssignToMe} className="bg-background text-slate-950 px-3 text-xs font-medium rounded-md inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border shadow-sm hover:bg-accent hover:text-accent-foreground h-8 border-zinc-700">



            <User size={14} className="mr-1" />
            Assign to Me
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Labor / Subcontractors</Label>
            <Select onValueChange={(v) => toggleArrayItem('assigned_resources', v)}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700">
                <SelectValue placeholder="Assign labor/subs" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-700">
                {laborResources.map((r) =>
                <SelectItem key={r.id} value={r.id} className="text-white">
                    {r.name} {r.type === 'subcontractor' ? '(Sub)' : ''}
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
            <div className="flex flex-wrap gap-2">
              {(formData.assigned_resources || []).map((id) => {
                const r = resources.find((res) => res.id === id);
                return r ?
                <Badge key={id} variant="outline" className="gap-1 bg-blue-500/20 text-blue-400 border-blue-500/30">
                    {r.name} {r.type === 'subcontractor' && '(Sub)'}
                    <X
                    size={12}
                    className="cursor-pointer"
                    onClick={() => toggleArrayItem('assigned_resources', id)} />

                  </Badge> :
                null;
              })}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Equipment</Label>
            <Select onValueChange={(v) => toggleArrayItem('assigned_equipment', v)}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700">
                <SelectValue placeholder="Assign equipment" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-700">
                {equipmentResources.map((r) =>
                <SelectItem key={r.id} value={r.id} className="text-white">{r.name}</SelectItem>
                )}
              </SelectContent>
            </Select>
            <div className="flex flex-wrap gap-2">
              {(formData.assigned_equipment || []).map((id) => {
                const r = resources.find((res) => res.id === id);
                return r ?
                <Badge key={id} variant="outline" className="gap-1 bg-purple-500/20 text-purple-400 border-purple-500/30">
                    {r.name}
                    <X
                    size={12}
                    className="cursor-pointer"
                    onClick={() => toggleArrayItem('assigned_equipment', id)} />

                  </Badge> :
                null;
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Links */}
      <div className="border-t border-zinc-800 pt-4">
        <h4 className="text-sm font-medium mb-3">Linked Items</h4>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>RFIs</Label>
              <Select onValueChange={(v) => toggleArrayItem('linked_rfi_ids', v)}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700">
                  <SelectValue placeholder="Link RFI" />
                </SelectTrigger>
                <SelectContent>
                  {rfis.filter((r) => r.project_id === formData.project_id).map((r) =>
                  <SelectItem key={r.id} value={r.id}>RFI-{r.rfi_number}: {r.subject}</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Change Orders</Label>
              <Select onValueChange={(v) => toggleArrayItem('linked_co_ids', v)}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700">
                  <SelectValue placeholder="Link CO" />
                </SelectTrigger>
                <SelectContent>
                  {changeOrders.filter((c) => c.project_id === formData.project_id).map((c) =>
                  <SelectItem key={c.id} value={c.id}>CO-{c.co_number}: {c.title}</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Drawing Sets (Required for Fabrication/Erection)</Label>
            <Select onValueChange={(v) => toggleArrayItem('linked_drawing_set_ids', v)}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700">
                <SelectValue placeholder="Link drawing set" />
              </SelectTrigger>
              <SelectContent>
                {(drawingSets || []).filter((d) => d.project_id === formData.project_id).map((d) =>
                <SelectItem key={d.id} value={d.id}>{d.set_number} - {d.set_name}</SelectItem>
                )}
              </SelectContent>
            </Select>
            <div className="flex flex-wrap gap-2">
              {(formData.linked_drawing_set_ids || []).map((id) => {
                const d = (drawingSets || []).find((ds) => ds.id === id);
                return d ?
                <Badge key={id} variant="outline" className="gap-1">
                    {d.set_number}
                    <X
                    size={12}
                    className="cursor-pointer"
                    onClick={() => toggleArrayItem('linked_drawing_set_ids', id)} />

                  </Badge> :
                null;
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Notes</Label>
        <Textarea
          value={formData.notes}
          onChange={(e) => handleChange('notes', e.target.value)}
          rows={3}
          className="bg-zinc-800 border-zinc-700" />

      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
        <Button type="button" variant="outline" onClick={onCancel} className="bg-background text-slate-950 px-4 py-2 text-sm font-medium rounded-md inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border shadow-sm hover:bg-accent hover:text-accent-foreground h-9 border-zinc-700">
          {isReadOnly ? 'Close' : 'Cancel'}
        </Button>
        {!isReadOnly && (
          <Button 
            type="submit" 
            disabled={isLoading} 
            className="bg-amber-500 hover:bg-amber-600 text-black"
          >
            {isLoading 
              ? 'Saving...' 
              : task 
                ? 'Update Task' 
                : 'Create Task'}
          </Button>
        )}
      </div>
    </form>);

}