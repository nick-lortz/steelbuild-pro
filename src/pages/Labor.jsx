import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Users, TrendingUp, AlertTriangle } from 'lucide-react';

import LaborEntryForm from '@/components/labor/LaborEntryForm';
import CrewDashboard from '@/components/labor/CrewDashboard';
import DelayAnalysis from '@/components/labor/DelayAnalysis';
import LaborCostAnalysis from '@/components/labor/LaborCostAnalysis';
import { ActiveProjectProvider, useActiveProject } from '@/components/shared/hooks/useActiveProject';

function LaborContent() {
  const { activeProjectId, setActiveProjectId } = useActiveProject();
  const [activeTab, setActiveTab] = useState('entry');
  const [filterCrew, setFilterCrew] = useState('all');
  const [filterDateRange, setFilterDateRange] = useState('7d');

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.filter({ status: 'in_progress' })
  });

  const { data: project } = useQuery({
    queryKey: ['project', activeProjectId],
    queryFn: () => base44.entities.Project.filter({ id: activeProjectId }),
    enabled: !!activeProjectId,
    select: (data) => data?.[0]
  });

  const { data: crews = [] } = useQuery({
    queryKey: ['crews', activeProjectId],
    queryFn: () => base44.entities.Crew.filter({ project_id: activeProjectId, status: 'active' }),
    enabled: !!activeProjectId
  });

  const { data: laborEntries = [] } = useQuery({
    queryKey: ['laborEntries', activeProjectId, filterDateRange],
    queryFn: async () => {
      const allEntries = await base44.entities.LaborEntry.filter({ project_id: activeProjectId });
      
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

  return (
    <div className="space-y-6">
      {/* Header with Project Selector */}
      <div className="flex items-start justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold">Labor Management</h1>
          <p className="text-zinc-400 mt-1">{project?.name || 'No project selected'}</p>
        </div>
        <div className="w-80">
          <label className="text-sm font-bold text-zinc-300 block mb-2">Switch Project</label>
          <Select value={activeProjectId || ''} onValueChange={setActiveProjectId}>
            <SelectTrigger className="bg-zinc-800 border-zinc-700">
              <SelectValue placeholder="Choose a project..." />
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
      </div>

      {!activeProjectId && (
        <Card className="bg-yellow-900/20 border border-yellow-800">
          <CardContent className="pt-6">
            <p className="text-sm text-yellow-600">Select a project to begin</p>
          </CardContent>
        </Card>
      )}

      {activeProjectId && (
      <>

      {/* KPI Bar */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-6">
            <p className="text-xs text-zinc-500 uppercase font-bold mb-1">Total Hours</p>
            <p className="text-2xl font-bold text-white">{kpis.total_hours}</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-6">
            <p className="text-xs text-zinc-500 uppercase font-bold mb-1">Tons Installed</p>
            <p className="text-2xl font-bold text-amber-500">{kpis.total_tons}</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-6">
            <p className="text-xs text-zinc-500 uppercase font-bold mb-1">Productivity</p>
            <p className="text-2xl font-bold text-green-500">{kpis.avg_productivity}</p>
            <p className="text-xs text-zinc-600">T/hr</p>
          </CardContent>
        </Card>
        <Card className={`bg-zinc-900 border-zinc-800 ${kpis.delay_days > 0 ? 'border-red-800' : ''}`}>
          <CardContent className="pt-6">
            <p className="text-xs text-zinc-500 uppercase font-bold mb-1">Delay Days</p>
            <p className={`text-2xl font-bold ${kpis.delay_days > 0 ? 'text-red-500' : 'text-green-500'}`}>
              {kpis.delay_days}
            </p>
          </CardContent>
        </Card>
        <Card className={`bg-zinc-900 border-zinc-800 ${kpis.cert_gaps > 0 ? 'border-yellow-800' : ''}`}>
          <CardContent className="pt-6">
            <p className="text-xs text-zinc-500 uppercase font-bold mb-1">Cert Gaps</p>
            <p className={`text-2xl font-bold ${kpis.cert_gaps > 0 ? 'text-yellow-500' : 'text-green-500'}`}>
              {kpis.cert_gaps}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-6">
            <p className="text-xs text-zinc-500 uppercase font-bold mb-1">Labor Cost</p>
            <p className="text-2xl font-bold text-white">${(kpis.total_cost / 1000).toFixed(0)}k</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-3 items-center">
        <Select value={filterCrew} onValueChange={setFilterCrew}>
          <SelectTrigger className="w-48 bg-zinc-900 border-zinc-800">
            <SelectValue placeholder="All Crews" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-800">
            <SelectItem value="all">All Crews</SelectItem>
            {crews.map(crew => (
              <SelectItem key={crew.id} value={crew.id}>
                {crew.crew_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterDateRange} onValueChange={setFilterDateRange}>
          <SelectTrigger className="w-40 bg-zinc-900 border-zinc-800">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-800">
            <SelectItem value="7d">Last 7 Days</SelectItem>
            <SelectItem value="14d">Last 14 Days</SelectItem>
            <SelectItem value="30d">Last 30 Days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-zinc-900 border border-zinc-800">
          <TabsTrigger value="entry">
            <Users size={14} className="mr-2" />
            Daily Entry
          </TabsTrigger>
          <TabsTrigger value="crews">
            <TrendingUp size={14} className="mr-2" />
            Crew Performance
          </TabsTrigger>
          <TabsTrigger value="delays">
            <AlertTriangle size={14} className="mr-2" />
            Delays ({kpis.delay_days})
          </TabsTrigger>
          <TabsTrigger value="costs">Cost Analysis</TabsTrigger>
        </TabsList>

        {/* Daily Labor Entry */}
        <TabsContent value="entry">
          <LaborEntryForm
            projectId={activeProjectId}
            onSuccess={() => setActiveTab('crews')}
          />
        </TabsContent>

        {/* Crew Dashboard */}
        <TabsContent value="crews">
          <CrewDashboard
            laborEntries={filteredEntries}
            crews={crews}
          />
        </TabsContent>

        {/* Delay Analysis */}
        <TabsContent value="delays">
          <DelayAnalysis laborEntries={filteredEntries} />
        </TabsContent>

        {/* Cost Analysis */}
        <TabsContent value="costs">
          <LaborCostAnalysis
            laborEntries={filteredEntries}
            crews={crews}
            budget={project?.baseline_field_hours * 50 || 50000}
          />
        </TabsContent>
      </Tabs>
      </>
      )}
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