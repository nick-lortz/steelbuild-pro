import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Wrench, BarChart3, CheckCircle2 } from 'lucide-react';

import EquipmentLogForm from '@/components/equipment/EquipmentLogForm';
import EquipmentDashboard from '@/components/equipment/EquipmentDashboard';
import InspectionForm from '@/components/equipment/InspectionForm';
import { ActiveProjectProvider, useActiveProject } from '@/components/shared/hooks/useActiveProject';

function EquipmentContent() {
  const { activeProjectId, setActiveProjectId } = useActiveProject();
  const [activeTab, setActiveTab] = useState('log');
  const [filterEquipment, setFilterEquipment] = useState('all');
  const [filterDateRange, setFilterDateRange] = useState('7d');
  const [selectedEquipmentForInspection, setSelectedEquipmentForInspection] = useState('');

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

  const { data: equipment = [] } = useQuery({
    queryKey: ['equipment', activeProjectId],
    queryFn: () => base44.entities.Resource.filter({
      type: 'equipment',
      current_project_id: activeProjectId
    }),
    enabled: !!activeProjectId
  });

  const { data: logs = [] } = useQuery({
    queryKey: ['equipmentLogs', activeProjectId, filterDateRange],
    queryFn: async () => {
      const allLogs = await base44.entities.EquipmentLog.filter({ project_id: activeProjectId });

      const daysBack = filterDateRange === '7d' ? 7 : filterDateRange === '30d' ? 30 : 14;
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - daysBack);

      return allLogs.filter(log => new Date(log.log_date) >= cutoff);
    },
    enabled: !!activeProjectId
  });

  const { data: inspections = [] } = useQuery({
    queryKey: ['inspections', activeProjectId],
    queryFn: () => base44.entities.InspectionChecklist.filter({ project_id: activeProjectId }),
    enabled: !!activeProjectId
  });

  const filteredLogs = useMemo(() => {
    if (filterEquipment === 'all') return logs;
    return logs.filter(log => log.equipment_id === filterEquipment);
  }, [logs, filterEquipment]);

  // KPIs
  const kpis = useMemo(() => {
    const totalHours = filteredLogs.reduce((sum, l) => sum + l.productive_hours + l.setup_time_hours + l.breakdown_time_hours + l.idle_hours, 0);
    const productiveHours = filteredLogs.reduce((sum, l) => sum + l.productive_hours, 0);
    const idleHours = filteredLogs.reduce((sum, l) => sum + l.idle_hours, 0);
    const conflicts = filteredLogs.reduce((sum, l) => sum + (l.conflicts?.length || 0), 0);
    const failedInspections = inspections.filter(i => i.overall_status === 'fail').length;

    return {
      total_hours: totalHours.toFixed(1),
      utilization: totalHours > 0 ? ((productiveHours / totalHours) * 100).toFixed(0) : 0,
      idle_hours: idleHours.toFixed(1),
      idle_cost: (idleHours * 150).toFixed(0),
      conflicts,
      inspections_failed: failedInspections
    };
  }, [filteredLogs, inspections]);

  if (!activeProjectId) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Equipment Management</h1>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-6">
            <label className="text-sm font-bold text-zinc-300 block mb-3">Select a Project</label>
            <Select value="" onValueChange={setActiveProjectId}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700 w-80">
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
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Equipment Management</h1>
        <p className="text-zinc-400 mt-1">{project?.name}</p>
      </div>

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
            <p className="text-xs text-zinc-500 uppercase font-bold mb-1">Utilization</p>
            <p className="text-2xl font-bold text-green-500">{kpis.utilization}%</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-6">
            <p className="text-xs text-zinc-500 uppercase font-bold mb-1">Idle Hours</p>
            <p className="text-2xl font-bold text-orange-500">{kpis.idle_hours}</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-6">
            <p className="text-xs text-zinc-500 uppercase font-bold mb-1">Idle Cost</p>
            <p className="text-2xl font-bold text-red-500">${kpis.idle_cost}</p>
          </CardContent>
        </Card>
        <Card className={`bg-zinc-900 border-zinc-800 ${kpis.conflicts > 0 ? 'border-red-800' : ''}`}>
          <CardContent className="pt-6">
            <p className="text-xs text-zinc-500 uppercase font-bold mb-1">Conflicts</p>
            <p className={`text-2xl font-bold ${kpis.conflicts > 0 ? 'text-red-500' : 'text-green-500'}`}>
              {kpis.conflicts}
            </p>
          </CardContent>
        </Card>
        <Card className={`bg-zinc-900 border-zinc-800 ${kpis.inspections_failed > 0 ? 'border-yellow-800' : ''}`}>
          <CardContent className="pt-6">
            <p className="text-xs text-zinc-500 uppercase font-bold mb-1">Failed Inspections</p>
            <p className={`text-2xl font-bold ${kpis.inspections_failed > 0 ? 'text-yellow-500' : 'text-green-500'}`}>
              {kpis.inspections_failed}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <Select value={filterEquipment} onValueChange={setFilterEquipment}>
          <SelectTrigger className="w-48 bg-zinc-900 border-zinc-800">
            <SelectValue placeholder="All Equipment" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-800">
            <SelectItem value="all">All Equipment</SelectItem>
            {equipment.map(eq => (
              <SelectItem key={eq.id} value={eq.id}>
                {eq.name}
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
          <TabsTrigger value="log">
            <BarChart3 size={14} className="mr-2" />
            Daily Log
          </TabsTrigger>
          <TabsTrigger value="dashboard">
            <BarChart3 size={14} className="mr-2" />
            Utilization
          </TabsTrigger>
          <TabsTrigger value="inspection">
            <CheckCircle2 size={14} className="mr-2" />
            Inspections
          </TabsTrigger>
        </TabsList>

        {/* Daily Log Entry */}
        <TabsContent value="log">
          <EquipmentLogForm
            projectId={activeProjectId}
            onSuccess={() => setActiveTab('dashboard')}
          />
        </TabsContent>

        {/* Dashboard */}
        <TabsContent value="dashboard">
          <EquipmentDashboard logs={filteredLogs} equipment={equipment} />
        </TabsContent>

        {/* Inspections */}
        <TabsContent value="inspection" className="space-y-4">
          {equipment.length > 0 && (
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle>Select Equipment for Inspection</CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={selectedEquipmentForInspection} onValueChange={setSelectedEquipmentForInspection}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700">
                    <SelectValue placeholder="Choose equipment..." />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800">
                    {equipment.map(eq => (
                      <SelectItem key={eq.id} value={eq.id}>
                        {eq.name} ({eq.classification})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          )}

          {selectedEquipmentForInspection && (
            <InspectionForm
              projectId={activeProjectId}
              equipmentId={selectedEquipmentForInspection}
              equipmentType={equipment.find(e => e.id === selectedEquipmentForInspection)?.classification?.toLowerCase().replace(/\s+/g, '_') || 'mobile_crane'}
              onSuccess={() => {
                setSelectedEquipmentForInspection('');
              }}
            />
          )}

          {/* Recent Inspections */}
          {inspections.length > 0 && (
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-base">Recent Inspections</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {inspections.slice(-10).reverse().map((insp, idx) => (
                    <div key={idx} className="p-3 bg-zinc-800 rounded text-sm flex items-center justify-between">
                      <div>
                        <p className="font-bold text-zinc-200">{insp.equipment_id}</p>
                        <p className="text-xs text-zinc-500">{insp.inspection_date} • {insp.inspector_name}</p>
                      </div>
                      <Badge className={
                        insp.overall_status === 'pass' ? 'bg-green-900 text-green-200' :
                        insp.overall_status === 'fail' ? 'bg-red-900 text-red-200' :
                        'bg-yellow-900 text-yellow-200'
                      }>
                        {insp.overall_status.toUpperCase()}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function Equipment() {
  return (
    <ActiveProjectProvider>
      <EquipmentContent />
    </ActiveProjectProvider>
  );
}