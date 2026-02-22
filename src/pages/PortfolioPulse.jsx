import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, ChevronDown, ChevronUp, TrendingUp, AlertTriangle, Building } from 'lucide-react';
import { toast } from '@/components/ui/notifications';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function PortfolioPulse() {
  const [expandedProjects, setExpandedProjects] = useState(new Set());

  const { data: portfolioPulse, isLoading, refetch } = useQuery({
    queryKey: ['portfolioPulse'],
    queryFn: async () => {
      const { data } = await base44.functions.invoke('getPortfolioPulse', {});
      return data;
    },
    staleTime: 5 * 60 * 1000 // 5 minutes
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

  return (
    <div className="min-h-screen bg-[#0A0E13]">
      {/* Header */}
      <div className="border-b border-[rgba(255,255,255,0.05)] bg-black/95">
        <div className="max-w-[1800px] mx-auto px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-[#E5E7EB]">Portfolio Pulse</h1>
              <p className="text-sm text-[#6B7280] mt-1">Multi-project health & blockers</p>
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
                <p className="text-3xl font-bold text-white">{portfolioPulse?.portfolio_stats.total_projects || 0}</p>
                <p className="text-xs text-[#6B7280] uppercase tracking-widest">Total Projects</p>
              </CardContent>
            </Card>

            <Card className="bg-[#0A0A0A]/90">
              <CardContent className="p-6">
                <TrendingUp className="w-5 h-5 text-green-400 mb-2" />
                <p className="text-3xl font-bold text-white">{portfolioPulse?.portfolio_stats.avg_health_score || 0}</p>
                <p className="text-xs text-[#6B7280] uppercase tracking-widest">Avg Health Score</p>
              </CardContent>
            </Card>

            <Card className="bg-[#0A0A0A]/90">
              <CardContent className="p-6">
                <AlertTriangle className="w-5 h-5 text-red-400 mb-2" />
                <p className="text-3xl font-bold text-red-400">{portfolioPulse?.portfolio_stats.critical_projects || 0}</p>
                <p className="text-xs text-[#6B7280] uppercase tracking-widest">Critical Projects</p>
              </CardContent>
            </Card>

            <Card className="bg-[#0A0A0A]/90">
              <CardContent className="p-6">
                <AlertTriangle className="w-5 h-5 text-amber-400 mb-2" />
                <p className="text-3xl font-bold text-white">{portfolioPulse?.portfolio_stats.total_blockers || 0}</p>
                <p className="text-xs text-[#6B7280] uppercase tracking-widest">Total Blockers</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Projects List */}
      <div className="max-w-[1800px] mx-auto px-8 py-8">
        <div className="space-y-3">
          {portfolioPulse?.projects.map(project => {
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
                    {project.top_blockers.length === 0 ? (
                      <div className="text-center py-4 text-green-400">
                        ✓ No critical blockers
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-[#9CA3AF] mb-2">Top Blockers</h4>
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
      </div>
    </div>
  );
}