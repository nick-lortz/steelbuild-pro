import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useActiveProject } from '@/components/shared/hooks/useActiveProject';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Truck,
  MapPin,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Package,
  Weight,
  Plus,
  Calendar,
  Map,
  ListTree,
  FileText,
  TrendingUp
} from 'lucide-react';
import { format, parseISO, isToday, isTomorrow, addDays, startOfDay, endOfDay } from 'date-fns';
import { cn } from '@/lib/utils';
import TruckDetailDialog from '@/components/deliveries/TruckDetailDialog';
import NewLoadDialog from '@/components/deliveries/NewLoadDialog';
import GateCalendar from '@/components/deliveries/GateCalendar';
import PieceAssignmentPanel from '@/components/deliveries/PieceAssignmentPanel';
import DeliveryMap from '@/components/deliveries/DeliveryMap';
import SequenceLoadView from '@/components/deliveries/SequenceLoadView';

export default function Deliveries() {
  const { activeProjectId } = useActiveProject();
  const queryClient = useQueryClient();
  const [selectedTruck, setSelectedTruck] = useState(null);
  const [showNewLoadDialog, setShowNewLoadDialog] = useState(false);
  const [activeView, setActiveView] = useState('gate');

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
      
      const openIssues = loadReports.filter(r => 
        r.resolution_status === 'open' && r.issue_type !== 'acceptable'
      ).length;
      
      const criticalIssues = loadReports.filter(r =>
        r.resolution_status === 'open' && r.severity === 'critical'
      ).length;
      
      return {
        ...load,
        pieces: loadPieces,
        equipment: loadEquipment,
        reports: loadReports,
        openIssues,
        criticalIssues,
        pieceCount: loadPieces.length,
        totalWeight: loadPieces.reduce((sum, p) => sum + (p.weight || 0), 0),
        sequences: [...new Set(loadPieces.map(p => p.sequence_zone).filter(Boolean))]
      };
    });
  }, [loads, pieces, equipment, conditionReports]);

  // Metrics
  const metrics = useMemo(() => {
    const totalTonnage = project?.total_tonnage || 0;
    const deliveredPieces = pieces.filter(p => ['on_site', 'erected'].includes(p.current_status));
    const deliveredTonnage = deliveredPieces.reduce((sum, p) => sum + (p.weight || 0), 0);
    
    const inTransit = enhancedLoads.filter(l => l.status === 'in_transit').length;
    const scheduled = enhancedLoads.filter(l => l.status === 'scheduled').length;
    const onSite = enhancedLoads.filter(l => ['arrived', 'unloading'].includes(l.status)).length;
    
    const openIssues = conditionReports.filter(r => 
      r.resolution_status === 'open' && r.issue_type !== 'acceptable'
    ).length;
    
    const criticalIssues = conditionReports.filter(r =>
      r.resolution_status === 'open' && r.severity === 'critical'
    ).length;

    // Readiness breakdown
    const inShop = pieces.filter(p => ['in_shop', 'ready_for_shipping'].includes(p.current_status)).length;
    const onTruck = pieces.filter(p => p.current_status === 'on_truck').length;
    const atSite = pieces.filter(p => p.current_status === 'on_site').length;
    const erected = pieces.filter(p => p.current_status === 'erected').length;

    return {
      totalTonnage,
      deliveredTonnage,
      percentComplete: totalTonnage > 0 ? (deliveredTonnage / totalTonnage * 100) : 0,
      inTransit,
      scheduled,
      onSite,
      openIssues,
      criticalIssues,
      totalPieces: pieces.length,
      deliveredPieces: deliveredPieces.length,
      readiness: { inShop, onTruck, atSite, erected }
    };
  }, [project, pieces, enhancedLoads, conditionReports]);

  // Today's schedule
  const todaysLoads = useMemo(() => {
    return enhancedLoads.filter(l => {
      if (!l.planned_arrival_start) return false;
      const arrivalDate = parseISO(l.planned_arrival_start);
      return isToday(arrivalDate) && ['scheduled', 'in_transit', 'arrived', 'unloading'].includes(l.status);
    }).sort((a, b) => 
      new Date(a.planned_arrival_start) - new Date(b.planned_arrival_start)
    );
  }, [enhancedLoads]);

  // Upcoming loads (next 7 days)
  const upcomingLoads = useMemo(() => {
    const now = new Date();
    const weekOut = addDays(now, 7);
    
    return enhancedLoads.filter(l => {
      if (!l.planned_arrival_start) return false;
      const arrivalDate = parseISO(l.planned_arrival_start);
      return arrivalDate > endOfDay(now) && 
             arrivalDate <= weekOut && 
             ['planned', 'scheduled'].includes(l.status);
    }).sort((a, b) => 
      new Date(a.planned_arrival_start) - new Date(b.planned_arrival_start)
    );
  }, [enhancedLoads]);

  const getStatusColor = (status) => {
    const colors = {
      planned: 'bg-zinc-600 text-zinc-200',
      scheduled: 'bg-blue-600 text-white',
      in_transit: 'bg-amber-500 text-black',
      arrived: 'bg-green-600 text-white',
      unloading: 'bg-purple-600 text-white',
      complete: 'bg-zinc-700 text-zinc-300',
      cancelled: 'bg-red-600 text-white'
    };
    return colors[status] || 'bg-zinc-600 text-zinc-200';
  };

  if (!activeProjectId) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <div className="text-center">
          <Truck size={64} className="mx-auto mb-4 text-zinc-700" />
          <h3 className="text-xl font-bold text-white mb-2">No Project Selected</h3>
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
          <h1 className="text-2xl font-bold text-white uppercase tracking-wide">Deliveries</h1>
          <p className="text-xs text-zinc-600 font-mono mt-1">
            {project?.project_number} • {project?.name}
          </p>
        </div>
        <Button
          onClick={() => setShowNewLoadDialog(true)}
          className="bg-amber-500 hover:bg-amber-600 text-black font-bold"
        >
          <Plus size={16} className="mr-2" />
          New Load
        </Button>
      </div>

      {/* KPI Dashboard */}
      <div className="grid grid-cols-6 gap-4">
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-4">
            <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1 flex items-center gap-1">
              <TrendingUp size={10} />
              Tonnage Progress
            </div>
            <div className="text-2xl font-bold text-white mb-2">
              {metrics.deliveredTonnage.toFixed(0)}
              <span className="text-sm text-zinc-500 font-normal ml-1">/ {metrics.totalTonnage.toFixed(0)}t</span>
            </div>
            <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
              <div 
                className="bg-green-500 h-full transition-all"
                style={{ width: `${metrics.percentComplete}%` }}
              />
            </div>
            <div className="text-[10px] text-zinc-600 mt-1">{metrics.percentComplete.toFixed(0)}% delivered</div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-4">
            <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1 flex items-center gap-1">
              <Truck size={10} />
              In Transit
            </div>
            <div className="text-3xl font-bold text-amber-500">{metrics.inTransit}</div>
            <div className="text-[10px] text-zinc-600 mt-1">Active trucks</div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-4">
            <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1 flex items-center gap-1">
              <Calendar size={10} />
              Scheduled
            </div>
            <div className="text-3xl font-bold text-blue-500">{metrics.scheduled}</div>
            <div className="text-[10px] text-zinc-600 mt-1">Coming soon</div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-4">
            <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1 flex items-center gap-1">
              <MapPin size={10} />
              On Site
            </div>
            <div className="text-3xl font-bold text-green-500">{metrics.onSite}</div>
            <div className="text-[10px] text-zinc-600 mt-1">At gate/unloading</div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-4">
            <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1 flex items-center gap-1">
              <AlertTriangle size={10} />
              Issues
            </div>
            <div className="text-3xl font-bold text-red-500">{metrics.criticalIssues}</div>
            <div className="text-[10px] text-zinc-600 mt-1">{metrics.openIssues} total open</div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-4">
            <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1 flex items-center gap-1">
              <Package size={10} />
              Pieces
            </div>
            <div className="text-2xl font-bold text-white">
              {metrics.deliveredPieces}
              <span className="text-sm text-zinc-500 font-normal ml-1">/ {metrics.totalPieces}</span>
            </div>
            <div className="text-[10px] text-zinc-600 mt-1">{((metrics.deliveredPieces/metrics.totalPieces)*100).toFixed(0)}% received</div>
          </CardContent>
        </Card>
      </div>

      {/* View Tabs */}
      <Tabs value={activeView} onValueChange={setActiveView} className="space-y-4">
        <TabsList className="bg-zinc-900 border border-zinc-800">
          <TabsTrigger value="gate" className="flex items-center gap-2">
            <Clock size={14} />
            Gate Schedule
          </TabsTrigger>
          <TabsTrigger value="map" className="flex items-center gap-2">
            <Map size={14} />
            Live Map
          </TabsTrigger>
          <TabsTrigger value="sequence" className="flex items-center gap-2">
            <ListTree size={14} />
            By Sequence
          </TabsTrigger>
          <TabsTrigger value="assign" className="flex items-center gap-2">
            <Package size={14} />
            Assign Pieces
          </TabsTrigger>
        </TabsList>

        {/* Gate Schedule View */}
        <TabsContent value="gate" className="space-y-4">
          <GateCalendar
            loads={enhancedLoads}
            onSelectLoad={setSelectedTruck}
            onRefresh={() => queryClient.invalidateQueries({ queryKey: ['loads'] })}
          />
        </TabsContent>

        {/* Map View */}
        <TabsContent value="map">
          <DeliveryMap
            loads={enhancedLoads.filter(l => ['in_transit', 'arrived'].includes(l.status))}
            project={project}
            onSelectLoad={setSelectedTruck}
          />
        </TabsContent>

        {/* Sequence View */}
        <TabsContent value="sequence">
          <SequenceLoadView
            loads={enhancedLoads}
            pieces={pieces}
            onSelectLoad={setSelectedTruck}
          />
        </TabsContent>

        {/* Piece Assignment View */}
        <TabsContent value="assign">
          <PieceAssignmentPanel
            projectId={activeProjectId}
            loads={enhancedLoads.filter(l => ['planned', 'scheduled'].includes(l.status))}
            pieces={pieces.filter(p => ['ready_for_shipping', 'in_shop'].includes(p.current_status))}
            onUpdate={() => {
              queryClient.invalidateQueries({ queryKey: ['steel-pieces'] });
              queryClient.invalidateQueries({ queryKey: ['loads'] });
            }}
          />
        </TabsContent>
      </Tabs>

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