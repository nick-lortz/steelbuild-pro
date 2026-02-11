import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import DataTable from '@/components/ui/DataTable';
import { History, RotateCcw, Eye, AlertTriangle } from 'lucide-react';
import { toast } from '@/components/ui/notifications';
import { format } from 'date-fns';

export default function SOVVersionControl({ projectId, canEdit }) {
  const queryClient = useQueryClient();
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState(null);
  const [showRevertConfirm, setShowRevertConfirm] = useState(false);

  const { data: versions = [] } = useQuery({
    queryKey: ['sov-versions', projectId],
    queryFn: async () => {
      // Query audit logs for SOV changes
      const logs = await base44.entities.AuditLog.filter({
        project_id: projectId,
        entity_type: 'SOVItem'
      });
      
      // Group by timestamp to create versions
      const versionMap = new Map();
      logs.forEach(log => {
        const versionKey = log.created_date.substring(0, 19); // Group by second
        if (!versionMap.has(versionKey)) {
          versionMap.set(versionKey, {
            timestamp: log.created_date,
            user: log.created_by,
            changes: [],
            snapshot: log.snapshot_before
          });
        }
        versionMap.get(versionKey).changes.push({
          action: log.action,
          entity_id: log.entity_id,
          changes: log.changes
        });
      });
      
      return Array.from(versionMap.values()).sort((a, b) => 
        new Date(b.timestamp) - new Date(a.timestamp)
      );
    },
    enabled: !!projectId
  });

  const revertMutation = useMutation({
    mutationFn: async (versionData) => {
      // Revert to historical snapshot
      const snapshot = versionData.snapshot;
      if (!snapshot) throw new Error('No snapshot available');
      
      // Delete current SOV items
      const current = await base44.entities.SOVItem.filter({ project_id: projectId });
      await Promise.all(current.map(item => base44.entities.SOVItem.delete(item.id)));
      
      // Recreate from snapshot
      await base44.entities.SOVItem.bulkCreate(
        snapshot.map(item => ({ ...item, project_id: projectId }))
      );
      
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sov-items', projectId] });
      queryClient.invalidateQueries({ queryKey: ['sov-versions', projectId] });
      toast.success('Reverted to previous version');
      setShowRevertConfirm(false);
      setShowHistoryDialog(false);
    },
    onError: (err) => toast.error(err?.message || 'Revert failed')
  });

  const columns = [
    {
      header: 'Date',
      accessor: 'timestamp',
      render: (row) => format(new Date(row.timestamp), 'MMM d, yyyy h:mm a')
    },
    {
      header: 'User',
      accessor: 'user',
      render: (row) => <span className="text-sm">{row.user}</span>
    },
    {
      header: 'Changes',
      accessor: 'changes',
      render: (row) => <span className="text-sm">{row.changes.length} modifications</span>
    },
    {
      header: '',
      accessor: 'actions',
      render: (row) => (
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedVersion(row)}
            className="text-blue-400 hover:text-blue-300"
          >
            <Eye size={14} className="mr-1" />
            View
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedVersion(row);
              setShowRevertConfirm(true);
            }}
            disabled={!canEdit}
            className="text-amber-400 hover:text-amber-300 disabled:opacity-50"
          >
            <RotateCcw size={14} className="mr-1" />
            Revert
          </Button>
        </div>
      )
    }
  ];

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowHistoryDialog(true)}
      >
        <History size={16} className="mr-2" />
        Version History
      </Button>

      <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>SOV Version History</DialogTitle>
            <DialogDescription>
              View and revert to previous SOV configurations
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto">
            <DataTable
              columns={columns}
              data={versions}
              emptyMessage="No version history available"
            />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showRevertConfirm} onOpenChange={setShowRevertConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="text-amber-400" size={20} />
              Confirm Revert
            </DialogTitle>
            <DialogDescription>
              This will replace all current SOV items with the selected version. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {selectedVersion && (
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded">
                <p className="text-sm"><strong>Version:</strong> {format(new Date(selectedVersion.timestamp), 'MMM d, yyyy h:mm a')}</p>
                <p className="text-sm"><strong>User:</strong> {selectedVersion.user}</p>
                <p className="text-sm"><strong>Changes:</strong> {selectedVersion.changes.length} modifications</p>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowRevertConfirm(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => revertMutation.mutate(selectedVersion)}
                  disabled={revertMutation.isPending}
                  className="bg-amber-600 hover:bg-amber-700"
                >
                  Revert to This Version
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}