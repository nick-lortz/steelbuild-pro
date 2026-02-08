import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { History, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function VersionHistory({ changeOrder }) {
  const [viewingVersion, setViewingVersion] = useState(null);
  const versions = changeOrder.version_history || [];
  
  const currentVersion = {
    version: changeOrder.version,
    changed_by: changeOrder.updated_by || changeOrder.created_by,
    changed_at: changeOrder.updated_date || changeOrder.created_date,
    changes_summary: 'Current version',
    snapshot: changeOrder
  };

  const allVersions = [currentVersion, ...versions].sort((a, b) => b.version - a.version);

  const renderDiff = (oldData, newData) => {
    const fields = ['title', 'description', 'cost_impact', 'schedule_impact_days', 'status'];
    const changes = [];

    fields.forEach(field => {
      if (oldData[field] !== newData[field]) {
        changes.push({
          field,
          old: oldData[field],
          new: newData[field]
        });
      }
    });

    return changes;
  };

  return (
    <>
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <History size={16} />
            Version History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {allVersions.length === 0 ? (
            <p className="text-sm text-zinc-500 text-center py-8">
              No version history available
            </p>
          ) : (
            <div className="space-y-3">
              {allVersions.map((version, idx) => (
                <div 
                  key={version.version}
                  className="p-4 bg-zinc-800/50 rounded-lg border border-zinc-700 hover:border-zinc-600 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/30">
                        v{version.version}
                      </Badge>
                      {idx === 0 && (
                        <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/30">
                          Current
                        </Badge>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setViewingVersion(version)}
                      className="text-zinc-400 hover:text-white"
                    >
                      <Eye size={14} className="mr-1" />
                      View
                    </Button>
                  </div>

                  <div className="text-sm space-y-1">
                    <div className="flex items-center gap-2 text-zinc-400">
                      <span className="font-medium">{version.changed_by}</span>
                      <span>•</span>
                      <span>{format(new Date(version.changed_at), 'MMM d, yyyy h:mm a')}</span>
                    </div>
                    {version.changes_summary && (
                      <p className="text-zinc-300 mt-2">{version.changes_summary}</p>
                    )}
                  </div>

                  {idx > 0 && allVersions[idx - 1] && (
                    <div className="mt-3 pt-3 border-t border-zinc-700">
                      <p className="text-xs font-semibold text-zinc-500 mb-2">Changes from v{allVersions[idx - 1].version}:</p>
                      <div className="space-y-1">
                        {renderDiff(version.snapshot, allVersions[idx - 1].snapshot).map((change, cidx) => (
                          <div key={cidx} className="text-xs">
                            <span className="text-zinc-500 capitalize">{change.field.replace(/_/g, ' ')}:</span>{' '}
                            <span className="text-red-400 line-through">{String(change.old)}</span>
                            {' → '}
                            <span className="text-green-400">{String(change.new)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Version Detail Dialog */}
      <Dialog open={!!viewingVersion} onOpenChange={() => setViewingVersion(null)}>
        <DialogContent className="max-w-2xl bg-zinc-900 border-zinc-800 text-white max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Version {viewingVersion?.version} Details
            </DialogTitle>
          </DialogHeader>
          
          {viewingVersion && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-zinc-500">Title</p>
                  <p className="font-medium">{viewingVersion.snapshot.title}</p>
                </div>
                <div>
                  <p className="text-zinc-500">Status</p>
                  <p className="font-medium capitalize">{viewingVersion.snapshot.status}</p>
                </div>
                <div>
                  <p className="text-zinc-500">Cost Impact</p>
                  <p className="font-medium">
                    ${(viewingVersion.snapshot.cost_impact || 0).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-zinc-500">Schedule Impact</p>
                  <p className="font-medium">
                    {viewingVersion.snapshot.schedule_impact_days || 0} days
                  </p>
                </div>
              </div>

              <div>
                <p className="text-zinc-500 text-sm mb-2">Description</p>
                <p className="text-sm bg-zinc-800/50 p-3 rounded whitespace-pre-wrap">
                  {viewingVersion.snapshot.description || 'No description'}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}