import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Building2, DollarSign, FileText, MessageSquareWarning, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';

export default function DashboardKPIs({ projects, financials, drawings, rfis, tasks, expenses = [] }) {
  const activeProjects = projects.filter(p => 
    p.status === 'in_progress' || p.status === 'awarded'
  ).length;

  const totalBudget = financials.reduce((sum, f) => sum + (Number(f.budget_amount) || 0), 0);
  const totalCommitted = financials.reduce((sum, f) => sum + (Number(f.committed_amount) || 0), 0);
  const actualFromFinancials = financials.reduce((sum, f) => sum + (Number(f.actual_amount) || 0), 0);
  
  // Add expenses to actual
  const actualFromExpenses = expenses
    .filter(e => e.payment_status === 'paid' || e.payment_status === 'approved')
    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  
  const totalActual = actualFromFinancials + actualFromExpenses;
  const remaining = totalBudget - totalActual;
  const variancePercent = totalBudget > 0 ? ((remaining / totalBudget) * 100) : 0;

  const pendingDrawings = drawings.filter(d => d.status !== 'FFF' && d.status !== 'As-Built').length;
  
  const overdueDrawings = drawings.filter(d => {
    if (d.status === 'FFF' || d.status === 'As-Built') return false;
    if (!d.due_date) return false;
    return new Date(d.due_date) < new Date();
  }).length;

  const openRFIs = rfis.filter(r => r.status !== 'closed' && r.status !== 'answered').length;
  
  const overdueRFIs = rfis.filter(r => {
    if (r.status === 'closed' || r.status === 'answered') return false;
    if (!r.due_date) return false;
    return new Date(r.due_date) < new Date();
  }).length;

  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const totalTasks = tasks.length;
  const taskCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const kpis = [
    {
      title: 'Active Projects',
      value: activeProjects,
      icon: Building2,
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/20',
    },
    {
      title: 'Remaining Budget',
      value: `$${Math.abs(remaining).toLocaleString()}`,
      subtitle: `${Math.abs(variancePercent).toFixed(1)}% ${remaining >= 0 ? 'remaining' : 'over'}`,
      icon: remaining >= 0 ? TrendingUp : TrendingDown,
      color: remaining >= 0 ? 'text-green-400' : 'text-red-400',
      bgColor: remaining >= 0 ? 'bg-green-500/20' : 'bg-red-500/20',
    },
    {
      title: 'Pending Drawings',
      value: pendingDrawings,
      subtitle: overdueDrawings > 0 ? `${overdueDrawings} overdue` : null,
      icon: FileText,
      color: overdueDrawings > 0 ? 'text-red-400' : 'text-blue-400',
      bgColor: overdueDrawings > 0 ? 'bg-red-500/20' : 'bg-blue-500/20',
    },
    {
      title: 'Open RFIs',
      value: openRFIs,
      subtitle: overdueRFIs > 0 ? `${overdueRFIs} overdue` : null,
      icon: MessageSquareWarning,
      color: overdueRFIs > 0 ? 'text-red-400' : 'text-purple-400',
      bgColor: overdueRFIs > 0 ? 'bg-red-500/20' : 'bg-purple-500/20',
    },
    {
      title: 'Task Completion',
      value: `${taskCompletionRate}%`,
      subtitle: `${completedTasks} of ${totalTasks}`,
      icon: TrendingUp,
      color: 'text-green-400',
      bgColor: 'bg-green-500/20',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {kpis.map((kpi, idx) => {
        const Icon = kpi.icon;
        return (
          <Card key={idx} className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <p className="text-sm text-zinc-400">{kpi.title}</p>
                <div className={`p-2 rounded ${kpi.bgColor}`}>
                  <Icon size={16} className={kpi.color} />
                </div>
              </div>
              <div>
                <p className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</p>
                {kpi.subtitle && (
                  <p className="text-xs text-zinc-500 mt-1">{kpi.subtitle}</p>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}