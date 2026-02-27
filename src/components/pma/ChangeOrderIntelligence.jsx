import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  FileCheck, Clock, DollarSign, ChevronDown, ChevronUp,
  Send, Wand2, Loader2, CheckCircle2, AlertTriangle, Copy
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

const STATUS_CONFIG = {
  draft:        { badge: 'bg-zinc-700 text-zinc-300', label: 'Draft' },
  submitted:    { badge: 'bg-blue-500/20 text-blue-400 border-blue-500/30', label: 'Submitted' },
  under_review: { badge: 'bg-amber-500/20 text-amber-400 border-amber-500/30', label: 'Under Review' },
  approved:     { badge: 'bg-green-500/20 text-green-400 border-green-500/30', label: 'Approved' },
  rejected:     { badge: 'bg-red-500/20 text-red-400 border-red-500/30', label: 'Rejected' },
  void:         { badge: 'bg-zinc-700 text-zinc-500', label: 'Void' },
};

function COCard({ co, onSendToChat }) {
  const [expanded, setExpanded] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const [draft, setDraft] = useState('');
  const [copied, setCopied] = useState(false);

  const cfg = STATUS_CONFIG[co.status] || STATUS_CONFIG.draft;
  const age = co.submitted_date
    ? Math.floor((new Date() - new Date(co.submitted_date)) / 86400000)
    : null;
  const isPending = ['submitted', 'under_review'].includes(co.status);

  const generateNarrative = async () => {
    setDrafting(true);
    try {
      const { data } = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a structural steel PM. Draft a concise, professional follow-up or approval-request narrative for this change order.

CO #${co.co_number} — ${co.title}
Status: ${co.status} | Cost Impact: $${(co.cost_impact || 0).toLocaleString()} | Schedule Impact: ${co.schedule_impact_days || 0} days
Description: ${co.description || '(none)'}
Days Since Submission: ${age ?? 'N/A'}

Write 3-4 sentences. If pending, focus on urgency and cash flow impact. If approved, draft a concise approval acknowledgment. Use steel PM language. No greeting/signature.`
      });
      setDraft(data);
    } catch {
      toast.error('Draft generation failed');
    } finally {
      setDrafting(false);
    }
  };

  const copyDraft = () => {
    navigator.clipboard.writeText(draft);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Draft copied');
  };

  return (
    <Card className={cn('bg-zinc-900', isPending && age >= 14 ? 'border-amber-500/40' : 'border-zinc-800')}>
      <div className="p-3 cursor-pointer" onClick={() => setExpanded(v => !v)}>
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <span className="text-[10px] text-zinc-500 font-mono">CO-{co.co_number}</span>
                <p className="text-sm font-medium text-white leading-tight">{co.title}</p>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap justify-end">
                <Badge className={cn('text-[9px] px-1.5 py-0 border', cfg.badge)}>{cfg.label}</Badge>
                {co.cost_impact !== 0 && (
                  <Badge className={cn('text-[9px] px-1.5 py-0 font-mono border',
                    co.cost_impact > 0 ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'
                  )}>
                    {co.cost_impact > 0 ? '+' : ''}${(co.cost_impact || 0).toLocaleString()}
                  </Badge>
                )}
                {age !== null && (
                  <Badge className={cn('text-[9px] px-1.5 py-0 font-mono',
                    age >= 21 ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                    age >= 14 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                    'bg-zinc-800 text-zinc-400'
                  )}>
                    {age}d old
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3 mt-1">
              {co.schedule_impact_days !== 0 && co.schedule_impact_days && (
                <span className="text-[10px] text-zinc-500">
                  {co.schedule_impact_days > 0 ? '+' : ''}{co.schedule_impact_days}d schedule
                </span>
              )}
              {co.approved_by && <span className="text-[10px] text-zinc-600">Approved by: {co.approved_by}</span>}
            </div>
          </div>
          {expanded ? <ChevronUp size={14} className="text-zinc-600 flex-shrink-0 mt-1" /> : <ChevronDown size={14} className="text-zinc-600 flex-shrink-0 mt-1" />}
        </div>
      </div>

      {expanded && (
        <div className="px-3 pb-3 border-t border-zinc-800 pt-3 space-y-3">
          {co.description && (
            <div>
              <p className="text-[10px] text-zinc-600 uppercase tracking-widest mb-1">Description</p>
              <p className="text-xs text-zinc-300">{co.description}</p>
            </div>
          )}

          {/* SOV Allocations summary */}
          {co.sov_allocations?.length > 0 && (
            <div>
              <p className="text-[10px] text-zinc-600 uppercase tracking-widest mb-1">SOV Allocations</p>
              <div className="space-y-1">
                {co.sov_allocations.map((alloc, i) => (
                  <div key={i} className="flex justify-between text-xs text-zinc-400 bg-zinc-800/40 rounded px-2 py-1">
                    <span className="truncate">{alloc.description || alloc.sov_item_id}</span>
                    <span className="font-mono ml-2 flex-shrink-0">${(alloc.amount || 0).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={generateNarrative} disabled={drafting} className="border-zinc-700 text-xs h-7">
              {drafting ? <Loader2 size={11} className="mr-1.5 animate-spin" /> : <Wand2 size={11} className="mr-1.5" />}
              Draft Narrative
            </Button>
            {onSendToChat && (
              <Button size="sm" variant="outline" onClick={() => onSendToChat(`CO-${co.co_number} "${co.title}" — Status: ${co.status}, Value: $${(co.cost_impact || 0).toLocaleString()}, ${age !== null ? `${age} days since submission` : ''}. What's the strategy to get this approved?`)} className="border-zinc-700 text-xs h-7">
                <Send size={11} className="mr-1.5" />Ask PMA
              </Button>
            )}
          </div>

          {draft && (
            <div className="bg-zinc-800/60 rounded border border-zinc-700 p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-zinc-500 uppercase tracking-widest">Draft Narrative</span>
                <Button size="sm" variant="ghost" onClick={copyDraft} className="h-6 text-[10px] text-zinc-400 hover:text-white px-2">
                  {copied ? <><CheckCircle2 size={10} className="mr-1 text-green-400" />Copied</> : <><Copy size={10} className="mr-1" />Copy</>}
                </Button>
              </div>
              <Textarea value={draft} onChange={e => setDraft(e.target.value)} className="bg-zinc-900 border-zinc-700 text-xs text-zinc-200 resize-none h-24" />
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

export default function ChangeOrderIntelligence({ activeProjectId, onSendToChat }) {
  const [filter, setFilter] = useState('pending');

  const { data: cos = [], isLoading } = useQuery({
    queryKey: ['co-intel', activeProjectId],
    queryFn: () => base44.entities.ChangeOrder.filter({ project_id: activeProjectId }),
    enabled: !!activeProjectId,
    staleTime: 2 * 60 * 1000
  });

  const pending = cos.filter(c => ['submitted', 'under_review'].includes(c.status));
  const aging = pending.filter(c => {
    if (!c.submitted_date) return false;
    return Math.floor((new Date() - new Date(c.submitted_date)) / 86400000) >= 14;
  });
  const approved = cos.filter(c => c.status === 'approved');
  const drafts = cos.filter(c => c.status === 'draft');

  const displayed = filter === 'pending' ? pending
    : filter === 'aging' ? aging
    : filter === 'approved' ? approved
    : filter === 'drafts' ? drafts
    : cos;

  const totalPendingValue = pending.reduce((sum, c) => sum + (c.cost_impact || 0), 0);
  const totalApprovedValue = approved.reduce((sum, c) => sum + (c.cost_impact || 0), 0);

  const FILTERS = [
    { key: 'pending', label: 'Pending Approval', count: pending.length, color: 'text-amber-400' },
    { key: 'aging', label: 'Aging (14d+)', count: aging.length, color: 'text-red-400' },
    { key: 'approved', label: 'Approved', count: approved.length, color: 'text-green-400' },
    { key: 'drafts', label: 'Drafts', count: drafts.length, color: 'text-zinc-400' },
    { key: 'all', label: 'All', count: cos.length, color: 'text-zinc-400' },
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b border-zinc-800 flex-wrap gap-3">
        <div>
          <h3 className="text-sm font-bold text-white">Change Order Intelligence</h3>
          <p className="text-xs text-zinc-500 mt-0.5">Pending approvals, aging COs, SOV impact, AI narratives</p>
        </div>
        {onSendToChat && cos.length > 0 && (
          <Button size="sm" variant="outline" onClick={() => onSendToChat(`I have ${pending.length} pending COs totaling $${totalPendingValue.toLocaleString()} awaiting approval — ${aging.length} are aging 14+ days. Total approved CO value: $${totalApprovedValue.toLocaleString()}. What's my best strategy to close these out?`)} className="border-zinc-700 text-xs">
            <Send size={12} className="mr-1.5" />Strategize
          </Button>
        )}
      </div>

      {/* Summary strip */}
      {cos.length > 0 && (
        <div className="grid grid-cols-3 gap-2 p-3 border-b border-zinc-800">
          <div className="bg-zinc-900 rounded-lg p-2 text-center">
            <div className="text-[9px] text-zinc-600 uppercase tracking-widest">Pending Value</div>
            <div className="text-sm font-bold font-mono text-amber-400">${totalPendingValue.toLocaleString()}</div>
          </div>
          <div className="bg-zinc-900 rounded-lg p-2 text-center">
            <div className="text-[9px] text-zinc-600 uppercase tracking-widest">Approved Value</div>
            <div className="text-sm font-bold font-mono text-green-400">${totalApprovedValue.toLocaleString()}</div>
          </div>
          <div className="bg-zinc-900 rounded-lg p-2 text-center">
            <div className="text-[9px] text-zinc-600 uppercase tracking-widest">Aging COs</div>
            <div className={cn('text-sm font-bold font-mono', aging.length > 0 ? 'text-red-400' : 'text-green-400')}>{aging.length}</div>
          </div>
        </div>
      )}

      {/* Filter strip */}
      <div className="flex-shrink-0 flex gap-2 px-4 py-2.5 border-b border-zinc-800 overflow-x-auto">
        {FILTERS.map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-all border',
              filter === f.key ? 'bg-zinc-800 border-zinc-600 text-white' : 'border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700')}>
            {f.label}
            <span className={cn('font-mono font-bold ml-0.5', f.count > 0 ? f.color : 'text-zinc-600')}>{f.count}</span>
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
          </div>
        ) : displayed.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <CheckCircle2 className="w-12 h-12 text-green-500/50 mx-auto mb-4" />
            <p className="text-zinc-400 text-sm">No {filter === 'all' ? '' : filter} change orders</p>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-2">
            <p className="text-[10px] text-zinc-600 font-mono mb-3">{displayed.length} COs — sorted by age</p>
            {[...displayed].sort((a, b) => {
              const aAge = a.submitted_date ? new Date() - new Date(a.submitted_date) : 0;
              const bAge = b.submitted_date ? new Date() - new Date(b.submitted_date) : 0;
              return bAge - aAge;
            }).map(co => (
              <COCard key={co.id} co={co} onSendToChat={onSendToChat} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}