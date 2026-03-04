/**
 * DebugModeToggle
 * ===============
 * Admin-only toggle card for the Profile/Settings page.
 * Enables/disables the debug capture engine and shows the DebugViewer.
 *
 * Usage: drop inside Profile.jsx (admin role check built in).
 */

import React, { useState, useEffect } from 'react';
import { Bug, ChevronRight } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { enableDebugMode, disableDebugMode, isDebugEnabled } from './debugCapture';
import DebugViewer from './DebugViewer';

export default function DebugModeToggle({ user }) {
  const isAdmin = user?.role === 'admin';
  const [enabled, setEnabled]     = useState(isDebugEnabled);
  const [viewerOpen, setViewer]   = useState(false);

  // Re-check localStorage on mount
  useEffect(() => { setEnabled(isDebugEnabled()); }, []);

  if (!isAdmin) return null;

  const handleToggle = (val) => {
    setEnabled(val);
    if (val) {
      enableDebugMode(user?.id || user?.email);
    } else {
      disableDebugMode();
      setViewer(false);
    }
  };

  return (
    <>
      <div style={{ background: '#14181E', border: `1px solid ${enabled ? 'rgba(255,90,31,0.3)' : 'rgba(255,255,255,0.06)'}`, borderRadius: 14, padding: '14px 16px', marginBottom: 12 }}>
        {/* Header row */}
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Bug size={15} style={{ color: enabled ? '#FF5A1F' : 'rgba(255,255,255,0.35)' }} />
            <Label htmlFor="debug-mode-toggle" style={{ fontSize: '0.75rem', fontWeight: 700, color: '#fff', cursor: 'pointer' }}>
              Debug Mode
            </Label>
            {enabled && (
              <span style={{ fontSize: '0.55rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', background: 'rgba(255,90,31,0.15)', color: '#FF5A1F', border: '1px solid rgba(255,90,31,0.3)', borderRadius: 999, padding: '1px 7px' }}>
                ACTIVE
              </span>
            )}
          </div>
          <Switch
            id="debug-mode-toggle"
            checked={enabled}
            onCheckedChange={handleToggle}
          />
        </div>

        <p style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.38)', margin: '4px 0 0', lineHeight: 1.5 }}>
          Captures HTTP requests, console errors, router events, and state snapshots to help reproduce bugs. PII is automatically sanitized.
          {!enabled && ' Enable only when diagnosing a specific issue.'}
        </p>

        {enabled && (
          <button
            onClick={() => setViewer(o => !o)}
            style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.65rem', fontWeight: 700, padding: '6px 12px', background: 'rgba(255,90,31,0.1)', border: '1px solid rgba(255,90,31,0.25)', color: '#FF8C42', borderRadius: 8, cursor: 'pointer', width: '100%', justifyContent: 'center' }}
          >
            {viewerOpen ? 'Hide' : 'Open'} Debug Viewer
            <ChevronRight size={12} style={{ transform: viewerOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }} />
          </button>
        )}

        <p style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.2)', margin: '8px 0 0' }}>
          Admin only · Logs stored in IndexedDB · Not visible to regular users
        </p>
      </div>

      {enabled && viewerOpen && <DebugViewer onClose={() => setViewer(false)} />}
    </>
  );
}