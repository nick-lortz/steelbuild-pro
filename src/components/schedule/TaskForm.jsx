import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { X } from 'lucide-react';
import { differenceInDays, addDays, format } from 'date-fns';
import AITaskHelper from './AITaskHelper';

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
  isLoading 
}) {
  const [formData, setFormData] = useState({
    project_id: '',
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
    dependency_type: 'FS',
    lag_days: 0,
    assigned_resources: [],
    assigned_equipment: [],
    linked_rfi_ids: [],
    linked_co_ids: [],
    linked_drawing_set_ids: [],
    notes: '',
  });

  useEffect(() => {
    if (task) {
      setFormData({
        project_id: task.project_id || '',
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
        dependency_type: task.dependency_type || 'FS',
        lag_days: task.lag_days || 0,
        assigned_resources: task.assigned_resources || [],
        assigned_equipment: task.assigned_equipment || [],
        linked_rfi_ids: task.linked_rfi_ids || [],
        linked_co_ids: task.linked_co_ids || [],
        linked_drawing_set_ids: task.linked_drawing_set_ids || [],
        notes: task.notes || '',
      });
    }
  }, [task]);

  const handleChange = (field, value) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      
      // Auto-calculate duration when dates change
      if (field === 'start_date' || field === 'end_date') {
        if (updated.start_date && updated.end_date) {
          const start = new Date(updated.start_date);
          const end = new Date(updated.end_date);
          updated.duration_days = differenceInDays(end, start);
        }
      }
      
      // Auto-calculate end date when duration changes
      if (field === 'duration_days' && updated.start_date) {
        const start = new Date(updated.start_date);
        const end = addDays(start, parseInt(value) || 0);
        updated.end_date = format(end, 'yyyy-MM-dd');
      }
      
      return updated;
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.baseline_start && formData.start_date) {
      formData.baseline_start = formData.start_date;
      formData.baseline_end = formData.end_date;
    }
    
    onSubmit(formData);
  };

  const availableTasks = tasks.filter(t => t.id !== task?.id);
  const laborResources = resources.filter(r => r.type === 'labor' || r.type === 'subcontractor');
  const equipmentResources = resources.filter(r => r.type === 'equipment');
  const selectedProject = projects.find(p => p.id === formData.project_id);

  const toggleArrayItem = (field, itemId) => {
    const current = formData[field] || [];
    if (current.includes(itemId)) {
      handleChange(field, current.filter(id => id !== itemId));
    } else {
      handleChange(field, [...current, itemId]);
    }
  };

  const handleApplyAISuggestions = (suggestions) => {
    setFormData(prev => ({ ...prev, ...suggestions }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Info */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Project *</Label>
          <Select value={formData.project_id} onValueChange={(v) => handleChange('project_id', v)}>
            <SelectTrigger className="bg-zinc-800 border-zinc-700">
              <SelectValue placeholder="Select project" />
            </SelectTrigger>
            <SelectContent>
              {projects.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Parent Task (for sub-tasks)</Label>
          <Select value={formData.parent_task_id} onValueChange={(v) => handleChange('parent_task_id', v)}>
            <SelectTrigger className="bg-zinc-800 border-zinc-700">
              <SelectValue placeholder="None (main task)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={null}>None (main task)</SelectItem>
              {availableTasks.filter(t => !t.parent_task_id && t.project_id === formData.project_id).map(t => (
                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Phase *</Label>
          <Select value={formData.phase} onValueChange={(v) => handleChange('phase', v)}>
            <SelectTrigger className="bg-zinc-800 border-zinc-700">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="detailing">Detailing</SelectItem>
              <SelectItem value="fabrication">Fabrication</SelectItem>
              <SelectItem value="delivery">Delivery</SelectItem>
              <SelectItem value="erection">Erection</SelectItem>
              <SelectItem value="closeout">Closeout</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>WBS Code</Label>
          <Input
            value={formData.wbs_code}
            onChange={(e) => handleChange('wbs_code', e.target.value)}
            placeholder="e.g., 1.2.3"
            className="bg-zinc-800 border-zinc-700"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Task Name *</Label>
        <Input
          value={formData.name}
          onChange={(e) => handleChange('name', e.target.value)}
          placeholder="e.g., Fabricate Level 2 Columns"
          required
          className="bg-zinc-800 border-zinc-700"
        />
      </div>

      {/* AI Assistant */}
      {!task && formData.name && formData.project_id && (
        <AITaskHelper
          taskName={formData.name}
          projectType={selectedProject?.scope_of_work || 'Steel fabrication'}
          existingTasks={availableTasks.filter(t => t.project_id === formData.project_id)}
          onApplySuggestions={handleApplyAISuggestions}
        />
      )}

      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea
          value={formData.description || ''}
          onChange={(e) => handleChange('description', e.target.value)}
          rows={2}
          className="bg-zinc-800 border-zinc-700"
          placeholder="Task details..."
        />
      </div>

      <div className="space-y-2">
        <Label>Status</Label>
        <Select value={formData.status} onValueChange={(v) => handleChange('status', v)}>
          <SelectTrigger className="bg-zinc-800 border-zinc-700">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="not_started">Not Started</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="on_hold">On Hold</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
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
            className="bg-zinc-800 border-zinc-700"
          />
        </div>

        <div className="space-y-2">
          <Label>Duration (days)</Label>
          <Input
            type="number"
            value={formData.duration_days}
            onChange={(e) => handleChange('duration_days', e.target.value)}
            min="0"
            className="bg-zinc-800 border-zinc-700"
          />
        </div>

        <div className="space-y-2">
          <Label>End Date *</Label>
          <Input
            type="date"
            value={formData.end_date}
            onChange={(e) => handleChange('end_date', e.target.value)}
            required
            className="bg-zinc-800 border-zinc-700"
          />
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
              className="bg-zinc-800 border-zinc-700"
            />
          </div>
          <div className="space-y-2">
            <Label>Actual Hours</Label>
            <Input
              type="number"
              value={formData.actual_hours}
              onChange={(e) => handleChange('actual_hours', e.target.value)}
              min="0"
              step="0.5"
              className="bg-zinc-800 border-zinc-700"
            />
          </div>
          <div className="space-y-2">
            <Label>Estimated Cost ($)</Label>
            <Input
              type="number"
              value={formData.estimated_cost}
              onChange={(e) => handleChange('estimated_cost', e.target.value)}
              min="0"
              step="0.01"
              className="bg-zinc-800 border-zinc-700"
            />
          </div>
          <div className="space-y-2">
            <Label>Actual Cost ($)</Label>
            <Input
              type="number"
              value={formData.actual_cost}
              onChange={(e) => handleChange('actual_cost', e.target.value)}
              min="0"
              step="0.01"
              className="bg-zinc-800 border-zinc-700"
            />
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
            className="bg-zinc-800 border-zinc-700"
          />
        </div>

        <div className="flex items-center space-x-2 mt-8">
          <Checkbox
            checked={formData.is_milestone}
            onCheckedChange={(checked) => handleChange('is_milestone', checked)}
            id="milestone"
          />
          <Label htmlFor="milestone" className="cursor-pointer">Milestone</Label>
        </div>
      </div>

      {/* Dependencies */}
      <div className="border-t border-zinc-800 pt-4">
        <h4 className="text-sm font-medium mb-3">Dependencies</h4>
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2 space-y-2">
            <Label>Predecessor Tasks</Label>
            <Select onValueChange={(v) => toggleArrayItem('predecessor_ids', v)}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700">
                <SelectValue placeholder="Add predecessor" />
              </SelectTrigger>
              <SelectContent>
                {availableTasks.map(t => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex flex-wrap gap-2 mt-2">
              {(formData.predecessor_ids || []).map(id => {
                const t = tasks.find(task => task.id === id);
                return t ? (
                  <Badge key={id} variant="outline" className="gap-1">
                    {t.name}
                    <X 
                      size={12} 
                      className="cursor-pointer" 
                      onClick={() => toggleArrayItem('predecessor_ids', id)}
                    />
                  </Badge>
                ) : null;
              })}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={formData.dependency_type} onValueChange={(v) => handleChange('dependency_type', v)}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="FS">Finish-to-Start</SelectItem>
                <SelectItem value="SS">Start-to-Start</SelectItem>
                <SelectItem value="FF">Finish-to-Finish</SelectItem>
                <SelectItem value="SF">Start-to-Finish</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <Label>Lag (days)</Label>
          <Input
            type="number"
            value={formData.lag_days}
            onChange={(e) => handleChange('lag_days', e.target.value)}
            placeholder="0"
            className="bg-zinc-800 border-zinc-700 w-32"
          />
        </div>
      </div>

      {/* Resources */}
      <div className="border-t border-zinc-800 pt-4">
        <h4 className="text-sm font-medium mb-3">Resources</h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Labor / Subcontractors</Label>
            <Select onValueChange={(v) => toggleArrayItem('assigned_resources', v)}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700">
                <SelectValue placeholder="Assign labor/subs" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-700">
                {laborResources.map(r => (
                  <SelectItem key={r.id} value={r.id} className="text-white">
                    {r.name} {r.type === 'subcontractor' ? '(Sub)' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex flex-wrap gap-2">
              {(formData.assigned_resources || []).map(id => {
                const r = resources.find(res => res.id === id);
                return r ? (
                  <Badge key={id} variant="outline" className="gap-1 bg-blue-500/20 text-blue-400 border-blue-500/30">
                    {r.name} {r.type === 'subcontractor' && '(Sub)'}
                    <X 
                      size={12} 
                      className="cursor-pointer" 
                      onClick={() => toggleArrayItem('assigned_resources', id)}
                    />
                  </Badge>
                ) : null;
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
                {equipmentResources.map(r => (
                  <SelectItem key={r.id} value={r.id} className="text-white">{r.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex flex-wrap gap-2">
              {(formData.assigned_equipment || []).map(id => {
                const r = resources.find(res => res.id === id);
                return r ? (
                  <Badge key={id} variant="outline" className="gap-1 bg-purple-500/20 text-purple-400 border-purple-500/30">
                    {r.name}
                    <X 
                      size={12} 
                      className="cursor-pointer" 
                      onClick={() => toggleArrayItem('assigned_equipment', id)}
                    />
                  </Badge>
                ) : null;
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
                  {rfis.filter(r => r.project_id === formData.project_id).map(r => (
                    <SelectItem key={r.id} value={r.id}>RFI-{r.rfi_number}: {r.subject}</SelectItem>
                  ))}
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
                  {changeOrders.filter(c => c.project_id === formData.project_id).map(c => (
                    <SelectItem key={c.id} value={c.id}>CO-{c.co_number}: {c.title}</SelectItem>
                  ))}
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
                {(drawingSets || []).filter(d => d.project_id === formData.project_id).map(d => (
                  <SelectItem key={d.id} value={d.id}>{d.set_number} - {d.set_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex flex-wrap gap-2">
              {(formData.linked_drawing_set_ids || []).map(id => {
                const d = (drawingSets || []).find(ds => ds.id === id);
                return d ? (
                  <Badge key={id} variant="outline" className="gap-1">
                    {d.set_number}
                    <X 
                      size={12} 
                      className="cursor-pointer" 
                      onClick={() => toggleArrayItem('linked_drawing_set_ids', id)}
                    />
                  </Badge>
                ) : null;
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
          className="bg-zinc-800 border-zinc-700"
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
        <Button type="button" variant="outline" onClick={onCancel} className="border-zinc-700">
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading} className="bg-amber-500 hover:bg-amber-600 text-black">
          {isLoading ? 'Saving...' : task ? 'Update Task' : 'Create Task'}
        </Button>
      </div>
    </form>
  );
}