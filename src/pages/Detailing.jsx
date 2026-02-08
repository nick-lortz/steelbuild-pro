import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { apiClient } from '@/api/client';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertTriangle,
  Clock,
  CheckCircle2,
  FileText,
  MessageSquare,
  Plus,
  History,
  Inbox,
  Edit3,
  Send,
  RefreshCw,
  Rocket,
  Activity,
  Trash2,
  TrendingUp,
  User
} from 'lucide-react';
import { format, differenceInCalendarDays, isPast, parseISO, isValid } from 'date-fns';
import { toast } from '@/components/ui/notifications';
import { cn } from '@/lib/utils';
import { useActiveProject } from '@/components/shared/hooks/useActiveProject';
import DrawingSetForm from '@/components/drawings/DrawingSetForm';
import RevisionHistory from '@/components/drawings/RevisionHistory';
import DrawingSetDetailDialog from '@/components/drawings/DrawingSetDetailDialog';

const CONTROL_ZONES = {
  'intake': { label: 'Intake', icon: Inbox, color: 'bg-blue-500', border: 'border-blue-500' },
  'active_detailing': { label: 'Active', icon: Edit3, color: 'bg-purple-500', border: 'border-purple-500' },
  'external_review': { label: 'Review', icon: Send, color: 'bg-amber-500', border: 'border-amber-500' },
  'returned': { label: 'Returned', icon: RefreshCw, color: 'bg-red-500', border: 'border-red-500' },
  'released': { label: 'Released', icon: Rocket, color: 'bg-green-500', border: 'border-green-500' }
};

const STATUS_TO_ZONE = {
  'IFA': 'external_review',
  'BFA': 'returned',
  'BFS': 'active_detailing',
  'Revise & Resubmit': 'returned',
  'FFF': 'released',
  'As-Built': 'released'
};

