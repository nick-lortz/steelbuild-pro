import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, ChevronDown, ChevronUp, TrendingUp, TrendingDown, AlertTriangle, Building, Activity } from 'lucide-react';
import { toast } from '@/components/ui/notifications';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function PortfolioPulse() {
  const [expandedProjects, setExpandedProjects] = useState(new Set());
  const [selectedMetric, setSelectedMetric] = useState('health');

  const { data: portfolioPulse, isLoading, error, refetch } = useQuery({
    queryKey: ['portfolioPulse'],
    queryFn: async () => {
      const { data } = await base44.functions.invoke('getPortfolioPulse', {});
      return data;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false
  });

  const toggleExpanded = (projectId) => {
    setExpandedProjects(prev => {
      const next = new Set(prev);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      return next;
    });
  };

  const getHealthColor = (score) => {
    if (score >= 90) return 'text-green-400 bg-green-500/10 border-green-500/30';
    if (score >= 80) return 'text-blue-400 bg-blue-500/10 border-blue-500/30';
    if (score >= 70) return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30';
    if (score >= 60) return 'text-orange-400 bg-orange-500/10 border-orange-500/30';
    return 'text-red-400 bg-red-500/10 border-red-500/30';
  };

  const severityColors = {
    critical: 'text-red-400 bg-red-500/10 border-red-500/30',
    high: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
    medium: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
    low: 'text-blue-400 bg-blue-500/10 border-blue-500/30'
  };

  // Prepare chart data
  const healthDistributionData = portfolioPulse?.projects ? [
    { name: 'A (90+)', value: portfolioPulse.projects.filter(p => p.health_score >= 90).length, color: '#10B981' },
    { name: 'B (80-89)', value: portfolioPulse.projects.filter(p => p.health_score >= 80 && p.health_score < 90).length, color: '#3B82F6' },
    { name: 'C (70-79)', value: portfolioPulse.projects.filter(p => p.health_score >= 70 && p.health_score < 80).length, color: '#F59E0B' },
    { name: 'D (60-69)', value: portfolioPulse.projects.filter(p => p.health_score >= 60 && p.health_score < 70).length, color: '#FF9D42' },
    { name: 'F (<60)', value: portfolioPulse.projects.filter(p => p.health_score < 60).length, color: '#EF4444' }
  ].filter(d => d.value > 0) : [];

  const topProjectsData = portfolioPulse?.projects?.slice(0, 10).map(p => ({
    name: p.project_number,
    health: p.health_score,
    blockers: p.top_blockers.length
  })) || [];

  const blockerTypeData = portfolioPulse?.projects ? [
    { name: 'RFI Overdue', value: portfolioPulse.projects.reduce((sum, p) => sum + p.top_blockers.filter(b => b.type === 'rfi_overdue').length, 0) },
    { name: 'Deliveries', value: portfolioPulse.projects.reduce((sum, p) => sum + p.top_blockers.filter(b => b.type === 'delivery_overdue').length, 0) },
    { name: 'Tasks', value: portfolioPulse.projects.reduce((sum, p) => sum + p.top_blockers.filter(b => b.type === 'task_overdue').length, 0) },
    { name: 'Drawings', value: portfolioPulse.projects.reduce((sum, p) => sum + p.top_blockers.filter(b => b.type === 'drawing_blocker').length, 0) },
    { name: 'Change Orders', value: portfolioPulse.projects.reduce((sum, p) => sum + p.top_blockers.filter(b => b.type === 'co_pending').length, 0) }
  ].filter(d => d.value > 0) : [];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0A0E13] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-zinc-400">Computing portfolio pulse...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0A0E13] flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <p className="text-white font-semibold mb-2">Failed to load portfolio pulse</p>
          <p className="text-zinc-400 text-sm mb-4">{error.message}</p>
          <Button onClick={() => refetch()} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (!portfolioPulse || !portfolioPulse.projects) {
    return (
      <div className="min-h-screen bg-[#0A0E13] flex items-center justify-center">
        <div className="text-center">
          <p className="text-zinc-400">No portfolio data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0E13]">
      {/* Header */}
      <div className="border-b border-[rgba(255,255,255,0.05)] bg-black/95">
        <div className="max-w-[1800px] mx-auto px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-[#E5E7EB]">Portfolio Pulse</h1>
              <p className="text-sm text-[#6B7280] mt-1">Multi-project health & blockers · Last updated {new Date(portfolioPulse.generated_at).toLocaleTimeString()}</p>
            </div>
            <Button onClick={refetch} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Portfolio Stats */}
      <div className="border-b border-[rgba(255,255,255,0.05)]">
        <div className="max-w-[1800px] mx-auto px-8 py-6">
          <div className="grid grid-cols-4 gap-6">
            <Card className="bg-[#0A0A0A]/90">
              <CardContent className="p-6">
                <Building className="w-5 h-5 text-[#FF9D42] mb-2" />
                <p className="text-3xl font-bold text-white">{portfolioPulse.portfolio_stats?.total_projects || 0}</p>
                <p className="text-xs text-[#6B7280] uppercase tracking-widest">Total Projects</p>
              </CardContent>
            </Card>

            <Card className="bg-[#0A0A0A]/90 cursor-pointer hover:border-[rgba(255,255,255,0.15)] transition-all" onClick={() => setSelectedMetric('health')}>
              <CardContent className="p-6">
                <TrendingUp className="w-5 h-5 text-green-400 mb-2" />
                <p className="text-3xl font-bold text-white">{Math.round(portfolioPulse.portfolio_stats?.avg_health_score || 0)}</p>
                <p className="text-xs text-[#6B7280] uppercase tracking-widest">Avg Health Score</p>
              </CardContent>
            </Card>

            <Card className="bg-[#0A0A0A]/90 cursor-pointer hover:border-[rgba(255,255,255,0.15)] transition-all" onClick={() => setSelectedMetric('critical')}>
              <CardContent className="p-6">
                <AlertTriangle className="w-5 h-5 text-red-400 mb-2" />
                <p className="text-3xl font-bold text-red-400">{portfolioPulse.portfolio_stats?.critical_projects || 0}</p>
                <p className="text-xs text-[#6B7280] uppercase tracking-widest">Critical Projects</p>
              </CardContent>
            </Card>

            <Card className="bg-[#0A0A0A]/90 cursor-pointer hover:border-[rgba(255,255,255,0.15)] transition-all" onClick={() => setSelectedMetric('blockers')}>
              <CardContent className="p-6">
                <Activity className="w-5 h-5 text-amber-400 mb-2" />
                <p className="text-3xl font-bold text-white">{portfolioPulse.portfolio_stats?.total_blockers || 0}</p>
                <p className="text-xs text-[#6B7280] uppercase tracking-widest">Total Blockers</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Analytics Dashboard */}
      <div className="border-b border-[rgba(255,255,255,0.05)]">
        <div className="max-w-[1800px] mx-auto px-8 py-6">
          <h2 className="text-lg font-semibold text-[#E5E7EB] mb-4">Portfolio Analytics</h2>
          <div className="grid grid-cols-3 gap-6">
            {/* Health Distribution Pie Chart */}
            <Card className="bg-[#0A0A0A]/90">
              <CardHeader>
                <CardTitle className="text-sm">Health Grade Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                {healthDistributionData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={healthDistributionData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${value}`}
                        outerRadius={70}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {healthDistributionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0A0A0A', border: '1px solid rgba(255,255,255,0.1)' }}
                        labelStyle={{ color: '#E5E7EB' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-center text-zinc-400 py-8">No data</p>
                )}
              </CardContent>
            </Card>

            {/* Top 10 Projects Health */}
            <Card className="bg-[#0A0A0A]/90 col-span-2">
              <CardHeader>
                <CardTitle className="text-sm">Project Health Scores (Top 10 Worst)</CardTitle>
              </CardHeader>
              <CardContent>
                {topProjectsData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={topProjectsData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="name" stroke="#6B7280" style={{ fontSize: '10px' }} />
                      <YAxis stroke="#6B7280" style={{ fontSize: '10px' }} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0A0A0A', border: '1px solid rgba(255,255,255,0.1)' }}
                        labelStyle={{ color: '#E5E7EB' }}
                      />
                      <Bar dataKey="health" fill="#FF9D42" name="Health Score" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-center text-zinc-400 py-8">No projects</p>
                )}
              </CardContent>
            </Card>

            {/* Blocker Types Breakdown */}
            <Card className="bg-[#0A0A0A]/90 col-span-3">
              <CardHeader>
                <CardTitle className="text-sm">Blocker Types Across Portfolio</CardTitle>
              </CardHeader>
              <CardContent>
                {blockerTypeData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={blockerTypeData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis type="number" stroke="#6B7280" style={{ fontSize: '10px' }} />
                      <YAxis dataKey="name" type="category" stroke="#6B7280" style={{ fontSize: '11px' }} width={100} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0A0A0A', border: '1px solid rgba(255,255,255,0.1)' }}
                        labelStyle={{ color: '#E5E7EB' }}
                      />
                      <Bar dataKey="value" fill="#EF4444" name="Count" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-center text-zinc-400 py-8">No blockers</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Projects List */}
      <div className="max-w-[1800px] mx-auto px-8 py-8">
        <h2 className="text-lg font-semibold text-[#E5E7EB] mb-4">Projects Detail</h2>
        {portfolioPulse.projects.length === 0 ? (
          <div className="text-center py-12">
            <Building className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
            <p className="text-zinc-400">No projects found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {portfolioPulse.projects.map(project => {
            const isExpanded = expandedProjects.has(project.project_id);
            
            return (
              <Card key={project.project_id} className="bg-[#0A0A0A]/90">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-mono text-sm text-[#FF9D42]">{project.project_number}</span>
                        <Badge variant="outline" className={getHealthColor(project.health_score)}>
                          {project.health_grade} ({project.health_score})
                        </Badge>
                        <Badge variant="secondary">{project.phase}</Badge>
                      </div>
                      <CardTitle className="text-lg">{project.project_name}</CardTitle>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      {/* Key Counts */}
                      <div className="flex gap-3 text-sm">
                        <div className="text-center">
                          <p className={`font-bold ${project.key_counts.rfi_open > 0 ? 'text-amber-400' : 'text-zinc-600'}`}>
                            {project.key_counts.rfi_open}
                          </p>
                          <p className="text-[10px] text-[#6B7280]">RFIs</p>
                        </div>
                        <div className="text-center">
                          <p className={`font-bold ${project.key_counts.tasks_overdue > 0 ? 'text-red-400' : 'text-zinc-600'}`}>
                            {project.key_counts.tasks_overdue}
                          </p>
                          <p className="text-[10px] text-[#6B7280]">Late</p>
                        </div>
                        <div className="text-center">
                          <p className={`font-bold ${project.key_counts.deliveries_overdue > 0 ? 'text-red-400' : 'text-zinc-600'}`}>
                            {project.key_counts.deliveries_overdue}
                          </p>
                          <p className="text-[10px] text-[#6B7280]">Deliveries</p>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Link to={createPageUrl('ProjectDashboard') + `?project=${project.project_id}`}>
                          <Button variant="outline" size="sm">View</Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleExpanded(project.project_id)}
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardHeader>

                {isExpanded && (
                  <CardContent className="border-t border-[rgba(255,255,255,0.05)] pt-4">
                    {!project.top_blockers || project.top_blockers.length === 0 ? (
                      <div className="text-center py-4 text-green-400">
                        ✓ No critical blockers
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-[#9CA3AF] mb-2">Top Blockers ({project.top_blockers.length})</h4>
                        {project.top_blockers.map((blocker, idx) => (
                          <div key={idx} className="p-3 bg-[#151515] rounded-lg border border-[rgba(255,255,255,0.03)]">
                            <div className="flex items-start gap-2">
                              <Badge variant="outline" className={severityColors[blocker.severity] + ' text-xs'}>
                                {blocker.severity}
                              </Badge>
                              <div className="flex-1">
                                <p className="text-sm text-white font-medium">{blocker.title}</p>
                                <p className="text-xs text-[#9CA3AF] mt-1">{blocker.reason}</p>
                                <p className="text-xs text-blue-400 mt-2">→ {blocker.recommended_action}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {project.latest_insight && (
                      <div className="mt-4 p-3 bg-blue-500/5 border border-blue-500/20 rounded-lg">
                        <p className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wide mb-2">
                          AI Brief
                        </p>
                        <p className="text-xs text-[#E5E7EB]">{project.latest_insight.summary}</p>
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            );
            })}
          </div>
        )}
      </div>
    </div>
  );
}