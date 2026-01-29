import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/ui/PageHeader';
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Filter, X, Clock, Users, Activity, AlertTriangle, Zap } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import CalendarGrid from '@/components/calendar/CalendarGrid';
import CalendarEventList from '@/components/calendar/CalendarEventList';
import { 
  startOfMonth, 
  endOfMonth, 
  addMonths, 
  subMonths, 
  format,
  startOfWeek,
  endOfWeek,
  addDays,
  isSameMonth,
  isToday,
  parseISO,
  isWithinInterval
} from 'date-fns';
import { toast } from '@/components/ui/notifications';

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState('month');
  const [showCriticalPathOnly, setShowCriticalPathOnly] = useState(false);
  const [projectFilter, setProjectFilter] = useState('all');
  const [resourceFilter, setResourceFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [eventTypeFilter, setEventTypeFilter] = useState('all');

  const queryClient = useQueryClient();

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('name'),
    staleTime: 5 * 60 * 1000
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list(),
    staleTime: 2 * 60 * 1000
  });

  const { data: resources = [] } = useQuery({
    queryKey: ['resources'],
    queryFn: () => base44.entities.Resource.list('name'),
    staleTime: 5 * 60 * 1000
  });

  const { data: allocations = [] } = useQuery({
    queryKey: ['resourceAllocations'],
    queryFn: () => base44.entities.ResourceAllocation.list(),
    staleTime: 2 * 60 * 1000
  });

  const { data: documents = [] } = useQuery({
    queryKey: ['documents'],
    queryFn: () => base44.entities.Document.list(),
    staleTime: 5 * 60 * 1000
  });

  const { data: meetings = [] } = useQuery({
    queryKey: ['meetings'],
    queryFn: () => base44.entities.Meeting.list(),
    staleTime: 5 * 60 * 1000
  });

  const { data: workPackages = [] } = useQuery({
    queryKey: ['work-packages'],
    queryFn: () => base44.entities.WorkPackage.list(),
    staleTime: 5 * 60 * 1000
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Task.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Task rescheduled');
    },
  });

  const updateAllocationMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ResourceAllocation.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resourceAllocations'] });
      toast.success('Allocation rescheduled');
    },
  });

  const updateWorkPackageMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.WorkPackage.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-packages'] });
      toast.success('Work package rescheduled');
    },
  });

  // Compile all calendar events
  const calendarEvents = useMemo(() => {
    const events = [];

    // Tasks
    (tasks || []).forEach(task => {
      if (task.start_date || task.end_date) {
        events.push({
          id: task.id,
          type: 'task',
          title: task.name,
          start_date: task.start_date,
          end_date: task.end_date,
          project_id: task.project_id,
          status: task.status,
          priority: task.priority,
          data: task,
        });
      }
    });

    // Projects (timeline)
    (projects || []).forEach(project => {
      if (project.start_date || project.target_completion) {
        events.push({
          id: project.id,
          type: 'project',
          title: project.name,
          start_date: project.start_date,
          end_date: project.target_completion,
          project_id: project.id,
          status: project.status,
          data: project,
        });
      }
    });

    // Resource allocations
    (allocations || []).forEach(allocation => {
      const resource = (resources || []).find(r => r.id === allocation.resource_id);
      if (resource && allocation.start_date && allocation.end_date) {
        events.push({
          id: allocation.id,
          type: 'allocation',
          title: `${resource.name} - ${(projects || []).find(p => p.id === allocation.project_id)?.name || 'Project'}`,
          start_date: allocation.start_date,
          end_date: allocation.end_date,
          project_id: allocation.project_id,
          resource_id: allocation.resource_id,
          allocation_percentage: allocation.allocation_percentage,
          data: allocation,
        });
      }
    });

    // Document reviews
    (documents || []).forEach(doc => {
      if (doc.review_due_date && doc.workflow_stage === 'pending_review') {
        events.push({
          id: doc.id,
          type: 'review',
          title: `Review: ${doc.title}`,
          start_date: doc.review_due_date,
          end_date: doc.review_due_date,
          project_id: doc.project_id,
          data: doc,
        });
      }
    });

    // Meetings
    (meetings || []).forEach(meeting => {
      if (meeting.meeting_date) {
        events.push({
          id: meeting.id,
          type: 'meeting',
          title: meeting.title,
          start_date: meeting.meeting_date.split('T')[0],
          end_date: meeting.meeting_date.split('T')[0],
          project_id: meeting.project_id,
          data: meeting,
        });
      }
    });

    // Work packages
    (workPackages || []).forEach(wp => {
      if (wp.start_date || wp.target_date) {
        events.push({
          id: wp.id,
          type: 'work_package',
          title: `WP: ${wp.name}`,
          start_date: wp.start_date,
          end_date: wp.target_date,
          project_id: wp.project_id,
          status: wp.status,
          phase: wp.phase,
          data: wp,
        });
      }
    });

    return events;
  }, [tasks, projects, allocations, resources, documents, meetings, workPackages]);

  // Apply filters
  const filteredEvents = useMemo(() => {
    return (calendarEvents || []).filter(event => {
      const matchesProject = projectFilter === 'all' || event.project_id === projectFilter;
      const matchesResource = resourceFilter === 'all' || event.resource_id === resourceFilter;
      const matchesStatus = statusFilter === 'all' || event.status === statusFilter;
      const matchesType = eventTypeFilter === 'all' || event.type === eventTypeFilter;

      return matchesProject && matchesResource && matchesStatus && matchesType;
    });
  }, [calendarEvents, projectFilter, resourceFilter, statusFilter, eventTypeFilter]);

  // Get events for current view
  const viewEvents = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    
    return (filteredEvents || []).filter(event => {
      if (!event.start_date && !event.end_date) return false;
      
      const eventStart = event.start_date ? parseISO(event.start_date) : null;
      const eventEnd = event.end_date ? parseISO(event.end_date) : eventStart;

      if (!eventStart) return false;

      // Check if event overlaps with current month
      return (
        isWithinInterval(eventStart, { start: monthStart, end: monthEnd }) ||
        isWithinInterval(eventEnd, { start: monthStart, end: monthEnd }) ||
        (eventStart < monthStart && eventEnd > monthEnd)
      );
    });
  }, [filteredEvents, currentDate]);

  const handleEventDrop = async (event, newStartDate, newEndDate) => {
    const daysDiff = Math.round((parseISO(newStartDate) - parseISO(event.start_date)) / (1000 * 60 * 60 * 24));

    try {
      if (event.type === 'task') {
        const originalEnd = event.end_date ? parseISO(event.end_date) : null;
        const calculatedEndDate = originalEnd 
          ? format(addDays(originalEnd, daysDiff), 'yyyy-MM-dd')
          : newStartDate;

        await updateTaskMutation.mutateAsync({
          id: event.id,
          data: {
            start_date: newStartDate,
            end_date: calculatedEndDate,
          }
        });
      } else if (event.type === 'allocation') {
        const originalEnd = event.end_date ? parseISO(event.end_date) : null;
        const calculatedEndDate = originalEnd 
          ? format(addDays(originalEnd, daysDiff), 'yyyy-MM-dd')
          : newStartDate;

        await updateAllocationMutation.mutateAsync({
          id: event.id,
          data: {
            start_date: newStartDate,
            end_date: calculatedEndDate,
          }
        });
      } else if (event.type === 'work_package') {
        const originalEnd = event.end_date ? parseISO(event.end_date) : null;
        const calculatedEndDate = originalEnd 
          ? format(addDays(originalEnd, daysDiff), 'yyyy-MM-dd')
          : newStartDate;

        await updateWorkPackageMutation.mutateAsync({
          id: event.id,
          data: {
            start_date: newStartDate,
            target_date: calculatedEndDate,
          }
        });
      }
    } catch (error) {
      toast.error('Failed to reschedule');
    }
  };

  const activeFilterCount = [projectFilter, resourceFilter, statusFilter, eventTypeFilter]
    .filter(f => f !== 'all').length;

  return (
    <div className="min-h-screen pb-8 bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950">
      {/* Modern Calendar Header */}
      <div className="relative mb-8 overflow-hidden rounded-2xl bg-gradient-to-r from-cyan-600/10 via-blue-600/10 to-indigo-600/10 border border-cyan-500/20 p-8">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjAzIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-40"></div>
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 via-blue-500 to-indigo-500 flex items-center justify-center shadow-2xl shadow-cyan-500/30">
              <CalendarIcon className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-white tracking-tight">Calendar</h1>
              <p className="text-zinc-400 font-medium mt-1">Unified project timeline & schedule</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentDate(new Date())}
            className="bg-white/5 border-white/10 text-white hover:bg-white/10 backdrop-blur-xl"
          >
            Today
          </Button>
        </div>
      </div>

      {/* Controls & Navigation */}
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentDate(subMonths(currentDate, 1))}
            className="border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800 text-white"
          >
            <ChevronLeft size={18} />
          </Button>
          <div className="px-6 py-2 rounded-xl bg-gradient-to-r from-cyan-500/10 to-indigo-500/10 border border-cyan-500/20">
            <h2 className="text-xl font-bold text-white min-w-[200px] text-center">
              {format(currentDate, 'MMMM yyyy')}
            </h2>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentDate(addMonths(currentDate, 1))}
            className="border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800 text-white"
          >
            <ChevronRight size={18} />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={showCriticalPathOnly ? "default" : "outline"}
            size="sm"
            onClick={() => setShowCriticalPathOnly(!showCriticalPathOnly)}
            className={showCriticalPathOnly ? "bg-gradient-to-r from-red-600 to-orange-600" : "border-zinc-800 text-white"}
          >
            <Zap size={14} className="mr-1" />
            Critical Path
          </Button>
          
          <Tabs value={view} onValueChange={setView}>
            <TabsList className="bg-zinc-900/50 border border-zinc-800">
              <TabsTrigger value="month" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-600 data-[state=active]:to-blue-600">Month</TabsTrigger>
              <TabsTrigger value="list" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-600 data-[state=active]:to-blue-600">List</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
          <SelectTrigger className="w-48 bg-zinc-900 border-zinc-800">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="task">Tasks</SelectItem>
            <SelectItem value="project">Projects</SelectItem>
            <SelectItem value="allocation">Resources</SelectItem>
            <SelectItem value="work_package">Work Packages</SelectItem>
            <SelectItem value="review">Reviews</SelectItem>
            <SelectItem value="meeting">Meetings</SelectItem>
          </SelectContent>
        </Select>

        <Select value={projectFilter} onValueChange={setProjectFilter}>
          <SelectTrigger className="w-48 bg-zinc-900 border-zinc-800">
            <SelectValue placeholder="All Projects" />
          </SelectTrigger>
          <SelectContent className="max-h-60">
            <SelectItem value="all">All Projects</SelectItem>
            {projects.map(p => (
              <SelectItem key={p.id} value={p.id}>
                {p.project_number} - {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={resourceFilter} onValueChange={setResourceFilter}>
          <SelectTrigger className="w-48 bg-zinc-900 border-zinc-800">
            <SelectValue placeholder="All Resources" />
          </SelectTrigger>
          <SelectContent className="max-h-60">
            <SelectItem value="all">All Resources</SelectItem>
            {resources.map(r => (
              <SelectItem key={r.id} value={r.id}>
                {r.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48 bg-zinc-900 border-zinc-800">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="on_hold">On Hold</SelectItem>
          </SelectContent>
        </Select>

        {activeFilterCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setProjectFilter('all');
              setResourceFilter('all');
              setStatusFilter('all');
              setEventTypeFilter('all');
            }}
            className="text-zinc-400 hover:text-white"
          >
            <X size={16} className="mr-2" />
            Clear Filters ({activeFilterCount})
          </Button>
        )}
      </div>

      {/* KPI Dashboard - Real-time Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {/* Critical Path Items */}
        <div className="bg-gradient-to-br from-red-500/10 to-red-600/5 border border-red-500/20 rounded-xl p-4 hover:shadow-lg hover:shadow-red-500/10 transition-all cursor-pointer hover:border-red-500/40" 
          onClick={() => {/* Filter to critical path */}}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4 text-red-400" />
              </div>
              <p className="text-xs text-zinc-400 font-medium">Critical Path</p>
            </div>
            <span className="text-[10px] text-red-400 bg-red-500/20 px-2 py-1 rounded">HIGH</span>
          </div>
          <p className="text-2xl font-bold text-red-400">
            {viewEvents.filter(e => e.is_critical).length}
          </p>
          <p className="text-[10px] text-zinc-500 mt-1">No float remaining</p>
        </div>

        {/* Overdue Items */}
        <div className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border border-orange-500/20 rounded-xl p-4 hover:shadow-lg hover:shadow-orange-500/10 transition-all cursor-pointer hover:border-orange-500/40">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center">
              <Clock className="w-4 h-4 text-orange-400" />
            </div>
            <p className="text-xs text-zinc-400 font-medium">Overdue</p>
          </div>
          <p className="text-2xl font-bold text-orange-400">
            {viewEvents.filter(e => new Date(e.end_date) < new Date() && e.status !== 'completed').length}
          </p>
          <p className="text-[10px] text-zinc-500 mt-1">Action required</p>
        </div>

        {/* Due This Week */}
        <div className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 border border-yellow-500/20 rounded-xl p-4 hover:shadow-lg hover:shadow-yellow-500/10 transition-all cursor-pointer hover:border-yellow-500/40">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-yellow-500/20 flex items-center justify-center">
              <CalendarIcon className="w-4 h-4 text-yellow-400" />
            </div>
            <p className="text-xs text-zinc-400 font-medium">Due This Week</p>
          </div>
          <p className="text-2xl font-bold text-yellow-400">
            {viewEvents.filter(e => {
              const d = new Date(e.end_date);
              const now = new Date();
              const week = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
              return d >= now && d <= week;
            }).length}
          </p>
          <p className="text-[10px] text-zinc-500 mt-1">Monitor closely</p>
        </div>

        {/* Resource Conflicts */}
        <div className="bg-gradient-to-br from-pink-500/10 to-pink-600/5 border border-pink-500/20 rounded-xl p-4 hover:shadow-lg hover:shadow-pink-500/10 transition-all cursor-pointer hover:border-pink-500/40">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-pink-500/20 flex items-center justify-center">
              <Users className="w-4 h-4 text-pink-400" />
            </div>
            <p className="text-xs text-zinc-400 font-medium">Conflicts</p>
          </div>
          <p className="text-2xl font-bold text-pink-400">
            {viewEvents.filter(e => e.has_resource_conflict).length}
          </p>
          <p className="text-[10px] text-zinc-500 mt-1">Resource overlap</p>
        </div>
      </div>

      {/* Calendar Content */}
      {view === 'month' ? (
        <CalendarGrid
          currentDate={currentDate}
          events={viewEvents}
          projects={projects}
          resources={resources}
          onEventDrop={handleEventDrop}
        />
      ) : (
        <CalendarEventList
          events={viewEvents}
          projects={projects}
          resources={resources}
          onEventDrop={handleEventDrop}
        />
      )}
    </div>
  );
}