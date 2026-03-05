import React, { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useActiveProject } from '@/components/shared/hooks/useActiveProject';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  CompactHeader, CompactKPIStrip, StatusPill, InlineAction
} from '@/components/layout/CompactPageShell';
import {
  AlertTriangle, TrendingUp, FileText, Truck, DollarSign, CheckCircle2, Clock, Settings
} from 'lucide-react';

// ── Sample placeholders ───────────────────────────────────────────────────────
const SAMPLE_PROJECTS = [
  { id: 'p1', project_number: '24-001', name: 'Riverside Warehouse', status: 'in_progress', client: 'DCS Construction', contract_value: 1_850_000, phase: 'fabrication', target_completion: '2026-06-15', progress: 62 },
  { id: 'p2', project_number: '24-002', name: 'Mesa Distribution Center', status: 'in_progress', client: 'Wentworth GC', contract_value: 3_200_000, phase: 'erection', target_completion: '2026-04-30', progress: 81 },
  { id: 'p3', project_number: '24-003', name: 'Chandler Office Build', status: 'awarded', client: 'Sunstate Dev', contract_value: 980_000, phase: 'detailing', target_completion: '2026-09-01', progress: 12 },
  { id: 'p4', project_number: '23-018', name: 'Phoenix Auto Plant Exp.', status: 'completed', client: 'Toyota GC', contract_value: 5_100_000, phase: 'closeout', target_completion: '2025-12-31', progress: 100 },
];

const SAMPLE_RFIS = [
  { id: 'r1', rfi_number: 47, subject: 'Column baseplate anchor bolt spacing — Grid B4', project_name: 'Mesa Distribution Center', priority: 'critical', status: 'submitted', business_days_open: 8, due_date: '2026-03-06' },
  { id: 'r2', rfi_number: 23, subject: 'Connection detail at HSS beam pocket — Level 2', project_name: 'Riverside Warehouse', priority: 'high', status: 'under_review', business_days_open: 5, due_date: '2026-03-10' },
  { id: 'r3', rfi_number: 12, subject: 'Embed plate tolerance for precast panel interface', project_name: 'Chandler Office Build', priority: 'medium', status: 'draft', business_days_open: 2, due_date: '2026-03-14' },
];

const SAMPLE_COS = [
  { id: 'c1', co_number: 8, title: 'Additional bracing per EOR Bulletin 3', project_name: 'Mesa Distribution Center', cost_impact: 42_500, status: 'submitted' },
  { id: 'c2', co_number: 5, title: 'Crane mobilization delay — owner-caused', project_name: 'Riverside Warehouse', cost_impact: 18_200, status: 'under_review' },
  { id: 'c3', co_number: 12, title: 'Added stair tread nos. as VE credit', project_name: 'Chandler Office Build', cost_impact: -9_800, status: 'approved' },
];

const SAMPLE_REVISIONS = [
  { id: 'v1', set_number: 'S-101', title: 'Foundation & Anchor Bolt Plan', status: 'FFF', discipline: 'structural', updated_date: '2026-03-03', project_name: 'Riverside Warehouse' },
  { id: 'v2', set_number: 'S-204', title: 'Roof Framing Plan — Bldg B', status: 'BFA', discipline: 'structural', updated_date: '2026-03-02', project_name: 'Mesa Distribution Center' },
  { id: 'v3', set_number: 'M-01', title: 'Misc Metals Schedule', status: 'IFA', discipline: 'misc_metals', updated_date: '2026-03-01', project_name: 'Chandler Office Build' },
];

const fmt$ = v => v < 0 ? `(${Math.abs(v).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })})` : v.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

