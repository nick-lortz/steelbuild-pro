import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Lock, AlertTriangle, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function ErectionReadinessWidget({ projectId }) {
  const today = new Date();
  const lookaheadEnd = new Date(today);
  lookaheadEnd.setDate(lookaheadEnd.getDate() + 14);
  const todayStr = today.toISOString().split('T')[0];
  const lookaheadEndStr = lookaheadEnd.toISOString().split('T')[0];

  const { data = { tasks: [], constraints: [] }, isLoading } = useQuery({
    queryKey: ['erectionReadinessWidget', projectId],
    queryFn: async () => {
      const tasks = await base44.entities.Task.filter({
        project_id: projectId,
        task_type: 'ERECTION',
        planned_start: { $gte: todayStr, $lte: lookaheadEndStr }
      });

      const taskIds = tasks.map(t => t.id);
      const readiness = taskIds.length > 0
        ? await base44.entities.ErectionReadiness.filter({ 
            task_id: { $in: taskIds },
            readiness_status: { $in: ['NOT_READY', 'READY_WITH_WARNINGS'] }
          })
        : [];

      // Get top constraint types
      const constraintIds = readiness.flatMap(r => r.open_constraints || []);
      const constraints = constraintIds.length > 0
        ? await base44.entities.Constraint.filter({ 
            id: { $in: constraintIds },
            severity: 'BLOCKER'
          })
        : [];

      return { tasks, readiness, constraints };
    },
    enabled: !!projectId,
    refetchInterval: 30000
  });

  const notReadyCount = data.readiness?.filter(r => r.readiness_status === 'NOT_READY').length || 0;
  const totalBlockers = data.readiness?.reduce((sum, r) => sum + (r.blocker_count || 0), 0) || 0;

  // Top constraint types
  const constraintTypeCounts = {};
  data.constraints?.forEach(c => {
    constraintTypeCounts[c.constraint_type] = (constraintTypeCounts[c.constraint_type] || 0) + 1;
  });
  const topConstraints = Object.entries(constraintTypeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Erection Tasks Not Ready (Next 14 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-muted rounded w-3/4" />
            <div className="h-4 bg-muted rounded w-1/2" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Calendar className="w-5 h-5 text-blue-400" />
          Erection Tasks Not Ready (Next 14 Days)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-red-950/20 rounded-lg border border-red-800/40">
            <div className="flex items-center gap-2 mb-1">
              <Lock className="w-4 h-4 text-red-400" />
              <p className="text-xs text-muted-foreground">Not Ready</p>
            </div>
            <p className="text-2xl font-bold text-red-300">{notReadyCount}</p>
          </div>

          <div className="p-3 bg-amber-950/20 rounded-lg border border-amber-800/40">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <p className="text-xs text-muted-foreground">Total Blockers</p>
            </div>
            <p className="text-2xl font-bold text-amber-300">{totalBlockers}</p>
          </div>
        </div>

        {/* Top Constraint Types */}
        {topConstraints.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2">Top Constraint Types</p>
            <div className="space-y-2">
              {topConstraints.map(([type, count]) => (
                <div key={type} className="flex items-center justify-between p-2 bg-muted/20 rounded">
                  <p className="text-xs">{type.replace(/_/g, ' ')}</p>
                  <Badge variant="secondary" className="text-xs">{count}</Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* View Details Link */}
        <Link to={createPageUrl('ErectionLookahead')}>
          <Button variant="outline" size="sm" className="w-full">
            View Full Lookahead →
          </Button>
        </Link>

        {notReadyCount === 0 && totalBlockers === 0 && (
          <div className="text-center py-6">
            <CheckCircle2 className="w-10 h-10 text-green-400 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">All erection tasks ready</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}