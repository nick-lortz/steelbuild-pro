import React, { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { base44 } from '@/api/base44Client';
import { apiClient } from '@/api/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const EQUIPMENT_TYPES = [
  { value: 'mobile_crane', label: 'Mobile Crane' },
  { value: 'tower_crane', label: 'Tower Crane' },
  { value: 'crawler_crane', label: 'Crawler Crane' },
  { value: 'man_lift', label: 'Man Lift' },
  { value: 'forklift', label: 'Forklift' },
  { value: 'telehandler', label: 'Telehandler' },
  { value: 'welding_machine', label: 'Welding Machine' },
  { value: 'rigging', label: 'Specialty Rigging' },
  { value: 'other', label: 'Other' }
];

export default function EquipmentLogForm({ projectId, onSuccess }) {
  const queryClient = useQueryClient();
  const today = format(new Date(), 'yyyy-MM-dd');

  const [formData, setFormData] = useState({
    log_date: today,
    equipment_id: '',
    equipment_type: '',
    assigned_crew_id: '',
    assigned_task_id: '',
    gridlines_zone: '',
    elevation: '',
    operator_name: '',
    shift: 'day',
    actual_start: '',
    actual_end: '',
    setup_time_hours: 0,
    breakdown_time_hours: 0,
    productive_hours: 0,
    idle_hours: 0,
    idle_reason: '',
    idle_notes: '',
    crane_capacity: '',
    pick_weight: '',
    wind_limit: '',
    wind_actual: '',
    maintenance_required: false,
    maintenance_notes: '',
    notes: ''
  });

  const [conflicts, setConflicts] = useState([]);

  const { data: cranes = [] } = useQuery({
    queryKey: ['equipment', projectId, 'cranes'],
    queryFn: () => apiClient.entities.Resource.filter({
      type: 'equipment',
      current_project_id: projectId,
      classification: 'Crane'
    }),
    select: (data) => data || []
  });

  const { data: crews = [] } = useQuery({
    queryKey: ['crews', projectId],
    queryFn: () => apiClient.entities.Crew.filter({ project_id: projectId, status: 'active' }),
    select: (data) => data || []
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks', projectId],
    queryFn: () => apiClient.entities.Task.filter({ project_id: projectId, status: 'in_progress' }),
    select: (data) => data || []
  });

  const { data: existingLogs = [] } = useQuery({
    queryKey: ['equipmentLogs', projectId, formData.log_date],
    queryFn: () => apiClient.entities.EquipmentLog.filter({
      project_id: projectId,
      log_date: formData.log_date
    }),
    enabled: !!formData.equipment_id
  });

  // Check conflicts
  React.useEffect(() => {
    const flaggedConflicts = [];

    if (formData.equipment_type?.includes('crane') && formData.pick_weight && formData.crane_capacity) {
      const pick = parseFloat(formData.pick_weight);
      const capacity = parseFloat(formData.crane_capacity);
      if (pick > capacity) {
        flaggedConflicts.push({
          type: 'weight_exceeds_capacity',
          severity: 'critical',
          msg: `Pick weight (${pick}T) exceeds crane capacity (${capacity}T)`
        });
      }
    }

    if (formData.equipment_type?.includes('crane') && formData.wind_actual && formData.wind_limit) {
      const actual = parseFloat(formData.wind_actual);
      const limit = parseFloat(formData.wind_limit);
      if (actual > limit) {
        flaggedConflicts.push({
          type: 'wind_exceeds_limit',
          severity: 'warning',
          msg: `Wind speed (${actual} mph) exceeds limit (${limit} mph)`
        });
      }
    }

    // Check double booking
    const conflictingLogs = existingLogs.filter(log => {
      const logStart = new Date(log.actual_start || log.scheduled_start);
      const logEnd = new Date(log.actual_end || log.scheduled_end);
      const formStart = formData.actual_start ? new Date(formData.actual_start) : null;
      const formEnd = formData.actual_end ? new Date(formData.actual_end) : null;

      if (!formStart || !formEnd) return false;
      return formStart < logEnd && formEnd > logStart;
    });

    if (conflictingLogs.length > 0) {
      flaggedConflicts.push({
        type: 'double_booked',
        severity: 'critical',
        msg: `Equipment is double-booked with ${conflictingLogs.length} other task(s)`
      });
    }

    setConflicts(flaggedConflicts);
  }, [formData.equipment_type, formData.pick_weight, formData.crane_capacity, formData.wind_actual, formData.wind_limit, formData.actual_start, formData.actual_end, existingLogs]);

  const createLog = useMutation({
    mutationFn: async () => {
      const log = await apiClient.entities.EquipmentLog.create({
        project_id: projectId,
        equipment_id: formData.equipment_id,
        equipment_type: formData.equipment_type,
        log_date: formData.log_date,
        shift: formData.shift,
        assigned_crew_id: formData.assigned_crew_id || null,
        assigned_task_id: formData.assigned_task_id || null,
        gridlines_zone: formData.gridlines_zone,
        elevation: formData.elevation,
        operator_name: formData.operator_name,
        actual_start: formData.actual_start ? new Date(formData.actual_start).toISOString() : null,
        actual_end: formData.actual_end ? new Date(formData.actual_end).toISOString() : null,
        setup_time_hours: parseFloat(formData.setup_time_hours),
        breakdown_time_hours: parseFloat(formData.breakdown_time_hours),
        productive_hours: parseFloat(formData.productive_hours),
        idle_hours: parseFloat(formData.idle_hours),
        idle_reason: formData.idle_hours > 0 ? formData.idle_reason : null,
        idle_notes: formData.idle_notes,
        crane_data: formData.equipment_type?.includes('crane') ? {
          capacity_tons: parseFloat(formData.crane_capacity),
          pick_weight_tons: parseFloat(formData.pick_weight),
          wind_speed_limit_mph: parseFloat(formData.wind_limit),
          wind_speed_actual_mph: parseFloat(formData.wind_actual)
        } : null,
        conflicts: conflicts.length > 0 ? conflicts : null,
        maintenance_required: formData.maintenance_required,
        maintenance_notes: formData.maintenance_notes,
        notes: formData.notes
      });
      return log;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipmentLogs', projectId] });
      toast.success('Equipment log recorded');
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to save log');
    }
  });

  const totalHours = parseFloat(formData.setup_time_hours) + 
                     parseFloat(formData.productive_hours) + 
                     parseFloat(formData.breakdown_time_hours) +
                     parseFloat(formData.idle_hours);
  const utilization = totalHours > 0 ? ((parseFloat(formData.productive_hours) / totalHours) * 100).toFixed(0) : 0;

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <CardTitle>Equipment Log Entry</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Date & Equipment */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-zinc-400">Date</label>
            <Input
              type="date"
              value={formData.log_date}
              onChange={(e) => setFormData(prev => ({ ...prev, log_date: e.target.value }))}
              className="bg-zinc-800 border-zinc-700"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-zinc-400">Equipment</label>
            <Select value={formData.equipment_id} onValueChange={(val) => setFormData(prev => ({ ...prev, equipment_id: val }))}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700">
                <SelectValue placeholder="Select equipment" />
              </SelectTrigger>
              <SelectContent>
                {cranes.map(eq => (
                  <SelectItem key={eq.id} value={eq.id}>{eq.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-zinc-400">Type</label>
            <Select value={formData.equipment_type} onValueChange={(val) => setFormData(prev => ({ ...prev, equipment_type: val }))}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {EQUIPMENT_TYPES.map(t => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Assignment */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-zinc-400">Assigned Crew</label>
            <Select value={formData.assigned_crew_id} onValueChange={(val) => setFormData(prev => ({ ...prev, assigned_crew_id: val }))}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700">
                <SelectValue placeholder="Select crew" />
              </SelectTrigger>
              <SelectContent>
                {crews.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.crew_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-zinc-400">Task</label>
            <Select value={formData.assigned_task_id} onValueChange={(val) => setFormData(prev => ({ ...prev, assigned_task_id: val }))}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700">
                <SelectValue placeholder="Select task" />
              </SelectTrigger>
              <SelectContent>
                {tasks.map(t => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-zinc-400">Location</label>
            <Input
              placeholder="Gridlines / zone"
              value={formData.gridlines_zone}
              onChange={(e) => setFormData(prev => ({ ...prev, gridlines_zone: e.target.value }))}
              className="bg-zinc-800 border-zinc-700"
            />
          </div>
        </div>

        {/* Operator & Shift */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-zinc-400">Operator</label>
            <Input
              placeholder="Operator name"
              value={formData.operator_name}
              onChange={(e) => setFormData(prev => ({ ...prev, operator_name: e.target.value }))}
              className="bg-zinc-800 border-zinc-700"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-zinc-400">Shift</label>
            <Select value={formData.shift} onValueChange={(val) => setFormData(prev => ({ ...prev, shift: val }))}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Day</SelectItem>
                <SelectItem value="swing">Swing</SelectItem>
                <SelectItem value="night">Night</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-zinc-400">Elevation</label>
            <Input
              placeholder="Level"
              value={formData.elevation}
              onChange={(e) => setFormData(prev => ({ ...prev, elevation: e.target.value }))}
              className="bg-zinc-800 border-zinc-700"
            />
          </div>
        </div>

        {/* Time Entry */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-zinc-800 rounded-lg">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-zinc-500">Setup (hrs)</label>
            <Input
              type="number"
              step="0.5"
              value={formData.setup_time_hours}
              onChange={(e) => setFormData(prev => ({ ...prev, setup_time_hours: e.target.value }))}
              className="bg-zinc-700 border-zinc-600 text-sm"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-zinc-500">Productive (hrs)</label>
            <Input
              type="number"
              step="0.5"
              value={formData.productive_hours}
              onChange={(e) => setFormData(prev => ({ ...prev, productive_hours: e.target.value }))}
              className="bg-zinc-700 border-zinc-600 text-sm"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-zinc-500">Breakdown (hrs)</label>
            <Input
              type="number"
              step="0.5"
              value={formData.breakdown_time_hours}
              onChange={(e) => setFormData(prev => ({ ...prev, breakdown_time_hours: e.target.value }))}
              className="bg-zinc-700 border-zinc-600 text-sm"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-zinc-500">Idle (hrs)</label>
            <Input
              type="number"
              step="0.5"
              value={formData.idle_hours}
              onChange={(e) => setFormData(prev => ({ ...prev, idle_hours: e.target.value }))}
              className="bg-zinc-700 border-zinc-600 text-sm"
            />
          </div>
        </div>

        {/* Utilization Badge */}
        <Badge variant="default" className="w-fit">Utilization: {utilization}%</Badge>

        {/* Idle Reason */}
        {parseFloat(formData.idle_hours) > 0 && (
          <div className="space-y-3 p-4 bg-amber-900/20 border border-amber-800 rounded-lg">
            <label className="text-xs font-bold uppercase text-amber-600">Idle Reason</label>
            <Select value={formData.idle_reason} onValueChange={(val) => setFormData(prev => ({ ...prev, idle_reason: val }))}>
              <SelectTrigger className="bg-amber-900/30 border-amber-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="waiting_crew">Waiting on Crew</SelectItem>
                <SelectItem value="waiting_material">Waiting on Material</SelectItem>
                <SelectItem value="waiting_crane">Waiting on Crane</SelectItem>
                <SelectItem value="weather">Weather</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
                <SelectItem value="breakdown">Breakdown</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
            <Textarea
              placeholder="Idle notes..."
              value={formData.idle_notes}
              onChange={(e) => setFormData(prev => ({ ...prev, idle_notes: e.target.value }))}
              className="bg-zinc-800 border-zinc-700 text-sm"
            />
          </div>
        )}

        {/* Crane-Specific Fields */}
        {formData.equipment_type?.includes('crane') && (
          <div className="space-y-4 p-4 bg-blue-900/20 border border-blue-800 rounded-lg">
            <p className="text-xs font-bold uppercase text-blue-500">Crane Data</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-zinc-400">Capacity (tons)</label>
                <Input
                  type="number"
                  value={formData.crane_capacity}
                  onChange={(e) => setFormData(prev => ({ ...prev, crane_capacity: e.target.value }))}
                  className="bg-zinc-800 border-zinc-700"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-zinc-400">Pick Weight (tons)</label>
                <Input
                  type="number"
                  value={formData.pick_weight}
                  onChange={(e) => setFormData(prev => ({ ...prev, pick_weight: e.target.value }))}
                  className="bg-zinc-800 border-zinc-700"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-zinc-400">Wind Limit (mph)</label>
                <Input
                  type="number"
                  value={formData.wind_limit}
                  onChange={(e) => setFormData(prev => ({ ...prev, wind_limit: e.target.value }))}
                  className="bg-zinc-800 border-zinc-700"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-zinc-400">Actual Wind (mph)</label>
                <Input
                  type="number"
                  value={formData.wind_actual}
                  onChange={(e) => setFormData(prev => ({ ...prev, wind_actual: e.target.value }))}
                  className="bg-zinc-800 border-zinc-700"
                />
              </div>
            </div>
          </div>
        )}

        {/* Conflicts */}
        {conflicts.length > 0 && (
          <div className="p-4 bg-red-900/20 border border-red-700 rounded-lg space-y-2">
            {conflicts.map((c, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <AlertTriangle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-bold text-red-400">{c.type.toUpperCase()}</p>
                  <p className="text-xs text-red-300">{c.msg}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Maintenance */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="maintenance"
              checked={formData.maintenance_required}
              onChange={(e) => setFormData(prev => ({ ...prev, maintenance_required: e.target.checked }))}
              className="rounded"
            />
            <label htmlFor="maintenance" className="text-sm font-bold text-zinc-200">
              Maintenance required
            </label>
          </div>
          {formData.maintenance_required && (
            <Textarea
              placeholder="Maintenance details..."
              value={formData.maintenance_notes}
              onChange={(e) => setFormData(prev => ({ ...prev, maintenance_notes: e.target.value }))}
              className="bg-zinc-800 border-zinc-700"
            />
          )}
        </div>

        {/* General Notes */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase text-zinc-400">Notes</label>
          <Textarea
            placeholder="Any other observations..."
            value={formData.notes}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            className="bg-zinc-800 border-zinc-700"
          />
        </div>

        <Button
          onClick={() => createLog.mutate()}
          disabled={createLog.isPending || !formData.equipment_id}
          className="w-full bg-green-600 hover:bg-green-700"
        >
          {createLog.isPending ? 'Saving...' : 'Record Equipment Log'}
        </Button>
      </CardContent>
    </Card>
  );
}