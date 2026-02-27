/**
 * DesignDriftPanel
 * Shows scope/design-intent drift findings and installability risks
 * alongside CO exposure flags. Wired into DrawingIntelligenceDashboard tabs.
 */
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, X, AlertTriangle, DollarSign, Wrench, RefreshCw, Loader2, ChevronRight, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const CATEGORY_LABELS = {
  anchor_system: 'ANCHOR SYSTEM',
  embedment: 'EMBED REVISION',
  member_size: 'MEMBER SIZE',
  connection_type: 'CONNECTION SWAP',
  material_change: 'MATERIAL CHANGE',
  scope_add: 'SCOPE ADD',
  scope_delete: 'SCOPE DELETE',
  load_path: 'LOAD PATH',
};

const LABOR_COLORS = {
  High: 'text-red-400 bg-red-500/10 border-red-500/30',
  Med:  'text-amber-400 bg-amber-500/10 border-amber-500/30',
  Low:  'text-green-400 bg-green-500/10 border-green-500/30',
};

function DriftCard({ flag, onApprove, onReject }) {
  const [expanded, setExpanded] = useState(false);
  const hasCO = flag.status !== 'approved' && flag.status !== 'rejected';

  return (
    <Card className={cn('border transition-all', flag.requires_engineer_review ? 'border-red-500/40 bg-red-900/10' : 'border-amber-500/30 bg-amber-900/10')}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <Badge variant="outline" className="text-[10px] border-zinc-600 bg-zinc-800/50">
                {CATEGORY_LABELS[flag.change_category] || flag.change_category?.toUpperCase()}
              </Badge>
              {flag.fabrication_impact && (
                <Badge className="text-[10px] bg-red-500/20 text-red-400 border-red-500/30">FAB IMPACT</Badge>
              )}
              {flag.erection_impact && (
                <Badge className="text-[10px] bg-orange-500/20 text-orange-400 border-orange-500/30">ERECTION IMPACT</Badge>
              )}
              <Badge className="text-[10px] bg-purple-500/20 text-purple-400 border-purple-500/30 flex items-center gap-1">
                <DollarSign className="w-2.5 h-2.5" /> CO EXPOSURE
              </Badge>
              <Badge className={cn('text-[10px] border', LABOR_COLORS[flag.labor_delta || 'Med'])}>
                Labor: {flag.labor_delta || '?'}
              </Badge>
            </div>

            <div className="text-sm text-white mb-1">{flag.description}</div>
            {flag.location_reference && <div className="text-xs text-zinc-500 mb-2">@ {flag.location_reference}</div>}

            <button onClick={() => setExpanded(v => !v)} className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300">
              {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              {expanded ? 'Collapse' : 'Show original vs. current'}
            </button>

            {expanded && (
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 bg-zinc-900 rounded border border-zinc-700">
                  <div className="text-[10px] text-zinc-500 uppercase mb-1">Contract / Original</div>
                  <div className="text-zinc-300">{flag.original_intent || '—'}</div>
                </div>
                <div className="p-2 bg-zinc-900 rounded border border-amber-700/40">
                  <div className="text-[10px] text-amber-500 uppercase mb-1">Current Drawing</div>
                  <div className="text-zinc-300">{flag.new_intent || '—'}</div>
                </div>
              </div>
            )}
          </div>

          {hasCO && (
            <div className="flex flex-col gap-1 shrink-0">
              <Button size="sm" onClick={() => onApprove(flag)}
                className="h-7 text-xs bg-green-700 hover:bg-green-600">
                <CheckCircle2 className="w-3 h-3 mr-1" /> Approve
              </Button>
              <Button size="sm" variant="ghost" onClick={() => onReject(flag)}
                className="h-7 text-xs text-zinc-500 hover:text-red-400">
                <X className="w-3 h-3" />
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function InstallRiskCard({ issue }) {
  const RISK_COLORS = { high: 'border-red-500/40 bg-red-900/10', medium: 'border-amber-500/30 bg-amber-900/10', low: 'border-zinc-700 bg-zinc-900/30' };
  return (
    <Card className={cn('border', RISK_COLORS[issue.install_risk] || RISK_COLORS.medium)}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Wrench size={14} className={issue.install_risk === 'high' ? 'text-red-400 mt-0.5 shrink-0' : 'text-amber-400 mt-0.5 shrink-0'} />
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <Badge variant="outline" className={cn('text-[10px]', issue.install_risk === 'high' ? 'border-red-500/30 text-red-400' : 'border-amber-500/30 text-amber-400')}>
                {issue.install_risk?.toUpperCase()} RISK
              </Badge>
              {issue.related_connection && <span className="font-mono text-[11px] text-amber-400 font-bold">{issue.related_connection}</span>}
            </div>
            <div className="text-sm text-white mb-1">{issue.description}</div>
            {issue.resolution_recommendation && (
              <div className="text-xs text-blue-400 flex items-start gap-1.5 mt-1">
                <span className="text-zinc-500">→</span>
                <span>{issue.resolution_recommendation}</span>
              </div>
            )}
            {issue.location_reference && <div className="text-xs text-zinc-500 mt-1">@ {issue.location_reference}</div>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DesignDriftPanel({ projectId, drawingSetId, drawingSetLabel }) {
  const queryClient = useQueryClient();
  const [running, setRunning] = useState(false);
  const [activeTab, setActiveTab] = useState('drift');

  const { data: driftFlags = [] } = useQuery({
    queryKey: ['design-intent-flags', projectId],
    queryFn: () => base44.entities.DesignIntentFlag.filter({ project_id: projectId }),
    enabled: !!projectId
  });

  const { data: installIssues = [] } = useQuery({
    queryKey: ['install-issues', projectId],
    queryFn: async () => {
      const all = await base44.entities.ErectionIssue.filter({ project_id: projectId, status: 'open' });
      return all.filter(i => i.issue_type === 'installability');
    },
    enabled: !!projectId
  });

  const updateFlag = useMutation({
    mutationFn: ({ id, data }) => base44.entities.DesignIntentFlag.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['design-intent-flags', projectId] })
  });

  const handleRunEnhanced = async () => {
    if (!drawingSetId) { toast.error('No drawing set selected'); return; }
    setRunning(true);
    try {
      const { data } = await base44.functions.invoke('runDrawingIntelligenceEnhanced', {
        project_id: projectId,
        drawing_set_id: drawingSetId,
        drawing_set_label: drawingSetLabel || 'Drawing Package'
      });
      queryClient.invalidateQueries({ queryKey: ['design-intent-flags', projectId] });
      queryClient.invalidateQueries({ queryKey: ['install-issues', projectId] });
      queryClient.invalidateQueries({ queryKey: ['rfi-suggestions', projectId] });
      toast.success(`Scan complete — ${data.drift_findings_found} drift items, ${data.installability_risks_found} install risks, ${data.co_exposure_count} CO flags`);
    } catch (err) {
      toast.error(err.message || 'Scan failed');
    } finally {
      setRunning(false);
    }
  };

  const openDrift = driftFlags.filter(f => ['flagged', 'pm_review', 'engineer_review'].includes(f.status));
  const highInstall = installIssues.filter(i => i.install_risk === 'high' || i.install_risk === 'medium');
  const coCount = openDrift.length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-purple-400" />
            Scope & Installability Analysis
          </h3>
          <p className="text-xs text-zinc-500 mt-0.5">Design-intent drift + field installability risks</p>
        </div>
        <Button size="sm" onClick={handleRunEnhanced} disabled={running || !drawingSetId}
          className="h-8 text-xs bg-purple-600 hover:bg-purple-500 text-white font-bold gap-1">
          {running ? <><Loader2 className="w-3 h-3 animate-spin" /> Scanning…</> : <><RefreshCw className="w-3 h-3" /> Run Drift Scan</>}
        </Button>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-3 gap-2">
        <div className="p-3 rounded border border-purple-600/30 bg-purple-900/10 text-center">
          <div className="text-xl font-bold font-mono text-purple-400">{coCount}</div>
          <div className="text-[10px] text-purple-300">CO EXPOSURE FLAGS</div>
        </div>
        <div className="p-3 rounded border border-red-600/30 bg-red-900/10 text-center">
          <div className="text-xl font-bold font-mono text-red-400">{highInstall.filter(i => i.install_risk === 'high').length}</div>
          <div className="text-[10px] text-red-300">HIGH INSTALL RISK</div>
        </div>
        <div className="p-3 rounded border border-amber-600/30 bg-amber-900/10 text-center">
          <div className="text-xl font-bold font-mono text-amber-400">{driftFlags.filter(f => f.fabrication_impact).length}</div>
          <div className="text-[10px] text-amber-300">FAB-IMPACTING CHANGES</div>
        </div>
      </div>

      {/* Tab toggle */}
      <div className="flex gap-1 p-1 bg-zinc-800 rounded-lg w-fit">
        {[
          { key: 'drift', label: `Drift (${openDrift.length})` },
          { key: 'install', label: `Install Risk (${highInstall.length})` }
        ].map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={cn('px-3 py-1.5 rounded text-xs font-medium transition-all', activeTab === t.key ? 'bg-zinc-600 text-white' : 'text-zinc-400 hover:text-zinc-300')}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Drift findings */}
      {activeTab === 'drift' && (
        <div className="space-y-2">
          {openDrift.length === 0 && (
            <div className="text-center py-10 text-zinc-500 text-sm">No scope drift detected. Run scan to analyze drawings.</div>
          )}
          {openDrift.map(flag => (
            <DriftCard key={flag.id} flag={flag}
              onApprove={(f) => {
                updateFlag.mutate({ id: f.id, data: { status: 'approved' } });
                toast.success('Flagged as approved — no CO action needed');
              }}
              onReject={(f) => {
                updateFlag.mutate({ id: f.id, data: { status: 'requires_co' } });
                toast.warning('Flagged for COR — follow up with PM');
              }}
            />
          ))}
        </div>
      )}

      {/* Installability risks */}
      {activeTab === 'install' && (
        <div className="space-y-2">
          {highInstall.length === 0 && (
            <div className="text-center py-10 text-zinc-500 text-sm">No install risks detected. Run scan to analyze drawings.</div>
          )}
          {highInstall.map(issue => (
            <InstallRiskCard key={issue.id} issue={issue} />
          ))}
        </div>
      )}
    </div>
  );
}