import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  DollarSign,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Sparkles,
  Loader2,
  AlertCircle,
  Target
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

function SectionHeader({ title, subtitle, right, tone = "default" }) {
  const toneClass =
    tone === "danger" ? "border-red-500/20 bg-red-500/5" :
    tone === "good" ? "border-green-500/20 bg-green-500/5" :
    tone === "warn" ? "border-amber-500/20 bg-amber-500/5" :
    "border-border bg-card";

  return (
    <div className={cn("flex items-start justify-between gap-4 px-6 pt-5 pb-3 border-b", toneClass)}>
      <div className="min-w-0">
        <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
        {subtitle ? <p className="text-xs text-muted-foreground mt-1">{subtitle}</p> : null}
      </div>
      {right ? <div className="shrink-0">{right}</div> : null}
    </div>
  );
}

function KPI({ label, value, sub, icon: Icon, tone }) {
  const cardTone =
    tone === 'good' ? "border-green-500/20 bg-green-500/5" :
    tone === 'danger' ? "border-red-500/20 bg-red-500/5" :
    tone === 'warn' ? "border-amber-500/20 bg-amber-500/5" :
    "border-border bg-card";

  const valueTone =
    tone === 'good' ? "text-green-600" :
    tone === 'danger' ? "text-red-600" :
    tone === 'warn' ? "text-amber-600" :
    "text-foreground";

  return (
    <Card className={cn("border", cardTone)}>
      <CardContent className="pt-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className={cn("text-2xl font-bold mt-1", valueTone)}>{value}</p>
            {sub ? <p className="text-xs text-muted-foreground mt-1">{sub}</p> : null}
          </div>
          {Icon ? <Icon className={cn("h-5 w-5 mt-1", valueTone)} /> : null}
        </div>
      </CardContent>
    </Card>
  );
}

