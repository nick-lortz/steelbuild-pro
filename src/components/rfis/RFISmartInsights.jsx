import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { Lightbulb, TrendingUp, Zap, AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function RFISmartInsights({ projectId, rfis = [] }) {
  const [riskPredictions, setRiskPredictions] = useState(null);
  const [meetingSummary, setMeetingSummary] = useState(null);
  const [clusters, setClusters] = useState(null);

  const predictRiskMutation = useMutation({
    mutationFn: async () => {
      const sample = rfis.filter(r => r.status !== 'closed')[0];
      if (!sample) return null;
      
      const res = await base44.functions.invoke('predictRFIRisk', {
        project_id: projectId,
        rfi_type: sample.rfi_type,
        discipline: sample.discipline,
        is_blocker: sample.blocker_info?.is_blocker
      });
      return res.data;
    },
    onSuccess: (data) => {
      setRiskPredictions(data);
      toast.success('Risk prediction updated');
    }
  });

  const generateMeetingSummaryMutation = useMutation({
    mutationFn: async () => {
      const res = await base44.functions.invoke('generateRFIMeetingSummary', {
        project_id: projectId,
        meeting_date: new Date().toISOString().split('T')[0]
      });
      return res.data;
    },
    onSuccess: (data) => {
      setMeetingSummary(data);
      toast.success('Meeting summary generated');
    }
  });

  const clusterProblemsMutation = useMutation({
    mutationFn: async () => {
      const res = await base44.functions.invoke('clusterRFIsByProblem', {
        project_id: projectId
      });
      return res.data;
    },
    onSuccess: (data) => {
      setClusters(data);
      toast.success('Design patterns identified');
    }
  });

  const openRFIs = useMemo(() => rfis.filter(r => r.status !== 'closed'), [rfis]);

  return (
    <Tabs defaultValue="risk" className="w-full">
      <TabsList className="grid w-full grid-cols-3 bg-zinc-800">
        <TabsTrigger value="risk">Risk Predict</TabsTrigger>
        <TabsTrigger value="meeting">Meeting Summary</TabsTrigger>
        <TabsTrigger value="patterns">Design Patterns</TabsTrigger>
      </TabsList>

      {/* Risk Prediction */}
      <TabsContent value="risk" className="space-y-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Zap size={16} className="text-yellow-500" />
              Predictive Risk (Based on History)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={() => predictRiskMutation.mutate()}
              disabled={predictRiskMutation.isPending || openRFIs.length === 0}
              className="w-full"
            >
              {predictRiskMutation.isPending ? (
                <>
                  <Loader2 size={14} className="mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                'Analyze Current RFIs'
              )}
            </Button>

            {riskPredictions && (
              <div className="space-y-3 p-3 bg-zinc-800 rounded">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <div className="text-zinc-500 font-bold text-xs">Avg Response Time</div>
                    <div className="text-lg font-bold text-white">{riskPredictions.response_time_days}d</div>
                  </div>
                  <div>
                    <div className="text-zinc-500 font-bold text-xs">Risk Level</div>
                    <Badge className={
                      riskPredictions.risk_level === 'high' ? 'bg-red-700' :
                      riskPredictions.risk_level === 'medium' ? 'bg-yellow-700' :
                      'bg-green-700'
                    }>
                      {riskPredictions.risk_level.toUpperCase()}
                    </Badge>
                  </div>
                </div>

                <div className="text-xs text-zinc-400 space-y-1">
                  <div>💰 Cost Impact: {riskPredictions.cost_impact_likelihood}</div>
                  <div>📅 Schedule Impact: {riskPredictions.schedule_impact_likelihood}</div>
                  <div className="italic text-zinc-500 mt-2">{riskPredictions.reasoning}</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* Meeting Summary */}
      <TabsContent value="meeting" className="space-y-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Lightbulb size={16} className="text-blue-500" />
              Weekly RFI Summary for Meeting
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={() => generateMeetingSummaryMutation.mutate()}
              disabled={generateMeetingSummaryMutation.isPending || openRFIs.length === 0}
              className="w-full"
            >
              {generateMeetingSummaryMutation.isPending ? (
                <>
                  <Loader2 size={14} className="mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                'Generate Summary'
              )}
            </Button>

            {meetingSummary && (
              <div className="space-y-3 text-xs">
                <div className="p-2 bg-zinc-800 rounded">
                  <div className="font-bold text-white mb-1">Status</div>
                  <div className="text-zinc-300">{meetingSummary.executive_summary}</div>
                </div>

                {meetingSummary.critical_blockers?.length > 0 && (
                  <div className="p-2 bg-red-900/30 border border-red-700 rounded">
                    <div className="font-bold text-red-300 mb-1">🚨 Critical Blockers</div>
                    <ul className="text-red-200 space-y-1">
                      {meetingSummary.critical_blockers.map((item, idx) => (
                        <li key={idx}>• {item}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {meetingSummary.action_items?.length > 0 && (
                  <div className="p-2 bg-blue-900/30 border border-blue-700 rounded">
                    <div className="font-bold text-blue-300 mb-1">✓ Action Items</div>
                    <ul className="text-blue-200 space-y-1">
                      {meetingSummary.action_items.map((item, idx) => (
                        <li key={idx}>• {item}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* Design Patterns */}
      <TabsContent value="patterns" className="space-y-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <TrendingUp size={16} className="text-purple-500" />
              Design Problem Areas (RFI Clustering)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={() => clusterProblemsMutation.mutate()}
              disabled={clusterProblemsMutation.isPending}
              className="w-full"
            >
              {clusterProblemsMutation.isPending ? (
                <>
                  <Loader2 size={14} className="mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                'Identify Patterns'
              )}
            </Button>

            {clusters && (
              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-2 bg-zinc-800 rounded text-center">
                    <div className="text-zinc-500">Total</div>
                    <div className="text-lg font-bold">{clusters.total_rfis}</div>
                  </div>
                  <div className="p-2 bg-zinc-800 rounded text-center">
                    <div className="text-zinc-500">Patterns</div>
                    <div className="text-lg font-bold text-purple-400">{clusters.patterns.length}</div>
                  </div>
                  <div className="p-2 bg-zinc-800 rounded text-center">
                    <div className="text-zinc-500">Locations</div>
                    <div className="text-lg font-bold">{clusters.by_location.length}</div>
                  </div>
                </div>

                {clusters.patterns.length > 0 && (
                  <div className="p-3 bg-purple-900/30 border border-purple-700 rounded space-y-2">
                    <div className="font-bold text-purple-300">Problem Areas Detected</div>
                    {clusters.patterns.map((p, idx) => (
                      <div key={idx} className="text-purple-200 text-xs pl-2 border-l border-purple-600">
                        {p.pattern_type === 'location_concentration' ? (
                          <div>
                            <strong>{p.location}</strong>: {p.count} RFIs
                            <Badge variant="outline" className={p.severity === 'high' ? 'border-red-600 text-red-400 ml-2' : 'border-yellow-600 text-yellow-400 ml-2'}>
                              {p.severity}
                            </Badge>
                          </div>
                        ) : (
                          <div>
                            <strong>{p.rfi_type}</strong>: {p.count} RFIs ({p.cost_impact_count} cost + {p.schedule_impact_count} schedule)
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <div className="p-2 bg-zinc-800 rounded text-zinc-300 italic">
                  {clusters.summary}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}