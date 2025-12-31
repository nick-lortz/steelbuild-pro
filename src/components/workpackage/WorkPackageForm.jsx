import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function WorkPackageForm({ workPackage, projects, onSubmit, onCancel, isLoading }) {
  const [formData, setFormData] = useState({
    project_id: '',
    package_id: '',
    scope_type: 'other',
    description: '',
    tonnage: '',
    piece_count: '',
    baseline_start: '',
    baseline_finish: '',
    phase_status: 'not_started',
    notes: ''
  });

  useEffect(() => {
    if (workPackage) {
      setFormData({
        project_id: workPackage.project_id || '',
        package_id: workPackage.package_id || '',
        scope_type: workPackage.scope_type || 'other',
        description: workPackage.description || '',
        tonnage: workPackage.tonnage || '',
        piece_count: workPackage.piece_count || '',
        baseline_start: workPackage.baseline_start || '',
        baseline_finish: workPackage.baseline_finish || '',
        phase_status: workPackage.phase_status || 'not_started',
        notes: workPackage.notes || ''
      });
    }
  }, [workPackage]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const submitData = {
      ...formData,
      tonnage: formData.tonnage ? parseFloat(formData.tonnage) : undefined,
      piece_count: formData.piece_count ? parseInt(formData.piece_count) : undefined
    };
    onSubmit(submitData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Project *</Label>
          <Select value={formData.project_id} onValueChange={(v) => handleChange('project_id', v)} required>
            <SelectTrigger className="bg-zinc-800 border-zinc-700">
              <SelectValue placeholder="Select project" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-700">
              {projects.map(p => (
                <SelectItem key={p.id} value={p.id} className="text-white">{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Package ID *</Label>
          <Input
            value={formData.package_id}
            onChange={(e) => handleChange('package_id', e.target.value)}
            placeholder="e.g., PKG-001"
            required
            className="bg-zinc-800 border-zinc-700 text-white"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Scope Type</Label>
        <Select value={formData.scope_type} onValueChange={(v) => handleChange('scope_type', v)}>
          <SelectTrigger className="bg-zinc-800 border-zinc-700">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-700">
            <SelectItem value="columns" className="text-white">Columns</SelectItem>
            <SelectItem value="beams" className="text-white">Beams</SelectItem>
            <SelectItem value="joists" className="text-white">Joists</SelectItem>
            <SelectItem value="deck" className="text-white">Deck</SelectItem>
            <SelectItem value="stairs" className="text-white">Stairs</SelectItem>
            <SelectItem value="handrails" className="text-white">Handrails</SelectItem>
            <SelectItem value="misc_metals" className="text-white">Misc Metals</SelectItem>
            <SelectItem value="connections" className="text-white">Connections</SelectItem>
            <SelectItem value="other" className="text-white">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea
          value={formData.description}
          onChange={(e) => handleChange('description', e.target.value)}
          rows={3}
          className="bg-zinc-800 border-zinc-700 text-white"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Tonnage</Label>
          <Input
            type="number"
            step="0.01"
            value={formData.tonnage}
            onChange={(e) => handleChange('tonnage', e.target.value)}
            className="bg-zinc-800 border-zinc-700 text-white"
          />
        </div>

        <div className="space-y-2">
          <Label>Piece Count</Label>
          <Input
            type="number"
            value={formData.piece_count}
            onChange={(e) => handleChange('piece_count', e.target.value)}
            className="bg-zinc-800 border-zinc-700 text-white"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Baseline Start</Label>
          <Input
            type="date"
            value={formData.baseline_start}
            onChange={(e) => handleChange('baseline_start', e.target.value)}
            className="bg-zinc-800 border-zinc-700 text-white"
          />
        </div>

        <div className="space-y-2">
          <Label>Baseline Finish</Label>
          <Input
            type="date"
            value={formData.baseline_finish}
            onChange={(e) => handleChange('baseline_finish', e.target.value)}
            className="bg-zinc-800 border-zinc-700 text-white"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Status</Label>
        <Select value={formData.phase_status} onValueChange={(v) => handleChange('phase_status', v)}>
          <SelectTrigger className="bg-zinc-800 border-zinc-700">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-700">
            <SelectItem value="not_started" className="text-white">Not Started</SelectItem>
            <SelectItem value="in_progress" className="text-white">In Progress</SelectItem>
            <SelectItem value="complete" className="text-white">Complete</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Notes</Label>
        <Textarea
          value={formData.notes}
          onChange={(e) => handleChange('notes', e.target.value)}
          rows={3}
          className="bg-zinc-800 border-zinc-700 text-white"
        />
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
        <Button type="button" variant="outline" onClick={onCancel} className="border-zinc-700">
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading} className="bg-amber-500 hover:bg-amber-600 text-black">
          {isLoading ? 'Saving...' : workPackage ? 'Update' : 'Create'}
        </Button>
      </div>
    </form>
  );
}