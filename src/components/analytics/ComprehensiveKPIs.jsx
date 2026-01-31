import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Clock, MessageSquare, FileEdit, DollarSign, Activity } from 'lucide-react';
import { differenceInDays, parseISO } from 'date-fns';

export default function ComprehensiveKPIs({ projects, rfis, changeOrders, expenses, tasks, laborHours, dateRange }) {
  const kpis = useMemo(() => {
    const filteredProjects = projects.filter(p => {
      if (!dateRange?.start || !dateRange?.end) return true;
      const projectStart = p.start_date ? parseISO(p.start_date) : null;
      return projectStart && projectStart >= parseISO(dateRange.start) && projectStart <= parseISO(dateRange.end);
    });

    const filteredRFIs = rfis.filter(rfi => {
      if (!filteredProjects.some(p => p.id === rfi.project_id)) return false;
      return true;
    });

    const filteredCOs = changeOrders.filter(co => {
      if (!filteredProjects.some(p => p.id === co.project_id)) return false;
      return true;
    });

    // Baseline Hours vs Actual
    const totalBaseline = filteredProjects.reduce((sum, p) => 
      sum + (p.baseline_shop_hours || 0) + (p.baseline_field_hours || 0), 0
    );
    
    const totalActualHours = tasks
      .filter(t => filteredProjects.some(p => p.id === t.project_id))
      .reduce((sum, t) => sum + (t.actual_hours || 0), 0);
    
    const hoursVariance = totalBaseline > 0 ? ((totalBaseline - totalActualHours) / totalBaseline) * 100 : 0;

    // RFI Turnaround Time
    const answeredRFIs = filteredRFIs.filter(rfi => rfi.status === 'answered' && rfi.submitted_date && rfi.response_date);
    const avgTurnaround = answeredRFIs.length > 0
      ? answeredRFIs.reduce((sum, rfi) => {
          const days = differenceInDays(parseISO(rfi.response_date), parseISO(rfi.submitted_date));
          return sum + days;
        }, 0) / answeredRFIs.length
      : 0;

    const overdueFIs = filteredRFIs.filter(rfi => {
      if (!rfi.due_date || rfi.status === 'answered' || rfi.status === 'closed') return false;
      return parseISO(rfi.due_date) < new Date();
    }).length;

    // Change Order Impact
    const totalCOImpact = filteredCOs.reduce((sum, co) => sum + (co.cost_impact || 0), 0);
    const approvedCOs = filteredCOs.filter(co => co.status === 'approved').length;
    const avgCOScheduleImpact = filteredCOs.length > 0
      ? filteredCOs.reduce((sum, co) => sum + (co.schedule_impact_days || 0), 0) / filteredCOs.length
      : 0;

    // Budget Performance
    const totalBudget = filteredProjects.reduce((sum, p) => sum + (p.contract_value || 0), 0);
    const totalActualCost = expenses
      .filter(e => filteredProjects.some(p => p.id === e.project_id))
      .reduce((sum, e) => sum + (e.amount || 0), 0);
    const budgetVariance = totalBudget > 0 ? ((totalBudget - totalActualCost) / totalBudget) * 100 : 0;

    // Productivity Metrics
    const laborCost = expenses
      .filter(e => filteredProjects.some(p => p.id === e.project_id) && e.category === 'labor')
      .reduce((sum, e) => sum + (e.amount || 0), 0);
    const costPerHour = totalActualHours > 0 ? laborCost / totalActualHours : 0;

    return {
      baselineHours: totalBaseline,
      actualHours: totalActualHours,
      hoursVariance,
      avgRFITurnaround: avgTurnaround,
      overdueRFIs: overdueFIs,
      totalRFIs: filteredRFIs.length,
      totalCOImpact,
      approvedCOs,
      totalCOs: filteredCOs.length,
      avgCOScheduleImpact,
      budgetVariance,
      totalBudget,
      totalActualCost,
      costPerHour,
      activeProjects: filteredProjects.filter(p => p.status === 'in_progress').length
    };
  }, [projects, rfis, changeOrders, expenses, tasks, laborHours, dateRange]);

  const kpiCards = [
    {
      icon: Activity,
      label: 'Baseline vs Actual Hours',
      value: `${kpis.actualHours.toLocaleString()} / ${kpis.baselineHours.toLocaleString()}`,
      subValue: `${kpis.hoursVariance >= 0 ? '+' : ''}${kpis.hoursVariance.toFixed(1)}%`,
      status: kpis.hoursVariance >= 0 ? 'good' : 'bad',
      iconColor: 'text-purple-500'
    },
    {
      icon: MessageSquare,
      label: 'RFI Avg Turnaround',
      value: `${kpis.avgRFITurnaround.toFixed(1)} days`,
      subValue: `${kpis.overdueRFIs} overdue / ${kpis.totalRFIs} total`,
      status: kpis.avgRFITurnaround <= 7 ? 'good' : 'warning',
      iconColor: 'text-blue-500'
    },
    {
      icon: FileEdit,
      label: 'Change Order Impact',
      value: `$${(kpis.totalCOImpact / 1000).toFixed(0)}k`,
      subValue: `${kpis.approvedCOs} approved / ${kpis.totalCOs} total`,
      status: kpis.totalCOImpact < 0 ? 'warning' : 'neutral',
      iconColor: 'text-amber-500'
    },
    {
      icon: Clock,
      label: 'CO Schedule Impact',
      value: `${kpis.avgCOScheduleImpact.toFixed(1)} days`,
      subValue: `Avg per change order`,
      status: kpis.avgCOScheduleImpact <= 5 ? 'good' : 'warning',
      iconColor: 'text-orange-500'
    },
    {
      icon: DollarSign,
      label: 'Budget Performance',
      value: `${kpis.budgetVariance >= 0 ? '+' : ''}${kpis.budgetVariance.toFixed(1)}%`,
      subValue: `$${(kpis.totalActualCost / 1000).toFixed(0)}k / $${(kpis.totalBudget / 1000).toFixed(0)}k`,
      status: kpis.budgetVariance >= 0 ? 'good' : 'bad',
      iconColor: 'text-green-500'
    },
    {
      icon: TrendingUp,
      label: 'Labor Cost per Hour',
      value: `$${kpis.costPerHour.toFixed(2)}`,
      subValue: `Across ${kpis.activeProjects} active projects`,
      status: 'neutral',
      iconColor: 'text-cyan-500'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {kpiCards.map((kpi, idx) => {
        const Icon = kpi.icon;
        const statusColor = 
          kpi.status === 'good' ? 'text-green-400' :
          kpi.status === 'bad' ? 'text-red-400' :
          kpi.status === 'warning' ? 'text-amber-400' :
          'text-zinc-400';

        return (
          <Card key={idx} className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className={`p-2.5 bg-zinc-800 rounded-lg ${kpi.iconColor}`}>
                  <Icon size={20} />
                </div>
                {kpi.status === 'warning' && (
                  <AlertTriangle size={14} className="text-amber-500" />
                )}
              </div>
              <div className="text-xs text-zinc-400 uppercase tracking-wider mb-2">
                {kpi.label}
              </div>
              <div className={`text-2xl font-bold ${statusColor} mb-1`}>
                {kpi.value}
              </div>
              <div className="text-xs text-zinc-500">
                {kpi.subValue}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}