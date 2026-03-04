/**
 * ReconciliationDashboard
 * =======================
 * Widget / full-page view for financial reconciliation status.
 * Shows: last-run status, top mismatches, trend sparklines, QA queue.
 *
 * Props:
 *   projectId  {string|null} — null = portfolio view
 *   compact    {boolean}     — widget mode (no QA queue, no export)
 */

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { AlertCircle, AlertTriangle, CheckCircle2, RefreshCw, Download, ShieldCheck, Clock, User, Lock, ChevronDown, ChevronRight, FileText, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const SEV_COLOR = { critical: '#FF4D4D', high: '#FFB15A', medium: '#FFD580', low: '#4DD6A4' };
const SEV_BG    = { critical: 'rgba(255,77,77,0.1)', high: 'rgba(255,177,90,0.1)', medium: 'rgba(255,213,128,0.1)', low: 'rgba(77,214,164,0.1)' };
const STATUS_ICON = { passed: CheckCircle2, warning: AlertTriangle, failed: AlertCircle };

function SevBadge({ sev }) {
  return (
    <span style={{ fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', background: SEV_BG[sev] || SEV_BG.low, color: SEV_COLOR[sev] || SEV_COLOR.low, border: `1px solid ${SEV_COLOR[sev] || SEV_COLOR.low}40`, borderRadius: 999, padding: '1px 7px' }}>
      {sev}
    </span>
  );
}

function Sparkline({ values = [] }) {
  if (values.length < 2) return null;
  const max = Math.max(...values, 1);
  const w = 80, h = 28;
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * w},${h - (v / max) * h}`).join(' ');
  return (
    <svg width={w} height={h} style={{ display: 'block' }}>
      <polyline points={pts} fill="none" stroke="#FF8C42" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

// ─── Finding Row ──────────────────────────────────────────────────────────────

function FindingRow({ finding }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', textAlign: 'left' }}
      >
        <SevBadge sev={finding.severity} />
        <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.7)', flex: 1 }}>{finding.check_name}</span>
        <span style={{ fontSize: '0.65rem', color: finding.delta < 0 ? '#FF4D4D' : '#4DD6A4', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
          {finding.delta > 0 ? '+' : ''}{Number(finding.delta).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
        </span>
        {open ? <ChevronDown size={12} style={{ color: 'rgba(255,255,255,0.3)', flexShrink: 0 }} /> : <ChevronRight size={12} style={{ color: 'rgba(255,255,255,0.3)', flexShrink: 0 }} />}
      </button>
      {open && (
        <div style={{ padding: '0 14px 10px 14px', borderTop: '1px solid rgba(255,255,255,0.03)' }}>
          <p style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.55)', margin: '8px 0 4px' }}>{finding.description}</p>
          <div className="flex flex-wrap gap-4">
            <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)' }}>Project: {finding.project_id}</span>
            <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)' }}>Category: {finding.category}</span>
            <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)' }}>Status: {finding.status}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── QA Queue Row ─────────────────────────────────────────────────────────────

const REQUIRED_ROLES = ['estimator', 'project_manager', 'finance'];

function QAQueueRow({ item, onSignOff, onReject, currentUser }) {
  const [noteOpen, setNoteOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const signed = (item.signoffs || []).map(s => s.role);
  const remaining = REQUIRED_ROLES.filter(r => !signed.includes(r));

  return (
    <div style={{ background: '#14181E', border: `1px solid ${item.locked ? 'rgba(77,214,164,0.2)' : 'rgba(255,255,255,0.06)'}`, borderRadius: 10, padding: '12px 14px', marginBottom: 8 }}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            {item.locked
              ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.6rem', fontWeight: 700, background: 'rgba(77,214,164,0.1)', color: '#4DD6A4', border: '1px solid rgba(77,214,164,0.2)', borderRadius: 999, padding: '1px 7px' }}><Lock size={9} />Locked</span>
              : item.status === 'rejected'
                ? <span style={{ fontSize: '0.6rem', fontWeight: 700, background: 'rgba(255,77,77,0.1)', color: '#FF4D4D', border: '1px solid rgba(255,77,77,0.2)', borderRadius: 999, padding: '1px 7px' }}>Rejected</span>
                : <span style={{ fontSize: '0.6rem', fontWeight: 700, background: 'rgba(255,177,90,0.1)', color: '#FFB15A', border: '1px solid rgba(255,177,90,0.2)', borderRadius: 999, padding: '1px 7px' }}>
                    {remaining.length} sign-off{remaining.length !== 1 ? 's' : ''} pending
                  </span>
            }
            <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#fff' }}>{item.project_name || item.project_id}</span>
            <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)' }}>{item.period} · {item.qa_type}</span>
          </div>

          {/* Sign-off progress chips */}
          <div className="flex items-center gap-2 flex-wrap mt-2">
            {REQUIRED_ROLES.map(role => {
              const s = (item.signoffs || []).find(x => x.role === role);
              return (
                <span key={role} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.58rem', fontWeight: 600, padding: '2px 8px', borderRadius: 999, background: s ? 'rgba(77,214,164,0.08)' : 'rgba(255,255,255,0.04)', border: `1px solid ${s ? 'rgba(77,214,164,0.2)' : 'rgba(255,255,255,0.08)'}`, color: s ? '#4DD6A4' : 'rgba(255,255,255,0.3)' }}>
                  {s ? <CheckCircle2 size={9} /> : <Clock size={9} />}
                  {role.replace('_', ' ')}
                  {s ? ` · ${s.signed_by?.split('@')[0]}` : ''}
                </span>
              );
            })}
          </div>
        </div>

        {!item.locked && item.status !== 'rejected' && (
          <div className="flex gap-2">
            <button
              onClick={() => setNoteOpen(!noteOpen)}
              style={{ fontSize: '0.62rem', fontWeight: 700, padding: '5px 11px', background: 'rgba(255,90,31,0.1)', border: '1px solid rgba(255,90,31,0.3)', color: '#FF8C42', borderRadius: 7, cursor: 'pointer' }}
            >
              Sign Off
            </button>
          </div>
        )}
      </div>

      {noteOpen && (
        <div style={{ marginTop: 10, borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: 10 }}>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Optional notes for this sign-off…"
            style={{ width: '100%', background: '#0D1117', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 7, padding: '7px 10px', fontSize: '0.7rem', color: 'rgba(255,255,255,0.7)', resize: 'vertical', minHeight: 60, boxSizing: 'border-box' }}
          />
          <div className="flex gap-2 mt-2 flex-wrap">
            {REQUIRED_ROLES.map(role => (
              <button
                key={role}
                onClick={() => { onSignOff(item.id, role, notes); setNoteOpen(false); setNotes(''); }}
                style={{ fontSize: '0.62rem', fontWeight: 700, padding: '5px 11px', background: 'rgba(255,90,31,0.08)', border: '1px solid rgba(255,90,31,0.2)', color: '#FF8C42', borderRadius: 7, cursor: 'pointer' }}
              >
                Sign as {role.replace('_', ' ')}
              </button>
            ))}
            <button
              onClick={() => { if (notes) onReject(item.id, notes); setNoteOpen(false); }}
              style={{ fontSize: '0.62rem', fontWeight: 700, padding: '5px 11px', background: 'rgba(255,77,77,0.06)', border: '1px solid rgba(255,77,77,0.2)', color: '#FF4D4D', borderRadius: 7, cursor: 'pointer' }}
            >
              Reject
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function ReconciliationDashboard({ projectId = null, compact = false }) {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState('mismatches');

  const { data: runs = [], isLoading: runsLoading } = useQuery({
    queryKey: ['audit-runs', projectId],
    queryFn: () => base44.entities.AuditRun.filter(projectId ? { project_id: projectId } : {}, '-started_at', 10),
    staleTime: 60000,
  });

  const lastRun = runs[0] || null;

  const { data: findings = [] } = useQuery({
    queryKey: ['audit-findings', lastRun?.id],
    queryFn: () => lastRun ? base44.entities.AuditFinding.filter({ audit_run_id: lastRun.id }, null, 50) : [],
    enabled: !!lastRun,
  });

  const { data: qaItems = [] } = useQuery({
    queryKey: ['qa-items', projectId],
    queryFn: () => base44.entities.PMControlEntry.filter({ qa_type: 'monthly_close', ...(projectId ? { project_id: projectId } : {}) }, '-created_at', 20),
    staleTime: 30000,
  });

  const { data: currentUser } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });

  const triggerRun = useMutation({
    mutationFn: () => base44.functions.invoke('dailyReconciliation', { force: true }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['audit-runs'] }),
  });

  const signOff = useMutation({
    mutationFn: ({ id, role, notes }) => base44.functions.invoke('qaSignOff', { action: 'sign_off', qa_item_id: id, role, notes }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['qa-items'] }),
  });

  const reject = useMutation({
    mutationFn: ({ id, notes }) => base44.functions.invoke('qaSignOff', { action: 'reject', qa_item_id: id, notes }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['qa-items'] }),
  });

  const exportReport = async (fmt) => {
    const res = await base44.functions.invoke('exportReconciliationReport', { run_id: lastRun?.run_id, format: fmt });
    const blob = new Blob([res.data], { type: fmt === 'csv' ? 'text/csv' : 'text/html' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `reconciliation.${fmt === 'csv' ? 'csv' : 'html'}`; a.click();
    URL.revokeObjectURL(url);
  };

  // Trend data (critical counts per run)
  const trendValues = useMemo(() => runs.slice().reverse().map(r => r.summary?.critical || 0), [runs]);

  const summary = lastRun?.summary || {};
  const RunIcon = STATUS_ICON[lastRun?.status] || CheckCircle2;
  const runColor = lastRun?.status === 'failed' ? '#FF4D4D' : lastRun?.status === 'warning' ? '#FFB15A' : '#4DD6A4';

  const TABS = [
    { id: 'mismatches', label: 'Top Mismatches' },
    { id: 'qa', label: `QA Queue (${qaItems.filter(i => !i.locked).length})` },
    ...(compact ? [] : [{ id: 'history', label: 'Run History' }]),
  ];

  return (
    <div style={{ background: '#0D1117', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, overflow: 'hidden' }}>

      {/* ── Header ── */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div className="flex items-center gap-3">
          <Activity size={16} style={{ color: '#FF8C42' }} />
          <div>
            <p style={{ fontSize: '0.7rem', fontWeight: 800, color: '#fff', letterSpacing: '0.06em', textTransform: 'uppercase', margin: 0 }}>Reconciliation Monitor</p>
            {lastRun && (
              <p style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)', margin: 0 }}>
                Last run: {format(parseISO(lastRun.started_at), 'MMM d, yyyy h:mm a')}
              </p>
            )}
          </div>
          {lastRun && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: `${runColor}18`, border: `1px solid ${runColor}40`, borderRadius: 999, padding: '3px 10px' }}>
              <RunIcon size={11} style={{ color: runColor }} />
              <span style={{ fontSize: '0.62rem', fontWeight: 700, color: runColor, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{lastRun.status}</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {!compact && (
            <>
              <button onClick={() => exportReport('csv')} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.62rem', fontWeight: 700, padding: '5px 11px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', borderRadius: 7, cursor: 'pointer' }}>
                <Download size={11} />CSV
              </button>
              <button onClick={() => exportReport('pdf')} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.62rem', fontWeight: 700, padding: '5px 11px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', borderRadius: 7, cursor: 'pointer' }}>
                <FileText size={11} />PDF
              </button>
            </>
          )}
          <button
            onClick={() => triggerRun.mutate()}
            disabled={triggerRun.isPending}
            style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.62rem', fontWeight: 700, padding: '5px 12px', background: 'rgba(255,90,31,0.1)', border: '1px solid rgba(255,90,31,0.3)', color: '#FF8C42', borderRadius: 7, cursor: 'pointer' }}
          >
            <RefreshCw size={11} className={triggerRun.isPending ? 'animate-spin' : ''} />
            {triggerRun.isPending ? 'Running…' : 'Run Now'}
          </button>
        </div>
      </div>

      {/* ── KPI row ── */}
      {lastRun && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          {[
            { label: 'Critical', value: summary.critical || 0, color: '#FF4D4D' },
            { label: 'High',     value: summary.high || 0,     color: '#FFB15A' },
            { label: 'Medium',   value: summary.medium || 0,   color: '#FFD580' },
            { label: 'Low',      value: summary.low || 0,      color: '#4DD6A4' },
          ].map(k => (
            <div key={k.label} style={{ padding: '10px 14px', borderRight: '1px solid rgba(255,255,255,0.04)' }}>
              <p style={{ fontSize: '0.55rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', margin: '0 0 3px' }}>{k.label}</p>
              <p style={{ fontSize: '1.4rem', fontWeight: 800, color: k.color, margin: 0, lineHeight: 1 }}>{k.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Trend sparkline ── */}
      {!compact && trendValues.length > 1 && (
        <div style={{ padding: '10px 20px', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: '0.58rem', fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', whiteSpace: 'nowrap' }}>Critical trend</span>
          <Sparkline values={trendValues} />
          <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.25)' }}>last {trendValues.length} runs</span>
        </div>
      )}

      {/* ── Tabs ── */}
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '0 20px' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '10px 14px 9px', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: activeTab === t.id ? '#FF8C42' : 'rgba(255,255,255,0.3)', borderBottom: activeTab === t.id ? '2px solid #FF8C42' : '2px solid transparent', marginBottom: -1 }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Content ── */}
      <div style={{ maxHeight: compact ? 300 : 480, overflowY: 'auto' }}>

        {/* Mismatches */}
        {activeTab === 'mismatches' && (
          findings.length === 0
            ? <p style={{ padding: 20, fontSize: '0.7rem', color: 'rgba(255,255,255,0.25)', textAlign: 'center' }}>No mismatches in last run. ✓</p>
            : findings.sort((a, b) => { const o = { critical: 0, high: 1, medium: 2, low: 3 }; return (o[a.severity] || 3) - (o[b.severity] || 3); }).map(f => <FindingRow key={f.id} finding={f} />)
        )}

        {/* QA Queue */}
        {activeTab === 'qa' && (
          <div style={{ padding: '12px 14px' }}>
            {qaItems.length === 0
              ? <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.25)', textAlign: 'center', padding: 20 }}>No QA items pending. Monthly close will populate this queue.</p>
              : qaItems.map(item => (
                  <QAQueueRow
                    key={item.id}
                    item={item}
                    currentUser={currentUser}
                    onSignOff={(id, role, notes) => signOff.mutate({ id, role, notes })}
                    onReject={(id, notes) => reject.mutate({ id, notes })}
                  />
                ))
            }
          </div>
        )}

        {/* Run history */}
        {activeTab === 'history' && (
          <div>
            {runs.map(run => {
              const Icon = STATUS_ICON[run.status] || CheckCircle2;
              const color = run.status === 'failed' ? '#FF4D4D' : run.status === 'warning' ? '#FFB15A' : '#4DD6A4';
              return (
                <div key={run.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 16px', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  <Icon size={13} style={{ color, flexShrink: 0 }} />
                  <div className="flex-1 min-w-0">
                    <p style={{ fontSize: '0.65rem', fontWeight: 700, color: '#fff', margin: 0 }}>{run.run_type?.replace('_', ' ')}</p>
                    <p style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)', margin: 0 }}>{run.run_id}</p>
                  </div>
                  <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)' }}>{format(parseISO(run.started_at), 'MMM d, h:mm a')}</span>
                  <span style={{ fontSize: '0.6rem', fontWeight: 700, color }}>{run.summary?.critical || 0}C · {run.summary?.high || 0}H</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}