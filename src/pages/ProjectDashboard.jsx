import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PageHeader from '@/components/ui/PageHeader';
import ProjectScheduleWidget from '@/components/schedule/ProjectScheduleWidget';
import StatusBadge from '@/components/ui/StatusBadge';
import DependencyMap from '@/components/project-dashboard/DependencyMap';
import ProjectNotifications from '@/components/project-dashboard/ProjectNotifications';
import { Building2, AlertTriangle, Calendar, FileText, TrendingUp, TrendingDown, Search, ChevronRight, DollarSign, Network, Bell } from 'lucide-react';
import { format, parseISO, isPast, addDays } from 'date-fns';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';

export default function ProjectDashboard() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [detailView, setDetailView] = useState('schedule');

  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('name'),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000
  });

  const { data: allTasks = [] } = useQuery({
    queryKey: ['all-tasks'],
    queryFn: () => base44.entities.Task.list('end_date'),
    staleTime: 3 * 60 * 1000,
    gcTime: 10 * 60 * 1000
  });

  const { data: workPackages = [] } = useQuery({
    queryKey: ['work-packages'],
    queryFn: () => base44.entities.WorkPackage.list('wpid'),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000
  });

  const { data: documents = [] } = useQuery({
    queryKey: ['documents'],
    queryFn: () => base44.entities.Document.list('-created_date'),
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000
  });

  const { data: financials = [] } = useQuery({
    queryKey: ['financials'],
    queryFn: () => base44.entities.Financial.list(),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ['expenses'],
    queryFn: () => base44.entities.Expense.list(),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000
  });

  const { data: sovItems = [] } = useQuery({
    queryKey: ['sov-items'],
    queryFn: () => base44.entities.SOVItem.list(),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000
  });

  // Calculate project metrics
  const projectMetrics = useMemo(() => {
    const metrics = {};
    
    projects.forEach(project => {
      const projectTasks = allTasks.filter(t => t.project_id === project.id);
      const projectDocs = documents.filter(d => d.project_id === project.id && d.is_current);
      const projectFinancials = financials.filter(f => f.project_id === project.id);
      const projectExpenses = expenses.filter(e => e.project_id === project.id);
      
      const totalTasks = projectTasks.length;
      const completedTasks = projectTasks.filter(t => t.status === 'completed').length;
      const overdueTasks = projectTasks.filter(t => {
        if (t.status === 'completed' || !t.end_date) return false;
        try {
          return isPast(parseISO(t.end_date));
        } catch {
          return false;
        }
      }).length;

      const blockedTasks = projectTasks.filter(t => t.status === 'blocked' || t.status === 'on_hold').length;

      // Work packages data
      const projectWPs = workPackages.filter(wp => wp.project_id === project.id);
      const totalWPs = projectWPs.length;

      // Calculate simple health status
      let healthStatus = 'on_track';
      if (overdueTasks > 0 || blockedTasks > 2) healthStatus = 'at_risk';
      if (overdueTasks > 2) healthStatus = 'delayed';

      const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      // Upcoming milestones (next 30 days)
      const thirtyDaysOut = addDays(new Date(), 30);
      const upcomingMilestones = projectTasks.filter(t => {
        if (!t.is_milestone || !t.end_date) return false;
        try {
          const endDate = parseISO(t.end_date);
          return endDate >= new Date() && endDate <= thirtyDaysOut;
        } catch {
          return false;
        }
      });

      // Recent docs (last 7 days)
      const sevenDaysAgo = addDays(new Date(), -7);
      const recentDocs = projectDocs.filter(d => {
        try {
          return parseISO(d.created_date) >= sevenDaysAgo;
        } catch {
          return false;
        }
      });

      // Financial metrics - prioritize SOV if exists, else use budget
      const projectSOV = sovItems.filter(s => s.project_id === project.id);
      let currentBudget, actualCost, costVariance, percentSpent;

      if (projectSOV.length > 0) {
        // Use SOV-based metrics
        const earnedToDate = projectSOV.reduce((sum, s) => 
          sum + ((s.scheduled_value || 0) * ((s.percent_complete || 0) / 100)), 0);
        actualCost = projectExpenses.filter(e => e.payment_status === 'paid' || e.payment_status === 'approved')
          .reduce((sum, e) => sum + (e.amount || 0), 0);
        currentBudget = projectSOV.reduce((sum, s) => sum + (s.scheduled_value || 0), 0);
        costVariance = earnedToDate - actualCost;
        percentSpent = earnedToDate > 0 ? (actualCost / earnedToDate) * 100 : 0;
      } else {
        // Fallback to budget-based metrics
        currentBudget = projectFinancials.reduce((sum, f) => 
          sum + (f.original_budget || 0) + (f.approved_changes || 0), 0);
        actualCost = projectExpenses.filter(e => e.payment_status === 'paid' || e.payment_status === 'approved')
          .reduce((sum, e) => sum + (e.amount || 0), 0);
        costVariance = currentBudget - actualCost;
        percentSpent = currentBudget > 0 ? (actualCost / currentBudget) * 100 : 0;
      }

      let costHealth = 'green';
      if (percentSpent > 100 || costVariance < 0) costHealth = 'red';
      else if (percentSpent > 90) costHealth = 'yellow';

      metrics[project.id] = {
        totalTasks,
        completedTasks,
        overdueTasks,
        blockedTasks,
        healthStatus,
        progressPercent,
        upcomingMilestones: upcomingMilestones.length,
        recentDocs: recentDocs.length,
        pendingReview: projectDocs.filter(d => d.workflow_stage === 'pending_review').length,
        totalWPs,
        currentBudget,
        actualCost,
        costVariance,
        percentSpent,
        costHealth
      };
    });

    return metrics;
  }, [projects, allTasks, workPackages, documents, financials, expenses, sovItems]);

  // Portfolio summary
  const portfolioSummary = useMemo(() => {
    const activeProjects = projects.filter(p => p.status !== 'completed' && p.status !== 'closed');
    const atRiskProjects = activeProjects.filter(p => projectMetrics[p.id]?.healthStatus === 'at_risk' || projectMetrics[p.id]?.healthStatus === 'delayed');
    const totalOverdueTasks = Object.values(projectMetrics).reduce((sum, m) => sum + m.overdueTasks, 0);
    const totalUpcomingMilestones = Object.values(projectMetrics).reduce((sum, m) => sum + m.upcomingMilestones, 0);

    return {
      totalProjects: projects.length,
      activeProjects: activeProjects.length,
      atRiskProjects: atRiskProjects.length,
      totalOverdueTasks,
      totalUpcomingMilestones
    };
  }, [projects, projectMetrics]);

  // Filter and sort projects
  const filteredProjects = useMemo(() => {
    let filtered = projects.filter(p => {
      const matchesSearch = p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           p.project_number?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
      return matchesSearch && matchesStatus;
    });

    filtered.sort((a, b) => {
      const aMetrics = projectMetrics[a.id] || {};
      const bMetrics = projectMetrics[b.id] || {};

      switch(sortBy) {
        case 'name':
          return (a.name || '').localeCompare(b.name || '');
        case 'progress':
          return (bMetrics.progressPercent || 0) - (aMetrics.progressPercent || 0);
        case 'health':
          const healthOrder = { delayed: 0, at_risk: 1, on_track: 2 };
          return healthOrder[aMetrics.healthStatus] - healthOrder[bMetrics.healthStatus];
        case 'overdue':
          return (bMetrics.overdueTasks || 0) - (aMetrics.overdueTasks || 0);
        default:
          return 0;
      }
    });

    return filtered;
  }, [projects, projectMetrics, searchTerm, statusFilter, sortBy]);

  return (
    <div>
      <PageHeader
        title="Project Dashboard"
        subtitle="Portfolio-level overview and metrics"
      />

      {/* Portfolio Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/10 rounded">
                <Building2 size={18} className="text-amber-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Projects</p>
                <p className="text-2xl font-bold">{portfolioSummary.totalProjects}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded">
                <TrendingUp size={18} className="text-blue-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Active</p>
                <p className="text-2xl font-bold">{portfolioSummary.activeProjects}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-red-500/10 border-red-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500/10 rounded">
                <AlertTriangle size={18} className="text-red-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">At Risk</p>
                <p className="text-2xl font-bold text-red-400">{portfolioSummary.atRiskProjects}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-amber-500/10 border-amber-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/10 rounded">
                <AlertTriangle size={18} className="text-amber-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Overdue Tasks</p>
                <p className="text-2xl font-bold text-amber-400">{portfolioSummary.totalOverdueTasks}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded">
                <Calendar size={18} className="text-green-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Milestones (30d)</p>
                <p className="text-2xl font-bold">{portfolioSummary.totalUpcomingMilestones}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <Input
            placeholder="Search projects..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Status" />
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
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">Name</SelectItem>
            <SelectItem value="progress">Progress</SelectItem>
            <SelectItem value="health">Health</SelectItem>
            <SelectItem value="overdue">Overdue Tasks</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Selected Project Detail View */}
      {selectedProjectId && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">
              {projects.find(p => p.id === selectedProjectId)?.name}
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedProjectId(null)}
              className="text-zinc-400"
            >
              Close
            </Button>
          </div>

          <Tabs value={detailView} onValueChange={setDetailView}>
            <TabsList className="grid w-full grid-cols-3 bg-zinc-900 border border-zinc-800">
              <TabsTrigger value="schedule" className="data-[state=active]:bg-amber-500 data-[state=active]:text-black">
                <Calendar size={14} className="mr-2" />
                Schedule
              </TabsTrigger>
              <TabsTrigger value="dependencies" className="data-[state=active]:bg-amber-500 data-[state=active]:text-black">
                <Network size={14} className="mr-2" />
                Critical Path
              </TabsTrigger>
              <TabsTrigger value="alerts" className="data-[state=active]:bg-amber-500 data-[state=active]:text-black">
                <Bell size={14} className="mr-2" />
                Alerts
              </TabsTrigger>
            </TabsList>

            <TabsContent value="schedule" className="mt-4">
              <ProjectScheduleWidget projectId={selectedProjectId} />
            </TabsContent>

            <TabsContent value="dependencies" className="mt-4">
              <DependencyMap tasks={allTasks} projectId={selectedProjectId} />
            </TabsContent>

            <TabsContent value="alerts" className="mt-4">
              <ProjectNotifications projectId={selectedProjectId} />
            </TabsContent>
          </Tabs>
        </div>
      )}

      {/* Project Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredProjects.map(project => {
          const metrics = projectMetrics[project.id] || {};
          const healthColor = {
            on_track: 'text-green-400 bg-green-500/10 border-green-500/20',
            at_risk: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
            delayed: 'text-red-400 bg-red-500/10 border-red-500/20'
          }[metrics.healthStatus] || 'text-zinc-400';

          const costHealthColor = {
            green: 'text-green-400 bg-green-500/10 border-green-500/30',
            yellow: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
            red: 'text-red-400 bg-red-500/10 border-red-500/30'
          }[metrics.costHealth] || 'text-muted-foreground';

          return (
            <Card key={project.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <Link to={createPageUrl('Projects')}>
                      <CardTitle className="text-base truncate hover:text-amber-400">
                        {project.project_number}
                      </CardTitle>
                    </Link>
                    <p className="text-sm text-muted-foreground truncate mt-1">{project.name}</p>
                  </div>
                  <StatusBadge status={project.status} className="ml-2" />
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                {/* Cost Health */}
                <div className={`p-2 rounded border ${costHealthColor}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs">Cost Health</span>
                    <div className="flex items-center gap-2">
                      <DollarSign size={14} />
                      <span className="text-sm font-bold">{metrics.percentSpent?.toFixed(0) || 0}%</span>
                    </div>
                  </div>
                </div>

                {/* Schedule Health */}
                <div className={`p-2 rounded border ${healthColor}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs">Schedule Health</span>
                    <span className="text-xs font-bold uppercase">
                      {metrics.healthStatus?.replace('_', ' ')}
                    </span>
                  </div>
                </div>

                {/* Progress */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground">Progress</span>
                    <span className="text-sm font-bold">{metrics.progressPercent}%</span>
                  </div>
                  <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-500"
                      style={{ width: `${metrics.progressPercent}%` }}
                    />
                  </div>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-2 bg-secondary rounded">
                    <p className="text-xs text-muted-foreground">Tasks</p>
                    <p className="text-lg font-bold">
                      {metrics.completedTasks}/{metrics.totalTasks}
                    </p>
                  </div>
                  <div className="p-2 bg-secondary rounded">
                    <p className="text-xs text-muted-foreground">Work Packages</p>
                    <p className="text-lg font-bold">{metrics.totalWPs}</p>
                  </div>
                  <div className={`p-2 rounded ${metrics.overdueTasks > 0 ? 'bg-red-500/10' : 'bg-secondary'}`}>
                    <p className="text-xs text-muted-foreground">Overdue</p>
                    <p className={`text-lg font-bold ${metrics.overdueTasks > 0 ? 'text-red-400' : ''}`}>
                      {metrics.overdueTasks}
                    </p>
                  </div>
                  <div className={`p-2 rounded ${metrics.pendingReview > 0 ? 'bg-amber-500/10' : 'bg-secondary'}`}>
                    <p className="text-xs text-muted-foreground">Milestones (30d)</p>
                    <p className={`text-lg font-bold ${metrics.pendingReview > 0 ? 'text-amber-400' : ''}`}>
                      {metrics.upcomingMilestones}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2 border-t border-border">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setSelectedProjectId(selectedProjectId === project.id ? null : project.id);
                      if (selectedProjectId !== project.id) setDetailView('schedule');
                    }}
                  >
                    {selectedProjectId === project.id ? 'Hide' : 'View'} Details
                  </Button>
                  <Link to={createPageUrl('Schedule') + `?project=${project.id}`} className="flex-1">
                    <Button size="sm" className="w-full bg-amber-500 hover:bg-amber-600 text-black">
                      Schedule
                      <ChevronRight size={14} className="ml-1" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredProjects.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">No projects found</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}