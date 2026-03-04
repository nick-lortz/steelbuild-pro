import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useActiveProject } from '@/components/shared/hooks/useActiveProject';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  CompactHeader, CompactFilterBar, CompactKPIStrip, DenseTable, StatusPill, InlineAction
} from '@/components/layout/CompactPageShell';
import DrawingSetForm from '@/components/drawings/DrawingSetForm';
import DrawingSetDetailDialog from '@/components/drawings/DrawingSetDetailDialog';
import EnhancedDrawingUpload from '@/components/drawings/EnhancedDrawingUpload';
import DrawingAnalysisDashboard from '@/components/drawings/DrawingAnalysisDashboard';
import { Search, Plus, Upload, Sparkles, FileText } from 'lucide-react';
import { toast } from '@/components/ui/notifications';

const SAMPLE_SETS = [
  { id: 'd1', set_number: 'S-101', title: 'Foundation & Anchor Bolt Plan', discipline: 'structural', status: 'FFF', sheet_count: 4, total_revision_count: 3, submitted_date: '2026-01-10', updated_date: '2026-02-28' },
  { id: 'd2', set_number: 'S-201', title: 'Second Floor Framing Plan', discipline: 'structural', status: 'BFA', sheet_count: 6, total_revision_count: 2, submitted_date: '2026-01-22', updated_date: '2026-03-01' },
  { id: 'd3', set_number: 'S-202', title: 'Roof Framing Plan — Bldg A', discipline: 'structural', status: 'IFA', sheet_count: 5, total_revision_count: 1, submitted_date: '2026-02-05', updated_date: '2026-02-20' },
  { id: 'd4', set_number: 'M-01', title: 'Misc Metals Schedule', discipline: 'structural', status: 'IFA', sheet_count: 2, total_revision_count: 1, submitted_date: '2026-02-14', updated_date: '2026-03-01' },
  { id: 'd5', set_number: 'S-301', title: 'Connection Details — Moment Frames', discipline: 'structural', status: 'BFS', sheet_count: 8, total_revision_count: 2, submitted_date: '2026-01-30', updated_date: '2026-02-25' },
  { id: 'd6', set_number: 'A-101', title: 'Architectural Floor Plan', discipline: 'architectural', status: 'FFF', sheet_count: 3, total_revision_count: 4, submitted_date: '2025-12-01', updated_date: '2026-01-15' },
];

