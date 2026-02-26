import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Loader2, AlertCircle, AlertTriangle, CheckCircle2, TrendingUp, Calendar, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import { format } from 'date-fns';

export default function DailyBrief({ activeProjectId, onSendToChat }) {
  const [generating, setGenerating] = useState(false);
  const [brief, setBrief] = useState(null);

  const generate = async () => {
    setGenerating(true);
    try {
      const { data } = await base44.functions.invoke('pmaGenerateDailyBrief', {
        project_id: activeProjectId
      });
      setBrief(data);
    } catch (e) {
      toast.error('Failed to generate brief');
    } finally {
      setGenerating(false);
    }
  };

  const statusColor = (s) => {
    if (s === 'red' || s === 'critical') return 'text-red-400 bg-red-500/10 border-red-500/30';
    if (s === 'yellow' || s === 'caution') return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
    return 'text-green-400 bg-green-500/10 border-green-500/30';
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b border-zinc-800">
        <div>
          <h3 className="text-sm font-bold text-white">Daily Project Brief</h3>
          <p className="text-xs text-zinc-500 mt-0.5">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
        </div>
        <div className="flex gap-2">
          {brief && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onSendToChat(`Here is my daily brief — analyze it and give me your top 3 priority actions:\n\n${brief.summary || brief.narrative || JSON.stringify(brief)}`)}
              className="border-zinc-700 text-xs"
            >
              <Send size={12} className="mr-1.5" />
              Discuss with PMA
            </Button>
          )}
          <Button
            size="sm"
            onClick={generate}
            disabled={generating}
            className="bg-amber-500 hover:bg-amber-600 text-black text-xs font-bold"
          >
            {generating
              ? <Loader2 size={12} className="mr-1.5 animate-spin" />
              : <RefreshCw size={12} className="mr-1.5" />}
            {brief ? 'Refresh' : 'Generate Brief'}
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {!brief && !generating && (
          <div className="flex flex-col items-center justify-center h-full text-center py-16">
            <Calendar className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
            <p className="text-zinc-400 text-sm mb-2">No brief generated yet</p>
            <p className="text-zinc-600 text-xs mb-6 max-w-sm">
              Generate your daily project pulse — critical issues, forecasts, and priority actions.
            </p>
            <Button onClick={generate} className="bg-amber-500 hover:bg-amber-600 text-black font-bold">
              Generate Today's Brief
            </Button>
          </div>
        )}

        {generating && (
          <div className="flex flex-col items-center justify-center h-full text-center py-16">
            <Loader2 className="w-10 h-10 text-amber-500 animate-spin mx-auto mb-4" />
            <p className="text-zinc-400 text-sm">Analyzing project data...</p>
          </div>
        )}

        {brief && !generating && (
          <div className="max-w-3xl mx-auto space-y-4">
            {/* Overall Status */}
            {brief.overall_status && (
              <Card className="bg-zinc-900 border-zinc-800">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Badge className={cn('text-sm px-3 py-1 border', statusColor(brief.overall_status))}>
                      {brief.overall_status.toUpperCase()}
                    </Badge>
                    <span className="text-white font-semibold">{brief.status_summary || 'Project Status'}</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Critical Issues */}
            {brief.critical_issues?.length > 0 && (
              <Card className="bg-red-500/5 border-red-500/20">
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-sm text-white flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-400" />
                    Critical — Action Required Today
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4 space-y-2">
                  {brief.critical_issues.map((issue, i) => (
                    <div key={i} className="flex items-start gap-2 p-2.5 bg-zinc-900/50 rounded border border-red-500/10">
                      <span className="text-red-400 font-mono text-xs mt-0.5">•</span>
                      <span className="text-zinc-200 text-sm">{issue}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Caution Items */}
            {brief.caution_items?.length > 0 && (
              <Card className="bg-amber-500/5 border-amber-500/20">
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-sm text-white flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    Caution — Monitor Closely
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4 space-y-2">
                  {brief.caution_items.map((item, i) => (
                    <div key={i} className="flex items-start gap-2 p-2.5 bg-zinc-900/50 rounded border border-amber-500/10">
                      <span className="text-amber-400 font-mono text-xs mt-0.5">•</span>
                      <span className="text-zinc-200 text-sm">{item}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* On Track */}
            {brief.on_track?.length > 0 && (
              <Card className="bg-green-500/5 border-green-500/20">
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-sm text-white flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                    On Track
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4 space-y-2">
                  {brief.on_track.map((item, i) => (
                    <div key={i} className="flex items-start gap-2 p-2.5 bg-zinc-900/50 rounded">
                      <span className="text-green-400 font-mono text-xs mt-0.5">✓</span>
                      <span className="text-zinc-200 text-sm">{item}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Recommended Actions */}
            {brief.recommended_actions?.length > 0 && (
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-sm text-white flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-blue-400" />
                    Priority Actions
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4 space-y-2">
                  {brief.recommended_actions.map((action, i) => (
                    <div key={i} className="flex items-start gap-3 p-2.5 bg-zinc-800/50 rounded border border-zinc-700">
                      <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <span className="text-zinc-200 text-sm">{action}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* AI Narrative fallback */}
            {brief.narrative && (
              <Card className="bg-zinc-900 border-zinc-800">
                <CardContent className="p-4">
                  <ReactMarkdown className="prose prose-sm prose-invert max-w-none text-zinc-300 text-sm">
                    {brief.narrative}
                  </ReactMarkdown>
                </CardContent>
              </Card>
            )}

            {/* Forecast summary */}
            {(brief.forecast_fab || brief.forecast_erection || brief.forecast_budget) && (
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-sm text-white">Quick Forecast</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: 'Fabrication', val: brief.forecast_fab },
                      { label: 'Erection', val: brief.forecast_erection },
                      { label: 'Budget', val: brief.forecast_budget },
                    ].filter(x => x.val).map(({ label, val }) => (
                      <div key={label} className="text-center p-2 bg-zinc-800/50 rounded">
                        <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">{label}</div>
                        <div className="text-sm font-bold text-white">{val}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}