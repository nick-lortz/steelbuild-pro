import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActiveProject } from '@/components/shared/hooks/useActiveProject';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Package, CheckCircle2, AlertTriangle, Trash2 } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import DataTable from '../components/ui/DataTable';
import StatusBadge from '../components/ui/StatusBadge';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function WorkPackages() {
  const { activeProjectId } = useActiveProject();
  const [showForm, setShowForm] = useState(false);
  const [editingPackage, setEditingPackage] = useState(null);
  const [completingPhase, setCompletingPhase] = useState(null);
  const [deletePackage, setDeletePackage] = useState(null);
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: allProjects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list(),
  });

  const projects = currentUser?.role === 'admin' 
    ? allProjects 
    : allProjects.filter(p => p.assigned_users?.includes(currentUser?.email));

  const { data: workPackages = [], isLoading } = useQuery({
    queryKey: ['work-packages', activeProjectId],
    queryFn: () => base44.entities.WorkPackage.filter({ project_id: activeProjectId }, '-created_date'),
    enabled: !!activeProjectId
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks', activeProjectId],
    queryFn: () => base44.entities.Task.filter({ project_id: activeProjectId }),
    enabled: !!activeProjectId
  });

  if (!activeProjectId) {
    return (
      <div>
        <PageHeader 
          title="Work Packages" 
          subtitle="Select a project to view work packages"
          showBackButton={false}
        />
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <Package size={48} className="mx-auto mb-4 text-zinc-600" />
            <h3 className="text-xl font-semibold text-white mb-2">No Project Selected</h3>
            <p className="text-zinc-400">Select a project from the dashboard to view its work packages.</p>
          </div>
        </div>
      </div>
    );
  }

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.WorkPackage.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['work-packages', activeProjectId]);
      setShowForm(false);
      toast.success('Work package created');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.WorkPackage.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['work-packages', activeProjectId]);
      setShowForm(false);
      setEditingPackage(null);
      toast.success('Work package updated');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (work_package_id) => {
      const response = await base44.functions.invoke('cascadeDeleteWorkPackage', { work_package_id });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['work-packages', activeProjectId]);
      queryClient.invalidateQueries(['tasks', activeProjectId]);
      setDeletePackage(null);
      toast.success(data.message || 'Work package deleted');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to delete work package');
    }
  });

  const advancePhase = useMutation({
    mutationFn: async ({ work_package_id, next_phase }) => {
      const response = await base44.functions.invoke('advanceWorkPackagePhase', {
        work_package_id,
        next_phase
      });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['work-packages', activeProjectId]);
      queryClient.invalidateQueries(['tasks', activeProjectId]);
      setCompletingPhase(null);
      toast.success(data.message || 'Phase advanced');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to advance phase');
    }
  });

  const handleEdit = (pkg) => {
    setEditingPackage(pkg);
    setShowForm(true);
  };

  const handleCompletePhase = (pkg, nextPhase) => {
    setCompletingPhase({ package: pkg, nextPhase });
  };

  const confirmCompletePhase = () => {
    if (completingPhase) {
      advancePhase.mutate({
        work_package_id: completingPhase.package.id,
        next_phase: completingPhase.nextPhase
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
    render: (pkg) => <StatusBadge status={pkg.phase} />
  },
  {
    header: 'Status',
    render: (pkg) => <StatusBadge status={pkg.status} />
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
      const phaseMap = {
        'detailing': { next: 'fabrication', label: 'Advance to Fabrication' },
        'fabrication': { next: 'delivery', label: 'Advance to Delivery' },
        'delivery': { next: 'erection', label: 'Advance to Erection' },
        'erection': { next: 'complete', label: 'Mark Complete' }
      };

      const currentPhase = phaseMap[pkg.phase];

      return (
        <div className="flex items-center gap-2">
            {currentPhase && pkg.status !== 'complete' &&
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              handleCompletePhase(pkg, currentPhase.next);
            }}
            className="border-green-700 text-green-400 hover:bg-green-500/10">

                {currentPhase.label}
              </Button>
          }
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                setDeletePackage(pkg);
              }}
              className="text-zinc-500 hover:text-red-400 hover:bg-red-500/10">

              <Trash2 size={16} />
            </Button>
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
                  <li>Complete all tasks in current phase</li>
                  <li>Advance to {completingPhase?.nextPhase} phase</li>
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
                disabled={advancePhase.isPending}
                className="bg-amber-500 hover:bg-amber-600 text-black">

                {advancePhase.isPending ? 'Processing...' : 'Advance Phase'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletePackage} onOpenChange={() => setDeletePackage(null)}>
        <AlertDialogContent className="bg-zinc-900 border-zinc-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete Work Package?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              Are you sure you want to delete "{deletePackage?.package_number} - {deletePackage?.name}"? 
              This will also delete all associated tasks ({getPackageTaskCount(deletePackage?.id || '')} tasks). 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-zinc-700 text-white hover:bg-zinc-800">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate(deletePackage.id)}
              className="bg-red-500 hover:bg-red-600">

              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>);

}

