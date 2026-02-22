import React, { useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle2, XCircle, DollarSign } from 'lucide-react';

export default function InstallReadinessBoard({ projectId }) {
  const { data: wps, isLoading } = useQuery({
    queryKey: ['workPackages', projectId, 'erection'],
    queryFn: async () => {
      return await base44.entities.WorkPackage.filter({
        project_id: projectId,
        phase: 'erection'
      });
    },
    enabled: !!projectId,
    refetchInterval: 60000
  });

  const { readyWps, blockedWps, totalCostRisk } = useMemo(() => {
    if (!wps) return { readyWps: [], blockedWps: [], totalCostRisk: 0 };

    const ready = wps.filter(w => w.install_ready === true);
    const blocked = wps.filter(w => w.install_ready === false);
    const totalRisk = blocked.reduce((sum, w) => sum + (w.readiness_cost_risk || 0), 0);

    return {
      readyWps: ready.sort((a, b) => (a.install_day || 0) - (b.install_day || 0)),
      blockedWps: blocked.sort((a, b) => (a.install_day || 0) - (b.install_day || 0)),
      totalCostRisk: totalRisk
    };
  }, [wps]);

  if (isLoading) return <div className="text-gray-400">Loading install readiness...</div>;

  const totalWps = (wps || []).length;

  return (
    <div className="space-y-4">
      {/* Header Stats */}
      <Card className="bg-gradient-to-r from-slate-900 to-slate-800 border-slate-700">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-base">
            <span>Install Readiness Board</span>
            <div className="flex gap-4 text-sm">
              <div>
                <div className="text-xl font-bold text-green-400">{readyWps.length}</div>
                <div className="text-xs text-green-600">Ready</div>
              </div>
              <div>
                <div className="text-xl font-bold text-red-400">{blockedWps.length}</div>
                <div className="text-xs text-red-600">Blocked</div>
              </div>
              <div>
                <div className="text-xl font-bold text-amber-400">${(totalCostRisk / 1000).toFixed(1)}K</div>
                <div className="text-xs text-amber-600">Risk</div>
              </div>
            </div>
          </CardTitle>
          <CardDescription>What can we legally install today?</CardDescription>
        </CardHeader>
      </Card>

      {/* Table View */}
      <Tabs defaultValue="blocked" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="blocked">
            <XCircle className="w-4 h-4 mr-2 text-red-500" />
            Blocked ({blockedWps.length})
          </TabsTrigger>
          <TabsTrigger value="ready">
            <CheckCircle2 className="w-4 h-4 mr-2 text-green-500" />
            Ready ({readyWps.length})
          </TabsTrigger>
        </TabsList>

        {/* Blocked WPs */}
        <TabsContent value="blocked">
          <div className="space-y-2">
            {blockedWps.length === 0 ? (
              <Card className="border-green-900/20 bg-green-950/10">
                <CardContent className="pt-6 pb-6">
                  <div className="text-center text-green-400 text-sm">All WPs ready for install!</div>
                </CardContent>
              </Card>
            ) : (
              blockedWps.map((wp) => (
                <Card key={wp.id} className="border-red-900/20 hover:bg-red-950/5 transition">
                  <CardContent className="pt-4 pb-4">
                    <div className="grid grid-cols-12 gap-3 items-start">
                      {/* WP Number */}
                      <div className="col-span-2">
                        <div className="font-semibold text-red-300">{wp.wpid}</div>
                        <div className="text-xs text-gray-500">WP</div>
                      </div>

                      {/* Install Day */}
                      <div className="col-span-1">
                        <div className="font-semibold text-gray-300">{wp.install_day || '—'}</div>
                        <div className="text-xs text-gray-500">Day</div>
                      </div>

                      {/* Status */}
                      <div className="col-span-2">
                        <Badge className="bg-red-900 text-red-200 w-full justify-center">NOT READY</Badge>
                      </div>

                      {/* Blocking Reasons */}
                      <div className="col-span-4 text-xs text-red-300 space-y-0.5">
                        {wp.readiness_reason && wp.readiness_reason.slice(0, 2).map((reason, idx) => (
                          <div key={idx}>• {reason}</div>
                        ))}
                        {wp.readiness_reason && wp.readiness_reason.length > 2 && (
                          <div className="text-red-600">+ {wp.readiness_reason.length - 2} more</div>
                        )}
                      </div>

                      {/* Cost Risk */}
                      <div className="col-span-3 text-right">
                        <div className="flex items-center justify-end gap-1 text-xs font-semibold text-amber-400">
                          <DollarSign className="w-3 h-3" />
                          {(wp.readiness_cost_risk || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                        </div>
                        <div className="text-xs text-gray-500">Delay Cost</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* Ready WPs */}
        <TabsContent value="ready">
          <div className="space-y-2">
            {readyWps.length === 0 ? (
              <Card className="border-amber-900/20 bg-amber-950/10">
                <CardContent className="pt-6 pb-6">
                  <div className="text-center text-amber-400 text-sm">No WPs ready yet</div>
                </CardContent>
              </Card>
            ) : (
              readyWps.map((wp) => (
                <Card key={wp.id} className="border-green-900/20 hover:bg-green-950/5 transition">
                  <CardContent className="pt-4 pb-4">
                    <div className="grid grid-cols-12 gap-3 items-start">
                      <div className="col-span-2">
                        <div className="font-semibold text-green-300">{wp.wpid}</div>
                        <div className="text-xs text-gray-500">WP</div>
                      </div>

                      <div className="col-span-1">
                        <div className="font-semibold text-gray-300">{wp.install_day || '—'}</div>
                        <div className="text-xs text-gray-500">Day</div>
                      </div>

                      <div className="col-span-2">
                        <Badge className="bg-green-900 text-green-200 w-full justify-center">READY</Badge>
                      </div>

                      <div className="col-span-4 text-xs text-green-300">
                        ✓ All conditions met
                      </div>

                      <div className="col-span-3 text-right">
                        <div className="flex items-center justify-end gap-1 text-xs text-green-400">
                          <CheckCircle2 className="w-3 h-3" />
                          No risk
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}