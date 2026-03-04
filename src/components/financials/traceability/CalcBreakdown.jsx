/**
 * CalcBreakdown
 * =============
 * Inline expandable calculation breakdown with step-by-step math
 * and hover tooltips that link back to source records.
 *
 * Drop into any budget / estimate / CO row next to a computed value.
 *
 * Props:
 *   label      {string}         — e.g. "Current Budget"
 *   value      {number}
 *   valueType  {'currency'|'percent'|'number'}
 *   formula    {string}         — human-readable formula string
 *   steps      {CalcStep[]}     — array of { label, expr, result, tooltip? }
 *   sources    {SourceRef[]}    — array of { field, label, value, entity, entity_id }
 *   status     {'verified'|'flagged'|'pending'}
 *   onOpenDetail {() => void}   — open full TransactionSlideOver
 *   defaultOpen {boolean}
 *
 * CalcStep:
 *   { label: string, expr: string, result: number, tooltip?: string }
 *
 * SourceRef:
 *   { field: string, label: string, value: number|string, entity: string, entity_id?: string }
 */

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, ChevronRight, Calculator, ExternalLink, ShieldCheck, AlertCircle, AlertTriangle, Link2 } from 'lucide-react';

const fmt = {
  currency: (v) => `$${Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
  percent:  (v) => `${Number(v).toFixed(2)}%`,
  number:   (v) => Number(v).toLocaleString('en-US'),
};

const STATUS = {
  verified: { color: '#4DD6A4', icon: ShieldCheck,   dot: '#4DD6A4' },
  flagged:  { color: '#FF4D4D', icon: AlertCircle,   dot: '#FF4D4D' },
  pending:  { color: '#FFB15A', icon: AlertTriangle, dot: '#FFB15A' },
};

// ─── Tooltip ─────────────────────────────────────────────────────────────────

function Tooltip({ text, children }) {
  const [show, setShow] = useState(false);
  const ref = useRef(null);

  return (
    <span
      ref={ref}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      style={{ position: 'relative', display: 'inline-block' }}
    >
      {children}
      {show && text && (
        <span style={{
          position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)',
          marginBottom: 6, whiteSpace: 'nowrap', zIndex: 50,
          background: '#1A1F27', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 7, padding: '5px 10px',
          fontSize: '0.62rem', color: 'rgba(255,255,255,0.75)',
          boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
          pointerEvents: 'none',
        }}>
          {text}
          <span style={{ position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: '5px solid #1A1F27' }} />
        </span>
      )}
    </span>
  );
}

// ─── Source chip with tooltip ─────────────────────────────────────────────────

function SourceChip({ src }) {
  return (
    <Tooltip text={`${src.entity}.${src.field} = ${src.value}`}>
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        fontSize: '0.6rem', fontFamily: 'monospace',
        background: 'rgba(255,90,31,0.08)', border: '1px solid rgba(255,90,31,0.2)',
        color: '#FF8C42', borderRadius: 5, padding: '1px 6px', cursor: 'default',
      }}>
        <Link2 size={8} />
        {src.label || src.field}
        {src.entity_id && (
          <a href="#" onClick={e => e.preventDefault()} title={`Open ${src.entity}`} style={{ color: 'inherit', lineHeight: 1 }}>
            <ExternalLink size={8} />
          </a>
        )}
      </span>
    </Tooltip>
  );
}

// ─── Step row ─────────────────────────────────────────────────────────────────

function StepRow({ step, index, isLast }) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '20px 1fr auto',
      alignItems: 'center', gap: 10,
      padding: '7px 0',
      borderBottom: isLast ? 'none' : '1px solid rgba(255,255,255,0.03)',
    }}>
      <div style={{
        width: 20, height: 20, borderRadius: '50%',
        background: 'rgba(255,90,31,0.1)', border: '1px solid rgba(255,90,31,0.18)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ fontSize: '0.5rem', fontWeight: 800, color: '#FF8C42' }}>{index + 1}</span>
      </div>

      <div>
        <p style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.35)', margin: 0, marginBottom: 1 }}>{step.label}</p>
        <Tooltip text={step.tooltip}>
          <code style={{ fontSize: '0.7rem', color: '#FF8C42', fontFamily: 'monospace', cursor: step.tooltip ? 'help' : 'default' }}>
            {step.expr}
          </code>
        </Tooltip>
      </div>

      <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#fff', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
        {fmt.currency(step.result)}
      </span>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CalcBreakdown({
  label = 'Value',
  value = 0,
  valueType = 'currency',
  formula,
  steps = [],
  sources = [],
  status = 'pending',
  onOpenDetail,
  defaultOpen = false,
}) {
  const [open, setOpen] = useState(defaultOpen);
  const cfg = STATUS[status] || STATUS.pending;
  const StatusIcon = cfg.icon;
  const fmtValue = (fmt[valueType] || fmt.currency)(value);

  return (
    <div style={{ background: '#0D1117', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 11, overflow: 'hidden' }}>
      {/* ── Trigger row ── */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', background: 'transparent', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '9px 14px', textAlign: 'left',
        }}
        aria-expanded={open}
        title="Expand calculation breakdown"
      >
        {/* Status dot */}
        <Tooltip text={`${status.charAt(0).toUpperCase() + status.slice(1)}: click to expand formula`}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: cfg.dot, display: 'inline-block', flexShrink: 0 }} />
        </Tooltip>

        <Calculator size={12} style={{ color: '#FF8C42', flexShrink: 0 }} />

        <span style={{ fontSize: '0.68rem', fontWeight: 600, color: 'rgba(255,255,255,0.6)', flex: 1 }}>
          {label}
        </span>

        {/* Source chips */}
        <div className="flex items-center gap-1 flex-wrap">
          {sources.slice(0, 3).map((src, i) => <SourceChip key={i} src={src} />)}
          {sources.length > 3 && (
            <span style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.3)' }}>+{sources.length - 3} more</span>
          )}
        </div>

        <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#fff', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', marginLeft: 8 }}>
          {fmtValue}
        </span>

        {open
          ? <ChevronDown size={13} style={{ color: 'rgba(255,255,255,0.35)', flexShrink: 0 }} />
          : <ChevronRight size={13} style={{ color: 'rgba(255,255,255,0.35)', flexShrink: 0 }} />
        }
      </button>

      {/* ── Expanded body ── */}
      {open && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '12px 14px 14px' }}>

          {/* Formula */}
          {formula && (
            <div style={{ marginBottom: 12 }}>
              <p style={{ fontSize: '0.55rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)', marginBottom: 5 }}>
                Formula
              </p>
              <div style={{ background: '#14181E', borderRadius: 7, padding: '6px 10px' }}>
                <code style={{ fontSize: '0.72rem', color: '#FF8C42', fontFamily: 'monospace' }}>{formula}</code>
              </div>
            </div>
          )}

          {/* Steps */}
          {steps.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <p style={{ fontSize: '0.55rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)', marginBottom: 5 }}>
                Step-by-Step
              </p>
              <div style={{ background: '#14181E', borderRadius: 7, padding: '2px 12px' }}>
                {steps.map((step, i) => <StepRow key={i} step={step} index={i} isLast={i === steps.length - 1} />)}
              </div>
            </div>
          )}

          {/* Final result */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'rgba(255,90,31,0.06)', border: '1px solid rgba(255,90,31,0.15)', borderRadius: 8 }}>
            <div className="flex items-center gap-2">
              <StatusIcon size={12} style={{ color: cfg.color }} />
              <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'rgba(255,255,255,0.55)' }}>Result</span>
            </div>
            <span style={{ fontSize: '1rem', fontWeight: 800, color: '#fff', fontVariantNumeric: 'tabular-nums' }}>{fmtValue}</span>
          </div>

          {/* Open full detail */}
          {onOpenDetail && (
            <button
              onClick={onOpenDetail}
              style={{
                marginTop: 10, width: '100%', background: 'none',
                border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8,
                cursor: 'pointer', padding: '6px 0',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
              }}
            >
              <ExternalLink size={11} style={{ color: '#FF8C42' }} />
              <span style={{ fontSize: '0.62rem', fontWeight: 600, color: '#FF8C42' }}>
                View full transaction trace →
              </span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}