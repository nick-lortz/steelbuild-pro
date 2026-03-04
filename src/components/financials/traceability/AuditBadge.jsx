/**
 * AuditBadge + VersionHistory
 * ============================
 * Renders an inline audit badge for financial documents (invoices, COs,
 * SOV snapshots, budgets). Shows version number, verification status, and
 * opens a version history panel with revert capability.
 *
 * Props:
 *   documentId      {string}
 *   documentType    {string}                — e.g. "Invoice", "ChangeOrder"
 *   currentVersion  {number}               — e.g. 3
 *   verifiedVersion {number|null}          — last verified version number
 *   status          {'verified'|'flagged'|'pending'}
 *   versions        {Version[]}
 *   onRevert        {(version: Version) => Promise<void>}
 *   compact         {boolean}              — show just the pill, no text
 *
 * Version:
 * {
 *   version:      number,
 *   changed_by:   string,
 *   changed_at:   string,  // ISO
 *   summary:      string,
 *   is_verified:  boolean,
 *   snapshot:     object,  // full data at this version
 * }
 */

import React, { useState } from 'react';
import { ShieldCheck, AlertCircle, AlertTriangle, Clock, User, RotateCcw, ChevronDown, FileText, X, Lock } from 'lucide-react';
import { format, parseISO } from 'date-fns';

// ─── Config ───────────────────────────────────────────────────────────────────

const STATUS = {
  verified: {
    color: '#4DD6A4', bg: 'rgba(77,214,164,0.1)',  border: 'rgba(77,214,164,0.25)',
    icon: ShieldCheck,   label: 'Verified',         pill: 'VERIFIED',
  },
  flagged: {
    color: '#FF4D4D', bg: 'rgba(255,77,77,0.1)',   border: 'rgba(255,77,77,0.25)',
    icon: AlertCircle,   label: 'Discrepancy',      pill: 'FLAGGED',
  },
  pending: {
    color: '#FFB15A', bg: 'rgba(255,177,90,0.1)',  border: 'rgba(255,177,90,0.25)',
    icon: AlertTriangle, label: 'Unverified',       pill: 'PENDING',
  },
};

function formatTs(iso) {
  if (!iso) return '—';
  try { return format(parseISO(iso), 'MMM d, yyyy h:mm a'); } catch { return iso; }
}

// ─── Version Row ──────────────────────────────────────────────────────────────

