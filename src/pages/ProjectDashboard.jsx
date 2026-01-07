import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PageHeader from '@/components/ui/PageHeader';
import ProjectScheduleWidget from '@/components/schedule/ProjectScheduleWidget';
import StatusBadge from '@/components/ui/StatusBadge';
import { Building2, AlertTriangle, Calendar, FileText, TrendingUp, TrendingDown, Search, ChevronRight } from 'lucide-react';
import { format, parseISO, isPast, addDays } from 'date-fns';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';

export default function ProjectDashboard() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [selectedProjectId, setSelectedProjectId] = useState(null);

  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('name'),
    staleTime: 2 * 60 * 1000
  });

  const { data: allTasks = [] } = useQuery({
    queryKey: ['all-tasks'],
    queryFn: () => base44.entities.Task.list('end_date'),
    staleTime: 2 * 60 * 1000
  });

  const { data: documents = [] } = useQuery({
    queryKey: ['documents'],
    queryFn: () => base44.entities.Document.list('-created_date'),
    staleTime: 5 * 60 * 1000
  });

  // Calculate project metrics
  const projectMetrics = useMemo(() => {
    const metrics = {};
    
    projects.forEach(project => {
      const projectTasks = allTasks.filter(t => t.project_id === project.id);
      const projectDocs = documents.filter(d => d.project_id === project.id && d.is_current);
      
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

      metrics[project.id] = {
        totalTasks,
        completedTasks,
        overdueTasks,
        blockedTasks,
        healthStatus,
        progressPercent,
        upcomingMilestones: upcomingMilestones.length,
        recentDocs: recentDocs.length,
        pendingReview: projectDocs.filter(d => d.workflow_stage === 'pending_review').length
      };
    });

    return metrics;
  }, [projects, allTasks, documents]);

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
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/10 rounded">
                <Building2 size={20} className="text-amber-500" />
              </div>
              <div>
                <p className="text-xs text-zinc-400">Total Projects</p>
                <p className="text-2xl font-bold text-white">{portfolioSummary.totalProjects}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded">
                <TrendingUp size={20} className="text-blue-500" />
              </div>
              <div>
                <p className="text-xs text-zinc-400">Active</p>
                <p className="text-2xl font-bold text-white">{portfolioSummary.activeProjects}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-red-500/5 border-red-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500/10 rounded">
                <AlertTriangle size={20} className="text-red-400" />
              </div>
              <div>
                <p className="text-xs text-zinc-400">At Risk</p>
                <p className="text-2xl font-bold text-red-400">{portfolioSummary.atRiskProjects}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-amber-500/5 border-amber-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/10 rounded">
                <AlertTriangle size={20} className="text-amber-400" />
              </div>
              <div>
                <p className="text-xs text-zinc-400">Overdue Tasks</p>
                <p className="text-2xl font-bold text-amber-400">{portfolioSummary.totalOverdueTasks}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded">
                <Calendar size={20} className="text-green-500" />
              </div>
              <div>
                <p className="text-xs text-zinc-400">Milestones (30d)</p>
                <p className="text-2xl font-bold text-white">{portfolioSummary.totalUpcomingMilestones}</p>
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
            className="pl-10 bg-zinc-900 border-zinc-800"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48 bg-zinc-900 border-zinc-800">
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
          <SelectTrigger className="w-full sm:w-48 bg-zinc-900 border-zinc-800">
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

      {/* Selected Project Schedule Widget */}
      {selectedProjectId && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
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
          <ProjectScheduleWidget projectId={selectedProjectId} />
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

          return (
            <Card key={project.id} className="bg-zinc-900/50 border-zinc-800 hover:border-zinc-700 transition-colors">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <Link to={createPageUrl('Projects')}>
                      <CardTitle className="text-base text-white truncate hover:text-amber-400 transition-colors">
                        {project.project_number}
                      </CardTitle>
                    </Link>
                    <p className="text-sm text-zinc-400 truncate mt-1">{project.name}</p>
                  </div>
                  <StatusBadge status={project.status} className="ml-2" />
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Health Status */}
                <div className={`p-3 rounded-lg border ${healthColor}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium">Schedule Health</span>
                    <Badge className={healthColor}>
                      {metrics.healthStatus?.replace('_', ' ').toUpperCase()}
                    </Badge>
                  </div>
                </div>

                {/* Progress */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-zinc-400">Progress</span>
                    <span className="text-sm font-bold text-white">{metrics.progressPercent}%</span>
                  </div>
                  <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-500 transition-all"
                      style={{ width: `${metrics.progressPercent}%` }}
                    />
                  </div>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-2 bg-zinc-800/50 rounded">
                    <p className="text-xs text-zinc-400">Tasks</p>
                    <p className="text-lg font-bold text-white">
                      {metrics.completedTasks}/{metrics.totalTasks}
                    </p>
                  </div>
                  <div className={`p-2 rounded ${metrics.overdueTasks > 0 ? 'bg-red-500/10' : 'bg-zinc-800/50'}`}>
                    <p className="text-xs text-zinc-400">Overdue</p>
                    <p className={`text-lg font-bold ${metrics.overdueTasks > 0 ? 'text-red-400' : 'text-white'}`}>
                      {metrics.overdueTasks}
                    </p>
                  </div>
                  <div className="p-2 bg-zinc-800/50 rounded">
                    <p className="text-xs text-zinc-400">Milestones</p>
                    <p className="text-lg font-bold text-white">{metrics.upcomingMilestones}</p>
                  </div>
                  <div className={`p-2 rounded ${metrics.pendingReview > 0 ? 'bg-amber-500/10' : 'bg-zinc-800/50'}`}>
                    <p className="text-xs text-zinc-400">Docs Review</p>
                    <p className={`text-lg font-bold ${metrics.pendingReview > 0 ? 'text-amber-400' : 'text-white'}`}>
                      {metrics.pendingReview}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2 border-t border-zinc-800">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 border-zinc-700"
                    onClick={() => setSelectedProjectId(selectedProjectId === project.id ? null : project.id)}
                  >
                    {selectedProjectId === project.id ? 'Hide' : 'View'} Health
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
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-12 text-center">
            <p className="text-zinc-400">No projects found</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}