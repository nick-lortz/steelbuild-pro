import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { apiClient } from '@/api/client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Sparkles, TrendingDown, TrendingUp, AlertTriangle, Target, 
  Zap, TrendingUpIcon, BarChart3, Clock, DollarSign, Users 
} from 'lucide-react';
import { toast } from '@/components/ui/notifications';

export default function ProjectAnalyticsInsights() {
  const [refreshing, setRefreshing] = useState(false);

  const { data: analytics, isLoading, error, refetch } = useQuery({
    queryKey: ['projectAnalytics'],
    queryFn: async () => {
      const response = await apiClient.functions.invoke('getProjectAnalytics', {});
      return response.data;
    },
    staleTime: 60 * 60 * 1000, // 1 hour
    gcTime: 2 * 60 * 60 * 1000
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
      toast.success('Analytics updated');
    } catch (err) {
      toast.error('Refresh failed');
    } finally {
      setRefreshing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-zinc-400">Analyzing historical project data...</p>
        </div>
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="p-6">
        <Alert className="bg-red-950/20 border-red-500/30">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>Failed to load analytics. Try refreshing.</AlertDescription>
        </Alert>
      </div>
    );
  }

  const { trends, bottlenecks, optimization_recommendations, critical_focus_areas, project_metrics, confidence } = analytics;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Sparkles className="text-amber-500" size={24} />
            Project Analytics & Insights
          </h2>
          <p className="text-sm text-zinc-400 mt-1">
            Analysis of {trends.projects_analyzed} completed projects • Confidence: {confidence.toUpperCase()}
          </p>
        </div>
        <Button
          onClick={handleRefresh}
          disabled={refreshing}
          variant="outline"
          className="gap-2 bg-amber-500/10 border-amber-500/20 text-amber-400"
        >
          {refreshing ? 'Analyzing...' : 'Refresh Analysis'}
        </Button>
      </div>

      {/* Critical Focus Areas */}
      {critical_focus_areas && critical_focus_areas.length > 0 && (
        <Alert className="bg-red-950/30 border-red-500/40">
          <AlertTriangle className="h-5 w-5 text-red-400" />
          <AlertDescription>
            <p className="font-bold text-red-300 mb-2">Critical Focus Areas for Improvement:</p>
            <ul className="list-disc list-inside space-y-1 text-sm text-red-200">
              {critical_focus_areas.map((area, idx) => (
                <li key={idx}>{area}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="trends" className="space-y-4">
        <TabsList className="bg-zinc-900 border border-zinc-800">
          <TabsTrigger value="trends">Performance Trends</TabsTrigger>
          <TabsTrigger value="bottlenecks">Bottleneck Analysis</TabsTrigger>
          <TabsTrigger value="recommendations">Optimization</TabsTrigger>
          <TabsTrigger value="history">Project Details</TabsTrigger>
        </TabsList>

        {/* TRENDS TAB */}
        <TabsContent value="trends" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Cost Performance */}
            <Card className="bg-zinc-900/80 border-zinc-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <DollarSign size={16} className={trends.avg_cost_variance_pct < 0 ? 'text-red-500' : 'text-green-500'} />
                  Cost Performance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <p className="text-3xl font-bold text-white">{trends.avg_cost_variance_pct}%</p>
                  <p className="text-xs text-zinc-400">Average variance (neg = overrun)</p>
                </div>
                <div className="bg-zinc-950 p-2 rounded text-xs text-zinc-400">
                  {trends.overrun_projects} of {trends.projects_analyzed} projects over budget
                </div>
              </CardContent>
            </Card>

            {/* Schedule Performance */}
            <Card className="bg-zinc-900/80 border-zinc-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Clock size={16} className={trends.avg_schedule_variance_pct < 0 ? 'text-red-500' : 'text-green-500'} />
                  Schedule Performance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <p className="text-3xl font-bold text-white">{trends.avg_schedule_variance_pct}%</p>
                  <p className="text-xs text-zinc-400">Average variance (neg = delayed)</p>
                </div>
                <div className="bg-zinc-950 p-2 rounded text-xs text-zinc-400">
                  {trends.delayed_projects} of {trends.projects_analyzed} projects delayed
                </div>
              </CardContent>
            </Card>

            {/* RFI Performance */}
            <Card className="bg-zinc-900/80 border-zinc-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Clock size={16} className="text-blue-500" />
                  RFI Response Time
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <p className="text-3xl font-bold text-white">{trends.avg_rfi_response_days}</p>
                  <p className="text-xs text-zinc-400">Days average to respond</p>
                </div>
                <div className={`bg-zinc-950 p-2 rounded text-xs ${trends.avg_rfi_response_days > 10 ? 'text-red-400' : 'text-green-400'}`}>
                  {trends.avg_rfi_response_days > 10 ? '⚠️ Above typical' : '✓ Within target'}
                </div>
              </CardContent>
            </Card>

            {/* Labor Productivity */}
            <Card className="bg-zinc-900/80 border-zinc-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Users size={16} className={trends.avg_labor_productivity_pct < 85 ? 'text-orange-500' : 'text-green-500'} />
                  Labor Productivity
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <p className="text-3xl font-bold text-white">{trends.avg_labor_productivity_pct}%</p>
                  <p className="text-xs text-zinc-400">Planned vs. actual hours</p>
                </div>
                <div className="bg-zinc-950 p-2 rounded text-xs text-zinc-400">
                  {trends.avg_labor_productivity_pct < 80 ? '⚠️ Below target' : '✓ Acceptable'}
                </div>
              </CardContent>
            </Card>

            {/* Change Orders */}
            <Card className="bg-zinc-900/80 border-zinc-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <AlertTriangle size={16} className="text-amber-500" />
                  Change Order Frequency
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <p className="text-3xl font-bold text-white">{trends.avg_change_orders_per_project}</p>
                  <p className="text-xs text-zinc-400">Avg COs per project</p>
                </div>
                <div className={`bg-zinc-950 p-2 rounded text-xs ${trends.avg_change_orders_per_project > 2.5 ? 'text-red-400' : 'text-green-400'}`}>
                  {trends.avg_change_orders_per_project > 2.5 ? '⚠️ High frequency' : '✓ Controlled'}
                </div>
              </CardContent>
            </Card>

            {/* Data Quality */}
            <Card className="bg-zinc-900/80 border-zinc-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <BarChart3 size={16} className="text-purple-500" />
                  Data Coverage
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <p className="text-3xl font-bold text-white">{trends.projects_analyzed}</p>
                  <p className="text-xs text-zinc-400">Completed projects analyzed</p>
                </div>
                <div className="bg-zinc-950 p-2 rounded text-xs text-zinc-400">
                  Confidence: {confidence.toUpperCase()}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* BOTTLENECKS TAB */}
        <TabsContent value="bottlenecks" className="space-y-4">
          {bottlenecks && bottlenecks.length > 0 ? (
            bottlenecks.map((bn, idx) => (
              <Card key={idx} className={`border-l-4 ${bn.severity === 'critical' ? 'border-l-red-500 bg-red-950/10' : 'border-l-amber-500 bg-amber-950/10'}`}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-base flex items-center gap-2">
                        {bn.severity === 'critical' ? <AlertTriangle className="text-red-500" size={18} /> : <AlertTriangle className="text-amber-500" size={18} />}
                        {bn.bottleneck}
                      </CardTitle>
                      <p className="text-sm text-zinc-400 mt-1">{bn.metric}</p>
                    </div>
                    <Badge className={bn.severity === 'critical' ? 'bg-red-500/20 text-red-300 border-red-500/30' : 'bg-amber-500/20 text-amber-300 border-amber-500/30'}>
                      {bn.severity.toUpperCase()}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-sm text-zinc-300">{bn.impact}</p>
                  <div className="bg-zinc-950/50 p-2 rounded text-xs text-zinc-400">
                    <strong>Affected:</strong> {bn.affected_projects} projects
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardContent className="p-6 text-center text-zinc-400">
                No significant bottlenecks detected in historical data.
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* RECOMMENDATIONS TAB */}
        <TabsContent value="recommendations" className="space-y-4">
          {optimization_recommendations && optimization_recommendations.length > 0 ? (
            optimization_recommendations.map((rec, idx) => (
              <Card key={idx} className="bg-zinc-900/50 border-zinc-800">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Zap className="text-amber-500" size={18} />
                        {rec.action}
                      </CardTitle>
                      <Badge className="mt-2 bg-zinc-800 text-zinc-300">{rec.category}</Badge>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-zinc-400 font-mono">
                        {rec.implementation_effort}
                      </div>
                      <div className="text-xs text-zinc-500">effort</div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="bg-zinc-950/50 p-3 rounded">
                      <p className="text-zinc-400 text-xs mb-1">Cost Savings</p>
                      <p className="text-lg font-bold text-green-400">{rec.expected_cost_savings_pct}%</p>
                    </div>
                    <div className="bg-zinc-950/50 p-3 rounded">
                      <p className="text-zinc-400 text-xs mb-1">Schedule Gain</p>
                      <p className="text-lg font-bold text-blue-400">{rec.expected_schedule_improvement_days}d</p>
                    </div>
                  </div>
                  <div className="bg-zinc-950/50 p-2 rounded text-xs text-zinc-400">
                    <strong>Timeline:</strong> {rec.timeframe_weeks} weeks to implement
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardContent className="p-6 text-center text-zinc-400">
                No recommendations available at this time.
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* PROJECT DETAILS TAB */}
        <TabsContent value="history" className="space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-zinc-800">
                <tr className="text-zinc-400 uppercase text-xs">
                  <th className="text-left p-3">Project</th>
                  <th className="text-right p-3">Cost Var %</th>
                  <th className="text-right p-3">Schedule Var %</th>
                  <th className="text-right p-3">RFI Days</th>
                  <th className="text-right p-3">Change Orders</th>
                  <th className="text-right p-3">Labor %</th>
                </tr>
              </thead>
              <tbody>
                {project_metrics && project_metrics.map((pm, idx) => (
                  <tr key={idx} className="border-t border-zinc-800 hover:bg-zinc-950/50">
                    <td className="p-3 text-white font-medium">{pm.project_name}</td>
                    <td className={`p-3 text-right font-mono ${pm.cost_variance_pct < 0 ? 'text-red-400' : 'text-green-400'}`}>
                      {pm.cost_variance_pct > 0 ? '+' : ''}{pm.cost_variance_pct}%
                    </td>
                    <td className={`p-3 text-right font-mono ${pm.schedule_variance_pct < 0 ? 'text-red-400' : 'text-green-400'}`}>
                      {pm.schedule_variance_pct > 0 ? '+' : ''}{pm.schedule_variance_pct}%
                    </td>
                    <td className="p-3 text-right text-zinc-300">{pm.avg_rfi_response_days}d</td>
                    <td className="p-3 text-right text-zinc-300">{pm.change_orders}</td>
                    <td className="p-3 text-right text-zinc-300">{pm.labor_productivity}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}