import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  TrendingUp, TrendingDown, Calendar, DollarSign, Target, 
  AlertTriangle, CheckCircle2, Clock, Zap, RefreshCw, ChevronDown, ChevronUp
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

export default function AIForecastPanel({ projectId }) {
  const [expanded, setExpanded] = useState(true);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['ai-forecast', projectId],
    queryFn: async () => {
      const response = await base44.functions.invoke('aiProjectForecast', { project_id: projectId });
      return response.data;
    },
    enabled: !!projectId,
    staleTime: 15 * 60 * 1000,
    gcTime: 30 * 60 * 1000
  });

  if (isLoading) {
    return (
      <Card className="bg-gradient-to-br from-blue-500/10 to-transparent border-blue-500/20">
        <CardContent className="py-8">
          <div className="flex items-center justify-center gap-3">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-zinc-400">Generating AI forecast...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data?.forecast) return null;

  const { forecast, current_metrics } = data;
  const completionForecast = forecast.completion_forecast;
  const budgetForecast = forecast.budget_forecast;
  const milestones = forecast.milestone_forecast || [];
  const risks = forecast.critical_risks || [];
  const actions = forecast.recommended_actions || [];

  const isLate = completionForecast?.variance_days > 0;
  const isOverBudget = budgetForecast?.projected_overrun > 0;

  return (
    <Card className="bg-gradient-to-br from-blue-500/10 to-transparent border-blue-500/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base uppercase tracking-wide flex items-center gap-2">
            <Zap size={16} className="text-blue-500" />
            AI Project Forecast
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => refetch()}
              disabled={isFetching}
              className="h-7 px-2 text-blue-400 hover:text-blue-300"
            >
              <RefreshCw size={12} className={cn(isFetching && "animate-spin")} />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setExpanded(!expanded)}
              className="h-7 px-2 text-blue-400"
            >
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Overall Health Score */}
        <div className="p-3 bg-zinc-800/50 rounded-lg border border-zinc-700">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold">Overall Health</p>
            <Badge className={cn(
              "text-[8px] font-bold",
              forecast.overall_health_score >= 80 ? "bg-green-500/20 text-green-400" :
              forecast.overall_health_score >= 60 ? "bg-yellow-500/20 text-yellow-400" :
              "bg-red-500/20 text-red-400"
            )}>
              {forecast.overall_health_score}/100
            </Badge>
          </div>
          <p className="text-xs text-zinc-300 leading-relaxed">{forecast.summary}</p>
        </div>

        {/* Key Forecasts Grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* Completion Forecast */}
          <div className="p-3 bg-zinc-900 rounded-lg border border-zinc-800">
            <div className="flex items-center gap-2 mb-2">
              <Calendar size={12} className={isLate ? "text-red-400" : "text-green-400"} />
              <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold">Completion</p>
            </div>
            <p className="text-lg font-black text-white mb-1">
              {completionForecast?.projected_date && !isNaN(new Date(completionForecast.projected_date).getTime()) 
                ? format(new Date(completionForecast.projected_date), 'MMM d, yyyy') 
                : 'TBD'}
            </p>
            <div className="flex items-center gap-2">
              {isLate ? <TrendingUp size={10} className="text-red-400" /> : <TrendingDown size={10} className="text-green-400" />}
              <p className={cn("text-[10px] font-bold", isLate ? "text-red-400" : "text-green-400")}>
                {Math.abs(completionForecast?.variance_days || 0)} days {isLate ? 'late' : 'early'}
              </p>
            </div>
            <Badge className={cn(
              "mt-2 text-[8px]",
              completionForecast?.confidence === 'high' ? "bg-green-500/20 text-green-400" :
              completionForecast?.confidence === 'medium' ? "bg-yellow-500/20 text-yellow-400" :
              "bg-red-500/20 text-red-400"
            )}>
              {completionForecast?.confidence} confidence
            </Badge>
          </div>

          {/* Budget Forecast */}
          <div className="p-3 bg-zinc-900 rounded-lg border border-zinc-800">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign size={12} className={isOverBudget ? "text-red-400" : "text-green-400"} />
              <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold">Budget</p>
            </div>
            <p className="text-lg font-black text-white mb-1">
              ${((budgetForecast?.projected_final_cost || 0) / 1000).toFixed(0)}K
            </p>
            <div className="flex items-center gap-2">
              {isOverBudget ? <TrendingUp size={10} className="text-red-400" /> : <TrendingDown size={10} className="text-green-400" />}
              <p className={cn("text-[10px] font-bold", isOverBudget ? "text-red-400" : "text-green-400")}>
                {isOverBudget ? '+' : ''}{((budgetForecast?.projected_overrun || 0) / 1000).toFixed(0)}K ({budgetForecast?.overrun_percentage?.toFixed(1) || 0}%)
              </p>
            </div>
            <Badge className={cn(
              "mt-2 text-[8px]",
              budgetForecast?.confidence === 'high' ? "bg-green-500/20 text-green-400" :
              budgetForecast?.confidence === 'medium' ? "bg-yellow-500/20 text-yellow-400" :
              "bg-red-500/20 text-red-400"
            )}>
              {budgetForecast?.confidence} confidence
            </Badge>
          </div>
        </div>

        {expanded && (
          <>
            {/* Reasoning */}
            <div className="space-y-2">
              <div className="p-2 bg-zinc-950 rounded border border-zinc-800">
                <p className="text-[9px] text-zinc-600 uppercase tracking-widest font-bold mb-1">Schedule Reasoning</p>
                <p className="text-[10px] text-zinc-400 leading-relaxed">{completionForecast?.reasoning}</p>
              </div>
              <div className="p-2 bg-zinc-950 rounded border border-zinc-800">
                <p className="text-[9px] text-zinc-600 uppercase tracking-widest font-bold mb-1">Budget Reasoning</p>
                <p className="text-[10px] text-zinc-400 leading-relaxed">{budgetForecast?.reasoning}</p>
              </div>
            </div>

            {/* Milestones */}
            {milestones.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                  <Target size={12} />
                  Key Milestones
                </p>
                {milestones.map((m, idx) => (
                  <div key={idx} className="p-2 bg-zinc-900 rounded border border-zinc-800">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs font-bold text-white">{m.milestone}</p>
                      <div className="flex items-center gap-2">
                        <Badge className={cn(
                          "text-[8px]",
                          m.status === 'on_track' ? "bg-green-500/20 text-green-400" :
                          m.status === 'at_risk' ? "bg-yellow-500/20 text-yellow-400" :
                          "bg-red-500/20 text-red-400"
                        )}>
                          {m.probability}% likely
                        </Badge>
                        {m.status === 'on_track' && <CheckCircle2 size={12} className="text-green-400" />}
                        {m.status === 'at_risk' && <Clock size={12} className="text-yellow-400" />}
                        {m.status === 'critical' && <AlertTriangle size={12} className="text-red-400" />}
                      </div>
                    </div>
                    {m.target_date && !isNaN(new Date(m.target_date).getTime()) && (
                      <p className="text-[9px] text-zinc-500 mb-1">Target: {format(new Date(m.target_date), 'MMM d, yyyy')}</p>
                    )}
                    {m.constraints?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {m.constraints.map((c, i) => (
                          <Badge key={i} className="bg-zinc-800 text-zinc-400 text-[8px] px-1 py-0">
                            {c}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Critical Risks */}
            {risks.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-bold text-red-400 uppercase tracking-wider flex items-center gap-2">
                  <AlertTriangle size={12} />
                  Critical Risks
                </p>
                {risks.slice(0, 5).map((r, idx) => (
                  <div key={idx} className="p-2 bg-red-500/10 border border-red-500/30 rounded">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="text-xs font-bold text-red-300">{r.risk}</p>
                      <Badge className={cn(
                        "text-[8px] shrink-0",
                        r.severity === 'critical' ? "bg-red-500 text-white" :
                        r.severity === 'high' ? "bg-red-500/30 text-red-400" :
                        "bg-yellow-500/30 text-yellow-400"
                      )}>
                        {r.severity}
                      </Badge>
                    </div>
                    <p className="text-[9px] text-zinc-500 mb-1">
                      Impact: <span className="text-red-400 font-bold">{r.impact}</span>
                    </p>
                    <p className="text-[10px] text-zinc-400 leading-relaxed">→ {r.mitigation}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Recommended Actions */}
            {actions.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                  <Zap size={12} />
                  Recommended Actions
                </p>
                {actions.slice(0, 5).map((a, idx) => (
                  <div key={idx} className="p-2 bg-amber-500/10 border border-amber-500/30 rounded">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="text-xs font-bold text-white">{a.action}</p>
                      <Badge className={cn(
                        "text-[8px] shrink-0",
                        a.priority === 'urgent' ? "bg-red-500 text-white" :
                        a.priority === 'high' ? "bg-amber-500 text-black" :
                        "bg-zinc-700 text-zinc-300"
                      )}>
                        {a.priority}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-[9px] text-zinc-500">
                      <span>Owner: <span className="text-amber-400 font-bold">{a.owner}</span></span>
                      <span>•</span>
                      <span>Due: <span className="text-white">{a.timeline}</span></span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Analysis Timestamp */}
        <div className="pt-2 border-t border-zinc-800">
          <p className="text-[9px] text-zinc-600 text-center">
            Forecast generated {data.analysis_date && !isNaN(new Date(data.analysis_date).getTime()) 
              ? format(new Date(data.analysis_date), 'MMM d, h:mm a') 
              : 'recently'}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}