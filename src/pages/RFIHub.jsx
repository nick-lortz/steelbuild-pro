import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  CompactHeader, CompactFilterBar, CompactKPIStrip, DenseTable, StatusPill, InlineAction
} from '@/components/layout/CompactPageShell';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import RFIHubForm from '@/components/rfi-hub/RFIHubForm';
import Pagination from '@/components/ui/Pagination';
import { Plus, Search, Clock, CheckCircle2, AlertTriangle, FileText, Users } from 'lucide-react';
import { format, differenceInDays, parseISO } from 'date-fns';
import { toast } from 'sonner';
import { usePagination } from '@/components/shared/hooks/usePagination';
import { useEntitySubscription } from '@/components/shared/hooks/useSubscription';
import { indexBy } from '@/components/shared/arrayUtils';
import { getRFIEscalationLevel, getBusinessDaysBetween } from '@/components/shared/businessRules';

const SAMPLE_RFIS = [
  { id: 'r1', rfi_number: 47, subject: 'Column baseplate anchor bolt spacing — Grid B4', project_name: 'Mesa Distribution', priority: 'critical', status: 'submitted', ball_in_court: 'external', business_days_open: 8, due_date: '2026-03-06', rfi_type: 'connection_detail' },
  { id: 'r2', rfi_number: 23, subject: 'Connection detail at HSS beam pocket — Level 2', project_name: 'Riverside Warehouse', priority: 'high', status: 'under_review', ball_in_court: 'external', business_days_open: 5, due_date: '2026-03-10', rfi_type: 'connection_detail' },
  { id: 'r3', rfi_number: 12, subject: 'Embed plate tolerance for precast panel interface', project_name: 'Chandler Office', priority: 'medium', status: 'internal_review', ball_in_court: 'internal', business_days_open: 2, due_date: '2026-03-14', rfi_type: 'embed_anchor' },
  { id: 'r4', rfi_number: 8, subject: 'Wide flange member size — W18x46 vs W18x50 at Grid 3', project_name: 'Riverside Warehouse', priority: 'high', status: 'answered', ball_in_court: 'gc', business_days_open: 14, due_date: '2026-02-28', rfi_type: 'member_size_length' },
  { id: 'r5', rfi_number: 31, subject: 'Erection sequence for heavy trusses — Bay 6 thru 9', project_name: 'Mesa Distribution', priority: 'medium', status: 'closed', ball_in_court: 'internal', business_days_open: 21, due_date: '2026-02-15', rfi_type: 'erection_sequence' },
];

