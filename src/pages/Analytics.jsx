import React, { useState, useMemo, useEffect, lazy, Suspense } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/ui/PageHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart3, Users, TrendingUp, AlertTriangle, Truck, LayoutDashboard } from 'lucide-react';
import EmptyState from '@/components/ui/EmptyState';
import { toast } from '@/components/ui/notifications';
import { usePerformanceMonitor } from '@/components/shared/hooks/usePerformanceMonitor';
import { useApiWithRetry } from '@/components/shared/hooks/useApiWithRetry';

// Lazy load heavy analytics components
const PortfolioOverview = lazy(() => import('@/components/analytics/PortfolioOverview'));
const ResourceHeatmap = lazy(() => import('@/components/analytics/ResourceHeatmap'));
const RiskTrendAnalysis = lazy(() => import('@/components/analytics/RiskTrendAnalysis'));
const ProjectRiskDashboard = lazy(() => import('@/components/analytics/ProjectRiskDashboard'));
const CostRiskIndicator = lazy(() => import('@/components/financials/CostRiskIndicator'));
const FabricationFieldDrift = lazy(() => import('@/components/analytics/FabricationFieldDrift'));
const DashboardBuilder = lazy(() => import('@/components/analytics/DashboardBuilder'));
const EVMDashboardEnhanced = lazy(() => import('@/components/analytics/EVMDashboardEnhanced'));

const LoadingFallback = () => (
  <div className="flex items-center justify-center h-64">
    <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
  </div>
);

export default function Analytics() {
  usePerformanceMonitor('Analytics');
  const { executeWithRetry } = useApiWithRetry();
  const [activeProjectId, setActiveProjectId] = useState(null);
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: allProjects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => executeWithRetry(() => base44.entities.Project.list()),
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

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

  const userProjects = useMemo(() => {
    if (!currentUser) return [];
    return currentUser.role === 'admin' 
      ? allProjects 
      : allProjects.filter(p => p.assigned_users?.includes(currentUser?.email));
  }, [currentUser, allProjects]);

  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ['projects', activeProjectId],
    queryFn: () => activeProjectId 
      ? base44.entities.Project.filter({ id: activeProjectId })
      : Promise.resolve([]),
    enabled: !!activeProjectId,
  });

  const { data: financials = [] } = useQuery({
    queryKey: ['financials', activeProjectId],
    queryFn: () => activeProjectId
      ? base44.entities.Financial.filter({ project_id: activeProjectId })
      : base44.entities.Financial.list(),
    enabled: !!activeProjectId
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks', activeProjectId],
    queryFn: () => activeProjectId
      ? base44.entities.Task.filter({ project_id: activeProjectId }, 'end_date')
      : base44.entities.Task.list(),
    enabled: !!activeProjectId
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
    enabled: !!activeProjectId
  });

  const { data: resourceAllocations = [] } = useQuery({
    queryKey: ['resourceAllocations', activeProjectId],
    queryFn: () => activeProjectId
      ? base44.entities.ResourceAllocation.filter({ project_id: activeProjectId })
      : base44.entities.ResourceAllocation.list(),
    enabled: !!activeProjectId
  });

  const { data: rfis = [] } = useQuery({
    queryKey: ['rfis', activeProjectId],
    queryFn: () => activeProjectId
      ? base44.entities.RFI.filter({ project_id: activeProjectId }, '-created_date')
      : base44.entities.RFI.list('-created_date'),
    enabled: !!activeProjectId
  });

  const { data: changeOrders = [] } = useQuery({
    queryKey: ['changeOrders', activeProjectId],
    queryFn: () => activeProjectId
      ? base44.entities.ChangeOrder.filter({ project_id: activeProjectId }, '-created_date')
      : base44.entities.ChangeOrder.list('-created_date'),
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

      {hasProject && !projectsLoading && (
        <Tabs defaultValue="custom" className="space-y-6">
          <TabsList className="bg-zinc-800 border border-zinc-700">
            <TabsTrigger value="custom" className="data-[state=active]:bg-amber-500 data-[state=active]:text-black text-zinc-200">
              <LayoutDashboard size={16} className="mr-2" />
              Custom Dashboard
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
          </TabsList>

          <TabsContent value="custom" className="space-y-6">
            <Suspense fallback={<LoadingFallback />}>
              <DashboardBuilder
                projectData={selectedProject ? [selectedProject] : userProjects}
                tasks={tasks}
                financials={financials}
                resources={resources}
                expenses={expenses}
                onSaveConfig={(config) => saveDashboardMutation.mutate(config)}
              />
            </Suspense>
          </TabsContent>

          <TabsContent value="risk-dashboard" className="space-y-6">
            <Suspense fallback={<LoadingFallback />}>
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
            </Suspense>
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
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}