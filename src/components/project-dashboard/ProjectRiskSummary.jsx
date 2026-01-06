import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Clock, DollarSign, FileText, AlertCircle, TrendingDown } from 'lucide-react';
import { differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';

export default function ProjectRiskSummary({ 
  project, 
  tasks = [], 
  rfis = [], 
  changeOrders = [], 
  financials = [],
  expenses = []
}) {
  const riskMetrics = useMemo(() => {
    const today = new Date();
    
    // Overdue Tasks
    const overdueTasks = tasks.filter(t => 
      t.status !== 'completed' && 
      t.end_date && 
      new Date(t.end_date) < today
    );

    // Critical RFIs (unanswered, high priority, or overdue)
    const criticalRFIs = rfis.filter(r => 
      r.status !== 'closed' && 
      r.status !== 'answered' &&
      (r.priority === 'critical' || r.priority === 'high' || 
       (r.due_date && new Date(r.due_date) < today))
    );

    // Pending High-Value Change Orders
    const pendingCOs = changeOrders.filter(co => 
      co.status === 'pending' || co.status === 'submitted'
    );
    const coExposure = pendingCOs.reduce((sum, co) => sum + Math.abs(co.cost_impact || 0), 0);

    // Budget Analysis
    const budgetTotal = financials.reduce((sum, f) => sum + (f.budget_amount || 0), 0);
    const actualTotal = financials.reduce((sum, f) => sum + (f.actual_amount || 0), 0);
    const expenseTotal = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const approvedCOs = changeOrders
      .filter(co => co.status === 'approved')
      .reduce((sum, co) => sum + (co.cost_impact || 0), 0);
    
    const totalSpend = actualTotal + expenseTotal;
    const adjustedBudget = budgetTotal + approvedCOs;
    const budgetVariance = totalSpend - adjustedBudget;
    const budgetVariancePercent = adjustedBudget > 0 ? (budgetVariance / adjustedBudget) * 100 : 0;

    // Schedule Variance
    const allTasks = tasks.filter(t => t.start_date && t.end_date);
    const completedTasks = allTasks.filter(t => t.status === 'completed');
    const progressPercent = allTasks.length > 0 ? (completedTasks.length / allTasks.length) * 100 : 0;
    
    let scheduleVariance = 0;
    if (project.start_date && project.target_completion) {
      const totalDuration = differenceInDays(new Date(project.target_completion), new Date(project.start_date));
      const elapsed = differenceInDays(today, new Date(project.start_date));
      const expectedProgress = totalDuration > 0 ? (elapsed / totalDuration) * 100 : 0;
      scheduleVariance = progressPercent - expectedProgress;
    }

    // Overall Risk Level
    let riskScore = 0;
    if (overdueTasks.length > 5) riskScore += 3;
    else if (overdueTasks.length > 2) riskScore += 2;
    else if (overdueTasks.length > 0) riskScore += 1;
    
    if (criticalRFIs.length > 3) riskScore += 3;
    else if (criticalRFIs.length > 1) riskScore += 2;
    else if (criticalRFIs.length > 0) riskScore += 1;
    
    if (budgetVariancePercent > 10) riskScore += 3;
    else if (budgetVariancePercent > 5) riskScore += 2;
    else if (budgetVariancePercent > 0) riskScore += 1;
    
    if (scheduleVariance < -15) riskScore += 3;
    else if (scheduleVariance < -10) riskScore += 2;
    else if (scheduleVariance < -5) riskScore += 1;

    let overallRisk = 'low';
    if (riskScore >= 8) overallRisk = 'critical';
    else if (riskScore >= 5) overallRisk = 'high';
    else if (riskScore >= 3) overallRisk = 'medium';

    return {
      overdueTasks: overdueTasks.length,
      criticalRFIs: criticalRFIs.length,
      pendingCOs: pendingCOs.length,
      coExposure,
      budgetVariance,
      budgetVariancePercent,
      scheduleVariance,
      overallRisk,
      riskScore
    };
  }, [project, tasks, rfis, changeOrders, financials, expenses]);

  const getRiskColor = (risk) => {
    switch (risk) {
      case 'critical': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'high': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'medium': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      default: return 'bg-green-500/20 text-green-400 border-green-500/30';
    }
  };

  const riskIndicators = [
    {
      label: 'Overdue Tasks',
      value: riskMetrics.overdueTasks,
      icon: Clock,
      color: riskMetrics.overdueTasks > 5 ? 'text-red-400' : riskMetrics.overdueTasks > 0 ? 'text-amber-400' : 'text-green-400',
      critical: riskMetrics.overdueTasks > 5
    },
    {
      label: 'Critical RFIs',
      value: riskMetrics.criticalRFIs,
      icon: FileText,
      color: riskMetrics.criticalRFIs > 3 ? 'text-red-400' : riskMetrics.criticalRFIs > 0 ? 'text-amber-400' : 'text-green-400',
      critical: riskMetrics.criticalRFIs > 3
    },
    {
      label: 'Budget Variance',
      value: `${riskMetrics.budgetVariancePercent > 0 ? '+' : ''}${riskMetrics.budgetVariancePercent.toFixed(1)}%`,
      subValue: `$${(Math.abs(riskMetrics.budgetVariance) / 1000).toFixed(0)}k`,
      icon: DollarSign,
      color: riskMetrics.budgetVariancePercent > 10 ? 'text-red-400' : riskMetrics.budgetVariancePercent > 5 ? 'text-amber-400' : 'text-green-400',
      critical: riskMetrics.budgetVariancePercent > 10
    },
    {
      label: 'Schedule Variance',
      value: `${riskMetrics.scheduleVariance > 0 ? '+' : ''}${riskMetrics.scheduleVariance.toFixed(1)}%`,
      icon: TrendingDown,
      color: riskMetrics.scheduleVariance < -15 ? 'text-red-400' : riskMetrics.scheduleVariance < -5 ? 'text-amber-400' : 'text-green-400',
      critical: riskMetrics.scheduleVariance < -15
    }
  ];

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader className="border-b border-zinc-800">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
            <AlertTriangle size={18} className="text-amber-500" />
            Risk Assessment
          </CardTitle>
          <Badge className={cn('text-sm font-semibold border', getRiskColor(riskMetrics.overallRisk))}>
            {riskMetrics.overallRisk.toUpperCase()} RISK
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="grid grid-cols-2 gap-4">
          {riskIndicators.map((indicator, idx) => {
            const Icon = indicator.icon;
            return (
              <div 
                key={idx}
                className={cn(
                  "p-4 rounded-lg border transition-all",
                  indicator.critical 
                    ? "bg-red-500/10 border-red-500/30" 
                    : "bg-zinc-800/50 border-zinc-800"
                )}
              >
                <div className="flex items-start justify-between mb-2">
                  <Icon size={18} className={indicator.color} />
                  {indicator.critical && (
                    <AlertCircle size={14} className="text-red-400" />
                  )}
                </div>
                <p className="text-2xl font-bold text-white">{indicator.value}</p>
                {indicator.subValue && (
                  <p className="text-xs text-zinc-500 mt-0.5">{indicator.subValue}</p>
                )}
                <p className="text-xs text-zinc-400 mt-1">{indicator.label}</p>
              </div>
            );
          })}
        </div>

        {/* Pending Change Order Exposure */}
        {riskMetrics.pendingCOs > 0 && (
          <div className="mt-4 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle size={16} className="text-amber-400" />
              <p className="text-sm font-medium text-amber-400">Pending Change Order Exposure</p>
            </div>
            <div className="flex items-baseline gap-2">
              <p className="text-xl font-bold text-white">${(riskMetrics.coExposure / 1000).toFixed(0)}k</p>
              <p className="text-xs text-zinc-400">across {riskMetrics.pendingCOs} pending COs</p>
            </div>
          </div>
        )}

        {/* Risk Score Breakdown */}
        <div className="mt-4 pt-4 border-t border-zinc-800">
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-400">Risk Score</span>
            <span className={cn(
              "font-semibold",
              riskMetrics.riskScore >= 8 ? "text-red-400" :
              riskMetrics.riskScore >= 5 ? "text-orange-400" :
              riskMetrics.riskScore >= 3 ? "text-amber-400" : "text-green-400"
            )}>
              {riskMetrics.riskScore}/12
            </span>
          </div>
          <div className="mt-2 h-2 bg-zinc-800 rounded-full overflow-hidden">
            <div 
              className={cn(
                "h-full transition-all",
                riskMetrics.riskScore >= 8 ? "bg-red-500" :
                riskMetrics.riskScore >= 5 ? "bg-orange-500" :
                riskMetrics.riskScore >= 3 ? "bg-amber-500" : "bg-green-500"
              )}
              style={{ width: `${(riskMetrics.riskScore / 12) * 100}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}