export default function Drawings() {
  const { activeProjectId, setActiveProjectId } = useActiveProject();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [disciplineFilter, setDisciplineFilter] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [selectedSet, setSelectedSet] = useState(null);
  const [showDetail, setShowDetail] = useState(false);

  React.useEffect(() => {
    if (!activeProjectId) {
      const params = new URLSearchParams(window.location.search);
      const p = params.get('project');
      if (p) setActiveProjectId(p);
    }
  }, []);

  const { data: allProjects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: currentUser } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });

  const userProjects = useMemo(() => {
    if (!currentUser) return allProjects;
    return currentUser.role === 'admin' ? allProjects : allProjects.filter(p => p.assigned_users?.includes(currentUser.email));
  }, [currentUser, allProjects]);

  const { data: drawingSets = [], isLoading } = useQuery({
    queryKey: ['drawing-sets', activeProjectId],
    queryFn: () => activeProjectId ? base44.entities.DrawingSet.filter({ project_id: activeProjectId }, '-updated_date') : [],
    enabled: !!activeProjectId,
    staleTime: 2 * 60 * 1000,
  });

  const { data: rfis = [] } = useQuery({
    queryKey: ['rfis', activeProjectId],
    queryFn: () => activeProjectId ? base44.entities.RFI.filter({ project_id: activeProjectId }) : [],
    enabled: !!activeProjectId,
  });

  const { data: users = [] } = useQuery({ queryKey: ['users'], queryFn: () => base44.entities.User.list(), staleTime: 10 * 60 * 1000 });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const created = await base44.entities.DrawingSet.create({ project_id: data.project_id, title: data.title || data.set_name, set_number: data.set_number, discipline: data.discipline, status: data.status, submitted_date: data.submitted_date || null, approved_date: data.approved_date || null, notes: data.notes || '', sheet_count: data.sheet_count || 0, total_revision_count: 1 });
      if (created?.id) {
        await base44.entities.DrawingRevision.create({ project_id: created.project_id, drawing_set_id: created.id, revision_number: 'Rev 0', revision_date: new Date().toISOString().split('T')[0], description: 'Initial submission', status: created.status || 'IFA', is_current: true });
      }
      return created;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['drawing-sets'] }); setShowCreate(false); toast.success('Drawing set created'); },
    onError: (e) => toast.error('Failed: ' + e.message),
  });

  const displaySets = drawingSets.length > 0 ? drawingSets : (activeProjectId ? [] : SAMPLE_SETS);

  const filtered = useMemo(() => {
    let r = displaySets;
    if (search) { const q = search.toLowerCase(); r = r.filter(s => s.title?.toLowerCase().includes(q) || s.set_number?.toLowerCase().includes(q)); }
    if (statusFilter !== 'all') r = r.filter(s => s.status === statusFilter);
    if (disciplineFilter !== 'all') r = r.filter(s => s.discipline === disciplineFilter);
    return r;
  }, [displaySets, search, statusFilter, disciplineFilter]);

  const metrics = useMemo(() => ({
    total: displaySets.length,
    fff: displaySets.filter(s => s.status === 'FFF').length,
    ifa: displaySets.filter(s => s.status === 'IFA').length,
    bfa: displaySets.filter(s => s.status === 'BFA').length,
    bfs: displaySets.filter(s => s.status === 'BFS').length,
  }), [displaySets]);

  const columns = [
    { header: '#', key: 'set_number', render: r => <span style={{ fontFamily: 'monospace', color: 'rgba(255,255,255,0.5)' }}>{r.set_number}</span> },
    {
      header: 'Title', key: 'title', wrap: true, render: r => (
        <span style={{ color: 'rgba(255,255,255,0.82)', fontWeight: 500, cursor: 'pointer' }} onClick={() => { setSelectedSet(r); setShowDetail(true); }}>
          {r.title}
        </span>
      )
    },
    { header: 'Discipline', key: 'discipline', render: r => <StatusPill status={r.discipline || '—'} /> },
    { header: 'Status', key: 'status', render: r => <StatusPill status={r.status} /> },
    { header: 'Sheets', key: 'sheet_count', align: 'right', render: r => <span style={{ color: 'rgba(255,255,255,0.45)', fontFamily: 'monospace' }}>{r.sheet_count || 0}</span> },
    { header: 'Rev', key: 'total_revision_count', align: 'right', render: r => <span style={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }}>{r.total_revision_count || 1}</span> },
    { header: 'Updated', key: 'updated_date', align: 'right', render: r => <span style={{ color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace', fontSize: '0.62rem' }}>{r.updated_date?.slice(0, 10) || '—'}</span> },
    {
      header: '', key: '_actions', align: 'right', render: r => (
        <div className="flex items-center gap-1 justify-end">
          <InlineAction label="Detail" onClick={() => { setSelectedSet(r); setShowDetail(true); }} variant="ghost" />
        </div>
      )
    },
  ];

  const ActionBar = () => (
    <div className="flex items-center gap-1.5">
      <button
        onClick={() => setShowAnalysis(v => !v)}
        disabled={!activeProjectId}
        style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 7, border: '1px solid rgba(139,92,246,0.3)', background: 'rgba(139,92,246,0.08)', color: showAnalysis ? '#a78bfa' : 'rgba(167,139,250,0.6)', fontSize: '0.65rem', fontWeight: 700, cursor: 'pointer', letterSpacing: '0.06em', textTransform: 'uppercase' }}
      >
        <Sparkles size={11} /> AI
      </button>
      <button
        onClick={() => setShowUpload(true)}
        disabled={!activeProjectId}
        style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 7, border: '1px solid rgba(59,130,246,0.3)', background: 'rgba(59,130,246,0.08)', color: 'rgba(147,197,253,0.8)', fontSize: '0.65rem', fontWeight: 700, cursor: 'pointer', letterSpacing: '0.06em', textTransform: 'uppercase' }}
      >
        <Upload size={11} /> Upload
      </button>
      <button
        onClick={() => setShowCreate(true)}
        disabled={!activeProjectId}
        style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 7, border: '1px solid rgba(255,90,31,0.3)', background: 'rgba(255,90,31,0.1)', color: '#FF8C42', fontSize: '0.65rem', fontWeight: 700, cursor: 'pointer', letterSpacing: '0.06em', textTransform: 'uppercase' }}
      >
        <Plus size={11} /> New
      </button>
    </div>
  );

  return (
    <div style={{ minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
      <CompactHeader
        left={
          <>
            <span style={{ fontWeight: 800, fontSize: '0.78rem', color: 'rgba(255,255,255,0.88)' }}>Drawings</span>
            <Select value={activeProjectId || ''} onValueChange={v => setActiveProjectId(v || null)}>
              <SelectTrigger className="h-7 text-xs w-52" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8 }}>
                <SelectValue placeholder="Select project…" />
              </SelectTrigger>
              <SelectContent>
                {userProjects.map(p => <SelectItem key={p.id} value={p.id}>{p.project_number} — {p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </>
        }
        right={<ActionBar />}
      />

      <CompactKPIStrip items={[
        { label: 'Total Sets', value: metrics.total },
        { label: 'FFF', value: metrics.fff, color: '#4DD6A4' },
        { label: 'IFA', value: metrics.ifa, color: '#4DA3FF' },
        { label: 'BFA', value: metrics.bfa, color: '#FFB15A' },
        { label: 'BFS', value: metrics.bfs, color: '#FFB15A' },
      ]} />

      <CompactFilterBar>
        <div style={{ position: 'relative', flex: 1, maxWidth: 320 }}>
          <Search size={13} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.25)', pointerEvents: 'none' }} />
          <input
            placeholder="Set #, title…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: 26, height: 28, width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 7, color: 'rgba(255,255,255,0.8)', fontSize: '0.72rem', outline: 'none' }}
          />
        </div>
        {[
          { label: 'Status', value: statusFilter, onChange: setStatusFilter, options: [['all','All Status'],['IFA','IFA'],['BFA','BFA'],['BFS','BFS'],['FFF','FFF'],['superseded','Superseded']] },
          { label: 'Discipline', value: disciplineFilter, onChange: setDisciplineFilter, options: [['all','All Disciplines'],['structural','Structural'],['architectural','Architectural'],['mechanical','Mechanical'],['electrical','Electrical'],['civil','Civil'],['other','Other']] },
        ].map(({ value, onChange, options }) => (
          <select
            key={value}
            value={value}
            onChange={e => onChange(e.target.value)}
            style={{ height: 28, padding: '0 8px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 7, color: 'rgba(255,255,255,0.65)', fontSize: '0.7rem', cursor: 'pointer' }}
          >
            {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        ))}
        <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.25)', marginLeft: 4 }}>{filtered.length} sets</span>
      </CompactFilterBar>

      {showAnalysis && activeProjectId && (
        <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <DrawingAnalysisDashboard projectId={activeProjectId} />
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {isLoading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'rgba(255,255,255,0.25)', fontSize: '0.75rem' }}>Loading…</div>
        ) : (
          <DenseTable
            columns={columns}
            rows={filtered}
            onRowClick={r => { setSelectedSet(r); setShowDetail(true); }}
            emptyMessage={activeProjectId ? 'No drawing sets. Click New to add.' : 'Select a project to view drawings.'}
          />
        )}
      </div>

      {/* Dialogs */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" style={{ background: '#0D1117', border: '1px solid rgba(255,255,255,0.08)' }}>
          <DialogHeader><DialogTitle>New Drawing Set</DialogTitle></DialogHeader>
          <DrawingSetForm projectId={activeProjectId} onSubmit={d => createMutation.mutate(d)} onCancel={() => setShowCreate(false)} isLoading={createMutation.isPending} />
        </DialogContent>
      </Dialog>

      <Dialog open={showUpload} onOpenChange={setShowUpload}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" style={{ background: '#0D1117', border: '1px solid rgba(255,255,255,0.08)' }}>
          <DialogHeader><DialogTitle>Upload Drawing Set</DialogTitle></DialogHeader>
          <EnhancedDrawingUpload projectId={activeProjectId} onComplete={() => { queryClient.invalidateQueries({ queryKey: ['drawing-sets'] }); setShowUpload(false); }} />
        </DialogContent>
      </Dialog>

      <DrawingSetDetailDialog
        drawingSetId={selectedSet?.id}
        open={showDetail}
        onOpenChange={open => { if (!open) { setShowDetail(false); setSelectedSet(null); } }}
        users={users}
        rfis={rfis}
      />
    </div>
  );
}