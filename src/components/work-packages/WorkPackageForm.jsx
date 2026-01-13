import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from 'sonner';

export default function WorkPackageForm({
  package: pkg,
  projectId,
  sovItems = [],
  costCodes = [],
  documents = [],
  drawings = [],
  onSubmit,
  onCancel,
  isLoading
}) {
  const [formData, setFormData] = useState({
    project_id: projectId || '',
    package_number: '',
    name: '',
    description: '',
    phase: 'fabrication',
    status: 'active',
    sov_item_ids: [],
    cost_code_ids: [],
    tonnage: '',
    piece_count: '',
    start_date: '',
    target_date: '',
    estimated_hours: '',
    estimated_cost: '',
    percent_complete: '',
    assigned_to: '',
    linked_document_ids: [],
    linked_drawing_set_ids: [],
    priority: 'medium',
    notes: ''
  });

  useEffect(() => {
    if (pkg) {
      setFormData({
        project_id: pkg.project_id || projectId,
        package_number: pkg.package_number || '',
        name: pkg.name || '',
        description: pkg.description || '',
        phase: pkg.phase || 'fabrication',
        status: pkg.status || 'active',
        sov_item_ids: pkg.sov_item_ids || [],
        cost_code_ids: pkg.cost_code_ids || [],
        tonnage: pkg.tonnage || '',
        piece_count: pkg.piece_count || '',
        start_date: pkg.start_date ? pkg.start_date.split('T')[0] : '',
        target_date: pkg.target_date ? pkg.target_date.split('T')[0] : '',
        estimated_hours: pkg.estimated_hours || '',
        estimated_cost: pkg.estimated_cost || '',
        percent_complete: pkg.percent_complete || '',
        assigned_to: pkg.assigned_to || '',
        linked_document_ids: pkg.linked_document_ids || [],
        linked_drawing_set_ids: pkg.linked_drawing_set_ids || [],
        priority: pkg.priority || 'medium',
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

    if (!formData.name) {
      toast.error('Package name is required');
      return;
    }

    const submitData = {
      ...formData,
      tonnage: formData.tonnage ? parseFloat(formData.tonnage) : 0,
      piece_count: formData.piece_count ? parseInt(formData.piece_count) : 0,
      estimated_hours: formData.estimated_hours ? parseFloat(formData.estimated_hours) : 0,
      estimated_cost: formData.estimated_cost ? parseFloat(formData.estimated_cost) : 0,
      percent_complete: formData.percent_complete ? parseFloat(formData.percent_complete) : 0
    };

    onSubmit(submitData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 mt-6">
      {/* Basic Info */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-zinc-300 uppercase">Basic Information</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-zinc-200">Package Number</Label>
            <Input
              value={formData.package_number}
              onChange={(e) => handleChange('package_number', e.target.value)}
              placeholder="WP-001"
              className="bg-zinc-800 border-zinc-700 text-white"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-zinc-200">Priority</Label>
            <Select value={formData.priority} onValueChange={(v) => handleChange('priority', v)}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-zinc-200">Package Name *</Label>
          <Input
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="e.g., Level 2 North Wing"
            className="bg-zinc-800 border-zinc-700 text-white"
            required
          />
        </div>

        <div className="space-y-2">
          <Label className="text-zinc-200">Description</Label>
          <Textarea
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            placeholder="Scope details, special requirements..."
            className="bg-zinc-800 border-zinc-700 text-white"
            rows={3}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-zinc-200">Phase</Label>
            <Select value={formData.phase} onValueChange={(v) => handleChange('phase', v)}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="detailing">Detailing</SelectItem>
                <SelectItem value="fabrication">Fabrication</SelectItem>
                <SelectItem value="delivery">Delivery</SelectItem>
                <SelectItem value="erection">Erection</SelectItem>
                <SelectItem value="complete">Complete</SelectItem>
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
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="on_hold">On Hold</SelectItem>
                <SelectItem value="complete">Complete</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Quantities */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-zinc-300 uppercase">Quantities</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-zinc-200">Tonnage</Label>
            <Input
              type="number"
              step="0.01"
              value={formData.tonnage}
              onChange={(e) => handleChange('tonnage', e.target.value)}
              placeholder="0.00"
              className="bg-zinc-800 border-zinc-700 text-white"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-zinc-200">Piece Count</Label>
            <Input
              type="number"
              value={formData.piece_count}
              onChange={(e) => handleChange('piece_count', e.target.value)}
              placeholder="0"
              className="bg-zinc-800 border-zinc-700 text-white"
            />
          </div>
        </div>
      </div>

      {/* Schedule */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-zinc-300 uppercase">Schedule</h3>
        <div className="grid grid-cols-2 gap-4">
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
            <Label className="text-zinc-200">Target Date</Label>
            <Input
              type="date"
              value={formData.target_date}
              onChange={(e) => handleChange('target_date', e.target.value)}
              className="bg-zinc-800 border-zinc-700 text-white"
            />
          </div>
        </div>
      </div>

      {/* Estimates */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-zinc-300 uppercase">Estimates</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label className="text-zinc-200">Est. Hours</Label>
            <Input
              type="number"
              step="0.1"
              value={formData.estimated_hours}
              onChange={(e) => handleChange('estimated_hours', e.target.value)}
              placeholder="0"
              className="bg-zinc-800 border-zinc-700 text-white"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-zinc-200">Est. Cost</Label>
            <Input
              type="number"
              step="0.01"
              value={formData.estimated_cost}
              onChange={(e) => handleChange('estimated_cost', e.target.value)}
              placeholder="0.00"
              className="bg-zinc-800 border-zinc-700 text-white"
            />
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
      </div>

      {/* SOV Items */}
      {sovItems.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-zinc-300 uppercase">SOV Line Items</h3>
          <div className="max-h-48 overflow-y-auto bg-zinc-800/50 rounded border border-zinc-700 p-3 space-y-2">
            {sovItems.map(sov => (
              <div key={sov.id} className="flex items-center gap-2">
                <Checkbox
                  checked={formData.sov_item_ids.includes(sov.id)}
                  onCheckedChange={() => toggleArrayItem('sov_item_ids', sov.id)}
                />
                <label className="text-sm text-zinc-200 cursor-pointer">
                  {sov.sov_code} - {sov.description}
                </label>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cost Codes */}
      {costCodes.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-zinc-300 uppercase">Cost Codes</h3>
          <div className="max-h-48 overflow-y-auto bg-zinc-800/50 rounded border border-zinc-700 p-3 space-y-2">
            {costCodes.map(cc => (
              <div key={cc.id} className="flex items-center gap-2">
                <Checkbox
                  checked={formData.cost_code_ids.includes(cc.id)}
                  onCheckedChange={() => toggleArrayItem('cost_code_ids', cc.id)}
                />
                <label className="text-sm text-zinc-200 cursor-pointer">
                  {cc.code} - {cc.name}
                </label>
              </div>
            ))}
          </div>
        </div>
      )}

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

      <div className="space-y-2">
        <Label className="text-zinc-200">Assigned To (Email)</Label>
        <Input
          type="email"
          value={formData.assigned_to}
          onChange={(e) => handleChange('assigned_to', e.target.value)}
          placeholder="user@company.com"
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