function WorkPackageForm({ package: pkg, projects, onSubmit, onCancel, isLoading }) {
  const [formData, setFormData] = useState({
    project_id: '',
    name: '',
    description: '',
    start_date: '',
    end_date: '',
    estimated_hours: '',
    estimated_cost: '',
    notes: ''
  });

  React.useEffect(() => {
    if (pkg) {
      setFormData({
        project_id: pkg.project_id || '',
        name: pkg.name || '',
        description: pkg.description || '',
        start_date: pkg.start_date || '',
        end_date: pkg.end_date || '',
        estimated_hours: pkg.estimated_hours || '',
        estimated_cost: pkg.estimated_cost || '',
        notes: pkg.notes || ''
      });
    }
  }, [pkg]);

  const handleChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.project_id) {
      toast.error('Project is required');
      return;
    }
    
    if (!formData.name) {
      toast.error('Name is required');
      return;
    }
    
    const submitData = {
      ...formData,
      estimated_hours: formData.estimated_hours ? parseFloat(formData.estimated_hours) : 0,
      estimated_cost: formData.estimated_cost ? parseFloat(formData.estimated_cost) : 0
    };
    
    onSubmit(submitData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 mt-6">
      <div className="space-y-2">
        <Label className="text-slate-50 text-sm font-medium">Project *</Label>
        <Select value={formData.project_id} onValueChange={(v) => handleChange('project_id', v)} required>
          <SelectTrigger className="bg-zinc-800 border-zinc-700">
            <SelectValue placeholder="Select project" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-700 max-h-60">
            {projects.map((p) =>
            <SelectItem key={p.id} value={p.id} className="text-white">
                {p.project_number} - {p.name}
              </SelectItem>
            )}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="text-slate-50 text-sm font-medium">Name *</Label>
        <Input
          value={formData.name}
          onChange={(e) => handleChange('name', e.target.value)}
          placeholder="e.g., Level 2 North Wing"
          className="bg-zinc-800 border-zinc-700 text-white"
          required />
      </div>

      <div className="space-y-2">
        <Label className="text-slate-50 text-sm font-medium">Description</Label>
        <Textarea
          value={formData.description}
          onChange={(e) => handleChange('description', e.target.value)}
          placeholder="Scope details..."
          className="bg-zinc-800 border-zinc-700 text-white"
          rows={3} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-slate-50 text-sm font-medium">Start Date</Label>
          <Input
            type="date"
            value={formData.start_date}
            onChange={(e) => handleChange('start_date', e.target.value)}
            className="bg-zinc-800 border-zinc-700 text-white" />
        </div>

        <div className="space-y-2">
          <Label className="text-slate-50 text-sm font-medium">End Date</Label>
          <Input
            type="date"
            value={formData.end_date}
            onChange={(e) => handleChange('end_date', e.target.value)}
            className="bg-zinc-800 border-zinc-700 text-white" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-slate-50 text-sm font-medium">Estimated Hours</Label>
          <Input
            type="number"
            step="0.01"
            value={formData.estimated_hours}
            onChange={(e) => handleChange('estimated_hours', e.target.value)}
            placeholder="0"
            className="bg-zinc-800 border-zinc-700 text-white" />
        </div>

        <div className="space-y-2">
          <Label className="text-slate-50 text-sm font-medium">Estimated Cost</Label>
          <Input
            type="number"
            step="0.01"
            value={formData.estimated_cost}
            onChange={(e) => handleChange('estimated_cost', e.target.value)}
            placeholder="0.00"
            className="bg-zinc-800 border-zinc-700 text-white" />
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-slate-50 text-sm font-medium">Notes</Label>
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