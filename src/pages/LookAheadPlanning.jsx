import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Download, Filter } from 'lucide-react';
import { format, addWeeks, startOfWeek, endOfWeek, isWithinInterval, parseISO } from 'date-fns';
import { useActiveProject } from '@/components/shared/hooks/useActiveProject';
import PageHeader from '@/components/ui/PageHeader';
import LookAheadFilters from '@/components/schedule/LookAheadFilters';
import LookAheadTimeline from '@/components/schedule/LookAheadTimeline';
import LookAheadTable from '@/components/schedule/LookAheadTable';
import ActivityForm from '@/components/schedule/ActivityForm';
import { toast } from 'sonner';

export default function LookAheadPlanning() {
  const { activeProjectId, setActiveProjectId } = useActiveProject();
  const [showFilters, setShowFilters] = useState(true);
  const [showActivityForm, setShowActivityForm] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [filters, setFilters] = useState({
    phases: ['detailing', 'fabrication', 'delivery', 'erection', 'closeout'],
    activityTypes: [],
    statuses: ['planned', 'in_progress', 'delayed'],
    responsibleParty: 'all',
    showCriticalOnly: false,
    dateFrom: format(new Date(), 'yyyy-MM-dd'),
    dateTo: format(addWeeks(new Date(), 6), 'yyyy-MM-dd')
  });

  const queryClient = useQueryClient();

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('name')
  });

  const { data: activities = [] } = useQuery({
    queryKey: ['schedule-activities', activeProjectId],
    queryFn: () => base44.entities.ScheduleActivity.filter({ project_id: activeProjectId }, 'start_date'),
    enabled: !!activeProjectId
  });

  const { data: resources = [] } = useQuery({
    queryKey: ['resources'],
    queryFn: () => base44.entities.Resource.list()
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list()
  });

  const { data: drawingSets = [] } = useQuery({
    queryKey: ['drawing-sets', activeProjectId],
    queryFn: () => base44.entities.DrawingSet.filter({ project_id: activeProjectId }),
    enabled: !!activeProjectId
  });

  const { data: rfis = [] } = useQuery({
    queryKey: ['rfis', activeProjectId],
    queryFn: () => base44.entities.RFI.filter({ project_id: activeProjectId }),
    enabled: !!activeProjectId
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ScheduleActivity.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule-activities'] });
      setShowActivityForm(false);
      toast.success('Activity created');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ScheduleActivity.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule-activities'] });
      setSelectedActivity(null);
      toast.success('Activity updated');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ScheduleActivity.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule-activities'] });
      setSelectedActivity(null);
      toast.success('Activity deleted');
    }
  });

  // Filter activities
  const filteredActivities = useMemo(() => {
    if (!activities.length) return [];

    const dateFrom = parseISO(filters.dateFrom);
    const dateTo = parseISO(filters.dateTo);

    return activities.filter((activity) => {
      // Date range filter
      const activityStart = parseISO(activity.start_date);
      const activityEnd = parseISO(activity.end_date);
      const inDateRange = isWithinInterval(activityStart, { start: dateFrom, end: dateTo }) ||
      isWithinInterval(activityEnd, { start: dateFrom, end: dateTo }) ||
      activityStart <= dateFrom && activityEnd >= dateTo;

      if (!inDateRange) return false;

      // Phase filter
      if (!filters.phases.includes(activity.phase)) return false;

      // Activity type filter
      if (filters.activityTypes.length > 0 && !filters.activityTypes.includes(activity.activity_type)) {
        return false;
      }

      // Status filter
      if (!filters.statuses.includes(activity.status)) return false;

      // Responsible party filter
      if (filters.responsibleParty !== 'all' && activity.responsible_party_id !== filters.responsibleParty) {
        return false;
      }

      // Critical path filter
      if (filters.showCriticalOnly && !activity.is_critical) return false;

      return true;
    });
  }, [activities, filters]);

  // Export to CSV
  const handleExport = () => {
    const headers = ['Activity', 'Phase', 'Start', 'End', 'Status', 'Progress', 'Responsible', 'Constraints'];
    const rows = filteredActivities.map((a) => {
      const responsible = users.find((u) => u.email === a.responsible_party_id);
      return [
      a.name,
      a.phase,
      format(parseISO(a.start_date), 'MM/dd/yyyy'),
      format(parseISO(a.end_date), 'MM/dd/yyyy'),
      a.status,
      `${a.progress_percent || 0}%`,
      responsible?.full_name || a.responsible_party_id || '',
      a.constraint_notes || ''];

    });

    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `look-ahead-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Exported look-ahead to CSV');
  };

  const selectedProject = projects.find((p) => p.id === activeProjectId);

  if (!activeProjectId) {
    return (
      <div>
        <PageHeader title="Schedule & Look-Ahead Planning" subtitle="Select a project to begin" showBackButton={false} />
        <div className="max-w-md mt-8">
          <Select value={activeProjectId || ''} onValueChange={setActiveProjectId}>
            <SelectTrigger className="bg-zinc-900 border-zinc-800">
              <SelectValue placeholder="Select Project..." />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-800">
              {projects.map((p) =>
              <SelectItem key={p.id} value={p.id}>
                  {p.project_number} - {p.name}
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
      </div>);

  }

  return (
    <div>
      <PageHeader
        title="Schedule & Look-Ahead Planning"
        subtitle={selectedProject?.name}
        showBackButton={false}
        actions={
        <div className="text-slate-50 flex items-center gap-2">
            <Select value={activeProjectId} onValueChange={setActiveProjectId}>
              <SelectTrigger className="w-64 bg-zinc-900 border-zinc-800">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800">
                {projects.map((p) =>
              <SelectItem key={p.id} value={p.id}>
                    {p.project_number} - {p.name}
                  </SelectItem>
              )}
              </SelectContent>
            </Select>
            <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="border-zinc-700">

              <Filter size={16} className="mr-2" />
              {showFilters ? 'Hide' : 'Show'} Filters
            </Button>
            <Button
            variant="outline"
            onClick={handleExport}
            disabled={filteredActivities.length === 0}
            className="border-zinc-700">

              <Download size={16} className="mr-2" />
              Export CSV
            </Button>
            <Button
            onClick={() => setShowActivityForm(true)}
            className="bg-amber-500 hover:bg-amber-600 text-black">

              <Plus size={16} className="mr-2" />
              Add Activity
            </Button>
          </div>
        } />


      <div className="flex gap-6">
        {/* Filters Sidebar */}
        {showFilters &&
        <div className="w-80 flex-shrink-0">
            <LookAheadFilters
            filters={filters}
            setFilters={setFilters}
            users={users} />

          </div>
        }

        {/* Main Content */}
        <div className="flex-1 space-y-6">
          {/* Timeline */}
          <LookAheadTimeline
            activities={filteredActivities}
            dateFrom={filters.dateFrom}
            dateTo={filters.dateTo}
            onActivityClick={setSelectedActivity} />


          {/* Activities Table */}
          <LookAheadTable
            activities={filteredActivities}
            resources={resources}
            users={users}
            drawingSets={drawingSets}
            rfis={rfis}
            onActivityClick={setSelectedActivity}
            onUpdateActivity={(id, data) => updateMutation.mutate({ id, data })} />

        </div>
      </div>

      {/* Add Activity Dialog */}
      <Dialog open={showActivityForm} onOpenChange={setShowActivityForm}>
        <DialogContent className="max-w-2xl bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle>Add Activity</DialogTitle>
          </DialogHeader>
          <ActivityForm
            projectId={activeProjectId}
            users={users}
            resources={resources}
            drawingSets={drawingSets}
            rfis={rfis}
            onSubmit={(data) => createMutation.mutate({ ...data, project_id: activeProjectId })}
            isLoading={createMutation.isPending} />

        </DialogContent>
      </Dialog>

      {/* Edit Activity Sheet */}
      <Sheet open={!!selectedActivity} onOpenChange={(open) => !open && setSelectedActivity(null)}>
        <SheetContent className="w-full sm:max-w-2xl bg-zinc-900 border-zinc-800 overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{selectedActivity?.name}</SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            <ActivityForm
              projectId={activeProjectId}
              activity={selectedActivity}
              users={users}
              resources={resources}
              drawingSets={drawingSets}
              rfis={rfis}
              onSubmit={(data) => updateMutation.mutate({ id: selectedActivity.id, data })}
              onDelete={() => {
                if (confirm('Delete this activity?')) {
                  deleteMutation.mutate(selectedActivity.id);
                }
              }}
              isLoading={updateMutation.isPending}
              isEdit />

          </div>
        </SheetContent>
      </Sheet>
    </div>);

}