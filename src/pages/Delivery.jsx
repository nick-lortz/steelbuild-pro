import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, CheckCircle } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import DataTable from '@/components/ui/DataTable';
import StatusBadge from '@/components/ui/StatusBadge';
import WorkPackageForm from '@/components/workpackage/WorkPackageForm';
import PhaseCompleteDialog from '@/components/workpackage/PhaseCompleteDialog';
import { toast } from '@/components/ui/notifications';

export default function DeliveryPage() {
  const [editingPackage, setEditingPackage] = useState(null);
  const [completingPackage, setCompletingPackage] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [projectFilter, setProjectFilter] = useState('all');

  const queryClient = useQueryClient();

  const { data: packages = [] } = useQuery({
    queryKey: ['workPackages', 'delivery'],
    queryFn: () => base44.entities.WorkPackage.filter({ current_phase: 'delivery' })
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list()
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list()
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.WorkPackage.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workPackages'] });
      setEditingPackage(null);
      toast.success('Package updated');
    },
    onError: () => toast.error('Failed to update package')
  });

  const completePhase = async (pkg) => {
    try {
      await base44.entities.WorkPackage.update(pkg.id, {
        delivery_complete: true,
        current_phase: 'installation',
        phase_status: 'not_started'
      });

      const existingInstallTask = tasks.find(t => t.work_package_id === pkg.id && t.phase === 'erection');
      
      if (!existingInstallTask) {
        const delTask = tasks.find(t => t.work_package_id === pkg.id && t.phase === 'delivery');
        const startDate = delTask?.end_date || pkg.baseline_start;
        
        await base44.entities.Task.create({
          project_id: pkg.project_id,
          work_package_id: pkg.id,
          name: `${pkg.package_id} - Installation`,
          phase: 'erection',
          start_date: startDate,
          end_date: startDate,
          duration_days: 1,
          predecessor_ids: delTask ? [delTask.id] : [],
          status: 'not_started'
        });
      }

      queryClient.invalidateQueries({ queryKey: ['workPackages'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setCompletingPackage(null);
      toast.success('Delivery complete - moved to Installation');
    } catch (error) {
      toast.error('Failed to complete phase');
    }
  };

  const filteredPackages = packages.filter(pkg => {
    const matchesSearch = !searchTerm || 
      pkg.package_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pkg.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesProject = projectFilter === 'all' || pkg.project_id === projectFilter;
    return matchesSearch && matchesProject;
  });

  const columns = [
    {
      header: 'Package ID',
      accessor: 'package_id',
      cell: (pkg) => <span className="font-medium text-white">{pkg.package_id}</span>
    },
    {
      header: 'Project',
      accessor: 'project_id',
      cell: (pkg) => {
        const project = projects.find(p => p.id === pkg.project_id);
        return <span className="text-zinc-300">{project?.name || '-'}</span>;
      }
    },
    {
      header: 'Scope',
      accessor: 'scope_type',
      cell: (pkg) => <span className="text-zinc-300 capitalize">{pkg.scope_type?.replace(/_/g, ' ')}</span>
    },
    {
      header: 'Status',
      accessor: 'phase_status',
      cell: (pkg) => <StatusBadge status={pkg.phase_status} />
    },
    {
      header: 'Tonnage',
      accessor: 'tonnage',
      cell: (pkg) => <span className="text-zinc-300">{pkg.tonnage || '-'}</span>
    },
    {
      header: 'Pieces',
      accessor: 'piece_count',
      cell: (pkg) => <span className="text-zinc-300">{pkg.piece_count || '-'}</span>
    },
    {
      header: 'Actions',
      accessor: 'actions',
      cell: (pkg) => (
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setEditingPackage(pkg)} className="border-zinc-700">
            Edit
          </Button>
          <Button 
            size="sm" 
            onClick={() => setCompletingPackage(pkg)}
            className="bg-green-600 hover:bg-green-700"
            disabled={pkg.phase_status === 'complete'}
          >
            <CheckCircle size={16} className="mr-1" />
            Complete
          </Button>
        </div>
      )
    }
  ];

  return (
    <div>
      <PageHeader
        title="Delivery"
        subtitle="Work packages in delivery phase"
      />

      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <Input
            placeholder="Search packages..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-zinc-800 border-zinc-700 text-white"
          />
        </div>

        <Select value={projectFilter} onValueChange={setProjectFilter}>
          <SelectTrigger className="w-48 bg-zinc-800 border-zinc-700">
            <SelectValue placeholder="All Projects" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-700">
            <SelectItem value="all" className="text-white">All Projects</SelectItem>
            {projects.map(p => (
              <SelectItem key={p.id} value={p.id} className="text-white">{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DataTable 
        columns={columns} 
        data={filteredPackages}
        emptyMessage="No packages in delivery"
      />

      <Dialog open={!!editingPackage} onOpenChange={() => setEditingPackage(null)}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Work Package</DialogTitle>
          </DialogHeader>
          <WorkPackageForm
            workPackage={editingPackage}
            projects={projects}
            onSubmit={(data) => updateMutation.mutate({ id: editingPackage.id, data })}
            onCancel={() => setEditingPackage(null)}
            isLoading={updateMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {completingPackage && (
        <PhaseCompleteDialog
          workPackage={completingPackage}
          phase="delivery"
          nextPhase="installation"
          onConfirm={() => completePhase(completingPackage)}
          onCancel={() => setCompletingPackage(null)}
        />
      )}
    </div>
  );
}