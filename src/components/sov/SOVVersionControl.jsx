import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DataTable from '@/components/ui/DataTable';
import { History, RotateCcw, Eye, AlertTriangle, GitCompare, FileText } from 'lucide-react';
import { toast } from '@/components/ui/notifications';
import { format } from 'date-fns';

export default function SOVVersionControl({ projectId, canEdit }) {
  const queryClient = useQueryClient();
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState(null);
  const [compareVersion, setCompareVersion] = useState(null);
  const [showRevertConfirm, setShowRevertConfirm] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);

  const { data: versions = [] } = useQuery({
    queryKey: ['sov-versions', projectId],
    queryFn: () => base44.entities.SOVVersion.filter({ project_id: projectId }, '-version_number'),
    enabled: !!projectId
  });

  const revertMutation = useMutation({
    mutationFn: async (versionData) => {
      const snapshot = JSON.parse(versionData.snapshot_data);
      if (!snapshot) throw new Error('No snapshot available');
      
      // Delete current SOV items
      const current = await base44.entities.SOVItem.filter({ project_id: projectId });
      await Promise.all(current.map(item => base44.entities.SOVItem.delete(item.id)));
      
      // Recreate from snapshot (without id, created_date, etc.)
      const cleanSnapshot = snapshot.map(({ id, created_date, updated_date, created_by, ...rest }) => rest);
      await base44.entities.SOVItem.bulkCreate(cleanSnapshot);
      
      // Create version record for revert
      await base44.functions.invoke('createSOVVersion', {
        project_id: projectId,
        change_type: 'revert',
        change_summary: `Reverted to version ${versionData.version_number}`,
        affected_sov_codes: snapshot.map(s => s.sov_code),
        notes: `Reverted from version ${versions[0]?.version_number || 'current'}`
      });
      
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

  const handleViewDetails = (version) => {
    setSelectedVersion(version);
    setShowDetailDialog(true);
  };

  const handleCompare = (version) => {
    if (compareVersion?.id === version.id) {
      setCompareVersion(null);
    } else {
      setCompareVersion(version);
    }
  };

  const columns = [
    {
      header: 'Version',
      accessor: 'version_number',
      render: (row) => (
        <div className="flex items-center gap-2">
          <span className="font-mono font-bold">v{row.version_number}</span>
          {row.is_current && <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded">Current</span>}
        </div>
      )
    },
    {
      header: 'Date',
      accessor: 'created_date',
      render: (row) => format(new Date(row.created_date), 'MMM d, yyyy h:mm a')
    },
    {
      header: 'User',
      accessor: 'changed_by',
      render: (row) => <span className="text-sm">{row.changed_by}</span>
    },
    {
      header: 'Change Type',
      accessor: 'change_type',
      render: (row) => <span className="capitalize text-sm">{row.change_type.replace('_', ' ')}</span>
    },
    {
      header: 'Summary',
      accessor: 'change_summary',
      render: (row) => <span className="text-sm text-muted-foreground">{row.change_summary}</span>
    },
    {
      header: 'Lines Affected',
      accessor: 'affected_sov_codes',
      render: (row) => <span className="text-sm">{row.affected_sov_codes?.length || 0}</span>
    },
    {
      header: '',
      accessor: 'actions',
      render: (row) => (
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleViewDetails(row)}
            className="text-blue-400 hover:text-blue-300"
          >
            <Eye size={14} className="mr-1" />
            View
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleCompare(row)}
            className={compareVersion?.id === row.id ? 'text-amber-400' : 'text-muted-foreground hover:text-foreground'}
          >
            <GitCompare size={14} className="mr-1" />
            {compareVersion?.id === row.id ? 'Comparing' : 'Compare'}
          </Button>
          {!row.is_current && (
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
          )}
        </div>
      )
    }
  ];

  const renderComparison = () => {
    if (!compareVersion) return null;

    const currentVersion = versions.find(v => v.is_current);
    if (!currentVersion) return null;

    const currentSnapshot = JSON.parse(currentVersion.snapshot_data);
    const compareSnapshot = JSON.parse(compareVersion.snapshot_data);

    const currentMap = new Map(currentSnapshot.map(item => [item.sov_code, item]));
    const compareMap = new Map(compareSnapshot.map(item => [item.sov_code, item]));

    const allCodes = new Set([...currentMap.keys(), ...compareMap.keys()]);
    const differences = [];

    allCodes.forEach(code => {
      const current = currentMap.get(code);
      const compare = compareMap.get(code);

      if (!compare) {
        differences.push({ code, status: 'added', current, compare: null });
      } else if (!current) {
        differences.push({ code, status: 'removed', current: null, compare });
      } else {
        const changes = [];
        if (current.description !== compare.description) changes.push('description');
        if (current.scheduled_value !== compare.scheduled_value) changes.push('scheduled_value');
        if (current.percent_complete !== compare.percent_complete) changes.push('percent_complete');
        if (current.sov_category !== compare.sov_category) changes.push('category');
        
        if (changes.length > 0) {
          differences.push({ code, status: 'modified', current, compare, changes });
        }
      }
    });

    return (
      <Card className="mt-4 bg-amber-500/5 border-amber-500/30">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-sm">
              Comparing: v{currentVersion.version_number} (Current) ↔ v{compareVersion.version_number}
            </h4>
            <Button variant="ghost" size="sm" onClick={() => setCompareVersion(null)}>
              Close Comparison
            </Button>
          </div>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {differences.length === 0 ? (
              <p className="text-sm text-muted-foreground">No differences found</p>
            ) : (
              differences.map((diff, idx) => (
                <div key={idx} className="p-3 bg-card border border-border rounded text-sm">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-mono font-semibold">{diff.code}</span>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        diff.status === 'added' ? 'bg-green-500/20 text-green-400' :
                        diff.status === 'removed' ? 'bg-red-500/20 text-red-400' :
                        'bg-blue-500/20 text-blue-400'
                      }`}>
                        {diff.status}
                      </span>
                    </div>
                  </div>
                  {diff.status === 'modified' && (
                    <div className="space-y-1 text-xs">
                      {diff.changes.includes('description') && (
                        <div>
                          <span className="text-muted-foreground">Description: </span>
                          <span className="line-through text-red-400">{diff.compare.description}</span>
                          <span className="mx-1">→</span>
                          <span className="text-green-400">{diff.current.description}</span>
                        </div>
                      )}
                      {diff.changes.includes('scheduled_value') && (
                        <div>
                          <span className="text-muted-foreground">Scheduled Value: </span>
                          <span className="line-through text-red-400">${diff.compare.scheduled_value}</span>
                          <span className="mx-1">→</span>
                          <span className="text-green-400">${diff.current.scheduled_value}</span>
                        </div>
                      )}
                      {diff.changes.includes('percent_complete') && (
                        <div>
                          <span className="text-muted-foreground">% Complete: </span>
                          <span className="line-through text-red-400">{diff.compare.percent_complete}%</span>
                          <span className="mx-1">→</span>
                          <span className="text-green-400">{diff.current.percent_complete}%</span>
                        </div>
                      )}
                    </div>
                  )}
                  {diff.status === 'added' && (
                    <p className="text-xs text-muted-foreground">{diff.current.description} - ${diff.current.scheduled_value}</p>
                  )}
                  {diff.status === 'removed' && (
                    <p className="text-xs text-muted-foreground">{diff.compare.description} - ${diff.compare.scheduled_value}</p>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderVersionDetail = () => {
    if (!selectedVersion) return null;

    const snapshot = JSON.parse(selectedVersion.snapshot_data);

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Version</p>
            <p className="font-semibold">v{selectedVersion.version_number}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Date</p>
            <p className="font-semibold">{format(new Date(selectedVersion.created_date), 'MMM d, yyyy h:mm a')}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Changed By</p>
            <p className="font-semibold">{selectedVersion.changed_by}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Change Type</p>
            <p className="font-semibold capitalize">{selectedVersion.change_type.replace('_', ' ')}</p>
          </div>
        </div>

        {selectedVersion.change_summary && (
          <div>
            <p className="text-xs text-muted-foreground mb-1">Summary</p>
            <p className="text-sm bg-muted p-2 rounded">{selectedVersion.change_summary}</p>
          </div>
        )}

        {selectedVersion.field_changes && selectedVersion.field_changes.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground mb-2">Field Changes</p>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {selectedVersion.field_changes.map((change, idx) => (
                <div key={idx} className="text-xs bg-muted p-2 rounded">
                  <span className="font-mono font-semibold">{change.sov_code}</span>
                  <span className="mx-2">•</span>
                  <span className="capitalize">{change.field}:</span>
                  <span className="mx-1 line-through text-red-400">{change.old_value}</span>
                  <span className="mx-1">→</span>
                  <span className="text-green-400">{change.new_value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <p className="text-xs text-muted-foreground mb-2">Snapshot ({snapshot.length} lines)</p>
          <div className="border rounded max-h-64 overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted sticky top-0">
                <tr>
                  <th className="text-left p-2">Code</th>
                  <th className="text-left p-2">Description</th>
                  <th className="text-right p-2">Value</th>
                  <th className="text-right p-2">% Complete</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.map((item, idx) => (
                  <tr key={idx} className="border-t">
                    <td className="p-2 font-mono">{item.sov_code}</td>
                    <td className="p-2">{item.description}</td>
                    <td className="p-2 text-right">${item.scheduled_value?.toLocaleString()}</td>
                    <td className="p-2 text-right">{item.percent_complete || 0}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowHistoryDialog(true)}
      >
        <History size={16} className="mr-2" />
        Version History ({versions.length})
      </Button>

      <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>SOV Version History</DialogTitle>
            <DialogDescription>
              Track, compare, and revert SOV changes with full audit trail
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto">
            <DataTable
              columns={columns}
              data={versions}
              emptyMessage="No version history available"
            />
            
            {compareVersion && renderComparison()}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText size={18} />
              Version Details
            </DialogTitle>
          </DialogHeader>
          {renderVersionDetail()}
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
              This will replace all current SOV items with version {selectedVersion?.version_number}. Current state will be saved as a new version. Continue?
            </DialogDescription>
          </DialogHeader>
          {selectedVersion && (
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded space-y-1">
                <p className="text-sm"><strong>Revert to:</strong> v{selectedVersion.version_number}</p>
                <p className="text-sm"><strong>Date:</strong> {format(new Date(selectedVersion.created_date), 'MMM d, yyyy h:mm a')}</p>
                <p className="text-sm"><strong>User:</strong> {selectedVersion.changed_by}</p>
                <p className="text-sm"><strong>Lines:</strong> {selectedVersion.affected_sov_codes?.length || 0} affected</p>
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
                  {revertMutation.isPending ? 'Reverting...' : 'Revert to This Version'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}