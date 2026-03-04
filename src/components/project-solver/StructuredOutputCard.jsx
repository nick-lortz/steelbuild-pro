/**
 * StructuredOutputCard — renders AI output with full validation safeguards:
 *  1. Low confidence (<0.6) → clarification required, no auto-action
 *  2. Safety/regulatory/contractual flags → sign-off modal before apply
 *  3. CO budget threshold → 2FA-style confirmation via SignOffModal
 *  4. PII warning banner
 *  5. Human-readable explanation + out-of-the-box justification
 *  6. Audit trail via PSAuditLog entity
 */
import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle, Shield, FileQuestion, FileSignature, Lightbulb,
  ChevronDown, ChevronUp, Check, Loader2, HelpCircle, ShieldAlert,
  Info, Eye, EyeOff, Lock,
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useActiveProject } from '@/components/shared/hooks/useActiveProject';
import SignOffModal from './SignOffModal';

// ── Config ────────────────────────────────────────────────────────────────────
const CONFIDENCE_THRESHOLD = 0.60;
const BUDGET_THRESHOLD_DEFAULT = 5000; // $5k — ideally from project settings

const TYPE_CONFIG = {
  issue:     { label: 'Issue Detected',     icon: AlertTriangle, color: '#FF4D4D',  bg: 'rgba(255,77,77,0.07)',    border: 'rgba(255,77,77,0.18)' },
  risk:      { label: 'Risk Identified',    icon: Shield,        color: '#FFB15A',  bg: 'rgba(255,177,90,0.07)',   border: 'rgba(255,177,90,0.18)' },
  rfi_draft: { label: 'RFI Draft Ready',    icon: FileQuestion,  color: '#4DA3FF',  bg: 'rgba(77,163,255,0.07)',   border: 'rgba(77,163,255,0.18)' },
  co_draft:  { label: 'Change Order Draft', icon: FileSignature, color: '#C084FC',  bg: 'rgba(192,132,252,0.07)', border: 'rgba(192,132,252,0.18)' },
  solution:  { label: 'Solution Proposed',  icon: Lightbulb,     color: '#4DD6A4',  bg: 'rgba(77,214,164,0.07)',  border: 'rgba(77,214,164,0.18)' },
  clarification: { label: 'Clarification Needed', icon: HelpCircle, color: '#FFB15A', bg: 'rgba(255,177,90,0.07)', border: 'rgba(255,177,90,0.18)' },
};

// ── Risk flag detection ───────────────────────────────────────────────────────
function detectFlags(output) {
  const flags = [];
  const text = JSON.stringify(output).toLowerCase();

  // Safety / structural keywords
  if (/safety|osha|fall protection|collapse|overload|weld|bolt tension|seismic|lateral|shear|buckling/.test(text))
    flags.push('safety');
  // Regulatory
  if (/aisc|aws d1|ibc|asce|building code|inspection|ndt|certified|engineer of record|eor|pe stamp/.test(text))
    flags.push('regulatory');
  // Contractual
  if (/entitlement|contract|change order|co |directive|claim|notice|liquidated|delay damages/.test(text))
    flags.push('contractual');
  // Budget threshold
  if ((output.cost_impact || output.estimated_cost_impact || 0) >= BUDGET_THRESHOLD_DEFAULT)
    flags.push('budget_threshold');

  return flags;
}

// ── PII detection ─────────────────────────────────────────────────────────────
function detectPII(output) {
  const text = JSON.stringify(output);
  const patterns = [
    /\b\d{3}-\d{2}-\d{4}\b/,                        // SSN
    /\b[A-Z]{1,2}\d{6,9}\b/,                         // Passport/DL-style
    /\b[\w.+-]+@[\w-]+\.[a-z]{2,}\b/i,               // Email
    /\b(\+1[-.\s]?)?\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}\b/, // Phone
  ];
  return patterns.some(p => p.test(text));
}