export default function Performance() {
  const [analyzingProject, setAnalyzingProject] = useState(null);
  const [aiInsights, setAiInsights] = useState({});

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list(),
    staleTime: 10 * 60 * 1000,
  });

  const { data: financials = [] } = useQuery({
    queryKey: ['financials'],
    queryFn: () => base44.entities.Financial.list(),
    staleTime: 10 * 60 * 1000,
  });

  const { data: changeOrders = [] } = useQuery({
    queryKey: ['changeOrders'],
    queryFn: () => base44.entities.ChangeOrder.list(),
    staleTime: 10 * 60 * 1000,
  });

  const { data: dailyLogs = [] } = useQuery({
    queryKey: ['dailyLogs'],
    queryFn: () => base44.entities.DailyLog.list(),
    staleTime: 10 * 60 * 1000,
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list(),
    staleTime: 10 * 60 * 1000,
  });

  const { data: rfis = [] } = useQuery({
    queryKey: ['rfis'],
    queryFn: () => base44.entities.RFI.list(),
    staleTime: 10 * 60 * 1000,
  });

  const criticalIssues = useMemo(() => {
    const issues = [];
    const activeProjects = projects.filter(p => p.status === 'in_progress');

    activeProjects.forEach(project => {
      const projectFinancials = financials.filter(f => f.project_id === project.id);
      const projectCOs = changeOrders.filter(co => co.project_id === project.id);
      const projectRFIs = rfis.filter(r => r.project_id === project.id);
      const projectTasks = tasks.filter(t => t.project_id === project.id);

      const budget = projectFinancials.reduce((sum, f) => sum + (f.current_budget || 0), 0);
      const actual = projectFinancials.reduce((sum, f) => sum + (f.actual_amount || 0), 0);
      const variance = budget > 0 ? ((budget - actual) / budget) * 100 : 0;

      if (variance < -10) {
        issues.push({
          severity: 'critical',
          type: 'budget',
          project,
          title: `${project.project_number} Budget Overrun`,
          description: `${Math.abs(variance).toFixed(1)}% over budget`,
          impact: `$${Math.abs(budget - actual).toLocaleString()} overrun`,
          metric: variance,
        });
      }

      if (project.target_completion) {
        const today = new Date();
        const targetDate = new Date(project.target_completion);
        const daysToTarget = Math.ceil((targetDate - today) / (1000 * 60 * 60 * 24));

        const completedTasks = projectTasks.filter(t => t.status === 'completed').length;
        const totalTasks = projectTasks.length;
        const progressPercent = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

        if (progressPercent < 50 && daysToTarget < 30 && daysToTarget > 0) {
          issues.push({
            severity: 'critical',
            type: 'schedule',
            project,
            title: `${project.project_number} Schedule Risk`,
            description: `${progressPercent.toFixed(0)}% complete, ${daysToTarget}d to target`,
            impact: `High risk of missing completion date`,
            metric: daysToTarget,
          });
        }

        if (daysToTarget < 0) {
          issues.push({
            severity: 'critical',
            type: 'schedule',
            project,
            title: `${project.project_number} Overdue`,
            description: `${Math.abs(daysToTarget)} days past target completion`,
            impact: `Project is behind schedule`,
            metric: daysToTarget,
          });
        }
      }

      const openRFIs = projectRFIs.filter(r => !['answered', 'closed'].includes(r.status));
      if (openRFIs.length > 10) {
        issues.push({
          severity: 'warning',
          type: 'quality',
          project,
          title: `${project.project_number} High Open RFIs`,
          description: `${openRFIs.length} open RFIs blocking progress`,
          impact: `Potential design/coordination issues`,
          metric: openRFIs.length,
        });
      }

      const pendingCOs = projectCOs.filter(co => co.status === 'pending' || co.status === 'submitted');
      if (pendingCOs.length > 5) {
        issues.push({
          severity: 'warning',
          type: 'change_orders',
          project,
          title: `${project.project_number} CO Backlog`,
          description: `${pendingCOs.length} pending change orders`,
          impact: `Scope creep and delayed approvals`,
          metric: pendingCOs.length,
        });
      }

      const projectLogs = dailyLogs.filter(log => log.project_id === project.id);
      const recentIncidents = projectLogs.filter(log => log.safety_incidents).length;
      if (recentIncidents > 0) {
        issues.push({
          severity: 'critical',
          type: 'safety',
          project,
          title: `${project.project_number} Safety Incidents`,
          description: `${recentIncidents} incidents recorded`,
          impact: `Safety protocol review required`,
          metric: recentIncidents,
        });
      }
    });

    return issues.sort((a, b) => {
      if (a.severity === 'critical' && b.severity !== 'critical') return -1;
      if (a.severity !== 'critical' && b.severity === 'critical') return 1;
      return 0;
    });
  }, [projects, financials, changeOrders, rfis, tasks, dailyLogs]);

  const performanceMetrics = useMemo(() => {
    const activeProjects = projects.filter(p => p.status === 'in_progress');

    const onTimeProjects = activeProjects.filter(p => {
      if (!p.target_completion) return true;
      return new Date(p.target_completion) > new Date();
    }).length;

    const onTimeRate = activeProjects.length > 0 ? ((onTimeProjects / activeProjects.length) * 100) : 100;

    const totalBudget = financials.reduce((sum, f) => sum + (f.current_budget || 0), 0);
    const totalActual = financials.reduce((sum, f) => sum + (f.actual_amount || 0), 0);
    const budgetPerformance = totalBudget > 0 ? ((totalBudget - totalActual) / totalBudget * 100) : 0;

    const safetyIncidents = dailyLogs.filter(log => log.safety_incidents).length;
    const totalDays = dailyLogs.length;
    const safetyRate = totalDays > 0 ? ((totalDays - safetyIncidents) / totalDays * 100) : 100;

    const approvedCOs = changeOrders.filter(co => co.status === 'approved').length;
    const totalCOs = changeOrders.length;
    const coApprovalRate = totalCOs > 0 ? ((approvedCOs / totalCOs) * 100) : 0;

    const projectPerformance = activeProjects.slice(0, 6).map(project => {
      const projectFinancials = financials.filter(f => f.project_id === project.id);
      const budget = projectFinancials.reduce((sum, f) => sum + (f.current_budget || 0), 0);
      const actual = projectFinancials.reduce((sum, f) => sum + (f.actual_amount || 0), 0);
      const variance = budget > 0 ? ((budget - actual) / budget * 100) : 0;

      return {
        name: project.project_number || project.name?.substring(0, 10),
        variance: parseFloat(variance.toFixed(1)),
        status: variance >= 0 ? 'on_budget' : 'over_budget'
      };
    });

    const healthScore = Math.round(
      (onTimeRate * 0.4) +
      ((budgetPerformance >= 0 ? 100 : Math.max(0, 100 + budgetPerformance)) * 0.3) +
      (safetyRate * 0.2) +
      (coApprovalRate * 0.1)
    );

    return {
      activeProjects,
      onTimeProjects,
      onTimeRate,
      totalBudget,
      totalActual,
      budgetPerformance,
      safetyIncidents,
      totalDays,
      safetyRate,
      approvedCOs,
      totalCOs,
      coApprovalRate,
      projectPerformance,
      healthScore
    };
  }, [projects, financials, dailyLogs, changeOrders]);

  const analyzeProjectWithAI = async (issue) => {
    setAnalyzingProject(issue.project.id);
    try {
      const projectFinancials = financials.filter(f => f.project_id === issue.project.id);
      const projectCOs = changeOrders.filter(co => co.project_id === issue.project.id);
      const projectRFIs = rfis.filter(r => r.project_id === issue.project.id);

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `You are analyzing a construction project performance issue. Provide a concise, actionable analysis.

Project: ${issue.project.name} (${issue.project.project_number})
Issue: ${issue.title}
Description: ${issue.description}
Impact: ${issue.impact}

Context:
- Budget: $${projectFinancials.reduce((sum, f) => sum + (f.current_budget || 0), 0).toLocaleString()}
- Actual Costs: $${projectFinancials.reduce((sum, f) => sum + (f.actual_amount || 0), 0).toLocaleString()}
- Open Change Orders: ${projectCOs.filter(co => co.status !== 'approved' && co.status !== 'rejected').length}
- Open RFIs: ${projectRFIs.filter(r => !['answered', 'closed'].includes(r.status)).length}

Provide:
1. Root Cause (1-2 sentences)
2. Immediate Actions (2-3 bullet points)
3. Risk Mitigation (1-2 strategies)

Be direct and construction-industry specific.`
      });

      setAiInsights(prev => ({ ...prev, [issue.project.id]: response }));
      toast.success('AI analysis complete');
    } catch (error) {
      console.error('AI analysis failed:', error);
      toast.error('Failed to generate AI insights');
    } finally {
      setAnalyzingProject(null);
    }
  };

  const {
    activeProjects,
    onTimeProjects,
    onTimeRate,
    totalBudget,
    totalActual,
    budgetPerformance,
    safetyIncidents,
    totalDays,
    safetyRate,
    approvedCOs,
    totalCOs,
    coApprovalRate,
    projectPerformance,
    healthScore
  } = performanceMetrics;

  const healthTone = healthScore >= 80 ? "good" : healthScore >= 60 ? "warn" : "danger";

  return (
    <div className="space-y-6 max-w-[1800px] mx-auto">
      {/* Header */}
      <Card className={cn("border", healthTone === "good" ? "border-green-500/20 bg-green-500/5" : healthTone === "warn" ? "border-amber-500/20 bg-amber-500/5" : "border-red-500/20 bg-red-500/5")}>
        <div className="px-6 py-5 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Executive Command Center</h1>
            <p className="text-sm text-muted-foreground mt-2">
              AI-powered portfolio intelligence • {activeProjects.length} active projects
            </p>
          </div>
          <Badge className={cn(
            "text-base px-4 py-2 font-bold",
            healthTone === "good" ? "bg-green-500 text-white" :
            healthTone === "warn" ? "bg-amber-500 text-black" :
            "bg-red-500 text-white"
          )}>
            {healthScore}% HEALTH
          </Badge>
        </div>
      </Card>

      {/* Critical issues */}
      {criticalIssues.length > 0 ? (
        <Card className="border-red-500/20 bg-red-500/5">
          <SectionHeader
            title="Critical Issues Detected"
            subtitle="AI-powered anomaly detection across active projects."
            tone="danger"
            right={
              <Badge variant="destructive" className="text-sm">
                {criticalIssues.filter(i => i.severity === 'critical').length} critical
              </Badge>
            }
          />
          <CardContent className="pt-4">
            <div className="space-y-3">
              {criticalIssues.map((issue, idx) => {
                const icon =
                  issue.type === 'budget' ? DollarSign :
                  issue.type === 'schedule' ? Clock :
                  issue.type === 'quality' ? AlertTriangle :
                  issue.type === 'change_orders' ? Target :
                  XCircle;

                const Icon = icon;

                return (
                  <Card key={idx} className={cn(
                    "border",
                    issue.severity === 'critical' ? "border-red-500/20 bg-red-500/5" : "border-amber-500/20 bg-amber-500/5"
                  )}>
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Icon className={cn("h-4 w-4", issue.severity === 'critical' ? "text-red-600" : "text-amber-600")} />
                            <p className="font-semibold">{issue.title}</p>
                            <Badge variant="outline" className={cn(
                              "capitalize",
                              issue.severity === 'critical' ? "border-red-500/30 text-red-600" : "border-amber-500/30 text-amber-700"
                            )}>
                              {issue.severity}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-2">{issue.description}</p>
                          <p className="text-xs text-muted-foreground mt-1">Impact: {issue.impact}</p>

                          {aiInsights[issue.project.id] && (
                            <div className="mt-4 p-3 rounded-lg border bg-muted/30">
                              <div className="flex items-center gap-2 mb-2">
                                <Sparkles className="h-4 w-4 text-amber-600" />
                                <p className="text-xs font-semibold">AI Analysis</p>
                              </div>
                              <div className="text-xs text-foreground whitespace-pre-wrap">
                                {aiInsights[issue.project.id]}
                              </div>
                            </div>
                          )}
                        </div>

                        <Button
                          size="sm"
                          onClick={() => analyzeProjectWithAI(issue)}
                          disabled={analyzingProject === issue.project.id}
                          className="shrink-0"
                        >
                          {analyzingProject === issue.project.id ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Analyzing…
                            </>
                          ) : (
                            <>
                              <Sparkles className="h-4 w-4 mr-2" />
                              AI Analyze
                            </>
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-green-500/20 bg-green-500/5">
          <CardContent className="pt-8 pb-8 text-center">
            <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-600" />
            <p className="text-lg font-semibold">Portfolio Running Clean</p>
            <p className="text-sm text-muted-foreground mt-1">
              No critical issues detected across active projects.
            </p>
          </CardContent>
        </Card>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <KPI
          label="On-Time Delivery"
          value={`${onTimeRate.toFixed(1)}%`}
          sub={`${onTimeProjects} of ${activeProjects.length} projects`}
          icon={Clock}
          tone={onTimeRate >= 80 ? "good" : "warn"}
        />
        <KPI
          label="Budget Performance"
          value={`${budgetPerformance >= 0 ? '+' : ''}${budgetPerformance.toFixed(1)}%`}
          sub={`$${(totalBudget - totalActual).toLocaleString()} variance`}
          icon={DollarSign}
          tone={budgetPerformance >= 0 ? "good" : "danger"}
        />
        <KPI
          label="Safety Score"
          value={`${safetyRate.toFixed(1)}%`}
          sub={`${safetyIncidents} incidents in ${totalDays} days`}
          icon={safetyRate >= 95 ? CheckCircle : AlertTriangle}
          tone={safetyRate >= 95 ? "good" : "danger"}
        />
        <KPI
          label="CO Approval Rate"
          value={`${coApprovalRate.toFixed(1)}%`}
          sub={`${approvedCOs} of ${totalCOs} approved`}
          icon={Target}
          tone="warn"
        />
      </div>

      {/* Trend deviations */}
      <Card>
        <SectionHeader
          title="Trend Deviations"
          subtitle="Projects trending negative on budget variance."
          right={<Badge variant="outline">Top 5</Badge>}
        />
        <CardContent className="pt-4">
          <div className="space-y-2">
            {projectPerformance.filter(p => p.status === 'over_budget').slice(0, 5).map((p, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 rounded-lg border bg-muted/20">
                <div>
                  <p className="text-sm font-semibold">{p.name}</p>
                  <p className="text-xs text-muted-foreground">Budget variance trending negative</p>
                </div>
                <Badge variant="destructive" className="text-xs">
                  {p.variance}% variance
                </Badge>
              </div>
            ))}
            {projectPerformance.filter(p => p.status === 'over_budget').length === 0 && (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No negative budget trends detected.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Charts / Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Card>
          <SectionHeader title="Project Budget Variance" subtitle="Variance by active project (sampled)." />
          <CardContent className="pt-4">
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={projectPerformance}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value) => `${value}%`} />
                  <Bar dataKey="variance" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <SectionHeader title="Monthly Snapshot" subtitle="Quick portfolio rollup." />
          <CardContent className="pt-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/20">
                <span className="text-sm text-muted-foreground">Active Projects</span>
                <span className="text-lg font-bold">{activeProjects.length}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/20">
                <span className="text-sm text-muted-foreground">Completed</span>
                <span className="text-lg font-bold text-green-600">
                  {projects.filter(p => p.status === 'completed').length}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/20">
                <span className="text-sm text-muted-foreground">At Risk</span>
                <span className="text-lg font-bold text-red-600">
                  {activeProjects.filter(p => {
                    const pf = financials.filter(f => f.project_id === p.id);
                    const budget = pf.reduce((sum, f) => sum + (f.current_budget || 0), 0);
                    const actual = pf.reduce((sum, f) => sum + (f.actual_amount || 0), 0);
                    return budget > 0 && actual > budget * 0.95;
                  }).length}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Portfolio health breakdown */}
      <Card>
        <SectionHeader
          title="Portfolio Health Breakdown"
          subtitle="Composite score: Schedule (40%) + Budget (30%) + Safety (20%) + CO Efficiency (10%)."
          right={
            <Badge className={cn(
              healthTone === "good" ? "bg-green-500 text-white" :
              healthTone === "warn" ? "bg-amber-500 text-black" :
              "bg-red-500 text-white"
            )}>
              {healthScore}/100
            </Badge>
          }
        />
        <CardContent className="pt-4 space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2 text-sm">
              <span className="text-muted-foreground">Schedule Performance</span>
              <span className="font-medium">{onTimeRate.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
              <div className={cn("h-full", onTimeRate >= 80 ? "bg-green-500" : "bg-amber-500")} style={{ width: `${Math.min(100, Math.max(0, onTimeRate))}%` }} />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2 text-sm">
              <span className="text-muted-foreground">Budget Efficiency</span>
              <span className="font-medium">{Math.min(100, Math.abs(budgetPerformance)).toFixed(1)}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
              <div className={cn("h-full", budgetPerformance >= 0 ? "bg-green-500" : "bg-red-500")} style={{ width: `${Math.min(100, Math.abs(budgetPerformance))}%` }} />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2 text-sm">
              <span className="text-muted-foreground">Safety Compliance</span>
              <span className="font-medium">{safetyRate.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
              <div className={cn("h-full", safetyRate >= 95 ? "bg-green-500" : "bg-red-500")} style={{ width: `${Math.min(100, Math.max(0, safetyRate))}%` }} />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}