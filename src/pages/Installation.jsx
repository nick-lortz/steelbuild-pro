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
import { toast } from '@/components/ui/notifications';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function InstallationPage() {
  const [editingPackage, setEditingPackage] = useState(null);
  const [completingPackage, setCompletingPackage] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [projectFilter, setProjectFilter] = useState('all');

  const queryClient = useQueryClient();

  const { data: packages = [] } = useQuery({
    queryKey: ['workPackages', 'installation'],
    queryFn: () => base44.entities.WorkPackage.filter({ current_phase: 'installation' })
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list()
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

  const completePhase = async () => {
    try {
      await base44.entities.WorkPackage.update(completingPackage.id, {
        installation_complete: true,
        phase_status: 'complete',
        actual_finish: new Date().toISOString().split('T')[0]
      });

      queryClient.invalidateQueries({ queryKey: ['workPackages'] });
      setCompletingPackage(null);
      toast.success('Installation complete - package closed');
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
        title="Installation"
        subtitle="Work packages in installation phase"
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
        emptyMessage="No packages in installation"
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

      <AlertDialog open={!!completingPackage} onOpenChange={() => setCompletingPackage(null)}>
        <AlertDialogContent className="bg-zinc-900 border-zinc-800 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Complete Installation?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              This will mark <strong className="text-white">{completingPackage?.package_id}</strong> as fully complete. 
              This is the final phase and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-zinc-800 border-zinc-700 text-white">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={completePhase} className="bg-green-600 hover:bg-green-700">
              Complete Installation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}