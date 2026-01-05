import React, { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Lock, AlertCircle, TrendingDown, Clock, DollarSign, Users, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export default function ProjectRiskDashboard({ 
  projects, 
  laborBreakdowns, 
  scopeGaps, 
  tasks, 
  financials,
  expenses,
  changeOrders 
}) {
  const [selectedProject, setSelectedProject] = useState(null);

  // Build project lookup map
  const projectMap = useMemo(() => 
    new Map(projects.map(p => [p.id, p])),
    [projects]
  );

  const riskAnalysis = useMemo(() => {
    if (!projects || !Array.isArray(projects)) return [];
    
    return projects.map(project => {
      const projectLaborBreakdowns = laborBreakdowns.filter(lb => lb.project_id === project.id);
      const projectScopeGaps = scopeGaps.filter(sg => sg.project_id === project.id);
      const projectTasks = tasks.filter(t => t.project_id === project.id);
      const projectFinancials = financials.filter(f => f.project_id === project.id);
      const projectExpenses = expenses.filter(e => e.project_id === project.id);
      const projectCOs = changeOrders.filter(co => co.project_id === project.id);

      // Labor Mismatch Calculation
      const baselineShop = project.baseline_shop_hours || 0;
      const baselineField = project.baseline_field_hours || 0;
      const allocatedShop = projectLaborBreakdowns.reduce((sum, lb) => sum + (lb.shop_hours || 0), 0);
      const allocatedField = projectLaborBreakdowns.reduce((sum, lb) => sum + (lb.field_hours || 0), 0);
      
      const shopVariance = allocatedShop - baselineShop;
      const fieldVariance = allocatedField - baselineField;
      const totalVariance = shopVariance + fieldVariance;
      const variancePct = baselineShop + baselineField > 0 
        ? (totalVariance / (baselineShop + baselineField)) * 100 
        : 0;

      const laborMismatch = {
        variance: totalVariance,
        variancePct,
        shopVariance,
        fieldVariance,
        isBlocking: Math.abs(variancePct) > 15,
        severity: Math.abs(variancePct) > 15 ? 'critical' : Math.abs(variancePct) > 10 ? 'high' : 'normal'
      };

      // Open Scope Gaps
      const openGaps = projectScopeGaps.filter(sg => sg.status === 'open' || sg.status === 'priced');
      const gapExposure = openGaps.reduce((sum, sg) => sum + (sg.rough_cost || 0), 0);
      
      const scopeGapRisk = {
        count: openGaps.length,
        exposure: gapExposure,
        isBlocking: openGaps.some(sg => sg.status === 'open'),
        severity: gapExposure > 50000 ? 'critical' : gapExposure > 25000 ? 'high' : 'normal'
      };

      // Schedule Delta
      const today = new Date();
      const targetDate = project.target_completion ? new Date(project.target_completion) : null;
      const startDate = project.start_date ? new Date(project.start_date) : null;
      
      const completedTasks = projectTasks.filter(t => t.status === 'completed').length;
      const totalTasks = projectTasks.length;
      const progressPct = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
      
      let scheduleDelta = null;
      let daysVariance = 0;
      if (startDate && targetDate) {
        const totalDuration = Math.ceil((targetDate - startDate) / (1000 * 60 * 60 * 24));
        const elapsed = Math.ceil((today - startDate) / (1000 * 60 * 60 * 24));
        const expectedProgress = totalDuration > 0 ? (elapsed / totalDuration) * 100 : 0;
        const variance = progressPct - expectedProgress;
        daysVariance = totalDuration > 0 ? Math.round((variance / 100) * totalDuration) : 0;
        
        scheduleDelta = {
          variance,
          daysVariance,
          expectedProgress,
          actualProgress: progressPct,
          isBlocking: variance < -15,
          severity: variance < -15 ? 'critical' : variance < -10 ? 'high' : 'normal'
        };
      }

      // Financial Overrun
      const budgetTotal = projectFinancials.reduce((sum, f) => sum + (f.budget_amount || 0), 0);
      const actualTotal = projectFinancials.reduce((sum, f) => sum + (f.actual_amount || 0), 0);
      const expenseTotal = projectExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
      const coImpact = projectCOs.filter(co => co.status === 'approved').reduce((sum, co) => sum + (co.cost_impact || 0), 0);
      
      const totalSpend = actualTotal + expenseTotal;
      const adjustedBudget = budgetTotal + coImpact;
      const overrun = totalSpend - adjustedBudget;
      const overrunPct = adjustedBudget > 0 ? (overrun / adjustedBudget) * 100 : 0;

      const financialRisk = {
        overrun,
        overrunPct,
        totalSpend,
        adjustedBudget,
        isBlocking: overrunPct > 10,
        severity: overrunPct > 10 ? 'critical' : overrunPct > 5 ? 'high' : 'normal'
      };

      // Overall Blocking Status
      const blockingIssues = [];
      if (laborMismatch.isBlocking) blockingIssues.push('Labor Mismatch');
      if (scopeGapRisk.isBlocking) blockingIssues.push('Open Scope Gaps');
      if (scheduleDelta?.isBlocking) blockingIssues.push('Schedule Variance');
      if (financialRisk.isBlocking) blockingIssues.push('Budget Overrun');

      const isBlocked = blockingIssues.length > 0;
      const criticalCount = [laborMismatch, scopeGapRisk, scheduleDelta, financialRisk]
        .filter(r => r?.severity === 'critical').length;

      return {
        project,
        laborMismatch,
        scopeGapRisk,
        scheduleDelta,
        financialRisk,
        isBlocked,
        blockingIssues,
        criticalCount,
        totalExposure: gapExposure + Math.max(0, overrun)
      };
    });
  }, [projects, laborBreakdowns, scopeGaps, tasks, financials, expenses, changeOrders]);

  const executiveSummary = useMemo(() => {
    const blocked = riskAnalysis.filter(r => r.isBlocked).length;
    const critical = riskAnalysis.filter(r => r.criticalCount > 0).length;
    const totalExposure = riskAnalysis.reduce((sum, r) => sum + r.totalExposure, 0);
    const avgScheduleVariance = riskAnalysis
      .filter(r => r.scheduleDelta)
      .reduce((sum, r) => sum + r.scheduleDelta.daysVariance, 0) / 
      riskAnalysis.filter(r => r.scheduleDelta).length || 0;

    return { blocked, critical, totalExposure, avgScheduleVariance };
  }, [riskAnalysis]);

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'high': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      default: return 'bg-green-500/20 text-green-400 border-green-500/30';
    }
  };

  return (
    <div className="space-y-6">
      {/* Executive Summary */}
      <Card className="bg-zinc-900 border-zinc-800 p-6">
        <h2 className="text-xl font-bold text-white mb-4">Executive Risk Summary</h2>
        <div className="grid grid-cols-4 gap-4">
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Lock size={18} className="text-red-400" />
              <span className="text-sm text-zinc-400">Blocked Projects</span>
            </div>
            <p className="text-3xl font-bold text-red-400">{executiveSummary.blocked}</p>
            <p className="text-xs text-zinc-500 mt-1">Require immediate action</p>
          </div>
          
          <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle size={18} className="text-amber-400" />
              <span className="text-sm text-zinc-400">Critical Issues</span>
            </div>
            <p className="text-3xl font-bold text-amber-400">{executiveSummary.critical}</p>
            <p className="text-xs text-zinc-500 mt-1">Projects with critical risks</p>
          </div>
          
          <div className="p-4 bg-zinc-800 border border-zinc-700 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign size={18} className="text-zinc-400" />
              <span className="text-sm text-zinc-400">Total Exposure</span>
            </div>
            <p className="text-3xl font-bold text-white">
              ${(executiveSummary.totalExposure / 1000).toFixed(0)}k
            </p>
            <p className="text-xs text-zinc-500 mt-1">Unresolved financial risk</p>
          </div>
          
          <div className="p-4 bg-zinc-800 border border-zinc-700 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Clock size={18} className="text-zinc-400" />
              <span className="text-sm text-zinc-400">Schedule Variance</span>
            </div>
            <p className="text-3xl font-bold text-white">
              {executiveSummary.avgScheduleVariance.toFixed(0)}d
            </p>
            <p className="text-xs text-zinc-500 mt-1">Average across portfolio</p>
          </div>
        </div>
      </Card>

      {/* Project Risk Cards */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white">Project-Level Risk Enforcement</h3>
        {riskAnalysis.length === 0 ? (
          <div className="text-center py-8 text-zinc-500">
            No projects available for risk analysis
          </div>
        ) : riskAnalysis.map((analysis) => {
          const { project, isBlocked, blockingIssues, laborMismatch, scopeGapRisk, scheduleDelta, financialRisk } = analysis;
          
          return (
            <Card 
              key={project.id} 
              className={cn(
                "bg-zinc-900 border-zinc-800 p-5",
                isBlocked && "border-red-500/50 border-2"
              )}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="text-lg font-bold text-white">{project.name}</h4>
                    {isBlocked && (
                      <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                        <Lock size={12} className="mr-1" />
                        BLOCKED
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-zinc-500">{project.project_number} • {project.client}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedProject(selectedProject === project.id ? null : project.id)}
                  className="border-zinc-700"
                >
                  {selectedProject === project.id ? 'Hide Details' : 'View Details'}
                </Button>
              </div>

              {/* Blocking Issues Alert */}
              {isBlocked && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle size={18} className="text-red-400 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-red-400">
                        You cannot proceed until the following are reconciled:
                      </p>
                      <ul className="mt-2 space-y-1">
                        {blockingIssues.map((issue, idx) => (
                          <li key={idx} className="text-sm text-zinc-300">• {issue}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Risk Grid */}
              <div className="grid grid-cols-4 gap-3">
                {/* Labor Mismatch */}
                <div className={cn(
                  "p-3 rounded-lg border",
                  getSeverityColor(laborMismatch.severity)
                )}>
                  <div className="flex items-center gap-2 mb-2">
                    <Users size={14} />
                    <span className="text-xs font-medium">Labor Mismatch</span>
                  </div>
                  <p className="text-xl font-bold">
                    {laborMismatch.variancePct > 0 ? '+' : ''}{laborMismatch.variancePct.toFixed(1)}%
                  </p>
                  <p className="text-xs opacity-80 mt-1">
                    {laborMismatch.variance > 0 ? '+' : ''}{laborMismatch.variance.toFixed(0)}h variance
                  </p>
                </div>

                {/* Scope Gaps */}
                <div className={cn(
                  "p-3 rounded-lg border",
                  getSeverityColor(scopeGapRisk.severity)
                )}>
                  <div className="flex items-center gap-2 mb-2">
                    <FileText size={14} />
                    <span className="text-xs font-medium">Open Scope Gaps</span>
                  </div>
                  <p className="text-xl font-bold">{scopeGapRisk.count}</p>
                  <p className="text-xs opacity-80 mt-1">
                    ${(scopeGapRisk.exposure / 1000).toFixed(0)}k exposure
                  </p>
                </div>

                {/* Schedule Delta */}
                {scheduleDelta && (
                  <div className={cn(
                    "p-3 rounded-lg border",
                    getSeverityColor(scheduleDelta.severity)
                  )}>
                    <div className="flex items-center gap-2 mb-2">
                      <Clock size={14} />
                      <span className="text-xs font-medium">Schedule Delta</span>
                    </div>
                    <p className="text-xl font-bold">
                      {scheduleDelta.daysVariance > 0 ? '+' : ''}{scheduleDelta.daysVariance}d
                    </p>
                    <p className="text-xs opacity-80 mt-1">
                      {scheduleDelta.variance.toFixed(1)}% variance
                    </p>
                  </div>
                )}

                {/* Financial Overrun */}
                <div className={cn(
                  "p-3 rounded-lg border",
                  getSeverityColor(financialRisk.severity)
                )}>
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign size={14} />
                    <span className="text-xs font-medium">Budget Status</span>
                  </div>
                  <p className="text-xl font-bold">
                    {financialRisk.overrunPct > 0 ? '+' : ''}{financialRisk.overrunPct.toFixed(1)}%
                  </p>
                  <p className="text-xs opacity-80 mt-1">
                    ${(financialRisk.overrun / 1000).toFixed(0)}k {financialRisk.overrun > 0 ? 'over' : 'under'}
                  </p>
                </div>
              </div>

              {/* Detailed Breakdown */}
              {selectedProject === project.id && (
                <div className="mt-4 pt-4 border-t border-zinc-800 space-y-3">
                  {/* Labor Details */}
                  <div className="p-3 bg-zinc-800/50 rounded">
                    <h5 className="text-sm font-medium text-white mb-2">Labor Breakdown</h5>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-zinc-500">Baseline Shop:</span>
                        <span className="text-white ml-2">{project.baseline_shop_hours || 0}h</span>
                      </div>
                      <div>
                        <span className="text-zinc-500">Allocated Shop:</span>
                        <span className="text-white ml-2">
                          {laborBreakdowns.filter(lb => lb.project_id === project.id)
                            .reduce((sum, lb) => sum + (lb.shop_hours || 0), 0)}h
                        </span>
                      </div>
                      <div>
                        <span className="text-zinc-500">Baseline Field:</span>
                        <span className="text-white ml-2">{project.baseline_field_hours || 0}h</span>
                      </div>
                      <div>
                        <span className="text-zinc-500">Allocated Field:</span>
                        <span className="text-white ml-2">
                          {laborBreakdowns.filter(lb => lb.project_id === project.id)
                            .reduce((sum, lb) => sum + (lb.field_hours || 0), 0)}h
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Audit Trail Preview */}
                  <div className="p-3 bg-zinc-800/50 rounded">
                    <h5 className="text-sm font-medium text-white mb-2">Recent Activity</h5>
                    <div className="space-y-1 text-xs text-zinc-400">
                      <p>• Last labor update: {format(new Date(project.updated_date), 'MMM d, h:mm a')} by {project.created_by}</p>
                      <p>• Project modified: {format(new Date(project.updated_date), 'MMM d, yyyy')}</p>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}