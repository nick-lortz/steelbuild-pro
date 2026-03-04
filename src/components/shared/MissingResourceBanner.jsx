/**
 * MissingResourceBanner
 * =====================
 * Inline (non-navigating) overlay shown when a resource returns 404.
 * Preserves local edits and offers Retry / Restore Last Known / Discard.
 *
 * Does NOT call window.location. Does NOT reset any global state.
 *
 * Props:
 *   entityType    - string  e.g. 'Task'
 *   entityId      - string
 *   hasPendingEdits - bool
 *   onRetry       - fn
 *   onRestore     - fn (only if hasPendingEdits)
 *   onDiscard     - fn  (navigate away cleanly)
 */

import React from 'react';
import { AlertCircle, RefreshCw, RotateCcw, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function MissingResourceBanner({
  entityType = 'Resource',
  entityId,
  hasPendingEdits = false,
  onRetry,
  onRestore,
  onDiscard,
}) {
  const navigate = useNavigate();

  const handleDiscard = () => {
    if (onDiscard) { onDiscard(); return; }
    // Safe client-side back — never a hard reload
    if (window.history.length > 1) navigate(-1);
    else navigate('/', { replace: true });
  };

  return (
    <div
      role="alert"
      aria-live="assertive"
      style={{
        background: 'rgba(255,77,77,0.07)',
        border: '1px solid rgba(255,77,77,0.25)',
        borderRadius: 12,
        padding: '14px 16px',
        display: 'flex',
        gap: 12,
        alignItems: 'flex-start',
        marginBottom: 12,
      }}
    >
      <AlertCircle size={16} style={{ color: '#FF4D4D', flexShrink: 0, marginTop: 1 }} />

      <div style={{ flex: 1 }}>
        <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#fff', marginBottom: 3 }}>
          {entityType} not found on server
        </p>
        <p style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.45)', marginBottom: hasPendingEdits ? 10 : 0 }}>
          This {entityType.toLowerCase()} returned a 404.
          {hasPendingEdits
            ? ' Your local edits are preserved — you can restore them or discard and go back.'
            : ' The record may have been deleted by another user. Retry to check, or go back.'}
        </p>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {onRetry && (
            <button
              onClick={onRetry}
              style={{ fontSize: '0.62rem', fontWeight: 700, padding: '5px 11px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.7)', borderRadius: 7, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}
            >
              <RefreshCw size={10} /> Retry
            </button>
          )}

          {hasPendingEdits && onRestore && (
            <button
              onClick={onRestore}
              style={{ fontSize: '0.62rem', fontWeight: 700, padding: '5px 11px', background: 'rgba(255,177,90,0.1)', border: '1px solid rgba(255,177,90,0.3)', color: '#FFB15A', borderRadius: 7, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}
            >
              <RotateCcw size={10} /> Restore Local Edits
            </button>
          )}

          <button
            onClick={handleDiscard}
            style={{ fontSize: '0.62rem', fontWeight: 700, padding: '5px 11px', background: 'rgba(255,77,77,0.08)', border: '1px solid rgba(255,77,77,0.2)', color: '#FF4D4D', borderRadius: 7, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}
          >
            <X size={10} /> {hasPendingEdits ? 'Discard & Go Back' : 'Go Back'}
          </button>
        </div>
      </div>
    </div>
  );
}