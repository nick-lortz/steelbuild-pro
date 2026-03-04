/**
 * StructuredOutputCard — renders the JSON output block from ProjectSolver
 * with apply actions (create RFI, create Risk, etc.)
 */
import React, { useState } from 'react';
import { AlertTriangle, Shield, FileQuestion, FileSignature, Lightbulb, ChevronDown, ChevronUp, Check, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useActiveProject } from '@/components/shared/hooks/useActiveProject';

const TYPE_CONFIG = {
  issue:     { label: 'Issue Detected',      icon: AlertTriangle, color: '#FF4D4D',  bg: 'rgba(255,77,77,0.08)',   border: 'rgba(255,77,77,0.20)' },
  risk:      { label: 'Risk Identified',     icon: Shield,        color: '#FFB15A',  bg: 'rgba(255,177,90,0.08)', border: 'rgba(255,177,90,0.20)' },
  rfi_draft: { label: 'RFI Draft Ready',     icon: FileQuestion,  color: '#4DA3FF',  bg: 'rgba(77,163,255,0.08)', border: 'rgba(77,163,255,0.20)' },
  co_draft:  { label: 'Change Order Draft',  icon: FileSignature, color: '#C084FC',  bg: 'rgba(192,132,252,0.08)',border: 'rgba(192,132,252,0.20)' },
  solution:  { label: 'Solution Proposed',   icon: Lightbulb,     color: '#4DD6A4',  bg: 'rgba(77,214,164,0.08)', border: 'rgba(77,214,164,0.20)' },
};

export default function StructuredOutputCard({ output, projectId }) {
  const [expanded, setExpanded] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const { activeProjectId } = useActiveProject();
  const pid = projectId || activeProjectId;

  if (!output) return null;
  const cfg = TYPE_CONFIG[output.type] || TYPE_CONFIG.solution;
  const Icon = cfg.icon;

  async function applyOutput() {
    setApplying(true);
    try {
      if (output.type === 'rfi_draft') {
        const rfis = await base44.entities.RFI.filter({ project_id: pid }, '-created_date', 1);
        const nextNum = (rfis[0]?.rfi_number || 0) + 1;
        await base44.entities.RFI.create({
          project_id: pid,
          rfi_number: nextNum,
          subject: output.subject,
          question: output.question,
          location_area: output.location_area,
          rfi_type: output.rfi_type || 'other',
          priority: output.priority || 'medium',
          impact_severity: output.impact_severity || 'medium',
          is_install_blocker: output.is_install_blocker || false,
          is_release_blocker: output.is_release_blocker || false,
          status: 'draft',
          ball_in_court: 'internal',
        });
      } else if (output.type === 'risk') {
        await base44.entities.ProjectRisk.create({
          project_id: pid,
          category: output.category,
          description: output.description,
          probability: output.probability,
          impact: output.impact,
          mitigation_plan: output.mitigation,
          status: 'open',
        });
      } else if (output.type === 'co_draft') {
        const cos = await base44.entities.ChangeOrder.filter({ project_id: pid }, '-created_date', 1);
        const nextNum = (cos[0]?.co_number || 0) + 1;
        await base44.entities.ChangeOrder.create({
          project_id: pid,
          co_number: nextNum,
          title: output.title,
          description: `${output.description}\n\nJustification: ${output.justification}`,
          cost_impact: output.cost_impact || 0,
          schedule_impact_days: output.schedule_impact_days || 0,
          status: 'draft',
        });
      }
      setApplied(true);
    } catch (e) {
      console.error(e);
    }
    setApplying(false);
  }

  const applyLabel = {
    rfi_draft: 'Create RFI',
    risk:      'Save Risk',
    co_draft:  'Create CO',
    issue:     null,
    solution:  null,
  }[output.type];

  return (
    <div className="rounded-xl border overflow-hidden mt-2" style={{ borderColor: cfg.border, background: cfg.bg }}>
      {/* Header */}
      <div className="flex items-center gap-2.5 px-3 py-2">
        <Icon size={13} style={{ color: cfg.color, flexShrink: 0 }} />
        <span className="text-[0.68rem] font-bold tracking-[0.08em] uppercase flex-1" style={{ color: cfg.color }}>{cfg.label}</span>
        {applyLabel && !applied && (
          <button onClick={applyOutput} disabled={applying}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[0.65rem] font-bold text-white transition-all disabled:opacity-50"
            style={{ background: cfg.color }}
          >
            {applying ? <Loader2 size={10} className="animate-spin" /> : null}
            {applying ? 'Saving…' : applyLabel}
          </button>
        )}
        {applied && <span className="flex items-center gap-1 text-[0.65rem] text-[rgba(255,255,255,0.50)]"><Check size={10} /> Saved</span>}
        <button onClick={() => setExpanded(p => !p)} className="text-[rgba(255,255,255,0.30)] hover:text-[rgba(255,255,255,0.70)] transition-colors">
          {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>
      </div>

      {/* Summary line */}
      <div className="px-3 pb-2 text-[0.75rem] text-[rgba(255,255,255,0.70)]">
        {output.description || output.summary || output.subject || output.title || ''}
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-3 pb-3 border-t border-[rgba(255,255,255,0.06)]">
          <pre className="mt-2 text-[0.65rem] text-[rgba(255,255,255,0.50)] overflow-x-auto whitespace-pre-wrap leading-relaxed">
            {JSON.stringify(output, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}