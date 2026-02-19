import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { History, RotateCcw, Clock, User, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from '@/components/ui/notifications';

export default function DrawingSheetRevisionHistory({ drawingSheetId, projectId }) {
  const queryClient = useQueryClient();

  const { data: revisions = [], isLoading } = useQuery({
    queryKey: ['drawing-sheet-revisions', drawingSheetId],
    queryFn: async () => {
      const results = await base44.entities.DrawingSheetRevision.filter(
        { drawing_sheet_id: drawingSheetId },
        '-revision_date'
      );
      return results;
    },
    enabled: !!drawingSheetId
  });

  const revertMutation = useMutation({
    mutationFn: async ({ revisionId, snapshotData, revisionNumber, fileUrl }) => {
      const snapshot = JSON.parse(snapshotData);
      
      // Update the parent DrawingSheet entity with snapshot data
      await base44.entities.DrawingSheet.update(drawingSheetId, {
        ...snapshot,
        revision_number: `${revisionNumber} (Restored)`,
        file_url: fileUrl || snapshot.file_url
      });

      // Create new revision record documenting the reversion
      const newRevision = await base44.entities.DrawingSheetRevision.create({
        drawing_sheet_id: drawingSheetId,
        project_id: projectId,
        revision_number: `${revisionNumber} (Restored)`,
        revision_date: new Date().toISOString(),
        revision_notes: `Reverted to ${revisionNumber}`,
        previous_revision_id: revisionId,
        snapshot_data: snapshotData,
        file_url: fileUrl,
        revision_type: 'revert'
      });

      return newRevision;
    },
    onSuccess: () => {
      toast.success('Drawing sheet revision restored successfully');
      queryClient.invalidateQueries(['drawing-sheet-revisions', drawingSheetId]);
      queryClient.invalidateQueries(['drawing-sheet', drawingSheetId]);
    },
    onError: (error) => {
      toast.error(`Failed to restore revision: ${error.message}`);
    }
  });

  const handleRevert = (revision) => {
    if (window.confirm(`Restore ${revision.revision_number}? Current state will be overwritten.`)) {
      revertMutation.mutate({
        revisionId: revision.id,
        snapshotData: revision.snapshot_data,
        revisionNumber: revision.revision_number,
        fileUrl: revision.file_url
      });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History size={20} />
            Revision History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading revisions...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History size={20} />
          Drawing Sheet Revision History
        </CardTitle>
      </CardHeader>
      <CardContent>
        {revisions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No revision history available</p>
        ) : (
          <div className="space-y-3">
            {revisions.map((revision, index) => (
              <div
                key={revision.id}
                className="flex items-start justify-between p-3 rounded-lg border border-border bg-card hover:bg-accent/5 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={index === 0 ? 'default' : 'secondary'}>
                      {revision.revision_number}
                    </Badge>
                    {revision.revision_type && (
                      <Badge variant="outline" className="text-xs">
                        {revision.revision_type}
                      </Badge>
                    )}
                    {revision.revision_hash && (
                      <Badge variant="outline" className="text-xs font-mono">
                        {revision.revision_hash.substring(0, 8)}
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      {format(new Date(revision.revision_date), 'MMM d, yyyy h:mm a')}
                    </span>
                    <span className="flex items-center gap-1">
                      <User size={12} />
                      {revision.created_by || 'System'}
                    </span>
                  </div>

                  {revision.revision_notes && (
                    <p className="text-sm text-foreground mb-2">{revision.revision_notes}</p>
                  )}

                  {revision.file_url && (
                    <a
                      href={revision.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      <FileText size={12} />
                      View Drawing File
                    </a>
                  )}

                  {revision.changed_fields && revision.changed_fields.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs text-muted-foreground">
                        Changed: {revision.changed_fields.join(', ')}
                      </p>
                    </div>
                  )}
                </div>

                {index !== 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRevert(revision)}
                    disabled={revertMutation.isPending}
                    className="ml-3"
                  >
                    <RotateCcw size={14} className="mr-1" />
                    Restore
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}