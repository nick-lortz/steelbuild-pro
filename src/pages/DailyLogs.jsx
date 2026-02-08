import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import PageShell from '@/components/layout/PageShell';
import PageHeader from '@/components/layout/PageHeader';
import MetricsBar from '@/components/layout/MetricsBar';
import FilterBar from '@/components/layout/FilterBar';
import ContentSection from '@/components/layout/ContentSection';
import SectionCard from '@/components/layout/SectionCard';
import DataTable from '@/components/ui/DataTable';
import PhotoCapture from '@/components/mobile/PhotoCapture';
import { Plus, Calendar, Users, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from '@/components/ui/notifications';

const initialFormState = {
  project_id: '',
  log_date: format(new Date(), 'yyyy-MM-dd'),
  weather_condition: 'clear',
  temperature_high: '',
  temperature_low: '',
  crew_count: '',
  work_performed: '',
  equipment_used: [],
  materials_delivered: '',
  safety_incidents: false,
  safety_notes: '',
  delays: false,
  delay_reason: '',
  hours_worked: '',
  visitors: '',
  notes: '',
  photos: [],
};

export default function DailyLogs() {
  const [showForm, setShowForm] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);
  const [formData, setFormData] = useState(initialFormState);
  const [projectFilter, setProjectFilter] = useState('all');
  const [deleteLog, setDeleteLog] = useState(null);
  const [showPhotoTab, setShowPhotoTab] = useState(false);

  const queryClient = useQueryClient();

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => apiClient.entities.Project.list('name'),
    staleTime: 10 * 60 * 1000,
  });

  const { data: dailyLogs = [] } = useQuery({
    queryKey: ['dailyLogs'],
    queryFn: () => apiClient.entities.DailyLog.list('-log_date'),
    staleTime: 5 * 60 * 1000,
  });

  const createMutation = useMutation({
    mutationFn: (data) => apiClient.entities.DailyLog.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dailyLogs'] });
      setShowForm(false);
      setFormData(initialFormState);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => apiClient.entities.DailyLog.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dailyLogs'] });
      setSelectedLog(null);
      setFormData(initialFormState);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => apiClient.entities.DailyLog.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dailyLogs'] });
      setDeleteLog(null);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      ...formData,
      crew_count: parseInt(formData.crew_count) || 0,
      temperature_high: parseFloat(formData.temperature_high) || null,
      temperature_low: parseFloat(formData.temperature_low) || null,
      hours_worked: parseFloat(formData.hours_worked) || null,
    };

    if (selectedLog) {
      updateMutation.mutate({ id: selectedLog.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (log) => {
    setFormData({
      project_id: log.project_id || '',
      log_date: log.log_date || '',
      weather_condition: log.weather_condition || 'clear',
      temperature_high: log.temperature_high?.toString() || '',
      temperature_low: log.temperature_low?.toString() || '',
      crew_count: log.crew_count?.toString() || '',
      work_performed: log.work_performed || '',
      equipment_used: log.equipment_used || [],
      materials_delivered: log.materials_delivered || '',
      safety_incidents: log.safety_incidents || false,
      safety_notes: log.safety_notes || '',
      delays: log.delays || false,
      delay_reason: log.delay_reason || '',
      hours_worked: log.hours_worked?.toString() || '',
      visitors: log.visitors || '',
      notes: log.notes || '',
      photos: log.photos || [],
    });
    setSelectedLog(log);
    setShowPhotoTab(false);
  };

  const handlePhotoCapture = (photo) => {
    setFormData(prev => ({
      ...prev,
      photos: [...(prev.photos || []), photo.url]
    }));
    toast.success('Photo linked to log');
  };

  const filteredLogs = React.useMemo(() => 
    dailyLogs.filter(log => 
      projectFilter === 'all' || log.project_id === projectFilter
    ),
    [dailyLogs, projectFilter]
  );

  const weatherIcons = {
    clear: '☀️',
    cloudy: '☁️',
    rain: '🌧️',
    snow: '❄️',
    extreme: '⚠️'
  };

  const columns = [
    {
      header: 'Date',
      accessor: 'log_date',
      render: (row) => (
        <div className="flex items-center gap-2">
          <Calendar size={16} className="text-zinc-500" />
          <span className="font-medium">{format(new Date(row.log_date), 'MMM d, yyyy')}</span>
        </div>
      ),
    },
    {
      header: 'Project',
      accessor: 'project_id',
      render: (row) => {
        const project = projects.find(p => p.id === row.project_id);
        return <span className="text-zinc-300">{project?.name}</span>;
      },
    },
    {
      header: 'Weather',
      accessor: 'weather_condition',
      render: (row) => (
        <div className="flex items-center gap-2">
          <span className="text-xl">{weatherIcons[row.weather_condition]}</span>
          <span className="text-zinc-400 text-sm capitalize">{row.weather_condition}</span>
        </div>
      ),
    },
    {
      header: 'Crew',
      accessor: 'crew_count',
      render: (row) => (
        <div className="flex items-center gap-1">
          <Users size={14} className="text-zinc-500" />
          <span>{row.crew_count || 0}</span>
        </div>
      ),
    },
    {
      header: 'Hours',
      accessor: 'hours_worked',
      render: (row) => row.hours_worked ? `${row.hours_worked}h` : '-',
    },
    {
      header: 'Issues',
      render: (row) => (
        <div className="flex gap-2">
          {row.safety_incidents && (
            <Badge variant="outline" className="bg-red-500/20 text-red-400 border-red-500/30">
              Safety
            </Badge>
          )}
          {row.delays && (
            <Badge variant="outline" className="bg-amber-500/20 text-amber-400 border-amber-500/30">
              Delay
            </Badge>
          )}
        </div>
      ),
    },
    {
      header: '',
      accessor: 'actions',
      render: (row) => (
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            setDeleteLog(row);
          }}
          className="text-zinc-500 hover:text-red-500"
        >
          <Trash2 size={16} />
        </Button>
      ),
    },
  ];

  const logStats = useMemo(() => {
    const safetyIncidents = filteredLogs.filter(l => l.safety_incidents).length;
    const delays = filteredLogs.filter(l => l.delays).length;
    const totalHours = filteredLogs.reduce((sum, l) => sum + (l.hours_worked || 0), 0);
    const avgCrew = filteredLogs.length > 0 
      ? Math.round(filteredLogs.reduce((sum, l) => sum + (l.crew_count || 0), 0) / filteredLogs.length)
      : 0;
    return { safetyIncidents, delays, avgCrew, totalHours };
  }, [filteredLogs]);

  return (
    <PageShell>
      <PageHeader
        title="Daily Field Logs"
        subtitle={`${filteredLogs.length} logs`}
        actions={
          <Button 
            onClick={() => {
              setFormData(initialFormState);
              setShowForm(true);
            }}
            className="bg-amber-500 hover:bg-amber-600 text-black font-bold"
          >
            <Plus size={16} className="mr-2" />
            New Log
          </Button>
        }
      />

      <MetricsBar
        metrics={[
          { label: 'Avg Crew', value: logStats.avgCrew },
          { label: 'Total Hours', value: `${logStats.totalHours.toFixed(1)}h`, color: 'text-blue-400' },
          { label: 'Safety Incidents', value: logStats.safetyIncidents, color: logStats.safetyIncidents > 0 ? 'text-red-400' : 'text-green-400' },
          { label: 'Delays', value: logStats.delays, color: logStats.delays > 0 ? 'text-amber-400' : 'text-green-400' }
        ]}
      />

      <FilterBar>
        <Select value={projectFilter} onValueChange={setProjectFilter}>
          <SelectTrigger className="w-64 bg-zinc-900 border-zinc-800 text-white">
            <SelectValue placeholder="All Projects" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-800">
            <SelectItem value="all">All Projects</SelectItem>
            {projects.map(p => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FilterBar>

      <ContentSection>
        <SectionCard>
          <DataTable
            columns={columns}
            data={filteredLogs}
            onRowClick={handleEdit}
            emptyMessage="No daily logs found. Create your first log to track field activities."
          />
        </SectionCard>
      </ContentSection>

      {/* Create Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-3xl bg-zinc-900 border-zinc-800 text-white max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Daily Log</DialogTitle>
          </DialogHeader>
          <DailyLogForm
            formData={formData}
            setFormData={setFormData}
            projects={projects}
            onSubmit={handleSubmit}
            isLoading={createMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Sheet */}
      <Sheet open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <SheetContent className="w-full sm:max-w-3xl bg-zinc-900 border-zinc-800 text-white overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-white">
              Edit Daily Log - {selectedLog && format(new Date(selectedLog.log_date), 'MMM d, yyyy')}
            </SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-6">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-zinc-400 uppercase">Photos</h3>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => setShowPhotoTab(!showPhotoTab)}
                  className="border-zinc-700 text-white hover:bg-zinc-800"
                >
                  <Camera size={14} className="mr-1" />
                  {showPhotoTab ? 'Hide' : 'Add'}
                </Button>
              </div>
              {showPhotoTab && (
                <PhotoCapture 
                  onPhotoCapture={handlePhotoCapture}
                  projectId={formData.project_id}
                  allowMultiple={true}
                />
              )}
              {formData.photos?.length > 0 && (
                <div className="grid grid-cols-2 gap-2 mt-3">
                  {formData.photos.map((photo, idx) => (
                    <div key={idx} className="relative group">
                      <img src={photo} alt={`Log photo ${idx + 1}`} className="w-full h-24 object-cover rounded border border-zinc-700" />
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({
                          ...prev,
                          photos: prev.photos.filter((_, i) => i !== idx)
                        }))}
                        className="absolute top-1 right-1 bg-red-500/80 opacity-0 group-hover:opacity-100 text-white p-1 rounded text-xs transition-opacity"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <DailyLogForm
              formData={formData}
              setFormData={setFormData}
              projects={projects}
              onSubmit={handleSubmit}
              isLoading={updateMutation.isPending}
              isEdit
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteLog} onOpenChange={() => setDeleteLog(null)}>
        <AlertDialogContent className="bg-zinc-900 border-zinc-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete Daily Log?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              Are you sure you want to delete the log from {deleteLog && format(new Date(deleteLog.log_date), 'MMM d, yyyy')}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-zinc-700 text-white hover:bg-zinc-800">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate(deleteLog.id)}
              className="bg-red-500 hover:bg-red-600"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageShell>
  );
}

function DailyLogForm({ formData, setFormData, projects, onSubmit, isLoading, isEdit }) {
  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const selectedProject = projects.find(p => p.id === formData.project_id);

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* Basic Info */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Project *</Label>
          <Select value={formData.project_id} onValueChange={(v) => handleChange('project_id', v)}>
            <SelectTrigger className="bg-zinc-800 border-zinc-700">
              <SelectValue placeholder="Select project" />
            </SelectTrigger>
            <SelectContent>
              {projects.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.project_number} - {p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Date *</Label>
          <Input
            type="date"
            value={formData.log_date}
            onChange={(e) => handleChange('log_date', e.target.value)}
            required
            className="bg-zinc-800 border-zinc-700"
          />
        </div>
      </div>

      {/* Quick Stats */}
      {selectedProject && (
        <div className="grid grid-cols-3 gap-3 p-3 bg-zinc-800/30 rounded-lg text-xs">
          <div>
            <span className="text-zinc-500">Project: </span>
            <span className="font-mono text-white">{selectedProject.project_number}</span>
          </div>
          <div>
            <span className="text-zinc-500">Status: </span>
            <Badge variant="outline" className="text-[10px]">{selectedProject.status}</Badge>
          </div>
          <div>
            <span className="text-zinc-500">Phase: </span>
            <Badge variant="outline" className="text-[10px] capitalize">{selectedProject.phase}</Badge>
          </div>
        </div>
      )}

      {/* Weather */}
      <div className="p-4 bg-zinc-800/50 rounded-lg">
        <h3 className="text-sm font-medium text-zinc-400 mb-3">Weather Conditions</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Condition</Label>
            <Select value={formData.weather_condition} onValueChange={(v) => handleChange('weather_condition', v)}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="clear">☀️ Clear</SelectItem>
                <SelectItem value="cloudy">☁️ Cloudy</SelectItem>
                <SelectItem value="rain">🌧️ Rain</SelectItem>
                <SelectItem value="snow">❄️ Snow</SelectItem>
                <SelectItem value="extreme">⚠️ Extreme</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>High (°F)</Label>
            <Input
              type="number"
              value={formData.temperature_high}
              onChange={(e) => handleChange('temperature_high', e.target.value)}
              className="bg-zinc-800 border-zinc-700"
            />
          </div>
          <div className="space-y-2">
            <Label>Low (°F)</Label>
            <Input
              type="number"
              value={formData.temperature_low}
              onChange={(e) => handleChange('temperature_low', e.target.value)}
              className="bg-zinc-800 border-zinc-700"
            />
          </div>
        </div>
      </div>

      {/* Crew */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Crew Count</Label>
          <Input
            type="number"
            value={formData.crew_count}
            onChange={(e) => handleChange('crew_count', e.target.value)}
            placeholder="Number of workers"
            className="bg-zinc-800 border-zinc-700"
          />
        </div>
        <div className="space-y-2">
          <Label>Hours Worked</Label>
          <Input
            type="number"
            step="0.5"
            value={formData.hours_worked}
            onChange={(e) => handleChange('hours_worked', e.target.value)}
            placeholder="Total hours"
            className="bg-zinc-800 border-zinc-700"
          />
        </div>
      </div>

      {/* Work Performed */}
      <div className="space-y-2">
        <Label>Work Performed *</Label>
        <Textarea
          value={formData.work_performed}
          onChange={(e) => handleChange('work_performed', e.target.value)}
          rows={4}
          placeholder="Describe work completed today (sequence, tonnage, pieces, etc.)..."
          required
          className="bg-zinc-800 border-zinc-700"
        />
      </div>

      {/* Materials & Equipment */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Materials Delivered</Label>
          <Textarea
            value={formData.materials_delivered}
            onChange={(e) => handleChange('materials_delivered', e.target.value)}
            rows={3}
            placeholder="Tonnage, piece counts, vendors, delivery status..."
            className="bg-zinc-800 border-zinc-700"
          />
        </div>
        <div className="space-y-2">
          <Label>Site Visitors / Inspectors</Label>
          <Textarea
            value={formData.visitors}
            onChange={(e) => handleChange('visitors', e.target.value)}
            rows={3}
            placeholder="Owners, architects, subs, safety, inspectors..."
            className="bg-zinc-800 border-zinc-700"
          />
        </div>
      </div>

      {/* Safety & Delays */}
      <div className="space-y-4 p-4 bg-zinc-800/50 rounded-lg">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="safety"
            checked={formData.safety_incidents}
            onCheckedChange={(checked) => handleChange('safety_incidents', checked)}
          />
          <Label htmlFor="safety" className="text-red-400 font-medium">
            Safety Incident Occurred
          </Label>
        </div>
        {formData.safety_incidents && (
          <div className="space-y-2 ml-6">
            <Label>Safety Notes *</Label>
            <Textarea
              value={formData.safety_notes}
              onChange={(e) => handleChange('safety_notes', e.target.value)}
              rows={3}
              required
              placeholder="Describe the incident..."
              className="bg-zinc-800 border-zinc-700"
            />
          </div>
        )}

        <div className="flex items-center space-x-2">
          <Checkbox
            id="delays"
            checked={formData.delays}
            onCheckedChange={(checked) => handleChange('delays', checked)}
          />
          <Label htmlFor="delays" className="text-amber-400 font-medium">
            Delays Occurred
          </Label>
        </div>
        {formData.delays && (
          <div className="space-y-2 ml-6">
            <Label>Delay Reason *</Label>
            <Textarea
              value={formData.delay_reason}
              onChange={(e) => handleChange('delay_reason', e.target.value)}
              rows={3}
              required
              placeholder="Describe the delay..."
              className="bg-zinc-800 border-zinc-700"
            />
          </div>
        )}
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label>Additional Notes</Label>
        <Textarea
          value={formData.notes}
          onChange={(e) => handleChange('notes', e.target.value)}
          rows={3}
          placeholder="Any other observations..."
          className="bg-zinc-800 border-zinc-700"
        />
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
        <Button
          type="submit"
          disabled={isLoading}
          className="bg-amber-500 hover:bg-amber-600 text-black"
        >
          {isLoading ? 'Saving...' : isEdit ? 'Update Log' : 'Create Log'}
        </Button>
      </div>
    </form>
  );
}