export default function RFIHub() {
  const queryClient = useQueryClient();
  const [selectedProjectId, setSelectedProjectId] = useState(() => new URLSearchParams(window.location.search).get('project') || null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingRFI, setEditingRFI] = useState(null);
  const { page, pageSize, skip, limit, goToPage, changePageSize } = usePagination(1, 50);
  const [filters, setFilters] = useState({ status: 'all', priority: 'all', ball_in_court: 'all' });

  const { data: allRFIs = [], isLoading } = useQuery({ queryKey: ['rfis'], queryFn: () => base44.entities.RFI.list('-created_date') });
  const { data: projects = [] } = useQuery({ queryKey: ['projects'], queryFn: () => base44.entities.Project.list() });

  useEntitySubscription('RFI', ['rfis'], {
    onEvent: (e) => {
      if (e.type === 'create') toast.info(`New RFI #${e.data.rfi_number}: ${e.data.subject}`);
      else if (e.type === 'update' && e.data.status) toast.info(`RFI #${e.data.rfi_number} → ${e.data.status}`);
    }
  });

  const enrichedRFIs = useMemo(() => {
    const pById = indexBy(projects, 'id');
    return (allRFIs.length > 0 ? allRFIs : SAMPLE_RFIS).map(rfi => {
      const project = pById[rfi.project_id];
      const submittedDate = rfi.submitted_date || rfi.created_date;
      const today = new Date();
      const businessDaysOpen = submittedDate ? getBusinessDaysBetween(new Date(submittedDate), today) : (rfi.business_days_open || 0);
      const escalationLevel = submittedDate ? getRFIEscalationLevel(submittedDate, rfi.status) : 'normal';
      const dueDate = rfi.due_date ? parseISO(rfi.due_date) : null;
      const isOverdue = dueDate && today > dueDate;
      const daysUntilDue = dueDate ? differenceInDays(dueDate, today) : null;
      let aging_bucket = '0-5 days';
      if (businessDaysOpen > 20) aging_bucket = '20+ days';
      else if (businessDaysOpen > 10) aging_bucket = '11-20 days';
      else if (businessDaysOpen > 5) aging_bucket = '6-10 days';
      return { ...rfi, project_name: rfi.project_name || project?.name || 'N/A', business_days_open: businessDaysOpen, escalation_level: escalationLevel, aging_bucket, is_overdue: isOverdue, days_until_due: daysUntilDue };
    });
  }, [allRFIs, projects]);

  const filteredRFIs = useMemo(() => {
    let r = enrichedRFIs;
    if (selectedProjectId) r = r.filter(x => x.project_id === selectedProjectId);
    if (filters.status !== 'all') r = r.filter(x => x.status === filters.status);
    if (filters.priority !== 'all') r = r.filter(x => x.priority === filters.priority);
    if (filters.ball_in_court !== 'all') r = r.filter(x => x.ball_in_court === filters.ball_in_court);
    if (searchTerm) { const t = searchTerm.toLowerCase(); r = r.filter(x => x.subject?.toLowerCase().includes(t) || String(x.rfi_number).includes(t) || x.project_name?.toLowerCase().includes(t)); }
    return r;
  }, [enrichedRFIs, selectedProjectId, filters, searchTerm]);

  const grouped = useMemo(() => ({
    active: filteredRFIs.filter(r => ['draft', 'internal_review', 'submitted', 'under_review'].includes(r.status)),
    awaiting: filteredRFIs.filter(r => r.ball_in_court === 'external'),
    closed: filteredRFIs.filter(r => ['answered', 'closed'].includes(r.status)),
    critical: filteredRFIs.filter(r => ['critical', 'high'].includes(r.priority)),
    all: filteredRFIs,
  }), [filteredRFIs]);

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.RFI.delete(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['rfis'] });
      const prev = queryClient.getQueryData(['rfis']);
      queryClient.setQueryData(['rfis'], (old = []) => old.filter(r => r.id !== id));
      return { prev };
    },
    onError: (_, __, ctx) => { queryClient.setQueryData(['rfis'], ctx.prev); toast.error('Delete failed'); },
    onSuccess: () => toast.success('RFI deleted'),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['rfis'] }),
  });

  const kpis = useMemo(() => ({
    open: grouped.active.length,
    awaiting: grouped.awaiting.length,
    overdue: filteredRFIs.filter(r => r.is_overdue).length,
    closed: grouped.closed.length,
    critical: grouped.critical.length,
  }), [grouped, filteredRFIs]);

  const columns = [
    { header: '#', key: 'rfi_number', render: r => <span style={{ fontFamily: 'monospace', color: 'rgba(255,255,255,0.4)' }}>{r.rfi_number}</span> },
    {
      header: 'Subject', key: 'subject', wrap: true, render: r => (
        <div>
          <span style={{ color: r.is_overdue ? '#FF4D4D' : 'rgba(255,255,255,0.82)', fontWeight: 500 }}>{r.subject}</span>
          {r.is_overdue && <span style={{ marginLeft: 5, fontSize: '0.58rem', color: '#FF4D4D', fontWeight: 700 }}>OVERDUE</span>}
        </div>
      )
    },
    { header: 'Project', key: 'project_name', render: r => <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.65rem' }}>{r.project_name}</span> },
    { header: 'Type', key: 'rfi_type', render: r => <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.62rem' }}>{r.rfi_type?.replace(/_/g, ' ') || '—'}</span> },
    { header: 'Priority', key: 'priority', render: r => <StatusPill status={r.priority} /> },
    { header: 'Status', key: 'status', render: r => <StatusPill status={r.status} /> },
    { header: 'BIC', key: 'ball_in_court', render: r => <span style={{ color: 'rgba(255,255,255,0.38)', fontSize: '0.62rem' }}>{r.ball_in_court || '—'}</span> },
    { header: 'Age', key: 'business_days_open', align: 'right', render: r => <span style={{ fontFamily: 'monospace', color: (r.business_days_open || 0) > 10 ? '#FFB15A' : 'rgba(255,255,255,0.4)', fontSize: '0.68rem' }}>{r.business_days_open || 0}bd</span> },
    { header: 'Due', key: 'due_date', align: 'right', render: r => <span style={{ fontFamily: 'monospace', fontSize: '0.62rem', color: r.is_overdue ? '#FF4D4D' : 'rgba(255,255,255,0.3)' }}>{r.due_date?.slice(0, 10) || '—'}</span> },
    {
      header: '', key: '_actions', align: 'right', render: r => (
        <div className="flex gap-1 justify-end">
          <InlineAction label="Edit" onClick={() => { setEditingRFI(r); setFormOpen(true); }} />
          <InlineAction label="Del" onClick={() => { if (window.confirm(`Delete RFI #${r.rfi_number}?`)) deleteMutation.mutate(r.id); }} variant="danger" />
        </div>
      )
    },
  ];

  const RFITable = ({ rfis, label }) => (
    <div>
      <DenseTable columns={columns} rows={rfis.slice(skip, skip + limit)} emptyMessage={`No ${label}`} />
      {rfis.length > pageSize && (
        <div style={{ padding: '8px 12px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <Pagination total={rfis.length} page={page} pageSize={pageSize} onPageChange={goToPage} onPageSizeChange={changePageSize} />
        </div>
      )}
    </div>
  );

  return (
    <ErrorBoundary>
      <div style={{ minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
        <CompactHeader
          left={
            <>
              <span style={{ fontWeight: 800, fontSize: '0.78rem', color: 'rgba(255,255,255,0.88)' }}>RFI Hub</span>
              <Select value={selectedProjectId || 'all'} onValueChange={v => setSelectedProjectId(v === 'all' ? null : v)}>
                <SelectTrigger className="h-7 text-xs w-52" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8 }}>
                  <SelectValue placeholder="All Projects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Projects</SelectItem>
                  {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.project_number} — {p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </>
          }
          right={
            <button
              onClick={() => { setEditingRFI(null); setFormOpen(true); }}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 12px', borderRadius: 7, border: '1px solid rgba(255,90,31,0.3)', background: 'rgba(255,90,31,0.1)', color: '#FF8C42', fontSize: '0.65rem', fontWeight: 700, cursor: 'pointer', letterSpacing: '0.06em', textTransform: 'uppercase' }}
            >
              <Plus size={11} /> New RFI
            </button>
          }
        />

        <CompactKPIStrip items={[
          { label: 'Active', value: kpis.open, color: '#4DA3FF' },
          { label: 'Awaiting Resp.', value: kpis.awaiting, color: '#FFB15A' },
          { label: 'Overdue', value: kpis.overdue, color: kpis.overdue > 0 ? '#FF4D4D' : '#4DD6A4' },
          { label: 'Critical/High', value: kpis.critical, color: kpis.critical > 0 ? '#FF4D4D' : 'rgba(255,255,255,0.5)' },
          { label: 'Closed', value: kpis.closed, color: '#4DD6A4' },
        ]} />

        <CompactFilterBar>
          <div style={{ position: 'relative', flex: 1, maxWidth: 300 }}>
            <Search size={13} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.25)', pointerEvents: 'none' }} />
            <input
              placeholder="RFI #, subject, project…"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ paddingLeft: 26, height: 28, width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 7, color: 'rgba(255,255,255,0.8)', fontSize: '0.72rem', outline: 'none' }}
            />
          </div>
          {[
            { value: filters.status, key: 'status', options: [['all','All Status'],['draft','Draft'],['internal_review','Internal Review'],['submitted','Submitted'],['under_review','Under Review'],['answered','Answered'],['closed','Closed']] },
            { value: filters.priority, key: 'priority', options: [['all','All Priority'],['critical','Critical'],['high','High'],['medium','Medium'],['low','Low']] },
            { value: filters.ball_in_court, key: 'ball_in_court', options: [['all','All BIC'],['internal','Internal'],['external','External'],['gc','GC'],['architect','Architect'],['engineer','Engineer']] },
          ].map(({ value, key, options }) => (
            <select
              key={key}
              value={value}
              onChange={e => setFilters(f => ({ ...f, [key]: e.target.value }))}
              style={{ height: 28, padding: '0 8px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 7, color: 'rgba(255,255,255,0.65)', fontSize: '0.7rem', cursor: 'pointer' }}
            >
              {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          ))}
          <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.25)', marginLeft: 4 }}>{filteredRFIs.length} RFIs</span>
        </CompactFilterBar>

        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <Tabs defaultValue="active" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <TabsList style={{ borderRadius: 0, background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '0 12px', height: 36, flexShrink: 0 }}>
              {[
                ['active', <FileText size={11} />, `Active (${grouped.active.length})`],
                ['awaiting', <Clock size={11} />, `Awaiting (${grouped.awaiting.length})`],
                ['critical', <AlertTriangle size={11} />, `High/Critical (${grouped.critical.length})`],
                ['closed', <CheckCircle2 size={11} />, `Closed (${grouped.closed.length})`],
                ['all', <Users size={11} />, `All (${grouped.all.length})`],
              ].map(([value, icon, label]) => (
                <TabsTrigger key={value} value={value} style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', padding: '0 10px', display: 'flex', alignItems: 'center', gap: 4 }}>
                  {icon} {label}
                </TabsTrigger>
              ))}
            </TabsList>

            <div style={{ flex: 1, overflowY: 'auto' }}>
              <TabsContent value="active" style={{ margin: 0 }}><RFITable rfis={grouped.active} label="active RFIs" /></TabsContent>
              <TabsContent value="awaiting" style={{ margin: 0 }}><RFITable rfis={grouped.awaiting} label="awaiting RFIs" /></TabsContent>
              <TabsContent value="critical" style={{ margin: 0 }}><RFITable rfis={grouped.critical} label="critical RFIs" /></TabsContent>
              <TabsContent value="closed" style={{ margin: 0 }}><RFITable rfis={grouped.closed} label="closed RFIs" /></TabsContent>
              <TabsContent value="all" style={{ margin: 0 }}><RFITable rfis={grouped.all} label="RFIs" /></TabsContent>
            </div>
          </Tabs>
        </div>

        {formOpen && (
          <RFIHubForm
            rfi={editingRFI}
            projects={projects}
            allRFIs={allRFIs}
            onClose={() => { setFormOpen(false); setEditingRFI(null); }}
            onSuccess={() => { queryClient.invalidateQueries({ queryKey: ['rfis'] }); setFormOpen(false); setEditingRFI(null); }}
          />
        )}
      </div>
    </ErrorBoundary>
  );
}