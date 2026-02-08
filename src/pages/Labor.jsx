import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Users, TrendingUp, AlertTriangle, Clock } from 'lucide-react';

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

  if (!activeProjectId) {
    return (
      <PageShell>
        <ContentSection>
          <EmptyState
            icon={Users}
            title="Select Project"
            description="Choose a project to manage labor"
            actionLabel="Select Project"
            onAction={() => {}}
          />
          <div className="max-w-md mx-auto mt-6">
            <Select value={activeProjectId || ''} onValueChange={setActiveProjectId}>
              <SelectTrigger className="w-full bg-zinc-900 border-zinc-800 text-white">
                <SelectValue placeholder="Choose project..." />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800">
                {projects.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.project_number} - {p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </ContentSection>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        title="Labor Management"
        subtitle={`${project?.project_number} • ${crews.length} crews`}
        actions={
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
        }
      />

      <MetricsBar
        metrics={[
          { label: 'Total Hours', value: kpis.total_hours },
          { label: 'Tons Installed', value: kpis.total_tons, color: 'text-amber-400' },
          { label: 'Productivity', value: `${kpis.avg_productivity} T/hr`, color: 'text-green-400' },
          { label: 'Delay Days', value: kpis.delay_days, color: kpis.delay_days > 0 ? 'text-red-400' : 'text-green-400' },
          { label: 'Cert Gaps', value: kpis.cert_gaps, color: kpis.cert_gaps > 0 ? 'text-yellow-400' : 'text-green-400' },
          { label: 'Labor Cost', value: `$${(kpis.total_cost / 1000).toFixed(0)}k` }
        ]}
      />

      <FilterBar>
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
      </FilterBar>

      <ContentSection>
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

        {/* My Unapproved Hours */}
        <TabsContent value="unapproved">
          <MyUnapprovedHours />
        </TabsContent>

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

        {/* Crews & Assignments */}
        <TabsContent value="crewsAssignments">
          <CrewsAssignments projectId={activeProjectId} />
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
      </ContentSection>
    </PageShell>
  );
}

export default function Labor() {
  return (
    <ActiveProjectProvider>
      <LaborContent />
    </ActiveProjectProvider>
  );
}