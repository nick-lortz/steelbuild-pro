import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChevronDown, ChevronRight, Plus, Trash2, Check, X, Calendar, AlertCircle, List } from 'lucide-react';
import { format, startOfWeek, addWeeks } from 'date-fns';
import { toast } from '@/components/ui/notifications';
import { cn } from '@/lib/utils';
import PMCalendarView from '@/components/pm-control/PMCalendarView';

const CATEGORIES = [
  { value: 'schedule', label: 'Schedule Items', color: 'bg-blue-500/20 text-blue-400' },
  { value: 'fabrication', label: 'Fabrication Status', color: 'bg-orange-500/20 text-orange-400' },
  { value: 'equipment', label: 'Equipment', color: 'bg-purple-500/20 text-purple-400' },
  { value: 'manpower', label: 'Manpower', color: 'bg-green-500/20 text-green-400' },
  { value: 'notes', label: 'Project Notes', color: 'bg-zinc-500/20 text-zinc-400' },
  { value: 'risks', label: 'Risks / Issues', color: 'bg-red-500/20 text-red-400' },
  { value: 'action_items', label: 'Action Items', color: 'bg-amber-500/20 text-amber-400' }
];

export default function PMProjectControl() {
  const queryClient = useQueryClient();
  const [selectedPM, setSelectedPM] = useState('');
  const [currentWeek, setCurrentWeek] = useState(() => format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'));
  const [expandedProjects, setExpandedProjects] = useState(new Set());
  const [editingEntry, setEditingEntry] = useState(null);
  const [newEntry, setNewEntry] = useState({ project_id: '', category: '', description: '', priority: 'normal' });

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    staleTime: Infinity
  });

  const { data: allProjects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('name'),
    staleTime: 5 * 60 * 1000
  });

  // Get unique PMs
  const pmList = useMemo(() => {
    const pms = new Set();
    allProjects.forEach(p => {
      if (p.project_manager) pms.add(p.project_manager);
    });
    return Array.from(pms).sort();
  }, [allProjects]);

  // Auto-select current user as PM if they're a PM
  React.useEffect(() => {
    if (currentUser && !selectedPM && pmList.includes(currentUser.email)) {
      setSelectedPM(currentUser.email);
    }
  }, [currentUser, pmList, selectedPM]);

  const { data: entries = [] } = useQuery({
    queryKey: ['pm-control-entries', selectedPM, currentWeek],
    queryFn: () => base44.entities.PMControlEntry.filter({ pm_email: selectedPM, week_of: currentWeek }),
    enabled: !!selectedPM && !!currentWeek,
    staleTime: 30 * 1000
  });

  // Filter projects by selected PM
  const pmProjects = useMemo(() => {
    return allProjects.filter(p => p.project_manager === selectedPM);
  }, [allProjects, selectedPM]);

  const createEntryMutation = useMutation({
    mutationFn: (data) => base44.entities.PMControlEntry.create({
      ...data,
      pm_email: selectedPM,
      week_of: currentWeek,
      status: 'active'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pm-control-entries'] });
      toast.success('Entry added');
    }
  });

  const updateEntryMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PMControlEntry.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pm-control-entries'] });
      toast.success('Entry updated');
      setEditingEntry(null);
    }
  });

  const deleteEntryMutation = useMutation({
    mutationFn: (id) => base44.entities.PMControlEntry.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pm-control-entries'] });
      toast.success('Entry deleted');
    }
  });

  const carryForwardMutation = useMutation({
    mutationFn: async () => {
      const nextWeek = format(addWeeks(new Date(currentWeek), 1), 'yyyy-MM-dd');
      const activeEntries = entries.filter(e => e.status === 'active' && e.carry_forward);
      
      await Promise.all(activeEntries.map(entry =>
        base44.entities.PMControlEntry.create({
          project_id: entry.project_id,
          pm_email: entry.pm_email,
          week_of: nextWeek,
          category: entry.category,
          description: entry.description,
          priority: entry.priority,
          assigned_to: entry.assigned_to,
          due_date: entry.due_date,
          carry_forward: true,
          status: 'active'
        })
      ));
    },
    onSuccess: () => {
      toast.success('Items carried forward to next week');
    }
  });

  const toggleProject = (projectId) => {
    setExpandedProjects(prev => {
      const next = new Set(prev);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      return next;
    });
  };

  const handleAddEntry = async (projectId, category) => {
    if (!newEntry.description.trim()) return;
    
    await createEntryMutation.mutateAsync({
      project_id: projectId,
      category,
      description: newEntry.description,
      priority: newEntry.priority,
      assigned_to: newEntry.assigned_to,
      due_date: newEntry.due_date
    });
    
    setNewEntry({ project_id: '', category: '', description: '', priority: 'normal' });
  };

  const handleUpdateEntry = async (entry) => {
    await updateEntryMutation.mutateAsync({
      id: entry.id,
      data: {
        description: entry.description,
        priority: entry.priority,
        status: entry.status,
        assigned_to: entry.assigned_to,
        due_date: entry.due_date,
        carry_forward: entry.carry_forward
      }
    });
  };

  const getEntriesByProjectAndCategory = (projectId, category) => {
    return entries.filter(e => e.project_id === projectId && e.category === category && e.status !== 'archived');
  };

  if (!selectedPM) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Card className="p-8 max-w-md w-full">
          <h2 className="text-xl font-bold text-white mb-4">PM Project Control Dashboard</h2>
          <p className="text-zinc-400 text-sm mb-6">Select a Project Manager to view their projects</p>
          <Select value={selectedPM || 'none'} onValueChange={(val) => setSelectedPM(val === 'none' ? '' : val)}>
            <SelectTrigger>
              <SelectValue placeholder="Select PM..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Select PM...</SelectItem>
              {pmList.map(pm => (
                <SelectItem key={pm} value={pm}>{pm}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Card>
      </div>
    );
  }

  const activeCount = entries.filter(e => e.status === 'active').length;
  const completedCount = entries.filter(e => e.status === 'completed').length;

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <div className="border-b border-zinc-800 bg-black/95 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-[1800px] mx-auto px-8 py-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight">PM Project Control Dashboard</h1>
              <p className="text-sm text-zinc-500 mt-1">Live weekly management console</p>
            </div>
            <div className="flex items-center gap-3">
              <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                {activeCount} Active
              </Badge>
              <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                {completedCount} Completed
              </Badge>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-zinc-500 flex-shrink-0" />
              <span className="text-sm text-zinc-400 whitespace-nowrap">Week of:</span>
              <Input
                type="date"
                value={currentWeek}
                onChange={(e) => setCurrentWeek(e.target.value)}
                className="flex-1 lg:w-40 bg-zinc-900 border-zinc-700 h-11"
              />
            </div>

            <Select value={selectedPM} onValueChange={setSelectedPM}>
              <SelectTrigger className="w-full lg:w-64 bg-zinc-900 border-zinc-700 h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pmList.map(pm => (
                  <SelectItem key={pm} value={pm}>{pm}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              onClick={() => carryForwardMutation.mutate()}
              disabled={carryForwardMutation.isPending}
              className="h-11"
            >
              Carry Forward to Next Week
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[1800px] mx-auto px-8 py-6">
        <Tabs defaultValue="list" className="space-y-4">
          <TabsList>
            <TabsTrigger value="list">
              <List size={16} className="mr-2" />
              List View
            </TabsTrigger>
            <TabsTrigger value="calendar">
              <Calendar size={16} className="mr-2" />
              Calendar View
            </TabsTrigger>
          </TabsList>

          <TabsContent value="calendar">
            <PMCalendarView
              entries={entries}
              projects={pmProjects}
              selectedPM={selectedPM}
              onCreateEntry={(data) => createEntryMutation.mutate(data)}
              onUpdateEntry={(id, data) => updateEntryMutation.mutate({ id, data })}
              onDeleteEntry={(id) => deleteEntryMutation.mutate(id)}
            />
          </TabsContent>

          <TabsContent value="list" className="space-y-4">
            {pmProjects.length === 0 && (
              <Card className="p-12 text-center">
                <p className="text-zinc-500">No projects assigned to this PM</p>
              </Card>
            )}

        {pmProjects.map(project => {
          const isExpanded = expandedProjects.has(project.id);
          const projectEntryCount = entries.filter(e => e.project_id === project.id && e.status === 'active').length;

          return (
            <Card key={project.id} className="overflow-hidden">
              {/* Project Header */}
              <button
                onClick={() => toggleProject(project.id)}
                className="w-full p-4 flex items-center justify-between hover:bg-zinc-900/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                  <div className="text-left">
                    <h3 className="text-lg font-bold text-white">{project.name}</h3>
                    <p className="text-xs text-zinc-500 font-mono">{project.project_number}</p>
                  </div>
                  <Badge className="bg-zinc-800 text-zinc-400">{projectEntryCount} items</Badge>
                </div>
                <Badge className={cn(
                  project.status === 'in_progress' ? 'bg-blue-500/20 text-blue-400' :
                  project.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                  'bg-zinc-700/20 text-zinc-400'
                )}>
                  {project.status}
                </Badge>
              </button>

              {/* Project Categories */}
              {isExpanded && (
                <div className="border-t border-zinc-800 p-4 space-y-6">
                  {CATEGORIES.map(cat => {
                    const catEntries = getEntriesByProjectAndCategory(project.id, cat.value);
                    const showNewEntry = newEntry.project_id === project.id && newEntry.category === cat.value;

                    return (
                      <div key={cat.value}>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Badge className={cat.color}>{cat.label}</Badge>
                            <span className="text-xs text-zinc-600">{catEntries.length} items</span>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setNewEntry({ project_id: project.id, category: cat.value, description: '', priority: 'normal' })}
                          >
                            <Plus size={14} className="mr-1" />
                            Add
                          </Button>
                        </div>

                        <div className="space-y-2">
                          {/* New Entry Form */}
                          {showNewEntry && (
                            <Card className="p-3 bg-zinc-900/50 border-zinc-700">
                              <div className="space-y-2">
                                <Input
                                  placeholder="Description..."
                                  value={newEntry.description}
                                  onChange={(e) => setNewEntry({ ...newEntry, description: e.target.value })}
                                  className="bg-zinc-800 border-zinc-700"
                                  autoFocus
                                />
                                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                                  <Select
                                    value={newEntry.priority}
                                    onValueChange={(val) => setNewEntry({ ...newEntry, priority: val })}
                                  >
                                    <SelectTrigger className="w-full sm:w-32 bg-zinc-800 border-zinc-700 h-11">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="normal">Normal</SelectItem>
                                      <SelectItem value="urgent">Urgent</SelectItem>
                                      <SelectItem value="critical">Critical</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <Input
                                    type="text"
                                    placeholder="Assigned to..."
                                    value={newEntry.assigned_to || ''}
                                    onChange={(e) => setNewEntry({ ...newEntry, assigned_to: e.target.value })}
                                    className="flex-1 bg-zinc-800 border-zinc-700 h-11"
                                  />
                                  <Input
                                    type="date"
                                    value={newEntry.due_date || ''}
                                    onChange={(e) => setNewEntry({ ...newEntry, due_date: e.target.value })}
                                    className="w-full sm:w-40 bg-zinc-800 border-zinc-700 h-11"
                                  />
                                  <div className="flex gap-2">
                                    <Button size="sm" onClick={() => handleAddEntry(project.id, cat.value)} className="h-11 flex-1 sm:flex-none">
                                      <Check size={14} />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => setNewEntry({ project_id: '', category: '', description: '', priority: 'normal' })}
                                      className="h-11 flex-1 sm:flex-none"
                                    >
                                      <X size={14} />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </Card>
                          )}

                          {/* Entries List */}
                          {catEntries.map(entry => {
                            const isEditing = editingEntry?.id === entry.id;

                            return (
                              <Card key={entry.id} className={cn(
                                "p-3 transition-all",
                                entry.status === 'completed' && 'opacity-50',
                                entry.priority === 'critical' && 'border-red-500/50',
                                entry.priority === 'urgent' && 'border-amber-500/50'
                              )}>
                                {isEditing ? (
                                  <div className="space-y-2">
                                  <Input
                                    value={editingEntry.description}
                                    onChange={(e) => setEditingEntry({ ...editingEntry, description: e.target.value })}
                                    className="bg-zinc-800 border-zinc-700 h-11"
                                  />
                                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                                    <Select
                                      value={editingEntry.priority}
                                      onValueChange={(val) => setEditingEntry({ ...editingEntry, priority: val })}
                                    >
                                      <SelectTrigger className="w-full sm:w-32 bg-zinc-800 border-zinc-700 h-11">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="normal">Normal</SelectItem>
                                        <SelectItem value="urgent">Urgent</SelectItem>
                                        <SelectItem value="critical">Critical</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    <Input
                                      placeholder="Assigned to..."
                                      value={editingEntry.assigned_to || ''}
                                      onChange={(e) => setEditingEntry({ ...editingEntry, assigned_to: e.target.value })}
                                      className="flex-1 bg-zinc-800 border-zinc-700 h-11"
                                    />
                                    <div className="flex gap-2">
                                      <Button size="sm" onClick={() => handleUpdateEntry(editingEntry)} className="h-11 flex-1 sm:flex-none">
                                        <Check size={14} />
                                      </Button>
                                      <Button size="sm" variant="ghost" onClick={() => setEditingEntry(null)} className="h-11 flex-1 sm:flex-none">
                                        <X size={14} />
                                      </Button>
                                    </div>
                                  </div>
                                  </div>
                                ) : (
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-1">
                                        {entry.priority !== 'normal' && (
                                          <AlertCircle size={14} className={cn(
                                            entry.priority === 'critical' ? 'text-red-400' : 'text-amber-400'
                                          )} />
                                        )}
                                        <p className={cn(
                                          "text-sm text-white",
                                          entry.status === 'completed' && 'line-through text-zinc-500'
                                        )}>
                                          {entry.description}
                                        </p>
                                      </div>
                                      <div className="flex items-center gap-3 text-xs text-zinc-500">
                                        {entry.assigned_to && <span>→ {entry.assigned_to}</span>}
                                        {entry.due_date && <span>Due: {format(new Date(entry.due_date), 'MMM d')}</span>}
                                        <span>Updated {format(new Date(entry.updated_date), 'MMM d, h:mm a')}</span>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => updateEntryMutation.mutate({
                                          id: entry.id,
                                          data: { status: entry.status === 'completed' ? 'active' : 'completed', completed_date: new Date().toISOString().split('T')[0] }
                                        })}
                                      >
                                        {entry.status === 'completed' ? <X size={14} /> : <Check size={14} />}
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => setEditingEntry(entry)}
                                      >
                                        Edit
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => deleteEntryMutation.mutate(entry.id)}
                                      >
                                        <Trash2 size={14} />
                                      </Button>
                                    </div>
                                  </div>
                                )}
                              </Card>
                            );
                          })}

                          {catEntries.length === 0 && !showNewEntry && (
                            <div className="text-center py-6 text-xs text-zinc-600">
                              No items yet
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          );
        })}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}