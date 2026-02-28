import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useActiveProject } from '@/components/shared/hooks/useActiveProject';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  FileText, Pen, Highlighter, Type, MessageSquare, Ruler,
  Layers, AlertCircle, CheckCircle2, XCircle, Loader2,
  Sparkles, ArrowLeft, ArrowRight, ZoomIn, ZoomOut,
  RotateCcw, Download, Eye, EyeOff, GitCompare
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const RFI_COLORS = {
  draft: '#6B7280',
  submitted: '#3B82F6',
  under_review: '#F59E0B',
  answered: '#22C55E',
  closed: '#9CA3AF',
  reopened: '#EF4444',
};

const STATUS_CONFIG = {
  IFA: { label: 'IFA', color: '#3B82F6' },
  BFA: { label: 'BFA', color: '#F59E0B' },
  BFS: { label: 'BFS', color: '#A855F7' },
  FFF: { label: 'FFF', color: '#22C55E' },
  superseded: { label: 'Superseded', color: '#6B7280' },
};

function RFIPin({ rfi, onClick }) {
  const color = RFI_COLORS[rfi.status] || '#6B7280';
  return (
    <button
      onClick={() => onClick(rfi)}
      className="absolute w-6 h-6 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-[10px] font-bold text-white hover:scale-110 transition-transform z-20"
      style={{
        background: color,
        left: `${(rfi._pin_x || 20) * 100}%`,
        top: `${(rfi._pin_y || 20) * 100}%`,
        transform: 'translate(-50%, -50%)',
      }}
      title={`RFI #${rfi.rfi_number}: ${rfi.subject}`}
    >
      {rfi.rfi_number}
    </button>
  );
}

