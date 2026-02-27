import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  AlertTriangle, Zap, FileText, Flag, CheckCircle2, X,
  Download, Loader2, Eye, Clock, ChevronDown, ChevronRight, Lock, Unlock, DollarSign
} from 'lucide-react';
import DesignDriftPanel from '@/components/drawings/DesignDriftPanel';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import jsPDF from 'jspdf';

const SEV_CONFIG = {
  5: { label: 'SEV 5', sublabel: 'Prevents Install', color: 'bg-red-500', text: 'text-red-400', border: 'border-red-500/40', bg: 'bg-red-900/20', action: 'IMMEDIATE RFI' },
  4: { label: 'SEV 4', sublabel: 'Field Modification', color: 'bg-orange-500', text: 'text-orange-400', border: 'border-orange-500/40', bg: 'bg-orange-900/20', action: 'RFI WITHIN 48H' },
  3: { label: 'SEV 3', sublabel: 'Sequence/Tolerance', color: 'bg-amber-500', text: 'text-amber-400', border: 'border-amber-500/40', bg: 'bg-amber-900/20', action: 'PM REVIEW' },
  2: { label: 'SEV 2', sublabel: 'Coordination', color: 'bg-yellow-600', text: 'text-yellow-400', border: 'border-yellow-600/40', bg: 'bg-yellow-900/10', action: 'TRACK' },
  1: { label: 'SEV 1', sublabel: 'Informational', color: 'bg-zinc-500', text: 'text-zinc-400', border: 'border-zinc-600/40', bg: 'bg-zinc-800/30', action: 'LOG ONLY' },
};

const CONFLICT_TYPE_LABELS = {
  dimension: 'DIMENSIONAL', elevation: 'ELEVATION', slope: 'SLOPE',
  member_mark: 'MEMBER MARK', member_size: 'MEMBER SIZE',
  material_revision: 'MATERIAL REVISION', material_spec: 'MATERIAL SPEC',
  connection_hole_type: 'CONN HOLE TYPE', bolt_spec: 'BOLT SPEC',
  connection_detail: 'CONNECTION DETAIL', tolerance: 'TOLERANCE',
  embedment: 'EMBEDMENT', spacing: 'SPACING', anchor_type: 'ANCHOR TYPE'
};

const RISK_TYPE_LABELS = {
  fit_up: 'FIT-UP', tolerance: 'TOLERANCE', stability: 'STABILITY',
  sequence: 'SEQUENCE', interface: 'INTERFACE', envelope: 'ENVELOPE'
};

function SeverityBadge({ score }) {
  const cfg = SEV_CONFIG[score] || SEV_CONFIG[1];
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold border', cfg.text, cfg.border, cfg.bg)}>
      <span className={cn('w-1.5 h-1.5 rounded-full', cfg.color)} />
      {cfg.label}
    </span>
  );
}

