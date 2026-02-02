import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { 
  RefreshCw, TrendingUp, TrendingDown, DollarSign, Users, 
  Building, AlertTriangle, Clock, Flag, Activity, Plus, MessageSquareWarning
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { useActiveProject } from '@/components/shared/hooks/useActiveProject';
import ProjectHealthTable from '@/components/dashboard/ProjectHealthTable';
import ProjectFiltersBar from '@/components/dashboard/ProjectFiltersBar';
import { differenceInDays, addDays } from 'date-fns';
import { Card } from "@/components/ui/card";
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { calculateProjectRiskScore, RISK_LEVELS } from '@/components/shared/riskScoring';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Trash2, Pencil } from 'lucide-react';

export default function Dashboard() {
  const { activeProjectId, setActiveProjectId } = useActiveProject();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [riskFilter, setRiskFilter] = useState('all');
  const [sortBy, setSortBy] = useState('risk');
  const [showRFIModal, setShowRFIModal] = useState(false);
  const [editingRFI, setEditingRFI] = useState(null);

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    staleTime: Infinity
  });

  const { data: allProjects = [], isLoading: projectsLoading, refetch: refetchProjects } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('name')
  });

  const userProjects = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === 'admin') return allProjects;
    return allProjects.filter(p => 
      p.project_manager === currentUser.email || 
      p.superintendent === currentUser.email ||
      (p.assigned_users && p.assigned_users.includes(currentUser.email))
    );
  }, [currentUser, allProjects]);

  const { data: allTasks = [], refetch: refetchTasks } = useQuery({
    queryKey: ['all-tasks'],
    queryFn: () => base44.entities.Task.list('-updated_date', 1000),
    staleTime: 2 * 60 * 1000
  });

  const { data: allFinancials = [], refetch: refetchFinancials } = useQuery({
    queryKey: ['all-financials'],
    queryFn: () => base44.entities.Financial.list('project_id', 1000),
    staleTime: 5 * 60 * 1000
  });

  const { data: allChangeOrders = [], refetch: refetchCOs } = useQuery({
    queryKey: ['all-change-orders'],
    queryFn: () => base44.entities.ChangeOrder.list('-created_date', 500),
    staleTime: 5 * 60 * 1000
  });

  const { data: allRFIs = [], refetch: refetchRFIs } = useQuery({
    queryKey: ['all-rfis'],
    queryFn: () => base44.entities.RFI.list('-created_date', 500),
    staleTime: 2 * 60 * 1000
  });

  // Portfolio metrics calculation
  const portfolioMetrics = useMemo(() => {
    const totalProjects = userProjects.length;
    const activeProjects = userProjects.filter(p => p.status === 'in_progress' || p.status === 'awarded').length;

    const projectTasks = allTasks.filter(t => userProjects.some(p => p.id === t.project_id));
    const today = new Date().toISOString().split('T')[0];
    const overdueTasks = projectTasks.filter(t => 
      t.status !== 'completed' && t.end_date && t.end_date < today
    ).length;

    const upcomingMilestones = projectTasks.filter(t => 
      t.is_milestone && 
      t.end_date && 
      t.end_date >= today &&
      t.end_date <= addDays(new Date(), 30).toISOString().split('T')[0]
    ).length;

    return {
      totalProjects,
      activeProjects,
      atRiskProjects: 0, // Calculated below
      overdueTasks,
      upcomingMilestones,
      totalTasks: projectTasks.length,
      riskTrend: 0
    };
  }, [userProjects, allTasks]);

  // Enhanced project data with health metrics
  const projectsWithHealth = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];

    return userProjects.map(project => {
      const projectTasks = allTasks.filter(t => t.project_id === project.id);
      const projectFinancials = allFinancials.filter(f => f.project_id === project.id);
      const projectRFIs = allRFIs.filter(r => r.project_id === project.id);
      const projectCOs = allChangeOrders.filter(c => c.project_id === project.id);

      // Tasks
      const completedTasks = projectTasks.filter(t => t.status === 'completed').length;
      const overdueTasks = projectTasks.filter(t => 
        t.status !== 'completed' && t.end_date && t.end_date < today
      ).length;

      // Cost Health: % over/under budget
      const budget = projectFinancials.reduce((sum, f) => sum + (f.current_budget || 0), 0);
      const actual = projectFinancials.reduce((sum, f) => sum + (f.actual_amount || 0), 0);
      const budgetVsActual = budget > 0 ? ((actual / budget) * 100) : 0;
      const costHealth = budget > 0 ? ((budget - actual) / budget * 100) : 0;

      // Schedule health: days slip
      let daysSlip = 0;
      if (project.target_completion) {
        try {
          const targetDate = new Date(project.target_completion + 'T00:00:00');
          const validTasks = projectTasks.filter(t => t.end_date);
          if (validTasks.length > 0) {
            const latestTaskEnd = validTasks
              .map(t => {
                try {
                  return new Date(t.end_date + 'T00:00:00');
                } catch {
                  return null;
                }
              })
              .filter(d => d !== null)
              .sort((a, b) => b - a)[0];

            if (latestTaskEnd && latestTaskEnd > targetDate) {
              daysSlip = differenceInDays(latestTaskEnd, targetDate);
            }
          }
        } catch (error) {
          console.warn('Date calculation error for project:', project.id, error);
        }
      }

      const openRFIs = projectRFIs.filter(r => r.status !== 'answered' && r.status !== 'closed').length;
      const pendingCOs = projectCOs.filter(c => c.status === 'pending' || c.status === 'submitted').length;

      // Progress: % of tasks complete
      const progress = projectTasks.length > 0 ? (completedTasks / projectTasks.length * 100) : 0;

      // Calculate risk score
      const riskAnalysis = calculateProjectRiskScore(
        project,
        projectTasks,
        projectRFIs,
        projectFinancials,
        projectCOs
      );

      return {
        id: project.id,
        name: project.name,
        project_number: project.project_number,
        status: project.status,
        progress: Math.round(progress),
        costHealth,
        daysSlip,
        totalTasks: projectTasks.length,
        completedTasks,
        overdueTasks,
        budgetVsActual: Math.round(budgetVsActual),
        openRFIs,
        pendingCOs,
        riskScore: riskAnalysis.totalScore,
        riskLevel: riskAnalysis.riskLevel,
        riskFactors: riskAnalysis.factors
      };
    });
  }, [userProjects, allTasks, allFinancials, allRFIs, allChangeOrders]);

  // Update portfolio metrics with actual at-risk count
  const enhancedMetrics = useMemo(() => {
    const atRiskCount = projectsWithHealth.filter(p => 
      p.riskLevel.value >= RISK_LEVELS.HIGH.value
    ).length;
    
    const criticalCount = projectsWithHealth.filter(p => 
      p.riskLevel.value === RISK_LEVELS.CRITICAL.value
    ).length;

    return {
      ...portfolioMetrics,
      atRiskProjects: atRiskCount,
      criticalProjects: criticalCount
    };
  }, [portfolioMetrics, projectsWithHealth]);

  // Filtered projects
  const filteredProjects = useMemo(() => {
    let filtered = [...projectsWithHealth];

    // Search
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(p => 
        p.name?.toLowerCase().includes(search) || 
        p.project_number?.toLowerCase().includes(search)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(p => p.status === statusFilter);
    }

    // Risk filter
    if (riskFilter === 'critical') {
      filtered = filtered.filter(p => p.riskLevel.value === RISK_LEVELS.CRITICAL.value);
    } else if (riskFilter === 'high') {
      filtered = filtered.filter(p => p.riskLevel.value === RISK_LEVELS.HIGH.value);
    } else if (riskFilter === 'at_risk') {
      filtered = filtered.filter(p => p.riskLevel.value >= RISK_LEVELS.HIGH.value);
    } else if (riskFilter === 'healthy') {
      filtered = filtered.filter(p => p.riskLevel.value === RISK_LEVELS.LOW.value);
    }

    // Sort
    if (sortBy === 'risk') {
      filtered.sort((a, b) => {
        if (b.riskScore !== a.riskScore) return b.riskScore - a.riskScore;
        return (a.name || '').localeCompare(b.name || '');
      });
    } else if (sortBy === 'name') {
      filtered.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    } else if (sortBy === 'progress') {
      filtered.sort((a, b) => b.progress - a.progress);
    } else if (sortBy === 'budget') {
      filtered.sort((a, b) => b.budgetVsActual - a.budgetVsActual);
    } else if (sortBy === 'schedule') {
      filtered.sort((a, b) => b.daysSlip - a.daysSlip);
    }

    return filtered;
  }, [projectsWithHealth, searchTerm, statusFilter, riskFilter, sortBy]);

  const hasActiveFilters = searchTerm || statusFilter !== 'all' || riskFilter !== 'all';

  const handleClearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setRiskFilter('all');
  };

  const queryClient = useQueryClient();

  const createRFIMutation = useMutation({
    mutationFn: (data) => base44.entities.RFI.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-rfis'] });
      toast.success('RFI created');
      setShowRFIModal(false);
      setEditingRFI(null);
    },
    onError: () => toast.error('Failed to create RFI')
  });

  const updateRFIMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.RFI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-rfis'] });
      toast.success('RFI updated');
      setShowRFIModal(false);
      setEditingRFI(null);
    },
    onError: () => toast.error('Failed to update RFI')
  });

  const deleteRFIMutation = useMutation({
    mutationFn: (id) => base44.entities.RFI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-rfis'] });
      toast.success('RFI deleted');
    },
    onError: () => toast.error('Failed to delete RFI')
  });

  if (projectsLoading || !currentUser) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-8 bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950">
      {/* Header */}
      <div className="relative mb-8 overflow-hidden rounded-2xl bg-gradient-to-r from-amber-600/10 via-zinc-900/50 to-amber-600/5 border border-amber-500/20 p-8">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjAzIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-40"></div>
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-amber-500 flex items-center justify-center shadow-2xl shadow-amber-500/30">
              <Building className="w-8 h-8 text-black" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-white tracking-tight">Dashboard</h1>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-zinc-400 font-medium">{enhancedMetrics.totalProjects} Projects</p>
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              size="sm"
              onClick={() => {
                setEditingRFI(null);
                setShowRFIModal(true);
              }}
              className="gap-2 bg-amber-500 hover:bg-amber-600 text-black"
            >
              <Plus size={14} />
              Add RFI
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                refetchProjects();
                refetchTasks();
                refetchFinancials();
                refetchCOs();
                refetchRFIs();
              }}
              className="gap-2 bg-amber-500/10 border-amber-500/20 text-amber-500 hover:bg-amber-500/20 hover:text-amber-400"
            >
              <RefreshCw size={14} />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <Card className="border-zinc-800/50 bg-zinc-900/40 backdrop-blur-xl">
          <div className="p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center ring-1 ring-blue-500/30">
                <Building className="w-5 h-5 text-blue-400" />
              </div>
              <p className="text-3xl font-bold text-white">{enhancedMetrics.totalProjects}</p>
            </div>
            <p className="text-sm text-zinc-400">Total Projects</p>
          </div>
        </Card>

        <Card className="border-zinc-800/50 bg-zinc-900/40 backdrop-blur-xl">
          <div className="p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center ring-1 ring-green-500/30">
                <Activity className="w-5 h-5 text-green-400" />
              </div>
              <p className="text-3xl font-bold text-white">{enhancedMetrics.activeProjects}</p>
            </div>
            <p className="text-sm text-zinc-400">Active Projects</p>
          </div>
        </Card>

        <Card className="border-zinc-800/50 bg-zinc-900/40 backdrop-blur-xl">
          <div className="p-5">
            <div className="flex items-start justify-between mb-3">
              <div className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center ring-1",
                enhancedMetrics.atRiskProjects > 0 
                  ? "bg-amber-500/20 ring-amber-500/30" 
                  : "bg-green-500/20 ring-green-500/30"
              )}>
                <AlertTriangle className={cn("w-5 h-5", enhancedMetrics.atRiskProjects > 0 ? "text-amber-400" : "text-green-400")} />
              </div>
              <p className="text-3xl font-bold text-white">{enhancedMetrics.atRiskProjects}</p>
            </div>
            <p className="text-sm text-zinc-400">At Risk</p>
          </div>
        </Card>

        <Card className="border-zinc-800/50 bg-zinc-900/40 backdrop-blur-xl">
          <div className="p-5">
            <div className="flex items-start justify-between mb-3">
              <div className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center ring-1",
                enhancedMetrics.overdueTasks > 0 
                  ? "bg-red-500/20 ring-red-500/30" 
                  : "bg-zinc-500/20 ring-zinc-500/30"
              )}>
                <Clock className={cn("w-5 h-5", enhancedMetrics.overdueTasks > 0 ? "text-red-400" : "text-zinc-500")} />
              </div>
              <p className="text-3xl font-bold text-white">{enhancedMetrics.overdueTasks}</p>
            </div>
            <p className="text-sm text-zinc-400">Overdue Tasks</p>
          </div>
        </Card>

        <Card className="border-zinc-800/50 bg-zinc-900/40 backdrop-blur-xl">
          <div className="p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center ring-1 ring-purple-500/30">
                <Flag className="w-5 h-5 text-purple-400" />
              </div>
              <p className="text-3xl font-bold text-white">{enhancedMetrics.upcomingMilestones}</p>
            </div>
            <p className="text-sm text-zinc-400">Upcoming Milestones</p>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <div className="my-6">
        <ProjectFiltersBar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          statusFilter={statusFilter}
          onStatusChange={setStatusFilter}
          riskFilter={riskFilter}
          onRiskChange={setRiskFilter}
          sortBy={sortBy}
          onSortChange={setSortBy}
          onClearFilters={handleClearFilters}
          hasActiveFilters={hasActiveFilters}
        />
      </div>

      {/* Project Health Table */}
      <div className="mb-4">
        <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-3">
          Project Health Overview
        </h2>
        <ProjectHealthTable 
          projects={filteredProjects}
          onProjectClick={(projectId) => setActiveProjectId(projectId)}
        />
      </div>

      {filteredProjects.length === 0 && (
        <div className="text-center py-12">
          <p className="text-sm text-muted-foreground">No projects match your filters</p>
        </div>
      )}

      {/* RFI List Section */}
      {allRFIs.length > 0 && (
        <div className="mt-8">
          <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-3">
            Recent RFIs
          </h2>
          <Card className="border-zinc-800/50 bg-zinc-900/40 backdrop-blur-xl">
            <div className="p-4">
              <div className="space-y-2">
                {allRFIs.slice(0, 10).map(rfi => (
                  <div key={rfi.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-zinc-800/50 transition-colors group">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <MessageSquareWarning size={16} className="text-amber-500 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-white truncate">{rfi.subject}</p>
                          <p className="text-xs text-zinc-500">RFI #{rfi.rfi_number}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingRFI(rfi);
                          setShowRFIModal(true);
                        }}
                        className="h-7 w-7 p-0"
                      >
                        <Pencil size={14} />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          if (confirm('Delete this RFI?')) {
                            deleteRFIMutation.mutate(rfi.id);
                          }
                        }}
                        className="h-7 w-7 p-0 text-red-500 hover:text-red-600"
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* RFI Modal */}
      <Dialog open={showRFIModal} onOpenChange={setShowRFIModal}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingRFI ? 'Edit RFI' : 'Create RFI'}</DialogTitle>
          </DialogHeader>
          <RFIForm
            rfi={editingRFI}
            projects={userProjects}
            allRFIs={allRFIs}
            onSubmit={(data) => {
              if (editingRFI) {
                updateRFIMutation.mutate({ id: editingRFI.id, data });
              } else {
                createRFIMutation.mutate(data);
              }
            }}
            onCancel={() => {
              setShowRFIModal(false);
              setEditingRFI(null);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RFIForm({ rfi, projects, onSubmit, onCancel, allRFIs = [] }) {
  const [formData, setFormData] = useState(() => {
    if (rfi) return rfi;
    
    const projectId = projects[0]?.id || '';
    const projectRFIs = allRFIs.filter(r => r.project_id === projectId);
    const maxNumber = projectRFIs.length > 0 
      ? Math.max(...projectRFIs.map(r => r.rfi_number || 0))
      : 0;
    
    return {
      project_id: projectId,
      rfi_number: maxNumber + 1,
      subject: '',
      question: '',
      status: 'draft',
      priority: 'medium',
      ball_in_court: 'internal'
    };
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.project_id || !formData.subject) {
      toast.error('Project and subject required');
      return;
    }
    
    // Recalculate RFI number on submit to ensure it's current
    if (!rfi) {
      const projectRFIs = allRFIs.filter(r => r.project_id === formData.project_id);
      const maxNumber = projectRFIs.length > 0 
        ? Math.max(...projectRFIs.map(r => r.rfi_number || 0))
        : 0;
      formData.rfi_number = maxNumber + 1;
    }
    
    onSubmit(formData);
  };

  const handleProjectChange = (projectId) => {
    const projectRFIs = allRFIs.filter(r => r.project_id === projectId);
    const maxNumber = projectRFIs.length > 0 
      ? Math.max(...projectRFIs.map(r => r.rfi_number || 0))
      : 0;
    
    setFormData({
      ...formData,
      project_id: projectId,
      rfi_number: maxNumber + 1
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-xs text-zinc-400 mb-2 block">Project *</label>
        <Select 
          value={formData.project_id} 
          onValueChange={handleProjectChange}
        >
          <SelectTrigger className="bg-zinc-800 border-zinc-700">
            <SelectValue placeholder="Select project" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-800 border-zinc-700">
            {projects.map(p => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-[10px] text-zinc-500 mt-1">Next RFI #: {formData.rfi_number}</p>
      </div>

      <div>
        <label className="text-xs text-zinc-400 mb-2 block">Subject *</label>
        <Input
          value={formData.subject}
          onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
          placeholder="RFI subject"
          className="bg-zinc-800 border-zinc-700"
        />
      </div>

      <div>
        <label className="text-xs text-zinc-400 mb-2 block">Question</label>
        <Textarea
          value={formData.question}
          onChange={(e) => setFormData({ ...formData, question: e.target.value })}
          placeholder="Detailed question"
          className="bg-zinc-800 border-zinc-700"
          rows={4}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-zinc-400 mb-2 block">Priority</label>
          <Select 
            value={formData.priority} 
            onValueChange={(val) => setFormData({ ...formData, priority: val })}
          >
            <SelectTrigger className="bg-zinc-800 border-zinc-700">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-zinc-800 border-zinc-700">
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-xs text-zinc-400 mb-2 block">Status</label>
          <Select 
            value={formData.status} 
            onValueChange={(val) => setFormData({ ...formData, status: val })}
          >
            <SelectTrigger className="bg-zinc-800 border-zinc-700">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-zinc-800 border-zinc-700">
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="submitted">Submitted</SelectItem>
              <SelectItem value="under_review">Under Review</SelectItem>
              <SelectItem value="answered">Answered</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" className="bg-amber-500 hover:bg-amber-600 text-black">
          {rfi ? 'Update' : 'Create'}
        </Button>
      </div>
    </form>
  );
}