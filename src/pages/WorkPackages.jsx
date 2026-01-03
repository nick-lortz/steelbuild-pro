import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Plus, Package, CheckCircle2, AlertTriangle } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import DataTable from '../components/ui/DataTable';
import StatusBadge from '../components/ui/StatusBadge';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function WorkPackages() {
  const [showForm, setShowForm] = useState(false);
  const [editingPackage, setEditingPackage] = useState(null);
  const [completingPhase, setCompletingPhase] = useState(null);
  const queryClient = useQueryClient();

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list()
  });

  const { data: workPackages = [], isLoading } = useQuery({
    queryKey: ['work-packages'],
    queryFn: () => base44.entities.WorkPackage.list('-created_date')
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list()
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.WorkPackage.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['work-packages']);
      setShowForm(false);
      toast.success('Work package created');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.WorkPackage.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['work-packages']);
      setShowForm(false);
      setEditingPackage(null);
      toast.success('Work package updated');
    }
  });

  const completePhase = useMutation({
    mutationFn: async ({ work_package_id, phase_completed }) => {
      const response = await base44.functions.invoke('workPackageLifecycle', {
        work_package_id,
        phase_completed
      });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['work-packages']);
      queryClient.invalidateQueries(['tasks']);
      setCompletingPhase(null);
      toast.success(`${data.next_phase ? `Advanced to ${data.next_phase}` : 'Package completed'} - ${data.new_tasks?.length || 0} tasks created`);
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to complete phase');
    }
  });

  const handleEdit = (pkg) => {
    setEditingPackage(pkg);
    setShowForm(true);
  };

  const handleCompletePhase = (pkg, phase) => {
    setCompletingPhase({ package: pkg, phase });
  };

  const confirmCompletePhase = () => {
    if (completingPhase) {
      completePhase.mutate({
        work_package_id: completingPhase.package.id,
        phase_completed: completingPhase.phase
      });
    }
  };

  const getPackageTaskCount = (packageId) => {
    return tasks.filter((t) => t.work_package_id === packageId).length;
  };

  const columns = [
  {
    header: 'Package #',
    accessor: 'package_number',
    render: (pkg) =>
    <div className="font-medium text-white">{pkg.package_number}</div>

  },
  {
    header: 'Name',
    accessor: 'name',
    render: (pkg) => {
      const project = projects.find((p) => p.id === pkg.project_id);
      return (
        <div>
            <div className="text-white">{pkg.name}</div>
            <div className="text-xs text-zinc-400">{project?.project_number}</div>
          </div>);

    }
  },
  {
    header: 'Phase',
    render: (pkg) => <StatusBadge status={pkg.current_phase} />
  },
  {
    header: 'Progress',
    render: (pkg) => {
      const phases = ['detailing', 'fabrication', 'delivery', 'erection'];
      const completedCount = phases.filter((p) => pkg[`${p}_complete`]).length;
      return (
        <div className="space-y-1">
            <div className="text-xs text-zinc-400">{completedCount}/4 phases</div>
            <div className="w-full bg-zinc-800 rounded-full h-1.5">
              <div
              className="bg-amber-500 h-1.5 rounded-full"
              style={{ width: `${completedCount / 4 * 100}%` }} />

            </div>
          </div>);

    }
  },
  {
    header: 'Tonnage',
    render: (pkg) =>
    <div className="text-zinc-200">{pkg.tonnage || '-'} tons</div>

  },
  {
    header: 'Tasks',
    render: (pkg) =>
    <div className="text-zinc-200">{getPackageTaskCount(pkg.id)}</div>

  },
  {
    header: 'Actions',
    render: (pkg) => {
      const canCompleteDetailing = !pkg.detailing_complete;
      const canCompleteFabrication = pkg.detailing_complete && !pkg.fabrication_complete;
      const canCompleteDelivery = pkg.fabrication_complete && !pkg.delivery_complete;
      const canCompleteErection = pkg.delivery_complete && !pkg.erection_complete;

      return (
        <div className="flex items-center gap-2">
            {canCompleteDetailing &&
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              handleCompletePhase(pkg, 'detailing');
            }}
            className="border-green-700 text-green-400 hover:bg-green-500/10">

                Complete Detailing
              </Button>
          }
            {canCompleteFabrication &&
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              handleCompletePhase(pkg, 'fabrication');
            }}
            className="border-green-700 text-green-400 hover:bg-green-500/10">

                Complete Fabrication
              </Button>
          }
            {canCompleteDelivery &&
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              handleCompletePhase(pkg, 'delivery');
            }}
            className="border-green-700 text-green-400 hover:bg-green-500/10">

                Complete Delivery
              </Button>
          }
            {canCompleteErection &&
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              handleCompletePhase(pkg, 'erection');
            }}
            className="border-green-700 text-green-400 hover:bg-green-500/10">

                Complete Erection
              </Button>
          }
          </div>);

    }
  }];


  return (
    <div>
      <PageHeader
        title="Work Packages"
        subtitle="Manage fabrication packages with automated phase transitions"
        actions={
        <Button onClick={() => setShowForm(true)} className="bg-amber-500 hover:bg-amber-600 text-black">
            <Plus size={18} className="mr-2" />
            New Work Package
          </Button>
        } />


      {isLoading ?
      <div className="text-center text-zinc-400 py-12">Loading...</div> :

      <DataTable
        columns={columns}
        data={workPackages}
        onRowClick={handleEdit}
        emptyMessage="No work packages found. Create one to get started." />

      }

      <Sheet open={showForm} onOpenChange={(open) => {
        setShowForm(open);
        if (!open) setEditingPackage(null);
      }}>
        <SheetContent className="bg-zinc-900 border-zinc-800 overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-white">
              {editingPackage ? 'Edit Work Package' : 'New Work Package'}
            </SheetTitle>
          </SheetHeader>
          <WorkPackageForm
            package={editingPackage}
            projects={projects}
            onSubmit={(data) => {
              if (editingPackage) {
                updateMutation.mutate({ id: editingPackage.id, data });
              } else {
                createMutation.mutate(data);
              }
            }}
            onCancel={() => {
              setShowForm(false);
              setEditingPackage(null);
            }}
            isLoading={createMutation.isPending || updateMutation.isPending} />

        </SheetContent>
      </Sheet>

      <Dialog open={!!completingPhase} onOpenChange={() => setCompletingPhase(null)}>
        <DialogContent className="bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-white">Complete Phase</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <AlertTriangle className="text-amber-400 flex-shrink-0 mt-0.5" size={20} />
              <div className="text-sm text-zinc-200">
                <p className="font-medium mb-1">This will:</p>
                <ul className="list-disc list-inside space-y-1 text-zinc-400">
                  <li>Lock all {completingPhase?.phase} tasks as read-only</li>
                  <li>Advance to the next phase</li>
                  <li>Generate new tasks for the next phase</li>
                  <li>This action cannot be undone</li>
                </ul>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setCompletingPhase(null)}
                className="border-zinc-700">

                Cancel
              </Button>
              <Button
                onClick={confirmCompletePhase}
                disabled={completePhase.isPending}
                className="bg-amber-500 hover:bg-amber-600 text-black">

                {completePhase.isPending ? 'Processing...' : 'Complete Phase'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>);

}

