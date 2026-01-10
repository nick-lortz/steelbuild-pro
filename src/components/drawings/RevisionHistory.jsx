import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { History, Download, Eye, User, Calendar } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

const STATUS_COLORS = {
  'IFA': 'bg-blue-500',
  'BFA': 'bg-amber-500',
  'BFS': 'bg-purple-500',
  'FFF': 'bg-green-500',
  'As-Built': 'bg-zinc-500'
};

export default function RevisionHistory({ drawingSetId, open, onOpenChange }) {
  const { data: revisions = [], isLoading } = useQuery({
    queryKey: ['drawing-revisions', drawingSetId],
    queryFn: () => base44.entities.DrawingRevision.filter({ drawing_set_id: drawingSetId }, '-revision_date'),
    enabled: !!drawingSetId && open
  });

  const { data: sheets = [] } = useQuery({
    queryKey: ['drawing-sheets', drawingSetId],
    queryFn: () => base44.entities.DrawingSheet.filter({ drawing_set_id: drawingSetId }),
    enabled: !!drawingSetId && open
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto bg-zinc-900 border-zinc-800 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History size={20} />
            Revision History
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : revisions.length === 0 ? (
          <div className="text-center py-12">
            <History size={48} className="mx-auto mb-4 text-zinc-700" />
            <p className="text-zinc-500">No revision history available</p>
          </div>
        ) : (
          <div className="space-y-4">
            {revisions.map((rev, idx) => (
              <div 
                key={rev.id}
                className={cn(
                  "relative pl-8 pb-6",
                  idx !== revisions.length - 1 && "border-l-2 border-zinc-800 ml-3"
                )}
              >
                {/* Timeline Dot */}
                <div className={cn(
                  "absolute left-0 top-0 w-6 h-6 rounded-full border-2 border-zinc-800 flex items-center justify-center",
                  STATUS_COLORS[rev.status] || 'bg-zinc-700'
                )}>
                  <div className="w-2 h-2 rounded-full bg-white" />
                </div>

                <div className="bg-zinc-950 rounded-lg p-4 ml-4 border border-zinc-800">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-bold text-white">Revision {rev.revision_number}</h4>
                        <Badge variant="secondary" className="text-xs">
                          {rev.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-zinc-500">
                        <span className="flex items-center gap-1">
                          <Calendar size={12} />
                          {format(parseISO(rev.revision_date), 'MMM d, yyyy')}
                        </span>
                        {rev.submitted_by && (
                          <span className="flex items-center gap-1">
                            <User size={12} />
                            {rev.submitted_by}
                          </span>
                        )}
                      </div>
                    </div>
                    {rev.file_url && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(rev.file_url, '_blank')}
                          className="h-8 gap-1 border-zinc-700 text-white hover:bg-zinc-800"
                        >
                          <Eye size={14} />
                          View
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const link = document.createElement('a');
                            link.href = rev.file_url;
                            link.download = rev.file_name || `revision-${rev.revision_number}.pdf`;
                            link.click();
                          }}
                          className="h-8 gap-1 border-zinc-700 text-white hover:bg-zinc-800"
                        >
                          <Download size={14} />
                        </Button>
                      </div>
                    )}
                  </div>

                  {rev.description && (
                    <p className="text-sm text-zinc-400 mb-3">{rev.description}</p>
                  )}

                  {rev.file_name && (
                    <div className="text-xs text-zinc-600 font-mono">
                      {rev.file_name}
                      {rev.file_size && ` • ${(rev.file_size / 1024 / 1024).toFixed(2)} MB`}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {sheets.length > 0 && (
          <div className="mt-6 pt-6 border-t border-zinc-800">
            <h4 className="text-sm font-bold text-zinc-400 uppercase tracking-widest mb-3">
              Current Sheets ({sheets.length})
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {sheets.map((sheet) => (
                <div 
                  key={sheet.id}
                  className="p-2 bg-zinc-950 border border-zinc-800 rounded text-xs"
                >
                  <div className="font-mono text-white">{sheet.sheet_number}</div>
                  <div className="text-zinc-600 truncate">{sheet.sheet_name}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}