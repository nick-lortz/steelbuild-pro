import React from 'react';
import { Card } from "@/components/ui/card";
import { Building2, CheckCircle2, Clock, AlertTriangle, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ProjectsKPIBar({ projects, tasks, financials }) {
  const totalProjects = projects.length;
  const activeProjects = projects.filter(p => p.status === 'in_progress' || p.status === 'awarded').length;

  const today = new Date().toISOString().split('T')[0];
  const overdueTasks = tasks.filter(t => 
    t.status !== 'completed' && t.end_date && t.end_date < today
  ).length;

  const projectsWithOverdue = new Set(
    tasks.filter(t => t.status !== 'completed' && t.end_date && t.end_date < today)
      .map(t => t.project_id)
  ).size;

  const totalValue = projects.reduce((sum, p) => sum + (p.contract_value || 0), 0);

  const kpis = [
    {
      label: 'Total Projects',
      value: totalProjects,
      subtext: `${activeProjects} active`,
      icon: Building2,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10'
    },
    {
      label: 'Portfolio Value',
      value: `$${(totalValue / 1_000_000).toFixed(1)}M`,
      subtext: 'contract value',
      icon: DollarSign,
      color: 'text-green-400',
      bg: 'bg-green-500/10'
    },
    {
      label: 'Projects w/ Late Tasks',
      value: projectsWithOverdue,
      subtext: `${overdueTasks} tasks overdue`,
      icon: AlertTriangle,
      color: projectsWithOverdue > 0 ? 'text-red-400' : 'text-zinc-500',
      bg: projectsWithOverdue > 0 ? 'bg-red-500/10' : 'bg-zinc-500/10'
    },
    {
      label: 'Completed',
      value: projects.filter(p => p.status === 'completed').length,
      subtext: 'projects closed',
      icon: CheckCircle2,
      color: 'text-purple-400',
      bg: 'bg-purple-500/10'
    }
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {kpis.map((kpi, idx) => (
        <Card key={idx} className="bg-card border-border">
          <div className="p-3">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-bold mb-1.5 truncate">
                  {kpi.label}
                </p>
                <div className="flex items-baseline gap-1.5 mb-0.5">
                  <span className="text-2xl font-bold text-foreground tabular-nums">{kpi.value}</span>
                </div>
                <p className="text-[10px] text-muted-foreground truncate">{kpi.subtext}</p>
              </div>
              <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0", kpi.bg)}>
                <kpi.icon className={cn("w-4 h-4", kpi.color)} />
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}