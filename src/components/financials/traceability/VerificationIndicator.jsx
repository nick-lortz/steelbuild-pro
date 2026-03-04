/**
 * VerificationIndicator
 * =====================
 * Red / Orange / Green visual status indicator for financial figures.
 * Supports three display modes: dot, badge, and bar.
 *
 * Props:
 *   status       {'verified'|'flagged'|'pending'}
 *   discrepancy  {string|null}         — short discrepancy note (shown on hover / expanded)
 *   lastVerified {string|null}         — ISO timestamp of last verification
 *   verifiedBy   {string|null}         — email of verifier
 *   onVerify     {() => void|null}     — if provided, shows "Mark as Verified" action
 *   mode         {'dot'|'badge'|'bar'} — display mode
 *   label        {string|null}         — optional override label
 *   showAction   {boolean}             — show action button (default true if onVerify given)
 */

import React, { useState } from 'react';
import { ShieldCheck, AlertCircle, AlertTriangle, User, Clock, CheckCircle2, ChevronDown, ChevronRight } from 'lucide-react';
import { format, parseISO } from 'date-fns';

const CONFIG = {
  verified: {
    color: '#4DD6A4',
    bg:    'rgba(77,214,164,0.1)',
    border:'rgba(77,214,164,0.25)',
    glow:  '0 0 0 3px rgba(77,214,164,0.12)',
    icon:  ShieldCheck,
    label: 'Verified',
    description: 'This figure has been reviewed and confirmed against source records.',
    actionLabel: 'Re-verify',
  },
  flagged: {
    color: '#FF4D4D',
    bg:    'rgba(255,77,77,0.1)',
    border:'rgba(255,77,77,0.25)',
    glow:  '0 0 0 3px rgba(255,77,77,0.12)',
    icon:  AlertCircle,
    label: 'Discrepancy',
    description: 'A discrepancy was detected. Review source inputs before proceeding.',
    actionLabel: 'Acknowledge & Verify',
  },
  pending: {
    color: '#FFB15A',
    bg:    'rgba(255,177,90,0.1)',
    border:'rgba(255,177,90,0.25)',
    glow:  '0 0 0 3px rgba(255,177,90,0.12)',
    icon:  AlertTriangle,
    label: 'Pending',
    description: 'Not yet verified. Review calculation breakdown before approving.',
    actionLabel: 'Mark as Verified',
  },
};

function formatTs(iso) {
  if (!iso) return null;
  try { return format(parseISO(iso), 'MMM d, yyyy h:mm a'); } catch { return iso; }
}

// ─── Dot mode ─────────────────────────────────────────────────────────────────

function DotIndicator({ cfg, status }) {
  const [hover, setHover] = useState(false);
  return (
    <span
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', cursor: 'default' }}
      title={cfg.description}
    >
      <span style={{
        width: 10, height: 10, borderRadius: '50%',
        background: cfg.color,
        boxShadow: hover ? cfg.glow : 'none',
        display: 'inline-block',
        transition: 'box-shadow 0.2s',
      }} />
    </span>
  );
}

// ─── Badge mode ───────────────────────────────────────────────────────────────

