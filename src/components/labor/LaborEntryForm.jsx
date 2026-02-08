import React, { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { apiClient } from '@/api/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Check, Upload, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

export default function LaborEntryForm({ projectId, onSuccess }) {
  const queryClient = useQueryClient();
  const today = format(new Date(), 'yyyy-MM-dd');

  const [formData, setFormData] = useState({
    work_date: today,
    crew_id: '',
    crew_size: 0,
    crew_lead: '',
    shift: 'day',
    task_id: '',
    erection_sequence: '',
    gridlines_zone: '',
    elevation: '',
    planned_hours: 8,
    actual_hours: 0,
    overtime_hours: 0,
    tons_installed: 0,
    has_delay: false,
    delay_reason: '',
    delay_hours: 0,
    delay_notes: '',
    equipment_used: [],
    safety_incidents: false,
    safety_notes: '',
    photos: [],
    notes: ''
  });

  const [certWarnings, setCertWarnings] = useState([]);

  const { data: crews, isLoading: crewsLoading } = useQuery({
    queryKey: ['crews', projectId],
    queryFn: () => apiClient.entities.Crew.filter({ project_id: projectId, status: 'active' }),
    select: (data) => data || []
  });

  const { data: tasks, isLoading: tasksLoading } = useQuery({
    queryKey: ['tasks', projectId],
    queryFn: () => apiClient.entities.Task.filter({ 
      project_id: projectId, 
      status: 'in_progress'
    }),
    select: (data) => data || []
  });

  const { data: equipment } = useQuery({
    queryKey: ['equipment', projectId],
    queryFn: () => apiClient.entities.Resource.filter({
      type: 'equipment',
      current_project_id: projectId
    }),
    select: (data) => data || []
  });

  const selectedCrew = useMemo(() => {
    return crews?.find(c => c.id === formData.crew_id);
  }, [formData.crew_id, crews]);

  // Check for certification gaps when crew is selected
  React.useEffect(() => {
    if (selectedCrew && formData.task_id) {
      const gaps = [];
      selectedCrew.crew_members?.forEach(member => {
        selectedCrew.required_certifications?.forEach(cert => {
          const memberCert = member.certifications?.find(c => c.name === cert);
          if (!memberCert || (memberCert.expiration_date && new Date(memberCert.expiration_date) < new Date())) {
            gaps.push({
              member: member.name,
              missing_cert: cert
            });
          }
        });
      });
      setCertWarnings(gaps);
    }
  }, [selectedCrew, formData.task_id]);

  const createLaborEntry = useMutation({
    mutationFn: async (data) => {
      const entry = await apiClient.entities.LaborEntry.create({
        project_id: projectId,
        crew_id: formData.crew_id,
        work_date: formData.work_date,
        shift: formData.shift,
        crew_size: parseInt(formData.crew_size),
        crew_lead: formData.crew_lead,
        task_id: formData.task_id,
        erection_sequence: formData.erection_sequence ? parseInt(formData.erection_sequence) : null,
        gridlines_zone: formData.gridlines_zone,
        elevation: formData.elevation,
        planned_hours: parseFloat(formData.planned_hours),
        actual_hours: parseFloat(formData.actual_hours),
        overtime_hours: parseFloat(formData.overtime_hours),
        productivity: {
          tons_installed: parseFloat(formData.tons_installed) || 0
        },
        equipment_used: formData.equipment_used,
        has_delay: formData.has_delay,
        delay_reason: formData.has_delay ? formData.delay_reason : null,
        delay_hours: formData.delay_hours,
        delay_notes: formData.delay_notes,
        safety_incidents: formData.safety_incidents,
        safety_notes: formData.safety_notes,
        certification_gaps: certWarnings,
        photos: formData.photos,
        notes: formData.notes
      });
      return entry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['laborEntries', projectId] });
      toast.success('Labor entry recorded');
      setFormData({
        work_date: today,
        crew_id: formData.crew_id, // keep crew selected
        crew_size: formData.crew_size,
        crew_lead: formData.crew_lead,
        shift: 'day',
        task_id: '',
        erection_sequence: '',
        gridlines_zone: '',
        elevation: '',
        planned_hours: 8,
        actual_hours: 0,
        overtime_hours: 0,
        tons_installed: 0,
        has_delay: false,
        delay_reason: '',
        delay_hours: 0,
        delay_notes: '',
        equipment_used: [],
        safety_incidents: false,
        safety_notes: '',
        photos: [],
        notes: ''
      });
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to save labor entry');
    }
  });

  const handleEquipmentToggle = (equipId) => {
    setFormData(prev => ({
      ...prev,
      equipment_used: prev.equipment_used.includes(equipId)
        ? prev.equipment_used.filter(e => e !== equipId)
        : [...prev.equipment_used, equipId]
    }));
  };

  const totalHours = parseFloat(formData.actual_hours) + parseFloat(formData.overtime_hours);
  const variance = totalHours - parseFloat(formData.planned_hours);
  const efficiency = selectedCrew && formData.tons_installed 
    ? (parseFloat(formData.tons_installed) / (totalHours * (formData.crew_size || 1))).toFixed(2)
    : 0;

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Daily Labor Entry</span>
          <span className="text-xs font-mono text-zinc-500">{format(new Date(formData.work_date), 'MMM dd, yyyy')}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Crew & Date */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-zinc-400">Work Date</label>
            <Input
              type="date"
              value={formData.work_date}
              onChange={(e) => setFormData(prev => ({ ...prev, work_date: e.target.value }))}
              className="bg-zinc-800 border-zinc-700"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-zinc-400">Crew</label>
            <Select value={formData.crew_id} onValueChange={(val) => setFormData(prev => ({ ...prev, crew_id: val }))}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700">
                <SelectValue placeholder="Select crew" />
              </SelectTrigger>
              <SelectContent>
                {crews?.map(crew => (
                  <SelectItem key={crew.id} value={crew.id}>
                    {crew.crew_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
        </div>

        {/* Crew Lead & Size */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-zinc-400">Crew Lead</label>
            <Input
              placeholder="Lead name"
              value={formData.crew_lead}
              onChange={(e) => setFormData(prev => ({ ...prev, crew_lead: e.target.value }))}
              className="bg-zinc-800 border-zinc-700"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-zinc-400">Crew Size</label>
            <Input
              type="number"
              min="0"
              value={formData.crew_size}
              onChange={(e) => setFormData(prev => ({ ...prev, crew_size: e.target.value }))}
              className="bg-zinc-800 border-zinc-700"
            />
          </div>
        </div>

        {/* Task & Location */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-zinc-400">Task / Activity</label>
            <Select value={formData.task_id} onValueChange={(val) => setFormData(prev => ({ ...prev, task_id: val }))}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700">
                <SelectValue placeholder="Select task" />
              </SelectTrigger>
              <SelectContent>
                {tasks?.map(task => (
                  <SelectItem key={task.id} value={task.id}>{task.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-zinc-400">Gridlines / Zone</label>
            <Input
              placeholder="e.g., A-C / 1-3"
              value={formData.gridlines_zone}
              onChange={(e) => setFormData(prev => ({ ...prev, gridlines_zone: e.target.value }))}
              className="bg-zinc-800 border-zinc-700"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-zinc-400">Elevation</label>
            <Input
              placeholder="e.g., Level 2"
              value={formData.elevation}
              onChange={(e) => setFormData(prev => ({ ...prev, elevation: e.target.value }))}
              className="bg-zinc-800 border-zinc-700"
            />
          </div>
        </div>

        {/* Hours & Productivity */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-zinc-800 rounded-lg">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-zinc-500">Planned Hrs</label>
            <Input
              type="number"
              step="0.5"
              value={formData.planned_hours}
              onChange={(e) => setFormData(prev => ({ ...prev, planned_hours: e.target.value }))}
              className="bg-zinc-700 border-zinc-600 text-sm"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-zinc-500">Actual Hrs</label>
            <Input
              type="number"
              step="0.5"
              value={formData.actual_hours}
              onChange={(e) => setFormData(prev => ({ ...prev, actual_hours: e.target.value }))}
              className="bg-zinc-700 border-zinc-600 text-sm"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-zinc-500">OT Hrs</label>
            <Input
              type="number"
              step="0.5"
              value={formData.overtime_hours}
              onChange={(e) => setFormData(prev => ({ ...prev, overtime_hours: e.target.value }))}
              className="bg-zinc-700 border-zinc-600 text-sm"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-zinc-500">Tons</label>
            <Input
              type="number"
              step="0.5"
              value={formData.tons_installed}
              onChange={(e) => setFormData(prev => ({ ...prev, tons_installed: e.target.value }))}
              className="bg-zinc-700 border-zinc-600 text-sm"
            />
          </div>
        </div>

        {/* Real-time Metrics */}
        <div className="flex gap-3 text-xs">
          <Badge variant={variance > 0 ? 'destructive' : 'default'}>
            Variance: {variance > 0 ? '+' : ''}{variance.toFixed(1)}h
          </Badge>
          <Badge variant="outline">
            Efficiency: {efficiency} T/crew/hr
          </Badge>
        </div>

        {/* Equipment Used */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase text-zinc-400">Equipment Used</label>
          <div className="flex flex-wrap gap-2">
            {equipment?.map(equip => (
              <Button
                key={equip.id}
                size="sm"
                variant={formData.equipment_used.includes(equip.id) ? 'default' : 'outline'}
                onClick={() => handleEquipmentToggle(equip.id)}
                className="text-xs"
              >
                {equip.name}
              </Button>
            ))}
          </div>
        </div>

        {/* Delays */}
        <div className="space-y-3 p-4 bg-zinc-800 rounded-lg">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="has_delay"
              checked={formData.has_delay}
              onChange={(e) => setFormData(prev => ({ ...prev, has_delay: e.target.checked }))}
              className="rounded"
            />
            <label htmlFor="has_delay" className="text-sm font-bold text-zinc-200">
              Delays or reduced productivity
            </label>
          </div>

          {formData.has_delay && (
            <div className="space-y-3 pl-6 border-l-2 border-amber-600">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-zinc-400">Delay Reason</label>
                <Select value={formData.delay_reason} onValueChange={(val) => setFormData(prev => ({ ...prev, delay_reason: val }))}>
                  <SelectTrigger className="bg-zinc-700 border-zinc-600">
                    <SelectValue placeholder="Select reason" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="waiting_steel">Waiting on Steel</SelectItem>
                    <SelectItem value="crane_unavailable">Crane Unavailable</SelectItem>
                    <SelectItem value="weather">Weather</SelectItem>
                    <SelectItem value="site_access">Site Access</SelectItem>
                    <SelectItem value="rework">Rework Required</SelectItem>
                    <SelectItem value="safety_stop">Safety Stop</SelectItem>
                    <SelectItem value="material_shortage">Material Shortage</SelectItem>
                    <SelectItem value="coordination">Coordination Issue</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-zinc-400">Delay Hours</label>
                  <Input
                    type="number"
                    step="0.5"
                    value={formData.delay_hours}
                    onChange={(e) => setFormData(prev => ({ ...prev, delay_hours: e.target.value }))}
                    className="bg-zinc-700 border-zinc-600"
                  />
                </div>
              </div>
              <Textarea
                placeholder="Delay notes..."
                value={formData.delay_notes}
                onChange={(e) => setFormData(prev => ({ ...prev, delay_notes: e.target.value }))}
                className="bg-zinc-700 border-zinc-600 text-sm"
              />
            </div>
          )}
        </div>

        {/* Certification Warnings */}
        {certWarnings.length > 0 && (
          <div className="p-4 bg-red-900/20 border border-red-700 rounded-lg space-y-2">
            <div className="flex items-center gap-2 text-red-500">
              <AlertTriangle size={16} />
              <span className="text-sm font-bold">Certification Gaps</span>
            </div>
            {certWarnings.map((gap, idx) => (
              <p key={idx} className="text-xs text-red-400">
                {gap.member} missing {gap.missing_cert}
              </p>
            ))}
          </div>
        )}

        {/* Safety */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="safety"
              checked={formData.safety_incidents}
              onChange={(e) => setFormData(prev => ({ ...prev, safety_incidents: e.target.checked }))}
              className="rounded"
            />
            <label htmlFor="safety" className="text-sm font-bold text-zinc-200">
              Safety incident / near-miss
            </label>
          </div>
          {formData.safety_incidents && (
            <Textarea
              placeholder="Safety notes..."
              value={formData.safety_notes}
              onChange={(e) => setFormData(prev => ({ ...prev, safety_notes: e.target.value }))}
              className="bg-zinc-800 border-zinc-700"
            />
          )}
        </div>

        {/* General Notes */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase text-zinc-400">Daily Notes</label>
          <Textarea
            placeholder="Any other notes, progress observations..."
            value={formData.notes}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            className="bg-zinc-800 border-zinc-700"
          />
        </div>

        {/* Submit */}
        <Button
          onClick={() => createLaborEntry.mutate()}
          disabled={createLaborEntry.isPending || !formData.crew_id || !formData.actual_hours}
          className="w-full bg-green-600 hover:bg-green-700"
        >
          {createLaborEntry.isPending ? 'Saving...' : 'Record Labor Entry'}
        </Button>
      </CardContent>
    </Card>
  );
}