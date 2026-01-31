import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useActiveProject } from '@/components/shared/hooks/useActiveProject';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Truck,
  MapPin,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Package,
  Calendar,
  Weight,
  Plus
} from 'lucide-react';
import { format, differenceInMinutes, isPast, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from '@/components/ui/notifications';
import TruckDetailDialog from '@/components/deliveries/TruckDetailDialog';
import NewLoadDialog from '@/components/deliveries/NewLoadDialog';

export default function Deliveries() {
  const { activeProjectId } = useActiveProject();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedTruck, setSelectedTruck] = useState(null);
  const [showNewLoadDialog, setShowNewLoadDialog] = useState(false);

  const { data: project } = useQuery({
    queryKey: ['project', activeProjectId],
    queryFn: () => activeProjectId ? base44.entities.Project.filter({ id: activeProjectId }).then(p => p[0]) : null,
    enabled: !!activeProjectId
  });

  const { data: loads = [] } = useQuery({
    queryKey: ['loads', activeProjectId],
    queryFn: () => activeProjectId
      ? base44.entities.LoadTruck.filter({ project_id: activeProjectId }, '-planned_arrival_start')
      : [],
    enabled: !!activeProjectId
  });

  const { data: pieces = [] } = useQuery({
    queryKey: ['steel-pieces', activeProjectId],
    queryFn: () => activeProjectId
      ? base44.entities.SteelPiece.filter({ project_id: activeProjectId })
      : [],
    enabled: !!activeProjectId
  });

  const { data: equipment = [] } = useQuery({
    queryKey: ['load-equipment', activeProjectId],
    queryFn: async () => {
      if (!activeProjectId || loads.length === 0) return [];
      const loadIds = loads.map(l => l.id);
      const all = await base44.entities.LoadEquipmentRequirement.list();
      return all.filter(e => loadIds.includes(e.load_truck_id));
    },
    enabled: !!activeProjectId && loads.length > 0
  });

  const { data: conditionReports = [] } = useQuery({
    queryKey: ['condition-reports', activeProjectId],
    queryFn: async () => {
      if (!activeProjectId || loads.length === 0) return [];
      const loadIds = loads.map(l => l.id);
      const all = await base44.entities.LoadConditionReport.list();
      return all.filter(r => loadIds.includes(r.load_truck_id));
    },
    enabled: !!activeProjectId && loads.length > 0
  });

  // Enhanced loads with calculated fields
  const enhancedLoads = useMemo(() => {
    return loads.map(load => {
      const loadPieces = pieces.filter(p => p.load_truck_id === load.id);
      const loadEquipment = equipment.filter(e => e.load_truck_id === load.id);
      const loadReports = conditionReports.filter(r => r.load_truck_id === load.id);
      
      const openIssues = loadReports.filter(r => r.resolution_status === 'open' && r.issue_type !== 'acceptable').length;
      
      let etaStatus = 'on_time';
      let minutesUntilArrival = null;
      
      if (load.status === 'in_transit' && load.estimated_eta) {
        const eta = parseISO(load.estimated_eta);
        const windowEnd = parseISO(load.planned_arrival_end);
        minutesUntilArrival = differenceInMinutes(eta, new Date());
        
        if (isPast(windowEnd)) {
          etaStatus = 'late';
        } else if (minutesUntilArrival < 0) {
          etaStatus = 'delayed';
        } else if (minutesUntilArrival < 30) {
          etaStatus = 'arriving_soon';
        }
      }
      
      return {
        ...load,
        pieces: loadPieces,
        equipment: loadEquipment,
        reports: loadReports,
        openIssues,
        pieceCount: loadPieces.length,
        etaStatus,
        minutesUntilArrival
      };
    });
  }, [loads, pieces, equipment, conditionReports]);

  // Filter loads
  const filteredLoads = useMemo(() => {
    if (statusFilter === 'all') return enhancedLoads;
    return enhancedLoads.filter(l => l.status === statusFilter);
  }, [enhancedLoads, statusFilter]);

  // Metrics
  const metrics = useMemo(() => {
    const totalTonnage = project?.total_tonnage || 0;
    const deliveredTonnage = pieces.filter(p => ['on_site', 'erected'].includes(p.current_status))
      .reduce((sum, p) => sum + (p.weight || 0), 0);
    
    const inTransit = enhancedLoads.filter(l => l.status === 'in_transit').length;
    const arrivedToday = enhancedLoads.filter(l => 
      l.status === 'arrived' && 
      l.actual_arrival_time &&
      format(parseISO(l.actual_arrival_time), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
    ).length;
    
    const delayedLoads = enhancedLoads.filter(l => 
      l.status === 'in_transit' && l.etaStatus === 'delayed'
    ).length;
    
    const openIssues = conditionReports.filter(r => 
      r.resolution_status === 'open' && r.issue_type !== 'acceptable'
    ).length;

    return {
      totalTonnage,
      deliveredTonnage,
      percentComplete: totalTonnage > 0 ? (deliveredTonnage / totalTonnage * 100) : 0,
      inTransit,
      arrivedToday,
      delayedLoads,
      openIssues
    };
  }, [project, pieces, enhancedLoads, conditionReports]);

  // Today's schedule
  const todaysSchedule = useMemo(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    return enhancedLoads.filter(l => {
      if (!l.planned_arrival_start) return false;
      const arrivalDate = format(parseISO(l.planned_arrival_start), 'yyyy-MM-dd');
      return arrivalDate === today && ['scheduled', 'in_transit', 'arrived'].includes(l.status);
    }).sort((a, b) => 
      new Date(a.planned_arrival_start) - new Date(b.planned_arrival_start)
    );
  }, [enhancedLoads]);

  const getStatusColor = (status) => {
    const colors = {
      planned: 'bg-zinc-500',
      scheduled: 'bg-blue-500',
      in_transit: 'bg-amber-500',
      arrived: 'bg-green-500',
      unloading: 'bg-purple-500',
      complete: 'bg-zinc-700',
      cancelled: 'bg-red-500'
    };
    return colors[status] || 'bg-zinc-500';
  };

  if (!activeProjectId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Truck size={48} className="mx-auto mb-4 text-zinc-600" />
          <h3 className="text-lg font-semibold text-white mb-2">No Project Selected</h3>
          <p className="text-zinc-500">Select a project to manage deliveries</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Deliveries</h1>
          <p className="text-sm text-zinc-500 mt-1">
            {project?.project_number} • {project?.name}
          </p>
        </div>
        <Button
          onClick={() => setShowNewLoadDialog(true)}
          className="bg-amber-500 hover:bg-amber-600 text-black"
        >
          <Plus size={16} className="mr-2" />
          New Load
        </Button>
      </div>

      {/* Metrics Dashboard */}
      <div className="grid grid-cols-6 gap-4">
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-4">
            <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Weight size={12} />
              Tonnage
            </div>
            <div className="text-2xl font-bold text-white mb-1">
              {metrics.deliveredTonnage.toFixed(1)} / {metrics.totalTonnage.toFixed(1)}
            </div>
            <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-green-500 h-full transition-all"
                style={{ width: `${metrics.percentComplete}%` }}
              />
            </div>
            <div className="text-xs text-zinc-600 mt-1">{metrics.percentComplete.toFixed(0)}% Complete</div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-4">
            <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Truck size={12} />
              In Transit
            </div>
            <div className="text-3xl font-bold text-amber-500">{metrics.inTransit}</div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-4">
            <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1 flex items-center gap-1">
              <CheckCircle2 size={12} />
              Arrived Today
            </div>
            <div className="text-3xl font-bold text-green-500">{metrics.arrivedToday}</div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-4">
            <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Clock size={12} />
              Delayed
            </div>
            <div className="text-3xl font-bold text-red-500">{metrics.delayedLoads}</div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-4">
            <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1 flex items-center gap-1">
              <AlertTriangle size={12} />
              Open Issues
            </div>
            <div className="text-3xl font-bold text-orange-500">{metrics.openIssues}</div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-4">
            <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Calendar size={12} />
              Today's Schedule
            </div>
            <div className="text-3xl font-bold text-blue-500">{todaysSchedule.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-3 gap-6">
        {/* Gate View - Today's Arrivals */}
        <div className="col-span-1">
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm uppercase tracking-wider flex items-center gap-2">
                <Calendar size={16} />
                Today's Gate Schedule
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 max-h-[600px] overflow-y-auto">
              {todaysSchedule.length === 0 ? (
                <div className="text-center py-8 text-zinc-500 text-sm">
                  No deliveries scheduled today
                </div>
              ) : (
                todaysSchedule.map(load => (
                  <div
                    key={load.id}
                    onClick={() => setSelectedTruck(load)}
                    className="p-3 bg-zinc-800/50 border border-zinc-700 rounded hover:border-amber-500 cursor-pointer transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className={cn("text-xs", getStatusColor(load.status))}>
                            {load.status.replace('_', ' ')}
                          </Badge>
                          {load.is_osow && (
                            <Badge variant="outline" className="text-xs border-orange-500 text-orange-500">
                              OSOW
                            </Badge>
                          )}
                        </div>
                        <p className="font-semibold text-white text-sm">{load.load_number}</p>
                        <p className="text-xs text-zinc-500">{load.truck_id || 'TBD'}</p>
                      </div>
                      {load.minutesUntilArrival !== null && load.status === 'in_transit' && (
                        <div className={cn(
                          "text-xs font-mono font-bold",
                          load.etaStatus === 'delayed' ? 'text-red-500' :
                          load.etaStatus === 'arriving_soon' ? 'text-green-500' : 'text-zinc-400'
                        )}>
                          {load.minutesUntilArrival > 0 ? `${load.minutesUntilArrival}m` : 'LATE'}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-zinc-500">
                      <div className="flex items-center gap-1">
                        <Clock size={12} />
                        {format(parseISO(load.planned_arrival_start), 'HH:mm')}
                      </div>
                      <div className="flex items-center gap-1">
                        <Package size={12} />
                        {load.pieceCount} pcs
                      </div>
                      <div className="flex items-center gap-1">
                        <Weight size={12} />
                        {load.total_weight?.toFixed(1)}t
                      </div>
                    </div>
                    {load.openIssues > 0 && (
                      <div className="mt-2 flex items-center gap-1 text-xs text-red-400">
                        <AlertTriangle size={12} />
                        {load.openIssues} issue{load.openIssues > 1 ? 's' : ''}
                      </div>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* All Loads */}
        <div className="col-span-2">
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm uppercase tracking-wider">All Loads</CardTitle>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40 h-8 bg-zinc-800 border-zinc-700 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800">
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="planned">Planned</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="in_transit">In Transit</SelectItem>
                    <SelectItem value="arrived">Arrived</SelectItem>
                    <SelectItem value="unloading">Unloading</SelectItem>
                    <SelectItem value="complete">Complete</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 max-h-[600px] overflow-y-auto">
              {filteredLoads.length === 0 ? (
                <div className="text-center py-12 text-zinc-500">
                  <Truck size={48} className="mx-auto mb-4 text-zinc-600" />
                  <p className="text-sm">No loads found</p>
                  <Button
                    onClick={() => setShowNewLoadDialog(true)}
                    className="mt-4 bg-amber-500 hover:bg-amber-600 text-black"
                    size="sm"
                  >
                    Create First Load
                  </Button>
                </div>
              ) : (
                filteredLoads.map(load => (
                  <div
                    key={load.id}
                    onClick={() => setSelectedTruck(load)}
                    className="p-4 bg-zinc-800/50 border border-zinc-700 rounded hover:border-amber-500 cursor-pointer transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className={cn("text-xs", getStatusColor(load.status))}>
                            {load.status.replace('_', ' ')}
                          </Badge>
                          {load.is_osow && (
                            <Badge variant="outline" className="text-xs border-orange-500 text-orange-500">
                              OSOW
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <p className="font-bold text-white">{load.load_number}</p>
                          <p className="text-sm text-zinc-400">{load.carrier_name || 'TBD'}</p>
                        </div>
                        <p className="text-xs text-zinc-500 mt-1">{load.truck_id || 'Truck TBD'}</p>
                      </div>
                      {load.planned_arrival_start && (
                        <div className="text-right">
                          <p className="text-xs text-zinc-500">
                            {format(parseISO(load.planned_arrival_start), 'MMM d')}
                          </p>
                          <p className="text-sm font-mono text-white">
                            {format(parseISO(load.planned_arrival_start), 'HH:mm')}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-4 gap-4 text-xs text-zinc-500 mt-3">
                      <div>
                        <div className="flex items-center gap-1 mb-1">
                          <Package size={12} />
                          <span>Pieces</span>
                        </div>
                        <div className="text-white font-semibold">{load.pieceCount}</div>
                      </div>
                      <div>
                        <div className="flex items-center gap-1 mb-1">
                          <Weight size={12} />
                          <span>Weight</span>
                        </div>
                        <div className="text-white font-semibold">{load.total_weight?.toFixed(1) || '0'}t</div>
                      </div>
                      <div>
                        <div className="flex items-center gap-1 mb-1">
                          <MapPin size={12} />
                          <span>Zones</span>
                        </div>
                        <div className="text-white font-semibold">{load.sequence_zones?.length || 0}</div>
                      </div>
                      <div>
                        <div className="flex items-center gap-1 mb-1">
                          <AlertTriangle size={12} />
                          <span>Issues</span>
                        </div>
                        <div className={cn(
                          "font-semibold",
                          load.openIssues > 0 ? "text-red-500" : "text-green-500"
                        )}>
                          {load.openIssues}
                        </div>
                      </div>
                    </div>

                    {load.equipment.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-zinc-700 flex items-center gap-2 flex-wrap">
                        {load.equipment.map((eq, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs border-blue-500/30 text-blue-400">
                            {eq.equipment_type.replace(/_/g, ' ')}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Truck Detail Dialog */}
      {selectedTruck && (
        <TruckDetailDialog
          load={selectedTruck}
          open={!!selectedTruck}
          onOpenChange={(open) => !open && setSelectedTruck(null)}
          onUpdate={() => {
            queryClient.invalidateQueries({ queryKey: ['loads'] });
            queryClient.invalidateQueries({ queryKey: ['steel-pieces'] });
            queryClient.invalidateQueries({ queryKey: ['condition-reports'] });
          }}
        />
      )}

      {/* New Load Dialog */}
      <NewLoadDialog
        projectId={activeProjectId}
        open={showNewLoadDialog}
        onOpenChange={setShowNewLoadDialog}
        onCreated={() => {
          queryClient.invalidateQueries({ queryKey: ['loads'] });
          setShowNewLoadDialog(false);
        }}
      />
    </div>
  );
}