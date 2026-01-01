import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from "@/lib/utils";
import { parseLocalDate, formatLocalDate } from '@/components/shared/dateUtils';

export default function FabricationForm({ fabrication, projects, drawings, deliveries, tasks, onSubmit, onCancel, isLoading }) {

  const [formData, setFormData] = useState({
    project_id: fabrication?.project_id || '',
    package_name: fabrication?.package_name || '',
    description: fabrication?.description || '',
    drawing_set_id: fabrication?.drawing_set_id || '',
    weight_tons: fabrication?.weight_tons?.toString() || '',
    piece_count: fabrication?.piece_count?.toString() || '',
    fabrication_status: fabrication?.fabrication_status || 'not_started',
    shop_location: fabrication?.shop_location || '',
    start_date: fabrication?.start_date ? parseLocalDate(fabrication.start_date) : null,
    target_completion: fabrication?.target_completion ? parseLocalDate(fabrication.target_completion) : null,
    actual_completion: fabrication?.actual_completion ? parseLocalDate(fabrication.actual_completion) : null,
    qc_status: fabrication?.qc_status || 'pending',
    qc_inspector: fabrication?.qc_inspector || '',
    qc_date: fabrication?.qc_date ? parseLocalDate(fabrication.qc_date) : null,
    qc_notes: fabrication?.qc_notes || '',
    linked_delivery_id: fabrication?.linked_delivery_id || '',
    linked_erection_task_id: fabrication?.linked_erection_task_id || '',
    priority: fabrication?.priority || 'medium',
    notes: fabrication?.notes || ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.project_id || !formData.package_name) {
      alert('Project and Package Name are required');
      return;
    }

    const data = {
      ...formData,
      start_date: formatLocalDate(formData.start_date),
      target_completion: formatLocalDate(formData.target_completion),
      actual_completion: formatLocalDate(formData.actual_completion),
      qc_date: formatLocalDate(formData.qc_date),
      weight_tons: formData.weight_tons ? parseFloat(formData.weight_tons) : null,
      piece_count: formData.piece_count ? parseInt(formData.piece_count) : null
    };

    onSubmit(data);
  };

  const projectDrawings = drawings.filter((d) => d.project_id === formData.project_id);
  const projectDeliveries = deliveries.filter((d) => d.project_id === formData.project_id);
  const projectTasks = tasks.filter((t) => t.project_id === formData.project_id && t.phase === 'erection');

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Project *</Label>
          <Select value={formData.project_id} onValueChange={(v) => setFormData({ ...formData, project_id: v })}>
            <SelectTrigger className="bg-zinc-800 border-zinc-700">
              <SelectValue placeholder="Select project" />
            </SelectTrigger>
            <SelectContent>
              {projects.map((p) =>
              <SelectItem key={p.id} value={p.id}>
                  {p.project_number} - {p.name}
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Package Name *</Label>
          <Input
            value={formData.package_name}
            onChange={(e) => setFormData({ ...formData, package_name: e.target.value })}
            placeholder="Level 1 Columns"
            className="bg-zinc-800 border-zinc-700" />

        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Description</Label>
          <Input
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Package details"
            className="bg-zinc-800 border-zinc-700" />

        </div>

        <div className="space-y-2">
          <Label>Shop Location</Label>
          <Input
            value={formData.shop_location}
            onChange={(e) => setFormData({ ...formData, shop_location: e.target.value })}
            placeholder="Bay 3"
            className="bg-zinc-800 border-zinc-700" />

        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Weight (tons)</Label>
          <Input
            type="number"
            step="0.1"
            value={formData.weight_tons}
            onChange={(e) => setFormData({ ...formData, weight_tons: e.target.value })}
            className="bg-zinc-800 border-zinc-700" />

        </div>

        <div className="space-y-2">
          <Label>Piece Count</Label>
          <Input
            type="number"
            value={formData.piece_count}
            onChange={(e) => setFormData({ ...formData, piece_count: e.target.value })}
            className="bg-zinc-800 border-zinc-700" />

        </div>

        <div className="space-y-2">
          <Label>Priority</Label>
          <Select value={formData.priority} onValueChange={(v) => setFormData({ ...formData, priority: v })}>
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

      <div className="border-t border-zinc-800 pt-4">
        <h4 className="text-sm font-medium text-zinc-400 mb-3">Fabrication Status</h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={formData.fabrication_status} onValueChange={(v) => setFormData({ ...formData, fabrication_status: v })}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="not_started">Not Started</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="delayed">Delayed</SelectItem>
                <SelectItem value="ready_to_ship">Ready to Ship</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Start Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal bg-zinc-800 border-zinc-700",
                    !formData.start_date && "text-zinc-400"
                  )}>

                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.start_date ? format(formData.start_date, "PP") : "Pick date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-zinc-900 border-zinc-700">
                <Calendar
                  mode="single"
                  selected={formData.start_date}
                  onSelect={(date) => {
                    if (date) {
                      const localDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0);
                      setFormData({ ...formData, start_date: localDate });
                    } else {
                      setFormData({ ...formData, start_date: null });
                    }
                  }}
                  initialFocus className="text-slate-50 p-3 rdp" />

              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label>Target Completion</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal bg-zinc-800 border-zinc-700",
                    !formData.target_completion && "text-zinc-400"
                  )}>

                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.target_completion ? format(formData.target_completion, "PP") : "Pick date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-zinc-900 border-zinc-700">
                <Calendar
                  mode="single"
                  selected={formData.target_completion}
                  onSelect={(date) => {
                    if (date) {
                      const localDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0);
                      setFormData({ ...formData, target_completion: localDate });
                    } else {
                      setFormData({ ...formData, target_completion: null });
                    }
                  }}
                  initialFocus
                  className="text-slate-50 p-3 rdp" />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label>Actual Completion</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal bg-zinc-800 border-zinc-700",
                    !formData.actual_completion && "text-zinc-400"
                  )}>

                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.actual_completion ? format(formData.actual_completion, "PP") : "Pick date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-zinc-900 border-zinc-700">
                <Calendar
                  mode="single"
                  selected={formData.actual_completion}
                  onSelect={(date) => {
                    if (date) {
                      const localDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0);
                      setFormData({ ...formData, actual_completion: localDate });
                    } else {
                      setFormData({ ...formData, actual_completion: null });
                    }
                  }}
                  initialFocus
                  className="text-slate-50 p-3 rdp" />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>

      <div className="border-t border-zinc-800 pt-4">
        <h4 className="text-sm font-medium text-zinc-400 mb-3">Quality Control</h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>QC Status</Label>
            <Select value={formData.qc_status} onValueChange={(v) => setFormData({ ...formData, qc_status: v })}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="passed">Passed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="rework">Rework</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>QC Inspector</Label>
            <Input
              value={formData.qc_inspector}
              onChange={(e) => setFormData({ ...formData, qc_inspector: e.target.value })}
              className="bg-zinc-800 border-zinc-700" />

          </div>

          <div className="space-y-2">
            <Label>QC Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal bg-zinc-800 border-zinc-700",
                    !formData.qc_date && "text-zinc-400"
                  )}>

                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.qc_date ? format(formData.qc_date, "PP") : "Pick date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-zinc-900 border-zinc-700">
                <Calendar
                  mode="single"
                  selected={formData.qc_date}
                  onSelect={(date) => {
                    if (date) {
                      const localDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0);
                      setFormData({ ...formData, qc_date: localDate });
                    } else {
                      setFormData({ ...formData, qc_date: null });
                    }
                  }}
                  initialFocus
                  className="text-slate-50 p-3 rdp" />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label>Drawing Set</Label>
            <Select value={formData.drawing_set_id} onValueChange={(v) => setFormData({ ...formData, drawing_set_id: v })}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700">
                <SelectValue placeholder="Select drawing" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>None</SelectItem>
                {projectDrawings.map((d) =>
                <SelectItem key={d.id} value={d.id}>
                    {d.set_name} ({d.current_revision || 'No Rev'})
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2 mt-4">
          <Label>QC Notes</Label>
          <Textarea
            value={formData.qc_notes}
            onChange={(e) => setFormData({ ...formData, qc_notes: e.target.value })}
            rows={2}
            className="bg-zinc-800 border-zinc-700" />

        </div>
      </div>

      <div className="border-t border-zinc-800 pt-4">
        <h4 className="text-sm font-medium text-zinc-400 mb-3">Links</h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Link to Delivery</Label>
            <Select value={formData.linked_delivery_id} onValueChange={(v) => setFormData({ ...formData, linked_delivery_id: v })}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700">
                <SelectValue placeholder="Select delivery" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>None</SelectItem>
                {projectDeliveries.map((d) =>
                <SelectItem key={d.id} value={d.id}>
                    {d.package_name} - {format(new Date(d.scheduled_date), 'MMM d')}
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Link to Erection Task</Label>
            <Select value={formData.linked_erection_task_id} onValueChange={(v) => setFormData({ ...formData, linked_erection_task_id: v })}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700">
                <SelectValue placeholder="Select task" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>None</SelectItem>
                {projectTasks.map((t) =>
                <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {formData.fabrication_status === 'delayed' &&
      <div className="space-y-2">
          <Label>Delay Reason</Label>
          <Textarea
          value={formData.delay_reason}
          onChange={(e) => setFormData({ ...formData, delay_reason: e.target.value })}
          rows={2}
          className="bg-zinc-800 border-zinc-700" />

        </div>
      }

      <div className="space-y-2">
        <Label>Notes</Label>
        <Textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          rows={3}
          className="bg-zinc-800 border-zinc-700" />

      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
        <Button type="button" variant="outline" onClick={onCancel} className="border-zinc-700">
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading} className="bg-amber-500 hover:bg-amber-600 text-black">
          {isLoading ? 'Saving...' : fabrication ? 'Update' : 'Create'}
        </Button>
      </div>
    </form>);

}