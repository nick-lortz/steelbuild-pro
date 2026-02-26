import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, GitBranch, Play, ChevronDown, ChevronUp, Send, Plus, Calendar, DollarSign, AlertTriangle, Zap, TrendingDown, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const SCENARIOS = [
  { value: 'add_crew',            label: 'Add Field Crew',           desc: 'Model impact of adding labor to accelerate work', params: [{ key: 'crew_count', label: 'Crew Count', default: 1 }, { key: 'daily_rate', label: 'Daily Rate/Crew ($)', default: 2400 }, { key: 'duration_days', label: 'Duration (days)', default: 30 }] },
  { value: 'add_shift',           label: 'Add Overtime / 2nd Shift', desc: 'Estimate OT cost vs schedule recovery',            params: [{ key: 'duration_days', label: 'Duration (days)', default: 14 }, { key: 'crew_size', label: 'Crew Size', default: 6 }, { key: 'ot_hourly_premium', label: 'OT Premium ($/hr)', default: 28 }] },
  { value: 'delay_delivery',      label: 'Delay a Delivery',         desc: 'Impact of a late or rescheduled truck',            params: [{ key: 'delay_days', label: 'Delay (days)', default: 7 }, { key: 'piece_count', label: 'Pieces Affected', default: 20 }] },
  { value: 'hold_rfi',            label: 'Hold Work on Open RFI',    desc: 'Cost and schedule of waiting on an unanswered RFI', params: [{ key: 'hold_days', label: 'Hold Duration (days)', default: 5 }, { key: 'crew_size', label: 'Crew Size on Hold', default: 6 }] },
  { value: 'accelerate_phase',    label: 'Accelerate a Phase',       desc: 'Compress a phase with premium resources/overtime',  params: [{ key: 'target_days', label: 'Days to Save', default: 10 }, { key: 'cost_premium', label: 'Premium Cost ($)', default: 15000 }] },
  { value: 'drop_scope',          label: 'Drop / Defer Scope',       desc: 'Model schedule and budget impact of reducing scope',params: [{ key: 'scope_value', label: 'Scope Value ($)', default: 50000 }, { key: 'days_recovered', label: 'Days Recovered', default: 5 }] },
  { value: 'extend_schedule',     label: 'Extend Schedule',          desc: 'Cost of a schedule extension (general conditions)', params: [{ key: 'extension_days', label: 'Extension (days)', default: 14 }, { key: 'daily_job_cost', label: 'Daily Job Cost ($)', default: 3500 }] },
  { value: 'resolve_rfi_blockers',label: 'Resolve All Install Blockers', desc: 'Impact of clearing all blocking RFIs today',   params: [] },
  { value: 'custom',              label: 'Custom Scenario',          desc: 'Describe any scenario in plain language',         params: [] },
];

function ImpactBadge({ value, unit = 'days', invertColor = false }) {
  if (value === undefined || value === null) return null;
  const num = parseFloat(value);
  const isGood = invertColor ? num > 0 : num < 0;
  const label = `${num > 0 ? '+' : ''}${num}${unit}`;
  return (
    <Badge className={cn('font-mono text-xs border', isGood ? 'bg-green-500/20 text-green-400 border-green-500/30' : num === 0 ? 'bg-zinc-700 text-zinc-400' : 'bg-red-500/20 text-red-400 border-red-500/30')}>
      {isGood ? <TrendingDown size={10} className="mr-1" /> : <TrendingUp size={10} className="mr-1" />}
      {label}
    </Badge>
  );
}

