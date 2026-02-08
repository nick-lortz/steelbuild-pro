import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { apiClient } from '@/api/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, FileText, MessageSquare, DollarSign, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function QuickMetricsWidget({ projectId, metric = 'drawings' }) {
  const { data: drawingSets = [] } = useQuery({
    queryKey: ['drawing-sets-metrics', projectId],
    queryFn: () => apiClient.entities.DrawingSet.filter({ project_id: projectId }),
    enabled: !!projectId && metric === 'drawings'
  });

  const { data: rfis = [] } = useQuery({
    queryKey: ['rfis-metrics', projectId],
    queryFn: () => apiClient.entities.RFI.filter({ project_id: projectId }),
    enabled: !!projectId && metric === 'rfis'
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ['expenses-metrics', projectId],
    queryFn: () => apiClient.entities.Expense.filter({ project_id: projectId }),
    enabled: !!projectId && metric === 'costs'
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks-metrics', projectId],
    queryFn: () => apiClient.entities.Task.filter({ project_id: projectId }),
    enabled: !!projectId && metric === 'tasks'
  });

  const metricData = useMemo(() => {
    switch (metric) {
      case 'drawings': {
        const total = drawingSets.length;
        const fff = drawingSets.filter(ds => ds.status === 'FFF').length;
        const percentComplete = total > 0 ? Math.round((fff / total) * 100) : 0;
        return {
          icon: FileText,
          label: 'Drawing Sets',
          value: `${fff}/${total}`,
          subtitle: `${percentComplete}% FFF`,
          trend: percentComplete >= 75 ? 'up' : percentComplete >= 50 ? 'neutral' : 'down'
        };
      }
      case 'rfis': {
        const total = rfis.length;
        const open = rfis.filter(r => r.status !== 'closed' && r.status !== 'answered').length;
        const answered = rfis.filter(r => r.status === 'answered').length;
        return {
          icon: MessageSquare,
          label: 'RFIs',
          value: open,
          subtitle: `${answered} answered`,
          trend: open <= 5 ? 'up' : open <= 10 ? 'neutral' : 'down'
        };
      }
      case 'costs': {
        const total = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
        return {
          icon: DollarSign,
          label: 'Total Costs',
          value: `$${(total / 1000).toFixed(0)}k`,
          subtitle: `${expenses.length} expenses`,
          trend: 'neutral'
        };
      }
      case 'tasks': {
        const total = tasks.length;
        const complete = tasks.filter(t => t.status === 'complete').length;
        const percentComplete = total > 0 ? Math.round((complete / total) * 100) : 0;
        return {
          icon: Calendar,
          label: 'Tasks',
          value: `${complete}/${total}`,
          subtitle: `${percentComplete}% complete`,
          trend: percentComplete >= 75 ? 'up' : percentComplete >= 50 ? 'neutral' : 'down'
        };
      }
      default:
        return { icon: FileText, label: 'Metric', value: '-', subtitle: '', trend: 'neutral' };
    }
  }, [metric, drawingSets, rfis, expenses, tasks]);

  const Icon = metricData.icon;
  const TrendIcon = metricData.trend === 'up' ? TrendingUp : metricData.trend === 'down' ? TrendingDown : null;

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader className="pb-3">
        <CardTitle className="text-xs text-zinc-400 uppercase tracking-widest font-bold flex items-center gap-2">
          <Icon size={14} />
          {metricData.label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-end justify-between">
          <div>
            <div className="text-3xl font-bold font-mono text-white mb-1">
              {metricData.value}
            </div>
            <div className="text-xs text-zinc-600">{metricData.subtitle}</div>
          </div>
          {TrendIcon && (
            <TrendIcon
              size={24}
              className={cn(
                metricData.trend === 'up' && 'text-green-500',
                metricData.trend === 'down' && 'text-red-500'
              )}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}