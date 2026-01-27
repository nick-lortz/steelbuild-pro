import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Trash2, X } from 'lucide-react';
import { format, differenceInDays, parseISO } from 'date-fns';
import QuickResourceAssign from '@/components/resources/QuickResourceAssign';

export default function ActivityForm({ 
  projectId, 
  activity, 
  users, 
  resources, 
  drawingSets, 
  rfis, 
  onSubmit, 
  onDelete, 
  isLoading, 
  isEdit 
}) {
  const [formData, setFormData] = useState(activity || {
    name: '',
    phase: 'fabrication',
    activity_type: 'fabrication',
    start_date: format(new Date(), 'yyyy-MM-dd'),
    end_date: format(new Date(), 'yyyy-MM-dd'),
    status: 'planned',
    progress_percent: 0,
    is_critical: false,
    is_milestone: false,
    responsible_party_id: '',
    resource_ids: [],
    constraint_notes: '',
    linked_drawing_ids: [],
    linked_rfi_ids: [],
    notes: ''
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleArrayItem = (field, itemId) => {
    setFormData(prev => ({
      ...prev,
      [field]: (prev[field] || []).includes(itemId)
        ? prev[field].filter(id => id !== itemId)
        : [...(prev[field] || []), itemId]
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const duration = formData.start_date && formData.end_date
    ? differenceInDays(parseISO(formData.end_date), parseISO(formData.start_date)) + 1
    : 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Activity Name *</Label>
        <Input
          value={formData.name}
          onChange={(e) => handleChange('name', e.target.value)}
          placeholder="e.g., Erect Level 1 Columns"
          required
          className="bg-zinc-800 border-zinc-700"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Phase *</Label>
          <Select value={formData.phase} onValueChange={(v) => handleChange('phase', v)}>
            <SelectTrigger className="bg-zinc-800 border-zinc-700">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-800">
              <SelectItem value="detailing">Detailing</SelectItem>
              <SelectItem value="fabrication">Fabrication</SelectItem>
              <SelectItem value="delivery">Delivery</SelectItem>
              <SelectItem value="erection">Erection</SelectItem>
              <SelectItem value="closeout">Closeout</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Activity Type *</Label>
          <Select value={formData.activity_type} onValueChange={(v) => handleChange('activity_type', v)}>
            <SelectTrigger className="bg-zinc-800 border-zinc-700">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-800">
              <SelectItem value="engineering">Engineering</SelectItem>
              <SelectItem value="procurement">Procurement</SelectItem>
              <SelectItem value="fabrication">Fabrication</SelectItem>
              <SelectItem value="delivery">Delivery</SelectItem>
              <SelectItem value="erection">Erection</SelectItem>
              <SelectItem value="inspection">Inspection</SelectItem>
              <SelectItem value="closeout">Closeout</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

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
          <Label>End Date *</Label>
          <Input
            type="date"
            value={formData.end_date}
            onChange={(e) => handleChange('end_date', e.target.value)}
            required
            className="bg-zinc-800 border-zinc-700"
          />
        </div>
        <div className="space-y-2">
          <Label>Duration</Label>
          <div className="h-9 flex items-center px-3 bg-zinc-800/50 border border-zinc-700 rounded text-sm">
            {duration} day{duration !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Status</Label>
          <Select value={formData.status} onValueChange={(v) => handleChange('status', v)}>
            <SelectTrigger className="bg-zinc-800 border-zinc-700">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-800">
              <SelectItem value="planned">Planned</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="delayed">Delayed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Responsible Party</Label>
          <Select value={formData.responsible_party_id} onValueChange={(v) => handleChange('responsible_party_id', v)}>
            <SelectTrigger className="bg-zinc-800 border-zinc-700">
              <SelectValue placeholder="Select user" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-800">
              {users.map(u => (
                <SelectItem key={u.email} value={u.email}>
                  {u.full_name || u.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <Checkbox
            checked={formData.is_critical}
            onCheckedChange={(checked) => handleChange('is_critical', checked)}
          />
          <Label className="text-sm font-medium text-amber-400">Critical Path</Label>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            checked={formData.is_milestone}
            onCheckedChange={(checked) => handleChange('is_milestone', checked)}
          />
          <Label className="text-sm">Milestone</Label>
        </div>
      </div>

      {/* Resources */}
      {resources.length > 0 && (
        <div className="space-y-2">
          <Label>Assigned Resources</Label>
          <QuickResourceAssign
            selectedResourceIds={formData.resource_ids || []}
            resources={resources}
            onChange={(ids) => handleChange('resource_ids', ids)}
            placeholder="Assign resources..."
            triggerClassName="w-full bg-zinc-800 border-zinc-700"
          />
        </div>
      )}

      {/* Linked Drawings */}
      {drawingSets.length > 0 && (
        <Card className="bg-zinc-800/50 border-zinc-700">
          <CardContent className="p-3">
            <Label className="text-xs text-zinc-400 mb-2 block">Linked Drawings</Label>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {drawingSets.map(ds => (
                <div key={ds.id} className="flex items-center gap-2 text-xs">
                  <Checkbox
                    checked={(formData.linked_drawing_ids || []).includes(ds.id)}
                    onCheckedChange={() => toggleArrayItem('linked_drawing_ids', ds.id)}
                  />
                  <span className="flex-1">{ds.set_name}</span>
                  <Badge variant="outline" className="text-[9px] px-1">
                    {ds.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Linked RFIs */}
      {rfis.length > 0 && (
        <Card className="bg-zinc-800/50 border-zinc-700">
          <CardContent className="p-3">
            <Label className="text-xs text-zinc-400 mb-2 block">Linked RFIs</Label>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {rfis.map(rfi => (
                <div key={rfi.id} className="flex items-center gap-2 text-xs">
                  <Checkbox
                    checked={(formData.linked_rfi_ids || []).includes(rfi.id)}
                    onCheckedChange={() => toggleArrayItem('linked_rfi_ids', rfi.id)}
                  />
                  <span className="flex-1">RFI-{rfi.rfi_number}: {rfi.subject}</span>
                  <Badge variant="outline" className="text-[9px] px-1">
                    {rfi.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        <Label>Constraint Notes</Label>
        <Textarea
          value={formData.constraint_notes}
          onChange={(e) => handleChange('constraint_notes', e.target.value)}
          placeholder="List blocking issues, material lead times, approvals needed, etc."
          rows={3}
          className="bg-zinc-800 border-zinc-700"
        />
      </div>

      <div className="space-y-2">
        <Label>Notes</Label>
        <Textarea
          value={formData.notes}
          onChange={(e) => handleChange('notes', e.target.value)}
          placeholder="Additional details"
          rows={2}
          className="bg-zinc-800 border-zinc-700"
        />
      </div>

      <div className="flex justify-between gap-3 pt-4 border-t border-zinc-800">
        {isEdit && onDelete && (
          <Button
            type="button"
            variant="destructive"
            onClick={onDelete}
            disabled={isLoading}
          >
            <Trash2 size={16} className="mr-2" />
            Delete
          </Button>
        )}
        <div className="flex gap-2 ml-auto">
          <Button
            type="submit"
            disabled={isLoading}
            className="bg-amber-500 hover:bg-amber-600 text-black"
          >
            {isLoading ? 'Saving...' : isEdit ? 'Update Activity' : 'Create Activity'}
          </Button>
        </div>
      </div>
    </form>
  );
}