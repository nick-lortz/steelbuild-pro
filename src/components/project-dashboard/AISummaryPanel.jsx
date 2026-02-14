import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, Sparkles, RefreshCw } from 'lucide-react';
import { Button } from "@/components/ui/button";

export default function AISummaryPanel({ projectId }) {
  const { data: aiSummary, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['ai-summary', projectId],
    queryFn: async () => {
      const response = await base44.functions.invoke('getProjectAISummary', { project_id: projectId });
      return response.data;
    },
    enabled: !!projectId,
    staleTime: 10 * 60 * 1000, // 10 min cache
  });

  const getSeverityColor = (severity) => {
    const colors = {
      critical: 'bg-red-500/20 text-red-400 border-red-500/30',
      high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      medium: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      low: 'bg-blue-500/20 text-blue-400 border-blue-500/30'
    };
    return colors[severity] || colors.medium;
  };

  const getHealthColor = (score) => {
    if (score >= 90) return 'text-green-400';
    if (score >= 75) return 'text-blue-400';
    if (score >= 60) return 'text-amber-400';
    return 'text-red-400';
  };

  if (isLoading) {
    return (
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500 mx-auto" />
          <p className="text-zinc-500 mt-4 text-sm">Analyzing project data...</p>
        </CardContent>
      </Card>
    );
  }

  if (!aiSummary) {
    return null;
  }

  return (
    <Card className="bg-gradient-to-br from-zinc-900 to-zinc-950 border-amber-500/20">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Sparkles size={18} className="text-amber-500" />
          AI Project Summary
        </CardTitle>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-xs text-zinc-500">Health Score</p>
            <p className={`text-2xl font-bold ${getHealthColor(aiSummary.health_score)}`}>
              {aiSummary.health_score}
            </p>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => refetch()}
            disabled={isFetching}
            className="text-zinc-500 hover:text-white"
          >
            <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Executive Summary */}
        <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-lg">
          <p className="text-sm text-zinc-300 leading-relaxed">{aiSummary.summary}</p>
        </div>

        {/* Risk Factors */}
        {aiSummary.risk_factors && aiSummary.risk_factors.length > 0 && (
          <div>
            <h4 className="text-xs uppercase tracking-wider text-zinc-500 mb-2 flex items-center gap-2">
              <AlertTriangle size={12} />
              Risk Factors
            </h4>
            <div className="space-y-2">
              {aiSummary.risk_factors.map((risk, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 bg-zinc-950 border border-zinc-800 rounded">
                  <Badge variant="outline" className={getSeverityColor(risk.severity)}>
                    {risk.severity}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-white">{risk.category}</p>
                    <p className="text-xs text-zinc-400 mt-1">{risk.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Items */}
        {aiSummary.action_items && aiSummary.action_items.length > 0 && (
          <div>
            <h4 className="text-xs uppercase tracking-wider text-zinc-500 mb-2 flex items-center gap-2">
              <CheckCircle2 size={12} />
              Action Items
            </h4>
            <ul className="space-y-2">
              {aiSummary.action_items.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2 text-xs text-zinc-300">
                  <span className="text-amber-500 mt-0.5">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="text-[10px] text-zinc-600 text-right">
          Last updated: {new Date(aiSummary.generated_at).toLocaleString()}
        </p>
      </CardContent>
    </Card>
  );
}