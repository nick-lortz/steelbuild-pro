import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/ui/PageHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart3, Users, TrendingUp, AlertTriangle } from 'lucide-react';
import PortfolioOverview from '@/components/analytics/PortfolioOverview';
import ResourceHeatmap from '@/components/analytics/ResourceHeatmap';
import RiskTrendAnalysis from '@/components/analytics/RiskTrendAnalysis';
import ProjectRiskDashboard from '@/components/analytics/ProjectRiskDashboard';
import CostRiskIndicator from '@/components/financials/CostRiskIndicator';
import EmptyState from '@/components/ui/EmptyState';
import FabricationFieldDrift from '@/components/analytics/FabricationFieldDrift';

export default function Analytics() {
  const [activeProjectId, setActiveProjectId] = React.useState(null);

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: allProjects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list(),
  });

  const userProjects = currentUser?.role === 'admin' 
    ? allProjects 
    : allProjects.filter(p => p.assigned_users?.includes(currentUser?.email));

  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ['projects', activeProjectId],
    queryFn: () => activeProjectId 
      ? base44.entities.Project.filter({ id: activeProjectId })
      : Promise.resolve(userProjects),
    enabled: !!activeProjectId || userProjects.length > 0,
  });

  const { data: financials = [] } = useQuery({
    queryKey: ['financials', activeProjectId],
    queryFn: () => activeProjectId
      ? base44.entities.Financial.filter({ project_id: activeProjectId })
      : base44.entities.Financial.list(),
    enabled: !!activeProjectId,
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks', activeProjectId],
    queryFn: () => activeProjectId
      ? base44.entities.Task.filter({ project_id: activeProjectId }, 'end_date')
      : base44.entities.Task.list(),
    enabled: !!activeProjectId,
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ['expenses', activeProjectId],
    queryFn: () => activeProjectId
      ? base44.entities.Expense.filter({ project_id: activeProjectId })
      : base44.entities.Expense.list(),
    enabled: !!activeProjectId,
  });

  const { data: resources = [] } = useQuery({
    queryKey: ['resources'],
    queryFn: () => base44.entities.Resource.list(),
  });

  const { data: resourceAllocations = [] } = useQuery({
    queryKey: ['resourceAllocations', activeProjectId],
    queryFn: () => activeProjectId
      ? base44.entities.ResourceAllocation.filter({ project_id: activeProjectId })
      : base44.entities.ResourceAllocation.list(),
    enabled: !!activeProjectId,
  });

  const { data: rfis = [] } = useQuery({
    queryKey: ['rfis', activeProjectId],
    queryFn: () => activeProjectId
      ? base44.entities.RFI.filter({ project_id: activeProjectId }, '-created_date')
      : base44.entities.RFI.list('-created_date'),
    enabled: !!activeProjectId,
  });

  const { data: changeOrders = [] } = useQuery({
    queryKey: ['changeOrders', activeProjectId],
    queryFn: () => activeProjectId
      ? base44.entities.ChangeOrder.filter({ project_id: activeProjectId }, '-created_date')
      : base44.entities.ChangeOrder.list('-created_date'),
    enabled: !!activeProjectId,
  });

  const { data: drawings = [] } = useQuery({
    queryKey: ['drawings', activeProjectId],
    queryFn: () => activeProjectId
      ? base44.entities.DrawingSet.filter({ project_id: activeProjectId })
      : base44.entities.DrawingSet.list(),
    enabled: !!activeProjectId,
  });

  const { data: scopeGaps = [] } = useQuery({
    queryKey: ['scopeGaps', activeProjectId],
    queryFn: () => activeProjectId
      ? base44.entities.ScopeGap.filter({ project_id: activeProjectId })
      : base44.entities.ScopeGap.list(),
    enabled: !!activeProjectId,
  });

  const { data: laborBreakdowns = [] } = useQuery({
    queryKey: ['laborBreakdowns', activeProjectId],
    queryFn: () => activeProjectId
      ? base44.entities.LaborBreakdown.filter({ project_id: activeProjectId })
      : base44.entities.LaborBreakdown.list(),
    enabled: !!activeProjectId,
  });

  const { data: laborHours = [] } = useQuery({
    queryKey: ['laborHours', activeProjectId],
    queryFn: () => activeProjectId
      ? base44.entities.LaborHours.filter({ project_id: activeProjectId })
      : base44.entities.LaborHours.list(),
    enabled: !!activeProjectId,
  });

  const { data: sovItems = [] } = useQuery({
    queryKey: ['sov-items', activeProjectId],
    queryFn: () => activeProjectId
      ? base44.entities.SOVItem.filter({ project_id: activeProjectId })
      : base44.entities.SOVItem.list(),
    enabled: !!activeProjectId,
  });

  const { data: costCodes = [] } = useQuery({
    queryKey: ['cost-codes'],
    queryFn: () => base44.entities.CostCode.list('code')
  });

  React.useEffect(() => {
    if (!activeProjectId && userProjects.length > 0 && !projectsLoading) {
      setActiveProjectId(userProjects[0].id);
    }
  }, [activeProjectId, userProjects, projectsLoading]);

  if (!activeProjectId) {
    return (
      <div>
        <PageHeader title="Analytics Dashboard" subtitle="Select a project to view analytics" showBackButton={false} />
        <EmptyState 
          icon={BarChart3}
          title="No Project Selected"
          description="Select a project from your list to view analytics data."
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Analytics Dashboard"
        subtitle="Portfolio insights, resource utilization, and risk trends"
        showBackButton={false}
        actions={
          <Select value={activeProjectId || ''} onValueChange={setActiveProjectId}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Select Project" />
            </SelectTrigger>
            <SelectContent>
              {userProjects.map(project => (
                <SelectItem key={project.id} value={project.id}>
                  {project.project_number} - {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      <Tabs defaultValue="risk-dashboard" className="space-y-6">
        <TabsList className="bg-card border border-border">
          <TabsTrigger value="risk-dashboard">
            <AlertTriangle size={16} className="mr-2" />
            Risk Dashboard
          </TabsTrigger>
          <TabsTrigger value="fab-field">
            <BarChart3 size={16} className="mr-2" />
            Fab vs Field
          </TabsTrigger>
          <TabsTrigger value="portfolio">
            <BarChart3 size={16} className="mr-2" />
            Portfolio Overview
          </TabsTrigger>
          <TabsTrigger value="resources">
            <Users size={16} className="mr-2" />
            Resource Allocation
          </TabsTrigger>
          <TabsTrigger value="risks">
            <TrendingUp size={16} className="mr-2" />
            Risk Trends
          </TabsTrigger>
        </TabsList>

        <TabsContent value="risk-dashboard" className="space-y-6">
          {sovItems.length > 0 && (() => {
            const contractValue = sovItems.reduce((sum, s) => sum + (s.scheduled_value || 0), 0);
            const signedExtras = changeOrders
              .filter(co => co.status === 'approved')
              .reduce((sum, co) => sum + (co.cost_impact || 0), 0);
            const totalContract = contractValue + signedExtras;
            const earnedToDate = sovItems.reduce((sum, s) => 
              sum + ((s.scheduled_value || 0) * ((s.percent_complete || 0) / 100)), 0);
            const actualCost = expenses
              .filter(e => e.payment_status === 'paid' || e.payment_status === 'approved')
              .reduce((sum, e) => sum + (e.amount || 0), 0);
            const percentComplete = totalContract > 0 ? (earnedToDate / totalContract) * 100 : 0;
            const estimatedCostAtCompletion = percentComplete > 0 
              ? (actualCost / percentComplete) * 100 
              : actualCost;

            return (
              <CostRiskIndicator
                totalContract={totalContract}
                actualCost={actualCost}
                estimatedCostAtCompletion={estimatedCostAtCompletion}
                plannedMarginPercent={projects[0]?.planned_margin || 15}
              />
            );
          })()}

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
      </Tabs>
    </div>
  );
}