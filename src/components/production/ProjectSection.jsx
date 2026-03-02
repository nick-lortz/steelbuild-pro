import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronDown, Plus, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import NoteComposer from './NoteComposer';
import { useWeeklyContext } from './WeeklyContext';
import { format, parseISO, isPast } from 'date-fns';

export default function ProjectSection({ project, notes = [], onCreateNote, onUpdateNote, onDeleteNote }) {
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
                      <NoteCard key={note.id} note={note} onUpdate={onUpdateNote} onDelete={onDeleteNote} />
                    ))}
                  </div>
                )}

                <div className="text-xs font-bold text-zinc-400 mb-2">This Week</div>
                {categorizedNotes.notes.length === 0 && (
                  <div className="text-sm text-zinc-500 italic p-4 text-center">No notes yet</div>
                )}
                {categorizedNotes.notes.map(note => (
                  <NoteCard key={note.id} note={note} onUpdate={onUpdateNote} onDelete={onDeleteNote} />
                ))}
              </TabsContent>

              <TabsContent value="actions" className="space-y-2 mt-3">
                {categorizedNotes.actions.length === 0 && (
                  <div className="text-sm text-zinc-500 italic p-4 text-center">No action items</div>
                )}
                {categorizedNotes.actions.map(action => (
                  <ActionItemCard key={action.id} action={action} onUpdate={onUpdateNote} onDelete={onDeleteNote} />
                ))}
              </TabsContent>

              <TabsContent value="decisions" className="space-y-2 mt-3">
                {categorizedNotes.decisions.length === 0 && (
                  <div className="text-sm text-zinc-500 italic p-4 text-center">No decisions logged</div>
                )}
                {categorizedNotes.decisions.map(decision => (
                  <DecisionCard key={decision.id} decision={decision} onUpdate={onUpdateNote} onDelete={onDeleteNote} />
                ))}
              </TabsContent>
            </Tabs>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

function NoteCard({ note, onUpdate, onDelete }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    title: note.title,
    body: note.body,
    category: note.category
  });

  const handleSave = () => {
    onUpdate(note.id, editData);
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (window.confirm('Delete this note?')) {
      onDelete(note.id);
    }
  };

  if (isEditing) {
    return (
      <div className="p-3 bg-zinc-800 rounded border border-orange-600 space-y-2">
        <Input
          placeholder="Title"
          value={editData.title || ''}
          onChange={(e) => setEditData({ ...editData, title: e.target.value })}
          className="bg-zinc-900 border-zinc-700 text-sm"
        />
        <Textarea
          placeholder="Details"
          value={editData.body}
          onChange={(e) => setEditData({ ...editData, body: e.target.value })}
          className="bg-zinc-900 border-zinc-700 text-sm h-16"
        />
        <Select value={editData.category} onValueChange={(val) => setEditData({ ...editData, category: val })}>
          <SelectTrigger className="bg-zinc-900 border-zinc-700 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="general">General</SelectItem>
            <SelectItem value="technical">Technical</SelectItem>
            <SelectItem value="safety">Safety</SelectItem>
            <SelectItem value="quality">Quality</SelectItem>
            <SelectItem value="schedule">Schedule</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)}>Cancel</Button>
          <Button size="sm" onClick={handleSave}>Save</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 bg-zinc-800 rounded text-sm group">
      <div className="flex items-start justify-between">
        <div className="flex-1">
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
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button size="sm" variant="ghost" onClick={() => setIsEditing(true)}>Edit</Button>
          <Button size="sm" variant="ghost" onClick={handleDelete} className="text-red-400 hover:text-red-300">Delete</Button>
        </div>
      </div>
    </div>
  );
}

function ActionItemCard({ action, onUpdate, onDelete }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    title: action.title,
    body: action.body,
    owner_email: action.owner_email,
    due_date: action.due_date,
    status: action.status
  });

  const isOverdue = action.due_date && isPast(parseISO(action.due_date)) && action.status !== 'done';
  const isDone = action.status === 'done';

  const toggleStatus = () => {
    onUpdate(action.id, { status: isDone ? 'open' : 'done' });
  };

  const handleSave = () => {
    onUpdate(action.id, editData);
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (window.confirm('Delete this action item?')) {
      onDelete(action.id);
    }
  };

  if (isEditing) {
    return (
      <div className="p-3 rounded border border-amber-600 bg-zinc-800 space-y-2">
        <Input
          placeholder="Title"
          value={editData.title || ''}
          onChange={(e) => setEditData({ ...editData, title: e.target.value })}
          className="bg-zinc-900 border-zinc-700 text-sm"
        />
        <Textarea
          placeholder="Details"
          value={editData.body}
          onChange={(e) => setEditData({ ...editData, body: e.target.value })}
          className="bg-zinc-900 border-zinc-700 text-sm h-16"
        />
        <div className="grid grid-cols-3 gap-2">
          <Input
            placeholder="Owner email"
            value={editData.owner_email || ''}
            onChange={(e) => setEditData({ ...editData, owner_email: e.target.value })}
            className="bg-zinc-900 border-zinc-700 text-xs"
          />
          <Input
            type="date"
            value={editData.due_date || ''}
            onChange={(e) => setEditData({ ...editData, due_date: e.target.value })}
            className="bg-zinc-900 border-zinc-700 text-xs"
          />
          <Select value={editData.status} onValueChange={(val) => setEditData({ ...editData, status: val })}>
            <SelectTrigger className="bg-zinc-900 border-zinc-700 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="blocked">Blocked</SelectItem>
              <SelectItem value="done">Done</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)}>Cancel</Button>
          <Button size="sm" onClick={handleSave}>Save</Button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "p-3 rounded border text-sm group",
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
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button size="sm" variant="ghost" onClick={() => setIsEditing(true)}>Edit</Button>
          <Button size="sm" variant="ghost" onClick={handleDelete} className="text-red-400 hover:text-red-300">Delete</Button>
        </div>
      </div>
    </div>
  );
}

function DecisionCard({ decision, onUpdate, onDelete }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    title: decision.title,
    body: decision.body
  });

  const handleSave = () => {
    onUpdate(decision.id, editData);
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (window.confirm('Delete this decision?')) {
      onDelete(decision.id);
    }
  };

  if (isEditing) {
    return (
      <div className="p-3 bg-blue-900/20 border border-blue-700 rounded space-y-2">
        <Input
          placeholder="Decision title"
          value={editData.title || ''}
          onChange={(e) => setEditData({ ...editData, title: e.target.value })}
          className="bg-zinc-900 border-zinc-700 text-sm"
        />
        <Textarea
          placeholder="Details"
          value={editData.body}
          onChange={(e) => setEditData({ ...editData, body: e.target.value })}
          className="bg-zinc-900 border-zinc-700 text-sm h-16"
        />
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)}>Cancel</Button>
          <Button size="sm" onClick={handleSave}>Save</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 bg-blue-900/20 border border-blue-700 rounded text-sm group">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="font-medium text-blue-200">{decision.title}</div>
          <div className="text-blue-100 mt-1">{decision.body}</div>
          <div className="text-xs text-blue-400 mt-2">
            {decision.created_by} • {decision.created_date ? format(parseISO(decision.created_date), 'MMM d, h:mm a') : ''}
          </div>
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button size="sm" variant="ghost" onClick={() => setIsEditing(true)}>Edit</Button>
          <Button size="sm" variant="ghost" onClick={handleDelete} className="text-red-400 hover:text-red-300">Delete</Button>
        </div>
      </div>
    </div>
  );
}