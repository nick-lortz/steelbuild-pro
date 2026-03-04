/**
 * ContextPanel — right rail for ProjectSolver
 * Shows: active issue summary, risk score meter, top 3 solution proposals,
 * quick actions (Create CO, Assign Owner, Schedule Task, Open Drawing)
 */
import React, { useState } from 'react';
import { AlertTriangle, Shield, Lightbulb, FileSignature, User, Calendar, FileText, ChevronDown, ChevronUp, CheckCircle2, Clock, DollarSign, TrendingUp, Zap, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';

// ── Risk score meter ──────────────────────────────────────────────────────────
function RiskMeter({ score }) {
  // score: 0–5
  const pct = Math.min(100, (score / 5) * 100);
  const color = score >= 3.5 ? '#FF4D4D' : score >= 2 ? '#FFB15A' : '#4DD6A4';
  const label = score >= 3.5 ? 'HIGH' : score >= 2 ? 'MEDIUM' : 'LOW';

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[0.58rem] font-bold tracking-[0.12em] uppercase text-[rgba(255,255,255,0.35)]">Risk Score</span>
        <div className="flex items-center gap-1.5">
          <span className="text-[0.68rem] font-bold" style={{ color }}>{label}</span>
          <span className="text-[0.75rem] font-bold text-[rgba(255,255,255,0.88)]">{score.toFixed(1)}<span className="text-[rgba(255,255,255,0.30)] text-[0.58rem]">/5</span></span>
        </div>
      </div>
      <div className="h-2 rounded-full bg-[rgba(255,255,255,0.06)] overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: [0.65, 0, 0.35, 1] }}
          className="h-full rounded-full"
          style={{ background: `linear-gradient(90deg, ${color}99, ${color})` }}
        />
      </div>
      <div className="flex justify-between text-[0.52rem] text-[rgba(255,255,255,0.20)]">
        <span>LOW</span><span>MED</span><span>HIGH</span>
      </div>
    </div>
  );
}

// ── Proposal card ─────────────────────────────────────────────────────────────
const TYPE_BADGE = {
  standard:       { label: 'Standard',      color: '#4DA3FF' },
  mitigation:     { label: 'Mitigation',    color: '#FFB15A' },
  out_of_the_box: { label: 'Out-of-Box',    color: '#C084FC' },
};

function ProposalCard({ proposal, rank, onApply }) {
  const [expanded, setExpanded] = useState(false);
  const tb = TYPE_BADGE[proposal.proposal_type] || TYPE_BADGE.standard;
  const conf = Math.round((proposal.confidence_score || 0) * 100);

  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'rgba(255,255,255,0.07)', background: '#14181E' }}>
      <div className="flex items-start gap-2.5 px-3 pt-3 pb-2">
        <span className="flex-shrink-0 w-5 h-5 rounded-md flex items-center justify-center text-[0.6rem] font-black text-white mt-0.5"
          style={{ background: tb.color + '33', border: `1px solid ${tb.color}55`, color: tb.color }}
        >#{rank}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
            <span className="text-[0.58rem] font-bold tracking-[0.08em] uppercase px-1.5 py-0.5 rounded" style={{ background: tb.color + '18', color: tb.color }}>{tb.label}</span>
            <span className="text-[0.62rem] text-[rgba(255,255,255,0.30)]">{conf}% confidence</span>
          </div>
          <p className="text-[0.75rem] font-semibold text-[rgba(255,255,255,0.88)] leading-snug">{proposal.title}</p>
        </div>
        <button onClick={() => setExpanded(p => !p)} className="text-[rgba(255,255,255,0.25)] hover:text-[rgba(255,255,255,0.60)] transition-colors flex-shrink-0 mt-0.5">
          {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>
      </div>

      {/* Metrics row */}
      <div className="grid grid-cols-3 px-3 pb-2 gap-1">
        {[
          { icon: DollarSign, label: 'Cost', value: proposal.estimated_cost > 0 ? `$${proposal.estimated_cost.toLocaleString()}` : '—' },
          { icon: Clock, label: 'Delay', value: proposal.estimated_delay_days > 0 ? `+${proposal.estimated_delay_days}d` : '0d' },
          { icon: TrendingUp, label: 'Conf.', value: `${conf}%` },
        ].map(m => (
          <div key={m.label} className="flex flex-col items-center py-1.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
            <m.icon size={10} style={{ color: 'rgba(255,255,255,0.30)' }} />
            <span className="text-[0.65rem] font-bold text-[rgba(255,255,255,0.80)] mt-0.5">{m.value}</span>
            <span className="text-[0.52rem] text-[rgba(255,255,255,0.25)]">{m.label}</span>
          </div>
        ))}
      </div>

      {/* Expanded steps */}
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
              <p className="text-[0.65rem] text-[rgba(255,255,255,0.45)] mt-2 mb-1.5 leading-relaxed">{proposal.summary}</p>
              {proposal.steps?.slice(0, 3).map((step, i) => (
                <div key={i} className="flex gap-2 mb-1">
                  <span className="w-4 h-4 rounded-full flex items-center justify-center text-[0.52rem] font-black flex-shrink-0 mt-0.5" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.40)' }}>{step.order}</span>
                  <span className="text-[0.68rem] text-[rgba(255,255,255,0.60)]">{step.action}</span>
                </div>
              ))}
              {proposal.tradeoffs?.length > 0 && (
                <div className="mt-2 px-2 py-1.5 rounded-lg" style={{ background: 'rgba(255,177,90,0.06)', border: '1px solid rgba(255,177,90,0.12)' }}>
                  <p className="text-[0.58rem] font-bold tracking-[0.08em] uppercase text-[rgba(255,177,90,0.70)] mb-0.5">Tradeoffs</p>
                  {proposal.tradeoffs.slice(0, 2).map((t, i) => <p key={i} className="text-[0.62rem] text-[rgba(255,177,90,0.55)]">· {t}</p>)}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Apply button */}
      <div className="px-3 pb-3">
        <button onClick={() => onApply(proposal)}
          className="w-full py-1.5 rounded-lg text-[0.65rem] font-bold text-white transition-all hover:opacity-90"
          style={{ background: `linear-gradient(90deg, ${tb.color}99, ${tb.color}66)`, border: `1px solid ${tb.color}33` }}
        >
          Apply This Proposal
        </button>
      </div>
    </div>
  );
}

