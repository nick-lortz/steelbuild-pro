import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, AlertCircle, TrendingUp, DollarSign } from 'lucide-react';

export default function BudgetAlerts({ 
  workPackages = [], 
  tasks = [],
  expenses = [],
  threshold = 90 // Alert when budget utilization exceeds this %
}) {
  const alerts = useMemo(() => {
    const findings = [];

    workPackages.forEach(wp => {
      const wpTasks = tasks.filter(t => t.work_package_id === wp.id);
      const budget = wp.budget_at_award || 0;
      
      if (budget === 0) {
        findings.push({
          severity: 'info',
          type: 'no_budget',
          package: wp,
          message: `No budget set for ${wp.wpid} - ${wp.title}`
        });
        return;
      }

      // Calculate actuals from time logs
      const actualCost = wpTasks.reduce((sum, task) => {
        const taskCost = (task.time_logs || []).reduce((logSum, log) => 
          logSum + (log.hours * 50), 0 // TODO: Get rate from cost code
        );
        return sum + taskCost;
      }, 0);

      const earnedValue = (budget || 0) * ((wp.percent_complete || 0) / 100);
      const cpi = actualCost > 0 ? (earnedValue / actualCost) : 1.0;
      const variance = (budget || 0) - actualCost;
      const percentSpent = budget > 0 ? (actualCost / budget * 100) : 0;

      // Overrun
      if (variance < 0) {
        findings.push({
          severity: 'critical',
          type: 'overrun',
          package: wp,
          message: `${wp.wpid} over budget by $${Math.abs(variance).toFixed(0)}`,
          details: { budget, actualCost, variance, cpi }
        });
      }
      // Near threshold
      else if (percentSpent >= threshold) {
        findings.push({
          severity: 'warning',
          type: 'near_limit',
          package: wp,
          message: `${wp.wpid} at ${percentSpent.toFixed(1)}% of budget`,
          details: { budget, actualCost, variance, cpi }
        });
      }

      // Poor CPI
      if (cpi < 0.8 && cpi > 0) {
        findings.push({
          severity: 'warning',
          type: 'poor_cpi',
          package: wp,
          message: `${wp.wpid} CPI at ${cpi.toFixed(2)} - inefficient cost performance`,
          details: { budget, actualCost, variance, cpi }
        });
      }

      // Forecast overrun
      const etc = cpi > 0 ? ((budget - earnedValue) / cpi) : (budget - actualCost);
      const eac = actualCost + etc;
      if (eac > budget * 1.05) {
        findings.push({
          severity: 'warning',
          type: 'forecast_overrun',
          package: wp,
          message: `${wp.wpid} forecasted to exceed budget by $${(eac - budget).toFixed(0)}`,
          details: { budget, eac, variance: budget - eac }
        });
      }
    });

    return findings.sort((a, b) => {
      const severityOrder = { critical: 0, warning: 1, info: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
  }, [workPackages, tasks, expenses, threshold]);

  if (alerts.length === 0) {
    return (
      <Card className="bg-green-950/20 border-green-500/30">
        <CardContent className="p-4 text-center">
          <div className="text-green-400 font-medium mb-1">✓ All Budgets On Track</div>
          <p className="text-xs text-zinc-400">No budget alerts at this time</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {alerts.map((alert, idx) => {
        const severityConfig = {
          critical: {
            bg: 'bg-red-950/20',
            border: 'border-red-500/30',
            icon: <AlertTriangle size={18} className="text-red-400" />,
            badgeClass: 'bg-red-500/20 text-red-400'
          },
          warning: {
            bg: 'bg-amber-950/20',
            border: 'border-amber-500/30',
            icon: <AlertCircle size={18} className="text-amber-400" />,
            badgeClass: 'bg-amber-500/20 text-amber-400'
          },
          info: {
            bg: 'bg-blue-950/20',
            border: 'border-blue-500/30',
            icon: <DollarSign size={18} className="text-blue-400" />,
            badgeClass: 'bg-blue-500/20 text-blue-400'
          }
        }[alert.severity];

        return (
          <Card key={idx} className={`${severityConfig.bg} ${severityConfig.border}`}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                {severityConfig.icon}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className={severityConfig.badgeClass}>
                      {alert.type.replace('_', ' ').toUpperCase()}
                    </Badge>
                    <span className="text-sm font-medium text-white">{alert.message}</span>
                  </div>
                  {alert.details && (
                    <div className="grid grid-cols-4 gap-3 mt-2 text-xs">
                      <div>
                        <span className="text-zinc-500">Budget:</span>
                        <div className="font-mono text-white">${alert.details.budget?.toFixed(0)}</div>
                      </div>
                      {alert.details.actualCost !== undefined && (
                        <div>
                          <span className="text-zinc-500">Actual:</span>
                          <div className="font-mono text-white">${alert.details.actualCost?.toFixed(0)}</div>
                        </div>
                      )}
                      {alert.details.variance !== undefined && (
                        <div>
                          <span className="text-zinc-500">Variance:</span>
                          <div className={`font-mono font-medium ${alert.details.variance < 0 ? 'text-red-400' : 'text-green-400'}`}>
                            ${alert.details.variance?.toFixed(0)}
                          </div>
                        </div>
                      )}
                      {alert.details.cpi !== undefined && alert.details.cpi > 0 && (
                        <div>
                          <span className="text-zinc-500">CPI:</span>
                          <div className={`font-mono font-bold ${
                            alert.details.cpi >= 1 ? 'text-green-400' :
                            alert.details.cpi >= 0.9 ? 'text-amber-400' :
                            'text-red-400'
                          }`}>
                            {alert.details.cpi?.toFixed(2)}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}