export default function Detailing() {
  const { activeProjectId, setActiveProjectId } = useActiveProject();
  const queryClient = useQueryClient();
  const [selectedZone, setSelectedZone] = useState('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [revisionHistorySetId, setRevisionHistorySetId] = useState(null);
  const [detailViewSetId, setDetailViewSetId] = useState(null);

  const { data: allProjects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => apiClient.entities.Project.list(),
    staleTime: 5 * 60 * 1000
  });

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => apiClient.auth.me()
  });

  const userProjects = useMemo(() => {
    if (!currentUser) return [];
    return currentUser.role === 'admin' ? allProjects : allProjects.filter(p => p.assigned_users?.includes(currentUser.email));
  }, [currentUser, allProjects]);

  useEffect(() => {
    if (!activeProjectId) return;
    const unsubscribe = apiClient.entities.DrawingSet.subscribe((event) => {
      if (event.data?.project_id === activeProjectId) {
        queryClient.invalidateQueries({ queryKey: ['drawing-sets', activeProjectId] });
      }
    });
    return unsubscribe;
  }, [activeProjectId, queryClient]);

  const { data: drawingSets = [], isLoading } = useQuery({
    queryKey: ['drawing-sets', activeProjectId],
    queryFn: () => activeProjectId ? apiClient.entities.DrawingSet.filter({ project_id: activeProjectId }, 'due_date') : [],
    enabled: !!activeProjectId,
    staleTime: 2 * 60 * 1000
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => apiClient.entities.User.list(),
    staleTime: 10 * 60 * 1000
  });

  const { data: rfis = [] } = useQuery({
    queryKey: ['rfis', activeProjectId],
    queryFn: () => activeProjectId ? apiClient.entities.RFI.filter({ project_id: activeProjectId }) : [],
    enabled: !!activeProjectId,
    staleTime: 2 * 60 * 1000
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => apiClient.entities.DrawingSet.update(id, {
      status,
      [`${status.toLowerCase().replace(/\s+/g, '_').replace('&', 'and')}_date`]: new Date().toISOString().split('T')[0]
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drawing-sets'] });
      toast.success('Status updated');
    }
  });

  const assignReviewerMutation = useMutation({
    mutationFn: ({ id, reviewer }) => apiClient.entities.DrawingSet.update(id, { reviewer }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drawing-sets'] });
      toast.success('Reviewer assigned');
    }
  });

  const createDrawingSetMutation = useMutation({
    mutationFn: async (data) => {
      const createdSet = await apiClient.entities.DrawingSet.create(data);
      await apiClient.entities.DrawingRevision.create({
        drawing_set_id: createdSet.id,
        revision_number: data.current_revision || 'Rev 0',
        revision_date: new Date().toISOString().split('T')[0],
        description: 'Initial submission',
        status: data.status || 'IFA',
      });
      return createdSet;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drawing-sets'] });
      setShowCreateDialog(false);
      toast.success('Drawing set created');
    }
  });

  const deleteDrawingSetMutation = useMutation({
    mutationFn: (id) => apiClient.entities.DrawingSet.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drawing-sets'] });
      toast.success('Drawing set deleted');
    }
  });

  const enhancedDrawingSets = useMemo(() => {
    const today = new Date();
    return drawingSets.map(ds => {
      const zone = STATUS_TO_ZONE[ds.status] || 'intake';
      
      let lastMovementDate = null;
      if (ds.bfs_date) lastMovementDate = parseISO(ds.bfs_date);
      else if (ds.bfa_date) lastMovementDate = parseISO(ds.bfa_date);
      else if (ds.ifa_date) lastMovementDate = parseISO(ds.ifa_date);
      else if (ds.created_date) lastMovementDate = parseISO(ds.created_date);
      
      const daysSinceMovement = lastMovementDate && isValid(lastMovementDate) 
        ? differenceInCalendarDays(today, lastMovementDate) : 0;
      
      const dueDate = ds.due_date ? parseISO(ds.due_date) : null;
      const isOverdue = dueDate && isValid(dueDate) && isPast(dueDate);
      const isDueSoon = dueDate && isValid(dueDate) && differenceInCalendarDays(dueDate, today) <= 3 && !isPast(dueDate);
      
      const linkedRFIs = rfis.filter(r => 
        (r.linked_drawing_set_ids || []).includes(ds.id) && !['answered', 'closed'].includes(r.status)
      );
      
      let priorityScore = 0;
      if (isOverdue && zone !== 'released') priorityScore += 1000;
      if (zone === 'returned') priorityScore += 500;
      if (linkedRFIs.length > 0) priorityScore += linkedRFIs.length * 300;
      if (daysSinceMovement > 14) priorityScore += 200;
      else if (daysSinceMovement > 7) priorityScore += 100;
      
      return {
        ...ds,
        zone,
        daysSinceMovement,
        linkedRFIs,
        isOverdue,
        isDueSoon,
        priorityScore
      };
    }).sort((a, b) => b.priorityScore - a.priorityScore);
  }, [drawingSets, rfis]);

  const metrics = useMemo(() => {
    const total = enhancedDrawingSets.length;
    const released = enhancedDrawingSets.filter(ds => ds.zone === 'released').length;
    const actionToday = enhancedDrawingSets.filter(ds => ds.zone === 'returned' || ds.isOverdue).length;
    const openRFIs = rfis.filter(r => !['answered', 'closed'].includes(r.status)).length;
    
    const reviewTimes = enhancedDrawingSets
      .filter(ds => ds.ifa_date && ds.bfa_date)
      .map(ds => {
        const ifa = parseISO(ds.ifa_date);
        const bfa = parseISO(ds.bfa_date);
        return isValid(ifa) && isValid(bfa) ? differenceInCalendarDays(bfa, ifa) : null;
      })
      .filter(t => t !== null && t >= 0);
    
    const avgTurnaround = reviewTimes.length > 0 ? Math.round(reviewTimes.reduce((a, b) => a + b, 0) / reviewTimes.length) : 0;
    
    const byZone = {};
    Object.keys(CONTROL_ZONES).forEach(zone => {
      byZone[zone] = enhancedDrawingSets.filter(ds => ds.zone === zone).length;
    });
    
    return { total, released, releasedPercent: total > 0 ? (released / total * 100) : 0, actionToday, openRFIs, avgTurnaround, byZone };
  }, [enhancedDrawingSets, rfis]);

  const filteredSets = useMemo(() => {
    if (selectedZone === 'all') return enhancedDrawingSets;
    return enhancedDrawingSets.filter(ds => ds.zone === selectedZone);
  }, [enhancedDrawingSets, selectedZone]);

  const selectedProject = allProjects.find(p => p.id === activeProjectId);

  if (!activeProjectId) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center max-w-md">
          <FileText size={64} className="mx-auto mb-4 text-zinc-700" />
          <h3 className="text-xl font-bold text-white uppercase mb-4">Select Project</h3>
          <Select value={activeProjectId || ''} onValueChange={setActiveProjectId}>
            <SelectTrigger className="w-full bg-zinc-900 border-zinc-800 text-white">
              <SelectValue placeholder="Choose project..." />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-800/50">
              {userProjects.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.project_number} - {p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-950 to-black">
      {/* Header */}
      <div className="border-b border-zinc-800/50 bg-gradient-to-b from-zinc-900 to-zinc-950/50">
        <div className="max-w-[1800px] mx-auto px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight">Detailing</h1>
              <p className="text-sm text-zinc-500 font-mono mt-1">{selectedProject?.project_number} • {metrics.total} sets • {metrics.released} FFF</p>
            </div>
            <div className="flex items-center gap-2">
              <Select value={activeProjectId || ''} onValueChange={setActiveProjectId}>
                <SelectTrigger className="w-64 bg-zinc-900 border-zinc-800 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  {userProjects.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.project_number} - {p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={() => setShowCreateDialog(true)} className="bg-amber-500 hover:bg-amber-600 text-black font-bold">
                <Plus size={14} className="mr-1" />
                New Set
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div className="border-b border-zinc-800/50 bg-zinc-950/50">
        <div className="max-w-[1800px] mx-auto px-8 py-4">
          <div className="grid grid-cols-6 gap-4">
            <Card className="bg-zinc-900 border-zinc-800 rounded-lg">
              <CardContent className="p-4">
                <div className="text-[10px] text-green-400 uppercase tracking-wider font-semibold mb-1">Released</div>
                <div className="text-3xl font-bold text-green-400">{metrics.releasedPercent.toFixed(0)}%</div>
                <div className="text-[10px] text-zinc-600">{metrics.released}/{metrics.total}</div>
              </CardContent>
            </Card>
            <Card className="bg-zinc-900 border-zinc-800 rounded-lg">
              <CardContent className="p-4">
                <div className="text-[10px] text-red-400 uppercase tracking-wider font-semibold mb-1">Action Today</div>
                <div className="text-3xl font-bold text-red-400">{metrics.actionToday}</div>
                <div className="text-[10px] text-zinc-600">Need response</div>
              </CardContent>
            </Card>
            <Card className="bg-zinc-900 border-zinc-800 rounded-lg">
              <CardContent className="p-4">
                <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold mb-1">Open RFIs</div>
                <div className="text-3xl font-bold text-blue-400">{metrics.openRFIs}</div>
                <div className="text-[10px] text-zinc-600">Impacting</div>
              </CardContent>
            </Card>
            <Card className="bg-zinc-900 border-zinc-800 rounded-lg">
              <CardContent className="p-4">
                <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold mb-1">Avg Review</div>
                <div className="text-3xl font-bold text-white">{metrics.avgTurnaround}d</div>
                <div className="text-[10px] text-zinc-600">Turnaround</div>
              </CardContent>
            </Card>
            <Card className="bg-zinc-900 border-zinc-800 rounded-lg">
              <CardContent className="p-4">
                <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold mb-1">In Review</div>
                <div className="text-3xl font-bold text-cyan-400">{metrics.byZone.external_review}</div>
                <div className="text-[10px] text-zinc-600">Out for approval</div>
              </CardContent>
            </Card>
            <Card className="bg-zinc-900 border-zinc-800 rounded-lg">
              <CardContent className="p-4">
                <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold mb-1">Returned</div>
                <div className="text-3xl font-bold text-red-500">{metrics.byZone.returned}</div>
                <div className="text-[10px] text-zinc-600">Need revision</div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Zone Filter */}
      <div className="border-b border-zinc-800/50 bg-zinc-950/30">
        <div className="max-w-[1800px] mx-auto px-8 py-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedZone('all')}
              className={cn(
                "px-4 py-1.5 rounded-lg font-bold text-xs uppercase tracking-wider transition-colors",
                selectedZone === 'all' ? "bg-amber-500 text-black" : "bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-700"
              )}
            >
              All ({metrics.total})
            </button>
            {Object.entries(CONTROL_ZONES).map(([key, zone]) => {
              const Icon = zone.icon;
              const count = metrics.byZone[key] || 0;
              return (
                <button
                  key={key}
                  onClick={() => setSelectedZone(key)}
                  className={cn(
                    "px-4 py-1.5 rounded-lg font-bold text-xs uppercase tracking-wider transition-colors flex items-center gap-1.5",
                    selectedZone === key ? zone.color + " text-white shadow-lg" : "bg-zinc-900/50 text-zinc-400 hover:text-white border border-zinc-700/50"
                  )}
                >
                  <Icon size={11} />
                  {zone.label} ({count})
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[1800px] mx-auto px-8 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-sm text-zinc-500">Loading...</p>
            </div>
          </div>
        ) : filteredSets.length === 0 ? (
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-12 text-center">
              <CheckCircle2 size={64} className="mx-auto mb-4 text-green-500/30" />
              <h3 className="text-lg font-bold text-white uppercase mb-2">
                {selectedZone === 'all' ? 'No Sets' : `No Sets in ${CONTROL_ZONES[selectedZone]?.label}`}
              </h3>
              <p className="text-xs text-zinc-600">All clear in this zone</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {filteredSets.map((ds, idx) => {
              const ZoneIcon = CONTROL_ZONES[ds.zone]?.icon;
              return (
                <Card 
                  key={ds.id} 
                  className="bg-zinc-900 border-zinc-800 hover:bg-zinc-800/50 transition-all cursor-pointer rounded-lg"
                  onClick={() => setDetailViewSetId(ds.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      {/* Priority Rank */}
                      {idx < 10 && ds.priorityScore > 100 && (
                        <div className="flex flex-col items-center justify-center w-8 h-8 bg-red-500/20 border border-red-500/30 rounded font-bold text-red-400 text-xs">
                          #{idx + 1}
                        </div>
                      )}

                      {/* Zone Badge */}
                      <Badge className={cn(CONTROL_ZONES[ds.zone]?.color, "text-black text-[10px] px-2 py-0.5 font-bold")}>
                        <ZoneIcon size={10} className="mr-1" />
                        {CONTROL_ZONES[ds.zone]?.label.toUpperCase()}
                      </Badge>

                      {/* Drawing Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="font-bold text-white text-sm">{ds.set_name}</p>
                          {ds.isOverdue && ds.status !== 'FFF' && (
                            <Badge className="bg-red-500 text-white text-[9px] px-1.5 py-0">OVERDUE</Badge>
                          )}
                          {ds.linkedRFIs.length > 0 && (
                            <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-[9px] px-1.5 py-0">
                              {ds.linkedRFIs.length} RFI
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-[10px] text-zinc-500 font-mono">
                          <span className="text-white">{ds.set_number}</span>
                          <span>•</span>
                          <span>R{ds.current_revision || '0'}</span>
                          <span>•</span>
                          <span className={ds.isOverdue ? 'text-red-500 font-bold' : ds.isDueSoon ? 'text-amber-500' : ''}>
                            {ds.due_date ? format(parseISO(ds.due_date), 'MMM d') : 'No due'}
                          </span>
                          <span>•</span>
                          <span>{ds.sheet_count || 0} sheets</span>
                          <span>•</span>
                          <span className={
                            ds.status === 'FFF' ? 'text-green-500' :
                            ds.daysSinceMovement > 14 ? 'text-red-500 font-bold' : 
                            ds.daysSinceMovement > 7 ? 'text-amber-500' : ''
                          }>
                            {ds.daysSinceMovement}d stagnant
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <Select
                          value={ds.reviewer || 'unassigned'}
                          onValueChange={(val) => assignReviewerMutation.mutate({
                            id: ds.id,
                            reviewer: val === 'unassigned' ? null : val
                          })}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <SelectTrigger className="w-32 h-7 text-[10px] bg-zinc-950/50 border-zinc-700/50 rounded-lg">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-zinc-900 border-zinc-800/50">
                            <SelectItem value="unassigned">Unassigned</SelectItem>
                            {users.map(u => (
                              <SelectItem key={u.email} value={u.email}>{u.full_name?.split(' ')[0] || u.email}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <Select
                          value={ds.status}
                          onValueChange={(val) => updateStatusMutation.mutate({ id: ds.id, status: val })}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <SelectTrigger className="w-36 h-7 text-[10px] bg-zinc-950 border-zinc-700">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-zinc-900 border-zinc-800/50">
                            <SelectItem value="IFA">IFA</SelectItem>
                            <SelectItem value="BFA">BFA</SelectItem>
                            <SelectItem value="BFS">BFS</SelectItem>
                            <SelectItem value="Revise & Resubmit">R&R</SelectItem>
                            <SelectItem value="FFF">FFF</SelectItem>
                          </SelectContent>
                        </Select>

                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            setRevisionHistorySetId(ds.id);
                          }}
                          className="h-7 px-2 text-zinc-500 hover:text-white"
                        >
                          <History size={14} />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Delete "${ds.set_name}"?`)) {
                              deleteDrawingSetMutation.mutate(ds.id);
                            }
                          }}
                          className="h-7 px-2 text-zinc-500 hover:text-red-500"
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <RevisionHistory
        drawingSetId={revisionHistorySetId}
        open={!!revisionHistorySetId}
        onOpenChange={(open) => !open && setRevisionHistorySetId(null)}
      />

      <DrawingSetDetailDialog
        drawingSetId={detailViewSetId}
        open={!!detailViewSetId}
        onOpenChange={(open) => !open && setDetailViewSetId(null)}
        users={users}
        rfis={rfis}
      />

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-zinc-950 border-zinc-800/50 text-white rounded-lg">
          <DialogHeader>
            <DialogTitle>New Drawing Set</DialogTitle>
          </DialogHeader>
          <DrawingSetForm
            projectId={activeProjectId}
            onSubmit={(data) => createDrawingSetMutation.mutate(data)}
            onCancel={() => setShowCreateDialog(false)}
            isLoading={createDrawingSetMutation.isPending}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}