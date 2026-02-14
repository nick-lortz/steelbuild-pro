import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { History, User, Clock } from 'lucide-react';
import { format } from 'date-fns';

export default function VersionHistory({ changeOrder }) {
  const allVersions = [
    ...(changeOrder.version_history || []),
    {
      version: changeOrder.version || 1,
      changed_by: changeOrder.created_by,
      changed_at: changeOrder.updated_date || changeOrder.created_date,
      changes_summary: changeOrder.version === 1 ? 'Initial creation' : 'Current version',
      snapshot: changeOrder,
      is_current: true
    }
  ].sort((a, b) => b.version - a.version);

  if (allVersions.length <= 1) {
    return (
      <Card className="bg-zinc-950 border-zinc-800">
        <CardContent className="p-8 text-center">
          <History size={32} className="mx-auto mb-3 text-zinc-700" />
          <p className="text-sm text-zinc-500">No version history</p>
          <p className="text-xs text-zinc-600 mt-1">Changes will be tracked here</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-zinc-950 border-zinc-800">
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <History size={16} />
          Version History ({allVersions.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {allVersions.map((ver) => (
          <div 
            key={ver.version} 
            className="p-4 bg-zinc-900/50 border border-zinc-800 rounded relative"
          >
            {ver.is_current && (
              <Badge className="absolute top-2 right-2 bg-green-500/20 text-green-400 border-green-500/30 text-[9px]">
                CURRENT
              </Badge>
            )}
            
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-amber-500/20 rounded-full flex items-center justify-center">
                <span className="text-amber-500 font-bold">v{ver.version}</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{ver.changes_summary || 'Update'}</p>
                <div className="flex items-center gap-3 text-xs text-zinc-500 mt-1">
                  <span className="flex items-center gap-1">
                    <User size={10} />
                    {ver.changed_by}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock size={10} />
                    {format(new Date(ver.changed_at), 'MMM d, yyyy h:mm a')}
                  </span>
                </div>
              </div>
            </div>

            {ver.snapshot && (
              <div className="grid grid-cols-2 gap-3 text-xs border-t border-zinc-800 pt-3 mt-3">
                <div>
                  <p className="text-zinc-600 mb-1">Status</p>
                  <Badge variant="outline" className="text-[9px]">
                    {ver.snapshot.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-zinc-600 mb-1">Cost Impact</p>
                  <p className={`font-semibold ${(ver.snapshot.cost_impact || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {(ver.snapshot.cost_impact || 0) >= 0 ? '+' : ''}${Math.abs(ver.snapshot.cost_impact || 0).toLocaleString()}
                  </p>
                </div>
                {ver.snapshot.schedule_impact_days > 0 && (
                  <div>
                    <p className="text-zinc-600 mb-1">Schedule Impact</p>
                    <p className="text-red-400 font-semibold">+{ver.snapshot.schedule_impact_days} days</p>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}