import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useActiveProject } from '@/components/shared/hooks/useActiveProject';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  FileDown, BarChart3, TrendingUp, AlertTriangle, CheckCircle2,
  Wrench, Package, Truck, Brain, Loader2, Filter, Download
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import TrendChart from '@/components/reporting/TrendChart';
import DashboardFilters from '@/components/reporting/DashboardFilters';
import ExportPanel from '@/components/reporting/ExportPanel';

export default function ReportingPage() {
  const { activeProjectId } = useActiveProject();
  const [timeframe, setTimeframe] = useState('weekly'); // daily, weekly, monthly
  const [filters, setFilters] = useState({
    phase: 'all', // fabrication, delivery, erection, all
    responsibleParty: 'all',
    scheduleImpact: 'all', // low, medium, high, critical
    metricsFocus: ['cost', 'schedule', 'risk'], // array of metric types
    showAlerts: true
  });
  const [exportOpen, setExportOpen] = useState(false);

  const { data: projects = [] } = useQuery({
    queryKey: ['projects-list'],
    queryFn: () => base44.entities.Project.filter({ status: 'in_progress' }, '-updated_date'),
    staleTime: 5 * 60 * 1000
  });

  const { data: project } = useQuery({
    queryKey: ['project-reporting', activeProjectId],
    queryFn: async () => {
      if (!activeProjectId) return null;
      const rows = await base44.entities.Project.filter({ id: activeProjectId });
      return rows[0];
    },
    enabled: !!activeProjectId
  });

  const { data: reportData, isLoading } = useQuery({
    queryKey: ['reporting-data', activeProjectId, JSON.stringify(filters), timeframe],
    queryFn: async () => {
      if (!activeProjectId) return null;
      
      const [
        financials, tasks, rfis, cos, workPackages, riskData
      ] = await Promise.all([
        base44.entities.Financial.filter({ project_id: activeProjectId }).catch(() => []),
        base44.entities.Task.filter({ project_id: activeProjectId }).catch(() => []),
        base44.entities.RFI.filter({ project_id: activeProjectId }).catch(() => []),
        base44.entities.ChangeOrder.filter({ project_id: activeProjectId }).catch(() => []),
        base44.entities.WorkPackage.filter({ project_id: activeProjectId }).catch(() => []),
        base44.entities.Alert.filter({ project_id: activeProjectId }).catch(() => [])
      ]);

      // Apply filters
      const filteredRFIs = filters.phase === 'all' ? rfis : rfis.filter(r => {
        if (filters.phase === 'fabrication') return r.is_release_blocker;
        if (filters.phase === 'erection') return r.is_install_blocker;
        return true;
      });

      const filteredTasks = filters.phase === 'all' ? tasks : tasks.filter(t => {
        if (filters.phase === 'fabrication') return ['shop', 'detailing'].includes(t.phase);
        if (filters.phase === 'delivery') return t.phase === 'delivery';
        if (filters.phase === 'erection') return t.phase === 'erection';
        return true;
      });

      const filteredAlerts = filters.scheduleImpact === 'all' 
        ? riskData 
        : riskData.filter(a => a.severity === filters.scheduleImpact);

      // Calculate KPIs
      const contractValue = project?.contract_value || 0;
      const approvedCOs = cos.filter(c => c.status === 'approved');
      const approvedCOValue = approvedCOs.reduce((s, c) => s + (c.cost_impact || 0), 0);
      const revisedContract = contractValue + approvedCOValue;
      
      const totalBudget = financials.reduce((s, f) => s + (f.current_budget || 0), 0);
      const totalActual = financials.reduce((s, f) => s + (f.actual_amount || 0), 0);
      const totalForecast = financials.reduce((s, f) => s + (f.forecast_amount || f.actual_amount || 0), 0);
      
      const grossMargin = revisedContract - totalForecast;
      const grossMarginPct = revisedContract > 0 ? ((grossMargin / revisedContract) * 100).toFixed(1) : 0;

      const overallProgress = filteredTasks.length > 0 
        ? (filteredTasks.reduce((s, t) => s + (t.percent_complete || 0), 0) / filteredTasks.length).toFixed(0)
        : 0;

      const rfiBlockers = filteredRFIs.filter(r => r.is_release_blocker || r.is_install_blocker).length;
      const agingRFIs = filteredRFIs.filter(r => {
        if (['closed', 'answered'].includes(r.status)) return false;
        const days = Math.floor((new Date() - new Date(r.created_date)) / 86400000);
        return days >= 14;
      }).length;

      const fabricationReady = workPackages.filter(wp => wp.fab_ready === true).length;
      const erectionReady = workPackages.filter(wp => wp.erection_ready === true).length;

      // Trend data (simplified — would normally compute from historical snapshots)
      const trendData = generateTrendData(timeframe, {
        budgetSpent: totalActual,
        budgetBudget: totalBudget,
        tasksComplete: overallProgress,
        rfiOpen: filteredRFIs.filter(r => !['closed', 'answered'].includes(r.status)).length
      });

      return {
        kpis: {
          revisedContract,
          totalActual,
          totalForecast,
          grossMargin,
          grossMarginPct,
          overallProgress,
          rfiBlockers,
          agingRFIs,
          fabricationReady,
          erectionReady,
          pendingCOs: cos.filter(c => ['submitted', 'under_review'].includes(c.status)).length,
          criticalAlerts: filteredAlerts.filter(a => a.severity === 'critical').length
        },
        rfis: filteredRFIs,
        tasks: filteredTasks,
        cos: cos,
        alerts: filteredAlerts,
        workPackages: workPackages,
        trendData
      };
    },
    enabled: !!activeProjectId
  });

  if (!activeProjectId) {
    return (
      <div className="p-6 text-center">
        <p className="text-zinc-400">Select a project to view reporting dashboard</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-black overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-zinc-800 bg-gradient-to-r from-blue-500/5 to-blue-600/5 p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-blue-400" />
              Project Reporting & Analytics
            </h1>
            <p className="text-sm text-zinc-500 mt-1">{project?.name}</p>
          </div>
          <Button onClick={() => setExportOpen(true)} className="bg-blue-600 hover:bg-blue-700">
            <Download className="w-4 h-4 mr-2" />
            Export Dashboard
          </Button>
        </div>

        {/* Filters & Timeframe */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-zinc-500" />
            <span className="text-xs text-zinc-500 uppercase">Timeframe</span>
            <Select value={timeframe} onValueChange={setTimeframe}>
              <SelectTrigger className="h-8 w-28 bg-zinc-900 border-zinc-700 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-700">
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DashboardFilters filters={filters} setFilters={setFilters} />
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          </div>
        ) : reportData ? (
          <div className="max-w-7xl mx-auto space-y-6">
            {/* KPI Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {filters.metricsFocus.includes('cost') && (
                <>
                  <KPICard
                    label="Gross Margin"
                    value={`$${reportData.kpis.grossMargin.toLocaleString()}`}
                    sub={`${reportData.kpis.grossMarginPct}% of revised contract`}
                    color={reportData.kpis.grossMargin < 0 ? 'text-red-400' : parseFloat(reportData.kpis.grossMarginPct) < 8 ? 'text-amber-400' : 'text-green-400'}
                    icon={BarChart3}
                  />
                  <KPICard
                    label="Budget Spent"
                    value={`${((reportData.kpis.totalActual / reportData.kpis.totalBudget) * 100).toFixed(0)}%`}
                    sub={`$${reportData.kpis.totalActual.toLocaleString()} / $${reportData.kpis.totalBudget.toLocaleString()}`}
                    color="text-blue-400"
                    icon={TrendingUp}
                  />
                </>
              )}
              {filters.metricsFocus.includes('schedule') && (
                <>
                  <KPICard
                    label="Overall Progress"
                    value={`${reportData.kpis.overallProgress}%`}
                    sub={`${reportData.kpis.overallProgress >= 80 ? 'On track' : 'Review needed'}`}
                    color={reportData.kpis.overallProgress >= 80 ? 'text-green-400' : 'text-amber-400'}
                    icon={Package}
                  />
                  <KPICard
                    label="RFI Blockers"
                    value={reportData.kpis.rfiBlockers}
                    sub={`${reportData.kpis.agingRFIs} aging (14d+)`}
                    color={reportData.kpis.rfiBlockers > 0 ? 'text-red-400' : 'text-green-400'}
                    icon={AlertTriangle}
                  />
                </>
              )}
              {filters.metricsFocus.includes('risk') && (
                <>
                  <KPICard
                    label="Fabrication Ready"
                    value={reportData.kpis.fabricationReady}
                    sub={`work packages`}
                    color="text-purple-400"
                    icon={Wrench}
                  />
                  <KPICard
                    label="Erection Ready"
                    value={reportData.kpis.erectionReady}
                    sub={`work packages`}
                    color="text-cyan-400"
                    icon={Package}
                  />
                </>
              )}
            </div>

            {/* Trend Chart */}
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm text-white">Trend Analysis ({timeframe})</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                {reportData.trendData && (
                  <TrendChart data={reportData.trendData} timeframe={timeframe} metrics={filters.metricsFocus} />
                )}
              </CardContent>
            </Card>

            {/* Blockers & Risks */}
            {filters.showAlerts && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* RFI Blockers Table */}
                {reportData.kpis.rfiBlockers > 0 && (
                  <Card className="bg-red-500/5 border-red-500/20">
                    <CardHeader className="pb-2 pt-4 px-4">
                      <CardTitle className="text-sm text-white flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-400" />
                        RFI Fabrication Blockers ({reportData.kpis.rfiBlockers})
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-4 space-y-1.5 max-h-56 overflow-y-auto">
                      {reportData.rfis.filter(r => r.is_release_blocker).slice(0, 5).map(rfi => (
                        <div key={rfi.id} className="text-xs bg-zinc-900/50 rounded p-2 border border-red-500/20">
                          <div className="font-mono text-zinc-400">RFI-{rfi.rfi_number}</div>
                          <div className="text-zinc-300 mt-0.5 line-clamp-1">{rfi.subject}</div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* Critical Alerts */}
                {reportData.kpis.criticalAlerts > 0 && (
                  <Card className="bg-orange-500/5 border-orange-500/20">
                    <CardHeader className="pb-2 pt-4 px-4">
                      <CardTitle className="text-sm text-white flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-orange-400" />
                        Critical Alerts ({reportData.kpis.criticalAlerts})
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-4 space-y-1.5 max-h-56 overflow-y-auto">
                      {reportData.alerts.filter(a => a.severity === 'critical').slice(0, 5).map(alert => (
                        <div key={alert.id} className="text-xs bg-zinc-900/50 rounded p-2 border border-orange-500/20">
                          <div className="font-mono text-zinc-400">{alert.alert_type}</div>
                          <div className="text-zinc-300 mt-0.5 line-clamp-1">{alert.message}</div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>
        ) : null}
      </div>

      {/* Export Panel */}
      {exportOpen && (
        <ExportPanel
          project={project}
          reportData={reportData}
          filters={filters}
          timeframe={timeframe}
          onClose={() => setExportOpen(false)}
        />
      )}
    </div>
  );
}

function KPICard({ label, value, sub, color, icon: Icon }) {
  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] text-zinc-600 uppercase tracking-widest">{label}</p>
            <p className={cn('text-2xl font-bold mt-1', color)}>{value}</p>
            {sub && <p className="text-xs text-zinc-500 mt-1">{sub}</p>}
          </div>
          {Icon && <Icon className={cn('w-5 h-5 flex-shrink-0', color)} />}
        </div>
      </CardContent>
    </Card>
  );
}

function generateTrendData(timeframe, metrics) {
  const points = timeframe === 'daily' ? 30 : timeframe === 'weekly' ? 12 : 6;
  return Array.from({ length: points }).map((_, i) => ({
    period: `Period ${i + 1}`,
    budget: metrics.budgetSpent * (0.7 + Math.random() * 0.3),
    schedule: metrics.tasksComplete + (Math.random() - 0.5) * 5,
    rfi: Math.max(0, metrics.rfiOpen - i * 0.5)
  }));
}