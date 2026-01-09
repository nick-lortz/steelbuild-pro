import React, { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useNavigate, Link } from 'react-router-dom';
import { useActiveProject } from '@/components/shared/hooks/useActiveProject';
import { createPageUrl } from '@/utils';
import CostRiskIndicator from '@/components/financials/CostRiskIndicator';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Building2, 
  DollarSign, 
  Calendar,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  Plus,
  FileText,
  MessageSquareWarning,
  FileCheck,
  Target,
  RefreshCw
} from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import ScreenContainer from '@/components/layout/ScreenContainer';
import StatusBadge from '@/components/ui/StatusBadge';
import { format, differenceInDays } from 'date-fns';

function formatFinancial(value) {
  if (!value || value === 0) return '$0';
  
  const absValue = Math.abs(value);
  
  if (absValue >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  } else if (absValue >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`;
  }
  
  return `$${value.toFixed(0)}`;
}

const KPICard = ({ title, value, icon: Icon, trend, trendValue, subtitle, variant = "default", onClick, loading = false }) => {
  const variants = {
    default: "bg-zinc-900 border-zinc-800 hover:border-zinc-700",
    primary: "bg-amber-500/5 border-amber-500/20 hover:border-amber-500/30",
    success: "bg-green-500/5 border-green-500/20 hover:border-green-500/30",
    warning: "bg-orange-500/5 border-orange-500/20 hover:border-orange-500/30",
    danger: "bg-red-500/5 border-red-500/20 hover:border-red-500/30",
  };
  
  return (
    <Card 
      className={`${variants[variant]} border ${onClick ? 'cursor-pointer hover:shadow-lg' : ''} transition-all`}
      onClick={onClick}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="p-2 rounded bg-zinc-800/50">
            <Icon size={20} className="text-amber-500" />
          </div>
          {trend && (
            <div className={`flex items-center gap-1 text-xs font-medium ${trend === 'up' ? 'text-green-400' : trend === 'down' ? 'text-red-400' : 'text-zinc-400'}`}>
              {trendValue && <span>{trendValue}</span>}
              {trend === 'up' && '↑'}
              {trend === 'down' && '↓'}
            </div>
          )}
        </div>
        <p className="text-xs uppercase tracking-wider text-zinc-500 mb-2 font-medium">{title}</p>
        {loading ? (
          <div className="h-10 w-28 bg-zinc-800 animate-pulse rounded" />
        ) : (
          <>
            <p className="text-3xl font-bold text-white mb-1">{value}</p>
            {subtitle && <p className="text-xs text-zinc-500">{subtitle}</p>}
          </>
        )}
      </CardContent>
    </Card>
  );
};

const ActivityItem = ({ type, title, subtitle, badge, date, onClick }) => {
  const typeIcons = {
    rfi: MessageSquareWarning,
    co: FileCheck,
    task: Target,
    drawing: FileText
  };
  const Icon = typeIcons[type] || FileText;
  
  return (
    <div 
      className="group flex items-center gap-4 py-3 px-4 -mx-4 border-b border-zinc-800/50 last:border-0 hover:bg-zinc-800/30 transition-all cursor-pointer"
      onClick={onClick}
    >
      <div className="p-2 rounded bg-zinc-800/50 group-hover:bg-zinc-700/50 transition-colors">
        <Icon size={14} className="text-zinc-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">{title}</p>
        <p className="text-xs text-zinc-500 truncate">{subtitle}</p>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        {badge}
        <ArrowRight size={14} className="text-zinc-600 group-hover:text-zinc-400 transition-colors" />
      </div>
    </div>
  );
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { activeProjectId } = useActiveProject();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activityPage, setActivityPage] = useState(1);
  const ACTIVITY_PER_PAGE = 10;

  console.log('Active project:', activeProjectId);

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    staleTime: 15 * 60 * 1000,
  });

  // Fetch portfolio metrics
  const { data: metricsData, isLoading: metricsLoading, error: metricsError, refetch: refetchMetrics } = useQuery({
    queryKey: ['portfolioMetrics'],
    queryFn: async () => {
      try {
        const response = await base44.functions.invoke('getPortfolioMetrics', {
          timeframe: '12_months'
        });
        return response.data;
      } catch (error) {
        console.error('Portfolio metrics fetch failed:', error);
        return null;
      }
    },
    staleTime: 5 * 60 * 1000,
    retry: false
  });

  // Fetch projects
  const { data: projects = [], isLoading: projectsLoading, refetch: refetchProjects } = useQuery({
    queryKey: ['dashboardProjects'],
    queryFn: () => base44.entities.Project.list('-updated_date'),
    select: (data) => {
      if (!currentUser) return data;
      if (currentUser.role === 'admin') return data;
      return data.filter(p => 
        p.project_manager === currentUser.email || 
        p.superintendent === currentUser.email ||
        (p.assigned_users && p.assigned_users.includes(currentUser.email))
      );
    },
    staleTime: 5 * 60 * 1000,
  });

  // Fetch recent activity data
  const { data: rfis = [], isLoading: rfisLoading, refetch: refetchRFIs } = useQuery({
    queryKey: ['dashboardRFIs'],
    queryFn: () => base44.entities.RFI.list('-created_date', 20),
    staleTime: 2 * 60 * 1000,
  });

  const { data: changeOrders = [], isLoading: cosLoading, refetch: refetchCOs } = useQuery({
    queryKey: ['dashboardCOs'],
    queryFn: () => base44.entities.ChangeOrder.list('-created_date', 20),
    staleTime: 2 * 60 * 1000,
  });

  const { data: tasks = [], isLoading: tasksLoading, refetch: refetchTasks } = useQuery({
    queryKey: ['dashboardTasks'],
    queryFn: () => base44.entities.Task.list('-updated_date', 20),
    staleTime: 2 * 60 * 1000,
  });

  const { data: drawings = [], isLoading: drawingsLoading, refetch: refetchDrawings } = useQuery({
    queryKey: ['dashboardDrawings'],
    queryFn: () => base44.entities.DrawingSet.list('-created_date', 20),
    staleTime: 5 * 60 * 1000,
  });

  // Fetch financial data for cost risk indicator
  const { data: sovItems = [] } = useQuery({
    queryKey: ['dashboardSOV', activeProjectId],
    queryFn: () => activeProjectId ? base44.entities.SOVItem.filter({ project_id: activeProjectId }) : Promise.resolve([]),
    enabled: !!activeProjectId,
    staleTime: 5 * 60 * 1000,
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ['dashboardExpenses', activeProjectId],
    queryFn: () => activeProjectId ? base44.entities.Expense.filter({ project_id: activeProjectId }) : Promise.resolve([]),
    enabled: !!activeProjectId,
    staleTime: 5 * 60 * 1000,
  });

  const { data: projectChangeOrders = [] } = useQuery({
    queryKey: ['dashboardProjectCOs', activeProjectId],
    queryFn: () => activeProjectId ? base44.entities.ChangeOrder.filter({ project_id: activeProjectId }) : Promise.resolve([]),
    enabled: !!activeProjectId,
    staleTime: 5 * 60 * 1000,
  });

  const { data: estimatedCosts = [] } = useQuery({
    queryKey: ['dashboardETC', activeProjectId],
    queryFn: () => activeProjectId ? base44.entities.EstimatedCostToComplete.filter({ project_id: activeProjectId }) : Promise.resolve([]),
    enabled: !!activeProjectId,
    staleTime: 5 * 60 * 1000,
  });

  // Pull to refresh handler
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await Promise.all([
      refetchMetrics(),
      refetchProjects(),
      refetchRFIs(),
      refetchCOs(),
      refetchTasks(),
      refetchDrawings()
    ]);
    setIsRefreshing(false);
  }, [refetchMetrics, refetchProjects, refetchRFIs, refetchCOs, refetchTasks, refetchDrawings]);

  // Calculate critical issues
  const criticalIssues = React.useMemo(() => {
    const issues = [];
    
    // Check overdue RFIs
    const overdueRFIs = rfis.filter(r => 
      r.due_date && new Date(r.due_date) < new Date() && 
      (r.status === 'pending' || r.status === 'submitted')
    );
    if (overdueRFIs.length > 0) {
      issues.push(`${overdueRFIs.length} overdue RFI${overdueRFIs.length > 1 ? 's' : ''}`);
    }

    // Check overdue drawings
    const overdueDrawings = drawings.filter(d => 
      d.due_date && new Date(d.due_date) < new Date() && 
      !['FFF', 'As-Built'].includes(d.status)
    );
    if (overdueDrawings.length > 0) {
      issues.push(`${overdueDrawings.length} overdue drawing${overdueDrawings.length > 1 ? 's' : ''}`);
    }

    // Check pending COs
    const pendingCOs = changeOrders.filter(co => co.status === 'pending');
    if (pendingCOs.length > 3) {
      issues.push(`${pendingCOs.length} pending change orders`);
    }

    return issues;
  }, [rfis, drawings, changeOrders]);

  // Combine activity feed
  const activityFeed = React.useMemo(() => {
    const items = [];

    rfis.forEach(r => {
      const project = projects.find(p => p.id === r.project_id);
      items.push({
        id: `rfi-${r.id}`,
        type: 'rfi',
        title: `RFI-${String(r.rfi_number).padStart(3, '0')}`,
        subtitle: project?.name || r.subject,
        badge: <StatusBadge status={r.status} className="text-xs" />,
        date: new Date(r.created_date),
        onClick: () => navigate(createPageUrl('RFIs'))
      });
    });

    changeOrders.forEach(co => {
      const project = projects.find(p => p.id === co.project_id);
      items.push({
        id: `co-${co.id}`,
        type: 'co',
        title: `CO-${String(co.co_number).padStart(3, '0')}`,
        subtitle: project?.name || co.title,
        badge: <StatusBadge status={co.status} className="text-xs" />,
        date: new Date(co.created_date),
        onClick: () => navigate(createPageUrl('ChangeOrders'))
      });
    });

    tasks.filter(t => t.status !== 'completed').forEach(t => {
      const project = projects.find(p => p.id === t.project_id);
      items.push({
        id: `task-${t.id}`,
        type: 'task',
        title: t.name,
        subtitle: project?.name || 'Task',
        badge: <StatusBadge status={t.status} className="text-xs" />,
        date: new Date(t.updated_date || t.created_date),
        onClick: () => navigate(createPageUrl('Schedule'))
      });
    });

    return items.sort((a, b) => b.date - a.date);
  }, [rfis, changeOrders, tasks, projects, navigate]);

  const portfolioHealth = React.useMemo(() => 
    metricsData?.portfolioHealth || {},
    [metricsData]
  );
  
  const activeProjects = React.useMemo(() => 
    projects.filter(p => p.status === 'in_progress'),
    [projects]
  );
  
  const upcomingMilestones = React.useMemo(() => 
    activeProjects.filter(p => {
      if (!p.target_completion) return false;
      const days = differenceInDays(new Date(p.target_completion), new Date());
      return days >= 0 && days <= 30;
    }),
    [activeProjects]
  );

  const paginatedActivity = React.useMemo(() => 
    activityFeed.slice(0, activityPage * ACTIVITY_PER_PAGE),
    [activityFeed, activityPage]
  );
  
  const hasMoreActivity = React.useMemo(() => 
    activityFeed.length > paginatedActivity.length,
    [activityFeed.length, paginatedActivity.length]
  );

  // Calculate financial summary for active project
  const activeProjectFinancials = React.useMemo(() => {
    if (!activeProjectId || sovItems.length === 0) return null;

    const contractValue = sovItems.reduce((sum, s) => sum + (s.scheduled_value || 0), 0);
    const signedExtras = projectChangeOrders
      .filter(co => co.status === 'approved')
      .reduce((sum, co) => sum + (co.cost_impact || 0), 0);
    const totalContract = contractValue + signedExtras;
    const earnedToDate = sovItems.reduce((sum, s) => 
      sum + ((s.scheduled_value || 0) * ((s.percent_complete || 0) / 100)), 0);
    const actualCost = expenses
      .filter(e => e.payment_status === 'paid' || e.payment_status === 'approved')
      .reduce((sum, e) => sum + (e.amount || 0), 0);
    
    // Calculate EAC from ETC data
    const totalETC = estimatedCosts.reduce((sum, etc) => sum + (etc.estimated_remaining_cost || 0), 0);
    const estimatedCostAtCompletion = actualCost + totalETC;

    const activeProject = projects.find(p => p.id === activeProjectId);

    return {
      totalContract,
      actualCost,
      estimatedCostAtCompletion,
      plannedMargin: activeProject?.planned_margin || 15
    };
  }, [activeProjectId, sovItems, expenses, projectChangeOrders, estimatedCosts, projects]);

  const isLoading = projectsLoading || metricsLoading || rfisLoading || cosLoading || tasksLoading || drawingsLoading;

  if (isLoading) {
    return (
      <ScreenContainer>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-zinc-400">Loading dashboard...</p>
          </div>
        </div>
      </ScreenContainer>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {/* System Status Bar */}
      <div className="border-b border-zinc-800 bg-zinc-950">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs text-zinc-400 font-medium">SYSTEM OPERATIONAL</span>
            </div>
            <div className="h-4 w-px bg-zinc-800" />
            <span className="text-xs text-zinc-500">{format(new Date(), 'EEEE, MMMM d, yyyy • h:mm a')}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="h-7 text-xs text-zinc-400 hover:text-white"
          >
            <RefreshCw size={12} className={`mr-1.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white tracking-tight mb-2">Command Center</h1>
          <p className="text-zinc-400">
            Welcome back, <span className="text-white font-medium">{currentUser?.full_name || 'User'}</span>
          </p>
        </div>

        {/* Critical Alerts */}
        {criticalIssues.length > 0 && (
          <div className="mb-8 p-4 bg-red-500/5 border border-red-500/20 rounded">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded bg-red-500/10">
                <AlertTriangle size={16} className="text-red-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-red-400 mb-1">IMMEDIATE ATTENTION REQUIRED</p>
                <p className="text-xs text-zinc-300">{criticalIssues.join(' • ')}</p>
              </div>
            </div>
          </div>
        )}

        {/* Core Metrics Grid */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <KPICard
            title="Active Projects"
            value={portfolioHealth.activeProjects || activeProjects.length}
            subtitle={`${projects.length} total`}
            icon={Building2}
            variant="primary"
            onClick={() => navigate(createPageUrl('Projects'))}
            loading={metricsLoading}
          />
          <KPICard
            title="Budget Consumed"
            value={`${portfolioHealth.budgetUtilization || 0}%`}
            trend={portfolioHealth.budgetUtilization > 85 ? 'up' : portfolioHealth.budgetUtilization < 70 ? 'down' : null}
            trendValue={portfolioHealth.budgetUtilization > 85 ? 'High' : ''}
            icon={DollarSign}
            variant={portfolioHealth.budgetUtilization > 90 ? 'danger' : portfolioHealth.budgetUtilization > 75 ? 'warning' : 'success'}
            onClick={() => navigate(createPageUrl('Financials'))}
            loading={metricsLoading}
          />
          <KPICard
            title="Schedule Performance"
            value={`${portfolioHealth.scheduleAdherence || 0}%`}
            subtitle="On-time delivery"
            trend={portfolioHealth.scheduleAdherence > 90 ? 'up' : 'down'}
            icon={Calendar}
            variant={portfolioHealth.scheduleAdherence > 85 ? 'success' : 'warning'}
            onClick={() => navigate(createPageUrl('Schedule'))}
            loading={metricsLoading}
          />
          <KPICard
            title="Overall Progress"
            value={`${portfolioHealth.completionRate || 0}%`}
            subtitle="Portfolio completion"
            icon={TrendingUp}
            variant="default"
            onClick={() => navigate(createPageUrl('Analytics'))}
            loading={metricsLoading}
          />
        </div>

        {/* Active Project Financial Summary */}
        {activeProjectId && activeProjectFinancials && (
          <div className="mb-8 p-6 bg-zinc-900 border border-zinc-800 rounded">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-bold text-white">Active Project Financials</h2>
                <p className="text-xs text-zinc-500 mt-1">
                  {projects.find(p => p.id === activeProjectId)?.name}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-amber-500 hover:text-amber-400"
                onClick={() => navigate(createPageUrl('Financials'))}
              >
                View Details
                <ArrowRight size={14} className="ml-1" />
              </Button>
            </div>
            <div className="grid grid-cols-4 gap-6">
              <div>
                <p className="text-xs uppercase tracking-wider text-zinc-500 mb-2">Contract Value</p>
                <p className="text-2xl font-bold text-white">{formatFinancial(activeProjectFinancials.totalContract)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-zinc-500 mb-2">Actual Cost</p>
                <p className="text-2xl font-bold text-white">{formatFinancial(activeProjectFinancials.actualCost)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-zinc-500 mb-2">Est. at Completion</p>
                <p className="text-2xl font-bold text-white">{formatFinancial(activeProjectFinancials.estimatedCostAtCompletion)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-zinc-500 mb-2">Projected Margin</p>
                <p className={`text-2xl font-bold ${
                  ((activeProjectFinancials.totalContract - activeProjectFinancials.estimatedCostAtCompletion) / activeProjectFinancials.totalContract * 100) > activeProjectFinancials.plannedMargin
                    ? 'text-green-400'
                    : 'text-red-400'
                }`}>
                  {((activeProjectFinancials.totalContract - activeProjectFinancials.estimatedCostAtCompletion) / activeProjectFinancials.totalContract * 100).toFixed(1)}%
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Two Column Layout */}
        <div className="grid grid-cols-2 gap-6">
          {/* Milestones */}
          {upcomingMilestones.length > 0 && (
            <div className="bg-zinc-900 border border-zinc-800 rounded">
              <div className="p-6 border-b border-zinc-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded bg-amber-500/10">
                      <Target size={14} className="text-amber-500" />
                    </div>
                    <h2 className="text-sm font-bold text-white uppercase tracking-wider">Approaching Deadlines</h2>
                  </div>
                  <Badge variant="outline" className="text-xs">{upcomingMilestones.length}</Badge>
                </div>
              </div>
              <div className="p-6">
                <div className="space-y-3">
                  {upcomingMilestones.slice(0, 5).map(project => {
                    const days = differenceInDays(new Date(project.target_completion), new Date());
                    return (
                      <div
                        key={project.id}
                        className="group flex items-center justify-between p-3 bg-zinc-950/50 hover:bg-zinc-800/50 border border-zinc-800/50 rounded cursor-pointer transition-all"
                        onClick={() => navigate(`/ProjectDashboard?id=${project.id}`)}
                      >
                        <div className="flex-1 min-w-0 mr-3">
                          <p className="text-sm font-medium text-white truncate">{project.name}</p>
                          <p className="text-xs text-zinc-500 mt-0.5">{project.project_number}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className={`px-2 py-1 rounded text-xs font-bold ${
                            days < 7 ? 'bg-red-500/10 text-red-400' : days < 14 ? 'bg-amber-500/10 text-amber-400' : 'bg-zinc-800 text-zinc-400'
                          }`}>
                            {days}d
                          </div>
                          <ArrowRight size={12} className="text-zinc-600 group-hover:text-zinc-400" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Activity Stream */}
          <div className="bg-zinc-900 border border-zinc-800 rounded">
            <div className="p-6 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded bg-amber-500/10">
                  <FileText size={14} className="text-amber-500" />
                </div>
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">Recent Activity</h2>
              </div>
            </div>
            <div className="p-6">
              {paginatedActivity.length === 0 ? (
                <div className="text-center py-12">
                  <FileText size={32} className="text-zinc-700 mx-auto mb-3" />
                  <p className="text-sm text-zinc-500">No activity to display</p>
                </div>
              ) : (
                <>
                  <div className="space-y-1">
                    {paginatedActivity.slice(0, 8).map(item => (
                      <ActivityItem key={item.id} {...item} />
                    ))}
                  </div>
                  {hasMoreActivity && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full mt-4 text-xs text-zinc-400 hover:text-white"
                      onClick={() => setActivityPage(p => p + 1)}
                    >
                      Load More Activity
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions Bar */}
        <div className="mt-8 p-4 bg-zinc-900 border border-zinc-800 rounded">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-wider text-zinc-500 font-medium">Quick Actions</p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="text-xs border-zinc-700 hover:border-zinc-600"
                onClick={() => navigate(createPageUrl('Projects'))}
              >
                <Plus size={14} className="mr-1.5" />
                New Project
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-xs border-zinc-700 hover:border-zinc-600"
                onClick={() => navigate(createPageUrl('RFIs'))}
              >
                <MessageSquareWarning size={14} className="mr-1.5" />
                Create RFI
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-xs border-zinc-700 hover:border-zinc-600"
                onClick={() => navigate(createPageUrl('Schedule'))}
              >
                <Calendar size={14} className="mr-1.5" />
                View Schedule
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}