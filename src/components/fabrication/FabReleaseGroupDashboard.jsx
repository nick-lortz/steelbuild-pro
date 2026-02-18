import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, CheckCircle, Clock, RefreshCw, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

export default function FabReleaseGroupDashboard({ projectId }) {
  const queryClient = useQueryClient();
  const [expandedGroup, setExpandedGroup] = useState(null);

  const { data: releaseGroups = [], isLoading } = useQuery({
    queryKey: ['fab-release-groups', projectId],
    queryFn: () => base44.entities.FabReleaseGroup.filter({ project_id: projectId }),
    enabled: !!projectId
  });

  const { data: readinessItems = [] } = useQuery({
    queryKey: ['fab-readiness-items', projectId],
    queryFn: () => base44.entities.FabReadinessItem.filter({ project_id: projectId }),
    enabled: !!projectId
  });

  const computeReadinessMutation = useMutation({
    mutationFn: (release_group_id) => 
      base44.functions.invoke('computeFabReadiness', { release_group_id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fab-release-groups', projectId] });
    }
  });

  const getGroupItems = (groupId) => {
    return readinessItems.filter(i => i.release_group_id === groupId);
  };

  const getReadinessColor = (score) => {
    if (score >= 90) return 'text-green-400';
    if (score >= 75) return 'text-blue-400';
    if (score >= 50) return 'text-amber-400';
    return 'text-red-400';
  };

  const getStatusColor = (status) => {
    const colors = {
      draft: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
      review: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      released: 'bg-green-500/20 text-green-400 border-green-500/30',
      held: 'bg-red-500/20 text-red-400 border-red-500/30'
    };
    return colors[status] || colors.draft;
  };

  if (isLoading) {
    return <div className="text-zinc-500">Loading release groups...</div>;
  }

  // Sort by sequence priority
  const sortedGroups = [...releaseGroups].sort((a, b) => 
    (a.sequence_priority || 999) - (b.sequence_priority || 999)
  );

  return (
    <div className="space-y-4">
      {sortedGroups.map(group => {
        const items = getGroupItems(group.id);
        const blockers = items.filter(i => i.is_blocker && i.status === 'failed');
        const isExpanded = expandedGroup === group.id;

        return (
          <Card key={group.id} className="border-l-4 border-l-blue-500">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <CardTitle className="text-lg">{group.name}</CardTitle>
                    <Badge className={getStatusColor(group.status)}>
                      {group.status}
                    </Badge>
                    {group.sequence_priority && (
                      <Badge variant="outline" className="text-xs">
                        Priority {group.sequence_priority}
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-zinc-500">
                    <span>Target: {format(new Date(group.target_release_date), 'MMM d, yyyy')}</span>
                    <span>•</span>
                    <span>{items.length} items</span>
                    {blockers.length > 0 && (
                      <>
                        <span>•</span>
                        <span className="text-red-400">{blockers.length} blockers</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className={cn("text-3xl font-bold", getReadinessColor(group.readiness_score))}>
                      {group.readiness_score}%
                    </div>
                    <div className="text-xs text-zinc-500">Readiness</div>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => computeReadinessMutation.mutate(group.id)}
                    disabled={computeReadinessMutation.isPending}
                  >
                    <RefreshCw size={14} className={computeReadinessMutation.isPending ? 'animate-spin' : ''} />
                  </Button>
                </div>
              </div>

              <Progress value={group.readiness_score} className="h-2 mt-3" />
            </CardHeader>

            <CardContent>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setExpandedGroup(isExpanded ? null : group.id)}
                className="mb-3"
              >
                {isExpanded ? 'Hide' : 'Show'} Items ({items.length})
              </Button>

              {isExpanded && (
                <div className="space-y-2 mt-3">
                  {blockers.length > 0 && (
                    <div className="bg-red-950/30 border border-red-500/30 rounded-lg p-3 mb-3">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle size={16} className="text-red-400" />
                        <span className="font-semibold text-sm text-red-400">Blockers</span>
                      </div>
                      {blockers.map(b => (
                        <div key={b.id} className="text-sm text-zinc-400 ml-6">
                          • {b.item_name} ({b.item_type}): {b.status_reason || 'Failed'}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="space-y-2">
                    {items.map(item => (
                      <ReadinessItemRow key={item.id} item={item} />
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      {sortedGroups.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-zinc-500 mb-4">No release groups created yet</p>
            <Button>
              <Plus size={16} className="mr-2" />
              Create Release Group
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ReadinessItemRow({ item }) {
  const statusIcons = {
    ok: <CheckCircle size={14} className="text-green-400" />,
    pending: <Clock size={14} className="text-amber-400" />,
    failed: <AlertTriangle size={14} className="text-red-400" />
  };

  return (
    <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-900/30 border border-zinc-800">
      <div className="flex items-center gap-3 flex-1">
        {statusIcons[item.status]}
        <div className="flex-1">
          <div className="text-sm font-medium text-white">{item.item_name}</div>
          <div className="text-xs text-zinc-500">
            {item.item_type} • Weight: {(item.weight * 100).toFixed(0)}%
            {item.is_blocker && <span className="text-red-400 ml-2">• BLOCKER</span>}
          </div>
        </div>
      </div>
      <Badge variant="outline" className="text-xs">
        {item.status}
      </Badge>
    </div>
  );
}