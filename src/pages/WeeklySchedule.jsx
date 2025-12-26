import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Calendar, Clock, Plus, FileText, AlertCircle, CheckCircle2, Users } from 'lucide-react';
import { format, parseISO, isAfter, isBefore, addMinutes } from 'date-fns';
import PageHeader from '@/components/ui/PageHeader';
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function WeeklySchedule() {
  const [showEventDialog, setShowEventDialog] = useState(false);
  const [showNoteDialog, setShowNoteDialog] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [eventForm, setEventForm] = useState({
    summary: '',
    description: '',
    start: '',
    end: '',
    attendees: '',
  });
  const [noteForm, setNoteForm] = useState({
    pre_meeting_notes: '',
    follow_up_notes: '',
    action_items: [],
  });

  const queryClient = useQueryClient();

  const { data: calendarEvents = [], isLoading } = useQuery({
    queryKey: ['calendarEvents'],
    queryFn: async () => {
      const response = await base44.functions.invoke('calendarSync', {
        action: 'fetchWeekEvents',
      });
      return response.data.events || [];
    },
    refetchInterval: 60000, // Refresh every minute
  });

  const { data: notes = [] } = useQuery({
    queryKey: ['calendarNotes'],
    queryFn: () => base44.entities.CalendarNote.list('-event_date'),
  });

  const createEventMutation = useMutation({
    mutationFn: async (eventData) => {
      const response = await base44.functions.invoke('calendarSync', {
        action: 'createEvent',
        eventData: {
          summary: eventData.summary,
          description: eventData.description,
          start: { dateTime: eventData.start },
          end: { dateTime: eventData.end },
          attendees: eventData.attendees
            ? eventData.attendees.split(',').map(email => ({ email: email.trim() }))
            : [],
        },
      });

      if (response.data.error) {
        throw new Error(response.data.error);
      }

      return response.data.event;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendarEvents'] });
      setShowEventDialog(false);
      resetEventForm();
    },
  });

  const createNoteMutation = useMutation({
    mutationFn: (noteData) => base44.entities.CalendarNote.create(noteData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendarNotes'] });
      setShowNoteDialog(false);
      setSelectedEvent(null);
      resetNoteForm();
    },
  });

  const updateNoteMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CalendarNote.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendarNotes'] });
      setShowNoteDialog(false);
      setSelectedEvent(null);
      resetNoteForm();
    },
  });

  const resetEventForm = () => {
    setEventForm({
      summary: '',
      description: '',
      start: '',
      end: '',
      attendees: '',
    });
  };

  const resetNoteForm = () => {
    setNoteForm({
      pre_meeting_notes: '',
      follow_up_notes: '',
      action_items: [],
    });
  };

  const handleCreateEvent = (e) => {
    e.preventDefault();
    createEventMutation.mutate(eventForm);
  };

  const handleSaveNote = (e) => {
    e.preventDefault();

    const existingNote = notes.find(n => n.event_id === selectedEvent.id);

    const noteData = {
      event_id: selectedEvent.id,
      event_title: selectedEvent.summary,
      event_date: selectedEvent.start.dateTime || selectedEvent.start.date,
      pre_meeting_notes: noteForm.pre_meeting_notes,
      follow_up_notes: noteForm.follow_up_notes,
      action_items: noteForm.action_items,
      attendees: selectedEvent.attendees?.map(a => a.email) || [],
    };

    if (existingNote) {
      updateNoteMutation.mutate({ id: existingNote.id, data: noteData });
    } else {
      createNoteMutation.mutate(noteData);
    }
  };

  const openNoteDialog = (event) => {
    setSelectedEvent(event);
    const existingNote = notes.find(n => n.event_id === event.id);
    
    if (existingNote) {
      setNoteForm({
        pre_meeting_notes: existingNote.pre_meeting_notes || '',
        follow_up_notes: existingNote.follow_up_notes || '',
        action_items: existingNote.action_items || [],
      });
    } else {
      resetNoteForm();
    }
    
    setShowNoteDialog(true);
  };

  const addActionItem = () => {
    setNoteForm({
      ...noteForm,
      action_items: [
        ...noteForm.action_items,
        { item: '', assignee: '', completed: false },
      ],
    });
  };

  const updateActionItem = (index, field, value) => {
    const updated = [...noteForm.action_items];
    updated[index][field] = value;
    setNoteForm({ ...noteForm, action_items: updated });
  };

  const removeActionItem = (index) => {
    const updated = noteForm.action_items.filter((_, i) => i !== index);
    setNoteForm({ ...noteForm, action_items: updated });
  };

  // Group events by day
  const eventsByDay = calendarEvents.reduce((acc, event) => {
    const startDate = event.start.dateTime || event.start.date;
    const day = format(parseISO(startDate), 'yyyy-MM-dd');
    
    if (!acc[day]) {
      acc[day] = [];
    }
    acc[day].push(event);
    return acc;
  }, {});

  // Sort days
  const sortedDays = Object.keys(eventsByDay).sort();

  const getEventStatus = (event) => {
    const now = new Date();
    const startTime = parseISO(event.start.dateTime || event.start.date);
    const endTime = parseISO(event.end.dateTime || event.end.date);
    const reminderTime = addMinutes(startTime, -15);

    if (isAfter(now, endTime)) {
      return { status: 'past', label: 'Completed', color: 'bg-zinc-700 text-zinc-400' };
    }
    if (isAfter(now, startTime)) {
      return { status: 'ongoing', label: 'In Progress', color: 'bg-green-500/20 text-green-400 border-green-500/30' };
    }
    if (isAfter(now, reminderTime)) {
      return { status: 'upcoming', label: 'Starting Soon', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' };
    }
    return { status: 'scheduled', label: 'Scheduled', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' };
  };

  return (
    <div>
      <PageHeader
        title="Weekly Schedule"
        subtitle="Google Calendar sync with meeting notes and reminders"
        actions={
          <Button
            onClick={() => setShowEventDialog(true)}
            className="bg-amber-500 hover:bg-amber-600 text-black"
          >
            <Plus size={18} className="mr-2" />
            Add Event
          </Button>
        }
      />

      {isLoading ? (
        <div className="text-center py-12 text-zinc-400">Loading calendar events...</div>
      ) : sortedDays.length === 0 ? (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-12 text-center">
            <Calendar size={48} className="mx-auto mb-4 text-zinc-600" />
            <p className="text-zinc-400">No events scheduled this week</p>
            <Button
              onClick={() => setShowEventDialog(true)}
              className="mt-4 bg-amber-500 hover:bg-amber-600 text-black"
            >
              Create Your First Event
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {sortedDays.map(day => {
            const events = eventsByDay[day];
            const dayDate = parseISO(day);

            return (
              <Card key={day} className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Calendar size={20} className="text-amber-500" />
                    {format(dayDate, 'EEEE, MMMM d, yyyy')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {events.map(event => {
                    const eventNote = notes.find(n => n.event_id === event.id);
                    const eventStatus = getEventStatus(event);
                    const startTime = parseISO(event.start.dateTime || event.start.date);
                    const endTime = parseISO(event.end.dateTime || event.end.date);

                    return (
                      <div
                        key={event.id}
                        className="p-4 bg-zinc-800/50 rounded-lg border border-zinc-700 hover:border-amber-500/30 transition-all"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-medium text-white">{event.summary}</h3>
                              <Badge variant="outline" className={eventStatus.color}>
                                {eventStatus.label}
                              </Badge>
                              {eventStatus.status === 'upcoming' && (
                                <Badge variant="outline" className="bg-red-500/20 text-red-400 border-red-500/30">
                                  <AlertCircle size={12} className="mr-1" />
                                  15 min reminder
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-4 text-sm text-zinc-400">
                              <div className="flex items-center gap-1">
                                <Clock size={14} />
                                {format(startTime, 'h:mm a')} - {format(endTime, 'h:mm a')}
                              </div>
                              {event.attendees && event.attendees.length > 0 && (
                                <div className="flex items-center gap-1">
                                  <Users size={14} />
                                  {event.attendees.length} attendee{event.attendees.length !== 1 ? 's' : ''}
                                </div>
                              )}
                            </div>
                            {event.description && (
                              <p className="text-sm text-zinc-500 mt-2">{event.description}</p>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openNoteDialog(event)}
                            className="text-amber-500 hover:text-amber-400 hover:bg-amber-500/10"
                          >
                            <FileText size={16} className="mr-1" />
                            {eventNote ? 'View Notes' : 'Add Notes'}
                          </Button>
                        </div>

                        {eventNote && (eventNote.pre_meeting_notes || eventNote.follow_up_notes) && (
                          <div className="mt-3 pt-3 border-t border-zinc-700 space-y-2">
                            {eventNote.pre_meeting_notes && (
                              <div className="text-sm">
                                <p className="text-zinc-400 font-medium mb-1">Pre-meeting notes:</p>
                                <p className="text-zinc-300">{eventNote.pre_meeting_notes}</p>
                              </div>
                            )}
                            {eventNote.follow_up_notes && (
                              <div className="text-sm">
                                <p className="text-zinc-400 font-medium mb-1">Follow-up notes:</p>
                                <p className="text-zinc-300">{eventNote.follow_up_notes}</p>
                              </div>
                            )}
                            {eventNote.action_items && eventNote.action_items.length > 0 && (
                              <div className="text-sm">
                                <p className="text-zinc-400 font-medium mb-1">Action items:</p>
                                <ul className="space-y-1">
                                  {eventNote.action_items.map((item, idx) => (
                                    <li key={idx} className="flex items-center gap-2">
                                      {item.completed ? (
                                        <CheckCircle2 size={14} className="text-green-400" />
                                      ) : (
                                        <div className="w-3.5 h-3.5 rounded-full border border-zinc-600" />
                                      )}
                                      <span className={cn("text-zinc-300", item.completed && "line-through text-zinc-500")}>
                                        {item.item}
                                        {item.assignee && <span className="text-zinc-500"> - {item.assignee}</span>}
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Event Dialog */}
      <Dialog open={showEventDialog} onOpenChange={setShowEventDialog}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white">
          <DialogHeader>
            <DialogTitle>Create Calendar Event</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateEvent} className="space-y-4">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                value={eventForm.summary}
                onChange={(e) => setEventForm({ ...eventForm, summary: e.target.value })}
                placeholder="Meeting title"
                className="bg-zinc-800 border-zinc-700"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={eventForm.description}
                onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                placeholder="Meeting description"
                className="bg-zinc-800 border-zinc-700"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Time *</Label>
                <Input
                  type="datetime-local"
                  value={eventForm.start}
                  onChange={(e) => setEventForm({ ...eventForm, start: e.target.value })}
                  className="bg-zinc-800 border-zinc-700"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>End Time *</Label>
                <Input
                  type="datetime-local"
                  value={eventForm.end}
                  onChange={(e) => setEventForm({ ...eventForm, end: e.target.value })}
                  className="bg-zinc-800 border-zinc-700"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Attendees (comma-separated emails)</Label>
              <Input
                value={eventForm.attendees}
                onChange={(e) => setEventForm({ ...eventForm, attendees: e.target.value })}
                placeholder="email1@example.com, email2@example.com"
                className="bg-zinc-800 border-zinc-700"
              />
            </div>
            {createEventMutation.error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                {createEventMutation.error.message}
              </div>
            )}
            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowEventDialog(false)}
                className="border-zinc-700"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createEventMutation.isPending}
                className="bg-amber-500 hover:bg-amber-600 text-black"
              >
                {createEventMutation.isPending ? 'Creating...' : 'Create Event'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Notes Dialog */}
      <Dialog open={showNoteDialog} onOpenChange={setShowNoteDialog}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Meeting Notes - {selectedEvent?.summary}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveNote} className="space-y-4">
            <div className="space-y-2">
              <Label>Pre-meeting Notes</Label>
              <Textarea
                value={noteForm.pre_meeting_notes}
                onChange={(e) => setNoteForm({ ...noteForm, pre_meeting_notes: e.target.value })}
                placeholder="Preparation notes, agenda items, questions..."
                className="bg-zinc-800 border-zinc-700"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Follow-up Notes</Label>
              <Textarea
                value={noteForm.follow_up_notes}
                onChange={(e) => setNoteForm({ ...noteForm, follow_up_notes: e.target.value })}
                placeholder="Meeting summary, decisions made, next steps..."
                className="bg-zinc-800 border-zinc-700"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Action Items</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addActionItem}
                  className="border-zinc-700"
                >
                  <Plus size={14} className="mr-1" />
                  Add Item
                </Button>
              </div>
              <div className="space-y-2">
                {noteForm.action_items.map((item, idx) => (
                  <div key={idx} className="flex gap-2">
                    <Input
                      value={item.item}
                      onChange={(e) => updateActionItem(idx, 'item', e.target.value)}
                      placeholder="Action item"
                      className="bg-zinc-800 border-zinc-700 flex-1"
                    />
                    <Input
                      value={item.assignee}
                      onChange={(e) => updateActionItem(idx, 'assignee', e.target.value)}
                      placeholder="Assignee"
                      className="bg-zinc-800 border-zinc-700 w-40"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeActionItem(idx)}
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    >
                      ×
                    </Button>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowNoteDialog(false)}
                className="border-zinc-700"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createNoteMutation.isPending || updateNoteMutation.isPending}
                className="bg-amber-500 hover:bg-amber-600 text-black"
              >
                {createNoteMutation.isPending || updateNoteMutation.isPending ? 'Saving...' : 'Save Notes'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}