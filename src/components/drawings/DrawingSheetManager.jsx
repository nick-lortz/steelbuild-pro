/**
 * DrawingSheetManager
 * - Lists all sheets for a project with their fab status
 * - Upload a new revision for any existing sheet (links to DrawingSet)
 * - View per-sheet version history
 * - Mark sheet as AFF or FIO
 */
import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Upload, History, CheckCircle2, Eye, FileText, ChevronDown,
  ChevronRight, Loader2, Search, ExternalLink, AlertCircle, Clock, Flag
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import SheetLinkedIssues from './SheetLinkedIssues';

const FAB_STATUS_CONFIG = {
  approved_for_fabrication: { label: 'AFF', sublabel: 'Approved For Fabrication', color: 'bg-green-500/20 text-green-400 border-green-500/40', dot: 'bg-green-400' },
  for_information_only:     { label: 'FIO', sublabel: 'For Information Only',     color: 'bg-blue-500/20 text-blue-400 border-blue-500/40',  dot: 'bg-blue-400'  },
  issued_for_approval:      { label: 'IFA', sublabel: 'Issued For Approval',      color: 'bg-amber-500/20 text-amber-400 border-amber-500/40', dot: 'bg-amber-400' },
  superseded:               { label: 'SUP', sublabel: 'Superseded',               color: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/40',   dot: 'bg-zinc-500'  },
  on_hold:                  { label: 'HOLD', sublabel: 'On Hold',                 color: 'bg-red-500/20 text-red-400 border-red-500/40',      dot: 'bg-red-400'   },
};

function FabStatusBadge({ status }) {
  const cfg = FAB_STATUS_CONFIG[status] || FAB_STATUS_CONFIG.issued_for_approval;
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2 py-0.5 rounded border text-[10px] font-bold', cfg.color)}>
      <span className={cn('w-1.5 h-1.5 rounded-full', cfg.dot)} />
      {cfg.label}
    </span>
  );
}

