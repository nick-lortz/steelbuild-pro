/**
 * ReportIssueModal
 * ================
 * Triggered from ErrorBanner "Report Issue" action.
 * Attaches latest debug log (if available) and an editable repro template.
 * Submits to POST /internal/debug/logs or copies to clipboard as fallback.
 */

import React, { useState, useEffect } from 'react';
import { X, Download, Copy, Send, Bug, CheckCircle2 } from 'lucide-react';

const DEFAULT_TEMPLATE = (resource, ts) => `## Issue Report
**Resource:** ${resource || 'Unknown'}
**Time:** ${ts || new Date().toISOString()}
**URL:** ${window.location.href}
**Browser:** ${navigator.userAgent}

## Steps to Reproduce
1. Navigate to: ${window.location.pathname}
2. Performed action: [describe what you were doing]
3. Expected: [what should have happened]
4. Actual: 404 / resource missing

## Additional Context
[Add any notes here — piece marks, project number, RFI #, etc.]
`;

export default function ReportIssueModal({ error, resourceName, timestamp, onClose }) {
  const [template, setTemplate]   = useState('');
  const [hasDebugLog, setHasLog]  = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [copying, setCopying]     = useState(false);
  const [includeLog, setIncludeLog] = useState(true);

  useEffect(() => {
    setTemplate(DEFAULT_TEMPLATE(resourceName, timestamp));
    // Check if debug capture engine has a recent incident
    setHasLog(!!(window.__SBP_LAST_INCIDENT__));
  }, [resourceName, timestamp]);

  const handleSubmit = async () => {
    const payload = {
      report: template,
      url: window.location.href,
      timestamp: new Date().toISOString(),
      error: error?.message || String(error),
      debugLog: includeLog && window.__SBP_LAST_INCIDENT__
        ? window.__SBP_LAST_INCIDENT__.incident
        : null,
    };

    try {
      await fetch('/internal/debug/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2)).catch(() => {});
    }
    setSubmitted(true);
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(template);
    setCopying(true);
    setTimeout(() => setCopying(false), 1500);
  };

  const handleDownloadLog = () => {
    const incident = window.__SBP_LAST_INCIDENT__?.incident;
    if (!incident) return;
    const blob = new Blob([JSON.stringify(incident, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `sbp-incident-${Date.now()}.json`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Report Issue"
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.75)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          background: '#0D1117',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 16,
          width: 'min(580px, 100%)',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 24px 60px rgba(0,0,0,0.8)',
        }}
      >
        {/* Header */}
        <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Bug size={14} style={{ color: '#4DA3FF' }} />
          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#fff', flex: 1 }}>Report Issue</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', padding: 4 }} aria-label="Close">
            <X size={14} />
          </button>
        </div>

        <div style={{ padding: '16px 18px' }}>
          {submitted ? (
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <CheckCircle2 size={32} style={{ color: '#4DD6A4', margin: '0 auto 12px' }} />
              <p style={{ fontSize: '0.8rem', fontWeight: 700, color: '#fff', marginBottom: 6 }}>Report submitted</p>
              <p style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)' }}>Your report has been logged. No data was lost.</p>
              <button onClick={onClose} style={{ marginTop: 16, ...pillBtn('#4DD6A4') }}>Close</button>
            </div>
          ) : (
            <>
              {/* Context info */}
              <div style={{ background: '#14181E', borderRadius: 8, padding: '10px 12px', marginBottom: 14 }}>
                <p style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Error context</p>
                <p style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.55)', fontFamily: 'monospace' }}>
                  {resourceName && <><strong style={{ color: '#fff' }}>Resource:</strong> {resourceName}<br /></>}
                  <strong style={{ color: '#fff' }}>URL:</strong> {window.location.pathname}<br />
                  <strong style={{ color: '#fff' }}>Time:</strong> {timestamp}<br />
                  {error?.message && <><strong style={{ color: '#fff' }}>Error:</strong> {error.message}</>}
                </p>
              </div>

              {/* Debug log toggle */}
              {hasDebugLog && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <input
                    type="checkbox"
                    id="include-log"
                    checked={includeLog}
                    onChange={e => setIncludeLog(e.target.checked)}
                    style={{ accentColor: '#4DA3FF' }}
                  />
                  <label htmlFor="include-log" style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.55)', cursor: 'pointer' }}>
                    Attach latest debug log (capture available)
                  </label>
                  <button onClick={handleDownloadLog} style={{ fontSize: '0.58rem', fontWeight: 700, padding: '3px 8px', background: 'rgba(77,163,255,0.08)', border: '1px solid rgba(77,163,255,0.2)', color: '#4DA3FF', borderRadius: 5, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}>
                    <Download size={9} /> Download
                  </button>
                </div>
              )}

              {/* Editable repro template */}
              <label style={{ fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.3)', display: 'block', marginBottom: 6 }}>
                Reproduction steps (edit before sending)
              </label>
              <textarea
                value={template}
                onChange={e => setTemplate(e.target.value)}
                aria-label="Reproduction steps"
                style={{
                  width: '100%', minHeight: 200,
                  background: '#14181E',
                  border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: 8,
                  padding: '10px 12px',
                  fontSize: '0.65rem',
                  fontFamily: 'monospace',
                  color: 'rgba(255,255,255,0.7)',
                  resize: 'vertical',
                  boxSizing: 'border-box',
                  outline: 'none',
                }}
                onFocus={e => { e.target.style.borderColor = 'rgba(77,163,255,0.4)'; }}
                onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.07)'; }}
              />

              {/* Actions */}
              <div style={{ display: 'flex', gap: 8, marginTop: 14, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                <button onClick={handleCopy} style={pillBtn('rgba(255,255,255,0.4)')}>
                  <Copy size={10} /> {copying ? 'Copied!' : 'Copy'}
                </button>
                <button onClick={handleSubmit} style={pillBtn('#4DA3FF')}>
                  <Send size={10} /> Submit Report
                </button>
              </div>

              <p style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.2)', marginTop: 12 }}>
                No project data or financials are included — only the error context and steps you provide.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function pillBtn(color) {
  return {
    fontSize: '0.65rem', fontWeight: 700, padding: '6px 14px',
    background: `rgba(${color.startsWith('#') ? hexToRgb(color) : color}, 0.1)`,
    border: `1px solid rgba(${color.startsWith('#') ? hexToRgb(color) : color}, 0.3)`,
    color, borderRadius: 8, cursor: 'pointer',
    display: 'flex', alignItems: 'center', gap: 5,
  };
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return `${r},${g},${b}`;
}