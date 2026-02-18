import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Calendar, User, Download, Eye, AlertTriangle, CheckCircle, Play, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export default function DrawingVersionHistory({ drawingSetId }) {
  const queryClient = useQueryClient();
  const [expandedQA, setExpandedQA] = useState(null);

  const { data: revisions = [] } = useQuery({
    queryKey: ['drawing-revisions', drawingSetId],
    queryFn: () => base44.entities.DrawingRevision.filter({ drawing_set_id: drawingSetId }),
    enabled: !!drawingSetId
  });

  const runQAMutation = useMutation({
    mutationFn: (revisionId) => base44.functions.invoke('runDrawingQA', { revision_id: revisionId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drawing-revisions', drawingSetId] });
    }
  });

  const sortedRevisions = revisions.sort((a, b) => 
    new Date(b.revision_date) - new Date(a.revision_date)
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Revision History</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {sortedRevisions.map((revision, idx) => (
            <div
              key={revision.id}
              className={cn(
                "p-4 rounded-lg border",
                revision.is_current ? "bg-blue-950/20 border-blue-500/30" : "bg-zinc-900/30 border-zinc-800"
              )}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono font-bold text-white">{revision.revision_number}</span>
                    {revision.is_current && (
                      <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                        Current
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-xs">
                      {revision.status}
                    </Badge>
                    {/* QA Status Badge */}
                    {revision.qa_status === 'pass' && (
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/30 flex items-center gap-1">
                        <CheckCircle size={12} />
                        QA Pass
                      </Badge>
                    )}
                    {revision.qa_status === 'fail' && (
                      <Badge className="bg-red-500/20 text-red-400 border-red-500/30 flex items-center gap-1">
                        <AlertTriangle size={12} />
                        QA Fail ({revision.p0_count} P0)
                      </Badge>
                    )}
                    {revision.qa_status === 'in_progress' && (
                      <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 flex items-center gap-1">
                        <RefreshCw size={12} className="animate-spin" />
                        QA Running
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-zinc-500">
                    <div className="flex items-center gap-1">
                      <Calendar size={12} />
                      {format(new Date(revision.revision_date), 'MMM d, yyyy')}
                    </div>
                    {revision.submitted_by && (
                      <div className="flex items-center gap-1">
                        <User size={12} />
                        {revision.submitted_by}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {revision.qa_status === 'not_run' && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => runQAMutation.mutate(revision.id)}
                      disabled={runQAMutation.isPending}
                    >
                      <Play size={14} className="mr-2" />
                      Run QA
                    </Button>
                  )}
                  {(revision.qa_status === 'pass' || revision.qa_status === 'fail') && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => setExpandedQA(expandedQA === revision.id ? null : revision.id)}
                    >
                      <Eye size={14} className="mr-2" />
                      QA Report
                    </Button>
                  )}
                  {revision.markup_snapshot_url && (
                    <Button size="sm" variant="outline" asChild>
                      <a href={revision.markup_snapshot_url} target="_blank" rel="noopener noreferrer">
                        <Download size={14} className="mr-2" />
                        Markups
                      </a>
                    </Button>
                  )}
                </div>
              </div>

              {/* QA Report Expansion */}
              {expandedQA === revision.id && revision.qa_blockers && revision.qa_blockers.length > 0 && (
                <div className="mb-3 p-3 rounded-lg bg-zinc-950/50 border border-zinc-800">
                  <div className="text-xs font-bold text-white mb-2 flex items-center gap-2">
                    <AlertTriangle size={14} className="text-amber-400" />
                    QA Findings ({revision.p0_count} P0, {revision.p1_count} P1)
                  </div>
                  <div className="space-y-2">
                    {revision.qa_blockers.slice(0, 10).map((finding, fidx) => (
                      <div
                        key={fidx}
                        className={cn(
                          "p-2 rounded border text-xs",
                          finding.severity === 'P0' 
                            ? "bg-red-950/20 border-red-500/30" 
                            : "bg-amber-950/20 border-amber-500/30"
                        )}
                      >
                        <div className="flex items-start gap-2 mb-1">
                          <Badge 
                            className={cn(
                              "text-xs",
                              finding.severity === 'P0'
                                ? "bg-red-500/20 text-red-400 border-red-500/30"
                                : "bg-amber-500/20 text-amber-400 border-amber-500/30"
                            )}
                          >
                            {finding.severity}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {finding.category?.replace(/_/g, ' ')}
                          </Badge>
                          <span className="text-zinc-500">{finding.sheet_number}</span>
                        </div>
                        <div className="text-white mb-1">{finding.message}</div>
                        {finding.location && (
                          <div className="text-zinc-500">Location: {finding.location}</div>
                        )}
                        {finding.recommendation && (
                          <div className="text-green-400 mt-1">→ {finding.recommendation}</div>
                        )}
                      </div>
                    ))}
                    {revision.qa_blockers.length > 10 && (
                      <div className="text-xs text-zinc-500 text-center">
                        +{revision.qa_blockers.length - 10} more findings
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Description */}
              {revision.description && (
                <p className="text-sm text-zinc-300 mb-3">{revision.description}</p>
              )}

              {/* Sheets */}
              {revision.sheets && revision.sheets.length > 0 && (
                <div className="mb-3">
                  <div className="text-xs text-zinc-500 mb-2">Sheets ({revision.sheets.length})</div>
                  <div className="flex flex-wrap gap-2">
                    {revision.sheets.slice(0, 10).map((sheet, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {sheet.sheet_number}
                      </Badge>
                    ))}
                    {revision.sheets.length > 10 && (
                      <Badge variant="outline" className="text-xs">
                        +{revision.sheets.length - 10} more
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              {/* Linked Items */}
              <div className="flex items-center gap-4 text-xs text-zinc-500">
                {revision.linked_rfi_ids?.length > 0 && (
                  <span>{revision.linked_rfi_ids.length} RFIs</span>
                )}
                {revision.linked_detail_improvement_ids?.length > 0 && (
                  <span>{revision.linked_detail_improvement_ids.length} Detail Improvements</span>
                )}
                {revision.linked_fab_readiness_item_ids?.length > 0 && (
                  <span>{revision.linked_fab_readiness_item_ids.length} Fab Items</span>
                )}
              </div>

              {/* Change Summary */}
              {revision.change_summary && (
                <div className="mt-3 pt-3 border-t border-zinc-800">
                  <div className="text-xs text-zinc-500 mb-1">Changes</div>
                  <p className="text-xs text-zinc-400">{revision.change_summary}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}