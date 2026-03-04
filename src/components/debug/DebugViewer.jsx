/**
 * DebugViewer
 * ===========
 * Admin-only UI to view, inspect, and download debug logs.
 * Shows: last incident, event timeline, human-readable report, self-test runner.
 *
 * Props: none — reads from debugCapture engine.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Download, Trash2, FlaskConical, ChevronDown, ChevronRight, AlertCircle, CheckCircle2, RefreshCw, X, FileText, Clock, Wifi, WifiOff } from 'lucide-react';
import {
  getAllEvents, clearEvents, downloadLog, runDebugSelfTests, captureIncident
} from './debugCapture';

const SEV_COLOR = { fetch_404: '#FF4D4D', fetch_error: '#FF4D4D', console_error: '#FFB15A', uncaught_error: '#FF4D4D', unhandled_rejection: '#FFB15A', incident: '#FF5A1F', navigation: '#4DA3FF', fetch_request: '#4DD6A4', debug_enabled: '#4DA3FF', debug_disabled: '#6B7280' };

function EventRow({ event }) {
  const [open, setOpen] = useState(false);
  const color = SEV_COLOR[event.type] || 'rgba(255,255,255,0.4)';
  return (
    <div style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
      <button onClick={() => setOpen(o => !o)} style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, padding: '7px 12px', textAlign: 'left' }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
        <span style={{ fontSize: '0.58rem', fontFamily: 'monospace', color: 'rgba(255,255,255,0.3)', flexShrink: 0, whiteSpace: 'nowrap' }}>{event.timestamp?.slice(11, 19)}</span>
        <span style={{ fontSize: '0.6rem', fontWeight: 700, color, flexShrink: 0, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{event.type}</span>
        <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.45)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {event.data?.url || event.data?.message || event.data?.trigger || event.pathname || ''}
        </span>
        {open ? <ChevronDown size={11} style={{ color: 'rgba(255,255,255,0.25)', flexShrink: 0 }} /> : <ChevronRight size={11} style={{ color: 'rgba(255,255,255,0.25)', flexShrink: 0 }} />}
      </button>
      {open && (
        <div style={{ padding: '0 12px 10px 30px' }}>
          <pre style={{ fontSize: '0.6rem', fontFamily: 'monospace', color: 'rgba(255,255,255,0.5)', background: '#0D1117', borderRadius: 7, padding: '8px 10px', overflowX: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight: 300, margin: 0 }}>
            {JSON.stringify(event.data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

function IncidentReport({ incident, reprTemplate }) {
  const [editedTemplate, setEditedTemplate] = useState(reprTemplate);
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(editedTemplate).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); });
  };

  return (
    <div style={{ background: 'rgba(255,77,77,0.06)', border: '1px solid rgba(255,77,77,0.2)', borderRadius: 12, padding: 16, marginBottom: 12 }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <AlertCircle size={14} style={{ color: '#FF4D4D' }} />
          <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#fff' }}>Incident — {incident.incident_id}</span>
          <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)' }}>{incident.timestamp?.slice(0, 19).replace('T', ' ')}</span>
        </div>
        <button onClick={copy} style={{ fontSize: '0.6rem', fontWeight: 700, padding: '4px 10px', background: 'rgba(255,90,31,0.1)', border: '1px solid rgba(255,90,31,0.3)', color: '#FF8C42', borderRadius: 6, cursor: 'pointer' }}>
          {copied ? 'Copied!' : 'Copy Report'}
        </button>
      </div>
      <p style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>
        Trigger: <strong style={{ color: '#FF4D4D' }}>{incident.trigger}</strong> · URL: {incident.url}
      </p>
      <p style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)', marginBottom: 6 }}>Edit the reproduction steps below, then copy or download:</p>
      <textarea
        value={editedTemplate}
        onChange={e => setEditedTemplate(e.target.value)}
        style={{ width: '100%', minHeight: 200, background: '#0D1117', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, padding: '8px 10px', fontSize: '0.62rem', fontFamily: 'monospace', color: 'rgba(255,255,255,0.65)', resize: 'vertical', boxSizing: 'border-box' }}
      />
    </div>
  );
}

function TestResults({ results }) {
  if (!results) return null;
  const passed = results.filter(r => r.pass).length;
  return (
    <div style={{ background: '#14181E', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '12px 14px' }}>
      <div className="flex items-center gap-2 mb-3">
        <FlaskConical size={13} style={{ color: '#FF8C42' }} />
        <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Self-Tests</span>
        <span style={{ fontSize: '0.6rem', fontWeight: 700, color: passed === results.length ? '#4DD6A4' : '#FF4D4D' }}>{passed}/{results.length} passing</span>
      </div>
      {results.map((r, i) => (
        <div key={i} className="flex items-center gap-2" style={{ padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
          {r.pass ? <CheckCircle2 size={11} style={{ color: '#4DD6A4', flexShrink: 0 }} /> : <X size={11} style={{ color: '#FF4D4D', flexShrink: 0 }} />}
          <span style={{ fontSize: '0.65rem', color: r.pass ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.85)', flex: 1 }}>{r.label}</span>
          {r.detail && r.detail !== 'PASS' && <span style={{ fontSize: '0.58rem', fontFamily: 'monospace', color: r.pass ? '#4DD6A4' : '#FF4D4D' }}>{r.detail}</span>}
        </div>
      ))}
    </div>
  );
}

export default function DebugViewer({ onClose }) {
  const [events, setEvents]         = useState([]);
  const [testResults, setTestResults] = useState(null);
  const [testing, setTesting]       = useState(false);
  const [tab, setTab]               = useState('timeline');
  const [incident, setIncident]     = useState(window.__SBP_LAST_INCIDENT__ || null);
  const [filter, setFilter]         = useState('');
  const [loading, setLoading]       = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    const all = await getAllEvents();
    setEvents(all.reverse()); // newest first
    setIncident(window.__SBP_LAST_INCIDENT__ || null);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
    const handler = (e) => { setIncident(e.detail); setTab('incident'); };
    window.addEventListener('sbp:incident', handler);
    return () => window.removeEventListener('sbp:incident', handler);
  }, [refresh]);

  const handleClear = async () => { await clearEvents(); refresh(); };
  const handleTest  = async () => { setTesting(true); const r = await runDebugSelfTests(); setTestResults(r); setTesting(false); setTab('tests'); };
  const handleSimulate404 = async () => { await captureIncident('404_detected', { url: '/simulated/missing', trigger: '404 HTTP response (manual test)', request: { url: '/api/test/missing', status: 404, method: 'GET' } }); refresh(); setTab('incident'); };

  const filteredEvents = filter
    ? events.filter(e => JSON.stringify(e).toLowerCase().includes(filter.toLowerCase()))
    : events;

  const TABS = [
    { id: 'timeline', label: `Events (${events.length})` },
    { id: 'incident', label: 'Last Incident' },
    { id: 'tests',    label: 'Self-Tests' },
  ];

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', padding: 16, pointerEvents: 'none' }}>
      <div style={{ width: 'min(540px, 100vw)', maxHeight: '90vh', pointerEvents: 'all', background: '#0D1117', border: '1px solid rgba(255,90,31,0.25)', borderRadius: 16, boxShadow: '0 24px 60px rgba(0,0,0,0.8)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#FF5A1F', boxShadow: '0 0 6px #FF5A1F' }} />
          <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#fff', flex: 1, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Debug Mode Active</span>
          <div className="flex items-center gap-1.5">
            <button onClick={handleSimulate404} title="Simulate 404 to test capture" style={{ fontSize: '0.58rem', fontWeight: 700, padding: '3px 8px', background: 'rgba(255,77,77,0.1)', border: '1px solid rgba(255,77,77,0.25)', color: '#FF4D4D', borderRadius: 5, cursor: 'pointer' }}>Sim 404</button>
            <button onClick={handleTest} disabled={testing} title="Run self-tests" style={{ fontSize: '0.58rem', fontWeight: 700, padding: '3px 8px', background: 'rgba(255,177,90,0.1)', border: '1px solid rgba(255,177,90,0.25)', color: '#FFB15A', borderRadius: 5, cursor: 'pointer' }}>
              <FlaskConical size={10} style={{ display: 'inline', marginRight: 3 }} />
              {testing ? '…' : 'Tests'}
            </button>
            <button onClick={downloadLog} title="Download raw log JSON" style={{ fontSize: '0.58rem', fontWeight: 700, padding: '3px 8px', background: 'rgba(255,90,31,0.1)', border: '1px solid rgba(255,90,31,0.25)', color: '#FF8C42', borderRadius: 5, cursor: 'pointer' }}>
              <Download size={10} style={{ display: 'inline', marginRight: 3 }} />Log
            </button>
            <button onClick={handleClear} title="Clear all captured events" style={{ fontSize: '0.58rem', fontWeight: 700, padding: '3px 8px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)', borderRadius: 5, cursor: 'pointer' }}>
              <Trash2 size={10} style={{ display: 'inline', marginRight: 3 }} />Clear
            </button>
            <button onClick={refresh} style={{ padding: '3px 6px', background: 'none', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 5, cursor: 'pointer', color: 'rgba(255,255,255,0.3)' }}>
              <RefreshCw size={10} className={loading ? 'animate-spin' : ''} />
            </button>
            {onClose && (
              <button onClick={onClose} style={{ padding: '3px 6px', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)' }}>
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '0 12px', flexShrink: 0 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px 10px 7px', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: tab === t.id ? '#FF8C42' : 'rgba(255,255,255,0.3)', borderBottom: tab === t.id ? '2px solid #FF8C42' : '2px solid transparent', marginBottom: -1 }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {tab === 'timeline' && (
            <>
              <div style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <input
                  value={filter}
                  onChange={e => setFilter(e.target.value)}
                  placeholder="Filter events…"
                  style={{ width: '100%', background: '#14181E', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 6, padding: '5px 9px', fontSize: '0.65rem', color: 'rgba(255,255,255,0.6)', boxSizing: 'border-box' }}
                />
              </div>
              {filteredEvents.length === 0
                ? <p style={{ padding: 20, fontSize: '0.68rem', color: 'rgba(255,255,255,0.25)', textAlign: 'center' }}>No events captured yet. Navigate around to see HTTP requests and errors.</p>
                : filteredEvents.map((e, i) => <EventRow key={e.id || i} event={e} />)
              }
            </>
          )}

          {tab === 'incident' && (
            <div style={{ padding: 14 }}>
              {incident
                ? <IncidentReport incident={incident.incident} reprTemplate={incident.reprTemplate} />
                : <p style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.25)', textAlign: 'center', padding: 20 }}>No incident captured yet. Click "Sim 404" to test.</p>
              }
            </div>
          )}

          {tab === 'tests' && (
            <div style={{ padding: 14 }}>
              {testResults
                ? <TestResults results={testResults} />
                : <p style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.25)', textAlign: 'center', padding: 20 }}>Click "Tests" to run the self-test suite.</p>
              }
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '8px 14px', borderTop: '1px solid rgba(255,255,255,0.05)', flexShrink: 0 }}>
          <p style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.2)', margin: 0 }}>
            PII sanitized · Payloads truncated at 200KB · Max upload 5MB · IndexedDB ring buffer (500 events)
          </p>
        </div>
      </div>
    </div>
  );
}