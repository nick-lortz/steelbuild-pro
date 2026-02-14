import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import { RefreshCw, AlertTriangle, TrendingUp, TrendingDown, Eye } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from '@/lib/utils';
import { createPageUrl } from '@/utils';
import { Link } from 'react-router-dom';

const HealthBar = ({ value, showLabel = true }) => {
  const getColor = () => {
    if (value >= 90) return 'bg-green-500';
    if (value >= 75) return 'bg-blue-500';
    if (value >= 60) return 'bg-amber-500';
    return 'bg-red-500';
  };

  return (
    <div className="flex items-center gap-2 w-full">
      <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <div className={cn("h-full transition-all", getColor())} style={{ width: `${value}%` }} />
      </div>
      {showLabel && <span className="text-xs font-bold text-white w-8 text-right">{value}%</span>}
    </div>
  );
};

const StatusDot = ({ status }) => {
  const colors = {
    'in_progress': 'bg-blue-500',
    'awarded': 'bg-green-500',
    'bidding': 'bg-amber-500',
    'on_hold': 'bg-zinc-500',
    'completed': 'bg-purple-500',
    'closed': 'bg-zinc-700'
  };
  return <div className={cn("w-2 h-2 rounded-full", colors[status] || 'bg-zinc-500')} />;
};

