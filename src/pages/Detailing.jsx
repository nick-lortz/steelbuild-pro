import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
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
    queryFn: () => base44.entities.Project.list(),
    staleTime: 5 * 60 * 1000
  });

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const userProjects = useMemo(() => {
    if (!currentUser) return [];
    return currentUser.role === 'admin' ? allProjects : allProjects.filter(p => p.assigned_users?.includes(currentUser.email));
  }, [currentUser, allProjects]);

  useEffect(() => {
    if (!activeProjectId) return;
    const unsubscribe = base44.entities.DrawingSet.subscribe((event) => {
      if (event.data?.project_id === activeProjectId) {
        queryClient.invalidateQueries({ queryKey: ['drawing-sets', activeProjectId] });
      }
    });
    return unsubscribe;
  }, [activeProjectId, queryClient]);

  const { data: drawingSets = [], isLoading } = useQuery({
    queryKey: ['drawing-sets', activeProjectId],
    queryFn: () => activeProjectId ? base44.entities.DrawingSet.filter({ project_id: activeProjectId }, 'due_date') : [],
    enabled: !!activeProjectId,
    staleTime: 2 * 60 * 1000
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
    staleTime: 10 * 60 * 1000
  });

  const { data: rfis = [] } = useQuery({
    queryKey: ['rfis', activeProjectId],
    queryFn: () => activeProjectId ? base44.entities.RFI.filter({ project_id: activeProjectId }) : [],
    enabled: !!activeProjectId,
    staleTime: 2 * 60 * 1000
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.DrawingSet.update(id, {
      status,
      [`${status.toLowerCase().replace(/\s+/g, '_').replace('&', 'and')}_date`]: new Date().toISOString().split('T')[0]
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drawing-sets'] });
      toast.success('Status updated');
    }
  });

  const assignReviewerMutation = useMutation({
    mutationFn: ({ id, reviewer }) => base44.entities.DrawingSet.update(id, { reviewer }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drawing-sets'] });
      toast.success('Reviewer assigned');
    }
  });

  const createDrawingSetMutation = useMutation({
    mutationFn: async (data) => {
      const createdSet = await base44.entities.DrawingSet.create(data);
      await base44.entities.DrawingRevision.create({
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
    mutationFn: (id) => base44.entities.DrawingSet.delete(id),
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
            <SelectContent className="bg-zinc-900 border-zinc-800">
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
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-950 to-black">
      {/* Header */}
      <div className="relative border-b-2 border-orange-600 bg-gradient-to-r from-slate-900 to-slate-950 overflow-hidden">
        <div className="absolute inset-0 opacity-5" style={{backgroundImage: 'linear-gradient(45deg, transparent 30%, rgba(255,102,0,0.1) 50%, transparent 70%)'}} />
        <div className="max-w-[1800px] mx-auto px-6 py-5 relative z-10">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-700 rounded-lg flex items-center justify-center border-2 border-orange-400">
                  <FileText className="text-white" size={24} />
                </div>
                <div>
                  <h1 className="text-3xl font-black text-white uppercase tracking-tight" style={{letterSpacing: '-0.02em'}}>DETAILING</h1>
                  <p className="text-xs text-orange-400 font-mono font-bold mt-0.5">{selectedProject?.project_number} — {metrics.total} SETS — {metrics.released} FFF</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Select value={activeProjectId || ''} onValueChange={setActiveProjectId}>
                <SelectTrigger className="w-64 bg-slate-800 border-orange-600/50 text-white h-10 text-sm font-semibold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-orange-600/50">
                  {userProjects.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.project_number} - {p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={() => setShowCreateDialog(true)} className="bg-gradient-to-r from-orange-500 to-orange-700 hover:from-orange-600 hover:to-orange-800 text-white font-bold h-10 text-xs uppercase border border-orange-400 shadow-lg shadow-orange-500/20">
                <Plus size={16} className="mr-1.5" />
                NEW SET
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div className="bg-slate-950 border-b border-slate-800 border-t border-slate-800">
        <div className="max-w-[1800px] mx-auto px-6 py-4">
          <div className="grid grid-cols-6 gap-3">
            <Card className="bg-gradient-to-br from-emerald-600/20 to-slate-900 border-emerald-600/40 border-l-4 border-l-emerald-500 shadow-lg shadow-emerald-500/10">
              <CardContent className="p-3.5">
                <div className="text-[8px] text-emerald-400 uppercase tracking-widest font-black mb-1">RELEASED</div>
                <div className="text-3xl font-black text-emerald-400">{metrics.releasedPercent.toFixed(0)}%</div>
                <div className="text-[9px] text-slate-500 font-mono">{metrics.released}/{metrics.total} FFF</div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-red-600/20 to-slate-900 border-red-600/40 border-l-4 border-l-red-500 shadow-lg shadow-red-500/10">
              <CardContent className="p-3.5">
                <div className="text-[8px] text-red-400 uppercase tracking-widest font-black mb-1">ACTION TODAY</div>
                <div className="text-3xl font-black text-red-400">{metrics.actionToday}</div>
                <div className="text-[9px] text-slate-500 font-mono">Critical status</div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-amber-600/20 to-slate-900 border-amber-600/40 border-l-4 border-l-amber-500 shadow-lg shadow-amber-500/10">
              <CardContent className="p-3.5">
                <div className="text-[8px] text-amber-400 uppercase tracking-widest font-black mb-1">OPEN RFIs</div>
                <div className="text-3xl font-black text-amber-400">{metrics.openRFIs}</div>
                <div className="text-[9px] text-slate-500 font-mono">In progress</div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-blue-600/20 to-slate-900 border-blue-600/40 border-l-4 border-l-blue-500 shadow-lg shadow-blue-500/10">
              <CardContent className="p-3.5">
                <div className="text-[8px] text-blue-400 uppercase tracking-widest font-black mb-1">AVG REVIEW</div>
                <div className="text-3xl font-black text-blue-400">{metrics.avgTurnaround}d</div>
                <div className="text-[9px] text-slate-500 font-mono">Turnaround</div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-orange-600/20 to-slate-900 border-orange-600/40 border-l-4 border-l-orange-500 shadow-lg shadow-orange-500/10">
              <CardContent className="p-3.5">
                <div className="text-[8px] text-orange-400 uppercase tracking-widest font-black mb-1">IN REVIEW</div>
                <div className="text-3xl font-black text-orange-400">{metrics.byZone.external_review}</div>
                <div className="text-[9px] text-slate-500 font-mono">External</div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-rose-600/20 to-slate-900 border-rose-600/40 border-l-4 border-l-rose-500 shadow-lg shadow-rose-500/10">
              <CardContent className="p-3.5">
                <div className="text-[8px] text-rose-400 uppercase tracking-widest font-black mb-1">RETURNED</div>
                <div className="text-3xl font-black text-rose-400">{metrics.byZone.returned}</div>
                <div className="text-[9px] text-slate-500 font-mono">For revision</div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Zone Filter */}
      <div className="bg-slate-950 border-b border-slate-800">
        <div className="max-w-[1800px] mx-auto px-6 py-4">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setSelectedZone('all')}
              className={cn(
                "px-3.5 py-2 rounded-sm font-bold text-xs uppercase tracking-widest transition-all border",
                selectedZone === 'all' ? "bg-orange-600 text-white border-orange-500 shadow-lg shadow-orange-500/30" : "bg-slate-800 text-slate-400 hover:text-white border-slate-700"
              )}
            >
              ALL ({metrics.total})
            </button>
            {Object.entries(CONTROL_ZONES).map(([key, zone]) => {
              const Icon = zone.icon;
              const count = metrics.byZone[key] || 0;
              const isSelected = selectedZone === key;
              return (
                <button
                  key={key}
                  onClick={() => setSelectedZone(key)}
                  className={cn(
                    "px-3.5 py-2 rounded-sm font-bold text-xs uppercase tracking-widest transition-all flex items-center gap-1.5 border",
                    isSelected 
                      ? zone.color + " text-white border-current shadow-lg shadow-opacity-30" 
                      : "bg-slate-800 text-slate-400 hover:text-white border-slate-700"
                  )}
                >
                  <Icon size={12} />
                  {zone.label} ({count})
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[1800px] mx-auto px-6 py-5">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredSets.length === 0 ? (
          <Card className="bg-slate-900 border-slate-800 border-l-4 border-l-emerald-500">
            <CardContent className="p-12 text-center">
              <CheckCircle2 size={64} className="mx-auto mb-4 text-emerald-500/40" />
              <h3 className="text-lg font-black text-white uppercase mb-2" style={{letterSpacing: '0.05em'}}>
                {selectedZone === 'all' ? 'ALL CLEAR' : `ZONE CLEAR`}
              </h3>
              <p className="text-xs text-slate-500 font-mono">{selectedZone === 'all' ? 'No sets pending' : `No sets in ${CONTROL_ZONES[selectedZone]?.label}`}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {filteredSets.map((ds, idx) => {
              const ZoneIcon = CONTROL_ZONES[ds.zone]?.icon;
              return (
                <Card 
                  key={ds.id} 
                  className={cn(
                    "bg-gradient-to-r from-slate-800 to-slate-900 border-l-4 hover:from-slate-700 hover:to-slate-800 transition-all cursor-pointer shadow-md",
                    CONTROL_ZONES[ds.zone]?.border
                  )}
                  onClick={() => setDetailViewSetId(ds.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      {/* Priority Rank */}
                      {idx < 10 && ds.priorityScore > 100 && (
                        <div className="flex flex-col items-center justify-center w-10 h-10 bg-gradient-to-br from-red-600 to-red-800 border-2 border-red-500 rounded font-black text-white text-sm shadow-lg shadow-red-500/40">
                          #{idx + 1}
                        </div>
                      )}

                      {/* Zone Badge */}
                      <Badge className={cn(CONTROL_ZONES[ds.zone]?.color, "text-white text-[10px] px-2.5 py-1 font-black uppercase tracking-wider border")}>
                        <ZoneIcon size={11} className="mr-1" />
                        {CONTROL_ZONES[ds.zone]?.label}
                      </Badge>

                      {/* Drawing Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-black text-white text-sm uppercase tracking-tight">{ds.set_name}</p>
                          {ds.isOverdue && ds.status !== 'FFF' && (
                            <Badge className="bg-red-600 text-white text-[8px] px-2 py-0.5 font-black border border-red-500">OVERDUE</Badge>
                          )}
                          {ds.linkedRFIs.length > 0 && (
                            <Badge className="bg-rose-600/40 text-rose-300 border-rose-500/50 text-[8px] px-2 py-0.5 font-black border">
                              ⚠ {ds.linkedRFIs.length} RFI
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2.5 text-[9px] text-slate-400 font-mono">
                          <span className="text-slate-200 font-bold">{ds.set_number}</span>
                          <span className="text-slate-600">|</span>
                          <span>REV {ds.current_revision || '0'}</span>
                          <span className="text-slate-600">|</span>
                          <span className={ds.isOverdue ? 'text-red-500 font-bold' : ds.isDueSoon ? 'text-amber-500 font-bold' : ''}>
                            DUE {ds.due_date ? format(parseISO(ds.due_date), 'MMM d') : 'N/A'}
                          </span>
                          <span className="text-slate-600">|</span>
                          <span>{ds.sheet_count || 0} SHT</span>
                          <span className="text-slate-600">|</span>
                          <span className={
                            ds.status === 'FFF' ? 'text-emerald-500 font-bold' :
                            ds.daysSinceMovement > 14 ? 'text-red-500 font-bold' : 
                            ds.daysSinceMovement > 7 ? 'text-amber-500 font-bold' : 'text-slate-400'
                          }>
                            {ds.daysSinceMovement}d
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1.5">
                        <Select
                          value={ds.reviewer || 'unassigned'}
                          onValueChange={(val) => assignReviewerMutation.mutate({
                            id: ds.id,
                            reviewer: val === 'unassigned' ? null : val
                          })}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <SelectTrigger className="w-32 h-8 text-[10px] bg-slate-700 border-slate-600 text-slate-100 font-semibold">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-800 border-slate-700">
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
                          <SelectTrigger className="w-36 h-8 text-[10px] bg-gradient-to-r from-orange-700 to-orange-800 border-orange-600 text-white font-bold">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-800 border-slate-700">
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
                          className="h-8 px-2 text-slate-400 hover:text-white hover:bg-slate-700"
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
                          className="h-8 px-2 text-slate-400 hover:text-red-400 hover:bg-red-500/20"
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-zinc-900 border-zinc-800 text-white">
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