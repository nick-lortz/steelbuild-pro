import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { apiClient } from '@/api/client';
import { useQuery } from '@tanstack/react-query';
import { format, addDays } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Download, AlertTriangle } from 'lucide-react';
import DailyResourceCell from '@/components/lookahead/DailyResourceCell';
import RiskIndicators from '@/components/lookahead/RiskIndicators';
import ConflictDetector from '@/components/lookahead/ConflictDetector';
import { ActiveProjectProvider, useActiveProject } from '@/components/shared/hooks/useActiveProject';

function LookAheadContent() {
  const { activeProjectId, setActiveProjectId } = useActiveProject();
  const [weeks, setWeeks] = useState(3);
  const today = new Date();
  const endDate = addDays(today, weeks * 7);

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
    queryFn: () => apiClient.entities.Crew.filter({ project_id: activeProjectId }),
    enabled: !!activeProjectId
  });

  const { data: laborEntries = [] } = useQuery({
    queryKey: ['laborEntries', activeProjectId],
    queryFn: () => apiClient.entities.LaborEntry.filter({ project_id: activeProjectId }),
    enabled: !!activeProjectId
  });

  const { data: equipmentLogs = [] } = useQuery({
    queryKey: ['equipmentLogs', activeProjectId],
    queryFn: () => apiClient.entities.EquipmentLog.filter({ project_id: activeProjectId }),
    enabled: !!activeProjectId
  });

  const { data: deliveries = [] } = useQuery({
    queryKey: ['deliveries', activeProjectId],
    queryFn: () => apiClient.entities.Delivery.filter({ project_id: activeProjectId }),
    enabled: !!activeProjectId
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks', activeProjectId],
    queryFn: () => apiClient.entities.Task.filter({ project_id: activeProjectId }),
    enabled: !!activeProjectId
  });

  const allConflicts = ConflictDetector({ crews, equipmentLogs, deliveries, tasks, laborEntries, equipmentLogs });

  const dailyGrid = useMemo(() => {
    const grid = [];
    for (let i = 0; i < weeks * 7; i++) {
      const date = addDays(today, i);
      const dateStr = format(date, 'yyyy-MM-dd');

      const dayCrews = crews.filter(c => {
        const entry = laborEntries.find(le => le.work_date === dateStr && le.crew_id === c.id);
        return entry?.actual_hours > 0;
      }).map(c => {
        const entry = laborEntries.find(le => le.work_date === dateStr && le.crew_id === c.id);
        return {
          id: c.id,
          crew_name: c.crew_name,
          crew_size: entry?.crew_size,
          task_name: tasks.find(t => t.id === entry?.task_id)?.name,
          has_equipment: equipmentLogs.some(eq => eq.assigned_crew_id === c.id && eq.log_date === dateStr)
        };
      });

      const dayEquipment = equipmentLogs.filter(eq => eq.log_date === dateStr).map(eq => {
        const crew = crews.find(c => c.id === eq.assigned_crew_id);
        return {
          ...eq,
          crew_name: crew?.crew_name
        };
      });

      const dayDeliveries = deliveries.filter(d => d.scheduled_date === dateStr);

      const dayConflicts = allConflicts.filter(c => c.date === dateStr || format(new Date(c.date || dateStr), 'yyyy-MM-dd') === dateStr);

      grid.push({
        date,
        crews: dayCrews,
        equipment: dayEquipment,
        deliveries: dayDeliveries,
        conflicts: dayConflicts
      });
    }
    return grid;
  }, [weeks, today, crews, laborEntries, equipmentLogs, deliveries, tasks, allConflicts]);

  const handleExport = () => {
    let csv = 'DATE,CREWS,EQUIPMENT,DELIVERIES,CONFLICTS\n';
    
    dailyGrid.forEach(day => {
      const dateStr = format(day.date, 'yyyy-MM-dd');
      const crewList = day.crews.map(c => c.crew_name).join('; ');
      const equipList = day.equipment.map(e => `${e.equipment_id}(${e.equipment_type})`).join('; ');
      const delList = day.deliveries.map(d => `${d.package_name} (${d.weight_tons}T)`).join('; ');
      const confList = day.conflicts.map(c => c.label).join('; ');
      
      csv += `${dateStr},"${crewList}","${equipList}","${delList}","${confList}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `look-ahead-${project?.project_number || 'export'}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (!activeProjectId) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Look-Ahead Resource Planning</h1>
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
      <div className="flex items-start justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold">Look-Ahead Resource Planning</h1>
          <p className="text-zinc-400 mt-1">{project?.name} • {format(today, 'MMM d')} - {format(endDate, 'MMM d, yyyy')}</p>
        </div>
        <div className="flex flex-col gap-3 items-end">
          <div className="w-64">
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
          <Button onClick={handleExport} variant="outline" size="sm">
            <Download size={14} className="mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Risk Indicators */}
      <RiskIndicators conflicts={allConflicts} laborEntries={laborEntries} equipment={equipmentLogs} deliveries={deliveries} />

      {/* Time Horizon */}
      <div className="flex gap-2 items-center">
        <span className="text-sm font-bold text-zinc-400">Look-Ahead Horizon:</span>
        {[1, 2, 3, 4].map(w => (
          <Button
            key={w}
            size="sm"
            variant={weeks === w ? 'default' : 'outline'}
            onClick={() => setWeeks(w)}
            className={weeks === w ? 'bg-amber-600' : ''}
          >
            {w}w
          </Button>
        ))}
      </div>

      {/* Daily Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-3 auto-rows-max">
        {dailyGrid.map((day, idx) => (
          <DailyResourceCell
            key={idx}
            date={day.date}
            crews={day.crews}
            equipment={day.equipment}
            deliveries={day.deliveries}
            tasks={tasks}
            conflicts={day.conflicts}
          />
        ))}
      </div>

      {/* Critical Issues Summary */}
      {allConflicts.length > 0 && (
        <Card className="bg-red-900/20 border border-red-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle size={18} className="text-red-500" />
              Resource Conflicts & Gaps ({allConflicts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {allConflicts.map((c, idx) => (
                <div key={idx} className="flex items-start gap-2 p-2 bg-zinc-800 rounded text-sm">
                  <Badge variant="outline" className={
                    c.severity === 'critical' ? 'border-red-600 text-red-400' :
                    c.severity === 'warning' ? 'border-yellow-600 text-yellow-400' :
                    'border-blue-600 text-blue-400'
                  }>
                    {c.severity.toUpperCase()}
                  </Badge>
                  <div>
                    <p className="text-zinc-200">{c.label}</p>
                    <p className="text-xs text-zinc-500">{format(new Date(c.date || today), 'MMM d')}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function LookAheadResourcePlanning() {
  return (
    <ActiveProjectProvider>
      <LookAheadContent />
    </ActiveProjectProvider>
  );
}