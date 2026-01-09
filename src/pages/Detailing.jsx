import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  AlertTriangle, 
  Clock, 
  CheckCircle2, 
  FileText, 
  User, 
  MessageSquare,
  ChevronRight
} from 'lucide-react';
import { format, differenceInDays, isPast, parseISO } from 'date-fns';
import { toast } from '@/components/ui/notifications';
import { cn } from '@/lib/utils';
import { useActiveProject } from '@/components/shared/hooks/useActiveProject';

const STATUS_FLOW = {
  'IFA': { label: 'Issued for Approval', next: 'BFA', color: 'bg-blue-500' },
  'BFA': { label: 'Back from Approval', next: 'BFS', color: 'bg-amber-500' },
  'BFS': { label: 'Back from Scrub', next: 'FFF', color: 'bg-purple-500' },
  'FFF': { label: 'Fit for Fabrication', next: null, color: 'bg-green-500' },
  'As-Built': { label: 'As-Built', next: null, color: 'bg-zinc-500' }
};

export default function Detailing() {
  const { activeProjectId } = useActiveProject();
  const queryClient = useQueryClient();
  const [selectedReviewer, setSelectedReviewer] = useState('all');

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list(),
    staleTime: 5 * 60 * 1000
  });

  const { data: drawingSets = [], isLoading } = useQuery({
    queryKey: ['drawing-sets', activeProjectId],
    queryFn: () => activeProjectId 
      ? base44.entities.DrawingSet.filter({ project_id: activeProjectId }, 'due_date')
      : [],
    enabled: !!activeProjectId,
    staleTime: 2 * 60 * 1000
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const allUsers = await base44.entities.User.list();
      return allUsers;
    },
    staleTime: 10 * 60 * 1000
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.DrawingSet.update(id, { 
      status,
      [`${status.toLowerCase()}_date`]: new Date().toISOString().split('T')[0]
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drawing-sets'] });
      toast.success('Status updated');
    },
    onError: () => toast.error('Update failed')
  });

  const assignReviewerMutation = useMutation({
    mutationFn: ({ id, reviewer }) => base44.entities.DrawingSet.update(id, { reviewer }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drawing-sets'] });
      toast.success('Reviewer assigned');
    },
    onError: () => toast.error('Assignment failed')
  });

  // KPIs
  const kpis = useMemo(() => {
    if (!drawingSets.length) return { blocked: 0, dueSoon: 0, inProgress: 0, complete: 0 };

    const today = new Date();
    const blocked = drawingSets.filter(ds => 
      ds.status === 'BFA' && ds.due_date && differenceInDays(parseISO(ds.due_date), today) < 0
    ).length;

    const dueSoon = drawingSets.filter(ds => 
      ds.status !== 'FFF' && 
      ds.due_date && 
      differenceInDays(parseISO(ds.due_date), today) <= 3 && 
      differenceInDays(parseISO(ds.due_date), today) >= 0
    ).length;

    const inProgress = drawingSets.filter(ds => 
      ds.status === 'IFA' || ds.status === 'BFS'
    ).length;

    const complete = drawingSets.filter(ds => ds.status === 'FFF').length;

    return { blocked, dueSoon, inProgress, complete };
  }, [drawingSets]);

  // Priority Queue (Blocked + Due Soon)
  const priorityQueue = useMemo(() => {
    const today = new Date();
    return drawingSets.filter(ds => {
      if (ds.status === 'FFF') return false;
      
      const isBlocked = ds.status === 'BFA' && ds.due_date && isPast(parseISO(ds.due_date));
      const isDueSoon = ds.due_date && differenceInDays(parseISO(ds.due_date), today) <= 3 && !isPast(parseISO(ds.due_date));
      
      return isBlocked || isDueSoon;
    }).sort((a, b) => {
      // Sort: overdue first, then by due date
      const aDate = a.due_date ? parseISO(a.due_date) : new Date(9999, 0);
      const bDate = b.due_date ? parseISO(b.due_date) : new Date(9999, 0);
      const aOverdue = isPast(aDate);
      const bOverdue = isPast(bDate);
      
      if (aOverdue !== bOverdue) return aOverdue ? -1 : 1;
      return aDate - bDate;
    });
  }, [drawingSets]);

  // Active Work Packages
  const activePackages = useMemo(() => {
    let filtered = drawingSets.filter(ds => ds.status !== 'FFF');
    
    if (selectedReviewer !== 'all') {
      filtered = filtered.filter(ds => ds.reviewer === selectedReviewer);
    }

    return filtered.sort((a, b) => {
      const aDate = a.due_date ? parseISO(a.due_date) : new Date(9999, 0);
      const bDate = b.due_date ? parseISO(b.due_date) : new Date(9999, 0);
      return aDate - bDate;
    });
  }, [drawingSets, selectedReviewer]);

  const selectedProject = projects.find(p => p.id === activeProjectId);

  if (!activeProjectId) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <FileText size={48} className="mx-auto mb-4 text-zinc-600" />
          <h3 className="text-xl font-semibold mb-2">No Project Selected</h3>
          <p className="text-zinc-400">Select a project to view detailing workflow.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Detailing Workflow</h1>
          {selectedProject && (
            <p className="text-sm text-zinc-400">
              {selectedProject.project_number} - {selectedProject.name}
            </p>
          )}
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-4 gap-3">
        <Card className="bg-red-900/20 border-red-500/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-zinc-400 mb-1">Blocked / Overdue</p>
                <p className="text-3xl font-bold text-red-400">{kpis.blocked}</p>
              </div>
              <AlertTriangle className="text-red-400" size={32} />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-amber-900/20 border-amber-500/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-zinc-400 mb-1">Due in 3 Days</p>
                <p className="text-3xl font-bold text-amber-400">{kpis.dueSoon}</p>
              </div>
              <Clock className="text-amber-400" size={32} />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-blue-900/20 border-blue-500/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-zinc-400 mb-1">In Progress</p>
                <p className="text-3xl font-bold text-blue-400">{kpis.inProgress}</p>
              </div>
              <FileText className="text-blue-400" size={32} />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-green-900/20 border-green-500/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-zinc-400 mb-1">Complete (FFF)</p>
                <p className="text-3xl font-bold text-green-400">{kpis.complete}</p>
              </div>
              <CheckCircle2 className="text-green-400" size={32} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Priority Queue */}
      {priorityQueue.length > 0 && (
        <Card className="bg-red-900/10 border-red-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="text-red-400" size={20} />
              <h3 className="font-bold text-red-400">Priority: Blocked / Due Soon</h3>
            </div>
            <div className="space-y-2">
              {priorityQueue.map(ds => {
                const isOverdue = ds.due_date && isPast(parseISO(ds.due_date));
                const daysUntilDue = ds.due_date ? differenceInDays(parseISO(ds.due_date), new Date()) : null;

                return (
                  <div 
                    key={ds.id}
                    className="flex items-center justify-between p-3 bg-zinc-900/50 rounded-lg border border-zinc-800"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <Badge className={cn(
                        "font-mono text-xs",
                        isOverdue ? "bg-red-500" : "bg-amber-500"
                      )}>
                        {isOverdue ? 'OVERDUE' : `${daysUntilDue}d`}
                      </Badge>
                      <div className="flex-1">
                        <p className="font-semibold">{ds.set_name}</p>
                        <p className="text-xs text-zinc-400">
                          {ds.set_number} • Rev {ds.current_revision || '—'}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {STATUS_FLOW[ds.status]?.label || ds.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Select
                        value={ds.reviewer || 'unassigned'}
                        onValueChange={(val) => assignReviewerMutation.mutate({ 
                          id: ds.id, 
                          reviewer: val === 'unassigned' ? null : val 
                        })}
                      >
                        <SelectTrigger className="w-36 h-8 text-xs bg-zinc-800 border-zinc-700">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-zinc-700">
                          <SelectItem value="unassigned">Unassigned</SelectItem>
                          {users.map(u => (
                            <SelectItem key={u.email} value={u.email}>{u.full_name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button size="sm" variant="outline" className="h-8 gap-1">
                        <MessageSquare size={14} />
                        RFI
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filter */}
      <div className="flex items-center gap-2">
        <Select value={selectedReviewer} onValueChange={setSelectedReviewer}>
          <SelectTrigger className="w-48 bg-zinc-900 border-zinc-800">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-700">
            <SelectItem value="all">All Reviewers</SelectItem>
            {users.map(u => (
              <SelectItem key={u.email} value={u.email}>{u.full_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Active Work Packages */}
      <div className="space-y-2">
        {activePackages.map(ds => {
          const statusInfo = STATUS_FLOW[ds.status];
          const daysUntilDue = ds.due_date ? differenceInDays(parseISO(ds.due_date), new Date()) : null;
          const isOverdue = daysUntilDue !== null && daysUntilDue < 0;

          return (
            <Card key={ds.id} className="bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    {/* Status Indicator */}
                    <div className={cn("w-1 h-16 rounded-full", statusInfo?.color || 'bg-zinc-700')} />

                    {/* Main Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-bold">{ds.set_name}</h4>
                        {isOverdue && (
                          <Badge variant="destructive" className="text-xs">
                            <AlertTriangle size={12} className="mr-1" />
                            Overdue
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-zinc-400">
                        <span className="font-mono">{ds.set_number}</span>
                        <span>•</span>
                        <span>Rev {ds.current_revision || '—'}</span>
                        <span>•</span>
                        <span>{ds.sheet_count || 0} sheets</span>
                        {ds.due_date && (
                          <>
                            <span>•</span>
                            <span className={isOverdue ? 'text-red-400 font-semibold' : ''}>
                              Due {format(parseISO(ds.due_date), 'MMM d')}
                              {daysUntilDue !== null && ` (${Math.abs(daysUntilDue)}d)`}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Status Badge */}
                    <Badge variant="secondary" className="text-xs px-3 py-1">
                      {statusInfo?.label || ds.status}
                    </Badge>

                    {/* Reviewer */}
                    <div className="flex items-center gap-2 min-w-[140px]">
                      <User size={14} className="text-zinc-500" />
                      <Select
                        value={ds.reviewer || 'unassigned'}
                        onValueChange={(val) => assignReviewerMutation.mutate({ 
                          id: ds.id, 
                          reviewer: val === 'unassigned' ? null : val 
                        })}
                      >
                        <SelectTrigger className="h-8 text-xs bg-zinc-800 border-zinc-700">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-zinc-700">
                          <SelectItem value="unassigned">Unassigned</SelectItem>
                          {users.map(u => (
                            <SelectItem key={u.email} value={u.email}>{u.full_name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {statusInfo?.next && (
                        <Button 
                          size="sm" 
                          onClick={() => updateStatusMutation.mutate({ id: ds.id, status: statusInfo.next })}
                          className="bg-amber-500 hover:bg-amber-600 text-black gap-1 h-8"
                        >
                          {STATUS_FLOW[statusInfo.next]?.label}
                          <ChevronRight size={14} />
                        </Button>
                      )}
                      <Button size="sm" variant="outline" className="h-8 gap-1">
                        <MessageSquare size={14} />
                        RFI
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {activePackages.length === 0 && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-12 text-center">
            <CheckCircle2 size={48} className="mx-auto mb-4 text-green-400" />
            <h3 className="text-xl font-semibold mb-2">All Sets Complete</h3>
            <p className="text-zinc-400">No active drawing sets in workflow.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}