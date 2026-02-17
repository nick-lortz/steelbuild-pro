import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertTriangle, CheckCircle, RefreshCw, Filter, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import MarginRiskWidget from './MarginRiskWidget';

const IMPACT_COLORS = {
  Rework: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  InstallBlocked: 'bg-red-500/20 text-red-400 border-red-500/30',
  DeliveryWaste: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  FabSlip: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  EquipmentIdle: 'bg-blue-500/20 text-blue-400 border-blue-500/30'
};

export default function MarginRiskDashboard({ projectId }) {
  const queryClient = useQueryClient();
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterArea, setFilterArea] = useState('all');

  const { data: activeRisks = [] } = useQuery({
    queryKey: ['margin-risks', projectId, 'Active'],
    queryFn: () => base44.entities.MarginRiskEvent.filter({
      project_id: projectId,
      risk_status: 'Active'
    }),
    enabled: !!projectId
  });

  const { data: mitigatedRisks = [] } = useQuery({
    queryKey: ['margin-risks', projectId, 'Mitigated'],
    queryFn: () => base44.entities.MarginRiskEvent.filter({
      project_id: projectId,
      risk_status: 'Mitigated'
    }),
    enabled: !!projectId
  });

  const updateRiskMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.MarginRiskEvent.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['margin-risks', projectId] });
      queryClient.invalidateQueries({ queryKey: ['margin-snapshot', projectId] });
    }
  });

  const recalculateMutation = useMutation({
    mutationFn: () => base44.functions.invoke('calculateMarginRisk', { project_id: projectId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['margin-risks', projectId] });
      queryClient.invalidateQueries({ queryKey: ['margin-snapshot', projectId] });
    }
  });

  const areas = [...new Set(activeRisks.map(r => r.area_id).filter(Boolean))];

  const filteredRisks = activeRisks.filter(risk => {
    if (filterCategory !== 'all' && risk.impact_category !== filterCategory) return false;
    if (filterArea !== 'all' && risk.area_id !== filterArea) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Margin Risk Analysis</h2>
          <p className="text-sm text-zinc-500">Real-time coordination impact tracking</p>
        </div>
        <Button
          onClick={() => recalculateMutation.mutate()}
          disabled={recalculateMutation.isPending}
        >
          <RefreshCw size={16} className={cn("mr-2", recalculateMutation.isPending && "animate-spin")} />
          Recalculate
        </Button>
      </div>

      {/* Summary Widget */}
      <MarginRiskWidget projectId={projectId} />

      {/* Risk Events Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Risk Events</CardTitle>
            <div className="flex items-center gap-2">
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-40 bg-zinc-900 border-zinc-700 h-11">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="Rework">Rework</SelectItem>
                  <SelectItem value="InstallBlocked">Install Blocked</SelectItem>
                  <SelectItem value="DeliveryWaste">Delivery Waste</SelectItem>
                  <SelectItem value="FabSlip">Fab Slip</SelectItem>
                  <SelectItem value="EquipmentIdle">Equipment Idle</SelectItem>
                </SelectContent>
              </Select>

              {areas.length > 0 && (
                <Select value={filterArea} onValueChange={setFilterArea}>
                  <SelectTrigger className="w-40 bg-zinc-900 border-zinc-700 h-11">
                    <SelectValue placeholder="Area" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Areas</SelectItem>
                    {areas.map(area => (
                      <SelectItem key={area} value={area}>{area}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <Tabs defaultValue="active">
            <TabsList>
              <TabsTrigger value="active">
                Active ({activeRisks.length})
              </TabsTrigger>
              <TabsTrigger value="mitigated">
                Mitigated ({mitigatedRisks.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="active" className="space-y-3 mt-4">
              {filteredRisks.length === 0 ? (
                <div className="text-center py-12 text-zinc-500">
                  <CheckCircle size={48} className="mx-auto mb-3 text-green-500" />
                  <p className="text-lg font-medium">No active margin risks</p>
                  <p className="text-sm">All coordination issues resolved or mitigated</p>
                </div>
              ) : (
                filteredRisks.map(risk => (
                  <Card key={risk.id} className="bg-zinc-900/50">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <Badge className={IMPACT_COLORS[risk.impact_category]}>
                              {risk.impact_category}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {risk.linked_entity_type}
                            </Badge>
                            {risk.area_id && (
                              <Badge variant="outline" className="text-xs">
                                {risk.area_id}
                              </Badge>
                            )}
                          </div>

                          <p className="text-sm text-white font-medium">{risk.description}</p>

                          <div className="flex items-center gap-4 text-xs text-zinc-500">
                            <span>Risk Score: {risk.risk_score}/100</span>
                            {risk.install_tons_affected > 0 && (
                              <span>{risk.install_tons_affected}T affected</span>
                            )}
                            {risk.estimated_schedule_impact_days > 0 && (
                              <span>{risk.estimated_schedule_impact_days}d delay</span>
                            )}
                            <span>Created {format(new Date(risk.created_date), 'MMM d')}</span>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-2">
                          <div className="text-xl font-bold text-red-400">
                            -${risk.estimated_cost_impact.toLocaleString()}
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateRiskMutation.mutate({
                              id: risk.id,
                              data: { risk_status: 'Mitigated', resolved_at: new Date().toISOString() }
                            })}
                          >
                            Mark Mitigated
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="mitigated" className="space-y-3 mt-4">
              {mitigatedRisks.length === 0 ? (
                <div className="text-center py-12 text-zinc-500">
                  <p>No mitigated risks yet</p>
                </div>
              ) : (
                mitigatedRisks.map(risk => (
                  <Card key={risk.id} className="bg-zinc-900/30 opacity-60">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <Badge className={IMPACT_COLORS[risk.impact_category]}>
                              {risk.impact_category}
                            </Badge>
                            <CheckCircle size={14} className="text-green-400" />
                          </div>
                          <p className="text-sm text-zinc-400">{risk.description}</p>
                          <div className="text-xs text-zinc-600">
                            Resolved {risk.resolved_at && format(new Date(risk.resolved_at), 'MMM d, yyyy')}
                          </div>
                        </div>
                        <div className="text-sm text-zinc-500">
                          ${risk.estimated_cost_impact.toLocaleString()}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}