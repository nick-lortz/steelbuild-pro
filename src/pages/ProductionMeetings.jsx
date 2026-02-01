import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import PageHeader from '@/components/ui/PageHeader';
import { WeeklyContextProvider, useWeeklyContext } from '@/components/production/WeeklyContext';
import ProjectSection from '@/components/production/ProjectSection';
import WeeklySummaryPanel from '@/components/production/WeeklySummaryPanel';
import { Search, ChevronLeft, ChevronRight, Clock, AlertTriangle, ArrowUp, Filter, X } from 'lucide-react';
import { toast } from 'sonner';
import { isPast, parseISO } from 'date-fns';

function ProductionNotesContent() {
  const queryClient = useQueryClient();
  const { weekInfo, goToLastWeek, goToThisWeek, goToNextWeek } = useWeeklyContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [pmFilter, setPmFilter] = useState('all');
  const [noteTypeFilter, setNoteTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [ownerFilter, setOwnerFilter] = useState('all');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [meetingMode, setMeetingMode] = useState(false);

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.filter({ status: 'in_progress' })
  });

  const { data: notes = [] } = useQuery({
    queryKey: ['production-notes', weekInfo.week_id],
    queryFn: () => base44.entities.ProductionNote.filter({ week_id: weekInfo.week_id })
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ProductionNote.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production-notes'] });
      toast.success('Added');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ProductionNote.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production-notes'] });
      toast.success('Updated');
    }
  });

  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      const matchesSearch = !searchTerm || 
        p.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        p.project_number?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesPM = pmFilter === 'all' || p.project_manager === pmFilter;
      return matchesSearch && matchesPM;
    });
  }, [projects, searchTerm, pmFilter]);

  const uniquePMs = useMemo(() => {
    const pms = [...new Set(projects.map(p => p.project_manager).filter(Boolean))];
    return pms.sort();
  }, [projects]);

  const uniqueOwners = useMemo(() => {
    const owners = [...new Set(notes.map(n => n.owner_email).filter(Boolean))];
    return owners.sort();
  }, [notes]);

  const uniqueCategories = useMemo(() => {
    const cats = [...new Set(notes.map(n => n.category).filter(Boolean))];
    return cats.sort();
  }, [notes]);

  const filteredNotes = useMemo(() => {
    return notes.filter(note => {
      if (noteTypeFilter !== 'all' && note.note_type !== noteTypeFilter) return false;
      if (statusFilter !== 'all' && note.status !== statusFilter) return false;
      if (categoryFilter !== 'all' && note.category !== categoryFilter) return false;
      if (ownerFilter !== 'all' && note.owner_email !== ownerFilter) return false;
      return true;
    });
  }, [notes, noteTypeFilter, statusFilter, categoryFilter, ownerFilter]);

  const projectsWithFilteredNotes = useMemo(() => {
    return filteredProjects.filter(p => {
      const projectNotes = filteredNotes.filter(n => n.project_id === p.id);
      return projectNotes.length > 0;
    });
  }, [filteredProjects, filteredNotes]);

  const hasActiveFilters = noteTypeFilter !== 'all' || statusFilter !== 'all' || 
                          categoryFilter !== 'all' || ownerFilter !== 'all';

  const clearAllFilters = () => {
    setNoteTypeFilter('all');
    setStatusFilter('all');
    setCategoryFilter('all');
    setOwnerFilter('all');
  };

  const allActions = useMemo(() => {
    return notes.filter(n => n.note_type === 'action' && (n.status === 'open' || n.status === 'in_progress'));
  }, [notes]);

  const overdueActions = useMemo(() => {
    return allActions.filter(a => a.due_date && isPast(parseISO(a.due_date)));
  }, [allActions]);

  const scrollToProject = (projectId) => {
    document.getElementById(`project-${projectId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border">
        <div className="p-4 lg:p-6">
          <PageHeader 
            title="Production Notes"
            subtitle="Weekly Hub"
            actions={
              <Button 
                onClick={() => setMeetingMode(!meetingMode)}
                className={meetingMode ? 'bg-red-700' : 'bg-amber-500 text-black'}
              >
                {meetingMode ? 'End Meeting' : 'Meeting Mode'}
              </Button>
            }
          />

          {/* Weekly Nav */}
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={goToLastWeek}>
                <ChevronLeft size={14} />
              </Button>
              <Button size="sm" variant="outline" onClick={goToThisWeek}>
                This Week
              </Button>
              <Button size="sm" variant="outline" onClick={goToNextWeek}>
                <ChevronRight size={14} />
              </Button>
              <div className="ml-4 text-sm font-medium">{weekInfo.display}</div>
            </div>

            <div className="flex items-center gap-4">
              {allActions.length > 0 && (
                <Badge variant="outline" className="text-xs">
                  <Clock size={12} className="mr-1" />
                  {allActions.length} Open
                </Badge>
              )}
              {overdueActions.length > 0 && (
                <Badge className="bg-red-700 text-xs">
                  <AlertTriangle size={12} className="mr-1" />
                  {overdueActions.length} Overdue
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex">
        {/* Left Rail - Project Index */}
        <div className="hidden lg:block w-64 border-r border-border p-4 sticky top-[180px] h-[calc(100vh-180px)] overflow-y-auto">
          <div className="space-y-3">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <Input
                placeholder="Search projects..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 bg-zinc-900 border-zinc-800 h-8 text-xs"
              />
            </div>

            <Select value={pmFilter} onValueChange={setPmFilter}>
              <SelectTrigger className="bg-zinc-900 border-zinc-800 h-8 text-xs">
                <SelectValue placeholder="Filter by PM" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All PMs</SelectItem>
                {uniquePMs.map(pm => (
                  <SelectItem key={pm} value={pm}>{pm}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Advanced Filters */}
            <Collapsible open={showAdvancedFilters} onOpenChange={setShowAdvancedFilters}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" size="sm" className="w-full text-xs">
                  <Filter size={12} className="mr-2" />
                  Advanced Filters
                  {hasActiveFilters && <Badge className="ml-2 h-4 px-1 text-xs">ON</Badge>}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-2 mt-2">
                <Select value={noteTypeFilter} onValueChange={setNoteTypeFilter}>
                  <SelectTrigger className="bg-zinc-900 border-zinc-800 h-8 text-xs">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="note">Notes</SelectItem>
                    <SelectItem value="action">Actions</SelectItem>
                    <SelectItem value="decision">Decisions</SelectItem>
                    <SelectItem value="risk">Risks</SelectItem>
                    <SelectItem value="blocker">Blockers</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="bg-zinc-900 border-zinc-800 h-8 text-xs">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="done">Done</SelectItem>
                    <SelectItem value="blocked">Blocked</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="bg-zinc-900 border-zinc-800 h-8 text-xs">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {uniqueCategories.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={ownerFilter} onValueChange={setOwnerFilter}>
                  <SelectTrigger className="bg-zinc-900 border-zinc-800 h-8 text-xs">
                    <SelectValue placeholder="Owner" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Owners</SelectItem>
                    {uniqueOwners.map(owner => (
                      <SelectItem key={owner} value={owner}>{owner}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {hasActiveFilters && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={clearAllFilters}
                    className="w-full text-xs"
                  >
                    <X size={12} className="mr-2" />
                    Clear Filters
                  </Button>
                )}
              </CollapsibleContent>
            </Collapsible>

            <div className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
              {projectsWithFilteredNotes.length} Projects
              {hasActiveFilters && ' (filtered)'}
            </div>

            {projectsWithFilteredNotes.map(p => {
              const projectNotes = filteredNotes.filter(n => n.project_id === p.id);
              const openActions = projectNotes.filter(n => 
                n.note_type === 'action' && (n.status === 'open' || n.status === 'in_progress')
              );
              const overdue = openActions.filter(a => a.due_date && isPast(parseISO(a.due_date)));

              return (
                <button
                  key={p.id}
                  onClick={() => scrollToProject(p.id)}
                  className="w-full text-left p-2 rounded hover:bg-zinc-800 transition-colors text-sm"
                >
                  <div className="font-medium">{p.name}</div>
                  <div className="text-xs text-zinc-500">{p.project_number}</div>
                  {(openActions.length > 0 || overdue.length > 0) && (
                    <div className="flex gap-1 mt-1">
                      {overdue.length > 0 && (
                        <Badge className="bg-red-700 text-xs">{overdue.length} Overdue</Badge>
                      )}
                      {openActions.length > 0 && (
                        <Badge variant="outline" className="text-xs">{openActions.length} Open</Badge>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 p-4 lg:p-6 space-y-4">
          {/* AI Summary Panel */}
          <WeeklySummaryPanel 
            weekId={weekInfo.week_id} 
            projectIds={filteredProjects.map(p => p.id)}
          />

          {projectsWithFilteredNotes.length === 0 && (
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-12 text-center text-zinc-500">
                {hasActiveFilters ? 'No projects match the current filters' : 'No projects found'}
              </CardContent>
            </Card>
          )}

          {projectsWithFilteredNotes.map(project => {
            const projectNotes = filteredNotes.filter(n => n.project_id === project.id);
            return (
              <ProjectSection
                key={project.id}
                project={project}
                notes={projectNotes}
                onCreateNote={(data) => createMutation.mutate(data)}
                onUpdateNote={(id, data) => updateMutation.mutate({ id, data })}
              />
            );
          })}

          {/* Back to Top */}
          <Button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="fixed bottom-6 right-6 rounded-full w-12 h-12 p-0"
            size="icon"
          >
            <ArrowUp size={20} />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function ProductionNotesPage() {
  return (
    <WeeklyContextProvider>
      <ProductionNotesContent />
    </WeeklyContextProvider>
  );
}