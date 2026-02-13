import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from 'sonner';
import { format } from 'date-fns';
import FormField from '@/components/ui/FormField';

export default function WorkPackageForm({
  package: pkg,
  projectId,
  sovItems = [],
  costCodes = [],
  documents = [],
  drawings = [],
  deliveries = [],
  onSubmit,
  onCancel,
  isLoading
}) {
  const [formData, setFormData] = useState({
    project_id: projectId || '',
    wpid: '',
    title: '',
    scope_summary: '',
    phase: 'pre_fab',
    status: 'not_started',
    budget_at_award: 0,
    forecast_at_completion: 0,
    percent_complete: 0,
    start_date: '',
    end_date: '',
    target_date: '',
    assigned_pm: '',
    linked_drawing_set_ids: [],
    linked_delivery_ids: [],
    notes: ''
  });

  useEffect(() => {
    if (pkg) {
      setFormData({
        project_id: pkg.project_id || projectId,
        wpid: pkg.wpid || '',
        title: pkg.title || '',
        scope_summary: pkg.scope_summary || '',
        phase: pkg.phase || 'pre_fab',
        status: pkg.status || 'not_started',
        budget_at_award: pkg.budget_at_award || 0,
        forecast_at_completion: pkg.forecast_at_completion || 0,
        percent_complete: pkg.percent_complete || 0,
        start_date: pkg.start_date ? pkg.start_date.split('T')[0] : '',
        end_date: pkg.end_date ? pkg.end_date.split('T')[0] : '',
        target_date: pkg.target_date ? pkg.target_date.split('T')[0] : '',
        assigned_pm: pkg.assigned_pm || '',
        linked_drawing_set_ids: pkg.linked_drawing_set_ids || [],
        linked_delivery_ids: pkg.linked_delivery_ids || [],
        notes: pkg.notes || ''
      });
    } else if (projectId) {
      setFormData(prev => ({ ...prev, project_id: projectId }));
    }
  }, [pkg, projectId]);

  const handleChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  const toggleArrayItem = (field, id) => {
    const current = formData[field] || [];
    const updated = current.includes(id)
      ? current.filter(item => item !== id)
      : [...current, id];
    handleChange(field, updated);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.wpid || !formData.title) {
      toast.error('WPID and Title are required');
      return;
    }

    const submitData = {
      ...formData,
      budget_at_award: formData.budget_at_award ? parseFloat(formData.budget_at_award) : 0,
      forecast_at_completion: formData.forecast_at_completion ? parseFloat(formData.forecast_at_completion) : 0,
      percent_complete: formData.percent_complete ? parseFloat(formData.percent_complete) : 0
    };

    onSubmit(submitData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 mt-6">
      {/* Basic Info */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-zinc-300 uppercase">Basic Information</h3>
        
        <FormField label="WPID" required>
          <Input
            value={formData.wpid}
            onChange={(e) => handleChange('wpid', e.target.value)}
            placeholder="WP-001"
            className="bg-zinc-800 border-zinc-700 text-white"
            required
          />
        </FormField>

        <FormField label="Title" required>
          <Input
            value={formData.title}
            onChange={(e) => handleChange('title', e.target.value)}
            placeholder="e.g., Level 2 North Wing"
            className="bg-zinc-800 border-zinc-700 text-white"
            required
          />
        </FormField>

        <FormField label="Scope Summary">
          <Textarea
            value={formData.scope_summary}
            onChange={(e) => handleChange('scope_summary', e.target.value)}
            placeholder="Detailed scope description..."
            className="bg-zinc-800 border-zinc-700 text-white"
            rows={3}
          />
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-zinc-200">Phase</Label>
            <Select value={formData.phase} onValueChange={(v) => handleChange('phase', v)}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pre_fab">Pre-Fab</SelectItem>
                <SelectItem value="shop">Shop</SelectItem>
                <SelectItem value="delivery">Delivery</SelectItem>
                <SelectItem value="erection">Erection</SelectItem>
                <SelectItem value="punch">Punch</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-zinc-200">Status</Label>
            <Select value={formData.status} onValueChange={(v) => handleChange('status', v)}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="not_started">Not Started</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="on_hold">On Hold</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Budget */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-zinc-300 uppercase">Budget & Forecast</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-zinc-200">Budget at Award</Label>
            <Input
              type="number"
              step="0.01"
              value={formData.budget_at_award}
              onChange={(e) => handleChange('budget_at_award', e.target.value)}
              placeholder="0.00"
              className="bg-zinc-800 border-zinc-700 text-white"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-zinc-200">Forecast at Completion</Label>
            <Input
              type="number"
              step="0.01"
              value={formData.forecast_at_completion}
              onChange={(e) => handleChange('forecast_at_completion', e.target.value)}
              placeholder="0.00"
              className="bg-zinc-800 border-zinc-700 text-white"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-zinc-200">% Complete</Label>
          <Input
            type="number"
            min="0"
            max="100"
            value={formData.percent_complete}
            onChange={(e) => handleChange('percent_complete', e.target.value)}
            placeholder="0"
            className="bg-zinc-800 border-zinc-700 text-white"
          />
        </div>
      </div>

      {/* Schedule */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-zinc-300 uppercase">Schedule</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label className="text-zinc-200">Start Date</Label>
            <Input
              type="date"
              value={formData.start_date}
              onChange={(e) => handleChange('start_date', e.target.value)}
              className="bg-zinc-800 border-zinc-700 text-white"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-zinc-200">Target Delivery Date</Label>
            <Input
              type="date"
              value={formData.target_date}
              onChange={(e) => handleChange('target_date', e.target.value)}
              className="bg-zinc-800 border-zinc-700 text-white"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-zinc-200">End Date</Label>
            <Input
              type="date"
              value={formData.end_date}
              onChange={(e) => handleChange('end_date', e.target.value)}
              className="bg-zinc-800 border-zinc-700 text-white"
            />
          </div>
        </div>
      </div>

      {/* Drawing Sets */}
      {drawings.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-zinc-300 uppercase">Drawing Sets</h3>
          <div className="max-h-48 overflow-y-auto bg-zinc-800/50 rounded border border-zinc-700 p-3 space-y-2">
            {drawings.map(dwg => (
              <div key={dwg.id} className="flex items-center gap-2">
                <Checkbox
                  checked={formData.linked_drawing_set_ids.includes(dwg.id)}
                  onCheckedChange={() => toggleArrayItem('linked_drawing_set_ids', dwg.id)}
                />
                <label className="text-sm text-zinc-200 cursor-pointer">
                  {dwg.set_number} - {dwg.set_name} ({dwg.status})
                </label>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Deliveries */}
      {deliveries.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-zinc-300 uppercase">Linked Deliveries</h3>
          <div className="max-h-48 overflow-y-auto bg-zinc-800/50 rounded border border-zinc-700 p-3 space-y-2">
            {deliveries.map(delivery => (
              <div key={delivery.id} className="flex items-center gap-2">
                <Checkbox
                  checked={formData.linked_delivery_ids.includes(delivery.id)}
                  onCheckedChange={() => toggleArrayItem('linked_delivery_ids', delivery.id)}
                />
                <label className="text-sm text-zinc-200 cursor-pointer">
                  {delivery.package_name} - {delivery.scheduled_date ? format(new Date(delivery.scheduled_date), 'MMM d, yyyy') : 'No date'}
                </label>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label className="text-zinc-200">Assigned PM (Email)</Label>
        <Input
          type="email"
          value={formData.assigned_pm}
          onChange={(e) => handleChange('assigned_pm', e.target.value)}
          placeholder="pm@company.com"
          className="bg-zinc-800 border-zinc-700 text-white"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-zinc-200">Notes</Label>
        <Textarea
          value={formData.notes}
          onChange={(e) => handleChange('notes', e.target.value)}
          placeholder="Additional notes, constraints, coordination items..."
          className="bg-zinc-800 border-zinc-700 text-white"
          rows={3}
        />
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
        <Button type="button" variant="outline" onClick={onCancel} className="border-zinc-700">
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading} className="bg-amber-500 hover:bg-amber-600 text-black">
          {isLoading ? 'Saving...' : pkg ? 'Update' : 'Create'}
        </Button>
      </div>
    </form>
  );
}