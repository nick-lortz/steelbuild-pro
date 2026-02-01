import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Plus, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import NoteComposer from './NoteComposer';
import { useWeeklyContext } from './WeeklyContext';
import { format, parseISO, isPast } from 'date-fns';

export default function ProjectSection({ project, notes = [], onCreateNote, onUpdateNote }) {
  const [isOpen, setIsOpen] = useState(true);
  const [showComposer, setShowComposer] = useState(false);
  const [composerType, setComposerType] = useState('note');
  const { weekInfo } = useWeeklyContext();

  const categorizedNotes = useMemo(() => {
    const thisWeek = notes.filter(n => n.week_id === weekInfo.week_id);
    const carried = thisWeek.filter(n => n.carried_from_week_id);
    const fresh = thisWeek.filter(n => !n.carried_from_week_id);
    
    return {
      notes: fresh.filter(n => n.note_type === 'note'),
      actions: thisWeek.filter(n => n.note_type === 'action'),
      decisions: thisWeek.filter(n => n.note_type === 'decision'),
      carried
    };
  }, [notes, weekInfo.week_id]);

  const handleAddNote = (data) => {
    onCreateNote(data);
    setShowComposer(false);
  };

  const openActions = categorizedNotes.actions.filter(a => a.status === 'open' || a.status === 'in_progress');
  const overdueActions = openActions.filter(a => a.due_date && isPast(parseISO(a.due_date)));

  // Mock lifecycle & on-time status - replace with real data
  const lifecycleStage = project.phase || 'fabrication';
  const onTime = true; // TODO: fetch from delivery tracker

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} id={`project-${project.id}`}>
      <Card className="bg-zinc-900 border-zinc-800">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-zinc-800/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ChevronDown 
                  size={18} 
                  className={cn("transition-transform text-zinc-400", isOpen && "rotate-0", !isOpen && "-rotate-90")}
                />
                <div>
                  <div className="font-bold text-lg">{project.name}</div>
                  <div className="text-xs text-zinc-500">{project.project_number}</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs capitalize">{lifecycleStage}</Badge>
                <Badge className={onTime ? 'bg-green-700' : 'bg-red-700'}>
                  {onTime ? 'On Time' : 'Behind'}
                </Badge>
                {overdueActions.length > 0 && (
                  <Badge className="bg-red-700 text-xs">
                    <AlertTriangle size={12} className="mr-1" />
                    {overdueActions.length} Overdue
                  </Badge>
                )}
                {openActions.length > 0 && (
                  <Badge variant="outline" className="text-xs">
                    {openActions.length} Open
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            {/* Quick Add Buttons */}
            <div className="flex gap-2">
              <Button 
                size="sm" 
                onClick={() => { setComposerType('note'); setShowComposer(true); }}
                variant="outline"
              >
                <Plus size={14} className="mr-1" />
                Note
              </Button>
              <Button 
                size="sm" 
                onClick={() => { setComposerType('action'); setShowComposer(true); }}
                variant="outline"
              >
                <Plus size={14} className="mr-1" />
                Action Item
              </Button>
              <Button 
                size="sm" 
                onClick={() => { setComposerType('decision'); setShowComposer(true); }}
                variant="outline"
              >
                <Plus size={14} className="mr-1" />
                Decision
              </Button>
            </div>

            {showComposer && (
              <NoteComposer
                projectId={project.id}
                weekId={weekInfo.week_id}
                noteType={composerType}
                onSubmit={handleAddNote}
                onCancel={() => setShowComposer(false)}
              />
            )}

            {/* Tabs */}
            <Tabs defaultValue="notes" className="w-full">
              <TabsList className="grid w-full grid-cols-3 bg-zinc-800">
                <TabsTrigger value="notes">Notes</TabsTrigger>
                <TabsTrigger value="actions">
                  Action Items
                  {openActions.length > 0 && (
                    <Badge variant="outline" className="ml-2 text-xs">{openActions.length}</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="decisions">Decisions</TabsTrigger>
              </TabsList>

              <TabsContent value="notes" className="space-y-2 mt-3">
                {categorizedNotes.carried.length > 0 && (
                  <div className="mb-3">
                    <div className="text-xs font-bold text-amber-500 mb-2">Carried from Last Week</div>
                    {categorizedNotes.carried.map(note => (
                      <NoteCard key={note.id} note={note} onUpdate={onUpdateNote} />
                    ))}
                  </div>
                )}

                <div className="text-xs font-bold text-zinc-400 mb-2">This Week</div>
                {categorizedNotes.notes.length === 0 && (
                  <div className="text-sm text-zinc-500 italic p-4 text-center">No notes yet</div>
                )}
                {categorizedNotes.notes.map(note => (
                  <NoteCard key={note.id} note={note} onUpdate={onUpdateNote} />
                ))}
              </TabsContent>

              <TabsContent value="actions" className="space-y-2 mt-3">
                {categorizedNotes.actions.length === 0 && (
                  <div className="text-sm text-zinc-500 italic p-4 text-center">No action items</div>
                )}
                {categorizedNotes.actions.map(action => (
                  <ActionItemCard key={action.id} action={action} onUpdate={onUpdateNote} />
                ))}
              </TabsContent>

              <TabsContent value="decisions" className="space-y-2 mt-3">
                {categorizedNotes.decisions.length === 0 && (
                  <div className="text-sm text-zinc-500 italic p-4 text-center">No decisions logged</div>
                )}
                {categorizedNotes.decisions.map(decision => (
                  <DecisionCard key={decision.id} decision={decision} />
                ))}
              </TabsContent>
            </Tabs>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

function NoteCard({ note }) {
  return (
    <div className="p-3 bg-zinc-800 rounded text-sm">
      {note.title && <div className="font-medium mb-1">{note.title}</div>}
      <div className="text-zinc-300 whitespace-pre-wrap">{note.body}</div>
      <div className="flex items-center gap-2 mt-2 text-xs text-zinc-500">
        <Badge variant="outline" className="text-xs">{note.category}</Badge>
        {note.carried_from_week_id && (
          <Badge className="bg-amber-700 text-xs">Carried</Badge>
        )}
        <span>{note.created_by} • {note.created_date ? format(parseISO(note.created_date), 'MMM d') : ''}</span>
      </div>
    </div>
  );
}

function ActionItemCard({ action, onUpdate }) {
  const isOverdue = action.due_date && isPast(parseISO(action.due_date)) && action.status !== 'done';
  const isDone = action.status === 'done';

  const toggleStatus = () => {
    onUpdate(action.id, { status: isDone ? 'open' : 'done' });
  };

  return (
    <div className={cn(
      "p-3 rounded border text-sm",
      isOverdue && "border-red-700 bg-red-900/20",
      isDone && "bg-zinc-800/50 border-zinc-700",
      !isOverdue && !isDone && "bg-zinc-800 border-zinc-700"
    )}>
      <div className="flex items-start gap-3">
        <button 
          onClick={toggleStatus}
          className={cn(
            "mt-0.5 flex-shrink-0",
            isDone && "text-green-500",
            !isDone && "text-zinc-500"
          )}
        >
          {isDone ? <CheckCircle2 size={18} /> : <Clock size={18} />}
        </button>
        <div className="flex-1">
          <div className={cn("font-medium", isDone && "line-through text-zinc-500")}>
            {action.title || action.body}
          </div>
          {action.owner_email && (
            <div className="text-xs text-zinc-400 mt-1">Owner: {action.owner_email}</div>
          )}
          <div className="flex items-center gap-2 mt-2">
            {action.due_date && (
              <Badge variant="outline" className={cn("text-xs", isOverdue && "border-red-600 text-red-400")}>
                Due: {format(parseISO(action.due_date), 'MMM d')}
              </Badge>
            )}
            <Badge className="text-xs capitalize">{action.status}</Badge>
            {action.carried_from_week_id && (
              <Badge className="bg-amber-700 text-xs">Carried</Badge>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function DecisionCard({ decision }) {
  return (
    <div className="p-3 bg-blue-900/20 border border-blue-700 rounded text-sm">
      <div className="font-medium text-blue-200">{decision.title}</div>
      <div className="text-blue-100 mt-1">{decision.body}</div>
      <div className="text-xs text-blue-400 mt-2">
        {decision.created_by} • {decision.created_date ? format(parseISO(decision.created_date), 'MMM d, h:mm a') : ''}
      </div>
    </div>
  );
}