import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from '@/components/ui/notifications';

export default function NewLoadDialog({ projectId, open, onOpenChange, onCreated }) {
  const [formData, setFormData] = useState({
    load_number: '',
    truck_id: '',
    carrier_name: '',
    driver_name: '',
    driver_phone: '',
    total_weight: '',
    is_osow: false,
    permit_number: '',
    planned_arrival_start: '',
    planned_arrival_end: ''
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      return await base44.entities.LoadTruck.create({
        ...data,
        project_id: projectId,
        status: 'planned',
        total_weight: parseFloat(data.total_weight) || 0
      });
    },
    onSuccess: () => {
      toast.success('Load created');
      onCreated();
      setFormData({
        load_number: '',
        truck_id: '',
        carrier_name: '',
        driver_name: '',
        driver_phone: '',
        total_weight: '',
        is_osow: false,
        permit_number: '',
        planned_arrival_start: '',
        planned_arrival_end: ''
      });
    },
    onError: (error) => {
      toast.error('Failed to create load: ' + error.message);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.load_number) {
      toast.error('Load number is required');
      return;
    }
    createMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-zinc-900 border-zinc-800 text-white">
        <DialogHeader>
          <DialogTitle>New Load/Truck</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Load Number *</Label>
              <Input
                value={formData.load_number}
                onChange={(e) => setFormData({ ...formData, load_number: e.target.value })}
                placeholder="e.g., LOAD-001"
                className="bg-zinc-800 border-zinc-700"
                required
              />
            </div>
            <div>
              <Label>Truck ID / License Plate</Label>
              <Input
                value={formData.truck_id}
                onChange={(e) => setFormData({ ...formData, truck_id: e.target.value })}
                placeholder="e.g., ABC-1234"
                className="bg-zinc-800 border-zinc-700"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Carrier Name</Label>
              <Input
                value={formData.carrier_name}
                onChange={(e) => setFormData({ ...formData, carrier_name: e.target.value })}
                placeholder="e.g., XYZ Trucking"
                className="bg-zinc-800 border-zinc-700"
              />
            </div>
            <div>
              <Label>Total Weight (tons)</Label>
              <Input
                type="number"
                step="0.1"
                value={formData.total_weight}
                onChange={(e) => setFormData({ ...formData, total_weight: e.target.value })}
                placeholder="0.0"
                className="bg-zinc-800 border-zinc-700"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Driver Name</Label>
              <Input
                value={formData.driver_name}
                onChange={(e) => setFormData({ ...formData, driver_name: e.target.value })}
                placeholder="Driver name"
                className="bg-zinc-800 border-zinc-700"
              />
            </div>
            <div>
              <Label>Driver Phone</Label>
              <Input
                value={formData.driver_phone}
                onChange={(e) => setFormData({ ...formData, driver_phone: e.target.value })}
                placeholder="(555) 123-4567"
                className="bg-zinc-800 border-zinc-700"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Planned Arrival Start</Label>
              <Input
                type="datetime-local"
                value={formData.planned_arrival_start}
                onChange={(e) => setFormData({ ...formData, planned_arrival_start: e.target.value })}
                className="bg-zinc-800 border-zinc-700"
              />
            </div>
            <div>
              <Label>Planned Arrival End</Label>
              <Input
                type="datetime-local"
                value={formData.planned_arrival_end}
                onChange={(e) => setFormData({ ...formData, planned_arrival_end: e.target.value })}
                className="bg-zinc-800 border-zinc-700"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="is_osow"
              checked={formData.is_osow}
              onCheckedChange={(checked) => setFormData({ ...formData, is_osow: checked })}
            />
            <Label htmlFor="is_osow" className="cursor-pointer">
              Over Size / Over Weight (OSOW)
            </Label>
          </div>

          {formData.is_osow && (
            <div>
              <Label>Permit Number</Label>
              <Input
                value={formData.permit_number}
                onChange={(e) => setFormData({ ...formData, permit_number: e.target.value })}
                placeholder="Permit #"
                className="bg-zinc-800 border-zinc-700"
              />
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-zinc-700"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending}
              className="bg-amber-500 hover:bg-amber-600 text-black"
            >
              {createMutation.isPending ? 'Creating...' : 'Create Load'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}