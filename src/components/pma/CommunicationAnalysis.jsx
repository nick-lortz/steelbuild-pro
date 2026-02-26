import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, MessageSquare, RefreshCw, AlertCircle, AlertTriangle, DollarSign, Shield, Repeat2, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const RISK_CONFIG = {
  critical: 'bg-red-500/10 border-red-500/30 text-red-400',
  high:     'bg-orange-500/10 border-orange-500/30 text-orange-400',
  medium:   'bg-amber-500/10 border-amber-500/30 text-amber-400',
  low:      'bg-blue-500/10 border-blue-500/30 text-blue-400',
};

const SEVERITY_BADGE = {
  high:   'bg-red-500/20 text-red-400 border-red-500/30',
  medium: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  low:    'bg-zinc-700 text-zinc-400',
};

function FindingList({ title, items = [], icon: Icon, color, sourceColor = 'text-zinc-600' }) {
  if (!items.length) return null;
  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-sm text-white flex items-center gap-2">
          <Icon className={cn('w-4 h-4', color)} />{title}
          <span className="ml-auto text-[10px] text-zinc-600 font-mono">{items.length}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-2">
        {items.map((item, i) => (
          <div key={i} className="p-2.5 bg-zinc-800/50 rounded border border-zinc-700">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-xs font-semibold text-white">{item.title || item.pattern}</span>
              {item.severity && (
                <Badge className={cn('text-[10px] px-1.5 py-0 border', SEVERITY_BADGE[item.severity] || SEVERITY_BADGE.low)}>
                  {item.severity}
                </Badge>
              )}
              {item.occurrences && (
                <Badge className="text-[10px] px-1.5 py-0 bg-purple-500/20 text-purple-400 border-purple-500/30">
                  ×{item.occurrences}
                </Badge>
              )}
            </div>
            <p className="text-xs text-zinc-400">{item.description || item.implication}</p>
            {item.source && <p className={cn('text-[10px] mt-1 font-mono', sourceColor)}>↳ {item.source}</p>}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export default function CommunicationAnalysis({ activeProjectId, onSendToChat }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [lookback, setLookback] = useState('14');

  const run = async () => {
    setLoading(true);
    try {
      const { data } = await base44.functions.invoke('pmaCommunicationAnalysis', {
        project_id: activeProjectId,
        lookback_days: parseInt(lookback)
      });
      setResult(data);
    } catch {
      toast.error('Communication analysis failed');
    } finally {
      setLoading(false);
    }
  };

  const a = result?.analysis;
  const overallCfg = a ? (RISK_CONFIG[a.overall_risk] || RISK_CONFIG.medium) : null;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b border-zinc-800 gap-3 flex-wrap">
        <div>
          <h3 className="text-sm font-bold text-white">Communication Risk Analysis</h3>
          <p className="text-xs text-zinc-500 mt-0.5">Scans RFIs, messages, logs, and meeting notes for conflict signals</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={lookback} onValueChange={setLookback}>
            <SelectTrigger className="h-8 w-28 bg-zinc-900 border-zinc-700 text-xs text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-700">
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="14">Last 14 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="60">Last 60 days</SelectItem>
            </SelectContent>
          </Select>
          {result && onSendToChat && (
            <Button size="sm" variant="outline" onClick={() => onSendToChat(`Comm analysis found ${a?.conflicts?.length || 0} conflicts, ${a?.schedule_risks?.length || 0} schedule risks, ${a?.cost_exposure?.length || 0} cost exposures in the last ${lookback} days. Overall risk: ${a?.overall_risk}. ${a?.risk_summary} What should I prioritize?`)} className="border-zinc-700 text-xs h-8">
              <Send size={12} className="mr-1.5" />Discuss
            </Button>
          )}
          <Button size="sm" onClick={run} disabled={loading} className="bg-amber-500 hover:bg-amber-600 text-black text-xs font-bold h-8">
            {loading ? <Loader2 size={12} className="mr-1.5 animate-spin" /> : <RefreshCw size={12} className="mr-1.5" />}
            {result ? 'Re-scan' : 'Scan Comms'}
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {!result && !loading && (
          <div className="flex flex-col items-center justify-center h-full text-center py-16">
            <MessageSquare className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
            <p className="text-zinc-400 text-sm mb-2">No scan run yet</p>
            <p className="text-zinc-600 text-xs mb-6 max-w-sm">Analyzes RFI threads, meeting notes, daily logs, messages, and production notes for dispute language, schedule risk, and claim exposure.</p>
            <Button onClick={run} className="bg-amber-500 hover:bg-amber-600 text-black font-bold">Scan Communications</Button>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center h-full py-16">
            <Loader2 className="w-10 h-10 text-amber-500 animate-spin mx-auto mb-4" />
            <p className="text-zinc-400 text-sm">Scanning communication logs...</p>
          </div>
        )}

        {result && !loading && a && (
          <div className="max-w-3xl mx-auto space-y-4">
            {/* Summary card */}
            <Card className={cn('border', overallCfg)}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={cn('border uppercase text-xs tracking-wide', overallCfg)}>{a.overall_risk} risk</Badge>
                      <span className="text-[10px] text-zinc-500 font-mono">{result.total_communications} items · {result.flagged_count} flagged · {result.risk_density_pct}% density</span>
                    </div>
                    <p className="text-sm text-zinc-300">{a.risk_summary}</p>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: 'Conflicts', val: a.conflicts?.length || 0, icon: AlertCircle, color: 'text-red-400' },
                    { label: 'Sched Risks', val: a.schedule_risks?.length || 0, icon: AlertTriangle, color: 'text-amber-400' },
                    { label: 'Cost Exposure', val: a.cost_exposure?.length || 0, icon: DollarSign, color: 'text-orange-400' },
                    { label: 'Safety Flags', val: a.safety_flags?.length || 0, icon: Shield, color: 'text-red-400' },
                  ].map(s => {
                    const Icon = s.icon;
                    return (
                      <div key={s.label} className="bg-zinc-900/60 rounded p-2 text-center">
                        <Icon className={cn('w-3 h-3 mx-auto mb-1', s.color)} />
                        <div className="text-lg font-bold font-mono text-white">{s.val}</div>
                        <div className="text-[9px] text-zinc-600 uppercase tracking-widest">{s.label}</div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <FindingList title="Conflicts Detected" items={a.conflicts} icon={AlertCircle} color="text-red-400" sourceColor="text-red-600" />
            <FindingList title="Schedule Risk Language" items={a.schedule_risks} icon={AlertTriangle} color="text-amber-400" sourceColor="text-amber-700" />
            <FindingList title="Cost & Claim Exposure" items={a.cost_exposure} icon={DollarSign} color="text-orange-400" sourceColor="text-orange-700" />
            <FindingList title="Safety Flags" items={a.safety_flags} icon={Shield} color="text-red-400" sourceColor="text-red-700" />
            <FindingList title="Recurring Patterns" items={a.recurring_patterns} icon={Repeat2} color="text-purple-400" sourceColor="text-purple-700" />

            {a.recommended_actions?.length > 0 && (
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-sm text-white">Recommended Actions</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4 space-y-2">
                  {a.recommended_actions.map((action, i) => (
                    <div key={i} className="flex items-start gap-3 p-2.5 bg-zinc-800/50 rounded border border-zinc-700">
                      <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">{i + 1}</span>
                      <span className="text-xs text-zinc-200">{action}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}