// ── Audit logger ──────────────────────────────────────────────────────────────
async function logAudit({ projectId, sessionId, actionType, output, confidence, flags, signoffBy, notes }) {
  try {
    await base44.entities.PSAuditLog.create({
      project_id:      projectId,
      session_id:      sessionId,
      action_type:     actionType,
      output_type:     output?.type,
      output_payload:  output,
      confidence_score: confidence,
      flags,
      decision_notes:  notes || '',
      signoff_by:      signoffBy || '',
      budget_amount:   output?.cost_impact || 0,
    });
  } catch (_) { /* audit failure must never block UI */ }
}

// ── Confidence badge ──────────────────────────────────────────────────────────
function ConfidenceBadge({ score }) {
  const pct = Math.round((score || 0) * 100);
  const color = pct >= 80 ? '#4DD6A4' : pct >= 60 ? '#FFB15A' : '#FF4D4D';
  return (
    <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[0.58rem] font-bold"
      style={{ background: color + '18', color, border: `1px solid ${color}30` }}
      title={`AI confidence: ${pct}%`}
    >
      {pct}% conf.
    </span>
  );
}

// ── Out-of-the-box justification block ───────────────────────────────────────
function OOBJustification({ output }) {
  if (output.proposal_type !== 'out_of_the_box' && !output.ootb_justification) return null;
  const text = output.ootb_justification ||
    `This unconventional approach was proposed because standard methods ${output.tradeoffs?.length ? `carry tradeoffs: ${output.tradeoffs.join('; ')}` : 'may not resolve the constraint within schedule'}. ` +
    `It trades ${output.estimated_delay_days > 0 ? `+${output.estimated_delay_days}d schedule` : 'minimal schedule impact'} for a potentially lower cost exposure. Requires additional PM/EOR review before committing.`;
  return (
    <div className="flex gap-2 px-2.5 py-2 rounded-lg mt-2" style={{ background: 'rgba(192,132,252,0.07)', border: '1px solid rgba(192,132,252,0.18)' }}>
      <Lightbulb size={11} style={{ color: '#C084FC', flexShrink: 0, marginTop: 1 }} />
      <div>
        <p className="text-[0.57rem] font-bold tracking-[0.08em] uppercase text-[rgba(192,132,252,0.70)] mb-0.5">Why out-of-the-box?</p>
        <p className="text-[0.65rem] text-[rgba(192,132,252,0.65)] leading-relaxed">{text}</p>
      </div>
    </div>
  );
}

// ── Human-readable explanation renderer ──────────────────────────────────────
function HumanExplanation({ output }) {
  const parts = [];

  if (output.type === 'rfi_draft') {
    parts.push(`This RFI addresses a ${output.rfi_type?.replace(/_/g,' ')} question at ${output.location_area || 'the referenced location'}.`);
    parts.push(`Priority: ${output.priority?.toUpperCase()}. Impact: ${output.impact_severity?.toUpperCase()}.`);
    if (output.is_install_blocker) parts.push('⚠️ This is an install blocker — erection cannot proceed until resolved.');
    if (output.is_release_blocker) parts.push('⚠️ Fabrication release is on hold pending this RFI response.');
  }

  if (output.type === 'co_draft') {
    parts.push(`This change order covers: ${output.description?.slice(0, 120) || 'scope change'}.`);
    parts.push(`Cost impact: $${(output.cost_impact || 0).toLocaleString()} | Schedule impact: +${output.schedule_impact_days || 0} days.`);
    parts.push(`Entitlement basis: ${output.justification || 'see attached documentation'}.`);
  }

  if (output.type === 'risk') {
    parts.push(`Risk category: ${output.category}. Probability: ${output.probability} · Impact: ${output.impact}.`);
    parts.push(`Proposed mitigation: ${output.mitigation || 'review and assign owner'}.`);
  }

  if (output.type === 'solution') {
    parts.push(output.summary || 'See steps below for implementation details.');
    if (output.resources_needed?.length) parts.push(`Requires: ${output.resources_needed.join(', ')}.`);
    if (output.estimated_hours) parts.push(`Estimated: ${output.estimated_hours} hours.`);
  }

  if (!parts.length) return null;
  return (
    <div className="flex gap-2 px-2.5 py-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
      <Info size={11} style={{ color: 'rgba(255,255,255,0.30)', flexShrink: 0, marginTop: 1 }} />
      <div className="space-y-0.5">
        {parts.map((p, i) => <p key={i} className="text-[0.65rem] text-[rgba(255,255,255,0.55)] leading-relaxed">{p}</p>)}
      </div>
    </div>
  );
}

