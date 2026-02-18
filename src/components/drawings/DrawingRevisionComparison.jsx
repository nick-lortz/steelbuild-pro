import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, FileText, Calendar, User, Link } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export default function DrawingRevisionComparison({ drawingSetId }) {
  const [baselineRev, setBaselineRev] = useState(null);
  const [compareRev, setCompareRev] = useState(null);

  const { data: revisions = [] } = useQuery({
    queryKey: ['drawing-revisions', drawingSetId],
    queryFn: () => base44.entities.DrawingRevision.filter({ drawing_set_id: drawingSetId }),
    enabled: !!drawingSetId
  });

  const sortedRevisions = revisions.sort((a, b) => 
    new Date(b.revision_date) - new Date(a.revision_date)
  );

  const baseline = sortedRevisions.find(r => r.id === baselineRev);
  const compare = sortedRevisions.find(r => r.id === compareRev);

  return (
    <div className="space-y-6">
      {/* Selection */}
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <label className="text-xs text-zinc-500 mb-2 block">Baseline Revision</label>
          <Select value={baselineRev || ''} onValueChange={setBaselineRev}>
            <SelectTrigger className="bg-zinc-900 border-zinc-700">
              <SelectValue placeholder="Select baseline" />
            </SelectTrigger>
            <SelectContent>
              {sortedRevisions.map(rev => (
                <SelectItem key={rev.id} value={rev.id}>
                  {rev.revision_number} - {format(new Date(rev.revision_date), 'MMM d, yyyy')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="pt-6">
          <ArrowRight className="text-zinc-600" size={24} />
        </div>

        <div className="flex-1">
          <label className="text-xs text-zinc-500 mb-2 block">Compare To</label>
          <Select value={compareRev || ''} onValueChange={setCompareRev}>
            <SelectTrigger className="bg-zinc-900 border-zinc-700">
              <SelectValue placeholder="Select revision" />
            </SelectTrigger>
            <SelectContent>
              {sortedRevisions.filter(r => r.id !== baselineRev).map(rev => (
                <SelectItem key={rev.id} value={rev.id}>
                  {rev.revision_number} - {format(new Date(rev.revision_date), 'MMM d, yyyy')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Comparison Results */}
      {baseline && compare && (
        <div className="grid grid-cols-2 gap-4">
          <RevisionCard revision={baseline} title="Baseline" />
          <RevisionCard revision={compare} title="Current" isCompare />
        </div>
      )}

      {/* Change Summary */}
      {baseline && compare && compare.change_summary && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Change Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-zinc-300 whitespace-pre-wrap">{compare.change_summary}</p>
          </CardContent>
        </Card>
      )}

      {/* Side-by-side Sheet Comparison */}
      {baseline && compare && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sheet Changes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {compare.sheets?.map((sheet, idx) => {
                const baselineSheet = baseline.sheets?.find(s => s.sheet_number === sheet.sheet_number);
                const hasChanged = !baselineSheet || baselineSheet.revision_hash !== sheet.revision_hash;

                return (
                  <div
                    key={idx}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-lg border",
                      hasChanged ? "bg-amber-950/20 border-amber-500/30" : "bg-zinc-900/30 border-zinc-800"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <FileText size={16} className={hasChanged ? "text-amber-400" : "text-zinc-500"} />
                      <span className="font-mono text-sm">{sheet.sheet_number}</span>
                      {hasChanged && <Badge className="bg-amber-500/20 text-amber-400">Changed</Badge>}
                    </div>
                    <div className="flex items-center gap-2">
                      {baselineSheet && (
                        <Button size="sm" variant="outline" asChild>
                          <a href={baselineSheet.file_url} target="_blank" rel="noopener noreferrer">
                            View Old
                          </a>
                        </Button>
                      )}
                      <Button size="sm" variant="outline" asChild>
                        <a href={sheet.file_url} target="_blank" rel="noopener noreferrer">
                          View New
                        </a>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function RevisionCard({ revision, title, isCompare }) {
  return (
    <Card className={cn(isCompare && "border-l-4 border-l-blue-500")}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{title}</CardTitle>
          <Badge variant="outline">{revision.revision_number}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 text-sm">
          <Calendar size={14} className="text-zinc-500" />
          <span className="text-zinc-300">{format(new Date(revision.revision_date), 'MMM d, yyyy')}</span>
        </div>
        
        {revision.submitted_by && (
          <div className="flex items-center gap-2 text-sm">
            <User size={14} className="text-zinc-500" />
            <span className="text-zinc-300">{revision.submitted_by}</span>
          </div>
        )}

        <div className="flex items-center gap-2 text-sm">
          <FileText size={14} className="text-zinc-500" />
          <span className="text-zinc-300">{revision.sheets?.length || 0} sheets</span>
        </div>

        {revision.description && (
          <div className="pt-3 border-t border-zinc-800">
            <p className="text-xs text-zinc-400">{revision.description}</p>
          </div>
        )}

        {/* Linked Items */}
        <div className="pt-3 border-t border-zinc-800 space-y-2">
          {revision.linked_rfi_ids?.length > 0 && (
            <div className="flex items-center gap-2 text-xs">
              <Link size={12} className="text-blue-400" />
              <span className="text-zinc-500">{revision.linked_rfi_ids.length} RFIs</span>
            </div>
          )}
          {revision.linked_detail_improvement_ids?.length > 0 && (
            <div className="flex items-center gap-2 text-xs">
              <Link size={12} className="text-green-400" />
              <span className="text-zinc-500">{revision.linked_detail_improvement_ids.length} Detail Improvements</span>
            </div>
          )}
          {revision.linked_fab_readiness_item_ids?.length > 0 && (
            <div className="flex items-center gap-2 text-xs">
              <Link size={12} className="text-purple-400" />
              <span className="text-zinc-500">{revision.linked_fab_readiness_item_ids.length} Fab Items</span>
            </div>
          )}
        </div>

        {revision.status && (
          <div className="pt-3 border-t border-zinc-800">
            <Badge className={cn(
              revision.status === 'FFF' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
              revision.status === 'superseded' ? 'bg-zinc-700/20 text-zinc-400 border-zinc-700/30' :
              'bg-blue-500/20 text-blue-400 border-blue-500/30'
            )}>
              {revision.status}
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}