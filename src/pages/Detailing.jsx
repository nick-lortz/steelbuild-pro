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
  const { activeProjectId, setActiveProjectId } = useActiveProject();
  const queryClient = useQueryClient();
  const [selectedReviewer, setSelectedReviewer] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedDiscipline, setSelectedDiscipline] = useState('all');

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: allProjects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list(),
    staleTime: 5 * 60 * 1000
  });

  const userProjects = useMemo(() => {
    if (!currentUser) return [];
    return currentUser.role === 'admin' 
      ? allProjects 
      : allProjects.filter(p => p.assigned_users?.includes(currentUser?.email));
  }, [currentUser, allProjects]);

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

  const selectedProject = allProjects.find(p => p.id === activeProjectId);

  if (!activeProjectId) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <FileText size={48} className="mx-auto mb-4 text-zinc-700" />
          <h3 className="text-lg font-bold text-white uppercase tracking-wide mb-2">No Project Selected</h3>
          <p className="text-xs text-zinc-600 uppercase tracking-widest">Select a project to view detailing</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Header Bar */}
      <div className="border-b border-zinc-800 bg-black">
        <div className="max-w-[1600px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-white uppercase tracking-wide">Detailing</h1>
              {selectedProject && (
                <p className="text-xs text-zinc-600 font-mono mt-1">{selectedProject.project_number} • {selectedProject.name}</p>
              )}
            </div>
            {userProjects.length > 0 && (
              <Select value={activeProjectId || ''} onValueChange={setActiveProjectId}>
                <SelectTrigger className="w-64 bg-zinc-900 border-zinc-800 text-white">
                  <SelectValue placeholder="Select Project" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  {userProjects.map(project => (
                    <SelectItem key={project.id} value={project.id} className="text-white focus:bg-zinc-800 focus:text-white">
                      {project.project_number} - {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="border-b border-zinc-800 bg-black">
        <div className="max-w-[1600px] mx-auto px-6 py-4">
          <div className="grid grid-cols-4 gap-6">
            <div>
              <div className="text-[10px] text-zinc-600 uppercase tracking-widest mb-1">BLOCKED</div>
              <div className="text-2xl font-bold font-mono text-red-500">{kpis.blocked}</div>
            </div>
            <div>
              <div className="text-[10px] text-zinc-600 uppercase tracking-widest mb-1">DUE IN 3D</div>
              <div className="text-2xl font-bold font-mono text-amber-500">{kpis.dueSoon}</div>
            </div>
            <div>
              <div className="text-[10px] text-zinc-600 uppercase tracking-widest mb-1">IN PROGRESS</div>
              <div className="text-2xl font-bold font-mono text-blue-500">{kpis.inProgress}</div>
            </div>
            <div>
              <div className="text-[10px] text-zinc-600 uppercase tracking-widest mb-1">FFF</div>
              <div className="text-2xl font-bold font-mono text-green-500">{kpis.complete}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1600px] mx-auto px-6 py-6 space-y-6">

        {/* Priority Queue */}
        {priorityQueue.length > 0 && (
          <div className="bg-red-950/20 border border-red-500/30 rounded p-4">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="text-red-500" size={16} />
              <h3 className="text-xs font-bold text-red-400 uppercase tracking-widest">PRIORITY QUEUE</h3>
            </div>
            <div className="space-y-2">
              {priorityQueue.map(ds => {
                const isOverdue = ds.due_date && isPast(parseISO(ds.due_date));
                const daysUntilDue = ds.due_date ? differenceInDays(parseISO(ds.due_date), new Date()) : null;

                return (
                  <div 
                    key={ds.id}
                    className="flex items-center justify-between p-3 bg-zinc-950 border-b border-zinc-800"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <Badge className={cn(
                        "font-mono text-xs font-bold",
                        isOverdue ? "bg-red-500" : "bg-amber-500"
                      )}>
                        {isOverdue ? 'OVD' : `${daysUntilDue}D`}
                      </Badge>
                      <div className="flex-1">
                        <p className="font-semibold text-white text-sm">{ds.set_name}</p>
                        <p className="text-[10px] text-zinc-600 font-mono">
                          {ds.set_number} • R{ds.current_revision || '—'}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs border-zinc-700">
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
                        <SelectTrigger className="w-36 h-8 text-xs bg-zinc-900 border-zinc-800">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-zinc-800">
                          <SelectItem value="unassigned">Unassigned</SelectItem>
                          {users.map(u => (
                            <SelectItem key={u.email} value={u.email}>{u.full_name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button size="sm" variant="outline" className="h-8 gap-1 border-zinc-800 text-white hover:bg-zinc-800 text-xs uppercase">
                        <MessageSquare size={14} />
                        RFI
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Filter */}
        <div className="flex items-center gap-2">
          <Select value={selectedReviewer} onValueChange={setSelectedReviewer}>
            <SelectTrigger className="w-48 bg-zinc-900 border-zinc-800 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-800">
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
              <div key={ds.id} className="bg-zinc-900 border border-zinc-800 rounded hover:border-zinc-700 transition-colors">
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      {/* Status Indicator */}
                      <div className={cn("w-1 h-16 rounded", statusInfo?.color || 'bg-zinc-700')} />

                      {/* Main Info */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-bold text-white">{ds.set_name}</h4>
                          {isOverdue && (
                            <Badge variant="destructive" className="text-xs">
                              <AlertTriangle size={12} className="mr-1" />
                              OVD
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-[10px] text-zinc-600 font-mono">
                          <span>{ds.set_number}</span>
                          <span>•</span>
                          <span>R{ds.current_revision || '—'}</span>
                          <span>•</span>
                          <span>{ds.sheet_count || 0}SH</span>
                          {ds.due_date && (
                            <>
                              <span>•</span>
                              <span className={isOverdue ? 'text-red-500' : ''}>
                                {format(parseISO(ds.due_date), 'MMM d')}
                                {daysUntilDue !== null && ` (${Math.abs(daysUntilDue)}D)`}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Status Badge */}
                      <Badge variant="secondary" className="text-xs px-3 py-1 border-zinc-700">
                        {statusInfo?.label || ds.status}
                      </Badge>

                      {/* Reviewer */}
                      <div className="flex items-center gap-2 min-w-[140px]">
                        <User size={14} className="text-zinc-600" />
                        <Select
                          value={ds.reviewer || 'unassigned'}
                          onValueChange={(val) => assignReviewerMutation.mutate({ 
                            id: ds.id, 
                            reviewer: val === 'unassigned' ? null : val 
                          })}
                        >
                          <SelectTrigger className="h-8 text-xs bg-zinc-950 border-zinc-800 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-zinc-900 border-zinc-800">
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
                            className="bg-amber-500 hover:bg-amber-600 text-black font-bold gap-1 h-8 text-xs uppercase tracking-wider"
                          >
                            {STATUS_FLOW[statusInfo.next]?.label}
                            <ChevronRight size={14} />
                          </Button>
                        )}
                        <Button size="sm" variant="outline" className="h-8 gap-1 border-zinc-800 text-white hover:bg-zinc-800 text-xs uppercase">
                          <MessageSquare size={14} />
                          RFI
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {activePackages.length === 0 && (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <CheckCircle2 size={48} className="mx-auto mb-4 text-green-500" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wide mb-2">All Sets Complete</h3>
              <p className="text-xs text-zinc-600 uppercase tracking-widest">No active drawing sets</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}