function VersionHistoryPanel({ sheet, allRevisions }) {
  // Filter revisions that mention this sheet number
  const revs = allRevisions.filter(r =>
    r.sheets?.some(s => s.sheet_number === sheet.sheet_number) ||
    r.drawing_set_id === sheet.drawing_set_id
  );

  if (revs.length === 0) {
    return <div className="text-xs text-zinc-500 py-3 text-center">No revision history found.</div>;
  }

  return (
    <div className="space-y-1 mt-2">
      {revs.map((rev, i) => (
        <div key={rev.id} className={cn('flex items-start gap-3 p-2 rounded border text-xs', rev.is_current ? 'border-amber-600/40 bg-amber-900/10' : 'border-zinc-800 bg-zinc-900/50')}>
          <div className="flex flex-col items-center gap-1 shrink-0">
            <span className={cn('font-mono font-bold text-[11px]', rev.is_current ? 'text-amber-400' : 'text-zinc-500')}>{rev.revision_number}</span>
            {rev.is_current && <span className="text-[9px] text-amber-400">CURRENT</span>}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-zinc-300 truncate">{rev.description || 'No description'}</div>
            <div className="text-zinc-500 mt-0.5">{rev.revision_date} · {rev.status}</div>
          </div>
          {rev.sheets?.find(s => s.sheet_number === sheet.sheet_number)?.file_url && (
            <a href={rev.sheets.find(s => s.sheet_number === sheet.sheet_number).file_url}
              target="_blank" rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 shrink-0">
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      ))}
    </div>
  );
}

function UploadRevisionDialog({ sheet, drawingSets, projectId, currentUser, onClose, onSuccess }) {
  const [selectedSetId, setSelectedSetId] = useState(sheet.drawing_set_id);
  const [revNum, setRevNum] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();

  const handleUpload = async () => {
    if (!file) { toast.error('Select a file first'); return; }
    if (!revNum) { toast.error('Enter a revision number'); return; }
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      // Update the DrawingSheet with new file + revision
      await base44.entities.DrawingSheet.update(sheet.id, {
        file_url,
        file_name: file.name,
        file_size: file.size,
        drawing_set_id: selectedSetId,
        revision_number: revNum,
        uploaded_date: new Date().toISOString()
      });
      // Create a DrawingRevision record for history
      const targetSet = drawingSets.find(s => s.id === selectedSetId);
      await base44.entities.DrawingRevision.create({
        project_id: projectId,
        drawing_set_id: selectedSetId,
        revision_number: revNum,
        revision_date: new Date().toISOString().split('T')[0],
        description,
        status: targetSet?.status || 'IFA',
        submitted_by: currentUser?.email || '',
        is_current: true,
        sheets: [{ sheet_number: sheet.sheet_number, file_url, revision_hash: '' }]
      });
      toast.success('Revision uploaded and linked');
      onSuccess();
    } catch (err) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="p-3 bg-zinc-800 rounded border border-zinc-700 text-xs">
        <div className="text-zinc-400 mb-1">Sheet</div>
        <div className="font-mono font-bold text-white">{sheet.sheet_number} — {sheet.sheet_name || '—'}</div>
        <div className="text-zinc-500 mt-0.5">Current: <span className="text-amber-400">{sheet.revision_number || 'Rev 0'}</span></div>
      </div>

      <div>
        <label className="text-xs text-zinc-400 block mb-1">Link to Drawing Set</label>
        <Select value={selectedSetId} onValueChange={setSelectedSetId}>
          <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white text-sm">
            <SelectValue placeholder="Select set..." />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-700">
            {drawingSets.map(s => (
              <SelectItem key={s.id} value={s.id}>{s.set_number} — {s.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-zinc-400 block mb-1">New Revision #</label>
          <Input value={revNum} onChange={e => setRevNum(e.target.value)}
            placeholder="e.g. Rev B" className="bg-zinc-800 border-zinc-700 text-white text-sm" />
        </div>
        <div>
          <label className="text-xs text-zinc-400 block mb-1">Change Description</label>
          <Input value={description} onChange={e => setDescription(e.target.value)}
            placeholder="What changed?" className="bg-zinc-800 border-zinc-700 text-white text-sm" />
        </div>
      </div>

      <div>
        <label className="text-xs text-zinc-400 block mb-1">New File (PDF / DWG)</label>
        <div
          className="border-2 border-dashed border-zinc-700 rounded-lg p-6 text-center cursor-pointer hover:border-amber-600/50 transition-colors"
          onClick={() => fileRef.current?.click()}>
          <input ref={fileRef} type="file" accept=".pdf,.dwg,.dxf,.png,.jpg" className="hidden"
            onChange={e => setFile(e.target.files[0])} />
          {file
            ? <div className="text-sm text-green-400">{file.name} <span className="text-zinc-500">({(file.size / 1024).toFixed(0)} KB)</span></div>
            : <div className="text-zinc-500 text-sm"><Upload className="w-5 h-5 mx-auto mb-2 text-zinc-600" />Click to select file</div>
          }
        </div>
      </div>

      <div className="flex gap-2 justify-end">
        <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
        <Button size="sm" onClick={handleUpload} disabled={uploading || !file || !revNum}
          className="bg-amber-500 hover:bg-amber-600 text-black font-bold gap-1">
          {uploading ? <><Loader2 className="w-3 h-3 animate-spin" /> Uploading…</> : <><Upload className="w-3 h-3" /> Upload Revision</>}
        </Button>
      </div>
    </div>
  );
}

function SheetRow({ sheet, drawingSets, revisions, currentUser, onStatusChange }) {
  const [historyOpen, setHistoryOpen] = useState(false);
  const [issuesOpen, setIssuesOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const queryClient = useQueryClient();
  const setName = drawingSets.find(s => s.id === sheet.drawing_set_id);

  const handleStatusChange = async (newStatus) => {
    await onStatusChange(sheet.id, newStatus, currentUser?.email);
  };

  return (
    <>
      <div className="p-3 border border-zinc-800 rounded-lg bg-zinc-900/50 hover:border-zinc-700 transition-all">
        <div className="flex items-center gap-3">
          <FileText className="w-4 h-4 text-zinc-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-sm font-bold text-white">{sheet.sheet_number}</span>
              {sheet.sheet_name && <span className="text-xs text-zinc-400 truncate">{sheet.sheet_name}</span>}
              <FabStatusBadge status={sheet.fabrication_status || 'issued_for_approval'} />
              <span className="text-[10px] text-zinc-600 font-mono">{sheet.revision_number || 'Rev 0'}</span>
            </div>
            {setName && <div className="text-[11px] text-zinc-600 mt-0.5">Set: {setName.set_number} — {setName.title}</div>}
          </div>

          {/* Fab status quick-change */}
          <Select value={sheet.fabrication_status || 'issued_for_approval'} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-44 h-7 text-xs bg-zinc-800 border-zinc-700 text-zinc-300">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-700 text-white">
              {Object.entries(FAB_STATUS_CONFIG).map(([val, cfg]) => (
                <SelectItem key={val} value={val} className="text-xs">{cfg.sublabel}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-1">
            {sheet.file_url && (
              <a href={sheet.file_url} target="_blank" rel="noopener noreferrer">
                <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-500 hover:text-blue-400">
                  <Eye className="w-3.5 h-3.5" />
                </Button>
              </a>
            )}
            <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-500 hover:text-amber-400"
              onClick={() => setUploadOpen(true)} title="Upload new revision">
              <Upload className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-500 hover:text-red-400"
              onClick={() => { setIssuesOpen(v => !v); setHistoryOpen(false); }} title="Linked issues & flags">
              <Flag className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-500 hover:text-purple-400"
              onClick={() => { setHistoryOpen(v => !v); setIssuesOpen(false); }} title="Version history">
              {historyOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </Button>
          </div>
        </div>

        {historyOpen && (
          <div className="mt-2 ml-7">
            <div className="text-[10px] text-zinc-500 uppercase mb-1 flex items-center gap-1">
              <History className="w-3 h-3" /> Revision History
            </div>
            <VersionHistoryPanel sheet={sheet} allRevisions={revisions} />
          </div>
        )}
      </div>

      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="max-w-lg bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-white">Upload New Revision — {sheet.sheet_number}</DialogTitle>
          </DialogHeader>
          <UploadRevisionDialog
            sheet={sheet}
            drawingSets={drawingSets}
            projectId={sheet.project_id}
            currentUser={currentUser}
            onClose={() => setUploadOpen(false)}
            onSuccess={() => {
              setUploadOpen(false);
              queryClient.invalidateQueries({ queryKey: ['drawing-sheets', sheet.project_id] });
              queryClient.invalidateQueries({ queryKey: ['drawing-revisions', sheet.project_id] });
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function DrawingSheetManager({ projectId, drawingSets = [] }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [fabFilter, setFabFilter] = useState('all');

  const { data: currentUser } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });

  const { data: sheets = [], isLoading } = useQuery({
    queryKey: ['drawing-sheets', projectId],
    queryFn: () => base44.entities.DrawingSheet.filter({ project_id: projectId }),
    enabled: !!projectId
  });

  const { data: revisions = [] } = useQuery({
    queryKey: ['drawing-revisions', projectId],
    queryFn: () => base44.entities.DrawingRevision.filter({ project_id: projectId }),
    enabled: !!projectId
  });

  const updateSheet = useMutation({
    mutationFn: ({ id, data }) => base44.entities.DrawingSheet.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['drawing-sheets', projectId] })
  });

  const handleStatusChange = async (sheetId, newStatus, userEmail) => {
    await updateSheet.mutateAsync({
      id: sheetId,
      data: {
        fabrication_status: newStatus,
        fabrication_status_set_by: userEmail,
        fabrication_status_set_at: new Date().toISOString()
      }
    });
    const cfg = FAB_STATUS_CONFIG[newStatus];
    toast.success(`Sheet marked as ${cfg?.sublabel || newStatus}`);
  };

  const filtered = sheets.filter(s => {
    const q = search.toLowerCase();
    const matchSearch = !q || s.sheet_number?.toLowerCase().includes(q) || s.sheet_name?.toLowerCase().includes(q);
    const matchFab = fabFilter === 'all' || s.fabrication_status === fabFilter;
    return matchSearch && matchFab;
  });

  // KPI counts
  const aff = sheets.filter(s => s.fabrication_status === 'approved_for_fabrication').length;
  const fio = sheets.filter(s => s.fabrication_status === 'for_information_only').length;
  const ifa = sheets.filter(s => !s.fabrication_status || s.fabrication_status === 'issued_for_approval').length;
  const hold = sheets.filter(s => s.fabrication_status === 'on_hold').length;

  if (!projectId) {
    return <div className="text-center py-16 text-zinc-500 text-sm">Select a project to manage drawing sheets.</div>;
  }

  return (
    <div className="space-y-4">
      {/* KPI strip */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: 'Approved For Fab', count: aff, color: 'text-green-400', border: 'border-green-600/30 bg-green-900/10' },
          { label: 'For Info Only', count: fio, color: 'text-blue-400', border: 'border-blue-600/30 bg-blue-900/10' },
          { label: 'Issued For Approval', count: ifa, color: 'text-amber-400', border: 'border-amber-600/30 bg-amber-900/10' },
          { label: 'On Hold', count: hold, color: 'text-red-400', border: 'border-red-600/30 bg-red-900/10' },
        ].map(k => (
          <div key={k.label} className={cn('rounded-lg border p-3 text-center', k.border)}>
            <div className={cn('text-2xl font-bold font-mono', k.color)}>{k.count}</div>
            <div className="text-[10px] text-zinc-500 mt-0.5">{k.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
          <Input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by sheet number or name..."
            className="pl-9 h-8 text-xs bg-zinc-900 border-zinc-800 text-white" />
        </div>
        <Select value={fabFilter} onValueChange={setFabFilter}>
          <SelectTrigger className="h-8 w-52 text-xs bg-zinc-900 border-zinc-800 text-white">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-700 text-white">
            <SelectItem value="all">All Fab Statuses</SelectItem>
            {Object.entries(FAB_STATUS_CONFIG).map(([val, cfg]) => (
              <SelectItem key={val} value={val} className="text-xs">{cfg.sublabel}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-2 p-3 bg-zinc-900 border border-zinc-800 rounded text-xs text-zinc-500">
        <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-500" />
        <span>
          <strong className="text-amber-400">AFF</strong> sheets are cleared for shop release.{' '}
          <strong className="text-blue-400">FIO</strong> sheets are reference-only and must not drive fabrication.
          Status is referenced in Erection Issues and Design Intent Flags.
        </span>
      </div>

      {/* Sheet list */}
      {isLoading ? (
        <div className="text-center py-12 text-zinc-500 text-sm flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading sheets…
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-zinc-500 text-sm">
          {sheets.length === 0 ? 'No sheets uploaded yet. Upload a drawing set to get started.' : 'No sheets match your filters.'}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(sheet => (
            <SheetRow
              key={sheet.id}
              sheet={sheet}
              drawingSets={drawingSets}
              revisions={revisions}
              currentUser={currentUser}
              onStatusChange={handleStatusChange}
            />
          ))}
        </div>
      )}
    </div>
  );
}