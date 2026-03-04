/**
 * TransactionSlideOver
 * ====================
 * Dark industrial slide-over panel showing full traceability for a
 * single financial figure: source fields, formula, input values,
 * timestamps, and who last modified each input.
 *
 * Props:
 *   open          {boolean}         — controls visibility
 *   onClose       {() => void}
 *   transaction   {TransactionTrace} — see shape below
 *
 * TransactionTrace shape:
 * {
 *   label:        string,            // e.g. "Current Budget"
 *   value:        number,            // resolved numeric value
 *   formula:      string,            // e.g. "original_budget + approved_changes"
 *   result_type:  'currency'|'percent'|'number',
 *   verification: 'verified'|'flagged'|'pending',
 *   sources: [{
 *     field:        string,          // e.g. "original_budget"
 *     label:        string,          // "Original Budget"
 *     value:        number|string,
 *     type:         'currency'|'percent'|'number'|'string',
 *     modified_by:  string,          // user email
 *     modified_at:  string,          // ISO date-time
 *     entity:       string,          // entity name, e.g. "Financial"
 *     entity_id:    string,
 *   }],
 *   steps: [{
 *     label: string,                 // e.g. "Step 1: Add approved changes"
 *     expr:  string,                 // e.g. "300,000 + 18,500"
 *     result: number,
 *   }],
 *   discrepancy:  string|null,       // human-readable discrepancy note
 * }
 */

