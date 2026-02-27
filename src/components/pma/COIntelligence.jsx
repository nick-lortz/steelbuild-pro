import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Loader2, FileCheck, ChevronDown, ChevronUp, Wand2, Send,
  Clock, DollarSign, CheckCircle2, AlertTriangle, Copy
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

const STATUS_CONFIG = {
  draft:        { badge: 'bg-zinc-700 text-zinc-300', dot: 'bg-zinc-500' },
  submitted:    { badge: 'bg-blue-500/20 text-blue-400 border-blue-500/30', dot: 'bg-blue-500' },
  under_review: { badge: 'bg-amber-500/20 text-amber-400 border-amber-500/30', dot: 'bg-amber-400' },
  approved:     { badge: 'bg-green-500/20 text-green-400 border-green-500/30', dot: 'bg-green-500' },
  rejected:     { badge: 'bg-red-500/20 text-red-400 border-red-500/30', dot: 'bg-red-500' },
  void:         { badge: 'bg-zinc-800 text-zinc-600', dot: 'bg-zinc-700' },
};

function COCard({ co, onSendToChat }) {
  const [expanded, setExpanded] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const [draft, setDraft] = useState('');
  const [copied, setCopied] = useState(false);

  const cfg = STATUS_CONFIG[co.status] || STATUS_CONFIG.draft;
  const daysOpen = co.submitted_date
    ? Math.floor((new Date() - new Date(co.submitted_date)) / 86400000)
    : null;
  const isStale = daysOpen !== null && ['submitted', 'under_review'].includes(co.status) && daysOpen >= 14;

  const generateDraft = async () => {
    setDrafting(true);
    try {
      const { data } = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a structural steel PM. Draft a professional follow-up / approval request for this change order.

CO-${co.co_number}: ${co.title}
Status: ${co.status} | Days Since Submission: ${daysOpen ?? 'N/A'}
Cost Impact: $${(co.cost_impact || 0).toLocaleString()} | Schedule Impact: ${co.schedule_impact_days || 0} days
Description: ${co.description || '(not provided)'}

Write a concise, professional follow-up or nudge email (3-4 sentences, no greeting/signature). Be direct: state the CO, the dollar impact, what approval is needed by when, and consequences of delay. Steel PM language, ready to send.`
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
    <Card className={cn('bg-zinc-900 border', isStale ? 'border-amber-500/30' : 'border-zinc-800')}>
      <div className="p-3 cursor-pointer" onClick={() => setExpanded(v => !v)}>
        <div className="flex items-start gap-3">
          <div className={cn('w-2 h-2 rounded-full mt-1.5 flex-shrink-0', cfg.dot)} />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <span className="text-[10px] text-zinc-500 font-mono">CO-{co.co_number}</span>
                <p className="text-sm font-medium text-white leading-tight">{co.title}</p>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {isStale && (
                  <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-[9px] px-1.5 py-0">STALE</Badge>
                )}
                <Badge className={cn('text-[9px] px-1.5 py-0 border', cfg.badge)}>{co.status.replace('_', ' ')}</Badge>
              </div>
            </div>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              <span className="text-[10px] text-green-400 font-mono font-bold">
                ${(co.cost_impact || 0).toLocaleString()}
              </span>
              {co.schedule_impact_days > 0 && (
                <span className="text-[10px] text-orange-400">+{co.schedule_impact_days}d schedule</span>
              )}
              {daysOpen !== null && (
                <span className={cn('text-[10px]', isStale ? 'text-amber-400 font-semibold' : 'text-zinc-600')}>
                  {daysOpen}d pending
                </span>
              )}
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
          {co.sov_allocations?.length > 0 && (
            <div>
              <p className="text-[10px] text-zinc-600 uppercase tracking-widest mb-1">SOV Allocations</p>
              <div className="space-y-1">
                {co.sov_allocations.map((a, i) => (
                  <div key={i} className="flex justify-between text-xs bg-zinc-800/50 rounded px-2 py-1">
                    <span className="text-zinc-400 truncate">{a.description || a.sov_item_id}</span>
                    <span className="text-green-400 font-mono flex-shrink-0 ml-2">${(a.amount || 0).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={generateDraft} disabled={drafting} className="border-zinc-700 text-xs h-7">
              {drafting ? <Loader2 size={11} className="mr-1.5 animate-spin" /> : <Wand2 size={11} className="mr-1.5" />}
              Draft Follow-Up
            </Button>
            {onSendToChat && (
              <Button size="sm" variant="outline"
                onClick={() => onSendToChat(`CO-${co.co_number} "${co.title}" is ${co.status}, $${(co.cost_impact||0).toLocaleString()} impact, ${daysOpen ?? 0} days pending. What's the best strategy to get this approved?`)}
                className="border-zinc-700 text-xs h-7">
                <Send size={11} className="mr-1.5" />Ask PMA
              </Button>
            )}
          </div>

          {draft && (
            <div className="bg-zinc-800/60 rounded border border-zinc-700 p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-zinc-500 uppercase tracking-widest">Draft Follow-Up</span>
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

export default function COIntelligence({ activeProjectId, onSendToChat }) {
  const [filter, setFilter] = useState('pending');

  const { data: cos = [], isLoading } = useQuery({
    queryKey: ['co-intel', activeProjectId],
    queryFn: () => base44.entities.ChangeOrder.filter({ project_id: activeProjectId }),
    enabled: !!activeProjectId,
    staleTime: 2 * 60 * 1000
  });

  const pending = cos.filter(c => ['submitted', 'under_review'].includes(c.status));
  const stale = pending.filter(c => {
    const d = Math.floor((new Date() - new Date(c.submitted_date || c.created_date)) / 86400000);
    return d >= 14;
  });
  const drafts = cos.filter(c => c.status === 'draft');
  const approved = cos.filter(c => c.status === 'approved');

  const totalPendingValue = pending.reduce((sum, c) => sum + (c.cost_impact || 0), 0);

  const displayed = filter === 'pending' ? pending
    : filter === 'stale' ? stale
    : filter === 'draft' ? drafts
    : filter === 'approved' ? approved
    : cos;

  const sorted = [...displayed].sort((a, b) => (b.cost_impact || 0) - (a.cost_impact || 0));

  const FILTERS = [
    { key: 'pending', label: 'Pending Approval', icon: Clock, count: pending.length, color: 'text-amber-400' },
    { key: 'stale', label: 'Stale (14d+)', icon: AlertTriangle, count: stale.length, color: 'text-orange-400' },
    { key: 'draft', label: 'Draft', icon: FileCheck, count: drafts.length, color: 'text-zinc-400' },
    { key: 'approved', label: 'Approved', icon: CheckCircle2, count: approved.length, color: 'text-green-400' },
    { key: 'all', label: 'All', icon: DollarSign, count: cos.length, color: 'text-zinc-400' },
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b border-zinc-800 flex-wrap gap-3">
        <div>
          <h3 className="text-sm font-bold text-white">Change Order Intelligence</h3>
          <p className="text-xs text-zinc-500 mt-0.5">
            {pending.length} pending · <span className="text-green-400 font-mono">${totalPendingValue.toLocaleString()}</span> awaiting approval
          </p>
        </div>
        {onSendToChat && pending.length > 0 && (
          <Button size="sm" variant="outline"
            onClick={() => onSendToChat(`I have ${pending.length} change orders pending approval totaling $${totalPendingValue.toLocaleString()}. ${stale.length} are stale (14+ days). What's my best approval strategy and how do I protect margin?`)}
            className="border-zinc-700 text-xs">
            <Send size={12} className="mr-1.5" />Analyze All COs
          </Button>
        )}
      </div>

      {/* Filter strip */}
      <div className="flex-shrink-0 flex gap-2 px-4 py-2.5 border-b border-zinc-800 overflow-x-auto">
        {FILTERS.map(f => {
          const Icon = f.icon;
          return (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-all border',
                filter === f.key ? 'bg-zinc-800 border-zinc-600 text-white' : 'border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700')}>
              <Icon size={11} className={f.color} />
              {f.label}
              <span className={cn('font-mono font-bold ml-0.5', f.count > 0 ? f.color : 'text-zinc-600')}>{f.count}</span>
            </button>
          );
        })}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
          </div>
        ) : sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <CheckCircle2 className="w-12 h-12 text-green-500/50 mx-auto mb-4" />
            <p className="text-zinc-400 text-sm">No {filter === 'all' ? '' : filter} change orders</p>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-2">
            <p className="text-[10px] text-zinc-600 font-mono mb-3">{sorted.length} COs — sorted by cost impact</p>
            {sorted.map(co => (
              <COCard key={co.id} co={co} onSendToChat={onSendToChat} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}