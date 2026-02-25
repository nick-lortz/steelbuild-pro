import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  Plus, Trash2, Save, Globe, FolderOpen, AlertTriangle, Zap,
  RotateCcw, CheckCircle2, ChevronDown, ChevronRight, Info
} from 'lucide-react';

// ── Defaults (mirrors the hardcoded values in the two functions) ────────────
const DEFAULT_QA_RULES = [
  { key: 'member_size',       label: 'Member Size',        severity: 'P0', enabled: true,  prompt: 'Check all member sizes (W-shapes, HSS, angles, plates) are called out with AISC standard designations. Flag any non-standard or ambiguous callouts.' },
  { key: 'missing_dimension', label: 'Missing Dimension',  severity: 'P0', enabled: true,  prompt: 'Identify any missing critical dimensions: member lengths, hole spacing, bolt patterns, weld lengths, plate dimensions.' },
  { key: 'connection_detail', label: 'Connection Detail',  severity: 'P0', enabled: true,  prompt: 'Verify connection details show bolt sizes, quantities, edge distances per AISC standards. Check for missing shear tab dimensions.' },
  { key: 'weld_symbol',       label: 'Weld Symbol',        severity: 'P0', enabled: true,  prompt: 'Validate weld symbols per AWS D1.1 standards. Check for missing weld sizes, lengths, or unclear symbols.' },
  { key: 'annotation_error',  label: 'Annotation Error',   severity: 'P1', enabled: true,  prompt: 'Check for incomplete or conflicting annotations, missing detail references, unclear callouts.' },
  { key: 'material_spec',     label: 'Material Spec',      severity: 'P1', enabled: true,  prompt: 'Confirm material specifications are called out (ASTM A36, A992, A500, etc.). Flag missing or non-standard specs.' },
  { key: 'tolerance',         label: 'Tolerance',          severity: 'P1', enabled: true,  prompt: 'Check if fabrication tolerances are specified where critical. Flag tight tolerances that may cause fit-up issues.' },
];

const DEFAULT_ERECTION_CATEGORIES = [
  { key: 'fit_up',    label: 'Fit-Up Risk',     enabled: true, prompt: 'Slotted holes (SSH) — check orientation relative to expected thermal expansion or erection movement direction. Flag if slot orientation is not aligned or not specified.' },
  { key: 'tolerance', label: 'Tolerance Risk',  enabled: true, prompt: 'Elevation breaks, camber, or bearing conditions without shim allowance or tolerance note.' },
  { key: 'stability', label: 'Stability Risk',  enabled: true, prompt: 'Cantilever framing, moment frames, or heavy cantilevered elements where deck diaphragm must be installed before column can be released or where temporary support/bracing is not noted.' },
  { key: 'sequence',  label: 'Sequence Risk',   enabled: true, prompt: 'Erection aid angles, temporary connections, or bracing shown in details that are not explicitly called out in erection sequence or phasing notes.' },
  { key: 'interface', label: 'Interface Risk',  enabled: true, prompt: 'Beam bearing conditions at stud walls, CMU piers, masonry, or concrete — flag if anchor/embed pattern is TBD or not confirmed on structural drawings.' },
  { key: 'envelope',  label: 'Envelope Risk',   enabled: true, prompt: 'Penetrations through roof/wall with connection details where waterproofing is not noted or is deferred.' },
];

const DEFAULT_THRESHOLDS = {
  dimensional_delta_inches: 0.25,
  elevation_delta_inches: 0.125,
  slope_any_mismatch: true,
  member_type_always: true,
  material_revision_always: true,
  connection_hole_type_always: true,
  bolt_spec_any_mismatch: true,
};

function buildDefault(scope, projectId = null) {
  return {
    scope,
    project_id: projectId,
    label: scope === 'global' ? 'Global QA Config' : 'Project QA Config',
    mismatch_thresholds: { ...DEFAULT_THRESHOLDS },
    rfi_auto_create_min_severity: 3,
    erection_risk_rfi_min_severity: 4,
    qa_rules: DEFAULT_QA_RULES.map(r => ({ ...r })),
    erection_risk_categories: DEFAULT_ERECTION_CATEGORIES.map(c => ({ ...c })),
    is_active: true,
  };
}

// ── Small sub-components ───────────────────────────────────────────────────

