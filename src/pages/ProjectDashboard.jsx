import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Settings,
  DollarSign,
  Clock,
  FileText,
  MessageSquareWarning,
  Target,
  Activity
} from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import StatusBadge from '@/components/ui/StatusBadge';
import BudgetVarianceWidget from '@/components/project-dashboard/BudgetVarianceWidget';
import ScheduleAdherenceWidget from '@/components/project-dashboard/ScheduleAdherenceWidget';
import RFIResponseTimeWidget from '@/components/project-dashboard/RFIResponseTimeWidget';
import RiskRegister from '@/components/project-dashboard/RiskRegister';
import ProjectAlerts from '@/components/project-dashboard/ProjectAlerts';
import FinancialSummary from '@/components/project-dashboard/FinancialSummary';
import RiskAssessmentModule from '@/components/project-dashboard/RiskAssessmentModule';
import { format, differenceInDays } from 'date-fns';
import { calculateProjectLaborTotals, identifyScopeRiskTasks } from '@/components/shared/laborScheduleUtils';

export default function ProjectDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showAlertConfig, setShowAlertConfig] = useState(false);
  
  // Get project ID from URL
  const urlParams = new URLSearchParams(window.location.search);
  const projectId = urlParams.get('id');

  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      const projects = await base44.entities.Project.list();
      return projects.find(p => p.id === projectId);
    },
    enabled: !!projectId,
  });

  const { data: financials = [] } = useQuery({
    queryKey: ['financials', projectId],
    queryFn: async () => {
      const all = await base44.entities.Financial.list();
      return all.filter(f => f.project_id === projectId);
    },
    enabled: !!projectId,
  });

  const { data: costCodes = [] } = useQuery({
    queryKey: ['costCodes'],
    queryFn: () => base44.entities.CostCode.list('code'),
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks', projectId],
    queryFn: async () => {
      const all = await base44.entities.Task.list();
      return all.filter(t => t.project_id === projectId);
    },
    enabled: !!projectId,
  });

  const { data: rfis = [] } = useQuery({
    queryKey: ['rfis', projectId],
    queryFn: async () => {
      const all = await base44.entities.RFI.list();
      return all.filter(r => r.project_id === projectId);
    },
    enabled: !!projectId,
  });

  const { data: drawings = [] } = useQuery({
    queryKey: ['drawings', projectId],
    queryFn: async () => {
      const all = await base44.entities.DrawingSet.list();
      return all.filter(d => d.project_id === projectId);
    },
    enabled: !!projectId,
  });

  const { data: changeOrders = [] } = useQuery({
    queryKey: ['changeOrders', projectId],
    queryFn: async () => {
      const all = await base44.entities.ChangeOrder.list();
      return all.filter(co => co.project_id === projectId);
    },
    enabled: !!projectId,
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ['expenses', projectId],
    queryFn: async () => {
      const all = await base44.entities.Expense.list();
      return all.filter(e => e.project_id === projectId);
    },
    enabled: !!projectId,
  });

  const { data: breakdowns = [] } = useQuery({
    queryKey: ['labor-breakdowns', projectId],
    queryFn: async () => {
      const all = await base44.entities.LaborBreakdown.list();
      return all.filter(b => b.project_id === projectId);
    },
    enabled: !!projectId,
  });

  const { data: scopeGaps = [] } = useQuery({
    queryKey: ['scope-gaps', projectId],
    queryFn: async () => {
      const all = await base44.entities.ScopeGap.list();
      return all.filter(g => g.project_id === projectId);
    },
    enabled: !!projectId,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['labor-categories'],
    queryFn: () => base44.entities.LaborCategory.list('sequence_order'),
  });

  // Calculate project totals
  const projectTotals = useMemo(() => {
    const budget = financials.reduce((sum, f) => sum + (Number(f.budget_amount) || 0), 0);
    const committed = financials.reduce((sum, f) => sum + (Number(f.committed_amount) || 0), 0);
    const actualFromFinancials = financials.reduce((sum, f) => sum + (Number(f.actual_amount) || 0), 0);
    const actualFromExpenses = expenses
      .filter(e => e.payment_status === 'paid' || e.payment_status === 'approved')
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const actual = actualFromFinancials + actualFromExpenses;
    const remaining = budget - actual;
    const percentSpent = budget > 0 ? (actual / budget) * 100 : 0;

    return { budget, committed, actual, remaining, percentSpent };
  }, [financials, expenses]);

  // Calculate schedule metrics
  const scheduleMetrics = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'completed').length;
    const onTrack = tasks.filter(t => {
      if (t.status === 'completed') return true;
      if (!t.end_date) return true;
      return new Date(t.end_date) > new Date();
    }).length;
    const overdue = tasks.filter(t => {
      if (t.status === 'completed') return false;
      if (!t.end_date) return false;
      return new Date(t.end_date) < new Date();
    }).length;
    const adherence = total > 0 ? (onTrack / total) * 100 : 100;

    return { total, completed, onTrack, overdue, adherence };
  }, [tasks]);

  // Labor metrics
  const laborMetrics = useMemo(() => {
    const totals = calculateProjectLaborTotals(breakdowns, tasks);
    const openGaps = scopeGaps.filter(g => g.status === 'open');
    const totalGapCost = openGaps.reduce((sum, g) => sum + (Number(g.rough_cost) || 0), 0);
    const scopeRisks = identifyScopeRiskTasks(tasks, breakdowns, scopeGaps, categories);
    const categoriesAtRisk = scopeRisks.length;

    return {
      plannedShop: totals.scheduled_shop,
      plannedField: totals.scheduled_field,
      laborVariance: totals.shop_variance + totals.field_variance,
      hasVariance: totals.has_mismatch,
      openGapsCount: openGaps.length,
      totalGapCost,
      categoriesAtRisk,
      scopeRisks
    };
  }, [breakdowns, tasks, scopeGaps, categories]);

  if (!project) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-zinc-400">Loading project...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={project.name}
        subtitle={`${project.project_number} • ${project.client || 'No client'}`}
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowAlertConfig(true)}
              className="border-zinc-700"
            >
              <Settings size={16} className="mr-2" />
              Configure Alerts
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate(-1)}
              className="border-zinc-700"
            >
              <ArrowLeft size={16} className="mr-2" />
              Back
            </Button>
          </div>
        }
      />

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-400 text-sm">Budget Health</p>
                <p className={`text-2xl font-bold ${projectTotals.remaining >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {projectTotals.percentSpent.toFixed(1)}%
                </p>
                <p className="text-xs text-zinc-500 mt-1">
                  ${Math.abs(projectTotals.remaining).toLocaleString()} {projectTotals.remaining >= 0 ? 'remaining' : 'over'}
                </p>
              </div>
              <DollarSign className="text-amber-500" size={24} />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-400 text-sm">Schedule</p>
                <p className={`text-2xl font-bold ${scheduleMetrics.adherence >= 80 ? 'text-green-400' : 'text-red-400'}`}>
                  {scheduleMetrics.adherence.toFixed(0)}%
                </p>
                <p className="text-xs text-zinc-500 mt-1">
                  {scheduleMetrics.overdue} overdue tasks
                </p>
              </div>
              <Clock className="text-blue-500" size={24} />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-400 text-sm">Open RFIs</p>
                <p className="text-2xl font-bold text-white">
                  {rfis.filter(r => r.status !== 'closed' && r.status !== 'answered').length}
                </p>
                <p className="text-xs text-zinc-500 mt-1">
                  {rfis.filter(r => r.due_date && new Date(r.due_date) < new Date() && r.status !== 'closed').length} overdue
                </p>
              </div>
              <MessageSquareWarning className="text-purple-500" size={24} />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-400 text-sm">Drawings Status</p>
                <p className="text-2xl font-bold text-white">
                  {drawings.filter(d => d.status === 'FFF').length}/{drawings.length}
                </p>
                <p className="text-xs text-zinc-500 mt-1">
                  Released for fabrication
                </p>
              </div>
              <FileText className="text-green-500" size={24} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Labor KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-400 text-sm">Planned Shop Hrs</p>
                <p className="text-2xl font-bold text-blue-400">{laborMetrics.plannedShop}</p>
                <p className="text-xs text-zinc-500 mt-1">Allocated to tasks</p>
              </div>
              <TrendingUp className="text-blue-400" size={24} />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-400 text-sm">Planned Field Hrs</p>
                <p className="text-2xl font-bold text-green-400">{laborMetrics.plannedField}</p>
                <p className="text-xs text-zinc-500 mt-1">Allocated to tasks</p>
              </div>
              <TrendingUp className="text-green-400" size={24} />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-400 text-sm">Labor Variance</p>
                <p className={`text-2xl font-bold ${laborMetrics.hasVariance ? 'text-amber-400' : 'text-green-400'}`}>
                  {laborMetrics.laborVariance > 0 ? '+' : ''}{laborMetrics.laborVariance} hrs
                </p>
                <p className="text-xs text-zinc-500 mt-1">
                  {laborMetrics.categoriesAtRisk} categories at risk
                </p>
              </div>
              {laborMetrics.hasVariance ? <AlertTriangle className="text-amber-400" size={24} /> : <Target className="text-green-400" size={24} />}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-400 text-sm">Scope Gaps</p>
                <p className="text-2xl font-bold text-red-400">${(laborMetrics.totalGapCost / 1000).toFixed(0)}K</p>
                <p className="text-xs text-zinc-500 mt-1">
                  {laborMetrics.openGapsCount} open items
                </p>
              </div>
              <AlertTriangle className="text-red-400" size={24} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts Component */}
      <ProjectAlerts
        project={project}
        financials={financials}
        tasks={tasks}
        rfis={rfis}
        projectTotals={projectTotals}
        scheduleMetrics={scheduleMetrics}
        showConfig={showAlertConfig}
        onCloseConfig={() => setShowAlertConfig(false)}
      />

      <Tabs defaultValue="financial" className="mb-6">
        <TabsList className="bg-zinc-900 border border-zinc-800">
          <TabsTrigger value="financial" className="data-[state=active]:bg-zinc-800">
            <DollarSign size={14} className="mr-2" />
            Financial Summary
          </TabsTrigger>
          <TabsTrigger value="risks" className="data-[state=active]:bg-zinc-800">
            <AlertTriangle size={14} className="mr-2" />
            Risk Assessment
          </TabsTrigger>
          <TabsTrigger value="kpis" className="data-[state=active]:bg-zinc-800">
            <Activity size={14} className="mr-2" />
            KPI Widgets
          </TabsTrigger>
        </TabsList>

        <TabsContent value="financial" className="space-y-6">
          <FinancialSummary
            project={project}
            financials={financials}
            costCodes={costCodes}
            expenses={expenses}
            changeOrders={changeOrders}
          />
        </TabsContent>

        <TabsContent value="risks" className="space-y-6">
          <RiskAssessmentModule projectId={projectId} />
        </TabsContent>

        <TabsContent value="kpis" className="space-y-6">
          {/* Budget Variance by Cost Code */}
          <BudgetVarianceWidget
            financials={financials}
            costCodes={costCodes}
            expenses={expenses}
          />

          {/* Schedule Adherence by Phase */}
          <ScheduleAdherenceWidget
            tasks={tasks}
          />

          {/* RFI Response Times */}
          <RFIResponseTimeWidget
            rfis={rfis}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}