// ── Bento cell wrapper ────────────────────────────────────────────────────────
function BentoCell({ title, icon: Icon, accent, children, className = '' }) {
  return (
    <div
      className={`flex flex-col ${className}`}
      style={{
        background: 'rgba(255,255,255,0.025)',
        border: `1px solid ${accent ? 'rgba(255,90,31,0.2)' : 'rgba(255,255,255,0.05)'}`,
        borderRadius: 14,
        overflow: 'hidden',
      }}
    >
      <div className="flex items-center gap-2 px-4 py-2.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        {Icon && <Icon size={12} style={{ color: accent || 'rgba(255,255,255,0.35)' }} />}
        <span style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)' }}>
          {title}
        </span>
      </div>
      <div className="flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}

export default function ProjectDashboard() {
  const { activeProjectId, setActiveProjectId } = useActiveProject();

  const { data: allProjects = [], isError: isProjectsError } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('name'),
    staleTime: 5 * 60 * 1000,
  });

  const { data: rfis = [] } = useQuery({
    queryKey: ['rfis-dashboard'],
    queryFn: () => base44.entities.RFI.list('-created_date', 20),
    staleTime: 2 * 60 * 1000,
  });

  const { data: changeOrders = [] } = useQuery({
    queryKey: ['cos-dashboard'],
    queryFn: () => base44.entities.ChangeOrder.list('-created_date', 10),
    staleTime: 2 * 60 * 1000,
  });

  const { data: drawingSets = [] } = useQuery({
    queryKey: ['drawings-dashboard'],
    queryFn: () => base44.entities.DrawingSet.list('-updated_date', 10),
    staleTime: 2 * 60 * 1000,
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const p = params.get('project') || params.get('id');
    if (p && p !== activeProjectId) setActiveProjectId(p);
    else if (!p && !activeProjectId && allProjects.length > 0) setActiveProjectId(allProjects[0].id);
  }, [allProjects]);

  // Use live data if available, fall back to samples
  const projects = allProjects.length > 0 ? allProjects : SAMPLE_PROJECTS;
  const urgentRFIs = (rfis.length > 0 ? rfis.filter(r => ['critical', 'high'].includes(r.priority) && !['answered', 'closed'].includes(r.status)) : SAMPLE_RFIS).slice(0, 5);
  const pendingCOs = (changeOrders.length > 0 ? changeOrders.filter(c => ['submitted', 'under_review'].includes(c.status)) : SAMPLE_COS).slice(0, 5);
  const recentDrawings = (drawingSets.length > 0 ? drawingSets.slice(0, 5) : SAMPLE_REVISIONS);

  // Portfolio KPIs
  const kpis = useMemo(() => {
    const active = projects.filter(p => p.status === 'in_progress');
    const totalValue = projects.reduce((s, p) => s + (p.contract_value || 0), 0);
    const openRFIs = urgentRFIs.length;
    const pendingCOValue = pendingCOs.reduce((s, c) => s + (c.cost_impact || 0), 0);
    return { active: active.length, totalValue, openRFIs, pendingCOValue };
  }, [projects, urgentRFIs, pendingCOs]);

  return (
    <div style={{ minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <CompactHeader
        left={
          <>
            <span style={{ fontWeight: 800, fontSize: '0.8rem', color: 'rgba(255,255,255,0.9)' }}>Dashboard</span>
            <Select value={activeProjectId || 'all'} onValueChange={v => setActiveProjectId(v === 'all' ? null : v)}>
              <SelectTrigger className="h-7 text-xs w-52" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8 }}>
                <SelectValue placeholder="All Projects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                {allProjects.map(p => <SelectItem key={p.id} value={p.id}>{p.project_number} — {p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </>
        }
        right={
          <Link to={createPageUrl('Settings')} style={{ color: 'rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center' }}>
            <Settings size={14} />
          </Link>
        }
      />

      {/* KPI strip */}
      <CompactKPIStrip items={[
        { label: 'Active Jobs', value: kpis.active, color: '#4DD6A4' },
        { label: 'Portfolio Value', value: fmt$(kpis.totalValue), color: 'rgba(255,255,255,0.88)' },
        { label: 'Urgent RFIs', value: kpis.openRFIs, color: kpis.openRFIs > 0 ? '#FF4D4D' : '#4DD6A4' },
        { label: 'Pending CO Value', value: fmt$(kpis.pendingCOValue), color: '#FFB15A' },
      ]} />

      {/* Bento grid */}
      <div
        className="flex-1 p-3 grid gap-3"
        style={{
          gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
          gridAutoRows: 'minmax(200px, auto)',
          alignContent: 'start',
        }}
      >
        {/* Active Projects */}
        <BentoCell title="Active Projects" icon={TrendingUp} className="lg:col-span-2">
          <table className="w-full" style={{ fontSize: '0.72rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                {['#', 'Project', 'Phase', 'Progress', 'Target', 'Value', ''].map((h, i) => (
                  <th key={i} style={{ padding: '4px 10px', color: 'rgba(255,255,255,0.28)', fontWeight: 700, fontSize: '0.58rem', letterSpacing: '0.1em', textTransform: 'uppercase', textAlign: i > 2 ? 'right' : 'left', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {projects.filter(p => p.status !== 'closed').slice(0, 6).map(p => (
                <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.025)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: '5px 10px', color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }}>{p.project_number}</td>
                  <td style={{ padding: '5px 10px', color: 'rgba(255,255,255,0.85)', fontWeight: 600, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</td>
                  <td style={{ padding: '5px 10px' }}><StatusPill status={p.phase || p.status} /></td>
                  <td style={{ padding: '5px 10px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                      <div style={{ width: 52, height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ width: `${p.progress || 0}%`, height: '100%', background: '#4DD6A4', borderRadius: 2 }} />
                      </div>
                      <span style={{ color: 'rgba(255,255,255,0.5)', minWidth: 28, textAlign: 'right' }}>{p.progress || 0}%</span>
                    </div>
                  </td>
                  <td style={{ padding: '5px 10px', color: 'rgba(255,255,255,0.4)', textAlign: 'right', fontFamily: 'monospace' }}>{p.target_completion || '—'}</td>
                  <td style={{ padding: '5px 10px', color: 'rgba(255,255,255,0.65)', textAlign: 'right', fontFamily: 'monospace' }}>{fmt$(p.contract_value || 0)}</td>
                  <td style={{ padding: '5px 8px', textAlign: 'right' }}>
                    <Link to={createPageUrl('ProjectDashboard') + `?project=${p.id}`}
                      style={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#FF8C42', textDecoration: 'none' }}>
                      Open →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </BentoCell>

        {/* Urgent RFIs */}
        <BentoCell title="Urgent RFIs" icon={AlertTriangle} accent="#FF4D4D">
          {urgentRFIs.length === 0 ? (
            <div style={{ padding: '24px 12px', textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: '0.72rem' }}>No urgent RFIs</div>
          ) : urgentRFIs.map(r => (
            <div key={r.id} style={{ padding: '7px 12px', borderBottom: '1px solid rgba(255,255,255,0.03)', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                  <span style={{ fontFamily: 'monospace', fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)' }}>#{r.rfi_number || r.id?.slice(-3)}</span>
                  <StatusPill status={r.priority} />
                </div>
                <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.78)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 260 }}>{r.subject}</p>
                <p style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)', marginTop: 1 }}>{r.project_name} · {r.business_days_open || 0}bd open</p>
              </div>
              <InlineAction label="View" onClick={() => {}} />
            </div>
          ))}
        </BentoCell>

        {/* Pending Change Orders */}
        <BentoCell title="Pending Change Orders" icon={DollarSign} accent="#FFB15A">
          {pendingCOs.length === 0 ? (
            <div style={{ padding: '24px 12px', textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: '0.72rem' }}>No pending COs</div>
          ) : pendingCOs.map(c => (
            <div key={c.id} style={{ padding: '7px 12px', borderBottom: '1px solid rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                  <span style={{ fontFamily: 'monospace', fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)' }}>CO-{String(c.co_number || '').padStart(3, '0')}</span>
                  <StatusPill status={c.status} />
                </div>
                <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.78)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 220 }}>{c.title}</p>
                <p style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)', marginTop: 1 }}>{c.project_name}</p>
              </div>
              <span style={{ fontFamily: 'monospace', fontSize: '0.72rem', fontWeight: 700, color: (c.cost_impact || 0) < 0 ? '#4DD6A4' : '#FFB15A', flexShrink: 0 }}>
                {fmt$(c.cost_impact || 0)}
              </span>
            </div>
          ))}
        </BentoCell>

        {/* Recent Drawing Revisions */}
        <BentoCell title="Recent Drawing Updates" icon={FileText}>
          {recentDrawings.map(d => (
            <div key={d.id} style={{ padding: '7px 12px', borderBottom: '1px solid rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                  <span style={{ fontFamily: 'monospace', fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)' }}>{d.set_number}</span>
                  <StatusPill status={d.status} />
                </div>
                <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.75)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 240 }}>{d.title}</p>
                <p style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.28)', marginTop: 1 }}>{d.project_name || '—'}</p>
              </div>
              <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.25)', flexShrink: 0 }}>{d.updated_date?.slice(0, 10) || '—'}</span>
            </div>
          ))}
        </BentoCell>
      </div>
    </div>
  );
}