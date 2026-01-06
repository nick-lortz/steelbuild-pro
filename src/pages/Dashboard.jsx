import React, { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useNavigate, Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
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

const KPICard = ({ title, value, icon: Icon, variant = "default", onClick, loading = false }) => {
  const variants = {
    default: "bg-card border-border",
    amber: "bg-amber-500/10 border-amber-500/20",
    green: "bg-green-500/10 border-green-500/20",
    blue: "bg-blue-500/10 border-blue-500/20",
  };
  
  return (
    <Card 
      className={`${variants[variant]} border ${onClick ? 'cursor-pointer active:scale-95' : ''} transition-transform`}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <Icon size={20} className="text-amber-500" />
        </div>
        <p className="text-sm text-muted-foreground mb-1">{title}</p>
        {loading ? (
          <div className="h-8 w-20 bg-muted animate-pulse rounded" />
        ) : (
          <p className="text-2xl font-bold">{value}</p>
        )}
      </CardContent>
    </Card>
  );
};

const ActivityItem = ({ type, title, subtitle, badge, onClick }) => (
  <div 
    className="flex items-center justify-between py-3 border-b border-border last:border-0 active:bg-secondary transition-colors cursor-pointer"
    onClick={onClick}
  >
    <div className="flex-1 min-w-0 mr-3">
      <p className="text-sm font-medium truncate">{title}</p>
      <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
    </div>
    <div className="flex items-center gap-2 flex-shrink-0">
      {badge}
      <ArrowRight size={16} className="text-muted-foreground" />
    </div>
  </div>
);

export default function Dashboard() {
  const navigate = useNavigate();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activityPage, setActivityPage] = useState(1);
  const ACTIVITY_PER_PAGE = 10;

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    staleTime: 15 * 60 * 1000,
  });

  // Fetch portfolio metrics
  const { data: metricsData, isLoading: metricsLoading, refetch: refetchMetrics } = useQuery({
    queryKey: ['portfolioMetrics'],
    queryFn: async () => {
      const response = await base44.functions.invoke('getPortfolioMetrics', {
        timeframe: '12_months'
      });
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
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

  const paginatedActivity = activityFeed.slice(0, activityPage * ACTIVITY_PER_PAGE);
  const hasMoreActivity = activityFeed.length > paginatedActivity.length;

  const isLoading = projectsLoading || metricsLoading || rfisLoading || cosLoading || tasksLoading || drawingsLoading;

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  const portfolioHealth = metricsData?.portfolioHealth || {};
  const activeProjects = projects.filter(p => p.status === 'in_progress');
  const upcomingMilestones = activeProjects.filter(p => {
    if (!p.target_completion) return false;
    const days = differenceInDays(new Date(p.target_completion), new Date());
    return days >= 0 && days <= 30;
  });

  return (
    <div className="p-6">
      {/* Hero Section */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {currentUser?.full_name || 'Welcome'} • {format(new Date(), 'MMM d, yyyy')}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} />
          </Button>
        </div>

        {/* Critical Issues Alert */}
        {criticalIssues.length > 0 && (
          <Alert className="bg-red-500/10 border-red-500/20 mb-4">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <AlertDescription className="text-sm">
              <span className="font-medium">Action Required:</span> {criticalIssues.join(', ')}
            </AlertDescription>
          </Alert>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <KPICard
            title="Active Projects"
            value={portfolioHealth.activeProjects || activeProjects.length}
            icon={Building2}
            variant="blue"
            onClick={() => navigate(createPageUrl('Projects'))}
            loading={metricsLoading}
          />
          <KPICard
            title="Budget Used"
            value={`${portfolioHealth.budgetUtilization || 0}%`}
            icon={DollarSign}
            variant="amber"
            onClick={() => navigate(createPageUrl('Financials'))}
            loading={metricsLoading}
          />
          <KPICard
            title="Schedule"
            value={`${portfolioHealth.scheduleAdherence || 0}%`}
            icon={Calendar}
            variant="green"
            onClick={() => navigate(createPageUrl('Schedule'))}
            loading={metricsLoading}
          />
          <KPICard
            title="Completion"
            value={`${portfolioHealth.completionRate || 0}%`}
            icon={TrendingUp}
            variant="default"
            onClick={() => navigate(createPageUrl('Schedule'))}
            loading={metricsLoading}
          />
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => navigate(createPageUrl('Projects'))}
          >
            <Plus size={16} className="mr-2" />
            New Project
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => navigate(createPageUrl('RFIs'))}
          >
            <MessageSquareWarning size={16} className="mr-2" />
            New RFI
          </Button>
        </div>
      </div>

      {/* At Risk Projects */}
      {upcomingMilestones.length > 0 && (
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Target size={16} className="text-amber-500" />
              Upcoming Milestones ({upcomingMilestones.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {upcomingMilestones.slice(0, 3).map(project => {
                const days = differenceInDays(new Date(project.target_completion), new Date());
                return (
                  <div
                    key={project.id}
                    className="flex items-center justify-between py-2 border-b border-border last:border-0 cursor-pointer active:bg-secondary transition-colors"
                    onClick={() => navigate(`/ProjectDashboard?id=${project.id}`)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{project.name}</p>
                      <p className="text-xs text-muted-foreground">{project.project_number}</p>
                    </div>
                    <Badge variant="outline" className="ml-2">
                      {days}d
                    </Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Activity */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText size={16} className="text-amber-500" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {paginatedActivity.length === 0 ? (
            <div className="text-center py-8">
              <FileText size={32} className="text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No recent activity</p>
            </div>
          ) : (
            <>
              {paginatedActivity.map(item => (
                <ActivityItem key={item.id} {...item} />
              ))}
              {hasMoreActivity && (
                <Button
                  variant="ghost"
                  className="w-full mt-3"
                  onClick={() => setActivityPage(p => p + 1)}
                >
                  Load More
                </Button>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}