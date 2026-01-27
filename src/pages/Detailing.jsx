// Build cache clear
import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertTriangle,
  Clock,
  CheckCircle2,
  FileText,
  User,
  MessageSquare,
  ChevronRight,
  Plus,
  History,
  Inbox,
  Edit3,
  Send,
  RefreshCw,
  Rocket,
  Ban,
  ExternalLink,
  TrendingUp,
  Activity } from
'lucide-react';
import { format, differenceInDays, differenceInCalendarDays, isPast, parseISO, isValid } from 'date-fns';
import { toast } from '@/components/ui/notifications';
import { cn } from '@/lib/utils';
import { useActiveProject } from '@/components/shared/hooks/useActiveProject';
import DrawingSetForm from '@/components/drawings/DrawingSetForm';
import BatchActionsPanel from '@/components/drawings/BatchActionsPanel';
import RevisionHistory from '@/components/drawings/RevisionHistory';

// CONTROL ZONES - Production Control System
const CONTROL_ZONES = {
  'intake': { 
    label: 'Intake / New Set', 
    icon: Inbox, 
    color: 'bg-blue-500',
    borderColor: 'border-blue-500',
    description: 'New sets entering detailing workflow'
  },
  'active_detailing': { 
    label: 'Active Detailing', 
    icon: Edit3, 
    color: 'bg-purple-500',
    borderColor: 'border-purple-500',
    description: 'Currently being detailed'
  },
  'external_review': { 
    label: 'External Review', 
    icon: Send, 
    color: 'bg-amber-500',
    borderColor: 'border-amber-500',
    description: 'Out for approval or review'
  },
  'returned': { 
    label: 'Returned – Action Required', 
    icon: RefreshCw, 
    color: 'bg-red-500',
    borderColor: 'border-red-500',
    description: 'Returned with comments - action needed'
  },
  'released': { 
    label: 'Released / Fabrication Ready', 
    icon: Rocket, 
    color: 'bg-green-500',
    borderColor: 'border-green-500',
    description: 'Approved for fabrication'
  }
};

// ACTION STATUSES - What needs to happen next
const ACTION_STATUSES = {
  'action_today': { 
    label: 'Action Required Today', 
    icon: AlertTriangle, 
    color: 'bg-red-500',
    severity: 'critical'
  },
  'waiting_external': { 
    label: 'Waiting on External Party', 
    icon: ExternalLink, 
    color: 'bg-amber-500',
    severity: 'medium'
  },
  'blocked': { 
    label: 'Blocked (RFI / Missing Info)', 
    icon: Ban, 
    color: 'bg-red-600',
    severity: 'critical'
  },
  'clear': { 
    label: 'Clear / No Action Needed', 
    icon: CheckCircle2, 
    color: 'bg-green-500',
    severity: 'low'
  }
};

// Map legacy statuses to control zones
const STATUS_TO_ZONE = {
  'IFA': 'external_review',
  'BFA': 'returned',
  'BFS': 'active_detailing',
  'FFF': 'released',
  'As-Built': 'released'
};