import React, { useEffect } from 'react';
import { X, Link2, User, Clock, ChevronRight, ShieldCheck, AlertTriangle, AlertCircle, ExternalLink } from 'lucide-react';
import { format, parseISO } from 'date-fns';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = {
  currency: (v) => `$${Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
  percent:  (v) => `${Number(v).toFixed(2)}%`,
  number:   (v) => Number(v).toLocaleString('en-US'),
  string:   (v) => String(v),
};

const VERIF_CONFIG = {
  verified: { color: '#4DD6A4', bg: 'rgba(77,214,164,0.1)',  border: 'rgba(77,214,164,0.25)',  icon: ShieldCheck,    label: 'Verified' },
  flagged:  { color: '#FF4D4D', bg: 'rgba(255,77,77,0.1)',   border: 'rgba(255,77,77,0.25)',   icon: AlertCircle,    label: 'Discrepancy Flagged' },
  pending:  { color: '#FFB15A', bg: 'rgba(255,177,90,0.1)',  border: 'rgba(255,177,90,0.25)', icon: AlertTriangle,  label: 'Pending Verification' },
};

function formatTs(iso) {
  if (!iso) return '—';
  try { return format(parseISO(iso), 'MMM d, yyyy h:mm a'); } catch { return iso; }
}

function SourceRow({ src }) {
  const fmtFn = fmt[src.type] || fmt.string;
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '1fr auto',
      padding: '10px 0',
      borderBottom: '1px solid rgba(255,255,255,0.04)',
      gap: 12,
    }}>
      <div>
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span style={{ fontSize: '0.6rem', fontFamily: 'monospace', color: 'rgba(255,255,255,0.35)', background: 'rgba(255,255,255,0.05)', padding: '1px 6px', borderRadius: 4 }}>
            {src.entity}.{src.field}
          </span>
          {src.entity_id && (
            <a
              href="#"
              onClick={e => e.preventDefault()}
              title={`Open ${src.entity} record ${src.entity_id}`}
              style={{ color: '#FF8C42', display: 'flex', alignItems: 'center', gap: 2 }}
            >
              <ExternalLink size={10} />
            </a>
          )}
        </div>
        <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.65)', margin: 0 }}>{src.label}</p>
        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
          <span className="flex items-center gap-1" style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)' }}>
            <User size={9} />{src.modified_by || 'System'}
          </span>
          <span className="flex items-center gap-1" style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)' }}>
            <Clock size={9} />{formatTs(src.modified_at)}
          </span>
        </div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <p style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff', margin: 0 }}>{fmtFn(src.value)}</p>
        <span style={{ fontSize: '0.58rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.25)' }}>{src.type}</span>
      </div>
    </div>
  );
}

function StepRow({ step, index }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
      <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(255,90,31,0.12)', border: '1px solid rgba(255,90,31,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <span style={{ fontSize: '0.55rem', fontWeight: 800, color: '#FF8C42' }}>{index + 1}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.45)', margin: 0, marginBottom: 2 }}>{step.label}</p>
        <code style={{ fontSize: '0.72rem', color: '#FF8C42', fontFamily: 'monospace' }}>{step.expr}</code>
      </div>
      <ChevronRight size={12} style={{ color: 'rgba(255,255,255,0.2)', flexShrink: 0 }} />
      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#fff', fontFamily: 'monospace', flexShrink: 0 }}>
        {fmt.currency(step.result)}
      </span>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function TransactionSlideOver({ open, onClose, transaction }) {
  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open || !transaction) return null;

  const verif   = VERIF_CONFIG[transaction.verification] || VERIF_CONFIG.pending;
  const VerifIcon = verif.icon;
  const fmtValue = (fmt[transaction.result_type] || fmt.currency)(transaction.value);

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 998, backdropFilter: 'blur(2px)' }}
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Transaction detail: ${transaction.label}`}
        style={{
          position: 'fixed', top: 0, right: 0, bottom: 0,
          width: 'min(480px, 100vw)',
          background: '#0D1117',
          borderLeft: '1px solid rgba(255,255,255,0.08)',
          zIndex: 999,
          display: 'flex', flexDirection: 'column',
          boxShadow: '-24px 0 60px rgba(0,0,0,0.7)',
        }}
      >
        {/* ── Header ── */}
        <div style={{ padding: '18px 20px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Link2 size={13} style={{ color: '#FF8C42' }} />
                <span style={{ fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)' }}>
                  Transaction Detail
                </span>
              </div>
              <h2 style={{ fontSize: '1rem', fontWeight: 800, color: '#fff', margin: 0 }}>{transaction.label}</h2>
              <p style={{ fontSize: '1.4rem', fontWeight: 800, color: '#FF8C42', margin: '4px 0 0', fontVariantNumeric: 'tabular-nums' }}>
                {fmtValue}
              </p>
            </div>
            <button
              onClick={onClose}
              aria-label="Close transaction detail"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '6px', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', flexShrink: 0 }}
            >
              <X size={14} />
            </button>
          </div>

          {/* Verification badge */}
          <div style={{ marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 6, background: verif.bg, border: `1px solid ${verif.border}`, borderRadius: 999, padding: '4px 10px' }}>
            <VerifIcon size={11} style={{ color: verif.color }} />
            <span style={{ fontSize: '0.62rem', fontWeight: 700, color: verif.color, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              {verif.label}
            </span>
          </div>

          {transaction.discrepancy && (
            <div style={{ marginTop: 10, padding: '8px 12px', background: 'rgba(255,77,77,0.08)', border: '1px solid rgba(255,77,77,0.2)', borderRadius: 8 }}>
              <p style={{ fontSize: '0.68rem', color: '#FF4D4D', margin: 0 }}>⚠ {transaction.discrepancy}</p>
            </div>
          )}
        </div>

        {/* ── Scrollable body ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 24px' }}>

          {/* Formula */}
          <section style={{ marginTop: 20 }}>
            <p style={{ fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: 8 }}>
              Formula
            </p>
            <div style={{ background: '#14181E', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '10px 14px' }}>
              <code style={{ fontSize: '0.78rem', color: '#FF8C42', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                {transaction.formula || 'No formula recorded'}
              </code>
            </div>
          </section>

          {/* Calculation steps */}
          {transaction.steps?.length > 0 && (
            <section style={{ marginTop: 20 }}>
              <p style={{ fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: 8 }}>
                Step-by-Step Calculation
              </p>
              <div style={{ background: '#14181E', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '4px 14px' }}>
                {transaction.steps.map((step, i) => <StepRow key={i} step={step} index={i} />)}
              </div>
            </section>
          )}

          {/* Source fields */}
          {transaction.sources?.length > 0 && (
            <section style={{ marginTop: 20 }}>
              <p style={{ fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: 4 }}>
                Source Inputs — {transaction.sources.length} field{transaction.sources.length > 1 ? 's' : ''}
              </p>
              <p style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.25)', marginBottom: 8 }}>
                Each input shows who entered it and when. Click ↗ to open the source record.
              </p>
              <div style={{ background: '#14181E', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '0 14px' }}>
                {transaction.sources.map((src, i) => <SourceRow key={i} src={src} />)}
              </div>
            </section>
          )}
        </div>

        {/* ── Footer ── */}
        <div style={{ padding: '12px 20px', borderTop: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
          <p style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.2)', margin: 0, textAlign: 'center' }}>
            Values are read-only in this view. Edit source records to change inputs.
          </p>
        </div>
      </div>
    </>
  );
}