// ── CO Draft inline preview ───────────────────────────────────────────────────
function CODraftPreview({ draft, onClose, onPromote }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
      className="rounded-xl border overflow-hidden" style={{ borderColor: 'rgba(192,132,252,0.25)', background: '#14181E' }}
    >
      <div className="flex items-center gap-2 px-3 py-2 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <FileSignature size={12} style={{ color: '#C084FC' }} />
        <span className="text-[0.65rem] font-bold tracking-[0.08em] uppercase text-[#C084FC] flex-1">CO Draft</span>
        <button onClick={onClose} className="text-[rgba(255,255,255,0.25)] hover:text-[rgba(255,255,255,0.60)] transition-colors"><X size={12} /></button>
      </div>
      <div className="px-3 py-2.5 space-y-2">
        <div>
          <p className="text-[0.58rem] font-bold tracking-[0.10em] uppercase text-[rgba(255,255,255,0.30)] mb-0.5">Title</p>
          <p className="text-[0.75rem] font-semibold text-[rgba(255,255,255,0.88)]">{draft.title}</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="px-2 py-1.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
            <p className="text-[0.55rem] text-[rgba(255,255,255,0.30)]">Cost Impact</p>
            <p className="text-[0.75rem] font-bold text-[#4DD6A4]">${(draft.cost_impact || 0).toLocaleString()}</p>
          </div>
          <div className="px-2 py-1.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
            <p className="text-[0.55rem] text-[rgba(255,255,255,0.30)]">Schedule</p>
            <p className="text-[0.75rem] font-bold text-[#FFB15A]">+{draft.schedule_impact_days || 0}d</p>
          </div>
        </div>
        <p className="text-[0.65rem] text-[rgba(255,255,255,0.45)] leading-relaxed line-clamp-3">{draft.description}</p>
        <button onClick={() => onPromote(draft)}
          className="w-full py-1.5 rounded-lg text-[0.65rem] font-bold text-white transition-all hover:opacity-90"
          style={{ background: 'linear-gradient(90deg,rgba(192,132,252,0.80),rgba(192,132,252,0.55))', border: '1px solid rgba(192,132,252,0.25)' }}
        >
          Promote to Change Order
        </button>
      </div>
    </motion.div>
  );
}

