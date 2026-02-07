import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/ui/PageHeader';
import RouteGuard from '@/components/shared/RouteGuard';
import { useActiveProject } from '@/components/shared/hooks/useActiveProject';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { BarChart3, Users, TrendingUp, AlertTriangle, Truck, LayoutDashboard, Sparkles, LineChart, Activity, Database, Trash2, Pencil, PlusCircle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import PortfolioOverview from '@/components/analytics/PortfolioOverview';
import ResourceHeatmap from '@/components/analytics/ResourceHeatmap';
import RiskTrendAnalysis from '@/components/analytics/RiskTrendAnalysis';
import ProjectRiskDashboard from '@/components/analytics/ProjectRiskDashboard';
import CostRiskIndicator from '@/components/financials/CostRiskIndicator';
import EmptyState from '@/components/ui/EmptyState';
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
import KPIDashboard from '@/components/analytics/KPIDashboard';
import InteractiveDrillDown from '@/components/analytics/InteractiveDrillDown';
import ProjectAnalyticsInsights from '@/components/analytics/ProjectAnalyticsInsights';
import { toast } from '@/components/ui/notifications';

export default function AnalyticsPage() {
  return (
    <RouteGuard pageLabel="Analytics Dashboard" allowAllProjects>
      <Analytics />
    </RouteGuard>
  );
}

function Analytics() {
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
    <div>
      <PageHeader
        title="Analytics Dashboard"
        subtitle={hasProject ? "Portfolio insights, resource utilization, and risk trends" : "Select a project to view analytics"}
        showBackButton={false}
        actions={
          <div className="flex items-center gap-3">
            {userProjects.length > 0 && (
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
            )}
          </div>
        }
      />

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
            <TabsTrigger value="data-manager" className="data-[state=active]:bg-amber-500 data-[state=active]:text-black text-zinc-200">
              <Database size={16} className="mr-2" />
              Data Manager
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

          <TabsContent value="data-manager" className="space-y-6">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-white font-semibold">Project Data Manager</p>
                    <p className="text-xs text-zinc-400">
                      Add / edit / delete project data that feeds analytics. Changes update dashboards after save.
                    </p>
                  </div>
                  <div className="text-xs text-zinc-400">
                    Project: <span className="text-white">{selectedProject?.project_number} — {selectedProject?.name}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <EntityManager
                title="Tasks"
                entityName="Task"
                projectId={activeProjectId}
                fields={[
                  { key: "name", label: "Name", type: "text", required: true },
                  { key: "status", label: "Status", type: "text" },
                  { key: "phase", label: "Phase", type: "text" },
                  { key: "start_date", label: "Start Date", type: "date" },
                  { key: "end_date", label: "End Date", type: "date" },
                  { key: "progress_percent", label: "Progress %", type: "number" },
                  { key: "owner", label: "Owner", type: "text" },
                ]}
                order="-updated_date"
              />

              <EntityManager
                title="Expenses"
                entityName="Expense"
                projectId={activeProjectId}
                fields={[
                  { key: "description", label: "Description", type: "text", required: true },
                  { key: "amount", label: "Amount", type: "number", required: true },
                  { key: "expense_date", label: "Date", type: "date" },
                  { key: "cost_code", label: "Cost Code", type: "text" },
                  { key: "vendor", label: "Vendor", type: "text" },
                ]}
                order="-created_date"
              />

              <EntityManager
                title="RFIs"
                entityName="RFI"
                projectId={activeProjectId}
                fields={[
                  { key: "rfi_number", label: "RFI #", type: "text" },
                  { key: "subject", label: "Subject", type: "text", required: true },
                  { key: "status", label: "Status", type: "text" },
                  { key: "priority", label: "Priority", type: "text" },
                  { key: "submitted_date", label: "Submitted", type: "date" },
                  { key: "response_date", label: "Response", type: "date" },
                ]}
                order="-created_date"
              />

              <EntityManager
                title="Change Orders"
                entityName="ChangeOrder"
                projectId={activeProjectId}
                fields={[
                  { key: "co_number", label: "CO #", type: "text" },
                  { key: "title", label: "Title", type: "text", required: true },
                  { key: "status", label: "Status", type: "text" },
                  { key: "cost_impact", label: "Amount", type: "number" },
                  { key: "schedule_impact_days", label: "Sched Impact (days)", type: "number" },
                  { key: "submitted_date", label: "Submitted", type: "date" },
                  { key: "approved_date", label: "Approved", type: "date" },
                ]}
                order="-created_date"
              />

              <EntityManager
                title="Work Packages"
                entityName="WorkPackage"
                projectId={activeProjectId}
                fields={[
                  { key: "wpid", label: "WPID", type: "text" },
                  { key: "name", label: "Name", type: "text", required: true },
                  { key: "status", label: "Status", type: "text" },
                  { key: "progress_percent", label: "Progress %", type: "number" },
                  { key: "assigned_lead", label: "Assigned Lead", type: "text" },
                  { key: "target_date", label: "Target Date", type: "date" },
                  { key: "budget_amount", label: "Budget", type: "number" },
                ]}
                order="-updated_date"
              />

              <EntityManager
                title="Deliveries"
                entityName="Delivery"
                projectId={activeProjectId}
                fields={[
                  { key: "delivery_number", label: "Delivery #", type: "text" },
                  { key: "status", label: "Status", type: "text" },
                  { key: "carrier", label: "Carrier", type: "text" },
                  { key: "eta_date", label: "ETA", type: "date" },
                  { key: "notes", label: "Notes", type: "textarea" },
                ]}
                order="-created_date"
              />

              <EntityManager
                title="SOV Items"
                entityName="SOVItem"
                projectId={activeProjectId}
                fields={[
                  { key: "line_number", label: "Line #", type: "text" },
                  { key: "description", label: "Description", type: "text", required: true },
                  { key: "scheduled_value", label: "Scheduled Value", type: "number" },
                  { key: "percent_complete", label: "% Complete", type: "number" },
                ]}
                order="line_number"
              />
            </div>
          </TabsContent>
          </Tabs>
          )}
          </div>
          );
          }

          function EntityManager({ title, entityName, projectId, fields, order = "-created_date" }) {
          const queryClient = useQueryClient();

          const [showCreate, setShowCreate] = useState(false);
          const [showEdit, setShowEdit] = useState(false);
          const [deleteConfirm, setDeleteConfirm] = useState(null);
          const [selectedRow, setSelectedRow] = useState(null);

          const initial = useMemo(() => {
          const base = { project_id: projectId };
          fields.forEach(f => {
          base[f.key] = f.type === "number" ? 0 : "";
          });
          return base;
          }, [fields, projectId]);

          const [createData, setCreateData] = useState(initial);
          const [editData, setEditData] = useState({});

          useEffect(() => {
          setCreateData(initial);
          }, [initial]);

          const entityApi = base44.entities?.[entityName];
          const canUse = !!entityApi;

          const { data: rows = [], isLoading, isFetching, refetch } = useQuery({
          queryKey: ["entity-manager", entityName, projectId],
          queryFn: async () => {
          if (!canUse || !projectId) return [];
          const filtered = await entityApi.filter({ project_id: projectId }, order);
          return Array.isArray(filtered) ? filtered : [];
          },
          enabled: !!projectId && canUse,
          staleTime: 60 * 1000
          });

          const createMutation = useMutation({
          mutationFn: async (payload) => {
          if (!canUse) throw new Error(`Entity not available: ${entityName}`);
          return entityApi.create(payload);
          },
          onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["entity-manager", entityName, projectId] });
          queryClient.invalidateQueries();
          setShowCreate(false);
          setCreateData(initial);
          toast.success(`${title} created`);
          },
          onError: (e) => toast.error(`Create failed: ${e?.message || "Unknown error"}`)
          });

          const updateMutation = useMutation({
          mutationFn: async ({ id, payload }) => {
          if (!canUse) throw new Error(`Entity not available: ${entityName}`);
          return entityApi.update(id, payload);
          },
          onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["entity-manager", entityName, projectId] });
          queryClient.invalidateQueries();
          setShowEdit(false);
          setSelectedRow(null);
          toast.success(`${title} updated`);
          },
          onError: (e) => toast.error(`Update failed: ${e?.message || "Unknown error"}`)
          });

          const deleteMutation = useMutation({
          mutationFn: async (id) => {
          if (!canUse) throw new Error(`Entity not available: ${entityName}`);
          return entityApi.delete(id);
          },
          onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["entity-manager", entityName, projectId] });
          queryClient.invalidateQueries();
          setDeleteConfirm(null);
          setShowEdit(false);
          setSelectedRow(null);
          toast.success(`${title} deleted`);
          },
          onError: (e) => toast.error(`Delete failed: ${e?.message || "Unknown error"}`)
          });

          const openEdit = (row) => {
          setSelectedRow(row);
          const next = { project_id: projectId };
          fields.forEach(f => {
          next[f.key] = row?.[f.key] ?? (f.type === "number" ? 0 : "");
          });
          setEditData(next);
          setShowEdit(true);
          };

          const validate = (data) => {
          for (const f of fields) {
          if (f.required) {
          const v = data[f.key];
          if (v === null || v === undefined || `${v}`.trim() === "") {
          toast.error(`${title}: ${f.label} is required`);
          return false;
          }
          }
          if (f.type === "number" && data[f.key] !== "" && data[f.key] !== null && data[f.key] !== undefined) {
          const n = Number(data[f.key]);
          if (Number.isNaN(n)) {
          toast.error(`${title}: ${f.label} must be a number`);
          return false;
          }
          }
          }
          return true;
          };

          const normalizePayload = (data) => {
          const payload = { project_id: projectId };
          fields.forEach(f => {
          let v = data[f.key];
          if (f.type === "number") v = v === "" ? null : Number(v);
          payload[f.key] = v;
          });
          return payload;
          };

          return (
          <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
          <div>
           <p className="text-white font-semibold">{title}</p>
           <p className="text-xs text-zinc-400">
             {isFetching ? "Updating…" : `${rows.length} records`}
           </p>
          </div>

          <div className="flex items-center gap-2">
           <Button
             variant="outline"
             size="sm"
             onClick={() => refetch()}
             className="bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700"
           >
             Refresh
           </Button>
           <Button
             size="sm"
             onClick={() => setShowCreate(true)}
             className="bg-amber-500 hover:bg-amber-600 text-black"
           >
             <PlusCircle className="h-4 w-4 mr-2" />
             Add
           </Button>
          </div>
          </div>

          {!canUse && (
          <div className="text-xs text-red-400">
           Entity not available in Base44 client: base44.entities.{entityName}
          </div>
          )}

          {isLoading ? (
          <div className="text-xs text-zinc-400">Loading…</div>
          ) : rows.length === 0 ? (
          <div className="text-xs text-zinc-400 border border-zinc-800 rounded p-3">
           No records yet. Click <span className="text-white">Add</span> to create one.
          </div>
          ) : (
          <div className="border border-zinc-800 rounded">
           <div className="max-h-[320px] overflow-auto">
             <table className="w-full text-sm">
               <thead className="sticky top-0 bg-zinc-950 border-b border-zinc-800">
                 <tr className="text-left">
                   <th className="p-2 text-xs text-zinc-400 font-medium">Main</th>
                   <th className="p-2 text-xs text-zinc-400 font-medium">Updated</th>
                   <th className="p-2 text-xs text-zinc-400 font-medium text-right">Actions</th>
                 </tr>
               </thead>
               <tbody>
                 {rows.slice(0, 200).map((r) => {
                   const mainKey =
                     fields.find(f => f.key === "name")?.key ||
                     fields.find(f => f.key === "description")?.key ||
                     fields[0]?.key;

                   return (
                     <tr key={r.id} className="border-b border-zinc-800 last:border-0">
                       <td className="p-2">
                         <div className="text-white font-medium truncate max-w-[320px]">
                           {r?.[mainKey] || `${entityName} ${r.id}`}
                         </div>
                         <div className="text-xs text-zinc-500 truncate max-w-[320px]">
                           {fields.slice(1, 3).map(f => `${f.label}: ${r?.[f.key] ?? "-"}`).join(" • ")}
                         </div>
                       </td>
                       <td className="p-2 text-xs text-zinc-500">
                         {r.updated_date ? new Date(r.updated_date).toLocaleString() : (r.created_date ? new Date(r.created_date).toLocaleString() : "-")}
                       </td>
                       <td className="p-2">
                         <div className="flex justify-end gap-2">
                           <Button
                             variant="outline"
                             size="sm"
                             onClick={() => openEdit(r)}
                             className="bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700"
                           >
                             <Pencil className="h-4 w-4 mr-2" />
                             Edit
                           </Button>
                           <Button
                             variant="destructive"
                             size="sm"
                             onClick={() => setDeleteConfirm(r)}
                           >
                             <Trash2 className="h-4 w-4 mr-2" />
                             Delete
                           </Button>
                         </div>
                       </td>
                     </tr>
                   );
                 })}
               </tbody>
             </table>
           </div>

           {rows.length > 200 && (
             <div className="p-2 text-xs text-zinc-500 border-t border-zinc-800">
               Showing first 200 records for performance.
             </div>
           )}
          </div>
          )}

          {/* Create Sheet */}
          <Sheet open={showCreate} onOpenChange={setShowCreate}>
          <SheetContent className="w-[640px] sm:max-w-[640px] bg-zinc-950 border-zinc-800 text-white overflow-y-auto">
           <SheetHeader>
             <SheetTitle className="text-white">Add {title}</SheetTitle>
           </SheetHeader>

           <div className="mt-4 space-y-4">
             {fields.map((f) => (
               <div key={f.key} className="space-y-2">
                 <Label className="text-xs text-zinc-400">
                   {f.label}{f.required ? " *" : ""}
                 </Label>

                 {f.type === "textarea" ? (
                   <Textarea
                     value={createData[f.key] ?? ""}
                     onChange={(e) => setCreateData((p) => ({ ...p, [f.key]: e.target.value }))}
                     className="bg-zinc-900 border-zinc-800 text-white"
                     rows={4}
                   />
                 ) : (
                   <Input
                     type={f.type === "date" ? "date" : f.type === "number" ? "number" : "text"}
                     value={createData[f.key] ?? ""}
                     onChange={(e) => setCreateData((p) => ({ ...p, [f.key]: e.target.value }))}
                     className="bg-zinc-900 border-zinc-800 text-white"
                   />
                 )}
               </div>
             ))}

             <div className="flex gap-2 pt-2">
               <Button
                 variant="outline"
                 onClick={() => setShowCreate(false)}
                 className="flex-1 bg-zinc-900 border-zinc-800 text-white hover:bg-zinc-800"
               >
                 Cancel
               </Button>
               <Button
                 className="flex-1 bg-amber-500 hover:bg-amber-600 text-black"
                 disabled={createMutation.isPending}
                 onClick={() => {
                   if (!validate(createData)) return;
                   createMutation.mutate(normalizePayload(createData));
                 }}
               >
                 {createMutation.isPending ? "Saving…" : "Create"}
               </Button>
             </div>
           </div>
          </SheetContent>
          </Sheet>

          {/* Edit Sheet */}
          <Sheet open={showEdit} onOpenChange={setShowEdit}>
          <SheetContent className="w-[640px] sm:max-w-[640px] bg-zinc-950 border-zinc-800 text-white overflow-y-auto">
           <SheetHeader>
             <SheetTitle className="text-white">Edit {title}</SheetTitle>
           </SheetHeader>

           <div className="mt-4 space-y-4">
             {fields.map((f) => (
               <div key={f.key} className="space-y-2">
                 <Label className="text-xs text-zinc-400">
                   {f.label}{f.required ? " *" : ""}
                 </Label>

                 {f.type === "textarea" ? (
                   <Textarea
                     value={editData[f.key] ?? ""}
                     onChange={(e) => setEditData((p) => ({ ...p, [f.key]: e.target.value }))}
                     className="bg-zinc-900 border-zinc-800 text-white"
                     rows={4}
                   />
                 ) : (
                   <Input
                     type={f.type === "date" ? "date" : f.type === "number" ? "number" : "text"}
                     value={editData[f.key] ?? ""}
                     onChange={(e) => setEditData((p) => ({ ...p, [f.key]: e.target.value }))}
                     className="bg-zinc-900 border-zinc-800 text-white"
                   />
                 )}
               </div>
             ))}

             <div className="flex gap-2 pt-2">
               <Button
                 variant="outline"
                 onClick={() => setShowEdit(false)}
                 className="flex-1 bg-zinc-900 border-zinc-800 text-white hover:bg-zinc-800"
               >
                 Close
               </Button>
               <Button
                 className="flex-1 bg-amber-500 hover:bg-amber-600 text-black"
                 disabled={updateMutation.isPending || !selectedRow?.id}
                 onClick={() => {
                   if (!selectedRow?.id) return;
                   if (!validate(editData)) return;
                   updateMutation.mutate({ id: selectedRow.id, payload: normalizePayload(editData) });
                 }}
               >
                 {updateMutation.isPending ? "Saving…" : "Save"}
               </Button>
             </div>
           </div>
          </SheetContent>
          </Sheet>

          {/* Delete Confirm */}
          <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
          <DialogContent className="bg-zinc-950 border-zinc-800 text-white">
           <DialogHeader>
             <DialogTitle>Delete {title}?</DialogTitle>
           </DialogHeader>
           <p className="text-sm text-zinc-400">
             This will permanently delete the record. This cannot be undone.
           </p>
           <DialogFooter>
             <Button
               variant="outline"
               onClick={() => setDeleteConfirm(null)}
               className="bg-zinc-900 border-zinc-800 text-white hover:bg-zinc-800"
             >
               Cancel
             </Button>
             <Button
               variant="destructive"
               disabled={deleteMutation.isPending || !deleteConfirm?.id}
               onClick={() => deleteMutation.mutate(deleteConfirm.id)}
             >
               {deleteMutation.isPending ? "Deleting…" : "Delete"}
             </Button>
           </DialogFooter>
          </DialogContent>
          </Dialog>
          </CardContent>
          </Card>
          );
          }