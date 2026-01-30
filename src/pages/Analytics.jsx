import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/ui/PageHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart3, Users, TrendingUp, AlertTriangle, Truck, LayoutDashboard, Sparkles, LineChart } from 'lucide-react';
import PortfolioOverview from '@/components/analytics/PortfolioOverview';
import ResourceHeatmap from '@/components/analytics/ResourceHeatmap';
import RiskTrendAnalysis from '@/components/analytics/RiskTrendAnalysis';
import ProjectRiskDashboard from '@/components/analytics/ProjectRiskDashboard';
import CostRiskIndicator from '@/components/financials/CostRiskIndicator';
import EmptyState from '@/components/ui/EmptyState';
import FabricationFieldDrift from '@/components/analytics/FabricationFieldDrift';

import EVMDashboardEnhanced from '@/components/analytics/EVMDashboardEnhanced';
import UnifiedAnalyticsDashboard from '@/components/analytics/UnifiedAnalyticsDashboard';
import AutoReportGenerator from '@/components/reports/AutoReportGenerator';
import AIForecastETC from '@/components/financials/AIForecastETC';
import TrendForecast from '@/components/analytics/TrendForecast';
import ProjectComparison from '@/components/analytics/ProjectComparison';
import KPIDashboard from '@/components/analytics/KPIDashboard';
import InteractiveDrillDown from '@/components/analytics/InteractiveDrillDown';
import { toast } from '@/components/ui/notifications';