// ── Main ContextPanel ─────────────────────────────────────────────────────────
export default function ContextPanel({ issue, riskScore, proposals, coDraft, projectId, onQuickAction }) {
  const [showCODraft, setShowCODraft] = useState(!!coDraft);
  const [applied, setApplied] = useState(null);

  const drivers = issue?.source_annotation_labels || [];
  const hasContent = issue || riskScore > 0 || proposals?.length > 0;

  if (!hasContent) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 px-4 text-center">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <Shield size={18} style={{ color: 'rgba(255,255,255,0.20)' }} />
        </div>
        <p className="text-[0.7rem] text-[rgba(255,255,255,0.25)] max-w-[160px]">Context panel populates when an issue or risk is identified</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto gap-3 p-3">

      {/* Issue Summary */}
      {issue && (
        <div className="rounded-xl border p-3" style={{ borderColor: 'rgba(255,77,77,0.20)', background: 'rgba(255,77,77,0.05)' }}>
          <div className="flex items-center gap-1.5 mb-2">
            <AlertTriangle size={12} style={{ color: '#FF4D4D' }} />
            <span className="text-[0.58rem] font-bold tracking-[0.10em] uppercase text-[rgba(255,77,77,0.80)]">Active Issue</span>
            <span className="ml-auto px-1.5 py-0.5 rounded text-[0.55rem] font-bold uppercase"
              style={{
                background: { critical: 'rgba(255,77,77,0.18)', high: 'rgba(255,177,90,0.18)', medium: 'rgba(77,163,255,0.18)', low: 'rgba(77,214,164,0.18)' }[issue.severity],
                color: { critical: '#FF4D4D', high: '#FFB15A', medium: '#4DA3FF', low: '#4DD6A4' }[issue.severity],
              }}
            >{issue.severity}</span>
          </div>
          <p className="text-[0.78rem] font-semibold text-[rgba(255,255,255,0.88)] leading-snug mb-1">{issue.title}</p>
          {issue.location && <p className="text-[0.62rem] text-[rgba(255,255,255,0.40)]">📍 {issue.location}</p>}
          {drivers.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {drivers.map((d, i) => (
                <span key={i} className="px-1.5 py-0.5 rounded text-[0.58rem] text-[rgba(255,90,31,0.70)]" style={{ background: 'rgba(255,90,31,0.08)', border: '1px solid rgba(255,90,31,0.15)' }}>{d}</span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Risk Meter */}
      {riskScore > 0 && (
        <div className="rounded-xl border p-3" style={{ borderColor: 'rgba(255,255,255,0.07)', background: '#14181E' }}>
          <RiskMeter score={riskScore} />
        </div>
      )}

      {/* Solution Proposals */}
      {proposals?.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-1.5">
            <Lightbulb size={11} style={{ color: '#FFB15A' }} />
            <span className="text-[0.58rem] font-bold tracking-[0.10em] uppercase text-[rgba(255,255,255,0.30)]">Solution Proposals</span>
            <span className="text-[0.55rem] text-[rgba(255,255,255,0.20)] ml-auto">{proposals.length} options</span>
          </div>
          {proposals.slice(0, 3).map((p, i) => (
            <ProposalCard key={p.id || i} proposal={p} rank={i + 1}
              onApply={p => { setApplied(p.id); onQuickAction?.('apply_proposal', p); }}
            />
          ))}
        </div>
      )}

      {/* CO Draft inline preview */}
      <AnimatePresence>
        {coDraft && showCODraft && (
          <CODraftPreview
            draft={coDraft}
            onClose={() => setShowCODraft(false)}
            onPromote={d => onQuickAction?.('promote_co', d)}
          />
        )}
      </AnimatePresence>

      {/* Quick Actions */}
      <div className="flex flex-col gap-1">
        <span className="text-[0.58rem] font-bold tracking-[0.10em] uppercase text-[rgba(255,255,255,0.25)] px-1">Quick Actions</span>
        {[
          { id: 'create_co',       icon: FileSignature, label: 'Create Change Order', color: '#C084FC' },
          { id: 'assign_owner',    icon: User,          label: 'Assign Owner',        color: '#4DA3FF' },
          { id: 'schedule_task',   icon: Calendar,      label: 'Schedule Task',       color: '#4DD6A4' },
          { id: 'open_drawing',    icon: FileText,      label: 'Open Drawing',        color: '#FFB15A' },
        ].map(a => (
          <button key={a.id} onClick={() => onQuickAction?.(a.id, issue)}
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all group"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
            onMouseEnter={e => e.currentTarget.style.background = `${a.color}12`}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
          >
            <a.icon size={13} style={{ color: a.color, flexShrink: 0 }} />
            <span className="text-[0.72rem] font-medium text-[rgba(255,255,255,0.65)] group-hover:text-[rgba(255,255,255,0.88)] transition-colors">{a.label}</span>
            <Zap size={10} className="ml-auto opacity-0 group-hover:opacity-100 transition-all" style={{ color: a.color }} />
          </button>
        ))}
      </div>
    </div>
  );
}