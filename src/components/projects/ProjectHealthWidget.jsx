import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Clock, DollarSign, Calendar, Target } from 'lucide-react';
import { differenceInDays, parseISO, isBefore } from 'date-fns';
import { Progress } from "@/components/ui/progress";

/**
 * Project Health Widget - displays key KPIs for a project
 */
export default function ProjectHealthWidget({ project, tasks = [], financials = [], changeOrders = [], rfis = [] }) {
  const projectHealth = useMemo(() => {
    // Budget Health
    const projectFinancials = financials.filter(f => f.project_id === project.id);
    const totalBudget = projectFinancials.reduce((sum, f) => sum + (f.budget_amount || 0), 0);
    const totalActual = projectFinancials.reduce((sum, f) => sum + (f.actual_amount || 0), 0);
    const budgetUsed = totalBudget > 0 ? (totalActual / totalBudget) * 100 : 0;
    const budgetHealth = budgetUsed < 80 ? 'good' : budgetUsed < 95 ? 'warning' : 'critical';

    // Schedule Health
    const projectTasks = tasks.filter(t => t.project_id === project.id);
    const completedTasks = projectTasks.filter(t => t.status === 'completed').length;
    const totalTasks = projectTasks.length;
    const scheduleProgress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
    
    const overdueTasks = projectTasks.filter(t => {
      if (t.status === 'completed' || !t.end_date) return false;
      try {
        return isBefore(parseISO(t.end_date), new Date());
      } catch {
        return false;
      }
    }).length;

    const scheduleHealth = overdueTasks === 0 ? 'good' : overdueTasks < 3 ? 'warning' : 'critical';

    // RFI Status
    const projectRFIs = rfis.filter(r => r.project_id === project.id);
    const pendingRFIs = projectRFIs.filter(r => r.status === 'pending' || r.status === 'submitted').length;
    const rfiHealth = pendingRFIs === 0 ? 'good' : pendingRFIs < 5 ? 'warning' : 'critical';

    // Change Order Impact
    const projectCOs = changeOrders.filter(co => co.project_id === project.id);
    const coImpact = projectCOs.reduce((sum, co) => sum + (co.cost_impact || 0), 0);
    const coPercent = project.contract_value ? (coImpact / project.contract_value) * 100 : 0;
    const coHealth = Math.abs(coPercent) < 5 ? 'good' : Math.abs(coPercent) < 10 ? 'warning' : 'critical';

    // Schedule Adherence
    let daysRemaining = 0;
    if (project.target_completion) {
      try {
        daysRemaining = differenceInDays(parseISO(project.target_completion), new Date());
      } catch {}
    }
    const scheduleStatus = daysRemaining > 30 ? 'good' : daysRemaining > 0 ? 'warning' : 'critical';

    // Overall Health Score (0-100)
    const scores = {
      good: 100,
      warning: 60,
      critical: 20
    };
    const overallScore = Math.round(
      (scores[budgetHealth] + scores[scheduleHealth] + scores[rfiHealth] + scores[coHealth] + scores[scheduleStatus]) / 5
    );

    return {
      overallScore,
      budgetHealth,
      scheduleHealth,
      rfiHealth,
      coHealth,
      scheduleStatus,
      budgetUsed,
      scheduleProgress,
      overdueTasks,
      pendingRFIs,
      coImpact,
      daysRemaining,
      totalTasks,
      completedTasks
    };
  }, [project, tasks, financials, rfis, changeOrders]);

  const getHealthColor = (health) => {
    switch (health) {
      case 'good': return 'text-green-400';
      case 'warning': return 'text-amber-400';
      case 'critical': return 'text-red-400';
      default: return 'text-zinc-400';
    }
  };

  const getHealthBg = (health) => {
    switch (health) {
      case 'good': return 'bg-green-500/20 border-green-500/30';
      case 'warning': return 'bg-amber-500/20 border-amber-500/30';
      case 'critical': return 'bg-red-500/20 border-red-500/30';
      default: return 'bg-zinc-500/20 border-zinc-500/30';
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-amber-400';
    return 'text-red-400';
  };

  return (
    <Card className="bg-zinc-900/50 border-zinc-800">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base text-white">Project Health</CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500">Overall Score</span>
            <span className={`text-2xl font-bold ${getScoreColor(projectHealth.overallScore)}`}>
              {projectHealth.overallScore}
            </span>
            {projectHealth.overallScore >= 80 ? (
              <CheckCircle size={20} className="text-green-400" />
            ) : projectHealth.overallScore >= 60 ? (
              <AlertTriangle size={20} className="text-amber-400" />
            ) : (
              <AlertTriangle size={20} className="text-red-400" />
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Budget Status */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <DollarSign size={14} className={getHealthColor(projectHealth.budgetHealth)} />
              <span className="text-zinc-300">Budget</span>
            </div>
            <span className={getHealthColor(projectHealth.budgetHealth)}>
              {projectHealth.budgetUsed.toFixed(1)}% used
            </span>
          </div>
          <Progress 
            value={Math.min(projectHealth.budgetUsed, 100)} 
            className="h-2"
          />
        </div>

        {/* Schedule Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Target size={14} className={getHealthColor(projectHealth.scheduleHealth)} />
              <span className="text-zinc-300">Schedule</span>
            </div>
            <span className={getHealthColor(projectHealth.scheduleHealth)}>
              {projectHealth.completedTasks}/{projectHealth.totalTasks} tasks
            </span>
          </div>
          <Progress 
            value={projectHealth.scheduleProgress} 
            className="h-2"
          />
          {projectHealth.overdueTasks > 0 && (
            <p className="text-xs text-red-400 flex items-center gap-1">
              <AlertTriangle size={10} />
              {projectHealth.overdueTasks} overdue tasks
            </p>
          )}
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          {/* Days Remaining */}
          <div className={`p-3 rounded-lg border ${getHealthBg(projectHealth.scheduleStatus)}`}>
            <div className="flex items-center gap-2 mb-1">
              <Calendar size={14} className={getHealthColor(projectHealth.scheduleStatus)} />
              <span className="text-xs text-zinc-400">Completion</span>
            </div>
            <p className={`text-lg font-bold ${getHealthColor(projectHealth.scheduleStatus)}`}>
              {projectHealth.daysRemaining > 0 ? `${projectHealth.daysRemaining}d` : 'Overdue'}
            </p>
          </div>

          {/* Pending RFIs */}
          <div className={`p-3 rounded-lg border ${getHealthBg(projectHealth.rfiHealth)}`}>
            <div className="flex items-center gap-2 mb-1">
              <Clock size={14} className={getHealthColor(projectHealth.rfiHealth)} />
              <span className="text-xs text-zinc-400">Pending RFIs</span>
            </div>
            <p className={`text-lg font-bold ${getHealthColor(projectHealth.rfiHealth)}`}>
              {projectHealth.pendingRFIs}
            </p>
          </div>

          {/* CO Impact */}
          <div className={`p-3 rounded-lg border ${getHealthBg(projectHealth.coHealth)}`}>
            <div className="flex items-center gap-2 mb-1">
              {projectHealth.coImpact >= 0 ? (
                <TrendingUp size={14} className={getHealthColor(projectHealth.coHealth)} />
              ) : (
                <TrendingDown size={14} className={getHealthColor(projectHealth.coHealth)} />
              )}
              <span className="text-xs text-zinc-400">CO Impact</span>
            </div>
            <p className={`text-lg font-bold ${getHealthColor(projectHealth.coHealth)}`}>
              ${Math.abs(projectHealth.coImpact / 1000).toFixed(0)}K
            </p>
          </div>

          {/* Status Badge */}
          <div className="p-3 rounded-lg border border-zinc-700 bg-zinc-800/50">
            <div className="flex items-center gap-2 mb-1">
              <Target size={14} className="text-zinc-400" />
              <span className="text-xs text-zinc-400">Status</span>
            </div>
            <Badge variant="outline" className={`mt-1 ${getHealthBg(projectHealth.scheduleHealth)}`}>
              {project.status || 'N/A'}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}