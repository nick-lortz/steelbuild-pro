import React, { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from '@/components/ui/notifications';
import { useConfirm } from '@/components/providers/ConfirmProvider';
import { usePermissions } from '@/components/shared/usePermissions';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue } from
"@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle } from
"@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle } from
"@/components/ui/sheet";
import { Plus, Search, Building2, MapPin, Calendar, User, Trash2, TrendingUp, Eye } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import ProjectHealthWidget from '@/components/projects/ProjectHealthWidget';
import { calculateProjectProgress } from '@/components/shared/projectProgressUtils';
import PageHeader from '@/components/ui/PageHeader';
import DataTable from '@/components/ui/DataTable';
import StatusBadge from '@/components/ui/StatusBadge';
import DemoProjectSeeder from '@/components/projects/DemoProjectSeeder';
import { format } from 'date-fns';


const initialFormState = {
  project_number: '',
  name: '',
  client: '',
  location: '',
  status: 'bidding',
  contract_value: '',
  start_date: '',
  target_completion: '',
  project_manager: '',
  superintendent: '',
  assigned_users: [],
  gc_contact: '',
  gc_email: '',
  gc_phone: '',
  scope_of_work: '',
  exclusions: '',
  notes: ''
};

export default function Projects() {
  const [showForm, setShowForm] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [formData, setFormData] = useState(initialFormState);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [pmFilter, setPmFilter] = useState('all');

  const queryClient = useQueryClient();
  const { confirm } = useConfirm();
  const { can } = usePermissions();

  const { data: projects = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('-created_date'),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list('full_name'),
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list('start_date'),
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000
  });

  const { data: financials = [] } = useQuery({
    queryKey: ['financials'],
    queryFn: () => base44.entities.Financial.list(),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000
  });

  const { data: changeOrders = [] } = useQuery({
    queryKey: ['change-orders'],
    queryFn: () => base44.entities.ChangeOrder.list(),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000
  });

  const { data: rfis = [] } = useQuery({
    queryKey: ['rfis'],
    queryFn: () => base44.entities.RFI.list(),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Project.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setShowForm(false);
      setFormData(initialFormState);
      toast.success('Project created successfully');
    },
    onError: (error) => {
      toast.error('Failed to create project: ' + error.message);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Project.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setSelectedProject(null);
      setFormData(initialFormState);
      toast.success('Project updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update project: ' + error.message);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Project.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Project deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete project: ' + error.message);
    }
  });

  const handleDelete = useCallback(async (project) => {
    if (!can.deleteProject) {
      toast.error('You do not have permission to delete projects');
      return;
    }

    const confirmed = await confirm({
      title: 'Delete Project?',
      description: `Are you sure you want to delete "${project.name}"? This action cannot be undone and will affect all related data.`,
      confirmText: 'Delete',
      cancelText: 'Cancel'
    });

    if (confirmed) {
      deleteMutation.mutate(project.id);
    }
  }, [can.deleteProject, confirm, deleteMutation]);

  const handleEdit = (project) => {
    if (!can.editProject) {
      toast.error('You do not have permission to edit projects');
      return;
    }
    setFormData({
      ...project,
      contract_value: project.contract_value?.toString() || '',
      assigned_users: project.assigned_users || []
    });
    setSelectedProject(project);
  };

  const handleViewDashboard = (project, e) => {
    if (e) e.stopPropagation();
    window.location.href = `/ProjectDashboard?id=${project.id}`;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (selectedProject && !can.editProject) {
      toast.error('You do not have permission to edit projects');
      return;
    }

    if (!selectedProject && !can.createProject) {
      toast.error('You do not have permission to create projects');
      return;
    }

    const data = {
      ...formData,
      contract_value: formData.contract_value ? parseFloat(formData.contract_value) : null
    };

    if (selectedProject) {
      updateMutation.mutate({ id: selectedProject.id, data });
    } else {
      createMutation.mutate(data);
    }
  };



  const filteredProjects = projects.filter((p) => {
    const matchesSearch =
    p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.project_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.client?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    const matchesPm = pmFilter === 'all' || p.project_manager === pmFilter;
    return matchesSearch && matchesStatus && matchesPm;
  });

  const uniquePMs = [...new Set(projects.map((p) => p.project_manager).filter(Boolean))].sort();

  const columns = [
  {
    header: 'Project #',
    accessor: 'project_number',
    render: (row) =>
    <div className="flex items-center gap-2">
          <span className="font-mono text-amber-500">{row.project_number}</span>
          <Button
        variant="ghost"
        size="sm"
        onClick={(e) => handleViewDashboard(row, e)}
        className="text-blue-400 hover:text-blue-300 text-xs">

            Dashboard →
          </Button>
        </div>

  },
  {
    header: 'Name',
    accessor: 'name',
    render: (row) =>
    <div>
          <p className="font-medium">{row.name}</p>
          <p className="text-sm text-zinc-500">{row.client}</p>
        </div>

  },
  {
    header: 'Progress',
    accessor: 'progress',
    render: (row) => {
      const progress = calculateProjectProgress(row.id, tasks);
      return (
        <div className="flex items-center gap-2">
            <div className="w-20 h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div
              className="h-full bg-blue-500 transition-all"
              style={{ width: `${progress}%` }} />

            </div>
            <span className="text-xs text-zinc-300 font-medium">{progress}%</span>
          </div>);

    }
  },
  {
    header: 'Status',
    accessor: 'status',
    render: (row) => <StatusBadge status={row.status} />
  },
  {
    header: 'Contract Value',
    accessor: 'contract_value',
    render: (row) => row.contract_value ?
    `$${row.contract_value.toLocaleString()}` :
    '-'
  },
  {
    header: 'Target Completion',
    accessor: 'target_completion',
    render: (row) => row.target_completion ?
    format(new Date(row.target_completion), 'MMM d, yyyy') :
    '-'
  },
  {
    header: 'PM',
    accessor: 'project_manager',
    render: (row) => row.project_manager || '-'
  },
  {
    header: 'Actions',
    accessor: 'actions',
    render: (row) =>
    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <Popover>
            <PopoverTrigger asChild>
              <Button
            size="sm"
            variant="outline" className="bg-background text-slate-950 px-3 text-xs font-medium rounded-md inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border shadow-sm hover:bg-accent h-8 border-zinc-700 hover:text-white">


                <TrendingUp size={14} className="mr-1" />
                Health
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-96 bg-zinc-900 border-zinc-800 p-0" align="end">
              <ProjectHealthWidget
            project={row}
            tasks={tasks}
            financials={financials}
            changeOrders={changeOrders}
            rfis={rfis} />

            </PopoverContent>
          </Popover>
          <Button
        size="sm"
        variant="outline"
        onClick={(e) => {
          e.stopPropagation();
          handleViewDashboard(row);
        }} className="bg-background text-slate-950 px-3 text-xs font-medium rounded-md inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border shadow-sm hover:bg-accent h-8 border-zinc-700 hover:text-white">


            <Eye size={14} className="mr-1" />
            Dashboard
          </Button>
          {can.deleteProject &&
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
      }
        </div>

  }];


  return (
    <div>
      <PageHeader
        title="Projects"
        subtitle={`${projects.length} total projects`}
        onRefresh={refetch}
        isRefreshing={isRefetching}
        actions={
        can.createProject &&
        <Button
          onClick={() => {
            setFormData(initialFormState);
            setShowForm(true);
          }}
          className="bg-amber-500 hover:bg-amber-600 text-black">

              <Plus size={18} className="mr-2" />
              New Project
            </Button>

        } />


      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <Input
            placeholder="Search projects..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-zinc-900 border-zinc-800 text-white" />

        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48 bg-zinc-900 border-zinc-800 text-white">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="bidding">Bidding</SelectItem>
            <SelectItem value="awarded">Awarded</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="on_hold">On Hold</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
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

      {/* Demo Seeder for new users */}
      {projects.length === 0 && searchTerm === '' && statusFilter === 'all' && pmFilter === 'all' &&
      <div className="mb-6">
          <DemoProjectSeeder />
        </div>
      }

      {/* Table */}
      <DataTable
        columns={columns}
        data={filteredProjects}
        onRowClick={can.editProject ? handleEdit : undefined}
        emptyMessage="No projects found. Create your first project to get started." />


      {/* Create Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl bg-zinc-900 border-zinc-800 text-white">
          <DialogHeader>
            <DialogTitle>New Project</DialogTitle>
          </DialogHeader>
          <ProjectForm
            formData={formData}
            setFormData={setFormData}
            onSubmit={handleSubmit}
            isLoading={createMutation.isPending}
            users={users} />

        </DialogContent>
      </Dialog>

      {/* Edit Sheet */}
      <Sheet open={!!selectedProject} onOpenChange={(open) => !open && setSelectedProject(null)}>
        <SheetContent className="w-full sm:max-w-xl bg-zinc-900 border-zinc-800 text-white overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-white">Edit Project</SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            <ProjectForm
              formData={formData}
              setFormData={setFormData}
              onSubmit={handleSubmit}
              isLoading={updateMutation.isPending}
              users={users}
              isEdit />

          </div>
        </SheetContent>
      </Sheet>


    </div>);

}

