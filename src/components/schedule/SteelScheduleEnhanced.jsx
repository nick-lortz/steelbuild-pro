import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertTriangle, Lock, MoreVertical, Plus, Search, Filter,
  ArrowUpCircle, Link as LinkIcon, FileText, RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from '@/components/ui/notifications';
import StatusBadge from '@/components/ui/StatusBadge';
import QuickAddTasks from './QuickAddTasks';
import ScheduleImpactsWidget from './ScheduleImpactsWidget';

export default function SteelScheduleEnhanced({ projectId }) {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [areaFilter, setAreaFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [holdFilter, setHoldFilter] = useState('all');
  const [procurementFilter, setProcurementFilter] = useState('all');
  const [selectedTasks, setSelectedTasks] = useState(new Set());
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [linkDialogTask, setLinkDialogTask] = useState(null);
  const [page, setPage] = useState(0);
  const pageSize = 100;

  const { data: tasksData, isLoading } = useQuery({
    queryKey: ['tasks-paginated', projectId, areaFilter, typeFilter, holdFilter, procurementFilter, page],
    queryFn: async () => {
      const filters = {};
      if (areaFilter !== 'all') filters.erection_area = areaFilter;
      if (typeFilter !== 'all') filters.type = typeFilter;
      if (holdFilter !== 'all') filters.hold_area = holdFilter === 'held';
      if (procurementFilter !== 'all') filters.procurement_status = procurementFilter;

      const response = await base44.functions.invoke('listTasksPaginated', {
        project_id: projectId,
        filters,
        limit: pageSize,
        skip: page * pageSize
      });
      return response.data;
    },
    enabled: !!projectId
  });

  const tasks = tasksData?.tasks || [];
  const totalCount = tasksData?.total_count || 0;

  // Get unique areas
  const { data: allTasks = [] } = useQuery({
    queryKey: ['all-tasks-meta', projectId],
    queryFn: () => base44.entities.Task.filter({ project_id: projectId }),
    enabled: !!projectId,
    select: (data) => data
  });

  const areas = useMemo(() => {
    const unique = new Set(allTasks.map(t => t.erection_area).filter(Boolean));
    return Array.from(unique).sort();
  }, [allTasks]);

  // Filtered by search
  const displayTasks = useMemo(() => {
    if (!searchTerm) return tasks;
    const search = searchTerm.toLowerCase();
    return tasks.filter(t =>
      t.name?.toLowerCase().includes(search) ||
      t.erection_area?.toLowerCase().includes(search)
    );
  }, [tasks, searchTerm]);

  const holdAreaMutation = useMutation({
    mutationFn: ({ erection_area, hold, reason }) =>
      base44.functions.invoke('holdArea', { project_id: projectId, erection_area, hold, reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks-paginated'] });
      queryClient.invalidateQueries({ queryKey: ['schedule-impacts'] });
      toast.success('Area hold updated');
    }
  });

  const bulkUpdateMutation = useMutation({
    mutationFn: (updates) =>
      base44.functions.invoke('bulkUpdateTasks', {
        project_id: projectId,
        task_ids: Array.from(selectedTasks),
        updates
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks-paginated'] });
      setSelectedTasks(new Set());
      toast.success('Tasks updated');
    }
  });

  const toggleTaskSelection = (taskId) => {
    const newSet = new Set(selectedTasks);
    if (newSet.has(taskId)) {
      newSet.delete(taskId);
    } else {
      newSet.add(taskId);
    }
    setSelectedTasks(newSet);
  };

  const selectAll = () => {
    setSelectedTasks(new Set(displayTasks.map(t => t.id)));
  };

  const clearSelection = () => {
    setSelectedTasks(new Set());
  };

  return (
    <div className="space-y-6">
      {/* Impacts Widget */}
      <ScheduleImpactsWidget projectId={projectId} />

      {/* Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex-1 relative min-w-64">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search tasks..."
                className="pl-10"
              />
            </div>

            <Select value={areaFilter} onValueChange={setAreaFilter}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Areas</SelectItem>
                {areas.map(area => (
                  <SelectItem key={area} value={area}>{area}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="FAB_COMPLETE">Fab Complete</SelectItem>
                <SelectItem value="SHIP_RELEASE">Ship Release</SelectItem>
                <SelectItem value="ONSITE_DELIVERY">Delivery</SelectItem>
                <SelectItem value="INSTALL_READY">Install Ready</SelectItem>
                <SelectItem value="BOLT_UP">Bolt-Up</SelectItem>
                <SelectItem value="FINAL_WELD">Final Weld</SelectItem>
                <SelectItem value="PUNCHLIST">Punchlist</SelectItem>
              </SelectContent>
            </Select>

            <Select value={holdFilter} onValueChange={setHoldFilter}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="held">Held Only</SelectItem>
                <SelectItem value="active">Active Only</SelectItem>
              </SelectContent>
            </Select>

            <Button onClick={() => setQuickAddOpen(true)}>
              <Plus size={16} className="mr-2" />
              Quick Add
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedTasks.size > 0 && (
        <Card className="border-amber-500/30 bg-amber-950/20">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium">
                {selectedTasks.size} selected
              </span>
              <Button size="sm" variant="outline" onClick={clearSelection}>
                Clear
              </Button>
              <Button size="sm" variant="outline" onClick={selectAll}>
                Select All Page
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => bulkUpdateMutation.mutate({ status: 'in_progress' })}
              >
                Mark In Progress
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => bulkUpdateMutation.mutate({ status: 'completed' })}
              >
                Mark Complete
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Task List */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zinc-900 border-b border-zinc-700 sticky top-0 z-10">
                <tr>
                  <th className="p-3 w-12">
                    <Checkbox
                      checked={selectedTasks.size === displayTasks.length && displayTasks.length > 0}
                      onCheckedChange={(checked) => checked ? selectAll() : clearSelection()}
                    />
                  </th>
                  <th className="text-left p-3 text-zinc-300 font-semibold">SEQ</th>
                  <th className="text-left p-3 text-zinc-300 font-semibold w-80">TASK</th>
                  <th className="text-left p-3 text-zinc-300 font-semibold">AREA</th>
                  <th className="text-left p-3 text-zinc-300 font-semibold">TYPE</th>
                  <th className="text-left p-3 text-zinc-300 font-semibold">STATUS</th>
                  <th className="text-left p-3 text-zinc-300 font-semibold">START</th>
                  <th className="text-left p-3 text-zinc-300 font-semibold">END</th>
                  <th className="text-left p-3 text-zinc-300 font-semibold">PROC</th>
                  <th className="text-left p-3 text-zinc-300 font-semibold">LINKS</th>
                  <th className="w-12"></th>
                </tr>
              </thead>
              <tbody>
                {displayTasks.map(task => {
                  const isSelected = selectedTasks.has(task.id);
                  const isHeld = task.hold_area;
                  const hasOpenRFIs = task.linked_rfi_ids?.length > 0;

                  return (
                    <tr
                      key={task.id}
                      className={cn(
                        "border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors",
                        isHeld && "bg-red-950/10",
                        isSelected && "bg-blue-950/20"
                      )}
                    >
                      <td className="p-3">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleTaskSelection(task.id)}
                        />
                      </td>
                      <td className="p-3 text-zinc-400 font-mono text-xs">
                        {task.install_sequence_number || '-'}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          {isHeld && <Lock size={14} className="text-red-400" />}
                          {hasOpenRFIs && <AlertTriangle size={14} className="text-amber-400" />}
                          <span className="text-white">{task.name}</span>
                        </div>
                        {task.hold_reason && (
                          <div className="text-xs text-red-400 mt-1">{task.hold_reason}</div>
                        )}
                      </td>
                      <td className="p-3 text-zinc-400 text-xs">{task.erection_area || '-'}</td>
                      <td className="p-3">
                        <Badge variant="outline" className="text-xs">
                          {task.type?.replace(/_/g, ' ')}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <StatusBadge status={task.status} />
                      </td>
                      <td className="p-3 text-zinc-300 text-xs">
                        {task.start_date ? format(new Date(task.start_date), 'MM/dd/yy') : '-'}
                      </td>
                      <td className="p-3 text-zinc-300 text-xs">
                        {task.end_date ? format(new Date(task.end_date), 'MM/dd/yy') : '-'}
                      </td>
                      <td className="p-3">
                        <Badge
                          className={cn(
                            "text-xs",
                            task.procurement_status === 'DELIVERED' ? 'bg-green-500/20 text-green-400' :
                            task.procurement_status === 'IN_SHOP' ? 'bg-blue-500/20 text-blue-400' :
                            'bg-zinc-700/20 text-zinc-400'
                          )}
                        >
                          {task.procurement_status?.replace(/_/g, ' ')}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-1">
                          {task.linked_rfi_ids?.length > 0 && (
                            <Badge variant="outline" className="text-xs">
                              {task.linked_rfi_ids.length} RFIs
                            </Badge>
                          )}
                          {task.linked_drawing_set_ids?.length > 0 && (
                            <Badge variant="outline" className="text-xs">
                              {task.linked_drawing_set_ids.length} Dwgs
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="p-3">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-7 w-7">
                              <MoreVertical size={14} />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setLinkDialogTask(task)}>
                              <LinkIcon size={14} className="mr-2" />
                              Link RFIs/Drawings
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {task.erection_area && (
                              <DropdownMenuItem
                                onClick={() => holdAreaMutation.mutate({
                                  erection_area: task.erection_area,
                                  hold: !task.hold_area,
                                  reason: task.hold_area ? '' : 'Manual hold'
                                })}
                              >
                                <Lock size={14} className="mr-2" />
                                {task.hold_area ? 'Release' : 'Hold'} Area
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalCount > pageSize && (
            <div className="flex items-center justify-between p-4 border-t border-zinc-800">
              <div className="text-xs text-zinc-500">
                Showing {page * pageSize + 1}-{Math.min((page + 1) * pageSize, totalCount)} of {totalCount}
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                >
                  Previous
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPage(p => p + 1)}
                  disabled={(page + 1) * pageSize >= totalCount}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Add Dialog */}
      <Sheet open={quickAddOpen} onOpenChange={setQuickAddOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Quick Add Tasks</SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            <QuickAddTasks projectId={projectId} onClose={() => setQuickAddOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}