/**
 * FinancialValidationPanel
 * ========================
 * Renders structured validation errors, warnings, and info messages
 * returned by runFullValidationSuite() or any per-entity validator.
 *
 * Props:
 *   issues   — array of { code, message, field, fix, severity, entity_id?, entity_label? }
 *   title    — optional panel title
 *   compact  — if true, renders inline pill list instead of full cards
 *   onDismiss— optional callback
 */

import React, { useState } from 'react';
import { AlertTriangle, XCircle, Info, CheckCircle2, ChevronDown, ChevronRight, X, Wrench } from 'lucide-react';

const SEV_CONFIG = {
  error:   { icon: XCircle,       color: '#FF4D4D', bg: 'rgba(255,77,77,0.08)',   border: 'rgba(255,77,77,0.25)',   label: 'Error' },
  warning: { icon: AlertTriangle, color: '#FFB15A', bg: 'rgba(255,177,90,0.08)', border: 'rgba(255,177,90,0.25)', label: 'Warning' },
  info:    { icon: Info,          color: '#4DA3FF', bg: 'rgba(77,163,255,0.08)', border: 'rgba(77,163,255,0.2)',  label: 'Info' },
};

function IssueRow({ issue }) {
  const [showFix, setShowFix] = useState(false);
  const cfg = SEV_CONFIG[issue.severity] || SEV_CONFIG.info;
  const Icon = cfg.icon;

  return (
    <div style={{ borderLeft: `3px solid ${cfg.color}`, paddingLeft: 12, marginBottom: 8 }}>
      <div className="flex items-start gap-2">
        <Icon size={13} style={{ color: cfg.color, marginTop: 3, flexShrink: 0 }} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: cfg.color }}>
              [{issue.code}]
            </span>
            {issue.entity_label && (
              <span style={{ fontSize: '0.6rem', background: 'rgba(255,255,255,0.06)', padding: '1px 6px', borderRadius: 4, color: 'rgba(255,255,255,0.4)' }}>
                {issue.entity_label}
              </span>
            )}
            {issue.field && (
              <span style={{ fontSize: '0.6rem', fontFamily: 'monospace', color: 'rgba(255,255,255,0.3)' }}>
                .{issue.field}
              </span>
            )}
          </div>
          <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.8)', margin: '2px 0 0' }}>{issue.message}</p>
          {issue.fix && (
            <button
              onClick={() => setShowFix(!showFix)}
              style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: 4 }}
            >
              <Wrench size={10} style={{ color: '#FF8C42' }} />
              <span style={{ fontSize: '0.62rem', color: '#FF8C42', fontWeight: 600 }}>Suggested fix</span>
              {showFix ? <ChevronDown size={10} style={{ color: '#FF8C42' }} /> : <ChevronRight size={10} style={{ color: '#FF8C42' }} />}
            </button>
          )}
          {showFix && issue.fix && (
            <p style={{ fontSize: '0.68rem', color: '#FFB15A', marginTop: 4, paddingLeft: 14, borderLeft: '2px solid rgba(255,177,90,0.3)' }}>
              {issue.fix}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function FinancialValidationPanel({ issues = [], title = 'Validation', compact = false, onDismiss }) {
  const errors   = issues.filter(i => i.severity === 'error');
  const warnings = issues.filter(i => i.severity === 'warning');
  const infos    = issues.filter(i => i.severity === 'info');

  if (issues.length === 0) return null;

  if (compact) {
    return (
      <div className="flex flex-wrap gap-1.5">
        {errors.map((i, idx) => (
          <span key={idx} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.6rem', fontWeight: 700, background: 'rgba(255,77,77,0.12)', color: '#FF4D4D', border: '1px solid rgba(255,77,77,0.25)', borderRadius: 999, padding: '2px 8px' }}>
            <XCircle size={10} />{i.code}
          </span>
        ))}
        {warnings.map((i, idx) => (
          <span key={idx} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.6rem', fontWeight: 700, background: 'rgba(255,177,90,0.12)', color: '#FFB15A', border: '1px solid rgba(255,177,90,0.25)', borderRadius: 999, padding: '2px 8px' }}>
            <AlertTriangle size={10} />{i.code}
          </span>
        ))}
      </div>
    );
  }

  return (
    <div style={{ background: '#14181E', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 16 }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {errors.length > 0 ? <XCircle size={15} style={{ color: '#FF4D4D' }} /> : <AlertTriangle size={15} style={{ color: '#FFB15A' }} />}
          <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#fff', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{title}</span>
          {errors.length > 0   && <span style={{ fontSize: '0.6rem', fontWeight: 700, background: 'rgba(255,77,77,0.15)', color: '#FF4D4D', border: '1px solid rgba(255,77,77,0.3)', borderRadius: 999, padding: '1px 7px' }}>{errors.length} error{errors.length > 1 ? 's' : ''}</span>}
          {warnings.length > 0 && <span style={{ fontSize: '0.6rem', fontWeight: 700, background: 'rgba(255,177,90,0.15)', color: '#FFB15A', border: '1px solid rgba(255,177,90,0.3)', borderRadius: 999, padding: '1px 7px' }}>{warnings.length} warning{warnings.length > 1 ? 's' : ''}</span>}
        </div>
        {onDismiss && (
          <button onClick={onDismiss} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)' }}>
            <X size={14} />
          </button>
        )}
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <p style={{ fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#FF4D4D', marginBottom: 8 }}>Errors — must fix before saving</p>
          {errors.map((issue, i) => <IssueRow key={i} issue={issue} />)}
        </div>
      )}

      {/* Warnings */}
      {warnings.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <p style={{ fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#FFB15A', marginBottom: 8 }}>Warnings — review before saving</p>
          {warnings.map((issue, i) => <IssueRow key={i} issue={issue} />)}
        </div>
      )}

      {/* Info */}
      {infos.length > 0 && (
        <div>
          <p style={{ fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#4DA3FF', marginBottom: 8 }}>Information</p>
          {infos.map((issue, i) => <IssueRow key={i} issue={issue} />)}
        </div>
      )}
    </div>
  );
}