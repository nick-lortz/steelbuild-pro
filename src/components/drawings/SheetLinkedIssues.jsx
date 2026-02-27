/**
 * SheetLinkedIssues
 * Shows ErectionIssues and DesignIntentFlags linked to a specific DrawingSheet,
 * including the fab status that was active when each was detected.
 */
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Flag, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const RISK_COLOR = {
  high: 'text-red-400 border-red-500/40 bg-red-500/10',
  medium: 'text-amber-400 border-amber-500/40 bg-amber-500/10',
  low: 'text-green-400 border-green-500/40 bg-green-500/10',
};

const STATUS_LABEL = {
  open: 'Open', acknowledged: 'Ack', mitigated: 'Mitigated', resolved: 'Resolved', not_applicable: 'N/A',
  flagged: 'Flagged', pm_review: 'PM Review', engineer_review: 'EOR Review',
  approved: 'Approved', rejected: 'Rejected', requires_co: 'CO Required',
};

const FAB_STATUS_LABEL = {
  approved_for_fabrication: 'AFF',
  for_information_only: 'FIO',
  issued_for_approval: 'IFA',
  superseded: 'SUP',
  on_hold: 'HOLD',
};

export default function SheetLinkedIssues({ sheetId }) {
  const { data: erectionIssues = [], isLoading: loadingEI } = useQuery({
    queryKey: ['erection-issues-sheet', sheetId],
    queryFn: () => base44.entities.ErectionIssue.filter({ sheet_id: sheetId }),
    enabled: !!sheetId,
  });

  const { data: designFlags = [], isLoading: loadingDF } = useQuery({
    queryKey: ['design-flags-sheet', sheetId],
    queryFn: () => base44.entities.DesignIntentFlag.filter({ sheet_id: sheetId }),
    enabled: !!sheetId,
  });

  if (loadingEI || loadingDF) return <div className="text-xs text-zinc-500 py-2">Loading linked records…</div>;
  if (erectionIssues.length === 0 && designFlags.length === 0) {
    return <div className="text-xs text-zinc-600 py-2 text-center">No linked erection issues or design flags for this sheet.</div>;
  }

  return (
    <div className="space-y-2 mt-2">
      {erectionIssues.map(issue => (
        <div key={issue.id} className="flex items-start gap-2 p-2 rounded border border-zinc-800 bg-zinc-900/60 text-xs">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-0.5">
              <span className="font-semibold text-zinc-200 capitalize">{issue.issue_type?.replace(/_/g, ' ')}</span>
              <span className={cn('px-1.5 py-0.5 rounded border text-[10px] font-bold', RISK_COLOR[issue.install_risk] || RISK_COLOR.medium)}>
                {issue.install_risk?.toUpperCase()} RISK
              </span>
              <span className="px-1.5 py-0.5 rounded border border-zinc-700 text-zinc-400 text-[10px]">
                {STATUS_LABEL[issue.status] || issue.status}
              </span>
              {issue.sheet_fab_status_at_detection && (
                <span className="px-1.5 py-0.5 rounded border border-zinc-700 text-zinc-500 text-[10px]">
                  Sheet was {FAB_STATUS_LABEL[issue.sheet_fab_status_at_detection] || issue.sheet_fab_status_at_detection} at detection
                </span>
              )}
            </div>
            <div className="text-zinc-400 truncate">{issue.description}</div>
            {issue.location_reference && <div className="text-zinc-600 mt-0.5">@ {issue.location_reference}</div>}
          </div>
        </div>
      ))}

      {designFlags.map(flag => (
        <div key={flag.id} className="flex items-start gap-2 p-2 rounded border border-zinc-800 bg-zinc-900/60 text-xs">
          <Flag className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-0.5">
              <span className="font-semibold text-zinc-200 capitalize">{flag.change_category?.replace(/_/g, ' ')}</span>
              <span className="px-1.5 py-0.5 rounded border border-zinc-700 text-zinc-400 text-[10px]">
                {STATUS_LABEL[flag.status] || flag.status}
              </span>
              {flag.fabrication_impact && <span className="px-1.5 py-0.5 rounded border border-orange-700 text-orange-400 text-[10px]">Fab Impact</span>}
              {flag.sheet_fab_status_at_detection && (
                <span className="px-1.5 py-0.5 rounded border border-zinc-700 text-zinc-500 text-[10px]">
                  Sheet was {FAB_STATUS_LABEL[flag.sheet_fab_status_at_detection] || flag.sheet_fab_status_at_detection} at detection
                </span>
              )}
            </div>
            <div className="text-zinc-400 truncate">{flag.description}</div>
            {flag.original_intent && flag.new_intent && (
              <div className="flex items-center gap-1 mt-1 text-[10px] text-zinc-500">
                <span className="text-zinc-400">{flag.original_intent}</span>
                <ArrowRight className="w-3 h-3" />
                <span className="text-purple-300">{flag.new_intent}</span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}