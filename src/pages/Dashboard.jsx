import React, { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useNavigate, Link } from 'react-router-dom';
import { useActiveProject } from '@/components/shared/hooks/useActiveProject';
import { createPageUrl } from '@/utils';
import { WidgetContainer } from '@/components/dashboard/WidgetGrid';
import ProjectHealthWidget from '@/components/dashboard/ProjectHealthWidget';
import DashboardNotificationCenter from '@/components/dashboard/DashboardNotificationCenter';
import UpcomingDeadlinesWidget from '@/components/dashboard/UpcomingDeadlinesWidget';
import QuickMetricsWidget from '@/components/dashboard/QuickMetricsWidget';
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
  CheckCircle2,
  Settings,
  LayoutGrid,
  X
} from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
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

// Removed - no longer using KPICard component

const ActivityItem = ({ type, title, subtitle, badge, date, onClick }) => {
  return (
    <div 
      className="group px-6 py-3 hover:bg-zinc-950 cursor-pointer transition-colors"
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-xs text-white font-medium truncate">{title}</span>
          </div>
          <span className="text-[10px] text-zinc-600 truncate">{subtitle}</span>
        </div>
        <div className="flex items-center gap-3 ml-3">
          {badge}
          <span className="text-zinc-700 group-hover:text-zinc-500">→</span>
        </div>
      </div>
    </div>
  );
};

const AVAILABLE_WIDGETS = [
  { id: 'project-health', label: 'Project Health', component: ProjectHealthWidget },
  { id: 'notifications', label: 'Notification Center', component: DashboardNotificationCenter },
  { id: 'deadlines', label: 'Upcoming Deadlines', component: UpcomingDeadlinesWidget },
  { id: 'drawings', label: 'Drawing Metrics', component: QuickMetricsWidget, props: { metric: 'drawings' } },
  { id: 'rfis', label: 'RFI Metrics', component: QuickMetricsWidget, props: { metric: 'rfis' } },
  { id: 'costs', label: 'Cost Metrics', component: QuickMetricsWidget, props: { metric: 'costs' } },
  { id: 'tasks', label: 'Task Metrics', component: QuickMetricsWidget, props: { metric: 'tasks' } }
];

