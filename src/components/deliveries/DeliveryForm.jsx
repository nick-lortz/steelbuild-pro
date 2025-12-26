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

export default function DeliveryForm({ delivery, projects, tasks, onSubmit, onCancel, isLoading }) {
  const [formData, setFormData] = useState({
    project_id: delivery?.project_id || '',
    package_name: delivery?.package_name || '',
    package_number: delivery?.package_number || '',
    description: delivery?.description || '',
    scheduled_date: delivery?.scheduled_date ? new Date(delivery.scheduled_date) : null,
    actual_date: delivery?.actual_date ? new Date(delivery.actual_date) : null,
    delivery_status: delivery?.delivery_status || 'scheduled',
    weight_tons: delivery?.weight_tons?.toString() || '',
    piece_count: delivery?.piece_count?.toString() || '',
    carrier: delivery?.carrier || '',
    tracking_number: delivery?.tracking_number || '',
    delivery_location: delivery?.delivery_location || '',
    contact_name: delivery?.contact_name || '',
    contact_phone: delivery?.contact_phone || '',
    linked_task_ids: delivery?.linked_task_ids || [],
    notes: delivery?.notes || '',
    delay_reason: delivery?.delay_reason || '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.project_id || !formData.package_name || !formData.scheduled_date) {
      alert('Project, Package Name, and Scheduled Date are required');
      return;
    }

    const data = {
      ...formData,
      scheduled_date: formData.scheduled_date ? format(formData.scheduled_date, 'yyyy-MM-dd') : null,
      actual_date: formData.actual_date ? format(formData.actual_date, 'yyyy-MM-dd') : null,
      weight_tons: formData.weight_tons ? parseFloat(formData.weight_tons) : null,
      piece_count: formData.piece_count ? parseInt(formData.piece_count) : null,
    };

    onSubmit(data);
  };

  const projectTasks = tasks.filter(t => t.project_id === formData.project_id);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Project *</Label>
          <Select value={formData.project_id} onValueChange={(v) => setFormData({ ...formData, project_id: v })}>
            <SelectTrigger className="bg-zinc-800 border-zinc-700">
              <SelectValue placeholder="Select project" />
            </SelectTrigger>
            <SelectContent>
              {projects.map(p => (
                <SelectItem key={p.id} value={p.id}>
                  {p.project_number} - {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Delivery Status</Label>
          <Select value={formData.delivery_status} onValueChange={(v) => setFormData({ ...formData, delivery_status: v })}>
            <SelectTrigger className="bg-zinc-800 border-zinc-700">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="in_transit">In Transit</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
              <SelectItem value="delayed">Delayed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Package Name *</Label>
          <Input
            value={formData.package_name}
            onChange={(e) => setFormData({ ...formData, package_name: e.target.value })}
            placeholder="Level 1 Columns"
            className="bg-zinc-800 border-zinc-700"
          />
        </div>

        <div className="space-y-2">
          <Label>Package Number</Label>
          <Input
            value={formData.package_number}
            onChange={(e) => setFormData({ ...formData, package_number: e.target.value })}
            placeholder="PKG-001"
            className="bg-zinc-800 border-zinc-700"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={2}
          className="bg-zinc-800 border-zinc-700"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Scheduled Date *</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal bg-zinc-800 border-zinc-700",
                  !formData.scheduled_date && "text-zinc-400"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {formData.scheduled_date ? format(formData.scheduled_date, "PP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-zinc-900 border-zinc-700">
              <Calendar
                mode="single"
                selected={formData.scheduled_date}
                onSelect={(date) => setFormData({ ...formData, scheduled_date: date })}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-2">
          <Label>Actual Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal bg-zinc-800 border-zinc-700",
                  !formData.actual_date && "text-zinc-400"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {formData.actual_date ? format(formData.actual_date, "PP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-zinc-900 border-zinc-700">
              <Calendar
                mode="single"
                selected={formData.actual_date}
                onSelect={(date) => setFormData({ ...formData, actual_date: date })}
                initialFocus
              />
            </PopoverContent>
          </Popover>
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
            className="bg-zinc-800 border-zinc-700"
          />
        </div>

        <div className="space-y-2">
          <Label>Piece Count</Label>
          <Input
            type="number"
            value={formData.piece_count}
            onChange={(e) => setFormData({ ...formData, piece_count: e.target.value })}
            className="bg-zinc-800 border-zinc-700"
          />
        </div>

        <div className="space-y-2">
          <Label>Carrier</Label>
          <Input
            value={formData.carrier}
            onChange={(e) => setFormData({ ...formData, carrier: e.target.value })}
            placeholder="ABC Trucking"
            className="bg-zinc-800 border-zinc-700"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Tracking Number</Label>
          <Input
            value={formData.tracking_number}
            onChange={(e) => setFormData({ ...formData, tracking_number: e.target.value })}
            className="bg-zinc-800 border-zinc-700"
          />
        </div>

        <div className="space-y-2">
          <Label>Delivery Location</Label>
          <Input
            value={formData.delivery_location}
            onChange={(e) => setFormData({ ...formData, delivery_location: e.target.value })}
            placeholder="Site address"
            className="bg-zinc-800 border-zinc-700"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Contact Name</Label>
          <Input
            value={formData.contact_name}
            onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
            className="bg-zinc-800 border-zinc-700"
          />
        </div>

        <div className="space-y-2">
          <Label>Contact Phone</Label>
          <Input
            value={formData.contact_phone}
            onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
            className="bg-zinc-800 border-zinc-700"
          />
        </div>
      </div>

      {formData.delivery_status === 'delayed' && (
        <div className="space-y-2">
          <Label>Delay Reason</Label>
          <Textarea
            value={formData.delay_reason}
            onChange={(e) => setFormData({ ...formData, delay_reason: e.target.value })}
            rows={2}
            className="bg-zinc-800 border-zinc-700"
          />
        </div>
      )}

      <div className="space-y-2">
        <Label>Notes</Label>
        <Textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          rows={2}
          className="bg-zinc-800 border-zinc-700"
        />
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="border-zinc-700"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isLoading}
          className="bg-amber-500 hover:bg-amber-600 text-black"
        >
          {isLoading ? 'Saving...' : delivery ? 'Update' : 'Create'}
        </Button>
      </div>
    </form>
  );
}