function BadgeIndicator({ cfg, status, discrepancy, lastVerified, verifiedBy, onVerify, showAction, label }) {
  const [expanded, setExpanded] = useState(false);
  const Icon = cfg.icon;

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', gap: 0 }}>
      <button
        onClick={() => setExpanded(o => !o)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: cfg.bg, border: `1px solid ${cfg.border}`,
          borderRadius: expanded ? '8px 8px 0 0' : 999,
          padding: '4px 10px', cursor: 'pointer',
          transition: 'all 0.15s',
        }}
        title={cfg.description}
      >
        <Icon size={11} style={{ color: cfg.color }} />
        <span style={{ fontSize: '0.62rem', fontWeight: 700, color: cfg.color, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          {label || cfg.label}
        </span>
        {expanded
          ? <ChevronDown size={10} style={{ color: cfg.color, opacity: 0.6 }} />
          : <ChevronRight size={10} style={{ color: cfg.color, opacity: 0.6 }} />
        }
      </button>

      {expanded && (
        <div style={{
          background: cfg.bg, border: `1px solid ${cfg.border}`,
          borderTop: 'none', borderRadius: '0 0 8px 8px',
          padding: '10px 12px', minWidth: 240,
        }}>
          <p style={{ fontSize: '0.67rem', color: 'rgba(255,255,255,0.65)', margin: '0 0 8px', lineHeight: 1.5 }}>
            {discrepancy || cfg.description}
          </p>

          {lastVerified && (
            <div className="flex flex-col gap-1 mb-8">
              <span className="flex items-center gap-1.5" style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.35)' }}>
                <Clock size={9} />Last verified: {formatTs(lastVerified)}
              </span>
              {verifiedBy && (
                <span className="flex items-center gap-1.5" style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.35)' }}>
                  <User size={9} />By: {verifiedBy}
                </span>
              )}
            </div>
          )}

          {showAction && onVerify && (
            <button
              onClick={() => { onVerify(); setExpanded(false); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                fontSize: '0.62rem', fontWeight: 700,
                padding: '5px 12px', borderRadius: 7, cursor: 'pointer',
                background: 'rgba(255,90,31,0.12)', border: '1px solid rgba(255,90,31,0.3)',
                color: '#FF8C42', width: '100%', justifyContent: 'center',
              }}
            >
              <CheckCircle2 size={11} />
              {cfg.actionLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Bar mode ─────────────────────────────────────────────────────────────────

function BarIndicator({ cfg, status, discrepancy, lastVerified, onVerify, showAction, label }) {
  const Icon = cfg.icon;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '8px 14px',
      background: cfg.bg, border: `1px solid ${cfg.border}`,
      borderRadius: 10,
    }}>
      <Icon size={14} style={{ color: cfg.color, flexShrink: 0 }} />
      <div className="flex-1 min-w-0">
        <p style={{ fontSize: '0.68rem', fontWeight: 700, color: cfg.color, margin: 0, marginBottom: 1 }}>
          {label || cfg.label}
        </p>
        {discrepancy ? (
          <p style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.45)', margin: 0 }}>{discrepancy}</p>
        ) : (
          <p style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.35)', margin: 0 }}>{cfg.description}</p>
        )}
        {lastVerified && (
          <span style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.25)' }}>
            Verified {formatTs(lastVerified)}
          </span>
        )}
      </div>
      {showAction && onVerify && (
        <button
          onClick={onVerify}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            fontSize: '0.62rem', fontWeight: 700,
            padding: '5px 12px', borderRadius: 7, cursor: 'pointer',
            background: 'rgba(255,90,31,0.1)', border: '1px solid rgba(255,90,31,0.25)',
            color: '#FF8C42', flexShrink: 0, whiteSpace: 'nowrap',
          }}
        >
          <CheckCircle2 size={10} />
          {cfg.actionLabel}
        </button>
      )}
    </div>
  );
}

// ─── Exported component ───────────────────────────────────────────────────────

export default function VerificationIndicator({
  status = 'pending',
  discrepancy = null,
  lastVerified = null,
  verifiedBy = null,
  onVerify = null,
  mode = 'badge',
  label = null,
  showAction = true,
}) {
  const cfg = CONFIG[status] || CONFIG.pending;

  if (mode === 'dot') return <DotIndicator cfg={cfg} status={status} />;
  if (mode === 'bar') return <BarIndicator cfg={cfg} status={status} discrepancy={discrepancy} lastVerified={lastVerified} onVerify={onVerify} showAction={showAction && !!onVerify} label={label} />;
  return (
    <BadgeIndicator
      cfg={cfg} status={status}
      discrepancy={discrepancy}
      lastVerified={lastVerified}
      verifiedBy={verifiedBy}
      onVerify={onVerify}
      showAction={showAction && !!onVerify}
      label={label}
    />
  );
}