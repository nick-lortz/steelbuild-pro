import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, TrendingUp, Clock, DollarSign } from 'lucide-react';

export default function AIAnomalyDetection({ projects, financials, tasks }) {
  const anomalies = useMemo(() => {
    const detected = [];

    projects.forEach(project => {
      const projectFinancials = financials.filter(f => f.project_id === project.id);
      const projectTasks = tasks.filter(t => t.project_id === project.id);

      // Budget anomaly detection
      const totalBudget = projectFinancials.reduce((sum, f) => sum + (f.current_budget || 0), 0);
      const totalActual = projectFinancials.reduce((sum, f) => sum + (f.actual_amount || 0), 0);
      const budgetVariance = totalBudget > 0 ? ((totalActual - totalBudget) / totalBudget) * 100 : 0;

      if (Math.abs(budgetVariance) > 15) {
        detected.push({
          project_id: project.id,
          project_name: project.name,
          type: 'budget',
          severity: Math.abs(budgetVariance) > 25 ? 'critical' : 'warning',
          message: `Budget ${budgetVariance > 0 ? 'overrun' : 'underrun'} of ${Math.abs(budgetVariance).toFixed(1)}%`,
          details: `Actual: $${(totalActual / 1000).toFixed(1)}K vs Budget: $${(totalBudget / 1000).toFixed(1)}K`,
          icon: DollarSign
        });
      }

      // Schedule anomaly detection
      const overdueTasks = projectTasks.filter(t => 
        t.status !== 'completed' && 
        new Date(t.end_date) < new Date()
      );
      
      if (overdueTasks.length > 3) {
        detected.push({
          project_id: project.id,
          project_name: project.name,
          type: 'schedule',
          severity: overdueTasks.length > 10 ? 'critical' : 'warning',
          message: `${overdueTasks.length} overdue tasks detected`,
          details: `Tasks past deadline requiring immediate attention`,
          icon: Clock
        });
      }

      // Cost trend anomaly
      const recentExpenses = projectFinancials
        .filter(f => f.updated_date && new Date(f.updated_date) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
        .reduce((sum, f) => sum + (f.actual_amount || 0), 0);
      
      const avgMonthlyBurn = totalBudget / 12;
      if (recentExpenses > avgMonthlyBurn * 1.5) {
        detected.push({
          project_id: project.id,
          project_name: project.name,
          type: 'cost_acceleration',
          severity: 'warning',
          message: `Cost acceleration detected - 50% above expected monthly burn`,
          details: `Recent spending: $${(recentExpenses / 1000).toFixed(1)}K vs Expected: $${(avgMonthlyBurn / 1000).toFixed(1)}K`,
          icon: TrendingUp
        });
      }
    });

    return detected.sort((a, b) => {
      const severityOrder = { critical: 0, warning: 1, info: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
  }, [projects, financials, tasks]);

  const severityColors = {
    critical: 'bg-red-500/20 text-red-400 border-red-500/30',
    warning: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    info: 'bg-blue-500/20 text-blue-400 border-blue-500/30'
  };

  const severityIcons = {
    critical: '🔴',
    warning: '⚠️',
    info: 'ℹ️'
  };

  return (
    <div className="space-y-6">
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">AI-Detected Anomalies</CardTitle>
            <Badge variant="outline" className="bg-amber-500/20 text-amber-400 border-amber-500/30">
              {anomalies.length} detected
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {anomalies.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle size={32} className="text-green-400" />
              </div>
              <p className="text-zinc-400">No anomalies detected</p>
              <p className="text-xs text-zinc-600 mt-1">All projects operating within normal parameters</p>
            </div>
          ) : (
            <div className="space-y-3">
              {anomalies.map((anomaly, idx) => {
                const Icon = anomaly.icon;
                return (
                  <div 
                    key={idx} 
                    className="p-4 bg-zinc-950 border border-zinc-800 rounded hover:border-zinc-700 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-zinc-900 border border-zinc-800 rounded flex items-center justify-center flex-shrink-0">
                        <Icon size={18} className={anomaly.severity === 'critical' ? 'text-red-400' : 'text-amber-400'} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-semibold text-white">{anomaly.project_name}</p>
                            <p className="text-xs text-zinc-500 mt-0.5 capitalize">{anomaly.type.replace('_', ' ')}</p>
                          </div>
                          <Badge variant="outline" className={severityColors[anomaly.severity]}>
                            {severityIcons[anomaly.severity]} {anomaly.severity}
                          </Badge>
                        </div>
                        <p className="text-sm text-zinc-300 mb-1">{anomaly.message}</p>
                        <p className="text-xs text-zinc-500">{anomaly.details}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Critical</p>
            <p className="text-2xl font-bold text-red-400">
              {anomalies.filter(a => a.severity === 'critical').length}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Warnings</p>
            <p className="text-2xl font-bold text-amber-400">
              {anomalies.filter(a => a.severity === 'warning').length}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Info</p>
            <p className="text-2xl font-bold text-blue-400">
              {anomalies.filter(a => a.severity === 'info').length}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}