// ── Main card ─────────────────────────────────────────────────────────────────
export default function StructuredOutputCard({ output, projectId, sessionId }) {
  const [expanded, setExpanded] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [showSignOff, setShowSignOff] = useState(false);
  const [showPIIDetail, setShowPIIDetail] = useState(false);
  const { activeProjectId } = useActiveProject();
  const pid = projectId || activeProjectId;

  if (!output) return null;

  const confidence   = output.confidence_score ?? output.confidence ?? null;
  const lowConf      = confidence !== null && confidence < CONFIDENCE_THRESHOLD;
  const flags        = detectFlags(output);
  const hasPII       = detectPII(output);
  const needsSignOff = flags.some(f => ['safety','regulatory','contractual','budget_threshold'].includes(f));
  const isAmbiguous  = output.ambiguous === true || lowConf;

  // If ambiguous/low confidence → render as clarification card
  const effectiveType = isAmbiguous ? 'clarification' : output.type;
  const cfg = TYPE_CONFIG[effectiveType] || TYPE_CONFIG.solution;
  const Icon = cfg.icon;

  const applyLabel = { rfi_draft: 'Create RFI', risk: 'Save Risk', co_draft: 'Create CO' }[output.type];

  // ── Apply action ────────────────────────────────────────────────────────────
  async function executeApply(signoffData = null) {
    setApplying(true);
    try {
      if (output.type === 'rfi_draft') {
        const rfis = await base44.entities.RFI.filter({ project_id: pid }, '-created_date', 1);
        const nextNum = (rfis[0]?.rfi_number || 0) + 1;
        await base44.entities.RFI.create({
          project_id: pid,
          rfi_number: nextNum,
          subject: output.subject,
          question: output.question,
          location_area: output.location_area,
          rfi_type: output.rfi_type || 'other',
          priority: output.priority || 'medium',
          impact_severity: output.impact_severity || 'medium',
          is_install_blocker: output.is_install_blocker || false,
          is_release_blocker: output.is_release_blocker || false,
          status: 'draft',
          ball_in_court: 'internal',
        });
        await logAudit({ projectId: pid, sessionId, actionType: 'rfi_created', output, confidence, flags, signoffBy: signoffData?.signoff_by, notes: signoffData?.notes });
      } else if (output.type === 'risk') {
        await base44.entities.ProjectRisk.create({
          project_id: pid,
          category: output.category,
          description: output.description,
          probability: output.probability,
          impact: output.impact,
          mitigation_plan: output.mitigation,
          status: 'open',
        });
        await logAudit({ projectId: pid, sessionId, actionType: 'risk_saved', output, confidence, flags, signoffBy: signoffData?.signoff_by, notes: signoffData?.notes });
      } else if (output.type === 'co_draft') {
        const cos = await base44.entities.ChangeOrder.filter({ project_id: pid }, '-created_date', 1);
        const nextNum = (cos[0]?.co_number || 0) + 1;
        await base44.entities.ChangeOrder.create({
          project_id: pid,
          co_number: nextNum,
          title: output.title,
          description: `${output.description}\n\nJustification: ${output.justification}`,
          cost_impact: output.cost_impact || 0,
          schedule_impact_days: output.schedule_impact_days || 0,
          status: 'draft',
        });
        await logAudit({ projectId: pid, sessionId, actionType: 'co_created', output, confidence, flags, signoffBy: signoffData?.signoff_by, notes: signoffData?.notes });
      }
      setApplied(true);
    } catch (e) {
      console.error(e);
    }
    setApplying(false);
    setShowSignOff(false);
  }

  function handleApplyClick() {
    if (needsSignOff) {
      logAudit({ projectId: pid, sessionId, actionType: 'signoff_required', output, confidence, flags });
      setShowSignOff(true);
    } else {
      logAudit({ projectId: pid, sessionId, actionType: 'human_approved', output, confidence, flags });
      executeApply();
    }
  }

  async function handleReject() {
    setShowSignOff(false);
    await logAudit({ projectId: pid, sessionId, actionType: 'human_rejected', output, confidence, flags });
  }

  return (
    <>
      <div className="rounded-xl border overflow-hidden mt-2" style={{ borderColor: cfg.border, background: cfg.bg }}
        role="region" aria-label={`${cfg.label}: ${output.title || output.subject || output.description || ''}`}
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-3 py-2">
          <Icon size={13} style={{ color: cfg.color, flexShrink: 0 }} />
          <span className="text-[0.68rem] font-bold tracking-[0.08em] uppercase flex-1" style={{ color: cfg.color }}>{cfg.label}</span>
          {confidence !== null && <ConfidenceBadge score={confidence} />}

          {/* Flag chips */}
          {flags.map(f => (
            <span key={f} className="px-1.5 py-0.5 rounded text-[0.55rem] font-bold uppercase"
              style={{
                background: { safety:'rgba(255,77,77,0.15)', regulatory:'rgba(255,177,90,0.15)', contractual:'rgba(192,132,252,0.15)', budget_threshold:'rgba(77,163,255,0.15)' }[f] || 'rgba(255,255,255,0.08)',
                color: { safety:'#FF4D4D', regulatory:'#FFB15A', contractual:'#C084FC', budget_threshold:'#4DA3FF' }[f] || '#aaa',
              }}
              aria-label={`Flag: ${f.replace(/_/g,' ')}`}
            >{f.replace(/_/g,' ')}</span>
          ))}

          {applyLabel && !applied && !isAmbiguous && (
            <button onClick={handleApplyClick} disabled={applying}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[0.65rem] font-bold text-white transition-all disabled:opacity-50 hover:opacity-90"
              style={{ background: needsSignOff ? 'rgba(255,77,77,0.80)' : cfg.color }}
              aria-label={needsSignOff ? `${applyLabel} (requires sign-off)` : applyLabel}
            >
              {applying ? <Loader2 size={10} className="animate-spin" /> : needsSignOff ? <Lock size={10} /> : null}
              {applying ? 'Saving…' : needsSignOff ? `${applyLabel} ⚠` : applyLabel}
            </button>
          )}
          {applied && <span className="flex items-center gap-1 text-[0.65rem] text-[rgba(255,255,255,0.50)]" aria-live="polite"><Check size={10} /> Saved</span>}
          <button onClick={() => setExpanded(p => !p)} className="text-[rgba(255,255,255,0.30)] hover:text-[rgba(255,255,255,0.70)] transition-colors"
            aria-expanded={expanded} aria-label={expanded ? 'Collapse details' : 'Expand details'}
          >
            {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
        </div>

        {/* PII Warning */}
        {hasPII && (
          <div className="mx-3 mb-2 flex items-center gap-2 px-2.5 py-1.5 rounded-lg" style={{ background: 'rgba(255,77,77,0.08)', border: '1px solid rgba(255,77,77,0.20)' }}>
            <ShieldAlert size={11} style={{ color: '#FF4D4D', flexShrink: 0 }} />
            <p className="text-[0.62rem] text-[rgba(255,77,77,0.80)] flex-1">PII detected in upload — sensitive fields have been flagged. Do not share this output externally.</p>
            <button onClick={() => setShowPIIDetail(p => !p)} className="text-[rgba(255,77,77,0.50)] hover:text-[rgba(255,77,77,0.80)] transition-colors" aria-label="Toggle PII detail">
              {showPIIDetail ? <EyeOff size={11} /> : <Eye size={11} />}
            </button>
          </div>
        )}
        {hasPII && showPIIDetail && (
          <div className="mx-3 mb-2 px-2.5 py-2 rounded-lg" style={{ background: 'rgba(255,77,77,0.05)' }}>
            <p className="text-[0.62rem] text-[rgba(255,77,77,0.60)]">Patterns detected: email addresses, phone numbers, or government ID numbers. Review and redact before exporting or submitting.</p>
          </div>
        )}

        {/* Clarification / low-confidence block */}
        {isAmbiguous && (
          <div className="mx-3 mb-2 px-3 py-2.5 rounded-xl" style={{ background: 'rgba(255,177,90,0.07)', border: '1px solid rgba(255,177,90,0.18)' }}>
            <div className="flex items-center gap-1.5 mb-1">
              <HelpCircle size={12} style={{ color: '#FFB15A' }} />
              <span className="text-[0.62rem] font-bold tracking-[0.08em] uppercase text-[rgba(255,177,90,0.80)]">Clarification Required</span>
              {confidence !== null && <span className="text-[0.58rem] text-[rgba(255,255,255,0.30)]">— confidence {Math.round(confidence * 100)}% is below the {Math.round(CONFIDENCE_THRESHOLD * 100)}% threshold</span>}
            </div>
            <p className="text-[0.7rem] text-[rgba(255,177,90,0.70)] leading-relaxed">
              {output.clarifying_questions?.length
                ? output.clarifying_questions.map((q, i) => <span key={i} className="block">· {q}</span>)
                : 'The extracted data is ambiguous. Please provide additional context: specific grid/elevation references, drawing revision, or confirm member marks before an action is created.'}
            </p>
          </div>
        )}

        {/* Summary + human explanation */}
        <div className="px-3 pb-2 space-y-2">
          <p className="text-[0.75rem] text-[rgba(255,255,255,0.72)] leading-snug">
            {output.description || output.summary || output.subject || output.title || ''}
          </p>
          {!isAmbiguous && <HumanExplanation output={output} />}
          {!isAmbiguous && <OOBJustification output={output} />}
        </div>

        {/* Sign-off required notice */}
        {needsSignOff && !applied && !isAmbiguous && (
          <div className="mx-3 mb-2 flex items-center gap-2 px-2.5 py-1.5 rounded-lg" style={{ background: 'rgba(255,77,77,0.06)', border: '1px solid rgba(255,77,77,0.15)' }}>
            <Lock size={10} style={{ color: '#FF4D4D' }} />
            <p className="text-[0.60rem] text-[rgba(255,77,77,0.70)]">
              {flags.includes('budget_threshold') ? `Budget ≥ $${BUDGET_THRESHOLD_DEFAULT.toLocaleString()} — 2FA confirmation required. ` : ''}
              {flags.some(f => ['safety','regulatory'].includes(f)) ? 'Structural safety or regulatory flag — PE/PM sign-off required. ' : ''}
              {flags.includes('contractual') ? 'Contractual exposure — PM approval required.' : ''}
            </p>
          </div>
        )}

        {/* Raw JSON detail */}
        <AnimatePresence>
          {expanded && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.15 }}
              className="overflow-hidden"
            >
              <div className="px-3 pb-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                <pre className="mt-2 text-[0.62rem] text-[rgba(255,255,255,0.40)] overflow-x-auto whitespace-pre-wrap leading-relaxed rounded-lg p-2"
                  style={{ background: 'rgba(0,0,0,0.30)' }}>
                  {JSON.stringify(output, null, 2)}
                </pre>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Sign-off modal */}
      <AnimatePresence>
        {showSignOff && (
          <SignOffModal
            output={output}
            flags={flags}
            budgetThreshold={BUDGET_THRESHOLD_DEFAULT}
            onApprove={signoffData => executeApply(signoffData)}
            onReject={handleReject}
          />
        )}
      </AnimatePresence>
    </>
  );
}