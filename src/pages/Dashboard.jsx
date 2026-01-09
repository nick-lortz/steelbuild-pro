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
  RefreshCw,
  Activity,
  CheckCircle2
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
      className="group px-6 py-3 hover:bg-zinc-900/50 cursor-pointer transition-colors"
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Icon size={14} className="text-zinc-600 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{title}</p>
            <p className="text-xs text-zinc-500 truncate">{subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-3">
          {badge}
          <ArrowRight size={12} className="text-zinc-600 group-hover:text-zinc-400" />
        </div>
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

  // Calculate schedule health
  const scheduleHealth = React.useMemo(() => {
    const overdueCount = tasks.filter(t => 
      t.due_date && 
      new Date(t.due_date) < new Date() && 
      t.status !== 'completed'
    ).length;
    const totalActiveTasks = tasks.filter(t => t.status !== 'completed').length;
    const onTimePercentage = totalActiveTasks > 0 
      ? Math.round(((totalActiveTasks - overdueCount) / totalActiveTasks) * 100)
      : 100;
    
    return {
      overdueCount,
      onTimePercentage,
      status: overdueCount === 0 ? 'on-track' : overdueCount < 5 ? 'warning' : 'critical'
    };
  }, [tasks]);

  // Calculate cost risk status
  const costRiskStatus = React.useMemo(() => {
    if (!activeProjectFinancials) return { status: 'unknown', message: 'No active project' };
    
    const projectedMargin = ((activeProjectFinancials.totalContract - activeProjectFinancials.estimatedCostAtCompletion) / activeProjectFinancials.totalContract * 100);
    const variance = projectedMargin - activeProjectFinancials.plannedMargin;
    
    if (variance >= 0) return { status: 'healthy', message: 'On Target', color: 'green' };
    if (variance >= -3) return { status: 'warning', message: 'Below Target', color: 'amber' };
    return { status: 'critical', message: 'At Risk', color: 'red' };
  }, [activeProjectFinancials]);

  return (
    <div className="min-h-screen bg-black">
      {/* Command Strip */}
      <div className="border-b-2 border-zinc-800">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="grid grid-cols-4 gap-4">
            {/* Action Required */}
            <div 
              className={`p-4 border-2 cursor-pointer transition-all ${
                criticalIssues.length > 0 
                  ? 'bg-red-500/10 border-red-500/50 hover:bg-red-500/20' 
                  : 'bg-zinc-900/50 border-zinc-800 hover:bg-zinc-900'
              }`}
              onClick={() => {
                if (criticalIssues.length > 0) {
                  // Navigate to most critical issue
                  if (criticalIssues[0].includes('RFI')) navigate(createPageUrl('RFIs'));
                  else if (criticalIssues[0].includes('drawing')) navigate(createPageUrl('Detailing'));
                  else navigate(createPageUrl('ChangeOrders'));
                }
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <AlertTriangle size={18} className={criticalIssues.length > 0 ? 'text-red-400' : 'text-zinc-600'} />
                {criticalIssues.length > 0 && (
                  <span className="text-xs font-bold text-red-400 uppercase tracking-wider animate-pulse">Action</span>
                )}
              </div>
              <div className="text-3xl font-bold text-white mb-1">{criticalIssues.length}</div>
              <div className="text-xs uppercase tracking-wider text-zinc-500 mb-2">Issues Require Action</div>
              {criticalIssues.length > 0 && (
                <div className="text-xs text-zinc-400 truncate">{criticalIssues[0]}</div>
              )}
            </div>

            {/* Active Projects */}
            <div 
              className="p-4 bg-zinc-900/50 border-2 border-zinc-800 hover:bg-zinc-900 cursor-pointer transition-all"
              onClick={() => navigate(createPageUrl('Projects'))}
            >
              <div className="flex items-center justify-between mb-2">
                <Building2 size={18} className="text-blue-400" />
              </div>
              <div className="text-3xl font-bold text-white mb-1">
                {portfolioHealth.activeProjects || activeProjects.length}
              </div>
              <div className="text-xs uppercase tracking-wider text-zinc-500 mb-2">Active Projects</div>
              <div className="text-xs text-zinc-400">{projects.length} total portfolio</div>
            </div>

            {/* Schedule Health */}
            <div 
              className={`p-4 border-2 cursor-pointer transition-all ${
                scheduleHealth.status === 'critical' 
                  ? 'bg-red-500/10 border-red-500/50 hover:bg-red-500/20'
                  : scheduleHealth.status === 'warning'
                  ? 'bg-amber-500/10 border-amber-500/50 hover:bg-amber-500/20'
                  : 'bg-green-500/10 border-green-500/50 hover:bg-green-500/20'
              }`}
              onClick={() => navigate(createPageUrl('Schedule'))}
            >
              <div className="flex items-center justify-between mb-2">
                <Calendar size={18} className={
                  scheduleHealth.status === 'critical' ? 'text-red-400' :
                  scheduleHealth.status === 'warning' ? 'text-amber-400' : 'text-green-400'
                } />
                {scheduleHealth.overdueCount > 0 && (
                  <span className="text-xs font-bold text-red-400">{scheduleHealth.overdueCount} Late</span>
                )}
              </div>
              <div className="text-3xl font-bold text-white mb-1">{scheduleHealth.onTimePercentage}%</div>
              <div className="text-xs uppercase tracking-wider text-zinc-500 mb-2">Schedule Health</div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1 bg-zinc-800 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${
                      scheduleHealth.status === 'critical' ? 'bg-red-500' :
                      scheduleHealth.status === 'warning' ? 'bg-amber-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${scheduleHealth.onTimePercentage}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Cost Risk */}
            <div 
              className={`p-4 border-2 cursor-pointer transition-all ${
                costRiskStatus.status === 'critical' 
                  ? 'bg-red-500/10 border-red-500/50 hover:bg-red-500/20'
                  : costRiskStatus.status === 'warning'
                  ? 'bg-amber-500/10 border-amber-500/50 hover:bg-amber-500/20'
                  : costRiskStatus.status === 'healthy'
                  ? 'bg-green-500/10 border-green-500/50 hover:bg-green-500/20'
                  : 'bg-zinc-900/50 border-zinc-800 hover:bg-zinc-900'
              }`}
              onClick={() => activeProjectId && navigate(createPageUrl('Financials'))}
            >
              <div className="flex items-center justify-between mb-2">
                <DollarSign size={18} className={
                  costRiskStatus.status === 'critical' ? 'text-red-400' :
                  costRiskStatus.status === 'warning' ? 'text-amber-400' : 
                  costRiskStatus.status === 'healthy' ? 'text-green-400' : 'text-zinc-600'
                } />
                {activeProjectFinancials && (
                  <span className={`text-xs font-bold ${
                    costRiskStatus.status === 'critical' ? 'text-red-400' :
                    costRiskStatus.status === 'warning' ? 'text-amber-400' : 'text-green-400'
                  }`}>
                    {((activeProjectFinancials.totalContract - activeProjectFinancials.estimatedCostAtCompletion) / activeProjectFinancials.totalContract * 100).toFixed(1)}%
                  </span>
                )}
              </div>
              <div className="text-3xl font-bold text-white mb-1">
                {costRiskStatus.message}
              </div>
              <div className="text-xs uppercase tracking-wider text-zinc-500 mb-2">Cost Risk Status</div>
              {activeProjectFinancials && (
                <div className="text-xs text-zinc-400">
                  {formatFinancial(activeProjectFinancials.estimatedCostAtCompletion)} EAC
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header Bar */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-white uppercase tracking-wide">Operations Dashboard</h1>
              <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                <span>{format(new Date(), 'MMM d, yyyy')}</span>
              </div>
            </div>
            <p className="text-xs text-zinc-500 mt-1">{currentUser?.full_name || 'User'}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="h-8 text-xs text-zinc-400 hover:text-white"
          >
            <RefreshCw size={14} className={`mr-1.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh Data
          </Button>
        </div>

        {/* Secondary Metrics */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="p-4 bg-zinc-900/30 border border-zinc-800/50">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs uppercase tracking-wider text-zinc-500">Budget Used</span>
              <DollarSign size={14} className="text-zinc-600" />
            </div>
            <div className="text-2xl font-bold text-white mb-2">{portfolioHealth.budgetUtilization || 0}%</div>
            <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
              <div 
                className={`h-full ${
                  (portfolioHealth.budgetUtilization || 0) > 90 ? 'bg-red-500' :
                  (portfolioHealth.budgetUtilization || 0) > 75 ? 'bg-amber-500' : 'bg-green-500'
                }`}
                style={{ width: `${Math.min(portfolioHealth.budgetUtilization || 0, 100)}%` }}
              />
            </div>
          </div>
          
          <div className="p-4 bg-zinc-900/30 border border-zinc-800/50">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs uppercase tracking-wider text-zinc-500">Completion</span>
              <TrendingUp size={14} className="text-zinc-600" />
            </div>
            <div className="text-2xl font-bold text-white mb-2">{portfolioHealth.completionRate || 0}%</div>
            <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-500"
                style={{ width: `${Math.min(portfolioHealth.completionRate || 0, 100)}%` }}
              />
            </div>
          </div>

          <div className="p-4 bg-zinc-900/30 border border-zinc-800/50">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs uppercase tracking-wider text-zinc-500">Open RFIs</span>
              <MessageSquareWarning size={14} className="text-zinc-600" />
            </div>
            <div className="text-2xl font-bold text-white mb-2">
              {rfis.filter(r => r.status === 'pending' || r.status === 'submitted').length}
            </div>
            <div className="text-xs text-zinc-500">
              {rfis.filter(r => r.due_date && new Date(r.due_date) < new Date()).length} overdue
            </div>
          </div>

          <div className="p-4 bg-zinc-900/30 border border-zinc-800/50">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs uppercase tracking-wider text-zinc-500">Pending COs</span>
              <FileCheck size={14} className="text-zinc-600" />
            </div>
            <div className="text-2xl font-bold text-white mb-2">
              {changeOrders.filter(co => co.status === 'pending' || co.status === 'submitted').length}
            </div>
            <div className="text-xs text-zinc-500">
              {formatFinancial(changeOrders.filter(co => co.status === 'pending' || co.status === 'submitted').reduce((sum, co) => sum + (co.cost_impact || 0), 0))} value
            </div>
          </div>
        </div>

        {/* Active Project Detail */}
        {activeProjectId && activeProjectFinancials && (
          <div className="mb-6 border-2 border-zinc-800">
            <div className="px-6 py-4 border-b border-zinc-800 bg-zinc-900/50">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-white uppercase tracking-wider">Active Project</h2>
                    <Badge variant="outline" className="text-xs">
                      {projects.find(p => p.id === activeProjectId)?.project_number}
                    </Badge>
                  </div>
                  <p className="text-xs text-zinc-500 mt-1">
                    {projects.find(p => p.id === activeProjectId)?.name}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-amber-500 hover:text-amber-400 text-xs"
                  onClick={() => navigate(createPageUrl('Financials'))}
                >
                  Full Details
                  <ArrowRight size={12} className="ml-1" />
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-5 divide-x divide-zinc-800">
              <div className="px-6 py-4">
                <p className="text-xs uppercase tracking-wider text-zinc-500 mb-2">Contract</p>
                <p className="text-xl font-bold text-white">{formatFinancial(activeProjectFinancials.totalContract)}</p>
              </div>
              <div className="px-6 py-4">
                <p className="text-xs uppercase tracking-wider text-zinc-500 mb-2">Actual Cost</p>
                <p className="text-xl font-bold text-white">{formatFinancial(activeProjectFinancials.actualCost)}</p>
              </div>
              <div className="px-6 py-4">
                <p className="text-xs uppercase tracking-wider text-zinc-500 mb-2">EAC</p>
                <p className="text-xl font-bold text-white">{formatFinancial(activeProjectFinancials.estimatedCostAtCompletion)}</p>
              </div>
              <div className="px-6 py-4">
                <p className="text-xs uppercase tracking-wider text-zinc-500 mb-2">Margin</p>
                <p className={`text-xl font-bold ${
                  ((activeProjectFinancials.totalContract - activeProjectFinancials.estimatedCostAtCompletion) / activeProjectFinancials.totalContract * 100) > activeProjectFinancials.plannedMargin
                    ? 'text-green-400'
                    : 'text-red-400'
                }`}>
                  {((activeProjectFinancials.totalContract - activeProjectFinancials.estimatedCostAtCompletion) / activeProjectFinancials.totalContract * 100).toFixed(1)}%
                </p>
                <p className="text-xs text-zinc-500 mt-1">
                  Target: {activeProjectFinancials.plannedMargin}%
                </p>
              </div>
              <div className="px-6 py-4">
                <p className="text-xs uppercase tracking-wider text-zinc-500 mb-2">Status</p>
                <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-bold ${
                  costRiskStatus.status === 'healthy' 
                    ? 'bg-green-500/10 text-green-400'
                    : costRiskStatus.status === 'warning'
                    ? 'bg-amber-500/10 text-amber-400'
                    : 'bg-red-500/10 text-red-400'
                }`}>
                  {costRiskStatus.status === 'healthy' && <CheckCircle2 size={12} />}
                  {costRiskStatus.status === 'warning' && <AlertTriangle size={12} />}
                  {costRiskStatus.status === 'critical' && <AlertTriangle size={12} />}
                  {costRiskStatus.message}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Two Column Layout */}
        <div className="grid grid-cols-2 gap-6">
          {/* Approaching Deadlines */}
          {upcomingMilestones.length > 0 ? (
            <div className="border border-zinc-800">
              <div className="px-6 py-4 border-b border-zinc-800 bg-zinc-900/30">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-bold text-white uppercase tracking-wider">Approaching Deadlines</h2>
                  <Badge variant="outline" className="text-xs">{upcomingMilestones.length}</Badge>
                </div>
              </div>
              <div className="divide-y divide-zinc-800/50">
                {upcomingMilestones.slice(0, 6).map(project => {
                  const days = differenceInDays(new Date(project.target_completion), new Date());
                  return (
                    <div
                      key={project.id}
                      className="group px-6 py-3 hover:bg-zinc-900/50 cursor-pointer transition-colors"
                      onClick={() => navigate(`/ProjectDashboard?id=${project.id}`)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0 mr-3">
                          <p className="text-sm font-medium text-white truncate">{project.name}</p>
                          <p className="text-xs text-zinc-500">{project.project_number}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                            days < 7 ? 'bg-red-500/20 text-red-400' : 
                            days < 14 ? 'bg-amber-500/20 text-amber-400' : 
                            'bg-zinc-800 text-zinc-400'
                          }`}>
                            {days}d
                          </span>
                          <ArrowRight size={12} className="text-zinc-600 group-hover:text-zinc-400" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="border border-zinc-800 flex items-center justify-center py-12">
              <div className="text-center">
                <Target size={32} className="text-zinc-700 mx-auto mb-2" />
                <p className="text-xs text-zinc-500">No upcoming deadlines</p>
              </div>
            </div>
          )}

          {/* Recent Activity */}
          <div className="border border-zinc-800">
            <div className="px-6 py-4 border-b border-zinc-800 bg-zinc-900/30">
              <h2 className="text-xs font-bold text-white uppercase tracking-wider">Recent Activity</h2>
            </div>
            {paginatedActivity.length === 0 ? (
              <div className="text-center py-12">
                <Activity size={32} className="text-zinc-700 mx-auto mb-2" />
                <p className="text-xs text-zinc-500">No recent activity</p>
              </div>
            ) : (
              <>
                <div className="divide-y divide-zinc-800/50">
                  {paginatedActivity.slice(0, 6).map(item => (
                    <ActivityItem key={item.id} {...item} />
                  ))}
                </div>
                {hasMoreActivity && (
                  <div className="p-3 border-t border-zinc-800">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-xs text-zinc-400 hover:text-white"
                      onClick={() => setActivityPage(p => p + 1)}
                    >
                      Load More
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}