function ProjectForm({ formData, setFormData, onSubmit, isLoading, isEdit, users = [] }) {
  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const toggleUser = (userEmail) => {
    const current = formData.assigned_users || [];
    if (current.includes(userEmail)) {
      handleChange('assigned_users', current.filter((e) => e !== userEmail));
    } else {
      handleChange('assigned_users', [...current, userEmail]);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Project Number *</Label>
          <Input
            value={formData.project_number}
            onChange={(e) => handleChange('project_number', e.target.value)}
            placeholder="e.g., 2024-001"
            required
            className="bg-zinc-800 border-zinc-700" />

        </div>
        <div className="space-y-2">
          <Label>Project Name *</Label>
          <Input
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="Project name"
            required
            className="bg-zinc-800 border-zinc-700" />

        </div>
        <div className="space-y-2">
          <Label>Client / GC</Label>
          <Input
            value={formData.client}
            onChange={(e) => handleChange('client', e.target.value)}
            placeholder="General contractor or owner"
            className="bg-zinc-800 border-zinc-700" />

        </div>
        <div className="space-y-2">
          <Label>Status</Label>
          <Select value={formData.status} onValueChange={(v) => handleChange('status', v)}>
            <SelectTrigger className="bg-zinc-800 border-zinc-700">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="bidding">Bidding</SelectItem>
              <SelectItem value="awarded">Awarded</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="on_hold">On Hold</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label>Location</Label>
          <Input
            value={formData.location}
            onChange={(e) => handleChange('location', e.target.value)}
            placeholder="Project address"
            className="bg-zinc-800 border-zinc-700" />

        </div>
        <div className="space-y-2">
          <Label>Contract Value</Label>
          <Input
            type="number"
            value={formData.contract_value}
            onChange={(e) => handleChange('contract_value', e.target.value)}
            placeholder="0.00"
            className="bg-zinc-800 border-zinc-700" />

        </div>
        <div className="space-y-2">
          <Label>Start Date</Label>
          <Input
            type="date"
            value={formData.start_date}
            onChange={(e) => handleChange('start_date', e.target.value)}
            className="bg-zinc-800 border-zinc-700" />

        </div>
        <div className="space-y-2">
          <Label>Target Completion</Label>
          <Input
            type="date"
            value={formData.target_completion}
            onChange={(e) => handleChange('target_completion', e.target.value)}
            className="bg-zinc-800 border-zinc-700" />

        </div>
        <div className="space-y-2">
          <Label>Project Manager</Label>
          <Input
            value={formData.project_manager}
            onChange={(e) => handleChange('project_manager', e.target.value)}
            placeholder="PM name"
            className="bg-zinc-800 border-zinc-700" />

        </div>
        <div className="space-y-2">
          <Label>Superintendent</Label>
          <Input
            value={formData.superintendent}
            onChange={(e) => handleChange('superintendent', e.target.value)}
            placeholder="Superintendent name"
            className="bg-zinc-800 border-zinc-700" />

        </div>
      </div>

      <div className="border-t border-zinc-800 pt-4">
        <h4 className="text-sm font-medium text-zinc-400 mb-3">Assigned Users</h4>
        <div className="space-y-2">
          <Label className="text-xs text-zinc-500">Select users who can access this project</Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-3 bg-zinc-950 border border-zinc-800 rounded-lg">
            {users.map((user) =>
            <label
              key={user.id}
              className="flex items-center gap-2 p-2 rounded hover:bg-zinc-800 cursor-pointer transition-colors">

                <input
                type="checkbox"
                checked={(formData.assigned_users || []).includes(user.email)}
                onChange={() => toggleUser(user.email)}
                className="w-4 h-4 rounded border-zinc-700 bg-zinc-800 text-amber-500 focus:ring-amber-500" />

                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{user.full_name || user.email}</p>
                  <p className="text-xs text-zinc-500 truncate">{user.email}</p>
                </div>
              </label>
            )}
          </div>
          {(formData.assigned_users || []).length > 0 &&
          <p className="text-xs text-zinc-500 mt-2">
              {(formData.assigned_users || []).length} user(s) assigned
            </p>
          }
        </div>
      </div>

      <div className="border-t border-zinc-800 pt-4">
        <h4 className="text-sm font-medium text-zinc-400 mb-3">GC Contact Info</h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Contact Name</Label>
            <Input
              value={formData.gc_contact}
              onChange={(e) => handleChange('gc_contact', e.target.value)}
              className="bg-zinc-800 border-zinc-700" />

          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              type="email"
              value={formData.gc_email}
              onChange={(e) => handleChange('gc_email', e.target.value)}
              className="bg-zinc-800 border-zinc-700" />

          </div>
          <div className="space-y-2">
            <Label>Phone</Label>
            <Input
              value={formData.gc_phone}
              onChange={(e) => handleChange('gc_phone', e.target.value)}
              className="bg-zinc-800 border-zinc-700" />

          </div>
        </div>
      </div>

      <div className="border-t border-zinc-800 pt-4">
        <h4 className="text-sm font-medium text-zinc-400 mb-3">Scope of Work</h4>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Scope Description</Label>
            <Textarea
              value={formData.scope_of_work}
              onChange={(e) => handleChange('scope_of_work', e.target.value)}
              rows={4}
              placeholder="Detailed description of work to be performed..."
              className="bg-zinc-800 border-zinc-700" />

          </div>
          <div className="space-y-2">
            <Label>Exclusions</Label>
            <Textarea
              value={formData.exclusions}
              onChange={(e) => handleChange('exclusions', e.target.value)}
              rows={3}
              placeholder="Work items excluded from this scope..."
              className="bg-zinc-800 border-zinc-700" />

          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Additional Notes</Label>
        <Textarea
          value={formData.notes}
          onChange={(e) => handleChange('notes', e.target.value)}
          rows={3}
          className="bg-zinc-800 border-zinc-700" />

      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
        <Button
          type="submit"
          disabled={isLoading}
          className="bg-amber-500 hover:bg-amber-600 text-black">

          {isLoading ? 'Saving...' : isEdit ? 'Update Project' : 'Create Project'}
        </Button>
      </div>
    </form>);

}