import React, { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { checkPermission } from '@/components/shared/permissions';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue } from
"@/components/ui/select";
import { Building, RefreshCw, Plus, Download, Upload, AlertCircle, Edit, Trash2, Check, X, TrendingUp, AlertTriangle } from 'lucide-react';
import { createPageUrl } from '@/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter } from
"@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle } from
"@/components/ui/sheet";
import DeleteProjectDialog from '@/components/projects/DeleteProjectDialog';
import { calculateProjectProgress } from '@/components/shared/projectProgressUtils';
import DemoProjectSeeder from '@/components/projects/DemoProjectSeeder';
import { cn } from '@/lib/utils';
import ErrorBoundary from '@/components/ui/ErrorBoundary';


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
  const [clientFilter, setClientFilter] = useState('all');
  const [atRiskOnly, setAtRiskOnly] = useState(false);
  const [sortBy, setSortBy] = useState('updated');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [deleteProject, setDeleteProject] = useState(null);
  const [editingRow, setEditingRow] = useState(null);
  const [editData, setEditData] = useState({});

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

  const { data: allProjects = [], isLoading, refetch } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('-updated_date'),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000
  });

  const projects = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === 'admin') return allProjects;
    return allProjects.filter(p =>
      p.project_manager === currentUser.email ||
      p.superintendent === currentUser.email ||
      (p.assigned_users && p.assigned_users.includes(currentUser.email))
    );
  }, [currentUser, allProjects]);

  const { data: portfolioSummary = {}, isFetching: summaryFetching } = useQuery({
    queryKey: ['portfolioSummary'],
    queryFn: async () => {
      const response = await base44.functions.invoke('getProjectsPortfolioSummary', {});
      const d = response?.data ?? response;
      return (d?.summary || d?.segments) ? d : (d?.data || d?.body || d);
    },
    staleTime: 5 * 60 * 1000,
    retry: 2
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



  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Project.create(data),
    retry: 2,
    retryDelay: 1000,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setShowForm(false);
      setFormData(initialFormState);
      toast.success('Project created successfully');
    },
    onError: (error) => {
      if (error?.response?.status === 409 || error?.status === 409) {
        toast.error('Project number already exists. Please choose a different project number.');
      } else {
        toast.error('Failed to create project. Please try again.');
      }
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Project.update(id, data),
    retry: 2,
    retryDelay: 1000,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setSelectedProject(null);
      setFormData(initialFormState);
      toast.success('Project updated successfully');
    },
    onError: (error) => {
      if (error?.response?.status === 409 || error?.status === 409) {
        toast.error('Project number already exists. Please choose a different project number.');
      } else {
        toast.error('Failed to update project. Please try again.');
      }
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

  // Get unique PMs and clients
  const projectManagers = useMemo(() => {
    const pms = new Set(projects.map(p => p.project_manager).filter(Boolean));
    return Array.from(pms).sort();
  }, [projects]);

  const clients = useMemo(() => {
    const cls = new Set(projects.map(p => p.client).filter(Boolean));
    return Array.from(cls).sort();
  }, [projects]);

  const filteredProjects = useMemo(() => {
    let filtered = projectsWithMetrics.filter((p) => {
      const matchesSearch =
        p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.project_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.client?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
      const matchesPM = pmFilter === 'all' || p.project_manager === pmFilter;
      const matchesClient = clientFilter === 'all' || p.client === clientFilter;
      
      const isAtRisk = !p.project_manager || !p.target_completion || !p.contract_value;
      const matchesRisk = !atRiskOnly || isAtRisk;

      return matchesSearch && matchesStatus && matchesPM && matchesClient && matchesRisk;
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

  const hasActiveFilters = searchTerm || statusFilter !== 'all' || pmFilter !== 'all' || clientFilter !== 'all' || atRiskOnly;

  const handleClearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setPMFilter('all');
    setClientFilter('all');
    setAtRiskOnly(false);
  };

  const handleViewProject = (project) => {
    window.location.href = `/ProjectDashboard?id=${project.id}`;
  };

  const handleSettings = (project) => {
    window.location.href = createPageUrl('ProjectSettings') + `?project=${project.id}`;
  };

  return (
    <ErrorBoundary>
      <div className="space-y-6 max-w-[1800px] mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
            <p className="text-muted-foreground mt-2">Portfolio Operations Hub</p>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-sm text-muted-foreground">{projects.length} Projects</span>
              {portfolioSummary.summary && (
                <>
                  <span className="text-xs text-muted-foreground">•</span>
                  <span className="text-sm text-muted-foreground">
                    {portfolioSummary.summary.activeProjects} Active
                  </span>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing || summaryFetching}>
              <RefreshCw className={cn("h-4 w-4 mr-2", (isRefreshing || summaryFetching) && "animate-spin")} />
              Refresh
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            {can.createProject && (
              <>
                <DemoProjectSeeder />
                <Button size="sm" onClick={() => { setFormData(initialFormState); setSelectedProject(null); setShowForm(true); }}>
                  <Plus className="h-4 w-4 mr-2" />
                  New Project
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Portfolio KPIs */}
        {portfolioSummary.summary && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Active Projects</p>
                <div className="text-2xl font-bold text-blue-500">{portfolioSummary.summary.activeProjects}</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Portfolio Value</p>
                <div className="text-2xl font-bold text-green-500">
                  ${((portfolioSummary.summary.totalContractValue || 0) / 1000000).toFixed(1)}M
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Updated (7d)</p>
                <div className="text-2xl font-bold">{portfolioSummary.summary.updatedRecently || 0}</div>
              </CardContent>
            </Card>

            <Card className={cn(
              "border-2",
              (portfolioSummary.summary.projectsWithMissingData || 0) > 0 ? "border-red-500/30 bg-red-500/5" : "border-green-500/30 bg-green-500/5"
            )}>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Missing Setup</p>
                <div className={cn(
                  "text-2xl font-bold",
                  (portfolioSummary.summary.projectsWithMissingData || 0) > 0 ? "text-red-500" : "text-green-500"
                )}>
                  {portfolioSummary.summary.projectsWithMissingData || 0}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Completeness</p>
                <div className="text-2xl font-bold text-purple-500">{portfolioSummary.summary.completenessScore || 0}%</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Portfolio Anomalies */}
        {portfolioSummary.anomalies && portfolioSummary.anomalies.length > 0 && (
          <Card className="border-purple-500/30">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-purple-500" />
                Portfolio Anomalies & Missing Setup
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {portfolioSummary.anomalies.map((anomaly, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                    <Badge variant={anomaly.severity === 'critical' ? 'destructive' : 'default'} className="text-xs mt-1">
                      {anomaly.severity}
                    </Badge>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{anomaly.message}</p>
                      {anomaly.affectedProjects && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Projects: {anomaly.affectedProjects.slice(0, 5).join(', ')}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <Input
            placeholder="Search projects..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-48"
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="bidding">Bidding</SelectItem>
              <SelectItem value="awarded">Awarded</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="on_hold">On Hold</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={pmFilter} onValueChange={setPMFilter}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All PMs</SelectItem>
              {projectManagers.map(pm => (
                <SelectItem key={pm} value={pm}>{pm}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={clientFilter} onValueChange={setClientFilter}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Clients</SelectItem>
              {clients.map(c => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant={atRiskOnly ? "default" : "outline"} size="sm" onClick={() => setAtRiskOnly(!atRiskOnly)}>
            <AlertTriangle className="h-4 w-4 mr-2" />
            At-Risk
          </Button>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="updated">Recent</SelectItem>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="target">Target</SelectItem>
              <SelectItem value="value">Value</SelectItem>
              <SelectItem value="progress">Progress</SelectItem>
            </SelectContent>
          </Select>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={handleClearFilters}>
              <X className="h-4 w-4 mr-2" />
              Clear
            </Button>
          )}
        </div>

        {/* Projects Table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredProjects.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Building className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold mb-2">No Projects Found</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {hasActiveFilters ? 'Try adjusting filters' : 'Create your first project'}
              </p>
              {can.createProject && !hasActiveFilters && (
                <Button onClick={() => { setFormData(initialFormState); setShowForm(true); }}>
                  <Plus className="h-4 w-4 mr-2" />
                  New Project
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b bg-muted/30">
                    <tr className="text-left">
                      <th className="p-3 font-medium">Project #</th>
                      <th className="p-3 font-medium">Name</th>
                      <th className="p-3 font-medium">Client</th>
                      <th className="p-3 font-medium">Status</th>
                      <th className="p-3 font-medium">PM</th>
                      <th className="p-3 font-medium">Target</th>
                      <th className="p-3 font-medium text-right">Value</th>
                      <th className="p-3 font-medium text-right">Progress</th>
                      <th className="p-3 font-medium">Updated</th>
                      <th className="p-3 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProjects.map((proj) => (
                      <tr key={proj.id} className="border-b last:border-0 hover:bg-muted/20">
                        {editingRow === proj.id ? (
                          <>
                            <td className="p-3 font-mono text-xs">{proj.project_number}</td>
                            <td className="p-3">{proj.name}</td>
                            <td className="p-3">{proj.client}</td>
                            <td className="p-3">
                              <Select value={editData.status} onValueChange={(v) => setEditData({ ...editData, status: v })}>
                                <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="bidding">Bidding</SelectItem>
                                  <SelectItem value="awarded">Awarded</SelectItem>
                                  <SelectItem value="in_progress">In Progress</SelectItem>
                                  <SelectItem value="on_hold">On Hold</SelectItem>
                                  <SelectItem value="completed">Completed</SelectItem>
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="p-3">
                              <Input value={editData.project_manager || ''} onChange={(e) => setEditData({ ...editData, project_manager: e.target.value })} className="h-8" />
                            </td>
                            <td className="p-3">
                              <Input type="date" value={editData.target_completion || ''} onChange={(e) => setEditData({ ...editData, target_completion: e.target.value })} className="h-8" />
                            </td>
                            <td className="p-3 text-right">
                              <Input type="number" value={editData.contract_value || 0} onChange={(e) => setEditData({ ...editData, contract_value: e.target.value })} className="h-8 w-32 text-right" />
                            </td>
                            <td className="p-3" colSpan={2}></td>
                            <td className="p-3 text-right">
                              <div className="flex gap-1 justify-end">
                                <Button size="sm" variant="ghost" onClick={() => updateMutation.mutate({ id: proj.id, data: { ...editData, contract_value: Number(editData.contract_value) } })}>
                                  <Check className="h-3 w-3" />
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => { setEditingRow(null); setEditData({}); }}>
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="p-3 font-mono text-xs">{proj.project_number}</td>
                            <td className="p-3 font-medium">{proj.name}</td>
                            <td className="p-3 text-sm">{proj.client || '-'}</td>
                            <td className="p-3">
                              <Badge variant={proj.status === 'in_progress' ? 'default' : 'outline'} className="capitalize text-xs">
                                {proj.status?.replace('_', ' ')}
                              </Badge>
                            </td>
                            <td className="p-3 text-sm">{proj.project_manager || <span className="text-red-500 text-xs">Missing</span>}</td>
                            <td className="p-3 text-sm">
                              {proj.target_completion ? new Date(proj.target_completion).toLocaleDateString() : <span className="text-red-500 text-xs">Missing</span>}
                            </td>
                            <td className="p-3 text-right font-semibold">
                              {proj.contract_value ? `$${(proj.contract_value / 1000).toFixed(0)}K` : <span className="text-red-500 text-xs">Missing</span>}
                            </td>
                            <td className="p-3 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <div className="w-16 bg-muted rounded-full h-2">
                                  <div className="h-2 rounded-full bg-green-500" style={{ width: `${proj.progress || 0}%` }} />
                                </div>
                                <span className="text-xs font-bold w-8 text-right">{proj.progress || 0}%</span>
                              </div>
                            </td>
                            <td className="p-3 text-xs text-muted-foreground">
                              {proj.updated_date ? new Date(proj.updated_date).toLocaleDateString() : '-'}
                            </td>
                            <td className="p-3 text-right">
                              <div className="flex gap-1 justify-end">
                                <Button size="sm" variant="ghost" onClick={() => handleViewProject(proj)}>View</Button>
                                {can.editProject && (
                                  <>
                                    <Button size="sm" variant="ghost" onClick={() => { 
                                      setEditingRow(proj.id); 
                                      setEditData({ 
                                        status: proj.status, 
                                        project_manager: proj.project_manager, 
                                        target_completion: proj.target_completion, 
                                        contract_value: proj.contract_value 
                                      }); 
                                    }}>
                                      <Edit className="h-3 w-3" />
                                    </Button>
                                    <Button size="sm" variant="ghost" onClick={() => handleEdit(proj)}>Full Edit</Button>
                                  </>
                                )}
                                {can.deleteProject && (
                                  <Button size="sm" variant="ghost" onClick={() => handleDelete(proj)}>
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Create/Edit Sheet */}
        <Sheet open={showForm || !!selectedProject} onOpenChange={(open) => {
          if (!open) {
            setShowForm(false);
            setSelectedProject(null);
          }
        }}>
          <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
            <SheetHeader>
              <SheetTitle>{selectedProject ? 'Edit Project' : 'New Project'}</SheetTitle>
            </SheetHeader>
            <div className="mt-6">
              <ProjectForm
                formData={formData}
                setFormData={setFormData}
                onSubmit={handleSubmit}
                isLoading={selectedProject ? updateMutation.isPending : createMutation.isPending}
                users={users}
                isEdit={!!selectedProject}
              />
            </div>
          </SheetContent>
        </Sheet>

        {/* Delete Confirmation */}
        <DeleteProjectDialog
          project={deleteProject}
          open={!!deleteProject}
          onOpenChange={(open) => !open && setDeleteProject(null)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['projects'] });
            queryClient.invalidateQueries({ queryKey: ['portfolioSummary'] });
          }}
        />
      </div>
    </ErrorBoundary>
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
            required />
        </div>
        <div className="space-y-2">
          <Label>Client / GC</Label>
          <Input
            value={formData.client}
            onChange={(e) => handleChange('client', e.target.value)}
            placeholder="General contractor or owner" />
        </div>
        <div className="space-y-2">
          <Label>Status</Label>
          <Select value={formData.status} onValueChange={(v) => handleChange('status', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
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
            placeholder="Project address" />
        </div>
        <div className="space-y-2">
          <Label>Contract Value</Label>
          <Input
            type="number"
            value={formData.contract_value}
            onChange={(e) => handleChange('contract_value', e.target.value)}
            placeholder="0.00" />
        </div>
        <div className="space-y-2">
          <Label>Start Date</Label>
          <Input
            type="date"
            value={formData.start_date}
            onChange={(e) => handleChange('start_date', e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Target Completion</Label>
          <Input
            type="date"
            value={formData.target_completion}
            onChange={(e) => handleChange('target_completion', e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Project Manager</Label>
          <Input
            value={formData.project_manager}
            onChange={(e) => handleChange('project_manager', e.target.value)}
            placeholder="PM name" />
        </div>
        <div className="space-y-2">
          <Label>Superintendent</Label>
          <Input
            value={formData.superintendent}
            onChange={(e) => handleChange('superintendent', e.target.value)}
            placeholder="Superintendent name" />
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
              placeholder="e.g., MVD Renovation" />
          </div>
          <div className="space-y-2">
            <Label>Rough Square Footage</Label>
            <Input
              type="number"
              value={formData.rough_square_footage}
              onChange={(e) => handleChange('rough_square_footage', e.target.value)}
              placeholder="0" />
          </div>
          <div className="space-y-2">
            <Label>Rough Price/SqFt</Label>
            <Input
              type="number"
              step="0.01"
              value={formData.rough_price_per_sqft}
              onChange={(e) => handleChange('rough_price_per_sqft', e.target.value)}
              placeholder="0.00" />
          </div>
          <div className="space-y-2">
            <Label>Overall Shop Hours</Label>
            <Input
              type="number"
              value={formData.baseline_shop_hours}
              onChange={(e) => handleChange('baseline_shop_hours', e.target.value)}
              placeholder="0" />
          </div>
          <div className="space-y-2">
            <Label>Overall Field Hours</Label>
            <Input
              type="number"
              value={formData.baseline_field_hours}
              onChange={(e) => handleChange('baseline_field_hours', e.target.value)}
              placeholder="0" />
          </div>
          <div className="space-y-2">
            <Label>Crane Budget</Label>
            <Input
              type="number"
              value={formData.crane_budget}
              onChange={(e) => handleChange('crane_budget', e.target.value)}
              placeholder="0" />
          </div>
          <div className="space-y-2">
            <Label>Sub Budget</Label>
            <Input
              type="number"
              value={formData.sub_budget}
              onChange={(e) => handleChange('sub_budget', e.target.value)}
              placeholder="0" />
          </div>
          <div className="space-y-2">
            <Label>Rough Lift/Hr Rate</Label>
            <Input
              type="number"
              step="0.01"
              value={formData.rough_lift_hr_rate}
              onChange={(e) => handleChange('rough_lift_hr_rate', e.target.value)}
              placeholder="0.00" />
          </div>
        </div>
      </div>

      <div className="border-t border-zinc-800 pt-4">
        <h4 className="text-sm font-medium text-zinc-400 mb-3">Assigned Users</h4>
        <div className="space-y-2">
          <Label className="text-xs text-zinc-500">Select users who can access this project</Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-3 bg-muted border rounded-lg">
            {users.map((user) =>
            <label
              key={user.id}
              className="flex items-center gap-2 p-2 rounded hover:bg-accent cursor-pointer transition-colors">
                <input
                type="checkbox"
                checked={(formData.assigned_users || []).includes(user.email)}
                onChange={() => toggleUser(user.email)}
                className="w-4 h-4 rounded" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{user.full_name || user.email}</p>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </div>
              </label>
            )}
          </div>
          {(formData.assigned_users || []).length > 0 &&
          <p className="text-xs text-muted-foreground mt-2">
              {(formData.assigned_users || []).length} user(s) assigned
            </p>
          }
        </div>
      </div>

      <div className="border-t pt-4">
        <h4 className="text-sm font-medium text-muted-foreground mb-3">GC Contact Info</h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Contact Name</Label>
            <Input
              value={formData.gc_contact}
              onChange={(e) => handleChange('gc_contact', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              type="email"
              value={formData.gc_email}
              onChange={(e) => handleChange('gc_email', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Phone</Label>
            <Input
              value={formData.gc_phone}
              onChange={(e) => handleChange('gc_phone', e.target.value)} />
          </div>
        </div>
      </div>

      <div className="border-t pt-4">
        <h4 className="text-sm font-medium text-muted-foreground mb-3">Scope of Work</h4>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Scope Description</Label>
            <Textarea
              value={formData.scope_of_work}
              onChange={(e) => handleChange('scope_of_work', e.target.value)}
              rows={4}
              placeholder="Detailed description of work to be performed..." />
          </div>
          <div className="space-y-2">
            <Label>Exclusions</Label>
            <Textarea
              value={formData.exclusions}
              onChange={(e) => handleChange('exclusions', e.target.value)}
              rows={3}
              placeholder="Work items excluded from this scope..." />
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

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button
          type="submit"
          disabled={isLoading}>
          {isLoading ? 'Saving...' : isEdit ? 'Update Project' : 'Create Project'}
        </Button>
      </div>
    </form>);

}