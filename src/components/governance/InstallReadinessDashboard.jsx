import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertCircle, XCircle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function InstallReadinessDashboard({ projectId }) {
  const { data: readiness, isLoading } = useQuery({
    queryKey: ['installReadiness', projectId],
    queryFn: async () => {
      const response = await base44.functions.invoke('computeInstallReadinessDashboard', {
        projectId
      });
      return response.data;
    },
    enabled: !!projectId,
    refetchInterval: 60000 // Refresh every minute
  });

  if (isLoading) return <div className="text-gray-400">Loading install readiness...</div>;
  if (!readiness) return null;

  const { total_wps, safe_to_install, blocked, readiness_detail } = readiness;
  const safeWps = readiness_detail.filter(w => w.safe_to_install);
  const blockedWps = readiness_detail.filter(w => !w.safe_to_install);

  return (
    <div className="space-y-4">
      <Card className="bg-gradient-to-r from-slate-900 to-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>🏗️ Field Safe to Install?</span>
            <div className="flex gap-3">
              <div className="text-right">
                <div className="text-2xl font-bold text-green-400">{safe_to_install}</div>
                <div className="text-xs text-green-600">Ready</div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-red-400">{blocked}</div>
                <div className="text-xs text-red-600">Blocked</div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-400">{total_wps}</div>
                <div className="text-xs text-gray-500">Total</div>
              </div>
            </div>
          </CardTitle>
          <CardDescription>Erection area readiness status</CardDescription>
        </CardHeader>
      </Card>

      <Tabs defaultValue="safe" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="safe">
            <CheckCircle2 className="w-4 h-4 mr-2 text-green-500" />
            Safe ({safe_to_install})
          </TabsTrigger>
          <TabsTrigger value="blocked">
            <AlertCircle className="w-4 h-4 mr-2 text-red-500" />
            Blocked ({blocked})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="safe" className="space-y-3">
          {safeWps.map((wp) => (
            <Card key={wp.wp_id} className="border-green-900/20">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-semibold text-green-400 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      {wp.wpid}: {wp.title}
                    </div>
                    <div className="text-xs text-green-600 mt-1">{wp.reasons[0]}</div>
                  </div>
                  <Badge variant="default" className="bg-green-900 text-green-200">
                    YES
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="blocked" className="space-y-3">
          {blockedWps.map((wp) => (
            <Card key={wp.wp_id} className="border-red-900/20">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="font-semibold text-red-400 flex items-center gap-2">
                      <XCircle className="w-4 h-4" />
                      {wp.wpid}: {wp.title}
                    </div>
                    <div className="text-xs text-red-600 mt-2 space-y-1">
                      {wp.reasons.map((reason, idx) => (
                        <div key={idx}>• {reason}</div>
                      ))}
                    </div>
                  </div>
                  <Badge variant="destructive" className="bg-red-900">
                    NO
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}