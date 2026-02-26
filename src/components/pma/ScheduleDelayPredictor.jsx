import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, TrendingDown, RefreshCw, AlertTriangle, CheckCircle2, Wrench, Package, Truck, Layers, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';

const PHASE_ICONS = { detailing: Layers, fabrication: Wrench, delivery: Truck, erection: Package };
const RISK_CONFIG = {
  critical: { color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30', badge: 'bg-red-500/20 text-red-400 border-red-500/30' },
  high:     { color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/30', badge: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  medium:   { color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30', badge: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  low:      { color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/30', badge: 'bg-green-500/20 text-green-400 border-green-500/30' },
};

function DelayGauge({ probability }) {
  const clamp = Math.min(Math.max(probability, 0), 100);
  const color = clamp >= 70 ? '#ef4444' : clamp >= 45 ? '#f97316' : clamp >= 25 ? '#f59e0b' : '#22c55e';
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="120" height="68" viewBox="0 0 120 68">
        <path d="M10 60 A50 50 0 0 1 110 60" fill="none" stroke="#27272a" strokeWidth="10" strokeLinecap="round" />
        <path
          d="M10 60 A50 50 0 0 1 110 60"
          fill="none" stroke={color} strokeWidth="10" strokeLinecap="round"
          strokeDasharray={`${clamp * 1.571} 999`}
        />
        <text x="60" y="55" textAnchor="middle" fill={color} fontSize="22" fontWeight="bold" fontFamily="monospace">{clamp}%</text>
      </svg>
      <span className="text-[10px] text-zinc-500 uppercase tracking-widest">Delay Probability</span>
    </div>
  );
}

export default function ScheduleDelayPredictor({ activeProjectId, onSendToChat }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const run = async () => {
    setLoading(true);
    try {
      const { data } = await base44.functions.invoke('pmaScheduleDelayPredictor', { project_id: activeProjectId });
      setResult(data);
    } catch {
      toast.error('Delay prediction failed');
    } finally {
      setLoading(false);
    }
  };

  const cfg = result ? (RISK_CONFIG[result.risk_level] || RISK_CONFIG.medium) : null;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b border-zinc-800">
        <div>
          <h3 className="text-sm font-bold text-white">Schedule Delay Predictor</h3>
          <p className="text-xs text-zinc-500 mt-0.5">Velocity, float, RFI drag, delivery gaps — composite risk score</p>
        </div>
        <div className="flex gap-2">
          {result && onSendToChat && (
            <Button size="sm" variant="outline" onClick={() => onSendToChat(`My schedule delay risk is ${result.delay_probability}% (${result.risk_level}). Here's the breakdown:\n${result.narrative}\nWhat recovery actions do you recommend?`)} className="border-zinc-700 text-xs">
              <Send size={12} className="mr-1.5" />Discuss
            </Button>
          )}
          <Button size="sm" onClick={run} disabled={loading} className="bg-amber-500 hover:bg-amber-600 text-black text-xs font-bold">
            {loading ? <Loader2 size={12} className="mr-1.5 animate-spin" /> : <RefreshCw size={12} className="mr-1.5" />}
            {result ? 'Re-run' : 'Predict Delays'}
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {!result && !loading && (
          <div className="flex flex-col items-center justify-center h-full text-center py-16">
            <TrendingDown className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
            <p className="text-zinc-400 text-sm mb-2">Run delay prediction</p>
            <p className="text-zinc-600 text-xs mb-6 max-w-sm">Analyzes velocity, RFI blockers, stalled work packages, and delivery gaps to score schedule delay risk.</p>
            <Button onClick={run} className="bg-amber-500 hover:bg-amber-600 text-black font-bold">Predict Schedule Delays</Button>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center h-full py-16">
            <Loader2 className="w-10 h-10 text-amber-500 animate-spin mx-auto mb-4" />
            <p className="text-zinc-400 text-sm">Analyzing schedule signals...</p>
          </div>
        )}

        {result && !loading && (
          <div className="max-w-3xl mx-auto space-y-4">
            {/* Hero card */}
            <Card className={cn('border', cfg.bg)}>
              <CardContent className="p-4 flex items-center gap-6">
                <DelayGauge probability={result.delay_probability} />
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge className={cn('border', cfg.badge, 'text-xs uppercase tracking-wide')}>{result.risk_level} risk</Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: 'Overdue Tasks', val: result.signals?.overdue_tasks },
                      { label: 'Install Blockers', val: result.signals?.install_blockers },
                      { label: 'Stalled WPs', val: result.signals?.stalled_work_packages },
                      { label: 'Aging RFIs', val: result.signals?.aging_rfis },
                      { label: 'Unconf. Deliveries', val: result.signals?.unconfirmed_deliveries_7d },
                      { label: 'Velocity Score', val: `${result.signals?.velocity_score}%` },
                    ].map(s => (
                      <div key={s.label} className="bg-zinc-900/60 rounded p-2 text-center">
                        <div className="text-[9px] text-zinc-600 uppercase tracking-widest">{s.label}</div>
                        <div className="text-sm font-bold text-white font-mono">{s.val ?? '—'}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Phase breakdown */}
            {result.phase_breakdown?.length > 0 && (
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-sm text-white">Phase Risk Breakdown</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4 space-y-2">
                  {result.phase_breakdown.map(p => {
                    const Icon = PHASE_ICONS[p.phase] || Layers;
                    const pct = p.delay_probability || 0;
                    const pColor = pct >= 70 ? 'bg-red-500' : pct >= 45 ? 'bg-orange-500' : pct >= 25 ? 'bg-amber-500' : 'bg-green-500';
                    return (
                      <div key={p.phase} className="flex items-center gap-3">
                        <Icon size={14} className="text-zinc-500 flex-shrink-0" />
                        <div className="flex-1">
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-zinc-300 capitalize">{p.phase}</span>
                            <span className="font-mono text-zinc-400">{pct}%</span>
                          </div>
                          <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                            <div className={cn('h-full rounded-full transition-all', pColor)} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                        <div className="text-[10px] text-zinc-600 w-28 text-right">
                          {p.overdue_tasks}t · {p.stalled_wps}wp · {p.blocking_rfis}rfi
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}

            {/* AI narrative */}
            {result.narrative && (
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-sm text-white flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />AI Risk Narrative
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <ReactMarkdown className="prose prose-sm prose-invert max-w-none text-zinc-300 text-sm">
                    {result.narrative}
                  </ReactMarkdown>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}