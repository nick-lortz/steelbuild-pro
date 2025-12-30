import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronLeft, ChevronRight, Calendar, AlertCircle, CheckCircle2, Sparkles } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import ProjectAssistant from '@/components/ai/ProjectAssistant';
import { format, startOfWeek, addWeeks, subWeeks, isSameWeek } from 'date-fns';

export default function ProductionMeetings() {
  const [currentWeek, setCurrentWeek] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [editingNotes, setEditingNotes] = useState({});
  const [showAI, setShowAI] = useState(false);
  const [pmFilter, setPmFilter] = useState('all');
  
  const queryClient = useQueryClient();
  const weekKey = format(currentWeek, 'yyyy-MM-dd');

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('name'),
    staleTime: 10 * 60 * 1000,
  });

  const activeProjects = useMemo(() => {
    let filtered = projects.filter(p => p.status === 'in_progress' || p.status === 'awarded');
    if (pmFilter !== 'all') {
      filtered = filtered.filter(p => p.project_manager === pmFilter);
    }
    return filtered;
  }, [projects, pmFilter]);

  const uniquePMs = useMemo(() => 
    [...new Set(projects.map(p => p.project_manager).filter(Boolean))].sort(),
    [projects]
  );

  const { data: productionNotes = [] } = useQuery({
    queryKey: ['productionNotes'],
    queryFn: () => base44.entities.ProductionNote.list('-week_starting'),
    staleTime: 5 * 60 * 1000,
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list('start_date'),
  });

  const { data: fabrications = [] } = useQuery({
    queryKey: ['fabrications'],
    queryFn: () => base44.entities.Fabrication.list('-created_date'),
  });

  const { data: deliveries = [] } = useQuery({
    queryKey: ['deliveries'],
    queryFn: () => base44.entities.Delivery.list('scheduled_date'),
  });

  const { data: drawings = [] } = useQuery({
    queryKey: ['drawings'],
    queryFn: () => base44.entities.DrawingSet.list('set_name'),
  });

  const { data: rfis = [] } = useQuery({
    queryKey: ['rfis'],
    queryFn: () => base44.entities.RFI.list('-submitted_date'),
  });

  const { data: changeOrders = [] } = useQuery({
    queryKey: ['changeOrders'],
    queryFn: () => base44.entities.ChangeOrder.list('-submitted_date'),
  });

  const { data: financials = [] } = useQuery({
    queryKey: ['financials'],
    queryFn: () => base44.entities.Financial.list(),
  });

  const createOrUpdateMutation = useMutation({
    mutationFn: async ({ projectId, data }) => {
      const existing = productionNotes.find(
        n => n.project_id === projectId && isSameWeek(new Date(n.week_starting), currentWeek)
      );
      
      if (existing) {
        return base44.entities.ProductionNote.update(existing.id, data);
      } else {
        return base44.entities.ProductionNote.create({
          ...data,
          project_id: projectId,
          week_starting: weekKey,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productionNotes'] });
    },
  });

  const getNotesForProject = (projectId) => {
    const currentNote = productionNotes.find(
      n => n.project_id === projectId && isSameWeek(new Date(n.week_starting), currentWeek)
    );
    
    if (currentNote) return currentNote;
    
    // Get most recent note from previous weeks to carry forward
    const previousNotes = productionNotes
      .filter(n => n.project_id === projectId && new Date(n.week_starting) < currentWeek)
      .sort((a, b) => new Date(b.week_starting) - new Date(a.week_starting));
    
    return previousNotes[0] || null;
  };

  const handleSave = (projectId) => {
    const edits = editingNotes[projectId];
    if (!edits) return;

    createOrUpdateMutation.mutate({
      projectId,
      data: {
        notes: edits.notes || '',
        status_summary: edits.status_summary || '',
        concerns: edits.concerns || '',
        action_items: edits.action_items || [],
      },
    });
  };

  const handleEdit = (projectId, field, value) => {
    setEditingNotes(prev => ({
      ...prev,
      [projectId]: {
        ...prev[projectId],
        [field]: value,
      },
    }));
  };

  const toggleActionItem = (projectId, index) => {
    const currentNote = getNotesForProject(projectId);
    const actions = currentNote?.action_items || [];
    const updated = [...actions];
    updated[index] = {
      ...updated[index],
      status: updated[index].status === 'completed' ? 'pending' : 'completed',
    };
    
    handleEdit(projectId, 'action_items', updated);
    handleSave(projectId);
  };

  const goToPreviousWeek = () => setCurrentWeek(subWeeks(currentWeek, 1));
  const goToNextWeek = () => setCurrentWeek(addWeeks(currentWeek, 1));
  const goToCurrentWeek = () => setCurrentWeek(startOfWeek(new Date(), { weekStartsOn: 1 }));

  return (
    <div>
      <PageHeader
        title="Production Meeting Notes"
        subtitle="Weekly project notes that carry forward"
        actions={
          <Button
            onClick={() => setShowAI(!showAI)}
            variant={showAI ? "default" : "outline"}
            className={showAI ? "bg-amber-500 hover:bg-amber-600 text-black" : "border-zinc-700"}
          >
            <Sparkles size={18} className="mr-2" />
            {showAI ? 'Hide' : 'Show'} AI Assistant
          </Button>
        }
      />

      {/* AI Assistant */}
      {showAI && (
        <Card className="bg-zinc-900 border-zinc-800 mb-6">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Sparkles size={18} className="text-amber-500" />
              Production AI Assistant
            </CardTitle>
            <p className="text-sm text-zinc-400">
              Get insights on fabrication status, delivery schedules, task progress, and production metrics
            </p>
          </CardHeader>
          <CardContent>
            <ProjectAssistant
              projects={projects}
              drawings={drawings}
              rfis={rfis}
              changeOrders={changeOrders}
              tasks={tasks}
              financials={financials}
              fabrications={fabrications}
              deliveries={deliveries}
              selectedProject={null}
            />
          </CardContent>
        </Card>
      )}

      {/* PM Filter */}
      <div className="mb-6">
        <Select value={pmFilter} onValueChange={setPmFilter}>
          <SelectTrigger className="w-full sm:w-64 bg-zinc-900 border-zinc-800 text-white">
            <SelectValue placeholder="Filter by PM" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All PMs</SelectItem>
            {uniquePMs.map(pm => (
              <SelectItem key={pm} value={pm}>{pm}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Week Navigation */}
      <div className="mb-6 flex items-center justify-between bg-zinc-900 border border-zinc-800 rounded-lg p-4">
        <Button
          variant="outline"
          size="sm"
          onClick={goToPreviousWeek}
          className="border-zinc-700"
        >
          <ChevronLeft size={16} className="mr-1" />
          Previous Week
        </Button>
        
        <div className="flex items-center gap-3">
          <Calendar size={18} className="text-amber-500" />
          <div className="text-center">
            <p className="text-sm font-medium text-white">
              Week of {format(currentWeek, 'MMM d, yyyy')}
            </p>
            <p className="text-xs text-zinc-500">
              {format(currentWeek, 'MMM d')} - {format(addWeeks(currentWeek, 1), 'MMM d')}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={goToCurrentWeek}
            className="border-zinc-700 text-xs"
          >
            Today
          </Button>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={goToNextWeek}
          className="border-zinc-700"
        >
          Next Week
          <ChevronRight size={16} className="ml-1" />
        </Button>
      </div>

      {/* Project Notes */}
      <div className="space-y-4">
        {activeProjects.map(project => {
          const existingNote = getNotesForProject(project.id);
          const edits = editingNotes[project.id] || {};
          const notes = edits.notes !== undefined ? edits.notes : (existingNote?.notes || '');
          const statusSummary = edits.status_summary !== undefined ? edits.status_summary : (existingNote?.status_summary || '');
          const concerns = edits.concerns !== undefined ? edits.concerns : (existingNote?.concerns || '');
          const actionItems = edits.action_items !== undefined ? edits.action_items : (existingNote?.action_items || []);
          
          const isFromPreviousWeek = existingNote && !isSameWeek(new Date(existingNote.week_starting), currentWeek);
          const pendingActions = actionItems.filter(a => a.status !== 'completed').length;

          return (
            <Card key={project.id} className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-white flex items-center gap-2">
                      {project.project_number} - {project.name}
                    </CardTitle>
                    <p className="text-sm text-zinc-400 mt-1">
                      {project.client} • {project.project_manager}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {isFromPreviousWeek && (
                      <Badge variant="outline" className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                        Carried Forward
                      </Badge>
                    )}
                    {pendingActions > 0 && (
                      <Badge variant="outline" className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                        {pendingActions} Action{pendingActions !== 1 ? 's' : ''}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Status Summary */}
                <div className="space-y-2">
                  <Label className="text-xs text-zinc-400">Status Summary</Label>
                  <Textarea
                    value={statusSummary}
                    onChange={(e) => handleEdit(project.id, 'status_summary', e.target.value)}
                    placeholder="Overall project status this week..."
                    rows={3}
                    className="bg-zinc-800 border-zinc-700 text-white resize-y min-h-[80px]"
                  />
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <Label className="text-xs text-zinc-400">Production Notes</Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => handleEdit(project.id, 'notes', e.target.value)}
                    placeholder="Progress updates, milestones, discussions..."
                    rows={8}
                    className="bg-zinc-800 border-zinc-700 text-white resize-y min-h-[150px]"
                  />
                </div>

                {/* Concerns */}
                <div className="space-y-2">
                  <Label className="text-xs text-zinc-400 flex items-center gap-1">
                    <AlertCircle size={14} />
                    Concerns / Issues
                  </Label>
                  <Textarea
                    value={concerns}
                    onChange={(e) => handleEdit(project.id, 'concerns', e.target.value)}
                    placeholder="Any issues, blockers, or concerns..."
                    rows={3}
                    className="bg-zinc-800 border-zinc-700 text-white resize-y min-h-[80px]"
                  />
                </div>

                {/* Action Items */}
                {actionItems.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-xs text-zinc-400">Action Items</Label>
                    <div className="space-y-2">
                      {actionItems.map((action, idx) => (
                        <div 
                          key={idx}
                          className="flex items-start gap-2 p-2 bg-zinc-800/50 rounded border border-zinc-700"
                        >
                          <Checkbox
                            checked={action.status === 'completed'}
                            onCheckedChange={() => toggleActionItem(project.id, idx)}
                            className="mt-0.5"
                          />
                          <div className="flex-1">
                            <p className={`text-sm ${action.status === 'completed' ? 'line-through text-zinc-500' : 'text-white'}`}>
                              {action.item}
                            </p>
                            {action.assignee && (
                              <p className="text-xs text-zinc-500 mt-0.5">{action.assignee}</p>
                            )}
                          </div>
                          {action.status === 'completed' && (
                            <CheckCircle2 size={16} className="text-green-500 flex-shrink-0 mt-0.5" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Save Button */}
                <div className="flex justify-end pt-2 border-t border-zinc-800">
                  <Button
                    size="sm"
                    onClick={() => handleSave(project.id)}
                    disabled={createOrUpdateMutation.isPending}
                    className="bg-amber-500 hover:bg-amber-600 text-black"
                  >
                    {createOrUpdateMutation.isPending ? 'Saving...' : 'Save Notes'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {activeProjects.length === 0 && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="py-12 text-center">
            <p className="text-zinc-500">No active projects found</p>
            <p className="text-xs text-zinc-600 mt-1">Projects with status "In Progress" or "Awarded" will appear here</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}