export default function Detailing() {
  const { activeProjectId, setActiveProjectId } = useActiveProject();
  const queryClient = useQueryClient();
  const [selectedReviewer, setSelectedReviewer] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedDiscipline, setSelectedDiscipline] = useState('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedSets, setSelectedSets] = useState([]);
  const [revisionHistorySetId, setRevisionHistorySetId] = useState(null);

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: allProjects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list(),
    staleTime: 5 * 60 * 1000
  });

  const userProjects = useMemo(() => {
    if (!currentUser) return [];
    return currentUser.role === 'admin' ?
    allProjects :
    allProjects.filter((p) => p.assigned_users?.includes(currentUser?.email));
  }, [currentUser, allProjects]);

  const { data: drawingSets = [], isLoading } = useQuery({
    queryKey: ['drawing-sets', activeProjectId],
    queryFn: () => activeProjectId ?
    base44.entities.DrawingSet.filter({ project_id: activeProjectId }, 'due_date') :
    [],
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

  const { data: rfis = [] } = useQuery({
    queryKey: ['rfis', activeProjectId],
    queryFn: () => activeProjectId ?
      base44.entities.RFI.filter({ project_id: activeProjectId }) :
      [],
    enabled: !!activeProjectId,
    staleTime: 2 * 60 * 1000
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

  const createDrawingSetMutation = useMutation({
    mutationFn: async (data) => {
      const createdSet = await base44.entities.DrawingSet.create(data);
      
      // Create initial revision
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
    },
    onError: () => toast.error('Creation failed')
  });

  const batchUpdateMutation = useMutation({
    mutationFn: async (updateData) => {
      const promises = selectedSets.map(id => 
        base44.entities.DrawingSet.update(id, updateData)
      );
      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drawing-sets'] });
      setSelectedSets([]);
      toast.success('Batch update complete');
    },
    onError: () => toast.error('Batch update failed')
  });

  const handleSelectSet = (setId, checked) => {
    if (checked) {
      setSelectedSets(prev => [...prev, setId]);
    } else {
      setSelectedSets(prev => prev.filter(id => id !== setId));
    }
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedSets(filteredSets.map(ds => ds.id));
    } else {
      setSelectedSets([]);
    }
  };

  // Enhanced Drawing Sets with Control Zone and Action Status
  const enhancedDrawingSets = useMemo(() => {
    const today = new Date();
    
    return drawingSets.map(ds => {
      // Determine control zone
      const zone = STATUS_TO_ZONE[ds.status] || 'intake';
      
      // Calculate days since last movement
      let lastMovementDate = null;
      if (ds.bfs_date) lastMovementDate = parseISO(ds.bfs_date);
      else if (ds.bfa_date) lastMovementDate = parseISO(ds.bfa_date);
      else if (ds.ifa_date) lastMovementDate = parseISO(ds.ifa_date);
      else if (ds.created_date) lastMovementDate = parseISO(ds.created_date);
      
      const daysSinceMovement = lastMovementDate && isValid(lastMovementDate) 
        ? differenceInCalendarDays(today, lastMovementDate) 
        : 0;
      
      // Determine action status
      let actionStatus = 'clear';
      const dueDate = ds.due_date ? parseISO(ds.due_date) : null;
      const isOverdue = dueDate && isValid(dueDate) && isPast(dueDate);
      const isDueSoon = dueDate && isValid(dueDate) && differenceInCalendarDays(dueDate, today) <= 3 && !isPast(dueDate);
      
      // Check for linked RFIs
      const linkedRFIs = rfis.filter(r => 
        r.linked_drawing_set_id === ds.id && 
        !['answered', 'closed'].includes(r.status)
      );
      
      if (linkedRFIs.length > 0) {
        actionStatus = 'blocked';
      } else if (zone === 'returned' || (isOverdue && zone !== 'released')) {
        actionStatus = 'action_today';
      } else if (zone === 'external_review') {
        actionStatus = 'waiting_external';
      } else if (zone === 'released') {
        actionStatus = 'clear';
      } else if (isDueSoon) {
        actionStatus = 'action_today';
      }
      
      // Determine next owner
      let nextOwner = 'Unassigned';
      if (actionStatus === 'waiting_external') {
        nextOwner = 'External Reviewer';
      } else if (ds.reviewer) {
        nextOwner = users.find(u => u.email === ds.reviewer)?.full_name || ds.reviewer;
      }
      
      // Calculate fabrication impact (days until fab needs it)
      const fabImpactDays = dueDate && isValid(dueDate) ? differenceInCalendarDays(dueDate, today) : 999;
      
      return {
        ...ds,
        zone,
        actionStatus,
        daysSinceMovement,
        nextOwner,
        linkedRFIs,
        isOverdue,
        isDueSoon,
        fabImpactDays
      };
    });
  }, [drawingSets, rfis, users]);

  // Dashboard KPIs
  const dashboardMetrics = useMemo(() => {
    if (!enhancedDrawingSets.length) {
      return {
        releasedPercent: 0,
        openRFIsImpactingDetailing: 0,
        avgReviewTurnaround: 0,
        bottleneckDiscipline: 'None',
        bottleneckReviewer: 'None',
        zoneBreakdown: {},
        actionBreakdown: {}
      };
    }
    
    const total = enhancedDrawingSets.length;
    const released = enhancedDrawingSets.filter(ds => ds.zone === 'released').length;
    const releasedPercent = total > 0 ? (released / total * 100) : 0;
    
    const openRFIsImpactingDetailing = rfis.filter(r => 
      !['answered', 'closed'].includes(r.status) &&
      enhancedDrawingSets.some(ds => ds.id === r.linked_drawing_set_id)
    ).length;
    
    // Calculate average review turnaround (IFA to BFA)
    const reviewTimes = enhancedDrawingSets
      .filter(ds => ds.ifa_date && ds.bfa_date)
      .map(ds => {
        try {
          const ifa = parseISO(ds.ifa_date);
          const bfa = parseISO(ds.bfa_date);
          if (isValid(ifa) && isValid(bfa)) {
            return differenceInCalendarDays(bfa, ifa);
          }
        } catch {
          return null;
        }
        return null;
      })
      .filter(t => t !== null && t >= 0);
    
    const avgReviewTurnaround = reviewTimes.length > 0 
      ? Math.round(reviewTimes.reduce((a, b) => a + b, 0) / reviewTimes.length) 
      : 0;
    
    // Find bottleneck discipline (most sets not released)
    const disciplineCounts = {};
    enhancedDrawingSets
      .filter(ds => ds.zone !== 'released')
      .forEach(ds => {
        const disc = ds.discipline || 'unknown';
        disciplineCounts[disc] = (disciplineCounts[disc] || 0) + 1;
      });
    const bottleneckDiscipline = Object.keys(disciplineCounts).length > 0
      ? Object.entries(disciplineCounts).sort((a, b) => b[1] - a[1])[0][0]
      : 'None';
    
    // Find bottleneck reviewer (most sets assigned)
    const reviewerCounts = {};
    enhancedDrawingSets
      .filter(ds => ds.reviewer && ds.zone !== 'released')
      .forEach(ds => {
        reviewerCounts[ds.reviewer] = (reviewerCounts[ds.reviewer] || 0) + 1;
      });
    const bottleneckReviewer = Object.keys(reviewerCounts).length > 0
      ? Object.entries(reviewerCounts).sort((a, b) => b[1] - a[1])[0][0]
      : 'None';
    
    // Zone breakdown
    const zoneBreakdown = {};
    Object.keys(CONTROL_ZONES).forEach(zone => {
      zoneBreakdown[zone] = enhancedDrawingSets.filter(ds => ds.zone === zone).length;
    });
    
    // Action breakdown
    const actionBreakdown = {};
    Object.keys(ACTION_STATUSES).forEach(action => {
      actionBreakdown[action] = enhancedDrawingSets.filter(ds => ds.actionStatus === action).length;
    });
    
    return {
      releasedPercent,
      openRFIsImpactingDetailing,
      avgReviewTurnaround,
      bottleneckDiscipline,
      bottleneckReviewer,
      zoneBreakdown,
      actionBreakdown
    };
  }, [enhancedDrawingSets, rfis]);

  // PRIORITY QUEUE ENGINE - Automated ranking based on multiple factors
  const priorityQueue = useMemo(() => {
    return enhancedDrawingSets
      .filter(ds => ds.zone !== 'released')
      .map(ds => {
        let priorityScore = 0;
        
        // Factor 1: Fabrication impact (closer due date = higher priority)
        if (ds.fabImpactDays <= 0) priorityScore += 1000; // Overdue
        else if (ds.fabImpactDays <= 3) priorityScore += 500; // Due within 3 days
        else if (ds.fabImpactDays <= 7) priorityScore += 200; // Due within week
        else priorityScore += Math.max(0, 100 - ds.fabImpactDays);
        
        // Factor 2: Returned from review status (needs immediate action)
        if (ds.zone === 'returned') priorityScore += 400;
        
        // Factor 3: Open RFIs (blocking)
        priorityScore += ds.linkedRFIs.length * 300;
        
        // Factor 4: Days stagnant (longer stagnant = higher priority)
        if (ds.daysSinceMovement > 14) priorityScore += 200;
        else if (ds.daysSinceMovement > 7) priorityScore += 100;
        else if (ds.daysSinceMovement > 3) priorityScore += 50;
        
        // Factor 5: Action status severity
        if (ds.actionStatus === 'blocked') priorityScore += 350;
        else if (ds.actionStatus === 'action_today') priorityScore += 250;
        
        return { ...ds, priorityScore };
      })
      .sort((a, b) => b.priorityScore - a.priorityScore)
      .slice(0, 10); // Top 10 priority items
  }, [enhancedDrawingSets]);

  // Filtered sets by zone/filters
  const filteredSets = useMemo(() => {
    let filtered = enhancedDrawingSets;

    if (selectedReviewer !== 'all') {
      filtered = filtered.filter((ds) => ds.reviewer === selectedReviewer);
    }
    if (selectedStatus !== 'all') {
      filtered = filtered.filter((ds) => ds.status === selectedStatus);
    }
    if (selectedDiscipline !== 'all') {
      filtered = filtered.filter((ds) => ds.discipline === selectedDiscipline);
    }

    return filtered.sort((a, b) => b.priorityScore || 0 - (a.priorityScore || 0));
  }, [enhancedDrawingSets, selectedReviewer, selectedStatus, selectedDiscipline]);

  // Group by control zone
  const setsByZone = useMemo(() => {
    const grouped = {};
    Object.keys(CONTROL_ZONES).forEach(zone => {
      grouped[zone] = filteredSets.filter(ds => ds.zone === zone);
    });
    return grouped;
  }, [filteredSets]);

  const selectedProject = allProjects.find((p) => p.id === activeProjectId);

  return (
    <div className="flex flex-col min-h-screen bg-black">
      {/* Header Bar - Always visible */}
      <div className="border-b border-zinc-800 bg-black">
        <div className="max-w-[1600px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-white uppercase tracking-wide">Detailing</h1>
              {selectedProject &&
              <p className="text-xs text-zinc-600 font-mono mt-1">{selectedProject.project_number} • {selectedProject.name}</p>
              }
            </div>
            <div className="flex items-center gap-3">
              <label className="text-xs text-zinc-400 uppercase tracking-widest font-bold">PROJECT:</label>
              <Select value={activeProjectId || ''} onValueChange={setActiveProjectId}>
                <SelectTrigger className="w-64 bg-zinc-900 border-zinc-700 text-white">
                  <SelectValue placeholder="Select a project..." />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  {userProjects.length === 0 ?
                  <div className="p-2 text-xs text-zinc-500">No projects assigned</div> :

                  userProjects.map((project) =>
                  <SelectItem key={project.id} value={project.id} className="text-white focus:bg-zinc-800 focus:text-white">
                        {project.project_number} - {project.name}
                      </SelectItem>
                  )
                  }
                </SelectContent>
              </Select>
              {activeProjectId && (
                <Button 
                  onClick={() => setShowCreateDialog(true)}
                  className="bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs uppercase tracking-wider h-9 px-4"
                >
                  <Plus size={16} className="mr-2" />
                  NEW SET
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !activeProjectId ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <FileText size={48} className="mx-auto mb-4 text-zinc-700" />
            <h3 className="text-lg font-bold text-white uppercase tracking-wide mb-2">No Project Selected</h3>
            <p className="text-slate-50 text-xs uppercase tracking-widest">SELECT A PROJECT TO VIEW DETAILING</p>
          </div>
        </div>
      ) : (
        <>
          {/* DETAILING DASHBOARD */}
          <div className="border-b border-zinc-800 bg-black">
            <div className="max-w-[1600px] mx-auto px-6 py-4">
              <div className="grid grid-cols-6 gap-4">
                <Card className="bg-zinc-900 border-zinc-800">
                  <CardContent className="p-4">
                    <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1 flex items-center gap-1">
                      <Rocket size={10} />
                      % Released
                    </div>
                    <div className="text-2xl font-bold font-mono text-green-500">
                      {dashboardMetrics.releasedPercent.toFixed(0)}%
                    </div>
                    <div className="text-[10px] text-zinc-600 mt-1">
                      {dashboardMetrics.zoneBreakdown.released || 0} / {enhancedDrawingSets.length}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-zinc-900 border-zinc-800">
                  <CardContent className="p-4">
                    <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1 flex items-center gap-1">
                      <MessageSquare size={10} />
                      Open RFIs
                    </div>
                    <div className="text-2xl font-bold font-mono text-red-500">
                      {dashboardMetrics.openRFIsImpactingDetailing}
                    </div>
                    <div className="text-[10px] text-zinc-600 mt-1">Impacting detailing</div>
                  </CardContent>
                </Card>

                <Card className="bg-zinc-900 border-zinc-800">
                  <CardContent className="p-4">
                    <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1 flex items-center gap-1">
                      <Clock size={10} />
                      Avg Review
                    </div>
                    <div className="text-2xl font-bold font-mono text-amber-500">
                      {dashboardMetrics.avgReviewTurnaround}d
                    </div>
                    <div className="text-[10px] text-zinc-600 mt-1">Turnaround time</div>
                  </CardContent>
                </Card>

                <Card className="bg-zinc-900 border-zinc-800">
                  <CardContent className="p-4">
                    <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1 flex items-center gap-1">
                      <AlertTriangle size={10} />
                      Action Today
                    </div>
                    <div className="text-2xl font-bold font-mono text-red-500">
                      {dashboardMetrics.actionBreakdown.action_today || 0}
                    </div>
                    <div className="text-[10px] text-zinc-600 mt-1">Require action</div>
                  </CardContent>
                </Card>

                <Card className="bg-zinc-900 border-zinc-800">
                  <CardContent className="p-4">
                    <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1 flex items-center gap-1">
                      <TrendingUp size={10} />
                      Bottleneck
                    </div>
                    <div className="text-sm font-bold text-white truncate capitalize">
                      {dashboardMetrics.bottleneckDiscipline.replace('_', ' ')}
                    </div>
                    <div className="text-[10px] text-zinc-600 mt-1">By discipline</div>
                  </CardContent>
                </Card>

                <Card className="bg-zinc-900 border-zinc-800">
                  <CardContent className="p-4">
                    <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1 flex items-center gap-1">
                      <User size={10} />
                      Reviewer
                    </div>
                    <div className="text-sm font-bold text-white truncate">
                      {users.find(u => u.email === dashboardMetrics.bottleneckReviewer)?.full_name?.split(' ')[0] || 'None'}
                    </div>
                    <div className="text-[10px] text-zinc-600 mt-1">Most assigned</div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="max-w-[1600px] mx-auto px-6 py-6 space-y-6">

        {/* PRIORITY QUEUE ENGINE */}
        {priorityQueue.length > 0 &&
        <Card className="bg-red-950/20 border-red-500/30">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="text-red-500" size={18} />
                <CardTitle className="text-sm uppercase tracking-widest text-red-400">
                  Priority Queue Engine
                </CardTitle>
              </div>
              <Badge variant="outline" className="text-red-400 border-red-500/50">
                Top {priorityQueue.length} Critical
              </Badge>
            </div>
            <p className="text-[10px] text-zinc-500 mt-1">
              Auto-ranked by fabrication impact, review status, RFIs, and stagnation
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {priorityQueue.map((ds, idx) => {
                const ActionIcon = ACTION_STATUSES[ds.actionStatus]?.icon || Activity;
                const ZoneIcon = CONTROL_ZONES[ds.zone]?.icon || FileText;

                return (
                  <div
                    key={ds.id}
                    className="flex items-center gap-3 p-3 bg-zinc-950 border border-zinc-800 rounded hover:border-red-500/50 transition-colors">

                    {/* Priority Rank */}
                    <div className="flex flex-col items-center justify-center w-10">
                      <div className="text-xs font-bold text-red-400">#{idx + 1}</div>
                      <div className="text-[9px] text-zinc-600">{ds.priorityScore}</div>
                    </div>

                    {/* Control Zone + Action Status */}
                    <div className="flex flex-col gap-1">
                      <Badge className={cn(ACTION_STATUSES[ds.actionStatus]?.color, "text-black text-[10px] px-2 py-0.5")}>
                        <ActionIcon size={10} className="mr-1" />
                        {ACTION_STATUSES[ds.actionStatus]?.label}
                      </Badge>
                      <Badge variant="outline" className={cn("text-[9px] px-2 py-0.5", CONTROL_ZONES[ds.zone]?.borderColor)}>
                        <ZoneIcon size={9} className="mr-1" />
                        {CONTROL_ZONES[ds.zone]?.label}
                      </Badge>
                    </div>

                    {/* Drawing Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-white text-sm truncate">{ds.set_name}</p>
                        {ds.linkedRFIs.length > 0 && (
                          <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                            {ds.linkedRFIs.length} RFI
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-zinc-600 font-mono">
                        <span>{ds.set_number}</span>
                        <span>•</span>
                        <span>R{ds.current_revision || '—'}</span>
                        <span>•</span>
                        <span className={ds.isOverdue ? 'text-red-500 font-bold' : ds.isDueSoon ? 'text-amber-500' : ''}>
                          {ds.due_date ? format(parseISO(ds.due_date), 'MMM d') : 'No due date'}
                        </span>
                      </div>
                    </div>

                    {/* Days Stagnant */}
                    <div className="text-center">
                      <div className={cn(
                        "text-lg font-bold font-mono",
                        ds.daysSinceMovement > 14 ? "text-red-500" : ds.daysSinceMovement > 7 ? "text-amber-500" : "text-zinc-400"
                      )}>
                        {ds.daysSinceMovement}d
                      </div>
                      <div className="text-[9px] text-zinc-600">stagnant</div>
                    </div>

                    {/* Next Owner */}
                    <div className="w-32">
                      <div className="text-[9px] text-zinc-600 uppercase mb-1">Next Owner:</div>
                      <div className="text-xs font-semibold text-white truncate">{ds.nextOwner}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
        }

        {/* Filters */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Select value={selectedDiscipline} onValueChange={setSelectedDiscipline}>
              <SelectTrigger className="w-48 bg-zinc-900 border-zinc-800 text-white">
                <SelectValue placeholder="Filter by Discipline" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800">
                <SelectItem value="all">All Disciplines</SelectItem>
                <SelectItem value="structural">Structural</SelectItem>
                <SelectItem value="misc_metals">Misc Metals</SelectItem>
                <SelectItem value="stairs">Stairs</SelectItem>
                <SelectItem value="handrails">Handrails</SelectItem>
                <SelectItem value="connections">Connections</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedReviewer} onValueChange={setSelectedReviewer}>
              <SelectTrigger className="w-48 bg-zinc-900 border-zinc-800 text-white">
                <SelectValue placeholder="Filter by Reviewer" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800">
                <SelectItem value="all">All Reviewers</SelectItem>
                {users.map((u) =>
                  <SelectItem key={u.email} value={u.email}>{u.full_name}</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* CONTROL ZONES VIEW */}
        <Tabs defaultValue="all" className="space-y-4">
          <TabsList className="bg-zinc-900 border border-zinc-800">
            <TabsTrigger value="all">All Sets ({filteredSets.length})</TabsTrigger>
            {Object.entries(CONTROL_ZONES).map(([key, zone]) => (
              <TabsTrigger key={key} value={key}>
                {zone.label} ({setsByZone[key]?.length || 0})
              </TabsTrigger>
            ))}
          </TabsList>

          {['all', ...Object.keys(CONTROL_ZONES)].map(zoneKey => (
            <TabsContent key={zoneKey} value={zoneKey} className="space-y-2">
              {(zoneKey === 'all' ? filteredSets : setsByZone[zoneKey] || []).map((ds) => {
                const isSelected = selectedSets.includes(ds.id);
                const ZoneIcon = CONTROL_ZONES[ds.zone]?.icon || FileText;
                const ActionIcon = ACTION_STATUSES[ds.actionStatus]?.icon || Activity;

                return (
                  <Card key={ds.id} className={cn(
                    "border hover:border-zinc-600 transition-colors",
                    isSelected ? "border-amber-500" : "border-zinc-800",
                    CONTROL_ZONES[ds.zone]?.borderColor
                  )}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        {/* Left: Zone Indicator */}
                        <div className={cn("w-1 h-full rounded", CONTROL_ZONES[ds.zone]?.color)} />

                        {/* Control Zone & Action Status */}
                        <div className="flex flex-col gap-2 min-w-[180px]">
                          <Badge className={cn(CONTROL_ZONES[ds.zone]?.color, "text-black text-[10px] px-2 py-1")}>
                            <ZoneIcon size={11} className="mr-1" />
                            {CONTROL_ZONES[ds.zone]?.label}
                          </Badge>
                          <Badge className={cn(ACTION_STATUSES[ds.actionStatus]?.color, "text-black text-[10px] px-2 py-1")}>
                            <ActionIcon size={11} className="mr-1" />
                            {ACTION_STATUSES[ds.actionStatus]?.label}
                          </Badge>
                        </div>

                        {/* Drawing Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-bold text-white truncate">{ds.set_name}</h4>
                            {ds.isOverdue && (
                              <Badge variant="destructive" className="text-[10px] px-1.5 py-0">OVERDUE</Badge>
                            )}
                            {ds.linkedRFIs.length > 0 && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-red-500 text-red-400">
                                {ds.linkedRFIs.length} RFI
                              </Badge>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px] text-zinc-500">
                            <div>
                              <span className="text-zinc-600">Set:</span> <span className="font-mono text-white">{ds.set_number}</span>
                            </div>
                            <div>
                              <span className="text-zinc-600">Rev:</span> <span className="font-mono text-white">{ds.current_revision || '—'}</span>
                            </div>
                            <div>
                              <span className="text-zinc-600">Due:</span> 
                              <span className={cn(
                                "font-mono ml-1",
                                ds.isOverdue ? "text-red-500 font-bold" : ds.isDueSoon ? "text-amber-500" : "text-white"
                              )}>
                                {ds.due_date ? format(parseISO(ds.due_date), 'MMM d') : 'Not set'}
                              </span>
                            </div>
                            <div>
                              <span className="text-zinc-600">Sheets:</span> <span className="font-mono text-white">{ds.sheet_count || 0}</span>
                            </div>
                            <div>
                              <span className="text-zinc-600">Last Movement:</span> 
                              <span className={cn(
                                "font-mono ml-1",
                                ds.daysSinceMovement > 14 ? "text-red-500" : ds.daysSinceMovement > 7 ? "text-amber-500" : "text-white"
                              )}>
                                {ds.daysSinceMovement}d ago
                              </span>
                            </div>
                            <div>
                              <span className="text-zinc-600">Next Owner:</span> <span className="text-white ml-1">{ds.nextOwner}</span>
                            </div>
                          </div>

                          {/* RFI Impact Summary */}
                          {ds.linkedRFIs.length > 0 && (
                            <div className="mt-2 p-2 bg-red-950/30 border border-red-500/30 rounded">
                              <div className="text-[10px] text-red-400 font-bold uppercase mb-1">RFI Impact:</div>
                              {ds.linkedRFIs.slice(0, 2).map(rfi => (
                                <div key={rfi.id} className="text-[9px] text-zinc-400">
                                  • RFI #{rfi.rfi_number}: {rfi.subject}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col gap-2 min-w-[200px]">
                          <Select
                            value={ds.reviewer || 'unassigned'}
                            onValueChange={(val) => assignReviewerMutation.mutate({
                              id: ds.id,
                              reviewer: val === 'unassigned' ? null : val
                            })}>
                            <SelectTrigger className="h-8 text-xs bg-zinc-950 border-zinc-700 text-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-zinc-900 border-zinc-800">
                              <SelectItem value="unassigned">Unassigned</SelectItem>
                              {users.map((u) =>
                                <SelectItem key={u.email} value={u.email}>{u.full_name}</SelectItem>
                              )}
                            </SelectContent>
                          </Select>

                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setRevisionHistorySetId(ds.id)}
                              className="h-7 text-[10px] flex-1 border-zinc-700"
                            >
                              <History size={12} className="mr-1" />
                              History
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="h-7 text-[10px] flex-1 border-zinc-700"
                            >
                              <MessageSquare size={12} className="mr-1" />
                              RFI
                            </Button>
                          </div>

                          <Button
                            size="sm"
                            onClick={() => {
                              const nextStatus = ds.status === 'IFA' ? 'BFA' : ds.status === 'BFA' ? 'BFS' : ds.status === 'BFS' ? 'FFF' : null;
                              if (nextStatus) updateStatusMutation.mutate({ id: ds.id, status: nextStatus });
                            }}
                            disabled={ds.status === 'FFF'}
                            className="bg-amber-500 hover:bg-amber-600 text-black font-bold h-8 text-xs uppercase tracking-wider"
                          >
                            {ds.status === 'FFF' ? 'Released' : 'Advance Stage'}
                            <ChevronRight size={14} className="ml-1" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}

              {(zoneKey === 'all' ? filteredSets : setsByZone[zoneKey] || []).length === 0 && (
                <div className="flex items-center justify-center py-20">
                  <div className="text-center">
                    <CheckCircle2 size={48} className="mx-auto mb-4 text-green-500" />
                    <h3 className="text-sm font-bold text-white uppercase tracking-wide mb-2">
                      {zoneKey === 'all' ? 'No Sets Found' : `No Sets in ${CONTROL_ZONES[zoneKey]?.label}`}
                    </h3>
                    <p className="text-xs text-zinc-600 uppercase tracking-widest">
                      {zoneKey === 'all' ? 'Adjust filters or create a new set' : 'All clear in this zone'}
                    </p>
                  </div>
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
          </div>
        </>
      )}

      {/* Batch Actions Panel */}
      <BatchActionsPanel
        selectedSets={selectedSets}
        onClearSelection={() => setSelectedSets([])}
        onBatchUpdate={(data) => batchUpdateMutation.mutate(data)}
        users={users}
      />

      {/* Revision History Dialog */}
      <RevisionHistory
        drawingSetId={revisionHistorySetId}
        open={!!revisionHistorySetId}
        onOpenChange={(open) => !open && setRevisionHistorySetId(null)}
      />

      {/* Create Drawing Set Dialog */}
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