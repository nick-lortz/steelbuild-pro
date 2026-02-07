import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, 
  TrendingDown,
  DollarSign, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Truck,
  Wrench,
  Users,
  FileText,
  Calendar,
  Package
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function RoleBasedKPIs({ role, metrics, projects }) {
  // Executive KPIs
  const executiveKPIs = [
    {
      label: 'Portfolio Value',
      value: `$${((metrics.totalContractValue || 0) / 1000000).toFixed(1)}M`,
      icon: Package,
      subtitle: `${metrics.activeProjects || 0} active`,
      color: 'bg-blue-500'
    },
    {
      label: 'Active Projects',
      value: metrics.activeProjects || 0,
      icon: Package,
      subtitle: `${metrics.totalProjects} total`,
      color: 'bg-blue-500'
    },
    {
      label: 'At Risk',
      value: metrics.atRiskProjects || 0,
      icon: AlertTriangle,
      subtitle: `${metrics.totalProjects > 0 ? (((metrics.atRiskProjects || 0) / metrics.totalProjects) * 100).toFixed(0) : 0}% of portfolio`,
      color: metrics.atRiskProjects > 0 ? 'bg-red-500' : 'bg-green-500'
    },
    {
      label: 'Budget Performance',
      value: `${(metrics.avgBudgetVariance || 0) >= 0 ? '+' : ''}${(metrics.avgBudgetVariance || 0).toFixed(1)}%`,
      icon: DollarSign,
      subtitle: (metrics.totalBudget || 0) > 0 
        ? `$${((metrics.totalActual || 0) / 1000).toFixed(0)}K / $${((metrics.totalBudget || 0) / 1000).toFixed(0)}K` 
        : 'No data',
      color: (metrics.avgBudgetVariance || 0) > 10 ? 'bg-red-500' : 
             (metrics.avgBudgetVariance || 0) > 0 ? 'bg-amber-500' : 
             (metrics.avgBudgetVariance || 0) === 0 ? 'bg-zinc-700' : 'bg-green-500'
    },
    {
      label: 'Schedule Performance',
      value: `${Math.round(metrics.avgScheduleProgress || 0)}%`,
      icon: Calendar,
      subtitle: 'Avg completion',
      color: (metrics.avgScheduleProgress || 0) < 50 ? 'bg-red-500' : 
             (metrics.avgScheduleProgress || 0) < 80 ? 'bg-amber-500' : 'bg-green-500'
    },
    {
      label: 'Critical Issues',
      value: metrics.criticalIssues || 0,
      icon: AlertTriangle,
      subtitle: 'Require attention',
      color: metrics.criticalIssues > 0 ? 'bg-red-500' : 'bg-zinc-700'
    }
  ];

  // PM KPIs
  const pmKPIs = [
    {
      label: 'My Projects',
      value: metrics.myActiveProjects || 0,
      icon: Package,
      color: 'bg-blue-500'
    },
    {
      label: 'Tasks Due This Week',
      value: metrics.tasksThisWeek || 0,
      icon: Clock,
      color: 'bg-amber-500'
    },
    {
      label: 'Open RFIs',
      value: metrics.openRFIs || 0,
      icon: FileText,
      subtitle: `${metrics.overdueRFIs || 0} overdue`,
      color: metrics.overdueRFIs > 0 ? 'bg-red-500' : 'bg-blue-500'
    },
    {
      label: 'Pending Approvals',
      value: metrics.pendingApprovals || 0,
      icon: CheckCircle2,
      color: 'bg-purple-500'
    },
    {
      label: 'Budget Variance',
      value: `${metrics.myBudgetVariance > 0 ? '+' : ''}${metrics.myBudgetVariance?.toFixed(1) || 0}%`,
      icon: DollarSign,
      color: Math.abs(metrics.myBudgetVariance || 0) > 10 ? 'bg-red-500' : 'bg-green-500'
    },
    {
      label: 'Deliveries This Week',
      value: metrics.deliveriesThisWeek || 0,
      icon: Truck,
      color: 'bg-amber-500'
    }
  ];

  // Field Team KPIs
  const fieldKPIs = [
    {
      label: "Today's Tasks",
      value: metrics.tasksToday || 0,
      icon: CheckCircle2,
      subtitle: `${metrics.completedToday || 0} done`,
      color: 'bg-green-500'
    },
    {
      label: 'Crew Assignments',
      value: metrics.activeCrews || 0,
      icon: Users,
      color: 'bg-blue-500'
    },
    {
      label: 'Equipment Active',
      value: metrics.activeEquipment || 0,
      icon: Wrench,
      subtitle: `${metrics.totalEquipment || 0} total`,
      color: 'bg-purple-500'
    },
    {
      label: 'Material On Site',
      value: `${metrics.materialReadiness?.toFixed(0) || 0}%`,
      icon: Package,
      color: 'bg-amber-500'
    },
    {
      label: 'Safety Incidents',
      value: metrics.safetyIncidentsWeek || 0,
      icon: AlertTriangle,
      subtitle: 'This week',
      color: metrics.safetyIncidentsWeek > 0 ? 'bg-red-500' : 'bg-green-500'
    },
    {
      label: 'Hours Logged',
      value: metrics.hoursThisWeek || 0,
      icon: Clock,
      subtitle: 'This week',
      color: 'bg-blue-500'
    }
  ];

  const kpisToShow = role === 'admin' ? executiveKPIs : role === 'user' ? pmKPIs : fieldKPIs;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {kpisToShow.map((kpi, idx) => {
        const Icon = kpi.icon;
        return (
          <Card key={idx} className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-3">
              <div className="flex items-start justify-between mb-2">
                <div className={cn("w-8 h-8 rounded flex items-center justify-center", kpi.color)}>
                  <Icon size={14} className="text-black" />
                </div>
                {kpi.trend && (
                  <div className="flex items-center gap-0.5">
                    {kpi.trend === 'up' ? (
                      <TrendingUp size={10} className="text-green-400" />
                    ) : (
                      <TrendingDown size={10} className="text-red-400" />
                    )}
                    <span className={cn(
                      "text-[9px] font-bold",
                      kpi.trend === 'up' ? "text-green-400" : "text-red-400"
                    )}>
                      {kpi.trendValue}
                    </span>
                  </div>
                )}
              </div>
              <div className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold mb-1">
                {kpi.label}
              </div>
              <div className="text-xl font-black text-white">{kpi.value}</div>
              {kpi.subtitle && (
                <div className="text-[9px] text-zinc-600 mt-1">{kpi.subtitle}</div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}