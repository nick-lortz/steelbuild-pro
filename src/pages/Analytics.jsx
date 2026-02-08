import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import PageShell from '@/components/layout/PageShell';
import PageHeader from '@/components/layout/PageHeader';
import ContentSection from '@/components/layout/ContentSection';
import EmptyState from '@/components/layout/EmptyState';
import PortfolioOverview from '@/components/analytics/PortfolioOverview';
import ResourceHeatmap from '@/components/analytics/ResourceHeatmap';
import RiskTrendAnalysis from '@/components/analytics/RiskTrendAnalysis';
import ProjectRiskDashboard from '@/components/analytics/ProjectRiskDashboard';
import CostRiskIndicator from '@/components/financials/CostRiskIndicator';
import FabricationFieldDrift from '@/components/analytics/FabricationFieldDrift';
import ProjectHealthTrends from '@/components/analytics/ProjectHealthTrends';
import ResourceAllocationHeatmap from '@/components/analytics/ResourceAllocationHeatmap';
import ComprehensiveKPIs from '@/components/analytics/ComprehensiveKPIs';
import EVMDashboardEnhanced from '@/components/analytics/EVMDashboardEnhanced';
import UnifiedAnalyticsDashboard from '@/components/analytics/UnifiedAnalyticsDashboard';
import AutoReportGenerator from '@/components/reports/AutoReportGenerator';
import AIForecastETC from '@/components/financials/AIForecastETC';
import TrendForecast from '@/components/analytics/TrendForecast';
import ProjectComparison from '@/components/analytics/ProjectComparison';
import ProjectAnalyticsInsights from '@/components/analytics/ProjectAnalyticsInsights';
import { BarChart3, Users, TrendingUp, AlertTriangle, Sparkles, LineChart, Activity } from 'lucide-react';
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
  const [pmFilter, setPMFilter] = useState('all');
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setMonth(new Date().getMonth() - 6)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  const userProjects = useMemo(() => {
    if (!currentUser) return [];
    let filtered = currentUser.role === 'admin' 
      ? allProjects 
      : allProjects.filter(p => p.assigned_users?.includes(currentUser?.email));
    
    // Apply PM filter
    if (pmFilter !== 'all') {
      filtered = filtered.filter(p => p.project_manager === pmFilter);
    }

    return filtered;
  }, [currentUser, allProjects, pmFilter]);

  const projectManagers = useMemo(() => {
    const pms = new Set();
    allProjects.forEach(p => {
      if (p.project_manager) pms.add(p.project_manager);
    });
    return Array.from(pms).sort();
  }, [allProjects]);

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
    enabled: !!activeProjectId && userProjects.length > 0,
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

  const { data: deliveries = [] } = useQuery({
    queryKey: ['deliveries', activeProjectId],
    queryFn: () => activeProjectId
      ? base44.entities.Delivery.filter({ project_id: activeProjectId })
      : base44.entities.Delivery.list(),
    enabled: !!activeProjectId
  });

  const { data: workPackages = [] } = useQuery({
    queryKey: ['workPackages', activeProjectId],
    queryFn: () => activeProjectId
      ? base44.entities.WorkPackage.filter({ project_id: activeProjectId })
      : base44.entities.WorkPackage.list(),
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
    <PageShell>
      <PageHeader
        title="Analytics Dashboard"
        subtitle={hasProject ? "Portfolio insights, resource utilization, and risk trends" : "Select a project to view analytics"}
        actions={
          <>
            {userProjects.length > 0 && (
              <Select value={activeProjectId || ''} onValueChange={setActiveProjectId}>
                <SelectTrigger className="w-64 bg-zinc-900 border-zinc-800 text-white">
                  <SelectValue placeholder="Select Project" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  {userProjects.map(project => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.project_number} - {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </>
        }
      />

      <ContentSection>

      {/* Global Filters */}
      {hasProject && (
        <Card className="bg-zinc-900 border-zinc-800 mb-6">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-xs text-zinc-400">Project Manager</Label>
                <Select value={pmFilter} onValueChange={setPMFilter}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white h-9">
                    <SelectValue placeholder="All PMs" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800">
                    <SelectItem value="all">All Project Managers</SelectItem>
                    {projectManagers.map(pm => (
                      <SelectItem key={pm} value={pm}>{pm}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-zinc-400">Start Date</Label>
                <Input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                  className="bg-zinc-800 border-zinc-700 text-white h-9"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-zinc-400">End Date</Label>
                <Input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                  className="bg-zinc-800 border-zinc-700 text-white h-9"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!hasProject && (
        <EmptyState 
          icon={BarChart3}
          title="No Project Selected"
          description="Select a project from your list to view analytics data."
        />
      )}

      {hasProject && (
        <Tabs defaultValue="health" className="space-y-6">
          <TabsList className="bg-zinc-800 border border-zinc-700">
            <TabsTrigger value="health" className="data-[state=active]:bg-amber-500 data-[state=active]:text-black text-zinc-200">
              <Activity size={16} className="mr-2" />
              Health Trends
            </TabsTrigger>
            <TabsTrigger value="kpis" className="data-[state=active]:bg-amber-500 data-[state=active]:text-black text-zinc-200">
              <TrendingUp size={16} className="mr-2" />
              KPI Summary
            </TabsTrigger>
            <TabsTrigger value="resource-heat" className="data-[state=active]:bg-amber-500 data-[state=active]:text-black text-zinc-200">
              <Users size={16} className="mr-2" />
              Resource Heatmap
            </TabsTrigger>
            <TabsTrigger value="unified" className="data-[state=active]:bg-amber-500 data-[state=active]:text-black text-zinc-200">
              <Sparkles size={16} className="mr-2" />
              Unified
            </TabsTrigger>
            <TabsTrigger value="risk-dashboard" className="data-[state=active]:bg-amber-500 data-[state=active]:text-black text-zinc-200">
              <AlertTriangle size={16} className="mr-2" />
              Risks
            </TabsTrigger>
            <TabsTrigger value="fab-field" className="data-[state=active]:bg-amber-500 data-[state=active]:text-black text-zinc-200">
              <BarChart3 size={16} className="mr-2" />
              Fab vs Field
            </TabsTrigger>
            <TabsTrigger value="evm" className="data-[state=active]:bg-amber-500 data-[state=active]:text-black text-zinc-200">
              <LineChart size={16} className="mr-2" />
              EVM
            </TabsTrigger>
            <TabsTrigger value="comparison" className="data-[state=active]:bg-amber-500 data-[state=active]:text-black text-zinc-200">
              <BarChart3 size={16} className="mr-2" />
              Compare
            </TabsTrigger>
            <TabsTrigger value="insights" className="data-[state=active]:bg-amber-500 data-[state=active]:text-black text-zinc-200">
              <Sparkles size={16} className="mr-2" />
              AI Insights
            </TabsTrigger>
          </TabsList>

          <TabsContent value="health" className="space-y-6">
            <ProjectHealthTrends
              projects={userProjects}
              expenses={expenses}
              tasks={tasks}
              dateRange={dateRange}
            />
          </TabsContent>

          <TabsContent value="kpis" className="space-y-6">
            <ComprehensiveKPIs
              projects={userProjects}
              rfis={rfis}
              changeOrders={changeOrders}
              expenses={expenses}
              tasks={tasks}
              laborHours={laborHours}
              dateRange={dateRange}
            />
          </TabsContent>

          <TabsContent value="resource-heat" className="space-y-6">
            <ResourceAllocationHeatmap
              resources={resources}
              projects={userProjects}
              tasks={tasks}
              allocations={resourceAllocations}
            />
          </TabsContent>

          <TabsContent value="unified" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <AutoReportGenerator projectId={activeProjectId} />
              <AIForecastETC projectId={activeProjectId} />
            </div>
            <UnifiedAnalyticsDashboard 
              projectId={activeProjectId}
              projects={projects}
              tasks={tasks}
              financials={financials}
              expenses={expenses}
              changeOrders={changeOrders}
              deliveries={deliveries}
              workPackages={workPackages}
              sovItems={sovItems}
            />
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
              projects={userProjects}
              financials={financials}
              tasks={tasks}
            />
          </TabsContent>

          <TabsContent value="insights" className="space-y-6">
            <ProjectAnalyticsInsights />
          </TabsContent>
        </Tabs>
      )}
      </ContentSection>
    </PageShell>
  );
}