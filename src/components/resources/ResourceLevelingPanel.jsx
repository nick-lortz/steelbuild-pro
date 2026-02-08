import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { apiClient } from '@/api/client';
import { toast } from '@/components/ui/notifications';

export default function ResourceLevelingPanel({ projectId }) {
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);

  const runLeveling = async () => {
    setAnalyzing(true);
    try {
      const response = await apiClient.functions.invoke('levelResources', {
        project_id: projectId
      });

      setAnalysis(response.data);
      toast.success('Resource leveling complete');
    } catch (error) {
      toast.error('Leveling analysis failed');
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity size={20} />
            Resource Leveling Algorithm
          </CardTitle>
          <Button 
            onClick={runLeveling}
            disabled={analyzing || !projectId}
            size="sm"
            className="bg-amber-500 hover:bg-amber-600 text-black"
          >
            {analyzing ? 'Analyzing...' : 'Run Analysis'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!analysis ? (
          <div className="text-center py-8 text-zinc-500">
            <Activity size={40} className="mx-auto mb-3 text-zinc-700" />
            <p className="text-sm">Analyze resource allocation and get optimization suggestions</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Metrics */}
            <div className="grid grid-cols-4 gap-3">
              <div className="bg-zinc-950 p-3 rounded border border-zinc-800">
                <p className="text-xs text-zinc-500 uppercase mb-1">Avg Demand</p>
                <p className="text-xl font-bold text-white">{analysis.metrics.avg_demand}</p>
              </div>

              <div className="bg-zinc-950 p-3 rounded border border-zinc-800">
                <p className="text-xs text-zinc-500 uppercase mb-1">Peak Demand</p>
                <p className="text-xl font-bold text-amber-500">{analysis.metrics.peak_demand}</p>
              </div>

              <div className="bg-zinc-950 p-3 rounded border border-zinc-800">
                <p className="text-xs text-zinc-500 uppercase mb-1">Overallocated Days</p>
                <p className="text-xl font-bold text-red-500">{analysis.metrics.overallocated_days}</p>
              </div>

              <div className="bg-zinc-950 p-3 rounded border border-zinc-800">
                <p className="text-xs text-zinc-500 uppercase mb-1">Total Overload</p>
                <p className="text-xl font-bold text-red-500">{analysis.metrics.total_overload}</p>
              </div>
            </div>

            {/* Suggestions */}
            {analysis.suggestions.length > 0 ? (
              <div>
                <h4 className="text-sm font-bold text-white mb-3">Optimization Suggestions</h4>
                <div className="space-y-2">
                  {analysis.suggestions.map((sug, idx) => (
                    <div key={idx} className="bg-zinc-950 p-3 rounded border border-zinc-800 flex items-start gap-3">
                      <AlertTriangle size={16} className="text-amber-500 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm text-white font-medium mb-1">
                          {sug.action === 'delay_task' ? 'Delay Task' : 'Reassign Resource'}
                        </p>
                        <p className="text-xs text-zinc-400">
                          {sug.task_name} - {sug.reason}
                        </p>
                        {sug.action === 'delay_task' && (
                          <p className="text-xs text-amber-400 mt-1">
                            Suggested delay: {sug.suggested_delay_days} day(s)
                          </p>
                        )}
                        {sug.action === 'reassign_resource' && (
                          <p className="text-xs text-blue-400 mt-1">
                            {sug.from_resource_name} → {sug.to_resource_name}
                          </p>
                        )}
                      </div>
                      <Badge 
                        variant="outline"
                        className={
                          sug.impact === 'high' ? 'border-red-500 text-red-400' :
                          sug.impact === 'medium' ? 'border-amber-500 text-amber-400' :
                          'border-green-500 text-green-400'
                        }
                      >
                        {sug.impact}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-green-950/20 border border-green-500/30 p-4 rounded flex items-center gap-3">
                <CheckCircle2 size={20} className="text-green-400" />
                <div>
                  <p className="text-sm text-green-400 font-bold">Optimal Allocation</p>
                  <p className="text-xs text-zinc-400">No resource conflicts detected</p>
                </div>
              </div>
            )}

            {/* Overallocations */}
            {analysis.overallocations.length > 0 && (
              <div>
                <h4 className="text-sm font-bold text-white mb-3">Resource Conflicts</h4>
                <div className="border border-zinc-800 rounded overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-zinc-950">
                      <tr className="text-xs text-zinc-400 uppercase">
                        <th className="text-left p-3">Resource</th>
                        <th className="text-left p-3">Date</th>
                        <th className="text-right p-3">Demand</th>
                        <th className="text-right p-3">Capacity</th>
                        <th className="text-right p-3">Overload</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analysis.overallocations.slice(0, 10).map((oa, idx) => (
                        <tr key={idx} className="border-t border-zinc-800">
                          <td className="p-3 text-sm text-white">{oa.resource_name}</td>
                          <td className="p-3 text-sm text-zinc-400">{oa.date}</td>
                          <td className="p-3 text-sm text-right text-red-400 font-bold">{oa.demand}</td>
                          <td className="p-3 text-sm text-right text-zinc-400">{oa.capacity}</td>
                          <td className="p-3 text-sm text-right text-red-500 font-bold">+{oa.overload}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}