function VersionRow({ version, isCurrent, onRevert, reverting }) {
  const isVerified = version.is_verified;

  return (
    <div style={{
      padding: '12px 16px',
      borderBottom: '1px solid rgba(255,255,255,0.04)',
      background: isCurrent ? 'rgba(255,90,31,0.04)' : 'transparent',
      borderLeft: isCurrent ? '3px solid rgba(255,90,31,0.4)' : '3px solid transparent',
    }}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Version tag + verified badge */}
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span style={{ fontSize: '0.65rem', fontWeight: 800, color: isCurrent ? '#FF8C42' : 'rgba(255,255,255,0.5)' }}>
              v{version.version}
            </span>
            {isCurrent && (
              <span style={{ fontSize: '0.55rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', background: 'rgba(255,90,31,0.15)', color: '#FF8C42', border: '1px solid rgba(255,90,31,0.3)', borderRadius: 999, padding: '1px 6px' }}>
                Current
              </span>
            )}
            {isVerified && (
              <span style={{ fontSize: '0.55rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', background: 'rgba(77,214,164,0.1)', color: '#4DD6A4', border: '1px solid rgba(77,214,164,0.2)', borderRadius: 999, padding: '1px 6px', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                <Lock size={8} /> Verified
              </span>
            )}
          </div>

          {/* Summary */}
          <p style={{ fontSize: '0.72rem', color: isCurrent ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.45)', margin: 0, marginBottom: 6 }}>
            {version.summary || 'No change summary recorded.'}
          </p>

          {/* Meta */}
          <div className="flex items-center gap-4 flex-wrap">
            <span className="flex items-center gap-1" style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)' }}>
              <User size={9} />{version.changed_by || 'System'}
            </span>
            <span className="flex items-center gap-1" style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)' }}>
              <Clock size={9} />{formatTs(version.changed_at)}
            </span>
          </div>
        </div>

        {/* Revert button — only on non-current versions */}
        {!isCurrent && onRevert && (
          <button
            onClick={() => onRevert(version)}
            disabled={reverting}
            title={`Revert document to v${version.version}. This creates a new version — no data is deleted.`}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              fontSize: '0.62rem', fontWeight: 700, padding: '5px 10px',
              background: reverting ? 'rgba(255,255,255,0.04)' : 'rgba(255,90,31,0.08)',
              border: `1px solid ${reverting ? 'rgba(255,255,255,0.08)' : 'rgba(255,90,31,0.25)'}`,
              color: reverting ? 'rgba(255,255,255,0.3)' : '#FF8C42',
              borderRadius: 7, cursor: reverting ? 'not-allowed' : 'pointer',
              flexShrink: 0, whiteSpace: 'nowrap',
            }}
          >
            <RotateCcw size={10} />
            {reverting ? 'Reverting…' : `Revert to v${version.version}`}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AuditBadge({
  documentId,
  documentType = 'Document',
  currentVersion = 1,
  verifiedVersion = null,
  status = 'pending',
  versions = [],
  onRevert,
  compact = false,
}) {
  const [open, setOpen] = useState(false);
  const [reverting, setReverting] = useState(false);
  const [revertTarget, setRevertTarget] = useState(null);
  const [confirmed, setConfirmed] = useState(false);

  const cfg = STATUS[status] || STATUS.pending;
  const StatusIcon = cfg.icon;

  const handleRevert = async (version) => {
    if (!confirmed) {
      setRevertTarget(version);
      setConfirmed(true);
      return;
    }
    setReverting(true);
    try {
      await onRevert?.(version);
      setOpen(false);
    } finally {
      setReverting(false);
      setConfirmed(false);
      setRevertTarget(null);
    }
  };

  const badge = (
    <button
      onClick={() => setOpen(o => !o)}
      title={`${documentType} — ${cfg.label} — v${currentVersion}. Click for version history.`}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        background: cfg.bg, border: `1px solid ${cfg.border}`,
        borderRadius: 999, padding: compact ? '3px 8px' : '4px 11px',
        cursor: 'pointer',
      }}
    >
      <StatusIcon size={compact ? 10 : 11} style={{ color: cfg.color }} />
      {!compact && (
        <span style={{ fontSize: '0.6rem', fontWeight: 700, color: cfg.color, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          {cfg.pill}
        </span>
      )}
      <span style={{ fontSize: '0.6rem', fontWeight: 700, color: 'rgba(255,255,255,0.3)' }}>
        v{currentVersion}
      </span>
      {verifiedVersion && verifiedVersion < currentVersion && (
        <span style={{ fontSize: '0.55rem', color: '#FFB15A', fontWeight: 600 }}>
          (verified v{verifiedVersion})
        </span>
      )}
      <ChevronDown size={10} style={{ color: 'rgba(255,255,255,0.25)' }} />
    </button>
  );

  return (
    <div style={{ display: 'inline-block', position: 'relative' }}>
      {badge}

      {/* ── Version history dropdown panel ── */}
      {open && (
        <>
          <div onClick={() => { setOpen(false); setConfirmed(false); }} style={{ position: 'fixed', inset: 0, zIndex: 49 }} />
          <div style={{
            position: 'absolute', top: '100%', right: 0, marginTop: 8,
            width: 'min(440px, 90vw)',
            background: '#0D1117',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 14,
            boxShadow: '0 24px 60px rgba(0,0,0,0.7)',
            zIndex: 50,
            overflow: 'hidden',
          }}>
            {/* Panel header */}
            <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div className="flex items-center gap-2">
                <FileText size={13} style={{ color: '#FF8C42' }} />
                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#fff' }}>Version History</span>
                <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.05)', padding: '1px 7px', borderRadius: 999 }}>
                  {documentType} · {versions.length} version{versions.length !== 1 ? 's' : ''}
                </span>
              </div>
              <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)' }}>
                <X size={13} />
              </button>
            </div>

            {/* Revert confirmation */}
            {confirmed && revertTarget && (
              <div style={{ padding: '10px 16px', background: 'rgba(255,177,90,0.08)', borderBottom: '1px solid rgba(255,177,90,0.2)' }}>
                <p style={{ fontSize: '0.68rem', color: '#FFB15A', margin: '0 0 8px' }}>
                  ⚠ Reverting to <strong>v{revertTarget.version}</strong> will create a new version — no history is deleted. Confirm?
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleRevert(revertTarget)}
                    disabled={reverting}
                    style={{ fontSize: '0.65rem', fontWeight: 700, padding: '5px 12px', background: 'rgba(255,90,31,0.15)', border: '1px solid rgba(255,90,31,0.4)', color: '#FF8C42', borderRadius: 7, cursor: 'pointer' }}
                  >
                    {reverting ? 'Reverting…' : 'Yes, Revert'}
                  </button>
                  <button
                    onClick={() => { setConfirmed(false); setRevertTarget(null); }}
                    style={{ fontSize: '0.65rem', fontWeight: 700, padding: '5px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', borderRadius: 7, cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Version list */}
            <div style={{ maxHeight: 360, overflowY: 'auto' }}>
              {versions.length === 0 ? (
                <p style={{ padding: 20, fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', textAlign: 'center' }}>
                  No version history available.
                </p>
              ) : (
                versions.map((v) => (
                  <VersionRow
                    key={v.version}
                    version={v}
                    isCurrent={v.version === currentVersion}
                    onRevert={onRevert ? handleRevert : null}
                    reverting={reverting && revertTarget?.version === v.version}
                  />
                ))
              )}
            </div>

            {/* Footer note */}
            <div style={{ padding: '10px 16px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <p style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.2)', margin: 0 }}>
                Revert creates a new version — all history is preserved for audit compliance.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}