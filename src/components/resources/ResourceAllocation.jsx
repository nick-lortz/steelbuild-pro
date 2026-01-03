import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus } from 'lucide-react';
import { format, isWithinInterval } from 'date-fns';

export default function ResourceAllocation() {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    resource_id: '',
    project_id: '',
    start_date: '',
    end_date: '',
    allocation_percentage: '100',
    notes: '',
  });

  const queryClient = useQueryClient();

  const { data: resources = [] } = useQuery({
    queryKey: ['resources'],
    queryFn: () => base44.entities.Resource.list('name'),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('name'),
  });

  const { data: allocations = [] } = useQuery({
    queryKey: ['resourceAllocations'],
    queryFn: () => base44.entities.ResourceAllocation.list('-start_date'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ResourceAllocation.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resourceAllocations'] });
      setShowForm(false);
      setFormData({
        resource_id: '',
        project_id: '',
        start_date: '',
        end_date: '',
        allocation_percentage: '100',
        notes: '',
      });
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      ...formData,
      allocation_percentage: parseFloat(formData.allocation_percentage) || 100,
    };
    createMutation.mutate(data);
  };

  // Group allocations by resource
  const allocationsByResource = resources.map(resource => {
    const resourceAllocations = allocations.filter(a => a.resource_id === resource.id);
    const currentAllocation = resourceAllocations.find(a => 
      isWithinInterval(new Date(), {
        start: new Date(a.start_date),
        end: new Date(a.end_date)
      })
    );
    return {
      resource,
      allocations: resourceAllocations,
      currentAllocation
    };
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-white">Resource Allocation</h3>
        <Button 
          onClick={() => setShowForm(true)}
          size="sm"
          className="bg-amber-500 hover:bg-amber-600 text-black"
        >
          <Plus size={16} className="mr-2" />
          Allocate
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {allocationsByResource.map(({ resource, allocations, currentAllocation }) => (
          <Card key={resource.id} className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                <span>{resource.name}</span>
                {currentAllocation && (
                  <span className="text-xs font-normal text-amber-400">
                    {currentAllocation.allocation_percentage}% allocated
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {allocations.length === 0 ? (
                <p className="text-sm text-zinc-500">No allocations</p>
              ) : (
                <div className="space-y-2">
                  {allocations.slice(0, 3).map(allocation => {
                    const project = projects.find(p => p.id === allocation.project_id);
                    return (
                      <div key={allocation.id} className="p-2 bg-zinc-800/50 rounded text-sm">
                        <p className="font-medium text-white">{project?.name}</p>
                        <div className="flex items-center justify-between mt-1 text-xs text-zinc-500">
                          <span>{format(new Date(allocation.start_date), 'MMM d')} - {format(new Date(allocation.end_date), 'MMM d')}</span>
                          <span>{allocation.allocation_percentage}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg bg-zinc-900 border-zinc-800 text-white">
          <DialogHeader>
            <DialogTitle>Allocate Resource</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Resource *</Label>
              <Select value={formData.resource_id} onValueChange={(v) => setFormData({ ...formData, resource_id: v })}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700">
                  <SelectValue placeholder="Select resource" />
                </SelectTrigger>
                <SelectContent>
                  {resources.map(r => (
                    <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Project *</Label>
              <Select value={formData.project_id} onValueChange={(v) => setFormData({ ...formData, project_id: v })}>
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date *</Label>
                <Input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  required
                  className="bg-zinc-800 border-zinc-700"
                />
              </div>
              <div className="space-y-2">
                <Label>End Date *</Label>
                <Input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  required
                  className="bg-zinc-800 border-zinc-700"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Allocation % *</Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={formData.allocation_percentage}
                onChange={(e) => setFormData({ ...formData, allocation_percentage: e.target.value })}
                required
                className="bg-zinc-800 border-zinc-700"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
              <Button
                type="submit"
                disabled={createMutation.isPending}
                className="bg-amber-500 hover:bg-amber-600 text-black"
              >
                {createMutation.isPending ? 'Saving...' : 'Allocate'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}