import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, TrendingUp, TrendingDown, DollarSign, RefreshCw, Send, AlertTriangle, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';

function MarginBar({ label, value, max, color }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-zinc-400">{label}</span>
        <span className="font-mono text-white">${value.toLocaleString()}</span>
      </div>
      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function KPITile({ label, value, sub, color = 'text-white', trend }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3">
      <div className="text-[9px] text-zinc-600 uppercase tracking-widest mb-1">{label}</div>
      <div className={cn('text-xl font-bold font-mono', color)}>{value}</div>
      {sub && <div className="text-[10px] text-zinc-500 mt-0.5">{sub}</div>}
      {trend !== undefined && (
        <div className={cn('flex items-center gap-0.5 text-[10px] mt-1', trend >= 0 ? 'text-green-400' : 'text-red-400')}>
          {trend >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
          {trend >= 0 ? '+' : ''}{trend}% vs budget
        </div>
      )}
    </div>
  );
}

export default function MarginPulse({ activeProjectId, onSendToChat }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const { data: project } = useQuery({
    queryKey: ['project-margin', activeProjectId],
    queryFn: async () => {
      const rows = await base44.entities.Project.filter({ id: activeProjectId });
      return rows[0];
    },
    enabled: !!activeProjectId
  });

  const run = async () => {
    setLoading(true);
    try {
      // Pull financials, expenses, approved COs in parallel
      const [financials, cos, expenses] = await Promise.all([
        base44.entities.Financial.filter({ project_id: activeProjectId }),
        base44.entities.ChangeOrder.filter({ project_id: activeProjectId }),
        base44.entities.Expense.filter({ project_id: activeProjectId }).catch(() => [])
      ]);

      const contractValue = project?.contract_value || 0;
      const approvedCOs = cos.filter(c => c.status === 'approved');
      const pendingCOs = cos.filter(c => ['submitted', 'under_review'].includes(c.status));
      const approvedCOValue = approvedCOs.reduce((s, c) => s + (c.cost_impact || 0), 0);
      const pendingCOValue = pendingCOs.reduce((s, c) => s + (c.cost_impact || 0), 0);

      const revisedContract = contractValue + approvedCOValue;
      const totalBudget = financials.reduce((s, f) => s + (f.current_budget || f.original_budget || 0), 0);
      const totalActual = financials.reduce((s, f) => s + (f.actual_amount || 0), 0);
      const totalCommitted = financials.reduce((s, f) => s + (f.committed_amount || 0), 0);
      const totalForecast = financials.reduce((s, f) => s + (f.forecast_amount || f.actual_amount || 0), 0);

      const expenseTotal = expenses.reduce((s, e) => s + (e.amount || 0), 0);
      const combinedActual = Math.max(totalActual, expenseTotal);

      const grossMargin = revisedContract - totalForecast;
      const grossMarginPct = revisedContract > 0 ? ((grossMargin / revisedContract) * 100).toFixed(1) : 0;
      const spentPct = totalBudget > 0 ? ((combinedActual / totalBudget) * 100).toFixed(1) : 0;

      const byCategory = financials.reduce((acc, f) => {
        const cat = f.category || 'other';
        if (!acc[cat]) acc[cat] = { budget: 0, actual: 0, forecast: 0 };
        acc[cat].budget += f.current_budget || f.original_budget || 0;
        acc[cat].actual += f.actual_amount || 0;
        acc[cat].forecast += f.forecast_amount || f.actual_amount || 0;
        return acc;
      }, {});

      // AI narrative
      const { data: aiData } = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a structural steel PM reviewing project financials. Provide a concise 3-sentence margin health narrative.

Contract: $${contractValue.toLocaleString()} + $${approvedCOValue.toLocaleString()} approved COs = $${revisedContract.toLocaleString()} revised
Total Budget: $${totalBudget.toLocaleString()} | Actual Spent: $${combinedActual.toLocaleString()} (${spentPct}% of budget)
Forecast at Completion: $${totalForecast.toLocaleString()} | Gross Margin: $${grossMargin.toLocaleString()} (${grossMarginPct}%)
Pending CO Value: $${pendingCOValue.toLocaleString()} | Committed: $${totalCommitted.toLocaleString()}

Identify the biggest margin risk and one concrete mitigation action. Use steel PM language. Be direct.`,
        response_json_schema: null
      });

      setResult({
        contractValue,
        revisedContract,
        approvedCOValue,
        pendingCOValue,
        totalBudget,
        combinedActual,
        totalForecast,
        totalCommitted,
        grossMargin,
        grossMarginPct,
        spentPct,
        byCategory,
        narrative: aiData,
        pendingCOs,
        approvedCOs
      });
    } catch (e) {
      toast.error('Margin analysis failed');
    } finally {
      setLoading(false);
    }
  };

  const r = result;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b border-zinc-800">
        <div>
          <h3 className="text-sm font-bold text-white">Margin Pulse</h3>
          <p className="text-xs text-zinc-500 mt-0.5">Budget vs actuals, forecast margin, cost-at-risk breakdown</p>
        </div>
        <div className="flex gap-2">
          {r && onSendToChat && (
            <Button size="sm" variant="outline" onClick={() => onSendToChat(`Margin pulse: Revised contract $${r.revisedContract.toLocaleString()}, forecast at completion $${r.totalForecast.toLocaleString()}, gross margin ${r.grossMarginPct}%. Spent ${r.spentPct}% of budget. $${r.pendingCOValue.toLocaleString()} in pending COs. ${r.narrative} What should I focus on to protect margin?`)} className="border-zinc-700 text-xs">
              <Send size={12} className="mr-1.5" />Discuss
            </Button>
          )}
          <Button size="sm" onClick={run} disabled={loading} className="bg-amber-500 hover:bg-amber-600 text-black text-xs font-bold">
            {loading ? <Loader2 size={12} className="mr-1.5 animate-spin" /> : <RefreshCw size={12} className="mr-1.5" />}
            {r ? 'Refresh' : 'Run Analysis'}
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {!r && !loading && (
          <div className="flex flex-col items-center justify-center h-full text-center py-16">
            <BarChart3 className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
            <p className="text-zinc-400 text-sm mb-2">Margin analysis not run yet</p>
            <p className="text-zinc-600 text-xs mb-6 max-w-sm">Pulls actuals, budget, COs, and forecast to give you a real-time margin snapshot with AI narrative.</p>
            <Button onClick={run} className="bg-amber-500 hover:bg-amber-600 text-black font-bold">Run Margin Pulse</Button>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center h-full py-16">
            <Loader2 className="w-10 h-10 text-amber-500 animate-spin mx-auto mb-4" />
            <p className="text-zinc-400 text-sm">Pulling financials and CO data...</p>
          </div>
        )}

        {r && !loading && (
          <div className="max-w-3xl mx-auto space-y-4">
            {/* KPI Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <KPITile
                label="Revised Contract"
                value={`$${r.revisedContract.toLocaleString()}`}
                sub={r.approvedCOValue > 0 ? `+$${r.approvedCOValue.toLocaleString()} COs` : 'No approved COs'}
                color="text-white"
              />
              <KPITile
                label="Forecast at Completion"
                value={`$${r.totalForecast.toLocaleString()}`}
                sub={`${r.spentPct}% budget spent`}
                color={r.totalForecast > r.revisedContract ? 'text-red-400' : 'text-white'}
              />
              <KPITile
                label="Gross Margin"
                value={`$${r.grossMargin.toLocaleString()}`}
                sub={`${r.grossMarginPct}% of contract`}
                color={r.grossMargin < 0 ? 'text-red-400' : parseFloat(r.grossMarginPct) < 8 ? 'text-amber-400' : 'text-green-400'}
              />
              <KPITile
                label="Pending CO Value"
                value={`$${r.pendingCOValue.toLocaleString()}`}
                sub={`${r.pendingCOs.length} COs pending`}
                color={r.pendingCOValue > 0 ? 'text-amber-400' : 'text-zinc-400'}
              />
            </div>

            {/* Budget vs Actual by Category */}
            {Object.keys(r.byCategory).length > 0 && (
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-sm text-white">Budget vs Actual by Category</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4 space-y-4">
                  {Object.entries(r.byCategory).map(([cat, data]) => {
                    const variance = data.actual - data.budget;
                    const varPct = data.budget > 0 ? ((variance / data.budget) * 100).toFixed(0) : 0;
                    return (
                      <div key={cat}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs text-zinc-300 capitalize font-medium">{cat}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-zinc-500">Budget: ${data.budget.toLocaleString()}</span>
                            <Badge className={cn('text-[9px] px-1.5 py-0 font-mono border',
                              variance > 0 ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                              'bg-green-500/20 text-green-400 border-green-500/30'
                            )}>
                              {variance > 0 ? '+' : ''}{varPct}%
                            </Badge>
                          </div>
                        </div>
                        <div className="relative h-2 bg-zinc-800 rounded-full overflow-hidden">
                          {/* Budget baseline */}
                          <div className="absolute inset-0 bg-zinc-700/50 rounded-full" />
                          {/* Actual */}
                          <div
                            className={cn('h-full rounded-full transition-all', data.actual > data.budget ? 'bg-red-500' : 'bg-blue-500')}
                            style={{ width: `${data.budget > 0 ? Math.min((data.actual / data.budget) * 100, 100) : 0}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[9px] text-zinc-600 mt-0.5">
                          <span>Actual: ${data.actual.toLocaleString()}</span>
                          <span>Forecast: ${data.forecast.toLocaleString()}</span>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}

            {/* AI Narrative */}
            {r.narrative && (
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-sm text-white flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-amber-400" />Margin Health Narrative
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <p className="text-sm text-zinc-300 leading-relaxed">{r.narrative}</p>
                </CardContent>
              </Card>
            )}

            {/* Pending CO table */}
            {r.pendingCOs.length > 0 && (
              <Card className="bg-amber-500/5 border-amber-500/20">
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-sm text-white flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />Pending COs — Not Yet Recognized
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4 space-y-1.5">
                  {r.pendingCOs.map(co => (
                    <div key={co.id} className="flex items-center justify-between text-xs p-2 bg-zinc-900/50 rounded border border-zinc-800">
                      <div>
                        <span className="font-mono text-zinc-500 mr-2">CO-{co.co_number}</span>
                        <span className="text-zinc-300">{co.title}</span>
                      </div>
                      <span className={cn('font-mono font-bold', co.cost_impact > 0 ? 'text-green-400' : 'text-red-400')}>
                        {co.cost_impact > 0 ? '+' : ''}${(co.cost_impact || 0).toLocaleString()}
                      </span>
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