export default function WhatIfScenario({ activeProjectId, onSendToChat }) {
  const [selectedScenario, setSelectedScenario] = useState('');
  const [params, setParams] = useState({});
  const [customText, setCustomText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  const scenarioDef = SCENARIOS.find(s => s.value === selectedScenario);

  const setParam = (key, val) => setParams(p => ({ ...p, [key]: parseFloat(val) || val }));

  const run = async () => {
    if (!selectedScenario) { toast.error('Select a scenario first'); return; }
    setLoading(true);
    try {
      const payload = {
        project_id: activeProjectId,
        scenario_type: selectedScenario === 'custom' ? undefined : selectedScenario,
        scenario_params: params,
        custom_scenario: selectedScenario === 'custom' ? customText : undefined,
      };
      const { data } = await base44.functions.invoke('pmaWhatIfScenario', payload);
      setResult(data);
      setHistory(h => [{ scenario: scenarioDef?.label || 'Custom', result: data, ts: new Date().toLocaleTimeString() }, ...h].slice(0, 5));
    } catch {
      toast.error('What-if analysis failed');
    } finally {
      setLoading(false);
    }
  };

  const a = result?.analysis;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b border-zinc-800">
        <div>
          <h3 className="text-sm font-bold text-white">What-If Scenario Modeler</h3>
          <p className="text-xs text-zinc-500 mt-0.5">Explore schedule and budget impact before committing to a decision</p>
        </div>
        <div className="flex gap-2">
          {result && onSendToChat && a && (
            <Button size="sm" variant="outline" onClick={() => onSendToChat(`What-if analysis for "${a.scenario_label}": Schedule impact ${a.schedule_impact?.days > 0 ? '+' : ''}${a.schedule_impact?.days} days, cost impact $${(a.cost_impact?.total_impact || 0).toLocaleString()}. ${a.executive_summary} What's your recommendation?`)} className="border-zinc-700 text-xs">
              <Send size={12} className="mr-1.5" />Discuss
            </Button>
          )}
          {history.length > 0 && (
            <Button size="sm" variant="outline" onClick={() => setShowHistory(v => !v)} className="border-zinc-700 text-xs">
              History ({history.length})
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-3xl mx-auto space-y-4">
          {/* Scenario picker */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-4 space-y-4">
              <div>
                <label className="text-[10px] text-zinc-500 uppercase tracking-widest block mb-2">Scenario Type</label>
                <Select value={selectedScenario} onValueChange={v => { setSelectedScenario(v); setParams({}); setResult(null); }}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                    <SelectValue placeholder="Choose a scenario to model..." />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-700">
                    {SCENARIOS.map(s => (
                      <SelectItem key={s.value} value={s.value} className="text-xs">
                        <div>
                          <span className="font-medium">{s.label}</span>
                          <span className="text-zinc-500 ml-2 text-[10px]">{s.desc}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Params */}
              {scenarioDef?.params?.length > 0 && (
                <div className="grid grid-cols-2 gap-3">
                  {scenarioDef.params.map(p => (
                    <div key={p.key}>
                      <label className="text-[10px] text-zinc-500 uppercase tracking-widest block mb-1">{p.label}</label>
                      <Input
                        type="number"
                        defaultValue={p.default}
                        onChange={e => setParam(p.key, e.target.value)}
                        className="bg-zinc-800 border-zinc-700 text-white text-sm h-8"
                      />
                    </div>
                  ))}
                </div>
              )}

              {selectedScenario === 'custom' && (
                <div>
                  <label className="text-[10px] text-zinc-500 uppercase tracking-widest block mb-1">Describe the Scenario</label>
                  <Textarea
                    value={customText}
                    onChange={e => setCustomText(e.target.value)}
                    placeholder="e.g. What if we delay the bolt-up crew by 2 weeks while we wait for the embed inspection?"
                    className="bg-zinc-800 border-zinc-700 text-white text-sm h-20 resize-none"
                  />
                </div>
              )}

              <Button onClick={run} disabled={loading || !selectedScenario} className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold">
                {loading ? <><Loader2 size={14} className="mr-2 animate-spin" />Modeling...</> : <><Play size={14} className="mr-2" />Run What-If Analysis</>}
              </Button>
            </CardContent>
          </Card>

          {/* Result */}
          {result && !loading && a && (
            <>
              {/* Impact strip */}
              <Card className="bg-zinc-900 border-zinc-800">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <GitBranch className="w-4 h-4 text-amber-400" />
                    <span className="text-sm font-bold text-white">{a.scenario_label}</span>
                  </div>
                  <p className="text-xs text-zinc-300 mb-4">{a.executive_summary}</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-zinc-800/60 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar size={12} className="text-zinc-500" />
                        <span className="text-[10px] text-zinc-500 uppercase tracking-widest">Schedule Impact</span>
                      </div>
                      <ImpactBadge value={a.schedule_impact?.days} unit=" days" />
                      {a.schedule_impact?.new_completion_date && (
                        <div className="text-[10px] text-zinc-500 mt-1">New completion: {a.schedule_impact.new_completion_date}</div>
                      )}
                      {a.schedule_impact?.confidence && (
                        <div className="text-[10px] text-zinc-600 mt-0.5">Confidence: {a.schedule_impact.confidence}</div>
                      )}
                    </div>
                    <div className="bg-zinc-800/60 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <DollarSign size={12} className="text-zinc-500" />
                        <span className="text-[10px] text-zinc-500 uppercase tracking-widest">Cost Impact</span>
                      </div>
                      <ImpactBadge value={a.cost_impact?.total_impact?.toLocaleString() || 0} unit="" invertColor />
                      {a.cost_impact?.notes && <div className="text-[10px] text-zinc-500 mt-1">{a.cost_impact.notes}</div>}
                    </div>
                  </div>

                  {/* Recommendation */}
                  {a.recommendation && (
                    <div className="mt-3 p-3 bg-blue-500/5 border border-blue-500/20 rounded-lg">
                      <div className="text-[10px] text-blue-400 uppercase tracking-widest mb-1 flex items-center gap-1"><Zap size={10} />Recommendation</div>
                      <p className="text-xs text-zinc-200 font-medium">{a.recommendation}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Risks & Opportunities */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {a.risks?.length > 0 && (
                  <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader className="pb-2 pt-4 px-4">
                      <CardTitle className="text-sm text-white flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-red-400" />Risks</CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-4 space-y-1.5">
                      {a.risks.map((r, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs text-zinc-300">
                          <span className="text-red-400 mt-0.5 flex-shrink-0">•</span>{r}
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
                {a.second_order_effects?.length > 0 && (
                  <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader className="pb-2 pt-4 px-4">
                      <CardTitle className="text-sm text-white flex items-center gap-2"><GitBranch className="w-4 h-4 text-purple-400" />Downstream Effects</CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-4 space-y-1.5">
                      {a.second_order_effects.map((e, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs text-zinc-300">
                          <span className="text-purple-400 mt-0.5 flex-shrink-0">•</span>{e}
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Alternatives */}
              {a.alternative_approaches?.length > 0 && (
                <Card className="bg-zinc-900 border-zinc-800">
                  <CardHeader className="pb-2 pt-4 px-4">
                    <CardTitle className="text-sm text-white">Alternative Approaches</CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4 space-y-2">
                    {a.alternative_approaches.map((alt, i) => (
                      <div key={i} className="flex items-start gap-3 p-2.5 bg-zinc-800/50 rounded border border-zinc-700">
                        <span className="w-5 h-5 rounded-full bg-zinc-700 text-zinc-400 flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">{i + 1}</span>
                        <span className="text-xs text-zinc-300">{alt}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {/* History */}
          {showHistory && history.length > 0 && (
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm text-white">Recent Scenarios</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-2">
                {history.map((h, i) => (
                  <button key={i} onClick={() => setResult(h.result)} className="w-full flex items-center justify-between p-2.5 bg-zinc-800/50 rounded border border-zinc-700 hover:border-zinc-600 text-left transition-colors">
                    <span className="text-xs font-medium text-white">{h.scenario}</span>
                    <span className="text-[10px] text-zinc-600 font-mono">{h.ts}</span>
                  </button>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}