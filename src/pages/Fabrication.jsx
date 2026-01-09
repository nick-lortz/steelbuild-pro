import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Search, Trash2, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { toast } from '@/components/ui/notifications';
import { useConfirm } from '@/components/providers/ConfirmProvider';
import PageHeader from '@/components/ui/PageHeader';
import DataTable from '@/components/ui/DataTable';
import StatusBadge from '@/components/ui/StatusBadge';
import FabricationForm from '@/components/fabrication/FabricationForm';
import ExportButton from '@/components/shared/ExportButton';
import { format } from 'date-fns';

export default function Fabrication() {
  const [selectedProject, setSelectedProject] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [pmFilter, setPmFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const queryClient = useQueryClient();
  const { confirm } = useConfirm();

  const { data: fabrications = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['fabrications'],
    queryFn: () => base44.entities.Fabrication.list('-created_date')
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('name')
  });

  const { data: drawings = [] } = useQuery({
    queryKey: ['drawings'],
    queryFn: () => base44.entities.DrawingSet.list('set_name')
  });

  const { data: deliveries = [] } = useQuery({
    queryKey: ['deliveries'],
    queryFn: () => base44.entities.Delivery.list('scheduled_date')
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list('name')
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Fabrication.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fabrications'] });
      setShowForm(false);
      toast.success('Fabrication package created');
    },
    onError: (error) => {
      toast.error('Failed to create: ' + error.message);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Fabrication.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fabrications'] });
      setEditingItem(null);
      toast.success('Fabrication package updated');
    },
    onError: (error) => {
      toast.error('Failed to update: ' + error.message);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Fabrication.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fabrications'] });
      toast.success('Fabrication package deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete: ' + error.message);
    }
  });

  const handleDelete = async (item) => {
    const confirmed = await confirm({
      title: 'Delete Fabrication Package?',
      description: `Delete ${item.package_name}? This cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Cancel'
    });

    if (confirmed) {
      deleteMutation.mutate(item.id);
    }
  };

  const handleSubmit = (data) => {
    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const filteredFabrications = fabrications.filter((f) => {
    const project = projects.find((p) => p.id === f.project_id);
    const matchesProject = selectedProject === 'all' || f.project_id === selectedProject;
    const matchesStatus = statusFilter === 'all' || f.fabrication_status === statusFilter;
    const matchesPm = pmFilter === 'all' || project?.project_manager === pmFilter;
    const matchesSearch =
    f.package_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.description?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesProject && matchesStatus && matchesPm && matchesSearch;
  });

  const uniquePMs = [...new Set(projects.map((p) => p.project_manager).filter(Boolean))].sort();

  const fabStats = useMemo(() => ({
    inProgress: fabrications.filter(f => f.fabrication_status === 'in_progress').length,
    readyToShip: fabrications.filter(f => f.fabrication_status === 'ready_to_ship').length,
    complete: fabrications.filter(f => f.fabrication_status === 'complete').length,
    totalTons: fabrications.reduce((sum, f) => sum + (f.weight_tons || 0), 0),
  }), [fabrications]);

  const getStatusIcon = (status) => {
    if (status === 'complete') return <CheckCircle size={16} className="text-green-500" />;
    if (status === 'on_hold') return <AlertCircle size={16} className="text-red-500" />;
    return <Clock size={16} className="text-amber-500" />;
  };

  const columns = [
  {
    header: 'Package',
    accessor: 'package_name',
    render: (row) =>
    <div>
          <p className="font-medium text-white">{row.package_name}</p>
          {row.description && <p className="text-xs text-zinc-500">{row.description}</p>}
        </div>

  },
  {
    header: 'Project',
    accessor: 'project_id',
    render: (row) => {
      const project = projects.find((p) => p.id === row.project_id);
      return project ?
      <div>
            <p className="text-sm">{project.project_number}</p>
            <p className="text-xs text-zinc-500">{project.name}</p>
          </div> :
      '-';
    }
  },
  {
    header: 'Status',
    accessor: 'fabrication_status',
    render: (row) =>
    <div className="flex items-center gap-2">
          {getStatusIcon(row.fabrication_status)}
          <StatusBadge status={row.fabrication_status} />
        </div>

  },
  {
    header: 'Weight',
    accessor: 'weight_tons',
    render: (row) => row.weight_tons ? `${row.weight_tons} tons` : '-'
  },
  {
    header: 'Pieces',
    accessor: 'piece_count',
    render: (row) => row.piece_count || '-'
  },
  {
    header: 'Target',
    accessor: 'target_completion',
    render: (row) => row.target_completion ? format(new Date(row.target_completion), 'MMM d') : '-'
  },
  {
    header: 'QC',
    accessor: 'qc_status',
    render: (row) => row.qc_status ? <StatusBadge status={row.qc_status} /> : '-'
  },
  {
    header: 'Priority',
    accessor: 'priority',
    render: (row) => <StatusBadge status={row.priority} />
  },
  {
    header: '',
    accessor: 'actions',
    render: (row) =>
    <Button
      variant="ghost"
      size="icon"
      onClick={(e) => {
        e.stopPropagation();
        handleDelete(row);
      }}
      className="text-zinc-500 hover:text-red-500">

          <Trash2 size={16} />
        </Button>

  }];


  const statusCounts = {
    total: fabrications.length,
    in_progress: fabrications.filter((f) => f.fabrication_status === 'in_progress').length,
    ready: fabrications.filter((f) => f.fabrication_status === 'ready_to_ship').length,
    complete: fabrications.filter((f) => f.fabrication_status === 'completed').length
  };

  return (
    <div>
      <PageHeader
        title="Fabrication Tracking"
        subtitle={`${statusCounts.total} items tracked`}
        onRefresh={refetch}
        isRefreshing={isRefetching}
        actions={
        <div className="text-slate-50 flex gap-2">
            <ExportButton
            data={filteredFabrications}
            columns={[
            { key: 'package_name', label: 'Package' },
            { key: 'project_id', label: 'Project', formatter: (row) => projects.find((p) => p.id === row.project_id)?.name || '-' },
            { key: 'fabrication_status', label: 'Status' },
            { key: 'weight_tons', label: 'Weight (tons)' },
            { key: 'piece_count', label: 'Pieces' },
            { key: 'target_completion', label: 'Target Date' },
            { key: 'qc_status', label: 'QC Status' },
            { key: 'priority', label: 'Priority' }]
            }
            filename="fabrication" />

            <Button
            onClick={() => {
              setEditingItem(null);
              setShowForm(true);
            }}
            className="bg-amber-500 hover:bg-amber-600 text-black">

              <Plus size={18} className="mr-2" />
              New Item
            </Button>
          </div>
        } />


      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <p className="text-sm text-zinc-400">In Progress</p>
          <p className="text-2xl font-bold text-white">{statusCounts.in_progress}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <p className="text-sm text-zinc-400">Ready to Ship</p>
          <p className="text-2xl font-bold text-amber-500">{statusCounts.ready}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <p className="text-sm text-zinc-400">Completed</p>
          <p className="text-2xl font-bold text-green-500">{statusCounts.complete}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <p className="text-sm text-zinc-400">Total Packages</p>
          <p className="text-2xl font-bold text-white">{statusCounts.total}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <Input
            placeholder="Search packages..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-zinc-900 border-zinc-800 text-white" />

        </div>
        <Select value={selectedProject} onValueChange={setSelectedProject}>
          <SelectTrigger className="w-full sm:w-64 bg-zinc-900 border-zinc-800 text-white">
            <SelectValue placeholder="All Projects" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Projects</SelectItem>
            {projects.map((p) =>
            <SelectItem key={p.id} value={p.id}>
                {p.project_number} - {p.name}
              </SelectItem>
            )}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48 bg-zinc-900 border-zinc-800 text-white">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="not_started">Not Started</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="delayed">Delayed</SelectItem>
            <SelectItem value="ready_to_ship">Ready to Ship</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <Select value={pmFilter} onValueChange={setPmFilter}>
          <SelectTrigger className="w-full sm:w-48 bg-zinc-900 border-zinc-800 text-white">
            <SelectValue placeholder="Filter by PM" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All PMs</SelectItem>
            {uniquePMs.map((pm) =>
            <SelectItem key={pm} value={pm}>{pm}</SelectItem>
            )}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={filteredFabrications}
        onRowClick={(row) => setEditingItem(row)}
        emptyMessage="No fabrication packages found. Create your first package to start tracking." />


      {/* Create Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-3xl bg-zinc-900 border-zinc-800 text-white max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Fabrication Package</DialogTitle>
          </DialogHeader>
          <FabricationForm
            fabrication={null}
            projects={projects}
            drawings={drawings}
            deliveries={deliveries}
            tasks={tasks}
            onSubmit={handleSubmit}
            onCancel={() => setShowForm(false)}
            isLoading={createMutation.isPending} />

        </DialogContent>
      </Dialog>

      {/* Edit Sheet */}
      <Sheet open={!!editingItem} onOpenChange={(open) => !open && setEditingItem(null)}>
        <SheetContent className="w-full sm:max-w-3xl bg-zinc-900 border-zinc-800 text-white overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-white">Edit Fabrication Package</SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            <FabricationForm
              fabrication={editingItem}
              projects={projects}
              drawings={drawings}
              deliveries={deliveries}
              tasks={tasks}
              onSubmit={handleSubmit}
              onCancel={() => setEditingItem(null)}
              isLoading={updateMutation.isPending} />

          </div>
        </SheetContent>
      </Sheet>
    </div>);

}