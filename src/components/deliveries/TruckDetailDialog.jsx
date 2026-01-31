import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Truck,
  MapPin,
  Clock,
  FileText,
  AlertTriangle,
  Package,
  Weight,
  Wrench,
  CheckCircle2,
  Camera,
  Plus,
  Play,
  StopCircle
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from '@/components/ui/notifications';

export default function TruckDetailDialog({ load, open, onOpenChange, onUpdate }) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('pieces');
  const [showConditionForm, setShowConditionForm] = useState(false);
  const [conditionForm, setConditionForm] = useState({
    piece_mark: '',
    issue_type: 'acceptable',
    severity: 'minor',
    description: ''
  });

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

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
    mutationFn: (newStatus) => {
      const updates = { status: newStatus };
      if (newStatus === 'arrived') {
        updates.actual_arrival_time = new Date().toISOString();
      }
      if (newStatus === 'complete') {
        // Update all pieces to on_site
        const pieceUpdates = pieces.map(p =>
          base44.entities.SteelPiece.update(p.id, {
            current_status: 'on_site',
            current_location: load.laydown_zone || 'Laydown'
          })
        );
        return Promise.all([
          base44.entities.LoadTruck.update(load.id, updates),
          ...pieceUpdates
        ]);
      }
      return base44.entities.LoadTruck.update(load.id, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loads'] });
      queryClient.invalidateQueries({ queryKey: ['steel-pieces'] });
      toast.success('Status updated');
      onUpdate();
    }
  });

  const submitConditionMutation = useMutation({
    mutationFn: async (data) => {
      return await base44.entities.LoadConditionReport.create({
        ...data,
        load_truck_id: load.id,
        reported_by: currentUser?.email,
        reported_at: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['load-reports'] });
      toast.success('Condition report submitted');
      setShowConditionForm(false);
      setConditionForm({
        piece_mark: '',
        issue_type: 'acceptable',
        severity: 'minor',
        description: ''
      });
    },
    onError: () => toast.error('Failed to submit report')
  });

  const handleConditionSubmit = () => {
    if (conditionForm.issue_type !== 'acceptable' && !conditionForm.description) {
      toast.error('Description required for issues');
      return;
    }
    submitConditionMutation.mutate(conditionForm);
  };

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

  const totalWeight = pieces.reduce((sum, p) => sum + (p.weight || 0), 0);
  const sequenceZones = [...new Set(pieces.map(p => p.sequence_zone).filter(Boolean))];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto bg-zinc-900 border-zinc-800 text-white">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Truck size={24} className="text-amber-500" />
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold">{load.load_number}</h2>
                  <Badge className={cn("font-bold", getStatusColor(load.status))}>
                    {load.status.replace('_', ' ').toUpperCase()}
                  </Badge>
                </div>
                <p className="text-sm text-zinc-500">{load.carrier_name || 'Carrier TBD'} • {load.truck_id || 'Truck TBD'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {load.status === 'scheduled' && (
                <Button
                  size="sm"
                  onClick={() => updateStatusMutation.mutate('in_transit')}
                  disabled={updateStatusMutation.isPending}
                  className="bg-amber-500 hover:bg-amber-600 text-black font-bold"
                >
                  <Play size={14} className="mr-1" />
                  Start Transit
                </Button>
              )}
              {load.status === 'in_transit' && (
                <Button
                  size="sm"
                  onClick={() => updateStatusMutation.mutate('arrived')}
                  disabled={updateStatusMutation.isPending}
                  className="bg-green-600 hover:bg-green-700 text-white font-bold"
                >
                  <CheckCircle2 size={14} className="mr-1" />
                  Check In
                </Button>
              )}
              {load.status === 'arrived' && (
                <Button
                  size="sm"
                  onClick={() => updateStatusMutation.mutate('unloading')}
                  disabled={updateStatusMutation.isPending}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-bold"
                >
                  <Play size={14} className="mr-1" />
                  Start Unload
                </Button>
              )}
              {load.status === 'unloading' && (
                <Button
                  size="sm"
                  onClick={() => updateStatusMutation.mutate('complete')}
                  disabled={updateStatusMutation.isPending}
                  className="bg-green-600 hover:bg-green-700 text-white font-bold"
                >
                  <StopCircle size={14} className="mr-1" />
                  Complete
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* Summary Cards */}
        <div className="grid grid-cols-5 gap-3 mb-4">
          <Card className="bg-zinc-800/50 border-zinc-700">
            <CardContent className="p-3">
              <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">Pieces</div>
              <div className="text-2xl font-bold text-white">{pieces.length}</div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-800/50 border-zinc-700">
            <CardContent className="p-3">
              <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">Weight</div>
              <div className="text-2xl font-bold text-white">{totalWeight.toFixed(1)}t</div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-800/50 border-zinc-700">
            <CardContent className="p-3">
              <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">Sequences</div>
              <div className="text-2xl font-bold text-white">{sequenceZones.length}</div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-800/50 border-zinc-700">
            <CardContent className="p-3">
              <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">Equipment</div>
              <div className="text-2xl font-bold text-blue-400">{equipment.length}</div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-800/50 border-zinc-700">
            <CardContent className="p-3">
              <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">Issues</div>
              <div className={cn(
                "text-2xl font-bold",
                reports.filter(r => r.resolution_status === 'open' && r.issue_type !== 'acceptable').length > 0
                  ? "text-red-500"
                  : "text-green-500"
              )}>
                {reports.filter(r => r.resolution_status === 'open' && r.issue_type !== 'acceptable').length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Timing & Permit Info */}
        {(load.planned_arrival_start || load.is_osow) && (
          <Card className="bg-zinc-800/50 border-zinc-700 mb-4">
            <CardContent className="p-4">
              <div className="grid grid-cols-3 gap-4">
                {load.planned_arrival_start && (
                  <div>
                    <div className="text-xs text-zinc-500 mb-1">Scheduled Window</div>
                    <div className="text-white font-semibold">
                      {format(parseISO(load.planned_arrival_start), 'MMM d • HH:mm')}
                      {load.planned_arrival_end && ` - ${format(parseISO(load.planned_arrival_end), 'HH:mm')}`}
                    </div>
                  </div>
                )}
                {load.actual_arrival_time && (
                  <div>
                    <div className="text-xs text-zinc-500 mb-1">Actual Arrival</div>
                    <div className="text-green-400 font-semibold">
                      {format(parseISO(load.actual_arrival_time), 'MMM d • HH:mm')}
                    </div>
                  </div>
                )}
                {load.is_osow && (
                  <div>
                    <Badge variant="outline" className="border-orange-500 text-orange-500 mb-1">
                      OSOW
                    </Badge>
                    <div className="text-xs">
                      <div className="text-zinc-500">Permit: <span className="text-white">{load.permit_number || 'Pending'}</span></div>
                      {load.permit_expiration && (
                        <div className="text-zinc-500 mt-1">
                          Expires: <span className="text-white">{format(parseISO(load.permit_expiration), 'MMM d')}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-zinc-800 border-zinc-700 w-full justify-start">
            <TabsTrigger value="pieces" className="flex items-center gap-2">
              <Package size={14} />
              Pieces ({pieces.length})
            </TabsTrigger>
            <TabsTrigger value="equipment" className="flex items-center gap-2">
              <Wrench size={14} />
              Equipment ({equipment.length})
            </TabsTrigger>
            <TabsTrigger value="condition" className="flex items-center gap-2">
              <Camera size={14} />
              Condition ({reports.length})
            </TabsTrigger>
            <TabsTrigger value="docs" className="flex items-center gap-2">
              <FileText size={14} />
              Documents
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
                    <th className="text-left p-3 text-xs font-medium text-zinc-400 uppercase">Fab Status</th>
                    <th className="text-left p-3 text-xs font-medium text-zinc-400 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {pieces.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-zinc-500 text-sm">
                        No pieces assigned to this load
                      </td>
                    </tr>
                  ) : (
                    pieces.map(piece => (
                      <tr key={piece.id} className="border-b border-zinc-800 hover:bg-zinc-800/30">
                        <td className="p-3">
                          <span className="font-mono font-bold text-white">{piece.piece_mark}</span>
                        </td>
                        <td className="p-3">
                          <Badge variant="outline" className="text-[10px] border-zinc-600">
                            {piece.sequence_zone || 'N/A'}
                          </Badge>
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
                          <Badge variant="outline" className={cn(
                            "text-[10px]",
                            piece.fabrication_stage === 'ready' ? 'border-green-500/30 text-green-400' : 'border-zinc-600'
                          )}>
                            {piece.fabrication_stage?.replace('_', ' ')}
                          </Badge>
                        </td>
                        <td className="p-3">
                          <Badge variant="outline" className="text-[10px]">
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
              <div className="text-center py-12 text-zinc-500 text-sm">
                No equipment requirements specified
              </div>
            ) : (
              equipment.map((eq, idx) => (
                <Card key={idx} className="bg-zinc-800/50 border-zinc-700">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Wrench size={16} className="text-blue-400" />
                          <span className="font-bold text-white capitalize">
                            {eq.equipment_type.replace(/_/g, ' ')}
                          </span>
                          <Badge variant="outline" className="border-blue-500/30 text-blue-400 text-[10px]">
                            Qty: {eq.quantity}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          {eq.crew_size && (
                            <div>
                              <span className="text-zinc-500">Crew Size:</span>
                              <span className="ml-2 text-white font-semibold">{eq.crew_size}</span>
                            </div>
                          )}
                          {eq.deck_access && (
                            <div>
                              <span className="text-zinc-500">Access:</span>
                              <span className="ml-2 text-white">{eq.deck_access}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    {eq.rigging_notes && (
                      <div className="mt-3 pt-3 border-t border-zinc-700">
                        <div className="text-xs text-zinc-500 mb-1">Rigging Notes:</div>
                        <div className="text-sm text-zinc-300">{eq.rigging_notes}</div>
                      </div>
                    )}
                    {eq.special_handling && (
                      <div className="mt-2 p-2 bg-amber-500/10 border border-amber-500/30 rounded">
                        <div className="text-xs text-amber-400 mb-1 font-bold">⚠️ Special Handling:</div>
                        <div className="text-sm text-amber-300">{eq.special_handling}</div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Condition Reports Tab */}
          <TabsContent value="condition" className="mt-4 space-y-3">
            <Button
              onClick={() => setShowConditionForm(!showConditionForm)}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 w-full"
            >
              <Plus size={14} className="mr-2" />
              New Condition Report
            </Button>

            {showConditionForm && (
              <Card className="bg-zinc-800/50 border-zinc-700">
                <CardContent className="p-4 space-y-3">
                  <div>
                    <label className="text-xs text-zinc-400 mb-1 block">Piece Mark (Optional)</label>
                    <Select 
                      value={conditionForm.piece_mark} 
                      onValueChange={(val) => setConditionForm({...conditionForm, piece_mark: val})}
                    >
                      <SelectTrigger className="bg-zinc-900 border-zinc-700">
                        <SelectValue placeholder="Overall load or select piece..." />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-800">
                        <SelectItem value={null}>Overall Load</SelectItem>
                        {pieces.map(p => (
                          <SelectItem key={p.id} value={p.piece_mark}>{p.piece_mark}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-zinc-400 mb-1 block">Issue Type</label>
                      <Select 
                        value={conditionForm.issue_type} 
                        onValueChange={(val) => setConditionForm({...conditionForm, issue_type: val})}
                      >
                        <SelectTrigger className="bg-zinc-900 border-zinc-700">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-zinc-800">
                          <SelectItem value="acceptable">Acceptable</SelectItem>
                          <SelectItem value="damage">Damage</SelectItem>
                          <SelectItem value="defect">Defect</SelectItem>
                          <SelectItem value="missing">Missing</SelectItem>
                          <SelectItem value="incorrect">Incorrect</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-xs text-zinc-400 mb-1 block">Severity</label>
                      <Select 
                        value={conditionForm.severity} 
                        onValueChange={(val) => setConditionForm({...conditionForm, severity: val})}
                        disabled={conditionForm.issue_type === 'acceptable'}
                      >
                        <SelectTrigger className="bg-zinc-900 border-zinc-700">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-zinc-800">
                          <SelectItem value="minor">Minor</SelectItem>
                          <SelectItem value="moderate">Moderate</SelectItem>
                          <SelectItem value="critical">Critical</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-zinc-400 mb-1 block">Description</label>
                    <Textarea
                      value={conditionForm.description}
                      onChange={(e) => setConditionForm({...conditionForm, description: e.target.value})}
                      placeholder="Describe condition or issue..."
                      className="bg-zinc-900 border-zinc-700 h-20"
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={handleConditionSubmit}
                      disabled={submitConditionMutation.isPending}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      Submit Report
                    </Button>
                    <Button
                      onClick={() => setShowConditionForm(false)}
                      variant="outline"
                      className="border-zinc-700"
                    >
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {reports.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle2 size={48} className="mx-auto mb-4 text-green-500/50" />
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
                        {report.piece_mark && (
                          <Badge variant="outline" className="text-[10px] font-mono border-zinc-600">
                            {report.piece_mark}
                          </Badge>
                        )}
                      </div>
                      <div className="text-right">
                        <Badge variant="outline" className={cn(
                          "text-[10px]",
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
                    {report.description && (
                      <div className="text-sm text-zinc-300 mb-2">{report.description}</div>
                    )}
                    {report.reported_by && (
                      <div className="text-xs text-zinc-500">
                        By: {report.reported_by}
                      </div>
                    )}
                    {report.resolution_status !== 'open' && report.resolution_notes && (
                      <div className="mt-3 pt-3 border-t border-zinc-700">
                        <div className="text-xs text-green-400 mb-1">✓ Resolution:</div>
                        <div className="text-sm text-zinc-300">{report.resolution_notes}</div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="docs" className="mt-4">
            <Card className="bg-zinc-800/50 border-zinc-700">
              <CardContent className="p-6">
                <div className="text-center">
                  <FileText size={48} className="mx-auto mb-4 text-zinc-600" />
                  <p className="text-sm text-zinc-500 mb-3">Bill of Lading</p>
                  {load.bol_document_url ? (
                    <Button
                      onClick={() => window.open(load.bol_document_url, '_blank')}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      View BOL Document
                    </Button>
                  ) : (
                    <p className="text-xs text-zinc-600">No BOL uploaded</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}