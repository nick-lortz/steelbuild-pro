import React, { useState, useMemo } from 'react';
import { apiClient } from '@/api/client';
import { useQuery } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, TrendingUp, AlertTriangle, Clock } from 'lucide-react';

import LaborEntryForm from '@/components/labor/LaborEntryForm';
import CrewDashboard from '@/components/labor/CrewDashboard';
import DelayAnalysis from '@/components/labor/DelayAnalysis';
import LaborCostAnalysis from '@/components/labor/LaborCostAnalysis';
import MyUnapprovedHours from '@/components/labor/MyUnapprovedHours';
import CrewsAssignments from '@/components/labor/CrewsAssignments';
import { ActiveProjectProvider, useActiveProject } from '@/components/shared/hooks/useActiveProject';

function LaborContent() {
  const { activeProjectId, setActiveProjectId } = useActiveProject();
  const [activeTab, setActiveTab] = useState('entry');
  const [filterCrew, setFilterCrew] = useState('all');
  const [filterDateRange, setFilterDateRange] = useState('7d');

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => apiClient.entities.Project.filter({ status: 'in_progress' })
  });

  const { data: project } = useQuery({
    queryKey: ['project', activeProjectId],
    queryFn: () => apiClient.entities.Project.filter({ id: activeProjectId }),
    enabled: !!activeProjectId,
    select: (data) => data?.[0]
  });

  const { data: crews = [] } = useQuery({
    queryKey: ['crews', activeProjectId],
    queryFn: () => apiClient.entities.Crew.filter({ project_id: activeProjectId, status: 'active' }),
    enabled: !!activeProjectId
  });

  const { data: laborEntries = [] } = useQuery({
    queryKey: ['laborEntries', activeProjectId, filterDateRange],
    queryFn: async () => {
      const allEntries = await apiClient.entities.LaborEntry.filter({ project_id: activeProjectId });
      
      const daysBack = filterDateRange === '7d' ? 7 : filterDateRange === '30d' ? 30 : 14;
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - daysBack);
      
      return allEntries.filter(e => new Date(e.work_date) >= cutoff);
    },
    enabled: !!activeProjectId
  });

  const filteredEntries = useMemo(() => {
    if (filterCrew === 'all') return laborEntries;
    return laborEntries.filter(e => e.crew_id === filterCrew);
  }, [laborEntries, filterCrew]);

  // KPIs
  const kpis = useMemo(() => {
    const totalHours = filteredEntries.reduce((sum, e) => sum + e.actual_hours + e.overtime_hours, 0);
    const totalTons = filteredEntries.reduce((sum, e) => sum + (e.productivity?.tons_installed || 0), 0);
    const delayDays = filteredEntries.filter(e => e.has_delay).length;
    const certGaps = filteredEntries.reduce((sum, e) => sum + (e.certification_gaps?.length || 0), 0);
    const totalCost = totalHours * 50 * 1.5; // estimate with crew size

    return {
      total_hours: totalHours.toFixed(1),
      total_tons: totalTons.toFixed(1),
      avg_productivity: totalHours > 0 ? (totalTons / totalHours).toFixed(2) : 0,
      delay_days: delayDays,
      cert_gaps: certGaps,
      total_cost: totalCost.toFixed(0)
    };
  }, [filteredEntries]);

  if (!activeProjectId) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-zinc-950 to-black p-8">
        <Card className="max-w-md mx-auto bg-zinc-900 border-zinc-800">
          <CardContent className="p-8 text-center space-y-4">
            <Users size={48} className="mx-auto text-zinc-600" />
            <div>
              <h3 className="text-lg font-bold text-white">Select Project</h3>
              <p className="text-sm text-zinc-500 mt-1">Choose a project to manage labor</p>
            </div>
            <Select value={activeProjectId || ''} onValueChange={setActiveProjectId}>
              <SelectTrigger className="w-full bg-zinc-800 border-zinc-700 text-white">
                <SelectValue placeholder="Choose project..." />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800">
                {projects.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.project_number} - {p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-950 to-black">
      <div className="border-b border-zinc-800/50 bg-gradient-to-b from-zinc-900 to-zinc-950/50">
        <div className="max-w-[1800px] mx-auto px-8 py-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight">Labor Management</h1>
              <p className="text-sm text-zinc-500 font-mono mt-1">{project?.project_number} • {crews.length} crews</p>
            </div>
            <Select value={activeProjectId || ''} onValueChange={setActiveProjectId}>
              <SelectTrigger className="w-64 bg-zinc-900 border-zinc-800 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800">
                {projects.map(proj => (
                  <SelectItem key={proj.id} value={proj.id}>
                    {proj.name} ({proj.project_number})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <Card className="bg-zinc-800/50 border-zinc-700">
              <CardContent className="p-3">
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Total Hours</p>
                <p className="text-2xl font-bold text-white">{kpis.total_hours}</p>
              </CardContent>
            </Card>
            <Card className="bg-zinc-800/50 border-zinc-700">
              <CardContent className="p-3">
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Tons Installed</p>
                <p className="text-2xl font-bold text-amber-400">{kpis.total_tons}</p>
              </CardContent>
            </Card>
            <Card className="bg-zinc-800/50 border-zinc-700">
              <CardContent className="p-3">
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Productivity</p>
                <p className="text-2xl font-bold text-green-400">{kpis.avg_productivity} T/hr</p>
              </CardContent>
            </Card>
            <Card className="bg-zinc-800/50 border-zinc-700">
              <CardContent className="p-3">
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Delay Days</p>
                <p className={`text-2xl font-bold ${kpis.delay_days > 0 ? 'text-red-400' : 'text-green-400'}`}>{kpis.delay_days}</p>
              </CardContent>
            </Card>
            <Card className="bg-zinc-800/50 border-zinc-700">
              <CardContent className="p-3">
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Cert Gaps</p>
                <p className={`text-2xl font-bold ${kpis.cert_gaps > 0 ? 'text-yellow-400' : 'text-green-400'}`}>{kpis.cert_gaps}</p>
              </CardContent>
            </Card>
            <Card className="bg-zinc-800/50 border-zinc-700">
              <CardContent className="p-3">
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Labor Cost</p>
                <p className="text-2xl font-bold text-white">${(kpis.total_cost / 1000).toFixed(0)}k</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <div className="border-b border-zinc-800/50 bg-zinc-950/30">
        <div className="max-w-[1800px] mx-auto px-8 py-3 flex gap-3">
          <Select value={filterCrew} onValueChange={setFilterCrew}>
            <SelectTrigger className="w-48 bg-zinc-900 border-zinc-800 text-white">
              <SelectValue placeholder="All Crews" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-800">
              <SelectItem value="all">All Crews</SelectItem>
              {crews.map(crew => (
                <SelectItem key={crew.id} value={crew.id}>{crew.crew_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterDateRange} onValueChange={setFilterDateRange}>
            <SelectTrigger className="w-40 bg-zinc-900 border-zinc-800 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-800">
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="14d">Last 14 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="max-w-[1800px] mx-auto px-8 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-zinc-900 border border-zinc-800">
            <TabsTrigger value="unapproved">
              <Clock size={14} className="mr-2" />
              My Unapproved Hours
            </TabsTrigger>
            <TabsTrigger value="entry">
              <Users size={14} className="mr-2" />
              Daily Entry
            </TabsTrigger>
            <TabsTrigger value="crews">
              <TrendingUp size={14} className="mr-2" />
              Crew Performance
            </TabsTrigger>
            <TabsTrigger value="crewsAssignments">
              <Users size={14} className="mr-2" />
              Crews & Assignments
            </TabsTrigger>
            <TabsTrigger value="delays">
              <AlertTriangle size={14} className="mr-2" />
              Delays ({kpis.delay_days})
            </TabsTrigger>
            <TabsTrigger value="costs">Cost Analysis</TabsTrigger>
          </TabsList>

          <TabsContent value="unapproved">
            <MyUnapprovedHours />
          </TabsContent>

          <TabsContent value="entry">
            <LaborEntryForm
              projectId={activeProjectId}
              onSuccess={() => setActiveTab('crews')}
            />
          </TabsContent>

          <TabsContent value="crews">
            <CrewDashboard
              laborEntries={filteredEntries}
              crews={crews}
            />
          </TabsContent>

          <TabsContent value="crewsAssignments">
            <CrewsAssignments projectId={activeProjectId} />
          </TabsContent>

          <TabsContent value="delays">
            <DelayAnalysis laborEntries={filteredEntries} />
          </TabsContent>

          <TabsContent value="costs">
            <LaborCostAnalysis
              laborEntries={filteredEntries}
              crews={crews}
              budget={project?.baseline_field_hours * 50 || 50000}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default function Labor() {
  return (
    <ActiveProjectProvider>
      <LaborContent />
    </ActiveProjectProvider>
  );
}