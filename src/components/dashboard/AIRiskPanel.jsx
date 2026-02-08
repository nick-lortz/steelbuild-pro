import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, TrendingUp, TrendingDown, Zap, Shield, Calendar, DollarSign, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

export default function AIRiskPanel({ projectId }) {
  const [expanded, setExpanded] = useState(false);

  const { data: riskData, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['ai-risk', projectId],
    queryFn: async () => {
      const response = await apiClient.functions.invoke('aiRiskAssessment', { project_id: projectId });
      return response.data;
    },
    enabled: !!projectId,
    staleTime: 10 * 60 * 1000
  });

  if (!projectId) return null;

  const assessment = riskData?.assessment;
  const metrics = riskData?.metrics;

  return (
    <Card className={cn(
      "border-2 transition-all",
      assessment?.risk_level === 'critical' && "border-red-500 bg-red-500/5",
      assessment?.risk_level === 'high' && "border-amber-500 bg-amber-500/5",
      assessment?.risk_level === 'medium' && "border-yellow-500 bg-yellow-500/5",
      assessment?.risk_level === 'low' && "border-green-500 bg-green-500/5",
      !assessment && "border-zinc-800 bg-zinc-900"
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base uppercase tracking-wide flex items-center gap-2">
            <Zap size={16} className="text-amber-500" />
            AI Risk Analysis
          </CardTitle>
          <div className="flex items-center gap-2">
            {assessment && (
              <Badge className={cn(
                "font-bold text-[10px] uppercase",
                assessment.risk_level === 'critical' && "bg-red-500 text-white",
                assessment.risk_level === 'high' && "bg-amber-500 text-black",
                assessment.risk_level === 'medium' && "bg-yellow-500 text-black",
                assessment.risk_level === 'low' && "bg-green-500 text-black"
              )}>
                {assessment.risk_level} RISK
              </Badge>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => refetch()}
              disabled={isFetching}
              className="h-7 px-2"
            >
              <RefreshCw size={12} className={cn(isFetching && "animate-spin")} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : assessment ? (
          <div className="space-y-4">
            {/* Risk Score */}
            <div className="flex items-center justify-between p-3 bg-zinc-800/50 rounded">
              <div>
                <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider mb-1">Risk Score</p>
                <p className="text-2xl font-black text-white">{assessment.risk_score}/100</p>
              </div>
              <div className={cn(
                "w-16 h-16 rounded-full flex items-center justify-center font-black text-xl border-4",
                assessment.risk_score > 75 && "border-red-500 text-red-500",
                assessment.risk_score > 50 && assessment.risk_score <= 75 && "border-amber-500 text-amber-500",
                assessment.risk_score > 25 && assessment.risk_score <= 50 && "border-yellow-500 text-yellow-500",
                assessment.risk_score <= 25 && "border-green-500 text-green-500"
              )}>
                {assessment.risk_score}
              </div>
            </div>

            {/* Summary */}
            <div className="p-3 bg-zinc-800/30 rounded border border-zinc-700">
              <p className="text-xs text-zinc-400 leading-relaxed">{assessment.summary}</p>
            </div>

            {/* Forecast */}
            {assessment.forecast && (
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 bg-zinc-800/50 rounded">
                  <p className="text-[9px] text-zinc-600 uppercase tracking-widest font-bold mb-1">Schedule</p>
                  <Badge className={cn(
                    "text-[9px] font-bold",
                    assessment.forecast.schedule_outlook === 'on_track' && "bg-green-500/20 text-green-400",
                    assessment.forecast.schedule_outlook === 'at_risk' && "bg-amber-500/20 text-amber-400",
                    assessment.forecast.schedule_outlook === 'delayed' && "bg-red-500/20 text-red-400"
                  )}>
                    {assessment.forecast.schedule_outlook?.replace('_', ' ').toUpperCase()}
                  </Badge>
                </div>
                <div className="p-2 bg-zinc-800/50 rounded">
                  <p className="text-[9px] text-zinc-600 uppercase tracking-widest font-bold mb-1">Cost</p>
                  <Badge className={cn(
                    "text-[9px] font-bold",
                    assessment.forecast.cost_outlook === 'under_budget' && "bg-green-500/20 text-green-400",
                    assessment.forecast.cost_outlook === 'on_budget' && "bg-blue-500/20 text-blue-400",
                    assessment.forecast.cost_outlook === 'over_budget' && "bg-red-500/20 text-red-400"
                  )}>
                    {assessment.forecast.cost_outlook?.replace('_', ' ').toUpperCase()}
                  </Badge>
                </div>
              </div>
            )}

            {/* Red Flags */}
            {assessment.red_flags?.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-bold text-red-400 uppercase tracking-wider mb-2">🚨 Red Flags</p>
                {assessment.red_flags.map((flag, idx) => (
                  <div key={idx} className="flex items-start gap-2 p-2 bg-red-500/10 border border-red-500/30 rounded">
                    <AlertTriangle size={12} className="text-red-400 mt-0.5 flex-shrink-0" />
                    <p className="text-[10px] text-red-400">{flag}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Top Risks */}
            {!expanded && assessment.risks?.slice(0, 3).map((risk, idx) => (
              <div
                key={idx}
                className={cn(
                  "p-3 rounded border",
                  risk.severity === 'critical' && "bg-red-500/10 border-red-500/30",
                  risk.severity === 'high' && "bg-amber-500/10 border-amber-500/30",
                  risk.severity === 'medium' && "bg-yellow-500/10 border-yellow-500/30",
                  risk.severity === 'low' && "bg-blue-500/10 border-blue-500/30"
                )}
              >
                <div className="flex items-start justify-between mb-1">
                  <h4 className="font-bold text-white text-xs uppercase">{risk.title}</h4>
                  <Badge className={cn(
                    "text-[9px] font-bold",
                    risk.severity === 'critical' && "bg-red-500 text-white",
                    risk.severity === 'high' && "bg-amber-500 text-black",
                    risk.severity === 'medium' && "bg-yellow-500 text-black",
                    risk.severity === 'low' && "bg-blue-500 text-white"
                  )}>
                    {risk.severity}
                  </Badge>
                </div>
                <p className="text-[10px] text-zinc-400 mb-2">{risk.description}</p>
                <div className="flex items-center gap-2 text-[9px]">
                  <Badge variant="outline" className="text-zinc-500 uppercase">{risk.category}</Badge>
                  <Badge variant="outline" className="text-zinc-500">Likelihood: {risk.likelihood}</Badge>
                </div>
                {expanded && (
                  <>
                    <p className="text-[10px] text-green-400 mt-2">
                      <span className="font-bold">Mitigation:</span> {risk.mitigation}
                    </p>
                    <p className="text-[10px] text-zinc-600 mt-1">
                      <span className="font-bold">Owner:</span> {risk.owner}
                    </p>
                  </>
                )}
              </div>
            ))}

            {/* Expand */}
            {assessment.risks?.length > 3 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setExpanded(!expanded)}
                className="w-full text-xs text-zinc-400 hover:text-white"
              >
                {expanded ? 'Show Less' : `Show ${assessment.risks.length - 3} More Risks`}
              </Button>
            )}

            {expanded && assessment.risks?.slice(3).map((risk, idx) => (
              <div
                key={idx}
                className={cn(
                  "p-3 rounded border",
                  risk.severity === 'critical' && "bg-red-500/10 border-red-500/30",
                  risk.severity === 'high' && "bg-amber-500/10 border-amber-500/30",
                  risk.severity === 'medium' && "bg-yellow-500/10 border-yellow-500/30",
                  risk.severity === 'low' && "bg-blue-500/10 border-blue-500/30"
                )}
              >
                <div className="flex items-start justify-between mb-1">
                  <h4 className="font-bold text-white text-xs uppercase">{risk.title}</h4>
                  <Badge className={cn(
                    "text-[9px] font-bold",
                    risk.severity === 'critical' && "bg-red-500 text-white",
                    risk.severity === 'high' && "bg-amber-500 text-black",
                    risk.severity === 'medium' && "bg-yellow-500 text-black",
                    risk.severity === 'low' && "bg-blue-500 text-white"
                  )}>
                    {risk.severity}
                  </Badge>
                </div>
                <p className="text-[10px] text-zinc-400 mb-2">{risk.description}</p>
                <p className="text-[10px] text-green-400 mt-2">
                  <span className="font-bold">Mitigation:</span> {risk.mitigation}
                </p>
              </div>
            ))}

            {/* Recommended Actions */}
            {assessment.recommended_actions?.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-zinc-800">
                <p className="text-xs font-bold text-amber-500 uppercase tracking-wider">Recommended Actions</p>
                {assessment.recommended_actions.map((action, idx) => (
                  <div key={idx} className="p-2 bg-amber-500/10 border border-amber-500/30 rounded">
                    <div className="flex items-start justify-between mb-1">
                      <Badge className={cn(
                        "text-[9px] font-bold",
                        action.priority === 'immediate' && "bg-red-500 text-white",
                        action.priority === 'high' && "bg-amber-500 text-black",
                        action.priority === 'medium' && "bg-blue-500 text-white"
                      )}>
                        {action.priority}
                      </Badge>
                      {action.due_by && (
                        <span className="text-[9px] text-zinc-500 font-mono">
                          Due: {format(new Date(action.due_by), 'MMM d')}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-white font-bold mb-1">{action.action}</p>
                    <p className="text-[10px] text-zinc-500">{action.rationale}</p>
                  </div>
                ))}
              </div>
            )}

            {riskData?.analyzed_at && (
              <p className="text-[9px] text-zinc-600 text-center font-mono pt-2">
                Last analyzed: {format(new Date(riskData.analyzed_at), 'MMM d, h:mm a')}
              </p>
            )}
          </div>
        ) : (
          <div className="text-center py-6 text-zinc-600 text-sm">
            Click analyze to generate risk assessment
          </div>
        )}
      </CardContent>
    </Card>
  );
}