export default function Analytics() {
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    retry: false,
    staleTime: 15 * 60 * 1000,
  });

  const { data: allProjects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list(),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000
  });

  const [activeProjectId, setActiveProjectId] = useState(null);

  const userProjects = useMemo(() => {
    if (!currentUser) return [];
    return currentUser.role === 'admin' 
      ? allProjects 
      : allProjects.filter(p => p.assigned_users?.includes(currentUser?.email));
  }, [currentUser, allProjects]);

  // Real-time subscriptions for live updates
  useEffect(() => {
    if (!activeProjectId) return;

    const unsubscribeDrawings = base44.entities.DrawingSet.subscribe((event) => {
      if (event.data?.project_id === activeProjectId) {
        queryClient.invalidateQueries({ queryKey: ['drawings', activeProjectId] });
      }
    });

    const unsubscribeTasks = base44.entities.Task.subscribe((event) => {
      if (event.data?.project_id === activeProjectId) {
        queryClient.invalidateQueries({ queryKey: ['tasks', activeProjectId] });
      }
    });

    const unsubscribeRFIs = base44.entities.RFI.subscribe((event) => {
      if (event.data?.project_id === activeProjectId) {
        queryClient.invalidateQueries({ queryKey: ['rfis', activeProjectId] });
      }
    });

    return () => {
      unsubscribeDrawings();
      unsubscribeTasks();
      unsubscribeRFIs();
    };
  }, [activeProjectId, queryClient]);

  const saveDashboardMutation = useMutation({
    mutationFn: async (config) => {
      await base44.auth.updateMe({ dashboard_config: config });
      return config;
    },
    onSuccess: () => {
      toast.success('Dashboard layout saved');
    },
    onError: () => {
      toast.error('Failed to save dashboard');
    }
  });

  const { data: portfolioMetrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['portfolio-metrics', activeProjectId],
    queryFn: async () => {
      const response = await base44.functions.invoke('getPortfolioMetricsOptimized', {
        project_ids: activeProjectId ? [activeProjectId] : userProjects.map(p => p.id).slice(0, 10)
      });
      return response.data;
    },
    enabled: !!activeProjectId,
    staleTime: 2 * 60 * 1000 // Cache 2 minutes
  });

  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ['projects', activeProjectId],
    queryFn: () => activeProjectId 
      ? base44.entities.Project.filter({ id: activeProjectId })
      : Promise.resolve([]),
    enabled: !!activeProjectId,
  });

  // Use backend metrics when available, fallback to direct queries
  const { data: financials = [] } = useQuery({
    queryKey: ['financials', activeProjectId],
    queryFn: () => {
      if (portfolioMetrics?.metrics) return [];
      return activeProjectId
        ? base44.entities.Financial.filter({ project_id: activeProjectId })
        : base44.entities.Financial.list();
    },
    enabled: !!activeProjectId && !portfolioMetrics?.metrics
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks', activeProjectId],
    queryFn: async () => {
      if (portfolioMetrics?.metrics) return [];
      const data = activeProjectId
        ? await base44.entities.Task.filter({ project_id: activeProjectId }, 'end_date')
        : await base44.entities.Task.list();
      return data;
    },
    enabled: !!activeProjectId && !portfolioMetrics?.metrics
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ['expenses', activeProjectId],
    queryFn: () => activeProjectId
      ? base44.entities.Expense.filter({ project_id: activeProjectId })
      : base44.entities.Expense.list(),
    enabled: !!activeProjectId
  });

  const { data: estimatedCosts = [] } = useQuery({
    queryKey: ['etc', activeProjectId],
    queryFn: () => activeProjectId
      ? base44.entities.EstimatedCostToComplete.filter({ project_id: activeProjectId })
      : base44.entities.EstimatedCostToComplete.list(),
    enabled: !!activeProjectId
  });

  const { data: resources = [] } = useQuery({
    queryKey: ['resources'],
    queryFn: () => base44.entities.Resource.list(),
    enabled: !!activeProjectId,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000
  });

  const { data: resourceAllocations = [] } = useQuery({
    queryKey: ['resourceAllocations', activeProjectId],
    queryFn: () => activeProjectId
      ? base44.entities.ResourceAllocation.filter({ project_id: activeProjectId })
      : [],
    enabled: !!activeProjectId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000
  });

  const { data: rfis = [] } = useQuery({
    queryKey: ['rfis', activeProjectId],
    queryFn: async () => {
      const data = activeProjectId
        ? await base44.entities.RFI.filter({ project_id: activeProjectId }, '-created_date')
        : await base44.entities.RFI.list('-created_date');
      return data.filter(r => r.created_date); // Filter out invalid dates
    },
    enabled: !!activeProjectId
  });

  const { data: changeOrders = [] } = useQuery({
    queryKey: ['changeOrders', activeProjectId],
    queryFn: async () => {
      const data = activeProjectId
        ? await base44.entities.ChangeOrder.filter({ project_id: activeProjectId }, '-created_date')
        : await base44.entities.ChangeOrder.list('-created_date');
      return data.filter(co => co.created_date); // Filter out invalid dates
    },
    enabled: !!activeProjectId
  });

  const { data: drawings = [] } = useQuery({
    queryKey: ['drawings', activeProjectId],
    queryFn: () => activeProjectId
      ? base44.entities.DrawingSet.filter({ project_id: activeProjectId })
      : base44.entities.DrawingSet.list(),
    enabled: !!activeProjectId
  });

  const { data: scopeGaps = [] } = useQuery({
    queryKey: ['scopeGaps', activeProjectId],
    queryFn: () => activeProjectId
      ? base44.entities.ScopeGap.filter({ project_id: activeProjectId })
      : base44.entities.ScopeGap.list(),
    enabled: !!activeProjectId
  });

  const { data: laborBreakdowns = [] } = useQuery({
    queryKey: ['laborBreakdowns', activeProjectId],
    queryFn: () => activeProjectId
      ? base44.entities.LaborBreakdown.filter({ project_id: activeProjectId })
      : base44.entities.LaborBreakdown.list(),
    enabled: !!activeProjectId
  });

  const { data: laborHours = [] } = useQuery({
    queryKey: ['laborHours', activeProjectId],
    queryFn: () => activeProjectId
      ? base44.entities.LaborHours.filter({ project_id: activeProjectId })
      : base44.entities.LaborHours.list(),
    enabled: !!activeProjectId
  });

  const { data: sovItems = [] } = useQuery({
    queryKey: ['sov-items', activeProjectId],
    queryFn: () => activeProjectId
      ? base44.entities.SOVItem.filter({ project_id: activeProjectId })
      : base44.entities.SOVItem.list(),
    enabled: !!activeProjectId
  });

  const { data: costCodes = [] } = useQuery({
    queryKey: ['cost-codes'],
    queryFn: () => base44.entities.CostCode.list('code'),
    enabled: !!activeProjectId
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices', activeProjectId],
    queryFn: () => activeProjectId
      ? base44.entities.Invoice.filter({ project_id: activeProjectId })
      : base44.entities.Invoice.list(),
    enabled: !!activeProjectId
  });

  useEffect(() => {
    if (!activeProjectId && userProjects.length > 0) {
      setActiveProjectId(userProjects[0].id);
    }
  }, [activeProjectId, userProjects]);

  const selectedProject = projects[0];
  const hasProject = !!activeProjectId;

  return (
    <div>
      <PageHeader
        title="Analytics Dashboard"
        subtitle={hasProject ? "Portfolio insights, resource utilization, and risk trends" : "Select a project to view analytics"}
        showBackButton={false}
        actions={
          userProjects.length > 0 ? (
            <Select value={activeProjectId || ''} onValueChange={setActiveProjectId}>
              <SelectTrigger className="w-64 bg-zinc-800 border-zinc-700 text-white">
                <SelectValue placeholder="Select Project" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-700">
                {userProjects.map(project => (
                  <SelectItem key={project.id} value={project.id} className="text-white focus:bg-zinc-800 focus:text-white">
                    {project.project_number} - {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null
        }
      />

      {!hasProject && (
        <EmptyState 
          icon={BarChart3}
          title="No Project Selected"
          description="Select a project from your list to view analytics data."
        />
      )}

      {hasProject && (
        <Tabs defaultValue="unified" className="space-y-6">
          <TabsList className="bg-zinc-800 border border-zinc-700">
            <TabsTrigger value="unified" className="data-[state=active]:bg-amber-500 data-[state=active]:text-black text-zinc-200">
              <Sparkles size={16} className="mr-2" />
              Unified Analytics
            </TabsTrigger>
            <TabsTrigger value="risk-dashboard" className="data-[state=active]:bg-amber-500 data-[state=active]:text-black text-zinc-200">
              <AlertTriangle size={16} className="mr-2" />
              Risk Dashboard
            </TabsTrigger>
            <TabsTrigger value="fab-field" className="data-[state=active]:bg-amber-500 data-[state=active]:text-black text-zinc-200">
              <BarChart3 size={16} className="mr-2" />
              Fab vs Field
            </TabsTrigger>
            <TabsTrigger value="portfolio" className="data-[state=active]:bg-amber-500 data-[state=active]:text-black text-zinc-200">
              <BarChart3 size={16} className="mr-2" />
              Portfolio Overview
            </TabsTrigger>
            <TabsTrigger value="resources" className="data-[state=active]:bg-amber-500 data-[state=active]:text-black text-zinc-200">
              <Users size={16} className="mr-2" />
              Resource Allocation
            </TabsTrigger>
            <TabsTrigger value="risks" className="data-[state=active]:bg-amber-500 data-[state=active]:text-black text-zinc-200">
              <TrendingUp size={16} className="mr-2" />
              Risk Trends
            </TabsTrigger>
            <TabsTrigger value="evm" className="data-[state=active]:bg-amber-500 data-[state=active]:text-black text-zinc-200">
              <TrendingUp size={16} className="mr-2" />
              EVM Analysis
            </TabsTrigger>
            <TabsTrigger value="comparison" className="data-[state=active]:bg-amber-500 data-[state=active]:text-black text-zinc-200">
              <BarChart3 size={16} className="mr-2" />
              Multi-Project
            </TabsTrigger>
            <TabsTrigger value="kpi" className="data-[state=active]:bg-amber-500 data-[state=active]:text-black text-zinc-200">
              <TrendingUp size={16} className="mr-2" />
              KPI Dashboard
            </TabsTrigger>
            <TabsTrigger value="drilldown" className="data-[state=active]:bg-amber-500 data-[state=active]:text-black text-zinc-200">
              <LayoutDashboard size={16} className="mr-2" />
              Drill-Down
            </TabsTrigger>
          </TabsList>

          <TabsContent value="unified" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <AutoReportGenerator projectId={activeProjectId} />
              <AIForecastETC projectId={activeProjectId} />
            </div>
            <UnifiedAnalyticsDashboard projectId={activeProjectId} />
          </TabsContent>

          <TabsContent value="risk-dashboard" className="space-y-6">
            <CostRiskIndicator
              projectId={activeProjectId}
              expenses={expenses}
              estimatedCosts={estimatedCosts}
            />

            <ProjectRiskDashboard
              projects={projects}
              laborBreakdowns={laborBreakdowns}
              scopeGaps={scopeGaps}
              tasks={tasks}
              financials={financials}
              expenses={expenses}
              changeOrders={changeOrders}
            />
          </TabsContent>

          <TabsContent value="fab-field" className="space-y-6">
            <FabricationFieldDrift
              expenses={expenses}
              financials={financials}
              costCodes={costCodes}
              sovItems={sovItems}
              projectId={activeProjectId}
            />
          </TabsContent>

          <TabsContent value="portfolio" className="space-y-6">
            <PortfolioOverview
              projects={projects}
              financials={financials}
              tasks={tasks}
              expenses={expenses}
              portfolioMetrics={portfolioMetrics}
            />
          </TabsContent>

          <TabsContent value="resources" className="space-y-6">
            <ResourceHeatmap
              projects={projects}
              resources={resources}
              resourceAllocations={resourceAllocations}
              tasks={tasks}
            />
          </TabsContent>

          <TabsContent value="risks" className="space-y-6">
            <RiskTrendAnalysis
              projects={projects}
              rfis={rfis}
              changeOrders={changeOrders}
              drawings={drawings}
              tasks={tasks}
              scopeGaps={scopeGaps}
              financials={financials}
              laborBreakdowns={laborBreakdowns}
            />
          </TabsContent>

          <TabsContent value="evm" className="space-y-6">
            <EVMDashboardEnhanced
              projectFilter={activeProjectId}
              projects={projects}
              financials={financials}
              tasks={tasks}
              expenses={expenses}
              sovItems={sovItems}
              invoices={invoices}
            />
            <TrendForecast 
              expenses={expenses}
              financials={financials}
              projectId={activeProjectId}
            />
          </TabsContent>

          <TabsContent value="comparison" className="space-y-6">
            <ProjectComparison 
              projects={projects}
              financials={financials}
              tasks={tasks}
            />
          </TabsContent>

          <TabsContent value="kpi" className="space-y-6">
            <KPIDashboard metrics={{}} />
          </TabsContent>

          <TabsContent value="drilldown" className="space-y-6">
            <InteractiveDrillDown
              projects={projects}
              financials={financials}
              rfis={rfis}
              changeOrders={changeOrders}
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}