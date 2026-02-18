import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Calendar, User, Download, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export default function DrawingVersionHistory({ drawingSetId }) {
  const { data: revisions = [] } = useQuery({
    queryKey: ['drawing-revisions', drawingSetId],
    queryFn: () => base44.entities.DrawingRevision.filter({ drawing_set_id: drawingSetId }),
    enabled: !!drawingSetId
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
                <div>
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