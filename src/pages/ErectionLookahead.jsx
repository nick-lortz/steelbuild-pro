import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useActiveProject } from '@/components/shared/hooks/useActiveProject';
import PageHeader from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle2, AlertCircle, AlertTriangle, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import ConstraintPanel from '@/components/lookahead/ConstraintPanel';

export default function ErectionLookahead() {
  const { activeProjectId } = useActiveProject();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('all');
  const [ownerFilter, setOwnerFilter] = useState('all');
  const [selectedTaskId, setSelectedTaskId] = useState(null);

  // Calculate lookahead window (next 14 days)
  const today = new Date();
  const lookaheadEnd = new Date(today);
  lookaheadEnd.setDate(lookaheadEnd.getDate() + 14);
  const todayStr = today.toISOString().split('T')[0];
  const lookaheadEndStr = lookaheadEnd.toISOString().split('T')[0];

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['erectionLookahead', activeProjectId, todayStr, lookaheadEndStr],
    queryFn: async () => {
      if (!activeProjectId) return [];
      
      const tasks = await base44.entities.Task.filter({
        project_id: activeProjectId,
        task_type: 'ERECTION',
        planned_start: { $gte: todayStr, $lte: lookaheadEndStr }
      });

      // Get readiness for all tasks
      const taskIds = tasks.map(t => t.id);
      const readiness = taskIds.length > 0
        ? await base44.entities.ErectionReadiness.filter({ task_id: { $in: taskIds } })
        : [];

      // Get work packages
      const wpIds = [...new Set(tasks.map(t => t.work_package_id).filter(Boolean))];
      const workPackages = wpIds.length > 0
        ? await base44.entities.WorkPackage.filter({ id: { $in: wpIds } })
        : [];

      return tasks.map(t => ({
        ...t,
        readiness: readiness.find(r => r.task_id === t.id),
        work_package: workPackages.find(wp => wp.id === t.work_package_id)
      }));
    },
    enabled: !!activeProjectId,
    refetchInterval: 30000
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      await base44.functions.invoke('syncConstraintsFromProjectEvents', {
        project_id: activeProjectId
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['erectionLookahead'] });
    }
  });

  const filteredTasks = tasks.filter(t => {
    if (statusFilter !== 'all' && t.readiness?.readiness_status !== statusFilter) return false;
    if (ownerFilter !== 'all') {
      // Filter by constraint owner (needs constraint data)
      return true; // Simplified for now
    }
    return true;
  });

  const readyCount = tasks.filter(t => t.readiness?.readiness_status === 'READY').length;
  const notReadyCount = tasks.filter(t => t.readiness?.readiness_status === 'NOT_READY').length;
  const warningsCount = tasks.filter(t => t.readiness?.readiness_status === 'READY_WITH_WARNINGS').length;

  if (!activeProjectId) {
    return (
      <div className="min-h-screen bg-black">
        <PageHeader title="Erection Lookahead" subtitle="Select a project" />
        <div className="max-w-7xl mx-auto px-6 py-6">
          <Card className="p-12 text-center">
            <p className="text-muted-foreground">No project selected</p>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <PageHeader 
        title="Erection Lookahead" 
        subtitle="Next 14 Days"
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
          >
            {syncMutation.isPending ? 'Syncing...' : 'Sync Constraints'}
          </Button>
        }
      />

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Ready</p>
                <p className="text-2xl font-bold text-green-300">{readyCount}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">With Warnings</p>
                <p className="text-2xl font-bold text-amber-300">{warningsCount}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                <Lock className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Not Ready</p>
                <p className="text-2xl font-bold text-red-300">{notReadyCount}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Filters */}
        <Card className="p-4">
          <div className="flex flex-wrap gap-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="READY">Ready</SelectItem>
                  <SelectItem value="NOT_READY">Not Ready</SelectItem>
                  <SelectItem value="READY_WITH_WARNINGS">With Warnings</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Owner Role</label>
              <Select value={ownerFilter} onValueChange={setOwnerFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="PM">PM</SelectItem>
                  <SelectItem value="DETAILING">Detailing</SelectItem>
                  <SelectItem value="FAB">Fabrication</SelectItem>
                  <SelectItem value="FIELD">Field</SelectItem>
                  <SelectItem value="GC">GC</SelectItem>
                  <SelectItem value="INSPECTOR">Inspector</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        {/* Tasks Table */}
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-border">
                <tr className="text-left">
                  <th className="px-4 py-3 text-xs font-semibold text-muted-foreground">Planned Start</th>
                  <th className="px-4 py-3 text-xs font-semibold text-muted-foreground">Task Name</th>
                  <th className="px-4 py-3 text-xs font-semibold text-muted-foreground">Work Package</th>
                  <th className="px-4 py-3 text-xs font-semibold text-muted-foreground">Readiness</th>
                  <th className="px-4 py-3 text-xs font-semibold text-muted-foreground text-center">Blockers</th>
                  <th className="px-4 py-3 text-xs font-semibold text-muted-foreground text-center">Warnings</th>
                  <th className="px-4 py-3 text-xs font-semibold text-muted-foreground">Top Driver</th>
                  <th className="px-4 py-3 text-xs font-semibold text-muted-foreground"></th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                      Loading tasks...
                    </td>
                  </tr>
                ) : filteredTasks.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                      No erection tasks in next 14 days
                    </td>
                  </tr>
                ) : (
                  filteredTasks.map((task) => {
                    const readiness = task.readiness?.readiness_status || 'NOT_READY';
                    const statusConfig = {
                      READY: { icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-500/20' },
                      NOT_READY: { icon: Lock, color: 'text-red-400', bg: 'bg-red-500/20' },
                      READY_WITH_WARNINGS: { icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/20' }
                    };
                    const config = statusConfig[readiness];
                    const Icon = config.icon;

                    return (
                      <tr 
                        key={task.id}
                        className="border-b border-border hover:bg-muted/5 cursor-pointer transition-colors"
                        onClick={() => setSelectedTaskId(task.id)}
                      >
                        <td className="px-4 py-3 text-sm">
                          {new Date(task.planned_start || task.start_date).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium">{task.name}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {task.work_package?.wpid || '-'}
                        </td>
                        <td className="px-4 py-3">
                          <Badge className={cn('text-xs border', config.bg, config.color)}>
                            <Icon className="w-3 h-3 mr-1" />
                            {readiness.replace(/_/g, ' ')}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={cn(
                            'text-sm font-semibold',
                            task.readiness?.blocker_count > 0 ? 'text-red-400' : 'text-muted-foreground'
                          )}>
                            {task.readiness?.blocker_count || 0}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={cn(
                            'text-sm font-semibold',
                            task.readiness?.warning_count > 0 ? 'text-amber-400' : 'text-muted-foreground'
                          )}>
                            {task.readiness?.warning_count || 0}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground truncate max-w-xs">
                          {task.readiness?.drivers?.[0] || '-'}
                        </td>
                        <td className="px-4 py-3">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedTaskId(task.id);
                            }}
                          >
                            View
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {selectedTaskId && (
        <ConstraintPanel
          taskId={selectedTaskId}
          open={!!selectedTaskId}
          onClose={() => setSelectedTaskId(null)}
          projectId={activeProjectId}
        />
      )}
    </div>
  );
}