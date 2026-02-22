import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, ExternalLink, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function TopBlockersPanel({ projectId }) {
  const { data: riskState, isLoading } = useQuery({
    queryKey: ['workflowRisk', projectId],
    queryFn: async () => {
      const { data } = await base44.functions.invoke('getWorkflowRiskState', { project_id: projectId });
      return data;
    },
    enabled: !!projectId,
    staleTime: 3 * 60 * 1000 // 3 minutes
  });

  const severityColors = {
    critical: 'text-red-400 bg-red-500/10 border-red-500/30',
    high: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
    medium: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
    low: 'text-blue-400 bg-blue-500/10 border-blue-500/30'
  };

  const getEntityLink = (blocker) => {
    const routes = {
      RFI: 'RFIHub',
      Task: 'Schedule',
      Delivery: 'Deliveries',
      ChangeOrder: 'ChangeOrders',
      Submittal: 'Submittals',
      Fabrication: 'Fabrication'
    };
    const page = routes[blocker.entity];
    return page ? createPageUrl(page) + `?project=${projectId}` : null;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-[#FF9D42]" />
            Top Blockers This Week
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-zinc-800/50 rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!riskState) return null;

  const topBlockers = riskState.top_blockers.slice(0, 5);

  return (
    <Card className="border-[rgba(255,157,66,0.2)]">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-[#FF9D42]" />
            Top 5 Blockers This Week
          </CardTitle>
          {riskState.at_risk_tasks.length > 0 && (
            <Badge variant="destructive">
              {riskState.at_risk_tasks.length} at-risk tasks
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {topBlockers.length === 0 ? (
          <div className="text-center py-8 text-green-400 bg-green-500/5 rounded-lg border border-green-500/20">
            <TrendingUp className="w-8 h-8 mx-auto mb-2" />
            <p className="font-semibold">No Critical Blockers</p>
            <p className="text-xs text-[#6B7280] mt-1">All workflows on track</p>
          </div>
        ) : (
          <div className="space-y-3">
            {topBlockers.map((blocker, idx) => (
              <div
                key={idx}
                className="p-4 rounded-lg border border-[rgba(255,255,255,0.05)] hover:border-[rgba(255,157,66,0.2)] transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className={severityColors[blocker.severity]}>
                        {blocker.severity}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {blocker.type}
                      </Badge>
                      <span className="text-xs text-[#6B7280]">
                        {blocker.impacted_tasks_count} task{blocker.impacted_tasks_count !== 1 ? 's' : ''} impacted
                      </span>
                    </div>
                    
                    <p className="text-sm font-semibold text-white mb-1">
                      {blocker.title}
                    </p>
                    <p className="text-xs text-[#9CA3AF]">
                      {blocker.reason}
                    </p>
                  </div>
                  
                  {getEntityLink(blocker) && (
                    <Link to={getEntityLink(blocker)}>
                      <Button variant="ghost" size="icon" className="flex-shrink-0">
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        
        <div className="mt-4 pt-4 border-t border-[rgba(255,255,255,0.05)] text-right">
          <Link to={createPageUrl('Alerts') + `?project=${projectId}`}>
            <Button variant="outline" size="sm">
              View All Alerts
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}