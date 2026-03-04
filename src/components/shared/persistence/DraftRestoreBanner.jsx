/**
 * DraftRestoreBanner
 * ==================
 * Shown at the top of a form when a saved draft is detected.
 * One-click restore applies draft data to the form.
 *
 * Props:
 *   hasDraft   - bool
 *   draft      - draft object { data, savedAt, entityType }
 *   onRestore  - fn
 *   onDismiss  - fn
 */

import React from 'react';
import { RotateCcw, X, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function DraftRestoreBanner({ hasDraft, draft, onRestore, onDismiss }) {
  if (!hasDraft || !draft) return null;

  const ago = draft.savedAt
    ? formatDistanceToNow(new Date(draft.savedAt), { addSuffix: true })
    : 'recently';

  return (
    <div
      role="alert"
      style={{
        background: 'rgba(255,177,90,0.07)',
        border: '1px solid rgba(255,177,90,0.25)',
        borderRadius: 10,
        padding: '10px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        marginBottom: 12,
        flexWrap: 'wrap',
      }}
    >
      <Clock size={13} style={{ color: '#FFB15A', flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#fff' }}>
          Unsaved draft found
        </span>
        <span style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.4)', marginLeft: 6 }}>
          Auto-saved {ago}
        </span>
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <button
          onClick={onRestore}
          style={{ fontSize: '0.62rem', fontWeight: 700, padding: '4px 10px', background: 'rgba(255,177,90,0.12)', border: '1px solid rgba(255,177,90,0.3)', color: '#FFB15A', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
        >
          <RotateCcw size={10} /> Restore Draft
        </button>
        <button
          onClick={onDismiss}
          style={{ padding: '4px 7px', background: 'none', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 6, cursor: 'pointer', color: 'rgba(255,255,255,0.3)' }}
          title="Dismiss draft"
        >
          <X size={10} />
        </button>
      </div>
    </div>
  );
}