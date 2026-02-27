import React, { useState, useMemo, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useActiveProject } from '@/components/shared/hooks/useActiveProject';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Upload, Search, File, FileText, Sparkles, History, Eye, Download,
  Loader2, Trash2, Tag, X, Plus, CheckCircle, AlertCircle, Clock,
  FolderOpen, Grid, List, ChevronRight, RefreshCw, ArrowUpDown, Share2, Link as LinkIcon
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

// ── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { value: 'drawing',       label: 'Drawing',        color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
  { value: 'specification', label: 'Specification',   color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
  { value: 'rfi',           label: 'RFI',             color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  { value: 'submittal',     label: 'Submittal',       color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' },
  { value: 'contract',      label: 'Contract',        color: 'bg-green-500/20 text-green-300 border-green-500/30' },
  { value: 'report',        label: 'Report',          color: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' },
  { value: 'photo',         label: 'Photo',           color: 'bg-pink-500/20 text-pink-300 border-pink-500/30' },
  { value: 'correspondence',label: 'Correspondence',  color: 'bg-orange-500/20 text-orange-300 border-orange-500/30' },
  { value: 'safety_form',   label: 'Safety Form',     color: 'bg-red-500/20 text-red-300 border-red-500/30' },
  { value: 'invoice',       label: 'Invoice',         color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
  { value: 'other',         label: 'Other',           color: 'bg-zinc-500/20 text-zinc-300 border-zinc-600/30' },
];

const PHASES = ['detailing', 'fabrication', 'delivery', 'erection', 'closeout'];

const getCategoryMeta = (val) => CATEGORIES.find(c => c.value === val) || CATEGORIES[CATEGORIES.length - 1];

const STATUS_CONFIG = {
  draft:       { label: 'Draft',       cls: 'bg-zinc-700/50 text-zinc-300' },
  issued:      { label: 'Issued',      cls: 'bg-blue-500/20 text-blue-300' },
  for_review:  { label: 'For Review',  cls: 'bg-amber-500/20 text-amber-300' },
  approved:    { label: 'Approved',    cls: 'bg-green-500/20 text-green-300' },
  void:        { label: 'Void',        cls: 'bg-red-500/20 text-red-300' },
  superseded:  { label: 'Superseded',  cls: 'bg-zinc-600/30 text-zinc-500' },
};

// ── Upload Drop Zone ──────────────────────────────────────────────────────────

function DropZone({ onFiles, disabled }) {
  const [dragging, setDragging] = useState(false);
  const ref = useRef();

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length) onFiles(files);
  };

  return (
    <div
      ref={ref}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => ref.current.querySelector('input').click()}
      className={cn(
        'relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all',
        dragging
          ? 'border-amber-500 bg-amber-500/10'
          : 'border-zinc-700 hover:border-zinc-500 bg-zinc-900/50'
      )}
    >
      <input
        type="file"
        multiple
        accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.dwg,.dxf,.csv"
        className="hidden"
        disabled={disabled}
        onChange={(e) => onFiles(Array.from(e.target.files))}
      />
      <Upload size={32} className={cn('mx-auto mb-3', dragging ? 'text-amber-400' : 'text-zinc-500')} />
      <p className="text-sm font-medium text-zinc-300 mb-1">
        {dragging ? 'Drop files here' : 'Drag & drop files or click to browse'}
      </p>
      <p className="text-xs text-zinc-600">PDF, DOC, XLS, DWG, images • Multiple files supported</p>
    </div>
  );
}

// ── Upload Queue Item ─────────────────────────────────────────────────────────

function UploadQueueItem({ item, onRemove, projects, onFieldChange }) {
  return (
    <div className="p-3 bg-zinc-800/60 rounded-lg border border-zinc-700/50 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <File size={14} className="text-amber-400 flex-shrink-0" />
          <span className="text-xs font-medium text-white truncate">{item.file.name}</span>
          {item.status === 'uploading' && <Loader2 size={12} className="animate-spin text-amber-400 flex-shrink-0" />}
          {item.status === 'done' && <CheckCircle size={12} className="text-green-400 flex-shrink-0" />}
          {item.status === 'analyzing' && <Sparkles size={12} className="animate-pulse text-blue-400 flex-shrink-0" />}
          {item.status === 'error' && <AlertCircle size={12} className="text-red-400 flex-shrink-0" />}
        </div>
        {item.status === 'pending' && (
          <button onClick={() => onRemove(item.id)} className="text-zinc-600 hover:text-red-400 flex-shrink-0">
            <X size={13} />
          </button>
        )}
      </div>

      {item.status === 'pending' && (
        <div className="grid grid-cols-2 gap-2">
          <Select value={item.category} onValueChange={(v) => onFieldChange(item.id, 'category', v)}>
            <SelectTrigger className="h-7 text-xs bg-zinc-900 border-zinc-700">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-800">
              {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={item.phase || ''} onValueChange={(v) => onFieldChange(item.id, 'phase', v)}>
            <SelectTrigger className="h-7 text-xs bg-zinc-900 border-zinc-700">
              <SelectValue placeholder="Phase" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-800">
              <SelectItem value={null}>No Phase</SelectItem>
              {PHASES.map(p => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="col-span-2">
            <Input
              value={item.title}
              onChange={(e) => onFieldChange(item.id, 'title', e.target.value)}
              placeholder="Title (auto-filled from filename)"
              className="h-7 text-xs bg-zinc-900 border-zinc-700"
            />
          </div>
          <Select value={item.project_id || ''} onValueChange={(v) => onFieldChange(item.id, 'project_id', v)}>
            <SelectTrigger className="h-7 text-xs bg-zinc-900 border-zinc-700">
              <SelectValue placeholder="Project" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-800">
              <SelectItem value={null}>No Project</SelectItem>
              {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.project_number}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}

      {item.status === 'done' && item.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {item.tags.slice(0, 5).map((t, i) => (
            <span key={i} className="text-[10px] px-1.5 py-0.5 bg-blue-500/15 text-blue-400 rounded">{t}</span>
          ))}
          {item.tags.length > 5 && <span className="text-[10px] text-zinc-500">+{item.tags.length - 5} more</span>}
        </div>
      )}

      {item.status === 'analyzing' && (
        <p className="text-[10px] text-blue-400 flex items-center gap-1">
          <Sparkles size={10} /> AI is auto-tagging this document...
        </p>
      )}
      {item.status === 'error' && (
        <p className="text-[10px] text-red-400">{item.error}</p>
      )}
    </div>
  );
}

// ── Document Card ─────────────────────────────────────────────────────────────

function DocCard({ doc, projects, onView, onDelete, onAnalyze, analyzing }) {
  const project = projects.find(p => p.id === doc.project_id);
  const catMeta = getCategoryMeta(doc.category);
  const statusMeta = STATUS_CONFIG[doc.status] || STATUS_CONFIG.draft;

  // Parse AI extraction data from notes
  const aiData = useMemo(() => {
    if (!doc.notes) return null;
    const match = doc.notes.match(/AI_EXTRACTED: ({.+})/s);
    if (!match) return null;
    try { return JSON.parse(match[1]); } catch { return null; }
  }, [doc.notes]);

  return (
    <Card className="bg-zinc-900 border-zinc-800 hover:border-zinc-600 transition-all group cursor-pointer"
      onClick={() => onView(doc)}>
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-start gap-2 min-w-0">
            <div className="p-2 bg-zinc-800 rounded-lg flex-shrink-0">
              <FileText size={16} className="text-amber-400" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate group-hover:text-amber-400 transition-colors">
                {doc.title}
              </p>
              <p className="text-[10px] text-zinc-500 font-mono">{project?.project_number || '—'}</p>
            </div>
          </div>
          <span className={cn('text-[10px] px-1.5 py-0.5 rounded flex-shrink-0', statusMeta.cls)}>{statusMeta.label}</span>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-1 mb-3">
          <span className={cn('text-[10px] px-2 py-0.5 rounded border font-medium', catMeta.color)}>
            {catMeta.label}
          </span>
          {doc.phase && (
            <span className="text-[10px] px-2 py-0.5 rounded border border-zinc-700 text-zinc-400 capitalize">
              {doc.phase}
            </span>
          )}
          {(doc.version || 1) > 1 && (
            <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/15 text-blue-400">
              v{doc.version}
            </span>
          )}
        </div>

        {/* AI Summary */}
        {aiData?.summary && (
          <p className="text-[11px] text-zinc-500 line-clamp-2 mb-2 leading-relaxed">{aiData.summary}</p>
        )}

        {/* Tags */}
        {doc.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {doc.tags.slice(0, 4).map((t, i) => (
              <span key={i} className="text-[10px] px-1.5 py-0.5 bg-amber-500/10 text-amber-400 rounded">{t}</span>
            ))}
            {doc.tags.length > 4 && (
              <span className="text-[10px] text-zinc-600">+{doc.tags.length - 4}</span>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
          <span className="text-[10px] text-zinc-600">
            {doc.created_date ? format(new Date(doc.created_date), 'MMM d, yyyy') : '—'}
          </span>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
            {doc.file_url && (
              <button
                onClick={() => window.open(doc.file_url, '_blank')}
                className="p-1 text-zinc-500 hover:text-white transition-colors"
                title="Open file"
              >
                <Eye size={13} />
              </button>
            )}
            <button
              onClick={() => onAnalyze(doc)}
              disabled={analyzing === doc.id}
              className="p-1 text-zinc-500 hover:text-blue-400 transition-colors disabled:opacity-40"
              title="Re-run AI tagging"
            >
              {analyzing === doc.id ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
            </button>
            <button
              onClick={() => onDelete(doc)}
              className="p-1 text-zinc-500 hover:text-red-400 transition-colors"
              title="Delete"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Version History Panel ─────────────────────────────────────────────────────

function VersionPanel({ doc, allDocs, onUploadVersion, uploading }) {
  const rootId = doc.parent_document_id || doc.id;
  const versions = allDocs
    .filter(d => d.id === rootId || d.parent_document_id === rootId)
    .sort((a, b) => (b.version || 1) - (a.version || 1));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-white flex items-center gap-2">
          <History size={14} className="text-zinc-400" /> Version History
        </h4>
        <label className="cursor-pointer">
          <input type="file" className="hidden" onChange={onUploadVersion} disabled={uploading} />
          <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-black h-7 text-xs pointer-events-none">
            {uploading ? <Loader2 size={12} className="animate-spin mr-1" /> : <Upload size={12} className="mr-1" />}
            Upload v{(doc.version || 1) + 1}
          </Button>
        </label>
      </div>
      {versions.map(v => {
        const sm = STATUS_CONFIG[v.status] || STATUS_CONFIG.draft;
        return (
          <div key={v.id} className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg border border-zinc-800">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-amber-400 text-sm">v{v.version || 1}</span>
                <span className={cn('text-[10px] px-1.5 py-0.5 rounded', sm.cls)}>{sm.label}</span>
                {v.is_current && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/20 text-green-400">CURRENT</span>
                )}
              </div>
              <p className="text-[10px] text-zinc-500 mt-0.5">
                {v.created_date ? format(new Date(v.created_date), 'MMM d, yyyy h:mm a') : '—'}
                {v.created_by ? ` · ${v.created_by}` : ''}
              </p>
              {v.revision_notes && (
                <p className="text-[11px] text-zinc-400 mt-1 italic">"{v.revision_notes}"</p>
              )}
            </div>
            {v.file_url && (
              <div className="flex gap-1">
                <button onClick={() => window.open(v.file_url, '_blank')} className="p-1.5 text-zinc-500 hover:text-white">
                  <Eye size={13} />
                </button>
                <a href={v.file_url} download={v.file_name} className="p-1.5 text-zinc-500 hover:text-white">
                  <Download size={13} />
                </a>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── AI Insights Panel ─────────────────────────────────────────────────────────

function AIInsightsPanel({ doc }) {
  const aiData = useMemo(() => {
    if (!doc.notes) return null;
    const match = doc.notes.match(/AI_EXTRACTED: ({.+?})\n/s) || doc.notes.match(/AI_EXTRACTED: (.+)/s);
    if (!match) return null;
    try { return JSON.parse(match[1]); } catch { return null; }
  }, [doc.notes]);

  if (!aiData) return (
    <div className="p-4 bg-zinc-800/30 rounded-lg text-center">
      <Sparkles size={20} className="mx-auto mb-2 text-zinc-600" />
      <p className="text-xs text-zinc-500">No AI data yet — click the ✦ button on the card to run analysis.</p>
    </div>
  );

  const sections = [
    { label: 'Summary', value: aiData.summary, type: 'text' },
    { label: 'Structural Elements', value: aiData.structural_elements, type: 'list' },
    { label: 'Materials', value: aiData.materials, type: 'list' },
    { label: 'Specifications', value: aiData.specifications, type: 'list' },
    { label: 'Action Items', value: aiData.action_items, type: 'list' },
    { label: 'Schedule Impacts', value: aiData.schedule_impacts, type: 'list' },
    { label: 'Cost Impacts', value: aiData.cost_impacts, type: 'list' },
  ].filter(s => s.value && (Array.isArray(s.value) ? s.value.length > 0 : s.value.trim()));

  return (
    <div className="space-y-3">
      {sections.map(s => (
        <div key={s.label} className="p-3 bg-zinc-800/40 rounded-lg">
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">{s.label}</p>
          {s.type === 'text' ? (
            <p className="text-xs text-zinc-300 leading-relaxed">{s.value}</p>
          ) : (
            <ul className="space-y-0.5">
              {s.value.map((item, i) => (
                <li key={i} className="text-xs text-zinc-300 flex items-start gap-1.5">
                  <ChevronRight size={10} className="text-zinc-600 mt-0.5 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function DocumentHub() {
  const { activeProjectId } = useActiveProject();
  const queryClient = useQueryClient();

  // Filters
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('all');
  const [phaseFilter, setPhaseFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState(activeProjectId || 'all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('created_date');
  const [viewMode, setViewMode] = useState('grid');

  // Upload state
  const [uploadQueue, setUploadQueue] = useState([]);
  const [showUpload, setShowUpload] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Detail panel
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [detailTab, setDetailTab] = useState('info');
  const [versionUploading, setVersionUploading] = useState(false);
  const [deleteDoc, setDeleteDoc] = useState(null);
  const [analyzing, setAnalyzing] = useState(null);

  // Data
  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('name'),
    staleTime: 10 * 60 * 1000
  });

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['documents'],
    queryFn: () => base44.entities.Document.list('-created_date', 500),
    staleTime: 2 * 60 * 1000
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Document.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['documents'] })
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Document.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['documents'] })
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Document.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      setDeleteDoc(null);
      if (selectedDoc?.id === deleteDoc?.id) setSelectedDoc(null);
    }
  });

  // ── Upload flow ────────────────────────────────────────────────────────────

  const handleFiles = useCallback((files) => {
    const items = files.map(f => ({
      id: Math.random().toString(36).slice(2),
      file: f,
      title: f.name.replace(/\.[^.]+$/, ''),
      category: 'other',
      phase: '',
      project_id: activeProjectId || '',
      status: 'pending',
      tags: [],
      error: null,
    }));
    setUploadQueue(prev => [...prev, ...items]);
    setShowUpload(true);
  }, [activeProjectId]);

  const updateQueueItem = (id, field, value) => {
    setUploadQueue(prev => prev.map(i => i.id === id ? { ...i, [field]: value } : i));
  };

  const removeQueueItem = (id) => {
    setUploadQueue(prev => prev.filter(i => i.id !== id));
  };

  const handleUploadAll = async () => {
    const pending = uploadQueue.filter(i => i.status === 'pending');
    if (!pending.length) return;

    setIsUploading(true);

    for (const item of pending) {
      // 1. Upload file
      setUploadQueue(prev => prev.map(i => i.id === item.id ? { ...i, status: 'uploading' } : i));
      let file_url, file_name, file_size;
      try {
        const res = await base44.integrations.Core.UploadFile({ file: item.file });
        file_url = res.file_url;
        file_name = item.file.name;
        file_size = item.file.size;
      } catch (e) {
        setUploadQueue(prev => prev.map(i => i.id === item.id ? { ...i, status: 'error', error: 'Upload failed' } : i));
        continue;
      }

      // 2. Create document record
      let newDoc;
      try {
        newDoc = await createMutation.mutateAsync({
          project_id: item.project_id || null,
          title: item.title,
          category: item.category,
          phase: item.phase || null,
          file_url, file_name, file_size,
          status: 'draft',
          workflow_stage: 'uploaded',
          is_current: true,
          tags: [],
        });
      } catch (e) {
        setUploadQueue(prev => prev.map(i => i.id === item.id ? { ...i, status: 'error', error: 'Save failed' } : i));
        continue;
      }

      // 3. AI auto-tagging
      setUploadQueue(prev => prev.map(i => i.id === item.id ? { ...i, status: 'analyzing' } : i));
      try {
        const { data: aiResult } = await base44.functions.invoke('autoProcessDocument', {
          document_id: newDoc.id,
          file_url,
          category: item.category,
          title: item.title
        });
        const tags = aiResult?.extraction?.suggested_tags || [];
        setUploadQueue(prev => prev.map(i => i.id === item.id ? { ...i, status: 'done', tags } : i));
      } catch {
        setUploadQueue(prev => prev.map(i => i.id === item.id ? { ...i, status: 'done', tags: [] } : i));
      }
    }

    setIsUploading(false);
    queryClient.invalidateQueries({ queryKey: ['documents'] });
    toast.success('Upload complete');
  };

  // ── Version upload ─────────────────────────────────────────────────────────

  const handleVersionUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !selectedDoc) return;
    setVersionUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const newVersion = (selectedDoc.version || 1) + 1;
      await createMutation.mutateAsync({
        ...selectedDoc,
        id: undefined,
        file_url, file_name: file.name, file_size: file.size,
        version: newVersion,
        parent_document_id: selectedDoc.parent_document_id || selectedDoc.id,
        is_current: true,
        created_date: undefined, updated_date: undefined
      });
      await updateMutation.mutateAsync({ id: selectedDoc.id, data: { status: 'superseded', is_current: false } });
      toast.success(`Version ${newVersion} uploaded`);
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    } catch {
      toast.error('Version upload failed');
    } finally {
      setVersionUploading(false);
    }
  };

  // ── Re-run AI ──────────────────────────────────────────────────────────────

  const handleAnalyze = async (doc) => {
    if (!doc.file_url) { toast.error('No file attached'); return; }
    setAnalyzing(doc.id);
    try {
      await base44.functions.invoke('autoProcessDocument', {
        document_id: doc.id, file_url: doc.file_url,
        category: doc.category, title: doc.title
      });
      toast.success('AI tagging complete');
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    } catch {
      toast.error('AI analysis failed');
    } finally {
      setAnalyzing(null);
    }
  };

  // ── Filtered list ──────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    return documents.filter(d => {
      if (d.is_current === false) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!d.title?.toLowerCase().includes(q) &&
            !d.file_name?.toLowerCase().includes(q) &&
            !d.description?.toLowerCase().includes(q) &&
            !d.tags?.some(t => t.toLowerCase().includes(q))) return false;
      }
      if (catFilter !== 'all' && d.category !== catFilter) return false;
      if (phaseFilter !== 'all' && d.phase !== phaseFilter) return false;
      if (projectFilter !== 'all' && d.project_id !== projectFilter) return false;
      if (statusFilter !== 'all' && d.status !== statusFilter) return false;
      return true;
    }).sort((a, b) => {
      if (sortBy === 'title') return a.title?.localeCompare(b.title);
      if (sortBy === 'category') return a.category?.localeCompare(b.category);
      return new Date(b.created_date) - new Date(a.created_date);
    });
  }, [documents, search, catFilter, phaseFilter, projectFilter, statusFilter, sortBy]);

  // ── KPIs ───────────────────────────────────────────────────────────────────

  const kpis = useMemo(() => {
    const current = documents.filter(d => d.is_current !== false);
    return {
      total: current.length,
      pending: current.filter(d => d.workflow_stage === 'pending_review').length,
      approved: current.filter(d => d.status === 'approved').length,
      ai_tagged: current.filter(d => d.tags?.length > 0).length,
      versioned: current.filter(d => (d.version || 1) > 1).length,
    };
  }, [documents]);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <div className="border-b border-zinc-800 bg-black sticky top-0 z-20">
        <div className="max-w-[1800px] mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-lg font-bold text-white tracking-wide flex items-center gap-2">
                <FolderOpen size={18} className="text-amber-400" />
                Document Hub
              </h1>
              <p className="text-[10px] text-zinc-600 font-mono mt-0.5">
                {kpis.total} DOCS · {kpis.ai_tagged} AI-TAGGED · {kpis.pending} PENDING REVIEW
              </p>
            </div>
            <Button
              onClick={() => setShowUpload(true)}
              className="bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs"
            >
              <Upload size={13} className="mr-1.5" />
              Upload Documents
            </Button>
          </div>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="border-b border-zinc-800 bg-zinc-950">
        <div className="max-w-[1800px] mx-auto px-4 sm:px-6 py-3">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { label: 'Total',         value: kpis.total,    color: 'text-white' },
              { label: 'Approved',      value: kpis.approved, color: 'text-green-400' },
              { label: 'Pending Review',value: kpis.pending,  color: kpis.pending > 0 ? 'text-amber-400' : 'text-green-400' },
              { label: 'AI Tagged',     value: kpis.ai_tagged,color: 'text-blue-400' },
              { label: 'Versioned',     value: kpis.versioned,color: 'text-purple-400' },
            ].map(k => (
              <div key={k.label} className="bg-zinc-900 rounded-lg px-3 py-2 border border-zinc-800">
                <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">{k.label}</p>
                <p className={cn('text-xl font-bold font-mono', k.color)}>{k.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="border-b border-zinc-800 bg-zinc-950/50">
        <div className="max-w-[1800px] mx-auto px-4 sm:px-6 py-3">
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative flex-1 min-w-48">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by title, tags, description..."
                className="pl-8 h-9 bg-zinc-900 border-zinc-800 text-white text-xs"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white">
                  <X size={12} />
                </button>
              )}
            </div>

            <Select value={projectFilter} onValueChange={setProjectFilter}>
              <SelectTrigger className="w-36 h-9 bg-zinc-900 border-zinc-800 text-white text-xs">
                <SelectValue placeholder="Project" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800">
                <SelectItem value="all">All Projects</SelectItem>
                {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.project_number}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={catFilter} onValueChange={setCatFilter}>
              <SelectTrigger className="w-36 h-9 bg-zinc-900 border-zinc-800 text-white text-xs">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800">
                <SelectItem value="all">All Categories</SelectItem>
                {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={phaseFilter} onValueChange={setPhaseFilter}>
              <SelectTrigger className="w-32 h-9 bg-zinc-900 border-zinc-800 text-white text-xs">
                <SelectValue placeholder="Phase" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800">
                <SelectItem value="all">All Phases</SelectItem>
                {PHASES.map(p => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32 h-9 bg-zinc-900 border-zinc-800 text-white text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800">
                <SelectItem value="all">All Status</SelectItem>
                {Object.entries(STATUS_CONFIG).filter(([k]) => k !== 'superseded').map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-32 h-9 bg-zinc-900 border-zinc-800 text-white text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800">
                <SelectItem value="created_date">Newest First</SelectItem>
                <SelectItem value="title">Name</SelectItem>
                <SelectItem value="category">Category</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex gap-1 ml-auto">
              <button
                onClick={() => setViewMode('grid')}
                className={cn('p-2 rounded transition-colors', viewMode === 'grid' ? 'bg-amber-500 text-black' : 'text-zinc-500 hover:text-white')}
              >
                <Grid size={14} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={cn('p-2 rounded transition-colors', viewMode === 'list' ? 'bg-amber-500 text-black' : 'text-zinc-500 hover:text-white')}
              >
                <List size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-[1800px] mx-auto px-4 sm:px-6 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="animate-spin text-amber-500" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <FolderOpen size={48} className="mx-auto mb-4 text-zinc-700" />
            <p className="text-zinc-400 mb-2">No documents found</p>
            <Button onClick={() => setShowUpload(true)} className="bg-amber-500 hover:bg-amber-600 text-black">
              <Upload size={14} className="mr-2" /> Upload First Document
            </Button>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map(doc => (
              <DocCard key={doc.id} doc={doc} projects={projects}
                onView={setSelectedDoc} onDelete={setDeleteDoc}
                onAnalyze={handleAnalyze} analyzing={analyzing} />
            ))}
          </div>
        ) : (
          /* List View */
          <Card className="bg-zinc-900 border-zinc-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-800">
                    {['Document', 'Category', 'Phase', 'Status', 'Tags', 'Version', 'Date', ''].map(h => (
                      <th key={h} className="text-left px-3 py-2.5 text-[10px] font-bold text-zinc-600 uppercase tracking-widest">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(doc => {
                    const project = projects.find(p => p.id === doc.project_id);
                    const catMeta = getCategoryMeta(doc.category);
                    const sm = STATUS_CONFIG[doc.status] || STATUS_CONFIG.draft;
                    return (
                      <tr key={doc.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 cursor-pointer group"
                          onClick={() => setSelectedDoc(doc)}>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2">
                            <FileText size={13} className="text-amber-400 flex-shrink-0" />
                            <div>
                              <p className="text-sm text-white font-medium group-hover:text-amber-400 transition-colors">{doc.title}</p>
                              <p className="text-[10px] text-zinc-600">{project?.project_number}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className={cn('text-[10px] px-2 py-0.5 rounded border font-medium', catMeta.color)}>{catMeta.label}</span>
                        </td>
                        <td className="px-3 py-2.5">
                          {doc.phase ? <span className="text-xs text-zinc-400 capitalize">{doc.phase}</span> : <span className="text-zinc-700">—</span>}
                        </td>
                        <td className="px-3 py-2.5">
                          <span className={cn('text-[10px] px-1.5 py-0.5 rounded', sm.cls)}>{sm.label}</span>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex flex-wrap gap-1">
                            {(doc.tags || []).slice(0, 3).map((t, i) => (
                              <span key={i} className="text-[10px] px-1.5 py-0.5 bg-amber-500/10 text-amber-400 rounded">{t}</span>
                            ))}
                            {(doc.tags?.length || 0) > 3 && <span className="text-[10px] text-zinc-600">+{doc.tags.length - 3}</span>}
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="font-mono text-xs text-blue-400">v{doc.version || 1}</span>
                        </td>
                        <td className="px-3 py-2.5 text-xs text-zinc-500">
                          {doc.created_date ? format(new Date(doc.created_date), 'MMM d, yy') : '—'}
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                            {doc.file_url && (
                              <button onClick={() => window.open(doc.file_url, '_blank')} className="p-1 text-zinc-500 hover:text-white">
                                <Eye size={13} />
                              </button>
                            )}
                            <button onClick={() => handleAnalyze(doc)} disabled={analyzing === doc.id} className="p-1 text-zinc-500 hover:text-blue-400">
                              {analyzing === doc.id ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                            </button>
                            <button onClick={() => setDeleteDoc(doc)} className="p-1 text-zinc-500 hover:text-red-400">
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>

      {/* Upload Dialog */}
      <Dialog open={showUpload} onOpenChange={setShowUpload}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Upload size={16} className="text-amber-400" />
              Upload Documents
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            <DropZone onFiles={handleFiles} disabled={isUploading} />

            {uploadQueue.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-zinc-400">{uploadQueue.length} file{uploadQueue.length > 1 ? 's' : ''} queued</p>
                  <button onClick={() => setUploadQueue([])} className="text-[10px] text-zinc-600 hover:text-red-400">
                    Clear all
                  </button>
                </div>
                {uploadQueue.map(item => (
                  <UploadQueueItem key={item.id} item={item} projects={projects}
                    onRemove={removeQueueItem} onFieldChange={updateQueueItem} />
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-zinc-800 pt-3 flex justify-between items-center">
            <p className="text-[10px] text-zinc-500 flex items-center gap-1">
              <Sparkles size={10} className="text-blue-400" />
              AI will auto-tag each document after upload
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowUpload(false)} className="border-zinc-700 text-white">
                Close
              </Button>
              <Button
                size="sm"
                onClick={handleUploadAll}
                disabled={isUploading || uploadQueue.filter(i => i.status === 'pending').length === 0}
                className="bg-amber-500 hover:bg-amber-600 text-black font-semibold"
              >
                {isUploading ? <Loader2 size={13} className="mr-1 animate-spin" /> : <Upload size={13} className="mr-1" />}
                Upload {uploadQueue.filter(i => i.status === 'pending').length > 1 ? `All ${uploadQueue.filter(i => i.status === 'pending').length}` : ''} & Auto-Tag
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail Panel */}
      {selectedDoc && (
        <Dialog open onOpenChange={() => setSelectedDoc(null)}>
          <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-xl max-h-[85vh] flex flex-col">
            <DialogHeader>
              <DialogTitle className="text-white text-sm truncate pr-4">{selectedDoc.title}</DialogTitle>
            </DialogHeader>

            <Tabs value={detailTab} onValueChange={setDetailTab} className="flex-1 flex flex-col overflow-hidden">
              <TabsList className="bg-zinc-800 border-zinc-700 flex-shrink-0">
                <TabsTrigger value="info" className="text-xs">Info</TabsTrigger>
                <TabsTrigger value="versions" className="text-xs">Versions</TabsTrigger>
                <TabsTrigger value="ai" className="text-xs flex items-center gap-1">
                  <Sparkles size={10} /> AI Insights
                </TabsTrigger>
              </TabsList>

              <div className="flex-1 overflow-y-auto mt-3">
                <TabsContent value="info" className="space-y-3 mt-0">
                  {/* Meta grid */}
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: 'Category', value: getCategoryMeta(selectedDoc.category).label },
                      { label: 'Phase', value: selectedDoc.phase || '—' },
                      { label: 'Status', value: (STATUS_CONFIG[selectedDoc.status] || STATUS_CONFIG.draft).label },
                      { label: 'Version', value: `v${selectedDoc.version || 1}` },
                      { label: 'Revision', value: selectedDoc.revision || '—' },
                      { label: 'Uploaded', value: selectedDoc.created_date ? format(new Date(selectedDoc.created_date), 'MMM d, yyyy') : '—' },
                    ].map(f => (
                      <div key={f.label} className="p-2 bg-zinc-800/50 rounded">
                        <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">{f.label}</p>
                        <p className="text-xs text-white capitalize">{f.value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Tags */}
                  <div>
                    <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-2 flex items-center gap-1">
                      <Tag size={9} /> Tags
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {selectedDoc.tags?.length > 0
                        ? selectedDoc.tags.map((t, i) => (
                            <span key={i} className="text-[11px] px-2 py-0.5 bg-amber-500/10 text-amber-400 rounded border border-amber-500/20">{t}</span>
                          ))
                        : <span className="text-xs text-zinc-600">No tags yet — run AI analysis to auto-tag</span>
                      }
                    </div>
                  </div>

                  {/* Description */}
                  {selectedDoc.description && (
                    <div>
                      <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-1">Description</p>
                      <p className="text-xs text-zinc-300 leading-relaxed">{selectedDoc.description}</p>
                    </div>
                  )}

                  {/* File actions */}
                  {selectedDoc.file_url && (
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => window.open(selectedDoc.file_url, '_blank')} className="border-zinc-700 text-white text-xs h-8">
                        <Eye size={12} className="mr-1" /> View File
                      </Button>
                      <a href={selectedDoc.file_url} download={selectedDoc.file_name}>
                        <Button size="sm" variant="outline" className="border-zinc-700 text-white text-xs h-8">
                          <Download size={12} className="mr-1" /> Download
                        </Button>
                      </a>
                      <Button size="sm" variant="outline" onClick={() => handleAnalyze(selectedDoc)} disabled={analyzing === selectedDoc.id} className="border-blue-700 text-blue-400 text-xs h-8">
                        {analyzing === selectedDoc.id ? <Loader2 size={12} className="mr-1 animate-spin" /> : <Sparkles size={12} className="mr-1" />}
                        Re-Tag
                      </Button>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="versions" className="mt-0">
                  <VersionPanel
                    doc={selectedDoc}
                    allDocs={documents}
                    onUploadVersion={handleVersionUpload}
                    uploading={versionUploading}
                  />
                </TabsContent>

                <TabsContent value="ai" className="mt-0">
                  <AIInsightsPanel doc={selectedDoc} />
                </TabsContent>
              </div>
            </Tabs>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteDoc} onOpenChange={() => setDeleteDoc(null)}>
        <AlertDialogContent className="bg-zinc-900 border-zinc-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete Document?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              "{deleteDoc?.title}" will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-zinc-700 text-white hover:bg-zinc-800">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteMutation.mutate(deleteDoc.id)} className="bg-red-500 hover:bg-red-600">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}