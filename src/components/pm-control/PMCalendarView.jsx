import React, { useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek } from 'date-fns';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/notifications';

const CATEGORY_COLORS = {
  schedule: 'bg-blue-500',
  fabrication: 'bg-orange-500',
  equipment: 'bg-purple-500',
  manpower: 'bg-green-500',
  notes: 'bg-zinc-500',
  risks: 'bg-red-500',
  action_items: 'bg-amber-500'
};

const PRIORITY_COLORS = {
  normal: 'border-zinc-700',
  urgent: 'border-amber-500',
  critical: 'border-red-500'
};

export default function PMCalendarView({ 
  entries, 
  projects, 
  selectedPM,
  onCreateEntry,
  onUpdateEntry,
  onDeleteEntry 
}) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [filterProject, setFilterProject] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [editingEntry, setEditingEntry] = useState(null);
  const [showNewEntry, setShowNewEntry] = useState(false);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const filteredEntries = useMemo(() => {
    return entries.filter(entry => {
      if (filterProject !== 'all' && entry.project_id !== filterProject) return false;
      if (filterCategory !== 'all' && entry.category !== filterCategory) return false;
      return entry.due_date && entry.status !== 'archived';
    });
  }, [entries, filterProject, filterCategory]);

  const entriesByDate = useMemo(() => {
    const map = new Map();
    filteredEntries.forEach(entry => {
      if (entry.due_date) {
        const dateKey = format(new Date(entry.due_date), 'yyyy-MM-dd');
        if (!map.has(dateKey)) map.set(dateKey, []);
        map.get(dateKey).push(entry);
      }
    });
    return map;
  }, [filteredEntries]);

  const getDayEntries = (day) => {
    const dateKey = format(day, 'yyyy-MM-dd');
    return entriesByDate.get(dateKey) || [];
  };

  const handleDateClick = (day) => {
    setSelectedDate(day);
    setShowNewEntry(true);
  };

  const handleSaveEntry = async (entryData) => {
    if (editingEntry) {
      await onUpdateEntry(editingEntry.id, entryData);
      setEditingEntry(null);
    } else {
      await onCreateEntry({
        ...entryData,
        due_date: format(selectedDate, 'yyyy-MM-dd')
      });
      setShowNewEntry(false);
    }
  };

  const getProjectName = (projectId) => {
    const project = projects.find(p => p.id === projectId);
    return project ? project.name : 'Unknown';
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3 justify-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          >
            <ChevronLeft size={16} />
          </Button>
          <h3 className="text-lg font-bold text-white min-w-[140px] text-center">
            {format(currentMonth, 'MMMM yyyy')}
          </h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          >
            <ChevronRight size={16} />
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
          <Select value={filterProject} onValueChange={setFilterProject}>
            <SelectTrigger className="w-full sm:w-48 bg-zinc-900 border-zinc-700 h-11">
              <SelectValue placeholder="All Projects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              {projects.map(p => (
                <SelectItem key={p.id} value={p.id}>
                  {p.project_number} - {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-full sm:w-40 bg-zinc-900 border-zinc-700 h-11">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="schedule">Schedule</SelectItem>
              <SelectItem value="action_items">Action Items</SelectItem>
              <SelectItem value="risks">Risks</SelectItem>
              <SelectItem value="fabrication">Fabrication</SelectItem>
              <SelectItem value="equipment">Equipment</SelectItem>
              <SelectItem value="manpower">Manpower</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Calendar Grid */}
      <Card className="overflow-hidden">
        <div className="grid grid-cols-7 border-b border-zinc-800">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="p-2 text-center text-xs font-bold text-zinc-500 uppercase">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {calendarDays.map((day, idx) => {
            const dayEntries = getDayEntries(day);
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isToday = isSameDay(day, new Date());

            return (
              <button
                key={idx}
                onClick={() => handleDateClick(day)}
                className={cn(
                  'min-h-[120px] p-2 border-r border-b border-zinc-800 hover:bg-zinc-900/50 transition-colors text-left',
                  !isCurrentMonth && 'bg-zinc-950/50',
                  isToday && 'bg-blue-950/20 border-blue-500/30'
                )}
              >
                <div className={cn(
                  'text-xs font-mono mb-1',
                  isToday ? 'text-blue-400 font-bold' : isCurrentMonth ? 'text-zinc-400' : 'text-zinc-600'
                )}>
                  {format(day, 'd')}
                </div>

                <div className="space-y-1">
                  {dayEntries.slice(0, 3).map(entry => (
                    <div
                      key={entry.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingEntry(entry);
                      }}
                      className={cn(
                        'text-[10px] p-1 rounded border-l-2 cursor-pointer hover:bg-zinc-800',
                        PRIORITY_COLORS[entry.priority]
                      )}
                      style={{ backgroundColor: `${CATEGORY_COLORS[entry.category]}20` }}
                    >
                      <div className="font-medium text-white truncate">
                        {entry.description}
                      </div>
                      <div className="text-zinc-500 truncate">
                        {getProjectName(entry.project_id)}
                      </div>
                    </div>
                  ))}
                  {dayEntries.length > 3 && (
                    <div className="text-[10px] text-zinc-500 pl-1">
                      +{dayEntries.length - 3} more
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Entry Dialog */}
      <Dialog open={!!editingEntry || showNewEntry} onOpenChange={(open) => {
        if (!open) {
          setEditingEntry(null);
          setShowNewEntry(false);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingEntry ? 'Edit Entry' : 'New Entry'}
              {selectedDate && <span className="text-zinc-500 text-sm ml-2">{format(selectedDate, 'MMM d, yyyy')}</span>}
            </DialogTitle>
          </DialogHeader>
          <EntryForm
            entry={editingEntry}
            projects={projects}
            onSave={handleSaveEntry}
            onDelete={editingEntry ? () => {
              onDeleteEntry(editingEntry.id);
              setEditingEntry(null);
            } : null}
            onCancel={() => {
              setEditingEntry(null);
              setShowNewEntry(false);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EntryForm({ entry, projects, onSave, onDelete, onCancel }) {
  const [formData, setFormData] = useState({
    project_id: entry?.project_id || '',
    category: entry?.category || 'action_items',
    description: entry?.description || '',
    priority: entry?.priority || 'normal',
    assigned_to: entry?.assigned_to || '',
    due_date: entry?.due_date || format(new Date(), 'yyyy-MM-dd')
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.description.trim() || !formData.project_id) {
      toast.error('Description and project are required');
      return;
    }
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-4">
      <div>
        <label className="text-xs text-zinc-400 mb-2 block">Project</label>
        <Select value={formData.project_id} onValueChange={(val) => setFormData({ ...formData, project_id: val })}>
          <SelectTrigger className="bg-zinc-900 border-zinc-700">
            <SelectValue placeholder="Select project..." />
          </SelectTrigger>
          <SelectContent>
            {projects.map(p => (
              <SelectItem key={p.id} value={p.id}>
                {p.project_number} - {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <label className="text-xs text-zinc-400 mb-2 block">Category</label>
        <Select value={formData.category} onValueChange={(val) => setFormData({ ...formData, category: val })}>
          <SelectTrigger className="bg-zinc-900 border-zinc-700">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="schedule">Schedule Items</SelectItem>
            <SelectItem value="action_items">Action Items</SelectItem>
            <SelectItem value="risks">Risks / Issues</SelectItem>
            <SelectItem value="fabrication">Fabrication</SelectItem>
            <SelectItem value="equipment">Equipment</SelectItem>
            <SelectItem value="manpower">Manpower</SelectItem>
            <SelectItem value="notes">Notes</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <label className="text-xs text-zinc-400 mb-2 block">Description</label>
        <Input
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Enter description..."
          className="bg-zinc-900 border-zinc-700"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-zinc-400 mb-2 block">Priority</label>
          <Select value={formData.priority} onValueChange={(val) => setFormData({ ...formData, priority: val })}>
            <SelectTrigger className="bg-zinc-900 border-zinc-700">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-xs text-zinc-400 mb-2 block">Due Date</label>
          <Input
            type="date"
            value={formData.due_date}
            onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
            className="bg-zinc-900 border-zinc-700"
          />
        </div>
      </div>

      <div>
        <label className="text-xs text-zinc-400 mb-2 block">Assigned To</label>
        <Input
          value={formData.assigned_to}
          onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
          placeholder="Name or email..."
          className="bg-zinc-900 border-zinc-700"
        />
      </div>

      <div className="flex gap-2 pt-2">
        {onDelete && (
          <Button type="button" variant="destructive" onClick={onDelete} className="mr-auto">
            Delete
          </Button>
        )}
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          {entry ? 'Update' : 'Create'}
        </Button>
      </div>
    </form>
  );
}