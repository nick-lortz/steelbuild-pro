import React from 'react';
import { Card } from "@/components/ui/card";
import { Building2, AlertTriangle, Clock, CheckCircle2, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function PortfolioKPIs({ metrics }) {
  const kpis = [
    {
      label: 'Total Projects',
      value: metrics.totalProjects,
      subtext: `${metrics.activeProjects} active`,
      icon: Building2,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10'
    },
    {
      label: 'At Risk',
      value: metrics.atRiskProjects,
      subtext: metrics.atRiskProjects > 0 ? 'need attention' : 'all healthy',
      icon: AlertTriangle,
      color: metrics.atRiskProjects > 0 ? 'text-red-400' : 'text-green-400',
      bg: metrics.atRiskProjects > 0 ? 'bg-red-500/10' : 'bg-green-500/10',
      trend: metrics.riskTrend
    },
    {
      label: 'Overdue Tasks',
      value: metrics.overdueTasks,
      subtext: `${metrics.totalTasks} total tasks`,
      icon: Clock,
      color: metrics.overdueTasks > 0 ? 'text-amber-400' : 'text-zinc-500',
      bg: metrics.overdueTasks > 0 ? 'bg-amber-500/10' : 'bg-zinc-500/10'
    },
    {
      label: 'Milestones (30d)',
      value: metrics.upcomingMilestones,
      subtext: 'upcoming',
      icon: CheckCircle2,
      color: 'text-purple-400',
      bg: 'bg-purple-500/10'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {kpis.map((kpi, idx) => (
        <Card key={idx} className="bg-card border-border hover:border-amber-500/50 transition-colors">
          <div className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-2">
                  {kpi.label}
                </p>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-3xl font-bold text-foreground">{kpi.value}</span>
                  {kpi.trend !== undefined && (
                    <span className={cn("text-xs flex items-center gap-0.5", kpi.trend > 0 ? "text-red-400" : "text-green-400")}>
                      {kpi.trend > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                      {Math.abs(kpi.trend)}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{kpi.subtext}</p>
              </div>
              <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", kpi.bg)}>
                <kpi.icon className={cn("w-5 h-5", kpi.color)} />
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}