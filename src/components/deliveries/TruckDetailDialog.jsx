import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Truck,
  MapPin,
  Clock,
  FileText,
  AlertTriangle,
  Package,
  Weight,
  Wrench,
  CheckCircle2
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from '@/components/ui/notifications';

export default function TruckDetailDialog({ load, open, onOpenChange, onUpdate }) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('pieces');

  const { data: pieces = [] } = useQuery({
    queryKey: ['load-pieces', load?.id],
    queryFn: () => base44.entities.SteelPiece.filter({ load_truck_id: load.id }),
    enabled: !!load?.id
  });

  const { data: equipment = [] } = useQuery({
    queryKey: ['load-equipment', load?.id],
    queryFn: () => base44.entities.LoadEquipmentRequirement.filter({ load_truck_id: load.id }),
    enabled: !!load?.id
  });

  const { data: reports = [] } = useQuery({
    queryKey: ['load-reports', load?.id],
    queryFn: () => base44.entities.LoadConditionReport.filter({ load_truck_id: load.id }),
    enabled: !!load?.id
  });

  const updateStatusMutation = useMutation({
    mutationFn: (newStatus) => base44.entities.LoadTruck.update(load.id, {
      status: newStatus,
      ...(newStatus === 'arrived' && { actual_arrival_time: new Date().toISOString() })
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loads'] });
      toast.success('Status updated');
      onUpdate();
    }
  });

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

  const totalWeight = pieces.reduce((sum, p) => sum + (p.weight || 0), 0);
  const sequenceZones = [...new Set(pieces.map(p => p.sequence_zone).filter(Boolean))];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto bg-zinc-900 border-zinc-800 text-white">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-3">
              <Truck size={24} className="text-amber-500" />
              {load.load_number}
              <Badge className={cn("ml-2", getStatusColor(load.status))}>
                {load.status.replace('_', ' ')}
              </Badge>
            </DialogTitle>
            <div className="flex items-center gap-2">
              {load.status === 'scheduled' && (
                <Button
                  size="sm"
                  onClick={() => updateStatusMutation.mutate('in_transit')}
                  className="bg-amber-500 hover:bg-amber-600 text-black"
                >
                  Mark In Transit
                </Button>
              )}
              {load.status === 'in_transit' && (
                <Button
                  size="sm"
                  onClick={() => updateStatusMutation.mutate('arrived')}
                  className="bg-green-500 hover:bg-green-600 text-black"
                >
                  Check In at Gate
                </Button>
              )}
              {load.status === 'arrived' && (
                <Button
                  size="sm"
                  onClick={() => updateStatusMutation.mutate('unloading')}
                  className="bg-purple-500 hover:bg-purple-600 text-black"
                >
                  Start Unload
                </Button>
              )}
              {load.status === 'unloading' && (
                <Button
                  size="sm"
                  onClick={() => updateStatusMutation.mutate('complete')}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  Mark Complete
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* Load Summary */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <Card className="bg-zinc-800/50 border-zinc-700">
            <CardContent className="p-3">
              <div className="text-xs text-zinc-500 mb-1">Carrier</div>
              <div className="text-sm font-semibold text-white">{load.carrier_name || 'TBD'}</div>
              <div className="text-xs text-zinc-600 mt-1">{load.truck_id || 'Truck TBD'}</div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-800/50 border-zinc-700">
            <CardContent className="p-3">
              <div className="text-xs text-zinc-500 mb-1 flex items-center gap-1">
                <Package size={12} />
                Pieces
              </div>
              <div className="text-2xl font-bold text-white">{pieces.length}</div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-800/50 border-zinc-700">
            <CardContent className="p-3">
              <div className="text-xs text-zinc-500 mb-1 flex items-center gap-1">
                <Weight size={12} />
                Weight
              </div>
              <div className="text-2xl font-bold text-white">{totalWeight.toFixed(1)}t</div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-800/50 border-zinc-700">
            <CardContent className="p-3">
              <div className="text-xs text-zinc-500 mb-1 flex items-center gap-1">
                <MapPin size={12} />
                Zones
              </div>
              <div className="text-sm font-semibold text-white">
                {sequenceZones.length > 0 ? sequenceZones.join(', ') : 'N/A'}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Timing Info */}
        {load.planned_arrival_start && (
          <Card className="bg-zinc-800/50 border-zinc-700 mb-6">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-zinc-500 mb-1">Scheduled Window</div>
                  <div className="text-white font-semibold">
                    {format(parseISO(load.planned_arrival_start), 'MMM d, yyyy • HH:mm')}
                    {load.planned_arrival_end && ` - ${format(parseISO(load.planned_arrival_end), 'HH:mm')}`}
                  </div>
                </div>
                {load.actual_arrival_time && (
                  <div className="text-right">
                    <div className="text-xs text-zinc-500 mb-1">Actual Arrival</div>
                    <div className="text-green-400 font-semibold">
                      {format(parseISO(load.actual_arrival_time), 'HH:mm')}
                    </div>
                  </div>
                )}
                {load.is_osow && (
                  <div>
                    <Badge variant="outline" className="border-orange-500 text-orange-500">
                      OSOW Permit: {load.permit_number}
                    </Badge>
                    {load.permit_expiration && (
                      <div className="text-xs text-zinc-500 mt-1">
                        Expires: {format(parseISO(load.permit_expiration), 'MMM d')}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-zinc-800 border-zinc-700">
            <TabsTrigger value="pieces">
              Pieces ({pieces.length})
            </TabsTrigger>
            <TabsTrigger value="equipment">
              Equipment ({equipment.length})
            </TabsTrigger>
            <TabsTrigger value="reports">
              Reports ({reports.length})
            </TabsTrigger>
          </TabsList>

          {/* Pieces Tab */}
          <TabsContent value="pieces" className="mt-4">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-zinc-800 border-b border-zinc-700">
                  <tr>
                    <th className="text-left p-3 text-xs font-medium text-zinc-400 uppercase">Piece Mark</th>
                    <th className="text-left p-3 text-xs font-medium text-zinc-400 uppercase">Sequence</th>
                    <th className="text-left p-3 text-xs font-medium text-zinc-400 uppercase">Type</th>
                    <th className="text-right p-3 text-xs font-medium text-zinc-400 uppercase">Weight</th>
                    <th className="text-right p-3 text-xs font-medium text-zinc-400 uppercase">Length</th>
                    <th className="text-left p-3 text-xs font-medium text-zinc-400 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {pieces.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-zinc-500 text-sm">
                        No pieces assigned to this load
                      </td>
                    </tr>
                  ) : (
                    pieces.map(piece => (
                      <tr key={piece.id} className="border-b border-zinc-800 hover:bg-zinc-800/30">
                        <td className="p-3">
                          <span className="font-mono font-semibold text-white">{piece.piece_mark}</span>
                        </td>
                        <td className="p-3">
                          <span className="text-sm text-zinc-400">{piece.sequence_zone || '-'}</span>
                        </td>
                        <td className="p-3">
                          <span className="text-sm text-zinc-400 capitalize">{piece.type.replace('_', ' ')}</span>
                        </td>
                        <td className="p-3 text-right">
                          <span className="text-sm text-white font-semibold">{piece.weight?.toFixed(2) || '0'}t</span>
                        </td>
                        <td className="p-3 text-right">
                          <span className="text-sm text-zinc-400">{piece.length?.toFixed(1) || '0'}ft</span>
                        </td>
                        <td className="p-3">
                          <Badge variant="outline" className="text-xs">
                            {piece.current_status.replace('_', ' ')}
                          </Badge>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* Equipment Tab */}
          <TabsContent value="equipment" className="mt-4 space-y-3">
            {equipment.length === 0 ? (
              <div className="text-center py-8 text-zinc-500 text-sm">
                No equipment requirements specified
              </div>
            ) : (
              equipment.map((eq, idx) => (
                <Card key={idx} className="bg-zinc-800/50 border-zinc-700">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Wrench size={16} className="text-blue-400" />
                          <span className="font-semibold text-white capitalize">
                            {eq.equipment_type.replace(/_/g, ' ')}
                          </span>
                        </div>
                        {eq.crew_size && (
                          <div className="text-sm text-zinc-400">
                            Crew Size: {eq.crew_size} members
                          </div>
                        )}
                        {eq.deck_access && (
                          <div className="text-sm text-zinc-400 mt-1">
                            Access: {eq.deck_access}
                          </div>
                        )}
                      </div>
                      <Badge variant="outline" className="border-blue-500/30 text-blue-400">
                        Qty: {eq.quantity}
                      </Badge>
                    </div>
                    {eq.rigging_notes && (
                      <div className="mt-3 pt-3 border-t border-zinc-700">
                        <div className="text-xs text-zinc-500 mb-1">Rigging Notes:</div>
                        <div className="text-sm text-zinc-300">{eq.rigging_notes}</div>
                      </div>
                    )}
                    {eq.special_handling && (
                      <div className="mt-2">
                        <div className="text-xs text-zinc-500 mb-1">Special Handling:</div>
                        <div className="text-sm text-amber-400">{eq.special_handling}</div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports" className="mt-4 space-y-3">
            {reports.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle2 size={48} className="mx-auto mb-4 text-green-500" />
                <p className="text-sm text-zinc-500">No condition reports logged</p>
              </div>
            ) : (
              reports.map(report => (
                <Card key={report.id} className={cn(
                  "border",
                  report.issue_type === 'acceptable' ? 'bg-green-900/10 border-green-700/30' :
                  report.severity === 'critical' ? 'bg-red-900/20 border-red-700/30' :
                  report.severity === 'moderate' ? 'bg-amber-900/20 border-amber-700/30' :
                  'bg-zinc-800/50 border-zinc-700'
                )}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {report.issue_type === 'acceptable' ? (
                          <CheckCircle2 size={16} className="text-green-500" />
                        ) : (
                          <AlertTriangle size={16} className="text-red-500" />
                        )}
                        <span className="font-semibold text-white capitalize">
                          {report.issue_type.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline" className={cn(
                          report.severity === 'critical' ? 'border-red-500 text-red-400' :
                          report.severity === 'moderate' ? 'border-amber-500 text-amber-400' :
                          'border-zinc-600 text-zinc-400'
                        )}>
                          {report.severity}
                        </Badge>
                        <div className="text-xs text-zinc-500 mt-1">
                          {report.reported_at && format(parseISO(report.reported_at), 'MMM d, HH:mm')}
                        </div>
                      </div>
                    </div>
                    {report.piece_mark && (
                      <div className="text-sm text-zinc-400 mb-2">
                        Piece: <span className="font-mono text-white">{report.piece_mark}</span>
                      </div>
                    )}
                    {report.description && (
                      <div className="text-sm text-zinc-300 mb-2">{report.description}</div>
                    )}
                    {report.resolution_status !== 'open' && report.resolution_notes && (
                      <div className="mt-3 pt-3 border-t border-zinc-700">
                        <div className="text-xs text-zinc-500 mb-1">Resolution:</div>
                        <div className="text-sm text-zinc-300">{report.resolution_notes}</div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}