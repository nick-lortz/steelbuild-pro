import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { apiClient } from '@/api/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { differenceInDays, parseISO, isPast } from 'date-fns';
import { cn } from '@/lib/utils';

export default function ProjectHealthWidget({ projectId }) {
  const { data: drawingSets = [] } = useQuery({
    queryKey: ['drawing-sets', projectId],
    queryFn: () => apiClient.entities.DrawingSet.filter({ project_id: projectId }),
    enabled: !!projectId
  });

  const { data: revisions = [] } = useQuery({
    queryKey: ['revisions', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const sets = await apiClient.entities.DrawingSet.filter({ project_id: projectId });
      const allRevisions = await Promise.all(
        sets.map(set => apiClient.entities.DrawingRevision.filter({ drawing_set_id: set.id }))
      );
      return allRevisions.flat();
    },
    enabled: !!projectId
  });

  const { data: rfis = [] } = useQuery({
    queryKey: ['rfis', projectId],
    queryFn: () => apiClient.entities.RFI.filter({ project_id: projectId }),
    enabled: !!projectId
  });

  const healthScore = useMemo(() => {
    if (!drawingSets.length) return { score: 100, status: 'excellent', breakdown: {} };

    let totalScore = 0;
    const weights = { drawing: 40, revision: 30, rfi: 30 };

    // Drawing Status Score (40%)
    const totalSets = drawingSets.length;
    const fffSets = drawingSets.filter(ds => ds.status === 'FFF').length;
    const overdueSets = drawingSets.filter(ds => {
      if (!ds.due_date || ds.status === 'FFF') return false;
      try {
        return isPast(parseISO(ds.due_date));
      } catch {
        return false;
      }
    }).length;
    
    const drawingScore = totalSets > 0 
      ? ((fffSets / totalSets) * 100) - (overdueSets * 10)
      : 100;
    totalScore += Math.max(0, drawingScore) * (weights.drawing / 100);

    // Revision Timeliness Score (30%)
    const avgRevisionTime = revisions.length > 0
      ? revisions.reduce((acc, rev) => {
          const set = drawingSets.find(ds => ds.id === rev.drawing_set_id);
          if (set?.ifa_date && rev.revision_date) {
            try {
              return acc + Math.abs(differenceInDays(parseISO(rev.revision_date), parseISO(set.ifa_date)));
            } catch {
              return acc;
            }
          }
          return acc;
        }, 0) / revisions.length
      : 0;
    
    const revisionScore = Math.max(0, 100 - (avgRevisionTime * 2));
    totalScore += revisionScore * (weights.revision / 100);

    // RFI Activity Score (30%)
    const openRFIs = rfis.filter(rfi => rfi.status !== 'closed' && rfi.status !== 'answered').length;
    const overdueRFIs = rfis.filter(rfi => {
      if (!rfi.due_date || rfi.status === 'closed' || rfi.status === 'answered') return false;
      try {
        return isPast(parseISO(rfi.due_date));
      } catch {
        return false;
      }
    }).length;
    
    const rfiScore = Math.max(0, 100 - (openRFIs * 5) - (overdueRFIs * 15));
    totalScore += rfiScore * (weights.rfi / 100);

    const finalScore = Math.round(Math.max(0, Math.min(100, totalScore)));
    
    let status = 'excellent';
    if (finalScore < 50) status = 'critical';
    else if (finalScore < 70) status = 'warning';
    else if (finalScore < 85) status = 'good';

    return {
      score: finalScore,
      status,
      breakdown: {
        drawing: Math.round(Math.max(0, drawingScore)),
        revision: Math.round(revisionScore),
        rfi: Math.round(rfiScore),
        metrics: {
          totalSets,
          fffSets,
          overdueSets,
          avgRevisionTime: Math.round(avgRevisionTime),
          openRFIs,
          overdueRFIs
        }
      }
    };
  }, [drawingSets, revisions, rfis]);

  const statusConfig = {
    excellent: { color: 'text-green-500', bg: 'bg-green-500', icon: CheckCircle2, label: 'Excellent' },
    good: { color: 'text-blue-500', bg: 'bg-blue-500', icon: TrendingUp, label: 'Good' },
    warning: { color: 'text-amber-500', bg: 'bg-amber-500', icon: Clock, label: 'Needs Attention' },
    critical: { color: 'text-red-500', bg: 'bg-red-500', icon: AlertTriangle, label: 'Critical' }
  };

  const config = statusConfig[healthScore.status];
  const Icon = config.icon;

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-sm">
          <span className="text-zinc-400 uppercase tracking-widest font-bold">Project Health</span>
          <Badge variant="secondary" className={cn("gap-1", config.color)}>
            <Icon size={12} />
            {config.label}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center">
          <div className="text-5xl font-bold font-mono mb-2" style={{ color: `rgb(var(--${healthScore.status}))` }}>
            {healthScore.score}
          </div>
          <Progress value={healthScore.score} className="h-2" />
        </div>

        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-zinc-800">
          <div className="text-center">
            <div className="text-xs text-zinc-500 uppercase mb-1">Drawings</div>
            <div className="text-lg font-bold text-white">{healthScore.breakdown.drawing}</div>
            <div className="text-[10px] text-zinc-600">
              {healthScore.breakdown.metrics?.fffSets}/{healthScore.breakdown.metrics?.totalSets} FFF
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs text-zinc-500 uppercase mb-1">Revisions</div>
            <div className="text-lg font-bold text-white">{healthScore.breakdown.revision}</div>
            <div className="text-[10px] text-zinc-600">
              {healthScore.breakdown.metrics?.avgRevisionTime}d avg
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs text-zinc-500 uppercase mb-1">RFIs</div>
            <div className="text-lg font-bold text-white">{healthScore.breakdown.rfi}</div>
            <div className="text-[10px] text-zinc-600">
              {healthScore.breakdown.metrics?.openRFIs} open
            </div>
          </div>
        </div>

        {(healthScore.breakdown.metrics?.overdueSets > 0 || healthScore.breakdown.metrics?.overdueRFIs > 0) && (
          <div className="pt-4 border-t border-zinc-800">
            <div className="flex items-start gap-2 text-xs text-amber-500">
              <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
              <div>
                {healthScore.breakdown.metrics.overdueSets > 0 && (
                  <div>{healthScore.breakdown.metrics.overdueSets} overdue drawing sets</div>
                )}
                {healthScore.breakdown.metrics.overdueRFIs > 0 && (
                  <div>{healthScore.breakdown.metrics.overdueRFIs} overdue RFIs</div>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}