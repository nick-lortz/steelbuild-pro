import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle, 
  DollarSign, 
  Calendar, 
  Truck, 
  Wrench,
  FileText,
  BarChart3,
  Download,
  RefreshCw,
  Loader2,
  Sparkles,
  Settings
} from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { format } from 'date-fns';
import { toast } from '@/components/ui/notifications';

const COLORS = {
  green: '#10b981',
  amber: '#f59e0b',
  red: '#ef4444',
  blue: '#3b82f6',
  purple: '#a855f7'
};

export default function UnifiedAnalyticsDashboard({ projectId }) {
  const [selectedProjects, setSelectedProjects] = useState([]);
  const [viewMode, setViewMode] = useState('overview');
  const [predictingRisks, setPredictingRisks] = useState(false);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [riskPrediction, setRiskPrediction] = useState(null);
  const [widgets, setWidgets] = useState(() => {
    const saved = localStorage.getItem('analytics_widgets');
    return saved ? JSON.parse(saved) : [
      'portfolio_health',
      'schedule_metrics',
      'cost_forecast',
      'delivery_performance',
      'risk_alerts',
      'change_orders'
    ];
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('name'),
    staleTime: 10 * 60 * 1000,
  });

  const activeProjects = projects.filter(p => p.status === 'in_progress' || p.status === 'awarded');
  const targetProjectIds = projectId ? [projectId] : (selectedProjects.length > 0 ? selectedProjects : activeProjects.map(p => p.id));

  const { data: portfolioData, isLoading } = useQuery({
    queryKey: ['portfolio-analytics', targetProjectIds],
    queryFn: async () => {
      const data = await Promise.all(targetProjectIds.map(async (pid) => {
        const [project, workPackages, tasks, financials, deliveries, drawingSets] = await Promise.all([
          base44.entities.Project.filter({ id: pid }).then(p => p[0]),
          base44.entities.WorkPackage.filter({ project_id: pid }),
          base44.entities.Task.filter({ project_id: pid }),
          base44.entities.Financial.filter({ project_id: pid }),
          base44.entities.Delivery.filter({ project_id: pid }),
          base44.entities.DrawingSet.filter({ project_id: pid })
        ]);

        const today = new Date().toISOString().split('T')[0];
        const totalBudget = financials.reduce((sum, f) => sum + (f.current_budget || 0), 0);
        const actualCost = financials.reduce((sum, f) => sum + (f.actual_amount || 0), 0);
        const forecastCost = financials.reduce((sum, f) => sum + (f.forecast_amount || 0), 0);

        return {
          project,
          metrics: {
            tasks_total: tasks.length,
            tasks_complete: tasks.filter(t => t.status === 'completed').length,
            tasks_overdue: tasks.filter(t => t.end_date < today && t.status !== 'completed').length,
            drawings_total: drawingSets.length,
            drawings_fff: drawingSets.filter(d => d.status === 'FFF').length,
            deliveries_total: deliveries.length,
            deliveries_on_time: deliveries.filter(d => d.delivery_status === 'delivered' && (!d.actual_date || d.actual_date <= d.scheduled_date)).length,
            total_budget: totalBudget,
            actual_cost: actualCost,
            forecast_cost: forecastCost || actualCost,
            packages_total: workPackages.length,
            packages_complete: workPackages.filter(wp => wp.status === 'complete').length
          }
        };
      }));

      return data;
    },
    enabled: targetProjectIds.length > 0,
    staleTime: 2 * 60 * 1000,
  });

  const { data: changeOrders = [] } = useQuery({
    queryKey: ['change-orders', targetProjectIds],
    queryFn: async () => {
      const cos = await base44.entities.ChangeOrder.filter({
        project_id: { $in: targetProjectIds }
      });
      return cos;
    },
    enabled: targetProjectIds.length > 0,
  });

  const handlePredictRisks = async () => {
    if (!targetProjectIds[0]) return;
    
    setPredictingRisks(true);
    try {
      const { data } = await base44.functions.invoke('predictProjectRisks', {
        project_id: targetProjectIds[0]
      });
      setRiskPrediction(data);
      toast.success('Risk analysis complete');
    } catch (error) {
      toast.error('Risk prediction failed');
    } finally {
      setPredictingRisks(false);
    }
  };

  const handleGenerateReport = async () => {
    setGeneratingReport(true);
    try {
      const { data } = await base44.functions.invoke('generateExecutiveReport', {
        project_ids: targetProjectIds,
        report_type: 'executive_summary',
        date_range: 'current_month'
      });
      
      // Download as JSON for now (can be enhanced to PDF)
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `executive-report-${format(new Date(), 'yyyy-MM-dd')}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      
      toast.success('Report generated and downloaded');
    } catch (error) {
      toast.error('Report generation failed');
    } finally {
      setGeneratingReport(false);
    }
  };

  const toggleWidget = (widgetId) => {
    const updated = widgets.includes(widgetId)
      ? widgets.filter(w => w !== widgetId)
      : [...widgets, widgetId];
    setWidgets(updated);
    localStorage.setItem('analytics_widgets', JSON.stringify(updated));
  };

  // Aggregate portfolio metrics
  const aggregatedMetrics = portfolioData?.reduce((acc, pd) => ({
    total_projects: (acc.total_projects || 0) + 1,
    total_budget: (acc.total_budget || 0) + pd.metrics.total_budget,
    total_actual: (acc.total_actual || 0) + pd.metrics.actual_cost,
    total_forecast: (acc.total_forecast || 0) + pd.metrics.forecast_cost,
    tasks_total: (acc.tasks_total || 0) + pd.metrics.tasks_total,
    tasks_complete: (acc.tasks_complete || 0) + pd.metrics.tasks_complete,
    tasks_overdue: (acc.tasks_overdue || 0) + pd.metrics.tasks_overdue,
    deliveries_total: (acc.deliveries_total || 0) + pd.metrics.deliveries_total,
    deliveries_on_time: (acc.deliveries_on_time || 0) + pd.metrics.deliveries_on_time,
    packages_total: (acc.packages_total || 0) + pd.metrics.packages_total,
    packages_complete: (acc.packages_complete || 0) + pd.metrics.packages_complete,
  }), {});

  const portfolioHealth = aggregatedMetrics ? (() => {
    const costVariance = ((aggregatedMetrics.total_actual / aggregatedMetrics.total_budget - 1) * 100);
    const scheduleHealth = aggregatedMetrics.tasks_total > 0 ? (aggregatedMetrics.tasks_complete / aggregatedMetrics.tasks_total) : 0;
    const overdueRate = aggregatedMetrics.tasks_total > 0 ? (aggregatedMetrics.tasks_overdue / aggregatedMetrics.tasks_total) : 0;
    
    if (costVariance > 10 || overdueRate > 0.15 || scheduleHealth < 0.6) return 'red';
    if (costVariance > 5 || overdueRate > 0.08 || scheduleHealth < 0.75) return 'amber';
    return 'green';
  })() : 'green';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-12 h-12 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Select 
            value={selectedProjects.length === 1 ? selectedProjects[0] : 'portfolio'} 
            onValueChange={(v) => setSelectedProjects(v === 'portfolio' ? [] : [v])}
          >
            <SelectTrigger className="w-64 bg-zinc-900 border-zinc-800">
              <SelectValue placeholder="Portfolio View" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="portfolio">All Projects (Portfolio)</SelectItem>
              {activeProjects.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.project_number} - {p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Tabs value={viewMode} onValueChange={setViewMode}>
            <TabsList className="bg-zinc-900">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="detailed">Detailed</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={handlePredictRisks}
            disabled={predictingRisks || !targetProjectIds[0]}
            variant="outline"
            className="border-zinc-700"
          >
            {predictingRisks ? (
              <Loader2 size={16} className="mr-2 animate-spin" />
            ) : (
              <Sparkles size={16} className="mr-2" />
            )}
            Predict Risks
          </Button>
          <Button
            onClick={handleGenerateReport}
            disabled={generatingReport}
            className="bg-amber-500 hover:bg-amber-600 text-black"
          >
            {generatingReport ? (
              <Loader2 size={16} className="mr-2 animate-spin" />
            ) : (
              <Download size={16} className="mr-2" />
            )}
            Export Report
          </Button>
        </div>
      </div>

      {/* Portfolio Health Header */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white mb-1">Portfolio Health</h2>
              <p className="text-sm text-zinc-500">{aggregatedMetrics?.total_projects || 0} Active Projects</p>
            </div>
            <div className={`px-6 py-3 rounded-lg ${
              portfolioHealth === 'green' ? 'bg-green-500/20 border border-green-500' :
              portfolioHealth === 'amber' ? 'bg-amber-500/20 border border-amber-500' :
              'bg-red-500/20 border border-red-500'
            }`}>
              <div className={`text-4xl font-bold ${
                portfolioHealth === 'green' ? 'text-green-500' :
                portfolioHealth === 'amber' ? 'text-amber-500' :
                'text-red-500'
              }`}>
                {portfolioHealth === 'green' ? '●' : portfolioHealth === 'amber' ? '●' : '●'}
              </div>
              <div className={`text-xs font-bold uppercase tracking-widest mt-1 ${
                portfolioHealth === 'green' ? 'text-green-500' :
                portfolioHealth === 'amber' ? 'text-amber-500' :
                'text-red-500'
              }`}>
                {portfolioHealth}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Risk Prediction Panel */}
      {riskPrediction && (
        <Card className="bg-zinc-900 border-amber-500/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-500">
              <Sparkles size={20} />
              AI Risk Prediction
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <div className="text-xs text-zinc-500 uppercase mb-1">Delay Probability</div>
                <Badge className={`${
                  riskPrediction.prediction.delay_probability === 'low' ? 'bg-green-500' :
                  riskPrediction.prediction.delay_probability === 'medium' ? 'bg-amber-500' :
                  'bg-red-500'
                } text-black uppercase`}>
                  {riskPrediction.prediction.delay_probability}
                </Badge>
              </div>
              <div>
                <div className="text-xs text-zinc-500 uppercase mb-1">Estimated Delay</div>
                <div className="text-xl font-bold text-red-400">{riskPrediction.prediction.estimated_delay_days}d</div>
              </div>
              <div>
                <div className="text-xs text-zinc-500 uppercase mb-1">Health Score</div>
                <div className="text-xl font-bold text-white">{riskPrediction.prediction.overall_health_score}/100</div>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-bold text-white mb-2">Critical Risks</h4>
              <div className="space-y-2">
                {riskPrediction.prediction.critical_risks.slice(0, 3).map((risk, idx) => (
                  <div key={idx} className="p-3 bg-zinc-800 rounded border-l-4 border-red-500">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-xs font-bold text-red-400 uppercase">{risk.category}</div>
                        <div className="text-sm text-white mt-1">{risk.description}</div>
                        <div className="text-xs text-zinc-400 mt-1">Impact: {risk.impact}</div>
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-amber-400">→ {risk.mitigation}</div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Widget Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Portfolio Health Widget */}
        {widgets.includes('portfolio_health') && aggregatedMetrics && (
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <BarChart3 size={16} className="text-amber-500" />
                Portfolio Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Budget</div>
                  <div className="text-xl font-bold text-white">${(aggregatedMetrics.total_budget / 1000000).toFixed(1)}M</div>
                </div>
                <div>
                  <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Actual</div>
                  <div className="text-xl font-bold text-amber-500">${(aggregatedMetrics.total_actual / 1000000).toFixed(1)}M</div>
                </div>
                <div>
                  <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Variance</div>
                  <div className={`text-lg font-bold ${
                    aggregatedMetrics.total_actual > aggregatedMetrics.total_budget ? 'text-red-500' : 'text-green-500'
                  }`}>
                    {((aggregatedMetrics.total_actual / aggregatedMetrics.total_budget - 1) * 100).toFixed(1)}%
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Projects</div>
                  <div className="text-xl font-bold text-white">{aggregatedMetrics.total_projects}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Schedule Metrics Widget */}
        {widgets.includes('schedule_metrics') && aggregatedMetrics && (
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Calendar size={16} className="text-blue-500" />
                Schedule Performance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Tasks</div>
                  <div className="text-xl font-bold text-white">{aggregatedMetrics.tasks_total}</div>
                </div>
                <div>
                  <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Complete</div>
                  <div className="text-xl font-bold text-green-500">
                    {aggregatedMetrics.tasks_total > 0 
                      ? ((aggregatedMetrics.tasks_complete / aggregatedMetrics.tasks_total) * 100).toFixed(0) 
                      : 0}%
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Overdue</div>
                  <div className="text-xl font-bold text-red-500">{aggregatedMetrics.tasks_overdue}</div>
                </div>
                <div>
                  <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Packages</div>
                  <div className="text-sm font-bold text-white">
                    {aggregatedMetrics.packages_complete}/{aggregatedMetrics.packages_total}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Cost Forecast Widget */}
        {widgets.includes('cost_forecast') && aggregatedMetrics && (
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <DollarSign size={16} className="text-green-500" />
                Cost Forecast
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-xs text-zinc-500">Budget</span>
                  <span className="text-xs font-mono text-white">${(aggregatedMetrics.total_budget / 1000000).toFixed(2)}M</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-zinc-500">Actual</span>
                  <span className="text-xs font-mono text-amber-500">${(aggregatedMetrics.total_actual / 1000000).toFixed(2)}M</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-zinc-500">Forecast EAC</span>
                  <span className="text-xs font-mono text-purple-400">${(aggregatedMetrics.total_forecast / 1000000).toFixed(2)}M</span>
                </div>
                <div className="h-px bg-zinc-800 my-2" />
                <div className="flex justify-between">
                  <span className="text-xs font-bold text-zinc-400">Variance</span>
                  <span className={`text-sm font-bold ${
                    aggregatedMetrics.total_forecast > aggregatedMetrics.total_budget ? 'text-red-500' : 'text-green-500'
                  }`}>
                    {aggregatedMetrics.total_budget > 0 
                      ? ((aggregatedMetrics.total_forecast / aggregatedMetrics.total_budget - 1) * 100).toFixed(1) 
                      : 0}%
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Delivery Performance Widget */}
        {widgets.includes('delivery_performance') && aggregatedMetrics && (
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Truck size={16} className="text-purple-500" />
                Delivery Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-xs text-zinc-500">On-Time Rate</span>
                    <span className="text-xs font-bold text-white">
                      {aggregatedMetrics.deliveries_total > 0 
                        ? ((aggregatedMetrics.deliveries_on_time / aggregatedMetrics.deliveries_total) * 100).toFixed(0) 
                        : 0}%
                    </span>
                  </div>
                  <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-green-500"
                      style={{ 
                        width: `${aggregatedMetrics.deliveries_total > 0 
                          ? (aggregatedMetrics.deliveries_on_time / aggregatedMetrics.deliveries_total) * 100 
                          : 0}%` 
                      }}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Total</div>
                    <div className="text-xl font-bold text-white">{aggregatedMetrics.deliveries_total}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">On Time</div>
                    <div className="text-xl font-bold text-green-500">{aggregatedMetrics.deliveries_on_time}</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Change Orders Widget */}
        {widgets.includes('change_orders') && (
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <FileText size={16} className="text-red-500" />
                Change Orders
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Total COs</div>
                    <div className="text-xl font-bold text-white">{changeOrders.length}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Approved</div>
                    <div className="text-xl font-bold text-green-500">
                      {changeOrders.filter(co => co.status === 'approved').length}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Total Impact</div>
                    <div className="text-lg font-bold text-amber-500">
                      ${(changeOrders.reduce((sum, co) => sum + (co.cost_impact || 0), 0) / 1000).toFixed(0)}K
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Pending</div>
                    <div className="text-xl font-bold text-amber-500">
                      {changeOrders.filter(co => co.status === 'pending' || co.status === 'submitted').length}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Risk Alerts Widget */}
        {widgets.includes('risk_alerts') && aggregatedMetrics && (
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <AlertTriangle size={16} className="text-red-500" />
                Risk Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {aggregatedMetrics.tasks_overdue > 0 && (
                  <div className="p-2 bg-red-500/10 border border-red-500/50 rounded">
                    <div className="text-xs font-bold text-red-400">SCHEDULE RISK</div>
                    <div className="text-xs text-zinc-300 mt-1">{aggregatedMetrics.tasks_overdue} tasks overdue</div>
                  </div>
                )}
                {aggregatedMetrics.total_actual > aggregatedMetrics.total_budget * 0.95 && (
                  <div className="p-2 bg-amber-500/10 border border-amber-500/50 rounded">
                    <div className="text-xs font-bold text-amber-400">COST RISK</div>
                    <div className="text-xs text-zinc-300 mt-1">Approaching budget limit</div>
                  </div>
                )}
                {portfolioData?.some(pd => pd.metrics.drawings_fff < pd.metrics.drawings_total * 0.7) && (
                  <div className="p-2 bg-amber-500/10 border border-amber-500/50 rounded">
                    <div className="text-xs font-bold text-amber-400">DRAWING RISK</div>
                    <div className="text-xs text-zinc-300 mt-1">Low drawing approval rate on projects</div>
                  </div>
                )}
                {aggregatedMetrics.tasks_overdue === 0 && aggregatedMetrics.total_actual <= aggregatedMetrics.total_budget && (
                  <div className="p-2 bg-green-500/10 border border-green-500/50 rounded text-center">
                    <div className="text-xs font-bold text-green-400">ALL CLEAR</div>
                    <div className="text-xs text-zinc-400 mt-1">No critical alerts</div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Project Breakdown Table */}
      {viewMode === 'detailed' && portfolioData && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle>Project Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {portfolioData.map((pd) => {
                const project = pd.project;
                const metrics = pd.metrics;
                const costVariance = metrics.total_budget > 0 
                  ? ((metrics.actual_cost / metrics.total_budget - 1) * 100) 
                  : 0;
                const scheduleProgress = metrics.tasks_total > 0
                  ? (metrics.tasks_complete / metrics.tasks_total * 100)
                  : 0;

                return (
                  <div key={project.id} className="p-4 bg-zinc-800/50 rounded-lg border border-zinc-700">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-bold text-white">{project.project_number} - {project.name}</h3>
                        <div className="flex gap-2 mt-1">
                          <Badge variant="outline" className="text-[10px]">{project.phase}</Badge>
                          <Badge variant="outline" className="text-[10px]">{project.status}</Badge>
                        </div>
                      </div>
                      <div className={`w-3 h-3 rounded-full ${
                        costVariance > 10 || metrics.tasks_overdue > 5 ? 'bg-red-500' :
                        costVariance > 5 || metrics.tasks_overdue > 2 ? 'bg-amber-500' :
                        'bg-green-500'
                      }`} />
                    </div>

                    <div className="grid grid-cols-4 gap-3 text-xs">
                      <div>
                        <div className="text-zinc-500 mb-1">Schedule</div>
                        <div className="font-bold text-white">{scheduleProgress.toFixed(0)}%</div>
                        {metrics.tasks_overdue > 0 && (
                          <div className="text-red-400 text-[10px]">{metrics.tasks_overdue} overdue</div>
                        )}
                      </div>
                      <div>
                        <div className="text-zinc-500 mb-1">Cost</div>
                        <div className={`font-bold ${costVariance > 5 ? 'text-red-500' : 'text-green-500'}`}>
                          {costVariance > 0 ? '+' : ''}{costVariance.toFixed(1)}%
                        </div>
                      </div>
                      <div>
                        <div className="text-zinc-500 mb-1">Drawings</div>
                        <div className="font-bold text-white">{metrics.drawings_fff}/{metrics.drawings_total}</div>
                      </div>
                      <div>
                        <div className="text-zinc-500 mb-1">Deliveries</div>
                        <div className="font-bold text-white">
                          {metrics.deliveries_total > 0 
                            ? ((metrics.deliveries_on_time / metrics.deliveries_total) * 100).toFixed(0) 
                            : 0}%
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Widget Customization */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Settings size={16} />
            Customize Widgets
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { id: 'portfolio_health', label: 'Portfolio Overview' },
              { id: 'schedule_metrics', label: 'Schedule Performance' },
              { id: 'cost_forecast', label: 'Cost Forecast' },
              { id: 'delivery_performance', label: 'Delivery Performance' },
              { id: 'change_orders', label: 'Change Orders' },
              { id: 'risk_alerts', label: 'Risk Alerts' }
            ].map(w => (
              <Button
                key={w.id}
                onClick={() => toggleWidget(w.id)}
                variant={widgets.includes(w.id) ? 'default' : 'outline'}
                className={widgets.includes(w.id) 
                  ? 'bg-amber-500 text-black hover:bg-amber-600' 
                  : 'border-zinc-700 text-zinc-400'
                }
                size="sm"
              >
                {widgets.includes(w.id) ? <CheckCircle size={14} className="mr-1" /> : null}
                {w.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}