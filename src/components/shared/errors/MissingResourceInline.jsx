/**
 * MissingResourceInline
 * =====================
 * Replaces the content of a widget/card when its resource returns 404.
 * Does NOT navigate. Does NOT clear surrounding state.
 *
 * Use inside task cards, RFI rows, WP tiles etc. instead of returning null.
 *
 * Props:
 *   entityType   - 'Task' | 'RFI' | 'Work Package' | ...
 *   entityId     - string
 *   onRetry      - fn
 *   compact      - bool  (table-row mode vs card mode)
 */

import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

export default function MissingResourceInline({ entityType = 'Resource', entityId, onRetry, compact = false }) {
  if (compact) {
    return (
      <span
        style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.62rem', color: 'rgba(255,77,77,0.75)', fontStyle: 'italic' }}
        role="status"
        aria-label={`${entityType} not found`}
      >
        <AlertCircle size={10} style={{ flexShrink: 0 }} aria-hidden="true" />
        {entityType} missing
        {onRetry && (
          <button
            onClick={onRetry}
            aria-label={`Retry loading ${entityType}`}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4DD6A4', display: 'flex', alignItems: 'center', gap: 2, fontSize: '0.6rem', fontWeight: 700, padding: 0 }}
          >
            <RefreshCw size={9} aria-hidden="true" /> Retry
          </button>
        )}
      </span>
    );
  }

  return (
    <div
      role="status"
      aria-label={`${entityType} not found`}
      style={{
        background: 'rgba(255,77,77,0.04)',
        border: '1px dashed rgba(255,77,77,0.2)',
        borderRadius: 10,
        padding: '14px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}
    >
      <AlertCircle size={14} style={{ color: 'rgba(255,77,77,0.6)', flexShrink: 0 }} aria-hidden="true" />
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: '0.68rem', fontWeight: 700, color: 'rgba(255,255,255,0.6)', margin: 0 }}>
          {entityType} not found
        </p>
        {entityId && (
          <p style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.25)', margin: '2px 0 0', fontFamily: 'monospace' }}>
            ID: {entityId}
          </p>
        )}
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          aria-label={`Retry loading ${entityType}`}
          style={{ fontSize: '0.62rem', fontWeight: 700, padding: '5px 11px', background: 'rgba(77,214,164,0.07)', border: '1px solid rgba(77,214,164,0.2)', color: '#4DD6A4', borderRadius: 7, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
        >
          <RefreshCw size={10} aria-hidden="true" /> Retry
        </button>
      )}
    </div>
  );
}