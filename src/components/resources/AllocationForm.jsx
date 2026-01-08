import React, { useState, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertTriangle } from 'lucide-react';

export default function AllocationForm({ allocation, resources, projects, workPackages, onSubmit, onCancel, isLoading }) {
  const [formData, setFormData] = useState(allocation || {
    resource_id: '',
    project_id: '',
    work_package_id: '',
    start_date: '',
    end_date: '',
    allocation_percentage: 100,
    estimated_hours: '',
    notes: '',
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const selectedResource = useMemo(() => 
    resources.find(r => r.id === formData.resource_id),
    [resources, formData.resource_id]
  );

  const projectWorkPackages = useMemo(() => 
    workPackages.filter(wp => wp.project_id === formData.project_id),
    [workPackages, formData.project_id]
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      ...formData,
      allocation_percentage: parseFloat(formData.allocation_percentage) || 100,
      estimated_hours: formData.estimated_hours ? parseFloat(formData.estimated_hours) : undefined,
    };
    onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Resource *</Label>
        <Select value={formData.resource_id} onValueChange={(v) => {
          handleChange('resource_id', v);
        }}>
          <SelectTrigger className="bg-zinc-800 border-zinc-700">
            <SelectValue placeholder="Select resource" />
          </SelectTrigger>
          <SelectContent className="max-h-60">
            {resources.map(r => (
              <SelectItem key={r.id} value={r.id}>
                <div className="flex items-center gap-2">
                  <span>{r.name}</span>
                  <Badge variant="outline" className="text-[10px] capitalize">{r.type}</Badge>
                  {r.status === 'unavailable' && (
                    <Badge variant="outline" className="text-[10px] bg-red-500/20 text-red-400">
                      Unavailable
                    </Badge>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedResource && selectedResource.status === 'unavailable' && (
          <div className="flex items-center gap-2 text-xs text-amber-400">
            <AlertTriangle size={12} />
            <span>This resource is currently unavailable</span>
          </div>
        )}
        {selectedResource && selectedResource.skills?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {selectedResource.skills.slice(0, 3).map((skill, idx) => (
              <Badge key={idx} variant="outline" className="text-[10px] bg-blue-500/10 text-blue-400">
                {skill}
              </Badge>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label>Project *</Label>
        <Select value={formData.project_id} onValueChange={(v) => {
          handleChange('project_id', v);
          handleChange('work_package_id', '');
        }}>
          <SelectTrigger className="bg-zinc-800 border-zinc-700">
            <SelectValue placeholder="Select project" />
          </SelectTrigger>
          <SelectContent className="max-h-60">
            {projects.map(p => (
              <SelectItem key={p.id} value={p.id}>
                {p.project_number} - {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {formData.project_id && projectWorkPackages.length > 0 && (
        <div className="space-y-2">
          <Label>Work Package (Optional)</Label>
          <Select value={formData.work_package_id} onValueChange={(v) => handleChange('work_package_id', v)}>
            <SelectTrigger className="bg-zinc-800 border-zinc-700">
              <SelectValue placeholder="None" />
            </SelectTrigger>
            <SelectContent className="max-h-60">
              <SelectItem value={null}>None</SelectItem>
              {projectWorkPackages.map(wp => (
                <SelectItem key={wp.id} value={wp.id}>
                  {wp.package_number || wp.id.slice(0, 8)} - {wp.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
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

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Allocation % *</Label>
          <Input
            type="number"
            min="0"
            max="100"
            step="5"
            value={formData.allocation_percentage}
            onChange={(e) => handleChange('allocation_percentage', e.target.value)}
            required
            className="bg-zinc-800 border-zinc-700"
          />
          <p className="text-xs text-zinc-500">
            {formData.allocation_percentage}% of resource's time
          </p>
        </div>

        <div className="space-y-2">
          <Label>Estimated Hours</Label>
          <Input
            type="number"
            min="0"
            step="0.5"
            value={formData.estimated_hours}
            onChange={(e) => handleChange('estimated_hours', e.target.value)}
            placeholder="Optional"
            className="bg-zinc-800 border-zinc-700"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Notes</Label>
        <Textarea
          value={formData.notes}
          onChange={(e) => handleChange('notes', e.target.value)}
          rows={2}
          placeholder="Allocation notes..."
          className="bg-zinc-800 border-zinc-700"
        />
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
        <Button type="button" variant="outline" onClick={onCancel} className="border-zinc-700">
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading} className="bg-amber-500 hover:bg-amber-600 text-black">
          {isLoading ? 'Saving...' : allocation ? 'Update' : 'Allocate'}
        </Button>
      </div>
    </form>
  );
}