export default function Dashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { activeProjectId } = useActiveProject();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activityPage, setActivityPage] = useState(1);
  const [showWidgetConfig, setShowWidgetConfig] = useState(false);
  const ACTIVITY_PER_PAGE = 10;

  // Widget state management
  const [widgets, setWidgets] = useState(() => {
    const saved = localStorage.getItem('dashboard-widgets');
    return saved ? JSON.parse(saved) : ['project-health', 'notifications', 'deadlines'];
  });

  console.log('Active project:', activeProjectId);

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    staleTime: 15 * 60 * 1000,
    retry: false,
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

  // Calculate critical issues - MOVED BEFORE CONDITIONAL RETURN
  const criticalIssues = useMemo(() => {
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

  // Calculate schedule health - MOVED BEFORE CONDITIONAL RETURN
  const scheduleHealth = useMemo(() => {
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

  // Calculate active projects and milestones - MOVED BEFORE CONDITIONAL RETURN
  const activeProjects = useMemo(() => 
    projects.filter(p => p.status === 'in_progress'),
    [projects]
  );
  
  const upcomingMilestones = useMemo(() => 
    activeProjects.filter(p => {
      if (!p.target_completion) return false;
      try {
        const days = differenceInDays(new Date(p.target_completion), new Date());
        return days >= 0 && days <= 30;
      } catch {
        return false;
      }
    }),
    [activeProjects]
  );

  // Calculate financial summary for active project - MOVED BEFORE CONDITIONAL RETURN
  const activeProjectFinancials = useMemo(() => {
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

  // Calculate cost risk status - MOVED BEFORE CONDITIONAL RETURN
  const costRiskStatus = useMemo(() => {
    if (!activeProjectFinancials) return { status: 'unknown', message: 'No active project' };
    
    const projectedMargin = ((activeProjectFinancials.totalContract - activeProjectFinancials.estimatedCostAtCompletion) / activeProjectFinancials.totalContract * 100);
    const variance = projectedMargin - activeProjectFinancials.plannedMargin;
    
    if (variance >= 0) return { status: 'healthy', message: 'On Target', color: 'green' };
    if (variance >= -3) return { status: 'warning', message: 'Below Target', color: 'amber' };
    return { status: 'critical', message: 'At Risk', color: 'red' };
  }, [activeProjectFinancials]);

  const portfolioHealth = useMemo(() => 
    metricsData?.portfolioHealth || {},
    [metricsData]
  );

  // Combine activity feed
  const activityFeed = useMemo(() => {
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

  const paginatedActivity = useMemo(() => 
    activityFeed.slice(0, activityPage * ACTIVITY_PER_PAGE),
    [activityFeed, activityPage]
  );
  
  const hasMoreActivity = useMemo(() => 
    activityFeed.length > paginatedActivity.length,
    [activityFeed.length, paginatedActivity.length]
  );

  // Widget management
  const handleRemoveWidget = (widgetId) => {
    const newWidgets = widgets.filter(w => w !== widgetId);
    setWidgets(newWidgets);
    localStorage.setItem('dashboard-widgets', JSON.stringify(newWidgets));
  };

  const handleAddWidget = (widgetId) => {
    if (!widgets.includes(widgetId)) {
      const newWidgets = [...widgets, widgetId];
      setWidgets(newWidgets);
      localStorage.setItem('dashboard-widgets', JSON.stringify(newWidgets));
    }
  };

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
    queryClient.invalidateQueries();
    setIsRefreshing(false);
  }, [refetchMetrics, refetchProjects, refetchRFIs, refetchCOs, refetchTasks, refetchDrawings, queryClient]);

  const isLoading = projectsLoading || metricsLoading || rfisLoading || cosLoading || tasksLoading || drawingsLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-amber-500 border-t-transparent animate-spin mx-auto mb-3" />
          <p className="text-xs text-zinc-600 uppercase tracking-widest">LOADING...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Status Bar */}
      <div className="border-b border-zinc-800 bg-black">
        <div className="max-w-[1600px] mx-auto px-6 py-2 flex items-center justify-between">
          <div className="flex items-center gap-6 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-green-500" />
              <span className="text-zinc-500 font-mono uppercase tracking-wider">OPERATIONAL</span>
            </div>
            <span className="text-zinc-600 font-mono">{format(new Date(), 'yyyy-MM-dd HH:mm')}</span>
          </div>
          <div className="flex items-center gap-3">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowWidgetConfig(true)}
              className="text-zinc-500 hover:text-zinc-400 h-7 gap-1"
            >
              <LayoutGrid size={14} />
              <span className="text-xs uppercase tracking-wider">WIDGETS</span>
            </Button>
            <button 
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="text-zinc-500 hover:text-zinc-400 font-mono text-xs uppercase tracking-wider"
            >
              {isRefreshing ? 'REFRESHING...' : 'REFRESH'}
            </button>
          </div>
        </div>
      </div>

      {/* Command Panel */}
      <div className="border-b-2 border-zinc-800 bg-black">
        <div className="max-w-[1600px] mx-auto px-6 py-8">
          <div className="grid grid-cols-4 gap-6">
            {/* Action Required */}
            <div 
              className={`relative border-l-4 pl-5 pr-4 py-5 cursor-pointer transition-all ${
                criticalIssues.length > 0 
                  ? 'border-red-500 bg-red-500/5 hover:bg-red-500/10' 
                  : 'border-zinc-800 bg-zinc-950 hover:bg-zinc-900'
              }`}
              onClick={() => {
                if (criticalIssues.length > 0) {
                  if (criticalIssues[0].includes('RFI')) navigate(createPageUrl('RFIs'));
                  else if (criticalIssues[0].includes('drawing')) navigate(createPageUrl('Detailing'));
                  else navigate(createPageUrl('ChangeOrders'));
                }
              }}
            >
              {criticalIssues.length > 0 && (
                <div className="absolute top-3 right-3 text-[10px] font-bold text-red-500 uppercase tracking-widest animate-pulse">
                  ACTION
                </div>
              )}
              <div className="text-5xl font-bold text-white mb-2 tracking-tight leading-none">
                {criticalIssues.length}
              </div>
              <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-3">
                REQUIRE ACTION
              </div>
              {criticalIssues.length > 0 && (
                <div className="text-xs text-zinc-400 leading-tight truncate">
                  {criticalIssues[0]}
                </div>
              )}
            </div>

            {/* Schedule Health */}
            <div 
              className={`relative border-l-4 pl-5 pr-4 py-5 cursor-pointer transition-all ${
                scheduleHealth.status === 'critical' 
                  ? 'border-red-500 bg-red-500/5 hover:bg-red-500/10'
                  : scheduleHealth.status === 'warning'
                  ? 'border-amber-500 bg-amber-500/5 hover:bg-amber-500/10'
                  : 'border-green-500 bg-green-500/5 hover:bg-green-500/10'
              }`}
              onClick={() => navigate(createPageUrl('Schedule'))}
            >
              {scheduleHealth.overdueCount > 0 && (
                <div className="absolute top-3 right-3 text-[10px] font-bold text-red-500 uppercase tracking-widest">
                  {scheduleHealth.overdueCount} LATE
                </div>
              )}
              <div className="text-5xl font-bold text-white mb-2 tracking-tight leading-none">
                {scheduleHealth.onTimePercentage}%
              </div>
              <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-3">
                SCHEDULE HEALTH
              </div>
              <div className="h-1 bg-zinc-900">
                <div 
                  className={`h-full transition-all ${
                    scheduleHealth.status === 'critical' ? 'bg-red-500' :
                    scheduleHealth.status === 'warning' ? 'bg-amber-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${scheduleHealth.onTimePercentage}%` }}
                />
              </div>
            </div>

            {/* Cost Risk */}
            <div 
              className={`relative border-l-4 pl-5 pr-4 py-5 cursor-pointer transition-all ${
                costRiskStatus.status === 'critical' 
                  ? 'border-red-500 bg-red-500/5 hover:bg-red-500/10'
                  : costRiskStatus.status === 'warning'
                  ? 'border-amber-500 bg-amber-500/5 hover:bg-amber-500/10'
                  : costRiskStatus.status === 'healthy'
                  ? 'border-green-500 bg-green-500/5 hover:bg-green-500/10'
                  : 'border-zinc-800 bg-zinc-950 hover:bg-zinc-900'
              }`}
              onClick={() => activeProjectId && navigate(createPageUrl('Financials'))}
            >
              {activeProjectFinancials && (
                <div className={`absolute top-3 right-3 text-[10px] font-bold uppercase tracking-widest ${
                  costRiskStatus.status === 'critical' ? 'text-red-500' :
                  costRiskStatus.status === 'warning' ? 'text-amber-500' : 'text-green-500'
                }`}>
                  {((activeProjectFinancials.totalContract - activeProjectFinancials.estimatedCostAtCompletion) / activeProjectFinancials.totalContract * 100).toFixed(1)}%
                </div>
              )}
              <div className="text-5xl font-bold text-white mb-2 tracking-tight leading-none">
                {costRiskStatus.message === 'No active project' ? '—' : costRiskStatus.message.toUpperCase()}
              </div>
              <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-3">
                COST RISK
              </div>
              {activeProjectFinancials && (
                <div className="text-xs text-zinc-500 font-mono">
                  EAC {formatFinancial(activeProjectFinancials.estimatedCostAtCompletion)}
                </div>
              )}
            </div>

            {/* Active Projects */}
            <div 
              className="relative border-l-4 border-zinc-800 bg-zinc-950 hover:bg-zinc-900 pl-5 pr-4 py-5 cursor-pointer transition-all"
              onClick={() => navigate(createPageUrl('Projects'))}
            >
              <div className="text-5xl font-bold text-white mb-2 tracking-tight leading-none">
                {portfolioHealth.activeProjects || activeProjects.length}
              </div>
              <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-3">
                ACTIVE PROJECTS
              </div>
              <div className="text-xs text-zinc-500 font-mono">
                {projects.length} total
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1600px] mx-auto px-6 py-6">
        {/* Secondary Metrics Bar */}
        <div className="grid grid-cols-4 gap-0 border border-zinc-800 mb-6">
          <div className="p-4 border-r border-zinc-800">
            <div className="text-[10px] uppercase tracking-widest text-zinc-600 font-bold mb-2">
              BUDGET CONSUMED
            </div>
            <div className="flex items-baseline gap-2 mb-3">
              <span className="text-3xl font-bold text-white tracking-tight">
                {portfolioHealth.budgetUtilization || 0}%
              </span>
            </div>
            <div className="h-1 bg-zinc-900">
              <div 
                className={`h-full transition-all ${
                  (portfolioHealth.budgetUtilization || 0) > 90 ? 'bg-red-500' :
                  (portfolioHealth.budgetUtilization || 0) > 75 ? 'bg-amber-500' : 'bg-zinc-600'
                }`}
                style={{ width: `${Math.min(portfolioHealth.budgetUtilization || 0, 100)}%` }}
              />
            </div>
          </div>
          
          <div className="p-4 border-r border-zinc-800">
            <div className="text-[10px] uppercase tracking-widest text-zinc-600 font-bold mb-2">
              COMPLETION
            </div>
            <div className="flex items-baseline gap-2 mb-3">
              <span className="text-3xl font-bold text-white tracking-tight">
                {portfolioHealth.completionRate || 0}%
              </span>
            </div>
            <div className="h-1 bg-zinc-900">
              <div 
                className="h-full bg-zinc-600 transition-all"
                style={{ width: `${Math.min(portfolioHealth.completionRate || 0, 100)}%` }}
              />
            </div>
          </div>

          <div className="p-4 border-r border-zinc-800">
            <div className="text-[10px] uppercase tracking-widest text-zinc-600 font-bold mb-2">
              OPEN RFIs
            </div>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-3xl font-bold text-white tracking-tight">
                {rfis.filter(r => r.status === 'pending' || r.status === 'submitted').length}
              </span>
              {rfis.filter(r => r.due_date && new Date(r.due_date) < new Date()).length > 0 && (
                <span className="text-xs font-bold text-red-500">
                  {rfis.filter(r => r.due_date && new Date(r.due_date) < new Date()).length} OVERDUE
                </span>
              )}
            </div>
          </div>

          <div className="p-4">
            <div className="text-[10px] uppercase tracking-widest text-zinc-600 font-bold mb-2">
              PENDING COs
            </div>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-3xl font-bold text-white tracking-tight">
                {changeOrders.filter(co => co.status === 'pending' || co.status === 'submitted').length}
              </span>
              <span className="text-xs text-zinc-500 font-mono">
                {formatFinancial(changeOrders.filter(co => co.status === 'pending' || co.status === 'submitted').reduce((sum, co) => sum + (co.cost_impact || 0), 0))}
              </span>
            </div>
          </div>
        </div>

        {/* Active Project Financial Strip */}
        {activeProjectId && activeProjectFinancials && (
          <div className="mb-6 border-2 border-zinc-800">
            <div className="px-6 py-3 border-b border-zinc-800 bg-black">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-[10px] uppercase tracking-widest text-zinc-600 font-bold">ACTIVE PROJECT</span>
                  <span className="text-xs text-white font-mono">
                    {projects.find(p => p.id === activeProjectId)?.project_number}
                  </span>
                  <span className="text-xs text-zinc-500 truncate max-w-md">
                    {projects.find(p => p.id === activeProjectId)?.name}
                  </span>
                </div>
                <button
                  className="text-[10px] text-zinc-500 hover:text-white uppercase tracking-widest font-bold"
                  onClick={() => navigate(createPageUrl('Financials'))}
                >
                  DETAILS →
                </button>
              </div>
            </div>
            <div className="grid grid-cols-5 divide-x divide-zinc-800 bg-zinc-950">
              <div className="px-6 py-4">
                <div className="text-[10px] uppercase tracking-widest text-zinc-600 font-bold mb-2">CONTRACT</div>
                <div className="text-2xl font-bold text-white font-mono tracking-tight">
                  {formatFinancial(activeProjectFinancials.totalContract)}
                </div>
              </div>
              <div className="px-6 py-4">
                <div className="text-[10px] uppercase tracking-widest text-zinc-600 font-bold mb-2">ACTUAL</div>
                <div className="text-2xl font-bold text-white font-mono tracking-tight">
                  {formatFinancial(activeProjectFinancials.actualCost)}
                </div>
              </div>
              <div className="px-6 py-4">
                <div className="text-[10px] uppercase tracking-widest text-zinc-600 font-bold mb-2">EAC</div>
                <div className="text-2xl font-bold text-white font-mono tracking-tight">
                  {formatFinancial(activeProjectFinancials.estimatedCostAtCompletion)}
                </div>
              </div>
              <div className="px-6 py-4">
                <div className="text-[10px] uppercase tracking-widest text-zinc-600 font-bold mb-2">MARGIN</div>
                <div className="flex items-baseline gap-2">
                  <span className={`text-2xl font-bold font-mono tracking-tight ${
                    ((activeProjectFinancials.totalContract - activeProjectFinancials.estimatedCostAtCompletion) / activeProjectFinancials.totalContract * 100) > activeProjectFinancials.plannedMargin
                      ? 'text-green-500'
                      : 'text-red-500'
                  }`}>
                    {((activeProjectFinancials.totalContract - activeProjectFinancials.estimatedCostAtCompletion) / activeProjectFinancials.totalContract * 100).toFixed(1)}%
                  </span>
                  <span className="text-xs text-zinc-600 font-mono">
                    / {activeProjectFinancials.plannedMargin}%
                  </span>
                </div>
              </div>
              <div className="px-6 py-4">
                <div className="text-[10px] uppercase tracking-widest text-zinc-600 font-bold mb-2">STATUS</div>
                <div className={`inline-block text-xs font-bold font-mono uppercase tracking-wider ${
                  costRiskStatus.status === 'healthy' ? 'text-green-500' :
                  costRiskStatus.status === 'warning' ? 'text-amber-500' : 'text-red-500'
                }`}>
                  {costRiskStatus.message}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Customizable Widgets */}
        {widgets.length > 0 && activeProjectId && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[10px] uppercase tracking-widest text-zinc-600 font-bold">DASHBOARD WIDGETS</h2>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowWidgetConfig(true)}
                className="text-zinc-600 hover:text-white h-7 gap-1"
              >
                <Settings size={12} />
                Configure
              </Button>
            </div>
            <WidgetContainer>
              {widgets.map((widgetId) => {
                const widgetDef = AVAILABLE_WIDGETS.find(w => w.id === widgetId);
                if (!widgetDef) return null;
                const WidgetComponent = widgetDef.component;
                return (
                  <div key={widgetId} className="relative">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRemoveWidget(widgetId)}
                      className="absolute top-2 right-2 z-10 h-6 w-6 p-0 text-zinc-600 hover:text-red-500"
                    >
                      <X size={14} />
                    </Button>
                    <WidgetComponent projectId={activeProjectId} {...(widgetDef.props || {})} />
                  </div>
                );
              })}
            </WidgetContainer>
          </div>
        )}

        {/* Data Tables */}
        <div className="grid grid-cols-2 gap-6">
          {/* Deadlines */}
          {upcomingMilestones.length > 0 ? (
            <div className="border border-zinc-800 bg-black">
              <div className="px-6 py-3 border-b border-zinc-800">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-widest text-zinc-600 font-bold">APPROACHING DEADLINES</span>
                  <span className="text-[10px] font-mono text-zinc-600">{upcomingMilestones.length}</span>
                </div>
              </div>
              <div className="divide-y divide-zinc-800">
                {upcomingMilestones.slice(0, 8).map(project => {
                  const days = project.target_completion ? differenceInDays(new Date(project.target_completion), new Date()) : 0;
                  return (
                    <div
                      key={project.id}
                      className="group px-6 py-3 hover:bg-zinc-950 cursor-pointer transition-colors"
                      onClick={() => navigate(`/ProjectDashboard?id=${project.id}`)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-xs text-white font-medium truncate">{project.name}</span>
                          </div>
                          <span className="text-[10px] text-zinc-600 font-mono">{project.project_number}</span>
                        </div>
                        <div className="flex items-center gap-3 ml-3">
                          <span className={`text-xs font-bold font-mono ${
                            days < 7 ? 'text-red-500' : days < 14 ? 'text-amber-500' : 'text-zinc-500'
                          }`}>
                            {days}d
                          </span>
                          <span className="text-zinc-700 group-hover:text-zinc-500">→</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="border border-zinc-800 bg-black flex items-center justify-center py-16">
              <span className="text-xs text-zinc-700 uppercase tracking-widest">NO UPCOMING DEADLINES</span>
            </div>
          )}

          {/* Activity */}
          <div className="border border-zinc-800 bg-black">
            <div className="px-6 py-3 border-b border-zinc-800">
              <span className="text-[10px] uppercase tracking-widest text-zinc-600 font-bold">RECENT ACTIVITY</span>
            </div>
            {paginatedActivity.length === 0 ? (
              <div className="text-center py-16">
                <span className="text-xs text-zinc-700 uppercase tracking-widest">NO RECENT ACTIVITY</span>
              </div>
            ) : (
              <>
                <div className="divide-y divide-zinc-800">
                  {paginatedActivity.slice(0, 8).map(item => (
                    <ActivityItem key={item.id} {...item} />
                  ))}
                </div>
                {hasMoreActivity && (
                  <div className="p-3 border-t border-zinc-800">
                    <button
                      className="w-full text-[10px] text-zinc-600 hover:text-zinc-400 uppercase tracking-widest font-bold py-2"
                      onClick={() => setActivityPage(p => p + 1)}
                    >
                      LOAD MORE
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Widget Configuration Dialog */}
      <Dialog open={showWidgetConfig} onOpenChange={setShowWidgetConfig}>
        <DialogContent className="max-w-md bg-zinc-900 border-zinc-800 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LayoutGrid size={18} />
              Configure Dashboard Widgets
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-4">
            {AVAILABLE_WIDGETS.map((widget) => (
              <div key={widget.id} className="flex items-center justify-between p-3 bg-zinc-950 border border-zinc-800 rounded">
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={widgets.includes(widget.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        handleAddWidget(widget.id);
                      } else {
                        handleRemoveWidget(widget.id);
                      }
                    }}
                    className="border-zinc-700"
                  />
                  <span className="text-sm text-white">{widget.label}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="text-xs text-zinc-600">
            Select which widgets to display on your dashboard
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}