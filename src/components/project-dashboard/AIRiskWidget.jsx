import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, TrendingUp, Clock, Loader2 } from 'lucide-react';

export default function AIRiskWidget({ projectId }) {
  const { data: risks, isLoading, error } = useQuery({
    queryKey: ['ai-risks', projectId],
    queryFn: async () => {
      try {
        const { data } = await base44.functions.invoke('aiRiskAssessment', { project_id: projectId });
        return data?.risks || [];
      } catch (err) {
        console.error('AI Risk Assessment error:', err);
        return [];
      }
    },
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000
  });

  const severityColors = {
    critical: 'bg-red-500/20 text-red-400 border-red-500/30',
    high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    medium: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    low: 'bg-blue-500/20 text-blue-400 border-blue-500/30'
  };

  const riskIcons = {
    budget: <TrendingUp size={14} />,
    schedule: <Clock size={14} />,
    resource: <AlertTriangle size={14} />
  };

  if (isLoading) {
    return (
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 size={24} className="animate-spin text-amber-500" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <AlertTriangle size={16} className="text-red-400" />
          AI Risk Assessment
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {!risks || risks.length === 0 ? (
          <div className="text-center py-6">
            <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
              <AlertTriangle size={20} className="text-green-400" />
            </div>
            <p className="text-xs text-zinc-500">No significant risks detected</p>
          </div>
        ) : (
          risks.slice(0, 5).map((risk, idx) => (
            <div key={idx} className="p-3 bg-zinc-950 border border-zinc-800 rounded">
              <div className="flex items-start gap-2 mb-2">
                <div className="text-amber-500 mt-0.5">
                  {riskIcons[risk.type] || <AlertTriangle size={14} />}
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="text-xs font-medium text-white">{risk.description}</p>
                    <Badge variant="outline" className={`${severityColors[risk.severity]} text-[10px] px-1.5 py-0`}>
                      {risk.severity}
                    </Badge>
                  </div>
                  {risk.mitigation && (
                    <p className="text-[10px] text-zinc-500 mt-1">→ {risk.mitigation}</p>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}