function RuleRow({ rule, onChange, onDelete, canDelete }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className={`rounded border ${rule.enabled ? 'border-zinc-700 bg-zinc-800/50' : 'border-zinc-800 bg-zinc-900/30 opacity-60'}`}>
      <div className="flex items-center gap-2 px-3 py-2">
        <button onClick={() => onChange({ ...rule, enabled: !rule.enabled })}
          className={`w-5 h-5 rounded flex items-center justify-center shrink-0 border transition-colors ${rule.enabled ? 'bg-amber-500 border-amber-500' : 'border-zinc-600'}`}>
          {rule.enabled && <CheckCircle2 className="w-3 h-3 text-black" />}
        </button>
        <span className="text-xs font-semibold text-white flex-1">{rule.label || rule.key}</span>
        <Select value={rule.severity} onValueChange={v => onChange({ ...rule, severity: v })}>
          <SelectTrigger className="h-6 w-16 text-[10px] bg-zinc-900 border-zinc-700 px-2">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-700">
            <SelectItem value="P0"><span className="text-red-400 text-xs font-bold">P0</span></SelectItem>
            <SelectItem value="P1"><span className="text-amber-400 text-xs font-bold">P1</span></SelectItem>
          </SelectContent>
        </Select>
        <button onClick={() => setExpanded(v => !v)} className="text-zinc-500 hover:text-zinc-300">
          {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </button>
        {canDelete && (
          <button onClick={onDelete} className="text-zinc-600 hover:text-red-400">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      {expanded && (
        <div className="px-3 pb-3 space-y-2 border-t border-zinc-700/50">
          <div className="mt-2">
            <label className="text-[10px] text-zinc-500 uppercase tracking-wider">Label</label>
            <Input value={rule.label} onChange={e => onChange({ ...rule, label: e.target.value })}
              className="mt-1 h-7 text-xs bg-zinc-900 border-zinc-700" />
          </div>
          <div>
            <label className="text-[10px] text-zinc-500 uppercase tracking-wider">Prompt sent to AI</label>
            <Textarea value={rule.prompt} onChange={e => onChange({ ...rule, prompt: e.target.value })}
              rows={3} className="mt-1 text-xs bg-zinc-900 border-zinc-700 resize-none" />
          </div>
        </div>
      )}
    </div>
  );
}

function ThresholdRow({ label, field, value, type, onChange }) {
  if (type === 'boolean') {
    return (
      <div className="flex items-center justify-between py-2 border-b border-zinc-800 last:border-0">
        <span className="text-xs text-zinc-300">{label}</span>
        <button onClick={() => onChange(!value)}
          className={`text-xs font-bold px-2.5 py-1 rounded transition-colors ${value ? 'bg-amber-500/20 text-amber-400' : 'bg-zinc-700 text-zinc-400'}`}>
          {value ? 'ALWAYS FLAG' : 'SKIP'}
        </button>
      </div>
    );
  }
  return (
    <div className="flex items-center justify-between py-2 border-b border-zinc-800 last:border-0">
      <span className="text-xs text-zinc-300">{label}</span>
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] text-zinc-500">flag if Δ ≥</span>
        <Input type="number" step="0.0625" min="0" value={value}
          onChange={e => onChange(parseFloat(e.target.value) || 0)}
          className="h-7 w-20 text-xs text-right bg-zinc-900 border-zinc-700" />
        <span className="text-[10px] text-zinc-500">″</span>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function QAConfigPage() {
  const queryClient = useQueryClient();
  const [selectedScope, setSelectedScope] = useState('global');
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [config, setConfig] = useState(null);
  const [dirty, setDirty] = useState(false);

  const { data: currentUser } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('-updated_date', 100),
  });

  const { data: configs = [], isLoading } = useQuery({
    queryKey: ['qa-configs'],
    queryFn: () => base44.entities.QAConfig.list(),
  });

  // Resolve active config whenever scope/project selection changes
  useEffect(() => {
    if (isLoading) return;
    let found = null;
    if (selectedScope === 'global') {
      found = configs.find(c => c.scope === 'global' && c.is_active);
    } else if (selectedProjectId) {
      found = configs.find(c => c.scope === 'project' && c.project_id === selectedProjectId && c.is_active);
    }
    if (found) {
      // Merge missing keys from defaults so new fields don't break older configs
      setConfig({
        ...buildDefault(found.scope, found.project_id),
        ...found,
        mismatch_thresholds: { ...DEFAULT_THRESHOLDS, ...(found.mismatch_thresholds || {}) },
        qa_rules: found.qa_rules?.length ? found.qa_rules : DEFAULT_QA_RULES.map(r => ({ ...r })),
        erection_risk_categories: found.erection_risk_categories?.length ? found.erection_risk_categories : DEFAULT_ERECTION_CATEGORIES.map(c => ({ ...c })),
      });
    } else {
      setConfig(buildDefault(selectedScope, selectedProjectId));
    }
    setDirty(false);
  }, [selectedScope, selectedProjectId, configs, isLoading]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      // Find existing
      const existing = configs.find(c =>
        c.scope === data.scope &&
        (data.scope === 'global' || c.project_id === data.project_id)
      );
      if (existing) {
        return base44.entities.QAConfig.update(existing.id, data);
      }
      return base44.entities.QAConfig.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qa-configs'] });
      toast.success('Configuration saved');
      setDirty(false);
    },
    onError: () => toast.error('Save failed'),
  });

  const handleReset = () => {
    setConfig(buildDefault(selectedScope, selectedProjectId));
    setDirty(true);
  };

  const update = (patch) => {
    setConfig(prev => ({ ...prev, ...patch }));
    setDirty(true);
  };

  const updateRule = (idx, updated) => {
    const rules = [...config.qa_rules];
    rules[idx] = updated;
    update({ qa_rules: rules });
  };

  const deleteRule = (idx) => {
    const rules = config.qa_rules.filter((_, i) => i !== idx);
    update({ qa_rules: rules });
  };

  const addRule = () => {
    update({
      qa_rules: [...config.qa_rules, { key: `custom_${Date.now()}`, label: 'New Check', severity: 'P1', enabled: true, prompt: '' }]
    });
  };

  const updateCategory = (idx, updated) => {
    const cats = [...config.erection_risk_categories];
    cats[idx] = updated;
    update({ erection_risk_categories: cats });
  };

  const isAdmin = currentUser?.role === 'admin';

  if (!isAdmin) {
    return (
      <div className="p-8 text-center text-zinc-500">
        <AlertTriangle className="w-8 h-8 mx-auto mb-3 text-amber-500" />
        <p className="text-sm">Admin access required to manage QA configuration.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-400" />
            QA Rule Configuration
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Customize thresholds, prompts, and categories used by Steel QA Gate and Drawing Intelligence.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleReset} className="h-8 text-xs gap-1">
            <RotateCcw className="w-3 h-3" /> Reset to Defaults
          </Button>
          <Button size="sm" disabled={!dirty || saveMutation.isPending} onClick={() => saveMutation.mutate(config)}
            className="h-8 text-xs bg-amber-500 hover:bg-amber-600 text-black font-bold gap-1">
            <Save className="w-3 h-3" />
            {saveMutation.isPending ? 'Saving…' : dirty ? 'Save Changes' : 'Saved'}
          </Button>
        </div>
      </div>

      {/* Scope Selector */}
      <Card className="border-zinc-700 bg-zinc-800/50">
        <CardContent className="p-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex gap-2">
              <button
                onClick={() => { setSelectedScope('global'); setSelectedProjectId(null); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors border ${selectedScope === 'global' ? 'bg-amber-500/20 border-amber-500/50 text-amber-400' : 'border-zinc-700 text-zinc-400 hover:text-zinc-300'}`}>
                <Globe className="w-3.5 h-3.5" /> Global
              </button>
              <button
                onClick={() => setSelectedScope('project')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors border ${selectedScope === 'project' ? 'bg-blue-500/20 border-blue-500/50 text-blue-400' : 'border-zinc-700 text-zinc-400 hover:text-zinc-300'}`}>
                <FolderOpen className="w-3.5 h-3.5" /> Per Project
              </button>
            </div>

            {selectedScope === 'project' && (
              <Select value={selectedProjectId || ''} onValueChange={v => setSelectedProjectId(v || null)}>
                <SelectTrigger className="h-8 w-56 text-xs bg-zinc-900 border-zinc-700">
                  <SelectValue placeholder="Select project…" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-700">
                  {projects.map(p => (
                    <SelectItem key={p.id} value={p.id} className="text-xs">
                      {p.project_number} – {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {selectedScope === 'project' && (
              <div className="flex items-center gap-1.5 text-[10px] text-zinc-500">
                <Info className="w-3 h-3" />
                Project config overrides global when both exist.
              </div>
            )}

            {config && (
              <Badge variant="outline" className={`ml-auto text-[10px] ${configs.find(c => c.scope === selectedScope && (selectedScope === 'global' || c.project_id === selectedProjectId)) ? 'border-green-600/40 text-green-400' : 'border-zinc-600 text-zinc-500'}`}>
                {configs.find(c => c.scope === selectedScope && (selectedScope === 'global' || c.project_id === selectedProjectId)) ? 'Saved config' : 'Unsaved — using defaults'}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {!config ? (
        <div className="text-center py-12 text-zinc-500 text-sm">
          {selectedScope === 'project' ? 'Select a project above' : 'Loading…'}
        </div>
      ) : (
        <Tabs defaultValue="thresholds">
          <TabsList className="bg-zinc-800 border border-zinc-700">
            <TabsTrigger value="thresholds">Mismatch Thresholds</TabsTrigger>
            <TabsTrigger value="qa_rules">Steel QA Rules</TabsTrigger>
            <TabsTrigger value="erection">Erection Risk Categories</TabsTrigger>
            <TabsTrigger value="scoring">Severity & RFI</TabsTrigger>
          </TabsList>

          {/* ── Mismatch Thresholds ── */}
          <TabsContent value="thresholds" className="mt-4 space-y-3">
            <Card className="border-zinc-700 bg-zinc-800/50">
              <CardHeader>
                <CardTitle className="text-sm">Drawing Intelligence — Mismatch Detection Thresholds</CardTitle>
                <p className="text-xs text-zinc-500">Define when a discrepancy between two sheet views triggers a conflict finding.</p>
              </CardHeader>
              <CardContent className="space-y-0">
                {[
                  { label: 'Dimensional delta', field: 'dimensional_delta_inches', type: 'number' },
                  { label: 'Elevation delta (B.O. deck, T.O. steel)', field: 'elevation_delta_inches', type: 'number' },
                  { label: 'Slope mismatch', field: 'slope_any_mismatch', type: 'boolean' },
                  { label: 'Member type / size change', field: 'member_type_always', type: 'boolean' },
                  { label: 'Material spec revision (e.g. PL → BP)', field: 'material_revision_always', type: 'boolean' },
                  { label: 'Connection hole type (SSH vs STD)', field: 'connection_hole_type_always', type: 'boolean' },
                  { label: 'Bolt spec (qty, diameter, grade)', field: 'bolt_spec_any_mismatch', type: 'boolean' },
                ].map(t => (
                  <ThresholdRow key={t.field} {...t}
                    value={config.mismatch_thresholds?.[t.field] ?? (t.type === 'boolean' ? true : 0)}
                    onChange={v => update({ mismatch_thresholds: { ...config.mismatch_thresholds, [t.field]: v } })}
                  />
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Steel QA Rules ── */}
          <TabsContent value="qa_rules" className="mt-4 space-y-3">
            <Card className="border-zinc-700 bg-zinc-800/50">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm">Steel QA Gate — Check Rules</CardTitle>
                    <p className="text-xs text-zinc-500 mt-0.5">P0 = blocks fabrication release. P1 = warning only. Toggle to enable/disable per check.</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={addRule} className="h-7 text-xs gap-1">
                    <Plus className="w-3 h-3" /> Add Rule
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {config.qa_rules.map((rule, idx) => (
                  <RuleRow key={rule.key + idx} rule={rule}
                    onChange={updated => updateRule(idx, updated)}
                    onDelete={() => deleteRule(idx)}
                    canDelete={config.qa_rules.length > 1}
                  />
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Erection Risk Categories ── */}
          <TabsContent value="erection" className="mt-4 space-y-3">
            <Card className="border-zinc-700 bg-zinc-800/50">
              <CardHeader>
                <CardTitle className="text-sm">Drawing Intelligence — Erection Risk Categories</CardTitle>
                <p className="text-xs text-zinc-500 mt-0.5">Each enabled category is included in the AI erection risk prompt. Disable categories not relevant to your work type.</p>
              </CardHeader>
              <CardContent className="space-y-2">
                {config.erection_risk_categories.map((cat, idx) => (
                  <div key={cat.key + idx} className={`rounded border ${cat.enabled ? 'border-zinc-700 bg-zinc-800/50' : 'border-zinc-800 bg-zinc-900/30 opacity-60'} space-y-0`}>
                    <div className="flex items-center gap-2 px-3 py-2">
                      <button onClick={() => updateCategory(idx, { ...cat, enabled: !cat.enabled })}
                        className={`w-5 h-5 rounded flex items-center justify-center shrink-0 border transition-colors ${cat.enabled ? 'bg-amber-500 border-amber-500' : 'border-zinc-600'}`}>
                        {cat.enabled && <CheckCircle2 className="w-3 h-3 text-black" />}
                      </button>
                      <span className="text-xs font-semibold text-white flex-1">{cat.label}</span>
                      <span className="text-[10px] font-mono text-zinc-600 uppercase">{cat.key}</span>
                    </div>
                    {cat.enabled && (
                      <div className="px-3 pb-3 border-t border-zinc-700/50">
                        <label className="text-[10px] text-zinc-500 uppercase tracking-wider block mt-2 mb-1">Prompt sent to AI</label>
                        <Textarea value={cat.prompt} onChange={e => updateCategory(idx, { ...cat, prompt: e.target.value })}
                          rows={3} className="text-xs bg-zinc-900 border-zinc-700 resize-none" />
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Severity & RFI thresholds ── */}
          <TabsContent value="scoring" className="mt-4 space-y-3">
            <Card className="border-zinc-700 bg-zinc-800/50">
              <CardHeader>
                <CardTitle className="text-sm">Severity Thresholds &amp; Auto-RFI</CardTitle>
                <p className="text-xs text-zinc-500 mt-0.5">Controls when Drawing Intelligence auto-creates draft RFI suggestions for PM review.</p>
              </CardHeader>
              <CardContent className="space-y-5">
                <div>
                  <label className="text-xs text-zinc-400 uppercase tracking-wider">Mismatch — Auto-create RFI suggestion at severity ≥</label>
                  <div className="flex items-center gap-3 mt-2">
                    {[1,2,3,4,5].map(s => (
                      <button key={s} onClick={() => update({ rfi_auto_create_min_severity: s })}
                        className={`w-10 h-10 rounded-lg text-sm font-bold border transition-colors ${config.rfi_auto_create_min_severity === s ? 'bg-amber-500 border-amber-500 text-black' : 'border-zinc-700 text-zinc-400 hover:border-zinc-500'}`}>
                        {s}
                      </button>
                    ))}
                    <span className="text-xs text-zinc-500">
                      {config.rfi_auto_create_min_severity <= 2 ? '— All findings generate RFIs' :
                       config.rfi_auto_create_min_severity === 3 ? '— PM review + above' :
                       config.rfi_auto_create_min_severity === 4 ? '— Field modification / prevents install only' :
                       '— Only severity 5 (prevents install)'}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-zinc-400 uppercase tracking-wider">Erection Risk — Auto-create RFI suggestion at severity ≥</label>
                  <div className="flex items-center gap-3 mt-2">
                    {[1,2,3,4,5].map(s => (
                      <button key={s} onClick={() => update({ erection_risk_rfi_min_severity: s })}
                        className={`w-10 h-10 rounded-lg text-sm font-bold border transition-colors ${config.erection_risk_rfi_min_severity === s ? 'bg-blue-500 border-blue-500 text-white' : 'border-zinc-700 text-zinc-400 hover:border-zinc-500'}`}>
                        {s}
                      </button>
                    ))}
                    <span className="text-xs text-zinc-500">
                      {config.erection_risk_rfi_min_severity <= 3 ? '— Most erection risks generate RFIs' :
                       config.erection_risk_rfi_min_severity === 4 ? '— Field modification + prevents install only' :
                       '— Only severity 5 (prevents install)'}
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded bg-zinc-900 border border-zinc-700 text-[11px] text-zinc-500 space-y-1">
                  <div className="font-semibold text-zinc-400 mb-1.5">Severity scale reference</div>
                  {[
                    [5, 'Prevents installation — IMMEDIATE RFI required'],
                    [4, 'Requires field modification — RFI within 48h'],
                    [3, 'Impacts sequence or tolerance — PM review required'],
                    [2, 'Coordination required — Track only'],
                    [1, 'Informational — Log only'],
                  ].map(([s, desc]) => (
                    <div key={s} className="flex items-center gap-2">
                      <span className="font-mono font-bold w-4 text-white">{s}</span>
                      <span>{desc}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}