export default function Dashboard() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [riskFilter, setRiskFilter] = useState('all');

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    staleTime: Infinity
  });

  const { data: dashboardData, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['dashboard', { search: searchTerm, status: statusFilter, risk: riskFilter }],
    queryFn: async () => {
      const response = await base44.functions.invoke('getDashboardData', {
        page: 1,
        pageSize: 100,
        search: searchTerm,
        status: statusFilter,
        risk: riskFilter,
        sort: 'risk'
      });
      return response.data;
    },
    staleTime: 2 * 60 * 1000
  });

  const projects = dashboardData?.projects || [];
  const metrics = dashboardData?.metrics || {};

  const filteredProjects = useMemo(() => {
    return projects.sort((a, b) => {
      // Critical first
      const aRisk = (a.costHealth < -5 || a.daysSlip > 3 || a.overdueTasks > 0) ? 1 : 0;
      const bRisk = (b.costHealth < -5 || b.daysSlip > 3 || b.overdueTasks > 0) ? 1 : 0;
      if (bRisk !== aRisk) return bRisk - aRisk;
      
      // Health score
      if ((b.healthScore || 0) !== (a.healthScore || 0)) return (b.healthScore || 0) - (a.healthScore || 0);
      
      return (a.name || '').localeCompare(b.name || '');
    });
  }, [projects]);

  const critical = filteredProjects.filter(p => p.costHealth < -5 || p.daysSlip > 3 || p.overdueTasks > 0);
  const atRisk = filteredProjects.filter(p => p.costHealth < 0 || p.daysSlip > 0);
  
  if (isLoading || !currentUser) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-black">
        {/* Header - Compact */}
        <div className="border-b border-zinc-800 bg-zinc-950">
          <div className="max-w-[2000px] mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-baseline gap-4">
              <h1 className="text-2xl font-bold text-white">Portfolio Dashboard</h1>
              <span className="text-sm text-zinc-600">{metrics.totalProjects || 0} Projects</span>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={refetch}
              disabled={isFetching}
              className="text-zinc-400 hover:text-white"
            >
              <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
            </Button>
          </div>
        </div>

        {/* KPIs - Single Row, Dense */}
        <div className="border-b border-zinc-800 bg-zinc-950/50">
          <div className="max-w-[2000px] mx-auto px-6 py-3">
            <div className="grid grid-cols-7 gap-3">
              <div className="bg-zinc-900 rounded p-3 border border-zinc-800">
                <div className="text-[9px] text-zinc-600 uppercase font-bold tracking-wider mb-1">Total Value</div>
                <div className="text-xl font-black text-white">${((metrics.totalContractValue || 0) / 1000000).toFixed(1)}M</div>
              </div>
              <div className="bg-green-500/10 rounded p-3 border border-green-500/30">
                <div className="text-[9px] text-green-500 uppercase font-bold tracking-wider mb-1">Healthy</div>
                <div className="text-xl font-black text-green-400">{metrics.healthyProjects || 0}</div>
              </div>
              <div className="bg-amber-500/10 rounded p-3 border border-amber-500/30">
                <div className="text-[9px] text-amber-500 uppercase font-bold tracking-wider mb-1">At Risk</div>
                <div className="text-xl font-black text-amber-400">{atRisk.length}</div>
              </div>
              <div className="bg-red-500/10 rounded p-3 border border-red-500/30">
                <div className="text-[9px] text-red-500 uppercase font-bold tracking-wider mb-1">Critical</div>
                <div className="text-xl font-black text-red-400">{critical.length}</div>
              </div>
              <div className="bg-zinc-900 rounded p-3 border border-zinc-800">
                <div className="text-[9px] text-zinc-600 uppercase font-bold tracking-wider mb-1">Avg Health</div>
                <div className="text-xl font-black text-white">{(metrics.avgHealth || 0).toFixed(0)}%</div>
              </div>
              <div className="bg-cyan-500/10 rounded p-3 border border-cyan-500/30">
                <div className="text-[9px] text-cyan-500 uppercase font-bold tracking-wider mb-1">Open RFIs</div>
                <div className="text-xl font-black text-cyan-400">{metrics.openRFIs || 0}</div>
              </div>
              <div className="bg-purple-500/10 rounded p-3 border border-purple-500/30">
                <div className="text-[9px] text-purple-500 uppercase font-bold tracking-wider mb-1">Pending COs</div>
                <div className="text-xl font-black text-purple-400">{metrics.pendingCOs || 0}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters - Inline, Minimal */}
        <div className="border-b border-zinc-800 bg-zinc-950/30">
          <div className="max-w-[2000px] mx-auto px-6 py-2 flex items-center gap-3">
            <Input
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-64 h-8 bg-zinc-900 border-zinc-800 text-white text-sm"
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40 h-8 bg-zinc-900 border-zinc-800 text-white text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800">
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="awarded">Awarded</SelectItem>
                <SelectItem value="bidding">Bidding</SelectItem>
              </SelectContent>
            </Select>
            <Select value={riskFilter} onValueChange={setRiskFilter}>
              <SelectTrigger className="w-40 h-8 bg-zinc-900 border-zinc-800 text-white text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800">
                <SelectItem value="all">All Risk</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="at_risk">At Risk</SelectItem>
                <SelectItem value="healthy">Healthy</SelectItem>
              </SelectContent>
            </Select>
            {(searchTerm || statusFilter !== 'all' || riskFilter !== 'all') && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                  setRiskFilter('all');
                }}
                className="text-xs text-zinc-500 h-8"
              >
                Clear
              </Button>
            )}
          </div>
        </div>

        {/* Projects Table - Dense, Scannable */}
        <div className="max-w-[2000px] mx-auto px-6 py-4">
          {filteredProjects.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-zinc-600">No projects found</p>
            </div>
          ) : (
            <div className="bg-zinc-950 border border-zinc-800 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-900/50">
                    <th className="text-left px-3 py-2 text-[9px] text-zinc-500 uppercase font-bold tracking-wider">Project</th>
                    <th className="text-left px-3 py-2 text-[9px] text-zinc-500 uppercase font-bold tracking-wider w-24">Status</th>
                    <th className="text-left px-3 py-2 text-[9px] text-zinc-500 uppercase font-bold tracking-wider w-32">Health</th>
                    <th className="text-left px-3 py-2 text-[9px] text-zinc-500 uppercase font-bold tracking-wider w-28">Cost</th>
                    <th className="text-left px-3 py-2 text-[9px] text-zinc-500 uppercase font-bold tracking-wider w-28">Schedule</th>
                    <th className="text-center px-3 py-2 text-[9px] text-zinc-500 uppercase font-bold tracking-wider w-20">Tasks</th>
                    <th className="text-right px-3 py-2 text-[9px] text-zinc-500 uppercase font-bold tracking-wider w-28">Budget</th>
                    <th className="text-center px-3 py-2 text-[9px] text-zinc-500 uppercase font-bold tracking-wider w-20"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProjects.map((p) => {
                    const isRisk = p.costHealth < -5 || p.daysSlip > 3 || p.overdueTasks > 0;
                    const isCritical = p.costHealth < -10 || p.daysSlip > 7 || p.overdueTasks > 2;

                    return (
                      <tr 
                        key={p.id}
                        className={cn(
                          "border-b border-zinc-800/50 hover:bg-zinc-900/50 transition-colors",
                          isCritical && "bg-red-950/20",
                          isRisk && !isCritical && "bg-amber-950/10"
                        )}
                      >
                        {/* Project */}
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2">
                            {isCritical && <AlertTriangle size={14} className="text-red-500 flex-shrink-0" />}
                            {isRisk && !isCritical && <AlertTriangle size={14} className="text-amber-500 flex-shrink-0" />}
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-white truncate">{p.name}</p>
                              <p className="text-[10px] text-zinc-600 font-mono">{p.project_number}</p>
                            </div>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-1.5">
                            <StatusDot status={p.status} />
                            <span className="text-xs text-zinc-400">{p.status?.replace('_', ' ')}</span>
                          </div>
                        </td>

                        {/* Health */}
                        <td className="px-3 py-2.5">
                          <HealthBar value={p.healthScore || 0} />
                        </td>

                        {/* Cost Health */}
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-1">
                            {p.costHealth < 0 ? (
                              <TrendingDown size={12} className="text-red-400" />
                            ) : (
                              <TrendingUp size={12} className="text-green-400" />
                            )}
                            <span className={cn(
                              "text-xs font-bold",
                              p.costHealth < -5 ? "text-red-400" : p.costHealth < 0 ? "text-amber-400" : "text-green-400"
                            )}>
                              {p.costHealth > 0 ? '+' : ''}{p.costHealth?.toFixed(1)}%
                            </span>
                          </div>
                        </td>

                        {/* Schedule */}
                        <td className="px-3 py-2.5">
                          {p.daysSlip > 0 ? (
                            <span className={cn(
                              "text-xs font-bold",
                              p.daysSlip > 7 ? "text-red-400" : "text-amber-400"
                            )}>
                              {p.daysSlip}d late
                            </span>
                          ) : (
                            <span className="text-xs text-green-400 font-bold">On Track</span>
                          )}
                        </td>

                        {/* Tasks */}
                        <td className="px-3 py-2.5 text-center">
                          <div className="inline-flex flex-col">
                            <span className="text-xs font-bold text-white">
                              {p.completedTasks}/{p.totalTasks}
                            </span>
                            {p.overdueTasks > 0 && (
                              <span className="text-[9px] text-red-400 font-bold">{p.overdueTasks} late</span>
                            )}
                          </div>
                        </td>

                        {/* Budget */}
                        <td className="px-3 py-2.5 text-right">
                          <span className={cn(
                            "text-xs font-bold",
                            p.budgetVsActual > 100 ? "text-red-400" : 
                            p.budgetVsActual > 95 ? "text-amber-400" : "text-zinc-400"
                          )}>
                            {p.budgetVsActual}%
                          </span>
                        </td>

                        {/* Action */}
                        <td className="px-3 py-2.5 text-center">
                          <Link to={createPageUrl('ProjectDashboard') + `?project=${p.id}`}>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-zinc-500 hover:text-white">
                              <Eye size={14} />
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
}