function RFITemplateCard({ suggestion, sheets, onApprove, onReject, onExport }) {
  const [expanded, setExpanded] = useState(false);
  const isApproved = suggestion.approved_for_export;

  return (
    <Card className={cn('border transition-all', isApproved ? 'border-green-600/50 bg-green-900/10' : 'border-zinc-700 bg-zinc-800/50')}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <SeverityBadge score={suggestion.severity_score} />
              {suggestion.fabrication_hold && (
                <Badge className="text-[10px] bg-red-500/20 text-red-400 border-red-500/30">HOLD FAB</Badge>
              )}
              {suggestion.scope_change && (
                <Badge className="text-[10px] bg-purple-500/20 text-purple-400 border-purple-500/30">SCOPE FLAG</Badge>
              )}
              {isApproved && (
                <Badge className="text-[10px] bg-green-500/20 text-green-400 border-green-500/30 flex items-center gap-1">
                  <Unlock className="w-2.5 h-2.5" /> APPROVED FOR EXPORT
                </Badge>
              )}
            </div>

            <div className="text-sm font-semibold text-white mb-1">
              {suggestion.rfi_title || suggestion.proposed_question}
            </div>
            {suggestion.contract_reference && (
              <div className="text-xs text-zinc-500 mb-2 font-mono">REF: {suggestion.contract_reference}</div>
            )}

            {/* Expandable full template */}
            <button
              onClick={() => setExpanded(v => !v)}
              className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 mb-2"
            >
              {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              {expanded ? 'Hide' : 'Preview'} full RFI template
            </button>

            {expanded && (
              <div className="mt-2 space-y-3 p-3 bg-zinc-900 rounded border border-zinc-700 text-xs">
                <div>
                  <div className="text-zinc-500 uppercase text-[10px] mb-1">Issue</div>
                  <div className="text-zinc-300">{suggestion.proposed_question}</div>
                </div>

                {suggestion.observed_conditions?.length > 0 && (
                  <div>
                    <div className="text-zinc-500 uppercase text-[10px] mb-1">Observed Conditions</div>
                    {suggestion.observed_conditions.map((c, i) => (
                      <div key={i} className="flex gap-2 text-zinc-300">
                        <span className="text-zinc-500">•</span>
                        <span><span className="text-amber-400">{c.label}:</span> {c.value}</span>
                      </div>
                    ))}
                    {suggestion.member_mark && (
                      <div className="flex gap-2 text-zinc-300">
                        <span className="text-zinc-500">•</span>
                        <span>Member Mark: <span className="text-amber-400 font-mono">{suggestion.member_mark}</span></span>
                      </div>
                    )}
                  </div>
                )}

                {suggestion.proposed_options?.length > 0 && (
                  <div>
                    <div className="text-zinc-500 uppercase text-[10px] mb-1">Proposed Options</div>
                    {suggestion.proposed_options.map((opt, i) => (
                      <div key={i} className="text-zinc-300">{i + 1}. {opt}</div>
                    ))}
                  </div>
                )}

                {suggestion.impacts_statement && (
                  <div>
                    <div className="text-zinc-500 uppercase text-[10px] mb-1">Impacts</div>
                    <div className="text-zinc-300">{suggestion.impacts_statement}</div>
                  </div>
                )}

                {suggestion.response_required_by && (
                  <div>
                    <div className="text-zinc-500 uppercase text-[10px] mb-1">Response Required By</div>
                    <div className="text-amber-400 font-medium">{suggestion.response_required_by}</div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1.5 shrink-0">
            {!isApproved ? (
              <>
                <Button size="sm" onClick={() => onApprove(suggestion)}
                  className="h-7 text-xs bg-green-700 hover:bg-green-600 flex items-center gap-1">
                  <Unlock className="w-3 h-3" /> Approve
                </Button>
                <Button size="sm" variant="ghost" onClick={() => onReject(suggestion)}
                  className="h-7 text-xs text-zinc-400 hover:text-red-400">
                  <X className="w-3 h-3" />
                </Button>
              </>
            ) : (
              <Button size="sm" onClick={() => onExport(suggestion)}
                className="h-7 text-xs bg-blue-700 hover:bg-blue-600 flex items-center gap-1">
                <Download className="w-3 h-3" /> Export
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function FindingCard({ item, type, sheets, onResolve, onWaive }) {
  const sheetNum = (id) => sheets.find(s => s.id === id)?.sheet_number || id?.slice(-6);
  const sev = item.severity_score || item.install_risk?.toLowerCase() === 'critical' ? 5 : 3;
  const cfg = SEV_CONFIG[sev] || SEV_CONFIG[3];

  return (
    <Card className={cn('border transition-all hover:border-zinc-600', cfg.border, cfg.bg)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <SeverityBadge score={sev} />
              <Badge variant="outline" className="text-[10px] bg-zinc-900/50 border-zinc-700">
                {type === 'conflict'
                  ? CONFLICT_TYPE_LABELS[item.conflict_type] || item.conflict_type?.toUpperCase()
                  : RISK_TYPE_LABELS[item.issue_type] || item.issue_type?.toUpperCase()}
              </Badge>
              {item.member_mark && (
                <span className="font-mono text-[11px] text-amber-400 font-bold">{item.member_mark}</span>
              )}
              {item.fabrication_impact && (
                <Badge className="text-[10px] bg-red-500/20 text-red-400 border-red-500/30">FAB IMPACT</Badge>
              )}
              {item.scope_change_flag && (
                <Badge className="text-[10px] bg-purple-500/20 text-purple-400 border-purple-500/30">
                  SCOPE FLAG {item.labor_delta_risk && `· ${item.labor_delta_risk} LABOR RISK`}
                </Badge>
              )}
              {item.install_phase_impact && (
                <Badge variant="outline" className="text-[10px] bg-zinc-800 border-zinc-600">
                  {item.install_phase_impact}
                </Badge>
              )}
            </div>

            <div className="text-sm text-white mb-2">{item.description}</div>

            {type === 'conflict' && (
              <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                <div className="p-2 bg-zinc-900 rounded">
                  <div className="text-[10px] text-zinc-500 mb-0.5">SHEET {item.sheet_1_value?.split(':')[0]}</div>
                  <div className="text-zinc-300 font-mono">{item.sheet_1_value?.split(':').slice(1).join(':').trim()}</div>
                </div>
                <div className="p-2 bg-zinc-900 rounded">
                  <div className="text-[10px] text-zinc-500 mb-0.5">SHEET {item.sheet_2_value?.split(':')[0]}</div>
                  <div className="text-zinc-300 font-mono">{item.sheet_2_value?.split(':').slice(1).join(':').trim()}</div>
                </div>
              </div>
            )}

            {type === 'erection' && item.resolution_recommendation && (
              <div className="text-xs text-blue-400 flex items-start gap-1.5 mt-1">
                <Zap className="w-3 h-3 mt-0.5 shrink-0" />
                <span>{item.resolution_recommendation}</span>
              </div>
            )}

            {item.location_reference && (
              <div className="text-xs text-zinc-500 mt-1">@ {item.location_reference}</div>
            )}
          </div>

          <div className="flex flex-col gap-1 shrink-0">
            <Button size="sm" variant="ghost" onClick={() => onResolve(item)}
              className="h-7 text-green-400 hover:text-green-300 hover:bg-green-500/10">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </Button>
            <Button size="sm" variant="ghost" onClick={() => onWaive(item)}
              className="h-7 text-zinc-500 hover:text-zinc-400">
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DrawingIntelligenceDashboard({ projectId, drawingSetId, drawingSetLabel }) {
  const queryClient = useQueryClient();
  const [running, setRunning] = useState(false);
  const [lastRun, setLastRun] = useState(null);
  const [lastResult, setLastResult] = useState(null);
  const [activeTab, setActiveTab] = useState('all');

  const { data: currentUser } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });
  const { data: conflicts = [] } = useQuery({
    queryKey: ['drawing-conflicts', projectId],
    queryFn: () => base44.entities.DrawingConflict.filter({ project_id: projectId, status: 'open' }),
    enabled: !!projectId
  });
  const { data: erectionIssues = [] } = useQuery({
    queryKey: ['erection-issues', projectId],
    queryFn: () => base44.entities.ErectionIssue.filter({ project_id: projectId, status: 'open' }),
    enabled: !!projectId
  });
  const { data: rfiSuggestions = [] } = useQuery({
    queryKey: ['rfi-suggestions', projectId],
    queryFn: () => base44.entities.RFISuggestion.filter({ project_id: projectId }),
    enabled: !!projectId
  });
  const { data: sheets = [] } = useQuery({
    queryKey: ['drawing-sheets', projectId],
    queryFn: () => base44.entities.DrawingSheet.filter({ project_id: projectId }),
    enabled: !!projectId
  });

  const updateConflict = useMutation({
    mutationFn: ({ id, data }) => base44.entities.DrawingConflict.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['drawing-conflicts', projectId] })
  });
  const updateIssue = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ErectionIssue.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['erection-issues', projectId] })
  });
  const updateSuggestion = useMutation({
    mutationFn: ({ id, data }) => base44.entities.RFISuggestion.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['rfi-suggestions', projectId] })
  });

  const stats = useMemo(() => {
    const allFindings = [
      ...conflicts.map(c => ({ ...c, _type: 'conflict', sev: c.severity_score || 3 })),
      ...erectionIssues.map(e => ({
        ...e, _type: 'erection',
        sev: e.install_risk === 'critical' ? 5 : e.install_risk === 'high' ? 4 : e.install_risk === 'medium' ? 3 : 2
      }))
    ];
    return {
      sev5: allFindings.filter(f => f.sev === 5).length,
      sev4: allFindings.filter(f => f.sev === 4).length,
      sev3: allFindings.filter(f => f.sev === 3).length,
      sev2: allFindings.filter(f => f.sev === 2).length,
      sev1: allFindings.filter(f => f.sev === 1).length,
      pendingRFIs: rfiSuggestions.filter(r => r.status === 'pending_review').length,
      approvedRFIs: rfiSuggestions.filter(r => r.approved_for_export).length,
      fabHolds: conflicts.filter(c => c.fabrication_impact).length,
      scopeFlags: conflicts.filter(c => c.scope_change_flag).length
    };
  }, [conflicts, erectionIssues, rfiSuggestions]);

  const handleRunAnalysis = async () => {
    if (!drawingSetId) { toast.error('No drawing set selected'); return; }
    setRunning(true);
    try {
      const { data } = await base44.functions.invoke('runDrawingIntelligence', {
        project_id: projectId,
        drawing_set_id: drawingSetId,
        drawing_set_label: drawingSetLabel || 'Drawing Package'
      });
      setLastRun(new Date());
      setLastResult(data);
      queryClient.invalidateQueries({ queryKey: ['drawing-conflicts', projectId] });
      queryClient.invalidateQueries({ queryKey: ['erection-issues', projectId] });
      queryClient.invalidateQueries({ queryKey: ['rfi-suggestions', projectId] });
      toast.success(`Analysis complete — ${data.mismatches_found} mismatches, ${data.erection_risks_found} erection risks`);
    } catch (err) {
      toast.error(err.message || 'Analysis failed');
    } finally {
      setRunning(false);
    }
  };

  const handleApproveRFI = async (suggestion) => {
    await updateSuggestion.mutateAsync({
      id: suggestion.id,
      data: { approved_for_export: true, approved_by: currentUser?.email, approved_at: new Date().toISOString(), status: 'approved_for_export' }
    });
    toast.success('RFI approved for export');
  };

  const handleRejectRFI = async (suggestion) => {
    await updateSuggestion.mutateAsync({ id: suggestion.id, data: { status: 'rejected' } });
    toast.success('RFI rejected');
  };

  const exportRFIAsPDF = (suggestion) => {
    const doc = new jsPDF();
    const margin = 20;
    let y = 20;
    const lineH = 7;

    doc.setFontSize(14); doc.setFont(undefined, 'bold');
    doc.text('REQUEST FOR INFORMATION', margin, y); y += lineH * 1.5;

    doc.setFontSize(10); doc.setFont(undefined, 'normal');
    const writeSection = (label, text) => {
      if (!text) return;
      doc.setFont(undefined, 'bold'); doc.text(label + ':', margin, y); y += lineH;
      doc.setFont(undefined, 'normal');
      const lines = doc.splitTextToSize(text, 170);
      doc.text(lines, margin, y); y += lines.length * lineH + 3;
    };

    writeSection('Title', suggestion.rfi_title);
    writeSection('Contract Reference', suggestion.contract_reference);
    writeSection('Issue', suggestion.proposed_question);

    if (suggestion.observed_conditions?.length > 0) {
      doc.setFont(undefined, 'bold'); doc.text('Observed Conditions:', margin, y); y += lineH;
      doc.setFont(undefined, 'normal');
      suggestion.observed_conditions.forEach(c => {
        doc.text(`  • ${c.label}: ${c.value}`, margin, y); y += lineH;
      });
      if (suggestion.member_mark) { doc.text(`  • Member Mark: ${suggestion.member_mark}`, margin, y); y += lineH; }
      y += 3;
    }

    if (suggestion.proposed_options?.length > 0) {
      doc.setFont(undefined, 'bold'); doc.text('Proposed Options:', margin, y); y += lineH;
      doc.setFont(undefined, 'normal');
      suggestion.proposed_options.forEach((opt, i) => {
        const lines = doc.splitTextToSize(`${i + 1}. ${opt}`, 165);
        doc.text(lines, margin, y); y += lines.length * lineH;
      });
      y += 3;
    }

    writeSection('Impacts', suggestion.impacts_statement);
    writeSection('Requested Response', suggestion.response_required_by);

    doc.setFontSize(8); doc.setTextColor(150);
    doc.text(`Generated: ${new Date().toLocaleDateString()} | Status: Approved for export by ${suggestion.approved_by}`, margin, 285);

    doc.save(`RFI_${(suggestion.rfi_title || 'export').replace(/[^a-zA-Z0-9]/g, '_').slice(0, 40)}.pdf`);
    updateSuggestion.mutate({ id: suggestion.id, data: { status: 'exported' } });
  };

  const exportAllCSV = () => {
    const rows = [
      ['Type', 'Severity', 'Description', 'Member Mark', 'Sheet Refs', 'Location', 'Install Phase', 'Fab Impact', 'Scope Change', 'Labor Risk', 'Status']
    ];
    conflicts.forEach(c => rows.push([
      CONFLICT_TYPE_LABELS[c.conflict_type] || c.conflict_type, c.severity_score || '', c.description,
      c.member_mark || '', [c.sheet_1_value?.split(':')[0], c.sheet_2_value?.split(':')[0]].join(' / '),
      c.location_reference || '', c.install_phase_impact || '',
      c.fabrication_impact ? 'YES' : 'NO', c.scope_change_flag ? 'YES' : 'NO', c.labor_delta_risk || '', c.status
    ]));
    erectionIssues.forEach(e => rows.push([
      RISK_TYPE_LABELS[e.issue_type] || e.issue_type, e.install_risk, e.description,
      e.related_connection || '', '', e.location_reference || '', '', 'NO', 'NO', '', e.status
    ]));
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `DrawingIntelligence_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a); a.click(); URL.revokeObjectURL(url); a.remove();
  };

  // All open findings sorted by severity desc
  const allFindings = useMemo(() => [
    ...conflicts.map(c => ({ ...c, _type: 'conflict', sev: c.severity_score || 3 })),
    ...erectionIssues.map(e => ({ ...e, _type: 'erection', sev: e.install_risk === 'critical' ? 5 : e.install_risk === 'high' ? 4 : e.install_risk === 'medium' ? 3 : 2 }))
  ].sort((a, b) => b.sev - a.sev), [conflicts, erectionIssues]);

  const activeRFIs = rfiSuggestions.filter(r => ['pending_review', 'approved_for_export'].includes(r.status));

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-400" />
            Drawing Intelligence
          </h2>
          {drawingSetLabel && <p className="text-xs text-zinc-500 mt-0.5 font-mono">{drawingSetLabel}</p>}
          {lastRun && (
            <p className="text-xs text-zinc-600 mt-0.5 flex items-center gap-1">
              <Clock className="w-3 h-3" /> Last run {lastRun.toLocaleTimeString()}
              {lastResult && ` — ${lastResult.sheets_analyzed} sheets analyzed`}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportAllCSV} className="h-8 text-xs gap-1">
            <Download className="w-3 h-3" /> CSV Log
          </Button>
          <Button size="sm" onClick={handleRunAnalysis} disabled={running || !drawingSetId}
            className="h-8 text-xs bg-amber-500 hover:bg-amber-600 text-black font-bold gap-1">
            {running ? <><Loader2 className="w-3 h-3 animate-spin" /> Analyzing…</> : <><Zap className="w-3 h-3" /> Run Analysis</>}
          </Button>
        </div>
      </div>

      {/* Severity KPI Bar */}
      <div className="grid grid-cols-5 gap-2">
        {[5, 4, 3, 2, 1].map(s => {
          const cfg = SEV_CONFIG[s];
          const count = stats[`sev${s}`];
          return (
            <div key={s} className={cn('rounded-lg border p-3 text-center', cfg.border, cfg.bg)}>
              <div className={cn('text-xl font-bold font-mono', cfg.text)}>{count}</div>
              <div className={cn('text-[10px] font-bold mt-0.5', cfg.text)}>{cfg.label}</div>
              <div className="text-[9px] text-zinc-600 mt-0.5">{cfg.action}</div>
            </div>
          );
        })}
      </div>

      {/* Extra KPIs */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded bg-red-900/20 border border-red-600/30 p-2 text-center">
          <div className="text-lg font-bold text-red-400 font-mono">{stats.fabHolds}</div>
          <div className="text-[10px] text-red-300">FAB HOLDS</div>
        </div>
        <div className="rounded bg-purple-900/20 border border-purple-600/30 p-2 text-center">
          <div className="text-lg font-bold text-purple-400 font-mono">{stats.scopeFlags}</div>
          <div className="text-[10px] text-purple-300">SCOPE FLAGS</div>
        </div>
        <div className="rounded bg-blue-900/20 border border-blue-600/30 p-2 text-center">
          <div className="text-lg font-bold text-blue-400 font-mono">{stats.pendingRFIs}</div>
          <div className="text-[10px] text-blue-300">RFIS PENDING APPROVAL</div>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-zinc-800 border border-zinc-700">
          <TabsTrigger value="all">All ({allFindings.length})</TabsTrigger>
          <TabsTrigger value="mismatches">Mismatches ({conflicts.length})</TabsTrigger>
          <TabsTrigger value="erection">Erection Risks ({erectionIssues.length})</TabsTrigger>
          <TabsTrigger value="rfi_queue" className="flex items-center gap-1">
            RFI Queue ({activeRFIs.length})
            {stats.pendingRFIs > 0 && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />}
          </TabsTrigger>
          <TabsTrigger value="drift_install" className="flex items-center gap-1">
            <DollarSign className="w-3 h-3" /> Drift & Install
          </TabsTrigger>
        </TabsList>

        {/* All Findings */}
        <TabsContent value="all" className="space-y-2 mt-4">
          {allFindings.length === 0 && (
            <div className="text-center py-12 text-zinc-500 text-sm">
              No open findings. Run analysis to scan uploaded drawing sheets.
            </div>
          )}
          {allFindings.map(item => (
            <FindingCard
              key={item.id} item={item} type={item._type} sheets={sheets}
              onResolve={(i) => i._type === 'conflict'
                ? updateConflict.mutate({ id: i.id, data: { status: 'resolved' } })
                : updateIssue.mutate({ id: i.id, data: { status: 'resolved' } })
              }
              onWaive={(i) => i._type === 'conflict'
                ? updateConflict.mutate({ id: i.id, data: { status: 'waived' } })
                : updateIssue.mutate({ id: i.id, data: { status: 'acknowledged' } })
              }
            />
          ))}
        </TabsContent>

        {/* Mismatches */}
        <TabsContent value="mismatches" className="space-y-2 mt-4">
          {conflicts.length === 0 && <div className="text-center py-12 text-zinc-500 text-sm">No open mismatch conflicts</div>}
          {conflicts.map(c => (
            <FindingCard key={c.id} item={c} type="conflict" sheets={sheets}
              onResolve={(i) => updateConflict.mutate({ id: i.id, data: { status: 'resolved' } })}
              onWaive={(i) => updateConflict.mutate({ id: i.id, data: { status: 'waived' } })}
            />
          ))}
        </TabsContent>

        {/* Erection Risks */}
        <TabsContent value="erection" className="space-y-2 mt-4">
          {erectionIssues.length === 0 && <div className="text-center py-12 text-zinc-500 text-sm">No open erection risks</div>}
          {erectionIssues.map(e => (
            <FindingCard key={e.id} item={e} type="erection" sheets={sheets}
              onResolve={(i) => updateIssue.mutate({ id: i.id, data: { status: 'resolved' } })}
              onWaive={(i) => updateIssue.mutate({ id: i.id, data: { status: 'acknowledged' } })}
            />
          ))}
        </TabsContent>

        {/* RFI Approval Queue — manual approval gate before export */}
        <TabsContent value="rfi_queue" className="space-y-3 mt-4">
          {activeRFIs.length === 0 && (
            <div className="text-center py-12 text-zinc-500 text-sm">
              No RFIs pending approval. Sev 3–5 findings auto-generate draft RFIs after analysis.
            </div>
          )}

          {stats.pendingRFIs > 0 && (
            <div className="flex items-center gap-2 p-3 rounded bg-amber-900/20 border border-amber-600/30 text-xs text-amber-300 mb-2">
              <Lock className="w-4 h-4 shrink-0" />
              <span><strong>Approval required.</strong> Review each template before export. Approved RFIs can be exported as PDF. No RFI leaves the system without PM sign-off.</span>
            </div>
          )}

          {activeRFIs.map(s => (
            <RFITemplateCard
              key={s.id} suggestion={s} sheets={sheets}
              onApprove={handleApproveRFI}
              onReject={handleRejectRFI}
              onExport={exportRFIAsPDF}
            />
          ))}
        </TabsContent>
        {/* Drift & Install tab */}
        <TabsContent value="drift_install" className="mt-4">
          <DesignDriftPanel
            projectId={projectId}
            drawingSetId={drawingSetId}
            drawingSetLabel={drawingSetLabel}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}