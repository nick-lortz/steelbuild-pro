import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, MessageSquareWarning, ChevronDown, ChevronUp, Wand2, Send, Clock, AlertTriangle, Shield, Copy, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

const PRIORITY_CONFIG = {
  critical: { badge: 'bg-red-500/20 text-red-400 border-red-500/30', dot: 'bg-red-500' },
  high:     { badge: 'bg-orange-500/20 text-orange-400 border-orange-500/30', dot: 'bg-orange-500' },
  medium:   { badge: 'bg-amber-500/20 text-amber-400 border-amber-500/30', dot: 'bg-amber-400' },
  low:      { badge: 'bg-zinc-700 text-zinc-400', dot: 'bg-zinc-600' },
};

function RFICard({ rfi, onSendToChat }) {
  const [expanded, setExpanded] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const [draft, setDraft] = useState('');
  const [copied, setCopied] = useState(false);

  const daysOpen = Math.floor((new Date() - new Date(rfi.submitted_date || rfi.created_date)) / 86400000);
  const isInstallBlocker = rfi.is_install_blocker || rfi.fab_blocker;
  const priority = rfi.priority || 'medium';
  const cfg = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.medium;

  const generateDraft = async () => {
    setDrafting(true);
    try {
      const { data } = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a structural steel PM. Draft a professional, ready-to-send follow-up message for this overdue/open RFI.

RFI #${rfi.rfi_number} — ${rfi.subject}
Status: ${rfi.status} | Days Open: ${daysOpen} | Ball in Court: ${rfi.ball_in_court}
Priority: ${priority} | Install Blocker: ${isInstallBlocker ? 'YES' : 'No'}
Question: ${rfi.question || '(not provided)'}
Assigned To: ${rfi.assigned_to || 'Not assigned'} | Response Owner: ${rfi.response_owner || 'Unknown'}

Write a concise, professional follow-up email (no greeting/signature needed, 3-4 sentences max). Be direct. State the urgency, what's blocked, and the required response date. Use steel PM language.`
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
    <Card className={cn('bg-zinc-900 border', isInstallBlocker ? 'border-red-500/40' : 'border-zinc-800')}>
      <div className="p-3 cursor-pointer" onClick={() => setExpanded(v => !v)}>
        <div className="flex items-start gap-3">
          <div className={cn('w-2 h-2 rounded-full mt-1.5 flex-shrink-0', cfg.dot)} />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <span className="text-[10px] text-zinc-500 font-mono">RFI-{rfi.rfi_number}</span>
                <p className="text-sm font-medium text-white leading-tight">{rfi.subject}</p>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {isInstallBlocker && (
                  <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-[9px] px-1.5 py-0">BLOCKER</Badge>
                )}
                <Badge className={cn('text-[9px] px-1.5 py-0 border', cfg.badge)}>{priority}</Badge>
                <Badge className="bg-zinc-800 text-zinc-400 text-[9px] px-1.5 py-0 font-mono">{daysOpen}d open</Badge>
              </div>
            </div>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-[10px] text-zinc-600">BIC: <span className="text-zinc-400">{rfi.ball_in_court || '—'}</span></span>
              {rfi.due_date && (
                <span className={cn('text-[10px]', new Date(rfi.due_date) < new Date() ? 'text-red-400 font-semibold' : 'text-zinc-500')}>
                  Due: {rfi.due_date}
                </span>
              )}
              {rfi.assigned_to && <span className="text-[10px] text-zinc-600">→ {rfi.assigned_to}</span>}
            </div>
          </div>
          {expanded ? <ChevronUp size={14} className="text-zinc-600 flex-shrink-0 mt-1" /> : <ChevronDown size={14} className="text-zinc-600 flex-shrink-0 mt-1" />}
        </div>
      </div>

      {expanded && (
        <div className="px-3 pb-3 border-t border-zinc-800 pt-3 space-y-3">
          {rfi.question && (
            <div>
              <p className="text-[10px] text-zinc-600 uppercase tracking-widest mb-1">Question</p>
              <p className="text-xs text-zinc-300">{rfi.question}</p>
            </div>
          )}
          {rfi.impact_notes && (
            <div>
              <p className="text-[10px] text-zinc-600 uppercase tracking-widest mb-1">Impact</p>
              <p className="text-xs text-zinc-400">{rfi.impact_notes}</p>
            </div>
          )}

          {/* Draft follow-up */}
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={generateDraft} disabled={drafting} className="border-zinc-700 text-xs h-7">
              {drafting ? <Loader2 size={11} className="mr-1.5 animate-spin" /> : <Wand2 size={11} className="mr-1.5" />}
              Draft Follow-Up
            </Button>
            {onSendToChat && (
              <Button size="sm" variant="outline" onClick={() => onSendToChat(`RFI-${rfi.rfi_number}: "${rfi.subject}" has been open ${daysOpen} days. BIC: ${rfi.ball_in_court}. ${isInstallBlocker ? 'This is an install blocker.' : ''} What's the best way to expedite a response?`)} className="border-zinc-700 text-xs h-7">
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

export default function RFIIntelligence({ activeProjectId, onSendToChat }) {
  const [filter, setFilter] = useState('blockers'); // blockers | aging | all

  const { data: rfis = [], isLoading } = useQuery({
    queryKey: ['rfi-intel', activeProjectId],
    queryFn: () => base44.entities.RFI.filter({ project_id: activeProjectId }),
    enabled: !!activeProjectId,
    staleTime: 2 * 60 * 1000
  });

  const now = new Date();
  const openRFIs = rfis.filter(r => !['closed', 'answered'].includes(r.status));
  const blockers = openRFIs.filter(r => r.is_install_blocker || r.fab_blocker);
  const aging = openRFIs.filter(r => Math.floor((now - new Date(r.submitted_date || r.created_date)) / 86400000) >= 14);
  const overdue = openRFIs.filter(r => r.due_date && new Date(r.due_date) < now);

  const displayed = filter === 'blockers' ? blockers
    : filter === 'aging' ? aging
    : filter === 'overdue' ? overdue
    : openRFIs;

  const sorted = [...displayed].sort((a, b) => {
    const pOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    const blocker = (b.is_install_blocker || b.fab_blocker ? 1 : 0) - (a.is_install_blocker || a.fab_blocker ? 1 : 0);
    if (blocker !== 0) return blocker;
    return (pOrder[a.priority] ?? 2) - (pOrder[b.priority] ?? 2);
  });

  const FILTERS = [
    { key: 'blockers', label: 'Install Blockers', icon: Shield, count: blockers.length, color: 'text-red-400' },
    { key: 'overdue', label: 'Overdue', icon: AlertTriangle, count: overdue.length, color: 'text-orange-400' },
    { key: 'aging', label: 'Aging (14d+)', icon: Clock, count: aging.length, color: 'text-amber-400' },
    { key: 'all', label: 'All Open', icon: MessageSquareWarning, count: openRFIs.length, color: 'text-zinc-400' },
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b border-zinc-800 flex-wrap gap-3">
        <div>
          <h3 className="text-sm font-bold text-white">RFI Intelligence</h3>
          <p className="text-xs text-zinc-500 mt-0.5">Priority-ranked open RFIs with AI draft follow-ups</p>
        </div>
        {onSendToChat && openRFIs.length > 0 && (
          <Button size="sm" variant="outline" onClick={() => onSendToChat(`I have ${openRFIs.length} open RFIs — ${blockers.length} install blockers, ${overdue.length} overdue, ${aging.length} aging 14+ days. What's the recommended prioritization and escalation strategy?`)} className="border-zinc-700 text-xs">
            <Send size={12} className="mr-1.5" />Prioritize All
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
            <p className="text-zinc-400 text-sm">No {filter === 'all' ? 'open' : filter} RFIs</p>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-2">
            <p className="text-[10px] text-zinc-600 font-mono mb-3">{sorted.length} RFIs — sorted by blocker status then priority</p>
            {sorted.map(rfi => (
              <RFICard key={rfi.id} rfi={rfi} onSendToChat={onSendToChat} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}