function WorkPackageForm({ package: pkg, projects, onSubmit, onCancel, isLoading }) {
  const [formData, setFormData] = useState(pkg || {
    project_id: '',
    package_number: '',
    name: '',
    description: '',
    tonnage: '',
    piece_count: '',
    priority: 'medium',
    notes: ''
  });

  const handleChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 mt-6">
      <div className="text-slate-50 space-y-2">
        <Label>Project</Label>
        <Select value={formData.project_id} onValueChange={(v) => handleChange('project_id', v)}>
          <SelectTrigger className="bg-zinc-800 border-zinc-700">
            <SelectValue placeholder="Select project" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-700">
            {projects.map((p) =>
            <SelectItem key={p.id} value={p.id} className="text-white">
                {p.project_number} - {p.name}
              </SelectItem>
            )}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="text-slate-50 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Package Number</Label>
        <Input
          value={formData.package_number}
          onChange={(e) => handleChange('package_number', e.target.value)}
          placeholder="e.g., WP-001, WP-L2-NORTH"
          className="bg-zinc-800 border-zinc-700 text-white"
          required />

      </div>

      <div className="space-y-2">
        <Label className="text-slate-50 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Package Name</Label>
        <Input
          value={formData.name}
          onChange={(e) => handleChange('name', e.target.value)}
          placeholder="Descriptive name"
          className="bg-zinc-800 border-zinc-700 text-white"
          required />

      </div>

      <div className="space-y-2">
        <Label className="text-slate-50 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Description</Label>
        <Textarea
          value={formData.description}
          onChange={(e) => handleChange('description', e.target.value)}
          placeholder="Scope details..."
          className="bg-zinc-800 border-zinc-700 text-white"
          rows={3} />

      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-slate-50 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Tonnage</Label>
          <Input
            type="number"
            step="0.01"
            value={formData.tonnage}
            onChange={(e) => handleChange('tonnage', e.target.value)}
            placeholder="Total tons"
            className="bg-zinc-800 border-zinc-700 text-white" />

        </div>

        <div className="space-y-2">
          <Label className="text-slate-50 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Piece Count</Label>
          <Input
            type="number"
            value={formData.piece_count}
            onChange={(e) => handleChange('piece_count', e.target.value)}
            placeholder="Number of pieces"
            className="bg-zinc-800 border-zinc-700 text-white" />

        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-slate-50 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Priority</Label>
        <Select value={formData.priority} onValueChange={(v) => handleChange('priority', v)}>
          <SelectTrigger className="bg-zinc-800 border-zinc-700">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-700">
            <SelectItem value="low" className="text-white">Low</SelectItem>
            <SelectItem value="medium" className="text-white">Medium</SelectItem>
            <SelectItem value="high" className="text-white">High</SelectItem>
            <SelectItem value="critical" className="text-white">Critical</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="text-slate-50 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Notes</Label>
        <Textarea
          value={formData.notes}
          onChange={(e) => handleChange('notes', e.target.value)}
          placeholder="Additional notes..."
          className="bg-zinc-800 border-zinc-700 text-white"
          rows={2} />

      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
        <Button type="button" variant="outline" onClick={onCancel} className="border-zinc-700">
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading} className="bg-amber-500 hover:bg-amber-600 text-black">
          {isLoading ? 'Saving...' : pkg ? 'Update' : 'Create'}
        </Button>
      </div>
    </form>);

}