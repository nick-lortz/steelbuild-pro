/**
 * QueueStatusBar
 * ==============
 * Compact indicator shown in the app (e.g. Layout footer or page header)
 * when there are pending/failed queue items.
 *
 * Props: { pendingCount, failedCount, onRetryAll, onViewQueue }
 */

import React from 'react';
import { RefreshCw, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

export default function QueueStatusBar({ pendingCount, failedCount, processing, onRetryAll, onViewQueue }) {
  if (pendingCount === 0 && failedCount === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 20,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9000,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        background: '#0D1117',
        border: `1px solid ${failedCount > 0 ? 'rgba(255,77,77,0.3)' : 'rgba(255,177,90,0.3)'}`,
        borderRadius: 999,
        padding: '7px 16px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
        fontSize: '0.65rem',
        fontWeight: 700,
        whiteSpace: 'nowrap',
      }}
    >
      {processing ? (
        <Loader2 size={13} className="animate-spin" style={{ color: '#FFB15A' }} />
      ) : failedCount > 0 ? (
        <AlertCircle size={13} style={{ color: '#FF4D4D' }} />
      ) : (
        <RefreshCw size={13} style={{ color: '#FFB15A' }} className="animate-spin" />
      )}

      {pendingCount > 0 && (
        <span style={{ color: '#FFB15A' }}>
          {pendingCount} action{pendingCount !== 1 ? 's' : ''} queued
        </span>
      )}
      {failedCount > 0 && (
        <span style={{ color: '#FF4D4D' }}>
          {failedCount} failed
        </span>
      )}

      {failedCount > 0 && onRetryAll && (
        <button
          onClick={onRetryAll}
          style={{ fontSize: '0.58rem', fontWeight: 700, padding: '3px 9px', background: 'rgba(255,77,77,0.1)', border: '1px solid rgba(255,77,77,0.25)', color: '#FF4D4D', borderRadius: 999, cursor: 'pointer' }}
        >
          Retry All
        </button>
      )}

      {onViewQueue && (
        <button
          onClick={onViewQueue}
          style={{ fontSize: '0.58rem', fontWeight: 700, padding: '3px 9px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)', borderRadius: 999, cursor: 'pointer' }}
        >
          View
        </button>
      )}
    </div>
  );
}