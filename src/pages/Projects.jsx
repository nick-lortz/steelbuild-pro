import React, { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from '@/components/ui/notifications';
import { checkPermission } from '@/components/shared/permissions';
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
import { Building, RefreshCw, Plus } from 'lucide-react';
import { createPageUrl } from '@/utils';
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
import ProjectsTable from '@/components/projects/ProjectsTable';
import ProjectsKPIBar from '@/components/projects/ProjectsKPIBar';
import ProjectsFilters from '@/components/projects/ProjectsFilters';
import DeleteProjectDialog from '@/components/projects/DeleteProjectDialog';
import { calculateProjectProgress } from '@/components/shared/projectProgressUtils';
import DemoProjectSeeder from '@/components/projects/DemoProjectSeeder';


const initialFormState = {
  project_number: '',
  name: '',
  client: '',
  location: '',
  status: 'bidding',
  contract_value: '',
  structure_anatomy_job_type: '',
  rough_square_footage: '',
  rough_price_per_sqft: '',
  crane_budget: '',
  sub_budget: '',
  rough_lift_hr_rate: '',
  baseline_shop_hours: '',
  baseline_field_hours: '',
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
  const [pmFilter, setPMFilter] = useState('all');
  const [sortBy, setSortBy] = useState('updated');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [deleteProject, setDeleteProject] = useState(null);

  const queryClient = useQueryClient();
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    staleTime: Infinity
  });

  const can = {
    createProject: checkPermission(currentUser, 'projects:create'),
    editProject: checkPermission(currentUser, 'projects:edit'),
    deleteProject: checkPermission(currentUser, 'projects:delete')
  };

  const { data: projects = [], isLoading, refetch } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('-updated_date'),
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
    mutationFn: (/** @type {any} */ data) => base44.entities.Project.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setShowForm(false);
      setFormData(initialFormState);
      toast.success('Project created successfully');
    },
    onError: (/** @type {any} */ error) => {
      if (error?.response?.status === 409 || error?.status === 409) {
        toast.error('Project number already exists. Please choose a different project number.');
      } else {
        toast.error('Failed to create project. Please try again.');
      }
    }
  });

  const updateMutation = useMutation({
    mutationFn: (/** @type {{id: any, data: any}} */ { id, data }) => base44.entities.Project.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setSelectedProject(null);
      setFormData(initialFormState);
      toast.success('Project updated successfully');
    },
    onError: (/** @type {any} */ error) => {
      if (error?.response?.status === 409 || error?.status === 409) {
        toast.error('Project number already exists. Please choose a different project number.');
      } else {
        toast.error('Failed to update project. Please try again.');
      }
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (/** @type {any} */ id) => base44.entities.Project.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Project deleted successfully');
    },
    onError: (/** @type {any} */ error) => {
      toast.error('Failed to delete project: ' + error.message);
    }
  });

  const handleDelete = useCallback((project) => {
    if (!can.deleteProject) {
      toast.error('You do not have permission to delete projects');
      return;
    }
    setDeleteProject(project);
  }, [can.deleteProject]);

  const handleEdit = (project) => {
    if (!can.editProject) {
      toast.error('You do not have permission to edit projects');
      return;
    }
    setFormData({
      ...project,
      contract_value: project.contract_value?.toString() || '',
      rough_square_footage: project.rough_square_footage?.toString() || '',
      rough_price_per_sqft: project.rough_price_per_sqft?.toString() || '',
      crane_budget: project.crane_budget?.toString() || '',
      sub_budget: project.sub_budget?.toString() || '',
      rough_lift_hr_rate: project.rough_lift_hr_rate?.toString() || '',
      baseline_shop_hours: project.baseline_shop_hours?.toString() || '',
      baseline_field_hours: project.baseline_field_hours?.toString() || '',
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
      contract_value: formData.contract_value ? parseFloat(formData.contract_value) : null,
      rough_square_footage: formData.rough_square_footage ? parseFloat(formData.rough_square_footage) : null,
      rough_price_per_sqft: formData.rough_price_per_sqft ? parseFloat(formData.rough_price_per_sqft) : null,
      crane_budget: formData.crane_budget ? parseFloat(formData.crane_budget) : 0,
      sub_budget: formData.sub_budget ? parseFloat(formData.sub_budget) : 0,
      rough_lift_hr_rate: formData.rough_lift_hr_rate ? parseFloat(formData.rough_lift_hr_rate) : null,
      baseline_shop_hours: formData.baseline_shop_hours ? parseFloat(formData.baseline_shop_hours) : 0,
      baseline_field_hours: formData.baseline_field_hours ? parseFloat(formData.baseline_field_hours) : 0
    };

    if (selectedProject) {
      updateMutation.mutate({ id: selectedProject.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  }, [refetch]);

  // Add progress to projects
  const projectsWithMetrics = useMemo(() => {
    return projects.map(p => ({
      ...p,
      progress: calculateProjectProgress(p.id, tasks)
    }));
  }, [projects, tasks]);

  // Get unique PMs
  const projectManagers = useMemo(() => {
    const pms = new Set(projects.map(p => p.project_manager).filter(Boolean));
    return Array.from(pms).sort();
  }, [projects]);

  const filteredProjects = useMemo(() => {
    let filtered = projectsWithMetrics.filter((p) => {
      const matchesSearch =
        p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.project_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.client?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
      const matchesPM = pmFilter === 'all' || p.project_manager === pmFilter;
      return matchesSearch && matchesStatus && matchesPM;
    });

    // Sort
    if (sortBy === 'name') {
      filtered.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    } else if (sortBy === 'target') {
      filtered.sort((a, b) => {
        if (!a.target_completion) return 1;
        if (!b.target_completion) return -1;
        return a.target_completion.localeCompare(b.target_completion);
      });
    } else if (sortBy === 'value') {
      filtered.sort((a, b) => (b.contract_value || 0) - (a.contract_value || 0));
    } else if (sortBy === 'progress') {
      filtered.sort((a, b) => (b.progress || 0) - (a.progress || 0));
    } else if (sortBy === 'updated') {
      filtered.sort((a, b) => (b.updated_date || '').localeCompare(a.updated_date || ''));
    }

    return filtered;
  }, [projectsWithMetrics, searchTerm, statusFilter, pmFilter, sortBy]);

  const hasActiveFilters = searchTerm || statusFilter !== 'all' || pmFilter !== 'all';

  const handleClearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setPMFilter('all');
  };

  const handleViewProject = (project) => {
    window.location.href = `/ProjectDashboard?id=${project.id}`;
  };

  const handleSettings = (project) => {
    window.location.href = createPageUrl('ProjectSettings') + `?project=${project.id}`;
  };

  return (
    <div className="min-h-screen bg-[#0A0E13]">
      {/* Header */}
      <div className="border-b border-[rgba(255,255,255,0.05)] bg-[#0F1419]/80 backdrop-blur-md">
        <div className="max-w-[1800px] mx-auto px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-[#E5E7EB] tracking-tight">Projects</h1>
              <p className="text-sm text-[#6B7280] font-mono mt-1">{projects.length} projects</p>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="gap-2"
              >
                <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
                Refresh
              </Button>
              {can.createProject && (
                <Button
                  size="sm"
                  onClick={() => {
                    setFormData(initialFormState);
                    setShowForm(true);
                  }}
                >
                  <Plus size={14} className="mr-1" />
                  New Project
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* KPI Bar */}
      <div className="border-b border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.02)]">
        <div className="max-w-[1800px] mx-auto px-8 py-4">
          <ProjectsKPIBar projects={projectsWithMetrics} tasks={tasks} financials={financials} />
        </div>
      </div>

      {/* Filters */}
      <div className="border-b border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.01)]">
        <div className="max-w-[1800px] mx-auto px-8 py-3">
            <ProjectsFilters
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            statusFilter={statusFilter}
            onStatusChange={setStatusFilter}
            pmFilter={pmFilter}
            onPMChange={setPMFilter}
            sortBy={sortBy}
            onSortChange={setSortBy}
            onClearFilters={handleClearFilters}
            hasActiveFilters={hasActiveFilters}
            projectManagers={projectManagers}
          />
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[1800px] mx-auto px-8 py-6">
        {/* Demo Seeder */}
        {projects.length === 0 && !isLoading && (
          <div className="mb-6">
            <DemoProjectSeeder />
          </div>
        )}

          {/* Projects Table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-[#FF9D42] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-[#9CA3AF] text-sm">Loading projects...</p>
            </div>
          </div>
        ) : (
          <ProjectsTable
            projects={filteredProjects}
            onView={handleViewProject}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onSettings={handleSettings}
            canEdit={can.editProject}
          />
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Project</DialogTitle>
          </DialogHeader>
          <ProjectForm
            formData={formData}
            setFormData={setFormData}
            onSubmit={handleSubmit}
            isLoading={createMutation.isPending}
            isEdit={false}
            users={users} />

        </DialogContent>
      </Dialog>

      {/* Edit Sheet */}
      <Sheet open={!!selectedProject} onOpenChange={(open) => !open && setSelectedProject(null)}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Edit Project</SheetTitle>
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

      {/* Delete Confirmation with Cascade Warning */}
      <DeleteProjectDialog
        project={deleteProject}
        open={!!deleteProject}
        onOpenChange={(open) => !open && setDeleteProject(null)}
        onSuccess={() => {
          queryClient.invalidateQueries();
        }}
      />
    </div>
  );
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
            required />

        </div>
        <div className="space-y-2">
          <Label>Project Name *</Label>
          <Input
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="Project name"
            required
            className="bg-zinc-800/50 border-zinc-700/50 rounded-lg" />

        </div>
        <div className="space-y-2">
          <Label>Client / GC</Label>
          <Input
            value={formData.client}
            onChange={(e) => handleChange('client', e.target.value)}
            placeholder="General contractor or owner"
            className="bg-zinc-800/50 border-zinc-700/50 rounded-lg" />

        </div>
        <div className="space-y-2">
          <Label>Status</Label>
          <Select value={formData.status} onValueChange={(v) => handleChange('status', v)}>
            <SelectTrigger className="bg-zinc-800/50 border-zinc-700/50 rounded-lg">
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
            className="bg-zinc-800/50 border-zinc-700/50 rounded-lg" />

        </div>
        <div className="space-y-2">
          <Label>Contract Value</Label>
          <Input
            type="number"
            value={formData.contract_value}
            onChange={(e) => handleChange('contract_value', e.target.value)}
            placeholder="0.00"
            className="bg-zinc-800/50 border-zinc-700/50 rounded-lg" />
        </div>
        <div className="space-y-2">
          <Label>Start Date</Label>
          <Input
            type="date"
            value={formData.start_date}
            onChange={(e) => handleChange('start_date', e.target.value)}
            className="bg-zinc-800/50 border-zinc-700/50 rounded-lg" />
        </div>
        <div className="space-y-2">
          <Label>Target Completion</Label>
          <Input
            type="date"
            value={formData.target_completion}
            onChange={(e) => handleChange('target_completion', e.target.value)}
            className="bg-zinc-800/50 border-zinc-700/50 rounded-lg" />
        </div>
        <div className="space-y-2">
          <Label>Project Manager</Label>
          <Input
            value={formData.project_manager}
            onChange={(e) => handleChange('project_manager', e.target.value)}
            placeholder="PM name"
            className="bg-zinc-800/50 border-zinc-700/50 rounded-lg" />
        </div>
        <div className="space-y-2">
          <Label>Superintendent</Label>
          <Input
            value={formData.superintendent}
            onChange={(e) => handleChange('superintendent', e.target.value)}
            placeholder="Superintendent name"
            className="bg-zinc-800/50 border-zinc-700/50 rounded-lg" />
        </div>
      </div>

      {/* Estimating Kickoff Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white border-b border-zinc-800 pb-2">Estimating Kickoff</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Structure Anatomy/Job Type</Label>
            <Input
              value={formData.structure_anatomy_job_type}
              onChange={(e) => handleChange('structure_anatomy_job_type', e.target.value)}
              placeholder="e.g., MVD Renovation"
              className="bg-zinc-800/50 border-zinc-700/50 rounded-lg" />
          </div>
          <div className="space-y-2">
            <Label>Rough Square Footage</Label>
            <Input
              type="number"
              value={formData.rough_square_footage}
              onChange={(e) => handleChange('rough_square_footage', e.target.value)}
              placeholder="0"
              className="bg-zinc-800/50 border-zinc-700/50 rounded-lg" />
          </div>
          <div className="space-y-2">
            <Label>Rough Price/SqFt</Label>
            <Input
              type="number"
              step="0.01"
              value={formData.rough_price_per_sqft}
              onChange={(e) => handleChange('rough_price_per_sqft', e.target.value)}
              placeholder="0.00"
              className="bg-zinc-800/50 border-zinc-700/50 rounded-lg" />
          </div>
          <div className="space-y-2">
            <Label>Overall Shop Hours</Label>
            <Input
              type="number"
              value={formData.baseline_shop_hours}
              onChange={(e) => handleChange('baseline_shop_hours', e.target.value)}
              placeholder="0"
              className="bg-zinc-800/50 border-zinc-700/50 rounded-lg" />
          </div>
          <div className="space-y-2">
            <Label>Overall Field Hours</Label>
            <Input
              type="number"
              value={formData.baseline_field_hours}
              onChange={(e) => handleChange('baseline_field_hours', e.target.value)}
              placeholder="0"
              className="bg-zinc-800/50 border-zinc-700/50 rounded-lg" />
          </div>
          <div className="space-y-2">
            <Label>Crane Budget</Label>
            <Input
              type="number"
              value={formData.crane_budget}
              onChange={(e) => handleChange('crane_budget', e.target.value)}
              placeholder="0"
              className="bg-zinc-800/50 border-zinc-700/50 rounded-lg" />
          </div>
          <div className="space-y-2">
            <Label>Sub Budget</Label>
            <Input
              type="number"
              value={formData.sub_budget}
              onChange={(e) => handleChange('sub_budget', e.target.value)}
              placeholder="0"
              className="bg-zinc-800/50 border-zinc-700/50 rounded-lg" />
          </div>
          <div className="space-y-2">
            <Label>Rough Lift/Hr Rate</Label>
            <Input
              type="number"
              step="0.01"
              value={formData.rough_lift_hr_rate}
              onChange={(e) => handleChange('rough_lift_hr_rate', e.target.value)}
              placeholder="0.00"
              className="bg-zinc-800/50 border-zinc-700/50 rounded-lg" />
          </div>
        </div>
      </div>

      <div className="border-t border-[rgba(255,255,255,0.05)] pt-4">
        <h4 className="text-sm font-medium text-[#9CA3AF] mb-3">Assigned Users</h4>
        <div className="space-y-2">
          <Label className="text-xs text-[#6B7280]">Select users who can access this project</Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-3 bg-[#0A0E13] border border-[rgba(255,255,255,0.05)] rounded-lg">
            {users.map((user) =>
            <label
              key={user.id}
              className="flex items-center gap-2 p-2 rounded-lg hover:bg-[rgba(255,157,66,0.03)] cursor-pointer transition-colors">

                <input
                type="checkbox"
                checked={(formData.assigned_users || []).includes(user.email)}
                onChange={() => toggleUser(user.email)}
                className="w-4 h-4 rounded border-[rgba(255,255,255,0.2)] bg-[#0F1419] text-[#FF9D42] focus:ring-[#FF9D42]" />

                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[#E5E7EB] truncate">{user.full_name || user.email}</p>
                  <p className="text-xs text-[#6B7280] truncate">{user.email}</p>
                </div>
              </label>
            )}
          </div>
          {(formData.assigned_users || []).length > 0 &&
          <p className="text-xs text-[#6B7280] mt-2">
              {(formData.assigned_users || []).length} user(s) assigned
            </p>
          }
        </div>
      </div>

      <div className="border-t border-[rgba(255,255,255,0.05)] pt-4">
        <h4 className="text-sm font-medium text-[#9CA3AF] mb-3">GC Contact Info</h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Contact Name</Label>
            <Input
              value={formData.gc_contact}
              onChange={(e) => handleChange('gc_contact', e.target.value)}
              className="bg-zinc-800/50 border-zinc-700/50 rounded-lg" />

          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              type="email"
              value={formData.gc_email}
              onChange={(e) => handleChange('gc_email', e.target.value)}
              className="bg-zinc-800/50 border-zinc-700/50 rounded-lg" />

          </div>
          <div className="space-y-2">
            <Label>Phone</Label>
            <Input
              value={formData.gc_phone}
              onChange={(e) => handleChange('gc_phone', e.target.value)}
              className="bg-zinc-800/50 border-zinc-700/50 rounded-lg" />

          </div>
        </div>
      </div>

      <div className="border-t border-[rgba(255,255,255,0.05)] pt-4">
        <h4 className="text-sm font-medium text-[#9CA3AF] mb-3">Scope of Work</h4>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Scope Description</Label>
            <Textarea
              value={formData.scope_of_work}
              onChange={(e) => handleChange('scope_of_work', e.target.value)}
              rows={4}
              placeholder="Detailed description of work to be performed..."
              className="bg-zinc-800/50 border-zinc-700/50 rounded-lg" />

          </div>
          <div className="space-y-2">
            <Label>Exclusions</Label>
            <Textarea
              value={formData.exclusions}
              onChange={(e) => handleChange('exclusions', e.target.value)}
              rows={3}
              placeholder="Work items excluded from this scope..."
              className="bg-zinc-800/50 border-zinc-700/50 rounded-lg" />

          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Additional Notes</Label>
        <Textarea
          value={formData.notes}
          onChange={(e) => handleChange('notes', e.target.value)}
          rows={3} />

      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-[rgba(255,255,255,0.05)]">
        <Button
          type="submit"
          disabled={isLoading}>

          {isLoading ? 'Saving...' : isEdit ? 'Update Project' : 'Create Project'}
        </Button>
      </div>
    </form>);

}