function AIReadinessPanel({ drawingSet, sheet, onClose }) {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const runCheck = async () => {
    setLoading(true);
    try {
      const prompt = `You are a structural steel fabrication and erection expert. Perform a readiness check on drawing set "${drawingSet?.title || 'Unknown'}" (${drawingSet?.status || 'IFA'}).

Sheet: ${sheet?.sheet_number || 'N/A'} - ${sheet?.sheet_name || 'N/A'}
Discipline: ${drawingSet?.discipline || 'structural'}
Current Status: ${drawingSet?.status || 'IFA'}

Analyze the following:
1. FABRICATION READINESS - List any common issues in steel shop drawings that would block fab release (P0 = must fix, P1 = warning)
2. ERECTION READINESS - Identify potential field conflicts or sequence issues
3. RECOMMENDATIONS - Top 3 actions before advancing to next status

Format as a concise professional report using steel industry terminology. Be specific.`;

      const response = await base44.integrations.Core.InvokeLLM({ prompt });
      setResult(response);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#0A0A0A] border border-[rgba(255,255,255,0.08)] rounded-xl p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-[#FF9D42]" />
          <span className="text-sm font-semibold text-[#E5E7EB]">AI Readiness Check</span>
        </div>
        <button onClick={onClose} className="text-[#6B7280] hover:text-[#9CA3AF] text-xs">✕</button>
      </div>

      <div className="flex flex-col gap-2 mb-3">
        <div className="text-xs text-[#6B7280]">Drawing: <span className="text-[#E5E7EB]">{drawingSet?.title || 'N/A'}</span></div>
        <div className="text-xs text-[#6B7280]">Status: <span className="text-[#FF9D42]">{drawingSet?.status || 'IFA'}</span></div>
        <div className="text-xs text-[#6B7280]">Sheet: <span className="text-[#E5E7EB]">{sheet?.sheet_number || 'None selected'}</span></div>
      </div>

      <Button size="sm" variant="outline" onClick={runCheck} disabled={loading} className="mb-3">
        {loading ? <><Loader2 size={12} className="animate-spin mr-1.5" />Analyzing...</> : <><Sparkles size={12} className="mr-1.5" />Run Check</>}
      </Button>

      {result && (
        <div className="flex-1 overflow-y-auto text-xs text-[#9CA3AF] leading-relaxed whitespace-pre-wrap bg-[#050505] border border-[rgba(255,255,255,0.05)] rounded-lg p-3">
          {result}
        </div>
      )}
    </div>
  );
}

function RFIDetailPanel({ rfi, onClose }) {
  if (!rfi) return null;
  const color = RFI_COLORS[rfi.status] || '#6B7280';
  return (
    <div className="bg-[#0A0A0A] border border-[rgba(255,255,255,0.08)] rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-[#E5E7EB]">RFI #{rfi.rfi_number}</span>
        <button onClick={onClose} className="text-[#6B7280] hover:text-[#9CA3AF] text-xs">✕</button>
      </div>
      <div className="space-y-2 text-xs">
        <div><span className="text-[#6B7280]">Subject:</span> <span className="text-[#E5E7EB]">{rfi.subject}</span></div>
        <div className="flex items-center gap-2">
          <span className="text-[#6B7280]">Status:</span>
          <span className="px-2 py-0.5 rounded text-[10px] font-bold text-white" style={{ background: color }}>{rfi.status?.toUpperCase()}</span>
        </div>
        <div><span className="text-[#6B7280]">Category:</span> <span className="text-[#E5E7EB]">{rfi.rfi_type || rfi.category || '—'}</span></div>
        {rfi.question && <div><span className="text-[#6B7280]">Question:</span> <div className="text-[#9CA3AF] mt-1 leading-relaxed">{rfi.question}</div></div>}
        {rfi.response && <div><span className="text-[#6B7280]">Response:</span> <div className="text-[#9CA3AF] mt-1 leading-relaxed">{rfi.response}</div></div>}
        <div className="flex gap-2 mt-2">
          {rfi.is_install_blocker && <span className="px-2 py-0.5 bg-red-950 text-red-300 rounded text-[10px] font-bold">ERECTION BLOCKER</span>}
          {rfi.fab_blocker && <span className="px-2 py-0.5 bg-orange-950 text-orange-300 rounded text-[10px] font-bold">FAB HOLD</span>}
        </div>
      </div>
    </div>
  );
}

export default function DrawingViewer() {
  const { activeProjectId, setActiveProjectId } = useActiveProject();
  const [selectedSetId, setSelectedSetId] = useState('');
  const [selectedSheetId, setSelectedSheetId] = useState('');
  const [showRFIPins, setShowRFIPins] = useState(true);
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [selectedRFI, setSelectedRFI] = useState(null);
  const [activeTool, setActiveTool] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [compareMode, setCompareMode] = useState(false);
  const viewerRef = useRef(null);

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: drawingSets = [] } = useQuery({
    queryKey: ['drawing-sets', activeProjectId],
    queryFn: () => base44.entities.DrawingSet.filter({ project_id: activeProjectId }),
    enabled: !!activeProjectId,
    staleTime: 2 * 60 * 1000,
  });

  const { data: sheets = [] } = useQuery({
    queryKey: ['drawing-sheets-for-set', selectedSetId],
    queryFn: () => base44.entities.DrawingSheet.filter({ drawing_set_id: selectedSetId }),
    enabled: !!selectedSetId,
    staleTime: 2 * 60 * 1000,
  });

  const { data: revisions = [] } = useQuery({
    queryKey: ['drawing-revisions-for-set', selectedSetId],
    queryFn: () => base44.entities.DrawingRevision.filter({ drawing_set_id: selectedSetId }),
    enabled: !!selectedSetId,
    staleTime: 2 * 60 * 1000,
  });

  const { data: rfis = [] } = useQuery({
    queryKey: ['rfis', activeProjectId],
    queryFn: () => base44.entities.RFI.filter({ project_id: activeProjectId }),
    enabled: !!activeProjectId,
    staleTime: 2 * 60 * 1000,
  });

  const selectedSet = drawingSets.find(s => s.id === selectedSetId);
  const selectedSheet = sheets.find(s => s.id === selectedSheetId);

  // RFIs linked to this drawing set (with fake pin positions for display)
  const linkedRFIs = rfis
    .filter(r =>
      r.linked_drawing_set_ids?.includes(selectedSetId) ||
      r.origin_drawing_id === selectedSheetId
    )
    .map((r, i) => ({
      ...r,
      _pin_x: 0.1 + (i % 5) * 0.18,
      _pin_y: 0.1 + Math.floor(i / 5) * 0.2,
    }));

  const openRFIsCount = rfis.filter(r => !['closed', 'answered'].includes(r.status)).length;
  const blockerCount = rfis.filter(r => r.is_install_blocker || r.fab_blocker).length;

  useEffect(() => {
    if (drawingSets.length > 0 && !selectedSetId) {
      setSelectedSetId(drawingSets[0].id);
    }
  }, [drawingSets]);

  useEffect(() => {
    if (sheets.length > 0 && !selectedSheetId) {
      setSelectedSheetId(sheets[0].id);
    }
  }, [sheets]);

  const tools = [
    { id: 'pen', icon: Pen, label: 'Pen' },
    { id: 'highlight', icon: Highlighter, label: 'Highlight' },
    { id: 'text', icon: Type, label: 'Text' },
    { id: 'callout', icon: MessageSquare, label: 'Callout' },
    { id: 'measure', icon: Ruler, label: 'Measure' },
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#E5E7EB] tracking-tight">Drawing Viewer</h1>
          <p className="text-xs text-[#6B7280] mt-0.5">PDF markup · RFI overlay · AI readiness</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={activeProjectId || ''} onValueChange={v => setActiveProjectId(v || null)}>
            <SelectTrigger className="w-48 h-8 text-xs bg-[#0A0A0A] border-[rgba(255,255,255,0.08)]">
              <SelectValue placeholder="Select Project" />
            </SelectTrigger>
            <SelectContent className="bg-[#0A0A0A] border-[rgba(255,255,255,0.1)]">
              {projects.map(p => (
                <SelectItem key={p.id} value={p.id} className="text-xs">{p.project_number} · {p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedSetId} onValueChange={setSelectedSetId}>
            <SelectTrigger className="w-48 h-8 text-xs bg-[#0A0A0A] border-[rgba(255,255,255,0.08)]">
              <SelectValue placeholder="Select Drawing Set" />
            </SelectTrigger>
            <SelectContent className="bg-[#0A0A0A] border-[rgba(255,255,255,0.1)]">
              {drawingSets.map(s => (
                <SelectItem key={s.id} value={s.id} className="text-xs">{s.set_number} · {s.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedSheetId} onValueChange={setSelectedSheetId}>
            <SelectTrigger className="w-40 h-8 text-xs bg-[#0A0A0A] border-[rgba(255,255,255,0.08)]">
              <SelectValue placeholder="Sheet" />
            </SelectTrigger>
            <SelectContent className="bg-[#0A0A0A] border-[rgba(255,255,255,0.1)]">
              {sheets.map(s => (
                <SelectItem key={s.id} value={s.id} className="text-xs">{s.sheet_number} · {s.sheet_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats Bar */}
      {activeProjectId && (
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Drawing Sets', value: drawingSets.length, color: '#E5E7EB' },
            { label: 'Open RFIs', value: openRFIsCount, color: openRFIsCount > 0 ? '#F59E0B' : '#22C55E' },
            { label: 'Blockers', value: blockerCount, color: blockerCount > 0 ? '#EF4444' : '#22C55E' },
            { label: 'Current Rev', value: selectedSet?.status || '—', color: STATUS_CONFIG[selectedSet?.status]?.color || '#9CA3AF' },
          ].map((m, i) => (
            <div key={i} className="bg-[#0A0A0A] border border-[rgba(255,255,255,0.06)] rounded-lg px-3 py-2">
              <div className="text-[10px] text-[#6B7280] uppercase tracking-wider">{m.label}</div>
              <div className="text-lg font-bold mt-0.5" style={{ color: m.color }}>{m.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Main Viewer Area */}
      <div className="flex flex-1 gap-3 min-h-0">
        {/* Toolbar */}
        <div className="flex flex-col gap-1.5 bg-[#0A0A0A] border border-[rgba(255,255,255,0.08)] rounded-xl p-2">
          {tools.map(tool => (
            <button
              key={tool.id}
              onClick={() => setActiveTool(activeTool === tool.id ? null : tool.id)}
              title={tool.label}
              className={cn(
                'w-9 h-9 rounded-lg flex items-center justify-center transition-all',
                activeTool === tool.id
                  ? 'bg-[#FF9D42]/20 text-[#FF9D42]'
                  : 'text-[#6B7280] hover:text-[#9CA3AF] hover:bg-[rgba(255,255,255,0.05)]'
              )}
            >
              <tool.icon size={15} />
            </button>
          ))}
          <div className="border-t border-[rgba(255,255,255,0.06)] my-1" />
          <button
            onClick={() => setZoom(z => Math.min(z + 0.25, 3))}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-[#6B7280] hover:text-[#9CA3AF] hover:bg-[rgba(255,255,255,0.05)]"
            title="Zoom In"
          >
            <ZoomIn size={15} />
          </button>
          <button
            onClick={() => setZoom(z => Math.max(z - 0.25, 0.25))}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-[#6B7280] hover:text-[#9CA3AF] hover:bg-[rgba(255,255,255,0.05)]"
            title="Zoom Out"
          >
            <ZoomOut size={15} />
          </button>
          <button
            onClick={() => setZoom(1)}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-[#6B7280] hover:text-[#9CA3AF] hover:bg-[rgba(255,255,255,0.05)]"
            title="Reset Zoom"
          >
            <RotateCcw size={13} />
          </button>
          <div className="border-t border-[rgba(255,255,255,0.06)] my-1" />
          <button
            onClick={() => setShowRFIPins(v => !v)}
            title="Toggle RFI Pins"
            className={cn(
              'w-9 h-9 rounded-lg flex items-center justify-center transition-all',
              showRFIPins ? 'text-[#3B82F6]' : 'text-[#6B7280] hover:text-[#9CA3AF]'
            )}
          >
            {showRFIPins ? <Eye size={15} /> : <EyeOff size={15} />}
          </button>
          <button
            onClick={() => setCompareMode(v => !v)}
            title="Version Comparison"
            className={cn(
              'w-9 h-9 rounded-lg flex items-center justify-center transition-all',
              compareMode ? 'text-[#A855F7]' : 'text-[#6B7280] hover:text-[#9CA3AF]'
            )}
          >
            <GitCompare size={15} />
          </button>
          <button
            onClick={() => setShowAIPanel(v => !v)}
            title="AI Readiness Check"
            className={cn(
              'w-9 h-9 rounded-lg flex items-center justify-center transition-all',
              showAIPanel ? 'text-[#FF9D42]' : 'text-[#6B7280] hover:text-[#9CA3AF]'
            )}
          >
            <Sparkles size={15} />
          </button>
        </div>

        {/* PDF Canvas Area */}
        <div className="flex-1 bg-[#050505] border border-[rgba(255,255,255,0.06)] rounded-xl overflow-hidden relative" ref={viewerRef}>
          {!activeProjectId ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <FileText size={40} className="mx-auto mb-3 text-[#4B5563]" />
                <p className="text-[#6B7280] text-sm">Select a project and drawing set</p>
              </div>
            </div>
          ) : !selectedSet ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Layers size={40} className="mx-auto mb-3 text-[#4B5563]" />
                <p className="text-[#6B7280] text-sm">No drawing sets available</p>
                <p className="text-[#4B5563] text-xs mt-1">Upload or create drawing sets in the Drawings page</p>
              </div>
            </div>
          ) : selectedSheet?.file_url ? (
            <div className="relative w-full h-full overflow-auto">
              <div
                style={{ transform: `scale(${zoom})`, transformOrigin: 'top left', transition: 'transform 0.2s ease' }}
                className="relative inline-block min-w-full min-h-full"
              >
                <iframe
                  src={selectedSheet.file_url}
                  className="w-full min-h-[600px]"
                  title={`${selectedSheet.sheet_number} - ${selectedSheet.sheet_name}`}
                  style={{ height: '70vh', border: 'none' }}
                />
                {/* RFI Pins Overlay */}
                {showRFIPins && linkedRFIs.map(rfi => (
                  <RFIPin key={rfi.id} rfi={rfi} onClick={setSelectedRFI} />
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full flex-col gap-4">
              <div className="text-center">
                <FileText size={48} className="mx-auto mb-3 text-[#FF9D42]/30" />
                <p className="text-[#E5E7EB] text-sm font-semibold">{selectedSet?.title}</p>
                <p className="text-[#6B7280] text-xs mt-1">
                  {selectedSet?.status && (
                    <span className="px-2 py-0.5 rounded font-bold mr-2" style={{ background: `${STATUS_CONFIG[selectedSet.status]?.color}20`, color: STATUS_CONFIG[selectedSet.status]?.color }}>
                      {selectedSet.status}
                    </span>
                  )}
                  {sheets.length} sheet{sheets.length !== 1 ? 's' : ''} · {revisions.length} revision{revisions.length !== 1 ? 's' : ''}
                </p>
              </div>

              {/* Revision History */}
              {revisions.length > 0 && (
                <div className="w-full max-w-lg px-4">
                  <p className="text-xs text-[#6B7280] uppercase tracking-wider mb-2">Revision History</p>
                  <div className="space-y-2">
                    {[...revisions].sort((a, b) => new Date(b.revision_date) - new Date(a.revision_date)).map(rev => (
                      <div key={rev.id} className="flex items-center justify-between px-3 py-2 bg-[#0A0A0A] border border-[rgba(255,255,255,0.06)] rounded-lg">
                        <div>
                          <span className="text-xs font-semibold text-[#E5E7EB]">{rev.revision_number}</span>
                          <span className="text-[11px] text-[#6B7280] ml-2">{rev.description || 'No description'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {rev.is_current && <span className="text-[10px] bg-green-950 text-green-400 px-1.5 py-0.5 rounded font-bold">CURRENT</span>}
                          <span className="text-[11px] text-[#6B7280]">{rev.revision_date ? format(new Date(rev.revision_date), 'MMM d, yy') : '—'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Linked RFIs on this set */}
              {linkedRFIs.length > 0 && (
                <div className="w-full max-w-lg px-4">
                  <p className="text-xs text-[#6B7280] uppercase tracking-wider mb-2">Linked RFIs ({linkedRFIs.length})</p>
                  <div className="space-y-1.5">
                    {linkedRFIs.map(rfi => (
                      <button
                        key={rfi.id}
                        onClick={() => setSelectedRFI(rfi)}
                        className="w-full flex items-center justify-between px-3 py-2 bg-[#0A0A0A] border border-[rgba(255,255,255,0.06)] rounded-lg hover:border-[rgba(255,255,255,0.12)] text-left"
                      >
                        <div>
                          <span className="text-xs font-semibold text-[#E5E7EB]">RFI #{rfi.rfi_number}</span>
                          <span className="text-[11px] text-[#6B7280] ml-2">{rfi.subject}</span>
                        </div>
                        <span
                          className="text-[10px] font-bold px-1.5 py-0.5 rounded text-white flex-shrink-0"
                          style={{ background: RFI_COLORS[rfi.status] || '#6B7280' }}
                        >
                          {rfi.status?.toUpperCase()}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Active Tool Indicator */}
              {activeTool && (
                <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-[#FF9D42]/10 border border-[#FF9D42]/30 px-3 py-1.5 rounded-full">
                  <span className="text-xs text-[#FF9D42] font-semibold capitalize">{activeTool} tool active</span>
                  <span className="text-xs text-[#6B7280] ml-2">— Upload a PDF to enable markup</span>
                </div>
              )}
            </div>
          )}

          {/* Compare Mode Banner */}
          {compareMode && (
            <div className="absolute inset-0 border-2 border-dashed border-purple-500/40 pointer-events-none rounded-xl">
              <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-purple-950/80 px-3 py-1.5 rounded-full">
                <span className="text-xs text-purple-300 font-semibold">Version Comparison Mode — Select revision to compare</span>
              </div>
            </div>
          )}
        </div>

        {/* Right Panel */}
        {(showAIPanel || selectedRFI) && (
          <div className="w-72 flex flex-col gap-3 overflow-y-auto">
            {selectedRFI && (
              <RFIDetailPanel rfi={selectedRFI} onClose={() => setSelectedRFI(null)} />
            )}
            {showAIPanel && (
              <AIReadinessPanel
                drawingSet={selectedSet}
                sheet={selectedSheet}
                onClose={() => setShowAIPanel(false)}
              />
            )}
          </div>
        )}
      </div>

      {/* Sheet Navigator */}
      {sheets.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {sheets.map(sheet => (
            <button
              key={sheet.id}
              onClick={() => setSelectedSheetId(sheet.id)}
              className={cn(
                'flex-shrink-0 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all border',
                selectedSheetId === sheet.id
                  ? 'bg-[#FF9D42]/10 border-[#FF9D42]/30 text-[#FF9D42]'
                  : 'bg-[#0A0A0A] border-[rgba(255,255,255,0.06)] text-[#6B7280] hover:text-[#9CA3AF] hover:border-[rgba(255,255,255,0.12)]'
              )}
            >
              {sheet.sheet_number}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}